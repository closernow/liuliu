// 离线缓存：玩过的东西存起来，没网也能玩。
// 页面和程序先用缓存、后台更新（下次打开就是新版）；声音文件用缓存，没有再下载。
const CACHE = 'liuliu-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'css/game.css', 'manifest.json']))); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/private/')) return;      // 家里电脑上的课文不缓存，免得混进网上版本
  const isAudio = /\.(mp3|flac)$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    if (hit && isAudio) return hit;
    return hit ? (e.waitUntil(net), hit) : net;
  }));
});
