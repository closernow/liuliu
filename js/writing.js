// 写字：课本写字表 100 个字，学到哪一关就能写哪些字。
// 每个字三步：看一看（笔顺动画）→ 描一描（照着淡色字写）→ 写一写（自己写）。最多 3 颗星。
// 笔顺判断用 Hanzi Writer（js/vendor/，MIT），笔画数据在 content/strokes/（Arphic Public License）。
import * as A from './audio.js';

const code = (c) => c.codePointAt(0).toString(16);
const zUrl = (c) => `audio/voice/z/${[...c].map(code).join('-')}.mp3`;
const ui = (k) => `audio/voice/ui/${k}.mp3`;
let W = null, opts = null, writer = null, cur = null, run = 0;

const $ = (id) => document.getElementById(id);
function tianzige(n) {
  return `<svg class="tzg" viewBox="0 0 100 100"><rect x="1" y="1" width="98" height="98" fill="#fffdf5" stroke="#e05a5a" stroke-width="1.5"/>
    <path d="M50 1V99M1 50H99M1 1L99 99M99 1L1 99" stroke="#e05a5a" stroke-width=".6" stroke-dasharray="3 3" opacity=".7"/></svg>`;
}

export async function open(o) {
  opts = o;
  if (!W) W = await (await fetch('content/writing.json')).json();
  $('writeLayer').hidden = false;
  A.quiet(true);
  showList();
  if (!opts.save.heardWrite) { opts.save.heardWrite = 1; opts.persist(); A.say(ui('writehello'), { user: false }); }
}
export function close() {
  run++; writer = null;
  $('writeLayer').hidden = true;
  A.quiet(false);
}

function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
function showList() {
  const s = opts.save, got = s.write || {};
  const total = Object.values(got).reduce((a, b) => a + b, 0);
  $('wBody').innerHTML = `<p class="wsum">⭐ 一共 ${total} 颗星星　每攒 6 颗星送一个新伙伴，攒满 30 颗解锁写字伙伴"刷刷"</p>` + W.groups.map((g) => {
    const open = g.stage <= s.unlocked;
    return `<div class="wgrp${open ? '' : ' off'}"><div class="wgt">${g.title}${open ? '' : `　🔒 学到第 ${g.stage} 关开放`}</div><div class="wchars">` +
      g.chars.map(([c, p]) => `<button class="wch" data-c="${c}" data-p="${p}" ${open ? '' : 'disabled'}><span class="c">${c}</span><span class="p">${p}</span><span class="st">${stars(got[c] || 0)}</span></button>`).join('') + '</div></div>';
  }).join('');
  $('wBody').querySelectorAll('.wch:not([disabled])').forEach((b) => b.addEventListener('click', () => write(b.dataset.c, b.dataset.p)));
  $('wBack').hidden = true;
}

// 写一个字
async function write(c, p) {
  const my = ++run;
  cur = { c, p, step: 1, mistakes: 0 };
  $('wBody').innerHTML = `<div class="wpad">
    <div class="wleft"><div class="wbig">${c}</div><div class="wpy">${p}</div><button class="tbtn" id="wSay">🔊 读一读</button><button class="tbtn" id="wAnim">▶ 再看笔顺</button></div>
    <div class="wbox">${tianzige()}<div id="wTarget"></div></div>
    <div class="wright"><div class="wsteps"><span data-s="1">① 看一看</span><span data-s="2">② 描一描</span><span data-s="3">③ 写一写</span></div><div class="wmsg" id="wMsg"></div><div class="wstars" id="wStars"></div><div id="wAfter" hidden><button class="tbtn ok" id="wAgain">↺ 再写一次</button><button class="tbtn" id="wNext">下一个字 ▶</button></div></div>
  </div>`;
  $('wBack').hidden = false;
  $('wSay').onclick = () => A.say(zUrl(c));
  $('wAnim').onclick = () => writer && writer.animateCharacter();
  $('wAgain').onclick = () => write(c, p);
  $('wNext').onclick = () => {
    const all = W.groups.filter((g) => g.stage <= opts.save.unlocked).flatMap((g) => g.chars);
    const k = all.findIndex((x) => x[0] === c), nx = all[(k + 1) % all.length];
    write(nx[0], nx[1]);
  };
  const size = Math.min(320, Math.floor(window.innerHeight * 0.48));
  $('wTarget').style.width = $('wTarget').style.height = size + 'px';
  document.querySelector('.wbox .tzg').style.width = document.querySelector('.wbox .tzg').style.height = size + 'px';
  writer = HanziWriter.create('wTarget', c, {
    width: size, height: size, padding: 10, showOutline: true, showCharacter: false,
    strokeColor: '#1f1a33', outlineColor: '#d8d0e0', highlightColor: '#ffb703', drawingColor: '#3d6fd8',
    strokeAnimationSpeed: 0.8, delayBetweenStrokes: 350, drawingWidth: 26,
    charDataLoader: (ch, onLoad, onErr) => fetch(`content/strokes/${code(ch)}.json`).then((r) => r.json()).then(onLoad).catch(onErr),
  });
  A.say(zUrl(c));
  step(1);
  await writer.animateCharacter();                 // ① 看一看
  if (my !== run) return;
  step(2); msg('照着淡色的字，一笔一笔描');           // ② 描一描
  await quiz(true, my);
  if (my !== run) return;
  step(3); msg('自己写一写，按笔顺来');               // ③ 写一写
  writer.hideOutline();
  cur.mistakes = 0;
  await quiz(false, my);
  if (my !== run) return;
  // 星星：描完 1 颗；自己写错两次以内 2 颗；一次都没错 3 颗
  const n = cur.mistakes === 0 ? 3 : cur.mistakes <= 2 ? 2 : 1;
  const got = (opts.save.write ||= {});
  const before = got[c] || 0;
  if (n > before) { got[c] = n; opts.persist(); }
  $('wStars').innerHTML = `<span class="pop">${stars(n)}</span>`;
  msg(n === 3 ? '一次都没写错！' : n === 2 ? '写得很好！' : '写完啦！再试一次能得更多星星');
  A.say([ui('star' + n), zUrl(c)], { user: false });
  opts.celebrate(c, n);
  $('wAfter').hidden = false;
  if (n > before) opts.onStars();
}
function quiz(outline, my) {
  return new Promise((res) => {
    writer.quiz({
      showHintAfterMisses: outline ? 1 : 3,
      leniency: 1.3,
      onMistake: () => { if (my === run) { cur.mistakes++; msg(outline ? '跟着淡色的笔画走' : '再想想这一笔怎么写'); } },
      onCorrectStroke: () => { if (my === run) msg(''); },
      onComplete: () => setTimeout(res, 500),
    });
  });
}
function step(n) { cur.step = n; document.querySelectorAll('.wsteps span').forEach((e) => e.classList.toggle('on', +e.dataset.s === n)); }
function msg(t) { const m = $('wMsg'); if (m) m.textContent = t; }

export function init() {
  $('wClose').addEventListener('click', close);
  $('wBack').addEventListener('click', () => { run++; showList(); });
}
