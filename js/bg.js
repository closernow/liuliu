// 舞台背景：每种风格一张 SVG，铺满舞台。
const wrap = (inner, defs = '') => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;
const cloud = (x, y, s, fill = '#fff', cls = 'drift') => `<g class="${cls}" style="animation-delay:${-x / 40}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M0 40C-30 40 -30 0 0 4C6 -20 50 -24 58 0C80 -10 100 20 80 40Z" fill="${fill}"/></g></g>`;

export const BG = {
  sky: () => wrap(`
    <rect width="1600" height="900" fill="url(#sk)"/>
    <circle cx="1380" cy="340" r="80" fill="#FFD84D"/><circle cx="1380" cy="340" r="110" fill="#FFE88A" opacity=".35"/>
    ${cloud(200, 330, 1.6)}${cloud(700, 290, 1.1)}${cloud(1000, 400, 1.2)}${cloud(450, 450, .9)}
    <path d="M0 640Q400 590 800 630T1600 610V900H0Z" fill="#8EDB7A"/>
    <path d="M0 700Q500 660 1000 700T1600 690V900H0Z" fill="#6CC56A"/>
    ${[120, 340, 610, 980, 1260, 1480].map((x, i) => `<g transform="translate(${x} ${720 + (i % 2) * 40})"><circle r="9" fill="${['#FF8FA3', '#FFD166', '#fff'][i % 3]}"/><circle r="4" fill="#FFB703"/></g>`).join('')}`,
    `<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc8ff"/><stop offset="1" stop-color="#d4f0ff"/></linearGradient>`),

  wuxing: () => wrap(`
    <rect width="1600" height="900" fill="#f3e6c8"/>
    <path d="M0 520L180 360L300 450L460 300L640 470L820 340L1000 480L1180 330L1380 460L1600 350V900H0Z" fill="#cbbf9e" opacity=".7"/>
    <path d="M0 600L240 470L420 560L620 450L860 580L1080 470L1300 580L1600 480V900H0Z" fill="#a89a78" opacity=".6"/>
    ${[['#F5C04A', '金'], ['#5FBF6E', '木'], ['#4FA3E0', '水'], ['#E8553E', '火'], ['#B07A4A', '土']].map(([c, t], i) =>
      `<g class="bob" style="animation-delay:${-i * .7}s"><circle cx="${260 + i * 270}" cy="${360 + (i % 2) * 50}" r="56" fill="${c}" opacity=".85"/><text x="${260 + i * 270}" y="${360 + (i % 2) * 50 + 22}" font-size="66" text-anchor="middle" fill="#fff" font-weight="700">${t}</text></g>`).join('')}
    <rect y="720" width="1600" height="180" fill="#d8c49a"/>`),

  horror1: () => wrap(`
    <rect width="1600" height="900" fill="url(#hz)"/>
    <circle cx="1250" cy="350" r="100" fill="#e8ddd0"/><circle cx="1250" cy="350" r="180" fill="#ff2020" opacity=".18"/>
    <circle cx="1215" cy="330" r="16" fill="#cfc2b4"/><circle cx="1280" cy="380" r="20" fill="#cfc2b4"/>
    ${[160, 520, 1450].map((x, i) => `<path d="M${x} 720L${x + 8} 420L${x - 40} 330M${x + 6} 480L${x + 70} 380L${x + 110} 400M${x + 4} 560L${x - 60} 500" stroke="#0a0204" stroke-width="${18 - i * 3}" fill="none" stroke-linecap="round"/>`).join('')}
    ${[[300, 420], [900, 380], [700, 520], [1500, 470]].map(([x, y], i) => `<g class="blinkbg" style="animation-delay:${i * 1.3}s"><ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#ff3030"/><ellipse cx="${x + 30}" cy="${y}" rx="9" ry="6" fill="#ff3030"/></g>`).join('')}
    <path d="M0 700Q400 660 800 700T1600 690V900H0Z" fill="#160608"/>
    ${[260, 640, 1100, 1380].map((x) => `<path d="M${x} 760v-46h-14v-18h14v-16h12v16h14v18h-14v46z" fill="#2a0e12"/>`).join('')}
    ${cloud(100, 600, 3, '#3a1418', 'fog')}${cloud(900, 640, 3.4, '#3a1418', 'fog')}`,
    `<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120407"/><stop offset=".6" stop-color="#3a0b12"/><stop offset="1" stop-color="#1a0508"/></linearGradient>`),

  shanchuan: () => wrap(`
    <rect width="1600" height="900" fill="url(#dawn)"/>
    <circle cx="300" cy="330" r="64" fill="#FFB84D"/><path d="M1300 300a56 56 0 1 0 56 76a44 44 0 1 1 -56 -76z" fill="#fff4c2"/>
    <path d="M0 560L220 300L380 450L560 240L780 480L980 280L1200 470L1400 320L1600 440V900H0Z" fill="#7fae9a"/>
    <path d="M560 240L520 300L560 290L600 310Z M980 280L945 330L985 320L1020 335Z" fill="#fff"/>
    <path d="M0 640L300 520L520 610L760 500L1000 620L1260 520L1600 610V900H0Z" fill="#5d9478"/>
    <path d="M0 760C300 700 500 800 800 740S1300 700 1600 760V830C1300 780 1100 860 800 810S300 790 0 830Z" fill="#6cc0e8"/>
    <path d="M0 830C300 790 500 860 800 810S1300 780 1600 830V900H0Z" fill="#8fbf6a"/>
    ${[1040, 1120, 1200].map((x) => `<path d="M${x} 880v-50" stroke="#c9a640" stroke-width="5"/><ellipse cx="${x + 8}" cy="820" rx="7" ry="16" fill="#E2C24A" transform="rotate(25 ${x + 8} 820)"/>`).join('')}`,
    `<linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd2a8"/><stop offset=".5" stop-color="#ffeedd"/><stop offset="1" stop-color="#d8f0ff"/></linearGradient>`),
};
