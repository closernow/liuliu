// 数学闯关的一关：按 content/math_stages.json 里的步骤一步一步走（例题 → 课堂活动 → 练习），走完算星星。
// stage.html?id=6；水果合成那一步会跳到 fruit.html，玩完带着 &step= 回来接着走。
import { $, h, loadVoice, audio, say, sfx, stopVoice, setStars } from './common.js';
import * as A from './acts.js';

const Q = new URLSearchParams(location.search), id = +Q.get('id') || 1;
let data, stage, mistakes = 0;
const KEY = `mathStage${id}`;   // 跳去水果合成时记住已经错了几次

async function main() {
  [data] = await Promise.all([fetch('../content/math_stages.json').then((r) => r.json()), loadVoice()]);
  stage = data.stages.find((s) => s.id === id);
  if (!stage || !stage.ready) { location.href = 'map.html'; return; }
  document.title = `第 ${id} 关 ${stage.title} · 溜溜数学`;
  $('stTitle').textContent = `第 ${id} 关 · ${stage.title}`;
  $('stPage').textContent = `课本第 ${stage.page} 页`;
  $('dots').innerHTML = stage.steps.map(() => '<i></i>').join('');
  const from = +Q.get('step') || 0;
  if (from) {   // 从水果合成回来
    mistakes = +(sessionStorage.getItem(KEY) || 0);
    const st = +(sessionStorage.getItem('fruitResult') || 3); mistakes += 3 - st; sessionStorage.removeItem('fruitResult');
    $('startLayer').hidden = true; run(from);
  } else {
    sessionStorage.removeItem(KEY);
    $('startTitle').textContent = `第 ${id} 关`; $('startSub').textContent = stage.title;
    $('goBtn').onclick = () => { audio(); $('startLayer').hidden = true; run(0); };
  }
}
async function run(from) {
  const box = $('act');
  for (let i = from; i < stage.steps.length; i++) {
    const step = stage.steps[i];
    [...$('dots').children].forEach((d, k) => (d.className = k < i ? 'done' : k === i ? 'cur' : ''));
    $('replay').onclick = () => step.say && say(step.say);
    if (step.type === 'fruit') {   // 水果合成：跳过去玩一局，玩完回来
      sessionStorage.setItem(KEY, String(mistakes));
      box.innerHTML = ''; box.appendChild(h(`<div class="story"><div class="big">🍉</div><div class="stxt">${step.text || step.say}</div></div>`));
      const b = h('<button class="nextbtn">去玩 ▶</button>'); box.appendChild(b); say(step.say);
      await new Promise((r) => (b.onclick = r));
      const ret = `stage.html?id=${id}&step=${i + 1}`;
      location.href = `fruit.html?t=${step.t}&pool=${step.pool.join(',')}&goal=${step.goal}&name=${encodeURIComponent(stage.title)}&ret=${encodeURIComponent(ret)}`;
      return;
    }
    if (step.type !== 'story' && step.say) { box.innerHTML = ''; box.appendChild(h(`<div class="story small"><div class="stxt">${step.text || step.say}</div></div>`)); await say(step.say); }
    mistakes += await A[step.type](box, step);
  }
  finish();
}
async function finish() {
  stopVoice();
  [...$('dots').children].forEach((d) => (d.className = 'done'));
  const st = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
  await setStars(id, st);
  sessionStorage.removeItem(KEY);
  sfx.win(); say('pass');
  $('doneStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
  $('doneTxt').textContent = !mistakes ? '一次都没错，真棒！' : st === 3 ? `只错了 ${mistakes} 次，很棒！` : `错了 ${mistakes} 次，再玩一次能得更多星星`;
  const next = data.stages.find((s) => s.id === id + 1);
  $('nextBtn').hidden = !(next && next.ready);
  $('nextBtn').onclick = () => (location.href = `stage.html?id=${id + 1}`);
  $('doneLayer').hidden = false;
}
$('againBtn').onclick = () => (location.href = `stage.html?id=${id}`);
main();
