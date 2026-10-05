// 存档：IndexedDB，只存本机。打不开时退回内存（刷新后丢失，但游戏照常能玩）。
let dbp = null;
const mem = new Map();
function open() {
  if (!dbp) dbp = new Promise((res) => {
    try {
      const r = indexedDB.open('liuliu', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
export async function get(key, dflt) {
  const db = await open();
  if (!db) return mem.has(key) ? mem.get(key) : dflt;
  return new Promise((res) => {
    const q = db.transaction('kv').objectStore('kv').get(key);
    q.onsuccess = () => res(q.result === undefined ? dflt : q.result);
    q.onerror = () => res(dflt);
  });
}
export async function set(key, val) {
  mem.set(key, val);
  const db = await open(); if (!db) return;
  return new Promise((res) => {
    const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(val, key);
    t.oncomplete = res; t.onerror = res;
  });
}
