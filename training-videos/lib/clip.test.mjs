import test from 'node:test';
import assert from 'node:assert/strict';
import { finalBlockers, captionChunks, cueFraction, buildTimeline, LEAD, TAIL } from './clip.mjs';

const clip = (over = {}) => ({
  id: 'c',
  title: 'T',
  approved: true,
  scenes: [
    { id: 's0', template: 'title', duration: 2, props: {} },
    {
      id: 's1',
      template: 'checklist',
      narration: 'Who was involved. What happened.',
      props: { items: [{ text: 'Who', cue: 'who was involved' }, { text: 'What', cue: 'What happened' }] },
    },
  ],
  ...over,
});

test('finalBlockers: approved clean clip has none', () => {
  assert.deepEqual(finalBlockers(clip()), []);
});

test('finalBlockers: unapproved clip is blocked', () => {
  assert.equal(finalBlockers(clip({ approved: false })).length, 1);
});

test('finalBlockers: approved clip with leftover confirm entry is blocked', () => {
  const c = clip();
  c.scenes[1].confirm = ['Report deadline'];
  const b = finalBlockers(c);
  assert.equal(b.length, 1);
  assert.match(b[0], /s1/);
});

test('finalBlockers: [CONFIRM marker anywhere in a scene is blocked', () => {
  const c = clip();
  c.scenes[1].props.items[0].text = 'Who [CONFIRM: really?]';
  assert.match(finalBlockers(c)[0], /s1/);
});

test('captionChunks: keeps every word in order', () => {
  const n = 'Your report will be read by people who were not there: your supervisor, the client, sometimes police.';
  const chunks = captionChunks(n);
  assert.equal(chunks.map((c) => c.text).join(' '), n);
  assert.equal(chunks[0].frac, 0);
  for (let i = 1; i < chunks.length; i++) assert.ok(chunks[i].frac > chunks[i - 1].frac);
});

test('captionChunks: long unpunctuated sentence still breaks at 32 characters', () => {
  const n = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
  const chunks = captionChunks(n);
  assert.ok(chunks.length > 2);
  for (const c of chunks) assert.ok(c.text.length <= 32, c.text);
});

test('captionChunks: does not leave one short word dangling mid-sentence', () => {
  const chunks = captionChunks("If it's vague, it's useless to them, and it doesn't protect you.");
  assert.notEqual(chunks.at(-1).text, 'you.');
  assert.equal(chunks.at(-1).text, 'protect you.');
});

test('cueFraction: case-insensitive position, throws when absent', () => {
  assert.equal(cueFraction('Alpha beta', 'alpha'), 0);
  assert.equal(cueFraction('Alpha beta', 'BETA'), 0.6);
  assert.throws(() => cueFraction('Alpha beta', 'gamma'), /gamma/);
});

test('buildTimeline: scenes are contiguous and cues become times', () => {
  const tl = buildTimeline(clip(), { s1: 4 });
  assert.equal(tl.scenes[0].start, 0);
  assert.equal(tl.scenes[1].start, 2);
  assert.equal(tl.scenes[1].duration, LEAD + 4 + TAIL);
  assert.equal(tl.duration, 2 + LEAD + 4 + TAIL);
  assert.equal(tl.scenes[1].estimated, false);
  const [a, b] = tl.scenes[1].props.items;
  assert.ok(a.t < b.t);
  assert.ok(b.t > LEAD && b.t < LEAD + 4);
  assert.ok(tl.scenes[1].captions.length >= 1);
});

test('buildTimeline: missing audio is estimated at 2.5 words per second', () => {
  const tl = buildTimeline(clip(), {});
  assert.equal(tl.scenes[1].estimated, true);
  assert.equal(tl.scenes[1].duration, LEAD + 5 / 2.5 + TAIL);
});

test('buildTimeline: a cue missing from the narration names scene and cue', () => {
  const c = clip();
  c.scenes[1].props.items[0].cue = 'nowhere';
  assert.throws(() => buildTimeline(c, {}), /s1.*nowhere/);
});

test('buildTimeline: scene with neither narration nor duration fails by name', () => {
  const c = clip();
  delete c.scenes[0].duration;
  assert.throws(() => buildTimeline(c, {}), /s0/);
});

test('buildTimeline: "at" places an element at a share of the narration', () => {
  const c = clip();
  c.scenes[1].props.items[1] = { text: 'What', at: 0.5 };
  const tl = buildTimeline(c, { s1: 4 });
  assert.equal(tl.scenes[1].props.items[1].t, LEAD + 2);
});
