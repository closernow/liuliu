// 声音：乐器循环、歌手唱字、语音提示、闪避。
// 所有声音卡同一个节拍：110 拍/分钟，32 个十六分音符一个循环。
let ctx = null, band, voice, master, t0 = 0;
let BPM = 110, STEPS = 32, S16 = 60 / BPM / 4, LOOP = STEPS * S16;
let onsets = {};
const cache = new Map();          // url -> AudioBuffer
const leads = new Map();          // url -> 开头静音长度（秒）

export const beat = () => 60 / BPM;
export const loopLen = () => LOOP;
export const now = () => (ctx ? ctx.currentTime : 0);
export const phase = () => (ctx ? (((ctx.currentTime - t0) % LOOP) + LOOP) % LOOP : 0);

export async function init() {
  if (ctx) { if (ctx.state === 'suspended') await ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  band = ctx.createGain(); band.gain.value = 0.75; band.connect(master);
  voice = ctx.createGain(); voice.gain.value = 1; voice.connect(master);
  const info = await (await fetch('audio/loops/onsets.json')).json();
  BPM = info.bpm; STEPS = info.steps; S16 = 60 / BPM / 4; LOOP = STEPS * S16; onsets = info.onsets;
  t0 = ctx.currentTime + 0.05;
  requestAnimationFrame(tick);
}

export async function load(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const ab = await (await fetch(url)).arrayBuffer();
    const buf = await new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); });
    // 找到第一个有声音的位置，唱字时从那里开始，才能卡在拍子上
    const d = buf.getChannelData(0); let i = 0;
    while (i < d.length && Math.abs(d[i]) < 0.02) i++;
    leads.set(url, Math.max(0, i / buf.sampleRate - 0.01));
    return buf;
  })();
  cache.set(url, p);
  return p;
}
export const preload = (urls) => Promise.all(urls.map((u) => load(u).catch(() => null)));

/* ---------- 乐器循环 ---------- */
const loops = new Map();           // slot -> {src, g}
export async function startLoop(slot, url, muted) {
  stopLoop(slot);
  const buf = await load(url);
  const at = ctx.currentTime + 0.03;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(muted ? 0 : 0.8, at, 0.02);
  src.connect(g).connect(band);
  src.start(at, (((at - t0) % LOOP) + LOOP) % LOOP);
  loops.set(slot, { src, g });
}
export function stopLoop(slot) {
  const n = loops.get(slot); if (!n) return;
  const t = ctx.currentTime; n.g.gain.setTargetAtTime(0, t, 0.02); n.src.stop(t + 0.15); loops.delete(slot);
}
export function muteLoop(slot, muted) {
  const n = loops.get(slot); if (n) n.g.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.03);
}
export const onsetsOf = (name) => onsets[name] || [];

/* ---------- 歌手：每个位置在自己的拍子上唱 ---------- */
const VSLOT = [0, 4, 8, 12, 2, 6, 10];
const RATE = [1, 1.06, 0.95, 1.12];
let singers = {};                  // slot -> {url, muted}
let onStep = () => {};
export function setSinger(slot, url, muted) { if (url) singers[slot] = { url, muted }; else delete singers[slot]; }
export function onStepCallback(fn) { onStep = fn; }

let nextStep = 0, stepIdx = 0;
function tick() {
  requestAnimationFrame(tick);
  if (!ctx) return;
  if (nextStep < ctx.currentTime) {          // 刚开始或后台回来：对齐到下一个十六分音符
    const k = Math.ceil((ctx.currentTime - t0) / S16);
    nextStep = t0 + k * S16; stepIdx = k;
  }
  while (nextStep < ctx.currentTime + 0.12) {
    const st = ((stepIdx % STEPS) + STEPS) % STEPS, t = nextStep;
    for (const [slot, s] of Object.entries(singers)) {
      if (s.muted || st % 16 !== VSLOT[slot]) continue;
      playAt(s.url, t, band, RATE[(stepIdx / 16 | 0) % RATE.length]);
    }
    const ms = Math.max(0, (t - ctx.currentTime) * 1000);
    setTimeout(() => onStep(st), ms);
    nextStep += S16; stepIdx++;
  }
}
async function playAt(url, t, dest, rate = 1) {
  const buf = await load(url);
  if (t < ctx.currentTime) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = 0.95;
  src.connect(g).connect(dest); src.start(t, leads.get(url) || 0);
}

/* ---------- 语音：读的时候乐队降到两成，读完恢复 ---------- */
let duckUntil = 0, sayChain = Promise.resolve();
export function say(urls) {
  if (!ctx) return Promise.resolve();
  const list = Array.isArray(urls) ? urls : [urls];
  sayChain = sayChain.then(async () => {
    for (const url of list) {
      let buf; try { buf = await Promise.race([load(url), new Promise((_, rej) => setTimeout(rej, 3000))]); } catch { continue; }
      const at = ctx.currentTime + 0.05, off = leads.get(url) || 0, dur = buf.duration - off;
      duck(at, at + dur + 0.15);
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(voice); src.start(at, off);
      await new Promise((r) => setTimeout(r, (dur + 0.1) * 1000));
    }
  });
  return sayChain;
}
function duck(from, to) {
  band.gain.cancelScheduledValues(ctx.currentTime);
  band.gain.setTargetAtTime(0.75 * 0.2, from, 0.04);
  duckUntil = Math.max(duckUntil, to);
  band.gain.setTargetAtTime(0.75, duckUntil, 0.12);
}

/* ---------- 进化音效：现场合成 ---------- */
export function whoosh() {
  if (!ctx) return;
  const t = ctx.currentTime, n = ctx.sampleRate * 1.2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
  const src = ctx.createBufferSource(); src.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + 1.1);
  const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(f).connect(g).connect(master); src.start(t);
  [72, 76, 79, 84].forEach((m, i) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle';
    o.frequency.value = 440 * 2 ** ((m - 69) / 12);
    og.gain.setValueAtTime(0, t + 0.9 + i * 0.08); og.gain.linearRampToValueAtTime(0.2, t + 0.92 + i * 0.08); og.gain.exponentialRampToValueAtTime(0.001, t + 1.8 + i * 0.08);
    o.connect(og).connect(master); o.start(t + 0.9 + i * 0.08); o.stop(t + 2);
  });
}
