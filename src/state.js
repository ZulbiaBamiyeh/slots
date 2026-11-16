// Shared app state: current run, meta progression, saving, scene switching, toasts.
import { tween, clearFx, T } from './fx.js';
import { LAMPS } from './data.js';
import { setSfx, setMusic } from './audio.js';

const KEY = 'cherry-djinn-v1';
export const S = {
  run: null,
  meta: { wins: 0, runs: 0, bestSpin: 0, bestRound: 0, unlocked: { azure: true }, wrathMax: 0, lamp: 'azure', wrath: 0, tut: true, sfx: true, music: true },
  scene: 'title', alpha: 1, switching: false, modal: null,
  toasts: [],
};
export const scenes = {}; // name -> { enter?, draw(interactive) }
export const modals = {}; // name -> draw()

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) {
      Object.assign(S.meta, d.meta || {});
      if (d.run && d.run.v === 2) S.run = d.run;
    }
  } catch (e) { /* storage unavailable: play without saving */ }
  S.meta.unlocked.azure = true;
  setSfx(S.meta.sfx); setMusic(S.meta.music);
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ meta: S.meta, run: S.run })); } catch (e) { /* ignore */ }
}

export async function go(name, setup) {
  if (S.switching) return;
  S.switching = true; S.modal = null;
  await tween(S, { alpha: 0 }, 0.14);
  clearFx();
  if (setup) setup();
  S.scene = name;
  if (scenes[name].enter) scenes[name].enter();
  await tween(S, { alpha: 1 }, 0.2);
  S.switching = false;
}

export function toast(str, col = '#FFD84A') { S.toasts.push({ str, col, t0: T.now }); }

// Unlock lamps as milestones are reached. Returns nothing; raises toasts.
export function checkUnlocks() {
  const run = S.run; if (!run) return;
  const m = S.meta;
  const give = (id) => { if (!m.unlocked[id]) { m.unlocked[id] = true; toast('UNLOCKED: ' + LAMPS.find((l) => l.id === id).name); } };
  if (run.stats.tributes >= 3) give('rose');
  if (run.stats.tributes >= 6) give('gilded');
  if (run.phase === 'won') give('ember');
  m.bestSpin = Math.max(m.bestSpin, run.stats.bestSpin);
  m.bestRound = Math.max(m.bestRound, run.stats.tributes);
}
