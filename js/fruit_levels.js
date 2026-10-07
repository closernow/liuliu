// 水果合成的关卡：两个水果加起来正好是目标数才合成。对应西师版一年级上册的分与合（认识 2~9）和凑十（进位加法）。
// pool：会掉下来的数；goal：要凑成几次
export const UNITS = [
  { name: '第一单元 · 分与合', levels: [
    { id: 'c3', name: '凑 3', mode: 'target', t: 3, pool: [1, 2], goal: 5 },
    { id: 'c4', name: '凑 4', mode: 'target', t: 4, pool: [1, 2, 3], goal: 5 },
    { id: 'c5', name: '凑 5', mode: 'target', t: 5, pool: [1, 2, 3, 4], goal: 6 },
    { id: 'c6', name: '凑 6', mode: 'target', t: 6, pool: [1, 2, 3, 4, 5], goal: 6 },
    { id: 'c7', name: '凑 7', mode: 'target', t: 7, pool: [1, 2, 3, 4, 5, 6], goal: 6 },
    { id: 'c8', name: '凑 8', mode: 'target', t: 8, pool: [1, 2, 3, 4, 5, 6, 7], goal: 7 },
    { id: 'c9', name: '凑 9', mode: 'target', t: 9, pool: [1, 2, 3, 4, 5, 6, 7, 8], goal: 7 },
  ] },
  { name: '第五单元 · 凑十', levels: [
    { id: 'c10', name: '凑 10', mode: 'target', t: 10, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9], goal: 8 },
  ] },
];
export const LEVELS = UNITS.flatMap((u) => u.levels);
export const TIPS = { target: (t) => `两个水果加起来正好是 ${t}，才能合成` };
