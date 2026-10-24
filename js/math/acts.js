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
  clear(box); title(box, step.bins.map((b) => b.label).join(' 和 ') + '，分一分'); say('q_sort');
  const items = shuffle(step.bins.flatMap((b, bi) => shuffle(b.items).slice(0, step.per).map((e) => ({ e, bi }))));
  const tray = h('<div class="tray"></div>'), bins = h('<div class="bins"></div>'); box.append(tray, bins);
  const binEls = step.bins.map((b) => { const el = h(`<div class="bin"><div class="blabel">${b.label}</div><div class="bitems"></div></div>`); bins.appendChild(el); return el; });
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
