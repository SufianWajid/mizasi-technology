// The 3D protagonist: 27 glossy blocks that stay on screen for the whole page and re-form for every
// section. Each element with data-shape is a stop; scrolling between two stops morphs one form into the next.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/RoomEnvironment.js';
import { RoundedBoxGeometry } from './assets/RoundedBoxGeometry.js';

const cv = document.getElementById('stage'), els = [...document.querySelectorAll('[data-shape]')];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { cv.remove(); }

if (renderer && els.length) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);   // transparent: the page's field colour shows through
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  cam.position.z = 16;
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const C = { white: 0xffffff, orange: 0xf9a21f, yellow: 0xffd249, pink: 0xffc4ef, cyan: 0xa4f6f8, magenta: 0xf53fd6, none: 0x000000, obs: 0x15151a };
  const CANDY = [C.orange, C.yellow, C.pink, C.cyan];
  const key = new THREE.PointLight(C.white, 130); key.position.set(4, 5, 9); scene.add(key);
  const rimA = new THREE.PointLight(C.magenta, 110); rimA.position.set(-7, -3, 4); scene.add(rimA);
  const rimB = new THREE.PointLight(C.cyan, 110); rimB.position.set(7, -4, -3); scene.add(rimB);

  // ---------- the forms ----------
  let seed = 9; const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const G = 1.07, Y = new THREE.Vector3(0, 1, 0), N = 27, HIDE = 0.001;
  const cells = [...Array(N).keys()].map(i => [i % 3 - 1, Math.floor(i / 3) % 3 - 1, Math.floor(i / 9) - 1]);
  const st = (p, s = 1, c = C.obs, e = C.none, ei = 0, q = new THREE.Quaternion()) => ({ p: new THREE.Vector3(...p), s, c: new THREE.Color(c), e: new THREE.Color(e), ei, q });
  const form = (fn, spin = 1, light = C.white, extra = {}) => ({ b: cells.map(fn), spin, light: new THREE.Color(light), scan: 0, roll: 0, ...extra });
  const SOL = [[-1, -1, 0], [0, -1, 0], [1, -1, 0], [1, 0, 0], [1, 1, 0], [0, -1, 1], [-1, -1, -1]].map(([x, y, z]) => [x, y + 0.3, z]);
  const WRONG = [([x, y, z]) => [-x, y, z], ([x, y, z]) => [-y, x, z], ([x, y, z]) => [x, -y, z]], OFF = [[-3.1, 2.9, 0], [3.1, 2.9, 0], [0, -3.4, 0]];
  const slab = (k, x) => [x + (k % 2 - 0.5) * G, (Math.floor(k / 2) % 2 - 0.5) * G, (Math.floor(k / 4) - 1) * G];
  const GLYPH = [0, 1, 4, 5, 6], RING8 = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]], GROW = [3, 4, 5, 6, 9];
  const growAt = i => { let c = 0, n = i; while (n >= GROW[c]) n -= GROW[c++]; return [c, n]; };

  const SHAPES = {
    // hero and the close: the whole cube, subject colours on its corners, a magenta core
    cube: form((c, i) => { const corner = c.every(v => v); return st(c.map(v => v * 1.12), 1, C.obs, i === 13 ? C.magenta : corner ? CANDY[i % 4] : C.none, i === 13 ? 2.2 : corner ? 0.55 : 0); }),
    // the journey
    s1: form((c, i) => {
      if (i === 13) return st([0, 0, 0], 1.3, C.orange, C.orange, 0.7);
      const d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(4.2 + rnd() * 3.2); d.x *= 0.42;
      return st(d.toArray(), 0.42, C.obs, CANDY[i % 4], 0.5, new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)));
    }, 1, C.orange),
    s2: form((c, i) => st([(i % 9 - 4) * 0.76, (1 - Math.floor(i / 9)) * 0.76, 0], 0.64, i < 9 ? C.yellow : C.obs, i < 9 ? C.yellow : C.none, i < 9 ? 0.45 : 0), 0, C.yellow),
    s3: form(([x, y, z]) => { const a = y * 0.7, p = new THREE.Vector3(x * G, 0, z * G).applyAxisAngle(Y, a); return st([p.x, y * 2.3, p.z], 1, C.pink, C.pink, 0.12, new THREE.Quaternion().setFromAxisAngle(Y, a)); }, 1, C.pink),
    s4: form((c, i) => { if (i < 7) return st(SOL[i].map(v => v * G), 1, C.cyan, C.cyan, 0.12); const a = (i - 7) / 20 * Math.PI * 2; return st([Math.cos(a) * 3.1, Math.sin(a * 2) * 0.5, Math.sin(a) * 3.1], 0.18, C.obs, C.cyan, 0.6); }, 1, C.cyan),
    s5: form((c, i) => {
      if (i < 7) return st(SOL[i].map(v => v * G), 1, C.white);
      if (i > 24) return st([0, 0, -5], HIDE);
      const v = Math.floor((i - 7) / 6), cell = WRONG[v](SOL[(i - 7) % 6]);
      return st(cell.map((q, k) => OFF[v][k] + q * G * 0.4), 0.4, C.obs, C.yellow, 0.5);
    }, 1, C.yellow),
    s6: form((c, i) => { if (i < 7) return st(SOL[i].map(v => v * G), 1, C.white, C.magenta, 0.1); const a = i * 2.4; return st([Math.cos(a) * 11, Math.sin(a) * 11, -4], HIDE); }, 1, C.magenta, { scan: 1 }),
    s7: form((c, i) => { const A = [-1.7, 0.1], B = [-0.5, -1.4], D = [2.3, 1.9], t = i < 8 ? i / 8 : (i - 8) / 18, [a, b] = i < 8 ? [A, B] : [B, D]; return st([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0], 0.55, C.magenta, C.magenta, 0.75); }, 0, C.magenta),
    // AI agents and code engines: two teams with a gate between them
    teams: form((c, i) => i < 12 ? st(slab(i, -1.75), 1, C.pink, C.pink, 0.12) : i < 24 ? st(slab(i - 12, 1.75), 1, C.cyan, C.cyan, 0.12) : st([0, (i - 25) * 1.15, 0], 0.6, C.yellow, C.yellow, 0.5), 1, C.pink),
    // try it: a puzzle shape pushed out into 3D
    glyph: form((c, i) => { const cell = i % 9, lit = GLYPH.includes(cell); return st([(cell % 3 - 1) * 1.15, (1 - Math.floor(cell / 3)) * 1.15, (Math.floor(i / 9) - 1) * G], lit ? 1 : 0.22, lit ? C.white : C.obs, lit ? C.none : C.yellow, lit ? 0 : 0.6); }, 1, C.yellow),
    // pictures from numbers: three quarters, exactly
    bars: form((c, i) => { if (i > 23) return st([0, 0, -4], HIDE); const g = Math.floor(i / 6), a = i % 6, lit = g < 3; return st([(g - 1.5) * 1.35 + (a % 2 - 0.5) * 0.64, (Math.floor(a / 2) - 1) * 0.64, 0], 0.6, lit ? C.yellow : C.obs, lit ? C.yellow : C.none, lit ? 0.4 : 0); }, 0, C.yellow),
    // answers stay with us: sealed, with the key glowing inside
    vault: form((c, i) => st(c.map(v => v * 1.03), 1, C.obs, i === 13 ? C.magenta : C.none, i === 13 ? 4 : 0), 1, C.pink),
    // any model, same checks: two models and the gate between them
    gate: form((c, i) => {
      if (i < 9) return st([(i % 3 - 1) * G, 2.1, (Math.floor(i / 3) - 1) * G], 1, C.white);
      if (i < 17) return st([RING8[i - 9][0] * 1.7, 0, RING8[i - 9][1] * 1.7], 0.5, C.yellow, C.yellow, 0.6);
      if (i < 26) return st([((i - 17) % 3 - 1) * G, -2.1, (Math.floor((i - 17) / 3) - 1) * G], 1, C.cyan, C.cyan, 0.15);
      return st([0, 0, 0], HIDE);
    }, 1, C.cyan),
    // it grows by the topic: four subjects and the next one
    grow: form((c, i) => { const [col, n] = growAt(i), k = [C.orange, C.yellow, C.pink, C.cyan, C.magenta][col]; return st([(col - 2) * 1.15, -2.6 + n * 0.6, 0], 0.56, k, k, 0.3); }, 0.12, C.white),
    // infrastructure: a wall of units
    wall: form((c, i) => st([(i % 9 - 4) * 1.5, (1 - Math.floor(i / 9)) * 1.5, 0], 0.8, C.obs, CANDY[i % 4], 0.3), 0.15, C.white),
    // proven in code: a ring of checks
    ring: form((c, i) => { const a = i / N * Math.PI * 2; return st([Math.cos(a) * 4.3, Math.sin(a) * 4.3, 0], 0.5, CANDY[i % 4], CANDY[i % 4], 0.35); }, 0, C.cyan, { roll: 1 }),
  };

  const geo = new RoundedBoxGeometry(1, 1, 1, 4, 0.11), group = new THREE.Group(); scene.add(group);
  const blocks = cells.map(() => { const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ metalness: 0.55, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.5 })); group.add(m); return m; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.05, 12, 120), new THREE.MeshStandardMaterial({ color: C.magenta, emissive: C.magenta, emissiveIntensity: 1.2 }));
  ring.rotation.x = Math.PI / 2; group.add(ring);

  // ---------- stops: where on the page each form belongs, and where the object sits there ----------
  let W = 0, H = 0, stops = [];
  const place = at => {
    const m = W < 860;
    if (at === 'hero') return m ? [0, 0.2, 0.6, 1] : [0, -0.5, 1.15, 1];
    if (at === 'bg') return m ? [0, 0, 1.1, 0.12] : [8.8, -1.4, 1.3, 0.22];       // to the right edge and faint, behind dense content       // off to the side and dimmed, behind dense content
    if (at === 'back') return m ? [0, 0, 1.2, 0.3] : [0, 0, 1.5, 0.55];        // centred behind a card
    if (at === 'left') return m ? [0, 2.3, 0.6, 1] : [-3.9, 0, 0.95, 1];
    return m ? [0, 2.3, 0.6, 1] : [0, 0, 1, 1];
  };
  const measure = () => {
    stops = els.map(el => {
      const seq = el.classList.contains('step') && el.closest('.seq'); let y;
      if (seq) { const all = [...seq.querySelectorAll('.step')]; y = seq.getBoundingClientRect().top + scrollY + all.indexOf(el) / all.length * (seq.offsetHeight - H); }
      else y = el.getBoundingClientRect().top + scrollY - (el.dataset.at === 'bg' || el.dataset.at === 'back' ? H * 0.4 : 0);
      return { y: Math.max(0, y), f: SHAPES[el.dataset.shape] || SHAPES.cube, at: place(el.dataset.at), field: new THREE.Color(getComputedStyle(el).getPropertyValue('--f').trim() || '#ffffff') };
    }).sort((a, b) => a.y - b.y);
    stops[0].y = 0;
  };
  const size = () => { W = innerWidth; H = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, W < 860 ? 1.5 : 2)); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); measure(); };
  addEventListener('resize', size); addEventListener('load', measure); size(); setInterval(measure, 1500);

  // ---------- drag to turn ----------
  let dragging = false, lx = 0, ly = 0, yaw = 0, pitch = 0, vy = 0, vp = 0;
  cv.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.classList.add('grab'); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; vy = (e.clientX - lx) * 0.008; vp = (e.clientY - ly) * 0.006; lx = e.clientX; ly = e.clientY; });
  const drop = () => { dragging = false; cv.classList.remove('grab'); };
  cv.addEventListener('pointerup', drop); cv.addEventListener('pointercancel', drop);

  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (a, b, f) => a + (b - a) * f, tmp = new THREE.Color(), tmp2 = new THREE.Color();
  let sm = scrollY, drawn = '';
  const frame = ms => {
    requestAnimationFrame(frame);
    const t = still ? 0 : ms / 1000;
    sm += (scrollY - sm) * (still ? 1 : 0.14);
    yaw += vy; pitch += vp; vy *= 0.92; vp *= 0.92;
    if (!dragging) { yaw *= 0.985; pitch *= 0.97; }
    if (still) { const sig = `${Math.round(sm)}|${W}|${yaw.toFixed(3)}|${pitch.toFixed(3)}`; if (sig === drawn) return; drawn = sig; }

    let i = 0; while (i < stops.length - 1 && stops[i + 1].y <= sm) i++;
    const a = stops[i], b = stops[Math.min(stops.length - 1, i + 1)], f = b === a ? 0 : ss(0.5, 1, (sm - a.y) / Math.max(1, b.y - a.y)), A = a.f, B = b.f;
    blocks.forEach((m, k) => {
      const p = A.b[k], q = B.b[k];
      m.position.lerpVectors(p.p, q.p, f); m.position.y += Math.sin(t * 0.8 + k) * 0.04;
      m.scale.setScalar(mix(p.s, q.s, f));
      m.quaternion.slerpQuaternions(p.q, q.q, f);
      m.material.color.lerpColors(p.c, q.c, f);
      m.material.emissive.lerpColors(p.e, q.e, f);
      m.material.emissiveIntensity = mix(p.ei, q.ei, f);
    });
    const spin = mix(A.spin, B.spin, f), turn = ((t * 0.22 + Math.PI) % (Math.PI * 2)) - Math.PI, roll = mix(A.roll, B.roll, f);
    group.rotation.set(0.38 * spin + pitch, turn * spin + yaw, roll * (((t * 0.12 + Math.PI) % (Math.PI * 2)) - Math.PI));
    group.position.set(mix(a.at[0], b.at[0], f), mix(a.at[1], b.at[1], f), 0);
    group.scale.setScalar(mix(a.at[2], b.at[2], f));
    cv.style.opacity = mix(a.at[3], b.at[3], f).toFixed(3);
    const scan = mix(A.scan, B.scan, f); ring.scale.setScalar(Math.max(HIDE, scan)); ring.position.y = Math.sin(t * 1.5) * 2;
    document.body.style.backgroundColor = '#' + tmp.lerpColors(a.field, b.field, ss(0.8, 1, (sm - a.y) / Math.max(1, b.y - a.y))).getHexString();   // the field holds, then turns quickly
    key.color.copy(tmp2.lerpColors(A.light, B.light, f));
    renderer.render(scene, cam);
  };
  requestAnimationFrame(frame);
  document.documentElement.classList.add('gl');
}
