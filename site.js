// Mizasi technical one-pager: question generator (code builds it, code knows the answer), journey stages, entrances.
(() => {
  // ---------- generator ----------
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // transforms of a cell [x, y] on a 3x3 grid, y pointing down
  const T = {
    cw: ([x, y]) => [2 - y, x], ccw: ([x, y]) => [y, 2 - x], half: ([x, y]) => [2 - x, 2 - y],
    mir: ([x, y]) => [2 - x, y], flip: ([x, y]) => [x, 2 - y],
    mcw: ([x, y]) => [2 - y, 2 - x], mccw: ([x, y]) => [y, x],
  };
  const NAME = {
    cw: 'a quarter turn clockwise', ccw: 'a quarter turn anticlockwise', half: 'a half turn',
    mir: 'the mirror image', flip: 'flipped top to bottom', mcw: 'flipped and turned', mccw: 'flipped and turned',
  };
  const SHORT = { cw: 'wrong way', ccw: 'wrong way', half: 'half turn', mir: 'mirror image', flip: 'flipped', mcw: 'flipped', mccw: 'flipped' };
  const key = cells => cells.map(([x, y]) => x + y * 3).sort().join();
  const apply = (cells, t) => cells.map(T[t]);
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // A shape is only usable if all eight turns and flips of it look different: no two options can match.
  function shape(r) {
    for (;;) {
      const cells = shuffle([...Array(9).keys()], r).slice(0, 4 + Math.floor(r() * 2)).map(n => [n % 3, Math.floor(n / 3)]);
      const keys = new Set([key(cells), ...Object.keys(T).map(t => key(apply(cells, t)))]);
      if (keys.size === 8) return cells;
    }
  }
  const glyph = cells => `<svg viewBox="0 0 66 66" aria-hidden="true">${cells.map(([x, y]) => `<rect x="${4 + x * 20}" y="${4 + y * 20}" width="18" height="18" fill="currentColor"/>`).join('')}</svg>`;

  function make(kind, seed) {
    const r = rng(seed);
    if (kind === 'sequence') {
      const a = 2 + Math.floor(r() * 11), d = 3 + Math.floor(r() * 7), last = a + 3 * d, ans = last + d;
      const options = shuffle([
        { v: ans, ok: true },
        { v: ans + d, why: 'that skips a step' }, { v: ans - 1, why: 'that is one short' }, { v: ans + 2, why: 'that is two too many' },
      ], r).map(o => ({ ...o, html: `<span class="n">${o.v}</span>`, label: String(o.v) }));
      return { prompt: 'What comes next?', stem: `${a}, ${a + d}, ${a + 2 * d}, ${last}, ?`, options,
        working: `Each number is ${d} more than the last, so ${last} + ${d} = ${ans}. Code worked that out before it wrote the wrong options.` };
    }
    const cells = shape(r);
    const target = kind === 'reflection' ? 'mir' : ['cw', 'ccw', 'half'][Math.floor(r() * 3)];
    const wrong = (kind === 'reflection' ? ['flip', 'half', 'cw'] : ['mir', ...['cw', 'ccw', 'half'].filter(t => t !== target)]);
    const options = shuffle([{ t: target, ok: true }, ...wrong.map(t => ({ t, why: `that is ${NAME[t]}`, short: SHORT[t] }))], r)
      .map((o, i) => ({ ...o, html: glyph(apply(cells, o.t)), label: 'ABCD'[i] }));
    return { prompt: `Which is this shape as ${NAME[target]}?`, stem: glyph(cells), stemCells: cells, options, target,
      working: `Code moved every square of the shape to make ${NAME[target]}, then checked that none of the other three options is the same shape.` };
  }

  // ---------- pinned sequences: which statement is showing (the 3D object follows the same scroll in scene.js) ----------
  document.querySelectorAll('.seq').forEach(seq => {
    const steps = [...seq.querySelectorAll('.step')];
    let stage = 0, ticking = false;
    const read = () => {
      ticking = false;
      const r = seq.getBoundingClientRect(), p = -r.top / Math.max(1, r.height - innerHeight);
      const n = Math.max(1, Math.min(steps.length, Math.floor(p * steps.length) + 1));
      if (n === stage) return; stage = n;
      steps.forEach((s, i) => s.classList.toggle('cur', i + 1 === n));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
    addEventListener('resize', read);
    read();
  });

  // ---------- deal ----------
  const opts = document.getElementById('q-opts');
  if (opts) {
    const prompt = document.getElementById('q-prompt'), stem = document.getElementById('q-stem'), result = document.getElementById('result');
    const tabs = [...document.querySelectorAll('.tabs button')];
    let kind = 'rotation', q;
    const deal = () => {
      const seed = 10000 + Math.floor(Math.random() * 90000);
      q = make(kind, seed);
      prompt.textContent = `Paper ${seed}. ${q.prompt}`;
      stem.innerHTML = q.stem;
      result.textContent = '';
      opts.innerHTML = q.options.map((o, i) => `<button class="opt" data-i="${i}" aria-label="Option ${o.label}">${o.html}${q.stemCells ? `<span>${o.label}</span>` : ''}</button>`).join('');
    };
    opts.addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b || b.disabled) return;
      const picked = q.options[+b.dataset.i], right = q.options.find(o => o.ok);
      [...opts.children].forEach((el, i) => { el.disabled = true; if (q.options[i].ok) el.classList.add('right'); });
      if (!picked.ok) b.classList.add('wrong');
      result.textContent = picked.ok ? `Right. ${right.label} it is.` : `Not quite: ${picked.why}. The answer is ${right.label}.`;
    });
    document.getElementById('again').addEventListener('click', deal);
    document.getElementById('why').addEventListener('click', () => { result.textContent = q.working; });
    tabs.forEach(t => t.addEventListener('click', () => { kind = t.dataset.kind; tabs.forEach(x => x.setAttribute('aria-selected', x === t)); deal(); }));
    deal();
  }

  // ---------- trace: bars grow when the list enters ----------
  // (handled by the entrance observer: .trace carries data-rise and gets .in)

  // ---------- 3D solid: code builds it, turns it and computes its views ----------
  const cv = document.getElementById('solid-cv');
  if (cv) {
    const ctx = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vox = [], has = new Set(), ang = 0.7, spin = !still, seen = false, seed = 7;
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const grid = (id, on) => { document.getElementById(id).innerHTML = [...Array(9).keys()].map(n => `<i class="${on(n % 3, Math.floor(n / 3)) ? 'on' : ''}"></i>`).join(''); };
    const build = () => {
      const r = rng(seed++); has = new Set(['1,0,1']);
      while (has.size < 7) {
        const [x, y, z] = [...has][Math.floor(r() * has.size)].split(',').map(Number), d = DIRS[Math.floor(r() * 6)];
        const n = [x + d[0], y + d[1], z + d[2]];
        if (n.every(v => v >= 0 && v < 3)) has.add(n.join());
      }
      vox = [...has].map(s => s.split(',').map(Number));
      grid('v-top', (c, row) => vox.some(([x, , z]) => x === c && z === row));
      grid('v-front', (c, row) => vox.some(([x, y]) => x === c && y === 2 - row));
      grid('v-side', (c, row) => vox.some(([, y, z]) => z === c && y === 2 - row));
      draw();
    };
    const draw = () => {
      const W = cv.width, s = W / 5.2, t = 0.6, ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(t), st = Math.sin(t);
      const rot = ([x, y, z]) => { const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; return [x1, y * ct - z1 * st, y * st + z1 * ct]; };
      const faces = [];
      for (const v of vox) for (const n of DIRS) {
        if (has.has([v[0] + n[0], v[1] + n[1], v[2] + n[2]].join())) continue;   // hidden between two blocks
        const rn = rot(n); if (rn[2] <= 0) continue;                              // facing away
        const c = v.map((q, i) => q - 1 + n[i] / 2), ax = n.findIndex(q => q), [u, w] = [0, 1, 2].filter(i => i !== ax);
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const p = [...c]; p[u] += a / 2; p[w] += b / 2; return rot(p); });
        faces.push({ pts, z: rot(c)[2], fill: ['#a4f6f8', '#ffffff', '#ffc4ef'][ax] });
      }
      ctx.clearRect(0, 0, W, W); ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a0a0a';
      for (const f of faces.sort((a, b) => a.z - b.z)) {
        ctx.beginPath(); f.pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](W / 2 + x * s, W / 2 - y * s)); ctx.closePath();
        ctx.fillStyle = f.fill; ctx.fill(); ctx.stroke();
      }
    };
    const tick = () => { if (spin && seen) { ang += 0.008; draw(); } requestAnimationFrame(tick); };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(cv); else seen = true;
    document.getElementById('solid-new').addEventListener('click', build);
    const sb = document.getElementById('solid-spin');
    if (still) sb.textContent = 'Start the turn';
    sb.addEventListener('click', () => { spin = !spin; sb.textContent = spin ? 'Pause the turn' : 'Start the turn'; });
    build(); tick();
  }

  // ---------- entrances ----------
  const rise = document.querySelectorAll('[data-rise]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    rise.forEach(el => io.observe(el));
  } else rise.forEach(el => el.classList.add('in'));
})();
