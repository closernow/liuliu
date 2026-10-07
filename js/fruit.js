// 水果合成（数学）：两个水果加起来正好是目标数才合成（分与合、凑十）。物理用 matter.js（js/vendor/，MIT）。
// 自己玩时按关卡走；从数学地图进来时（?t=目标&pool=会掉的数&goal=几次&ret=回去的地址）只玩一局，玩完回地图。
import { UNITS, LEVELS, TIPS } from './fruit_levels.js';
import * as store from './store.js';

const { Engine, Bodies, Body, Composite, Events } = Matter;
const $ = (id) => document.getElementById(id);
const NAMES = ['', '樱桃', '草莓', '葡萄', '橘子', '柠檬', '猕猴桃', '苹果', '桃子', '菠萝', '西瓜'];

let W = 0, H = 0, S = 1, dpr = 1, cv, ctx, engine, walls = [];
let clears = 0;
const Q = new URLSearchParams(location.search), STAGE = Q.has('t');   // 从数学地图进来
let level, count = 0, drops = 0, cur = null, next = null, aimX = 0, canDrop = true, done = false;
let save = { fruit: {}, cur: 'c3' };
let parts = [], splats = [], rings = [], overSince = 0, paused = false;
const toastEl = $('toast');
function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 2200); }

/* ---------------- 声音 ---------------- */
let ac = null, voiceGain, musicGain;
const cache = new Map();
async function audioInit() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  ac = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = ac.createGain(); musicGain.gain.value = 0.18; musicGain.connect(ac.destination);
  voiceGain = ac.createGain(); voiceGain.connect(ac.destination);
  // 轻轻的背景音乐：四季世界的三件乐器
  const t0 = ac.currentTime + 0.1;
  for (const n of ['bells', 'shaker', 'bass', 'marimba']) {
    const b = await load(`../audio/loops/sj/${n}.flac`); if (!b) continue;
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(musicGain); s.start(t0);
  }
}
function load(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => { const q = ac.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); })).catch(() => null));
  return cache.get(url);
}
let playing = null;
async function say(url) {
  if (!ac) return;
  const b = await load(url); if (!b) return;
  if (playing) try { playing.stop(); } catch {}
  const s = ac.createBufferSource(); s.buffer = b; s.connect(voiceGain); s.start(); playing = s;
  musicGain.gain.setTargetAtTime(0.05, ac.currentTime, 0.05); musicGain.gain.setTargetAtTime(0.18, ac.currentTime + b.duration, 0.2);
}
const eqUrl = (a, op, b) => `../audio/voice/eq/${a}${op === '+' ? 'p' : 'm'}${b}.mp3`;
function blip(f = 660, d = 0.12) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = 'triangle';
  g.gain.setValueAtTime(0.2, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
}
document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); });
window.addEventListener('blur', () => { paused = true; ac && ac.suspend(); });
window.addEventListener('focus', () => { paused = false; ac && ac.resume(); });

/* ---------------- 水果画法：精细横切面。每种水果先画一张大图缓存起来，用的时候缩放 ---------------- */
const R = (v) => (v > 10 ? 64 : 15 + v * 4.6) * S;
const R0 = 128, SP = 180;   // 大图里水果半径 128，画布半边 180（留出樱桃梗、草莓叶子）
const sprites = {};
let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rnd() * (b - a);
function rg(c, x0, y0, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, col] of stops) g.addColorStop(o, col); return g; }
function disc(c, r, fill, x = 0, y = 0) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function seed(c, x, y, len, wid, ang, col, hi = 'rgba(255,255,255,.55)') {   // 水滴形的籽，尖头朝 ang 方向
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(len, 0); c.bezierCurveTo(len * .4, -wid, -len * .6, -wid, -len * .6, 0); c.bezierCurveTo(-len * .6, wid, len * .4, wid, len, 0); c.fillStyle = col; c.fill();
  c.beginPath(); c.ellipse(-len * .2, -wid * .35, len * .22, wid * .22, 0, 0, Math.PI * 2); c.fillStyle = hi; c.fill();
  c.restore();
}
// 湿润的高光：左上一大片柔光 + 一个亮点 + 右下一道反光
function wet(c, r) {
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = rg(c, -r * .42, -r * .48, 0, -r * .42, -r * .48, r * .8, [[0, 'rgba(255,255,255,.42)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-r, -r, 2 * r, 2 * r);
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-r * .44, -r * .52, r * .15, r * .065, -.75, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(-r * .22, -r * .64, r * .035, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = r * .045; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r * .88, .25, 1.25); c.stroke();
  c.restore();
}
// 边缘压暗 + 深色描边，看起来是圆鼓鼓的
function edge(c, r, line) {
  disc(c, r, rg(c, 0, 0, r * .55, 0, 0, r, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.2)']]));
  c.strokeStyle = line; c.lineWidth = r * .04; c.beginPath(); c.arc(0, 0, r * .98, 0, Math.PI * 2); c.stroke();
}
function speckle(c, r0, r1, n, col, size) { c.fillStyle = col; for (let i = 0; i < n; i++) { const a = rr(0, 6.283), d = Math.sqrt(rr(r0 * r0, r1 * r1)); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, rr(size * .5, size), 0, Math.PI * 2); c.fill(); } }
function rays(c, r0, r1, n, col, w, jitter = 0) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr(-jitter, jitter); c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1 * rr(.92, 1), Math.sin(a) * r1 * rr(.92, 1)); c.stroke(); } }
// 橘子、柠檬：有小油孔的皮、白色的瓤、一瓣一瓣的果肉（里面是一粒粒的汁胞）
function citrus(c, r, peel, peelDark, flesh, fleshDeep, n, seeds) {
  disc(c, r, rg(c, -r * .3, -r * .3, 0, 0, 0, r, [[0, peel], [1, peelDark]]));
  speckle(c, r * .9, r * .99, 260, 'rgba(120,60,0,.18)', r * .012);
  disc(c, r * .885, rg(c, 0, 0, r * .7, 0, 0, r * .885, [[0, '#fffaf0'], [1, '#fbe9c8']]));
  const fr = r * .8;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, gap = .04;
    c.save(); c.beginPath(); c.moveTo(Math.cos((a0 + a1) / 2) * r * .14, Math.sin((a0 + a1) / 2) * r * .14); c.arc(0, 0, fr, a0 + gap, a1 - gap); c.closePath();
    c.fillStyle = rg(c, 0, 0, r * .12, 0, 0, fr, [[0, fleshDeep], [.55, flesh], [1, fleshDeep]]); c.fill(); c.clip();
    for (let k = 0; k < 26; k++) {   // 汁胞
      const a = rr(a0 + gap, a1 - gap), d = rr(r * .2, fr * .97);
      c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * .07, r * .022, a, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,230,.33)'; c.fill();
    }
    c.restore();
  }
  disc(c, r * .13, '#fdf2d8');
  for (let i = 0; i < seeds; i++) { const a = (i + .5) / seeds * Math.PI * 2 + .3; seed(c, Math.cos(a) * r * .3, Math.sin(a) * r * .3, r * .08, r * .04, a + Math.PI, '#f6efcf', 'rgba(255,255,255,.7)'); }
  edge(c, r, peelDark); wet(c, r);
}
const DRAW = {
  1(c, r) {   // 樱桃（整颗）
    c.strokeStyle = '#5a7a24'; c.lineWidth = r * .1; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * .8); c.quadraticCurveTo(r * .2, -r * 1.25, r * .62, -r * 1.32); c.stroke();
    c.save(); c.translate(r * .7, -r * 1.3); c.rotate(-.5); c.beginPath(); c.ellipse(r * .22, 0, r * .3, r * .13, 0, 0, Math.PI * 2); c.fillStyle = rg(c, 0, 0, 0, r * .2, 0, r * .4, [[0, '#8ad050'], [1, '#3a8a2a']]); c.fill();
    c.strokeStyle = 'rgba(30,80,20,.6)'; c.lineWidth = r * .025; c.beginPath(); c.moveTo(-r * .06, 0); c.lineTo(r * .5, 0); c.stroke(); c.restore();
    disc(c, r, rg(c, -r * .32, -r * .36, r * .04, 0, 0, r, [[0, '#ff8a92'], [.35, '#e2283c'], [1, '#7a0818']]));
    c.strokeStyle = 'rgba(90,0,10,.45)'; c.lineWidth = r * .06; c.beginPath(); c.arc(0, -r * .62, r * .2, Math.PI * 1.15, Math.PI * 1.85); c.stroke();   // 梗下面的小窝
    c.strokeStyle = '#6a0a14'; c.lineWidth = r * .04; c.beginPath(); c.arc(0, 0, r * .98, 0, Math.PI * 2); c.stroke();
    wet(c, r);
  },
  2(c, r) {   // 草莓（整颗）
    const P = new Path2D(); P.moveTo(0, r); P.bezierCurveTo(-r * 1.15, r * .3, -r * .98, -r * .82, 0, -r * .7); P.bezierCurveTo(r * .98, -r * .82, r * 1.15, r * .3, 0, r);
    const path = () => { c.beginPath(); c.moveTo(0, r); c.bezierCurveTo(-r * 1.15, r * .3, -r * .98, -r * .82, 0, -r * .7); c.bezierCurveTo(r * .98, -r * .82, r * 1.15, r * .3, 0, r); };
    path(); c.fillStyle = rg(c, -r * .3, -r * .3, r * .05, 0, 0, r * 1.1, [[0, '#ff8080'], [.5, '#e8283a'], [1, '#9a0a1a']]); c.fill();
    c.save(); path(); c.clip();
    for (let y = -r * .5, row = 0; y < r * .9; y += r * .17, row++) for (let x = -r * .9 + (row % 2) * r * .1; x < r * .9; x += r * .2) {
      if (!c.isPointInPath(P, x + SP, y + SP - r * .06)) continue;   // isPointInPath 用画布坐标，画布中心在 (SP, SP)
      c.beginPath(); c.ellipse(x, y, r * .045, r * .065, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(120,0,10,.35)'; c.fill();
      c.beginPath(); c.ellipse(x, y - r * .01, r * .028, r * .045, 0, 0, Math.PI * 2); c.fillStyle = '#ffe07a'; c.fill();
      c.beginPath(); c.arc(x - r * .01, y - r * .03, r * .01, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    }
    c.fillStyle = rg(c, -r * .42, -r * .45, 0, -r * .42, -r * .45, r * .7, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-r * 1.2, -r, r * 2.4, r * 2);
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-r * .45, -r * .35, r * .13, r * .06, -.9, 0, Math.PI * 2); c.fill();
    c.restore();
    path(); c.strokeStyle = '#7a0a14'; c.lineWidth = r * .04; c.stroke();
    // 叶子
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i / 6 * Math.PI; c.save(); c.translate(0, -r * .68); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.moveTo(-r * .09, 0); c.quadraticCurveTo(-r * .06, r * .32, 0, r * .42); c.quadraticCurveTo(r * .06, r * .32, r * .09, 0); c.closePath();
      c.fillStyle = rg(c, 0, 0, 0, 0, r * .2, r * .45, [[0, '#7ad050'], [1, '#2a7a2a']]); c.fill(); c.strokeStyle = '#1f5a1f'; c.lineWidth = r * .02; c.stroke(); c.restore();
    }
    c.fillStyle = '#3a7a2a'; c.fillRect(-r * .04, -r * 1.02, r * .08, r * .3);
  },
  3(c, r) {   // 葡萄（切面）
    disc(c, r, rg(c, -r * .3, -r * .3, 0, 0, 0, r, [[0, '#8a3ab0'], [1, '#3a1050']]));
    disc(c, r * .9, rg(c, 0, 0, r * .1, 0, 0, r * .9, [[0, '#f4ecf6'], [.6, '#d4b8e4'], [1, '#9a68b8']]));
    rays(c, r * .25, r * .85, 30, 'rgba(255,255,255,.18)', r * .02, .05);
    for (const s of [-1, 1]) seed(c, s * r * .2, r * .02, r * .17, r * .09, s > 0 ? -Math.PI / 2 + .3 : -Math.PI / 2 - .3, '#8a5a24');
    edge(c, r, '#2a0840'); wet(c, r);
  },
  4: (c, r) => citrus(c, r, '#ffa53a', '#d86a08', '#ffb84a', '#f08a10', 10, 2),     // 橘子
  5: (c, r) => citrus(c, r, '#fde24a', '#d8b008', '#fff07a', '#f0d030', 8, 3),      // 柠檬
  6(c, r) {   // 猕猴桃
    disc(c, r, '#7a5a30');
    c.lineCap = 'round'; for (let i = 0; i < 420; i++) { const a = rr(0, 6.283), d = rr(r * .9, r * 1.01); c.strokeStyle = `rgba(${rr(80, 150) | 0},${rr(60, 100) | 0},${rr(30, 50) | 0},.7)`; c.lineWidth = r * .012; c.beginPath(); c.moveTo(Math.cos(a) * d, Math.sin(a) * d); c.lineTo(Math.cos(a + rr(-.05, .05)) * (d + r * .04), Math.sin(a + rr(-.05, .05)) * (d + r * .04)); c.stroke(); }
    disc(c, r * .92, rg(c, 0, 0, r * .15, 0, 0, r * .92, [[0, '#f0fad0'], [.3, '#b8e060'], [.75, '#7cbc2c'], [1, '#4a8a18']]));
    rays(c, r * .3, r * .9, 70, 'rgba(240,255,200,.22)', r * .018, .04);
    c.beginPath(); c.ellipse(0, 0, r * .26, r * .2, 0, 0, Math.PI * 2); c.fillStyle = rg(c, 0, 0, 0, 0, 0, r * .26, [[0, '#fcfff0'], [.7, '#eef8d0'], [1, 'rgba(230,245,190,0)']]); c.fill();
    for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2 + rr(-.04, .04), d = r * (i % 2 ? .36 : .44) * rr(.95, 1.05); seed(c, Math.cos(a) * d, Math.sin(a) * d, r * .045, r * .025, a + Math.PI, '#1a1408', 'rgba(255,255,255,.35)'); }
    edge(c, r, '#4a3418'); wet(c, r);
  },
  7(c, r) {   // 苹果（对半切）
    c.fillStyle = '#6a4a2a'; c.save(); c.translate(0, -r * .95); c.rotate(.15); c.fillRect(-r * .04, -r * .22, r * .08, r * .26); c.restore();
    disc(c, r, rg(c, -r * .3, -r * .3, 0, 0, 0, r, [[0, '#ff6a50'], [.7, '#d8282a'], [1, '#901010']]));
    c.strokeStyle = 'rgba(255,200,80,.35)'; c.lineWidth = r * .02; for (let i = 0; i < 18; i++) { const a = rr(0, 6.283); c.beginPath(); c.arc(0, 0, r * rr(.93, .99), a, a + rr(.1, .3)); c.stroke(); }
    disc(c, r * .92, rg(c, 0, r * .05, r * .1, 0, 0, r * .92, [[0, '#fffaec'], [.8, '#f8ecc8'], [1, '#eedc9e']]));
    c.strokeStyle = 'rgba(200,170,110,.45)'; c.lineWidth = r * .025; c.beginPath(); c.moveTo(0, -r * .8); c.bezierCurveTo(-r * .55, -r * .5, -r * .5, r * .55, 0, r * .75); c.bezierCurveTo(r * .5, r * .55, r * .55, -r * .5, 0, -r * .8); c.stroke();
    for (let i = 0; i < 5; i++) {   // 五角星形的果核
      const a = -Math.PI / 2 + i / 5 * Math.PI * 2; c.save(); c.translate(Math.cos(a) * r * .17, Math.sin(a) * r * .17 + r * .04); c.rotate(a);
      c.beginPath(); c.ellipse(0, 0, r * .14, r * .06, 0, 0, Math.PI * 2); c.fillStyle = '#efe0b8'; c.fill(); c.strokeStyle = '#d8c090'; c.lineWidth = r * .015; c.stroke(); c.restore();
      if (i % 2 === 0 || i === 1) seed(c, Math.cos(a) * r * .17, Math.sin(a) * r * .17 + r * .04, r * .09, r * .045, a, '#5a3014');
    }
    edge(c, r, '#701010'); wet(c, r);
  },
  8(c, r) {   // 桃子（对半切带核）
    disc(c, r, rg(c, -r * .3, -r * .3, 0, 0, 0, r, [[0, '#ffb08a'], [.6, '#f06a5a'], [1, '#b83040']]));
    disc(c, r * .92, rg(c, 0, 0, r * .2, 0, 0, r * .92, [[0, '#e84a3a'], [.38, '#ffa860'], [.75, '#ffc880'], [1, '#ffd890']]));
    rays(c, r * .32, r * .7, 40, 'rgba(220,60,40,.18)', r * .02, .05);
    c.save(); c.rotate(.2);
    c.beginPath(); c.ellipse(0, 0, r * .28, r * .37, 0, 0, Math.PI * 2); c.fillStyle = rg(c, -r * .08, -r * .1, 0, 0, 0, r * .37, [[0, '#b0603a'], [1, '#6a2a14']]); c.fill();
    c.strokeStyle = 'rgba(60,20,8,.6)'; c.lineWidth = r * .022; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const x = rr(-.2, .2) * r, y = rr(-.3, .3) * r; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + rr(-.06, .06) * r, y + r * .04, x + rr(-.08, .08) * r, y + r * .08); c.stroke(); }
    c.beginPath(); c.moveTo(0, -r * .37); c.quadraticCurveTo(r * .05, 0, 0, r * .37); c.stroke(); c.restore();
    edge(c, r, '#8a2030'); wet(c, r);
  },
  9(c, r) {   // 菠萝（横切）
    disc(c, r, rg(c, 0, 0, r * .8, 0, 0, r, [[0, '#c89030'], [1, '#7a5010']]));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.save(); c.translate(Math.cos(a) * r * .935, Math.sin(a) * r * .935); c.rotate(a); c.beginPath(); c.moveTo(-r * .05, 0); c.lineTo(0, -r * .06); c.lineTo(r * .05, 0); c.lineTo(0, r * .06); c.closePath(); c.fillStyle = '#5a3a08'; c.fill(); disc(c, r * .018, '#e0b050'); c.restore(); }
    disc(c, r * .87, rg(c, 0, 0, r * .25, 0, 0, r * .87, [[0, '#fff6b8'], [.5, '#ffe050'], [1, '#f0b820']]));
    rays(c, r * .3, r * .86, 56, 'rgba(255,250,210,.45)', r * .022, .03);
    rays(c, r * .32, r * .86, 28, 'rgba(220,150,20,.3)', r * .015, .1);
    for (let i = 0; i < 20; i++) { const a = (i + .5) / 20 * Math.PI * 2; disc(c, r * .028, 'rgba(140,90,20,.55)', Math.cos(a) * r * .8, Math.sin(a) * r * .8); }
    disc(c, r * .28, rg(c, 0, 0, 0, 0, 0, r * .28, [[0, '#fff8d0'], [1, '#fbe890']])); c.strokeStyle = 'rgba(220,170,40,.5)'; c.lineWidth = r * .02; c.beginPath(); c.arc(0, 0, r * .28, 0, Math.PI * 2); c.stroke();
    edge(c, r, '#5a3a08'); wet(c, r);
  },
  10(c, r) {   // 西瓜（横切）
    disc(c, r, '#2f8a34');
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip(); c.strokeStyle = '#155a1c'; c.lineWidth = r * .07; c.lineJoin = 'round';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.beginPath(); for (let k = 0; k <= 8; k++) { const aa = a + (k % 2 ? .05 : -.05) + k * .01, d = r * (.88 + k * .02); c.lineTo(Math.cos(aa) * d, Math.sin(aa) * d); } c.stroke(); }
    c.restore();
    disc(c, r * .9, rg(c, 0, 0, r * .8, 0, 0, r * .9, [[0, '#f8fdea'], [1, '#b8e090']]));
    disc(c, r * .84, rg(c, 0, 0, 0, 0, 0, r * .84, [[0, '#d0182e'], [.65, '#ee3a4c'], [.95, '#ff7a80'], [1, '#ffb0a8']]));
    speckle(c, 0, r * .8, 260, 'rgba(255,200,200,.25)', r * .016);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + (i % 2) * .15, d = r * (i % 2 ? .44 : .62); seed(c, Math.cos(a) * d, Math.sin(a) * d, r * .07, r * .035, a + Math.PI, '#1a1010', 'rgba(255,255,255,.5)'); }
    edge(c, r, '#0e3a12'); wet(c, r);
  },
};
function sprite(v) {
  if (sprites[v]) return sprites[v];
  const c = document.createElement('canvas'); c.width = c.height = SP * 2; const g = c.getContext('2d');
  sd = 7 + v * 131; g.translate(SP, SP); DRAW[v](g, R0);
  return (sprites[v] = c);
}
// 柔和的影子（画在水果下面，不跟着转）
const shadowImg = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = rg(g, 64, 64, 0, 64, 64, 64, [[0, 'rgba(60,70,20,.32)'], [.6, 'rgba(60,70,20,.16)'], [1, 'rgba(60,70,20,0)']]); g.fillRect(0, 0, 128, 128); return c; })();
export function drawShadow(c, x, y, r) { c.drawImage(shadowImg, x - r * 1.15 + r * .06, y - r * 1.15 + r * .2, r * 2.3, r * 2.3); }
// opts：shadow 画影子；blink 眨眼；sx/sy 挤压回弹
export function drawFruit(c, v, r, rot = 0, opts = {}) {
  const { shadow = true, blink = false, sx = 1, sy = 1, q = false } = opts;
  if (shadow) drawShadow(c, 0, 0, r);
  const base = v > 10 ? 10 : v, k = r / R0;
  c.save(); c.scale(sx, sy);
  c.save(); c.rotate(rot); c.drawImage(sprite(base), -SP * k, -SP * k, SP * 2 * k, SP * 2 * k); c.restore();
  // 十几：西瓜旁边挂着几个小樱桃，表示"1 个十和几个一"
  if (v > 10) {
    const n = v - 10;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * .38; const ck = r * .17 / R0; c.drawImage(sprite(1), Math.cos(a) * r * 1.08 - SP * ck, Math.sin(a) * r * 1.08 - SP * ck, SP * 2 * ck, SP * 2 * ck); }
  }
  // 一对小眼睛（不跟着转，眨眼）
  if (r >= 18) {
    const ex = r * .27, ey = -r * .44, er = r * .085;
    for (const s of [-1, 1]) {
      if (blink) { c.strokeStyle = '#2a1a10'; c.lineWidth = Math.max(1.5, er * .5); c.lineCap = 'round'; c.beginPath(); c.arc(s * ex, ey - er * .3, er, .3, Math.PI - .3); c.stroke(); }
      else { c.beginPath(); c.ellipse(s * ex, ey, er, er * 1.25, 0, 0, Math.PI * 2); c.fillStyle = '#2a1a10'; c.fill(); c.beginPath(); c.arc(s * ex - er * .3, ey - er * .45, er * .38, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); }
    }
  }
  // 数字牌：放在下半部分，不挡住果核、籽这些细节
  const br = Math.max(7, r * (v > 9 ? .34 : .28)), by = r >= 18 ? r * .36 : 0;
  c.beginPath(); c.arc(0, by, br, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.93)'; c.fill();
  c.strokeStyle = 'rgba(31,58,46,.18)'; c.lineWidth = Math.max(1, br * .08); c.stroke();
  c.fillStyle = '#1f3a2e'; c.font = `900 ${br * (v > 9 ? 1.05 : 1.35)}px system-ui,'Microsoft YaHei'`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(q ? '?' : String(v), 0, by + br * .06);
  c.restore();
}
/* ---------------- 物理世界 ---------------- */
function setup() {
  const box = $('box'); W = box.clientWidth; H = box.clientHeight; S = Math.min(W / 460, H / 700); dpr = window.devicePixelRatio || 1;
  cv = $('cv'); cv.width = W * dpr; cv.height = H * dpr; ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
  engine = Engine.create({ positionIterations: 10, velocityIterations: 8 }); engine.gravity.y = 1.5;
  const t = 80, ins = INS(), wm = { isStatic: true, friction: 0.05, restitution: 0.2 };
  walls = [Bodies.rectangle(W / 2, H + t / 2 - ins, W * 2, t, wm), Bodies.rectangle(-t / 2 + ins, H / 2, t, H * 3, wm), Bodies.rectangle(W + t / 2 - ins, H / 2, t, H * 3, wm)];
  Composite.add(engine.world, walls);
  Events.on(engine, 'collisionStart', (ev) => { impact(ev); onHit(ev); });
  Events.on(engine, 'collisionActive', onHit);
  aimX = W / 2;
}
const items = () => Composite.allBodies(engine.world).filter((b) => b.item);
// 手感照原版：会轻轻弹一下、会滚、会转；合成出来的新水果从小"噗"地长大，把旁边的挤开
function makeBody(item, x, y, grow = false) {
  const r = R(item.v);
  const b = Bodies.circle(x, y, r, { restitution: 0.22, friction: 0.06, frictionStatic: 0.25, frictionAir: 0.006, density: 0.0015 });
  b.item = item; b.r = r; b.born = performance.now(); b.sc = 1;
  if (grow) { Body.scale(b, 0.35, 0.35); b.sc = 0.35; b.wob = { amp: 0.12, t0: b.born + 200 }; }
  Composite.add(engine.world, b);
  return b;
}
function growAll(now) {
  for (const b of items()) if (b.sc < 1) {
    const k = Math.min(1, (now - b.born) / 220), want = 0.35 + 0.65 * (1 - Math.pow(1 - k, 3)), f = want / b.sc;
    if (f > 1.0001) { Body.scale(b, f, f); b.sc = want; } if (k >= 1) b.sc = 1;
  }
}
// 撞上的时候挤一下再弹回来，越快越扁
function impact(ev) {
  const now = performance.now();
  for (const p of ev.pairs) {
    const a = p.bodyA, b = p.bodyB, n = p.collision.normal;
    const rel = Math.abs((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y);
    if (rel < 1.2) continue;
    for (const o of [a, b]) if (o.item && !o.gone) o.wob = { amp: Math.min(0.16, rel * 0.022), t0: now };
  }
}
// 物理：每一帧按固定步长算（1/60 秒），画的时候在两步之间插值，不顿
const DT = 1000 / 60; let acc = 0, lastT = 0;
const TEST = location.search.includes('test');   // 测试用：后台也继续算
function step() { for (const b of items()) { b.ox = b.position.x; b.oy = b.position.y; } Engine.update(engine, DT); flushHits(); growAll(performance.now()); }
function stepPhysics(now) {
  const d = lastT ? Math.min(100, now - lastT) : 0; lastT = now;
  if (TEST || document.hidden || paused) { acc = 0; return; }
  acc += d; let n = 0; while (acc >= DT && n++ < 6) { step(); acc -= DT; }
  if (acc > DT) acc = 0;
}
// 掉什么：台上有能凑上的，一半机会给她需要的那个，别让她等太久
function pick() {
  const P = level.pool, t = level.t;
  if (Math.random() < 0.5) {
    const vs = items().map((b) => b.item.v).filter((v) => v < t && P.includes(t - v));
    if (vs.length) return { v: t - vs[(Math.random() * vs.length) | 0] };
  }
  return { v: P[(Math.random() * P.length) | 0] };
}

/* ---------------- 合成规则 ---------------- */
// 碰撞回调里只记下来，等这一步物理算完再合成（在回调里直接删水果会把引擎搞乱）
let hits = [];
function onHit(ev) {
  if (done) return;
  for (const p of ev.pairs) { const a = p.bodyA, b = p.bodyB; if (a.item && b.item) hits.push([a, b]); }
}
function flushHits() {
  const hs = hits; hits = [];
  for (const [a, b] of hs) if (!a.gone && !b.gone && !done) tryMerge(a, b);
}
// 唯一的规则：两个加起来正好是目标数，就合成，然后变成彩花
function tryMerge(a, b) {
  const x = a.item.v, y = b.item.v, s = x + y;
  if (s !== level.t) return;
  const nb = merge(a, b, s); nb.locked = true; setTimeout(() => pop(nb), 650);
  showEq(`${x} + ${y} = ${s}`, eqUrl(x, '+', y), s === 10 ? '凑成十啦' : `${s} 可以分成 ${x} 和 ${y}`);
  score();
}
function gone(b) { b.gone = true; Composite.remove(engine.world, b); }
function merge(a, b, v) {
  const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
  gone(a); gone(b);
  const nb = makeBody({ v }, x, y, true);
  Body.setVelocity(nb, { x: 0, y: -1.5 }); nb.blinkUntil = 0;
  burst(x, y, v); rings.push({ x, y, r: R(v), col: 'rgba(255,255,255,.9)', t0: performance.now() });
  blip(520 + v * 30);
  return nb;
}
// celebrate：算对了才有纸屑和金光
function pop(b, celebrate = true) {
  if (b.gone) return;
  Composite.remove(engine.world, b); b.gone = true;
  const { x, y } = b.position, now = performance.now();
  burst(x, y, b.item.v, celebrate ? 30 : 14); if (!celebrate) return blip(440, .15);
  confetti(x, y);
  rings.push({ x, y, r: b.r, col: 'rgba(255,215,90,.95)', t0: now }); rings.push({ x, y, r: b.r * .6, col: 'rgba(255,255,255,.9)', t0: now + 80 });
  if (b.item.v >= 10) { shakeUntil = now + 300; shakeAmp = 5 * S; }
  blip(880, .2); setTimeout(() => blip(1175, .2), 90);
}
let eqTimer = null;
function showEq(txt, url, sub = '', ms = 2200) {
  const e = $('eq'); e.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); e.classList.add('on');
  clearTimeout(eqTimer); eqTimer = setTimeout(() => e.classList.remove('on'), ms);
  say(url);
}
// 果汁飞溅：颜色跟着水果（果肉的颜色）
const JUICE = ['#e0283c', '#f03a4a', '#c8a0e0', '#ffa030', '#f8d830', '#9ad040', '#fff0c8', '#ffa860', '#ffd840', '#f03a4c'];
function burst(x, y, v, n = 18) {
  const col = JUICE[Math.min(10, v > 10 ? 10 : v) - 1] || '#fff';
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 5) * Math.max(.7, S); parts.push({ type: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5, g: .28, fade: .022 + Math.random() * .015, life: 1, col, size: (2 + Math.random() * 4) * S }); }
}
// 凑成目标：彩色纸屑和小星星
function confetti(x, y) {
  const cols = ['#ff5a6a', '#ffc83a', '#4ac06a', '#4a9aff', '#c06aff', '#ff8a3a'];
  for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, s = (4 + Math.random() * 6) * Math.max(.7, S); parts.push({ type: i % 4 ? 'confetti' : 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .18, fade: .012, life: 1, col: i % 4 ? cols[i % cols.length] : '#ffd23a', size: (4 + Math.random() * 3) * S, rot: Math.random() * 6, vr: (Math.random() - .5) * .4 }); }
}

/* ---------------- 关卡流程 ---------------- */
function score() {
  count++; updateHud();
  if (count < level.goal || done) return;
  done = true;
  const st = clears === 0 && drops <= level.goal * 3 ? 3 : clears <= 1 && drops <= level.goal * 5 ? 2 : 1;   // 星星看用了几个水果、有没有堆满
  if (!STAGE) { if ((save.fruit[level.id] || 0) < st) save.fruit[level.id] = st; persist(); }
  else sessionStorage.setItem('fruitResult', String(st));
  setTimeout(() => {
    $('doneStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
    $('doneTxt').textContent = `${level.name}：凑成 ${count} 次，一共放了 ${drops} 个`;
    $('nextBtn').hidden = STAGE ? false : !nextLevel(); if (STAGE) $('nextBtn').textContent = '继续 ▶';
    $('againBtn').hidden = STAGE;
    $('doneLayer').hidden = false;
    say('../audio/voice/ui/f_done.mp3');
  }, 1200);
}
const nextLevel = () => LEVELS[LEVELS.findIndex((l) => l.id === level.id) + 1];
function startLevel(id) {
  level = LEVELS.find((l) => l.id === id) || LEVELS[0];
  save.cur = level.id; persist();
  count = 0; drops = 0; clears = 0; done = false; parts = []; splats = []; overSince = 0;
  hits = []; setup(); cur = pick(); next = pick(); canDrop = true;
  const u = UNITS.find((u) => u.levels.includes(level));
  $('unitName').textContent = u ? u.name : '数学闯关'; $('lvName').textContent = level.name;
  $('tip').textContent = level.tip || TIPS[level.mode](level.t);
  updateHud(); drawNext(); drawLegend();
}
function updateHud() {
  $('prog').style.width = Math.min(100, count / level.goal * 100) + '%';
  $('progTxt').textContent = `凑成 ${count} / ${level.goal} 次`;
  $('score').textContent = count;
  const st = save.fruit[level.id] || 0; $('stars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
}
function drawNext() {
  const c = $('nextC').getContext('2d'); c.clearRect(0, 0, 140, 140);
  c.save(); c.translate(70, 62);
  drawFruit(c, next.v, Math.min(46, 18 + next.v * 3));
  c.restore();
  // 点子，帮她数
  if (next.v <= 10) { c.fillStyle = '#0f8a5f'; for (let i = 0; i < next.v; i++) { c.beginPath(); c.arc(70 - (Math.min(next.v, 5) - 1) * 7 + (i % 5) * 14, 118 + Math.floor(i / 5) * 12, 4.5, 0, Math.PI * 2); c.fill(); } }
  $('nextTxt').textContent = `${NAMES[next.v]} ${next.v}`;
}
function drawLegend() {
  const c = $('legendC').getContext('2d'); c.clearRect(0, 0, 210, 190);
  for (let v = 1; v <= 10; v++) { const i = v - 1; c.save(); c.translate(24 + (i % 5) * 40, 34 + Math.floor(i / 5) * 90); drawFruit(c, v, 16); c.restore(); c.fillStyle = '#4a6a5a'; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText(NAMES[v], 24 + (i % 5) * 40, 70 + Math.floor(i / 5) * 90); }
}
function drop() {
  if (!canDrop || done) return;
  canDrop = false; drops++;
  const r = R(cur.v);
  const x = Math.max(r + INS() + 2, Math.min(W - r - INS() - 2, aimX));
  makeBody(cur, x, 40 * S);
  cur = next; next = pick(); drawNext();
  setTimeout(() => (canDrop = true), 450);
}

/* ---------------- 画面 ---------------- */
const INS = () => 12 * S;   // 木框厚度（物理墙的内边）
let bgCache = null;
function background() {
  if (bgCache && bgCache.w === W && bgCache.h === H) return bgCache.c;
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(1, '#f4e6b0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 20; y < H; y += 46) for (let x = (y / 46) % 2 ? 10 : 33; x < W; x += 46) { g.beginPath(); g.arc(x, y, 3 * S, 0, Math.PI * 2); g.fill(); }
  const ins = INS();
  const wood = (x, y, w, h, vertical) => {
    const wg = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    wg.addColorStop(0, '#d9a868'); wg.addColorStop(.5, '#c48a48'); wg.addColorStop(1, '#a86e34'); g.fillStyle = wg; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(110,60,20,.3)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { g.beginPath(); if (vertical) { const xx = x + w * (i + .5) / 4; g.moveTo(xx, y); g.bezierCurveTo(xx + 2, y + h * .3, xx - 2, y + h * .6, xx + 1, y + h); } else { const yy = y + h * (i + .5) / 4; g.moveTo(x, yy); g.bezierCurveTo(x + w * .3, yy + 2, x + w * .6, yy - 2, x + w, yy + 1); } g.stroke(); }
  };
  wood(0, 0, ins, H, true); wood(W - ins, 0, ins, H, true); wood(0, H - ins, W, ins, false);
  // 木框里面的阴影，有深度
  const sh = (x0, y0, x1, y1) => { const s = g.createLinearGradient(x0, y0, x1, y1); s.addColorStop(0, 'rgba(90,60,10,.18)'); s.addColorStop(1, 'rgba(90,60,10,0)'); return s; };
  g.fillStyle = sh(ins, 0, ins + 18 * S, 0); g.fillRect(ins, 0, 18 * S, H - ins);
  g.fillStyle = sh(W - ins, 0, W - ins - 18 * S, 0); g.fillRect(W - ins - 18 * S, 0, 18 * S, H - ins);
  g.fillStyle = sh(0, H - ins, 0, H - ins - 14 * S); g.fillRect(ins, H - ins - 14 * S, W - 2 * ins, 14 * S);
  bgCache = { w: W, h: H, c }; return c;
}
// 落点预览：沿着竖线往下，碰到的第一个水果或者地面
function landingY(x, r) {
  let y = H - INS() - r;
  for (const b of items()) { if (b.gone) continue; const br = b.r * b.sc, dx = Math.abs(b.position.x - x); if (dx < r + br) { const yy = b.position.y - Math.sqrt((r + br) ** 2 - dx * dx); if (yy < y) y = yy; } }
  return y;
}
const wobble = (b, now) => { if (!b.wob) return 0; const t = now - b.wob.t0; if (t > 700) { b.wob = null; return 0; } return b.wob.amp * Math.exp(-t / 160) * Math.cos(t / 42); };
let shakeUntil = 0, shakeAmp = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!engine || !W || !H) return;
  stepPhysics(now);
  const alpha = Math.min(1, acc / DT), lerp = (b) => [b.ox === undefined ? b.position.x : b.ox + (b.position.x - b.ox) * alpha, b.oy === undefined ? b.position.y : b.oy + (b.position.y - b.oy) * alpha];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(background(), 0, 0, W, H);
  if (now < shakeUntil) { const a = shakeAmp * (shakeUntil - now) / 300; ctx.translate(rr(-a, a), rr(-a, a)); }
  // 果汁印子：慢慢淡掉
  for (const s of splats) { const f = 1 - (now - s.t0) / 2200; if (f <= 0) continue; ctx.globalAlpha = f * .35; ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1; splats = splats.filter((s) => now - s.t0 < 2200);
  // 警戒线：快堆到顶了就轻轻变红（不闪屏）
  const lineY = 110 * S, list = items().filter((b) => !b.gone);
  const near = list.some((b) => now - b.born > 1500 && b.position.y - b.r * b.sc < lineY + 50 * S);
  ctx.setLineDash([10, 8]); ctx.lineWidth = 2.5;
  ctx.strokeStyle = near ? `rgba(220,60,60,${.45 + .25 * Math.sin(now / 260)})` : 'rgba(200,120,80,.28)';
  ctx.beginPath(); ctx.moveTo(INS(), lineY); ctx.lineTo(W - INS(), lineY); ctx.stroke(); ctx.setLineDash([]);
  // 瞄准线、落点预览、挂在藤上的下一个水果
  if (cur && !done) {
    const r = R(cur.v), x = Math.max(r + INS() + 2, Math.min(W - r - INS() - 2, aimX)), hy = 40 * S;
    const ly = landingY(x, r);
    ctx.setLineDash([4, 9]); ctx.strokeStyle = 'rgba(15,138,95,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, hy + r); ctx.lineTo(x, ly); ctx.stroke(); ctx.setLineDash([]);
    if (ly > hy + r * 2) { ctx.strokeStyle = 'rgba(15,138,95,.35)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, ly, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    const sway = Math.sin(now / 500) * 2 * S;
    ctx.strokeStyle = '#6a9a3a'; ctx.lineWidth = 3 * S; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - sway, 0); ctx.quadraticCurveTo(x + sway, (hy - r) / 2, x, hy - r * .8); ctx.stroke();
    ctx.save(); ctx.translate(x + 5 * S, (hy - r) * .45); ctx.rotate(.6 + sway * .05); ctx.beginPath(); ctx.ellipse(6 * S, 0, 7 * S, 3.5 * S, 0, 0, Math.PI * 2); ctx.fillStyle = '#7cc04a'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x, hy); ctx.globalAlpha = canDrop ? 1 : .55; drawFruit(ctx, cur.v, r, 0, { shadow: false, blink: blinkAt(0, now) }); ctx.restore();
  }
  // 台上的水果和虫子：先画所有影子，再画水果
  let high = false;
  for (const b of list) { const [x, y] = lerp(b); drawShadow(ctx, x, y, b.r * b.sc); }
  for (const b of list) {
    const [x, y] = lerp(b), r = b.r * b.sc, w = wobble(b, now);
    ctx.save(); ctx.translate(x, y);
    drawFruit(ctx, b.item.v, r, b.angle, { shadow: false, blink: blinkAt(b.id, now) || now - b.born < 180, sx: 1 + w, sy: 1 - w });
    ctx.restore();
    if (!b.locked && now - b.born > 1500 && b.position.y - r < lineY && Math.abs(b.velocity.y) < .5) high = true;
  }
  // 光圈
  for (const g of rings) { const f = (now - g.t0) / 450; if (f >= 1) continue; ctx.globalAlpha = 1 - f; ctx.strokeStyle = g.col; ctx.lineWidth = 6 * S * (1 - f) + 1; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * (1 + f * 1.2), 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1; rings = rings.filter((g) => now - g.t0 < 450);
  // 粒子：果汁水滴（顺着速度方向拉长）、彩色纸屑、小星星
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .99; p.life -= p.fade; ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    if (p.type === 'drop') { const sp = Math.hypot(p.vx, p.vy); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.beginPath(); ctx.ellipse(0, 0, p.size * (1 + sp * .12), p.size, 0, 0, Math.PI * 2); ctx.fillStyle = p.col; ctx.fill(); ctx.beginPath(); ctx.arc(p.size * .3, -p.size * .35, p.size * .3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.restore(); if (p.life < .35 && !p.splat && Math.random() < .2) { p.splat = true; splats.push({ x: p.x, y: p.y, r: p.size * 1.6, col: p.col, t0: now }); } }
    else if (p.type === 'confetti') { p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2)); ctx.fillStyle = p.col; ctx.fillRect(-p.size, -p.size * .5, p.size * 2, p.size); ctx.restore(); }
    else { p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rad = i % 2 ? p.size * .45 : p.size, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.fill(); ctx.restore(); }
  }
  ctx.globalAlpha = 1; parts = parts.filter((p) => p.life > 0 && p.y < H + 40);
  // 堆满了：不算输，帮她清掉上面一层
  if (high && !done) { if (!overSince) overSince = now; if (now - overSince > 1500) { clearTop(lineY); overSince = 0; } } else overSince = 0;
}
// 偶尔眨一下眼
const blinkAt = (id, now) => ((now / 1000 + id * .37) % 3.7) < .12;
function clearTop(lineY) {
  clears++;
  for (const b of items()) if (!b.locked && b.position.y - b.r < lineY + 160 * S) { burst(b.position.x, b.position.y, b.item.v || 1, 8); gone(b); }
  toast('满啦，帮你清掉一些'); say('../audio/voice/ui/f_clear.mp3');
}

/* ---------------- 选关 ---------------- */
function renderLevels() {
  let unlockedTo = 0;
  LEVELS.forEach((l, i) => { if (save.fruit[l.id]) unlockedTo = i + 1; });
  $('levelsBody').innerHTML = UNITS.map((u) => `<div class="ugrp"><b>${u.name}</b><div class="lvs">` + u.levels.map((l) => {
    const i = LEVELS.indexOf(l), open = i <= unlockedTo || save.all, st = save.fruit[l.id] || 0;
    return `<button class="lvb${level && level.id === l.id ? ' cur' : ''}" data-id="${l.id}" ${open ? '' : 'disabled'}><b>${l.name}</b><span>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>${open ? '' : ' 🔒'}</button>`;
  }).join('') + '</div></div>').join('');
  $('levelsBody').querySelectorAll('.lvb:not([disabled])').forEach((b) => b.addEventListener('click', () => { $('levelsLayer').hidden = true; startLevel(b.dataset.id); }));
}
const persist = () => { mathSave = { ...(mathSave || {}), fruit: save.fruit, fruitCur: save.cur }; return store.set('math', mathSave); };
let mathSave = null;

/* ---------------- 操作 ---------------- */
const box = $('box');
box.addEventListener('pointermove', (e) => { const r = box.getBoundingClientRect(); aimX = e.clientX - r.left; });
box.addEventListener('pointerdown', (e) => { const r = box.getBoundingClientRect(); aimX = e.clientX - r.left; audioInit(); drop(); });
window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') drop(); if (e.key === 'ArrowLeft') aimX -= 20; if (e.key === 'ArrowRight') aimX += 20; });
$('levelsBtn').onclick = () => { renderLevels(); $('levelsLayer').hidden = false; };
$('levelsClose').onclick = () => ($('levelsLayer').hidden = true);
$('restartBtn').onclick = () => startLevel(level.id);
$('nextBtn').onclick = () => { if (STAGE) { location.href = Q.get('ret') || 'map.html'; return; } $('doneLayer').hidden = true; startLevel(nextLevel().id); };
$('againBtn').onclick = () => { $('doneLayer').hidden = true; startLevel(level.id); };
window.addEventListener('resize', () => { if (level) startLevel(level.id); });
$('goBtn').onclick = async () => { $('startLayer').hidden = true; await audioInit(); say('../audio/voice/ui/f_hello.mp3'); };

(async () => {
  mathSave = await store.get('math', {});
  save.fruit = mathSave.fruit || {}; save.cur = mathSave.fruitCur || 'c3'; save.all = mathSave.all;
  if (STAGE) {   // 地图上的一关：只玩这一局
    LEVELS.unshift({ id: 'stage', name: Q.get('name') || '水果合成', mode: 'target', t: +Q.get('t'), pool: Q.get('pool').split(',').map(Number), goal: +Q.get('goal') || 5 });
    $('levelsBtn').hidden = true; $('backBtn').onclick = () => (location.href = Q.get('ret') || 'map.html');
  }
  startLevel(STAGE ? 'stage' : save.cur);
  requestAnimationFrame(frame);
  if (TEST) setInterval(() => engine && step(), DT);   // 测试用：窗口在后台也继续算
})();
