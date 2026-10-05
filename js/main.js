// 溜溜 主程序：舞台、拖拽、彩蛋、进化、阶段地图。
import { charSVG } from './art.js';
import { STYLES, LOOPKEY, INSTRUMENTS, lookFor, singerLook } from './styles.js';
import { BG } from './bg.js';
import * as A from './audio.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
const NS = 10, NEED = 3;                      // 10 个空位；找到 3 个彩蛋解锁下一关
const HORROR = new Set([3, 8, 12, 16, 21, 28, 33]);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const code = (w) => [...w].map((c) => c.codePointAt(0).toString(16)).join('-');
const zUrl = (ch) => `audio/voice/z/${code(ch)}.mp3`;
const wUrl = (w) => `audio/voice/w/${code(w)}.mp3`;
const uiUrl = (k) => `audio/voice/ui/${k}.mp3`;
const NAMES = { dong: '咚咚', cha: '嚓嚓', papa: '啪啪', beng: '嘣嘣', ding: '叮叮', wuwu: '呜呜', didu: '嘀嘟', ling: '铃铃', dudu: '嘟嘟', huhu: '呼呼', lala: '啦啦', ying: '影影',
  dang: '当当', weng: '嗡嗡', you: '悠悠', zheng: '铮铮', zizi: '滋滋', dongci: '动次', dada: '哒哒', hong: '轰轰', jiu: '啾啾', hei: '嘿嘿' };

let DATA, stage = null, selected = null, eggOrder = [];
let slots = Array.from({ length: NS }, () => null);   // null | {kind:'inst',id} | {kind:'char',ch,py}
let muted = Array(NS).fill(false);
let save = { unlocked: 1, current: 1, found: {}, heard: {} };

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
const persist = () => store.set('save', save);
const style = () => STYLES[stage.style];
const loopUrl = (id) => `audio/loops/${style().loops}/${LOOPKEY[id]}.flac`;

/* ================= 进入阶段 ================= */
async function enter(id, { evolve = false } = {}) {
  stage = DATA.stages.find((s) => s.id === id);
  save.current = id; persist();
  document.documentElement.classList.toggle('dark', !!style().dark);
  $('bg').innerHTML = BG[stage.style]();
  $('badge').textContent = `第 ${id} 关 · ${stage.lesson}`;
  // 乐手留在台上换新形态、换新声音；字宝宝是上一课的，请下台
  slots = slots.map((s) => (s && s.kind === 'inst' ? s : null));
  muted = muted.map((m, i) => (slots[i] ? m : false));
  for (let i = 0; i < NS; i++) { A.setSinger(i, null); if (!slots[i]) A.stopLoop(i); }
  eggOrder = []; renderBar(); renderEggs(); renderSlots();
  A.preload([...INSTRUMENTS.map(loopUrl), ...stage.chars.map(([c]) => zUrl(c)), ...stage.eggs.map((e) => wUrl(e.w))]);
  for (let i = 0; i < NS; i++) if (slots[i]) A.startLoop(i, loopUrl(slots[i].id), muted[i]);
  if (!save.heard[id]) {
    save.heard[id] = 1; persist();
    if (style().dark) A.say(uiUrl('dark'), { user: false });
    else if (id === 1) A.say(uiUrl('hello'), { user: false });
  }
  updateEvo();
}

/* ================= 舞台 ================= */
function figFor(i) {
  const s = slots[i];
  if (!s) return `<svg class="empty" viewBox="0 0 140 196"><path d="M36 182C20 176 18 120 30 92C42 66 58 56 70 56C82 56 100 66 112 92C124 120 122 176 106 182Z"/></svg>`;
  if (s.kind === 'inst') return charSVG(s.id, lookFor(stage.style, s.id));
  return charSVG('sz', singerLook(stage.style, i, s.ch));
}
function renderSlots() {
  const row = $('row'); row.innerHTML = '';
  slots.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'slot' + (s ? ' used' : '') + (muted[i] ? ' muted' : '') + (s && s.kind === 'inst' ? ' play' : '') + (s && s.kind === 'char' ? ' singer' : '');
    d.dataset.i = i;
    d.style.setProperty('--ph', A.phase().toFixed(3) + 's');
    const lab = !s ? '' : s.kind === 'inst' ? NAMES[s.id] : `${s.ch}<span class="py">${s.py}</span>`;
    d.innerHTML = `<div class="fig">${figFor(i)}</div><span class="lab">${lab}</span><button class="x" aria-label="请下台">✕</button>`;
    bindSlot(d, i); row.appendChild(d);
  });
}
function bindSlot(d, i) {
  let timer = null, long = false;
  d.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.x')) return;
    long = false;
    timer = setTimeout(() => {
      long = true; const s = slots[i]; if (!s) return;
      A.say(s.kind === 'char' ? zUrl(s.ch) : uiUrl('n_' + s.id));
    }, 550);
  });
  const clear = () => clearTimeout(timer);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => d.addEventListener(ev, clear));
  d.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { removeSlot(i); renderSlots(); return; }
    if (long) return;
    if (selected) { apply(i, selected); clearSel(); return; }
    if (!slots[i]) { toast('从下面拖一个上来'); return; }
    muted[i] = !muted[i];
    if (slots[i].kind === 'inst') A.muteLoop(i, muted[i]); else A.setSinger(i, zUrl(slots[i].ch), muted[i]);
    d.classList.toggle('muted', muted[i]);
  });
}
function removeSlot(i) {
  A.stopLoop(i); A.setSinger(i, null); slots[i] = null; muted[i] = false;
}
function apply(i, item) {
  if (item.kind === 'inst') {
    const old = slots.findIndex((s) => s && s.kind === 'inst' && s.id === item.id);
    if (old >= 0 && old !== i) removeSlot(old);         // 每个乐手只有一个，换位置
    removeSlot(i);
    slots[i] = { kind: 'inst', id: item.id };
    A.startLoop(i, loopUrl(item.id), false);
  } else {
    removeSlot(i);
    slots[i] = { kind: 'char', ch: item.ch, py: item.py };
    A.setSinger(i, zUrl(item.ch), false);
  }
  renderSlots(); renderBarState();
  if (!checkEggs() && item.kind === 'char') A.say(zUrl(item.ch));
}
// 拖到台上时：放到指定位置；点图标再点"空地方"也行
function firstEmpty() { const k = slots.findIndex((s) => !s); return k; }

/* 歌手在自己的拍子上跳一下 */
const VSLOT = [0, 4, 8, 12, 2, 6, 10, 14, 1, 9];
A.onStepCallback((st) => {
  document.querySelectorAll('.slot.singer').forEach((el) => {
    const i = +el.dataset.i;
    if (muted[i] || st % 16 !== VSLOT[i]) return;
    el.classList.remove('sing'); void el.offsetWidth; el.classList.add('sing');
  });
});

/* ================= 图标栏 ================= */
function renderBar() {
  const gi = $('gInst'), gc = $('gChar'); gi.innerHTML = ''; gc.innerHTML = '';
  shuffle(INSTRUMENTS).forEach((id) => {
    const b = icon({ kind: 'inst', id }, charSVG(id, lookFor(stage.style, id)), 'ic', NAMES[id]);
    gi.appendChild(b);
  });
  shuffle(stage.chars).forEach(([ch, py]) => {
    const b = icon({ kind: 'char', ch, py }, `<span class="c">${ch}</span><span class="p">${py}</span>`, 'ic ch', ch);
    gc.appendChild(b);
  });
  renderBarState();
}
function renderBarState() {
  document.querySelectorAll('#gInst .ic').forEach((b) => b.classList.toggle('on', slots.some((s) => s && s.kind === 'inst' && s.id === b.dataset.id)));
}
function icon(item, html, cls, label) {
  const b = document.createElement('button');
  b.className = cls; b.innerHTML = html; b.setAttribute('aria-label', label);
  if (item.id) b.dataset.id = item.id;
  b.addEventListener('pointerdown', (e) => startDrag(e, b, item));
  return b;
}
function clearSel() { document.querySelectorAll('.ic.sel').forEach((t) => t.classList.remove('sel')); selected = null; }
function startDrag(e, b, item) {
  e.preventDefault();
  const st = { x: e.clientX, y: e.clientY, moved: false, ghost: null, over: null };
  try { b.setPointerCapture(e.pointerId); } catch {}
  const target = (x, y) => document.elementFromPoint(x, y)?.closest('.slot');
  const move = (ev) => {
    if (!st.moved && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 8) {
      st.moved = true; st.ghost = b.cloneNode(true); st.ghost.classList.add('ghost'); st.ghost.classList.remove('sel', 'on'); document.body.appendChild(st.ghost);
    }
    if (!st.moved) return;
    st.ghost.style.left = ev.clientX + 'px'; st.ghost.style.top = ev.clientY + 'px';
    const el = target(ev.clientX, ev.clientY);
    if (st.over && st.over !== el) st.over.classList.remove('drop');
    el?.classList.add('drop'); st.over = el;
  };
  const up = (ev) => {
    b.removeEventListener('pointermove', move); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
    if (st.moved) {
      st.ghost.remove(); st.over?.classList.remove('drop');
      const el = target(ev.clientX, ev.clientY);
      if (el) apply(+el.dataset.i, item);
      clearSel(); return;
    }
    // 点一下：选中它，再点溜溜；字宝宝顺便读一遍
    const was = b.classList.contains('sel'); clearSel();
    if (item.kind === 'char') A.say(zUrl(item.ch));
    if (!was) {
      selected = item; b.classList.add('sel');
      const k = firstEmpty();
      if (k < 0) { toast('点一个溜溜，换成它'); }
    }
  };
  b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
}

/* ================= 彩蛋 ================= */
const foundOf = () => (save.found[stage.id] ||= []);
function renderEggs() {
  const box = $('eggs'); box.innerHTML = '';
  (eggOrder.length === stage.eggs.length ? eggOrder : (eggOrder = shuffle(stage.eggs.map((_, k) => k)))).forEach((k) => {
    const e = stage.eggs[k], f = foundOf().includes(k);
    const b = document.createElement('button');
    b.className = 'egg' + (f ? ' found' : ''); b.dataset.k = k;
    b.innerHTML = f ? `<span class="w">${e.w}</span><span class="p">${e.p}</span>` : `<span>🔊 ${'？'.repeat([...e.w].length)}</span>`;
    b.setAttribute('aria-label', f ? e.w : '藏起来的词语，点一下听');
    b.addEventListener('click', () => A.say(wUrl(e.w)));
    box.appendChild(b);
  });
}
function checkEggs() {
  let hit = false;
  const have = {};
  slots.forEach((s) => { if (s && s.kind === 'char') have[s.ch] = (have[s.ch] || 0) + 1; });
  stage.eggs.forEach((e, k) => {
    if (foundOf().includes(k)) return;
    const need = {}; [...e.w].forEach((c) => (need[c] = (need[c] || 0) + 1));
    if (!Object.entries(need).every(([c, n]) => (have[c] || 0) >= n)) return;
    foundOf().push(k); persist(); hit = true;
    celebrate(e, k);
  });
  return hit;
}
function celebrate(e, k) {
  renderEggs();
  document.querySelector(`.egg[data-k="${k}"]`)?.classList.add('pop');
  $('bw').textContent = e.w; $('bp').textContent = e.p; $('banner').hidden = false;
  confetti();
  document.querySelectorAll('.slot').forEach((el) => {
    const s = slots[+el.dataset.i];
    if (s && s.kind === 'char' && e.w.includes(s.ch)) { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); }
  });
  const n = foundOf().length, list = [uiUrl('found'), wUrl(e.w)];
  if (n === stage.eggs.length) list.push(uiUrl('allfound'));
  updateEvo();
  const hide = Promise.race([A.say(list), new Promise((r) => setTimeout(r, 6000))]);
  Promise.all([hide, new Promise((r) => setTimeout(r, 2500))]).then(() => { $('banner').hidden = true; if (n === NEED) spotlight(); });
}
function confetti() {
  const cols = ['#F5C04A', '#FF8FA3', '#86C5FF', '#8EE3A8', '#C3B1FF'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.top = -20 - Math.random() * 100 + 'px';
    c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * .5 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }
}

/* ================= 进化 ================= */
const nextMade = () => DATA.stages.find((s) => s.id === stage.id + 1);
function updateEvo() {
  const ready = foundOf().length >= NEED;
  const btn = $('evoBtn');
  btn.disabled = !ready; btn.classList.toggle('ready', ready);
  if (ready && nextMade() && save.unlocked < stage.id + 1) { save.unlocked = stage.id + 1; persist(); }
}
// 刚找够彩蛋：聚光灯照着进化按钮，语音提示
function spotlight() {
  const btn = $('evoBtn'); btn.classList.add('spot'); A.say(uiUrl('ready'), { user: false });
  setTimeout(() => btn.classList.remove('spot'), 5000);
}
$('evoBtn').addEventListener('click', async () => {
  $('evoBtn').classList.remove('spot');
  const nx = nextMade();
  if (!nx) { A.say(uiUrl('last')); toast('下一关正在做'); return; }
  A.whoosh(); $('flash').classList.add('on');
  await new Promise((r) => setTimeout(r, 900));
  await enter(nx.id, { evolve: true });
  $('flash').classList.remove('on');
  if (!style().dark) A.say(uiUrl('evolve'), { user: false });
});

/* ================= 地图 ================= */
function renderMap() {
  const box = $('tiles'); box.innerHTML = '';
  DATA.map.forEach((name, k) => {
    const id = k + 1, made = DATA.stages.some((s) => s.id === id), open = made && id <= save.unlocked;
    const b = document.createElement('button');
    b.className = 'tile' + (open ? ' open' : made ? ' locked' : ' soon') + (HORROR.has(id) ? ' horror' : '') + (stage && stage.id === id ? ' cur' : '');
    const nf = (save.found[id] || []).length;
    b.innerHTML = `<span class="n">第 ${id} 关${HORROR.has(id) ? ' 💀' : ''}</span><span class="t">${name}</span><span class="s">${open ? '⭐'.repeat(nf) || '可以玩' : made ? '🔒' : '制作中'}</span>`;
    b.addEventListener('click', () => {
      if (open) { $('mapLayer').hidden = true; if (id !== stage.id) enter(id); }
      else A.say(uiUrl(made ? 'locked' : 'soon'));
    });
    box.appendChild(b);
  });
}
$('mapBtn').addEventListener('click', () => { renderMap(); $('mapLayer').hidden = false; });
$('mapClose').addEventListener('click', () => ($('mapLayer').hidden = true));
$('clearBtn').addEventListener('click', () => { for (let i = 0; i < NS; i++) removeSlot(i); renderSlots(); renderBarState(); });

/* ================= 启动 ================= */
async function boot() {
  DATA = await (await fetch('content/stages.json')).json();
  save = Object.assign(save, await store.get('save', {}));
  $('startBtn').addEventListener('click', async () => {
    $('startLayer').hidden = true;
    await A.init();
    const cur = DATA.stages.some((s) => s.id === save.current) ? save.current : 1;
    enter(Math.min(cur, save.unlocked) || 1);
  });
}
boot();
