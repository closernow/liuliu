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
