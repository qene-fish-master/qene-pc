/* 青魚電腦 — 視窗管理員 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U;
const WM=OS.WM={list:[],order:[],desks:[{}],desk:0,active:null,seq:0,Z0:100,sdList:null};
const wins=()=>document.getElementById('wins');
WM.area=()=>{const e=wins();return {w:e.clientWidth,h:e.clientHeight}};
OS.compact=()=>innerWidth<720;
const TBH=36;

function geom(w){return {x:w.x,y:w.y,w:w.w,h:w.h}}
function applyGeom(w){
 const s=w.el.style;s.left=w.x+'px';s.top=w.y+'px';s.width=w.w+'px';s.height=w.h+'px';
}
function ctlIcons(w){
 const mx=$('.wmax',w.el);
 if(mx){mx.innerHTML=OS.ico(w.state==='max'?'restore':'max',14);mx.title=w.state==='max'?'還原':'最大化';mx.setAttribute('aria-label',mx.title)}
}
function fitIn(w){ // 讓視窗保持在可視範圍內
 const a=WM.area();
 w.w=Math.min(w.w,Math.max(w.minW,a.w));w.h=Math.min(w.h,Math.max(w.minH,a.h));
 w.x=clamp(w.x,Math.min(0,a.w-w.w),Math.max(0,a.w-w.w));
 w.y=clamp(w.y,0,Math.max(0,a.h-w.h));
}
WM.visibleList=()=>WM.list.filter(w=>w.desk===WM.desk);
WM.byApp=id=>WM.list.filter(w=>w.app===id&&!w.closing);

WM.open=(id,args)=>{
 const A=OS.apps[id];
 if(!A||!OS.appInstalled(id))return null;
 if(OS.R.state!=='desktop')return null;
 args=args||{};
 const key=A.single?'*':(A.key?A.key(args):null);
 if(key!=null){
  const ex=WM.list.find(w=>w.app===id&&w.dk===key&&!w.closing);
  if(ex){
   WM.focus(ex);
   try{ex.inst&&ex.inst.onArgs&&ex.inst.onArgs(args)}catch(e){console.error(e)}
   return ex;
  }
 }
 if(WM.list.length>=40){OS.toast('開啟的視窗太多了，請先關閉一些視窗。');return null}
 const area=WM.area();
 const w={id:"w"+(++WM.seq),app:id,dk:key,A,title:A.name,state:'normal',snap:null,desk:WM.desk,inst:null,clean:[],closing:false,modals:0};
 w.minW=Math.min(A.minW||320,area.w);w.minH=Math.min(A.minH||220,area.h);
 w.w=Math.min(args.w||A.w||760,area.w);w.h=Math.min(args.h||A.h||500,area.h);
 const n=WM.list.filter(x=>x.desk===WM.desk&&x.state!=='min').length%8;
 w.x=args.x!=null?args.x:Math.round((area.w-w.w)/2)-60+n*30;
 w.y=args.y!=null?args.y:Math.round((area.h-w.h)/2)-30+n*30;
 fitIn(w);
 const el=document.createElement('div');
 el.className='win app-'+id+(A.cls?' '+A.cls:'');
 el.tabIndex=-1;el.dataset.wid=w.id;
 el.setAttribute('role','dialog');el.setAttribute('aria-label',w.title);
 const canMax=A.maxable!==false&&A.resizable!==false,canMin=A.minimizable!==false;
 el.innerHTML=`<div class="wtb"><span class="wti">${OS.appIcon(id,16)}</span><span class="wtt"></span><span class="wtx"></span><div class="wctl">${canMin?`<button type="button" class="wmin" title="最小化" aria-label="最小化">${OS.ico('min',14)}</button>`:''}${canMax?'<button type="button" class="wmax"></button>':''}<button type="button" class="wcls" title="關閉" aria-label="關閉">${OS.ico('close',14)}</button></div></div><div class="wbd"></div>`+
  (A.resizable!==false?['n','s','e','w','ne','nw','se','sw'].map(d=>`<i class="rz ${d}" data-d="${d}"></i>`).join(''):'');
 w.el=el;w.body=$('.wbd',el);w.titleEl=$('.wtt',el);w.extra=$('.wtx',el);
 $('.wtt',el).textContent=w.title;
 if(A.resizable===false)el.classList.add('fixed');
 wins().appendChild(el);
 applyGeom(w);ctlIcons(w);
 /* 對外提供給應用程式的 API */
 w.setTitle=t=>{w.title=t;w.titleEl.textContent=t;el.setAttribute('aria-label',t);OS.emit('wm')};
 w.focus=()=>WM.focus(w);
 w.close=f=>WM.close(w,f);
 w.cleanup=f=>{w.clean.push(f)};
 w.every=(f,ms)=>{const t=setInterval(f,ms);w.clean.push(()=>clearInterval(t));return t};
 w.on=(e,f)=>{const off=OS.on(e,f);w.clean.push(off);return off};
 w.key=f=>{el.addEventListener('keydown',e=>{if(w.modals||e.target.closest('.dlgwrap'))return;f(e)})};
 w.dialog=o=>OS.dialog(Object.assign({},o,{parent:w}));
 w.alert=(m,o)=>OS.alert(m,Object.assign({},o,{parent:w}));
 w.confirm=(m,o)=>OS.confirm(m,Object.assign({},o,{parent:w}));
 w.prompt=o=>OS.prompt(Object.assign({},o,{parent:w}));
 w.setDirty=d=>{w.dirty=!!d};
 w.menu=(items,x,y)=>OS.menu(items,x,y);
 WM.list.push(w);WM.order.push(w);
 WM.sdList=null;
 /* 事件 */
 el.addEventListener('pointerdown',e=>{if(WM.active!==w||document.activeElement===document.body)WM.focus(w,{noFocus:e.target.closest('input,textarea,select,[contenteditable=true],iframe')!==null})},true);
 el.addEventListener('focusin',()=>{if(WM.active!==w&&!w.closing)WM.focus(w,{noFocus:true})});
 const tb=$('.wtb',el);
 tb.addEventListener('pointerdown',e=>titleDown(w,e));
 tb.addEventListener('dblclick',e=>{if(e.target.closest('.wctl'))return;if(canMax)WM.toggleMax(w)});
 tb.addEventListener('contextmenu',e=>{e.preventDefault();sysMenu(w,e.clientX,e.clientY)});
 $('.wti',el).addEventListener('click',e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();sysMenu(w,r.left,r.bottom)});
 const bmin=$('.wmin',el),bmax=$('.wmax',el);
 if(bmin)bmin.addEventListener('click',()=>WM.minimize(w));
 if(bmax)bmax.addEventListener('click',()=>WM.toggleMax(w));
 $('.wcls',el).addEventListener('click',()=>WM.close(w));
 $$('.rz',el).forEach(h=>h.addEventListener('pointerdown',e=>resizeDown(w,h.dataset.d,e)));
 if(window.ResizeObserver){
  let raf=0;w.ro=new ResizeObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{try{w.inst&&w.inst.onResize&&w.inst.onResize()}catch(e){console.error(e)}})});
  w.ro.observe(w.body);
 }
 el.classList.add('opening');
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('opening')));
 try{
  w.inst=A.create(w,args)||{};
 }catch(e){
  console.error(e);
  WM.list=WM.list.filter(x=>x!==w);WM.order=WM.order.filter(x=>x!==w);
  w.clean.splice(0).forEach(f=>{try{f()}catch(_){}});
  el.remove();OS.emit('wm');
  OS.alert('「'+A.name+'」無法啟動。',{title:'應用程式錯誤',kind:'err'});
  return null;
 }
 if(OS.compact()&&A.maxable!==false&&A.resizable!==false)WM.maximize(w,true);
 WM.focus(w);
 OS.emit('wm',{opened:w});
 return w;
};

WM.focus=(w,opt)=>{
 if(!w||w.closing||!WM.list.includes(w))return;
 if(w.desk!==WM.desk)WM.switchDesk(w.desk);
 if(w.state==='min')WM.restore(w,true);
 const i=WM.order.indexOf(w);if(i>=0)WM.order.splice(i,1);WM.order.push(w);
 WM.sdList=WM.sdBusy?WM.sdList:null;
 const was=WM.active;
 WM.active=w;
 WM.zs();WM.paint();
 if(!(opt&&opt.noFocus)&&!w.el.contains(document.activeElement)){
  const f=w.inst&&w.inst.focusEl?w.inst.focusEl():null;
  try{(f||w.el).focus({preventScroll:true})}catch(e){}
 }
 if(was!==w){try{w.inst&&w.inst.onFocus&&w.inst.onFocus()}catch(e){console.error(e)}}
 OS.emit('wm');
};
WM.zs=()=>{WM.order.forEach((w,i)=>{w.el.style.zIndex=WM.Z0+i})};
WM.paint=()=>{WM.list.forEach(w=>w.el.classList.toggle('active',w===WM.active))};
WM.topOf=desk=>{for(let i=WM.order.length-1;i>=0;i--){const w=WM.order[i];if(w.desk===desk&&w.state!=='min'&&!w.closing)return w}return null};
function activateNext(){
 const n=WM.topOf(WM.desk);
 WM.active=n||null;WM.paint();
 if(n){try{n.el.focus({preventScroll:true})}catch(e){}}
 else if(document.activeElement&&document.activeElement!==document.body)try{document.activeElement.blur()}catch(e){}
}
WM.minimize=w=>{
 if(!w||w.state==='min'||w.A.minimizable===false)return;
 w.prevState=w.state;w.state='min';
 w.el.classList.add('min');w.el.inert=true;
 if(WM.active===w)activateNext();
 OS.emit('wm');
};
WM.restore=(w,quiet)=>{
 if(!w)return;
 if(w.state==='min'){
  w.state=w.prevState||'normal';w.el.classList.remove('min');w.el.inert=false;
  if(w.state==='max')w.el.classList.add('max');
 }else if(w.state==='max'){WM.unmax(w)}
 if(!quiet)WM.focus(w);
};
WM.maximize=(w,quiet)=>{
 if(!w||w.A.maxable===false||w.A.resizable===false||w.state==='max')return;
 if(w.state==='min')return;
 if(!w.snap)w.restoreG=geom(w);
 w.state='max';w.snap=null;w.el.classList.add('max');ctlIcons(w);
 if(!quiet)WM.focus(w);
 OS.emit('wm');
};
WM.unmax=w=>{
 if(w.state!=='max')return;
 w.state='normal';w.el.classList.remove('max');
 const g=w.restoreG||{x:60,y:40,w:w.A.w||700,h:w.A.h||480};
 Object.assign(w,g);fitIn(w);applyGeom(w);ctlIcons(w);
 OS.emit('wm');
};
WM.toggleMax=w=>{
 if(w.A.maxable===false||w.A.resizable===false)return;
 if(w.state==='max')WM.unmax(w);
 else if(w.snap){WM.unsnap(w)}
 else WM.maximize(w);
 WM.focus(w);
};
WM.unsnap=w=>{
 if(!w.snap)return;
 w.snap=null;
 if(w.restoreG){Object.assign(w,w.restoreG);fitIn(w);applyGeom(w)}
};
WM.snapTo=(w,side)=>{
 if(!w||w.A.resizable===false||w.A.maxable===false||w.state==='min')return;
 const a=WM.area();
 if(side==='max'){WM.maximize(w);return}
 if(w.state==='max'){w.state='normal';w.el.classList.remove('max')}
 else if(!w.snap)w.restoreG=geom(w);
 const hw=Math.floor(a.w/2);
 w.snap=side;w.state='normal';
 w.w=Math.max(hw,Math.min(w.minW,a.w));w.h=a.h;w.y=0;
 w.x=side==='left'?0:a.w-w.w;
 applyGeom(w);ctlIcons(w);WM.focus(w);OS.emit('wm');
};
WM.close=async(w,force)=>{
 if(!w||w.closing||!WM.list.includes(w))return false;
 if(!force&&w.inst&&w.inst.canClose){
  if(w.closeAsk)return false;
  w.closeAsk=true;
  try{const ok=await w.inst.canClose();if(ok===false){w.closeAsk=false;return false}}
  catch(e){console.error(e)}
  w.closeAsk=false;
  if(!WM.list.includes(w)||w.closing)return false;
 }
 w.closing=true;
 document.getElementById('os').classList.remove('dragging');
 try{w.inst&&w.inst.destroy&&w.inst.destroy()}catch(e){console.error(e)}
 w.clean.splice(0).forEach(f=>{try{f()}catch(e){console.error(e)}});
 if(w.ro)w.ro.disconnect();
 WM.list=WM.list.filter(x=>x!==w);WM.order=WM.order.filter(x=>x!==w);
 $$('iframe',w.el).forEach(f=>{try{f.src='about:blank'}catch(e){}});
 w.el.classList.add('closing');w.el.inert=true;
 setTimeout(()=>w.el.remove(),170);
 if(WM.active===w)activateNext();
 OS.emit('wm',{closed:w});
 return true;
};
WM.closeAll=async()=>{
 for(const w of WM.list.slice())await WM.close(w,true);
};
WM.anyDirty=()=>WM.list.some(w=>w.inst&&w.inst.isDirty&&w.inst.isDirty());
WM.showDesktop=()=>{
 WM.sdBusy=true;
 try{
  if(WM.sdList&&WM.sdList.length){
   const l=WM.sdList;WM.sdList=null;
   l.filter(w=>WM.list.includes(w)&&w.state==='min').forEach(w=>WM.restore(w,true));
   const t=l.filter(w=>WM.list.includes(w)).pop();if(t)WM.focus(t);
  }else{
   const vis=WM.visibleList().filter(w=>w.state!=='min'&&w.A.minimizable!==false);
   if(!vis.length)return;
   vis.forEach(w=>WM.minimize(w));
   WM.sdList=vis;
  }
 }finally{WM.sdBusy=false}
 OS.emit('wm');
};
/* ---- 虛擬桌面 ---- */
WM.switchDesk=i=>{
 if(i<0||i>=WM.desks.length)return;
 WM.desk=i;
 WM.list.forEach(w=>w.el.classList.toggle('offdesk',w.desk!==i));
 WM.sdList=null;
 activateNext();
 OS.emit('wm');OS.emit('desk');
};
WM.addDesk=()=>{if(WM.desks.length>=6)return -1;WM.desks.push({});OS.emit('desk');return WM.desks.length-1};
WM.removeDesk=i=>{
 if(WM.desks.length<=1||i<0||i>=WM.desks.length)return;
 const to=i>0?i-1:0;
 WM.list.forEach(w=>{if(w.desk===i)w.desk=to;else if(w.desk>i)w.desk--});
 WM.desks.splice(i,1);
 WM.desk=WM.desk===i?to:(WM.desk>i?WM.desk-1:WM.desk);
 WM.list.forEach(w=>w.el.classList.toggle('offdesk',w.desk!==WM.desk));
 activateNext();OS.emit('wm');OS.emit('desk');
};
WM.moveToDesk=(w,i)=>{
 if(!w||i<0||i>=WM.desks.length)return;
 w.desk=i;w.el.classList.toggle('offdesk',w.desk!==WM.desk);
 if(WM.active===w&&w.desk!==WM.desk)activateNext();
 OS.emit('wm');
};
WM.resetDesks=()=>{WM.desks=[{}];WM.desk=0;WM.list.forEach(w=>{w.desk=0;w.el.classList.remove('offdesk')})};

/* ---- 系統選單（標題列右鍵） ---- */
function sysMenu(w,x,y){
 const max=w.state==='max',cm=w.A.maxable!==false&&w.A.resizable!==false;
 OS.menu([
  {label:'還原',ico:'restore',dis:!(max||w.snap),fn:()=>{if(max)WM.unmax(w);else WM.unsnap(w);WM.focus(w)}},
  {label:'最小化',ico:'min',dis:w.A.minimizable===false,fn:()=>WM.minimize(w)},
  {label:'最大化',ico:'max',dis:!cm||max,fn:()=>WM.maximize(w)},
  {sep:1},
  {label:'靠左貼齊',dis:!cm,fn:()=>WM.snapTo(w,'left')},
  {label:'靠右貼齊',dis:!cm,fn:()=>WM.snapTo(w,'right')},
  {sep:1},
  {label:'關閉',ico:'close',kbd:'Alt+F4',fn:()=>WM.close(w)}
 ],x,y);
}
WM.sysMenu=sysMenu;

/* ---- 拖曳與縮放 ---- */
function drag(el,e,onMove,onUp){
 const id=e.pointerId;let ended=false;
 try{el.setPointerCapture(id)}catch(_){}
 document.getElementById('os').classList.add('dragging');
 const mv=ev=>{if(ev.pointerId!==id||ended)return;onMove(ev)};
 const up=ev=>{
  if(ev.pointerId!==id||ended)return;ended=true;
  el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('lostpointercapture',lost);
  document.getElementById('os').classList.remove('dragging');
  try{el.releasePointerCapture(id)}catch(_){}
  onUp(ev);
 };
 const lost=ev=>{if(!ended)up(ev)};
 el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',lost);
}
function titleDown(w,e){
 if(e.button!==0||e.target.closest('.wctl,.wti,input,button,select'))return;
 if(OS.compact())return;
 const tb=e.currentTarget;
 const sx=e.clientX,sy=e.clientY;
 let moved=false,start=null,snapPrev=null;
 const area=()=>WM.area();
 const snapAt=ev=>{
  if(w.A.resizable===false||w.A.maxable===false)return null;
  if(ev.clientY<=6)return 'max';
  if(ev.clientX<=6)return 'left';
  if(ev.clientX>=innerWidth-7)return 'right';
  return null;
 };
 const showSnap=s=>{
  const el=$('#snap');if(!el)return;
  if(!s){el.classList.remove('show');return}
  const a=area();
  const r=s==='max'?{x:0,y:0,w:a.w,h:a.h}:s==='left'?{x:0,y:0,w:Math.floor(a.w/2),h:a.h}:{x:a.w-Math.floor(a.w/2),y:0,w:Math.floor(a.w/2),h:a.h};
  el.style.left=r.x+'px';el.style.top=r.y+'px';el.style.width=r.w+'px';el.style.height=r.h+'px';el.classList.add('show');
 };
 WM.focus(w,{noFocus:true});
 if(OS.mouse)OS.mouse.shakeStart();
 drag(tb,e,ev=>{
  const dx=ev.clientX-sx,dy=ev.clientY-sy;
  if(!moved){
   if(Math.hypot(dx,dy)<4)return;
   moved=true;
   if(w.state==='max'||w.snap){
    const ratio=clamp((sx-w.el.getBoundingClientRect().left)/Math.max(1,w.el.offsetWidth),0.1,0.9);
    const rg=w.restoreG||{w:w.A.w||700,h:w.A.h||480};
    if(w.state==='max'){w.state='normal';w.el.classList.remove('max')}
    w.snap=null;
    w.w=rg.w;w.h=rg.h;
    w.x=Math.round(sx-w.w*ratio);w.y=Math.max(0,sy-16);
    fitIn(w);applyGeom(w);ctlIcons(w);
   }
   start={x:w.x,y:w.y};
   w._dsx=sx;w._dsy=sy;
  }
  const a=area();
  w.x=clamp(start.x+(ev.clientX-w._dsx),-(w.w-110),a.w-110);
  w.y=clamp(start.y+(ev.clientY-w._dsy),0,Math.max(0,a.h-TBH));
  applyGeom(w);
  if(OS.mouse)OS.mouse.shakeFeed(w,ev.clientX);
  const s=snapAt(ev);if(s!==snapPrev){snapPrev=s;showSnap(s)}
 },ev=>{
  showSnap(null);
  if(!moved)return;
  const s=snapAt(ev);
  if(s){
   w.x=start.x;w.y=start.y;w.snap=null;applyGeom(w);
   if(s==='max')WM.maximize(w);else WM.snapTo(w,s);
  }
  WM.focus(w);
 });
}
function resizeDown(w,d,e){
 if(e.button!==0||w.state==='max'||OS.compact())return;
 e.preventDefault();e.stopPropagation();
 const h=e.currentTarget,sx=e.clientX,sy=e.clientY,st=geom(w);
 WM.focus(w,{noFocus:true});
 drag(h,e,ev=>{
  const a=WM.area(),dx=ev.clientX-sx,dy=ev.clientY-sy;
  let {x,y,w:ww,h:hh}=st;
  if(d.includes('e'))ww=clamp(st.w+dx,w.minW,a.w-st.x);
  if(d.includes('s'))hh=clamp(st.h+dy,w.minH,a.h-st.y);
  if(d.includes('w')){const nw=clamp(st.w-dx,w.minW,st.x+st.w);x=st.x+st.w-nw;ww=nw}
  if(d.includes('n')){const nh=clamp(st.h-dy,w.minH,st.y+st.h);y=st.y+st.h-nh;hh=nh}
  w.x=x;w.y=y;w.w=ww;w.h=hh;w.snap=null;applyGeom(w);
 },()=>{w.restoreG=null;OS.emit('wm')});
}
/* 視窗大小改變時，確保不會跑出畫面 */
addEventListener('resize',()=>{
 WM.list.forEach(w=>{
  if(w.state==='max')return;
  if(OS.compact()&&w.A.maxable!==false&&w.A.resizable!==false){if(w.state==='normal')WM.maximize(w,true);return}
  if(w.snap){const a=WM.area();const hw=Math.floor(a.w/2);w.w=hw;w.h=a.h;w.x=w.snap==='left'?0:a.w-hw;w.y=0;applyGeom(w);return}
  fitIn(w);applyGeom(w);
 });
});
/* 點進 iframe 時，iframe 會搶走焦點，用 blur 事件幫它啟用所屬視窗 */
addEventListener('blur',()=>{
 setTimeout(()=>{
  const a=document.activeElement;
  if(a&&a.tagName==='IFRAME'){
   const el=a.closest('.win');
   if(el){const w=WM.list.find(x=>x.el===el);if(w&&WM.active!==w)WM.focus(w,{noFocus:true})}
  }
 },0);
});
OS.open=(id,args)=>WM.open(id,args);
})();
