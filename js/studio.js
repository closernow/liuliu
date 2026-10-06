// 录音室：先录后玩。每句唱词可以录自己的声音，录好的句子唱的时候用她自己的声音。
// 录音只存在本机的 IndexedDB 里，不上传。
import * as store from './store.js';
import * as A from './audio.js';

const urls = {};                      // 'key:i' -> objectURL
const sizes = {};                     // 'key:i' -> 录音大小，变了才重建链接
const recKey = (key, i) => `rec:${key}:${i}`;

export async function loadAll(key, n) {
  const out = {};
  for (let i = 0; i < n; i++) {
    const blob = await store.get(recKey(key, i), null);
    const id = key + ':' + i;
    if (!blob) { if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; } continue; }
    if (!urls[id] || sizes[id] !== blob.size) {
      if (urls[id]) URL.revokeObjectURL(urls[id]);
      urls[id] = URL.createObjectURL(blob); sizes[id] = blob.size;
    }
    out[i] = urls[id];
  }
  return out;
}

let box = null, st = null;
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

export function open(opts) {
  st = { ...opts, k: 0, blob: null, rec: null };
  if (!box) {
    box = el(`<div class="overlay studio" id="studio"><div class="sbox">
      <div class="shead"><b>🎤 录音室</b><button class="tbtn" data-a="close">✕ 关闭</button></div>
      <div class="sline" id="sLine"></div>
      <div class="snav"><button class="tbtn" data-a="prev">◀ 上一句</button><span id="sNum"></span><button class="tbtn" data-a="next">下一句 ▶</button></div>
      <div class="scount" id="sCount"></div>
      <div class="sbtns">
        <button class="tbtn" data-a="listen">🔊 听一遍</button>
        <button class="recbig" data-a="rec" id="sRec">● 录音</button>
        <button class="tbtn" data-a="mine" id="sMine">▶ 听我的</button>
      </div>
      <div class="sbtns" id="sAfter" hidden><button class="tbtn" data-a="again">↺ 不满意，再录</button><button class="tbtn ok" data-a="ok">下一句 ▶</button></div>
      <div class="sbtns"><button class="tbtn del" data-a="del" id="sDel">🗑 删掉这句录音</button></div>
      <div class="stip" id="sTip">点"听一遍"先听听，再点红色按钮录音。说完停一下会自动结束并保存，台上的唱将马上换成你的声音。</div>
    </div></div>`);
    document.body.appendChild(box);
    box.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a) act(a); });
  }
  box.hidden = false;
  A.quiet(true);
  show();
}
async function show() {
  const ln = st.lines[st.k];
  let pi = 0;
  document.getElementById('sLine').innerHTML = [...ln.t].map((c) => /[一-鿿]/.test(c) ? `<ruby>${c}<rt>${ln.p[pi++] || ''}</rt></ruby>` : `<span>${c}</span>`).join('');
  document.getElementById('sNum').textContent = `第 ${st.k + 1} / ${st.lines.length} 句`;
  const has = !!(await store.get(recKey(st.key, st.k), null));
  document.getElementById('sMine').hidden = !has;
  document.getElementById('sDel').hidden = !has;
  document.getElementById('sAfter').hidden = true;
  document.getElementById('sCount').textContent = has ? '🎤 这句已经录过了' : '';
}
function tip(t) { document.getElementById('sTip').textContent = t; }
async function act(a) {
  if (a === 'close') { stopRec(); box.hidden = true; A.quiet(false); st.onChange(); return; }
  if (a === 'prev') { stopRec(); st.k = (st.k + st.lines.length - 1) % st.lines.length; show(); return; }
  if (a === 'next') { stopRec(); st.k = (st.k + 1) % st.lines.length; show(); return; }
  if (a === 'listen') { st.say(st.ttsUrl(st.k)); return; }
  if (a === 'mine') { const b = await store.get(recKey(st.key, st.k), null); if (b) playBlob(b); return; }
  if (a === 'del') { await store.set(recKey(st.key, st.k), null); show(); st.onChange(); return; }
  if (a === 'rec') { if (st.rec) stopRec(); else record(); return; }
  if (a === 'again') { record(); return; }
  if (a === 'ok') { st.blob = null; st.k = (st.k + 1) % st.lines.length; show(); return; }
}
function playBlob(b) { const u = URL.createObjectURL(b); const au = new Audio(u); au.onended = () => URL.revokeObjectURL(u); au.play(); }

async function record() {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { tip('没有找到麦克风，或者没有允许使用麦克风。'); return; }
  document.getElementById('sAfter').hidden = true;
  const cnt = document.getElementById('sCount');
  for (const n of [3, 2, 1]) { cnt.textContent = n; await new Promise((r) => setTimeout(r, 700)); }
  cnt.textContent = '🔴 正在录……';
  const mr = new MediaRecorder(stream), chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    st.blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    st.rec = null; document.getElementById('sRec').textContent = '● 录音';
    // 录完自动保存（不用再点"好了"），台上这一句马上换成自己的声音
    if (st.blob.size > 2000) {
      await store.set(recKey(st.key, st.k), st.blob);
      cnt.textContent = '🎤 录好啦，已经保存'; playBlob(st.blob);
      document.getElementById('sMine').hidden = false; document.getElementById('sDel').hidden = false;
      st.onChange();
    } else cnt.textContent = '没听到声音，再录一次吧';
    document.getElementById('sAfter').hidden = false;
  };
  // 说完停顿 1.2 秒自动结束，最长 15 秒
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser();
  ac.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize); let spoke = false, quietSince = performance.now(); const t0 = performance.now();
  const watch = () => {
    if (mr.state !== 'recording') { ac.close(); return; }
    an.getFloatTimeDomainData(buf);
    const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
    if (rms > 0.03) { spoke = true; quietSince = performance.now(); }
    if ((spoke && performance.now() - quietSince > 1200) || performance.now() - t0 > 15000) { mr.stop(); ac.close(); return; }
    requestAnimationFrame(watch);
  };
  mr.start(); st.rec = mr; document.getElementById('sRec').textContent = '■ 停止';
  requestAnimationFrame(watch);
}
function stopRec() { if (st && st.rec && st.rec.state === 'recording') st.rec.stop(); }

/* ---------- 自由录音：随便录一个声音，变成图标拿去混音 ---------- */
export async function quickRecord(show) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { show('没有找到麦克风'); return null; }
  A.quiet(true);
  for (const n of [3, 2, 1]) { show(String(n)); await new Promise((r) => setTimeout(r, 700)); }
  show('🔴 录音中，说完停一下');
  const mr = new MediaRecorder(stream), chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (mr.onstop = r));
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser();
  ac.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize); let spoke = false, q = performance.now(); const t0 = performance.now();
  const watch = () => {
    if (mr.state !== 'recording') return;
    an.getFloatTimeDomainData(buf);
    const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
    if (rms > 0.03) { spoke = true; q = performance.now(); }
    if ((spoke && performance.now() - q > 900) || performance.now() - t0 > 6000) { mr.stop(); return; }
    requestAnimationFrame(watch);
  };
  mr.start(); requestAnimationFrame(watch);
  await done; ac.close(); stream.getTracks().forEach((t) => t.stop()); A.quiet(false);
  show('');
  return new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
}
