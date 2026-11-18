# Guard Training Sample Clip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Clip 2 (incident reports) as a draft vertical MP4 from a script file, so the owner can judge look, voice and pace.

**Architecture:** A clip is one JSON file of scenes. Pure functions in `lib/clip.mjs` turn it into a timeline (scene starts, cue times, caption chunks). A static HTML player draws any moment of that timeline; `render.mjs` steps it frame by frame in headless Chromium and pipes frames plus per-scene audio into ffmpeg.

**Tech Stack:** Node 22 (ESM, `node:test`), pre-installed Playwright Chromium, ffmpeg. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-guard-training-clips-design.md`

## Global Constraints

- Output: 1080x1920, 30 fps, H.264 MP4 with AAC audio.
- Captions burned in, matching narration word for word.
- Final mode refuses unless the clip has `"approved": true` and no `[CONFIRM` text or non-empty `confirm` list. Draft mode shows a "DRAFT" watermark.
- Colours from `styles/commonStyles.ts`; logo from `assets/images/`.
- Rendered MP4s go to `training-videos/out/`, which is git-ignored.
- Audio lives at `training-videos/audio/<clip-id>/<scene-id>.mp3` and is committed. A scene with no audio file gets an estimated duration of 2.5 words per second.

## Review Focus

- A `cue` phrase that no longer appears in edited narration: the build must fail naming the scene and cue, not silently mistime.
- A very long narration sentence with no punctuation: captions must still break into chunks of at most 32 characters where words allow.
- A scene with neither narration nor `duration`: the build must fail naming the scene.
- A clip approved but with a leftover `confirm` entry: final mode must refuse.
- A missing audio file for one scene only: the render proceeds with estimated timing and says which scenes were estimated.

---

### Task 1: Timeline library

**Files:** Create `training-videos/lib/clip.mjs`, `training-videos/lib/clip.test.mjs`

**Interfaces (produces):**
- `finalBlockers(clip) -> string[]` (empty means renderable as final)
- `captionChunks(narration, maxChars = 32) -> {text, frac}[]` where `frac` is the chunk's start as a 0..1 share of the narration's characters
- `cueFraction(narration, cue) -> number`, throws if the cue is absent
- `buildTimeline(clip, audioSeconds) -> {duration, scenes: [{id, template, start, duration, lead, estimated, props, captions: [{text, t}], confirm}]}` where `audioSeconds` maps scene id to seconds; every object in `props` carrying `cue` or `at` gains `t`, seconds from scene start. `LEAD = 0.35`, `TAIL = 0.5`.

- [ ] Write tests for the five Review Focus lines plus contiguous scene starts
- [ ] Run `node --test training-videos/lib/clip.test.mjs` and see them fail
- [ ] Implement, run again, see them pass, commit

### Task 2: Player and clip script

**Files:** Create `training-videos/player/player.html`, `player.css`, `player.js`, `training-videos/clips/02-incident-report.json`

**Interfaces:** `window.initPlayer({timeline, mode, title, logo})` then `window.renderFrame(seconds) -> {key}`; `key` is identical for frames that look identical, so the renderer can reuse the image.

Templates: `title`, `document`, `checklist`, `compare`, `timeline`, `statement`, `end`. Entrances are CSS animations, paused and seeked by `renderFrame`.

- [ ] Build, screenshot one frame per scene, look at each, fix, commit

### Task 3: Renderer

**Files:** Create `training-videos/render.mjs`, `training-videos/README.md`; modify `.gitignore`

`node training-videos/render.mjs <clip-id> [--final]` writes `training-videos/out/<clip-id>-draft.mp4` or `-final.mp4`.

- [ ] Render the sample, check duration and stream layout with ffprobe, watch sampled frames, commit

### Task 4: Voiceover

Generate one audio file per narrated scene, save under `audio/02-incident-report/`, re-render. Blocked until a speech service is reachable from this session.
