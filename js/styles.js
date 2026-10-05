// 每个阶段的风格：用哪套乐器声音、背景、角色挂件和恐怖件。
// 设计依据见 docs/DESIGN.md 第 4、7 节。
const INST = ['dong', 'cha', 'papa', 'beng', 'ding', 'wuwu', 'didu', 'ling', 'dudu', 'huhu', 'lala', 'ying'];
const cycle = (list) => Object.fromEntries(INST.map((id, i) => [id, id === 'ying' ? 'scarf' : list[i % list.length]]));

export const STYLES = {
  sky: {
    name: '天和地', loops: '1', dark: false,
    hats: {},                               // 用角色自带的：云朵帽、小草芽、小太阳……
    singer: { hat: 'sprout' },
  },
  wuxing: {
    name: '金木水火土', loops: 'wx', dark: false,
    hats: cycle(['goldcrown', 'twig', 'drop', 'flame', 'clay']),
    singer: { hat: 'clay' },
  },
  horror1: {
    name: '第一次恐怖', loops: '2', dark: true, horror: 1,
    hats: {},
    // 每个角色四五件，围绕"口耳目手足"
    parts: {
      dong: ['heart', 'bodyStitch', 'crack', 'nails', 'flies'],
      cha: ['dangleR', 'wormL', 'crack', 'melt', 'bugs'],
      papa: ['boneL', 'wristR', 'bandHead', 'claws', 'extraArm'],
      beng: ['multi', 'teeth', 'zipBody', 'shadow'],
      ding: ['cyclops', 'veins', 'melt', 'web', 'chain'],
      wuwu: ['hollow', 'meltBody', 'hole', 'shadow', 'flies'],
      didu: ['glitch', 'wires', 'nails', 'cracksBody', 'pegLeg'],
      ling: ['sewnMouth', 'buttonL', 'knife', 'ribs', 'web'],
      dudu: ['tornEar', 'patchL', 'bandHead', 'scar', 'woundEye', 'chain'],
      huhu: ['bellyMouth', 'sewnEyes', 'lid', 'bugs'],
      lala: ['bigMouth', 'stitchCheek', 'claws', 'ribs', 'flies'],
      ying: ['coolGlow', 'grin', 'tendrils', 'bodyEyes', 'shadowDrip', 'shadow'],
    },
    // 识字歌手每个位置一套不同的恐怖件
    singerParts: [
      ['handEyes', 'crack', 'zipMouth'],
      ['dangleL', 'bandLeg', 'stitchCheek'],
      ['multiSmall', 'gapTeeth', 'chain'],
      ['hollow', 'longTongue', 'cracksBody'],
      ['buttonR', 'sewnMouth', 'pegLeg'],
      ['wormR', 'scar', 'bandArm'],
      ['cyclops', 'veins', 'teeth', 'claws'],
    ],
    singer: { hat: 'book' },
  },
  shanchuan: {
    name: '日月山川', loops: 'sc', dark: false,
    hats: cycle(['sunhat', 'moonclip', 'peaks', 'wave', 'rice', 'straw']),
    singer: { hat: 'straw' },
  },
};

export const SINGER_COLORS = ['#86C5FF', '#FF8FA3', '#FFD166', '#8EE3A8', '#C3B1FF', '#FFB86B', '#7FDBFF'];

// 乐器角色对应的循环名
export const LOOPKEY = { dong: 'kick', cha: 'shaker', papa: 'clap', beng: 'bass', ding: 'chime', wuwu: 'sweep', didu: 'blip', ling: 'bells', dudu: 'lead', huhu: 'pad', lala: 'choir', ying: 'snap' };
export const INSTRUMENTS = INST;

export function lookFor(style, id) {
  const S = STYLES[style];
  return { dark: S.dark, hat: S.hats[id], parts: (S.parts && S.parts[id]) || [] };
}
export function singerLook(style, slot, ch) {
  const S = STYLES[style];
  return { dark: S.dark, hat: S.singer.hat, parts: S.singerParts ? S.singerParts[slot % S.singerParts.length] : [], card: ch, col: SINGER_COLORS[slot % SINGER_COLORS.length] };
}
