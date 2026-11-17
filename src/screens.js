// Title, Bazaar, Bargain, reel editor, end screens, menu and help.
import * as G from './game.js';
import { SYM, CHARM, DECREE, LAMPS, LAMP, ROUND_NAMES, RARITY } from './data.js';
import { V, setMood, setPost, hasGL } from './gfx.js';
import { T, burst, shake, flash, fmt, ease } from './fx.js';
import { sfx, A, setSfx, setMusic } from './audio.js';
import {
  C, I, tapped, over, button, card, infoCard, infoHeight, DJ, djinnSay, djinnMood, drawDjinn, drawSpeech, dimScreen, goldTag, st,
  rect, rrect, panel, inset, spr, pxScale, glow, text, measure, rich, richHeight,
} from './ui.js';
import { S, scenes, modals, save, go, toast, checkUnlocks } from './state.js';
import { lampDjinn } from './play.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const top = () => V.safeT + 4, bot = () => V.H - V.safeB - 4;

// =====================================================================
// Reel editor (modal): view reels, place a symbol, banish, move.
const E = { mode: 'view', place: null, lifted: null, gap: null, sel: null, closeAfter: false };
export function openEditor(o = {}) {
  Object.assign(E, { mode: 'view', place: null, lifted: null, gap: null, sel: null, closeAfter: false }, o);
  S.modal = 'editor';
}
function closeEditor() { S.modal = null; E.place = null; E.lifted = null; }

modals.editor = () => {
  const run = S.run, g = V.g, W = V.W, H = V.H;
  dimScreen(0.97);
  const side = !V.portrait;
  let x0, colW, listTop, cellH, info;
  if (!side) {
    colW = Math.min(46, Math.floor((W - 8) / 5)); x0 = Math.round((W - colW * 5) / 2); listTop = top() + 30;
    const infoH = 118;
    cellH = clamp(Math.floor((bot() - listTop - infoH - 8) / G.MAX_REEL), 16, 34);
    info = { x: 4, y: bot() - infoH, w: W - 8, h: infoH };
  } else {
    colW = 44; x0 = 8; listTop = top() + 28;
    cellH = clamp(Math.floor((bot() - listTop - 6) / G.MAX_REEL), 16, 30);
    info = { x: x0 + colW * 5 + 10, y: top() + 2, w: W - (x0 + colW * 5 + 10) - 6, h: bot() - top() - 2 };
  }
  const placing = E.place;
  text(g, placing ? 'PLACE ON A REEL' : 'YOUR REELS', side ? x0 + colW * 2.5 : W / 2, top() + 4, { align: 'c', col: C.yellow, scale: side ? 1 : 2, outline: '#0B0920' });
  const ss = pxScale(Math.min(2, (Math.min(cellH, colW) - 3) / 16));
  const inShop = run.phase === 'shop';
  for (let c = 0; c < 5; c++) {
    const reel = run.reels[c];
    const x = x0 + c * colW;
    const base = reel.map((inst, pos) => ({ inst, pos })).filter((e) => !(E.lifted && E.lifted.c === c && E.lifted.pos === e.pos));
    const disp = base.slice();
    const ghostAt = placing && E.gap && E.gap.c === c ? E.gap.pos : -1;
    if (ghostAt >= 0) disp.splice(ghostAt, 0, { ghost: true, inst: { id: placing.id, b: placing.inst ? placing.inst.b : 0 } });
    const full = base.length >= G.MAX_REEL;
    text(g, `${base.length}/${G.MAX_REEL}`, x + colW / 2, listTop - 10, { align: 'c', col: full ? '#FF7A8A' : C.dim });
    rrect(x + 1, listTop - 1, colW - 2, disp.length * cellH + 2, '#0B0920', 1);
    rect(x + 2, listTop, colW - 4, disp.length * cellH, '#FFF4E0');
    disp.forEach((e, k) => {
      const y = listTop + k * cellH;
      if (k % 2) rect(x + 2, y, colW - 4, cellH, '#F3E2C2');
      if (!e.ghost && !inShop && G.board(run).some((b) => b.u === e.inst.u) && ((e.pos - run.offsets[c] + reel.length) % reel.length) < 3) rect(x + 2, y, 3, cellH, '#3A5FE0');
      const isSel = !placing && E.sel && E.sel.c === c && E.sel.pos === e.pos;
      if (isSel) { rect(x + 2, y, colW - 4, cellH, '#FFD84A'); }
      if (e.ghost) { rect(x + 2, y, colW - 4, cellH, `rgba(63,191,90,${0.45 + 0.25 * Math.sin(V.t * 8)})`); }
      const d = SYM[e.inst.id];
      if (d.relic) glow(x + colW / 2, y + cellH / 2, cellH * 0.7, 'rgba(255,50,90,0.6)', 0.6);
      if (d.curse) glow(x + colW / 2, y + cellH / 2, cellH * 0.7, 'rgba(120,60,220,0.6)', 0.6);
      spr(e.inst.id, x + colW / 2, y + cellH / 2 + (e.ghost ? Math.sin(V.t * 8) * 1 : 0), ss, 0, 1);
      if (e.inst.b) text(g, (e.inst.b > 0 ? '+' : '') + e.inst.b, x + colW - 4, y + cellH - 9, { align: 'r', col: e.inst.b > 0 ? '#1F7A3A' : '#B0123C', outline: '#FFF4E0' });
      if (!placing && tapped(x, y, colW, cellH)) { E.sel = { c, pos: e.pos }; sfx.select(); }
    });
    // loop marker
    text(g, 'loop', x + colW / 2, listTop + disp.length * cellH + 3, { align: 'c', col: '#5B4FA8' });
    if (placing && tapped(x, listTop - 12, colW, (disp.length + 1) * cellH + 20)) {
      if (full) { sfx.error(); toast('That reel is full.', '#FF7A8A'); }
      else {
        let v = (I.y - listTop) / cellH;
        if (ghostAt >= 0 && v > ghostAt + 0.5) v -= 1;
        E.gap = { c, pos: clamp(Math.round(v), 0, base.length) };
        sfx.select();
      }
    }
  }
  // info / actions
  panel(info.x, info.y, info.w, info.h, { fill: '#1A1638' });
  const bx = info.x + 6, bw = info.w - 12, by = info.y + info.h - 28;
  if (placing) {
    const it = { k: 'sym', id: placing.id, inst: placing.inst };
    infoCard(info.x + 3, info.y + 3, info.w - 6, it);
    const hy = info.y + 6 + infoHeight(it, info.w - 6);
    if (hy + 10 < by) rich(g, 'Tap a reel to pick the spot. Neighbours above and below always travel together.', bx, hy, bw, { col: C.dim, lh: 9 });
    const can = !!E.gap;
    const cw2 = placing.cancel ? Math.round(bw * 0.6) : bw;
    if (button('ed-ok', bx, by, cw2, 24, 'CONFIRM', { col: '#3FA55A', disabled: !can })) {
      const { c, pos } = E.gap, p = placing;
      E.place = null; E.gap = null; E.lifted = null;
      sfx.place(); shake(2);
      p.done(c, pos);
      save();
      if (E.closeAfter) closeEditor();
    }
    if (placing.cancel && button('ed-no', bx + cw2 + 5, by, bw - cw2 - 5, 24, 'CANCEL', { col: '#5B4FA8' })) {
      const p = placing; E.place = null; E.gap = null; E.lifted = null; p.cancel();
      if (E.closeAfter) closeEditor();
    }
  } else {
    const sel = E.sel && run.reels[E.sel.c][E.sel.pos] ? E.sel : null;
    if (sel) infoCard(info.x + 3, info.y + 3, info.w - 6, { k: 'sym', id: run.reels[sel.c][sel.pos].id, inst: run.reels[sel.c][sel.pos] });
    else rich(g, E.mode === 'shop' ? 'Tap a symbol to inspect it, [x]banish[] it, or [k]move[] it. Each reel loops and shows 3 symbols in a row.' : 'Each reel loops and shows 3 symbols in a row. Blue marks are on the board now.', bx, info.y + 8, bw, { col: C.cream });
    if (E.mode === 'shop') {
      const w3 = Math.floor((bw - 10) / 3);
      const reelLen = sel ? run.reels[sel.c].length : 0;
      if (button('ed-ban', bx, by, w3, 24, 'BANISH', { col: '#B0123C', sub: `${run.shop.banish} gold`, disabled: !sel || run.gold < run.shop.banish || reelLen <= G.MIN_REEL })) {
        const [x, y] = [x0 + sel.c * colW + colW / 2, listTop + sel.pos * cellH + cellH / 2];
        G.banish(run, sel.c, sel.pos); E.sel = null; save();
        sfx.banish(); shake(3); burst(x, y, 20, { col: ['#FF4A6A', '#9A5CE8', '#FFFFFF'], speed: 80, life: 0.6 });
      }
      if (button('ed-mov', bx + w3 + 5, by, w3, 24, 'MOVE', { col: '#2F7BE8', sub: `${G.MOVE_COST} gold`, disabled: !sel || run.gold < G.MOVE_COST })) {
        const from = { ...sel }, inst = run.reels[from.c][from.pos];
        E.lifted = from; E.sel = null; E.gap = null;
        E.place = { id: inst.id, inst, done: (c, pos) => { G.moveSym(run, from.c, from.pos, c, pos); }, cancel: () => {} };
      }
      if (button('ed-done', bx + (w3 + 5) * 2, by, bw - (w3 + 5) * 2, 24, 'DONE', { col: '#E08A1A' })) closeEditor();
    } else if (button('ed-close', bx, by, bw, 24, 'CLOSE', { col: '#E08A1A' })) closeEditor();
  }
};

// =====================================================================
// Bazaar
const B = { sel: null };
function enterShop() {
  const run = S.run;
  setMood('shop'); A.mode = 'shop'; A.intensity = 0.3;
  B.sel = null; DJ.kind = lampDjinn(run);
  djinnSay('shop', 'smirk');
  for (const n of run.shop.notes || []) if (n.t === 'curse') { toast(`The Monkey's Paw curls: a ${SYM[n.inst.id].name} joins reel ${n.c + 1}.`, '#C79BFF'); sfx.curse(); }
  run.shop.notes = [];
  save();
}
function nextRoundInfo(run) {
  const r = run.round + 1, dec = G.decreeOf(run, r);
  return { r, dec, target: G.tributeFor(run, r), name: ROUND_NAMES[r % 3] };
}
function drawShop(on) {
  const run = S.run, g = V.g, W = V.W;
  if (!run || !run.shop) return;
  const sh = run.shop;
  let y = top();
  panel(4, y, W - 8, 30, { fill: '#0F3B3A', hi: '#2A8A78' });
  text(g, 'BAZAAR', 11, y + 7, { scale: 2, col: C.yellow, outline: '#0B2A28' });
  goldTag(W - 10, y + 7, run.gold, { scale: 2, align: 'r' });
  y += 34;
  const ni = nextRoundInfo(run);
  const nstr = `NEXT: ${ni.name} - PAY ${fmt(ni.target)}`;
  text(g, nstr, 8, y, { col: C.cream, shadow: '#0B0920' });
  if (ni.dec) {
    const dx = 8 + measure(nstr) + 6, dn = DECREE[ni.dec].name.toUpperCase();
    const fits = dx + measure(dn) + 8 < W;
    const tx = fits ? dx : 8, ty = fits ? y : y + 10;
    rrect(tx - 2, ty - 1, measure(dn) + 5, 10, '#B0123C', 1); text(g, dn, tx + 1, ty, { col: C.cream });
    if (on && tapped(tx - 4, ty - 4, measure(dn) + 10, 16)) { B.sel = { k: 'decree', id: ni.dec }; sfx.select(); }
    if (!fits) y += 10;
  }
  y += 14;
  const cw = 52, chh = 74, nS = sh.syms.length;
  const nC = 2 + (sh.relic ? 1 : 0);
  const oneRow = W >= (nS + nC) * (cw + 5) + 30;
  const drawOffer = (kind, k, x, yy) => {
    const o = kind === 'sym' ? sh.syms[k] : kind === 'relic' ? sh.relic : sh.charms[k];
    const sel = B.sel && (kind === 'relic' ? B.sel.k === 'offer-relic' : B.sel.k === kind && B.sel.i === k);
    const s = st(`shopcard:${kind}${k}`, () => ({ lift: 0 }));
    s.lift += ((sel ? 5 : 0) - s.lift) * 0.3;
    card(x, yy, cw, chh, { k: kind === 'relic' ? (o.kind === 'symbol' ? 'sym' : 'charm') : kind, id: o.id }, { price: o.price, afford: run.gold >= o.price, sold: o.sold, sel, lift: s.lift, sc: sel ? 1.05 : 1 });
    if (on && !o.sold && tapped(x, yy, cw, chh + 6)) { B.sel = { k: kind === 'relic' ? 'offer-relic' : kind, i: k }; sfx.select(); if (kind === 'relic') djinnMood('smirk', 1.5); }
  };
  const ownSlots = (x, yy, w) => {
    // owned charms + relics
    text(g, `YOUR CHARMS ${run.charms.length}/${run.maxCharms}`, x, yy, { col: C.dim });
    const sw = Math.min(26, Math.floor(w / run.maxCharms));
    for (let k = 0; k < run.maxCharms; k++) {
      const sx = x + k * sw, sy = yy + 11;
      inset(sx, sy, sw - 2, 24);
      const ch = run.charms[k]; if (!ch) continue;
      const sel = B.sel && B.sel.k === 'own' && B.sel.i === k;
      if (sel) rrect(sx, sy, sw - 2, 24, '#FFD84A', 1);
      spr(ch.id, sx + (sw - 2) / 2, sy + 12 + Math.sin(V.t * 2 + k) * 0.6, pxScale(Math.min(1.4, (sw - 4) / 16)));
      if (on && tapped(sx, sy, sw - 2, 24)) { B.sel = { k: 'own', i: k }; sfx.select(); }
    }
    run.relics.forEach((rl, k) => {
      const sx = x + run.maxCharms * sw + 6 + k * 20, sy = yy + 14;
      rrect(sx, sy, 18, 18, '#7A1838', 1); rrect(sx + 1, sy + 1, 16, 16, '#3A0E22', 1);
      spr(rl.id, sx + 9, sy + 9, pxScale(1));
      if (on && tapped(sx, sy, 18, 18)) { B.sel = { k: 'relic', i: k }; sfx.select(); }
    });
  };
  if (oneRow) {
    const total = (nS + nC) * (cw + 5) + 10;
    let x = Math.round((W - total) / 2);
    for (let k = 0; k < nS; k++) { drawOffer('sym', k, x, y); x += cw + 5; }
    x += 10;
    for (let k = 0; k < 2; k++) { drawOffer('charm', k, x, y); x += cw + 5; }
    if (sh.relic) drawOffer('relic', 0, x, y);
    y += chh + 12;
    ownSlots(10, y, Math.min(130, W * 0.3));
  } else {
    let x = Math.round((W - (nS * (cw + 4) - 4)) / 2);
    for (let k = 0; k < nS; k++) { drawOffer('sym', k, x, y); x += cw + 4; }
    y += chh + 12;
    x = Math.round((W - (nC * (cw + 4) - 4)) / 2);
    for (let k = 0; k < 2; k++) { drawOffer('charm', k, x, y); x += cw + 4; }
    if (sh.relic) drawOffer('relic', 0, x, y);
    y += chh + 12;
    ownSlots(8, y, 130);
    y += 40;
  }
  // bottom buttons
  const byy = bot() - 34;
  const bw = (W - 8 - 10) / 3;
  const rc = G.rerollCost(run);
  if (button('sh-rr', 4, byy, bw, 34, 'REROLL', { col: '#8A4FD8', sub: `${rc} gold`, enabled: on, disabled: run.gold < rc })) {
    G.reroll(run); B.sel = null; save(); sfx.wish(); djinnMood('scowl', 1); flash(0.05);
  }
  if (button('sh-reels', 4 + bw + 5, byy, bw, 34, 'REELS', { col: '#5B4FA8', sub: 'banish / move', enabled: on })) openEditor({ mode: 'shop' });
  if (button('sh-next', 4 + (bw + 5) * 2, byy, bw, 34, 'NEXT', { col: '#E08A1A', sub: 'tribute', scale: 1, enabled: on && !S.switching })) {
    const notes = G.nextRound(run); save();
    go('play').then(() => { for (const n of notes) if (n.t === 'curse') { toast(`Pandora's Box: a ${SYM[n.inst.id].name} joins reel ${n.c + 1}.`, '#C79BFF'); sfx.curse(); } });
  }
  // info panel
  const ix = oneRow ? Math.min(130, W * 0.3) + 20 + run.relics.length * 20 : 4, iy = oneRow ? y - 2 : y, iw = W - ix - 4, ih = byy - 6 - iy;
  if (ih < 30) return;
  panel(ix, iy, iw, ih, { fill: '#1A1638' });
  const s = B.sel;
  let it = null, act = null;
  if (s) {
    if (s.k === 'sym' && sh.syms[s.i] && !sh.syms[s.i].sold) {
      const o = sh.syms[s.i]; it = { k: 'sym', id: o.id };
      act = { label: 'BUY', sub: `${o.price} gold`, col: '#3FA55A', dis: !G.canBuySym(run, s.i), why: run.gold < o.price ? 'Not enough gold.' : 'All reels are full.', fn: () => {
        const k = s.i;
        openEditor({ mode: 'shop', closeAfter: true, place: { id: o.id, done: (c, pos) => { G.buySym(run, k, c, pos); sfx.buy(); B.sel = null; djinnMood('smirk', 1); }, cancel: () => {} } });
      } };
    } else if (s.k === 'charm' && sh.charms[s.i] && !sh.charms[s.i].sold) {
      const o = sh.charms[s.i]; it = { k: 'charm', id: o.id };
      act = { label: 'BUY', sub: `${o.price} gold`, col: '#3FA55A', dis: !G.canBuyCharm(run, s.i), why: run.gold < o.price ? 'Not enough gold.' : 'Charm slots are full. Sell one first.', fn: () => { G.buyCharm(run, s.i); save(); sfx.buy(); B.sel = null; burst(W / 2, iy, 16, { col: ['#FFD84A', '#FFFFFF'], speed: 80, life: 0.6 }); } };
    } else if (s.k === 'offer-relic' && sh.relic && !sh.relic.sold) {
      const o = sh.relic, symbol = o.kind === 'symbol'; it = { k: symbol ? 'sym' : 'charm', id: o.id };
      const done = () => { sfx.curse(); shake(5); flash(0.12); djinnSay('relic', 'grin'); B.sel = null; if (o.id === 'contract') toast('+20 gold. Tributes are 25% larger.', '#FFD84A'); };
      act = { label: o.price ? 'BUY' : 'SIGN', sub: o.price ? `${o.price} gold` : 'free', col: '#B0123C', dis: !G.canBuyRelic(run), why: run.gold < o.price ? 'Not enough gold.' : 'All reels are full.', fn: () => {
        if (symbol) openEditor({ mode: 'shop', closeAfter: true, place: { id: o.id, done: (c, pos) => { G.buyRelic(run, c, pos); done(); }, cancel: () => {} } });
        else { G.buyRelic(run); save(); done(); }
      } };
    } else if (s.k === 'own' && run.charms[s.i]) {
      const ch = run.charms[s.i]; it = { k: 'charm', id: ch.id, ch };
      act = { label: 'SELL', sub: `+${G.sellValue(ch.id)} gold`, col: '#B0123C', fn: () => { G.sellCharm(run, s.i); save(); sfx.sell(); B.sel = null; } };
    } else if (s.k === 'relic' && run.relics[s.i]) it = { k: 'charm', id: run.relics[s.i].id, ch: run.relics[s.i] };
    else if (s.k === 'decree') it = { k: 'decree', id: s.id };
  }
  if (it) {
    infoCard(ix + 3, iy + 3, iw - 6, it);
    if (act) {
      const aw = Math.min(90, iw - 12), ay = iy + ih - 30;
      if (ay > iy + 30) {
        if (act.dis && act.why) text(g, act.why, ix + 8, ay + 8, { col: '#FF7A8A' });
        if (button('sh-act', ix + iw - aw - 6, ay, aw, 26, act.label, { col: act.col, sub: act.sub, enabled: on, disabled: act.dis })) act.fn();
      }
    }
  } else {
    const ds = pxScale(2);
    g.save(); g.beginPath(); g.rect(ix + 2, iy + 2, iw - 4, ih - 5); g.clip();
    drawDjinn(ix + 30, iy + ih - 22 * ds + 16 * ds - 6, ds, { rows: 23 });
    g.restore();
    rich(g, 'Tap a ware to inspect it. A symbol you buy goes on the reel and spot [k]you[] choose. [x]Red wares are cursed.[]', ix + 62, iy + 8, iw - 70, { col: C.cream, lh: 9 });
    drawSpeech(ix + 56, iy + ih - 30, 1, iw - 64);
  }
}
scenes.shop = { enter: enterShop, draw: drawShop };

// =====================================================================
// Title
const TI = { confirm: 0 };
function startRun() {
  const m = S.meta;
  S.run = G.newRun(m.lamp, Math.min(m.wrath, m.wrathMax));
  save();
  go('play').then(() => { if (m.tut) { HELP.page = 0; S.modal = 'help'; } });
}
function logo(cx, y, sc) {
  const g = V.g;
  const word = (str, yy, col, out) => {
    const w = measure(str, sc);
    let x = cx - w / 2;
    [...str].forEach((ch, i) => {
      const dy = Math.sin(V.t * 2.4 + i * 0.6) * sc * 0.6;
      text(g, ch, x, yy + dy, { scale: sc, col, outline: out });
      x += measure(ch, sc) + sc;
    });
  };
  word('CHERRY', y, '#FF5A64', '#3A0612');
  word('DJINN', y + 9 * sc + 2, '#7FA8FF', '#0E1440');
  spr('cherry', cx + measure('CHERRY', sc) / 2 + 2 * sc, y - sc, pxScale(sc * 0.75), Math.sin(V.t * 2) * 0.15);
}
function drawTitle(on) {
  const g = V.g, W = V.W, H = V.H, m = S.meta;
  const land = !V.portrait;
  const lx = land ? W * 0.27 : W / 2;
  const sc = land ? 3 : 4;
  let y = top() + (land ? 10 : Math.max(8, (H - 400) * 0.3));
  logo(lx, y, sc);
  y += 18 * sc + 8;
  const lamp = LAMP[m.lamp], unlocked = !!m.unlocked[m.lamp];
  DJ.kind = lamp.djinn;
  const ds = pxScale(land ? 3 : Math.min(3, (H - 330) / 32 + 1.6));
  const djy = y + 16 * ds;
  glow(lx, djy, 70, 'rgba(127,168,255,0.45)', 0.7);
  drawDjinn(lx, djy, ds);
  spr('lamp', lx + 14 * ds * 0.4, djy + 17 * ds, pxScale(ds * 0.75));
  // controls column
  const cx = land ? W * 0.52 : 6, cw = land ? W * 0.46 : W - 12;
  let cy = land ? top() + 10 : bot() - 176;
  panel(cx, cy, cw, 62, { fill: '#241F4D' });
  if (button('lamp-l', cx + 4, cy + 4, 20, 20, '<', { col: '#5B4FA8', enabled: on })) cycleLamp(-1);
  if (button('lamp-r', cx + cw - 24, cy + 4, 20, 20, '>', { col: '#5B4FA8', enabled: on })) cycleLamp(1);
  text(g, lamp.name.toUpperCase(), cx + cw / 2, cy + 9, { align: 'c', col: unlocked ? C.yellow : C.dim, shadow: '#0B0920' });
  if (unlocked) rich(g, lamp.desc, cx + 8, cy + 28, cw - 16, { align: 'c', lh: 9 });
  else { spr('lock', cx + 16, cy + 42, pxScale(1)); rich(g, `[x]Locked.[] ${lamp.unlock}.`, cx + 30, cy + 33, cw - 38, { lh: 9 }); }
  cy += 66;
  if (m.wrathMax > 0) {
    panel(cx, cy, cw, 22, { fill: '#3A1030', hi: '#7A1838' });
    if (button('wr-l', cx + 3, cy + 2, 18, 17, '-', { col: '#7A1838', enabled: on, disabled: m.wrath <= 0 })) { m.wrath--; save(); }
    if (button('wr-r', cx + cw - 21, cy + 2, 18, 17, '+', { col: '#7A1838', enabled: on, disabled: m.wrath >= m.wrathMax })) { m.wrath++; save(); }
    text(g, `WRATH ${m.wrath}  (tributes +${m.wrath * 25}%)`, cx + cw / 2, cy + 7, { align: 'c', col: '#FF7A8A' });
    cy += 26;
  }
  if (T.now > TI.confirm) TI.armed = false;
  if (S.run) {
    if (button('t-cont', cx, cy, cw, 36, 'CONTINUE', { col: '#E08A1A', scale: 2, enabled: on && !S.switching })) go(sceneFor(S.run));
    cy += 40;
    if (button('t-new', cx, cy, cw, 26, TI.armed ? 'ABANDON RUN? TAP AGAIN' : 'NEW RUN', { col: TI.armed ? '#B0123C' : '#5B4FA8', enabled: on && !S.switching, disabled: !unlocked })) {
      if (TI.armed) startRun(); else { TI.armed = true; TI.confirm = T.now + 3; }
    }
    cy += 30;
  } else {
    if (button('t-play', cx, cy, cw, 40, 'PLAY', { col: '#E08A1A', scale: 2, enabled: on && !S.switching, disabled: !unlocked })) startRun();
    cy += 44;
  }
  const w3 = (cw - 10) / 3;
  if (button('t-sfx', cx, cy, w3, 22, m.sfx ? 'SFX ON' : 'SFX OFF', { col: m.sfx ? '#2F7BE8' : '#4A4570', enabled: on })) { m.sfx = !m.sfx; setSfx(m.sfx); save(); }
  if (button('t-mus', cx + w3 + 5, cy, w3, 22, m.music ? 'MUSIC ON' : 'MUSIC OFF', { col: m.music ? '#2F7BE8' : '#4A4570', enabled: on })) { m.music = !m.music; setMusic(m.music); save(); }
  if (button('t-help', cx + (w3 + 5) * 2, cy, w3, 22, 'HOW TO', { col: '#3FA55A', enabled: on })) { HELP.page = 0; S.modal = 'help'; }
  const stat = `WINS ${m.wins}   BEST SPIN ${fmt(m.bestSpin)}`;
  text(g, stat, land ? cx + cw / 2 : W / 2, land ? cy + 30 : bot() - 9, { align: 'c', col: '#B8B0E8', shadow: '#0B0920' });
}
function cycleLamp(d) {
  const i = LAMPS.findIndex((l) => l.id === S.meta.lamp);
  S.meta.lamp = LAMPS[(i + d + LAMPS.length) % LAMPS.length].id;
  djinnMood('grin', 0.8); save();
}
export function sceneFor(run) {
  return run.phase === 'shop' ? 'shop' : run.phase === 'won' ? 'won' : 'play';
}
scenes.title = { enter() { setMood('title'); A.mode = 'title'; A.intensity = 0.4; TI.armed = false; }, draw: drawTitle };

// =====================================================================
// End screens
function statsBlock(run, x, y, w) {
  const g = V.g;
  const rows = [
    ['Tributes paid', String(run.stats.tributes)],
    ['Best spin', fmt(run.stats.bestSpin)],
    ['Spins', String(run.stats.spins)],
    ['Symbols on reels', String(run.reels.flat().length)],
    ['Lamp', LAMP[run.lamp].name + (run.wrath ? `, Wrath ${run.wrath}` : '')],
  ];
  panel(x, y, w, rows.length * 13 + 10, { fill: '#1A1638' });
  rows.forEach((r, i) => { text(g, r[0], x + 8, y + 7 + i * 13, { col: C.dim }); text(g, r[1], x + w - 8, y + 7 + i * 13, { align: 'r', col: C.cream }); });
  return rows.length * 13 + 10;
}
function drawOver(on) {
  const g = V.g, W = V.W, run = S.over && S.over.run;
  if (!run) return;
  const w = Math.min(230, W - 12), x = (W - w) / 2;
  let y = top() + Math.max(6, (V.H - 360) / 3);
  text(g, 'INTO THE LAMP', W / 2, y + Math.sin(V.t * 2) * 2, { align: 'c', scale: 2, col: '#FF4A6A', outline: '#1A0410' });
  y += 24;
  const ds = pxScale(V.portrait ? 3 : 2);
  djinnMood('grin', 1);
  drawDjinn(W / 2, y + 16 * ds, ds);
  y += 32 * ds + 4;
  y += rich(g, `You fell at [k]${ROUND_NAMES[run.round % 3]}[] of Act ${G.actOf(run.round) + 1}, [x]${fmt(G.tributeFor(run) - run.roundScore)}[] short.`, x, y, w, { align: 'c' }) + 4;
  y += statsBlock(run, x, y, w) + 8;
  const byy = Math.min(bot() - 34, y);
  const bw = (w - 5) / 2;
  if (button('ov-title', x, byy, bw, 34, 'TITLE', { col: '#5B4FA8', enabled: on && !S.switching })) go('title');
  if (button('ov-again', x + bw + 5, byy, bw, 34, 'TRY AGAIN', { col: '#E08A1A', enabled: on && !S.switching })) startRun();
}
scenes.over = { enter() { setMood('over'); A.intensity = 0.15; }, draw: drawOver };

function drawWon(on) {
  const g = V.g, W = V.W, run = S.run;
  if (!run) return;
  const w = Math.min(230, W - 12), x = (W - w) / 2;
  let y = top() + Math.max(6, (V.H - 370) / 3);
  text(g, 'YOU ARE FREE!', W / 2, y + Math.sin(V.t * 3) * 2, { align: 'c', scale: 2, col: C.yellow, outline: '#5A2A08' });
  y += 24;
  if (Math.random() < 0.25) burst(Math.random() * W, -4, 1, { col: ['#FFD84A', '#FF8FB8', '#7FA8FF', '#3FBF5A'], speed: 30, dir: Math.PI / 2, spread: 1, g: 60, life: 3, size: 2.5 });
  const ds = pxScale(V.portrait ? 3 : 2);
  djinnMood('shock', 1);
  drawDjinn(W / 2, y + 16 * ds, ds);
  y += 32 * ds + 4;
  y += rich(g, 'The final tribute is paid. The djinn is yours to command... or you can keep spinning.', x, y, w, { align: 'c' }) + 4;
  y += statsBlock(run, x, y, w) + 8;
  const byy = Math.min(bot() - 34, y);
  const bw = (w - 5) / 2;
  if (button('wn-title', x, byy, bw, 34, 'FINISH', { col: '#5B4FA8', enabled: on && !S.switching })) { S.run = null; save(); go('title'); }
  if (button('wn-end', x + bw + 5, byy, bw, 34, 'ENDLESS', { col: '#B0123C', sub: 'keep going', enabled: on && !S.switching })) { G.continueEndless(run); save(); go('shop'); }
}
scenes.won = {
  enter() {
    const run = S.run, m = S.meta;
    setMood('win'); A.intensity = 0.9;
    if (!run.counted) {
      run.counted = true; m.wins++; m.runs++;
      if (m.wrathMax < run.wrath + 1) { m.wrathMax = run.wrath + 1; toast(`UNLOCKED: Wrath ${m.wrathMax}`, '#FF7A8A'); }
      checkUnlocks(); save();
    }
    sfx.fanfare(); djinnSay('final', 'shock'); flash(0.3);
  },
  draw: drawWon,
};

// =====================================================================
// Menu + help
modals.menu = () => {
  const g = V.g, W = V.W, m = S.meta;
  dimScreen(0.7);
  const w = Math.min(180, W - 20), h = 176, x = (W - w) / 2, y = (V.H - h) / 2;
  panel(x, y, w, h, { fill: '#1A1638', hi: '#F2A93B' });
  text(g, 'PAUSED', W / 2, y + 8, { align: 'c', scale: 2, col: C.yellow, outline: '#0B0920' });
  let by = y + 32;
  const row = (id, label, col, fn, o = {}) => { if (button(id, x + 8, by, w - 16, 22, label, { col, ...o })) fn(); by += 26; };
  row('m-res', 'RESUME', '#E08A1A', () => { S.modal = null; });
  row('m-help', 'HOW TO PLAY', '#3FA55A', () => { HELP.page = 0; S.modal = 'help'; });
  const hw = (w - 21) / 2;
  if (button('m-sfx', x + 8, by, hw, 22, m.sfx ? 'SFX ON' : 'SFX OFF', { col: m.sfx ? '#2F7BE8' : '#4A4570' })) { m.sfx = !m.sfx; setSfx(m.sfx); save(); }
  if (button('m-mus', x + 13 + hw, by, hw, 22, m.music ? 'MUSIC ON' : 'MUSIC OFF', { col: m.music ? '#2F7BE8' : '#4A4570' })) { m.music = !m.music; setMusic(m.music); save(); }
  by += 26;
  row('m-crt', V.post ? 'CRT GLOW ON' : 'CRT GLOW OFF', V.post ? '#2F7BE8' : '#4A4570', () => { setPost(!V.post); }, { disabled: !hasGL() });
  row('m-quit', 'SAVE + QUIT TO TITLE', '#5B4FA8', () => { save(); go('title'); });
};

const HELP = { page: 0 };
const PAGES = [
  ['THE DEAL', 'A djinn has bound you to its slot machine. Pay each [g]tribute[] before your Spins run out, or be pulled into the lamp. Nine tributes win your freedom.'],
  ['SCORING', 'Every symbol on the board pays [c]coins[]. Lines and charms add [m]Mult[]. A spin scores [c]coins[] x [m]Mult[]. Symbols [k]touch[] the 8 cells around them.'],
  ['LINES', '3 or more of the same [k]family[] side by side in a row: [m]+1, +2 or +4 Mult[]. 3 or more [k]identical[] symbols: [m]x2, x3 or x5 Mult[]. Tap any symbol to read it.'],
  ['WISHES', 'After the reels land you may spend a Wish: [k]HOLD[] the reels you like and [k]RESPIN[] the rest, or [k]NUDGE[] one reel a single step with the arrows. Then [k]CASH IN[].'],
  ['RIG THE MACHINE', 'At the Bazaar, buy symbols and choose the reel and the exact spot. Each reel is a loop showing 3 in a row, so neighbours you stack will land together. [k]Banish[] symbols to make reels short and reliable.'],
  ['PICK A BUILD', 'The starting reels will not carry you past Act 1. Most [m]Mult[] only switches on when you commit: enough of one family on the board, long lines, short reels. Read the charms and build toward one.'],
  ['CURSED RELICS', 'Now and then the Bazaar sells a [x]cursed relic[] cheaply: very strong, with a catch, and it can never be sold. They need no charm slot.'],
];
modals.help = () => {
  const g = V.g, W = V.W;
  dimScreen(0.75);
  const w = Math.min(230, W - 14), [title, body] = PAGES[HELP.page];
  const h = Math.max(120, richHeight(body, w - 20) + 78), x = (W - w) / 2, y = (V.H - h) / 2;
  panel(x, y, w, h, { fill: '#1A1638', hi: '#3FA55A' });
  text(g, title, W / 2, y + 9, { align: 'c', scale: 2, col: C.yellow, outline: '#0B0920' });
  rich(g, body, x + 10, y + 34, w - 20);
  text(g, `${HELP.page + 1} / ${PAGES.length}`, W / 2, y + h - 40, { align: 'c', col: C.dim });
  const last = HELP.page === PAGES.length - 1;
  const bw = (w - 21) / 2;
  if (button('h-back', x + 8, y + h - 30, bw, 22, HELP.page ? 'BACK' : 'CLOSE', { col: '#5B4FA8' })) { if (HELP.page) HELP.page--; else closeHelp(); }
  if (button('h-next', x + 13 + bw, y + h - 30, bw, 22, last ? 'GOT IT' : 'NEXT', { col: '#E08A1A' })) { if (last) closeHelp(); else HELP.page++; }
};
function closeHelp() { S.modal = null; if (S.meta.tut && S.scene === 'play') { /* keep hints on for the first run */ } }
