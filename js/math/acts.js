// 数学闯关的小活动：每个活动一条规则，照着课本那一页的教法做成能点、能拖的版本。
// 每个活动 (box, step) => Promise<错了几次>；box 是放活动的区域，step 是 content/math_stages.json 里的那一步。
import { h, rint, pick, shuffle, sleep, say, num, sfx } from './common.js';

/* ---------- 公用：选答案、反馈 ---------- */
// 一排大按钮，点对了才往下走；点错了晃一下、读"再想一想"，记一次错
function choose(parent, values, correct, { label = (v) => String(v), cls = '' } = {}) {
  return new Promise((res) => {
    let wrong = 0;
    const row = h(`<div class="choices ${cls}"></div>`);
    values.forEach((v) => {
      const b = h(`<button class="cbtn"${v === correct ? ' data-ok="1"' : ''}>${label(v)}</button>`);   // data-ok 只给测试用
      b.onclick = () => {
        if (row.dataset.done) return;
        if (v === correct) { row.dataset.done = 1; b.classList.add('right'); sfx.ok(); say('good'); setTimeout(() => res(wrong), 900); }
        else { wrong++; b.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => b.classList.remove('wrong'), 500); }
      };
      row.appendChild(b);
    });
    parent.appendChild(row);
  });
}
// 正确答案加上几个相近的干扰项
function near(n, lo, hi, k = 3) { const s = new Set([n]); let t = 0; while (s.size < k && t++ < 50) { const v = n + pick([-2, -1, 1, 2, 3]); if (v >= lo && v <= hi) s.add(v); } return [...s].sort((a, b) => a - b); }
function title(box, txt) { const t = h(`<div class="atitle">${txt}</div>`); box.appendChild(t); return t; }
const clear = (box) => (box.innerHTML = '');
// 在一块区域里随机摆 n 个东西，不重叠
function scatter(area, n, emoji, size = 64) {
  const cols = 6, rows = Math.max(2, Math.ceil(n / cols) + 1), cells = shuffle([...Array(cols * rows).keys()]).slice(0, n);
  return cells.map((c) => {
    const e = h(`<div class="obj" style="font-size:${size}px;left:${(c % cols) * (100 / cols) + 2 + Math.random() * 6}%;top:${Math.floor(c / cols) * (100 / rows) + 4 + Math.random() * 8}%">${emoji}</div>`);
    area.appendChild(e); return e;
  });
}

/* ---------- 故事：一页一页讲 ---------- */
export async function story(box, step) {
  for (const sl of step.slides) {
    clear(box);
    box.appendChild(h(`<div class="story"><div class="big">${sl.big}</div><div class="stxt">${sl.text || sl.say}</div></div>`));
    const nb = h('<button class="nextbtn" disabled>下一页 ▶</button>'); box.appendChild(nb);
    const said = say(sl.say); setTimeout(() => (nb.disabled = false), 1200); said.then(() => (nb.disabled = false));
    await new Promise((r) => (nb.onclick = r)); sfx.tap();
  }
  return 0;
}

/* ---------- 数一数：一个一个点着数（点过的出现数字），再选答案 ---------- */
export async function count(box, step) {
  let wrong = 0;
  const ns = []; for (let i = 0; i < step.rounds; i++) ns.push(rint(step.min, step.max));
  if (step.zero && !ns.includes(0)) ns[rint(0, ns.length - 1)] = 0;
  for (const n of ns) {
    clear(box); title(box, n === 0 && step.zero ? '数一数，有几个？' : '数一数，有几个？<small>一个一个点着数</small>');
    const em = pick(step.items), area = h('<div class="area plate"></div>'); box.appendChild(area);
    let k = 0;
    scatter(area, n, em).forEach((e) => (e.onclick = () => { if (e.dataset.c) return; e.dataset.c = ++k; e.classList.add('counted'); e.appendChild(h(`<span class="badge">${k}</span>`)); sfx.tap(); say(num(k)); }));
    say(n ? 'q_count_tap' : 'q_count');
    wrong += await choose(box, near(n, 0, Math.max(step.max, 3), 4), n);
    if (n === 0) await say('zero');
  }
  return wrong;
}

/* ---------- 哪一组是 n 个 ---------- */
export async function pickGroup(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const n = rint(step.min, step.max), em = pick(step.items);
    clear(box); title(box, `哪一组是 <b>${n}</b> 个？`); say('q_group_a', num(n), 'q_group_b');
    const counts = shuffle([n, ...shuffle([1, 2, 3, 4, 5, 6].filter((v) => v !== n)).slice(0, 2)]);
    const row = h('<div class="groups"></div>'); box.appendChild(row);
    await new Promise((res) => counts.forEach((c) => {
      const g = h(`<button class="group"${c === n ? ' data-ok="1"' : ''}>${Array(c).fill(em).join(' ')}</button>`); row.appendChild(g);
      g.onclick = () => { if (row.dataset.done) return; if (c === n) { row.dataset.done = 1; g.classList.add('right'); sfx.ok(); say('good'); setTimeout(res, 900); } else { wrong++; g.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => g.classList.remove('wrong'), 500); } };
    }));
  }
  return wrong;
}

/* ---------- 分一分：把东西拖到对的筐里（点一下东西再点筐也行） ---------- */
export async function sort(box, step) {
  clear(box); title(box, step.bins.length > 2 ? '一样形状的放在一起' : step.bins.map((b) => b.label).join(' 和 ') + '，分一分'); say('q_sort');
  const items = shuffle(step.bins.flatMap((b, bi) => shuffle(b.items).slice(0, step.per).map((e) => ({ e, bi }))));
  const tray = h('<div class="tray"></div>'), bins = h('<div class="bins"></div>'); box.append(tray, bins);
  const binEls = step.bins.map((b) => { const el = h(`<div class="bin"><div class="blabel">${b.shape ? shapeSVG(b.shape, undefined, 56) : ''}${b.label}</div><div class="bitems"></div></div>`); bins.appendChild(el); return el; });
  let wrong = 0, left = items.length, sel = null;
  return new Promise((res) => {
    const place = (it, el, bi) => {
      if (bi === it.bi) { binEls[bi].querySelector('.bitems').appendChild(el); el.classList.remove('sel'); el.style.transform = ''; el.onpointerdown = null; sfx.ok(); if (--left === 0) { say('great'); setTimeout(() => res(wrong), 1000); } }
      else { wrong++; sfx.no(); say('again'); el.classList.add('wrong'); el.style.transform = ''; setTimeout(() => el.classList.remove('wrong'), 500); }
      sel = null;
    };
    items.forEach((it) => {
      const el = h(`<div class="sitem" data-bin="${it.bi}">${it.e}</div>`); tray.appendChild(el);
      // 拖动
      el.onpointerdown = (ev) => {
        ev.preventDefault(); const x0 = ev.clientX, y0 = ev.clientY; let moved = false;
        const mv = (e) => { const dx = e.clientX - x0, dy = e.clientY - y0; if (Math.hypot(dx, dy) > 6) moved = true; el.style.transform = `translate(${dx}px,${dy}px)`; };
        const up = (e) => {
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
          if (!moved) { el.style.transform = ''; sfx.tap(); if (sel) sel.el.classList.remove('sel'); sel = { it, el }; el.classList.add('sel'); return; }
          const bi = binEls.findIndex((b) => { const r = b.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; });
          if (bi < 0) { el.style.transform = ''; return; }
          place(it, el, bi);
        };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      };
    });
    binEls.forEach((b, bi) => (b.onclick = () => sel && place(sel.it, sel.el, bi)));
  });
}

/* ---------- 比较：高矮、大小、长短、多少 ---------- */
const CMP = {
  tall: { ask: ['q_taller', 'q_shorter'], txt: ['哪个高？', '哪个矮？'], em: ['🧒', '👧', '🦒', '🌲', '🐻'] },
  big: { ask: ['q_bigger', 'q_smaller'], txt: ['哪个大？', '哪个小？'], em: ['🎒', '🍉', '🎈', '🐘', '📦'] },
  long: { ask: ['q_longer', 'q_shorter2'], txt: ['哪根长？', '哪根短？'] },
  many: { ask: ['q_more', 'q_less'], txt: ['哪边多？', '哪边少？'], em: ['✏️', '🍬', '🍎', '⭐'] },
};
export async function compare(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const kind = step.kinds[r % step.kinds.length], c = CMP[kind], q = rint(0, 1);
    clear(box); title(box, c.txt[q]); say(c.ask[q]);
    const a = kind === 'many' ? rint(2, 5) : 1, sizes = shuffle(kind === 'many' ? [a, a + rint(2, 3)] : [1, rint(0, 1) ? 0.55 : 0.65]);
    const answer = q === 0 ? sizes.indexOf(Math.max(...sizes)) : sizes.indexOf(Math.min(...sizes));
    const row = h('<div class="cmprow"></div>'); box.appendChild(row);
    const em = c.em ? pick(c.em) : null;
    await new Promise((res) => sizes.forEach((s, i) => {
      let inner;
      if (kind === 'tall') inner = `<div class="tallwrap"><span style="font-size:${Math.round(170 * s)}px">${em}</span></div>`;
      else if (kind === 'big') inner = `<span style="font-size:${Math.round(150 * s)}px">${em}</span>`;
      else if (kind === 'long') inner = `<div class="rope" style="width:${Math.round(260 * s)}px;background:${i ? '#e04848' : '#4878e0'}"></div>`;
      else inner = `<div class="manyrow">${Array(s).fill(`<span>${em}</span>`).join('')}</div>`;
      const b = h(`<button class="cmpitem"${i === answer ? ' data-ok="1"' : ''}>${inner}</button>`); row.appendChild(b);
      b.onclick = () => { if (row.dataset.done) return; if (i === answer) { row.dataset.done = 1; b.classList.add('right'); sfx.ok(); say('good'); setTimeout(res, 900); } else { wrong++; b.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => b.classList.remove('wrong'), 500); } };
    }));
  }
  return wrong;
}

/* ---------- 猜棋子：按提示排除 ---------- */
export async function cups(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const three = r >= 2, colors = three ? shuffle(['red', 'white', 'blue']) : shuffle(['red', 'white', 'blue']).slice(0, 2), ans = rint(0, colors.length - 1);
    const name = { red: '红', white: '白', blue: '蓝' }, clues = [];
    colors.map((c, i) => i).filter((i) => i !== ans).forEach((i, k) => { const atEnd = i === 0 || i === colors.length - 1; clues.push(three && k === 1 && atEnd ? (i === 0 ? 'left' : 'right') : colors[i]); });
    const txt = (c) => c === 'left' ? '棋子不在最左边的杯子下面' : c === 'right' ? '棋子不在最右边的杯子下面' : `棋子不在${name[c]}杯子下面`;
    clear(box); title(box, '棋子藏在哪个杯子下面？'); box.appendChild(h(`<div class="clues">${clues.map((c) => '📜 ' + txt(c)).join('<br>')}</div>`));
    say('q_cups', ...clues.map((c) => 'c_' + c));
    const row = h('<div class="cuprow"></div>'); box.appendChild(row);
    await new Promise((res) => colors.forEach((c, i) => {
      const b = h(`<button class="cup"${i === ans ? ' data-ok="1"' : ''}><span class="piece">${i === ans ? '⚫' : ''}</span><span class="cupbody ${c}"></span></button>`); row.appendChild(b);
      b.onclick = () => { if (row.dataset.done || b.classList.contains('up')) return; b.classList.add('up'); if (i === ans) { row.dataset.done = 1; sfx.ok(); say('good'); setTimeout(res, 1300); } else { wrong++; sfx.no(); say('again'); setTimeout(() => b.classList.remove('up'), 1100); } };
    }));
  }
  return wrong;
}

/* ---------- 添上 1：几添上 1 是几 ---------- */
const frame10 = (n, extra = 0) => `<div class="frame10">${Array.from({ length: 10 }, (_, i) => `<span class="cell">${i < n ? '<i class="dot"></i>' : i < n + extra ? '<i class="dot new"></i>' : ''}</span>`).join('')}</div>`;
export async function addOne(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const n = rint(step.min, step.max);
    clear(box); title(box, `<b>${n}</b> 添上 1 是几？`);
    const f = h(frame10(n)); box.appendChild(f); say(num(n), 'q_addone');
    await sleep(900); box.replaceChild(h(frame10(n, 1)), f); sfx.tap();
    wrong += await choose(box, near(n + 1, 1, 10), n + 1);
  }
  return wrong;
}

/* ---------- 分与合：n 可以分成 a 和几 ---------- */
export async function split(box, step) {
  let wrong = 0;
  // 先自由摆一摆：点一下，东西就跑到另一个盘子里
  if (step.free) {
    const n = step.free; let left = n;
    clear(box); title(box, `把 ${n} 个分到两个盘子里`); say('q_split_free');
    const plates = h('<div class="plates"><div class="pl" id="plA"></div><div class="pl" id="plB"></div></div>'); box.appendChild(plates);
    const read = h('<div class="splitread"></div>'); box.appendChild(read);
    const em = pick(['🍎', '🍓', '🐟', '🌸']);
    const upd = () => (read.innerHTML = `${n} 可以分成 <b>${left}</b> 和 <b>${n - left}</b>`);
    for (let i = 0; i < n; i++) { const o = h(`<span class="pobj">${em}</span>`); plates.children[0].appendChild(o); o.onclick = () => { const toB = o.parentElement === plates.children[0]; plates.children[toB ? 1 : 0].appendChild(o); left += toB ? -1 : 1; sfx.tap(); upd(); }; }
    upd();
    const ok = h('<button class="nextbtn">摆好了 ▶</button>'); box.appendChild(ok);
    await new Promise((r) => (ok.onclick = r));
    say(num(n), 'q_split_a', num(left), num(n - left)); await sleep(1800);
  }
  for (let r = 0; r < step.rounds; r++) {
    const n = rint(step.min, step.max), a = rint(1, n - 1), em = pick(['🍎', '🍓', '🐟', '🌸', '⭐']);
    clear(box); title(box, `<b>${n}</b> 可以分成 <b>${a}</b> 和 <b>□</b>`);
    const plates = h(`<div class="plates"><div class="pl">${Array(a).fill(`<span class="pobj">${em}</span>`).join('')}</div><div class="pl cover"><span class="q">?</span></div></div>`); box.appendChild(plates);
    say(num(n), 'q_split_a', num(a), 'q_split_b');
    wrong += await choose(box, near(n - a, 0, 9), n - a);
    plates.children[1].innerHTML = Array(n - a).fill(`<span class="pobj">${em}</span>`).join(''); plates.children[1].classList.remove('cover');
    await sleep(700);
  }
  return wrong;
}

/* ---------- 认识 0：一个一个吃掉 ---------- */
export async function eatZero(box, step) {
  clear(box); title(box, '点一点，把苹果吃掉'); say('q_eat');
  const plate = h('<div class="plates"><div class="pl big"></div></div>'), read = h(`<div class="splitread">还剩 <b>${step.n}</b> 个</div>`); box.append(plate, read);
  let left = step.n;
  await new Promise((res) => { for (let i = 0; i < step.n; i++) { const o = h('<span class="pobj">🍎</span>'); plate.firstChild.appendChild(o); o.onclick = () => { o.remove(); left--; sfx.tap(); read.innerHTML = `还剩 <b>${left}</b> 个`; say(num(left)); if (!left) setTimeout(res, 700); }; } });
  read.innerHTML = '一个也没有，用 <b class="zero">0</b> 表示'; await say('zero'); await sleep(500);
  return 0;
}

/* ---------- 比较：=、>、< ---------- */
export async function compareSym(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    if (step.mode === 'expr') {   // 算式和数比：7 ○ 2 + 7
      const e = makeEq(pick(['a+b', 'a-b']), 9, true), o = Math.max(0, Math.min(9, e.res + (r === 1 ? 0 : pick([-2, -1, 1, 2])))), ex = `${e.nums[0]} ${e.ops[0]} ${e.nums[1]}`;
      const [ls, rs, lv, rv] = rint(0, 1) ? [ex, o, e.res, o] : [o, ex, o, e.res], ans = lv === rv ? '=' : lv > rv ? '>' : '<';
      clear(box); title(box, '先算一算，再选符号'); box.appendChild(h(`<div class="symq big expr">${ls} ○ ${rs}</div>`)); say('q_cmp');
      wrong += await choose(box, ['>', '=', '<'], ans, { cls: 'sym' });
      box.querySelector('.symq').innerHTML = `${ls} <b>${ans}</b> ${rs}`; await sleep(1200);
      continue;
    }
    let a = rint(step.mode === 'rows' ? 1 : 0, step.max), b = rint(step.mode === 'rows' ? 1 : 0, step.max);
    if (r === 1) b = a;   // 至少有一次一样多
    const ans = a === b ? '=' : a > b ? '>' : '<';
    clear(box); title(box, step.mode === 'rows' ? '对着摆一摆，选符号' : '比一比，选符号');
    if (step.mode === 'rows') {
      const [ea, eb] = pick([['🐰', '🥕'], ['🐻', '🍯'], ['🐱', '🐟'], ['🐵', '🍌']]);
      box.appendChild(h(`<div class="pairs"><div class="prow">${Array(a).fill(`<span>${ea}</span>`).join('')}<b>${a}</b></div><div class="prow">${Array(b).fill(`<span>${eb}</span>`).join('')}<b>${b}</b></div></div>`));
      box.appendChild(h(`<div class="symq">${a} ○ ${b}</div>`));
    } else box.appendChild(h(`<div class="symq big">${a} ○ ${b}</div>`));
    say('q_cmp');
    wrong += await choose(box, ['>', '=', '<'], ans, { cls: 'sym' });
    say(ans === '=' ? 'q_cmp_eq' : ans === '>' ? 'q_cmp_gt' : 'q_cmp_lt'); await sleep(1500);
  }
  return wrong;
}

/* ---------- 第几：小动物运动会 ---------- */
export async function ordinal(box, step) {
  let wrong = 0;
  const kinds = ['pos', 'rank', 'front', 'back'];
  for (let r = 0; r < step.rounds; r++) {
    const ani = shuffle(['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐷', '🦊', '🐯']).slice(0, step.n), kind = kinds[r % 4], k = rint(1, step.n);
    clear(box);
    const row = h(`<div class="race"><span class="finish">🏁</span>${ani.map((a, i) => `<button class="runner${kind !== 'pos' && i === k - 1 ? ' jump' : ''}"${kind === 'pos' && i === k - 1 ? ' data-ok="1"' : ''}>${a}</button>`).join('')}</div>`); box.appendChild(row);
    row.appendChild(h('<div class="arrow">从左边数 →</div>'));
    if (kind === 'pos') {
      title(box, `从左边数，第 <b>${k}</b> 个是谁？`); box.insertBefore(box.lastChild, row); say('q_ord_a', num(k), 'q_ord_b');
      const runners = [...row.querySelectorAll('.runner')];
      await new Promise((res) => runners.forEach((b, i) => (b.onclick = () => { if (row.dataset.done) return; if (i === k - 1) { row.dataset.done = 1; b.classList.add('right'); sfx.ok(); say('good'); setTimeout(res, 900); } else { wrong++; b.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => b.classList.remove('wrong'), 500); } })));
    } else {
      const q = { rank: ['跳起来的小动物排第几？', 'q_rank', k], front: ['跳起来的小动物，左边有几个？', 'q_front', k - 1], back: ['跳起来的小动物，右边有几个？', 'q_back', step.n - k] }[kind];
      title(box, q[0]); box.insertBefore(box.lastChild, row); say(q[1]);
      wrong += await choose(box, near(q[2], 0, step.n, 4), q[2], { label: (v) => (kind === 'rank' ? `第 ${v}` : String(v)) });
    }
  }
  return wrong;
}

/* ================= 第二单元：0~9 的加减法 ================= */
const OPS = { '+': 'plus', '-': 'minus' };
const eqCols = (toks, labs) => `<div class="eqbig">${toks.map((t, i) => `<div class="tok"><b>${t}</b>${labs ? `<small>${labs[i] || ''}</small>` : ''}</div>`).join('')}</div>`;
// 出一道题。form：'a+b' 'a-b' 'a+b+c' 'a-b-c' 'a+b-c' 'a-b+c'；带 ? 的是填空：'a+?=s' '?+b=s' 'a-?=d' '?-b=d'。每一步的结果都在 0~max
function makeEq(form, max, zero = false) {
  const lo = zero ? 0 : 1, ops = [...form.split('=')[0]].filter((c) => c === '+' || c === '-');
  for (let t = 0; t < 500; t++) {
    const nums = [0, ...ops].map(() => rint(lo, max));
    if (ops.length > 1 && nums.some((n) => n === 0)) continue;   // 连加连减不放 0
    let acc = nums[0], ok = true, zero0 = false; ops.forEach((o, i) => { acc = o === '+' ? acc + nums[i + 1] : acc - nums[i + 1]; if (acc < 0 || acc > max) ok = false; if (!acc) zero0 = true; });
    if (!ok || (ops.length > 1 && zero0 && Math.random() < 0.8)) continue;   // 连减算到 0 可以有，但少一点
    const hide = form.includes('?') ? (form[0] === '?' ? 0 : 1) : -1;
    return { nums, ops, res: acc, hide, ans: hide < 0 ? acc : nums[hide] };
  }
}
// 算式拆成一格一格：3 + 2 = □
const eqToks = (e, show = false) => [...e.nums.flatMap((n, i) => (i ? [e.ops[i - 1], i === e.hide && !show ? '□' : n] : [i === e.hide && !show ? '□' : n])), '=', e.hide < 0 && !show ? '□' : e.res];
// 读题："三加二等于几？" "三加几等于七？"
const eqSay = (e) => e.hide < 0 ? [...e.nums.flatMap((n, i) => (i ? [OPS[e.ops[i - 1]], num(n)] : [num(n)])), 'eq_q'] : [e.hide === 0 ? 'q_box' : num(e.nums[0]), OPS[e.ops[0]], e.hide === 1 ? 'q_box' : num(e.nums[1]), 'eq', num(e.res)];
const eqRead = (e) => [...e.nums.flatMap((n, i) => (i ? [OPS[e.ops[i - 1]], num(n)] : [num(n)])), 'eq', num(e.res)];
const dots = (n, cls = '') => Array.from({ length: n }, () => `<i class="pdot ${cls}"></i>`).join('');
// 做一道算式题：显示算式，选答案，答对了把 □ 换成答案
async function solve(box, e, pic = false) {
  const wrap = h('<div class="calcbox"></div>'); box.appendChild(wrap);
  if (pic && e.nums.length === 2 && e.hide < 0) wrap.appendChild(h(`<div class="eqpic">${e.ops[0] === '+' ? dots(e.nums[0]) + '<span class="gap"></span>' + dots(e.nums[1], 'b') : dots(e.nums[0] - e.nums[1]) + dots(e.nums[1], 'x')}</div>`));
  const eq = h(eqCols(eqToks(e))); wrap.appendChild(eq); say(...eqSay(e));
  const w = await choose(box, near(e.ans, 0, Math.max(9, e.ans + 1), 4), e.ans);
  eq.replaceWith(h(eqCols(eqToks(e, true)))); box.querySelector('.choices').remove();
  return w;
}

/* ---------- 认识加法：合起来，往后数 ---------- */
export async function addTogether(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const s = rint(step.min || 3, step.max), a = rint(Math.ceil(s / 2), s - 1), b = s - a, em = pick(step.items);
    clear(box); title(box, '合起来，一共有多少？'); say('q_add');
    const row = h(`<div class="merge"><div class="grp ga">${Array(a).fill(`<span>${em}</span>`).join('')}</div><div class="grp gb">${Array(b).fill(`<span>${em}</span>`).join('')}</div></div>`);
    box.appendChild(row);
    const go = h('<button class="nextbtn">合起来 ▶</button>'); box.appendChild(go);
    await new Promise((res) => (go.onclick = res)); go.remove(); sfx.ok(); row.classList.add('joined'); await sleep(700);
    // 往后数：大的那一堆已经是 a，接着点后来的那几个
    row.querySelector('.ga').appendChild(h(`<span class="gnum">${a}</span>`));
    const tip = h(`<div class="splitread">从 <b>${a}</b> 往后数，点一点后面的</div>`); box.appendChild(tip); say('q_from', num(a), 'q_counton');
    let k = a;
    await new Promise((res) => row.querySelectorAll('.gb span').forEach((el) => (el.onclick = () => { if (el.dataset.c) return; el.dataset.c = 1; k++; el.classList.add('counted'); el.appendChild(h(`<span class="badge">${k}</span>`)); sfx.tap(); say(num(k)); if (k === s) setTimeout(res, 700); })));
    tip.remove(); title(box, '一共有几个？').classList.add('sub');
    wrong += await choose(box, near(s, 1, 10, 4), s);
    box.querySelector('.choices').remove();
    box.appendChild(h(eqCols([a, '+', b, '=', s], r === 0 ? ['加数', '加号', '加数', '', '和'] : null)));
    await say(num(a), 'plus', num(b), 'eq', num(s)); await sleep(600);
  }
  return wrong;
}

/* ---------- 口算：一道一道算 ---------- */
export async function calc(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const e = makeEq(step.forms[r % step.forms.length], step.max || 9, step.zero && r % 3 === 1);
    clear(box); title(box, e.hide < 0 ? '算一算' : '□ 里填几？');
    wrong += await solve(box, e, step.pic);
    await sleep(600);
  }
  return wrong;
}

/* ---------- 加法表、减法表：先填空，再找规律 ---------- */
export async function table(box, step) {
  let wrong = 0;
  const add = step.op === 'add', max = step.max || 9, rows = [];
  if (add) for (let b = max - 1; b >= 1; b--) rows.push(Array.from({ length: max - b }, (_, i) => ({ nums: [i + 1, b], ops: ['+'], res: i + 1 + b, hide: -1 })));
  else for (let n = 2; n <= max; n++) rows.push(Array.from({ length: n - 1 }, (_, i) => ({ nums: [n, i + 1], ops: ['-'], res: n - i - 1, hide: -1 })));
  const all = rows.flat(), blanks = new Set(shuffle(all).slice(0, step.blanks));
  clear(box); title(box, add ? '加法表' : '减法表'); say(add ? 'q_table_add' : 'q_table_sub');
  const tb = h(`<div class="ttable">${rows.map((row) => `<div class="trow">${row.map(() => '<button class="tcell"></button>').join('')}</div>`).join('')}</div>`); box.appendChild(tb);
  const cells = [...tb.querySelectorAll('.tcell')];
  const show = (e, i) => (cells[i].innerHTML = `${e.nums[0]}${e.ops[0]}${e.nums[1]}=${blanks.has(e) ? '<b class="q">?</b>' : `<b>${e.res}</b>`}`);
  all.forEach(show);
  // 1. 把空着的填上
  for (const e of all.filter((x) => blanks.has(x))) {
    const i = all.indexOf(e); cells[i].classList.add('focus'); say(...eqSay(e));
    wrong += await choose(box, near(e.res, 0, max, 4), e.res);
    box.querySelector('.choices').remove(); blanks.delete(e); show(e, i); cells[i].classList.remove('focus'); cells[i].classList.add('filled');
  }
  // 2. 把和（差）是几的都点出来
  const f = step.find, want = all.filter((e) => e.res === f).length;
  title(box, `把${add ? '和' : '差'}是 <b>${f}</b> 的算式都点出来`).classList.add('sub'); say(add ? 'q_find_sum' : 'q_find_diff', num(f), 'q_find_b');
  let got = 0;
  await new Promise((res) => cells.forEach((c, i) => (c.onclick = () => {
    if (c.classList.contains('hit')) return;
    if (all[i].res === f) { c.classList.add('hit'); sfx.ok(); if (++got === want) setTimeout(res, 600); }
    else { wrong++; c.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => c.classList.remove('wrong'), 500); }
  })));
  await say(add ? 'q_rule_add' : 'q_rule_sub'); await sleep(500);
  return wrong;
}

/* ---------- 认识减法：吃掉几个，还剩几个（倒着数） ---------- */
export async function takeAway(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const n = rint(step.min, step.max), k = rint(1, n - 1), em = pick(step.items);
    clear(box); title(box, `原来有 <b>${n}</b> 个，吃掉 <b>${k}</b> 个`); say('q_take_a', num(n), 'q_take_b', num(k), 'q_take_c');
    // 第一轮边吃边倒着数（例题），后面几轮吃完自己数
    const demo = r === 0, pl = h(`<div class="plates"><div class="pl big">${Array(n).fill(`<span class="pobj">${em}</span>`).join('')}</div></div>`), read = h(`<div class="splitread">${demo ? `${n} 倒着数：` : '&nbsp;'}</div>`); box.append(pl, read);
    let ate = 0;
    await new Promise((res) => pl.querySelectorAll('.pobj').forEach((o) => (o.onclick = () => {
      if (o.classList.contains('gone') || ate >= k) return;
      o.classList.add('gone'); ate++; sfx.tap(); if (demo) { say(num(n - ate)); read.innerHTML += `${ate > 1 ? '，' : ''}<b>${n - ate}</b>`; }
      if (ate === k) setTimeout(res, 700);
    })));
    title(box, '还剩几个？').classList.add('sub'); say('q_left');
    wrong += await choose(box, near(n - k, 0, 9, 4), n - k);
    box.querySelector('.choices').remove();
    box.appendChild(h(eqCols([n, '-', k, '=', n - k], r === 0 ? ['被减数', '减号', '减数', '', '差'] : null)));
    await say(num(n), 'minus', num(k), 'eq', num(n - k)); await sleep(600);
  }
  return wrong;
}

/* ---------- 比多少：一个对一个，多出来的就是多几个 ---------- */
export async function moreThan(box, step) {
  let wrong = 0;
  const PAIRS = [['🐶', '🐱'], ['🐰', '🥕'], ['🐵', '🍌'], ['🍎', '🍐'], ['🐔', '🐤']];
  for (let r = 0; r < step.rounds; r++) {
    const big = rint(4, step.max), small = rint(2, big - 1), [ea, eb] = pick(PAIRS), q = r % 2;
    clear(box); title(box, q ? '下面比上面少几个？' : '上面比下面多几个？'); say(q ? 'q_diff_less' : 'q_diff_more');
    const pr = h(`<div class="pairs"><div class="prow">${Array(big).fill(`<span>${ea}</span>`).join('')}</div><div class="prow">${Array(small).fill(`<span>${eb}</span>`).join('')}</div></div>`); box.appendChild(pr);
    const go = h('<button class="nextbtn">一个对一个 ▶</button>'); box.appendChild(go);
    await new Promise((res) => (go.onclick = res)); go.remove(); sfx.tap(); say('q_pair');
    [...pr.children[0].children].forEach((s, i) => s.classList.add(i < small ? 'pair' : 'extra'));
    [...pr.children[1].children].forEach((s) => s.classList.add('pair'));
    await sleep(900);
    wrong += await choose(box, near(big - small, 1, 9, 4), big - small);
    box.querySelector('.choices').remove();
    box.appendChild(h(eqCols([big, '-', small, '=', big - small])));
    await say(num(big), 'minus', num(small), 'eq', num(big - small)); await sleep(600);
  }
  return wrong;
}

/* ---------- 一图四式：看一幅图，写出两道加法、两道减法 ---------- */
export async function family(box, step) {
  let wrong = 0;
  const KINDS = [['🍎', '🍏'], ['🌹', '🌼'], ['🐥', '🐣'], ['🔴', '🔵'], ['🚗', '🚕']];
  for (let r = 0; r < step.rounds; r++) {
    const s = rint(5, step.max), a = rint(1, s - 1), b = s - a, [ea, eb] = pick(KINDS);
    clear(box); title(box, '一幅图，四个算式'); say('q_family');
    box.appendChild(h(`<div class="eqpic big">${Array(a).fill(`<span>${ea}</span>`).join('')}<span class="gap"></span>${Array(b).fill(`<span>${eb}</span>`).join('')}</div>`));
    const list = h('<div class="eqlist"></div>'); box.appendChild(list);
    for (const [x, op, y] of [[a, '+', b], [b, '+', a], [s, '-', a], [s, '-', b]]) {
      const e = { nums: [x, y], ops: [op], res: op === '+' ? x + y : x - y, hide: -1 };
      const line = h(eqCols(eqToks(e))); line.classList.add('focus'); list.appendChild(line); say(...eqSay(e));
      wrong += await choose(box, near(e.res, 0, 9, 4), e.res);
      box.querySelector('.choices').remove(); line.replaceWith(h(eqCols(eqToks(e, true)))); await sleep(300);
    }
    await sleep(700);
  }
  return wrong;
}

/* ---------- 连加、连减、加减混合：看着东西一次一次变，先算前两个，再算后面 ---------- */
export async function chain(box, step) {
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const f = step.forms[r % step.forms.length], e = makeEq(`a${f[0]}b${f[1]}c`, step.max || 9), em = pick(step.items);
    clear(box); title(box, '看一看，算一算'); say('q_look');
    const scene = h(`<div class="scene">${Array(e.nums[0]).fill(`<span>${em}</span>`).join('')}</div>`), cap = h('<div class="splitread"></div>'); box.append(scene, cap);
    cap.innerHTML = `原来有 <b>${e.nums[0]}</b> 个`; await sleep(1200);
    for (let i = 0; i < 2; i++) {
      const n = e.nums[i + 1];
      if (e.ops[i] === '+') { for (let j = 0; j < n; j++) scene.appendChild(h(`<span class="new">${em}</span>`)); cap.innerHTML += `，又来了 <b>${n}</b> 个`; }
      else { shuffle([...scene.querySelectorAll('span:not(.gone)')]).slice(0, n).forEach((s) => s.classList.add('gone')); cap.innerHTML += `，走了 <b>${n}</b> 个`; }
      sfx.tap(); await sleep(1300);
    }
    const eq = h(eqCols(eqToks(e))); box.appendChild(eq);
    const r1 = e.ops[0] === '+' ? e.nums[0] + e.nums[1] : e.nums[0] - e.nums[1];
    const parts = [[{ nums: e.nums.slice(0, 2), ops: [e.ops[0]], res: r1, hide: -1 }, 'q_first', '先算'], [{ nums: [r1, e.nums[2]], ops: [e.ops[1]], res: e.res, hide: -1 }, 'q_then', '再算']];
    for (const [part, key, txt] of parts) {
      const line = h(`<div class="steptip"><span>${txt}</span>${eqCols(eqToks(part))}</div>`); box.appendChild(line); say(key, ...eqSay(part));
      wrong += await choose(box, near(part.res, 0, 9, 4), part.res);
      box.querySelector('.choices').remove(); line.lastElementChild.replaceWith(h(eqCols(eqToks(part, true))));
    }
    eq.replaceWith(h(eqCols(eqToks(e, true)))); await say(...eqRead(e)); await sleep(700);
  }
  return wrong;
}

/* ---------- 猜数字：看样子猜、按提示猜 ---------- */
const LIKE = { 0: '🥚', 1: '✏️', 2: '🦆', 3: '👂', 4: '🚩', 5: '🪝', 8: '🥨', 9: '🥄' };
const LIKE_TXT = { 0: '像鸡蛋', 1: '像铅笔细长条', 2: '像小鸭水上漂', 3: '像耳朵听声音', 4: '像小旗迎风飘', 5: '像衣钩挂衣帽', 8: '像麻花拧一道', 9: '像勺子能盛饭' };
export async function guess(box, step) {
  let wrong = 0;
  if (step.mode === 'shape') {
    for (const d of shuffle(Object.keys(LIKE).map(Number)).slice(0, step.rounds)) {
      clear(box); title(box, `这个数${LIKE_TXT[d]}，猜猜是几？`);
      const pic = h(`<div class="likepic">${LIKE[d]}</div>`); box.appendChild(pic); say('like_' + d, 'g_shape');
      wrong += await choose(box, [...Array(10).keys()], d, { cls: 'digits' });
      pic.innerHTML = `${LIKE[d]} <b>${d}</b>`; await sleep(800);
    }
    return wrong;
  }
  // 按提示猜：不合提示的算错；合提示但不是它，告诉她"比它大""比它小"
  for (const cl of step.clues) {
    const secret = rint(cl.lo, cl.hi);
    clear(box); title(box, '猜数字'); box.appendChild(h(`<div class="clues">💭 ${cl.text || cl.say}</div>`)); say(cl.say);
    const row = h('<div class="choices digits"></div>'), fb = h('<div class="splitread">&nbsp;</div>'); box.append(fb, row);
    await new Promise((res) => [...Array(10).keys()].forEach((v) => {
      const b = h(`<button class="cbtn"${v === secret ? ' data-ok="1"' : ''}>${v}</button>`); row.appendChild(b);
      b.onclick = () => {
        if (row.dataset.done || b.classList.contains('out')) return;
        if (v < cl.lo || v > cl.hi) { wrong++; b.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => b.classList.remove('wrong'), 500); return; }
        if (v === secret) { row.dataset.done = 1; b.classList.add('right'); sfx.ok(); fb.innerHTML = `猜对啦，就是 <b>${v}</b>！`; say('g_got'); setTimeout(res, 1300); return; }
        b.classList.add('out'); sfx.tap(); fb.innerHTML = `比 ${v} <b>${secret > v ? '大' : '小'}</b>`; say(secret > v ? 'g_up' : 'g_down');
      };
    }));
  }
  return wrong;
}

/* ================= 第三单元：认识立体图形 ================= */
const SHAPES = ['cuboid', 'cube', 'cylinder', 'ball'];
const SH_NAME = { cuboid: '长方体', cube: '正方体', cylinder: '圆柱', ball: '球' };
const SH_COL = ['#4a9aff', '#ffb03a', '#4cc96a', '#ff6a7a', '#b56aff', '#3ac8c8'];
const mix = (hex, to, k) => { const a = parseInt(hex.slice(1), 16), b = to === 'w' ? 255 : 0, f = (v) => Math.round(v + (b - v) * k); return `rgb(${f(a >> 16)},${f((a >> 8) & 255)},${f(a & 255)})`; };
let svgId = 0;
// 画一个立体图形（看得出是立体的：正面、顶面、侧面不同深浅）
export function shapeSVG(kind, col = SH_COL[SHAPES.indexOf(kind)], size = 96) {
  const top = mix(col, 'w', .35), side = mix(col, 'k', .22), ln = mix(col, 'k', .45), id = 'sg' + svgId++;
  let body;
  if (kind === 'cuboid') body = `<polygon points="6,50 76,50 76,84 6,84" fill="${col}"/><polygon points="6,50 22,36 92,36 76,50" fill="${top}"/><polygon points="76,50 92,36 92,70 76,84" fill="${side}"/><path d="M6 50h70v34H6zM6 50l16-14h70l-16 14M76 84l16-14V36" fill="none" stroke="${ln}" stroke-width="2.5" stroke-linejoin="round"/>`;
  else if (kind === 'cube') body = `<polygon points="14,42 60,42 60,88 14,88" fill="${col}"/><polygon points="14,42 32,24 78,24 60,42" fill="${top}"/><polygon points="60,42 78,24 78,70 60,88" fill="${side}"/><path d="M14 42h46v46H14zM14 42l18-18h46l-18 18M60 88l18-18V24" fill="none" stroke="${ln}" stroke-width="2.5" stroke-linejoin="round"/>`;
  else if (kind === 'cylinder') body = `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${side}"/><stop offset=".45" stop-color="${top}"/><stop offset="1" stop-color="${side}"/></linearGradient></defs><path d="M26 22V80A24 9 0 0 0 74 80V22Z" fill="url(#${id})" stroke="${ln}" stroke-width="2.5"/><ellipse cx="50" cy="22" rx="24" ry="9" fill="${top}" stroke="${ln}" stroke-width="2.5"/>`;
  else body = `<defs><radialGradient id="${id}" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="${top}"/><stop offset=".6" stop-color="${col}"/><stop offset="1" stop-color="${side}"/></radialGradient></defs><circle cx="50" cy="52" r="38" fill="url(#${id})" stroke="${ln}" stroke-width="2.5"/><ellipse cx="38" cy="36" rx="11" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 38 36)"/>`;
  return `<svg class="shp" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`;
}
const shapeBtn = (k) => shapeSVG(k, pick(SH_COL), 120);
// 身边的东西是什么形状
const LOOKS = { cuboid: ['📦', '🧱', '📕', '🧃', '📺'], cube: ['🎲', '🧊', '🎁'], cylinder: ['🥫', '🔋', '🕯️', '🧻', '🥁'], ball: ['⚽', '🏀', '🌍', '🎾', '🍊'] };

/* ---------- 认一认：哪个是圆柱？/ 猜一猜 / 它像哪种图形 ---------- */
export async function pickShape(box, step) {
  let wrong = 0, last = null;
  for (let r = 0; r < step.rounds; r++) {
    let k; do { k = pick(SHAPES); } while (k === last); last = k;
    clear(box);
    if (step.mode === 'riddle') { title(box, '猜一猜，是哪种图形？'); box.appendChild(h(`<div class="clues">💭 ${RIDDLE[k]}</div>`)); say('rd_' + k); }
    else if (step.mode === 'obj') { title(box, '它的样子像哪种图形？'); box.appendChild(h(`<div class="likepic">${pick(LOOKS[k])}</div>`)); say('q_looklike'); }
    else { title(box, `哪个是<b>${SH_NAME[k]}</b>？`); say('sh_which_' + k); }
    wrong += await choose(box, shuffle(SHAPES), k, { label: shapeBtn, cls: 'shapes' });
    await say('sh_is_' + k); await sleep(300);
  }
  return wrong;
}
const RIDDLE = { cuboid: '长长的，方方的，像一块砖头。', cube: '方方正正的，像一个小骰子。', cylinder: '上下一样粗，直直的，放倒了能滚。', ball: '圆圆的，从哪边看都是圆的，能滚来滚去。' };

/* ---------- 物理：滚一滚、搭积木（matter.js，和水果合成用的同一个） ---------- */
async function loadMatter() {
  if (window.Matter) return window.Matter;
  await new Promise((res) => { const s = document.createElement('script'); s.src = '../js/vendor/matter.min.js'; s.onload = res; document.head.appendChild(s); });
  return window.Matter;
}
const PW = 640, PH = 360, PCOL = { cuboid: '#4a9aff', cube: '#ffb03a', cylinder: '#4cc96a', ball: '#ff6a7a' };
// 一块物理画布：返回 { M, eng, add(kind, x, y, opt), bodies(), stop() }
async function physBox(box, statics, deco = null) {
  const M = await loadMatter(), { Engine, Bodies, Composite } = M;
  const cv = h(`<canvas class="phys" width="${PW * 2}" height="${PH * 2}"></canvas>`); box.appendChild(cv);
  const g = cv.getContext('2d'), eng = Engine.create(); g.scale(2, 2);
  Composite.add(eng.world, [Bodies.rectangle(PW / 2, PH + 20, PW * 2, 60, { isStatic: true, friction: 1 }), Bodies.rectangle(-20, PH / 2, 40, PH * 3, { isStatic: true }), Bodies.rectangle(PW + 20, PH / 2, 40, PH * 3, { isStatic: true }), ...statics(Bodies)]);
  const add = (kind, x, y, standing = true, angle = 0) => {
    const o = { friction: 1, frictionStatic: 8, restitution: 0.05, label: kind };
    let b;
    if (kind === 'ball') b = Bodies.circle(x, y, 22, { ...o, friction: 0.05, frictionStatic: 0.1, frictionAir: 0.004, restitution: 0.3 });
    else if (kind === 'cylinder' && !standing) b = Bodies.circle(x, y, 22, { ...o, friction: 0.05, frictionStatic: 0.1, frictionAir: 0.004, restitution: 0.15 });
    else { const [w, hh] = kind === 'cube' ? [44, 44] : kind === 'cuboid' ? [88, 40] : [40, 62]; b = Bodies.rectangle(x, y, w, hh, { ...o, angle }); b.size = [w, hh]; }
    b.kind = kind; b.col = PCOL[kind]; Composite.add(eng.world, b); return b;
  };
  // 物理按真实时间一步一步算（窗口在后台、画面不刷新时也照样走），画面跟着刷新画
  let alive = true, last = performance.now(), acc = 0;
  const tick = setInterval(() => {
    if (!alive || !cv.isConnected) return clearInterval(tick);
    const now = performance.now(); acc = Math.min(acc + now - last, 200); last = now;
    while (acc >= 1000 / 60) { Engine.update(eng, 1000 / 60); acc -= 1000 / 60; }
  }, 16);
  const draw = () => {
    if (!alive || !cv.isConnected) return;
    g.clearRect(0, 0, PW, PH); if (deco) deco(g);
    for (const b of Composite.allBodies(eng.world)) {
      if (b.isStatic) { if (b.show) { g.fillStyle = b.show; g.beginPath(); b.vertices.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](v.x, v.y)); g.closePath(); g.fill(); } continue; }
      g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle);
      const c = b.col, ln = mix(c, 'k', .45); g.lineWidth = 2.5; g.strokeStyle = ln;
      if (b.kind === 'ball') { const gr = g.createRadialGradient(-7, -8, 2, 0, 0, 24); gr.addColorStop(0, mix(c, 'w', .45)); gr.addColorStop(1, mix(c, 'k', .15)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#fff'; g.globalAlpha = .7; g.beginPath(); g.arc(0, 0, 14, -0.6, 0.6); g.stroke(); }
      else if (!b.size) { g.fillStyle = mix(c, 'k', .12); g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill(); g.stroke(); g.fillStyle = mix(c, 'w', .3); g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(15, 0); g.stroke(); }   // 横着的圆柱：看到圆圆的底面
      else {
        const [w, hh] = b.size; g.fillStyle = c; g.fillRect(-w / 2, -hh / 2, w, hh);
        if (b.kind === 'cylinder') { g.fillStyle = mix(c, 'w', .35); g.beginPath(); g.ellipse(0, -hh / 2, w / 2, 6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-w / 2, -hh / 2); g.lineTo(-w / 2, hh / 2); g.ellipse(0, hh / 2, w / 2, 6, 0, Math.PI, 0, true); g.lineTo(w / 2, -hh / 2); g.stroke(); }
        else { g.fillStyle = mix(c, 'w', .35); g.fillRect(-w / 2, -hh / 2, w, 8); g.strokeRect(-w / 2, -hh / 2, w, hh); }
      }
      g.restore();
    }
    requestAnimationFrame(draw);
  };
  draw();
  return { M, eng, cv, add, bodies: () => Composite.allBodies(eng.world).filter((b) => !b.isStatic), remove: (b) => Composite.remove(eng.world, b), stop: () => (alive = false) };
}

/* ---------- 滚一滚：放到斜坡上，看谁会滚 ---------- */
export async function roll(box, step) {
  clear(box); title(box, '放到斜坡上，看看谁会滚'); say('q_roll');
  const ph = await physBox(box, (B) => { const r = B.rectangle(235, 205, 460, 22, { isStatic: true, angle: 0.36, friction: 1, frictionStatic: 8 }); r.show = '#c8925a'; return [r]; },
    (g) => { g.fillStyle = '#ead2a8'; g.beginPath(); g.moveTo(20, 130); g.lineTo(450, 288); g.lineTo(450, PH - 10); g.lineTo(20, PH - 10); g.fill(); g.fillStyle = '#9ad06a'; g.fillRect(0, PH - 10, PW, 10); });   // 斜坡下面垫实，地面是草地
  const fb = h('<div class="splitread">&nbsp;</div>'), row = h('<div class="choices shapes"></div>'); box.append(fb, row);
  const tried = new Set();
  await new Promise((res) => SHAPES.forEach((k) => {
    const b = h(`<button class="cbtn">${shapeSVG(k, PCOL[k], 72)}</button>`); row.appendChild(b);
    b.onclick = () => {
      ph.bodies().forEach((x) => ph.remove(x)); sfx.tap();
      const body = ph.add(k, 70, k === 'ball' || k === 'cylinder' ? 60 : 100, false, 0.36);   // 方的顺着斜坡放上去，不是扔上去 fb.innerHTML = `把<b>${SH_NAME[k]}</b>放上去……`;
      setTimeout(() => {   // 滚了一大段就算滚下去
        if (body.position.x - 70 > 140) { fb.innerHTML = `${SH_NAME[k]}<b>滚下去了</b>！`; say('r_roll'); }
        else { fb.innerHTML = `${SH_NAME[k]}<b>停在坡上</b>，没有滚`; say('r_stay'); }
        b.classList.add('right'); tried.add(k); if (tried.size === 4 && !box.querySelector('.nextbtn')) { const nb = h('<button class="nextbtn">都试过了 ▶</button>'); box.appendChild(nb); nb.onclick = res; }
      }, 2600);
    };
  }));
  ph.stop();
  let wrong = 0;
  for (let r = 0; r < step.rounds; r++) {
    const can = pick(['ball', 'cylinder']), cant = pick(['cube', 'cuboid']), q = r % 2;
    clear(box); title(box, q ? '哪个<b>不能</b>滚？' : '哪个<b>能</b>滚？'); say(q ? 'q_cantroll' : 'q_canroll');
    wrong += await choose(box, shuffle([can, cant]), q ? cant : can, { label: shapeBtn, cls: 'shapes' });
  }
  return wrong;
}

/* ---------- 搭积木：搭到小旗那么高；球放上去会滚下来 ---------- */
export async function stack(box, step) {
  clear(box); title(box, '搭积木，搭到小旗那么高'); say('q_stack');
  const FLAG = PH - 150;   // 地面在 PH-10，大约要搭 3~4 块
  const ph = await physBox(box, () => [], (g) => { g.fillStyle = '#9ad06a'; g.fillRect(0, PH - 10, PW, 10); g.save(); g.strokeStyle = '#ffb000'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(PW / 2 - 150, FLAG); g.lineTo(PW / 2 + 150, FLAG); g.stroke(); g.font = '34px "Segoe UI Emoji",sans-serif'; g.fillText('🚩', PW / 2 + 150, FLAG + 4); g.restore(); });
  const fb = h('<div class="splitread">点下面的积木，放下去</div>'), row = h('<div class="choices shapes"></div>'); box.append(fb, row);
  const again = h('<button class="btn ghost">重来</button>');
  await new Promise((res) => {
    let won = false;
    SHAPES.forEach((k) => {
      const b = h(`<button class="cbtn">${shapeSVG(k, PCOL[k], 72)}</button>`); row.appendChild(b);
      b.onclick = () => {
        if (won) return;
        const bs = ph.bodies(); if (bs.length >= 10) ph.remove(bs[0]);
        const top = Math.min(PH - 10, ...ph.bodies().filter((x) => Math.abs(x.position.x - PW / 2) < 60).map((x) => x.bounds.min.y));
        ph.add(k, PW / 2, Math.max(30, top - 50), true); sfx.tap();   // 从正上方、离顶上不远的地方轻轻放下
        if (k === 'ball') setTimeout(() => !won && (fb.innerHTML = '球是圆的，<b>放不稳</b>，滚走了', say('r_ballroll')), 1600);
      };
    });
    row.appendChild(again); again.onclick = () => { ph.bodies().forEach((x) => ph.remove(x)); fb.innerHTML = '点下面的积木，放下去'; };
    const chk = setInterval(() => {
      if (!box.isConnected) return clearInterval(chk);
      const bs = ph.bodies(); if (!bs.length || bs.some((b) => b.speed > 0.08)) return;
      if (bs.some((b) => b.bounds.min.y < FLAG && Math.abs(b.position.x - PW / 2) < 120)) { won = true; clearInterval(chk); sfx.win(); say('great'); fb.innerHTML = '搭到小旗啦！'; setTimeout(res, 1400); }
    }, 400);
  });
  ph.stop();
  clear(box); title(box, '哪个放在最上面，会<b>滚下来</b>？'); say('q_topfall');
  return await choose(box, shuffle(SHAPES), 'ball', { label: shapeBtn, cls: 'shapes' });
}

/* ================= 综合与实践：前后、上下、左右 ================= */
const ANI = [['🐱', 'cat', '小猫'], ['🐶', 'dog', '小狗'], ['🐰', 'rabbit', '小兔'], ['🐻', 'bear', '小熊'], ['🐼', 'panda', '熊猫'], ['🐵', 'monkey', '小猴'], ['🐷', 'pig', '小猪'], ['🐸', 'frog', '青蛙'], ['🐔', 'chick', '小鸡'], ['🦊', 'fox', '狐狸'], ['🐯', 'tiger', '老虎'], ['🐨', 'koala', '考拉']];
const DIRS = { up: [-1, 0, '上面'], down: [1, 0, '下面'], left: [0, -1, '左面'], right: [0, 1, '右面'], front: [-1, 0, '前面'], back: [1, 0, '后面'] };
// 在场景里点出是谁（点错晃一下，记一次错）
function tapWho(cells, ans) {
  return new Promise((res) => { let wrong = 0, done = false; cells.forEach((el, i) => (el.onclick = () => {
    if (done) return;
    if (i === ans) { done = true; el.classList.add('right'); sfx.ok(); say('good'); setTimeout(() => res(wrong), 1000); }
    else { wrong++; el.classList.add('wrong'); sfx.no(); say('again'); setTimeout(() => el.classList.remove('wrong'), 500); }
  })); });
}
export async function position(box, step) {
  let wrong = 0;
  const order = shuffle([0, 1, 2, 3]);   // 方向轮着问，不会一直问左面
  for (let r = 0; r < step.rounds; r++) {
    clear(box);
    if (step.mode === 'queue') {   // 排队上车：离车近的是前面
      const q = shuffle(ANI).slice(0, 5), kind = ['front', 'back', 'first', 'last'][r % 4];
      let who = rint(1, 3), ans;
      if (kind === 'front') ans = who - 1; else if (kind === 'back') ans = who + 1; else ans = kind === 'first' ? 0 : 4;
      title(box, kind === 'first' ? '排在<b>最前面</b>的是谁？' : kind === 'last' ? '排在<b>最后面</b>的是谁？' : `${q[who][0]} ${q[who][2]}的<b>${DIRS[kind][2]}</b>是谁？`);
      const sc = h(`<div class="queue"><span class="bus">🚌<small>车站</small></span>${q.map((a, i) => `<button class="qa${(kind === 'front' || kind === 'back') && i === who ? ' me' : ''}"${i === ans ? ' data-ok="1"' : ''}>${a[0]}</button>`).join('')}<div class="qarrow">← 前　　　后 →</div></div>`); box.appendChild(sc);
      say(...(kind === 'first' ? ['pos_first'] : kind === 'last' ? ['pos_last'] : ['nm_' + q[who][1], `pos_${kind}_who`]));
      wrong += await tapWho([...sc.querySelectorAll('.qa')], ans);
      continue;
    }
    // shelf：玩具架 3×3（上下左右）；class：教室座位 3 排 4 个，黑板在前面（前后左右）
    const R = 3, C = step.mode === 'class' ? 4 : 3, an = shuffle(ANI).slice(0, R * C), dirs = step.mode === 'class' ? ['front', 'back', 'left', 'right'] : ['up', 'down', 'left', 'right'];
    const askDir = step.mode === 'shelf' && r % 2 === 1;   // 玩具架上隔一题问"在哪一面"
    let me, d, rr, cc;
    d = dirs[order[Math.floor(r / (step.mode === 'shelf' ? 2 : 1)) % 4]];
    do { me = rint(0, R * C - 1); rr = Math.floor(me / C) + DIRS[d][0]; cc = (me % C) + DIRS[d][1]; } while (rr < 0 || rr >= R || cc < 0 || cc >= C);
    const other = rr * C + cc;
    const sc = h(`<div class="${step.mode === 'class' ? 'classroom' : 'shelf'}">${step.mode === 'class' ? '<div class="board">黑板（前面）</div>' : ''}<div class="seats" style="grid-template-columns:repeat(${C},1fr)">${an.map((a, i) => `<button class="seat${i === (askDir ? other : me) ? ' me' : ''}"${!askDir && i === other ? ' data-ok="1"' : ''}>${a[0]}</button>`).join('')}</div></div>`);
    if (askDir) {   // 小猫在小狗的哪一面？（问 other 在 me 的哪一面）
      title(box, `${an[other][0]} ${an[other][2]}在${an[me][0]} ${an[me][2]}的哪一面？`); box.appendChild(sc); sc.querySelectorAll('.seat')[me].classList.add('me2');
      say('nm_' + an[other][1], 'pos_in', 'nm_' + an[me][1], 'pos_which');
      wrong += await choose(box, ['up', 'down', 'left', 'right'], d, { label: (v) => DIRS[v][2] });
    } else {
      title(box, `${an[me][0]} ${an[me][2]}的<b>${DIRS[d][2]}</b>是谁？`); box.appendChild(sc);
      say('nm_' + an[me][1], `pos_${d}_who`);
      wrong += await tapWho([...sc.querySelectorAll('.seat')], other);
    }
  }
  return wrong;
}
