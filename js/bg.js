import { flagSVG } from './art.js';
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
  // ---------- 明亮世界 ----------
  ocean: () => wrap(`
    <rect width="1600" height="900" fill="url(#sea)"/>
    ${[200, 520, 900, 1300].map((x, i) => `<path d="M${x} 260L${x + 120} 900H${x - 60}Z" fill="#fff" opacity=".06"/>`).join('')}
    ${[[150, 520], [420, 380], [1180, 460], [1450, 350], [760, 300]].map(([x, y], i) => `<g class="swim" style="animation-delay:${-i * 3}s"><path d="M${x} ${y}q30 -18 60 0q-30 18 -60 0z" fill="${['#FFB347', '#FF8FA3', '#FFE066', '#7FDBFF', '#C3B1FF'][i]}"/><path d="M${x + 60} ${y}l16 -10v20z" fill="${['#FFB347', '#FF8FA3', '#FFE066', '#7FDBFF', '#C3B1FF'][i]}"/><circle cx="${x + 14}" cy="${y - 2}" r="3" fill="#123"/></g>`).join('')}
    ${[100, 300, 640, 980, 1240, 1520].map((x, i) => `<circle class="bubble2" style="animation-delay:${-i * 1.7}s" cx="${x}" cy="880" r="${8 + i % 3 * 4}" fill="none" stroke="#d6f6ff" stroke-width="3" opacity=".7"/>`).join('')}
    <path d="M0 760Q300 720 600 760T1200 750T1600 760V900H0Z" fill="#f0d9a0"/>
    ${[80, 260, 1100, 1380, 1540].map((x, i) => `<g class="sway2" style="animation-delay:${-i}s"><path d="M${x} 780C${x - 30} 700 ${x + 30} 640 ${x} 560" stroke="#2f9e5a" stroke-width="16" fill="none" stroke-linecap="round"/></g>`).join('')}
    <path d="M1250 790l18 -40 18 40 -40 -24h44z" fill="#ff7a59"/><ellipse cx="420" cy="790" rx="40" ry="18" fill="#ff9eb5"/>`,
    `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fb0e8"/><stop offset="1" stop-color="#0b5f9e"/></linearGradient>`),

  space: () => wrap(`
    <rect width="1600" height="900" fill="url(#sp)"/>
    ${Array.from({ length: 60 }, (_, i) => `<circle class="twinkle" style="animation-delay:${-(i % 7) * .6}s" cx="${(i * 263) % 1600}" cy="${(i * 137) % 700}" r="${1 + (i % 3)}" fill="#fff"/>`).join('')}
    <circle cx="1300" cy="380" r="90" fill="#FF8A4C"/><ellipse cx="1300" cy="380" rx="160" ry="30" fill="none" stroke="#FFD84D" stroke-width="10" transform="rotate(-15 1300 380)"/>
    <circle cx="300" cy="320" r="46" fill="#7FDBFF"/><circle cx="285" cy="305" r="10" fill="#5ab8e0"/>
    <g class="float"><path d="M760 420l30 -60 30 60-30 -12z" fill="#eee"/><path d="M780 420l10 30 10-30z" fill="#FFB347"/></g>
    <path d="M0 760Q400 700 800 750T1600 740V900H0Z" fill="#8a7fb0"/>
    ${[200, 600, 1000, 1400].map((x) => `<ellipse cx="${x}" cy="800" rx="50" ry="12" fill="#6e6496"/>`).join('')}`,
    `<radialGradient id="sp" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#3b2d7a"/><stop offset="1" stop-color="#0c0a24"/></radialGradient>`),

  campus: () => wrap(`
    <rect width="1600" height="900" fill="#bfe6ff"/>
    ${[200, 700, 1200].map((x) => `<g class="drift" style="animation-delay:${-x / 40}s"><path d="M${x} 380C${x - 30} 380 ${x - 30} 340 ${x} 344C${x + 6} 320 ${x + 50} 316 ${x + 58} 340C${x + 80} 330 ${x + 100} 360 ${x + 80} 380Z" fill="#fff"/></g>`).join('')}
    <rect x="980" y="300" width="460" height="420" fill="#f6d7a7"/><path d="M960 310L1210 200L1460 310Z" fill="#e5484d"/>
    ${[1030, 1130, 1230, 1330].map((x) => `<rect x="${x}" y="380" width="60" height="70" fill="#9fd3ff" stroke="#fff" stroke-width="4"/><rect x="${x}" y="500" width="60" height="70" fill="#9fd3ff" stroke="#fff" stroke-width="4"/>`).join('')}
    <rect x="1180" y="600" width="70" height="120" fill="#8a5a2b"/>
    <line x1="560" y1="720" x2="560" y2="410" stroke="#ccc" stroke-width="10"/><circle cx="560" cy="406" r="8" fill="#F5C04A"/>${flagSVG(565, 415, 150, 'flagwave')}
    ${[120, 260, 400].map((x, i) => `<g transform="translate(${x} 500)"><line x1="0" y1="0" x2="0" y2="-40" stroke="#555" stroke-width="2"/><ellipse cx="0" cy="-60" rx="26" ry="22" fill="#E5302E"/><rect x="-12" y="-86" width="24" height="6" fill="#FFD84D"/></g>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#7cc46a"/><path d="M0 720H1600V740H0Z" fill="#a7d98c"/>`),

  season: () => wrap(`
    <rect width="1600" height="900" fill="url(#ssn)"/>
    <circle cx="400" cy="340" r="60" fill="#FFD84D"/>
    <path d="M0 640Q400 560 800 620T1600 600V900H0Z" fill="#b8d98a"/>
    <path d="M0 720Q500 680 1000 720T1600 710V900H0Z" fill="#8fc46a"/>
    ${[[200, 660, '#e8553e'], [1350, 640, '#f5a623']].map(([x, y, c]) => `<rect x="${x - 10}" y="${y - 120}" width="20" height="120" fill="#8a5a2b"/><circle cx="${x}" cy="${y - 150}" r="70" fill="${c}"/>`).join('')}
    <path d="M700 760q60 -40 120 0t120 0" stroke="#5bb8f0" stroke-width="30" fill="none" opacity=".7"/>
    ${[740, 820, 900].map((x, i) => `<ellipse cx="${x}" cy="755" rx="30" ry="10" fill="#5FBF6E"/><circle cx="${x + 4}" cy="745" r="9" fill="#FF8FA3"/>`).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<path class="leaffall" style="animation-delay:${-i * 1.1}s" d="M${150 + i * 140} 0l8 -6 8 6 -8 6z" fill="${['#e8553e', '#f5a623', '#ffd166'][i % 3]}"/>`).join('')}`,
    `<linearGradient id="ssn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3c2"/><stop offset="1" stop-color="#fff6e6"/></linearGradient>`),

  night: () => wrap(`
    <rect width="1600" height="900" fill="url(#nt)"/>
    ${Array.from({ length: 50 }, (_, i) => `<circle class="twinkle" style="animation-delay:${-(i % 6) * .7}s" cx="${(i * 311) % 1600}" cy="${(i * 97) % 600}" r="${1 + i % 2}" fill="#fff8d8"/>`).join('')}
    <path d="M1100 300q120 80 240 0q-40 60 -120 60t-120 -60z" fill="#FFE07A"/>
    <path d="M0 700Q400 640 800 690T1600 680V900H0Z" fill="#2f4a6a"/>
    <path d="M0 760Q500 720 1000 760T1600 750V900H0Z" fill="#24395a"/>
    ${[300, 1300].map((x) => `<rect x="${x - 8}" y="560" width="16" height="140" fill="#1b2a40"/><circle cx="${x}" cy="540" r="60" fill="#1f3350"/>`).join('')}
    ${[[600, 560], [900, 600], [1450, 580]].map(([x, y], i) => `<circle class="firefly" style="animation-delay:${-i * 1.3}s" cx="${x}" cy="${y}" r="5" fill="#fff59a"/>`).join('')}`,
    `<linearGradient id="nt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1b3a"/><stop offset="1" stop-color="#2a3f6a"/></linearGradient>`),

  // ---------- 恐怖世界 ----------
  zombie: () => wrap(`
    <rect width="1600" height="900" fill="url(#zb)"/>
    <circle cx="1300" cy="330" r="90" fill="#d8e8a0"/><circle cx="1300" cy="330" r="160" fill="#9dff6b" opacity=".12"/>
    ${[200, 480, 760, 1040, 1320].map((x, i) => `<path d="M${x} 760v-90q0 -40 40 -40t40 40v90z" fill="#5a6058" stroke="#2a2e28" stroke-width="4"/><path d="M${x + 30} 690h20M${x + 40} 680v24" stroke="#2a2e28" stroke-width="5"/>`).join('')}
    ${[340, 900, 1460].map((x, i) => `<g class="zhand" style="animation-delay:${-i * 1.5}s"><path d="M${x} 800v-50l-10 -20M${x} 750l8 -24M${x} 752l18 -16" stroke="#7a9a5a" stroke-width="10" stroke-linecap="round" fill="none"/></g>`).join('')}
    <path d="M0 760Q400 730 800 760T1600 750V900H0Z" fill="#2a2418"/>
    ${[1, 2].map((k) => `<path class="fog" d="M${k * 500 - 400} 720q200 -40 400 0t400 0v80h-800z" fill="#6a8a5a" opacity=".25"/>`).join('')}`,
    `<linearGradient id="zb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2412"/><stop offset="1" stop-color="#3a4a2a"/></linearGradient>`),

  virus: () => wrap(`
    <rect width="1600" height="900" fill="#0f1a14"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 200}" y="260" width="196" height="460" fill="#16261c" stroke="#2a4a34" stroke-width="3"/>`).join('')}
    ${[[260, 420], [700, 380], [1180, 440]].map(([x, y], i) => `<rect x="${x - 40}" y="${y - 120}" width="80" height="240" rx="40" fill="#7dff3b" fill-opacity=".18" stroke="#9aa" stroke-width="5"/><rect class="goobub" style="animation-delay:${-i}s" x="${x - 32}" y="${y - 20}" width="64" height="130" rx="32" fill="#7dff3b" opacity=".5"/>`).join('')}
    <g class="alarmlight"><circle cx="1450" cy="300" r="34" fill="#ff2a2a"/></g>
    <g transform="translate(950 330)"><circle r="46" fill="#f2c230"/><g fill="#111"><circle cy="-14" r="12"/><circle cx="-13" cy="9" r="12"/><circle cx="13" cy="9" r="12"/></g><circle r="7" fill="#f2c230"/></g>
    ${Array.from({ length: 6 }, (_, i) => `<text class="glitch" x="${80 + i * 260}" y="${300 + (i % 2) * 40}" fill="#3aff6a" font-family="monospace" font-size="22" opacity=".6">ERR 0${i}x</text>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#1a2a20"/>${[200, 700, 1300].map((x) => `<ellipse cx="${x}" cy="760" rx="90" ry="14" fill="#7dff3b" opacity=".35"/>`).join('')}`),

  ghost: () => wrap(`
    <rect width="1600" height="900" fill="url(#gh)"/>
    <circle cx="300" cy="330" r="80" fill="#e8f4ff"/><circle cx="300" cy="330" r="140" fill="#7fd8ff" opacity=".12"/>
    <path d="M900 720V380L1150 230L1400 380V720Z" fill="#1a1f2e" stroke="#2a3248" stroke-width="6"/>
    ${[[980, 420], [1250, 420], [1110, 520]].map(([x, y], i) => `<rect class="winflick" style="animation-delay:${-i * .9}s" x="${x}" y="${y}" width="70" height="90" fill="#ffe9a0"/>`).join('')}
    ${[[500, 420], [700, 520], [1500, 450]].map(([x, y], i) => `<g class="haunt" style="animation-delay:${-i * 2}s"><path d="M${x} ${y}c-30 0 -40 30 -40 60v50l14 -12 13 12 13 -12 13 12 14 -12 13 12v-50c0 -30 -10 -60 -40 -60z" fill="#eef6ff" opacity=".7"/><circle cx="${x - 12}" cy="${y + 40}" r="5" fill="#123"/><circle cx="${x + 12}" cy="${y + 40}" r="5" fill="#123"/></g>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#141826"/>${[1, 2].map((k) => `<path class="fog" d="M${k * 600 - 500} 700q250 -40 500 0t500 0v80h-1000z" fill="#9ab8d8" opacity=".18"/>`).join('')}`,
    `<linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1020"/><stop offset="1" stop-color="#26304a"/></linearGradient>`),

  fog: () => wrap(`
    <rect width="1600" height="900" fill="#6e6a64"/>
    ${[100, 380, 700, 1050, 1350].map((x, i) => `<rect x="${x}" y="${300 - (i % 3) * 40}" width="${180 + (i % 2) * 60}" height="${460 + (i % 3) * 40}" fill="#4e4a44" opacity=".85"/>${[0, 1, 2].map((r) => `<rect x="${x + 30}" y="${360 + r * 90 - (i % 3) * 40}" width="40" height="50" fill="#2e2a24"/>`).join('')}`).join('')}
    <line x1="1250" y1="720" x2="1250" y2="330" stroke="#3a3632" stroke-width="12"/><path d="M1250 330h-60" stroke="#3a3632" stroke-width="10"/><g class="lampflick"><circle cx="1190" cy="345" r="16" fill="#ffd27a"/></g>
    ${Array.from({ length: 14 }, (_, i) => `<circle class="ashfall" style="animation-delay:${-i * .8}s" cx="${60 + i * 110}" cy="0" r="4" fill="#ccc" opacity=".8"/>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#3e3a34"/>
    ${[0, 1, 2].map((k) => `<path class="fog" style="animation-delay:${-k * 3}s" d="M${k * 600 - 600} ${560 + k * 50}q300 -60 600 0t600 0v200h-1200z" fill="#bdb8b0" opacity=".45"/>`).join('')}`),

  shadow: () => wrap(`
    <rect width="1600" height="900" fill="url(#sd)"/>
    ${[[250, 400], [600, 350], [1000, 420], [1400, 380]].map(([x, y], i) => `<g class="lurk2" style="animation-delay:${-i * 1.6}s"><path d="M${x} ${y + 300}C${x - 70} ${y + 300} ${x - 80} ${y + 80} ${x - 40} ${y + 20}C${x - 20} ${y - 30} ${x + 20} ${y - 30} ${x + 40} ${y + 20}C${x + 80} ${y + 80} ${x + 70} ${y + 300} ${x} ${y + 300}Z" fill="#000" opacity=".7"/><ellipse cx="${x - 16}" cy="${y + 40}" rx="6" ry="4" fill="#d6b8ff"/><ellipse cx="${x + 16}" cy="${y + 40}" rx="6" ry="4" fill="#d6b8ff"/></g>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#08060c"/>
    ${[200, 800, 1300].map((x) => `<path d="M${x} 760l300 30l-300 10z" fill="#000" opacity=".6"/>`).join('')}`,
    `<radialGradient id="sd" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2a2040"/><stop offset="1" stop-color="#05040a"/></radialGradient>`),

  ultimate: () => wrap(`
    <rect width="1600" height="900" fill="url(#ul)"/>
    <circle cx="800" cy="330" r="120" fill="#e8ddd0"/><circle cx="800" cy="330" r="220" fill="#ff2020" opacity=".2"/>
    ${[200, 520, 1080, 1400].map((x, i) => `<path d="M${x} 760v-80q0 -36 36 -36t36 36v80z" fill="#3a3a36"/>`).join('')}
    ${[[300, 420], [1300, 460]].map(([x, y], i) => `<g class="haunt" style="animation-delay:${-i * 2}s"><path d="M${x} ${y}c-30 0 -40 30 -40 60v50l14 -12 13 12 13 -12 13 12 14 -12 13 12v-50c0 -30 -10 -60 -40 -60z" fill="#eef6ff" opacity=".5"/></g>`).join('')}
    <g class="alarmlight"><circle cx="1500" cy="300" r="26" fill="#ff2a2a"/></g>
    ${Array.from({ length: 10 }, (_, i) => `<circle class="ashfall" style="animation-delay:${-i}s" cx="${80 + i * 150}" cy="0" r="4" fill="#ccc" opacity=".7"/>`).join('')}
    ${[[600, 520], [1000, 500]].map(([x, y], i) => `<g class="blinkbg" style="animation-delay:${i * 1.3}s"><ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#ff3030"/><ellipse cx="${x + 30}" cy="${y}" rx="9" ry="6" fill="#ff3030"/></g>`).join('')}
    <path d="M0 720H1600V900H0Z" fill="#120608"/><ellipse cx="800" cy="760" rx="300" ry="20" fill="#7dff3b" opacity=".25"/>
    ${[0, 1].map((k) => `<path class="fog" d="M${k * 700 - 600} 660q300 -60 600 0t600 0v120h-1200z" fill="#8a6a6a" opacity=".3"/>`).join('')}`,
    `<linearGradient id="ul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0204"/><stop offset=".6" stop-color="#3a0b12"/><stop offset="1" stop-color="#140406"/></linearGradient>`),
  // ---------- 新恐怖世界 ----------
  deepsea: () => wrap(`
    <rect width="1600" height="900" fill="url(#dsg)"/>
    ${Array.from({ length: 18 }, (_, i) => `<circle class="bubble2" style="animation-delay:${-i * 1.3}s" cx="${(i * 97) % 1600}" cy="880" r="${3 + i % 4}" fill="none" stroke="#5cf5ff" stroke-width="1.5" opacity=".4"/>`).join('')}
    <g class="haunt"><path d="M1180 420c60 -30 130 -10 150 30c-40 10 -60 40 -150 20z" fill="#0a1a26"/><circle class="glow" cx="1325" cy="420" r="9" fill="#5cf5ff"/><path d="M1330 452l-20 -6M1300 455l-6 10M1280 456l-4 12" stroke="#cfe" stroke-width="3"/></g>
    ${[200, 420, 1450].map((x, i) => `<g class="sway2" style="animation-delay:${-i}s"><path d="M${x} 900C${x - 60} 760 ${x + 70} 700 ${x + 10} 560C${x - 30} 500 ${x + 40} 470 ${x + 20} 430" stroke="#5a2a5a" stroke-width="${26 - i * 4}" fill="none" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map((k) => `<circle cx="${x + 6 + k * 3}" cy="${560 + k * 60}" r="5" fill="#c86ab0"/>`).join('')}</g>`).join('')}
    <path d="M0 760Q400 730 800 770T1600 750V900H0Z" fill="#0c1a1e"/>
    ${[300, 700, 1100].map((x) => `<path d="M${x} 770l-30 -40l20 10l10 -30l10 30l20 -10z" fill="#3a1a3a"/>`).join('')}
    <g transform="translate(860 780)"><path d="M-60 0q-20 -50 20 -60l80 0q40 10 20 60z" fill="#2a1a10"/><path d="M-40 -40h80" stroke="#6a4a2a" stroke-width="5"/></g>`,
    `<linearGradient id="dsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06222e"/><stop offset="1" stop-color="#020a10"/></linearGradient>`),

  vampire: () => wrap(`
    <rect width="1600" height="900" fill="url(#vpg)"/>
    <circle cx="1200" cy="340" r="110" fill="#f0d8d8"/><circle cx="1200" cy="340" r="190" fill="#ff2a3a" opacity=".15"/>
    <path d="M300 760V420H340V380H380V420H420V340L470 270L520 340V420H560V380H600V420H640V760Z" fill="#140812"/>
    <path d="M700 760V460L780 360L860 460V760Z" fill="#1a0a16"/>
    ${[[450, 470], [500, 470], [770, 520], [330, 520]].map(([x, y], i) => `<rect class="winflick" style="animation-delay:${-i}s" x="${x}" y="${y}" width="22" height="34" rx="11" fill="#ffcf5a" opacity=".85"/>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<g class="haunt" style="animation-delay:${-i * 1.2}s"><path d="M${200 + i * 220} ${360 + (i % 3) * 40}l-14 -8l4 8l-12 0l12 6zm0 0l14 -8l-4 8l12 0l-12 6z" fill="#000"/></g>`).join('')}
    <path d="M0 760Q400 730 800 760T1600 750V900H0Z" fill="#100408"/>
    ${[150, 1000, 1450].map((x) => `<path d="M${x} 770v-50h-12v-14h12v-12h10v12h12v14h-12v50z" fill="#2a0a14"/>`).join('')}`,
    `<linearGradient id="vpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0614"/><stop offset="1" stop-color="#3a0a1e"/></linearGradient>`),

  alien: () => wrap(`
    <rect width="1600" height="900" fill="url(#alg)"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle class="twinkle" style="animation-delay:${-(i % 5) * .5}s" cx="${(i * 211) % 1600}" cy="${(i * 113) % 650}" r="${1 + i % 2}" fill="#d8ffd0"/>`).join('')}
    <circle cx="350" cy="360" r="70" fill="#b6ff3b" opacity=".8"/><circle cx="330" cy="345" r="16" fill="#8ad02a"/><circle cx="1350" cy="300" r="40" fill="#c86ab0"/>
    <g class="float"><ellipse cx="900" cy="380" rx="110" ry="28" fill="#6a7090"/><path d="M840 375a60 50 0 0 1 120 0z" fill="#9ae6ff" opacity=".7"/>${[860, 900, 940].map((x) => `<circle class="twinkle" cx="${x}" cy="392" r="6" fill="#ffe066"/>`).join('')}<path d="M840 405L760 760H1040L960 405Z" fill="#d8ff9a" opacity=".18"/></g>
    <path d="M0 760Q300 700 600 750T1200 730T1600 750V900H0Z" fill="#2a3a20"/>
    ${[150, 480, 1250, 1500].map((x, i) => `<g class="sway2" style="animation-delay:${-i}s"><path d="M${x} 770C${x - 20} 700 ${x + 30} 660 ${x} 600" stroke="#7a3a8a" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="592" r="14" fill="#b6ff3b"/><circle cx="${x}" cy="592" r="6" fill="#000"/></g>`).join('')}
    ${[700, 1050].map((x) => `<ellipse cx="${x}" cy="790" rx="70" ry="14" fill="#7dff3b" opacity=".35"/>`).join('')}`,
    `<linearGradient id="alg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1a10"/><stop offset="1" stop-color="#1e2a3a"/></linearGradient>`),

  mummy: () => wrap(`
    <rect width="1600" height="900" fill="url(#mmg)"/>
    <circle cx="1250" cy="330" r="80" fill="#ffd27a"/><circle cx="1250" cy="330" r="150" fill="#ff9a2e" opacity=".15"/>
    <path d="M200 760L560 330L920 760Z" fill="#8a6a3a"/><path d="M560 330L920 760H760Z" fill="#6a4a24"/>
    <path d="M900 760L1150 460L1400 760Z" fill="#9a7a4a"/><path d="M1150 460L1400 760H1300Z" fill="#7a5a30"/>
    <rect x="520" y="660" width="80" height="100" fill="#1a1008"/><path d="M520 660q40 -40 80 0" fill="#1a1008"/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<path d="M${330 + c * 80 + r * 40} ${740 - r * 50}h70" stroke="#6a4a24" stroke-width="3"/>`).join('')).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<circle class="ashfall" style="animation-delay:${-i}s" cx="${80 + i * 150}" cy="0" r="3" fill="#e8c88a" opacity=".6"/>`).join('')}
    <path d="M0 760Q400 740 800 760T1600 750V900H0Z" fill="#c8a060"/>
    ${[120, 1500].map((x) => `<g transform="translate(${x} 700)"><rect x="-14" y="0" width="28" height="70" fill="#a08050"/><circle cx="0" cy="-12" r="16" fill="#a08050"/><circle class="glow" cx="-6" cy="-14" r="3" fill="#ffd23a"/><circle class="glow" cx="6" cy="-14" r="3" fill="#ffd23a"/></g>`).join('')}`,
    `<linearGradient id="mmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a2a"/><stop offset=".6" stop-color="#6a3a2a"/><stop offset="1" stop-color="#a0603a"/></linearGradient>`),

  toys: () => wrap(`
    <rect width="1600" height="900" fill="#2a1a2a"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 200}" y="260" width="100" height="500" fill="#3a2238"/>`).join('')}
    <rect x="80" y="380" width="360" height="22" fill="#5a3a2a"/><rect x="1150" y="420" width="360" height="22" fill="#5a3a2a"/>
    ${[[130, 380], [220, 380], [310, 380]].map(([x, y], i) => `<g class="haunt" style="animation-delay:${-i * 2}s;animation-duration:9s"><circle cx="${x}" cy="${y - 30}" r="22" fill="#f0d0d8" stroke="#000" stroke-width="2"/><circle cx="${x - 8}" cy="${y - 32}" r="5" fill="#000"/><circle cx="${x + 8}" cy="${y - 32}" r="5" fill="#000"/><path d="M${x - 8} ${y - 20}l4 4l4 -4l4 4l4 -4" stroke="#a00" stroke-width="2" fill="none"/></g>`).join('')}
    <g transform="translate(1300 420)"><rect x="-40" y="-60" width="80" height="60" fill="#c03050" stroke="#000" stroke-width="3"/><g class="zhand"><path d="M0 -60v-40" stroke="#888" stroke-width="6" stroke-dasharray="6 4"/><circle cx="0" cy="-110" r="22" fill="#fff" stroke="#000" stroke-width="2"/><path d="M-10 -104q10 12 20 0" stroke="#c00" stroke-width="3" fill="none"/><circle cx="-8" cy="-114" r="3"/><circle cx="8" cy="-114" r="3"/></g></g>
    <g class="spin" style="transform-origin:800px 360px"><circle cx="800" cy="360" r="60" fill="none" stroke="#6a4a6a" stroke-width="6"/>${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="800" y1="360" x2="${800 + Math.cos(a * Math.PI / 180) * 60}" y2="${360 + Math.sin(a * Math.PI / 180) * 60}" stroke="#6a4a6a" stroke-width="4"/>`).join('')}</g>
    <path d="M0 740H1600V900H0Z" fill="#4a2a3a"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100}" y="740" width="50" height="160" fill="#5a3048"/>`).join('')}
    ${[250, 650, 1000].map((x, i) => `<g transform="translate(${x} 760)"><rect x="-26" y="-40" width="52" height="40" fill="${['#e05a5a', '#5ab0e0', '#e0c05a'][i]}" stroke="#000" stroke-width="2"/><text x="0" y="-12" text-anchor="middle" font-size="26" font-weight="900" fill="#000">${'ABC'[i]}</text></g>`).join('')}`),
};
