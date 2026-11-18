# Guard training clips

Short narrated, illustrated clips for guards. Each clip is one script file in
`clips/`; the video is rebuilt from it, so changing a rule means editing a
line and rendering again.

Design: `docs/superpowers/specs/2026-11-18-guard-training-clips-design.md`

## Commands

Run from the repository root. Needs Node 22, ffmpeg and Playwright's Chromium.

| Command | What it does |
|---|---|
| `node training-videos/render.mjs <clip-id>` | Draft MP4 with a "DRAFT" watermark, in `training-videos/out/` |
| `node training-videos/render.mjs <clip-id> --stills` | One PNG per scene, for a quick look |
| `node training-videos/render.mjs <clip-id> --final` | Final MP4. Refuses unless the clip is approved, has nothing left to confirm, and every line has audio |
| `node training-videos/tts.mjs <clip-id>` | Generates narration audio for new or changed lines (ElevenLabs) |
| `node training-videos/tts.mjs --voices` | Lists the voices on the account |
| `node --test training-videos/lib/clip.test.mjs` | Tests for the timing logic |

## Script file

```json
{
  "id": "02-incident-report",
  "approved": false,
  "scenes": [
    {
      "id": "s2",
      "template": "checklist",
      "narration": "Every report answers six things. Who was involved. ...",
      "confirm": ["Anything the owner still has to settle for this scene"],
      "props": { "items": [{ "text": "Who", "cue": "Who was involved" }] }
    }
  ]
}
```

- `narration` is spoken and shown as captions, word for word.
- `cue` makes an element appear when that phrase is spoken; `at` (0 to 1)
  places it at a share of the narration instead.
- `confirm` lists what the owner must settle. It shows as a yellow tag in
  drafts and blocks a final render.
- `approved` is set to `true` only once the owner has approved the whole
  script of that clip.
- Templates: `title`, `document`, `checklist`, `compare`, `timeline`,
  `statement`, `end` (see `player/player.js`).

## Audio

Narration lives in `audio/<clip-id>/<scene-id>.mp3` and is committed, so a
clip can be rebuilt without any account. A scene with no audio file renders
silent, with its length estimated from the word count.
