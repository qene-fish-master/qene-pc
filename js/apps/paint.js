/* 青魚電腦 — 小畫家 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<path d="M9 14a3 3 0 0 0-3 3c0 1.5-1 2.5-2 3 3 .5 7 .5 8-2a3 3 0 0 0-3-4zM11 13l8-8 1.5 1.5-8 8"/>';
const PAL=['#000000','#7f7f7f','#880015','#ed1c24','#ff7f27','#fff200','#22b14c','#00a2e8','#3f48cc','#a349a4','#ffffff','#c3c3c3','#b97a57','#ffaec9','#ffc90e','#efe4b0','#b5e61d','#99d9ea','#7092be','#c8bfe7'];
const TOOLS=[['pencil','pencil','鉛筆'],['brush','brush','筆刷'],['eraser','eraser','橡皮擦'],['line','line','直線'],['rect','rect','矩形'],['ellipse','ellipse','橢圓'],['fill','bucket','填色'],['pick','pipette','檢色器'],['text','text','文字']];
OS.register({id:'paint',name:'小畫家',kw:'paint draw 小畫家 繪圖 畫圖 畫',
 g:'linear-gradient(145deg,#ff8ab3,#8a5cff)',s:ICON,w:900,h:640,minW:480,minH:360,
 key:a=>a&&a.id?a.id:null,
 create(win,args){
  const root=document.createElement('div');root.className='pt';win.body.appendChild(root);
  let tool='pencil',fg='#000000',bg='#ffffff',size=4,fillShape=false,zoom=1,doc={id:null,name:'未命名.png',dirty:false};
  let hist=[],hi=-1,drawing=null;
  const mb=OS.menubar(root,[
   {label:'檔案',items:()=>[{label:'新增…',kbd:'Ctrl+N',fn:newDlg},{label:'開啟…',kbd:'Ctrl+O',fn:openDlg},{sep:1},{label:'儲存',kbd:'Ctrl+S',fn:()=>save(false)},{label:'另存新檔…',kbd:'Ctrl+Shift+S',fn:()=>save(true)},{sep:1},{label:'設為桌面背景',ico:'image',fn:setWall},{sep:1},{label:'結束',fn:()=>win.close()}]},
   {label:'編輯',items:()=>[{label:'復原',ico:'undo',kbd:'Ctrl+Z',dis:hi<=0,fn:undo},{label:'取消復原',ico:'redo',kbd:'Ctrl+Y',dis:hi>=hist.length-1,fn:redo},{sep:1},{label:'全部清除',fn:clearAll},{label:'調整畫布大小…',fn:resizeDlg},{sep:1},{label:'水平翻轉',fn:()=>flip(true)},{label:'垂直翻轉',fn:()=>flip(false)},{label:'順時針旋轉 90°',fn:rotate}]},
   {label:'檢視',items:()=>[{label:'放大',kbd:'Ctrl++',fn:()=>setZoom(zoom*1.25)},{label:'縮小',kbd:'Ctrl+-',fn:()=>setZoom(zoom/1.25)},{label:'實際大小 (100%)',kbd:'Ctrl+0',fn:()=>setZoom(1)}]}
  ]);
  root.insertAdjacentHTML('beforeend',`<div class="ptbar"><div class="ptt">${TOOLS.map(([id,ic,t])=>`<button type="button" class="ptb${id===tool?' on':''}" data-t="${id}" title="${t}" aria-label="${t}">${OS.ico(ic,18)}</button>`).join('')}</div><span class="avs"></span><label class="ptl">粗細<input type="range" class="ptsz" min="1" max="60" value="${size}" aria-label="粗細"><em class="ptsv">${size}</em></label><span class="avs"></span><label class="ptl"><input type="checkbox" class="ptfill"> 填滿圖形</label><span class="avs"></span><div class="ptcol"><button type="button" class="ptc2" aria-label="背景色"></button><button type="button" class="ptc1" aria-label="前景色"></button></div><div class="ptpal">${PAL.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="ptcc" title="自訂色彩"><input type="color" value="#000000" aria-label="自訂色彩"></label></div></div><div class="ptarea" tabindex="0"><div class="ptwrap"><canvas class="ptcv" width="800" height="500"></canvas></div></div><div class="ptst"><span class="ptp"></span><span class="ptd">800 × 500 像素</span><span class="grow"></span><span class="ptz">100%</span></div>`);
  const cv=$('.ptcv',root),ctx=cv.getContext('2d',{willReadFrequently:true}),area=$('.ptarea',root);
  const c1=$('.ptc1',root),c2=$('.ptc2',root);
  function title(){win.setTitle((doc.dirty?'*':'')+doc.name+' - 小畫家');win.setDirty(doc.dirty)}
  function colors(){c1.style.background=fg;c2.style.background=bg}
  function setZoom(z){zoom=clamp(z,.1,8);cv.style.width=Math.round(cv.width*zoom)+'px';cv.style.height=Math.round(cv.height*zoom)+'px';$('.ptz',root).textContent=Math.round(zoom*100)+'%'}
  function snap(){
   hist=hist.slice(0,hi+1);
   hist.push(ctx.getImageData(0,0,cv.width,cv.height));
   const max=Math.max(5,Math.min(30,Math.floor(180e6/(cv.width*cv.height*4))));
   while(hist.length>max)hist.shift();
   hi=hist.length-1;
  }
  function restore(){const im=hist[hi];if(im){if(cv.width!==im.width||cv.height!==im.height){cv.width=im.width;cv.height=im.height;setZoom(zoom)}ctx.putImageData(im,0,0);$('.ptd',root).textContent=cv.width+' × '+cv.height+' 像素'}}
  function undo(){if(hi>0){hi--;restore();dirty()}}
  function redo(){if(hi<hist.length-1){hi++;restore();dirty()}}
  function dirty(){if(!doc.dirty){doc.dirty=true;title()}}
  function blank(w,h){cv.width=w;cv.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);hist=[];hi=-1;snap();setZoom(zoom);$('.ptd',root).textContent=w+' × '+h+' 像素'}
  function clearAll(){ctx.fillStyle=bg;ctx.fillRect(0,0,cv.width,cv.height);snap();dirty()}
  function flip(h){
   const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;t.getContext('2d').drawImage(cv,0,0);
   ctx.save();ctx.clearRect(0,0,cv.width,cv.height);ctx.translate(h?cv.width:0,h?0:cv.height);ctx.scale(h?-1:1,h?1:-1);ctx.drawImage(t,0,0);ctx.restore();snap();dirty();
  }
  function rotate(){
   const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;t.getContext('2d').drawImage(cv,0,0);
   const w=cv.width,h=cv.height;cv.width=h;cv.height=w;ctx.save();ctx.translate(h,0);ctx.rotate(Math.PI/2);ctx.drawImage(t,0,0);ctx.restore();snap();setZoom(zoom);dirty();$('.ptd',root).textContent=cv.width+' × '+cv.height+' 像素';
  }
  async function newDlg(){
   if(!await askSave())return;
   const r=await sizeDlg('新增影像',cv.width,cv.height);if(!r)return;
   blank(r.w,r.h);doc={id:null,name:'未命名.png',dirty:false};win.dk=null;title();
  }
  function sizeDlg(t,w0,h0){
   return new Promise(res=>{
    let out=null;
    win.dialog({title:t,w:340,body:`<label class="ol2">寬度（像素）</label><input class="inp dinp sw" type="number" min="1" max="4000" value="${w0}"><label class="ol2">高度（像素）</label><input class="inp dinp sh" type="number" min="1" max="4000" value="${h0}"><div class="derr"></div>`,buttons:[{id:'ok',label:'確定',primary:true},{id:'cancel',label:'取消'}],
     beforeClose:(id,w)=>{if(id!=='ok')return true;const a=+$('.sw',w).value,b=+$('.sh',w).value;if(!(a>=1&&a<=4000&&b>=1&&b<=4000&&Number.isInteger(a)&&Number.isInteger(b))){$('.derr',w).textContent='請輸入 1 到 4000 之間的整數。';return false}out={w:a,h:b};return true}}).then(()=>res(out));
   });
  }
  async function resizeDlg(){
   const r=await sizeDlg('調整畫布大小',cv.width,cv.height);if(!r)return;
   const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;t.getContext('2d').drawImage(cv,0,0);
   cv.width=r.w;cv.height=r.h;ctx.fillStyle='#fff';ctx.fillRect(0,0,r.w,r.h);ctx.drawImage(t,0,0);snap();setZoom(zoom);dirty();$('.ptd',root).textContent=r.w+' × '+r.h+' 像素';
  }
  async function loadNode(id){
   const n=FS.get(id);if(!n)return false;
   const u=await FS.url(id);if(!u||win.closing)return false;
   return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
     const w=Math.min(4000,im.naturalWidth||im.width||800),h=Math.min(4000,im.naturalHeight||im.height||500);
     cv.width=w;cv.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(im,0,0,w,h);hist=[];hi=-1;snap();setZoom(Math.min(1,Math.max(.1,(area.clientWidth-30)/w)));
     doc={id,name:n.name,dirty:false};win.dk=id;title();$('.ptd',root).textContent=w+' × '+h+' 像素';res(true);
    };
    im.onerror=()=>{win.alert('無法開啟這個影像。',{kind:'err'});res(false)};
    im.src=u;
   });
  }
  async function openDlg(){
   if(!await askSave())return;
   const r=await OS.fileDialog({parent:win,mode:'open',kinds:['image'],start:'pictures'});
   if(r&&r.id){const ex=OS.WM.list.find(w=>w.app==='paint'&&w.dk===r.id&&!w.closing);if(ex&&ex!==win){OS.WM.focus(ex);return}await loadNode(r.id)}
  }
  function toBlob(name){
   const jpg=/\.jpe?g$/i.test(name);
   return new Promise(res=>cv.toBlob(b=>res(b),jpg?'image/jpeg':'image/png',.92));
  }
  async function save(as){
   let n=doc.id?FS.get(doc.id):null;if(n&&FS.inBin(n))n=null;
   if(!as&&n&&/\.(png|jpe?g)$/i.test(n.name)){
    const b=await toBlob(n.name);if(!b){win.alert('無法儲存影像。',{kind:'err'});return false}
    FS.setBlob(n.id,b);doc.name=n.name;doc.dirty=false;title();return true;
   }
   const r=await OS.fileDialog({parent:win,mode:'save',kinds:['image'],defExt:'png',name:n?n.name:doc.name,start:n?n.p:'pictures'});
   if(!r)return false;
   if(!/\.(png|jpe?g)$/i.test(r.name)){await win.alert('小畫家只能儲存為 .png 或 .jpg 檔案。',{kind:'err'});return false}
   try{
    const b=await toBlob(r.name);
    let id=r.id;if(id)FS.setBlob(id,b);else id=FS.create({parent:r.dir,name:r.name,blob:b,kind:'image',mime:b.type}).id;
    doc={id,name:FS.get(id).name,dirty:false};win.dk=id;title();OS.toast('已儲存「'+doc.name+'」');return true;
   }catch(e){await win.alert(e.message||'無法儲存。',{kind:'err'});return false}
  }
  async function setWall(){
   const b=await toBlob('a.png');if(!b)return;
   const u=URL.createObjectURL(b),im=new Image();
   im.onload=()=>{try{const k=Math.min(1,1920/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);S.custom=c.toDataURL('image/jpeg',.85);S.useCustom=true;OS.saveNow();OS.applyAll();OS.toast('已設為桌面背景')}catch(e){}URL.revokeObjectURL(u)};
   im.src=u;
  }
  async function askSave(){
   if(!doc.dirty)return true;
   const r=await win.dialog({title:'小畫家',body:`<p class="dmsg">要儲存對「${esc(doc.name)}」所做的變更嗎？</p>`,buttons:[{id:'save',label:'儲存',primary:true},{id:'no',label:'不儲存'},{id:'cancel',label:'取消'}]});
   if(r==='save')return await save(false);return r==='no';
  }
  /* ---------- 繪圖 ---------- */
  const pos=e=>{const r=cv.getBoundingClientRect();return {x:Math.floor((e.clientX-r.left)*cv.width/r.width),y:Math.floor((e.clientY-r.top)*cv.height/r.height)}};
  function hex2rgb(h){const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
  function floodFill(x,y,col){
   if(x<0||y<0||x>=cv.width||y>=cv.height)return;
   const im=ctx.getImageData(0,0,cv.width,cv.height),d=new Uint32Array(im.data.buffer),w=cv.width,h=cv.height;
   const [r,g,b]=hex2rgb(col),target=((255<<24)|(b<<16)|(g<<8)|r)>>>0,from=d[y*w+x];
   if(from===target)return;
   const st=[x,y];
   while(st.length){
    let py=st.pop(),px=st.pop();
    let i=py*w+px;
    while(px>=0&&d[i]===from){px--;i--}
    px++;i++;
    let up=false,dn=false;
    while(px<w&&d[i]===from){
     d[i]=target;
     if(py>0){const u=d[i-w]===from;if(u&&!up){st.push(px,py-1);up=true}else if(!u)up=false}
     if(py<h-1){const v=d[i+w]===from;if(v&&!dn){st.push(px,py+1);dn=true}else if(!v)dn=false}
     px++;i++;
    }
   }
   ctx.putImageData(im,0,0);
  }
  function stroke(a,b,col,sz,round){
   ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=sz;ctx.lineCap=round?'round':'butt';ctx.lineJoin='round';
   ctx.beginPath();ctx.moveTo(a.x+.5,a.y+.5);ctx.lineTo(b.x+.5,b.y+.5);ctx.stroke();
   if(sz>=2&&round){ctx.beginPath();ctx.arc(b.x+.5,b.y+.5,sz/2,0,7);ctx.fill()}
  }
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{
   if(e.button!==0&&e.button!==2)return;
   e.preventDefault();
   const p=pos(e),col=e.button===2?bg:fg,col2=e.button===2?fg:bg;
   area.focus({preventScroll:true});
   if(tool==='fill'){floodFill(p.x,p.y,col);snap();dirty();return}
   if(tool==='pick'){
    const d=ctx.getImageData(clamp(p.x,0,cv.width-1),clamp(p.y,0,cv.height-1),1,1).data;
    const h='#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(e.button===2)bg=h;else fg=h;colors();return;
   }
   if(tool==='text'){textAt(p,col);return}
   try{cv.setPointerCapture(e.pointerId)}catch(_){}
   drawing={id:e.pointerId,start:p,last:p,col,col2,base:null};
   if(['line','rect','ellipse'].includes(tool))drawing.base=ctx.getImageData(0,0,cv.width,cv.height);
   else{
    const s=tool==='pencil'?1:size;
    if(tool==='eraser'){ctx.fillStyle=bg;ctx.fillRect(p.x-Math.floor(size/2),p.y-Math.floor(size/2),size,size)}
    else stroke(p,p,col,s,tool!=='pencil');
   }
  });
  cv.addEventListener('pointermove',e=>{
   const p=pos(e);$('.ptp',root).textContent=p.x>=0&&p.y>=0&&p.x<cv.width&&p.y<cv.height?p.x+', '+p.y+' 像素':'';
   if(!drawing||e.pointerId!==drawing.id)return;
   if(drawing.base){
    ctx.putImageData(drawing.base,0,0);
    const a=drawing.start,sz=size;
    ctx.lineWidth=sz;ctx.strokeStyle=drawing.col;ctx.fillStyle=drawing.col2;ctx.lineJoin='round';ctx.lineCap='round';
    if(tool==='line'){
     let q=p;if(e.shiftKey){const dx=p.x-a.x,dy=p.y-a.y,ang=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4),len=Math.hypot(dx,dy);q={x:Math.round(a.x+Math.cos(ang)*len),y:Math.round(a.y+Math.sin(ang)*len)}}
     ctx.beginPath();ctx.moveTo(a.x+.5,a.y+.5);ctx.lineTo(q.x+.5,q.y+.5);ctx.stroke();
    }else{
     let x=Math.min(a.x,p.x),y=Math.min(a.y,p.y),w=Math.abs(p.x-a.x),h=Math.abs(p.y-a.y);
     if(e.shiftKey){const m=Math.max(w,h);w=h=m;if(p.x<a.x)x=a.x-m;if(p.y<a.y)y=a.y-m}
     ctx.beginPath();
     if(tool==='rect')ctx.rect(x+.5,y+.5,w,h);else ctx.ellipse(x+w/2+.5,y+h/2+.5,Math.max(.5,w/2),Math.max(.5,h/2),0,0,Math.PI*2);
     if(fillShape){ctx.fillStyle=drawing.col2;ctx.fill()}
     ctx.stroke();
    }
   }else{
    if(tool==='eraser'){
     const a=drawing.last,n=Math.max(1,Math.ceil(Math.hypot(p.x-a.x,p.y-a.y)));
     ctx.fillStyle=bg;for(let i=1;i<=n;i++){const x=Math.round(a.x+(p.x-a.x)*i/n),y=Math.round(a.y+(p.y-a.y)*i/n);ctx.fillRect(x-Math.floor(size/2),y-Math.floor(size/2),size,size)}
    }else stroke(drawing.last,p,drawing.col,tool==='pencil'?1:size,tool!=='pencil');
   }
   drawing.last=p;
  });
  const endDraw=e=>{
   if(!drawing||(e&&e.pointerId!==drawing.id))return;
   drawing=null;snap();dirty();
  };
  cv.addEventListener('pointerup',endDraw);cv.addEventListener('pointercancel',endDraw);
  cv.addEventListener('lostpointercapture',endDraw);
  async function textAt(p,col){
   const t=await win.prompt({title:'文字',msg:'輸入要放到畫布上的文字：',max:200});
   if(!t)return;
   const fs=Math.max(12,size*4);
   ctx.fillStyle=col;ctx.font=`${fs}px system-ui,"Microsoft JhengHei","Noto Sans TC",sans-serif`;ctx.textBaseline='top';
   t.split('\n').forEach((l,i)=>ctx.fillText(l,p.x,p.y+i*fs*1.25));
   snap();dirty();
  }
  area.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.1:1/1.1))}},{passive:false});
  /* 工具列 */
  root.addEventListener('click',e=>{
   const t=e.target.closest('[data-t]');if(t){tool=t.dataset.t;$$('.ptb',root).forEach(b=>b.classList.toggle('on',b===t));return}
   const c=e.target.closest('[data-c]');if(c){fg=c.dataset.c;colors();return}
   if(e.target.closest('.ptc1')||e.target.closest('.ptc2')){const tmp=fg;fg=bg;bg=tmp;colors()}
  });
  root.addEventListener('contextmenu',e=>{const c=e.target.closest('[data-c]');if(c){e.preventDefault();bg=c.dataset.c;colors()}});
  $('.ptsz',root).addEventListener('input',e=>{size=+e.target.value;$('.ptsv',root).textContent=size});
  $('.ptfill',root).addEventListener('change',e=>{fillShape=e.target.checked});
  $('.ptcc input',root).addEventListener('input',e=>{fg=e.target.value;colors()});
  win.key(e=>{
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(e.target.closest('input,textarea,select'))return;
   if(ctrl&&k==='z'){e.preventDefault();e.shiftKey?redo():undo()}
   else if(ctrl&&k==='y'){e.preventDefault();redo()}
   else if(ctrl&&k==='s'){e.preventDefault();save(e.shiftKey)}
   else if(ctrl&&k==='o'){e.preventDefault();openDlg()}
   else if(ctrl&&k==='n'){e.preventDefault();newDlg()}
   else if(ctrl&&(k==='='||k==='+')){e.preventDefault();setZoom(zoom*1.25)}
   else if(ctrl&&k==='-'){e.preventDefault();setZoom(zoom/1.25)}
   else if(ctrl&&k==='0'){e.preventDefault();setZoom(1)}
   else if(k==='['){size=Math.max(1,size-1);$('.ptsz',root).value=size;$('.ptsv',root).textContent=size}
   else if(k===']'){size=Math.min(60,size+1);$('.ptsz',root).value=size;$('.ptsv',root).textContent=size}
  });
  blank(800,500);colors();title();
  if(args&&args.id&&FS.get(args.id))loadNode(args.id);
  return {focusEl:()=>area,isDirty:()=>doc.dirty,canClose:async()=>{mb.close();return await askSave()}};
 }
});
})();
