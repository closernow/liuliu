// 数学闯关公用：读音（按文字查 audio/voice/m/index.json）、提示音、存档、小工具
import * as store from '../store.js';

export const $ = (id) => document.getElementById(id);
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rint(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* ---------- 读音 ---------- */
let ac = null, phrases = {}, index = {}, cur = null, gen = 0;
const bufs = new Map();
export async function loadVoice() {
  [phrases, index] = await Promise.all([
    fetch('../content/math_voice.json').then((r) => r.json()),
    fetch('../audio/voice/m/index.json').then((r) => r.json()).catch(() => ({})),
  ]);
}
export function audio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function buf(text) {
  const f = index[text]; if (!f) return Promise.resolve(null);
  if (!bufs.has(f)) bufs.set(f, fetch(`../audio/voice/m/${f}`).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => { const q = audio().decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); })).catch(() => null));
  return bufs.get(f);
}
// say('q_count') 读短句；say('n5', 'q_split_a', 'n2') 连着读；直接给文字也行。返回读完的 Promise
export function say(...keys) {
  audio(); const my = ++gen; if (cur) try { cur.stop(); } catch {}
  return (async () => {
    for (const k of keys.flat()) {
      if (my !== gen) return;
      const b = await buf(phrases[k] || k); if (!b || my !== gen) continue;
      const s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(); cur = s;
      await new Promise((r) => (s.onended = r));
    }
  })();
}
export const num = (n) => 'n' + n;
export function stopVoice() { gen++; if (cur) try { cur.stop(); } catch {} }
document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); });
window.addEventListener('blur', () => ac && ac.suspend());
window.addEventListener('focus', () => ac && ac.resume());

/* ---------- 提示音 ---------- */
export function tone(f, d = 0.15, type = 'triangle', vol = 0.15) {
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d);
}
export const sfx = {
  tap() { tone(660 + Math.random() * 200, 0.08); },
  ok() { tone(523, 0.25); setTimeout(() => tone(784, 0.35), 110); },
  no() { tone(300, 0.25, 'triangle', 0.12); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3), i * 120)); },
};

/* ---------- 存档：math.stages[关号] = 星星 ---------- */
export async function getSave() { const m = await store.get('math', {}); m.stages = m.stages || {}; return m; }
export async function setStars(id, st) { const m = await getSave(); if ((m.stages[id] || 0) < st) m.stages[id] = st; await store.set('math', m); return m; }
