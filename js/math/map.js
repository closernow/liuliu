// 数学闯关地图：33 关，按课本顺序沿路走。过了上一关开下一关；家长面板"解锁数学全部关卡"后全开。
import { $, h, getSave } from './common.js';

(async () => {
  const [data, save] = await Promise.all([fetch('../content/math_stages.json').then((r) => r.json()), getSave()]);
  const st = save.stages, all = !!save.all;
  let open = 1; while (st[open]) open++;   // 第一个还没过的关
  const path = $('path');
  data.stages.forEach((s) => {
    const unit = data.units.find((u) => u.from === s.id);
    if (unit) path.appendChild(h(`<div class="unit">${unit.name}</div>`));
    const done = st[s.id] || 0, can = s.ready && (all || s.id <= open);
    const n = h(`<button class="node${done ? ' done' : ''}${can ? '' : ' locked'}${s.id === open && s.ready ? ' cur' : ''}">
      <span class="ic">${s.ready ? (can ? s.icon : '🔒') : '🚧'}</span><span class="no">${s.id}</span>
      <span class="nt">${s.title}</span><span class="ns">${s.ready ? (done ? '★'.repeat(done) + '☆'.repeat(3 - done) : '') : '制作中'}</span></button>`);
    if (can) n.onclick = () => (location.href = `stage.html?id=${s.id}`);
    path.appendChild(n);
  });
  const cur = path.querySelector('.cur'); if (cur) cur.scrollIntoView({ block: 'center' });
  const total = Object.values(st).reduce((a, b) => a + b, 0);
  $('total').textContent = `⭐ ${total}`;
})();
