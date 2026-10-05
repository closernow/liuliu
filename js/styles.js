// 每个世界的风格：用哪套乐器声音、背景、角色挂件和恐怖件。
// 角色全书固定；同一个世界里的几关只换内容，挂件按关号轮换，背景色调微调。
// 设计依据见 docs/DESIGN.md 第 4、7 节。
// 乐手按类别固定排列（不打乱，方便孩子每次都在老地方找到）
// 2026-10-05 删掉了不带感、容易打乱节奏的：呜呜 呼呼 啦啦 嘀嘟 嗡嗡 嘟嘟
export const GROUPS = [
  ['鼓', ['dong', 'dongci', 'dongda', 'bengcha', 'dada2', 'papa', 'pengpeng', 'tongtong', 'dongqiang']],
  ['小打击乐', ['cha', 'dada', 'qiangqiang', 'pada', 'dida', 'dingdang', 'gege', 'guagua', 'gudong', 'dongba']],
  ['人声节奏', ['puca', 'ying', 'heiha', 'hei', 'miaomiao', 'wangwang']],
  ['低音', ['beng', 'hong', 'wawa', 'dengdeng', 'wengwu']],
  ['和声旋律', ['dang', 'zizi', 'zheng', 'ling', 'you', 'jiu', 'dingdong', 'gulu', 'baba', 'bibi']],
  ['音效', ['ding', 'xiuxiu', 'kaka', 'bobo']],
];
const INST = GROUPS.flatMap((g) => g[1]);

/* ---------- 恐怖件库：按位置分组，同一组只能选一个 ---------- */
const GROUP = {
  eyeL: ['dangleL', 'wormL', 'buttonL', 'patchL', 'blankL'],
  eyeR: ['dangleR', 'wormR', 'buttonR'],
  eyeTop: ['thirdEye', 'stalks'],
  eyes: ['hollow', 'sewnEyes', 'cyclops'],
  mouth: ['zipMouth', 'gapTeeth', 'sewnMouth', 'bigMouth', 'teeth', 'gasMask'],
  front: ['heart', 'ribs', 'hole', 'zipBody', 'bellyMouth', 'hazmat'],
  legs: ['pegLeg', 'wisp', 'bandLeg', 'backFeet'],
  armL: ['boneL', 'armOffL'],
  top: ['lid', 'knife', 'candle', 'web'],
  wrap: ['bandHead', 'faceWrap', 'mummyWrap'],
  back: ['cape', 'batWings', 'tentacles'],
};
const groupOf = (p) => Object.keys(GROUP).find((g) => GROUP[g].includes(p));
// 通用恐怖件（每个主题都能抽）
const COMMON = ['crack', 'melt', 'nails', 'flies', 'bugs', 'scar', 'stitchCheek', 'bodyStitch', 'cracksBody', 'chain', 'claws', 'bandArm',
  'wristR', 'extraArm', 'shadow', 'longTongue', 'multiSmall', 'web', 'knife', 'lid', 'dangleR', 'dangleL', 'wormL', 'wormR', 'buttonL',
  'zipMouth', 'gapTeeth', 'sewnMouth', 'ribs', 'hole', 'zipBody', 'woundEye', 'pegLeg', 'boneL', 'hollow', 'veins'];
// 每个恐怖主题的招牌恐怖件
const THEME = {
  zombie: { sig: ['rags', 'drool', 'blankL', 'armOffL', 'moss', 'lid', 'bugs', 'flies'], glow: '#9dff6b', tint: '#6b8f4e', mix: 0.55 },
  virus: { sig: ['gasMask', 'hazmat', 'goo', 'pustules', 'glowVeins', 'cyclops'], glow: '#7dff3b' },
  ghost: { sig: ['ghostly', 'sheet', 'chains', 'wisp', 'candle', 'hollow'], glow: '#7fd8ff', tint: '#cfe6ff', mix: 0.5 },
  fog: { sig: ['rust', 'ash', 'faceWrap', 'barbed', 'radio', 'nails'], glow: '#ffb02e', tint: '#8a8a8a', mix: 0.6 },
  shadow: { sig: ['shadow', 'longShadow', 'smoky', 'hollow', 'bodyEyes', 'tendrils'], glow: '#d6b8ff', black: true },
  ultimate: { sig: ['rags', 'goo', 'chains', 'ash', 'smoky', 'shadow', 'lid', 'pustules', 'barbed', 'drool'], glow: '#ff3b3b' },
  deepsea: { sig: ['tentacles', 'angler', 'barnacles', 'gills', 'hollow', 'melt'], glow: '#5cf5ff', tint: '#3a6a8a', mix: 0.5 },
  vampire: { sig: ['fangs', 'cape', 'batWings', 'bats', 'hollow'], glow: '#ff2a3a', tint: '#d8d0e0', mix: 0.55 },
  alien: { sig: ['stalks', 'thirdEye', 'goo', 'tentacles', 'pustules'], glow: '#b6ff3b', tint: '#7ac46a', mix: 0.5 },
  mummy: { sig: ['mummyWrap', 'scarab', 'hollow', 'bugs', 'cracksBody'], glow: '#ffd23a', tint: '#c8b48a', mix: 0.55 },
  toys: { sig: ['buttonL', 'buttonR', 'windKey', 'strings', 'cracksBody', 'stitchCheek', 'zipMouth'], glow: '#ff7ac8', tint: '#f0d0e0', mix: 0.35 },
};
// 固定随机数：同一个角色在同一主题里每次都一样
function rand(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function pick(theme, id, count) {
  const r = rand(theme + id), T = THEME[theme], out = [], used = new Set();
  const tryAdd = (p) => {
    if (out.includes(p) || out.length >= count) return;
    const g = groupOf(p);
    if (g && used.has(g)) return;
    if ((g === 'eyeL' || g === 'eyeR') && used.has('eyes')) return;
    if (g === 'eyes' && (used.has('eyeL') || used.has('eyeR'))) return;
    if (out.includes('sheet') && ['eyeL', 'eyeR', 'eyes', 'mouth', 'top', 'wrap'].includes(g)) return;
    if (g) used.add(g);
    out.push(p);
  };
  const shuffled = (a) => a.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  if (theme === 'ghost') tryAdd('ghostly');
  // 有些招牌恐怖件太"盖脸"，只给一部分角色，免得全场一个样
  const RARE = { sheet: 0.3, hazmat: 0.45, gasMask: 0.45, faceWrap: 0.4, cyclops: 0.4 };
  shuffled(T.sig).filter((p) => !(p in RARE) || r() < RARE[p]).slice(0, Math.ceil(count * 0.6)).forEach(tryAdd);
  shuffled(COMMON).forEach(tryAdd);
  return out;
}
const cycle = (list, shift = 0) => Object.fromEntries(INST.map((id, i) => [id, id === 'ying' ? 'scarf' : list[(i + shift) % list.length]]));

const bright = (name, loops, hats, singerHat) => ({ name, loops, dark: false, hats, singerHat });
const horror = (name, loops, theme, level) => ({ name, loops, dark: true, theme, level });

export const STYLES = {
  sky: bright('天和地', '1', null, 'sprout'),   // 第 1 关用角色自带的挂件；序章《我是中国人》也用这个世界
  wuxing: bright('金木水火土', 'wx', ['goldcrown', 'twig', 'drop', 'flame', 'clay', 'chef', 'crown'], 'clay'),
  shanchuan: bright('日月山川', 'sc', ['sunhat', 'moonclip', 'peaks', 'wave', 'rice', 'straw', 'cowboy', 'party'], 'straw'),
  ocean: bright('海底', 'oc', ['goggles', 'seaweed', 'bubbles', 'starfish', 'shell', 'snorkel', 'pirate', 'crown'], 'shell'),
  space: bright('太空', 'sp', ['helmet', 'antenna2', 'planet', 'visor', 'rocket', 'ufo', 'propeller', 'knight'], 'antenna2'),
  campus: bright('校园和节日', 'xy', ['gradcap', 'pencil', 'flagclip', 'lantern', 'redscarf', 'book', 'chef', 'propeller', 'party'], 'redscarf'),
  season: bright('四季和江南', 'sj', ['maple', 'snowflake', 'flowercrown', 'sunhat', 'umbrella', 'lotus', 'cowboy', 'viking'], 'lotus'),
  night: bright('夜空和动物', 'ye', ['moonboat', 'feather', 'rabbit', 'bear', 'drop', 'starclip', 'wizard', 'ninja', 'catears'], 'moonboat'),
  horror1: { name: '黑森林', loops: '2', dark: true, level: 1 },
  zombie: horror('僵尸', 'zb', 'zombie', 2),
  virus: horror('病毒和生化实验室', 'vr', 'virus', 3),
  ghost: horror('幽灵鬼屋', 'gh', 'ghost', 4),
  fog: horror('雾中小镇', 'fg', 'fog', 5),
  shadow: horror('影子怪', 'sd', 'shadow', 6),
  deepsea: horror('深海怪', 'ds', 'deepsea', 2),
  vampire: horror('吸血鬼城堡', 'vp', 'vampire', 3),
  alien: horror('外星寄生', 'al', 'alien', 4),
  mummy: horror('木乃伊金字塔', 'mm', 'mummy', 5),
  toys: horror('诡异玩具屋', 'ty', 'toys', 6),
  ultimate: horror('终极大混合', 'ul', 'ultimate', 7),
};
// 恐怖等级越高，每个角色的恐怖件越多
const COUNT = { 2: 6, 3: 6, 4: 7, 5: 7, 6: 8, 7: 10 };

// 第 3 关黑森林：手工挑的，每个角色四到六件，围绕"口耳目手足"
const FOREST = {
  dong: ['heart', 'bodyStitch', 'crack', 'nails', 'flies'], cha: ['dangleR', 'wormL', 'crack', 'melt', 'bugs'],
  papa: ['boneL', 'wristR', 'bandHead', 'claws', 'extraArm'], beng: ['multi', 'teeth', 'zipBody', 'shadow'],
  ding: ['cyclops', 'veins', 'melt', 'web', 'chain'], wuwu: ['hollow', 'meltBody', 'hole', 'shadow', 'flies'],
  didu: ['glitch', 'wires', 'nails', 'cracksBody', 'pegLeg'], ling: ['sewnMouth', 'buttonL', 'knife', 'ribs', 'web'],
  dudu: ['tornEar', 'patchL', 'bandHead', 'scar', 'woundEye', 'chain'], huhu: ['bellyMouth', 'sewnEyes', 'lid', 'bugs'],
  lala: ['bigMouth', 'stitchCheek', 'claws', 'ribs', 'flies'], ying: ['coolGlow', 'grin', 'tendrils', 'bodyEyes', 'shadowDrip', 'shadow'],
  dang: ['zipMouth', 'ribs', 'nails', 'flies', 'scar'], weng: ['hollow', 'longTongue', 'web', 'chain', 'cracksBody'],
  you: ['buttonR', 'sewnMouth', 'bandArm', 'knife', 'bugs'], zheng: ['dangleL', 'teeth', 'cracksBody', 'claws', 'shadow'],
  zizi: ['cyclops', 'veins', 'wires', 'zipBody'], dongci: ['multi', 'gapTeeth', 'lid', 'extraArm'],
  dada: ['wormR', 'scar', 'pegLeg', 'bodyStitch', 'flies'], hong: ['bigMouth', 'multiSmall', 'crack', 'chain'],
  jiu: ['sewnEyes', 'longTongue', 'nails', 'bugs', 'web'], hei: ['dangleR', 'stitchCheek', 'claws', 'shadow', 'bandHead'],
  dada2: ['dangleL', 'teeth', 'bodyStitch', 'flies', 'chain'], gudong: ['hollow', 'bigMouth', 'claws', 'bugs'],
  dingdang: ['buttonR', 'zipMouth', 'crack', 'web', 'pegLeg'], puca: ['multiSmall', 'stitchCheek', 'ribs', 'shadow'],
  xiuxiu: ['cyclops', 'veins', 'wires', 'cracksBody'], wawa: ['wormL', 'gapTeeth', 'lid', 'extraArm'],
  kaka: ['sewnEyes', 'longTongue', 'nails', 'bandArm', 'scar'],
};
const FOREST_SINGER = [
  ['handEyes', 'crack', 'zipMouth'], ['dangleL', 'bandLeg', 'stitchCheek'], ['multiSmall', 'gapTeeth', 'chain'], ['hollow', 'longTongue', 'cracksBody'],
  ['buttonR', 'sewnMouth', 'pegLeg'], ['wormR', 'scar', 'bandArm'], ['cyclops', 'veins', 'teeth', 'claws'],
];

export const SINGER_COLORS = ['#86C5FF', '#FF8FA3', '#FFD166', '#8EE3A8', '#C3B1FF', '#FFB86B', '#7FDBFF', '#F7A1E0', '#B8E986', '#FFC2A8'];
export const LOOPKEY = { dong: 'kick', cha: 'shaker', papa: 'clap', beng: 'bass', ding: 'chime', wuwu: 'sweep', didu: 'blip', ling: 'bells', dudu: 'lead', huhu: 'pad', lala: 'choir', ying: 'snap',
  dang: 'epiano', weng: 'cello', you: 'violin', zheng: 'guitar', zizi: 'saw', dongci: 'edm', dada: 'trap', hong: '808', jiu: 'arp', hei: 'vox',
  dada2: 'snare', gudong: 'conga', dingdang: 'cowbell', puca: 'beatbox', xiuxiu: 'laser', wawa: 'wobble', kaka: 'scratch',
  dongda: 'breaks', bengcha: 'dembow', tongtong: 'toms', qiangqiang: 'ride', pada: 'tamb', dida: 'clave', dongqiang: 'gong', dingdong: 'steel',
  gulu: 'marimba', baba: 'brass', dengdeng: 'slap', bibi: 'chip', pengpeng: 'stomp', heiha: 'chant', bobo: 'bubble', gege: 'castanet',
  wengwu: 'reese', dongba: 'djembe', guagua: 'guiro', miaomiao: 'meow', wangwang: 'bark' };
export const INSTRUMENTS = INST;

function hexMix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('');
}
function themeLook(S, key, baseCol) {
  const T = THEME[S.theme], look = { dark: true, glow: T.glow, parts: pick(S.theme, key, COUNT[S.level]) };
  if (T.black) { look.colFinal = '#0d0b12'; look.stroke = '#3a2f52'; }
  else if (T.tint && baseCol) look.col = hexMix(baseCol, T.tint, T.mix);
  return look;
}

// stageId 用来在同一个世界里轮换挂件；baseCol 是角色本来的颜色（恐怖主题会混色）
export function lookFor(style, id, stageId = 0, baseCol) {
  const S = STYLES[style];
  if (style === 'horror1') return { dark: true, parts: FOREST[id] || pick('ultimate', id, 5) };
  if (S.dark) {
    const l = themeLook(S, id, baseCol);
    // 影影保留招牌的紫光眼和裂嘴笑
    if (id === 'ying') l.parts = ['coolGlow', 'grin', ...l.parts.filter((p) => !['eyes', 'eyeL', 'eyeR', 'mouth'].includes(groupOf(p)) && p !== 'sheet')];
    return l;
  }
  return { dark: false, hat: S.hats ? cycle(S.hats, stageId)[id] : undefined, parts: [] };
}
export function singerLook(style, slot, card, stageId = 0) {
  const S = STYLES[style], col = SINGER_COLORS[slot % SINGER_COLORS.length];
  if (style === 'horror1') return { dark: true, parts: FOREST_SINGER[slot % FOREST_SINGER.length], card, col, hat: 'book' };
  if (S.dark) {
    const l = themeLook(S, 'singer' + slot, col);
    l.parts = l.parts.filter((p) => p !== 'sheet');          // 白布会挡住字卡
    return { ...l, card, col, hat: null };
  }
  return { dark: false, hat: S.singerHat || 'sprout', parts: [], card, col };
}
