// Draws any moment of a clip timeline. The renderer calls initPlayer once,
// then renderFrame(seconds) for each frame.

(() => {
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const d = (t) => `style="--d:${(t ?? 0).toFixed(3)}s"`;

  const ICON = {
    bad: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26" fill="currentColor"/><path d="M17 17l18 18M35 17L17 35" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>',
    good: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26" fill="currentColor"/><path d="M15 27l8 8 14-17" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    clock:
      '<svg class="clock" viewBox="0 0 300 300"><circle cx="150" cy="150" r="134" fill="#fff"/><circle cx="150" cy="150" r="134" fill="none" stroke="#90cdf4" stroke-width="14"/>' +
      [0, 90, 180, 270]
        .map((a) => `<rect x="144" y="34" width="12" height="30" rx="6" fill="#1a365d" transform="rotate(${a} 150 150)"/>`)
        .join('') +
      '<rect x="143" y="92" width="14" height="66" rx="7" fill="#1a365d" transform="rotate(-60 150 150)"/>' +
      '<rect class="hand" x="145" y="52" width="10" height="106" rx="5" fill="#3182ce"/>' +
      '<circle cx="150" cy="150" r="13" fill="#1a365d"/></svg>',
  };

  const templates = {
    title: (p, ctx) => `
      <span class="badge big-badge in" ${d(0.1)}><img src="${ctx.logo}" alt=""></span>
      <div class="label in" ${d(0.3)}>${esc(p.kicker)}</div>
      <h1 class="in" ${d(0.45)}>${esc(p.title)}</h1>
      <div class="rule"></div>`,

    document: (p) => `
      <div class="paper in" ${d(0.1)}>
        <div class="label">${esc(p.heading)}</div>
        ${p.lines
          .map(
            (l) =>
              `<p class="in" ${d(l.t ?? 0.4)}>${l.time ? `<span class="time">${esc(l.time)}</span>` : ''}${esc(l.text)}</p>`,
          )
          .join('')}
        ${p.stamp ? `<div class="stamp pop ${p.stamp.tone}" ${d(p.stamp.t)}>${esc(p.stamp.text)}</div>` : ''}
      </div>
      ${
        p.readers
          ? `<div class="readers"><div class="label in" ${d(0.5)}>${esc(p.readersLabel)}</div>
             <div class="chips">${p.readers.map((r) => `<span class="chip in" ${d(r.t)}>${esc(r.text)}</span>`).join('')}</div></div>`
          : ''
      }`,

    checklist: (p) => `
      <h2 class="in" ${d(0.1)}>${esc(p.heading)}</h2>
      <div class="rows">
        ${p.items
          .map(
            (it, i) =>
              `<div class="row in" ${d(it.t)}><span class="n">${i + 1}</span><span><b>${esc(it.text)}</b><i>${esc(it.sub ?? '')}</i></span></div>`,
          )
          .join('')}
      </div>`,

    compare: (p) => `
      <h2 class="in" ${d(0.1)}>${esc(p.heading)}</h2>
      ${['bad', 'good']
        .map(
          (tone) => `
        <div class="panel ${tone} in" ${d(p[tone].t)}>
          <div class="label">${ICON[tone]}${esc(p[tone].label)}</div>
          ${p[tone].lines.map((l) => `<p class="in" ${d(l.t)}>${esc(l.text)}</p>`).join('')}
        </div>`,
        )
        .join('')}`,

    timeline: (p) => `
      <h2 class="in" ${d(0.1)}>${esc(p.heading)}</h2>
      <div class="events">
        ${p.events
          .map(
            (e) =>
              `<div class="event in" ${d(e.t)}><div class="time">${esc(e.time)}</div><div class="what">${esc(e.text)}</div></div>`,
          )
          .join('')}
      </div>
      <div class="label in" ${d(p.chips[0].t - 0.3)}>${esc(p.chipsLabel)}</div>
      <div class="chips">${p.chips.map((c) => `<span class="chip in" ${d(c.t)}>${esc(c.text)}</span>`).join('')}</div>`,

    statement: (p) => `
      <div class="in" ${d(0.1)}>${ICON[p.icon] ?? ''}</div>
      <h2 class="in" ${d(0.25)}>${esc(p.big)}</h2>
      <div class="sub in" ${d(p.sub.t)}>${esc(p.sub.text)}</div>`,

    end: (p, ctx) => `
      <span class="badge big-badge in" ${d(0.1)}><img src="${ctx.logo}" alt=""></span>
      ${p.words.map((w, i) => `<div class="word in" ${d(0.4 + i * 0.55)}>${esc(w)}</div>`).join('')}
      <div class="footer in" ${d(0.6 + p.words.length * 0.55)}>${esc(p.footer)}</div>`,
  };

  let timeline;
  let mode;
  let sceneEls = [];
  let holdAfter = [];
  let current = -1;

  window.initPlayer = async ({ timeline: tl, mode: m, logo }) => {
    timeline = tl;
    mode = m;
    document.body.classList.toggle('draft', mode === 'draft');
    document.getElementById('logo').src = logo;
    document.getElementById('progress').innerHTML = tl.scenes.map(() => '<span></span>').join('');
    const host = document.getElementById('scenes');
    host.innerHTML = tl.scenes
      .map((s) => {
        const tpl = templates[s.template];
        if (!tpl) throw new Error(`Unknown template "${s.template}" in scene ${s.id}`);
        return `<section class="scene t-${s.template}">${tpl(s.props, { logo })}</section>`;
      })
      .join('');
    sceneEls = [...host.children];
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));

    // For each scene, find when its last entrance animation finishes; after
    // that the picture only changes when the caption does.
    holdAfter = sceneEls.map((el) => {
      el.classList.add('active');
      void el.offsetHeight;
      const end = Math.max(0, ...el.getAnimations({ subtree: true }).map((a) => a.effect.getComputedTiming().endTime));
      el.classList.remove('active');
      return end / 1000;
    });
  };

  window.renderFrame = (seconds) => {
    const t = Math.min(seconds, timeline.duration - 1e-6);
    const i = timeline.scenes.findIndex((s) => t < s.start + s.duration);
    const scene = timeline.scenes[i];
    const local = t - scene.start;

    if (i !== current) {
      sceneEls.forEach((el, k) => el.classList.toggle('active', k === i));
      [...document.getElementById('progress').children].forEach((el, k) => el.classList.toggle('on', k <= i));
      const tag = document.getElementById('confirm-tag');
      const show = mode === 'draft' && scene.confirm.length > 0;
      tag.style.display = show ? 'block' : 'none';
      tag.innerHTML = show ? `<b>TO CONFIRM</b> · ${esc(scene.confirm.join(' · '))}` : '';
      current = i;
      void sceneEls[i].offsetHeight;
    }

    for (const a of sceneEls[i].getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = local * 1000;
    }

    let cap = -1;
    scene.captions.forEach((c, k) => {
      if (local >= c.t) cap = k;
    });
    document.querySelector('#caption span').textContent = cap >= 0 ? scene.captions[cap].text : '';

    const moving = local <= holdAfter[i] + 0.05;
    return { key: `${i}|${cap}|${moving ? seconds.toFixed(4) : 'hold'}` };
  };
})();
