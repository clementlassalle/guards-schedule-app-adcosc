# Guard training clips: design

Date: 2026-11-18. Status: awaiting owner approval.

## Intent

ERO Security wants short training clips that teach guards the job itself:
patrols, incident reports, handling confrontations, and the people side of
the work. The owner saw a paid "AI content creation" course and wants a
cheaper way to get better results. The procedures live mostly in the owner's
head, so the scripts are drafted from general practice and then corrected by
the owner.

## Goals

- Four clips, one skill each, about 90 seconds each, from
  `docs/training-videos/scripts-draft-1.md` once corrected.
- Every clip says what the company actually requires. No clip is rendered as
  final while its script still contains a `[CONFIRM: ...]` marker.
- Changing a rule later means editing one line of script and re-rendering,
  with no manual video editing.
- A guard can follow a clip with the sound off.

## Non-goals

- No filmed footage, talking presenter, or generated moving scenes.
- No changes to the scheduling app in this work. Showing the clips inside the
  app is a separate project.
- No quizzes, completion tracking, or certification.

## Anti-goals

- A confident clip that teaches the wrong thing, above all on physical
  contact and detaining people in the confrontation clip.
- Clips that look like social-media content: fast cuts, hype music, filler.
- Recurring subscription cost for a tool the clips depend on.

## Constraints

- The owner's corrections to the scripts are the source of truth. The
  guards' location (country and state or province) is still unknown and
  blocks the final wording of Clip 3.
- Clip language is not yet confirmed. English is assumed.
- Voice and image generation spend the owner's ElevenLabs credits, so each
  line of narration is generated once and reused unless its text changes.

## Approaches

| Option | What the guard sees | Trade-off |
|---|---|---|
| A. Narrated illustrated clips | Diagrams, checklists, on-screen text, a few still images, AI voiceover | Cheapest and easiest to update; less lifelike than footage |
| B. AI presenter | A talking avatar with text overlays | Each change re-renders the presenter; adds little for showing where to stand or what to check |
| C. AI-generated acted scenes | Generated footage of guards and confrontations | Most expensive, hard to keep one guard consistent, can depict wrong posture or contact |

**Chosen by the owner: A.** Reason: procedures will keep changing as the
owner corrects them, and A is the only option where a correction is a text
edit.

## How it gets made

These are the builder's calls, not decisions the owner made. The owner can
overrule any of them.

- **One script file per clip is the source.** Each scene holds the narration
  text, the on-screen text, and which visual template it uses. Lives in
  `training-videos/` in this repo.
- **Visuals are animated HTML/SVG scenes**, rendered to video in this
  container with the pre-installed Chromium and ffmpeg. No paid video tool.
  A small set of reusable scene templates covers the scripts: title card,
  checklist that builds item by item, two-column compare (wrong versus
  right), timeline, overhead position diagram, speech bubbles, end card.
- **Illustration style is flat diagrams and icons**, not realistic people.
  Human figures are simple neutral silhouettes. A few still images may be
  generated where a diagram cannot carry the scene; each one is reviewed by
  the owner before use.
- **Voiceover is ElevenLabs speech**, one calm, clear voice for all four
  clips, generated per scene so one changed line costs one line.
- **Captions are burned in**, matching the narration word for word.
- **Format is vertical 1080x1920 MP4**, since guards will most likely watch
  on a phone. Scene length follows the narration audio.
- **Look follows the app**: its logo and colours, so the clips read as ERO
  Security's own.
- **Rendered MP4s are not committed to git.** They are sent to the owner in
  the session and can be saved to Google Drive. Sources and generated audio
  are committed so any clip can be rebuilt.
- **A render refuses to run in final mode** unless the clip's script has no
  `[CONFIRM` marker and carries an explicit `approved` flag. The flag is set
  only after the owner has said, for that clip, that the whole script is
  right, since every line was drafted from general practice and not only the
  marked ones. A draft mode renders with a visible "DRAFT" watermark.
- **Audio is generated in an assistant session, rendering is a plain
  command.** There is no ElevenLabs API key in this environment, only the
  session connector. So narration audio is generated through the connector,
  saved per scene, and committed. The render command uses the committed
  audio and needs no account or network. Finished clips therefore never
  depend on a subscription; only changing a spoken line needs credits.
- **The scripts' "On screen" column states intent, not a shot list.** Acted
  moments ("an angry man at an entrance") are reinterpreted into the diagram
  templates. The sample clip is where the owner judges whether that works.
- **Per-clip script files become the single source.** The builder converts
  `scripts-draft-1.md` into them once. The owner gives corrections in
  conversation or by editing the text; the builder applies them to the
  per-clip files, and the draft file is then removed.

## Order of work

1. One sample clip in draft mode (Clip 2, incident reports, which depends
   least on local law) so the owner can judge look, voice, and pace.
2. Owner corrects the look and the scripts.
3. Remaining clips, each final only after its script is confirmed.

## Left to the builder

Exact template designs, animation timing, font choice, file layout inside
`training-videos/`, and how audio lengths drive scene durations.

## Open questions for the owner

1. Where do the guards work (country, state or province)?
2. Which language or languages?
3. Where will guards watch the clips (messaging app, shared drive, later in
   the scheduling app)? This confirms or changes the vertical format.
