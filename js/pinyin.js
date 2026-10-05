// 拼音小工具：拆音节、标声调、j q x y 后面的 ü 去掉两点。规则和 tools/pinyin_data.py 一致。
const SHENG = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const YUN = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong'];
const WHOLE = ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying'];
// 三拼：介母 + 韵母（ie üe ui iu 是独立韵母，不算三拼）
const THREE = new Set(['i|a', 'u|a', 'u|o', 'i|ao', 'u|ai', 'i|an', 'u|an', 'ü|an', 'i|ang', 'u|ang', 'i|ong']);
const MARK = { a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', ü: 'ǖǘǚǜ' };

export const canJoin = (a, b) => THREE.has(a + '|' + b);
export const sylOf = (s) => s.whole || (s.sheng || '') + (s.yun || '');
export function display(syl) {
  return /^[jqxy]/.test(syl) ? syl.replace(/ü/g, 'u') : syl;
}
export function mark(syl, tone) {
  const s = display(syl);
  if (!tone) return s;
  let i = s.indexOf('a');
  if (i < 0) i = s.indexOf('e');
  if (i < 0 && s.includes('ou')) i = s.indexOf('o');
  if (i < 0) for (let k = s.length - 1; k >= 0; k--) if ('aoeiuü'.includes(s[k])) { i = k; break; }
  return s.slice(0, i) + MARK[s[i]][tone - 1] + s.slice(i + 1);
}
export const url = (syl, tone) => `audio/voice/p/${syl.replace(/ü/g, 'v')}${tone || 1}.mp3`;
export function split(syl) {
  if (WHOLE.includes(syl)) return { whole: syl };
  const sheng = SHENG.find((x) => syl.startsWith(x)) || '';
  const rest = syl.slice(sheng.length);
  if (YUN.includes(rest)) return { sheng, yun: [rest] };
  if (THREE.has(rest[0] + '|' + rest.slice(1))) return { sheng, yun: [rest[0], rest.slice(1)] };
  return { sheng, yun: [rest] };
}
