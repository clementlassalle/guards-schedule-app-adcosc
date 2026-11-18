#!/usr/bin/env node
// Render a training clip to MP4.
//   node training-videos/render.mjs <clip-id>            draft, with watermark
//   node training-videos/render.mjs <clip-id> --final    refuses unless approved
//   node training-videos/render.mjs <clip-id> --stills   one PNG per scene, no video

import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTimeline, finalBlockers } from './lib/clip.mjs';

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const root = dirname(fileURLToPath(import.meta.url));
const LOGO = join(root, '..', 'assets', 'images', 'd7d222f6-ee66-421b-911e-767afa9b930e.png');

const args = process.argv.slice(2);
const clipId = args.find((a) => !a.startsWith('--'));
const final = args.includes('--final');
const stills = args.includes('--stills');
if (!clipId) {
  console.error('Usage: node training-videos/render.mjs <clip-id> [--final | --stills]');
  process.exit(2);
}

const clip = JSON.parse(readFileSync(join(root, 'clips', `${clipId}.json`), 'utf8'));

if (final) {
  const blockers = finalBlockers(clip);
  if (blockers.length) {
    console.error(`Cannot render "${clipId}" as final:\n- ${blockers.join('\n- ')}`);
    process.exit(1);
  }
}

// Narration audio, one file per scene. Missing files mean estimated timing.
const audio = {};
const audioSeconds = {};
for (const scene of clip.scenes) {
  const file = join(root, 'audio', clipId, `${scene.id}.mp3`);
  if (scene.narration && existsSync(file)) {
    audio[scene.id] = file;
    audioSeconds[scene.id] = Number(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
        encoding: 'utf8',
      }),
    );
  }
}

const timeline = buildTimeline(clip, audioSeconds);
const estimated = timeline.scenes.filter((s) => s.estimated).map((s) => s.id);
if (estimated.length) {
  if (final) {
    console.error(`Cannot render as final: no narration audio for scenes ${estimated.join(', ')}`);
    process.exit(1);
  }
  console.warn(`No narration audio for scenes ${estimated.join(', ')}: timing is estimated and they will be silent.`);
}

const outDir = join(root, 'out');
mkdirSync(outDir, { recursive: true });

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => {
  console.error(`Player error: ${e.message}`);
  process.exitCode = 1;
});
await page.goto(pathToFileURL(join(root, 'player', 'player.html')).href);
await page.evaluate((opts) => window.initPlayer(opts), {
  timeline,
  mode: final ? 'final' : 'draft',
  logo: pathToFileURL(LOGO).href,
});

if (stills) {
  for (const s of timeline.scenes) {
    await page.evaluate((t) => window.renderFrame(t), s.start + s.duration - 0.05);
    await page.screenshot({ path: join(outDir, `${clipId}-${s.id}.png`) });
  }
  await browser.close();
  console.log(`Wrote ${timeline.scenes.length} stills to ${outDir}`);
  process.exit(process.exitCode ?? 0);
}

const outFile = join(outDir, `${clipId}-${final ? 'final' : 'draft'}.mp4`);
const narrated = timeline.scenes.filter((s) => audio[s.id]);
const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
for (const s of narrated) ff.push('-i', audio[s.id]);
if (narrated.length) {
  const delayed = narrated.map((s, i) => {
    const ms = Math.round((s.start + s.lead) * 1000);
    return `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}:all=1[a${i}]`;
  });
  const mix = `${narrated.map((_, i) => `[a${i}]`).join('')}amix=inputs=${narrated.length}:normalize=0,apad[aout]`;
  ff.push('-filter_complex', [...delayed, mix].join(';'), '-map', '0:v', '-map', '[aout]');
} else {
  ff.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a');
}
ff.push(
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '160k', '-t', timeline.duration.toFixed(3), '-movflags', '+faststart', outFile,
);

const ffmpeg = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((resolve, reject) => {
  ffmpeg.on('error', reject);
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

const frames = Math.round(timeline.duration * FPS);
let lastKey = null;
let lastShot = null;
let shots = 0;
for (let f = 0; f < frames; f++) {
  const { key } = await page.evaluate((t) => window.renderFrame(t), f / FPS);
  if (key !== lastKey) {
    lastShot = await page.screenshot({ type: 'jpeg', quality: 93 });
    lastKey = key;
    shots++;
  }
  if (!ffmpeg.stdin.write(lastShot)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
}
ffmpeg.stdin.end();
await browser.close();
await done;

console.log(
  `Wrote ${outFile} (${timeline.duration.toFixed(1)}s, ${frames} frames, ${shots} drawn, ` +
    `${narrated.length}/${timeline.scenes.filter((s) => s.narrated).length} scenes voiced)`,
);
