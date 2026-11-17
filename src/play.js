// The slot machine screen.
import * as G from './game.js';
import { SYM, CHARM, DECREE, FAMILIES, ROUND_NAMES } from './data.js';
import { V, setMood, snap } from './gfx.js';
import { T, tween, wait, spring, ease, burst, floatText, shake, flash, fmt, fmtMult } from './fx.js';
import { sfx, A } from './audio.js';
import { silhouette } from './sprites.js';
import {
  C, I, over, tapped, button, infoNear, DJ, djinnMood, djinnSay, drawDjinn, drawSpeech, dimScreen, shade,
  rect, rrect, panel, inset, spr, pxScale, glow, text, measure, rich, richHeight,
} from './ui.js';
import { S, scenes, save, go, checkUnlocks, toast } from './state.js';
import { openEditor, offerReward } from './screens.js';

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mkCell = () => ({ sc: spring(1, 260, 13), rot: spring(0, 200, 9), ox: spring(0, 170, 13), oy: spring(0, 170, 13), gone: 0, gild: 0, dead: 0, tame: 0 });

export const P = {
  pos: [0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0], spd: [0, 0, 0, 0, 0], spinning: [false, false, false, false, false],
  bounce: [0, 1, 2, 3, 4].map(() => spring(0, 380, 14)),
  cell: Array.from({ length: 15 }, mkCell),
  busy: false, res: null, dCoins: 0, dMult: 1, showScore: false, dRound: 0, dGold: 0, total: null,
  cP: spring(1, 300, 12), mP: spring(1, 300, 12), rP: spring(1, 300, 12), gP: spring(1, 300, 12), tP: spring(1, 260, 10),
  lineFx: [], banner: null, payout: null, sel: null, L: null, bOver: null, heat: 0, tease: -1, hint: '', fast: false,
};

function resetCells() {
  for (const c of P.cell) { c.gone = 0; c.gild = 0; c.dead = 0; c.tame = 0; c.sc.set(1); c.rot.set(0); c.ox.set(0); c.oy.set(0); }
  P.lineFx = [];
}

// ---------- layout
function layout() {
  const W = V.W, H = V.H, top = V.safeT + 3, bot = H - V.safeB - 3;
  const o = {};
  if (V.portrait) {
    const cell = clamp(Math.floor((W - 24) / 5), 30, 46);
    const mw = cell * 5 + 20, mh = cell * 3 + 71;
    const fixed = 48 + 38 + mh + 40 + 22 + 36;
    const free = Math.max(0, bot - top - fixed);
    const gap = Math.min(12, free / 5);
    let y = top + (free - gap * 5) / 2;
    const x = 4, w = W - 8;
    o.head = { x, y, w: w - 52, h: 48 }; o.dj = { x: x + w - 48, y, w: 48, h: 48 }; y += 48 + gap;
    o.score = { x, y, w, h: 38 }; y += 38 + gap;
    o.mach = { x: (W - mw) / 2, y, w: mw, h: mh, cell }; y += mh + gap;
    o.charms = { x, y, w, h: 40 }; y += 40 + gap;
    o.status = { x, y, w, h: 22 }; y += 22 + gap;
    o.btn = { x, y, w, h: 36 };
  } else {
    const cell = clamp(Math.min(Math.floor((W - 228) / 5), Math.floor((bot - top - 118) / 3)), 28, 56);
    const mw = cell * 5 + 20, mh = cell * 3 + 71;
    const mx = (W - mw) / 2, my = top + (bot - top - (mh + 42)) / 2;
    o.mach = { x: mx, y: my, w: mw, h: mh, cell };
    o.btn = { x: mx, y: my + mh + 6, w: mw, h: 36 };
    const lw = mx - 10, tot = mh + 42;
    o.head = { x: 4, y: my, w: lw, h: 66 };
    o.score = { x: 4, y: my + 72, w: lw, h: 58 };
    o.status = { x: 4, y: my + 136, w: lw, h: Math.min(64, tot - 136) };
    const rx = mx + mw + 6, rw = W - 4 - rx;
    o.dj = { x: rx, y: my, w: rw, h: 70 };
    o.charms = { x: rx, y: my + 76, w: rw, h: tot - 76 };
  }
  for (const k in o) for (const f of ['x', 'y', 'w', 'h']) o[k][f] = Math.round(o[k][f]);
  const m = o.mach;
  m.rx = m.x + 6; m.ry = m.y + 6 + 19; m.pitch = m.cell + 2; m.rh = m.cell * 3 + 4;
  m.ss = pxScale(m.cell * 0.8 / 16);
  return o;
}
const cellXY = (i) => { const m = P.L.mach; const c = Math.floor(i / 3), r = i % 3; return [m.rx + c * m.pitch + m.cell / 2, m.ry + r * m.pitch + m.cell / 2]; };
function charmXY(k) { const s = P.L.slots; return s && s[k] ? [s[k].x + s[k].w / 2, s[k].y + s[k].h / 2] : [V.W / 2, V.H / 2]; }
function relicXY(k) { const s = P.L.rslots; return s && s[k] ? [s[k].x + 9, s[k].y + 9] : charmXY(0); }
function srcXY(ev) { return ev.i != null ? cellXY(ev.i) : ev.charm != null ? charmXY(ev.charm) : ev.relic != null ? relicXY(ev.relic) : [V.W / 2, V.H / 2]; }
const boxXY = (which) => { const b = P.L[which]; return b ? [b.x + b.w / 2, b.y + b.h / 2] : [V.W / 2, 60]; };

// ---------- flow
function enter() {
  const run = S.run;
  P.L = layout();
  P.busy = false; P.res = null; P.total = null; P.showScore = false; P.payout = null; P.sel = null; P.banner = null; P.bOver = null;
  T.speed = 1; P.fast = false;
  for (let c = 0; c < 5; c++) { P.pos[c] = P.last[c] = run.offsets[c]; P.spinning[c] = false; }
  P.dRound = run.roundScore; P.dGold = run.gold;
  resetCells();
  DJ.kind = lampDjinn(run);
  const boss = G.isBoss(run);
  setMood(boss ? 'boss' : 'play'); A.mode = 'play'; A.intensity = boss ? 0.55 : 0.3;
  if (run.phase === 'landed') P.res = G.evaluate(run);
  else if (run.phase === 'paid') finishRound();
  else if (run.phase === 'ready' && run.spinInRound === 0) intro();
}
export function lampDjinn(run) { return { azure: 'blue', rose: 'pink', gilded: 'gold', ember: 'red' }[run.lamp] || 'blue'; }

async function intro() {
  const run = S.run, dec = G.decreeOf(run);
  P.busy = true;
  const act = G.actOf(run.round) + 1, step = run.round % 3;
  P.banner = { t0: T.now, dur: dec ? 2.3 : 1.4, title: dec ? DECREE[dec].name : ROUND_NAMES[step], sub: dec ? DECREE[dec].desc : `Pay ${fmt(G.tributeFor(run))}`, top: run.endless ? `ENDLESS ${run.round + 1}` : `ACT ${act}`, col: dec ? '#FF4A6A' : C.yellow };
  sfx.whoosh();
  if (dec) { sfx.curse(); djinnSay('decree', 'smirk'); shake(3); } else djinnSay('start');
  await wait(P.banner.dur);
  P.banner = null; P.busy = false;
  if (S.meta.tut) P.hint = 'Press SPIN!';
}

function teaseReel(run) {
  // returns index of first reel that should spin with suspense, or -1
  const b = G.board(run);
  for (let c = 3; c < 5; c++) for (let r = 0; r < 3; r++) {
    let id = null, ok = true;
    for (let k = 0; k < c; k++) {
      const d = SYM[b[k * 3 + r].id];
      if (d.tags.includes('wild')) continue;
      if (!['fruit', 'garden', 'creature', 'treasure', 'magic'].includes(d.fam)) { ok = false; break; }
      if (id === null) id = d.id; else if (id !== d.id) { ok = false; break; }
    }
    if (ok) return c;
  }
  return -1;
}

const spinEase = (t) => 1 - Math.pow(1 - t, 2.3);
async function animateSpin(cols) {
  const run = S.run;
  sfx.spinStart();
  const tease = cols.length === 5 ? teaseReel(run) : -1;
  let dur = 0.42, done = 0;
  const jobs = cols.map((c, n) => {
    dur += 0.2 + (c === tease ? 0.9 : c > tease && tease >= 0 ? 0.45 : 0);
    const myDur = dur;
    const len = run.reels[c].length, target = run.offsets[c];
    const turns = Math.ceil((10 + myDur * 22) / len);
    const dist = mod(Math.round(P.pos[c]) - target, len) + turns * len;
    P.pos[c] = P.last[c] = target + dist;
    P.spinning[c] = true;
    return (async () => {
      await tween(P.pos, { [c]: target }, myDur, spinEase);
      P.pos[c] = target; P.spinning[c] = false;
      P.bounce[c].kick(160);
      sfx.thunk(c); shake(1.2); done++;
      sfx.spinPitch(done);
      const m = P.L.mach;
      burst(m.rx + c * m.pitch + m.cell / 2, m.ry + m.rh, 6, { col: ['#FFF4E0', '#F2A93B'], speed: 50, dir: -Math.PI / 2, spread: 2.4, life: 0.35, size: 1.6 });
      if (tease >= 0 && c === tease - 1) { sfx.tension(); P.tease = tease; djinnMood('shock', 1.2); }
      if (c === tease) P.tease = c + 1 < 5 ? c + 1 : -1;
    })();
  });
  await Promise.all(jobs);
  P.tease = -1;
  sfx.spinStop();
}

function landed() {
  const run = S.run;
  P.res = G.evaluate(run);
  // show what will not score before the player commits
  for (const x of P.res.cells) P.cell[x.i].dead = x.dead ? 1 : 0;
  for (const l of P.res.lines) for (let c = l.c0; c < l.c0 + l.len; c++) P.cell[c * 3 + l.row].sc.kick(l.kind === 'pure' ? 4 : 2);
  if (P.res.lines.some((l) => l.kind === 'pure')) { sfx.line(4); djinnMood('shock', 1); }
  else if (P.res.lines.length) sfx.line(2);
  if (S.meta.tut) P.hint = run.wishesLeft > 0 ? 'Tap a symbol waiting above or below a reel to NUDGE it in, or HOLD + RESPIN. Each costs a Wish.' : 'CASH IN to score.';
}

async function doSpin() {
  const run = S.run;
  if (P.busy || run.phase !== 'ready') return;
  P.busy = true; P.sel = null; P.hint = '';
  resetCells(); P.res = null; P.total = null; P.showScore = false;
  G.spin(run); save();
  await animateSpin([0, 1, 2, 3, 4]);
  landed();
  P.busy = false;
}
async function doRespin() {
  const run = S.run;
  if (P.busy || run.phase !== 'landed') return;
  if (run.wishesLeft <= 0) { sfx.error(); djinnSay('nowish', 'smirk'); return; }
  const cols = [0, 1, 2, 3, 4].filter((c) => !run.held[c]);
  if (!cols.length || !G.respin(run)) { sfx.error(); return; }
  P.busy = true; P.sel = null; P.res = null; resetCells(); save();
  wishFx(); djinnSay('wish');
  await animateSpin(cols);
  landed();
  P.busy = false;
}
async function doNudge(c, dir) {
  const run = S.run;
  if (P.busy || run.phase !== 'landed') return;
  if (run.wishesLeft <= 0) { sfx.error(); djinnSay('nowish', 'smirk'); return; }
  if (!G.nudge(run, c, dir)) { sfx.error(); return; }
  P.busy = true; P.sel = null; P.res = null; resetCells(); save();
  wishFx(); sfx.nudge();
  await tween(P.pos, { [c]: P.pos[c] + dir }, 0.2, ease.back);
  P.pos[c] = P.last[c] = run.offsets[c];
  sfx.thunk(c); P.bounce[c].kick(dir * -90);
  landed();
  P.busy = false;
}
function wishFx() {
  const s = P.L.wishAt || [V.W / 2, V.H / 2];
  sfx.wish();
  burst(s[0], s[1], 14, { col: ['#D4F1FA', '#7FA8FF', '#FFFFFF'], speed: 70, life: 0.6, g: -20, size: 2 });
  burst(s[0], s[1], 4, { col: '#7FA8FF', add: true, speed: 20, life: 0.5, size: 5, g: 0 });
}

async function doCash() {
  const run = S.run;
  if (P.busy || run.phase !== 'landed') return;
  P.busy = true; P.sel = null; P.hint = '';
  P.bOver = new Map(G.allInst(run).map((s) => [s.u, s.b]));
  const before = run.roundScore;
  const res = G.cashIn(run);
  save();
  await playScore(res, before);
  P.bOver = null; T.speed = 1; P.fast = false;
  for (let c = 0; c < 5; c++) P.pos[c] = P.last[c] = run.offsets[c];
  for (const n of res.notes) {
    if (n.t === 'spawn') toast(`A ${SYM[n.inst.id].name} joins reel ${n.c + 1}.`, '#7CE08F');
    if (n.t === 'quest') { toast(`QUEST COMPLETE: ${SYM[n.reward].name} is yours!`, '#5CE8D8'); sfx.fanfare(); flash(0.15); djinnMood('shock', 2); }
  }
  for (const n of res.notes) if (n.t === 'shatter') { toast('The Ruin Timer shatters! 3 curses added.', '#FF7A8A'); sfx.curse(); shake(5); }
  if (res.outcome === 'paid') return finishRound();
  if (res.outcome === 'over') return gameOver();
  const target = G.tributeFor(run);
  const pace = run.roundScore / target, used = 1 - run.spinsLeft / (run.spinsLeft + run.spinInRound);
  if (res.total >= target * 0.5) djinnSay('big', 'shock'); else if (pace < used * 0.7) djinnSay('bad', 'grin'); else if (Math.random() < 0.5) djinnSay('good');
  P.busy = false;
  if (S.meta.tut) P.hint = 'Reach the tribute before your Spins run out.';
}

async function playScore(res, before) {
  const run = S.run, target = G.tributeFor(run);
  P.dCoins = 0; P.dMult = 1; P.showScore = true; P.total = null;
  let n = 0;
  const beat = () => wait(Math.max(0.07, 0.23 * Math.pow(0.93, n)));
  const [cbx, cby] = boxXY('coinsBox'), [mbx, mby] = boxXY('multBox');
  for (const ev of res.events) {
    const [x, y] = srcXY(ev);
    const cf = ev.i != null ? P.cell[ev.i] : null;
    switch (ev.t) {
      case 'glare': cf.dead = 1; burst(x, y, 8, { col: ['#3A5FE0', '#FFFFFF'], speed: 40, life: 0.4 }); sfx.neg(); await wait(0.18); break;
      case 'sting': cf.dead = 1; cf.rot.kick(8); burst(x, y, 8, { col: ['#9A5CE8', '#4A4170'], speed: 45, life: 0.4 }); sfx.neg(); await wait(0.14); break;
      case 'tame': cf.tame = 1; cf.sc.kick(4); burst(x, y, 8, { col: ['#3FBF5A', '#FFD84A'], speed: 45, life: 0.4 }); sfx.grow(); await wait(0.14); break;
      case 'gild': cf.gild = 1; cf.sc.kick(4); burst(x, y, 10, { col: ['#FFD84A', '#F2A93B', '#FFFFFF'], speed: 55, life: 0.5 }); sfx.gold(); await wait(0.1); break;
      case 'eat': {
        const [bx, by] = cellXY(ev.by), by_ = P.cell[ev.by];
        by_.ox.kick((x - bx) * 9); by_.oy.kick((y - by) * 9); by_.sc.kick(3);
        await wait(0.07);
        sfx.eat(); tween(cf, { gone: 1 }, 0.16, ease.in);
        burst(x, y, 9, { col: ['#FFF4E0', '#FFD84A', '#A0683C'], speed: 55, life: 0.45, size: 1.6 });
        await wait(0.16); break;
      }
      case 'crack': case 'open':
        cf.sc.kick(6); cf.rot.kick(10); sfx.crack(); shake(1.5);
        burst(x, y, 12, { col: ev.t === 'open' ? ['#FFD84A', '#F2A93B', '#FFFFFF'] : ['#FFF4E0', '#A0683C'], speed: 70, life: 0.5 });
        await wait(0.16); break;
      case 'coins': {
        cf.sc.kick(ev.big ? 7 : 5); cf.rot.kick((Math.random() - 0.5) * 8);
        const neg = ev.v < 0;
        floatText((neg ? '' : '+') + fmt(ev.v), x, y - 8, { col: neg ? '#FF7A8A' : ev.again ? '#B8E4FF' : '#6FB6FF', scale: ev.big ? 1.5 : 1.15 });
        if (ev.again) floatText('AGAIN!', x, y + 8, { col: C.yellow, scale: 0.9, life: 0.6 });
        P.dCoins = ev.coins; P.cP.kick(neg ? -3 : 3.5);
        if (neg) { sfx.neg(); shake(1.5); } else sfx.coin(n);
        burst(x, y, ev.big ? 7 : 3, { col: ['#6FB6FF', '#D4F1FA'], speed: 45, life: 0.35, size: 1.5 });
        n++; await beat(); break;
      }
      case 'mult': {
        if (cf) { cf.sc.kick(5); cf.rot.kick(6); } else punchSrc(ev);
        const neg = ev.v < 0;
        floatText((neg ? '' : '+') + fmtMult(ev.v) + ' Mult', x, y - 8, { col: '#FF5A64', scale: 1.15 });
        P.dMult = ev.mult; P.mP.kick(4);
        neg ? sfx.neg() : sfx.mult(n);
        burst(x, y, 5, { col: ['#FF5A64', '#FFB0B0'], speed: 50, life: 0.4, size: 1.5 });
        n++; await beat(); break;
      }
      case 'xmult': {
        if (cf) { cf.sc.kick(8); cf.rot.kick(10); } else punchSrc(ev);
        floatText('x' + fmtMult(ev.v) + ' Mult', x, y - 10, { col: '#FFD84A', scale: 1.6, life: 1.1 });
        P.dMult = ev.mult; P.mP.kick(7); shake(3); flash(0.06);
        sfx.xmult(n);
        burst(x, y, 14, { col: ['#FF5A64', '#FFD84A', '#FFFFFF'], speed: 90, life: 0.6 });
        n++; await wait(Math.max(0.2, 0.34 * Math.pow(0.95, n))); break;
      }
      case 'grow': {
        const neg = ev.v < 0;
        if (P.bOver) { const u = G.board(run)[ev.i].u; P.bOver.set(u, (P.bOver.get(u) || 0) + ev.v); }
        cf.sc.kick(3);
        floatText((neg ? '' : '+') + ev.v + (neg ? '' : ' grow'), x, y + 10, { col: neg ? '#FF7A8A' : '#7CE08F', scale: 0.9, life: 0.7 });
        neg ? sfx.neg() : sfx.grow(); await wait(0.07); break;
      }
      case 'gold':
        floatText('+' + ev.v + ' gold', x, y - 8, { col: C.yellow }); sfx.gold(); P.gP.kick(4);
        burst(x, y, 4, { spr: 'coin', size: 6, speed: 60, life: 0.7 }); await wait(0.12); break;
      case 'line': {
        const l = ev.line, pure = l.kind === 'pure';
        P.lineFx.push({ l, t0: T.now });
        for (let c = l.c0; c < l.c0 + l.len; c++) { const f = P.cell[c * 3 + l.row]; f.sc.kick(pure ? 8 : 5); f.oy.kick(-40); }
        const [x0, y0] = cellXY(l.c0 * 3 + l.row), [x1] = cellXY((l.c0 + l.len - 1) * 3 + l.row);
        const name = pure ? SYM[l.key].name.toUpperCase() : FAMILIES[l.key].name.toUpperCase();
        floatText(`${name} LINE ${pure ? 'x' : '+'}${ev.v} Mult`, clamp((x0 + x1) / 2, 60, V.W - 60), y0 - P.L.mach.cell * 0.55, { col: pure ? '#FFD84A' : '#FF8A90', scale: pure ? 1.4 : 1.1, life: 1.2 });
        P.dMult = ev.mult; P.mP.kick(pure ? 8 : 5); shake(pure ? 4 : 1.5); if (pure) flash(0.08);
        sfx.line(l.len + (pure ? 2 : 0)); if (pure) sfx.xmult(n);
        for (let c = l.c0; c < l.c0 + l.len; c++) { const [px, py] = cellXY(c * 3 + l.row); burst(px, py, pure ? 8 : 4, { col: pure ? ['#FFD84A', '#FFFFFF'] : [FAMILIES[l.key].col, '#FFFFFF'], speed: 70, life: 0.5 }); }
        n++; await wait(pure ? 0.42 : 0.3); break;
      }
    }
    P.heat = Math.min(1, n / 26);
  }
  await wait(0.28);
  // the slam: coins x mult -> total
  const ratio = res.total / target;
  const [sx, sy] = boxXY('score');
  P.total = { v: 0 };
  P.tP.set(0.4); P.tP.target = 1; P.tP.kick(6);
  const power = clamp(ratio, 0.05, 1);
  sfx.slam(power); shake(2 + power * 8); flash(0.02 + power * 0.1);
  burst(sx, sy, 16 + Math.round(power * 40), { col: ['#FFD84A', '#F2A93B', '#FFFFFF', '#FF5A64'], speed: 90 + power * 120, life: 0.8, size: 2.2, rx: P.L.score.w * 0.6, ry: 10 });
  let ticks = 0;
  const roll = tween(P.total, { v: res.total }, 0.45 + power * 0.35, ease.out);
  const ticker = (async () => { while (P.total && P.total.v < res.total - 0.5 && ticks < 30) { sfx.roll(ticks++); await wait(0.035); } })();
  await roll; await ticker;
  P.total.v = res.total;
  if (ratio >= 0.6) {
    sfx.fire(); djinnMood('shock', 1.6);
    burst(sx, sy + 8, 40, { col: ['#FF5A1A', '#FFD84A', '#E0303A'], speed: 60, dir: -Math.PI / 2, spread: 1.6, g: -90, life: 0.9, size: 3, rx: P.L.score.w * 0.8 });
    burst(sx, sy, 6, { col: '#FF7A1A', add: true, speed: 30, life: 0.8, size: 9, g: -40 });
  }
  await wait(0.5);
  // bank it into the round total
  const [hx, hy] = P.L.barAt || boxXY('head');
  burst(sx, sy, 14, { col: ['#FFD84A', '#FFFFFF'], to: [hx, hy], life: 0.5, speed: 120, size: 2.2 });
  sfx.whoosh();
  await wait(0.22);
  await tween(P, { dRound: run.roundScore }, 0.45, ease.out);
  P.rP.kick(6); sfx.gold();
  if (before < target && run.roundScore >= target) { flash(0.15); shake(4); }
  await wait(0.2);
  P.total = null; P.showScore = false; P.heat = 0;
}
function punchSrc(ev) {
  const k = ev.charm != null ? 'c' + ev.charm : 'r' + ev.relic;
  P.cpunch = { k, t0: T.now };
}

function finishRound() {
  const run = S.run;
  P.busy = true;
  const pay = G.payout(run);
  checkUnlocks(); save();
  sfx.win(); djinnSay('win', 'scowl');
  setMood(run.phase === 'won' ? 'win' : 'play');
  const m = P.L.mach;
  burst(m.x + m.w / 2, m.y + m.h / 2, 30, { spr: 'coin', size: 7, speed: 170, life: 1.3, g: 260 });
  S.meta.tut = false;
  P.payout = { rows: pay.rows, total: pay.total, t0: T.now, done: false };
}
function gameOver() {
  const run = S.run;
  P.busy = true;
  checkUnlocks();
  S.meta.runs++;
  sfx.lose(); shake(8); flash(0.2); djinnSay('lose', 'grin');
  setMood('over');
  S.over = { run, won: false };
  S.run = null; save();
  wait(1.5).then(() => go('over'));
}

// ---------- drawing
function numFit(str, w, max = 2) { for (let s = max; s > 1; s--) if (measure(str, s) <= w) return s; return 1; }

function drawHead(r, on) {
  const run = S.run, g = V.g, dec = G.decreeOf(run), target = G.tributeFor(run);
  panel(r.x, r.y, r.w, r.h, dec ? { fill: '#3A1030', hi: '#7A1838' } : {});
  const step = run.round % 3;
  const tag = run.endless ? `E${run.round + 1}` : `${G.actOf(run.round) + 1}-${step + 1}`;
  if (r.w > 130) text(g, tag, r.x + r.w - 6, r.y + 5, { col: C.dim, align: 'r' });
  if (dec) {
    text(g, DECREE[dec].name.toUpperCase(), r.x + 6, r.y + 5, { col: '#FF7A8A' });
    rich(g, DECREE[dec].desc, r.x + 6, r.y + 15, r.w - 12, { lh: 9 });
  } else {
    text(g, ROUND_NAMES[step].toUpperCase(), r.x + 6, r.y + 5, { col: C.dim });
    const ts = fmt(target), sc = numFit(ts, r.w - 40);
    text(g, 'PAY', r.x + 6, r.y + 15 + (sc - 1) * 4, { col: C.cream });
    text(g, ts, r.x + 28, r.y + 15, { col: C.yellow, scale: sc, shadow: '#5A3A08' });
  }
  const bx = r.x + 5, bw = r.w - 10, by = r.y + r.h - 14, bh = 10;
  inset(bx, by, bw, bh);
  const k = clamp(P.dRound / target, 0, 1);
  const paid = P.dRound >= target;
  if (k > 0) { rrect(bx + 1, by + 1, Math.max(2, (bw - 2) * k), bh - 2, paid ? '#3FBF5A' : '#E08A2A', 1); rect(bx + 2, by + 2, Math.max(0, (bw - 2) * k - 2), 2, paid ? '#8FE8A0' : '#FFD84A'); }
  g.save(); g.translate(bx + bw / 2, by + 5); g.scale(P.rP.v, P.rP.v);
  text(g, `${fmt(P.dRound)} / ${fmt(target)}`, 0, -4, { align: 'c', outline: '#0B0920' });
  g.restore();
  P.L.barAt = [bx + bw * k, by + 5];
  if (on && dec && tapped(r.x, r.y, r.w, r.h)) P.sel = { it: { k: 'decree', id: dec }, r };
}

function numBox(x, y, w, h, str, col, sp) {
  const g = V.g;
  rrect(x, y, w, h, '#0B0920'); rrect(x + 1, y + 1, w - 2, h - 2, shade(col, -0.25)); rrect(x + 1, y + 1, w - 2, h - 4, col);
  const sc = numFit(str, w - 6);
  g.save(); g.translate(x + w / 2, y + h / 2 - 1); g.scale(sp.v, sp.v);
  text(g, str, 0, -4 * sc, { align: 'c', scale: sc, outline: shade(col, -0.65) });
  g.restore();
}
function drawScore(r) {
  const g = V.g;
  panel(r.x, r.y, r.w, r.h);
  const coins = P.showScore ? fmt(P.dCoins) : '0', mult = P.showScore ? fmtMult(P.dMult) : '1';
  if (r.w >= 150) {
    const bw = (r.w - 34) / 2, by = r.y + 4, bh = r.h - 16;
    numBox(r.x + 6, by, bw, bh, coins, C.coins, P.cP);
    numBox(r.x + r.w - 6 - bw, by, bw, bh, mult, C.mult, P.mP);
    text(g, 'x', r.x + r.w / 2, by + bh / 2 - 8, { align: 'c', scale: 2, col: C.cream, shadow: '#0B0920' });
    text(g, 'COINS', r.x + 6 + bw / 2, r.y + r.h - 11, { align: 'c', col: '#6FB6FF' });
    text(g, 'MULT', r.x + r.w - 6 - bw / 2, r.y + r.h - 11, { align: 'c', col: '#FF7A84' });
    P.L.coinsBox = { x: r.x + 6, y: by, w: bw, h: bh }; P.L.multBox = { x: r.x + r.w - 6 - bw, y: by, w: bw, h: bh };
  } else {
    const bh = (r.h - 14) / 2;
    numBox(r.x + 5, r.y + 4, r.w - 10, bh, coins, C.coins, P.cP);
    numBox(r.x + 5, r.y + 9 + bh, r.w - 10, bh, mult, C.mult, P.mP);
    rrect(r.x + r.w / 2 - 6, r.y + 2 + bh, 12, 9, '#0B0920'); text(g, 'x', r.x + r.w / 2, r.y + 2 + bh, { align: 'c', col: C.cream });
    P.L.coinsBox = { x: r.x + 5, y: r.y + 4, w: r.w - 10, h: bh }; P.L.multBox = { x: r.x + 5, y: r.y + 9 + bh, w: r.w - 10, h: bh };
  }
  if (P.total) {
    const str = fmt(P.total.v);
    rrect(r.x + 3, r.y + 3, r.w - 6, r.h - 7, '#0B0920');
    rrect(r.x + 4, r.y + 4, r.w - 8, r.h - 9, '#3B2E08');
    glow(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.5, 'rgba(255,190,60,0.5)', 0.6 + 0.3 * Math.sin(V.t * 12));
    const sc = numFit(str, r.w - 14, 3);
    g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2 - 1); g.scale(P.tP.v, P.tP.v); g.rotate(Math.sin(V.t * 30) * 0.02);
    text(g, str, 0, -4 * sc, { align: 'c', scale: sc, col: C.yellow, outline: '#5A2A08' });
    g.restore();
  }
}

function drawSymbol(inst, x, y, ss, f, i) {
  const g = V.g;
  const d = SYM[inst.id];
  let sc = ss, rot = 0, a = 1;
  if (f) {
    sc *= Math.max(0, f.sc.v) * (1 - f.gone);
    rot = f.rot.v * 0.03 + Math.sin(V.t * 1.7 + i * 1.3) * 0.02;
    x += f.ox.v; y += f.oy.v + Math.sin(V.t * 2 + i) * 0.5;
    if (f.dead) a = 0.32;
  }
  if (sc <= 0.01) return;
  if (d.relic) glow(x, y, ss * 12, 'rgba(255,50,90,0.55)', 0.5 + 0.3 * Math.sin(V.t * 3 + i));
  if (d.curse && !(f && f.tame)) glow(x, y, ss * 11, 'rgba(120,60,220,0.5)', 0.5 + 0.25 * Math.sin(V.t * 2.4 + i));
  spr(inst.id, x, y, sc, rot, a);
  if (f && f.gild) spr(silhouette(inst.id, '#FFD84A'), x, y, sc, rot, 0.72);
  if (f && f.tame) spr(silhouette(inst.id, '#3FBF5A'), x, y, sc, rot, 0.35);
  if (f && f.dead) { g.save(); g.translate(x, y); g.rotate(0.785); rect(-ss * 6, -1, ss * 12, 2, '#E0303A'); rect(-1, -ss * 6, 2, ss * 12, '#E0303A'); g.restore(); }
  const b = P.bOver ? (P.bOver.get(inst.u) ?? inst.b) : inst.b;
  if (b && f !== null) text(g, (b > 0 ? '+' : '') + b, x + ss * 8, y + ss * 8 - 7, { col: b > 0 ? '#1F7A3A' : '#B0123C', align: 'r', outline: '#FFF4E0' });
}

function drawMachine(m, on) {
  const run = S.run, g = V.g;
  // cabinet
  rrect(m.x, m.y + 4, m.w, m.h, 'rgba(8,6,24,0.55)');
  rrect(m.x, m.y, m.w, m.h, '#0B0920');
  rrect(m.x + 1, m.y + 1, m.w - 2, m.h - 2, '#F2A93B');
  rrect(m.x + 2, m.y + 2, m.w - 4, m.h - 4, '#8A3FB8');
  rrect(m.x + 2, m.y + 4, m.w - 4, m.h - 6, '#5B2A8A');
  rrect(m.x + 4, m.ry - 2, m.w - 8, m.rh + 4, '#0B0920', 1);
  const landedNow = run.phase === 'landed' && !P.busy;
  const canWish = landedNow && run.wishesLeft > 0;
  // reel backgrounds
  for (let c = 0; c < 5; c++) {
    const x = m.rx + c * m.pitch;
    rect(x, m.ry, m.cell, m.rh, '#FFF4E0');
    rect(x, m.ry, 2, m.rh, '#EADBB8'); rect(x + m.cell - 2, m.ry, 2, m.rh, '#EADBB8');
  }
  // line bands (preview while landed, flashes while scoring)
  const bands = [];
  if (P.res && run.phase === 'landed') for (const l of P.res.lines) bands.push({ l, a: 0.3 + 0.14 * Math.sin(V.t * 6) });
  for (const f of P.lineFx) { const age = T.now - f.t0; if (age < 0.9) bands.push({ l: f.l, a: 0.85 * (1 - age / 0.9) + 0.2 }); else bands.push({ l: f.l, a: 0.25 }); }
  for (const b of bands) {
    const l = b.l, pure = l.kind === 'pure';
    const col = pure ? '#FFC21A' : FAMILIES[l.key].col;
    const x = m.rx + l.c0 * m.pitch, y = m.ry + l.row * m.pitch, w = l.len * m.pitch - 2;
    g.globalAlpha = Math.min(1, b.a);
    rect(x, y + (pure ? 1 : m.cell * 0.2), w, pure ? m.cell - 2 : m.cell * 0.6, col);
    g.globalAlpha = 1;
  }
  // symbols
  for (let c = 0; c < 5; c++) {
    const reel = run.reels[c], len = reel.length;
    const x = m.rx + c * m.pitch;
    const dpos = P.pos[c] - P.last[c];
    P.spd[c] += (Math.abs(dpos) / Math.max(0.001, T.dt || 0.016) - P.spd[c]) * 0.5;
    P.last[c] = P.pos[c];
    const fast = P.spinning[c] && P.spd[c] > 9;
    g.save(); g.beginPath(); g.rect(x, m.ry, m.cell, m.rh); g.clip();
    const base = Math.floor(P.pos[c]), frac = P.pos[c] - base;
    const bo = P.bounce[c].v;
    for (let k = -1; k <= 3; k++) {
      const inst = reel[mod(base + k, len)];
      const cy = m.ry + (k - frac) * m.pitch + m.cell / 2 + bo;
      const still = !P.spinning[c] && frac === 0 && k >= 0 && k < 3;
      if (fast) {
        const st = Math.min(0.9, P.spd[c] / 45);
        spr(inst.id, x + m.cell / 2, cy - m.pitch * 0.25 * st, m.ss, 0, 0.3, 1, 1 + st);
        spr(inst.id, x + m.cell / 2, cy, m.ss, 0, 0.8, 1, 1 + st * 0.6);
      } else drawSymbol(inst, x + m.cell / 2, cy, m.ss, still ? P.cell[c * 3 + k] : undefined, c * 3 + k);
    }
    // cylinder shading
    const gr = g.createLinearGradient(0, m.ry, 0, m.ry + m.rh);
    gr.addColorStop(0, 'rgba(27,26,58,0.42)'); gr.addColorStop(0.16, 'rgba(27,26,58,0)'); gr.addColorStop(0.84, 'rgba(27,26,58,0)'); gr.addColorStop(1, 'rgba(27,26,58,0.42)');
    g.fillStyle = gr; g.fillRect(x, m.ry, m.cell, m.rh);
    if (run.held[c]) { g.fillStyle = 'rgba(58,95,224,0.24)'; g.fillRect(x, m.ry, m.cell, m.rh); }
    if (P.tease === c) { g.fillStyle = `rgba(255,216,74,${0.18 + 0.12 * Math.sin(V.t * 20)})`; g.fillRect(x, m.ry, m.cell, m.rh); }
    g.restore();
    if (run.held[c]) { rrect(x + 2, m.ry + m.rh - 11, m.cell - 4, 10, '#3A5FE0', 1); text(g, 'HELD', x + m.cell / 2, m.ry + m.rh - 10, { align: 'c' }); }
    // evil eye glare marker
    if (run.glare === c && run.phase === 'landed' && !P.spinning[c]) {
      g.fillStyle = 'rgba(58,40,120,0.28)'; g.fillRect(x, m.ry, m.cell, m.rh);
      spr('evileye', x + m.cell / 2, m.ry + 5 + Math.sin(V.t * 3) * 1, pxScale(m.ss * 0.5), 0, 0.95);
    }
    // nudge + hold controls
    const chained = !G.canHold(run, c);
    // nudge controls double as a peek at the symbol waiting just off the board
    for (const isTop of [true, false]) {
      const by = isTop ? m.ry - 19 : m.ry + m.rh + 3, bh = 16, dir = isTop ? -1 : 1;
      const act = canWish && !chained;
      const hov = act && I.mouse && over(x, by - 1, m.cell, bh + 2);
      rrect(x + 1, by, m.cell - 2, bh, '#0B0920', 1);
      rrect(x + 2, by + 1, m.cell - 4, bh - 2, act ? (hov ? '#B98CFF' : '#8A4FD8') : '#3A2A5E', 1);
      const ax = x + m.cell - 8, ay = by + bh / 2;
      if (!P.spinning[c] && run.phase !== 'paid') {
        const next = reel[mod(run.offsets[c] + (isTop ? -1 : 3), len)];
        rrect(x + 4, by + 2, 14, bh - 4, act ? '#FFF4E0' : '#8E88C0', 1);
        spr(next.id, x + 11, by + bh / 2, pxScale(0.75), 0, act ? 1 : 0.6);
      }
      g.fillStyle = act ? '#FFF4E0' : '#6A5A90';
      g.beginPath();
      if (isTop) { g.moveTo(ax - 4, ay - 2.5); g.lineTo(ax + 4, ay - 2.5); g.lineTo(ax, ay + 2.5); } else { g.moveTo(ax - 4, ay + 2.5); g.lineTo(ax + 4, ay + 2.5); g.lineTo(ax, ay - 2.5); }
      g.fill();
      if (on && landedNow && tapped(x, by - 2, m.cell, bh + 3)) { chained ? (sfx.error(), toast('The Chains bind this reel.', '#FF7A8A')) : doNudge(c, dir); }
    }
    const hy = m.ry + m.rh + 22;
    const lit = run.held[c];
    if (button('hold' + c, x, hy, m.cell, 16, chained ? 'LOCK' : lit ? 'HELD' : 'HOLD', { col: lit ? '#F2A93B' : '#3A5FE0', disabled: !landedNow || chained, enabled: on, quiet: true })) {
      G.toggleHold(run, c); sfx.hold(run.held[c]); save();
    }
  }
  // payline pips
  for (let r = 0; r < 3; r++) {
    const y = m.ry + r * m.pitch + m.cell / 2;
    const hit = P.res && run.phase === 'landed' && P.res.lines.some((l) => l.row === r);
    rect(m.x + 2, y - 2, 3, 4, hit ? '#FFD84A' : '#3A2A5E'); rect(m.x + m.w - 5, y - 2, 3, 4, hit ? '#FFD84A' : '#3A2A5E');
  }
  // cell taps / hover
  if (on && !P.spinning.some(Boolean)) for (let i = 0; i < 15; i++) {
    const c = Math.floor(i / 3), r = i % 3;
    const x = m.rx + c * m.pitch, y = m.ry + r * m.pitch;
    const reel = run.reels[c], inst = reel[(run.offsets[c] + r) % reel.length];
    const rr = { x, y, w: m.cell, h: m.cell };
    if (tapped(x, y, m.cell, m.cell)) { P.sel = { it: { k: 'sym', id: inst.id, inst }, r: rr }; sfx.select(); P.cell[i].sc.kick(3); }
    else if (I.mouse && !I.down && over(x, y, m.cell, m.cell)) P.hover = { it: { k: 'sym', id: inst.id, inst }, r: rr };
  }
}

function drawCharms(r, on) {
  const run = S.run, g = V.g;
  panel(r.x, r.y, r.w, r.h);
  const n = run.maxCharms;
  const slots = [], rslots = [];
  let sw = 34, sh = 34;
  if (r.h > 60) {
    const per = Math.max(2, Math.floor((r.w - 8) / 34));
    const ox = r.x + (r.w - per * 34) / 2;
    text(g, 'CHARMS', r.x + 6, r.y + 5, { col: C.dim });
    for (let k = 0; k < n; k++) slots.push({ x: ox + (k % per) * 34, y: r.y + 15 + Math.floor(k / per) * 36, w: sw, h: sh });
    const ry = r.y + 15 + Math.ceil(n / per) * 36 + 2;
    const rper = Math.max(1, Math.floor((r.w - 8) / 20));
    run.relics.forEach((_, k) => rslots.push({ x: r.x + 5 + (k % rper) * 20, y: ry + Math.floor(k / rper) * 20, w: 18, h: 18 }));
  } else {
    const rw = run.relics.length ? Math.min(3, Math.ceil(run.relics.length / 2)) * 19 + 2 : 0;
    const avail = r.w - 8 - rw;
    sw = Math.min(34, Math.floor(avail / n));
    const ox = r.x + 4 + (avail - sw * n) / 2;
    for (let k = 0; k < n; k++) slots.push({ x: ox + k * sw, y: r.y + 3, w: sw, h: sh });
    run.relics.forEach((_, k) => rslots.push({ x: r.x + r.w - rw - 2 + Math.floor(k / 2) * 19, y: r.y + 2 + (k % 2) * 18, w: 18, h: 18 }));
  }
  P.L.slots = slots; P.L.rslots = rslots;
  if (!run.charms.length && !run.relics.length && r.h <= 60) text(g, 'NO CHARMS YET', r.x + r.w / 2, r.y + r.h / 2 - 5, { align: 'c', col: '#4A4580' });
  const punch = (key) => (P.cpunch && P.cpunch.k === key ? Math.max(0, 1 - (T.now - P.cpunch.t0) / 0.3) : 0);
  slots.forEach((s, k) => {
    inset(s.x + 1, s.y, s.w - 2, s.h);
    const ch = run.charms[k];
    if (!ch) return;
    const p = punch('c' + k);
    spr(ch.id, s.x + s.w / 2, s.y + s.h / 2 + Math.sin(V.t * 1.8 + k) * 0.7 - p * 4, pxScale(Math.min(2, (s.w - 3) / 16)) * (1 + p * 0.35), Math.sin(V.t * 1.3 + k * 2) * 0.05 + p * 0.3);
    const q = CHARM[ch.id];
    if (q.quest) { rect(s.x + 2, s.y + s.h - 3, s.w - 4, 2, '#0B0920'); rect(s.x + 2, s.y + s.h - 3, (s.w - 4) * Math.min(1, (ch.n || 0) / q.goal), 2, '#35C9B8'); }
    if (q.quest && q.goal > 1) text(g, `${ch.n || 0}/${q.goal}`, s.x + s.w / 2, s.y + s.h - 13, { align: 'c', col: '#5CE8D8', outline: '#0B0920' });
    if (on && tapped(s.x, s.y, s.w, s.h)) { P.sel = { it: { k: 'charm', id: ch.id, ch }, r: s }; sfx.select(); }
    else if (I.mouse && !I.down && over(s.x, s.y, s.w, s.h)) P.hover = { it: { k: 'charm', id: ch.id, ch }, r: s };
  });
  rslots.forEach((s, k) => {
    const rl = run.relics[k], p = punch('r' + k);
    rrect(s.x, s.y, s.w, s.h, '#7A1838', 1); rrect(s.x + 1, s.y + 1, s.w - 2, s.h - 2, '#3A0E22', 1);
    spr(rl.id, s.x + 9, s.y + 9 - p * 3, pxScale(1) * (1 + p * 0.4), p * 0.3);
    if (on && tapped(s.x, s.y, s.w, s.h)) { P.sel = { it: { k: 'charm', id: rl.id, ch: rl }, r: s }; sfx.select(); }
    else if (I.mouse && !I.down && over(s.x, s.y, s.w, s.h)) P.hover = { it: { k: 'charm', id: rl.id, ch: rl }, r: s };
  });
}

function drawStatus(r) {
  const run = S.run, g = V.g;
  panel(r.x, r.y, r.w, r.h);
  P.dGold += (run.gold - P.dGold) * 0.18; if (Math.abs(run.gold - P.dGold) < 0.05) P.dGold = run.gold;
  const items = [
    (x, y) => { text(g, 'SPINS', x, y, { col: C.dim }); text(g, String(run.spinsLeft), x + 31, y, { col: run.spinsLeft <= 1 && run.phase !== 'landed' ? '#FF7A8A' : C.cream }); return 40; },
    (x, y) => { spr('wish', x + 5, y + 4, pxScale(0.75)); text(g, 'WISHES', x + 12, y, { col: C.dim }); text(g, String(run.wishesLeft), x + 49, y, { col: '#B8E4FF' }); P.L.wishAt = [x + 5, y + 4]; return 58; },
    (x, y) => { g.save(); g.translate(x + 6, y + 4); g.scale(P.gP.v, P.gP.v); spr('coin', 0, 0, pxScale(0.75)); g.restore(); text(g, fmt(P.dGold), x + 14, y, { col: C.yellow }); return 14 + measure(fmt(P.dGold)); },
  ];
  if (r.h < 30) {
    const xs = [r.x + 8, r.x + r.w * 0.33, r.x + r.w - 44];
    items.forEach((f, k) => f(Math.round(xs[k]), r.y + 7));
  } else {
    const gap = (r.h - 8) / 3;
    items.forEach((f, k) => f(r.x + 8, Math.round(r.y + 6 + k * gap + (gap - 9) / 2)));
  }
}

function drawButtons(r, on) {
  const run = S.run;
  const rw = 46;
  if (button('reels', r.x, r.y, rw, r.h, 'REELS', { col: '#5B4FA8', enabled: on, disabled: P.busy })) openEditor({ mode: 'view' });
  const x = r.x + rw + 5, w = r.w - rw - 5;
  if (run.phase === 'landed') {
    const hw = Math.round(w * 0.42);
    const any = run.held.some(Boolean);
    if (button('respin', x, r.y, hw, r.h, any ? 'RESPIN' : 'RESPIN ALL', { col: '#8A4FD8', sub: '1 WISH', enabled: on, disabled: P.busy || run.wishesLeft <= 0 || run.held.every(Boolean) })) doRespin();
    if (button('cash', x + hw + 5, r.y, w - hw - 5, r.h, 'CASH IN', { col: '#2F7BE8', scale: 2, enabled: on, disabled: P.busy })) doCash();
  } else if (button('spin', x, r.y, w, r.h, 'SPIN', { col: '#E08A1A', scale: 2, enabled: on, disabled: P.busy || run.phase !== 'ready' })) doSpin();
  if (on && !P.busy && (I.key === ' ' || I.key === 'Enter')) run.phase === 'landed' ? doCash() : doSpin();
}

function drawBanner() {
  const b = P.banner, g = V.g; if (!b) return;
  const age = T.now - b.t0, out = b.dur - age;
  const k = age < 0.25 ? ease.back(age / 0.25) : out < 0.2 ? Math.max(0, out / 0.2) : 1;
  const m = P.L.mach, cy = m.y + m.h / 2, h = 62 * k;
  g.save();
  g.globalAlpha *= Math.min(1, k);
  rect(-20, cy - h / 2, V.W + 40, h, 'rgba(11,9,32,0.9)');
  rect(-20, cy - h / 2, V.W + 40, 2, b.col); rect(-20, cy + h / 2 - 2, V.W + 40, 2, b.col);
  if (k > 0.6) {
    const slide = (1 - Math.min(1, age / 0.3)) * 60;
    text(g, b.top, V.W / 2 - slide, cy - 25, { align: 'c', col: C.dim });
    const sc = numFit(b.title.toUpperCase(), V.W - 16);
    text(g, b.title.toUpperCase(), V.W / 2 + slide, cy - 15, { align: 'c', scale: sc, col: b.col, outline: '#0B0920' });
    rich(g, b.sub, 12 - slide, cy + 8, V.W - 24, { align: 'c' });
  }
  g.restore();
}

function drawPayout(on) {
  const p = P.payout, g = V.g, run = S.run; if (!p) return;
  const age = T.now - p.t0;
  const k = Math.min(1, age / 0.3);
  const w = Math.min(210, V.W - 16), h = 62 + p.rows.length * 13;
  const x = Math.round((V.W - w) / 2), y = Math.round((V.H - h) / 2 - (1 - ease.back(k)) * 30);
  g.save(); g.globalAlpha *= k;
  dimScreen(0.5 * k);
  panel(x, y, w, h, { fill: '#1A1638', hi: '#F2A93B' });
  text(g, run.phase === 'won' ? 'THE FINAL TRIBUTE!' : 'TRIBUTE PAID!', V.W / 2, y + 8, { align: 'c', col: C.yellow, scale: measure('THE FINAL TRIBUTE!', 2) < w - 10 ? 2 : 1, outline: '#5A2A08' });
  let sum = 0;
  p.rows.forEach((row, i) => {
    const at = 0.45 + i * 0.28;
    if (age < at) return;
    if (!row.shown) { row.shown = true; sfx.gold(); }
    sum += row.v;
    const ry = y + 31 + i * 13;
    text(g, row.label, x + 10, ry, { col: C.cream });
    spr('coin', x + w - 34, ry + 4, pxScale(0.5)); text(g, '+' + row.v, x + w - 10, ry, { align: 'r', col: C.yellow });
  });
  const allAt = 0.45 + p.rows.length * 0.28;
  if (age >= allAt) {
    rect(x + 8, y + h - 31, w - 16, 1, '#4A4290');
    if (button('payc', x + 8, y + h - 26, w - 16, 22, `COLLECT ${sum} GOLD`, { col: '#E08A1A', enabled: on && !S.switching })) {
      sfx.buy(); P.payout = null;
      go(run.phase === 'won' ? 'won' : 'shop');
    }
  }
  g.restore();
}

function draw(on) {
  const run = S.run, g = V.g;
  if (!run) return;
  const L = P.L = Object.assign(layout(), { slots: P.L && P.L.slots, rslots: P.L && P.L.rslots, coinsBox: P.L && P.L.coinsBox, multBox: P.L && P.L.multBox, barAt: P.L && P.L.barAt, wishAt: P.L && P.L.wishAt });
  const live = on && !P.payout;
  V.heat += ((P.heat || 0) - V.heat) * 0.08;
  A.intensity += (((G.isBoss(run) ? 0.55 : 0.3) + P.heat * 0.45) - A.intensity) * 0.05;
  if (live && I.released && P.sel) P.sel = null;
  P.hover = null;
  // speed up scoring while the player holds / taps
  if (P.showScore && I.pressed) P.fast = true;
  T.speed = P.showScore && P.fast ? 3 : 1;

  drawHead(L.head, live);
  // djinn
  panel(L.dj.x, L.dj.y, L.dj.w, L.dj.h, { fill: '#2E2468' });
  g.save(); g.beginPath(); g.rect(L.dj.x + 1, L.dj.y + 1, L.dj.w - 2, L.dj.h - 3); g.clip();
  glow(L.dj.x + L.dj.w / 2, L.dj.y + L.dj.h * 0.5, L.dj.w * 0.7, 'rgba(127,168,255,0.5)', 0.6);
  const ds = pxScale(L.dj.h > 60 ? 2.5 : 2);
  drawDjinn(L.dj.x + L.dj.w / 2, L.dj.y + L.dj.h - 4 - (22 - 16) * ds, ds, { rows: 23 });
  g.restore();
  if (live && tapped(L.dj.x, L.dj.y, L.dj.w, L.dj.h)) S.modal = 'menu';
  text(g, 'MENU', L.dj.x + L.dj.w / 2, L.dj.y + L.dj.h - 11, { align: 'c', col: '#D4F1FA', outline: '#15122F' });

  drawScore(L.score);
  drawMachine(L.mach, live);
  drawCharms(L.charms, live);
  drawStatus(L.status);
  drawButtons(L.btn, live);
  if (P.hint && !P.busy && !P.banner) {
    const m = L.mach; const w = Math.min(m.w - 8, measure(P.hint) + 12), h = richHeight(P.hint, w - 8) + 6;
    const hy = m.ry + m.rh / 2 - h / 2 + (S.run.phase === 'ready' ? 0 : -m.cell * 1.1) + Math.sin(V.t * 4) * 1.5;
    rrect(m.x + (m.w - w) / 2, hy, w, h, '#0B0920'); rrect(m.x + (m.w - w) / 2 + 1, hy + 1, w - 2, h - 2, '#FFD84A');
    rich(g, P.hint, m.x + (m.w - w) / 2 + 4, hy + 4, w - 8, { col: '#1B1A3A', align: 'c' });
  }
  drawSpeech(L.dj.x - 1, L.dj.y + L.dj.h * 0.5, V.portrait ? -1 : -1, V.portrait ? L.head.w - 10 : 150);
  drawBanner();
  const tip = P.sel || P.hover;
  if (tip && !P.payout && !P.spinning.some(Boolean)) infoNear(tip.r.x, tip.r.y, tip.r.w, tip.r.h, tip.it);
  drawPayout(on);
  // a finished quest hands over its symbol as soon as the machine is idle
  if (on && !P.busy && !P.banner && !P.payout) offerReward(() => {
    for (let c = 0; c < 5; c++) P.pos[c] = P.last[c] = run.offsets[c];
    if (run.phase === 'landed') landed();
  });
}

scenes.play = { enter, draw };
