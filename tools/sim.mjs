// Headless balance simulation. `node tools/sim.mjs [runs] [lamp] [smart|dumb]`
import * as G from '../src/game.js';
import { SYM, CHARM } from '../src/data.js';

const N = +process.argv[2] || 200;
const lamp = process.argv[3] || 'azure';
const smart = (process.argv[4] || 'smart') === 'smart';
const RV = { C: 1, U: 2, R: 3, L: 4, X: 0 };
const died = Array(12).fill(0), reached = Array(12).fill(0), spinTotals = Array.from({ length: 12 }, () => []);
let wins = 0; const power = Array.from({ length: 12 }, () => []);

function avgScore(run, K = 40) {
  const so = run.offsets.slice(), ss = run.sr, sp = run.spinInRound, sl = run.spinsLeft;
  run.spinInRound = 2; run.spinsLeft = 2;
  let t = 0;
  for (let k = 0; k < K; k++) {
    for (let c = 0; c < 5; c++) run.offsets[c] = Math.floor(Math.random() * run.reels[c].length);
    run.sr = Array.from({ length: 15 }, Math.random);
    t += G.evaluate(run).total;
  }
  run.offsets = so; run.sr = ss; run.spinInRound = sp; run.spinsLeft = sl;
  return t / K;
}

function playSpin(run) {
  G.spin(run);
  for (;;) {
    if (run.wishesLeft <= 0) break;
    const cur = G.evaluate(run).total;
    let best = null;
    for (let c = 0; c < 5; c++) for (const d of [-1, 1]) {
      if (!G.canHold(run, c)) continue;
      const o = run.offsets[c], n = run.reels[c].length;
      run.offsets[c] = (o + d + n) % n;
      const t = G.evaluate(run).total;
      run.offsets[c] = o;
      if (!best || t > best.t) best = { c, d, t };
    }
    const need = G.tributeFor(run) - run.roundScore;
    const last = run.spinsLeft === 0;
    if (cur >= need) break;
    if (best && (best.t > cur * (smart ? 1.25 : 1.6) || (last && best.t > cur))) G.nudge(run, best.c, best.d);
    else if (last && cur < need) G.respin(run);
    else break;
  }
  const res = G.cashIn(run);
  spinTotals[Math.min(11, run.round)].push(res.total);
  return res.outcome;
}

function shopDumb(run) {
  const ch = run.shop.charms.map((o, k) => ({ o, k })).sort((a, b) => RV[CHARM[b.o.id].rar] - RV[CHARM[a.o.id].rar]);
  for (const { k } of ch) if (G.canBuyCharm(run, k)) G.buyCharm(run, k);
  const sy = run.shop.syms.map((o, k) => ({ o, k })).sort((a, b) => RV[SYM[b.o.id].rar] - RV[SYM[a.o.id].rar]);
  for (const { k } of sy) if (G.canBuySym(run, k)) {
    const rooms = G.reelsWithRoom(run);
    const c = rooms[Math.floor(Math.random() * rooms.length)];
    G.buySym(run, k, c, Math.floor(Math.random() * run.reels[c].length));
  }
}

function shopSmart(run) {
  for (let iter = 0; iter < 8; iter++) {
    const base = avgScore(run, 80);
    let best = null;
    const consider = (gain, cost, fn) => { const v = gain / Math.max(1, cost); if (gain > base * 0.03 && (!best || v > best.v)) best = { v, fn }; };
    run.shop.charms.forEach((o, k) => {
      if (!G.canBuyCharm(run, k)) return;
      run.charms.push({ id: o.id, n: 0 });
      const s = avgScore(run); run.charms.pop();
      consider(s - base, o.price, () => G.buyCharm(run, k));
    });
    run.shop.syms.forEach((o, k) => {
      if (!G.canBuySym(run, k)) return;
      let bp = null;
      for (let t = 0; t < 5; t++) {
        const rooms = G.reelsWithRoom(run); const c = rooms[Math.floor(Math.random() * rooms.length)];
        const pos = Math.floor(Math.random() * run.reels[c].length);
        run.reels[c].splice(pos, 0, { id: o.id, u: -1, b: 0 });
        const s = avgScore(run); run.reels[c].splice(pos, 1);
        if (!bp || s > bp.s) bp = { s, c, pos };
      }
      consider(bp.s - base, o.price, () => G.buySym(run, k, bp.c, bp.pos));
    });
    if (G.canBuyRelic(run) && run.shop.relic.id !== 'contract') {
      const o = run.shop.relic;
      if (o.kind === 'charm') {
        run.relics.push({ id: o.id });
        const s = avgScore(run); run.relics.pop();
        consider(s - base, o.price + 1, () => G.buyRelic(run));
      } else {
        let bp = null;
        for (let t = 0; t < 5; t++) {
          const rooms = G.reelsWithRoom(run); const c = rooms[Math.floor(Math.random() * rooms.length)];
          const pos = Math.floor(Math.random() * run.reels[c].length);
          run.reels[c].splice(pos, 0, { id: o.id, u: -1, b: 0 });
          const s = avgScore(run); run.reels[c].splice(pos, 1);
          if (!bp || s > bp.s) bp = { s, c, pos };
        }
        consider(bp.s - base, o.price + 1, () => G.buyRelic(run, bp.c, bp.pos));
      }
    }
    for (let t = 0; t < 6; t++) {
      const c = Math.floor(Math.random() * 5); if (!G.canBanish(run, c)) continue;
      const pos = Math.floor(Math.random() * run.reels[c].length);
      const [x] = run.reels[c].splice(pos, 1);
      const s = avgScore(run); run.reels[c].splice(pos, 0, x);
      consider(s - base, run.shop.banish, () => G.banish(run, c, pos));
    }
    if (!best) break;
    best.fn();
  }
}

for (let n = 0; n < N; n++) {
  const run = G.newRun(lamp, 0, n * 7919 + 13);
  for (;;) {
    reached[Math.min(11, run.round)]++; power[Math.min(11, run.round)].push(avgScore(run, 60));
    let out;
    do { out = playSpin(run); } while (out === 'next');
    if (out === 'over') break;
    G.payout(run);
    if (run.phase === 'won') { wins++; break; }
    (smart ? shopSmart : shopDumb)(run);
    G.nextRound(run);
  }
}
const q = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)] : 0;
console.log(`lamp=${lamp} bot=${smart ? 'smart' : 'dumb'} runs=${N} wins=${wins} (${(100 * wins / N).toFixed(1)}%)`);
const dummy = G.newRun(lamp, 0, 1);
for (let r = 0; r < 9; r++) console.log(`round ${r + 1}: tribute ${String(G.tributeFor(dummy, r)).padStart(6)}  reached ${(100 * reached[r] / N).toFixed(0).padStart(3)}%  raw spin avg p25/p50/p75 ${[.25, .5, .75].map((p) => Math.round(q(power[r], p))).join(' / ')}`);
