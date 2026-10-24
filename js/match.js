// 溜溜消消乐（语文）：正宗消消乐的玩法和特效，方块是这一课的生字。
// 交换相邻两块，三个一样连成一排就消掉，消掉时读这个字。
// 特殊块：连 4 火箭、L / T 形炸弹、连 5 彩虹球、2×2 方块小鱼（游过去吃掉一格），特殊块互换有组合大招。
// 障碍：糖霜（一到三层）、木箱、锁链、会蔓延的巧克力；玩法：收集字、运送小鸡；棋盘可以有空洞，方块会斜着滑下去补位。
// 魔法瓶攒满后，把能组成课本词语的两个字换到一起，放"组词魔法"：这两个字全部消掉，读出词语。三个字以上的词连成一排有惊喜。
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hex = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).join('-');
const key = (r, c) => r * 100 + c;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ================= 数据 ================= */
let data, lesson, lvIdx = 0, L, N = 8, M = 8, use = [], words = [];
let tiles = [], hole = [], ice = [], crate = [], lock = [], mud = [];
let moves = 0, score = 0, combo = 0, busy = false, done = false, goals = [], magic = 0, magicMax = 30, mudHit = false, mudIdle = 0;
let save = { levels: {} };
const COLORS = ['#ff5a6a', '#ffa63a', '#ffd23a', '#4cc96a', '#4a9aff', '#b56aff'];
const SHAPES = ['circle', 'square', 'hex', 'diamond', 'oct', 'drop'];
const CH = (k) => lesson.chars[use[k]];   // 第 k 种方块是哪个字 [字, 拼音]
const CHICK = -1;                        // 小鸡：不能消，只能往下送

/* ================= 画布 ================= */
const cv = $('board'), ctx = cv.getContext('2d');
let CS = 64, dpr = 1, W = 0, H = 0;
function layout() {
  const wrap = $('boardWrap'), size = Math.min(wrap.clientWidth, wrap.clientHeight);
  CS = Math.floor(size / Math.max(N, M)); dpr = window.devicePixelRatio || 1;
  W = CS * M; H = CS * N; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  sprites = {};
}
window.addEventListener('resize', () => { if (L) layout(); });
new ResizeObserver(() => { if (L) { const s = Math.floor(Math.min($('boardWrap').clientWidth, $('boardWrap').clientHeight) / Math.max(N, M)); if (s !== CS) layout(); } }).observe($('boardWrap'));

/* ---------- 方块画法：糖果一样的亮色底，每个字一种颜色和形状，中间是大字，上面一行小拼音 ---------- */
let sprites = {};
function shapePath(g, shape, r) {
  g.beginPath();
  const poly = (n, rot = 0, rr = r) => { for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); };
  if (shape === 'circle') g.arc(0, 0, r, 0, Math.PI * 2);
  else if (shape === 'square') g.roundRect(-r * .9, -r * .9, r * 1.8, r * 1.8, r * .35);
  else if (shape === 'hex') poly(6, Math.PI / 6, r * 1.02);
  else if (shape === 'diamond') { g.moveTo(0, -r * 1.05); g.quadraticCurveTo(r * .2, -r * .2, r * 1.05, 0); g.quadraticCurveTo(r * .2, r * .2, 0, r * 1.05); g.quadraticCurveTo(-r * .2, r * .2, -r * 1.05, 0); g.quadraticCurveTo(-r * .2, -r * .2, 0, -r * 1.05); g.closePath(); }
  else if (shape === 'oct') poly(8, Math.PI / 8, r * 1.02);
  else { g.moveTo(0, -r * 1.05); g.bezierCurveTo(r * .9, -r * .2, r * 1.0, r * .95, 0, r * .95); g.bezierCurveTo(-r * 1.0, r * .95, -r * .9, -r * .2, 0, -r * 1.05); g.closePath(); }
}
function shade(col, k) { const n = parseInt(col.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function sprite(k, sp) {
  const id = k + '|' + (sp || ''); if (sprites[id]) return sprites[id];
  const s = Math.round(CS * dpr), c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
  g.translate(s / 2, s / 2); const r = s * 0.42;
  if (sp === 'rainbow') {   // 彩虹球：七彩的圆球，转着发光
    const gr = g.createConicGradient(0, 0, 0); [...COLORS, COLORS[0]].forEach((cl, i) => gr.addColorStop(i / 6, cl));
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * (.3 + (i % 3) * .2); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * .07, 0, 7); g.fill(); }
    g.lineWidth = s * .03; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    return (sprites[id] = c);
  }
  if (k === CHICK) {   // 小鸡：圆圆的黄底
    const gr = g.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.2); gr.addColorStop(0, '#fff8c0'); gr.addColorStop(1, '#ffc83a');
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.lineWidth = s * .03; g.strokeStyle = '#e09a10'; g.stroke();
    g.font = `${s * .55}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐣', 0, s * .03);
    return (sprites[id] = c);
  }
  const col = COLORS[k], ch = CH(k);
  g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = s * .06; g.shadowOffsetY = s * .04;
  shapePath(g, SHAPES[k], r); const gr = g.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.2); gr.addColorStop(0, shade(col, 1.35)); gr.addColorStop(.6, col); gr.addColorStop(1, shade(col, .7)); g.fillStyle = gr; g.fill();
  g.restore();
  g.lineWidth = s * .025; g.strokeStyle = shade(col, .6); shapePath(g, SHAPES[k], r); g.stroke();
  g.save(); shapePath(g, SHAPES[k], r); g.clip(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * .25, -r * .55, r * .6, r * .28, -.3, 0, Math.PI * 2); g.fill(); g.restore();
  // 特殊块的花纹
  if (sp === 'rowRocket' || sp === 'colRocket') {
    g.save(); shapePath(g, SHAPES[k], r); g.clip(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = s * .07;
    for (let i = -3; i <= 3; i++) { g.beginPath(); if (sp === 'rowRocket') { g.moveTo(-r, i * r * .32); g.lineTo(r, i * r * .32); } else { g.moveTo(i * r * .32, -r); g.lineTo(i * r * .32, r); } g.stroke(); }
    g.restore();
    g.fillStyle = '#fff'; g.font = `900 ${s * .2}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sp === 'rowRocket') { g.fillText('◀', -r * .78, 0); g.fillText('▶', r * .78, 0); } else { g.fillText('▲', 0, -r * .78); g.fillText('▼', 0, r * .78); }
  }
  if (sp === 'bomb') { g.lineWidth = s * .06; g.strokeStyle = '#fff'; g.setLineDash([s * .06, s * .05]); shapePath(g, SHAPES[k], r * .88); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(r * .62, -r * .7, s * .06, 0, 7); g.fill(); }
  if (sp === 'fish') { g.font = `${s * .3}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐟', r * .55, r * .55); }
  // 字和拼音
  g.fillStyle = '#fff'; g.strokeStyle = shade(col, .45); g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${s * .42}px "KaiTi","STKaiti","Kaiti SC","Microsoft YaHei",serif`; g.lineWidth = s * .05; g.strokeText(ch[0], 0, s * .06); g.fillText(ch[0], 0, s * .06);
  g.font = `800 ${s * .13}px "Andika","Segoe UI",sans-serif`; g.lineWidth = s * .03; g.strokeText(ch[1], 0, -r * .62); g.fillText(ch[1], 0, -r * .62);
  return (sprites[id] = c);
}

/* ================= 声音 ================= */
let ac = null, music = null;
const cache = new Map();
function audio() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
function load(url) { if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => { const q = audio().decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); })).catch(() => null)); return cache.get(url); }
let voiceSrc = null;
async function voice(url, force = false) {
  const b = await load(url); if (!b) return;
  if (voiceSrc && !force) return;   // 正在读就不打断（连锁时只读第一个）
  if (voiceSrc) try { voiceSrc.stop(); } catch {}
  const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = 1.1; s.connect(g).connect(ac.destination); s.start(); voiceSrc = s;
  if (music) music.gain.setTargetAtTime(0.04, ac.currentTime, 0.05);
  s.onended = () => { if (voiceSrc === s) voiceSrc = null; if (music) music.gain.setTargetAtTime(0.13, ac.currentTime, 0.2); };
}
const sayChar = (k, force = false) => k >= 0 && voice(`audio/voice/z/${hex(CH(k)[0])}.mp3`, force);
const sayWord = (w) => voice(`audio/voice/w/${hex(w)}.mp3`, true);
const sayUi = (k, force = true) => voice(`audio/voice/ui/${k}.mp3`, force);
async function startMusic() {
  if (music) return; audio(); music = ac.createGain(); music.gain.value = 0.13; music.connect(ac.destination);
  const t0 = ac.currentTime + 0.1;
  for (const n of ['marimba', 'bells', 'shaker', 'bass', 'kick']) { const b = await load(`audio/loops/sj/${n}.flac`); if (!b) continue; const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(music); s.start(t0); }
}
function tone(f, d = 0.12, type = 'triangle', vol = 0.15, slide = 0, when = 0) {
  if (!ac) return; const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
}
function noise(d, f0, f1, vol = 0.2) {
  if (!ac) return; const n = ac.sampleRate * d, b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, ac.currentTime); f.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + d);
  const g = ac.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(ac.destination); s.start();
}
const sfx = {
  pop(c) { const base = 520 * Math.pow(1.122, Math.min(12, c)); tone(base, 0.12, 'sine', 0.18); tone(base * 1.5, 0.1, 'triangle', 0.08, 0, 0.03); },
  swap() { tone(440, 0.06, 'triangle', 0.08, 660); },
  bad() { tone(300, 0.12, 'triangle', 0.12, 200); setTimeout(() => tone(300, 0.12, 'triangle', 0.1, 220), 120); },
  land() { tone(180 + Math.random() * 60, 0.05, 'sine', 0.05); },
  rocket() { noise(0.45, 400, 4000, 0.25); tone(300, 0.4, 'sawtooth', 0.05, 1500); },
  boom() { noise(0.6, 900, 80, 0.4); tone(110, 0.5, 'sine', 0.35, 40); },
  rainbow() { [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => tone(660 * Math.pow(1.122, i), 0.25, 'sine', 0.1, 0, i * 0.05)); },
  magic() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, 0, i * 0.07)); noise(1.2, 3000, 8000, 0.08); },
  special() { tone(880, 0.2, 'triangle', 0.12, 1760); },
  fish() { tone(500, 0.3, 'sine', 0.12, 1200); tone(900, 0.15, 'sine', 0.08, 400, 0.25); },
  chain() { noise(0.15, 3000, 1500, 0.2); tone(1200, 0.08, 'square', 0.04); },
  crack() { noise(0.12, 2500, 5000, 0.18); },
  mud() { tone(140, 0.25, 'sine', 0.15, 90); },
  chick() { [1046, 1318, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, i * 0.08)); },
  win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, 0, i * 0.12)); },
};
document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); });
window.addEventListener('blur', () => ac && ac.suspend());
window.addEventListener('focus', () => ac && ac.resume());

/* ================= 动画小工具 ================= */
let tweens = [], parts = [], fx = [], texts = [], shake = 0, dying = [];
function tween(o, props, dur, ease = (t) => 1 - Math.pow(1 - t, 3)) {
  return new Promise((res) => { const from = {}; for (const k in props) from[k] = o[k]; tweens.push({ o, props, from, t0: performance.now(), dur, ease, res }); });
}
let uid = 1;
function newTile(k, r, c, sp = null) { return { k, sp, r, c, x: c, y: r, vy: 0, s: 1, a: 1, id: uid++ }; }
const settled = () => tweens.length === 0 && tiles.every((row) => row.every((t) => !t || (Math.abs(t.y - t.r) < 0.001 && Math.abs(t.x - t.c) < 0.01 && t.vy === 0)));
async function waitSettle() { while (!settled()) await sleep(16); }
const cx = (c) => (c + 0.5) * CS, cy = (r) => (r + 0.5) * CS;

/* ================= 格子 ================= */
const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < M;
const fillable = (r, c) => inside(r, c) && !hole[r][c] && !crate[r][c] && !mud[r][c];     // 能放方块的格子
const movable = (r, c) => fillable(r, c) && tiles[r][c] && !lock[r][c];                   // 能动（能掉、能换）的方块
const isSource = (r, c) => { for (let rr = r - 1; rr >= 0; rr--) if (!hole[rr][c]) return false; return true; };   // 新方块从这里出来
const isExit = (r, c) => { for (let rr = r + 1; rr < N; rr++) if (!hole[rr][c]) return false; return true; };     // 小鸡从这里出去
const chicksOnBoard = () => tiles.flat().filter((t) => t && t.k === CHICK).length;
function randKind() { return rint(0, use.length - 1); }

/* ================= 关卡 ================= */
async function startLevel(li, i) {
  lesson = data.lessons[li]; lvIdx = i; L = lesson.levels[i]; N = L.board.length; M = L.board[0].length;
  use = L.use || [...Array(L.kinds).keys()];
  const has = (w) => [...w].every((ch) => use.some((u) => lesson.chars[u][0] === ch));
  words = lesson.words.filter(has);
  tiles = []; hole = []; ice = []; crate = []; lock = []; mud = [];
  for (let r = 0; r < N; r++) {
    tiles.push([]); hole.push([]); ice.push([]); crate.push([]); lock.push([]); mud.push([]);
    for (let c = 0; c < M; c++) { const ch = L.board[r][c]; hole[r][c] = ch === '#'; ice[r][c] = { i: 1, I: 2, J: 3 }[ch] || 0; crate[r][c] = ch === 'c' ? 2 : 0; lock[r][c] = ch === 'L' ? 1 : 0; mud[r][c] = ch === 'm' ? 1 : 0; tiles[r][c] = null; }
  }
  // 开局不要现成的三连
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
    if (!fillable(r, c)) continue;
    let t;
    if (L.board[r][c] === 'd') t = newTile(CHICK, r, c);
    else { let k; do { k = randKind(); } while ((c >= 2 && tiles[r][c - 1]?.k === k && tiles[r][c - 2]?.k === k) || (r >= 2 && tiles[r - 1][c]?.k === k && tiles[r - 2][c]?.k === k)); t = newTile(k, r, c); }
    t.y = r - N - 1 - Math.random() * 2; tiles[r][c] = t;
  }
  moves = L.moves; score = 0; combo = 0; done = false; magic = 0; mudIdle = 0; parts = []; fx = []; texts = []; dying = [];
  goals = L.goals.map((g) => ({ ...g, left: { collect: g.n, word: g.n, drop: g.n, ice: countIce(), crate: countOf(crate), lock: countOf(lock), mud: countOf(mud) }[g.type] }));
  $('lvName').textContent = `第 ${lesson.id} 课 ${lesson.title} · 第 ${i + 1} 关`;
  $('magic').style.display = words.some((w) => w.length === 2) ? '' : 'none';   // 这一关没有两个字的词就不要魔法瓶
  renderGoals(); renderHud(); renderLegend();
  layout();   // 左右的卡片填好了再算棋盘多大
  busy = true; await waitSettle(); busy = false;
  if (!hasMove()) await shuffle();
  idleT = performance.now();
}
const countIce = () => ice.flat().reduce((a, b) => a + b, 0);
const countOf = (layer) => layer.flat().filter((v) => v > 0).length;

/* ---------- 界面：目标、步数、分数、魔法瓶、这一课的字 ---------- */
const GOAL_ICON = { ice: ['🧊', '糖霜'], crate: ['📦', '木箱'], word: ['✨', '组词魔法'], lock: ['⛓️', '锁链'], mud: ['🍫', '巧克力'], drop: ['🐣', '送小鸡'] };
function renderGoals() {
  $('goals').innerHTML = goals.map((g, i) => {
    let icon, label = '';
    if (g.type === 'collect') { const k = use.findIndex((u) => lesson.chars[u][0] === g.ch); icon = `<span class="gch" style="background:${COLORS[k]}"><small>${CH(k)[1]}</small>${g.ch}</span>`; }
    else { icon = `<span class="gico">${GOAL_ICON[g.type][0]}</span>`; label = GOAL_ICON[g.type][1]; }
    return `<div class="goal${g.left <= 0 ? ' ok' : ''}" id="goal${i}">${icon}<b>${g.left <= 0 ? '✔' : g.left}</b><em>${label}</em></div>`;
  }).join('');
}
function renderHud() {
  $('moves').textContent = moves; $('score').textContent = score;
  const [s1, s2, s3] = L.stars; $('scoreBar').style.width = Math.min(100, score / s3 * 100) + '%';
  $('st1').style.left = s1 / s3 * 100 + '%'; $('st2').style.left = s2 / s3 * 100 + '%';
  ['st1', 'st2', 'st3'].forEach((id, i) => $(id).classList.toggle('on', score >= L.stars[i]));
  $('magicFill').style.height = Math.min(100, magic / magicMax * 100) + '%'; $('magic').classList.toggle('full', magic >= magicMax);
}
function renderLegend() {
  $('legend').innerHTML = use.map((u, k) => `<button class="lg" data-k="${k}" style="background:${COLORS[k]}"><small>${lesson.chars[u][1]}</small>${lesson.chars[u][0]}</button>`).join('')
    + `<div class="words">${words.map((w) => `<button class="wd" data-w="${w}">${w}</button>`).join('')}</div>`;
  $('legend').querySelectorAll('.lg').forEach((b) => (b.onclick = () => { audio(); sayChar(+b.dataset.k, true); }));
  $('legend').querySelectorAll('.wd').forEach((b) => (b.onclick = () => { audio(); sayWord(b.dataset.w); }));
}
function goalHit(type, ch, n = 1, fromX, fromY, k = -2) {
  goals.forEach((g, i) => {
    if (g.left <= 0 || g.type !== type || (type === 'collect' && g.ch !== ch)) return;
    g.left = Math.max(0, g.left - n);
    if (fromX !== undefined) flyTo(i, fromX, fromY, k);
    else renderGoals();
  });
}
// 收集到的东西飞向左边的目标（页面上的小方块，能飞出棋盘）
function flyTo(i, x, y, k) {
  const el = $('goal' + i); if (!el) return; const br = cv.getBoundingClientRect(), er = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'flyer';
  if (k >= 0) { f.style.background = COLORS[k]; f.textContent = CH(k)[0]; } else { f.style.background = 'rgba(255,255,255,.85)'; f.textContent = GOAL_ICON[goals[i].type]?.[0] || ''; f.style.fontSize = '28px'; }
  f.style.left = br.left + x + 'px'; f.style.top = br.top + y + 'px'; document.body.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = er.left + er.width / 2 + 'px'; f.style.top = er.top + er.height / 2 + 'px'; f.style.transform = 'translate(-50%,-50%) scale(.6)'; }));
  setTimeout(() => { f.remove(); renderGoals(); const g = $('goal' + i); if (g) { g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump'); } }, 650);
}

/* ================= 规则 ================= */
const matchable = (t) => t && t.k >= 0 && t.sp !== 'rainbow';
// 找出所有三连以上：横的、竖的
function findRuns() {
  const runs = [];
  for (let r = 0; r < N; r++) { let c = 0; while (c < M) { const t = tiles[r][c]; if (!matchable(t)) { c++; continue; } let e = c + 1; while (e < M && matchable(tiles[r][e]) && tiles[r][e].k === t.k) e++; if (e - c >= 3) runs.push({ dir: 'h', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]), k: t.k }); c = e; } }
  for (let c = 0; c < M; c++) { let r = 0; while (r < N) { const t = tiles[r][c]; if (!matchable(t)) { r++; continue; } let e = r + 1; while (e < N && matchable(tiles[e][c]) && tiles[e][c].k === t.k) e++; if (e - r >= 3) runs.push({ dir: 'v', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]), k: t.k }); r = e; } }
  return runs;
}
// 2×2 一样的方块：变出小鱼
function findSquares(taken) {
  const out = [];
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < M - 1; c++) {
    const cs = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]], t = tiles[r][c];
    if (!matchable(t) || !cs.every(([a, b]) => matchable(tiles[a][b]) && tiles[a][b].k === t.k && !tiles[a][b].sp)) continue;
    if (cs.some(([a, b]) => taken.has(key(a, b)))) continue;
    cs.forEach(([a, b]) => taken.add(key(a, b))); out.push({ cells: cs, k: t.k });
  }
  return out;
}
// 三个字以上的词语连成一排（从左到右或从上到下）
function findWordLines() {
  const out = [];
  for (const w of words.filter((w) => w.length >= 3)) {
    const ks = [...w].map((ch) => use.findIndex((u) => lesson.chars[u][0] === ch)), n = ks.length;
    for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
      if (c + n <= M && ks.every((k, i) => tiles[r][c + i] && !tiles[r][c + i].sp && tiles[r][c + i].k === k)) out.push({ w, cells: ks.map((_, i) => [r, c + i]) });
      if (r + n <= N && ks.every((k, i) => tiles[r + i][c] && !tiles[r + i][c].sp && tiles[r + i][c].k === k)) out.push({ w, cells: ks.map((_, i) => [r + i, c]) });
    }
  }
  return out;
}
const wordOf = (a, b) => a.k >= 0 && b.k >= 0 && words.find((w) => w.length === 2 && ((w[0] === CH(a.k)[0] && w[1] === CH(b.k)[0]) || (w[1] === CH(a.k)[0] && w[0] === CH(b.k)[0])));
function wouldMatch(r1, c1, r2, c2) {
  if (!movable(r1, c1) || !movable(r2, c2)) return false;
  const a = tiles[r1][c1], b = tiles[r2][c2];
  if (a.sp && b.sp) return true;
  if ((a.sp === 'rainbow' && b.k >= 0) || (b.sp === 'rainbow' && a.k >= 0)) return true;
  tiles[r1][c1] = b; tiles[r2][c2] = a;
  const ok = findRuns().length > 0 || findSquares(new Set()).length > 0;
  tiles[r1][c1] = a; tiles[r2][c2] = b; return ok;
}
function findMove() {
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) { const r2 = r + dr, c2 = c + dc; if (inside(r2, c2) && wouldMatch(r, c, r2, c2)) return [[r, c], [r2, c2]]; }
  return null;
}
const hasMove = () => !!findMove();
async function shuffle() {
  texts.push({ txt: '打乱一下！', x: W / 2, y: H / 2, t0: performance.now(), col: '#fff', big: 1 });
  let tries = 0;
  do {
    const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) if (movable(r, c) && tiles[r][c].k >= 0 && !tiles[r][c].sp) cells.push(tiles[r][c]);
    const ks = cells.map((t) => t.k); for (let i = ks.length - 1; i > 0; i--) { const j = rint(0, i); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    cells.forEach((t, i) => (t.k = ks[i]));
  } while ((findRuns().length || !hasMove()) && tries++ < 60);
  for (const t of tiles.flat()) if (t) { t.s = 0.2; tween(t, { s: 1 }, 400); }
  await waitSettle();
}

/* ---------- 交换 ---------- */
async function trySwap(r1, c1, r2, c2) {
  if (busy || done || !inside(r2, c2) || !movable(r1, c1) || !movable(r2, c2)) {
    if (!busy && inside(r1, c1) && lock[r1][c1]) { sfx.chain(); texts.push({ txt: '锁住了', x: cx(c1), y: cy(r1), t0: performance.now(), col: '#ddd', big: .6 }); }
    return;
  }
  busy = true; idleT = Infinity; hintMove = null; mudHit = false;
  const a = tiles[r1][c1], b = tiles[r2][c2];
  sfx.swap();
  const doSwap = () => { tiles[r1][c1] = b; tiles[r2][c2] = a; a.r = r2; a.c = c2; b.r = r1; b.c = c1; return Promise.all([tween(a, { x: c2, y: r2 }, 160), tween(b, { x: c1, y: r1 }, 160)]); };
  await doSwap();
  combo = 0;
  const w = !a.sp && !b.sp && magic >= magicMax ? wordOf(a, b) : null;
  if (w) { moves--; renderHud(); await wordMagic(w, a, b); }
  else if ((a.sp && b.sp) || (a.sp === 'rainbow' && b.k >= 0) || (b.sp === 'rainbow' && a.k >= 0)) { moves--; renderHud(); await specialSwap(a, b); }
  else if (findRuns().length || findSquares(new Set()).length) { moves--; renderHud(); await resolve([[r2, c2], [r1, c1]]); }
  else { sfx.bad(); await doSwap(); busy = false; idleT = performance.now(); return; }
  await afterMove();
}
async function afterMove() {
  await waitSettle();
  // 巧克力：连着两步一块都没消到，就往旁边长一格（原版是一步，对一年级太快）
  mudIdle = mudHit ? 0 : mudIdle + 1;
  if (mudIdle >= 2 && countOf(mud) > 0 && !goals.every((g) => g.left <= 0)) { mudIdle = 0; await growMud(); }
  if (!hasMove()) await shuffle();
  renderGoals(); renderHud();
  if (goals.every((g) => g.left <= 0)) return win();
  if (moves <= 0) { busy = true; await outOfMoves(); }
  busy = false; idleT = performance.now();
}
async function growMud() {
  const cand = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) if (mud[r][c]) for (const [dr, dc] of D4) { const r2 = r + dr, c2 = c + dc; const t = inside(r2, c2) && tiles[r2][c2]; if (t && fillable(r2, c2) && t.k >= 0 && !t.sp && !lock[r2][c2]) cand.push([r2, c2]); }
  if (!cand.length) return;
  const [r, c] = pick(cand), t = tiles[r][c];
  tiles[r][c] = null; dying.push(t); tween(t, { s: 0, a: 0 }, 300); mud[r][c] = 1; sfx.mud();
  texts.push({ txt: '巧克力长出来了', x: cx(c), y: cy(r), t0: performance.now(), col: '#e8b080', big: .6 });
  const g = goals.find((g) => g.type === 'mud'); if (g) g.left++;
  await sleep(350);
}

/* ---------- 消除、连锁 ---------- */
async function resolve(swapCells = []) {
  while (true) {
    const runs = findRuns(), lines = findWordLines();
    const taken = new Set(); runs.forEach((ru) => ru.cells.forEach(([r, c]) => taken.add(key(r, c))));
    const squares = findSquares(taken);
    if (!runs.length && !lines.length && !squares.length) break;
    combo++;
    const clear = new Map(), spawns = [];
    // 三个字以上的词语连成一排：读出来，额外加分
    for (const ln of lines) { const mid = ln.cells[Math.floor(ln.cells.length / 2)]; ln.cells.forEach(([r, c]) => clear.set(key(r, c), [r, c])); texts.push({ txt: `「${ln.w}」`, x: cx(mid[1]), y: cy(mid[0]), t0: performance.now(), col: '#ffe14a', big: 1.3 }); sayWord(ln.w); score += Math.round(500 * ln.w.length / 3); burstStars(cx(mid[1]), cy(mid[0])); }
    // 特殊块：L / T 形出炸弹，连 4 出火箭，连 5 出彩虹球，2×2 出小鱼
    const inH = new Map(), inV = new Map(); runs.forEach((ru) => ru.cells.forEach(([r, c]) => (ru.dir === 'h' ? inH : inV).set(key(r, c), ru)));
    const used = new Set();
    for (const [kk, ru] of inH) if (inV.has(kk) && !used.has(ru) && !used.has(inV.get(kk))) { used.add(ru); used.add(inV.get(kk)); spawns.push({ r: Math.floor(kk / 100), c: kk % 100, k: ru.k, sp: ru.cells.length >= 5 || inV.get(kk).cells.length >= 5 ? 'rainbow' : 'bomb' }); }
    const atSwap = (cells) => cells.find(([r, c]) => swapCells.some(([sr, sc]) => sr === r && sc === c));
    for (const ru of runs) {
      ru.cells.forEach(([r, c]) => clear.set(key(r, c), [r, c]));
      if (used.has(ru) || ru.cells.length < 4) continue;
      const at = atSwap(ru.cells) || ru.cells[Math.floor(ru.cells.length / 2)];
      spawns.push({ r: at[0], c: at[1], k: ru.k, sp: ru.cells.length >= 5 ? 'rainbow' : ru.dir === 'h' ? 'rowRocket' : 'colRocket' });
    }
    for (const sq of squares) { sq.cells.forEach(([r, c]) => clear.set(key(r, c), [r, c])); const at = atSwap(sq.cells) || sq.cells[0]; spawns.push({ r: at[0], c: at[1], k: sq.k, sp: 'fish' }); }
    const firstK = runs[0]?.k ?? squares[0]?.k; if (firstK !== undefined) sayChar(firstK);
    await blast(clear, spawns);
    swapCells = [];
    comboText();
    await gravity();
  }
}
function comboText() {
  if (combo < 2) return;
  const t = combo >= 5 ? ['超级无敌！', 'x_amazing'] : combo === 4 ? ['无敌啦！', 'x_super'] : combo === 3 ? ['太厉害了！', 'x_great'] : ['好棒！', 'x_good'];
  texts.push({ txt: t[0], x: W / 2, y: H * 0.42, t0: performance.now(), col: ['#ffe14a', '#7dff9a', '#7ad8ff', '#ff9ad8'][combo % 4], big: 1.2 + Math.min(combo, 6) * 0.1 });
  sayUi(t[1]);
}
// 小鱼找目标：先找目标要的东西（巧克力、木箱、锁链、糖霜、要收集的字），没有就随便一格
function fishTarget(fromR, fromC, avoid) {
  const want = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
    if (avoid.has(key(r, c)) || hole[r][c] || (r === fromR && c === fromC)) continue;
    const t = tiles[r][c]; let w = 0;
    if (mud[r][c] && goals.some((g) => g.type === 'mud' && g.left > 0)) w = 5;
    else if (crate[r][c] && goals.some((g) => g.type === 'crate' && g.left > 0)) w = 5;
    else if (lock[r][c] && goals.some((g) => g.type === 'lock' && g.left > 0)) w = 4;
    else if (ice[r][c] && t && goals.some((g) => g.type === 'ice' && g.left > 0)) w = 3 + ice[r][c];
    else if (t && t.k >= 0 && goals.some((g) => g.type === 'collect' && g.left > 0 && g.ch === CH(t.k)[0])) w = 2;
    else if (t && t.k >= 0) w = 1;
    if (w) want.push({ r, c, w });
  }
  if (!want.length) return null;
  const top = Math.max(...want.map((x) => x.w)); return pick(want.filter((x) => x.w === top));
}
// 消掉一批格子：特殊块会连带引爆；糖霜碎一层；锁链被打开（方块留下）；木箱、巧克力被旁边的消除打一下
async function blast(clear, spawns = [], silent = false) {
  const queue = [...clear.values()], seen = new Set(clear.keys());
  const add = (r, c) => { if (!inside(r, c) || hole[r][c]) return; const kk = key(r, c); if (seen.has(kk)) return; seen.add(kk); queue.push([r, c]); clear.set(kk, [r, c]); };
  let hitSpecial = false;
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i], t = tiles[r][c]; if (!t || !t.sp || t.fired || lock[r][c]) continue;
    t.fired = true; hitSpecial = true;
    fire(t, r, c, add);
  }
  if (hitSpecial) await sleep(160);
  // 木箱、巧克力：被打到的格子和旁边的格子挨一下
  const hit = new Set();
  for (const [r, c] of clear.values()) for (const [dr, dc] of [[0, 0], ...D4]) { const r2 = r + dr, c2 = c + dc; if (inside(r2, c2) && (crate[r2][c2] > 0 || mud[r2][c2] > 0)) { if (dr || dc) { if (!tiles[r][c] && !crate[r][c] && !mud[r][c]) continue; } hit.add(key(r2, c2)); } }
  for (const kk of hit) {
    const r = Math.floor(kk / 100), c = kk % 100;
    if (crate[r][c] > 0) { crate[r][c]--; burst(cx(c), cy(r), '#c08040', 10); sfx.crack(); if (crate[r][c] === 0) goalHit('crate', null, 1, cx(c), cy(r)); score += 100; }
    else if (mud[r][c] > 0) { mud[r][c] = 0; mudHit = true; burst(cx(c), cy(r), '#7a4a2a', 14); sfx.mud(); goalHit('mud', null, 1, cx(c), cy(r)); score += 100; }
  }
  // 消掉方块
  const anims = [];
  let n = 0;
  for (const [r, c] of clear.values()) {
    const t = tiles[r][c]; if (!t) continue;
    if (lock[r][c]) { lock[r][c] = 0; sfx.chain(); burst(cx(c), cy(r), '#c8c8d0', 10); goalHit('lock', null, 1, cx(c), cy(r)); score += 100; continue; }   // 锁链断了，方块留下
    if (t.k === CHICK) continue;   // 小鸡炸不掉
    if (ice[r][c] > 0) { ice[r][c]--; burst(cx(c), cy(r), '#bfe8ff', 8); sfx.crack(); goalHit('ice', null, 1, cx(c), cy(r)); }
    const sp = spawns.find((s) => s.r === r && s.c === c);
    score += 60 * Math.max(1, combo) + (t.sp ? 150 : 0); magic = Math.min(magicMax, magic + 1); n++;
    burst(cx(c), cy(r), t.sp === 'rainbow' ? '#ffffff' : COLORS[t.k], 12);
    if (t.sp !== 'rainbow') goalHit('collect', CH(t.k)[0], 1, cx(c), cy(r), t.k);
    if (sp) { t.k = sp.k; t.sp = sp.sp; t.fired = false; t.s = 1.5; anims.push(tween(t, { s: 1 }, 300)); sfx.special(); texts.push({ txt: { rowRocket: '火箭！', colRocket: '火箭！', bomb: '炸弹！', rainbow: '彩虹球！', fish: '小鱼！' }[sp.sp], x: cx(c), y: cy(r) - CS * .6, t0: performance.now(), col: '#fff', big: .8 }); continue; }
    tiles[r][c] = null; t.dead = true; dying.push(t); anims.push(tween(t, { s: 0, a: 0 }, 220));
  }
  if (!silent && n) sfx.pop(combo);
  if (n >= 10) shake = Math.max(shake, 6);
  renderHud();
  await Promise.all(anims);
  dying = dying.filter((t) => t.a > 0.01);
}
// 引爆一个特殊块：把它要消的格子加进来
function fire(t, r, c, add) {
  const now = performance.now();
  if (t.sp === 'rowRocket') { fx.push({ type: 'beam', dir: 'h', r, c, t0: now }); sfx.rocket(); for (let cc = 0; cc < M; cc++) add(r, cc); }
  else if (t.sp === 'colRocket') { fx.push({ type: 'beam', dir: 'v', r, c, t0: now }); sfx.rocket(); for (let rr = 0; rr < N; rr++) add(rr, c); }
  else if (t.sp === 'bomb') { fx.push({ type: 'ring', x: cx(c), y: cy(r), R: CS * 2.6, t0: now }); sfx.boom(); shake = 10; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (Math.abs(dr) + Math.abs(dc) <= 3) add(r + dr, c + dc); }
  else if (t.sp === 'rainbow') { const k = randKind(); sfx.rainbow(); for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < M; cc++) if (tiles[rr][cc] && tiles[rr][cc].k === k) { fx.push({ type: 'zap', x0: cx(c), y0: cy(r), x1: cx(cc), y1: cy(rr), t0: now }); add(rr, cc); } }
  else if (t.sp === 'fish') {   // 小鱼：先吃掉身边一圈，再游过去吃掉目标
    for (const [dr, dc] of D4) add(r + dr, c + dc);
    const tg = fishTarget(r, c, new Set()); sfx.fish();
    if (tg) { fx.push({ type: 'fish', x0: cx(c), y0: cy(r), x1: cx(tg.c), y1: cy(tg.r), t0: now, dur: 550 }); add(tg.r, tg.c); }
  }
}
// 往下掉、从上面补新的。空洞、木箱、巧克力、锁住的方块挡路时，旁边的方块会斜着滑下去
async function gravity() {
  let guard = 0, moved = true;
  const spawned = new Array(M).fill(0);
  while (moved && guard++ < 200) {
    moved = false;
    for (let r = N - 1; r >= 0; r--) for (let c = 0; c < M; c++) {
      if (!fillable(r, c) || tiles[r][c]) continue;
      // 1. 正上方有能掉的方块（中间可以隔着空洞）
      let rr = r - 1; while (rr >= 0 && hole[rr][c]) rr--;
      if (rr >= 0 && movable(rr, c)) { const t = tiles[rr][c]; tiles[rr][c] = null; tiles[r][c] = t; t.r = r; moved = true; continue; }
      // 2. 这一列最上面：生新的（需要的时候生小鸡）
      if (isSource(r, c)) {
        const g = goals.find((g) => g.type === 'drop'), needChick = g && g.left > chicksOnBoard() && Math.random() < 0.18;
        const t = newTile(needChick ? CHICK : randKind(), r, c); t.y = r - 1 - spawned[c]++; tiles[r][c] = t; moved = true; continue;
      }
      // 3. 上面被挡住：从左上或右上斜着滑下来（那块自己下面已经掉不下去才滑）
      for (const dc of Math.random() < 0.5 ? [-1, 1] : [1, -1]) {
        const c2 = c + dc; if (!movable(r - 1, c2)) continue;
        if (fillable(r, c2) && !tiles[r][c2]) continue;
        const t = tiles[r - 1][c2]; tiles[r - 1][c2] = null; tiles[r][c] = t; t.r = r; t.c = c; moved = true; break;
      }
    }
  }
  await waitSettle();
  // 小鸡走到最底下：送出去
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) { const t = tiles[r][c]; if (t && t.k === CHICK && isExit(r, c)) out.push([r, c]); }
  if (out.length) {
    for (const [r, c] of out) { const t = tiles[r][c]; tiles[r][c] = null; dying.push(t); tween(t, { y: r + 1.2, a: 0 }, 400); sfx.chick(); goalHit('drop', null, 1, cx(c), cy(r)); score += 1000; texts.push({ txt: '小鸡出去啦！', x: cx(c), y: cy(r) - CS, t0: performance.now(), col: '#ffe14a', big: .8 }); }
    await sleep(420); await gravity();
  }
}

/* ---------- 特殊块互换、彩虹球、组词魔法 ---------- */
async function specialSwap(a, b) {
  const t = performance.now(), clear = new Map(), add = (rr, cc) => inside(rr, cc) && !hole[rr][cc] && clear.set(key(rr, cc), [rr, cc]);
  if (a.sp === 'rainbow' && b.sp === 'rainbow') {   // 全屏清空
    sfx.rainbow(); sfx.boom(); shake = 16; texts.push({ txt: '全屏大爆炸！', x: W / 2, y: H / 2, t0: t, col: '#fff', big: 1.6 });
    for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) add(r, c);
    a.fired = b.fired = true;
  } else if (a.sp === 'rainbow' || b.sp === 'rainbow') {
    const rb = a.sp === 'rainbow' ? a : b, other = rb === a ? b : a, k = other.k;
    rb.fired = true; add(rb.r, rb.c); sfx.rainbow();
    for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
      const tt = tiles[r][c]; if (!tt || tt.k !== k || tt.sp === 'rainbow') continue;
      fx.push({ type: 'zap', x0: cx(rb.c), y0: cy(rb.r), x1: cx(c), y1: cy(r), t0: t });
      if (other.sp) { tt.sp = other.sp === 'rowRocket' || other.sp === 'colRocket' ? pick(['rowRocket', 'colRocket']) : other.sp; tt.fired = false; }   // 彩虹 + 特殊块：这种字全变成特殊块一起炸
      add(r, c);
    }
    sayChar(k, true); await sleep(350);
  } else {
    // 两个特殊块互换
    const r = b.r, c = b.c, types = [a.sp, b.sp].sort().join('+');
    a.fired = b.fired = true; add(a.r, a.c); add(r, c);
    const isRocket = (s) => s === 'rowRocket' || s === 'colRocket';
    if (a.sp === 'fish' || b.sp === 'fish') {
      const other = a.sp === 'fish' ? b : a;
      if (other.sp === 'fish') {   // 小鱼 + 小鱼：三条小鱼一起游出去
        sfx.fish(); const avoid = new Set();
        for (let i = 0; i < 3; i++) { const tg = fishTarget(r, c, avoid); if (!tg) break; avoid.add(key(tg.r, tg.c)); fx.push({ type: 'fish', x0: cx(c), y0: cy(r), x1: cx(tg.c), y1: cy(tg.r), t0: t + i * 80, dur: 550 }); add(tg.r, tg.c); }
      } else {   // 小鱼背着火箭 / 炸弹游过去，在那里炸
        const tg = fishTarget(r, c, new Set()) || { r, c }; sfx.fish();
        fx.push({ type: 'fish', x0: cx(c), y0: cy(r), x1: cx(tg.c), y1: cy(tg.r), t0: t, dur: 550 });
        await sleep(560);
        fire({ sp: other.sp }, tg.r, tg.c, add);
      }
    } else if (isRocket(a.sp) && isRocket(b.sp)) { sfx.rocket(); fx.push({ type: 'beam', dir: 'h', r, c, t0: t }, { type: 'beam', dir: 'v', r, c, t0: t }); for (let i = 0; i < M; i++) add(r, i); for (let i = 0; i < N; i++) add(i, c); }
    else if (types.includes('bomb') && (isRocket(a.sp) || isRocket(b.sp))) { sfx.rocket(); sfx.boom(); shake = 12; for (let d = -1; d <= 1; d++) { fx.push({ type: 'beam', dir: 'h', r: r + d, c, t0: t }, { type: 'beam', dir: 'v', r, c: c + d, t0: t }); for (let i = 0; i < M; i++) add(r + d, i); for (let i = 0; i < N; i++) add(i, c + d); } }
    else { sfx.boom(); shake = 18; fx.push({ type: 'ring', x: cx(c), y: cy(r), R: CS * 5, t0: t }); for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) add(r + dr, c + dc); }
  }
  await blast(clear);
  combo = 1; await gravity(); await resolve();
}
async function wordMagic(w, a, b) {
  magic = 0; renderHud(); goalHit('word', null, 1); renderGoals();
  const ka = a.k, kb = b.k, t = performance.now();
  sfx.magic(); sayUi('x_word'); setTimeout(() => sayWord(w), 900);
  fx.push({ type: 'wave', x: (cx(a.c) + cx(b.c)) / 2, y: (cy(a.r) + cy(b.r)) / 2, t0: t, dur: 1200 });
  texts.push({ txt: `✨ ${w} ✨`, x: W / 2, y: H * 0.4, t0: t, col: '#fff3a0', big: 2 });
  shake = 12; await sleep(700);
  const clear = new Map();
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) { const tt = tiles[r][c]; if (tt && (tt.k === ka || tt.k === kb)) { clear.set(key(r, c), [r, c]); fx.push({ type: 'zap', x0: cx(a.c), y0: cy(a.r), x1: cx(c), y1: cy(r), t0: t + 300 }); } }
  score += 1000; await blast(clear);
  combo = 1; await gravity(); await resolve();
}

/* ---------- 步数用完、过关 ---------- */
async function outOfMoves() {
  $('moreLayer').hidden = false; sayUi('x_more');
  await new Promise((r) => ($('moreBtn').onclick = r));
  $('moreLayer').hidden = true; moves += 5; renderHud();
}
async function win() {
  done = true; busy = true;
  sfx.win(); sayUi('x_win');
  texts.push({ txt: '目标完成！', x: W / 2, y: H / 2, t0: performance.now(), col: '#ffe14a', big: 1.8 });
  await sleep(1200);
  // 剩下的步数变成火箭，一个一个满屏乱炸（正版最爽的一段）
  combo = 0;   // 剩余步数奖励不吃连击倍数
  if (moves > 0) {
    sayUi('x_bonus');
    while (moves > 0) {
      const cand = tiles.flat().filter((t) => t && t.k >= 0 && !t.sp && !lock[t.r][t.c]); if (!cand.length) break;
      const t = pick(cand); t.sp = pick(['rowRocket', 'colRocket']); t.s = 1.6; tween(t, { s: 1 }, 200); moves--; score += 300; renderHud(); sfx.special();
      await sleep(180);
      await blast(new Map([[key(t.r, t.c), [t.r, t.c]]])); await gravity(); combo = 0;
    }
    await resolve(); combo = 0;
  }
  // 剩下的特殊块也全部引爆
  let sp, guard = 0; while ((sp = tiles.flat().filter((t) => t && t.sp && !lock[t.r][t.c])).length && guard++ < 20) { const m = new Map(sp.map((t) => [key(t.r, t.c), [t.r, t.c]])); await blast(m); await gravity(); }
  await waitSettle();
  renderHud();
  const st = score >= L.stars[2] ? 3 : score >= L.stars[1] ? 2 : 1;
  const id = `${lesson.id}-${lvIdx + 1}`; if ((save.levels[id] || 0) < st) save.levels[id] = st; await store.set('xiaoxiao', save);
  fireworks();
  $('winStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st); $('winScore').textContent = score;
  $('winNext').hidden = !nextLevel();
  $('winLayer').hidden = false;
}
const nextLevel = () => { const li = data.lessons.indexOf(lesson); return lvIdx + 1 < lesson.levels.length ? [li, lvIdx + 1] : li + 1 < data.lessons.length ? [li + 1, 0] : null; };

/* ================= 特效 ================= */
function burst(x, y, col, n = 12) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, g: 0.25, life: 1, fade: 0.025 + Math.random() * 0.02, col, size: CS * (0.06 + Math.random() * 0.08), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, shape: Math.random() < 0.5 ? 'sq' : 'tri' }); } }
function burstStars(x, y) { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, g: 0.05, life: 1, fade: 0.02, col: '#ffe14a', size: CS * 0.14, rot: 0, vr: 0.2, shape: 'star' }); } }
function fireworks() { for (let k = 0; k < 6; k++) setTimeout(() => { const x = W * (0.2 + Math.random() * 0.6), y = H * (0.2 + Math.random() * 0.4); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, s = 3 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.08, life: 1, fade: 0.012, col: pick(COLORS), size: CS * 0.09, rot: 0, vr: 0.1, shape: Math.random() < .5 ? 'star' : 'sq' }); } tone(400 + Math.random() * 400, 0.3, 'sine', 0.1, 1200); }, k * 260); }

/* ================= 每一帧 ================= */
let last = 0, idleT = 0, hintMove = null, lastFrame = 0;
function frame() {
  requestAnimationFrame(frame); lastFrame = performance.now();
  if (!L) return;
  update(performance.now());
  draw(performance.now());
}
// 窗口在后台时画面不刷新，动画也照样走完（不会卡住）
setInterval(() => { if (L && performance.now() - lastFrame > 200) update(performance.now()); }, 30);
function update(now) {
  const dt = Math.max(0, Math.min(50, now - (last || now))); last = now;
  tweens = tweens.filter((tw) => { const k = Math.min(1, (now - tw.t0) / tw.dur), e = tw.ease(k); for (const p in tw.props) tw.o[p] = tw.from[p] + (tw.props[p] - tw.from[p]) * e; if (k >= 1) { tw.res(); return false; } return true; });
  // 掉落：有重力，落地只弹一下；斜着滑的时候横着跟过去
  const swapping = new Set(tweens.map((tw) => tw.o));
  for (const row of tiles) for (const t of row) {
    if (!t || swapping.has(t)) continue;
    if (Math.abs(t.x - t.c) > 0.01) t.x += (t.c - t.x) * Math.min(1, dt / 70); else t.x = t.c;
    if (t.y < t.r || t.vy !== 0) {
      t.vy += 0.0028 * dt; t.y += t.vy * dt;
      if (t.y >= t.r) { t.y = t.r; if (t.vy > 0.012 && !t.bounced) { t.vy = -t.vy * 0.22; t.bounced = true; sfx.land(); t.sq = 1; } else { t.vy = 0; t.bounced = false; } }
    } else if (t.y > t.r) { t.y = t.r; t.vy = 0; }
    if (t.sq) t.sq = Math.max(0, t.sq - dt / 160);
  }
  if (!busy && !done && now - idleT > 6000) hintMove = hintMove || findMove();
}
const wordGlow = new Set();
function cellPath(r, c, pad = 2) { ctx.beginPath(); ctx.roundRect(c * CS + pad, r * CS + pad, CS - pad * 2, CS - pad * 2, CS * 0.16); }
function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= 0.86; if (shake < .5) shake = 0; }
  // 棋盘底：深色半透明格子（空洞不画）；糖霜一到三层越来越厚
  const hasDrop = goals.some((g) => g.type === 'drop');
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
    if (hole[r][c]) continue;
    ctx.fillStyle = (r + c) % 2 ? 'rgba(40,30,90,.55)' : 'rgba(55,42,115,.55)'; cellPath(r, c); ctx.fill();
    if (ice[r][c]) { ctx.fillStyle = ['', 'rgba(190,235,255,.45)', 'rgba(170,225,255,.7)', 'rgba(140,205,255,.9)'][ice[r][c]]; cellPath(r, c); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1 + ice[r][c]; ctx.stroke(); }
    if (hasDrop && isExit(r, c)) { ctx.fillStyle = 'rgba(255,225,74,.85)'; ctx.font = `900 ${CS * .3}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('▼', cx(c), (r + 1) * CS - CS * .1); }
  }
  // 魔法瓶满了：能组词的方块发光
  wordGlow.clear();
  if (magic >= magicMax) for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) { const t = tiles[r][c]; if (!t || t.sp || t.k < 0) continue; for (const [dr, dc] of [[0, 1], [1, 0]]) { const u = inside(r + dr, c + dc) && tiles[r + dr][c + dc]; if (u && !u.sp && wordOf(t, u)) { wordGlow.add(t); wordGlow.add(u); } } }
  const sz = CS;
  const drawTile = (t) => {
    const hint = hintMove && hintMove.some(([r, c]) => tiles[r][c] === t) ? Math.sin(now / 120) * 0.08 : 0;
    const breathe = 1 + Math.sin(now / 700 + t.id) * 0.012 + hint, sq = t.sq ? Math.sin(t.sq * Math.PI) * 0.15 : 0;
    const s = t.s * breathe; ctx.save(); ctx.globalAlpha = t.a; ctx.translate(cx(t.x), cy(t.y)); ctx.scale(s * (1 + sq), s * (1 - sq));
    if (t.sp === 'rainbow') ctx.rotate(now / 600);
    if (t.k === CHICK) ctx.rotate(Math.sin(now / 300 + t.id) * 0.12);
    if (t.sp === 'bomb') { ctx.shadowColor = '#fff'; ctx.shadowBlur = 12 + Math.sin(now / 150) * 6; }
    if (wordGlow.has(t)) { ctx.shadowColor = '#fff6a0'; ctx.shadowBlur = 18 + Math.sin(now / 120) * 8; }
    ctx.drawImage(sprite(t.k, t.sp), -sz / 2, -sz / 2, sz, sz); ctx.restore();
  };
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  for (const row of tiles) for (const t of row) if (t && t.y > -1.2) drawTile(t);
  for (const t of dying) drawTile(t);
  ctx.restore();
  // 锁链、木箱、巧克力
  for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) {
    const x = c * CS, y = r * CS;
    if (lock[r][c]) {
      ctx.save(); ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = CS * .09; ctx.lineCap = 'round';
      for (const [x0, y0, x1, y1] of [[.12, .12, .88, .88], [.88, .12, .12, .88]]) { ctx.beginPath(); ctx.moveTo(x + x0 * CS, y + y0 * CS); ctx.lineTo(x + x1 * CS, y + y1 * CS); ctx.stroke(); }
      ctx.strokeStyle = '#d8d8e4'; ctx.lineWidth = CS * .04; for (let i = 1; i < 6; i++) for (const s of [1, -1]) { const p = i / 6; ctx.beginPath(); ctx.ellipse(x + (s > 0 ? .12 + .76 * p : .88 - .76 * p) * CS, y + (.12 + .76 * p) * CS, CS * .06, CS * .035, s * Math.PI / 4, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    if (crate[r][c] > 0) {
      const s = CS - 8; ctx.fillStyle = crate[r][c] === 2 ? '#b07a3a' : '#c8924e'; ctx.beginPath(); ctx.roundRect(x + 4, y + 4, s, s, 6); ctx.fill();
      ctx.strokeStyle = '#6a4418'; ctx.lineWidth = 3; ctx.strokeRect(x + 8, y + 8, s - 8, s - 8); ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y + 8); ctx.lineTo(x + 8, y + s); ctx.stroke();
      if (crate[r][c] === 1) { ctx.strokeStyle = 'rgba(40,20,0,.6)'; ctx.beginPath(); ctx.moveTo(x + s * .2, y + s * .6); ctx.lineTo(x + s * .45, y + s * .45); ctx.lineTo(x + s * .55, y + s * .75); ctx.stroke(); }
    }
    if (mud[r][c]) {
      const g = ctx.createLinearGradient(x, y, x, y + CS); g.addColorStop(0, '#8a5432'); g.addColorStop(1, '#5a3218'); ctx.fillStyle = g; cellPath(r, c, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(40,20,8,.5)'; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 6, y + i * CS / 3); ctx.lineTo(x + CS - 6, y + i * CS / 3); ctx.moveTo(x + i * CS / 3, y + 6); ctx.lineTo(x + i * CS / 3, y + CS - 6); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,230,200,.25)'; ctx.beginPath(); ctx.ellipse(x + CS * .32, y + CS * .25, CS * .16, CS * .06, -.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 火箭光束、炸弹冲击波、彩虹闪电、组词魔法光波、游过去的小鱼
  fx = fx.filter((f) => {
    const k = (now - f.t0) / (f.dur || 420); if (k < 0) return true; if (k > 1) return false;
    ctx.save();
    if (f.type === 'beam') {
      const w = CS * (0.9 - k * 0.6), g = f.dir === 'h' ? ctx.createLinearGradient(0, cy(f.r) - w, 0, cy(f.r) + w) : ctx.createLinearGradient(cx(f.c) - w, 0, cx(f.c) + w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,250,200,${1 - k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g;
      if (f.dir === 'h') ctx.fillRect(0, cy(f.r) - w, W, w * 2); else ctx.fillRect(cx(f.c) - w, 0, w * 2, H);
      ctx.fillStyle = '#fff'; ctx.font = `${CS * .7}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const d = k * Math.max(W, H); if (f.dir === 'h') { ctx.fillText('🚀', cx(f.c) + d, cy(f.r)); ctx.save(); ctx.translate(cx(f.c) - d, cy(f.r)); ctx.scale(-1, 1); ctx.fillText('🚀', 0, 0); ctx.restore(); }
      else { ctx.save(); ctx.translate(cx(f.c), cy(f.r) - d); ctx.rotate(-Math.PI / 2); ctx.fillText('🚀', 0, 0); ctx.restore(); ctx.save(); ctx.translate(cx(f.c), cy(f.r) + d); ctx.rotate(Math.PI / 2); ctx.fillText('🚀', 0, 0); ctx.restore(); }
    } else if (f.type === 'ring') {
      ctx.strokeStyle = `rgba(255,230,120,${1 - k})`; ctx.lineWidth = CS * 0.35 * (1 - k); ctx.beginPath(); ctx.arc(f.x, f.y, f.R * k, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.R * k * 0.6, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'zap') {
      ctx.strokeStyle = `hsla(${(now / 3) % 360},100%,75%,${1 - k})`; ctx.lineWidth = 4; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(f.x0, f.y0);
      for (let i = 1; i <= 6; i++) { const p = i / 6; ctx.lineTo(f.x0 + (f.x1 - f.x0) * p + (i < 6 ? (Math.random() - .5) * CS * .4 : 0), f.y0 + (f.y1 - f.y0) * p + (i < 6 ? (Math.random() - .5) * CS * .4 : 0)); } ctx.stroke();
    } else if (f.type === 'wave') {
      const R = Math.max(W, H) * 1.2 * k;
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = `hsla(${(i * 120 + now / 4) % 360},100%,75%,${1 - k})`; ctx.lineWidth = CS * 0.3; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, R - i * CS * .6), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,250,220,${0.25 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
    } else if (f.type === 'fish') {   // 小鱼划一道弧线游过去，身后一串泡泡
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * CS * 1.5;
      if (Math.random() < .5) parts.push({ x, y, vx: (Math.random() - .5), vy: -1, g: -0.02, life: .7, fade: .03, col: 'rgba(200,240,255,.9)', size: CS * .06, rot: 0, vr: 0, shape: 'sq' });
      ctx.translate(x, y); if (f.x1 < f.x0) ctx.scale(-1, 1); ctx.font = `${CS * .7}px "Segoe UI Emoji",system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐟', 0, 0);
    }
    ctx.restore(); return true;
  });
  // 碎片
  parts = parts.filter((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr; p.life -= p.fade; if (p.life <= 0) return false;
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
    if (p.shape === 'sq') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    else if (p.shape === 'tri') { ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size, p.size * .7); ctx.lineTo(-p.size, p.size * .7); ctx.fill(); }
    else { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? p.size * .45 : p.size, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); }
    ctx.restore(); return true;
  });
  // 飘字：好棒、太厉害了、火箭……
  texts = texts.filter((t) => {
    const k = (now - t.t0) / 1100; if (k > 1) return false;
    const s = (t.big || 1) * (k < .15 ? k / .15 * 1.2 : 1.2 - Math.min(.2, (k - .15)));
    ctx.save(); ctx.translate(t.x, t.y - k * CS * .8); ctx.scale(s, s); ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1;
    ctx.font = `900 ${CS * .55}px "Microsoft YaHei",system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = CS * .14; ctx.strokeStyle = 'rgba(60,20,90,.9)'; ctx.strokeText(t.txt, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.txt, 0, 0);
    ctx.restore(); return true;
  });
}

/* ================= 操作：按住一块往旁边拖，或者先点一块再点旁边那块 ================= */
let downCell = null, sel = null;
const cellAt = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientY - r.top) / CS), Math.floor((e.clientX - r.left) / CS)]; };
cv.addEventListener('pointerdown', (e) => {
  audio(); startMusic(); const [r, c] = cellAt(e); if (!inside(r, c) || !tiles[r][c]) return;
  downCell = { r, c, x: e.clientX, y: e.clientY };
});
cv.addEventListener('pointermove', (e) => {
  if (!downCell) return; const dx = e.clientX - downCell.x, dy = e.clientY - downCell.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < CS * 0.35) return;
  const [dr, dc] = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
  const d = downCell; downCell = null; sel = null; trySwap(d.r, d.c, d.r + dr, d.c + dc);
});
cv.addEventListener('pointerup', () => {
  if (!downCell) return; const d = downCell; downCell = null;
  if (sel && Math.abs(sel.r - d.r) + Math.abs(sel.c - d.c) === 1) { const s = sel; sel = null; trySwap(s.r, s.c, d.r, d.c); return; }
  sel = { r: d.r, c: d.c }; const t = tiles[d.r][d.c]; if (t) { t.s = 1.15; tween(t, { s: 1 }, 250); sayChar(t.k, true); }
});

/* ================= 开始：选课、选关 ================= */
let curLesson = 0;
const unlocked = (li, i) => (li === 0 && i === 0) || (i > 0 ? save.levels[`${data.lessons[li].id}-${i}`] : save.levels[`${data.lessons[li - 1].id}-${data.lessons[li - 1].levels.length}`]) || save.all;
function renderLevels() {
  $('lessonTabs').innerHTML = data.lessons.map((ls, li) => `<button class="ltab${li === curLesson ? ' on' : ''}" data-li="${li}">第 ${ls.id} 课<br><b>${ls.title}</b></button>`).join('');
  $('lessonTabs').querySelectorAll('.ltab').forEach((b) => (b.onclick = () => { curLesson = +b.dataset.li; renderLevels(); }));
  const ls = data.lessons[curLesson];
  $('lvList').innerHTML = ls.levels.map((l, i) => { const st = save.levels[`${ls.id}-${i + 1}`] || 0, open = unlocked(curLesson, i); return `<button class="lvb" data-i="${i}" ${open ? '' : 'disabled'}><b>${i + 1}</b><span>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>${open ? '' : '🔒'}</button>`; }).join('');
  $('lvList').querySelectorAll('.lvb:not([disabled])').forEach((b) => (b.onclick = () => { audio(); startMusic(); $('startLayer').hidden = true; startLevel(curLesson, +b.dataset.i); }));
}
(async () => {
  data = await fetch('content/match_levels.json').then((r) => r.json());
  save = await store.get('xiaoxiao', { levels: {} }); save.levels = save.levels || {};
  renderLevels();
  $('winNext').onclick = () => { const n = nextLevel(); $('winLayer').hidden = true; if (n) { curLesson = n[0]; startLevel(n[0], n[1]); } };
  $('winAgain').onclick = () => { $('winLayer').hidden = true; startLevel(data.lessons.indexOf(lesson), lvIdx); };
  $('winMenu').onclick = () => { $('winLayer').hidden = true; renderLevels(); $('startLayer').hidden = false; };
  $('helloBtn').onclick = () => { audio(); sayUi('x_hello'); };
  requestAnimationFrame(frame);
  if (location.search.includes('test')) window.__xxl = { get tiles() { return tiles; }, trySwap, findMove: () => findMove(), get busy() { return busy; }, get goals() { return goals; }, get moves() { return moves; }, get score() { return score; }, setMagic: (v) => (magic = v), start: (li, i) => startLevel(li, i), get lock() { return lock; }, get mud() { return mud; }, allMoves: () => { const out = []; for (let r = 0; r < N; r++) for (let c = 0; c < M; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) if (inside(r + dr, c + dc) && wouldMatch(r, c, r + dr, c + dc)) out.push([[r, c], [r + dr, c + dc]]); return out; } };   // 测试用
})();
