// 家长测试模式：长按页面标题 2 秒打开 / 关上（只记在这台设备的浏览器里）。
// 打开后：数学闯关、消消乐、水果合成的关卡全部能进；页面右下角出现 🛠️ 工具箱，里面是测试用的按钮（跳关、直接过关、显示答案……）。
const KEY = 'liuliuParent';
export const isParent = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
function setParent(on) { try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch {} }

export function toast(msg) {
  const t = document.createElement('div'); t.className = 'ptoast'; t.textContent = msg; style(); document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
// 按住 2 秒才算（孩子随手点不会打开）
export function longPress(el, cb, ms = 2000) {
  if (!el) return; let timer = null;
  el.addEventListener('pointerdown', () => { timer = setTimeout(cb, ms); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, () => clearTimeout(timer)));
}
export function bindToggle(el) {
  longPress(el, () => { const on = !isParent(); setParent(on); toast(on ? '🛠️ 家长测试模式：开' : '家长测试模式：关'); setTimeout(() => location.reload(), 900); });
}

// 右下角的工具箱。items：[['按钮文字', 函数], …]；再调用一次就换成新的按钮
let box = null;
export function tools(items) {
  if (!isParent()) return; style();
  if (!box) {
    box = document.createElement('div'); box.className = 'ptools';
    box.innerHTML = '<button class="ptog" title="家长测试模式">🛠️</button><div class="plist" hidden></div>';
    box.querySelector('.ptog').onclick = () => { const l = box.querySelector('.plist'); l.hidden = !l.hidden; };
    document.body.appendChild(box);
  }
  const list = box.querySelector('.plist'); list.innerHTML = '';
  for (const [label, fn] of [...items, ['关掉家长模式', () => { setParent(false); location.reload(); }]]) {
    const b = document.createElement('button'); b.textContent = label; b.onclick = () => fn(); list.appendChild(b);
  }
}

let styled = false;
function style() {
  if (styled) return; styled = true;
  const s = document.createElement('style');
  s.textContent = `.ptools{position:fixed;right:12px;bottom:12px;z-index:50;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:8px;font-family:system-ui,sans-serif}
.ptog{width:52px;height:52px;border-radius:50%;border:3px solid #fff;background:#3a3a4a;font-size:26px;box-shadow:0 4px 12px rgba(0,0,0,.35);cursor:pointer}
.plist{display:flex;flex-direction:column;gap:6px;background:rgba(30,30,40,.92);padding:10px;border-radius:14px;max-height:70vh;overflow:auto}.plist[hidden]{display:none}
.plist button{border:none;border-radius:10px;background:#fff;color:#222;font:700 15px system-ui,sans-serif;padding:8px 14px;text-align:left;cursor:pointer;white-space:nowrap}
.ptoast{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:60;background:#3a3a4a;color:#fff;font:800 18px system-ui,sans-serif;padding:10px 22px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.3)}
body.showans [data-ok]{outline:5px dashed #ff2aa0!important;outline-offset:2px}`;
  document.head.appendChild(s);
}
