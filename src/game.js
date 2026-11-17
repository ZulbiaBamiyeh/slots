// Cherry Djinn — rules engine. Pure logic on a JSON-serialisable `run` object.
import { SYM, CHARM, SYMBOLS, CHARMS, CURSES, RELICS, DECREES, LAMP, TRIBUTES, REWARDS, RARITY, LINE_FAMS } from './data.js';

export const COLS = 5, ROWS = 3, MAX_REEL = 9, MIN_REEL = 3;

// ---------- RNG (seeded, state lives in run.rs)
export function rnd(run) {
  run.rs = (run.rs + 0x6D2B79F5) | 0;
  let t = run.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (run, n) => Math.floor(rnd(run) * n);
const pick = (run, arr) => arr[ri(run, arr.length)];
function shuffle(run, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = ri(run, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const mk = (run, id) => ({ id, u: run.uid++, b: 0 });
export const hasCharm = (run, id) => run.charms.some((c) => c.id === id);
export const hasRelic = (run, id) => run.relics.some((c) => c.id === id);

// ---------- Run lifecycle
export function newRun(lampId = 'azure', wrath = 0, seed = (Math.random() * 2 ** 31) | 0) {
  const lamp = LAMP[lampId];
  const run = {
    v: 3, rs: seed | 0, lamp: lampId, wrath, uid: 1,
    reels: [], charms: [], relics: [], maxCharms: lamp.slots || 5,
    gold: lamp.gold, round: 0, phase: 'ready', endless: false,
    offsets: [0, 0, 0, 0, 0], held: [false, false, false, false, false],
    spinsLeft: 0, wishesLeft: 0, wishesUsed: 0, spinInRound: 0, spinNo: 0,
    roundScore: 0, sr: [], glare: -1, tributeMul: 1,
    decrees: [], shop: null,
    stats: { bestSpin: 0, spins: 0, tributes: 0, bought: 0 },
  };
  run.reels = lamp.reels.map((r) => r.map((id) => mk(run, id)));
  run.decrees = shuffle(run, DECREES.map((d) => d.id)).slice(0, 3);
  startRound(run);
  return run;
}

export const isBoss = (run, r = run.round) => r % 3 === 2;
export const actOf = (r) => Math.floor(r / 3);
export function decreeOf(run, r = run.round) {
  if (!isBoss(run, r)) return null;
  return run.decrees[actOf(r) % run.decrees.length];
}
const nice = (n) => {
  const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.round(n / m) * m;
};
export function tributeFor(run, r = run.round) {
  let base = r < TRIBUTES.length ? TRIBUTES[r] : TRIBUTES[TRIBUTES.length - 1] * Math.pow(2.2, r - TRIBUTES.length + 1);
  base *= 1 + 0.25 * run.wrath;
  base *= run.tributeMul;
  base *= LAMP[run.lamp].trib || 1;
  return nice(base);
}

export function allInst(run) { return run.reels.flat(); }
const countSym = (run, id) => allInst(run).filter((s) => s.id === id).length;

export function addCurse(run) {
  const open = run.reels.map((r, i) => i).filter((i) => run.reels[i].length < MAX_REEL);
  if (!open.length) return null;
  const c = pick(run, open);
  const inst = mk(run, pick(run, CURSES).id);
  const pos = ri(run, run.reels[c].length + 1);
  insertAt(run, c, pos, inst);
  return { c, inst };
}

// Insert so that the currently visible window is preserved where possible.
export function insertAt(run, c, pos, inst) {
  const reel = run.reels[c];
  reel.splice(pos, 0, inst);
  if (pos <= run.offsets[c]) run.offsets[c] = (run.offsets[c] + 1) % reel.length;
}
export function removeAt(run, c, pos) {
  const reel = run.reels[c];
  const [inst] = reel.splice(pos, 1);
  if (pos < run.offsets[c]) run.offsets[c]--;
  run.offsets[c] = ((run.offsets[c] % reel.length) + reel.length) % reel.length;
  return inst;
}

export function startRound(run) {
  const notes = [];
  const dec = decreeOf(run);
  run.spinsLeft = 4 + (hasCharm(run, 'sandglass') ? 1 : 0) - (dec === 'straw' ? 1 : 0);
  let w = 3 + (hasCharm(run, 'dice') ? 1 : 0) + (LAMP[run.lamp].wishes || 0) - countSym(run, 'blackcat');
  if (dec === 'thirst') w = Math.min(w, 1);
  run.wishesLeft = Math.max(0, w);
  run.wishesUsed = 0; run.spinInRound = 0; run.roundScore = 0;
  run.held = [false, false, false, false, false];
  run.glare = -1;
  if (hasRelic(run, 'pandora')) { const a = addCurse(run); if (a) notes.push({ t: 'curse', ...a, by: 'pandora' }); }
  run.phase = 'ready';
  return notes;
}

function rollSpin(run) {
  run.sr = Array.from({ length: COLS * ROWS }, () => rnd(run));
  run.glare = hasRelic(run, 'evileye') ? ri(run, COLS) : -1; // a whole reel
}
export function spin(run) {
  if (run.phase !== 'ready' || run.spinsLeft <= 0) return false;
  run.spinsLeft--; run.spinNo++; run.spinInRound++; run.stats.spins++;
  run.held = [false, false, false, false, false];
  for (let c = 0; c < COLS; c++) run.offsets[c] = ri(run, run.reels[c].length);
  rollSpin(run);
  run.phase = 'landed';
  return true;
}
export function canHold(run, c) { return !(decreeOf(run) === 'chains' && c === 2); }
export function toggleHold(run, c) {
  if (run.phase !== 'landed' || !canHold(run, c)) return false;
  run.held[c] = !run.held[c];
  return true;
}
export function respin(run) {
  if (run.phase !== 'landed' || run.wishesLeft <= 0 || run.held.every((h) => h)) return false;
  run.wishesLeft--; run.wishesUsed++;
  for (let c = 0; c < COLS; c++) if (!run.held[c]) run.offsets[c] = ri(run, run.reels[c].length);
  rollSpin(run);
  return true;
}
export function nudge(run, c, dir) {
  if (run.phase !== 'landed' || run.wishesLeft <= 0 || !canHold(run, c)) return false;
  run.wishesLeft--; run.wishesUsed++;
  const n = run.reels[c].length;
  run.offsets[c] = (run.offsets[c] + dir + n) % n;
  return true;
}

// ---------- Scoring
const NB = [];
for (let i = 0; i < COLS * ROWS; i++) {
  const c = Math.floor(i / ROWS), r = i % ROWS, out = [];
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    if (!dc && !dr) continue;
    const cc = c + dc, rr = r + dr;
    if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS) out.push(cc * ROWS + rr);
  }
  NB.push(out);
}
export const neighbours = (i) => NB[i];

function matches(def, spec) {
  if (Array.isArray(spec)) return spec.some((s) => matches(def, s));
  const [k, v] = spec.split(':');
  if (k === 'id') return def.id === v;
  if (k === 'fam') return def.fam === v;
  if (k === 'col') return def.col.includes(v);
  if (k === 'tag') return def.tags.includes(v);
  return false;
}

export function board(run) {
  const out = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const reel = run.reels[c];
    out.push(reel[(run.offsets[c] + r) % reel.length]);
  }
  return out;
}

const LINE_ADD = { 3: 1, 4: 2, 5: 3 }, LINE_MUL = { 3: 2, 4: 3, 5: 5 };

function findLines(run, G, dec) {
  const lines = [];
  const minLen = dec === 'fog' ? 4 : 3;
  const incense = hasCharm(run, 'incense');
  for (let r = 0; r < ROWS; r++) {
    const row = []; for (let c = 0; c < COLS; c++) row.push(G[c * ROWS + r]);
    if (row.some((x) => x.def.id === 'sand' && !x.charmed && !incense && !x.dead)) continue;
    const wild = (x) => x.def.tags.includes('wild');
    const best = (test) => {
      let b = null, start = -1;
      for (let c = 0; c <= COLS; c++) {
        const ok = c < COLS && test(row[c]);
        if (ok && start < 0) start = c;
        if (!ok && start >= 0) { const len = c - start; if (len >= minLen && (!b || len > b.len)) b = { c0: start, len }; start = -1; }
      }
      return b;
    };
    let fam = null;
    for (const f of LINE_FAMS) {
      const b = best((x) => x.def.fam === f || wild(x));
      if (b && (!fam || b.len > fam.len)) fam = { ...b, key: f };
    }
    if (fam) lines.push({ kind: 'family', row: r, ...fam });
    let pure = null;
    const ids = [...new Set(row.filter((x) => LINE_FAMS.includes(x.def.fam)).map((x) => x.def.id))];
    for (const id of ids) {
      const b = best((x) => x.def.id === id || wild(x));
      if (b && (!pure || b.len > pure.len)) pure = { ...b, key: id };
    }
    if (pure) lines.push({ kind: 'pure', row: r, ...pure });
  }
  return lines;
}

// Evaluate the current board. No mutation; returns events for the UI to play and effects to apply.
export function evaluate(run) {
  const dec = decreeOf(run);
  const insts = board(run);
  const N = COLS * ROWS;
  const incense = hasCharm(run, 'incense');
  const G = insts.map((inst, i) => ({
    i, c: Math.floor(i / ROWS), r: i % ROWS, inst, def: SYM[inst.id],
    dead: false, why: '', eaten: false, gilded: false, charmed: false, opened: false,
    add: 0, mul: 1, trig: 1, coins: 0, eatGain: 0,
  }));
  const pre = [];
  const kill = (x, why) => { if (!x.dead) { x.dead = true; x.why = why; } };
  // decree / relic disables
  for (const x of G) {
    const f = x.def.fam;
    if (dec === 'cage' && f === 'creature') kill(x, 'decree');
    if (dec === 'tax' && f === 'treasure') kill(x, 'decree');
    if (dec === 'silence' && f === 'magic') kill(x, 'decree');
    if (dec === 'mirage' && x.r === 2) kill(x, 'decree');
    if (hasRelic(run, 'bloodmoon') && f === 'garden') kill(x, 'moon');
    if (run.glare === x.c) { kill(x, 'glare'); pre.push({ t: 'glare', i: x.i }); }
  }
  const act = (x) => !x.dead && !x.eaten && !x.gilded && !x.charmed;
  const curseOn = (x) => x.def.curse && act(x) && !incense;
  // snake charmer
  for (const x of G) if (x.def.id === 'charmer' && act(x)) for (const j of NB[x.i]) {
    const y = G[j]; if (y.def.curse && !y.dead && !y.charmed) { y.charmed = true; pre.push({ t: 'tame', i: j, by: x.i }); }
  }
  // curses that disable
  for (const x of G) if (curseOn(x)) {
    if (x.def.id === 'wasp') for (const j of NB[x.i]) if (G[j].def.fam === 'fruit' && !G[j].dead) { kill(G[j], 'wasp'); pre.push({ t: 'sting', i: j, by: x.i }); }
    if (x.def.id === 'moth') for (const j of NB[x.i]) if (G[j].def.fam === 'treasure' && !G[j].dead) { kill(G[j], 'moth'); pre.push({ t: 'sting', i: j, by: x.i }); }
  }
  // midas
  for (const x of G) if (x.def.id === 'midas' && act(x)) for (const j of NB[x.i]) {
    const y = G[j]; if (!y.dead && !y.gilded && y.def.fam !== 'relic') { y.gilded = true; pre.push({ t: 'gild', i: j, by: x.i }); }
  }
  // eaters, crackers, openers
  for (const x of G) if (act(x)) {
    if (x.def.eat) for (const j of NB[x.i]) {
      const y = G[j];
      if (matches(y.def, x.def.eat.m) && act(y)) { y.eaten = true; x.eatGain += x.def.eat.v; pre.push({ t: 'eat', i: j, by: x.i }); }
    }
    if (x.def.id === 'monkey' || x.def.id === 'elephant') for (const j of NB[x.i]) {
      const y = G[j]; if (y.def.id === 'coconut' && act(y) && !y.opened) { y.opened = true; y.add += 15; pre.push({ t: 'crack', i: j, by: x.i }); }
    }
    if (x.def.id === 'key' || x.def.id === 'elephant') for (const j of NB[x.i]) {
      const y = G[j]; if (y.def.id === 'chest' && act(y) && !y.opened) { y.opened = true; y.add += 25; pre.push({ t: 'open', i: j, by: x.i }); }
    }
  }
  const lines = findLines(run, G, dec);
  const inLine = (x) => lines.some((l) => l.row === x.r && x.c >= l.c0 && x.c < l.c0 + l.len);
  // additive effects
  for (const x of G) {
    x.add += x.eatGain;
    if (!act(x)) continue;
    const d = x.def;
    if (d.adj) for (const j of NB[x.i]) if (matches(G[j].def, d.adj.m)) x.add += d.adj.v;
    if (d.brd) for (const y of G) if (y !== x && matches(y.def, d.brd.m)) x.add += d.brd.v;
    if (d.sadd && NB[x.i].some((j) => matches(G[j].def, d.sadd.m))) x.add += d.sadd.v;
    if (d.aura) for (const j of NB[x.i]) if (matches(G[j].def, d.aura.m)) G[j].add += d.aura.v;
    if (d.baura) for (const y of G) if (matches(y.def, d.baura.m)) y.add += d.baura.v;
  }
  for (const x of G) if (curseOn(x) && x.def.id === 'rot') for (const j of NB[x.i]) if (G[j].def.fam === 'fruit') G[j].add -= 2;
  if (hasCharm(run, 'sun')) for (const x of G) if (x.def.fam === 'fruit') x.add += 2;
  if (hasRelic(run, 'ring')) for (const x of G) x.add += 3;
  // multiplicative effects
  const baseOf = (x) => x.def.coins + x.inst.b + x.add;
  for (const x of G) {
    if (!act(x)) continue;
    const d = x.def;
    if (d.smul && NB[x.i].some((j) => matches(G[j].def, d.smul.m))) x.mul *= d.smul.k;
    if (d.amul) for (const j of NB[x.i]) if (matches(G[j].def, d.amul.m)) G[j].mul *= d.amul.k;
    if (d.id === 'blackcat') for (const j of NB[x.i]) G[j].mul *= 3;
    if (d.id === 'hummingbird') {
      let b = null;
      for (const j of NB[x.i]) { const y = G[j]; if (y.def.fam === 'fruit' && act(y) && (!b || baseOf(y) > baseOf(b))) b = y; }
      if (b) b.mul *= 2;
    }
    if (d.id === 'phoenix') for (const j of NB[x.i]) G[j].trig++;
    if (d.id === 'hourglass') { if (x.r > 0) G[x.i - 1].trig++; if (x.r < ROWS - 1) G[x.i + 1].trig++; }
  }
  if (hasCharm(run, 'compass')) for (const i of [0, ROWS - 1, N - ROWS, N - 1]) G[i].mul *= 3;
  if (hasRelic(run, 'bloodmoon')) for (const x of G) if (x.def.col.includes('red') || x.def.col.includes('pink')) x.mul *= 3;
  if (hasCharm(run, 'mirror')) for (let r = 0; r < ROWS; r++) G[2 * ROWS + r].trig++;
  // final coins per cell
  for (const x of G) {
    if (x.dead || x.eaten) { x.coins = 0; continue; }
    if (x.gilded) { x.coins = 20; continue; }
    if (x.def.curse) {
      x.coins = x.charmed ? 10 : (x.def.id === 'scorpion' && !incense ? -8 : 0);
      continue;
    }
    let v = baseOf(x) * x.mul;
    if (x.def.id === 'foolsgold' && run.sr[x.i] < 0.25) v = -40 * x.mul;
    if (dec === 'famine' && x.def.fam === 'fruit') v = Math.floor(v / 2);
    x.coins = Math.max(v, x.def.id === 'foolsgold' ? -1e9 : 0);
  }
  for (const x of G) if (x.def.id === 'parrot' && act(x)) {
    let b = 0; for (const j of NB[x.i]) if (G[j].def.id !== 'parrot') b = Math.max(b, G[j].coins);
    x.coins = b * x.mul;
  }

  // ---- event stream
  const events = [...pre];
  let coins = 0, mult = 1, gold = 0;
  const perm = []; // {u, d}
  const push = (e) => { events.push({ ...e, coins, mult }); };
  const addM = (src, v) => { if (!v) return; mult += v; if (mult < 1) mult = 1; push({ t: 'mult', v, ...src }); };
  const mulM = (src, k) => { if (k === 1) return; mult *= k; push({ t: 'xmult', v: k, ...src }); };
  const grow = (x, d) => { perm.push({ u: x.inst.u, d }); push({ t: 'grow', i: x.i, v: d }); };
  const g2 = hasCharm(run, 'glove') ? 2 : 1;
  const curseCount = G.filter((x) => x.def.curse).length;
  for (const x of G) {
    for (let t = 0; t < x.trig; t++) {
      if (x.coins) { coins += x.coins; push({ t: 'coins', i: x.i, v: x.coins, again: t > 0, big: x.mul > 1 }); }
      if (curseOn(x) && x.def.id === 'debt') addM({ i: x.i }, -1);
      if (!act(x) || x.def.curse) continue;
      const d = x.def, src = { i: x.i, again: t > 0 };
      if (d.mult) addM(src, d.mult);
      if (d.lineMult && inLine(x)) addM(src, d.lineMult);
      if (d.id === 'carpet' && x.r === 0) addM(src, 2);
      if (d.id === 'lotus' && NB[x.i].some((j) => G[j].def.tags.includes('water'))) addM(src, 2);
      if (d.id === 'dragonfruit') addM(src, new Set(NB[x.i].filter((j) => G[j].def.fam === 'fruit' && G[j].def.id !== 'dragonfruit').map((j) => G[j].def.id)).size);
      if (d.id === 'peacock') addM(src, new Set(NB[x.i].flatMap((j) => G[j].def.col)).size);
      if (d.id === 'bottle') addM(src, G.filter((y) => y !== x && y.def.fam === 'magic').length);
      if (d.id === 'cursejar') addM(src, 2 * curseCount);
      if (d.id === 'crystal' && x.r === 1) mulM(src, 2);
      if (d.id === 'seed') grow(x, (NB[x.i].some((j) => G[j].def.tags.includes('water')) ? 3 : 1) * g2);
      if (d.id === 'pearl') grow(x, 1 * g2);
      if (d.id === 'wateringcan') for (const j of NB[x.i]) if (G[j].def.fam === 'garden' && !G[j].dead) grow(G[j], 1 * g2);
      if (d.id === 'bat') {
        grow(x, 4 * g2);
        let b = null; for (const j of NB[x.i]) { const y = G[j]; if (y.def.coins + y.inst.b > 0 && y.def.fam !== 'relic' && (!b || y.coins > b.coins)) b = y; }
        if (b) grow(b, -1);
      }
      if (d.gold) { gold += d.gold; push({ t: 'gold', i: x.i, v: d.gold }); }
    }
  }
  for (const l of lines) {
    if (l.kind === 'family') { mult += LINE_ADD[l.len]; push({ t: 'line', line: l, v: LINE_ADD[l.len] }); }
    else { mult *= LINE_MUL[l.len]; push({ t: 'line', line: l, v: LINE_MUL[l.len] }); }
  }
  // charms, left to right
  run.charms.forEach((ch, ci) => {
    const src = { charm: ci };
    const cnt = (f) => G.filter(f).length;
    const fam = (f) => cnt((x) => x.def.fam === f);
    switch (ch.id) {
      case 'tambourine': addM(src, 2 * pre.filter((e) => e.t === 'eat' || e.t === 'crack' || e.t === 'open').length); break;
      case 'hookah': if (run.spinInRound === 1) addM(src, 3); break;
      case 'abacus': addM(src, 2 * lines.length); break;
      case 'loupe': addM(src, 2 * cnt((x) => x.def.tags.includes('gem'))); break;
      case 'purse': addM(src, Math.min(6, Math.floor(run.gold / 5))); break;
      case 'rainbow': if (new Set(G.flatMap((x) => x.def.col)).size >= 8) addM(src, 4); break;
      case 'fruitbowl': if (fam('fruit') >= 11) mulM(src, 2); break;
      case 'whistle': if (fam('creature') >= 4) mulM(src, 2); break;
      case 'vault': if (fam('treasure') >= 6) mulM(src, 2); break;
      case 'trellis': if (fam('garden') >= 4) mulM(src, 2); break;
      case 'spellbook': if (fam('magic') >= 3) mulM(src, 2); break;
      case 'scimitar': if (run.wishesUsed === 0) mulM(src, 2); break;
      case 'moon': if (run.spinsLeft === 0) mulM(src, 2); break;
      case 'bell': for (let k = 0; k < lines.length; k++) mulM(src, 1.5); break;
      case 'scarab': mulM(src, 1 + 0.2 * (ch.n || 0)); break;
      case 'tightrope': if (run.reels.every((r) => r.length <= 5)) mulM(src, 3); break;
      case 'seal': if (lines.some((l) => l.len === 5)) mulM(src, 3); break;
    }
  });
  run.relics.forEach((rl, ri2) => {
    const src = { relic: ri2 };
    if (rl.id === 'evileye') mulM(src, 2);
    if (rl.id === 'pandora') addM(src, 6);
    if (rl.id === 'sandtimer') mulM(src, 4);
  });
  coins = Math.max(0, coins);
  const total = Math.floor(coins * mult);
  events.push({ t: 'end', coins, mult, total });
  return { events, coins, mult, total, gold, perm, lines, cells: G };
}

export function cashIn(run) {
  if (run.phase !== 'landed') return null;
  const res = evaluate(run);
  const byU = new Map(allInst(run).map((s) => [s.u, s]));
  for (const p of res.perm) {
    const s = byU.get(p.u); if (!s) continue;
    s.b = Math.max(-SYM[s.id].coins, s.b + p.d);
  }
  run.gold += res.gold;
  run.roundScore += res.total;
  run.stats.bestSpin = Math.max(run.stats.bestSpin, res.total);
  run.held = [false, false, false, false, false];
  res.notes = [];
  const st = run.relics.find((r) => r.id === 'sandtimer');
  if (st) {
    st.n = (st.n ?? CHARM.sandtimer.count) - 1;
    if (st.n <= 0) {
      run.relics = run.relics.filter((r) => r !== st);
      for (let k = 0; k < 3; k++) { const a = addCurse(run); if (a) res.notes.push({ t: 'curse', ...a, by: 'sandtimer' }); }
      res.notes.push({ t: 'shatter' });
    }
  }
  const target = tributeFor(run);
  if (run.roundScore >= target) { run.phase = 'paid'; res.outcome = 'paid'; }
  else if (run.spinsLeft <= 0) { run.phase = 'over'; res.outcome = 'over'; }
  else { run.phase = 'ready'; res.outcome = 'next'; }
  return res;
}

// Gold payout after a paid tribute. Returns the breakdown and applies it.
export function payout(run) {
  const step = run.round % 3;
  const rows = [];
  let base = REWARDS[step];
  if (hasRelic(run, 'ring')) base = Math.max(0, base - 2);
  rows.push({ label: 'Tribute paid', v: base });
  if (run.spinsLeft > 0) rows.push({ label: `${run.spinsLeft} unused Spin${run.spinsLeft > 1 ? 's' : ''}`, v: run.spinsLeft });
  if (hasCharm(run, 'scales') && run.wishesLeft > 0) rows.push({ label: 'Golden Scales', v: run.wishesLeft });
  const interest = Math.min(3, Math.floor(run.gold / 5));
  if (interest > 0) rows.push({ label: 'Interest (1 per 5 gold)', v: interest });
  const total = rows.reduce((a, r) => a + r.v, 0);
  run.gold += total;
  run.stats.tributes++;
  const final = run.round === TRIBUTES.length - 1 && !run.endless;
  run.phase = final ? 'won' : 'shop';
  if (run.phase === 'shop') genShop(run, true);
  return { rows, total };
}

export function continueEndless(run) {
  run.endless = true;
  run.phase = 'shop';
  genShop(run, true);
}

// ---------- Bazaar
const WEIGHTS = [
  { C: 60, U: 30, R: 9, L: 1 },
  { C: 44, U: 36, R: 17, L: 3 },
  { C: 30, U: 37, R: 26, L: 7 },
];
function rollRar(run, w) {
  let t = rnd(run) * (w.C + w.U + w.R + w.L);
  for (const k of ['C', 'U', 'R', 'L']) { if ((t -= w[k]) < 0) return k; }
  return 'C';
}
export function genShop(run, fresh) {
  const act = Math.min(2, actOf(run.round + 1));
  let w = WEIGHTS[act];
  const notes = [];
  if (fresh && hasRelic(run, 'paw')) { const a = addCurse(run); if (a) notes.push({ t: 'curse', ...a, by: 'paw' }); }
  const nSym = 3 + (hasCharm(run, 'merchant') ? 1 : 0);
  const syms = [];
  let guard = 0;
  while (syms.length < nSym && guard++ < 200) {
    let rar = rollRar(run, w);
    if (hasRelic(run, 'paw') && (rar === 'C' || rar === 'U')) rar = rnd(run) < 0.8 ? 'R' : 'L';
    const s = pick(run, SYMBOLS.filter((x) => x.rar === rar));
    if (!syms.some((o) => o.id === s.id)) syms.push({ id: s.id, price: RARITY[rar].sym, sold: false });
  }
  const charms = [];
  guard = 0;
  while (charms.length < 2 && guard++ < 200) {
    const rar = rollRar(run, w);
    const pool = CHARMS.filter((x) => x.rar === rar && !hasCharm(run, x.id) && !charms.some((o) => o.id === x.id));
    if (!pool.length) continue;
    const c = pick(run, pool);
    charms.push({ id: c.id, price: RARITY[rar].charm, sold: false });
  }
  // sometimes the djinn slips a cursed relic onto the table
  let relic = null;
  if (rnd(run) < (fresh ? 0.6 : 0.35)) {
    const pool = RELICS.filter((r) => r.kind === 'symbol' || !hasRelic(run, r.id));
    const r = pick(run, pool);
    relic = { id: r.id, kind: r.kind, price: (r.kind === 'symbol' ? SYM[r.id] : CHARM[r.id]).price, sold: false };
  }
  const prev = run.shop;
  run.shop = { syms, charms, relic, reroll: fresh ? 2 : prev.reroll + 1, banish: fresh ? 2 : prev.banish, notes };
  return notes;
}
export const rerollCost = (run) => Math.max(0, run.shop.reroll - (hasCharm(run, 'merchant') ? 1 : 0));
export function reroll(run) {
  const cost = rerollCost(run);
  if (run.gold < cost) return false;
  run.gold -= cost;
  genShop(run, false);
  return true;
}
export const reelsWithRoom = (run) => run.reels.map((r, i) => i).filter((i) => run.reels[i].length < MAX_REEL);
export function canBuySym(run, k) {
  const o = run.shop.syms[k];
  return o && !o.sold && run.gold >= o.price && reelsWithRoom(run).length > 0;
}
export function buySym(run, k, c, pos) {
  if (!canBuySym(run, k) || run.reels[c].length >= MAX_REEL) return false;
  const o = run.shop.syms[k];
  run.gold -= o.price; o.sold = true; run.stats.bought++;
  insertAt(run, c, pos, mk(run, o.id));
  return true;
}
export function canBuyCharm(run, k) {
  const o = run.shop.charms[k];
  return o && !o.sold && run.gold >= o.price && run.charms.length < run.maxCharms;
}
export function buyCharm(run, k) {
  if (!canBuyCharm(run, k)) return false;
  const o = run.shop.charms[k];
  run.gold -= o.price; o.sold = true; run.stats.bought++;
  run.charms.push({ id: o.id, u: run.uid++, n: 0 });
  return true;
}
export function canBuyRelic(run) {
  const o = run.shop.relic;
  return !!o && !o.sold && run.gold >= o.price && (o.kind !== 'symbol' || reelsWithRoom(run).length > 0);
}
// Charm relics take effect at once. Symbol relics need a reel and position.
export function buyRelic(run, c, pos) {
  if (!canBuyRelic(run)) return false;
  const o = run.shop.relic;
  if (o.kind === 'symbol') {
    if (run.reels[c].length >= MAX_REEL) return false;
    insertAt(run, c, pos, mk(run, o.id));
  } else {
    run.relics.push({ id: o.id, u: run.uid++ });
    if (o.id === 'contract') { run.gold += 20; run.tributeMul *= 1.25; }
  }
  run.gold -= o.price; o.sold = true; run.stats.bought++;
  return true;
}
export const sellValue = (id) => Math.floor(RARITY[CHARM[id].rar].charm / 2);
export function sellCharm(run, k) {
  const c = run.charms[k]; if (!c) return false;
  run.gold += sellValue(c.id);
  run.charms.splice(k, 1);
  return true;
}
export function canBanish(run, c) { return run.gold >= run.shop.banish && run.reels[c].length > MIN_REEL; }
export function banish(run, c, pos) {
  if (!canBanish(run, c)) return false;
  run.gold -= run.shop.banish;
  run.shop.banish++;
  for (const ch of run.charms) if (ch.id === 'scarab') ch.n = (ch.n || 0) + 1;
  removeAt(run, c, pos);
  return true;
}
export const MOVE_COST = 1;
export function moveSym(run, c, pos, c2, pos2) {
  // pos2 is an insertion index in reel c2 *after* removal
  if (run.gold < MOVE_COST) return false;
  if (c !== c2 && (run.reels[c].length <= MIN_REEL || run.reels[c2].length >= MAX_REEL)) return false;
  run.gold -= MOVE_COST;
  const inst = removeAt(run, c, pos);
  insertAt(run, c2, Math.min(pos2, run.reels[c2].length), inst);
  return true;
}
export function nextRound(run) {
  run.round++;
  run.shop = null;
  return startRound(run);
}
