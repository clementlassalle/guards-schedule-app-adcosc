// Pure timing logic for training clips: no browser, no files.

export const LEAD = 0.35; // silence before narration starts in a scene
export const TAIL = 0.5; // hold after narration ends
const WORDS_PER_SECOND = 2.5; // used only when a scene has no audio yet

/** Reasons a clip may not be rendered as final. Empty means it may. */
export function finalBlockers(clip) {
  const out = [];
  if (clip.approved !== true) out.push(`Clip "${clip.id}" is not marked approved by the owner.`);
  for (const scene of clip.scenes) {
    if (scene.confirm?.length) {
      out.push(`Scene ${scene.id} still has points to confirm: ${scene.confirm.join('; ')}`);
    } else if (JSON.stringify(scene).includes('[CONFIRM')) {
      out.push(`Scene ${scene.id} still contains a [CONFIRM marker.`);
    }
  }
  return out;
}

/**
 * Split narration into caption chunks, word for word.
 * frac is where the chunk starts, as a 0..1 share of the narration's characters.
 */
export function captionChunks(narration, maxChars = 32) {
  const SENTENCE_END = /[.?!]["”’)]?$/;
  const len = (words) => words.reduce((n, w) => n + w.text.length, words.length - 1);
  const groups = [];
  let current = [];
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  for (const match of narration.matchAll(/\S+/g)) {
    const word = { text: match[0], index: match.index };
    if (current.length && len(current) + 1 + word.text.length > maxChars) flush();
    current.push(word);
    const endsClause = /[,:;]$/.test(word.text) && len(current) >= 18;
    if (SENTENCE_END.test(word.text) || endsClause) flush();
  }
  flush();

  // Avoid a one-word caption left dangling after a line break: pull words
  // back from the previous chunk while that keeps the two better balanced.
  for (let i = 1; i < groups.length; i++) {
    const prev = groups[i - 1];
    const cur = groups[i];
    if (SENTENCE_END.test(prev.at(-1).text)) continue;
    while (len(cur) < 12 && prev.length > 1) {
      const moved = prev.at(-1);
      if (len(cur) + 1 + moved.text.length > len(prev) - moved.text.length - 1) break;
      cur.unshift(prev.pop());
    }
  }

  return groups.map((g) => ({ text: g.map((w) => w.text).join(' '), frac: g[0].index / narration.length }));
}

/** Where a phrase starts in the narration, as a 0..1 share of its characters. */
export function cueFraction(narration, cue) {
  const i = narration.toLowerCase().indexOf(cue.toLowerCase());
  if (i < 0) throw new Error(`cue "${cue}" does not appear in the narration`);
  return i / narration.length;
}

function resolveCues(node, scene, speech) {
  if (Array.isArray(node)) return node.map((n) => resolveCues(n, scene, speech));
  if (node === null || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = resolveCues(v, scene, speech);
  if ('cue' in node || 'at' in node) {
    if (!scene.narration) throw new Error(`Scene ${scene.id}: cue used without narration`);
    let frac;
    try {
      frac = 'cue' in node ? cueFraction(scene.narration, node.cue) : node.at;
    } catch (e) {
      throw new Error(`Scene ${scene.id}: ${e.message}`);
    }
    out.t = LEAD + frac * speech;
  }
  return out;
}

/**
 * audioSeconds maps scene id to the length of its narration audio.
 * Scenes without an entry get an estimated length and estimated: true.
 */
export function buildTimeline(clip, audioSeconds = {}) {
  let start = 0;
  const scenes = clip.scenes.map((scene) => {
    let duration;
    let speech = 0;
    let estimated = false;
    if (scene.narration) {
      if (audioSeconds[scene.id] != null) {
        speech = audioSeconds[scene.id];
      } else {
        speech = scene.narration.trim().split(/\s+/).length / WORDS_PER_SECOND;
        estimated = true;
      }
      duration = LEAD + speech + TAIL;
    } else if (typeof scene.duration === 'number') {
      duration = scene.duration;
    } else {
      throw new Error(`Scene ${scene.id} has neither narration nor a duration`);
    }
    const built = {
      id: scene.id,
      template: scene.template,
      start,
      duration,
      lead: LEAD,
      estimated,
      narrated: Boolean(scene.narration),
      confirm: scene.confirm ?? [],
      props: resolveCues(scene.props ?? {}, scene, speech),
      captions: scene.narration
        ? captionChunks(scene.narration).map((c) => ({ text: c.text, t: LEAD + c.frac * speech }))
        : [],
    };
    start += duration;
    return built;
  });
  return { duration: start, scenes };
}
