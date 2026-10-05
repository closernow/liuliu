// 音豆角色美术：代码画 SVG，骨架固定，零件可换。全部原创。
export const CH={
 dong:{nm:'咚咚',sub:'鼓',col:'#FF7A59',head:'round',inst:'drum',eye:'round',iris:'#3B6FD8',hat:'cloud',
   horror:['heart','bodyStitch','crack'],hd:'心脏外露、身上缝线、头裂开'},
 cha:{nm:'嚓嚓',sub:'沙锤',col:'#FFD166',head:'tall',inst:'maracas',eye:'round',iris:'#2E9E6B',hat:'sprout',
   horror:['dangleR','crack','melt'],hd:'眼球掉出来挂着、头裂开、融化'},
 papa:{nm:'啪啪',sub:'拍手',col:'#FF9EB5',head:'box',inst:'clap',eye:'round',iris:'#C9601E',hat:'sunband',
   horror:['boneL','wristR','bandHead'],hd:'骨头手臂、手腕缝线、头缠绷带'},
 beng:{nm:'嘣嘣',sub:'贝斯',col:'#8C6CF2',head:'wide',inst:'bass',eye:'round',iris:'#2A2145',hat:'cap',
   horror:['multi','teeth'],hd:'满头眼睛、尖牙'},
 ding:{nm:'叮叮',sub:'星星棒',col:'#7FDBFF',head:'small',inst:'wand',eye:'round',iris:'#B03A7A',hat:'starclip',
   horror:['cyclops','melt','veins'],hd:'独眼、血丝、融化'},
 wuwu:{nm:'呜呜',sub:'风声',col:'#B8C4E0',head:'ghost',inst:'none',eye:'round',iris:'#3B6FD8',hat:'minicloud',
   horror:['hollow','meltBody'],hd:'空眼眶流黑泪、身体融化'},
 didu:{nm:'嘀嘟',sub:'电子琴',col:'#6BE38A',head:'box',inst:'keys',eye:'screen',hat:'leafant',
   horror:['glitch','wires'],hd:'屏幕碎裂乱闪、电线外露'},
 ling:{nm:'铃铃',sub:'手铃',col:'#F5C04A',head:'bell',inst:'bells',eye:'round',iris:'#2E9E6B',hat:'flowerbow',
   horror:['sewnMouth','buttonL'],hd:'嘴被缝上、纽扣眼'},
 dudu:{nm:'嘟嘟',sub:'小号',col:'#E86BD0',head:'tall',inst:'horn',eye:'round',iris:'#3B6FD8',hat:'cone',ears:true,
   horror:['tornEar','patchL','bandHead'],hd:'耳朵被咬掉一块、绷带蒙眼'},
 huhu:{nm:'呼呼',sub:'云朵琴',col:'#C3B1FF',head:'cloud',inst:'pillow',eye:'sleepy',hat:'nightcap',
   horror:['bellyMouth','sewnEyes'],hd:'肚子上长嘴、眼睛缝死'},
 lala:{nm:'啦啦',sub:'麦克风',col:'#4FD1C5',head:'round',inst:'mic',eye:'round',iris:'#C9601E',hat:'flowercollar',
   horror:['bigMouth','stitchCheek'],hd:'大嘴尖牙吐舌头、脸上缝线'},
 ying:{nm:'影影',sub:'响指',col:'#1b1724',rim:'#8b7cff',head:'smoke',inst:'snap',eye:'cool',hat:'scarf',
   horror:['coolGlow','grin','tendrils','bodyEyes','shadowDrip'],hd:'眼睛发紫光、裂嘴笑、头顶黑烟触手、身上睁开眼睛、滴黑影'},
 py:{nm:'拼音歌手',sub:'唱音节',col:'#FF8FA3',head:'bean',inst:'card',card:'bā',eye:'round',iris:'#3B6FD8',hat:'sprout',
   horror:['patchwork','bandLeg','backFeet'],hd:'补丁身体、腿缠绷带、脚长反了'},
 sz:{nm:'识字歌手',sub:'唱生字',col:'#86C5FF',head:'bean',inst:'card',card:'天',eye:'round',iris:'#2E9E6B',hat:'book',
   horror:['handEyes','crack','multiSmall'],hd:'手心长眼睛、头裂开、额头多眼'}
};

/* ===== 颜色 ===== */
const hex=h=>{if(h.length==4)h='#'+[...h.slice(1)].map(x=>x+x).join('');const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]};
const toHex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const blend=(a,b,t)=>{const x=hex(a),y=hex(b);return toHex(x.map((v,i)=>v*(1-t)+y[i]*t))};
function horrorCol(c){const [r,g,b]=hex(c),gr=(r+g+b)/3;return blend(toHex([r*.45+gr*.55,g*.45+gr*.55,b*.45+gr*.55]),'#1a1016',.45)}

/* ===== 头形（以头中心为原点） ===== */
const ell=(rx,ry)=>`M${-rx} 0a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;
const HEAD={
 round:{d:ell(46,42),top:-42,w:46},
 tall:{d:'M0 -52C30 -52 40 -20 40 6C40 32 24 42 0 42C-24 42 -40 32 -40 6C-40 -20 -30 -52 0 -52Z',top:-52,w:40},
 box:{d:'M-26 -40H26Q44 -40 44 -22V22Q44 40 26 40H-26Q-44 40 -44 22V-22Q-44 -40 -26 -40Z',top:-40,w:44},
 wide:{d:ell(52,37),top:-37,w:52},
 small:{d:ell(40,38),top:-38,w:40},
 ghost:{d:'M-42 40C-42 -16 -26 -46 0 -46C26 -46 42 -16 42 40Q32 47 21 40Q10 47 0 40Q-10 47 -21 40Q-32 47 -42 40Z',top:-46,w:42},
 bell:{d:'M0 -46C22 -46 30 -26 32 -4C34 18 40 30 48 38Q0 48 -48 38C-40 30 -34 18 -32 -4C-30 -26 -22 -46 0 -46Z',top:-46,w:34},
 cloud:{d:'M-30 40C-54 40 -56 12 -40 4C-48 -20 -22 -36 -8 -24C0 -50 40 -46 38 -18C58 -18 62 10 46 18C58 34 44 44 24 40Z',top:-40,w:44},
 smoke:{d:'M-40 40C-44 0 -36 -36 -6 -44C-2 -56 8 -62 18 -58C8 -54 6 -48 12 -44C34 -38 44 -8 40 40Q0 48 -40 40Z',top:-44,w:40},
 bean:{d:'M-34 40C-50 32 -50 -6 -38 -26C-26 -44 -12 -48 0 -48C12 -48 26 -44 38 -26C50 -6 50 32 34 40C20 46 -20 46 -34 40Z',top:-48,w:42}
};

/* ===== 小零件 ===== */
const stitch=(x1,y1,x2,y2,st,n=4)=>{let s=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st}" stroke-width="2"/>`;
  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*5,ny=dx/L*5;
  for(let i=1;i<=n;i++){const t=i/(n+1),x=x1+dx*t,y=y1+dy*t;s+=`<line x1="${x-nx}" y1="${y-ny}" x2="${x+nx}" y2="${y+ny}" stroke="${st}" stroke-width="2" stroke-linecap="round"/>`}return s};
const eyeN=(x,y,iris)=>`<g class="eye"><ellipse cx="${x}" cy="${y}" rx="11" ry="13" fill="#fff"/><ellipse cx="${x+1}" cy="${y+2}" rx="6.5" ry="8" fill="${iris}"/><circle cx="${x+3}" cy="${y-2}" r="2.6" fill="#fff"/></g>`;
const eyeH=(x,y,g,r=11)=>`<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.18}" fill="#000"/><circle cx="${x}" cy="${y+2}" r="${r*.62}" fill="${g}" opacity=".25"/><circle cx="${x}" cy="${y+2}" r="${r*.28}" fill="${g}"/></g>`;
const socket=(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="11" ry="13" fill="#000"/><ellipse cx="${x}" cy="${y+3}" rx="7" ry="8" fill="#2a0008"/>`;
const GLOW=['#ff3b3b','#9dff6b','#ffb02e','#c56bff'];

/* ===== 脸 ===== */
function face(C,id,h,st){
  const P=new Set(C.horror),g=GLOW[Object.keys(CH).indexOf(id)%4];
  let eyes='',mouth='',extra='';
  const L=[-16,0],R=[16,0];
  const one=(pos,side)=>{
    const [x,y]=pos;
    if(P.has('dangle'+side)){
      return socket(x,y)+`<g transform="translate(${x} ${y+4})"><g class="dangle"><path d="M0 0C4 12 -4 20 2 30" fill="none" stroke="#b3374a" stroke-width="3"/><circle cx="2" cy="38" r="9" fill="#f3efe6" stroke="${st}" stroke-width="2"/><circle cx="3" cy="40" r="4.5" fill="${g}"/><circle cx="3" cy="40" r="2" fill="#000"/></g></g>`}
    if(P.has('button'+side))return `<circle cx="${x}" cy="${y}" r="11" fill="#5a3b2a" stroke="${st}" stroke-width="2"/><circle cx="${x-4}" cy="${y-4}" r="2" fill="${st}"/><circle cx="${x+4}" cy="${y-4}" r="2" fill="${st}"/><circle cx="${x-4}" cy="${y+4}" r="2" fill="${st}"/><circle cx="${x+4}" cy="${y+4}" r="2" fill="${st}"/><path d="M${x-4} ${y-4}L${x+4} ${y+4}M${x+4} ${y-4}L${x-4} ${y+4}" stroke="#d9c7a0" stroke-width="1.5"/>`;
    if(P.has('patch'+side))return '';
    if(P.has('worm'+side))return socket(x,y)+`<g transform="translate(${x} ${y+2})"><g class="wiggle"><path d="M0 0C6 6 -6 12 2 18C8 22 4 28 10 30" stroke="#e98fa6" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="10" cy="30" r="1.2" fill="#000"/></g></g>`;
    if(P.has('hollow'))return `<ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="#000"/><g class="drip" style="animation-delay:${side=='L'?0:1.1}s"><path d="M${x} ${y+12}q-2 8 0 14q2 -6 0 -14" fill="#000"/></g><path d="M${x-1} ${y+12}C${x-3} ${y+22} ${x+2} ${y+28} ${x} ${y+34}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/>`;
    if(P.has('sewnEyes'))return `<path d="M${x-10} ${y}Q${x} ${y+6} ${x+10} ${y}" stroke="${st}" stroke-width="3" fill="none"/>`+[-6,0,6].map(d=>`<line x1="${x+d}" y1="${y-4}" x2="${x+d}" y2="${y+8}" stroke="${st}" stroke-width="2"/>`).join('');
    if(C.eye==='cool'){
      const glow=P.has('coolGlow');
      return `<g class="eye"><path d="M${x-12} ${y-2}L${x+12} ${y-6}Q${x+11} ${y+8} ${x} ${y+8}Q${x-11} ${y+7} ${x-12} ${y-2}Z" fill="${glow?'#b26bff':'#f4f1ff'}"/>`+
        (glow?`<ellipse cx="${x+3}" cy="${y+2}" rx="1.8" ry="5" fill="#000"/><circle cx="${x+1}" cy="${y+1}" r="9" fill="#b26bff" opacity=".18"/>`:`<circle cx="${x+5}" cy="${y+2}" r="3.6" fill="#1b1724"/>`)+`</g>`}
    if(C.eye==='sleepy')return `<path class="eye" d="M${x-10} ${y}Q${x} ${y+8} ${x+10} ${y}" fill="none" stroke="${st}" stroke-width="4" stroke-linecap="round"/>`;
    return h?eyeH(x,y,g):eyeN(x,y,C.iris);
  };
  if(C.eye==='screen'){
    const scr=h?'#0c0f0c':'#14321f',px=h?'#ff3b3b':'#8CFFAE';
    eyes=`<rect x="-32" y="-20" width="64" height="44" rx="10" fill="${scr}" stroke="${st}" stroke-width="3"/>`+
      `<g class="${h?'glitch':'eye'}"><rect x="-20" y="-10" width="10" height="12" fill="${px}"/><rect x="10" y="-10" width="10" height="12" fill="${px}"/></g>`+
      `<rect class="mouth" x="-8" y="12" width="16" height="3" fill="${px}"/>`;
    if(P.has('glitch'))eyes+=`<path d="M-30 -18L-8 2L-14 8L6 24M-8 2L18 -6L30 4" stroke="#d8e8ff" stroke-width="2" fill="none"/><g class="glitch"><rect x="-30" y="2" width="60" height="4" fill="${px}" opacity=".5"/></g>`;
    return eyes;
  }
  if(P.has('cyclops')){
    eyes=`<g class="eye"><ellipse cx="0" cy="-2" rx="20" ry="22" fill="#f3efe6" stroke="${st}" stroke-width="2"/>`+
      (P.has('veins')?`<path d="M-18 -6l7 2l3 -4M18 2l-7 -1l-2 5M-12 14l6 -5M10 -18l-4 6" stroke="#c0283c" stroke-width="1.5" fill="none"/>`:'')+
      `<circle cx="0" cy="0" r="10" fill="${g}"/><ellipse cx="0" cy="0" rx="3" ry="8" fill="#000"/></g>`;
  }else eyes=one(L,'L')+one(R,'R');
  if(P.has('multi')||P.has('multiSmall')){
    const pts=P.has('multi')?[[-36,-10,7],[36,-12,7],[0,-24,8],[-22,-26,5],[24,-26,5]]:[[-24,-22,5],[24,-22,5],[-14,-34,4],[14,-34,4]];
    pts.forEach(([x,y,r],i)=>extra+=`<g style="animation-delay:${i*.7}s">${eyeH(x,y,g,r).replace('class="eye"',`class="eye" style="animation-delay:${i*.7}s"`)}</g>`);
  }
  // 嘴
  const my=22;
  if(P.has('zipMouth'))mouth=`<g class="mouth"><rect x="-16" y="${my-3}" width="32" height="6" rx="2" fill="#000"/>`+[...Array(8)].map((_,i)=>`<rect x="${-15+i*4}" y="${my-(i%2?3:0)}" width="2.5" height="3" fill="#cfc8b8"/>`).join('')+`</g><path d="M16 ${my}l6 0l0 8l-4 0z" fill="#cfc8b8" stroke="${st}" stroke-width="1.2"/>`;
  else if(P.has('gapTeeth'))mouth=`<g class="mouth"><path d="M-20 ${my-4}Q0 ${my+16} 20 ${my-4}Q0 ${my+2} -20 ${my-4}Z" fill="#000"/><rect x="-14" y="${my-2}" width="5" height="6" fill="#efe6c8"/><rect x="-2" y="${my}" width="5" height="7" fill="#efe6c8"/><rect x="10" y="${my-2}" width="4" height="5" fill="#d8c890"/></g>`;
  else if(P.has('sewnMouth'))mouth=`<path d="M-12 ${my}Q0 ${my+4} 12 ${my}" stroke="${st}" stroke-width="3" fill="none"/>`+[-8,-3,2,7].map(d=>`<path d="M${d-2} ${my-4}L${d+2} ${my+6}M${d+2} ${my-4}L${d-2} ${my+6}" stroke="${st}" stroke-width="1.8"/>`).join('');
  else if(P.has('bigMouth'))mouth=`<g class="mouth"><path d="M-20 ${my-6}Q0 ${my-10} 20 ${my-6}Q16 ${my+16} 0 ${my+18}Q-16 ${my+16} -20 ${my-6}Z" fill="#000"/><path d="M-18 ${my-6}l4 7l4 -7l4 7l4 -7l4 7l4 -7l4 7l4 -7" fill="#f3efe6"/><path d="M-10 ${my+14}l3 -6l3 6l3 -6l3 6l3 -6l3 6" fill="#f3efe6"/></g><path d="M-4 ${my+12}q4 18 10 10q-2 -8 -4 -10z" fill="#c4384e"/>`;
  else if(P.has('teeth'))mouth=`<g class="mouth"><path d="M-26 ${my-4}Q0 ${my+18} 26 ${my-4}Q0 ${my+4} -26 ${my-4}Z" fill="#000"/><path d="M-22 ${my-2}l4 6l4 -5l4 7l4 -6l4 7l4 -7l4 7l4 -6l4 6l3 -5" fill="none" stroke="#f3efe6" stroke-width="2" stroke-linejoin="round"/></g>`;
  else if(P.has('grin'))mouth=`<g class="mouth"><path d="M-26 ${my-8}Q0 ${my+16} 28 ${my-10}Q2 ${my+4} -26 ${my-8}Z" fill="#f4f1ff"/><path d="M-20 ${my-4}L-20 ${my+2}M-12 ${my-1}L-12 ${my+6}M-4 ${my}L-4 ${my+7}M4 ${my}L4 ${my+7}M12 ${my-2}L12 ${my+5}M20 ${my-5}L20 ${my+1}" stroke="#1b1724" stroke-width="1.6"/></g>`;
  else if(C.eye==='cool')mouth=`<path class="mouth" d="M-8 ${my}Q2 ${my+5} 11 ${my-4}" stroke="#d9d2ff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else if(h)mouth=`<g class="mouth"><path d="M-14 ${my}Q0 ${my+12} 14 ${my}Z" fill="#000"/><path d="M-11 ${my+1}l3 5l3 -4l3 5l3 -4l3 5l3 -5" fill="none" stroke="#eee" stroke-width="1.6"/></g>`;
  else mouth=`<ellipse class="mouth" cx="0" cy="${my}" rx="7" ry="${C.inst==='mic'||C.inst==='horn'?6:3.5}" fill="${st}"/>`;
  const cheeks=(h||C.eye==='cool')?'':`<ellipse cx="-30" cy="16" rx="7" ry="4" fill="#ff6b8b" opacity=".5"/><ellipse cx="30" cy="16" rx="7" ry="4" fill="#ff6b8b" opacity=".5"/>`;
  if(P.has('longTongue'))extra+=`<g transform="translate(2 ${my+6})"><g class="dangle"><path d="M-5 0C-6 14 -4 30 0 38C4 30 6 14 5 0Z" fill="#c4384e" stroke="#000" stroke-width="1.5"/><path d="M0 4V30" stroke="#8a1f33" stroke-width="1.2"/></g></g>`;
  if(P.has('scar'))extra+=stitch(18,4,36,20,st,3)+stitch(36,4,18,20,st,3);
  if(P.has('stitchCheek'))extra+=stitch(-34,-4,-22,24,st,3)+stitch(24,-20,36,4,st,2);
  return cheeks+eyes+extra+mouth;
}

/* ===== 头部零件：帽子挂件 + 恐怖件 ===== */
function headParts(C,h,st,c){
  const P=new Set(C.horror),T=HEAD[C.head].top,W=HEAD[C.head].w;let s='';
  if(P.has('crack'))s+=`<path d="M-4 ${T+1}L4 ${T+12}L-3 ${T+20}L6 ${T+30}L0 ${T+36}L-6 ${T+28}L1 ${T+20}L-8 ${T+12}Z" fill="#000"/><path d="M-1 ${T+10}L3 ${T+20}" stroke="${GLOW[0]}" stroke-width="2" opacity=".8"/>`;
  if(P.has('melt'))s+=`<path d="M${-W+6} 28q2 12 6 2q4 18 8 0q4 10 7 -2" fill="${c}" stroke="${st}" stroke-width="2"/><g class="drip"><circle cx="${-W+12}" cy="40" r="3" fill="${c}"/></g><path d="M${W-20} 30q3 16 7 1q2 8 5 -1" fill="${c}" stroke="${st}" stroke-width="2"/>`;
  if(P.has('bandHead'))s+=`<path d="M${-W} ${T+22}Q0 ${T+8} ${W} ${T+18}L${W} ${T+30}Q0 ${T+20} ${-W} ${T+34}Z" fill="#d9ceb4" stroke="${st}" stroke-width="2"/><path d="M${W-4} ${T+22}l12 -4l-4 10z" fill="#d9ceb4" stroke="${st}" stroke-width="2"/><circle cx="-14" cy="${T+24}" r="3" fill="#8a6a4a" opacity=".6"/>`;
  if(P.has('patchL'))s+=`<path d="M-38 -16L10 -6L8 10L-38 2Z" fill="#d9ceb4" stroke="${st}" stroke-width="2"/><path d="M-30 -10l8 10M-18 -8l8 10" stroke="#b5a68a" stroke-width="1.5"/>`;
  if(C.ears){
    const ear=(x,torn)=>torn?`<path d="M${x-9} ${T+14}L${x-8} ${T-2}L${x-3} ${T+4}L${x+1} ${T-4}L${x+6} ${T+3}L${x+9} ${T+14}Z" fill="${c}" stroke="${st}" stroke-width="3"/><rect x="${x-9}" y="${T+4}" width="18" height="6" fill="#d9ceb4" stroke="${st}" stroke-width="1.5" transform="rotate(-15 ${x} ${T+7})"/>`
      :`<ellipse cx="${x}" cy="${T+6}" rx="10" ry="13" fill="${c}" stroke="${st}" stroke-width="3"/><ellipse cx="${x}" cy="${T+7}" rx="5" ry="7" fill="#ffc2e8" opacity="${h?.3:1}"/>`;
    s=ear(-24,false)+ear(24,P.has('tornEar'))+s;
  }
  if(P.has('patchwork'))s+=`<path d="M8 ${T+8}L34 ${T+14}L30 ${T+36}L6 ${T+30}Z" fill="${blend(c,'#5a7a3a',.5)}" stroke="${st}" stroke-width="2"/>`+stitch(8,T+8,34,T+14,st,3)+stitch(6,T+30,30,T+36,st,3)+`<path d="M-30 6L-14 4L-16 18L-32 18Z" fill="${blend(c,'#3a4a7a',.5)}" stroke="${st}" stroke-width="2"/>`;
  if(P.has('tendrils'))s+=[[-20,-1],[0,1],[22,-1]].map(([x,d],i)=>`<g class="float" style="animation-delay:${i*.5}s"><path d="M${x} ${T+8}C${x+d*14} ${T-6} ${x-d*10} ${T-18} ${x+d*6} ${T-30}" stroke="#000" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="${x+d*6}" cy="${T-31}" r="2.4" fill="#b26bff"/></g>`).join('');
  if(P.has('nails'))s+=[[-W+6,-6,-35],[W-10,-18,30]].map(([x,y,a])=>`<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-2" y="-18" width="4" height="18" fill="#9aa0a8" stroke="#000" stroke-width="1"/><rect x="-6" y="-21" width="12" height="4" rx="1" fill="#b8bec6" stroke="#000" stroke-width="1"/></g>`).join('');
  if(P.has('knife'))s+=`<g transform="translate(${W*.35} ${T+8}) rotate(25)"><path d="M-3 0L-3 -26L4 -30L3 0Z" fill="#d6dce4" stroke="#000" stroke-width="1.5"/><rect x="-5" y="-44" width="10" height="16" rx="3" fill="#6b4a2b" stroke="#000" stroke-width="1.5"/><rect x="-7" y="-30" width="14" height="4" fill="#3a2a1a"/></g>`;
  if(P.has('web'))s+=`<g opacity=".85"><path d="M${-W+2} ${T+14}L${-W+30} ${T+4}M${-W+2} ${T+14}L${-W+24} ${T+26}M${-W+2} ${T+14}L${-W+12} ${T+38}M${-W+12} ${T+10}Q${-W+12} ${T+20} ${-W+8} ${T+26}M${-W+20} ${T+7}Q${-W+18} ${T+22} ${-W+10} ${T+32}" stroke="#e8e8e8" stroke-width="1" fill="none"/></g><g class="float"><line x1="${-W+22}" y1="${T+8}" x2="${-W+22}" y2="${T+30}" stroke="#ddd" stroke-width=".8"/><circle cx="${-W+22}" cy="${T+32}" r="3.5" fill="#111"/><path d="M${-W+17} ${T+30}l-3 -3M${-W+17} ${T+33}l-4 1M${-W+27} ${T+30}l3 -3M${-W+27} ${T+33}l4 1" stroke="#111" stroke-width="1"/></g>`;
  if(P.has('lid'))s+=`<ellipse cx="0" cy="${T+12}" rx="${W*.6}" ry="8" fill="#000"/><path d="M${-W*.5} ${T+12}q6 -8 12 -2q6 -8 12 0q6 -8 12 -2" stroke="#e7a4b8" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${-W*.62} ${T+10}Q0 ${T-14} ${W*.62} ${T+10}Z" fill="${c}" stroke="${st}" stroke-width="2.5" transform="rotate(-28 ${-W*.62} ${T+10})"/>`;
  if(P.has('flies'))s+=[0,1,2].map(i=>`<g transform="translate(0 ${T+10})"><g class="orbit" style="animation-delay:${-i*1.1}s"><g transform="translate(${W+6} 0)"><ellipse cx="0" cy="0" rx="3" ry="2.2" fill="#111"/><ellipse cx="-1" cy="-3" rx="2.5" ry="1.5" fill="#cfd8e0" opacity=".8"/></g></g></g>`).join('');
  if(P.has('wires'))s+=`<path d="M-10 ${T}C-14 ${T-14} -24 ${T-10} -26 ${T-22}" stroke="#d63b3b" stroke-width="3" fill="none"/><path d="M6 ${T}C8 ${T-16} 20 ${T-12} 22 ${T-26}" stroke="#3b7bd6" stroke-width="3" fill="none"/><g class="glitch"><path d="M22 ${T-26}l4 -6l-2 6l5 -3" stroke="#fff27a" stroke-width="2" fill="none"/></g>`;
  // 挂件（恐怖阶段颜色变暗）
  const k=v=>h?horrorCol(v):v;
  const HAT={
   cloud:`<path d="M-26 ${T+6}C-34 ${T-4} -22 ${T-14} -12 ${T-8}C-8 ${T-22} 14 ${T-22} 14 ${T-8}C26 ${T-14} 34 ${T-2} 24 ${T+6}Z" fill="${k('#ffffff')}" stroke="${st}" stroke-width="2.5"/>`+(h?`<g class="drip"><path d="M-6 ${T+8}q-2 6 0 9q2 -3 0 -9" fill="#6a7a8a"/></g>`:''),
   sprout:`<path d="M0 ${T+2}C-2 ${T-8} 0 ${T-14} 0 ${T-16}" stroke="${st}" stroke-width="3" fill="none"/><path d="M0 ${T-14}C-6 ${T-26} -20 ${T-24} -20 ${T-14}C-12 ${T-10} -4 ${T-10} 0 ${T-14}Z" fill="${k('#5FD3A5')}" stroke="${st}" stroke-width="2"/><path d="M0 ${T-14}C6 ${T-26} 20 ${T-24} 20 ${T-14}C12 ${T-10} 4 ${T-10} 0 ${T-14}Z" fill="${k('#8EE3A8')}" stroke="${st}" stroke-width="2"/>`,
   sunband:`<path d="M-44 ${T+12}Q0 ${T-2} 44 ${T+12}" stroke="${k('#FFB703')}" stroke-width="7" fill="none"/><circle cx="0" cy="${T+4}" r="8" fill="${k('#FFD84D')}" stroke="${st}" stroke-width="2"/>`,
   cap:`<path d="M-40 ${T+12}C-38 ${T-8} 38 ${T-8} 40 ${T+12}Z" fill="${k('#FF7A59')}" stroke="${st}" stroke-width="3"/><path d="M30 ${T+10}L58 ${T+12}L40 ${T+16}Z" fill="${k('#FF7A59')}" stroke="${st}" stroke-width="2.5"/>`+(h?'':`<rect x="-30" y="-10" width="25" height="15" rx="5" fill="#111"/><rect x="5" y="-10" width="25" height="15" rx="5" fill="#111"/><line x1="-5" y1="-4" x2="5" y2="-4" stroke="#111" stroke-width="3"/>`),
   starclip:`<path d="M24 ${T+2}l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="${k('#FFE07A')}" stroke="${st}" stroke-width="2"/>`,
   minicloud:`<g class="float"><path d="M-18 ${T-10}C-24 ${T-16} -16 ${T-24} -8 ${T-20}C-4 ${T-30} 12 ${T-28} 12 ${T-20}C20 ${T-22} 22 ${T-12} 16 ${T-10}Z" fill="${k('#ffffff')}" stroke="${st}" stroke-width="2"/></g>`,
   leafant:`<line x1="0" y1="${T}" x2="0" y2="${T-20}" stroke="${st}" stroke-width="3"/><path d="M0 ${T-20}C10 ${T-34} 22 ${T-26} 18 ${T-18}C12 ${T-14} 4 ${T-16} 0 ${T-20}Z" fill="${k('#5FD3A5')}" stroke="${st}" stroke-width="2"/>`,
   flowerbow:[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-7" rx="5" ry="8" fill="${k('#FF5C8A')}" stroke="${st}" stroke-width="1.5" transform="translate(-14 ${T+4}) rotate(${a})"/>`).join('')+`<circle cx="-14" cy="${T+4}" r="4" fill="${k('#FFE07A')}"/>`,
   cone:`<path d="M-14 ${T+4}L4 ${T-30}L16 ${T+6}Z" fill="${k('#7FDBFF')}" stroke="${st}" stroke-width="2.5"/><path d="M-9 ${T-6}L13 ${T-2}M-3 ${T-18}L10 ${T-15}" stroke="${k('#FFE07A')}" stroke-width="3"/><circle cx="4" cy="${T-31}" r="5" fill="${k('#FF5C8A')}"/>`,
   nightcap:`<path d="M-30 ${T+12}C-26 ${T-14} 20 ${T-24} 46 ${T-2}L36 ${T+10}Z" fill="${k('#5B6FD8')}" stroke="${st}" stroke-width="2.5"/><circle cx="46" cy="${T-2}" r="6" fill="${k('#ffffff')}" stroke="${st}" stroke-width="2"/><path d="M-6 ${T-4}a6 6 0 1 0 6 8a5 5 0 1 1 -6 -8z" fill="${k('#FFE07A')}"/>`,
   flowercollar:'',
   scarf:'',
   // 第 2 阶段 金木水火土
   goldcrown:`<path d="M-20 ${T+6}L-22 ${T-14}L-10 ${T-4}L0 ${T-18}L10 ${T-4}L22 ${T-14}L20 ${T+6}Z" fill="${k('#F5C04A')}" stroke="${st}" stroke-width="2.5"/><circle cx="0" cy="${T-2}" r="3.5" fill="${k('#FF5C5C')}"/>`,
   twig:`<path d="M-4 ${T+4}C-6 ${T-10} 4 ${T-18} 2 ${T-28}" stroke="${k('#8a5a2b')}" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="-8" cy="${T-16}" rx="8" ry="4" fill="${k('#5FD3A5')}" stroke="${st}" stroke-width="1.5" transform="rotate(-30 -8 ${T-16})"/><ellipse cx="10" cy="${T-24}" rx="8" ry="4" fill="${k('#8EE3A8')}" stroke="${st}" stroke-width="1.5" transform="rotate(25 10 ${T-24})"/>`,
   drop:`<g class="float"><path d="M0 ${T-30}C8 ${T-18} 12 ${T-12} 12 ${T-6}A12 12 0 0 1 -12 ${T-6}C-12 ${T-12} -8 ${T-18} 0 ${T-30}Z" fill="${k('#5BB8F0')}" stroke="${st}" stroke-width="2.5"/><ellipse cx="-4" cy="${T-8}" rx="2.5" ry="4" fill="#fff" opacity=".7"/></g>`,
   flame:`<g class="flick2"><path d="M0 ${T+4}C-16 ${T} -14 ${T-14} -6 ${T-20}C-6 ${T-12} -2 ${T-12} 0 ${T-30}C6 ${T-18} 14 ${T-14} 12 ${T-4}C10 ${T+2} 6 ${T+4} 0 ${T+4}Z" fill="${k('#FF7A3D')}" stroke="${st}" stroke-width="2.5"/><path d="M0 ${T+2}C-6 ${T-2} -4 ${T-10} 0 ${T-16}C4 ${T-10} 6 ${T-2} 0 ${T+2}Z" fill="${k('#FFD84D')}"/></g>`,
   clay:`<path d="M-16 ${T+6}Q-20 ${T-10} -8 ${T-12}L-10 ${T-18}H10L8 ${T-12}Q20 ${T-10} 16 ${T+6}Z" fill="${k('#C98A5A')}" stroke="${st}" stroke-width="2.5"/><path d="M-12 ${T-2}h24" stroke="${k('#8a5a2b')}" stroke-width="2"/>`,
   // 第 4 阶段 日月山川
   sunhat:`<g class="spin"><circle cx="0" cy="${T-12}" r="10" fill="${k('#FFD84D')}" stroke="${st}" stroke-width="2.5"/>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="0" y1="${T-26}" x2="0" y2="${T-31}" stroke="${k('#FFB703')}" stroke-width="3" stroke-linecap="round" transform="rotate(${a} 0 ${T-12})"/>`).join('')}</g>`,
   moonclip:`<path d="M18 ${T-4}a12 12 0 1 0 12 14a9 9 0 1 1 -12 -14z" fill="${k('#FFE07A')}" stroke="${st}" stroke-width="2"/>`,
   peaks:`<path d="M-26 ${T+8}L-12 ${T-16}L-4 ${T-4}L6 ${T-22}L26 ${T+8}Z" fill="${k('#6FAF7B')}" stroke="${st}" stroke-width="2.5"/><path d="M6 ${T-22}L1 ${T-14}L6 ${T-12}L11 ${T-14}Z" fill="#fff"/>`,
   wave:`<path d="M-42 ${T+14}q7 -8 14 0t14 0t14 0t14 0t14 0t14 0" stroke="${k('#5BB8F0')}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
   rice:`<path d="M0 ${T+2}C0 ${T-10} 4 ${T-20} 12 ${T-28}" stroke="${k('#9a8a3a')}" stroke-width="2.5" fill="none"/>`+[0,1,2,3].map(i=>`<ellipse cx="${3+i*3}" cy="${T-10-i*5}" rx="2.5" ry="4" fill="${k('#F5C04A')}" stroke="${st}" stroke-width="1" transform="rotate(30 ${3+i*3} ${T-10-i*5})"/>`).join(''),
   straw:`<path d="M-44 ${T+12}Q0 ${T-30} 44 ${T+12}Q0 ${T+4} -44 ${T+12}Z" fill="${k('#E2C27A')}" stroke="${st}" stroke-width="2.5"/><path d="M-20 ${T}l40 0M-10 ${T-8}l20 0" stroke="${k('#b8955a')}" stroke-width="1.5"/>`,
   book:`<rect x="-20" y="${T-12}" width="40" height="14" rx="2" fill="${k('#F0697A')}" stroke="${st}" stroke-width="2.5"/><line x1="0" y1="${T-12}" x2="0" y2="${T+2}" stroke="${st}" stroke-width="2"/><path d="M-16 ${T-8}h12M4 ${T-8}h12" stroke="${k('#fff')}" stroke-width="2"/>`
  };
  return s+(HAT[C.hat]||'');
}

/* ===== 乐器：front 画在身体前，l/r 挂在手上，hd 挂在头上 ===== */
function inst(C,h,st,c){
  const k=v=>h?horrorCol(v):v,o={front:'',l:'',r:'',hd:'',pose:{l:20,r:-20,sl:0,sr:0,d:1,dl:0}};
  // 鼓棒：从手出发指向页面上的方向 (vx,vy)，换算到手臂自身坐标
  const stick=(a,vx,vy)=>{const r=-a*Math.PI/180,x=vx*Math.cos(r)-vy*Math.sin(r),y=32+vx*Math.sin(r)+vy*Math.cos(r);
    return `<line x1="0" y1="32" x2="${x}" y2="${y}" stroke="${k('#8a5a2b')}" stroke-width="4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3.5" fill="${k('#f3e3c3')}"/>`};
  switch(C.inst){
   case 'drum':o.front=`<rect x="46" y="128" width="48" height="22" rx="5" fill="${k('#E55')}" stroke="${st}" stroke-width="3"/><path d="M52 132L60 148L68 132L76 148L84 132L90 146" stroke="${k('#ffd166')}" stroke-width="2.5" fill="none"/><ellipse cx="70" cy="128" rx="24" ry="6" fill="${h?'#cfc6b8':'#fff'}" stroke="${st}" stroke-width="3"/>`;
     o.l=stick(50,32,-6);o.r=stick(-50,-32,-6);o.pose={l:50,r:-50,sl:22,sr:-22,d:.5,dl:.25};break;
   case 'maracas':{const m=`<line x1="0" y1="30" x2="0" y2="40" stroke="${st}" stroke-width="3"/><ellipse cx="0" cy="48" rx="8" ry="10" fill="${k('#FF5C8A')}" stroke="${st}" stroke-width="2.5"/><path d="M-6 46h12" stroke="${k('#FFE07A')}" stroke-width="2"/>`;
     o.l=m;o.r=m;o.pose={l:135,r:-135,sl:18,sr:-18,d:.5,dl:.25};break}
   case 'clap':o.pose={l:-22,r:22,sl:48,sr:-48,d:1,dl:0};o.l=o.r=`<circle cx="0" cy="33" r="9" fill="${c}" stroke="${st}" stroke-width="3"/>`;break;
   case 'bass':o.front=`<path d="M80 138L16 118" stroke="${st}" stroke-width="8" stroke-linecap="round"/><path d="M80 138L16 118" stroke="${k('#8a5a2b')}" stroke-width="4" stroke-linecap="round"/><rect x="6" y="110" width="12" height="12" rx="3" fill="${k('#3a2a1a')}" stroke="${st}" stroke-width="2" transform="rotate(17 12 116)"/><circle cx="76" cy="132" r="11" fill="${k('#FF7A59')}" stroke="${st}" stroke-width="3"/><circle cx="86" cy="144" r="13" fill="${k('#FF7A59')}" stroke="${st}" stroke-width="3"/><circle cx="76" cy="132" r="9" fill="${k('#FF7A59')}"/><circle cx="82" cy="140" r="4" fill="${st}"/>`;
     o.pose={l:70,r:12,sl:0,sr:-22,d:.5,dl:0};break;
   case 'wand':o.r=`<line x1="0" y1="30" x2="0" y2="52" stroke="${st}" stroke-width="3"/><path d="M0 50l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="${k('#FFE07A')}" stroke="${st}" stroke-width="2"/>`;
     o.pose={l:25,r:-150,sl:0,sr:-25,d:1,dl:0};break;
   case 'none':o.pose={l:70,r:-70,sl:-30,sr:30,d:2,dl:0};
     o.front=`<path d="M104 92q16 -4 12 -20M100 104q20 0 20 -14" fill="none" stroke="${k('#ffffff')}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;break;
   case 'keys':o.front=`<rect x="40" y="122" width="60" height="16" rx="3" fill="${k('#2A2145')}" stroke="${st}" stroke-width="2.5"/>`+[0,1,2,3,4,5,6].map(i=>`<rect x="${43+i*8}" y="125" width="6" height="10" fill="${k('#ffffff')}"/>`).join('')+[0,1,3,4,5].map(i=>`<rect x="${47+i*8}" y="125" width="4" height="6" fill="${k('#2A2145')}"/>`).join('');
     o.pose={l:-10,r:10,sl:14,sr:-14,d:.5,dl:.25};break;
   case 'bells':{const b=`<line x1="0" y1="30" x2="0" y2="40" stroke="${k('#8a5a2b')}" stroke-width="4"/><path d="M-8 52Q-8 40 0 40Q8 40 8 52L11 55H-11Z" fill="${k('#FFD84D')}" stroke="${st}" stroke-width="2.5"/><circle cx="0" cy="57" r="2.5" fill="${st}"/>`;
     o.l=b;o.r=b;o.pose={l:150,r:-100,sl:-50,sr:50,d:1,dl:.5};break}
   case 'horn':o.hd=`<path d="M8 22L40 26L54 16L54 46L40 34L8 28Z" fill="${k('#F5C04A')}" stroke="${st}" stroke-width="2.5"/><rect x="22" y="22" width="4" height="10" fill="${st}"/>`;
     o.pose={l:-70,r:-100,sl:0,sr:-12,d:1,dl:0};break;
   case 'pillow':o.front=`<g class="float"><path d="M100 120C90 120 90 106 98 104C97 94 108 90 113 98C116 88 132 90 132 101C140 101 141 120 131 120Z" fill="${k('#ffffff')}" stroke="${st}" stroke-width="2.5"/></g>`;
     o.pose={l:25,r:-45,sl:10,sr:-15,d:2,dl:0};break;
   case 'mic':o.r=`<line x1="0" y1="30" x2="0" y2="44" stroke="${k('#333')}" stroke-width="4"/><circle cx="0" cy="48" r="7" fill="${k('#9aa3b5')}" stroke="${st}" stroke-width="2.5"/>`;
     o.pose={l:115,r:-165,sl:-30,sr:8,d:1,dl:0};break;
   case 'snap':o.r=`<circle cx="-3" cy="38" r="3" fill="${c}" stroke="${st}" stroke-width="2"/><g class="beat"><path d="M8 40l7 -3M9 46l8 1M6 51l5 5" stroke="${h?'#b26bff':'#ffe07a'}" stroke-width="2" stroke-linecap="round"/></g>`;
     o.pose={l:8,r:-150,sl:0,sr:14,d:2,dl:1};break;
   case 'card':{const pin=/^[a-zü]/.test(C.card);
     o.front=`<g class="cardg"><rect x="46" y="112" width="48" height="34" rx="6" fill="${h?'#d8cfc0':'#fffdf5'}" stroke="${st}" stroke-width="3"/>`+
       (pin?'':`<path d="M70 115V143M49 129H91" stroke="${h?'#7a2a2a':'#F0697A'}" stroke-width="1.2" stroke-dasharray="3 3"/>`)+
       `<text x="70" y="${pin?136:139}" text-anchor="middle" font-size="${pin?20:24}" font-weight="700" font-family="Andika,'Segoe UI',sans-serif" fill="${h?'#3a0a10':'#1f1a33'}">${C.card}</text></g>`;
     o.pose={l:11,r:-11,sl:-6,sr:6,d:1,dl:0};break}
  }
  return o;
}

/* ===== 组装 ===== */
// look: {dark:是否恐怖, hat:挂件, parts:[恐怖件], card:手里卡片的字, col:换颜色}
export function charSVG(id,look={}){
  const h=!!look.dark;
  const C={...CH[id],hat:look.hat!==undefined?look.hat:CH[id].hat,horror:look.parts||[],card:look.card||CH[id].card,col:look.col||CH[id].col};
  const st=C.rim||(h?'#050208':'#2A2145'),c=h?horrorCol(C.col):C.col,P=new Set(C.horror);
  const I=inst(C,h,st,c),pz=I.pose,belly=C.rim?'#2a2436':h?blend(c,'#000',.25):blend(c,'#fff',.35);
  const leg=(x,cls)=>{const band=P.has('bandLeg')&&cls=='l',back=P.has('backFeet');
    if(P.has('pegLeg')&&cls=='r')return `<g transform="translate(${x} 148)"><g class="leg ${cls}"><rect x="-6" y="-2" width="12" height="10" rx="5" fill="${c}" stroke="${st}" stroke-width="3"/><rect x="-3" y="6" width="6" height="26" fill="#8a5a2b" stroke="#000" stroke-width="1.5"/></g></g>`;
    const chain=P.has('chain')&&cls=='l'?`<rect x="-8" y="16" width="16" height="5" rx="2" fill="#7a8088" stroke="#000"/><path d="M-6 20q-6 4 -10 2q-4 4 -8 2" stroke="#7a8088" stroke-width="3" fill="none"/><circle cx="-26" cy="26" r="7" fill="#2a2a2e" stroke="#000"/>`:'';
    return `<g transform="translate(${x} 148)"><g class="leg ${cls}"><rect x="-6" y="-2" width="12" height="28" rx="6" fill="${c}" stroke="${st}" stroke-width="3"/>`+
    (band?`<path d="M-7 6l14 -3M-7 12l14 -3M-7 18l14 -3" stroke="#d9ceb4" stroke-width="4"/>`:'')+
    `<ellipse cx="${back?(cls=='l'?5:-5):(cls=='l'?-2:2)}" cy="28" rx="10" ry="6" fill="${st}"/>${back?`<path d="M${cls=='l'?8:-8} 26l${cls=='l'?6:-6} 0" stroke="#666" stroke-width="2"/>`:''}${chain}</g></g>`};
  const arm=(x,side)=>{
    const a=side=='l'?pz.l:pz.r,s=side=='l'?pz.sl:pz.sr,dl=side=='l'?0:pz.dl;
    const bone=P.has('boneL')&&side=='l';
    let body=bone?`<path d="M0 0L0 30" stroke="#e9e2d0" stroke-width="5"/><circle cx="-3" cy="2" r="4" fill="#e9e2d0"/><circle cx="3" cy="2" r="4" fill="#e9e2d0"/><circle cx="-3" cy="28" r="4" fill="#e9e2d0"/><circle cx="3" cy="28" r="4" fill="#e9e2d0"/><path d="M-6 32l-3 8M0 34v9M6 32l3 8" stroke="#e9e2d0" stroke-width="3" stroke-linecap="round"/>`
      :`<path d="M0 0L0 30" stroke="${st}" stroke-width="13" stroke-linecap="round"/><path d="M0 0L0 30" stroke="${c}" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="32" r="7" fill="${c}" stroke="${st}" stroke-width="3"/>`;
    if(P.has('wristR')&&side=='r')body+=stitch(-7,25,7,25,st,2);
    if(P.has('claws'))body+=`<path d="M-5 37l-3 10M0 39v11M5 37l3 10" stroke="#e9e2d0" stroke-width="2.2" stroke-linecap="round"/>`;
    if(P.has('bandArm')&&side=='r')body+=`<path d="M-6 6l12 -3M-6 12l12 -3M-6 18l12 -3" stroke="#d9ceb4" stroke-width="3.5"/>`;
    if(P.has('handEyes'))body+=eyeH(0,33,GLOW[1],4);
    return `<g transform="translate(${x} 110)"><g class="arm" style="--a:${a}deg;--s:${s}deg;--d:calc(var(--b)*${pz.d});--dl:calc(var(--b)*${dl})">${body}${side=='l'?I.l:I.r}</g></g>`};
  let bodyX='';
  if(P.has('heart'))bodyX+=`<path d="M58 104Q70 100 82 104L80 124Q70 130 60 124Z" fill="#1a0006" stroke="${st}" stroke-width="2"/><path d="M61 108h18M61 114h18M62 120h16" stroke="#e9e2d0" stroke-width="2" opacity=".7"/><g class="beat"><path d="M70 124C60 116 60 107 66 107C69 107 70 110 70 111C70 110 71 107 74 107C80 107 80 116 70 124Z" fill="#b0102a" stroke="#000" stroke-width="1.5"/></g>`;
  if(P.has('ribs'))bodyX+=`<path d="M56 108Q70 102 84 108L82 140Q70 146 58 140Z" fill="#14060a" stroke="${st}" stroke-width="2"/><path d="M70 108V140" stroke="#e9e2d0" stroke-width="3"/>`+[114,121,128,135].map(y=>`<path d="M70 ${y}Q62 ${y-3} 59 ${y+2}M70 ${y}Q78 ${y-3} 81 ${y+2}" stroke="#e9e2d0" stroke-width="2.5" fill="none"/>`).join('');
  if(P.has('hole'))bodyX+=`<path d="M62 120l4 -6l6 3l5 -4l4 7l-2 6l3 6l-6 4l-5 -2l-6 3l-4 -6l2 -5z" fill="#2a0d14" stroke="#000" stroke-width="2"/>`;
  if(P.has('woundEye'))bodyX+=`<path d="M57 136Q66 128 76 134Q66 142 57 136Z" fill="#3a0010" stroke="#000" stroke-width="1.5"/><g class="eye" style="animation-delay:.8s"><circle cx="66" cy="135" r="3.5" fill="#f3efe6"/><circle cx="66.5" cy="135" r="1.6" fill="#000"/></g>`;
  if(P.has('zipBody'))bodyX+=`<path d="M70 102L64 150L76 150Z" fill="#000"/><path d="M70 102L64 150M70 102L76 150" stroke="#b8bec6" stroke-width="2" stroke-dasharray="2 2"/><circle cx="68" cy="128" r="2.2" fill="#ff3b3b"/><circle cx="72.5" cy="134" r="2" fill="#ff3b3b"/><rect x="67" y="100" width="6" height="8" rx="1" fill="#b8bec6" stroke="#000"/>`;
  if(P.has('cracksBody'))bodyX+=`<path d="M50 112l8 6l-3 7l9 5M90 120l-7 4l2 8l-8 3" stroke="#000" stroke-width="2" fill="none"/>`;
  if(P.has('bugs'))bodyX+=[0,1].map(i=>`<g class="crawl" style="animation-delay:${-i*2}s"><ellipse cx="0" cy="0" rx="3.5" ry="2.5" fill="#111"/><path d="M-3 -2l-2 -2M0 -2v-3M3 -2l2 -2M-3 2l-2 2M0 2v3M3 2l2 2" stroke="#111" stroke-width="1"/></g>`).join('');
  if(P.has('bodyStitch'))bodyX+=stitch(52,108,62,146,st,5);
  if(P.has('bellyMouth'))bodyX+=`<g class="beat" style="transform-origin:center"><path d="M56 124Q70 116 84 124Q70 142 56 124Z" fill="#000"/><path d="M58 124l3 5l3 -4l3 5l3 -5l3 5l3 -5l3 4l3 -5" fill="none" stroke="#f3efe6" stroke-width="1.6"/></g>`;
  if(P.has('patchwork'))bodyX+=`<rect x="74" y="110" width="14" height="14" fill="${blend(c,'#5a7a3a',.5)}" stroke="${st}" stroke-width="1.5" transform="rotate(8 81 117)"/>`+stitch(74,110,88,112,st,2)+`<rect x="52" y="128" width="12" height="12" fill="${blend(c,'#3a4a7a',.5)}" stroke="${st}" stroke-width="1.5"/>`;
  if(P.has('meltBody'))bodyX+=`<path d="M50 146q2 12 6 2q3 14 7 0q4 10 8 -1q3 12 7 0q4 10 8 -2" fill="${c}" stroke="${st}" stroke-width="2"/><g class="drip"><circle cx="62" cy="160" r="3" fill="${c}"/></g>`;
  if(C.hat==='scarf'){const sc=h?'#4a1020':'#6b5cff';bodyX+=`<path d="M50 100Q70 110 90 100L90 108Q70 118 50 108Z" fill="${sc}" stroke="${st}" stroke-width="2"/><g class="wave"><path d="M86 104C100 104 108 98 122 102L120 112C108 108 100 114 86 112Z" fill="${sc}" stroke="${st}" stroke-width="2"/>${h?'<path d="M114 108l4 8l3 -7" fill="#4a1020" stroke="#000" stroke-width="1.5"/>':''}</g>`}
  if(P.has('bodyEyes'))bodyX+=[[60,126,3.5],[80,134,3],[66,142,2.5]].map(([x,y,r],i)=>eyeH(x,y,'#b26bff',r).replace('class="eye"',`class="eye" style="animation-delay:${i*1.1}s"`)).join('');
  if(P.has('shadowDrip'))bodyX+=`<path d="M48 146q2 14 6 3q3 18 7 0M84 148q3 12 6 1" fill="#000" stroke="#000" stroke-width="2"/><g class="drip"><circle cx="54" cy="160" r="2.5" fill="#000"/></g>`;
  if(C.hat==='flowercollar')bodyX+=[52,61,70,79,88].map(x=>`<circle cx="${x}" cy="${104+Math.abs(x-70)/4}" r="5" fill="${h?horrorCol('#FF8FA3'):'#FF8FA3'}" stroke="${st}" stroke-width="1.5"/>`).join('');
  if(C.hat==='sunband'&&!h)bodyX+=`<circle cx="70" cy="126" r="6" fill="#FFD84D" stroke="${st}" stroke-width="1.5"/>`;
  const H=HEAD[C.head];
  const shadow=P.has('shadow')?`<g class="lurk"><path d="M70 30C40 30 34 70 40 110L36 180H104L100 110C106 70 100 30 70 30Z" fill="#000" opacity=".55"/><circle cx="58" cy="62" r="3.5" fill="#ff2e2e"/><circle cx="82" cy="62" r="3.5" fill="#ff2e2e"/></g>`:'';
  const extra=P.has('extraArm')?`<g transform="translate(92 128)"><g class="arm" style="--a:-60deg;--s:-30deg;--d:calc(var(--b)*1);--dl:0s"><path d="M0 0L0 24" stroke="${st}" stroke-width="11" stroke-linecap="round"/><path d="M0 0L0 24" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="26" r="5.5" fill="${c}" stroke="${st}" stroke-width="2.5"/></g></g>`:'';
  return `<svg viewBox="0 0 140 196" xmlns="http://www.w3.org/2000/svg"><ellipse cx="70" cy="184" rx="34" ry="5" fill="#000" opacity=".15"/>${shadow}
  <g transform="translate(70 184)"><g class="bd"><g transform="translate(-70 -184)">
   ${leg(61,'l')}${leg(79,'r')}
   <path d="M52 100Q49 100 48 108L45 142Q45 152 55 152H85Q95 152 95 142L92 108Q91 100 88 100Z" fill="${c}" stroke="${st}" stroke-width="3"/>
   <ellipse cx="70" cy="128" rx="14" ry="15" fill="${belly}"/>${bodyX}
   ${I.front}
   <g transform="translate(70 104)"><g class="head"><g transform="translate(0 -44)">
     <path d="${H.d}" fill="${c}" stroke="${st}" stroke-width="3"/>${face(C,id,h,st)}${headParts(C,h,st,c)}${I.hd}
   </g></g></g>
   ${extra}${arm(50,'l')}${arm(90,'r')}
  </g></g></g></svg>`;
}

