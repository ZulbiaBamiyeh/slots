// All sound is synthesised with WebAudio. No assets.
let ac = null, master, sfxBus, musBus, wet, musFilter;
export const A = { sfx: true, music: true, intensity: 0.3, mode: 'play' };

const SCALE = [0, 1, 4, 5, 7, 8, 10]; // D phrygian dominant (hijaz)
const ROOT = 146.83;
const note = (deg, oct = 0) => ROOT * Math.pow(2, oct + (SCALE[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7)) / 12);

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createDynamicsCompressor();
  master.threshold.value = -14; master.ratio.value = 6; master.attack.value = 0.003; master.release.value = 0.2;
  const out = ac.createGain(); out.gain.value = 0.9;
  master.connect(out); out.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = A.sfx ? 0.8 : 0;
  musBus = ac.createGain(); musBus.gain.value = A.music ? 0.5 : 0;
  musFilter = ac.createBiquadFilter(); musFilter.type = 'lowpass'; musFilter.frequency.value = 900; musFilter.Q.value = 0.7;
  musBus.connect(musFilter); musFilter.connect(master);
  sfxBus.connect(master);
  // small feedback-delay "room"
  wet = ac.createGain(); wet.gain.value = 0.22;
  const d1 = ac.createDelay(1), d2 = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
  d1.delayTime.value = 0.137; d2.delayTime.value = 0.211; fb.gain.value = 0.36; lp.type = 'lowpass'; lp.frequency.value = 2400;
  wet.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1); d1.connect(master); d2.connect(master);
  setInterval(tickMusic, 40);
}
export function setSfx(on) { A.sfx = on; if (sfxBus) sfxBus.gain.value = on ? 0.8 : 0; }
export function setMusic(on) { A.music = on; if (musBus) musBus.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.1); }
export function pauseAudio(p) { if (ac) p ? ac.suspend() : ac.resume(); }

function tone(f, dur, o = {}) {
  if (!ac) return;
  const t = ac.currentTime + (o.t || 0);
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + dur);
  const v = o.vol ?? 0.2, a = o.a ?? 0.003;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.bus || sfxBus);
  if (o.wet) { const w = ac.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(wet); }
  osc.start(t); osc.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, o = {}) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + (o.t || 0);
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q ?? 1;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  const g = ac.createGain(); const v = o.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
  if (o.wet) { const w = ac.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(wet); }
  src.start(t, Math.random()); src.stop(t + dur + 0.02);
}

let whirr = null;
export const sfx = {
  click() { tone(520, 0.05, { type: 'square', vol: 0.12 }); tone(260, 0.06, { type: 'triangle', vol: 0.2 }); },
  select() { tone(660, 0.06, { type: 'triangle', vol: 0.2 }); tone(990, 0.08, { type: 'triangle', vol: 0.12, t: 0.03 }); },
  error() { tone(120, 0.12, { type: 'sawtooth', vol: 0.16 }); tone(95, 0.16, { type: 'sawtooth', vol: 0.16, t: 0.09 }); },
  spinStart() {
    noise(0.25, { f: 400, f2: 2400, vol: 0.22, q: 0.8 });
    tone(110, 0.25, { type: 'sawtooth', f2: 300, vol: 0.12 });
    if (!ac || whirr) return;
    const src = ac.createBufferSource(); noise(0.01, { vol: 0.0001 }); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5;
    const g = ac.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.11, ac.currentTime + 0.15);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.type = 'square'; lfo.frequency.value = 26; lg.gain.value = 0.07;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(); lfo.start();
    whirr = { src, g, lfo, f };
  },
  spinPitch(k) { if (whirr) { whirr.f.frequency.setTargetAtTime(1500 - k * 180, ac.currentTime, 0.05); whirr.lfo.frequency.setTargetAtTime(26 - k * 3, ac.currentTime, 0.05); } },
  spinStop() {
    if (!whirr) return;
    const w = whirr; whirr = null;
    w.g.gain.cancelScheduledValues(ac.currentTime); w.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.03);
    setTimeout(() => { try { w.src.stop(); w.lfo.stop(); } catch (e) { /* ignore */ } }, 200);
  },
  thunk(c = 0) {
    tone(170 + c * 14, 0.16, { type: 'sine', f2: 55, vol: 0.5 });
    noise(0.07, { f: 2200, vol: 0.2, q: 0.6 });
    tone(880 + c * 110, 0.08, { type: 'triangle', vol: 0.1, wet: 0.5 });
  },
  tension() { for (let i = 0; i < 10; i++) tone(300 + i * 40, 0.07, { type: 'triangle', vol: 0.1 + i * 0.008, t: i * 0.085 }); },
  hold(on) { tone(on ? 420 : 300, 0.05, { type: 'square', vol: 0.14 }); tone(on ? 840 : 220, 0.08, { type: 'triangle', vol: 0.16, t: 0.04 }); },
  nudge() { tone(300, 0.09, { type: 'square', f2: 520, vol: 0.14 }); noise(0.05, { f: 3000, vol: 0.12 }); },
  wish() { [7, 9, 11, 14, 16].forEach((d, i) => tone(note(d, 1), 0.3, { type: 'sine', vol: 0.12, t: i * 0.05, wet: 0.8 })); noise(0.5, { f: 6000, f2: 9000, vol: 0.05, q: 3 }); },
  // coin tick: pitch climbs with the step index
  coin(i = 0) {
    const f = note(Math.min(i, 24), 1);
    tone(f, 0.11, { type: 'triangle', vol: 0.26, wet: 0.25 });
    tone(f * 2, 0.05, { type: 'square', vol: 0.05 });
  },
  neg() { tone(200, 0.16, { type: 'sawtooth', f2: 90, vol: 0.18 }); },
  mult(i = 0) {
    const f = note(Math.min(i, 24), 0);
    tone(f, 0.16, { type: 'sawtooth', vol: 0.14, wet: 0.3 });
    tone(f * 1.5, 0.16, { type: 'square', vol: 0.07 });
    noise(0.05, { f: 5000, vol: 0.08 });
  },
  xmult(i = 0) {
    const f = note(Math.min(i, 21), 0);
    for (const m of [1, 1.5, 2, 3]) tone(f * m, 0.34, { type: 'sawtooth', vol: 0.1, wet: 0.5 });
    tone(70, 0.3, { type: 'sine', f2: 35, vol: 0.5 });
    noise(0.22, { f: 800, f2: 5000, vol: 0.18, q: 0.5 });
  },
  line(len = 3) { for (let i = 0; i < len + 1; i++) tone(note(7 + i * 2, 1), 0.18, { type: 'square', vol: 0.1, t: i * 0.045, wet: 0.6 }); },
  grow() { tone(500, 0.12, { type: 'sine', f2: 900, vol: 0.14, wet: 0.4 }); },
  gold() { tone(1568, 0.07, { type: 'square', vol: 0.09 }); tone(2093, 0.16, { type: 'square', vol: 0.09, t: 0.06, wet: 0.5 }); },
  eat() { noise(0.07, { f: 900, vol: 0.25, q: 1.5 }); noise(0.07, { f: 700, vol: 0.25, q: 1.5, t: 0.09 }); },
  crack() { noise(0.12, { f: 1800, vol: 0.3, q: 0.7 }); tone(220, 0.1, { type: 'square', f2: 110, vol: 0.14 }); },
  curse() { tone(98, 0.5, { type: 'sawtooth', vol: 0.14, wet: 0.6 }); tone(98 * 1.414, 0.5, { type: 'sawtooth', vol: 0.12, wet: 0.6 }); noise(0.4, { f: 300, vol: 0.12 }); },
  slam(power = 0.5) {
    tone(90, 0.5, { type: 'sine', f2: 30, vol: 0.5 + power * 0.3 });
    noise(0.35 + power * 0.3, { f: 300 + power * 800, vol: 0.2 + power * 0.2, q: 0.4, type: 'lowpass' });
    [0, 2, 4, 7].forEach((d, i) => tone(note(d, 1), 0.5 + power * 0.4, { type: 'sawtooth', vol: 0.07 + power * 0.04, t: i * 0.012, wet: 0.7 }));
  },
  roll(i) { tone(600 + (i % 12) * 60, 0.03, { type: 'square', vol: 0.05 }); },
  fire() { noise(0.9, { f: 500, f2: 3000, vol: 0.22, q: 0.4, wet: 0.4 }); },
  buy() { tone(1318, 0.08, { type: 'square', vol: 0.1 }); tone(1760, 0.2, { type: 'square', vol: 0.1, t: 0.07, wet: 0.6 }); noise(0.05, { f: 6000, vol: 0.1 }); },
  sell() { tone(880, 0.08, { type: 'square', vol: 0.1 }); tone(660, 0.14, { type: 'square', vol: 0.1, t: 0.07 }); },
  place() { tone(180, 0.1, { type: 'sine', f2: 90, vol: 0.4 }); noise(0.05, { f: 2500, vol: 0.14 }); },
  banish() { noise(0.4, { f: 4000, f2: 300, vol: 0.2, q: 1.2, wet: 0.5 }); tone(600, 0.35, { type: 'sine', f2: 80, vol: 0.14 }); },
  whoosh() { noise(0.3, { f: 300, f2: 3000, vol: 0.14, q: 0.8 }); },
  win() { [0, 2, 4, 7, 9, 11, 14].forEach((d, i) => tone(note(d, 1), 0.4, { type: 'square', vol: 0.1, t: i * 0.07, wet: 0.7 })); tone(note(0, -1), 0.9, { type: 'sawtooth', vol: 0.14, t: 0.1 }); },
  lose() { [7, 5, 4, 1, 0].forEach((d, i) => tone(note(d, 0), 0.5, { type: 'sawtooth', vol: 0.13, t: i * 0.19, wet: 0.7 })); tone(55, 1.6, { type: 'sine', vol: 0.4, t: 0.9, f2: 30 }); },
  fanfare() { [[0, 4, 7], [2, 5, 9], [4, 7, 11], [7, 11, 14]].forEach((ch, i) => ch.forEach((d) => tone(note(d, 1), 0.5, { type: 'square', vol: 0.07, t: i * 0.2, wet: 0.7 }))); },
  djinn() { tone(180, 0.09, { type: 'sawtooth', f2: 140, vol: 0.09 }); tone(150, 0.1, { type: 'sawtooth', f2: 190, vol: 0.09, t: 0.08 }); },
};

// ---------- generative music
let step = 0, nextT = 0, mel = 7;
const PROG = [0, 0, 3, 0, 5, 3, 1, 0];
function tickMusic() {
  if (!ac || ac.state !== 'running') return;
  if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
  const spb = 60 / (A.mode === 'shop' ? 84 : 96) / 4;
  musFilter.frequency.setTargetAtTime(500 + A.intensity * 4200, ac.currentTime, 0.4);
  while (nextT < ac.currentTime + 0.14) { playStep(step++, nextT - ac.currentTime, spb); nextT += spb; }
}
function playStep(s, t, spb) {
  const bar = Math.floor(s / 16), k = s % 16;
  const root = PROG[bar % PROG.length];
  const M = { bus: musBus };
  const I = A.intensity;
  // bass
  if (k === 0 || k === 6 || k === 10 || (k === 14 && bar % 2)) tone(note(root, -1), spb * 3.2, { ...M, type: 'triangle', vol: 0.34, t, a: 0.01 });
  // pad
  if (k === 0) for (const d of [0, 2, 4]) {
    tone(note(root + d, 0) * 1.003, spb * 15, { ...M, type: 'sawtooth', vol: 0.035, t, a: 0.4, wet: 0.4 });
    tone(note(root + d, 0) * 0.997, spb * 15, { ...M, type: 'sawtooth', vol: 0.035, t, a: 0.4 });
  }
  // percussion (dum / tek)
  if (A.mode !== 'title') {
    if (k === 0 || k === 7 || (I > 0.5 && k === 10)) tone(110, 0.14, { ...M, type: 'sine', f2: 45, vol: 0.4, t });
    if (k === 3 || k === 12 || (I > 0.4 && k === 14)) noise(0.05, { ...M, f: 2600, vol: 0.12, q: 1.2, t });
    if (I > 0.6 && k % 2 === 1) noise(0.02, { ...M, f: 7000, vol: 0.05, q: 2, t });
  }
  // wandering lead
  const p = A.mode === 'shop' ? 0.2 : 0.3 + I * 0.25;
  if (k % 2 === 0 && Math.random() < p) {
    mel += [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
    if (mel < 5) mel += 3; if (mel > 16) mel -= 4;
    if (k === 0) mel = root + 7 + [0, 2, 4][Math.floor(Math.random() * 3)];
    tone(note(mel, 0), spb * (Math.random() < 0.3 ? 4 : 2), { ...M, type: 'triangle', vol: 0.11, t, a: 0.008, wet: 0.9 });
  }
}
