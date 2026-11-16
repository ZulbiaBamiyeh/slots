// Cherry Djinn — boot + main loop.
import { V, initGfx, beginFrame, endFrame, lowerQuality, rrect } from './gfx.js';
import { updateFx, drawParts, drawFloats, T, ease } from './fx.js';
import { initInput, endInput, I } from './ui.js';
import { text, measure } from './font.js';
import { pauseAudio } from './audio.js';
import { S, scenes, modals, load, save } from './state.js';
import { P } from './play.js';
import './screens.js';

const root = document.getElementById('game');
initGfx(root);
initInput(root);
load();
scenes.title.enter();

function drawToasts() {
  const g = V.g;
  S.toasts = S.toasts.filter((t) => T.now - t.t0 < 3.2);
  S.toasts.forEach((t, i) => {
    const age = T.now - t.t0;
    const k = age < 0.25 ? ease.back(age / 0.25) : age > 2.9 ? (3.2 - age) / 0.3 : 1;
    const w = Math.min(V.W - 12, measure(t.str) + 16), x = (V.W - w) / 2, y = V.safeT + 6 + i * 18 - (1 - k) * 20;
    g.globalAlpha = Math.max(0, Math.min(1, k));
    rrect(x, y, w, 15, '#0B0920'); rrect(x + 1, y + 1, w - 2, 13, '#2E2760');
    text(g, t.str.length * 6 > w ? t.str.slice(0, Math.floor(w / 5.6)) : t.str, V.W / 2, y + 4, { align: 'c', col: t.col });
    g.globalAlpha = 1;
  });
}

let last = performance.now(), slow = 0, frames = 0, acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.016; // tab was hidden
  // adaptive quality: drop the CRT pass, then resolution, if the device struggles
  acc += dt; frames++;
  if (frames >= 50) { if (acc / frames > 0.027) { if (++slow >= 2) { lowerQuality(); slow = 0; } } else slow = 0; acc = 0; frames = 0; }
  tick(Math.min(dt, 0.05), true);
}
function tick(dt, gl) {
  updateFx(dt);
  beginFrame();
  const g = V.g;
  const sc = scenes[S.scene];
  g.save();
  g.globalAlpha = S.alpha;
  if (S.alpha < 1) { g.translate(V.W / 2, V.H / 2); const k = 0.96 + 0.04 * S.alpha; g.scale(k, k); g.translate(-V.W / 2, -V.H / 2); }
  sc.draw(!S.switching && !S.modal);
  drawParts(); drawFloats();
  if (S.modal && modals[S.modal]) modals[S.modal]();
  g.restore();
  drawToasts();
  endInput();
  if (gl) endFrame(dt);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { pauseAudio(document.hidden); if (document.hidden) save(); });
// debug / test hook: advance the game quickly without waiting for real frames
window.__cd = { S, V, I, T, P, async run(sec) { for (let t = 0; t < sec; t += 1 / 60) { tick(1 / 60, false); await null; await null; } } }; // handy for debugging
