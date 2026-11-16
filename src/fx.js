// Time, tweens, springs, particles and floating text.
import { V, spr, rect, glow } from './gfx.js';
import { text, measure } from './font.js';

export const T = { now: 0, speed: 1, dt: 0 };
const waits = [];
const tweens = [];

export const ease = {
  lin: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

export function wait(sec) { return new Promise((res) => waits.push({ at: T.now + sec, res })); }
export function tween(obj, props, dur, fn = ease.out, delay = 0) {
  return new Promise((res) => {
    const from = {};
    tweens.push({ obj, props, from, t0: T.now + delay, dur: Math.max(0.0001, dur), fn, res, started: false });
  });
}

// springy scalar
export class Spring {
  constructor(v = 0, k = 220, d = 14) { this.v = v; this.target = v; this.vel = 0; this.k = k; this.d = d; }
  kick(vel) { this.vel += vel; }
  set(v) { this.v = v; this.target = v; this.vel = 0; }
  step(dt) {
    const a = (this.target - this.v) * this.k - this.vel * this.d;
    this.vel += a * dt; this.v += this.vel * dt;
  }
}
const springs = new Set();
export function spring(v, k, d) { const s = new Spring(v, k, d); springs.add(s); return s; }

export const parts = [];
export const floats = [];

export function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (o.dir ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
    const sp = (o.speed ?? 60) * (0.4 + Math.random() * 0.9);
    parts.push({
      x: x + (Math.random() - 0.5) * (o.rx ?? 4), y: y + (Math.random() - 0.5) * (o.ry ?? 4),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 160, drag: o.drag ?? 1.5,
      life: 0, max: (o.life ?? 0.6) * (0.6 + Math.random() * 0.7),
      col: Array.isArray(o.col) ? o.col[Math.floor(Math.random() * o.col.length)] : (o.col || '#FFD84A'),
      size: (o.size ?? 2) * (0.6 + Math.random() * 0.8), spr: o.spr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
      add: o.add, to: o.to,
    });
  }
}
export function floatText(str, x, y, o = {}) {
  const f = { str: String(str), x, y, vy: o.vy ?? -26, life: 0, max: o.life ?? 0.9, col: o.col || '#FFF4E0', scale: o.scale || 1, pop: 0, rot: (Math.random() - 0.5) * 0.2 };
  floats.push(f);
  return f;
}

let shakeAmt = 0, shakeT = 0;
export function shake(a) { shakeAmt = Math.min(14, Math.max(shakeAmt, a)); V.ab = Math.max(V.ab, a * 0.0006); }
export function flash(a) { V.flash = Math.max(V.flash, a); }

export function updateFx(rawDt) {
  const dt = rawDt * T.speed;
  T.dt = dt; T.now += dt;
  for (let i = waits.length - 1; i >= 0; i--) if (waits[i].at <= T.now) { const w = waits[i]; waits.splice(i, 1); w.res(); }
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (T.now < tw.t0) continue;
    if (!tw.started) { tw.started = true; for (const k in tw.props) tw.from[k] = tw.obj[k]; }
    const t = Math.min(1, (T.now - tw.t0) / tw.dur), e = tw.fn(t);
    for (const k in tw.props) tw.obj[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
    if (t >= 1) { tweens.splice(i, 1); tw.res(); }
  }
  const sdt = Math.min(dt, 0.033);
  for (const s of springs) s.step(sdt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    if (p.to) {
      const k = Math.min(1, p.life / p.max);
      p.vx += (p.to[0] - p.x) * 14 * k * dt * 10; p.vy += (p.to[1] - p.y) * 14 * k * dt * 10;
      p.vx *= 1 - Math.min(1, 6 * dt); p.vy *= 1 - Math.min(1, 6 * dt);
    } else {
      p.vy += p.g * dt; p.vx *= 1 - Math.min(1, p.drag * dt); p.vy *= 1 - Math.min(1, p.drag * dt * 0.3);
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life += dt; f.y += f.vy * dt; f.vy *= 1 - Math.min(1, 2.5 * dt);
    if (f.life >= f.max) floats.splice(i, 1);
  }
  // screen shake + decays (real time)
  shakeT += rawDt * 60;
  shakeAmt *= Math.pow(0.0015, rawDt);
  if (shakeAmt < 0.05) shakeAmt = 0;
  V.shakeX = Math.sin(shakeT * 1.7) * shakeAmt; V.shakeY = Math.cos(shakeT * 2.3) * shakeAmt * 0.8;
  V.flash *= Math.pow(0.002, rawDt); if (V.flash < 0.003) V.flash = 0;
  V.ab *= Math.pow(0.01, rawDt);
}

export function drawParts() {
  const g = V.g;
  for (const p of parts) {
    const k = 1 - p.life / p.max;
    if (p.add) { glow(p.x, p.y, p.size * 3 * (0.5 + k), p.col, k); continue; }
    if (p.spr) { spr(p.spr, p.x, p.y, p.size / 8, p.rot, Math.min(1, k * 3)); continue; }
    g.globalAlpha = Math.min(1, k * 2.5);
    const s = p.size * (0.5 + k * 0.5);
    rect(p.x - s / 2, p.y - s / 2, s, s, p.col);
  }
  g.globalAlpha = 1;
}
export function drawFloats() {
  const g = V.g;
  for (const f of floats) {
    const t = f.life / f.max;
    const pop = t < 0.14 ? ease.back(t / 0.14) : 1;
    const a = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const sc = f.scale * (0.5 + 0.5 * pop);
    g.save();
    g.globalAlpha = a;
    g.translate(f.x, f.y); g.rotate(f.rot * (1 - t)); g.scale(sc, sc);
    text(g, f.str, 0, -4, { col: f.col, align: 'c', outline: '#1B1A3A' });
    g.restore();
  }
}
export function clearFx() { parts.length = 0; floats.length = 0; }

export const fmt = (n) => {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e7) return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString('en-US');
};
export const fmtMult = (m) => (Math.abs(m - Math.round(m)) < 0.005 ? String(Math.round(m)) : m >= 100 ? m.toFixed(0) : m.toFixed(2).replace(/0$/, ''));
export { measure };
