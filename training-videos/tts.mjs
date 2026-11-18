#!/usr/bin/env node
// Generate narration audio for a clip, one MP3 per narrated scene.
//   node training-videos/tts.mjs --voices              list available voices
//   node training-videos/tts.mjs <clip-id>             generate missing or changed lines
//
// A line is only regenerated when its text, the voice or the model changes,
// so correcting one sentence costs one sentence.
//
// The API key is never stored here. In a Claude cloud session the network
// proxy adds it to requests for api.elevenlabs.io; elsewhere set
// ELEVENLABS_API_KEY in your shell.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.elevenlabs.io/v1';
const root = dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVENLABS_API_KEY ?? 'injected-by-proxy';

function curl(args) {
  return execFileSync('curl', ['-sS', '--fail-with-body', '-H', `xi-api-key: ${key}`, ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node training-videos/tts.mjs <clip-id> | --voices');
  process.exit(2);
}

if (arg === '--voices') {
  const { voices } = JSON.parse(curl([`${API}/voices`]).toString());
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${v.name}  [${[l.gender, l.age, l.accent, l.use_case, l.description].filter(Boolean).join(', ')}]`);
  }
  process.exit(0);
}

const voice = JSON.parse(readFileSync(join(root, 'voice.json'), 'utf8'));
const clip = JSON.parse(readFileSync(join(root, 'clips', `${arg}.json`), 'utf8'));
const dir = join(root, 'audio', arg);
mkdirSync(dir, { recursive: true });
const manifestFile = join(dir, 'manifest.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};

const narrated = clip.scenes.filter((s) => s.narration);
let made = 0;
for (const [i, scene] of narrated.entries()) {
  const hash = createHash('sha256')
    .update(JSON.stringify([scene.narration, voice.voice_id, voice.model_id, voice.settings]))
    .digest('hex');
  const file = join(dir, `${scene.id}.mp3`);
  if (manifest[scene.id] === hash && existsSync(file)) continue;

  const body = {
    text: scene.narration,
    model_id: voice.model_id,
    voice_settings: voice.settings,
    previous_text: narrated[i - 1]?.narration,
    next_text: narrated[i + 1]?.narration,
  };
  curl([
    '-X', 'POST', `${API}/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`,
    '-H', 'Content-Type: application/json', '-d', JSON.stringify(body), '-o', file,
  ]);
  if (statSync(file).size < 1000) throw new Error(`Scene ${scene.id}: audio file is suspiciously small`);
  manifest[scene.id] = hash;
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  made++;
  console.log(`Generated ${scene.id} (${scene.narration.length} characters)`);
}
console.log(`${made} generated, ${narrated.length - made} unchanged. Voice: ${voice.name}`);
