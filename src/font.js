// 5x7 bitmap font (classic column-encoded glyph table), drawn proportionally.
const HEX =
  '0000000000' + '00005F0000' + '0007000700' + '147F147F14' + '242A7F2A12' + '2313086462' + '3649562050' + '0008070300' +
  '001C224100' + '0041221C00' + '2A1C7F1C2A' + '08083E0808' + '0080703000' + '0808080808' + '0000606000' + '2010080402' +
  '3E5149453E' + '00427F4000' + '7249494946' + '2141494D33' + '1814127F10' + '2745454539' + '3C4A494931' + '4121110907' +
  '3649494936' + '464949291E' + '0000140000' + '0040340000' + '0008142241' + '1414141414' + '0041221408' + '0201590906' +
  '3E415D594E' + '7C1211127C' + '7F49494936' + '3E41414122' + '7F4141413E' + '7F49494941' + '7F09090901' + '3E41415173' +
  '7F0808087F' + '00417F4100' + '2040413F01' + '7F08142241' + '7F40404040' + '7F021C027F' + '7F0408107F' + '3E4141413E' +
  '7F09090906' + '3E4151215E' + '7F09192946' + '2649494932' + '03017F0103' + '3F4040403F' + '1F2040201F' + '3F4038403F' +
  '6314081463' + '0304780403' + '6159494D43' + '007F414141' + '0204081020' + '004141417F' + '0402010204' + '4040404040' +
  '0003070800' + '2054547840' + '7F28444438' + '3844444428' + '384444287F' + '3854545418' + '00087E0902' + '18A4A49C78' +
  '7F08040478' + '00447D4000' + '2040403D00' + '7F10284400' + '00417F4000' + '7C04780478' + '7C08040478' + '3844444438' +
  'FC18242418' + '18242418FC' + '7C08040408' + '4854545424' + '04043F4424' + '3C4040207C' + '1C2040201C' + '3C4030403C' +
  '4428102844' + '4C9090907C' + '4464544C44' + '0008364100' + '0000770000' + '0041360800' + '0201020402';

export const GH = 8; // glyph cell height
const glyphs = {}; // ch -> {x, w} in atlas
let atlas = null;
const tinted = new Map();

function build() {
  atlas = document.createElement('canvas');
  atlas.width = 95 * 6; atlas.height = GH;
  const g = atlas.getContext('2d');
  g.fillStyle = '#fff';
  for (let n = 0; n < 95; n++) {
    const cols = [];
    for (let k = 0; k < 5; k++) cols.push(parseInt(HEX.substr(n * 10 + k * 2, 2), 16));
    let a = 0, b = 4;
    while (a < 5 && !cols[a]) a++;
    while (b >= 0 && !cols[b]) b--;
    const ch = String.fromCharCode(32 + n);
    if (a > b) { glyphs[ch] = { x: n * 6, w: 3 }; continue; }
    for (let k = a; k <= b; k++) for (let y = 0; y < 8; y++) if (cols[k] & (1 << y)) g.fillRect(n * 6 + (k - a), y, 1, 1);
    glyphs[ch] = { x: n * 6, w: b - a + 1 };
  }
}
function atlasFor(col) {
  if (!atlas) build();
  let c = tinted.get(col);
  if (!c) {
    c = document.createElement('canvas'); c.width = atlas.width; c.height = atlas.height;
    const g = c.getContext('2d');
    g.drawImage(atlas, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    tinted.set(col, c);
  }
  return c;
}

export function measure(str, scale = 1) {
  if (!atlas) build();
  let w = 0;
  for (const ch of String(str)) w += (glyphs[ch] || glyphs['?']).w + 1;
  return Math.max(0, w - 1) * scale;
}

function raw(g, str, x, y, col, scale) {
  const a = atlasFor(col);
  for (const ch of str) {
    const gl = glyphs[ch] || glyphs['?'];
    if (ch !== ' ') g.drawImage(a, gl.x, 0, gl.w, GH, x, y, gl.w * scale, GH * scale);
    x += (gl.w + 1) * scale;
  }
}

// opts: col, scale, align ('l'|'c'|'r'), outline (colour), shadow (colour)
export function text(g, str, x, y, o = {}) {
  str = String(str);
  const scale = o.scale || 1, col = o.col || '#FFF4E0';
  const w = measure(str, scale);
  if (o.align === 'c') x -= w / 2; else if (o.align === 'r') x -= w;
  if (o.outline) {
    const ow = scale > 1 ? scale * 0.5 : 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [-1, 2], [1, 2]])
      raw(g, str, x + dx * ow, y + dy * ow, o.outline, scale);
  } else if (o.shadow) raw(g, str, x, y + scale, o.shadow, scale);
  raw(g, str, x, y, col, scale);
  return w;
}

export const MARK = { c: '#6FB6FF', m: '#FF5A64', g: '#FFD84A', k: '#FFB86B', x: '#FF7A8A', v: '#C79BFF', n: null };

// Rich text: "[c]+2[] per touching [k]Cherry[]" -> wrapped lines of coloured runs.
export function layout(str, maxW, scale = 1) {
  const words = [];
  let col = null;
  const re = /\[([a-z]?)\]|(\s+)|([^\s\[]+)/g;
  let m, glue = false;
  while ((m = re.exec(str))) {
    if (m[1] !== undefined && m[0][0] === '[') { col = m[1] ? MARK[m[1]] : null; continue; }
    if (m[2]) { glue = false; if (m[2].includes('\n')) words.push({ nl: true }); continue; }
    words.push({ t: m[3], col, glue });
    glue = true;
  }
  const lines = [[]];
  let x = 0;
  const sp = 4 * scale;
  for (const w of words) {
    if (w.nl) { lines.push([]); x = 0; continue; }
    const ww = measure(w.t, scale);
    const gap = w.glue ? scale : sp;
    if (x > 0 && !w.glue && x + gap + ww > maxW) { lines.push([]); x = 0; }
    const line = lines[lines.length - 1];
    if (x > 0) x += gap;
    line.push({ t: w.t, col: w.col, x });
    x += ww;
    line.w = x;
  }
  return lines;
}
export function rich(g, str, x, y, maxW, o = {}) {
  const scale = o.scale || 1, lh = (o.lh || 10) * scale;
  const lines = layout(str, maxW, scale);
  lines.forEach((line, k) => {
    const ox = o.align === 'c' ? (maxW - (line.w || 0)) / 2 : 0;
    for (const r of line) text(g, r.t, x + ox + r.x, y + k * lh, { col: r.col || o.col || '#FFF4E0', scale, shadow: o.shadow });
  });
  return lines.length * lh;
}
export const richHeight = (str, maxW, o = {}) => layout(str, maxW, o.scale || 1).length * (o.lh || 10) * (o.scale || 1);
