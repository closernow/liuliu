// 伙伴解锁：一开始 8 个，之后靠找彩蛋、每天来玩、完成特殊任务慢慢解锁。
// 解锁结果完全由存档算出来（找到的彩蛋、礼物数、特殊任务标记），不会丢。
export const INITIAL = ['dong', 'papa', 'cha', 'dada', 'beng', 'dang', 'ling', 'ding'];
// 每找到 2 个彩蛋（或每天第一次来玩送一个礼物），按这个顺序解锁下一个
export const QUEUE = ['dongci', 'dada2', 'hong', 'zizi', 'gudong', 'jiu', 'zheng', 'dingdang', 'wawa', 'you', 'kaka', 'xiuxiu',
  'dongda', 'bengcha', 'pengpeng', 'tongtong', 'qiangqiang', 'pada', 'dida', 'gege', 'guagua', 'dongba', 'dengdeng', 'wengwu',
  'dingdong', 'gulu', 'baba', 'bobo', 'wangwang'];
const HORROR = [3, 6, 8, 12, 15, 18, 21, 24, 27, 28, 30, 33];
// 特殊任务：完成了就解锁对应的伙伴
export const SPECIAL = {
  ying: { how: '在恐怖关找到一个彩蛋', test: (s) => HORROR.some((id) => (s.found[id] || []).length) },
  hei: { how: '在录音室录一句自己的声音', test: (s) => !!(s.special || {}).rec },
  puca: { how: '点"我的声音"里的＋，录一个声音', test: (s) => !!(s.special || {}).clip },
  miaomiao: { how: '点"⏺ 录歌"，录一首歌', test: (s) => !!(s.special || {}).song },
  heiha: { how: '在彩蛋关或序章里把整首排对', test: (s, D) => D.stages.some((st) => st.bonus && (s.found[st.id] || []).includes(2)) },
  bibi: { how: '在拼音关里一共拼对 30 个音节', test: (s) => (s.pyOK || 0) >= 30 },
  dongqiang: { how: '在第 33 关全书大混音里找到彩蛋', test: (s) => (s.found[33] || []).length > 0 },
  shuashua: { how: '写字一共得到 30 颗星星', test: (s) => starCount(s) >= 30 },
};

// 写字的星星：每个字最多 3 颗，每攒 6 颗送一个伙伴
export const starCount = (s) => Object.values(s.write || {}).reduce((n, v) => n + v, 0);
export const eggCount = (s) => Object.values(s.found || {}).reduce((n, a) => n + a.length, 0);
export function compute(s, D) {
  const out = new Set(INITIAL);
  const n = Math.floor(eggCount(s) / 2) + (s.gifts || 0) + Math.floor(starCount(s) / 6);
  QUEUE.slice(0, n).forEach((id) => out.add(id));
  for (const [id, sp] of Object.entries(SPECIAL)) if (sp.test(s, D)) out.add(id);
  return out;
}
// 还没解锁的伙伴怎么解锁
export function hint(id, s) {
  if (SPECIAL[id]) return SPECIAL[id].how;
  const k = QUEUE.indexOf(id), have = Math.floor(eggCount(s) / 2) + (s.gifts || 0) + Math.floor(starCount(s) / 6);
  const need = Math.max(1, (k + 1 - have) * 2 - (eggCount(s) % 2));
  return `再找 ${need} 个彩蛋就能解锁（写字攒星星、每天第一次来玩也会送）`;
}
// 接下来最快能解锁的几个（图标栏里放带锁的剪影吊胃口）
export function next(s, D, n = 3) {
  const got = compute(s, D);
  return [...QUEUE.filter((id) => !got.has(id)).slice(0, n - 1), ...Object.keys(SPECIAL).filter((id) => !got.has(id)).slice(0, 1)];
}
