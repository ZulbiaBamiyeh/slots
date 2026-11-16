// Input + immediate-mode widgets shared by all scenes.
import { V, rect, rrect, panel, inset, spr, pxScale, glow, toVirtual } from './gfx.js';
import { text, measure, rich, richHeight } from './font.js';
import { T, Spring, fmt } from './fx.js';
import { sfx, initAudio } from './audio.js';
import { SYM, CHARM, DECREE, FAMILIES, RARITY, QUIPS } from './data.js';
import { djinnSprite, DJ_W, DJ_H, NAVY } from './sprites.js';

export const C = {
  cream: '#FFF4E0', navy: '#1B1A3A', gold: '#F2A93B', yellow: '#FFD84A', red: '#E0303A', crimson: '#B0123C',
  blue: '#3A5FE0', sky: '#6FB6FF', green: '#3FBF5A', pink: '#FF8FB8', purple: '#9A5CE8', dim: '#8E88C0',
  coins: '#2F7BE8', mult: '#E0303A', panel: '#241F4D', dark: '#15122F',
};

// ---------- input
export const I = { x: -99, y: -99, px: -99, py: -99, down: false, pressed: false, released: false, mouse: false, used: false, any: false };
export function initInput(el) {
  const pos = (e) => { [I.x, I.y] = toVirtual(e.clientX, e.clientY); };
  el.addEventListener('pointerdown', (e) => {
    initAudio();
    I.mouse = e.pointerType === 'mouse';
    pos(e); I.px = I.x; I.py = I.y; I.down = true; I.pressed = true;
    e.preventDefault();
  });
  addEventListener('pointermove', (e) => { I.mouse = e.pointerType === 'mouse'; pos(e); });
  const up = (e) => { if (!I.down) return; pos(e); I.down = false; I.released = true; };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', () => { I.down = false; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => { initAudio(); I.key = e.key; });
}
export function endInput() {
  I.pressed = false; I.released = false; I.used = false; I.key = null;
  if (!I.mouse && !I.down) { I.x = -99; I.y = -99; }
}
export const inR = (x, y, rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
export const over = (x, y, w, h) => inR(I.x, I.y, x, y, w, h);
export function tapped(x, y, w, h) {
  if (I.released && !I.used && inR(I.x, I.y, x, y, w, h) && inR(I.px, I.py, x, y, w, h)) { I.used = true; return true; }
  return false;
}
export const holding = (x, y, w, h) => I.down && inR(I.x, I.y, x, y, w, h) && inR(I.px, I.py, x, y, w, h);

// persistent per-widget state
const states = new Map();
export function st(id, init) {
  let s = states.get(id);
  if (!s) { s = init(); states.set(id, s); }
  return s;
}

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
}

// Chunky arcade button. Returns true when clicked.
export function button(id, x, y, w, h, label, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const g = V.g;
  const s = st('b:' + id, () => ({ sc: new Spring(1, 300, 16), hov: 0 }));
  s.sc.step(Math.min(0.033, T.dt || 0.016));
  const live = !o.disabled && o.enabled !== false;
  const hov = live && I.mouse && over(x, y, w, h);
  const held = live && holding(x, y, w, h);
  s.hov += ((hov ? 1 : 0) - s.hov) * 0.3;
  let col = o.col || C.gold;
  if (o.disabled) col = '#4A4570';
  const lip = 3, dy = held ? 2 : 0;
  g.save();
  const cx = x + w / 2, cy = y + h / 2;
  g.translate(cx, cy); g.scale(s.sc.v, s.sc.v); g.translate(-cx, -cy);
  rrect(x, y + 3, w, h, 'rgba(8,6,24,0.5)');
  rrect(x, y + lip, w, h - lip, shade(col, -0.45));
  rrect(x, y + dy, w, h - lip, NAVY);
  rrect(x + 1, y + 1 + dy, w - 2, h - lip - 2, shade(col, 0.28 + s.hov * 0.2));
  rrect(x + 1, y + 2 + dy, w - 2, h - lip - 3, shade(col, s.hov * 0.12));
  const tc = o.disabled ? '#8A86A8' : (o.tcol || C.cream);
  const sc = o.scale || 1;
  const ty = y + dy + (h - lip) / 2 - 4 * sc + (o.sub ? -4 : 0);
  if (o.icon) {
    const tw = measure(label, sc);
    spr(o.icon, cx - tw / 2 - 6, y + dy + (h - lip) / 2, pxScale(0.75), 0, o.disabled ? 0.5 : 1);
    text(g, label, cx + 6, ty, { col: tc, align: 'c', scale: sc, outline: o.disabled ? null : shade(col, -0.6) });
  } else text(g, label, cx, ty, { col: tc, align: 'c', scale: sc, outline: o.disabled ? null : shade(col, -0.6) });
  if (o.sub) text(g, o.sub, cx, ty + 8 * sc + 1, { col: o.disabled ? '#77739A' : shade(col, 0.75), align: 'c' });
  g.restore();
  if (o.enabled === false) return false;
  if (tapped(x, y, w, h)) {
    if (o.disabled) { sfx.error(); s.sc.kick(-1.5); return false; }
    s.sc.kick(3); if (!o.quiet) sfx.click();
    return true;
  }
  return false;
}

// ---------- items: {k:'sym'|'charm'|'decree', id, inst?}
export function itemDef(it) { return it.k === 'sym' ? SYM[it.id] : it.k === 'charm' ? CHARM[it.id] : DECREE[it.id]; }
function itemMeta(it) {
  const d = itemDef(it);
  if (it.k === 'decree') return { tag: 'DECREE', tcol: '#FF7A8A', ncol: '#FF7A8A' };
  if (d.curse) return { tag: 'CURSE', tcol: FAMILIES.curse.col, ncol: '#C79BFF' };
  if (d.relic) return { tag: 'CURSED RELIC', tcol: FAMILIES.relic.col, ncol: '#FF7A8A' };
  const r = RARITY[d.rar];
  if (it.k === 'charm') return { tag: r.name.toUpperCase() + ' CHARM', tcol: r.col, ncol: C.cream };
  return { tag: FAMILIES[d.fam].name.toUpperCase(), tcol: FAMILIES[d.fam].col, tag2: r.name.toUpperCase(), tcol2: r.col, ncol: C.cream };
}
function itemExtra(it) {
  const d = itemDef(it);
  if (it.k === 'sym' && !d.curse) {
    const b = it.inst ? it.inst.b : 0;
    return `Pays [c]${d.coins + b}[]${b ? ` (${d.coins}${b > 0 ? '+' : ''}${b} grown)` : ''}`;
  }
  if (it.k === 'charm' && it.ch) {
    if (it.id === 'scarab') return `Now [m]x${(1 + 0.25 * (it.ch.n || 0)).toFixed(2)} Mult[]`;
    if (it.id === 'sandtimer') return `[x]${it.ch.n ?? 8} spins left[]`;
  }
  return '';
}
export function infoHeight(it, w) {
  const d = itemDef(it), ex = itemExtra(it);
  return 8 + 10 + 10 + richHeight(d.desc, w - 12) + (ex ? 12 : 0) + 6;
}
export function infoCard(x, y, w, it, o = {}) {
  const g = V.g, d = itemDef(it), m = itemMeta(it);
  const h = infoHeight(it, w);
  x = Math.round(x); y = Math.round(y);
  panel(x, y, w, h, { fill: '#1A1638', hi: d.relic ? '#7A1838' : '#4A4290', border: '#07061A' });
  text(g, d.name, x + 6, y + 6, { col: m.ncol, shadow: '#07061A' });
  const tw = measure(m.tag);
  rrect(x + 6, y + 16, tw + 6, 9, m.tcol, 1);
  text(g, m.tag, x + 9, y + 17, { col: NAVY });
  if (m.tag2) { const t2 = measure(m.tag2); rrect(x + tw + 15, y + 16, t2 + 6, 9, m.tcol2, 1); text(g, m.tag2, x + tw + 18, y + 17, { col: NAVY }); }
  let yy = y + 29;
  yy += rich(g, d.desc, x + 6, yy, w - 12);
  const ex = itemExtra(it);
  if (ex) rich(g, ex, x + 6, yy + 2, w - 12, { col: C.dim });
  return h;
}
// Info card that floats near an anchor rect and stays on screen.
export function infoNear(ax, ay, aw, ah, it) {
  const w = Math.min(190, V.W - 8);
  const h = infoHeight(it, w);
  let x = Math.max(4, Math.min(V.W - w - 4, ax + aw / 2 - w / 2));
  let y = ay - h - 4;
  if (y < V.safeT + 2) y = ay + ah + 4;
  if (y + h > V.H - 2) y = V.H - h - 2;
  infoCard(x, y, w, it);
}

// Card face used in the Bazaar and Bargain.
export function card(x, y, w, h, it, o = {}) {
  const g = V.g, d = itemDef(it);
  const cx = x + w / 2, cy = y + h / 2;
  const seed = (x * 13 + y * 7) % 10;
  const rot = (o.still ? 0 : Math.sin(V.t * 1.4 + seed) * 0.025) + (o.rot || 0);
  const lift = o.lift || 0, sc = o.sc || 1;
  g.save();
  g.translate(cx, cy - lift); g.rotate(rot); g.scale(sc, sc);
  const hw = w / 2, hh = h / 2;
  rrect(-hw, -hh + 3 + lift * 0.6, w, h, 'rgba(8,6,24,0.5)');
  const relic = d.relic;
  const edge = relic ? '#FF4A6A' : it.k === 'charm' ? C.gold : NAVY;
  rrect(-hw, -hh, w, h, NAVY);
  rrect(-hw + 1, -hh + 1, w - 2, h - 2, o.sel ? C.yellow : edge);
  if (it.k === 'charm') { rrect(-hw + 2, -hh + 2, w - 4, h - 4, relic ? '#3A0E22' : '#2E2760'); rrect(-hw + 3, -hh + 3, w - 6, h * 0.55, relic ? '#57142F' : '#3D3580', 1); }
  else { rrect(-hw + 2, -hh + 2, w - 4, h - 4, relic ? '#FFD9DD' : C.cream); rrect(-hw + 2, -hh + h * 0.62, w - 4, h * 0.38 - 2, relic ? '#F5BCC4' : '#F3E2C2', 1); }
  if (relic) glow(0, -hh + h * 0.36, w * 0.6, 'rgba(255,60,90,0.5)', 0.5 + 0.3 * Math.sin(V.t * 3 + seed));
  const ss = pxScale(Math.min(2, (w - 8) / 16));
  spr(it.id, 0, -hh + 4 + 8 * ss + Math.sin(V.t * 2 + seed) * (o.still ? 0 : 0.6), ss);
  if (d.rar && RARITY[d.rar] && !relic) { rrect(-hw + 3, -hh + 3, 4, 4, NAVY, 0); rect(-hw + 4, -hh + 4, 2, 2, RARITY[d.rar].col); }
  // name (up to two lines)
  const tc = it.k === 'charm' ? C.cream : NAVY;
  const words = d.name.split(' ').flatMap((wd) => {
    if (measure(wd) <= w - 5) return [wd];
    const cut = Math.ceil(wd.length / 2);
    return [wd.slice(0, cut) + '-', wd.slice(cut)];
  });
  const lines = [];
  for (const wd of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && !last.endsWith('-') && measure(last + ' ' + wd) <= w - 6) lines[lines.length - 1] = last + ' ' + wd; else lines.push(wd);
  }
  const ny = -hh + 8 + 16 * ss + (lines.length > 1 ? 0 : 4);
  lines.slice(0, 2).forEach((ln, k) => text(g, ln, 0, ny + k * 9, { col: tc, align: 'c' }));
  if (o.price !== undefined) {
    const str = String(o.price), pw = measure(str) + 14;
    rrect(-pw / 2, hh - 8, pw, 12, NAVY);
    rrect(-pw / 2 + 1, hh - 7, pw - 2, 10, o.afford === false ? '#6A2030' : '#3B2E08');
    spr('coin', -pw / 2 + 6, hh - 2, pxScale(0.5));
    text(g, str, -pw / 2 + 11, hh - 6, { col: o.afford === false ? '#FF8A9A' : C.yellow });
  }
  if (o.sold) { g.globalAlpha = 0.72; rrect(-hw, -hh, w, h, '#0E0C24'); g.globalAlpha = 1; text(g, 'SOLD', 0, -4, { col: '#8E88C0', align: 'c' }); }
  g.restore();
}

// ---------- the djinn
export const DJ = { mood: 'neutral', until: 0, say: '', sayAt: -99, sayFor: 2.2, kind: 'blue', pop: new Spring(0, 200, 14) };
export function djinnMood(m, sec = 1.6) { DJ.mood = m; DJ.until = T.now + sec; }
export function djinnSay(kind, mood) {
  const arr = QUIPS[kind] || [kind];
  DJ.say = arr[Math.floor(Math.random() * arr.length)];
  DJ.sayAt = T.now; DJ.sayFor = 1.6 + DJ.say.length * 0.05;
  DJ.pop.v = 0; DJ.pop.target = 1; DJ.pop.vel = 0;
  if (mood) djinnMood(mood, DJ.sayFor);
  sfx.djinn();
}
export function drawDjinn(x, y, scale, o = {}) {
  const g = V.g, img = djinnSprite(DJ.kind);
  if (T.now > DJ.until) DJ.mood = 'neutral';
  const bob = Math.sin(V.t * 2.1) * 1.5;
  const rowsShown = o.rows || DJ_H;
  g.save();
  g.translate(x, y + bob); g.scale(scale, scale);
  for (let r = 0; r < rowsShown; r++) {
    const dx = r > 20 ? Math.sin(V.t * 3 + r * 0.55) * (r - 20) * 0.16 : 0;
    g.drawImage(img, 0, r, DJ_W, 1, -12 + dx, r - 16, DJ_W, 1.02);
  }
  const p = (px, py, w, h, col) => { g.fillStyle = col; g.fillRect(px - 12, py - 16, w, h); };
  const blink = (V.t % 3.7) < 0.12;
  const m = DJ.mood;
  if (m === 'grin') {
    for (const ex of [8, 14]) { p(ex - 1, 8, 1, 1, NAVY); p(ex, 7, 2, 1, NAVY); p(ex + 2, 8, 1, 1, NAVY); }
    p(8, 10, 8, 3, NAVY); p(9, 10, 6, 1, '#FFFFFF'); p(9, 11, 6, 1, '#E0303A');
  } else if (m === 'scowl') {
    p(7, 6, 2, 1, NAVY); p(9, 7, 1, 1, NAVY); p(15, 6, 2, 1, NAVY); p(14, 7, 1, 1, NAVY);
    for (const ex of [8, 14]) { p(ex, 8, 2, 1, '#FFD84A'); }
    p(10, 12, 1, 1, NAVY); p(11, 11, 2, 1, NAVY); p(13, 12, 1, 1, NAVY);
  } else if (m === 'shock') {
    for (const ex of [8, 14]) { p(ex - 1, 6, 3, 3, '#FFFFFF'); p(ex, 7, 1, 1, NAVY); }
    p(11, 10, 2, 3, NAVY);
  } else if (m === 'smirk') {
    p(8, 7, 2, 2, '#FFFFFF'); p(9, 8, 1, 1, NAVY); p(14, 8, 2, 1, NAVY); p(13, 6, 3, 1, NAVY);
    p(10, 11, 4, 1, NAVY); p(14, 10, 1, 1, NAVY);
  } else {
    for (const ex of [8, 14]) { if (blink) p(ex, 8, 2, 1, NAVY); else { p(ex, 7, 2, 2, '#FFFFFF'); p(ex + (ex < 12 ? 1 : 0), 8, 1, 1, NAVY); } }
    p(10, 11, 4, 1, NAVY);
  }
  g.restore();
}
// Speech bubble; (x,y) is the tip near the djinn, grows toward `dir` (-1 left, 1 right).
export function drawSpeech(x, y, dir = -1, maxW = 120) {
  const age = T.now - DJ.sayAt;
  if (!DJ.say || age > DJ.sayFor) return;
  DJ.pop.step(Math.min(0.033, T.dt || 0.016));
  const g = V.g;
  const w = Math.min(maxW, measure(DJ.say) + 12);
  const h = richHeight(DJ.say, w - 10) + 8;
  const a = age > DJ.sayFor - 0.2 ? (DJ.sayFor - age) / 0.2 : 1;
  g.save(); g.globalAlpha = Math.max(0, a);
  g.translate(x, y); g.scale(DJ.pop.v, DJ.pop.v);
  const bx = dir < 0 ? -w - 4 : 4;
  rrect(bx, -h / 2 + 2, w, h, 'rgba(8,6,24,0.5)');
  rrect(bx, -h / 2, w, h, NAVY); rrect(bx + 1, -h / 2 + 1, w - 2, h - 2, C.cream);
  g.fillStyle = C.cream; g.fillRect(dir < 0 ? -5 : 1, -2, 4, 3); g.fillStyle = NAVY; g.fillRect(dir < 0 ? -1 : 0, -1, 1, 1);
  rich(g, DJ.say, bx + 5, -h / 2 + 5, w - 10, { col: NAVY });
  g.restore();
}

// small helpers
export function goldTag(x, y, amount, o = {}) {
  const g = V.g, str = fmt(amount);
  const w = measure(str, o.scale || 1) + 16;
  if (o.align === 'r') x -= w; else if (o.align === 'c') x -= w / 2;
  spr('coin', x + 6, y + 4, pxScale(0.75));
  text(g, str, x + 14, y, { col: C.yellow, scale: o.scale || 1, shadow: '#3B2E08' });
  return w;
}
export function dimScreen(a = 0.6) { V.g.fillStyle = `rgba(8,6,24,${a})`; V.g.fillRect(-20, -20, V.W + 40, V.H + 40); }
export { rect, rrect, panel, inset, spr, pxScale, glow, text, measure, rich, richHeight };
