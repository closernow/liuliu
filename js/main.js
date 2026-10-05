// 溜溜 主程序：舞台、拖拽、彩蛋、进化、阶段地图。
// 四种关：识字（拖字）、拼音（拖声母韵母声调拼音节）、rap（拖唱词排顺序）、全书大混音。
import { charSVG, CH } from './art.js';
import { STYLES, LOOPKEY, INSTRUMENTS, SINGER_COLORS, lookFor, singerLook } from './styles.js';
import { BG } from './bg.js';
import * as A from './audio.js';
import * as store from './store.js';
import * as Py from './pinyin.js';
import * as Rec from './studio.js';

const $ = (id) => document.getElementById(id);
const NS = 10, NEED = 3;                      // 10 个空位；找到 3 个彩蛋解锁下一关
const HORROR = new Set([3, 8, 12, 16, 21, 28, 33]);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const code = (w) => [...w].map((c) => c.codePointAt(0).toString(16)).join('-');
const zUrl = (ch) => `audio/voice/z/${code(ch)}.mp3`;
const wUrl = (w) => `audio/voice/w/${code(w)}.mp3`;
const uiUrl = (k) => `audio/voice/ui/${k}.mp3`;
const NAMES = { dong: '咚咚', cha: '嚓嚓', papa: '啪啪', beng: '嘣嘣', ding: '叮叮', wuwu: '呜呜', didu: '嘀嘟', ling: '铃铃', dudu: '嘟嘟', huhu: '呼呼', lala: '啦啦', ying: '影影',
  dang: '当当', weng: '嗡嗡', you: '悠悠', zheng: '铮铮', zizi: '滋滋', dongci: '动次', dada: '哒哒', hong: '轰轰', jiu: '啾啾', hei: '嘿嘿',
  dada2: '嗒嗒', gudong: '咕咚', dingdang: '叮当', puca: '噗嚓', xiuxiu: '咻咻', wawa: '哇哇', kaka: '咔咔' };
const TONE_PATH = ['M4 8 L36 8', 'M4 24 L36 6', 'M4 10 Q20 34 36 8', 'M4 6 L36 24'];

let DATA, stage = null, selected = null, eggOrder = [];
// 台上每个位置：null | {kind:'inst',id} | {kind:'char',ch,py} | {kind:'py',sheng,yun,whole,tone,formed} | {kind:'line',k}
let slots = Array.from({ length: NS }, () => null);
let muted = Array(NS).fill(false);
let save = { unlocked: 1, current: 1, found: {}, heard: {}, mixEggs: null };
let text = null, recs = {}, noText = false, valid = new Set(), mixData = null;
let clips = [];                 // 自由录音：[{id, url}]

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
const persist = () => store.set('save', save);
const style = () => STYLES[stage.style];
const loopUrl = (id) => `audio/loops/${style().loops}/${LOOPKEY[id]}.flac`;
const look = (id) => lookFor(stage.style, id, stage.id, CH[id].col);
const fxOf = () => (style().dark ? (stage.style === 'ghost' ? 'echo' : 'deep') : stage.style === 'space' ? 'robot' : 'none');

/* ================= 进入阶段 ================= */
async function enter(id) {
  stage = DATA.stages.find((s) => s.id === id);
  save.current = id; persist();
  document.documentElement.classList.toggle('dark', !!style().dark);
  $('bg').innerHTML = BG[stage.style]();
  // 同一个世界里的几关，背景色调稍微变一下
  $('bg').style.filter = style().dark ? '' : `hue-rotate(${((stage.id * 37) % 50) - 25}deg)`;
  $('badge').textContent = stage.prologue ? `🏫 序章 · ${stage.lesson}` : stage.bonus ? `🎁 彩蛋关 · ${stage.lesson}` : `第 ${id} 关 · ${stage.lesson}`;
  $('recBtn').hidden = stage.type !== 'rap';
  // 乐手留在台上换新形态、换新声音；其他的是上一课的，请下台
  slots = slots.map((s) => (s && s.kind === 'inst' ? s : null));
  muted = muted.map((m, i) => (slots[i] ? m : false));
  for (let i = 0; i < NS; i++) { A.setSinger(i, null); if (!slots[i]) A.stopLoop(i); }
  A.setRap([]); A.resetRap();
  text = null; noText = false; valid = new Set(); $('bar').innerHTML = '';
  if (stage.type === 'pinyin') valid = new Set(stage.valid);
  if (stage.type === 'rap') await loadText();
  if (stage.type === 'mix') buildMix();
  eggOrder = []; renderBar(); renderEggs(); renderSlots(); renderLyrics();
  const pre = INSTRUMENTS.map(loopUrl);
  (stage.chars || []).forEach(([c]) => pre.push(zUrl(c)));
  (stage.eggs || []).forEach((e) => e.syl || e.kind || pre.push(wUrl(e.w)));
  A.preload(pre);
  for (let i = 0; i < NS; i++) if (slots[i]) A.startLoop(i, loopUrl(slots[i].id), muted[i]);
  if (!save.heard[id]) {
    save.heard[id] = 1; persist();
    const hello = { shizi: 'hello', pinyin: 'pyhello', rap: noText ? 'local' : 'raphello', mix: 'mixhello' }[stage.type];
    A.say(style().dark ? [uiUrl('dark'), uiUrl(hello)] : uiUrl(hello), { user: false });
  } else if (noText) A.say(uiUrl('local'), { user: false });
  updateEvo();
}

/* ================= 课文（rap 关） ================= */
async function loadText() {
  const src = stage.public ? 'content/rap_public.json' : 'private/texts.json';
  try {
    const all = await (await fetch(src)).json();
    text = all[stage.text];
    if (!text) throw new Error('no text');
  } catch {
    const typed = await store.get('text:' + stage.text, null);
    if (!typed) { text = null; noText = true; return; }
    text = { title: stage.lesson, lines: typed.map((t) => ({ t, p: [] })), urls: typed.map(() => null), typed: true };
  }
  const base = stage.public ? 'audio/voice/rap' : 'private/voice/rap';
  if (!text.typed) text.urls = text.lines.map((_, i) => `${base}/${stage.text}/${i}.mp3`);
  recs = await Rec.loadAll(stage.text, text.lines.length);
  A.preload(text.lines.map((_, i) => lineUrl(i)));
}
const lineUrl = (k) => (text ? recs[k] || text.urls[k] || null : null);

/* ================= 全书大混音 ================= */
function buildMix() {
  const shizi = DATA.stages.filter((s) => s.type === 'shizi'), pin = DATA.stages.filter((s) => s.type === 'pinyin');
  const chars = [...new Map(shizi.flatMap((s) => s.chars).map((c) => [c[0], c])).values()];
  pin.forEach((s) => s.valid.forEach((v) => valid.add(v)));
  if (!save.mixEggs) {
    const pool = [...shizi.flatMap((s) => s.eggs), ...pin.slice(2).flatMap((s) => s.eggs)];
    save.mixEggs = shuffle(pool).slice(0, 4); persist();
  }
  // 彩蛋要用的字和拼音零件一定在图标栏里
  const need = new Set(), sh = new Set(['b', 'm', 'd', 'h', 'x']), yun = new Set(['a', 'i', 'u', 'ao', 'ang']), wh = new Set();
  save.mixEggs.forEach((e) => {
    if (e.syl) e.syl.forEach(([s]) => { const p = Py.split(s); if (p.whole) wh.add(p.whole); else { if (p.sheng) sh.add(p.sheng); p.yun.forEach((y) => yun.add(y)); } });
    else [...e.w].forEach((c) => need.add(c));
  });
  const pickChars = [...chars.filter((c) => need.has(c[0])), ...shuffle(chars.filter((c) => !need.has(c[0]))).slice(0, 12 - need.size)];
  mixData = { chars: pickChars, sheng: [...sh], yun: [...yun], whole: [...wh] };
  stage.eggs = save.mixEggs;
}

/* ================= 舞台 ================= */
const clipUrl = (id) => (clips.find((c) => c.id === id) || {}).url;
function cardOf(s) {
  if (s.kind === 'clip') return '🎙';
  if (s.kind === 'char') return s.ch;
  if (s.kind === 'py') return s.formed ? Py.mark(Py.sylOf(s), s.tone) : Py.display((s.sheng || '') + (s.yun || '')) || '?';
  if (s.kind === 'line') return [...text.lines[s.k].t.replace(/[，。！？：；、“”…]/g, '')].slice(0, 2).join('');
  return '';
}
function figFor(i) {
  const s = slots[i];
  if (!s) return `<svg class="empty" viewBox="0 0 140 196"><path d="M36 182C20 176 18 120 30 92C42 66 58 56 70 56C82 56 100 66 112 92C124 120 122 176 106 182Z"/></svg>`;
  if (s.kind === 'inst') return charSVG(s.id, look(s.id));
  if (s.kind === 'line') return charSVG('sz', singerLook(stage.style, s.k, cardOf(s), stage.id));
  return charSVG(s.kind === 'py' || s.kind === 'clip' ? 'py' : 'sz', singerLook(stage.style, i, cardOf(s), stage.id));
}
function labelOf(s) {
  if (!s) return '';
  if (s.kind === 'inst') return NAMES[s.id];
  if (s.kind === 'char') return `${s.ch}<span class="py">${s.py}</span>`;
  if (s.kind === 'py') return s.formed ? `<span class="pyb">${Py.mark(Py.sylOf(s), s.tone)}</span>` : `<span class="sm">${s.sheng || ''}</span><span class="ym">${Py.display(s.yun || '')}</span>`;
  if (s.kind === 'clip') return `🎙 ${clips.findIndex((c) => c.id === s.id) + 1}`;
  if (s.kind === 'line') return `<span class="ln" style="background:${SINGER_COLORS[s.k % 10]}">${s.k + 1}</span>${recs[s.k] ? ' 🎤' : ''}`;
}
function renderSlots() {
  const row = $('row'); row.innerHTML = '';
  slots.forEach((s, i) => {
    const d = document.createElement('div');
    const sing = s && (s.kind === 'char' || s.kind === 'line' || s.kind === 'clip' || (s.kind === 'py' && s.formed));
    d.className = 'slot' + (s ? ' used' : '') + (muted[i] ? ' muted' : '') + (s && s.kind === 'inst' ? ' play' : '') + (sing ? ' singer' : '');
    d.dataset.i = i;
    d.style.setProperty('--ph', A.phase().toFixed(3) + 's');
    d.innerHTML = `<div class="fig">${figFor(i)}</div><span class="lab">${labelOf(s)}</span><button class="x" aria-label="请下台">✕</button>`;
    bindSlot(d, i); row.appendChild(d);
  });
  syncRap();
}
function bindSlot(d, i) {
  let timer = null, long = false;
  d.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.x')) return;
    long = false;
    timer = setTimeout(() => { long = true; const u = readUrl(slots[i]); if (u) A.say(u); }, 550);
  });
  const clear = () => clearTimeout(timer);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => d.addEventListener(ev, clear));
  d.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { removeSlot(i); renderSlots(); renderBarState(); return; }
    if (long) return;
    if (selected) { apply(i, selected); clearSel(); return; }
    if (!slots[i]) { toast('从下面拖一个上来'); return; }
    muted[i] = !muted[i];
    refreshAudio(i);
    d.classList.toggle('muted', muted[i]);
  });
}
// 长按时读什么
function readUrl(s) {
  if (!s) return null;
  if (s.kind === 'inst') return uiUrl('n_' + s.id);
  if (s.kind === 'char') return zUrl(s.ch);
  if (s.kind === 'py' && s.formed) return Py.url(Py.sylOf(s), s.tone);
  if (s.kind === 'line') return lineUrl(s.k);
  if (s.kind === 'clip') return clipUrl(s.id);
  return null;
}
function refreshAudio(i) {
  const s = slots[i];
  if (!s) { A.stopLoop(i); A.setSinger(i, null); return; }
  if (s.kind === 'inst') A.muteLoop(i, muted[i]);
  else if (s.kind === 'char') A.setSinger(i, zUrl(s.ch), muted[i]);
  else if (s.kind === 'py') A.setSinger(i, s.formed ? Py.url(Py.sylOf(s), s.tone) : null, muted[i]);
  else if (s.kind === 'clip') A.setSinger(i, clipUrl(s.id), muted[i]);
  syncRap();
}
function removeSlot(i) { A.stopLoop(i); A.setSinger(i, null); slots[i] = null; muted[i] = false; }

/* 拖到台上 */
function apply(i, item) {
  if (item.kind === 'inst') {
    const old = slots.findIndex((s) => s && s.kind === 'inst' && s.id === item.id);
    if (old >= 0 && old !== i) removeSlot(old);         // 每个乐手只有一个，换位置
    removeSlot(i);
    slots[i] = { kind: 'inst', id: item.id };
    A.startLoop(i, loopUrl(item.id), false);
    renderSlots(); renderBarState(); return;
  }
  if (item.kind === 'char') {
    removeSlot(i);
    slots[i] = { kind: 'char', ch: item.ch, py: item.py };
    A.setSinger(i, zUrl(item.ch), false);
    renderSlots();
    if (!checkEggs()) A.say(zUrl(item.ch));
    return;
  }
  if (item.kind === 'line') {
    if (!text || item.k >= text.lines.length) return;   // 课文还没加载好，或是上一关的图标
    const old = slots.findIndex((s) => s && s.kind === 'line' && s.k === item.k);
    if (old >= 0 && old !== i) removeSlot(old);         // 每句只有一个唱将
    removeSlot(i);
    slots[i] = { kind: 'line', k: item.k };
    renderSlots(); renderBarState();
    if (!checkEggs() && lineUrl(item.k)) A.say(lineUrl(item.k));
    return;
  }
  if (item.kind === 'clip') {
    removeSlot(i);
    slots[i] = { kind: 'clip', id: item.id };
    refreshAudio(i); renderSlots(); A.say(clipUrl(item.id));
    return;
  }
  applyPinyin(i, item);
}

/* 拼音：声母 + 韵母（三拼拖三个）拼成音节，再拖声调 */
function applyPinyin(i, item) {
  let s = slots[i];
  const shake = () => { const el = $('row').children[i]; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); };
  if (item.kind === 'tone') {
    if (!s || s.kind !== 'py' || !s.formed) { shake(); A.say(uiUrl('tonefirst')); return; }
    s.tone = item.t;
  } else if (item.kind === 'whole') {
    removeSlot(i);
    s = slots[i] = { kind: 'py', whole: item.v, sheng: '', yun: '', tone: s && s.kind === 'py' ? s.tone : 1, formed: true };
  } else {
    if (!s || s.kind !== 'py' || s.whole) { removeSlot(i); s = slots[i] = { kind: 'py', sheng: '', yun: '', tone: 1, formed: false }; }
    if (item.kind === 'sheng') s.sheng = item.v;
    else s.yun = s.yun && Py.canJoin(s.yun, item.v) && valid.has(s.sheng + s.yun + item.v) ? s.yun + item.v : item.v;
    const syl = s.sheng + s.yun;
    if (s.sheng && s.yun) {
      if (valid.has(syl)) s.formed = true;
      else {
        s.formed = false; renderSlots(); shake(); A.say(uiUrl('nope'));
        logMistake(`${s.sheng}+${s.yun}`);
        const keep = s; setTimeout(() => { if (slots[i] === keep) { keep.yun = ''; renderSlots(); } }, 900);
        refreshAudio(i); return;
      }
    } else s.formed = !s.sheng && valid.has(s.yun);
  }
  refreshAudio(i); renderSlots();
  if (s.formed && !checkEggs()) A.say(Py.url(Py.sylOf(s), s.tone));
  else if (!s.formed && item.kind === 'sheng') A.say(`audio/voice/sm/${item.v}.mp3`);
  else if (!s.formed && item.kind === 'yun') A.say(`audio/voice/ym/${item.v.replace('ü', 'v')}.mp3`);
}

function logMistake(what) {
  const m = (save.mistakes ||= {}), list = (m[stage.id] ||= []);
  list.push(what); if (list.length > 50) list.shift(); persist();
}

/* 歌手在自己的拍子上跳一下 */
const VSLOT = [0, 4, 8, 12, 2, 6, 10, 14, 1, 9];
A.onStepCallback((st) => {
  document.querySelectorAll('.slot.singer').forEach((el) => {
    const i = +el.dataset.i, s = slots[i];
    if (!s || s.kind === 'line' || muted[i] || st % 16 !== VSLOT[i]) return;
    el.classList.remove('sing'); void el.offsetWidth; el.classList.add('sing');
  });
});

/* ================= rap：台上的唱词从左到右轮流唱 ================= */
function syncRap() {
  if (stage.type !== 'rap' || !text) { A.setRap([]); return; }
  const q = [];
  slots.forEach((s, i) => { if (s && s.kind === 'line' && !muted[i] && lineUrl(s.k)) q.push({ slot: i, k: s.k, url: lineUrl(s.k) }); });
  A.setRap(q, fxOf());
  renderLyricsState();
}
let karaoke = null;
A.onRapCallback((e, t, dur) => {
  document.querySelectorAll('.slot').forEach((el) => el.classList.toggle('rapping', +el.dataset.i === e.slot));
  document.querySelectorAll('#lyrics .lline').forEach((el) => el.classList.toggle('cur', +el.dataset.k === e.k));
  karaoke = { k: e.k, start: performance.now(), dur: dur * 1000 * (style().dark && !style().theme?.includes('ghost') ? 1.16 : 1) };
});
function karaokeTick() {
  requestAnimationFrame(karaokeTick);
  if (!karaoke) return;
  const el = document.querySelector(`#lyrics .lline[data-k="${karaoke.k}"]`);
  if (!el) return;
  const chars = el.querySelectorAll('ruby'), f = Math.min(1, (performance.now() - karaoke.start) / karaoke.dur);
  chars.forEach((c, i) => c.classList.toggle('lit', i < f * chars.length + 0.5));
  if (f >= 1) { chars.forEach((c) => c.classList.remove('lit')); karaoke = null; }
}
requestAnimationFrame(karaokeTick);

function renderLyrics() {
  const box = $('lyrics');
  if (stage.type !== 'rap') { box.hidden = true; return; }
  box.hidden = false;
  if (noText) { box.innerHTML = `<div class="notext">📖 这一课的课文只在家里的电脑上有<br><small>乐手照样可以玩，进化按钮已经打开</small></div>`; return; }
  box.innerHTML = `<div class="ltitle">${text.title}</div>` + text.lines.map((ln, k) => {
    let pi = 0;
    const rb = [...ln.t].map((c) => /[一-鿿]/.test(c) ? `<ruby>${c}<rt>${ln.p[pi++] || ''}</rt></ruby>` : `<span class="pu">${c}</span>`).join('');
    return `<div class="lline" data-k="${k}"><span class="ln" style="background:${SINGER_COLORS[k % 10]}">${k + 1}</span>${rb}<span class="who"></span></div>`;
  }).join('');
  renderLyricsState();
}
function renderLyricsState() {
  if (stage.type !== 'rap' || !text) return;
  document.querySelectorAll('#lyrics .lline').forEach((el) => {
    const k = +el.dataset.k, at = slots.findIndex((s) => s && s.kind === 'line' && s.k === k);
    el.classList.toggle('on', at >= 0);
    el.querySelector('.who').textContent = at >= 0 ? `第 ${at + 1} 个溜溜在唱` : '';
  });
}

/* ================= 图标栏 ================= */
function group(label, cls) {
  const g = document.createElement('div'); g.className = 'grp ' + (cls || '');
  g.innerHTML = `<div class="gl">${label}</div><div class="icons"></div>`;
  $('bar').appendChild(g); return g.querySelector('.icons');
}
function renderBar() {
  $('bar').innerHTML = '';
  const gi = group('乐手', 'ginst');
  INSTRUMENTS.forEach((id) => gi.appendChild(icon({ kind: 'inst', id }, charSVG(id, look(id)), 'ic', NAMES[id])));
  const chars = stage.type === 'mix' ? mixData.chars : stage.chars;
  if (chars) {
    const gc = group('字宝宝');
    shuffle(chars).forEach(([ch, py]) => gc.appendChild(icon({ kind: 'char', ch, py }, `<span class="c">${ch}</span><span class="p">${py}</span>`, 'ic ch', ch)));
  }
  const P = stage.type === 'mix' ? mixData : stage.type === 'pinyin' ? stage : null;
  if (P) {
    if (P.sheng.length) { const g = group('声母'); shuffle(P.sheng).forEach((v) => g.appendChild(icon({ kind: 'sheng', v }, v, 'ic pt sm', '声母 ' + v))); }
    const gy = group('韵母'); shuffle(P.yun).forEach((v) => gy.appendChild(icon({ kind: 'yun', v }, v, 'ic pt ym', '韵母 ' + v)));
    if (P.whole.length) { const g = group('整体认读'); shuffle(P.whole).forEach((v) => g.appendChild(icon({ kind: 'whole', v }, v, 'ic pt wh', '整体认读 ' + v))); }
    const gt = group('声调');
    [1, 2, 3, 4].forEach((t) => gt.appendChild(icon({ kind: 'tone', t }, `<svg viewBox="0 0 40 30"><path d="${TONE_PATH[t - 1]}" fill="none" stroke="#C9921B" stroke-width="4" stroke-linecap="round"/></svg>`, 'ic pt tn', ['一声', '二声', '三声', '四声'][t - 1])));
  }
  if (stage.type === 'rap' && text) {
    const gl = group('唱词');
    shuffle(text.lines.map((_, k) => k)).forEach((k) => gl.appendChild(icon({ kind: 'line', k },
      `<span class="ln" style="background:${SINGER_COLORS[k % 10]}">${k + 1}</span><span class="lt">${[...text.lines[k].t.replace(/[，。！？：；、“”…]/g, '')].slice(0, 3).join('')}</span>${recs[k] ? '<span class="mic">🎤</span>' : ''}`, 'ic li', '第 ' + (k + 1) + ' 句')));
  }
  const gm = group('我的声音');
  clips.forEach((c, n) => gm.appendChild(icon({ kind: 'clip', id: c.id }, `🎙<span class="cn">${n + 1}</span>`, 'ic pt clip', '我录的声音 ' + (n + 1))));
  const add = document.createElement('button'); add.className = 'ic pt clipadd'; add.textContent = '＋'; add.setAttribute('aria-label', '录一个新声音');
  add.addEventListener('click', newClip); gm.appendChild(add);
  renderBarState();
}
async function loadClips() {
  const ids = await store.get('clips', []);
  clips.forEach((c) => URL.revokeObjectURL(c.url));
  clips = [];
  for (const id of ids) { const b = await store.get('clip:' + id, null); if (b) clips.push({ id, url: URL.createObjectURL(b) }); }
}
async function newClip() {
  if (clips.length >= 8) { toast('最多 8 个声音，到家长入口里删掉一些吧'); return; }
  const b = await Rec.quickRecord((m) => { if (m) toast(m); });
  if (!b || b.size < 2000) return;
  const id = Date.now().toString(36);
  await store.set('clip:' + id, b);
  await store.set('clips', [...(await store.get('clips', [])), id]);
  await loadClips(); renderBar(); A.preload(clips.map((c) => c.url));
}
function renderBarState() {
  document.querySelectorAll('.ginst .ic').forEach((b) => b.classList.toggle('on', slots.some((s) => s && s.kind === 'inst' && s.id === b.dataset.id)));
}
function icon(item, html, cls, label) {
  const b = document.createElement('button');
  b.className = cls; b.innerHTML = html; b.setAttribute('aria-label', label);
  if (item.id) b.dataset.id = item.id;
  b.addEventListener('pointerdown', (e) => startDrag(e, b, item));
  return b;
}
// 点图标时读一下
function tapSound(item) {
  if (item.kind === 'char') return zUrl(item.ch);
  if (item.kind === 'sheng') return `audio/voice/sm/${item.v}.mp3`;
  if (item.kind === 'yun') return `audio/voice/ym/${item.v.replace('ü', 'v')}.mp3`;
  if (item.kind === 'whole') return Py.url(item.v, 1);
  if (item.kind === 'line') return lineUrl(item.k);
  if (item.kind === 'clip') return clipUrl(item.id);
  return null;
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
    // 点一下：选中它，再点溜溜；顺便读一遍
    const was = b.classList.contains('sel'); clearSel();
    const u = tapSound(item); if (u) A.say(u);
    if (!was) { selected = item; b.classList.add('sel'); }
  };
  b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
}

/* ================= 彩蛋 ================= */
const foundOf = () => (save.found[stage.id] ||= []);
function eggLabel(e) { return e.kind ? e.w : e.w; }
function renderEggs() {
  const box = $('eggs'); box.innerHTML = '';
  const eggs = stage.eggs || [];
  (eggOrder.length === eggs.length ? eggOrder : (eggOrder = stage.type === 'rap' ? eggs.map((_, k) => k) : shuffle(eggs.map((_, k) => k)))).forEach((k) => {
    const e = eggs[k], f = foundOf().includes(k);
    const b = document.createElement('button');
    b.className = 'egg' + (f ? ' found' : '') + (e.kind ? ' task' : ''); b.dataset.k = k;
    if (e.kind) b.innerHTML = `<span class="w">${f ? '⭐ ' : ''}${e.w}</span>`;
    else b.innerHTML = f ? `<span class="w">${e.w}</span><span class="p">${e.p}</span>` : `<span>🔊 ${'？'.repeat([...e.w].length)}</span>`;
    b.setAttribute('aria-label', f || e.kind ? e.w : '藏起来的词语，点一下听');
    b.addEventListener('click', () => { if (!e.kind) A.say(wUrl(e.w)); });
    box.appendChild(b);
  });
}
function checkEggs() {
  if (!stage.eggs) return false;
  let hit = false;
  const chars = {}, syls = [];
  slots.forEach((s) => {
    if (s && s.kind === 'char') chars[s.ch] = (chars[s.ch] || 0) + 1;
    if (s && s.kind === 'py' && s.formed) syls.push([Py.sylOf(s), s.tone]);
  });
  const order = slots.filter((s) => s && s.kind === 'line').map((s) => s.k);
  stage.eggs.forEach((e, k) => {
    if (foundOf().includes(k)) return;
    let ok = false;
    if (e.kind) {
      const n = text ? text.lines.length : 0, pre = (m) => m > 0 && order.length >= m && order.slice(0, m).every((v, i) => v === i);
      if (e.kind === 'first2') ok = pre(Math.min(2, n));
      if (e.kind === 'half') ok = pre(Math.ceil(n / 2));
      if (e.kind === 'all') ok = order.length === n && pre(n);
      if (e.kind === 'rec') ok = Object.keys(recs).length > 0;
    } else if (e.syl) {
      const pool = [...syls];
      ok = e.syl.every(([sy, t]) => { const j = pool.findIndex(([a, b]) => a === sy && (t === 0 || b === t)); if (j < 0) return false; pool.splice(j, 1); return true; });
    } else {
      const need = {}; [...e.w].forEach((c) => (need[c] = (need[c] || 0) + 1));
      ok = Object.entries(need).every(([c, n]) => (chars[c] || 0) >= n);
    }
    if (!ok) return;
    foundOf().push(k); persist(); hit = true;
    celebrate(e, k);
  });
  return hit;
}
function celebrate(e, k) {
  renderEggs();
  document.querySelector(`.egg[data-k="${k}"]`)?.classList.add('pop');
  $('bw').textContent = e.kind === 'all' ? text.title : e.w;
  $('bp').textContent = e.kind ? (e.kind === 'all' ? '整首连起来啦！' : '找到彩蛋啦！') : e.p;
  $('banner').hidden = false;
  confetti();
  document.querySelectorAll('.slot').forEach((el) => {
    const s = slots[+el.dataset.i];
    const inv = s && (e.kind ? s.kind === 'line' || e.kind === 'all' : s.kind === 'char' ? e.w.includes(s.ch) : s.kind === 'py' && s.formed && (e.syl || []).some(([sy]) => sy === Py.sylOf(s)));
    if (inv) { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); }
  });
  const n = foundOf().length, list = [uiUrl('found')];
  if (e.kind === 'all') { list[0] = uiUrl('rapall'); A.resetRap(); }
  else if (!e.kind) list.push(wUrl(e.w));
  if (n === stage.eggs.length) list.push(uiUrl('allfound'));
  updateEvo();
  const hide = Promise.race([A.say(list), new Promise((r) => setTimeout(r, 6000))]);
  Promise.all([hide, new Promise((r) => setTimeout(r, 2500))]).then(() => { $('banner').hidden = true; if (n === NEED && nextMade()) spotlight(); });
  if (e.kind === 'all') { let c = 0; const iv = setInterval(() => { confetti(); if (++c > 3) clearInterval(iv); }, 1500); }
}
function confetti() {
  const cols = style().dark ? ['#ff3b3b', '#7a1f2a', '#9dff6b', '#888', '#d6b8ff'] : ['#F5C04A', '#FF8FA3', '#86C5FF', '#8EE3A8', '#C3B1FF'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.top = -20 - Math.random() * 100 + 'px';
    c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * .5 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }
}

/* ================= 进化 ================= */
const nextMade = () => !stage.bonus && DATA.stages.find((s) => s.id === stage.id + 1);
function updateEvo() {
  const ready = noText || foundOf().length >= NEED;
  const btn = $('evoBtn');
  btn.hidden = !!stage.bonus;
  if (stage.bonus) return;
  btn.disabled = !ready; btn.classList.toggle('ready', ready && !!nextMade());
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
  if (!nx) { A.say(uiUrl('last')); toast('这是最后一关'); return; }
  A.whoosh();
  const w = $('warp');
  w.classList.toggle('h', !!STYLES[nx.style].dark);
  $('ws').textContent = `第 ${nx.id} 关 · ${nx.lesson}`;
  w.classList.add('on');
  await new Promise((r) => setTimeout(r, 1000));
  await enter(nx.id);
  await new Promise((r) => setTimeout(r, 700));
  w.classList.remove('on');
  if (!style().dark && save.heard[nx.id] === 1) A.say(uiUrl('evolve'), { user: false });
});

/* ================= 地图 ================= */
const isOpen = (s) => (s.bonus ? save.unlocked > s.after : s.id <= save.unlocked);
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
  // 序章放在最前面，一直可以玩
  const pro = DATA.stages.filter((s) => s.prologue);
  if (pro.length) {
    const ph = document.createElement('div'); ph.className = 'bhead'; ph.textContent = '🏫 序章：我上学了';
    box.prepend(ph);
    pro.reverse().forEach((s) => {
      const b = document.createElement('button'), nf = (save.found[s.id] || []).length;
      b.className = 'tile bonus open' + (stage && stage.id === s.id ? ' cur' : '');
      b.innerHTML = `<span class="n">序章</span><span class="t">${s.lesson}</span><span class="s">${'⭐'.repeat(nf) || '可以玩'}</span>`;
      b.addEventListener('click', () => { $('mapLayer').hidden = true; if (s.id !== stage.id) enter(s.id); });
      ph.after(b);
    });
    const mh = document.createElement('div'); mh.className = 'bhead'; mh.textContent = '📚 主线：一年级上册';
    box.insertBefore(mh, box.querySelector('.tile:not(.bonus)'));
  }
  // 彩蛋关：语文园地里的古诗和绕口令，学到那里就打开
  const bonus = DATA.stages.filter((s) => s.bonus && !s.prologue);
  const head = document.createElement('div'); head.className = 'bhead'; head.textContent = '🎁 彩蛋关：语文园地里的古诗和绕口令'; box.appendChild(head);
  bonus.forEach((s) => {
    const open = isOpen(s), nf = (save.found[s.id] || []).length;
    const b = document.createElement('button');
    b.className = 'tile bonus' + (open ? ' open' : ' locked') + (stage && stage.id === s.id ? ' cur' : '');
    b.innerHTML = `<span class="n">彩蛋关</span><span class="t">${s.lesson}</span><span class="s">${open ? '⭐'.repeat(nf) || '可以玩' : `学完第 ${s.after} 关打开`}</span>`;
    b.addEventListener('click', () => { if (open) { $('mapLayer').hidden = true; if (s.id !== stage.id) enter(s.id); } else A.say(uiUrl('locked')); });
    box.appendChild(b);
  });
}
$('mapBtn').addEventListener('click', () => { renderMap(); $('mapLayer').hidden = false; });
$('mapClose').addEventListener('click', () => ($('mapLayer').hidden = true));
$('clearBtn').addEventListener('click', () => { for (let i = 0; i < NS; i++) removeSlot(i); renderSlots(); renderBarState(); });

/* ================= 录歌（最长 30 秒）和我的歌 ================= */
$('songBtn').addEventListener('click', async () => {
  if (A.recordingSong()) { A.stopSong(); return; }
  const btn = $('songBtn'); btn.classList.add('on');
  const blob = await A.startSong((left) => (btn.textContent = `⏹ ${left} 秒`));
  btn.classList.remove('on'); btn.textContent = '⏺ 录歌';
  if (!blob || blob.size < 2000) return;
  const id = Date.now().toString(36), list = await store.get('songs', []);
  list.push({ id, name: `第 ${list.length + 1} 首 · ${stage.lesson}`, date: new Date().toLocaleString('zh-CN') });
  await store.set('song:' + id, blob); await store.set('songs', list);
  toast('录好啦，在"我的歌"里');
});
$('mySongsBtn').addEventListener('click', renderSongs);
async function renderSongs() {
  const list = await store.get('songs', []), box = $('songList');
  box.innerHTML = list.length ? '' : '<p class="empty">还没有歌。点"⏺ 录歌"，录下台上正在演奏的音乐。</p>';
  for (const s of list.slice().reverse()) {
    const row = document.createElement('div'); row.className = 'songrow';
    row.innerHTML = `<span>🎵 ${s.name}<small>${s.date}</small></span><button class="tbtn" data-a="play">▶ 播放</button><button class="tbtn" data-a="del">🗑</button>`;
    row.querySelector('[data-a=play]').onclick = async () => { const b = await store.get('song:' + s.id, null); if (b) { const u = URL.createObjectURL(b); const au = new Audio(u); au.play(); } };
    row.querySelector('[data-a=del]').onclick = async () => { await store.set('song:' + s.id, null); await store.set('songs', (await store.get('songs', [])).filter((x) => x.id !== s.id)); renderSongs(); };
    box.appendChild(row);
  }
  $('songsLayer').hidden = false;
}
$('songsClose').addEventListener('click', () => ($('songsLayer').hidden = true));

/* ================= 家长入口：长按左上角的关卡名 2 秒 ================= */
let parentTimer = null;
$('badge').addEventListener('pointerdown', () => { parentTimer = setTimeout(openParent, 2000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('badge').addEventListener(ev, () => clearTimeout(parentTimer)));
async function openParent() {
  const P = $('parentBody');
  const rows = DATA.stages.map((s) => {
    const f = (save.found[s.id] || []).length, m = (save.mistakes || {})[s.id] || [];
    return `<tr><td>第 ${s.id} 关</td><td>${s.lesson}</td><td>${s.id <= save.unlocked ? '已解锁' : '🔒'}</td><td>${'⭐'.repeat(f)}</td><td class="mis">${m.slice(-8).join('　')}</td></tr>`;
  }).join('');
  const raps = DATA.stages.filter((s) => s.type === 'rap' && !s.public);
  P.innerHTML = `<h3>进度</h3><table class="ptable"><tr><th>关</th><th>课</th><th>状态</th><th>彩蛋</th><th>最近拼错的</th></tr>${rows}</table>
    <div class="pbtns"><button class="tbtn" data-a="unlock">解锁全部关卡</button><button class="tbtn" data-a="export">导出记录</button><button class="tbtn" data-a="clips">删掉所有"我的声音"</button><button class="tbtn danger" data-a="reset">清空进度重新开始</button></div>
    <h3>课文录入</h3><p class="note">在家里电脑上，课文已经从课本里提取好了，不用录入。网上版本没有现代作者的课文，可以在这里录入，一行一句，只存在这台设备上；没有朗读，需要孩子在录音室里自己录。</p>
    <select id="pLesson">${raps.map((s) => `<option value="${s.text}">${s.lesson}</option>`).join('')}</select>
    <textarea id="pText" rows="6" placeholder="一行一句"></textarea><button class="tbtn" data-a="savetext">保存课文</button>`;
  const loadTyped = async () => { const t = await store.get('text:' + $('pLesson').value, null); $('pText').value = t ? t.join('\n') : ''; };
  $('pLesson').onchange = loadTyped; loadTyped();
  P.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'unlock') { save.unlocked = DATA.stages.length; persist(); toast('全部关卡已解锁'); openParent(); }
    if (a === 'export') {
      const blob = new Blob([JSON.stringify(save, null, 1)], { type: 'application/json' });
      const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'liuliu-record.json'; l.click(); URL.revokeObjectURL(u);
    }
    if (a === 'clips') { for (const id of await store.get('clips', [])) await store.set('clip:' + id, null); await store.set('clips', []); await loadClips(); renderBar(); toast('已删掉'); }
    if (a === 'reset' && confirm('确定清空全部进度吗？录音和我的歌会保留。')) { save = { unlocked: 1, current: 1, found: {}, heard: {}, mixEggs: null }; persist(); location.reload(); }
    if (a === 'savetext') {
      const lines = $('pText').value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 7);
      await store.set('text:' + $('pLesson').value, lines.length ? lines : null); toast('课文已保存（最多 7 句）');
    }
  };
  $('parentLayer').hidden = false;
}
$('parentClose').addEventListener('click', () => ($('parentLayer').hidden = true));

/* ================= 录音室 ================= */
$('recBtn').addEventListener('click', () => {
  if (!text) { A.say(uiUrl('local')); return; }
  Rec.open({
    key: stage.text, lines: text.lines, ttsUrl: (k) => text.urls[k] || uiUrl('recready'), say: A.say, prompt: (k) => uiUrl(k),
    onChange: async () => {
      recs = await Rec.loadAll(stage.text, text.lines.length);
      A.preload(text.lines.map((_, i) => lineUrl(i)));
      renderBar(); renderSlots(); checkEggs();
    },
  });
});

/* ================= 启动 ================= */
async function boot() {
  DATA = await (await fetch('content/stages.json')).json();
  save = Object.assign(save, await store.get('save', {}));
  await loadClips();
  $('startBtn').addEventListener('click', async () => {
    $('startLayer').hidden = true;
    await A.init();
    const cs = DATA.stages.find((s) => s.id === save.current);
    enter(cs && isOpen(cs) ? cs.id : Math.min(save.unlocked, 33) || 1);
  });
}
boot();
