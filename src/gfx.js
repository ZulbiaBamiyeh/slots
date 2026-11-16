// Rendering surface: a 2D canvas (virtual units, crisp pixels) composited through a WebGL
// pass that draws the swirling background and the CRT finish.
import { sprite } from './sprites.js';

export const V = {
  W: 240, H: 420, ps: 3, portrait: true, g: null, post: true,
  safeT: 0, safeB: 0,
  shakeX: 0, shakeY: 0, flash: 0, ab: 0, heat: 0, t: 0,
  mood: [[0.16, 0.10, 0.36], [0.46, 0.17, 0.55], [0.11, 0.48, 0.66]],
  moodT: [[0.16, 0.10, 0.36], [0.46, 0.17, 0.55], [0.11, 0.48, 0.66]],
};
export const MOODS = {
  title: [[0.20, 0.09, 0.38], [0.62, 0.20, 0.52], [0.13, 0.42, 0.72]],
  play: [[0.13, 0.10, 0.36], [0.40, 0.17, 0.58], [0.10, 0.46, 0.66]],
  boss: [[0.22, 0.05, 0.13], [0.66, 0.08, 0.24], [0.90, 0.52, 0.16]],
  shop: [[0.05, 0.20, 0.24], [0.10, 0.44, 0.42], [0.72, 0.52, 0.20]],
  bargain: [[0.14, 0.03, 0.12], [0.50, 0.05, 0.22], [0.42, 0.14, 0.62]],
  win: [[0.36, 0.20, 0.06], [0.86, 0.56, 0.14], [0.98, 0.84, 0.36]],
  over: [[0.05, 0.05, 0.10], [0.16, 0.13, 0.28], [0.30, 0.10, 0.20]],
};
export function setMood(name) { V.moodT = MOODS[name] || MOODS.play; }

let cv2, cvgl, gl, prog, tex, uni = {}, forcePost = null, curve = 0.045;

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FS = `
precision mediump float;
uniform vec2 uRes; uniform float uT, uPix, uPost, uFlash, uAb, uCurve, uHeat;
uniform vec2 uShake; uniform vec3 uC1, uC2, uC3; uniform sampler2D uTex;
vec3 bg(vec2 frag){
  vec2 p = (floor(frag/uPix)+0.5)*uPix;
  vec2 uv = (p - 0.5*uRes)/min(uRes.x,uRes.y);
  float l = length(uv);
  float a = atan(uv.y, uv.x) + 2.4*l - uT*0.07 - uHeat*0.6;
  vec2 q = vec2(cos(a), sin(a))*l*5.0;
  for(int i=0;i<4;i++){
    float f = float(i);
    q += vec2(sin(q.y*1.25 + uT*0.23 + f*1.7), cos(q.x*1.15 - uT*0.19 + f*2.3))*0.85;
  }
  float v = 0.5+0.5*sin(q.x*0.8+q.y*0.9);
  float w = 0.5+0.5*sin(q.x*0.45 - q.y*0.6 + 1.7 + uT*0.1);
  v = floor(v*5.0+0.5)/5.0; w = floor(w*4.0+0.5)/4.0;
  vec3 col = mix(uC1, uC2, smoothstep(0.2,0.8,v));
  col = mix(col, uC3, smoothstep(0.55,1.0,w)*0.75);
  col *= 0.82 + 0.18*sin(q.x*1.7+q.y*1.3);
  return col * (1.0 - 0.55*l*l) * (1.0 + uHeat*0.35);
}
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 cc = uv - 0.5; float r2 = dot(cc,cc);
  vec2 d = uv + cc*r2*uCurve;
  vec3 col = bg(d*uRes);
  if(uPost > 0.5){
    vec2 t = vec2(d.x, 1.0-d.y) + uShake;
    float ab = uAb*(0.35 + r2*2.5);
    vec4 sR = texture2D(uTex, t + vec2(ab,0.));
    vec4 sG = texture2D(uTex, t);
    vec4 sB = texture2D(uTex, t - vec2(ab,0.));
    col = vec3(col.r*(1.-sR.a)+sR.r, col.g*(1.-sG.a)+sG.g, col.b*(1.-sB.a)+sB.b);
    vec3 bl = vec3(0.);
    vec2 px = uPix/uRes;
    for(int i=0;i<8;i++){
      float an = float(i)*0.785398;
      vec2 o = vec2(cos(an), sin(an))*px*(mod(float(i),2.)<0.5 ? 1.6 : 3.4);
      bl += max(texture2D(uTex, t+o).rgb - 0.62, 0.);
    }
    col += bl*0.16;
    float sl = mod(gl_FragCoord.y, uPix)/uPix;
    col *= 0.93 + 0.07*smoothstep(0.0,0.5,sl);
    col *= 1.0 - r2*0.55;
    if(d.x<0.||d.x>1.||d.y<0.||d.y>1.) col = vec3(0.);
  }
  col += uFlash;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function initGfx(root) {
  const q = new URLSearchParams(location.search);
  if (q.has('fx')) forcePost = q.get('fx') !== '0';
  cvgl = document.createElement('canvas');
  cv2 = document.createElement('canvas');
  for (const c of [cvgl, cv2]) { c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;'; root.appendChild(c); }
  cv2.style.imageRendering = 'pixelated';
  V.g = cv2.getContext('2d');
  try {
    gl = cvgl.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl');
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uRes', 'uT', 'uPix', 'uPost', 'uFlash', 'uAb', 'uCurve', 'uHeat', 'uShake', 'uC1', 'uC2', 'uC3', 'uTex']) uni[n] = gl.getUniformLocation(prog, n);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  } catch (e) {
    console.warn('WebGL unavailable, using flat background', e);
    gl = null; cvgl.style.background = 'radial-gradient(circle at 50% 40%, #6a2a8a, #1b1440 70%)';
  }
  setPost(forcePost ?? !!gl);
  resize();
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
}

export function setPost(on) {
  V.post = on && !!gl;
  cv2.style.visibility = V.post ? 'hidden' : 'visible';
}
export const hasGL = () => !!gl;

let psCap = 99;
export function lowerQuality() {
  if (forcePost !== null) return false;
  if (V.post) { setPost(false); return true; }
  if (V.ps > 2) { psCap = V.ps - 1; resize(); return true; }
  return false;
}

export function resize() {
  const cw = Math.max(200, innerWidth), ch = Math.max(200, innerHeight);
  const dpr = Math.min(devicePixelRatio || 1, 2.5);
  V.portrait = ch > cw * 1.05;
  const [mw, mh] = V.portrait ? [232, 412] : [472, 266];
  const u = Math.min(cw / mw, ch / mh);
  let ps = Math.max(1, Math.round(u * dpr));
  ps = Math.min(ps, psCap);
  while (ps > 1 && (cw / u) * ps * (ch / u) * ps > 3.4e6) ps--;
  V.ps = ps;
  V.W = cw / u; V.H = ch / u;
  const bw = Math.round(V.W * ps), bh = Math.round(V.H * ps);
  for (const c of [cv2, cvgl]) if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const cs = getComputedStyle(document.documentElement);
  V.safeT = (parseFloat(cs.getPropertyValue('--sat')) || 0) / u;
  V.safeB = (parseFloat(cs.getPropertyValue('--sab')) || 0) / u;
  V.u = u;
}

// client px -> virtual units (undoing the CRT curve when it is on)
export function toVirtual(cx, cy) {
  let x = cx / innerWidth, y = cy / innerHeight;
  if (V.post) {
    const ccx = x - 0.5, ccy = (1 - y) - 0.5, r2 = ccx * ccx + ccy * ccy;
    x = x + ccx * r2 * curve; y = 1 - ((1 - y) + ccy * r2 * curve);
  }
  return [x * V.W, y * V.H];
}

export function beginFrame() {
  const g = V.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv2.width, cv2.height);
  g.setTransform(V.ps, 0, 0, V.ps, 0, 0);
  g.imageSmoothingEnabled = false;
  g.globalAlpha = 1;
  if (!V.post) g.translate(V.shakeX, V.shakeY);
}

export function endFrame(dt) {
  V.t += dt;
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) V.mood[i][k] += (V.moodT[i][k] - V.mood[i][k]) * Math.min(1, dt * 2.2);
  if (!gl) return;
  gl.viewport(0, 0, cvgl.width, cvgl.height);
  if (V.post) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv2);
  }
  gl.uniform2f(uni.uRes, cvgl.width, cvgl.height);
  gl.uniform1f(uni.uT, V.t);
  gl.uniform1f(uni.uPix, V.ps);
  gl.uniform1f(uni.uPost, V.post ? 1 : 0);
  gl.uniform1f(uni.uFlash, V.flash);
  gl.uniform1f(uni.uAb, 0.0009 + V.ab);
  gl.uniform1f(uni.uCurve, V.post ? curve : 0);
  gl.uniform1f(uni.uHeat, V.heat);
  gl.uniform2f(uni.uShake, -V.shakeX / V.W, -V.shakeY / V.H);
  gl.uniform3fv(uni.uC1, V.mood[0]); gl.uniform3fv(uni.uC2, V.mood[1]); gl.uniform3fv(uni.uC3, V.mood[2]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------- drawing helpers (virtual units)
export const snap = (v) => Math.round(v * V.ps) / V.ps;
export function rect(x, y, w, h, col) { const g = V.g; g.fillStyle = col; g.fillRect(x, y, w, h); }

// Chunky rounded rectangle with pixel-stepped corners.
export function rrect(x, y, w, h, col, r = 2) {
  const g = V.g; g.fillStyle = col;
  if (r <= 0) { g.fillRect(x, y, w, h); return; }
  if (r === 1) { g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2); return; }
  g.fillRect(x + 2, y, w - 4, h); g.fillRect(x + 1, y + 1, w - 2, h - 2); g.fillRect(x, y + 2, w, h - 4);
}
export function panel(x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const fill = o.fill || '#241F4D', border = o.border || '#0E0C24', hi = o.hi || '#3B3478';
  if (o.shadow !== false) rrect(x, y + 3, w, h, 'rgba(8,6,24,0.55)');
  rrect(x, y, w, h, border);
  rrect(x + 1, y + 1, w - 2, h - 2, hi);
  rrect(x + 1, y + 2, w - 2, h - 3, fill);
}
export function inset(x, y, w, h, col = '#15122F') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  rrect(x, y, w, h, '#0B0920', 1); rrect(x, y + 1, w, h - 1, col, 1);
}

// Draw a 16x16 sprite centred at x,y. Scale is in virtual units per sprite pixel.
export function spr(id, x, y, scale = 2, rot = 0, alpha = 1, sx = 1, sy = 1) {
  const img = typeof id === 'string' ? sprite(id) : id;
  const g = V.g;
  const w = img.width, h = img.height;
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(scale * sx, scale * sy);
  g.drawImage(img, -w / 2, -h / 2);
  g.restore();
}
// Snap a sprite scale so each sprite pixel covers a whole number of device pixels.
export const pxScale = (s) => Math.max(1, Math.round(s * V.ps)) / V.ps;

export function glow(x, y, r, col, a = 1) {
  const g = V.g;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
