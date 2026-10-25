/* 青魚電腦 — 滑鼠與指標：指標樣式、點擊波紋、位置提示、軌跡、雙擊速度、搖動視窗 */
(function(){
'use strict';
const OS=window.OS,{$,clamp}=OS.U,S=OS.S;
const M=OS.mouse={};
M.defaults={cur:'default',size:1,color:'white',trail:false,trailLen:12,ripple:true,locate:true,hideTyping:false,shake:true,dbl:500,soft:'auto'};
M.normalize=()=>{
 const m=S.mouse=Object.assign({},M.defaults,S.mouse&&typeof S.mouse==='object'?S.mouse:{});
 if(!['default','fish','classic','dot'].includes(m.cur))m.cur='default';
 if(!['white','black','accent','yellow','red'].includes(m.color))m.color='white';
 m.size=[1,1.5,2,2.5,3].includes(+m.size)?+m.size:1;
 m.trailLen=clamp(Math.round(+m.trailLen||12),4,30);
 if(!['auto','on','off'].includes(m.soft))m.soft='auto';
 m.dbl=clamp(Math.round(+m.dbl||500),200,900);
 ['trail','ripple','locate','hideTyping','shake'].forEach(k=>{m[k]=!!m[k]});
};
M.normalize();
OS.dblMs=()=>S.mouse.dbl;

/* ---- 指標圖形 ---- */
const COL={white:['#ffffff','#0d1b20'],black:['#0d1b20','#ffffff'],yellow:['#ffd23f','#0d1b20'],red:['#ff4d4d','#ffffff']};
function cols(c){c=c||S.mouse.color;if(c==='accent')return [S.accent,'#ffffff'];return COL[c]||COL.white}
/* 回傳 {svg, w, h, hx, hy} */
M.shape=(style,kind,k,color)=>{
 k=k||S.mouse.size;const [f,l]=cols(color);
 let body,vb=24,hx,hy;
 if(style==='dot'){
  vb=24;hx=12;hy=12;
  body=kind==='hand'?`<circle cx="12" cy="12" r="9" fill="${f}" fill-opacity=".28" stroke="${l}" stroke-width="3.4"/><circle cx="12" cy="12" r="9" fill="none" stroke="${f}" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="${f}" stroke="${l}" stroke-width="1"/>`
   :`<circle cx="12" cy="12" r="6.5" fill="none" stroke="${l}" stroke-width="3.4"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="${f}" stroke-width="1.8"/><circle cx="12" cy="12" r="1.7" fill="${f}" stroke="${l}" stroke-width="1"/>`;
 }else if(style==='fish'){
  vb=32;hx=4;hy=9;
  const fish=`<path transform="rotate(30 16 16)" d="M2.5 16C7.5 7 18 6 24 12l6-5v18l-6-5C18 26 7.5 25 2.5 16z" fill="${f}" stroke="${l}" stroke-width="1.6" stroke-linejoin="round"/><circle transform="rotate(30 16 16)" cx="9.5" cy="14" r="1.5" fill="${l}"/>`;
  body=kind==='hand'?fish+`<circle cx="4" cy="9" r="3.2" fill="none" stroke="${l}" stroke-width="2.4"/><circle cx="4" cy="9" r="3.2" fill="none" stroke="${f}" stroke-width="1.2"/>`:fish;
 }else{
  vb=24;
  if(kind==='hand'){
   hx=10;hy=2;
   body=`<path d="M8.6 3.4a1.5 1.5 0 0 1 3 0v6.1l.2.1 4.9.8a2.2 2.2 0 0 1 1.9 2.2v3.4c0 2.7-1.5 5-3.7 6H9.6c-1.1-1.2-3.2-4-4-5.6a1.5 1.5 0 0 1 2.3-1.9l.7.8z" fill="${f}" stroke="${l}" stroke-width="1.3" stroke-linejoin="round"/><path d="M13.4 12.2v3.5M16.3 12.7v3" stroke="${l}" stroke-width="1" stroke-linecap="round"/>`;
  }else{
   hx=3;hy=2;
   body=`<path d="M3 2v17.4l4.3-3.9 3 7 3-1.3-3-6.8h6.2z" fill="${f}" stroke="${l}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }
 }
 const px=Math.round((vb===32?26:24)*k);
 const sc=px/vb;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${vb} ${vb}">${body}</svg>`;
 return {svg,w:px,h:px,hx:Math.max(0,Math.min(px-1,Math.round(hx*sc))),hy:Math.max(0,Math.min(px-1,Math.round(hy*sc)))};
};
M.cursorCss=(style,kind,k,color,fallback)=>{
 const s=M.shape(style,kind,k,color);
 return `url("data:image/svg+xml,${encodeURIComponent(s.svg)}") ${s.hx} ${s.hy}, ${fallback}`;
};
M.apply=()=>{
 const os=$('#os');if(!os)return;
 const m=S.mouse;
 if(m.cur==='default'){os.style.removeProperty('--cur-arrow');os.style.removeProperty('--cur-hand')}
 else{
  os.style.setProperty('--cur-arrow',M.cursorCss(m.cur,'arrow',m.size,m.color,'default'));
  os.style.setProperty('--cur-hand',M.cursorCss(m.cur,'hand',m.size,m.color,'pointer'));
 }
 if(!m.hideTyping)os.classList.remove('hidecur');
 if(!m.trail)clearTrail();
 softApply();
};
OS.on('look',()=>M.apply());

/* ---- 軟體游標：平板外接滑鼠時，自己畫一個會跟著移動的游標 ---- */
let sc=null,scKind='',scOn=false,scX=-99,scY=-99,scHide=true;
const wantSoft=()=>S.mouse.soft==='on'||(S.mouse.soft==='auto'&&(navigator.maxTouchPoints||0)>0);
function scEl(){
 if(sc&&sc.isConnected)return sc;
 const os=$('#os');if(!os)return null;
 sc=document.createElement('div');sc.id='scur';sc.hidden=true;os.appendChild(sc);scKind='';return sc;
}
function scShape(kind){
 const st=S.mouse.cur==='default'?'classic':S.mouse.cur;
 if(kind==='text'){
  const k=S.mouse.size,[f,l]=cols(),px=Math.round(24*k);
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><path d="M8 3h8M8 21h8M12 3v18" stroke="${l}" stroke-width="4" stroke-linecap="round"/><path d="M8 3h8M8 21h8M12 3v18" stroke="${f}" stroke-width="1.8" stroke-linecap="round"/></svg>`,hx:Math.round(px/2),hy:Math.round(px/2)};
 }
 if(kind==='move'){
  const k=S.mouse.size,[f,l]=cols(),px=Math.round(24*k),d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3";
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="${l}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${f}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,hx:Math.round(px/2),hy:Math.round(px/2)};
 }
 return M.shape(st,kind==='hand'?'hand':'arrow');
}
function scKindOf(t){
 let c='';try{c=t&&t.nodeType===1?getComputedStyle(t).cursor:''}catch(e){}
 if(/(^|,\s*)pointer\s*$/.test(c)||/\bgrab/.test(c))return 'hand';
 if(/\btext\s*$/.test(c))return 'text';
 if(/resize|move|all-scroll/.test(c))return 'move';
 return 'arrow';
}
function scDraw(kind){
 const el=scEl();if(!el)return;
 if(kind!==scKind){const sh=scShape(kind);scKind=kind;el.innerHTML=sh.svg;el._hx=sh.hx;el._hy=sh.hy}
}
function scMove(e){
 if(!scOn)return;
 if(e.pointerType!=='mouse'&&e.pointerType!=='pen'){scHideNow();return}
 const el=scEl();if(!el)return;
 const t=e.target;
 if(t&&t.tagName==='IFRAME'){scHideNow();return}
 scDraw(scKindOf(t));
 scX=e.clientX;scY=e.clientY;
 el.style.transform=`translate(${scX-(el._hx||0)}px,${scY-(el._hy||0)}px)`;
 if(el.hidden)el.hidden=false;
}
function scHideNow(){if(sc)sc.hidden=true}
function softApply(){
 const os=$('#os');if(!os)return;
 const on=wantSoft();
 if(on!==scOn){scOn=on;os.classList.toggle('softcur',on);if(!on)scHideNow()}
 if(on){scKind='';if(sc&&!sc.hidden){scDraw(scKindOf(document.elementFromPoint(scX,scY)));sc.style.transform=`translate(${scX-(sc._hx||0)}px,${scY-(sc._hy||0)}px)`}}
}
document.addEventListener('pointermove',scMove,true);
document.addEventListener('pointerdown',e=>{if(scOn){if(e.pointerType==='touch')scHideNow();else scMove(e)}},true);
document.addEventListener('pointerout',e=>{if(!e.relatedTarget)scHideNow()},true);
document.addEventListener('mouseleave',scHideNow);
addEventListener('blur',scHideNow);
OS.on('look',()=>{if(sc&&!sc.hidden){scKind=''}});

/* ---- 點擊波紋與位置提示 ---- */
let lastX=innerWidth/2,lastY=innerHeight/2,ripples=0;
function fx(cls,x,y,n){
 const os=$('#os');if(!os||S.anomo||S.saver)return;
 if(ripples>10)return;
 const el=document.createElement('i');el.className=cls;el.style.left=x+'px';el.style.top=y+'px';
 if(n)el.style.setProperty('--n',n);
 os.appendChild(el);ripples++;
 const done=()=>{if(el.isConnected){el.remove();ripples=Math.max(0,ripples-1)}};
 el.addEventListener('animationend',done);setTimeout(done,1200);
}
document.addEventListener('pointerdown',e=>{
 lastX=e.clientX;lastY=e.clientY;
 if(!S.mouse.ripple||OS.R.state==='off'||OS.R.state==='boot'||e.pointerType==='touch'&&false)return;
 fx(e.button===2?'mrip r2':'mrip',e.clientX,e.clientY);
},true);
document.addEventListener('pointermove',e=>{
 lastX=e.clientX;lastY=e.clientY;
 const os=$('#os');if(os&&os.classList.contains('hidecur'))os.classList.remove('hidecur');
 if(S.mouse.trail&&e.pointerType==='mouse')trailAdd(e.clientX,e.clientY);
},true);
let ctrlPend=false;
document.addEventListener('keydown',e=>{
 if(e.key==='Control'){if(!e.repeat)ctrlPend=true;return}
 ctrlPend=false;
 if(S.mouse.hideTyping&&!['Shift','Alt','Meta','Escape','Tab','CapsLock'].includes(e.key)&&OS.U.isTyping(e.target)){const os=$('#os');if(os)os.classList.add('hidecur')}
},true);
document.addEventListener('keyup',e=>{
 if(e.key==='Control'&&ctrlPend&&S.mouse.locate&&OS.R.state==='desktop'){fx('mloc',lastX,lastY)}
 if(e.key==='Control')ctrlPend=false;
},true);
addEventListener('blur',()=>{ctrlPend=false});

/* ---- 指標軌跡 ---- */
let cv=null,cx=null,pts=[],raf=0;
function ensureCv(){
 if(cv)return true;
 const os=$('#os');if(!os)return false;
 cv=document.createElement('canvas');cv.id='mtrail';os.appendChild(cv);cx=cv.getContext('2d');sizeCv();return true;
}
function sizeCv(){if(!cv)return;const d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(innerWidth*d);cv.height=Math.round(innerHeight*d);cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';cx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',sizeCv);
function trailAdd(x,y){
 if(!ensureCv())return;
 pts.push({x,y,t:performance.now()});
 if(pts.length>80)pts.shift();
 if(!raf)raf=requestAnimationFrame(trailDraw);
}
function clearTrail(){pts=[];if(cx&&cv)cx.clearRect(0,0,cv.width,cv.height);if(raf){cancelAnimationFrame(raf);raf=0}}
function trailDraw(){
 raf=0;if(!cx)return;
 const now=performance.now(),life=S.mouse.trailLen*28+60;
 pts=pts.filter(p=>now-p.t<life);
 cx.clearRect(0,0,innerWidth,innerHeight);
 if(pts.length>1){
  cx.lineCap='round';cx.lineJoin='round';
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],age=1-(now-b.t)/life;
   cx.strokeStyle=S.accent;cx.globalAlpha=Math.max(0,age*.75);cx.lineWidth=2+6*age;
   cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
  }
  cx.globalAlpha=1;
 }
 if(pts.length)raf=requestAnimationFrame(trailDraw);
}

/* ---- 雙擊速度：以自己的計時產生 dblclick ---- */
let lc={t:0,x:0,y:0,n:0};
document.addEventListener('dblclick',e=>{if(e.isTrusted){e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{
 if(!e.isTrusted||e.button!==0||e.detail===0)return;
 const now=performance.now(),near=Math.hypot(e.clientX-lc.x,e.clientY-lc.y)<=8;
 if(lc.n===1&&near&&now-lc.t<=S.mouse.dbl){
  lc={t:0,x:0,y:0,n:0};
  const tg=e.target,o={bubbles:true,cancelable:true,composed:true,view:window,detail:2,button:0,clientX:e.clientX,clientY:e.clientY,screenX:e.screenX,screenY:e.screenY,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey,metaKey:e.metaKey};
  setTimeout(()=>{const t=tg&&tg.isConnected?tg:document.elementFromPoint(o.clientX,o.clientY);if(t)t.dispatchEvent(new MouseEvent('dblclick',o))},0);
 }else lc={t:now,x:e.clientX,y:e.clientY,n:1};
},true);

/* ---- 搖動標題列：最小化其他視窗 ---- */
const SH={last:null,dir:0,ext:0,ev:[],list:null};
M.shakeStart=()=>{SH.last=null;SH.dir=0;SH.ext=0;SH.ev=[]};
M.shakeFeed=(w,x)=>{
 if(!S.mouse.shake||OS.compact())return;
 if(SH.last==null){SH.last=x;SH.ext=x;return}
 const d=x>SH.last?1:x<SH.last?-1:0;
 if(d&&d!==SH.dir){
  if(SH.dir&&Math.abs(SH.last-SH.ext)>=40){SH.ev.push(performance.now())}
  SH.dir=d;SH.ext=SH.last;
 }
 SH.last=x;
 const now=performance.now();
 SH.ev=SH.ev.filter(t=>now-t<800);
 if(SH.ev.length>=4){SH.ev=[];shake(w)}
};
function shake(w){
 const WM=OS.WM;
 if(SH.list&&SH.list.some(o=>WM.list.includes(o)&&o.state==='min'&&o!==w)){
  const l=SH.list;SH.list=null;
  l.filter(o=>WM.list.includes(o)&&o.state==='min').forEach(o=>WM.restore(o,true));
  WM.focus(w,{noFocus:true});OS.sfx('click');return;
 }
 const others=WM.visibleList().filter(o=>o!==w&&o.state!=='min'&&o.A.minimizable!==false&&!o.closing);
 if(!others.length)return;
 others.forEach(o=>WM.minimize(o));SH.list=others;
 WM.focus(w,{noFocus:true});OS.sfx('click');
}

/* ---- 滑鼠滾輪調整音量（在音量圖示上）---- */
OS.initMouse=()=>{
 M.apply();
 const q=$('#tbQS');
 if(q)q.addEventListener('wheel',e=>{
  e.preventDefault();
  OS.setVol(S.vol+(e.deltaY<0?5:-5));
 },{passive:false});
};
})();
