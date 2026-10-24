/* 青魚電腦 — 相片 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>';
function images(dir){
 const o=[];
 const walk=id=>FS.kids(id).forEach(n=>{if(n.type==='dir'){if(n.id!=='bin')walk(n.id)}else if(n.kind==='image')o.push(n)});
 if(dir==='pictures')walk('pictures');else FS.kids(dir).forEach(n=>{if(n.type==='file'&&n.kind==='image')o.push(n)});
 return o.sort((a,b)=>b.m-a.m||OS.U.cmp(a.name,b.name));
}
OS.register({id:'photos',name:'相片',kw:'photos pictures gallery image viewer 相片 圖片 照片 影像 檢視',
 g:'linear-gradient(145deg,#ffb86b,#e0568a)',s:ICON,w:880,h:600,minW:420,minH:340,
 key:a=>a&&a.id?'v:'+a.id:'gallery',
 create(win,args){
  const root=document.createElement('div');root.className='ph';win.body.appendChild(root);
  let mode='gallery',cur=null,list=[],rot=0,flipH=false,zoom=1,fit=true,px=0,py=0,slide=null,galDir='pictures';
  root.innerHTML=`<div class="phbar"></div><div class="phmain"></div>`;
  const bar=$('.phbar',root),main=$('.phmain',root);
  const B=(a,ic,t,dis)=>`<button type="button" class="ab" data-a="${a}" title="${t}" aria-label="${t}"${dis?' disabled':''}>${OS.ico(ic,16)}</button>`;
  function gallery(){
   mode='gallery';stopSlide();
   list=images(galDir);
   win.setTitle('相片');
   bar.innerHTML=`<b class="pht">相片　<small>${list.length} 張</small></b><span class="grow"></span><button type="button" class="ab" data-a="imp">${OS.ico('upload',16)}<span>匯入</span></button><button type="button" class="ab" data-a="exp">${OS.ico('folderplus',16)}<span>開啟資料夾</span></button>`;
   main.innerHTML=list.length?`<div class="phg">${list.map(n=>`<button type="button" class="pht2" data-id="${n.id}" title="${esc(n.name)}"><img data-th="${n.id}" alt="${esc(n.name)}"><span>${esc(n.name)}</span></button>`).join('')}</div>`:'<div class="empty-s">圖片資料夾裡還沒有相片。<br>用「匯入」從你的電腦加入，或用相機、小畫家建立。</div>';
   $$('[data-th]',main).forEach(img=>FS.url(img.dataset.th).then(u=>{if(img.isConnected&&u)img.src=u}));
  }
  async function view(id,keep){
   const n=FS.get(id);if(!n||n.type!=='file'||n.kind!=='image'){gallery();return}
   mode='view';cur=id;if(!keep){rot=0;flipH=false;zoom=1;fit=true;px=py=0}
   list=images(FS.inBin(n)?'bin':n.p);if(!list.some(x=>x.id===id))list=[n];
   win.setTitle(n.name+' - 相片');win.dk='v:'+id;
   const i=list.findIndex(x=>x.id===id);
   bar.innerHTML=B('back','chevL','返回相簿')+B('prev','prev','上一張',list.length<2)+B('next','next','下一張',list.length<2)+`<span class="phn">${esc(n.name)} <small>${i+1}/${list.length}</small></span><span class="grow"></span>`+B('zin','zin','放大')+B('zout','zout','縮小')+B('fit','full','符合視窗')+B('rotl','rotate','向左旋轉')+B('rotr','rotater','向右旋轉')+B('flip','flip','水平翻轉')+B('slide','play','幻燈片放映')+B('wall','image','設為桌面背景')+B('paint','brush','用小畫家編輯')+B('del','trash','刪除')+B('info','info','詳細資料');
   main.innerHTML=`<div class="phv" tabindex="0"><img class="phi" alt="${esc(n.name)}" draggable="false"><div class="phe" hidden></div></div><div class="phfs"></div>`;
   const img=$('.phi',main),u=await FS.url(id);
   if(win.closing||cur!==id)return;
   img.onload=()=>{apply()};
   img.onerror=()=>{$('.phe',main).hidden=false;$('.phe',main).textContent='無法顯示這個影像。';img.style.display='none'};
   img.src=u;
   $('.phv',main).focus({preventScroll:true});
   // 預先載入前後張
   [list[(i+1)%list.length],list[(i-1+list.length)%list.length]].forEach(x=>{if(x&&x.id!==id)FS.url(x.id)});
  }
  function apply(){
   const img=$('.phi',main),v=$('.phv',main);if(!img||!v)return;
   const sw=rot%180!==0,iw=img.naturalWidth||1,ih=img.naturalHeight||1,vw=v.clientWidth,vh=v.clientHeight;
   const w=sw?ih:iw,h=sw?iw:ih;
   const base=fit?Math.min(1,vw/w,vh/h):1;
   const sc=base*zoom;
   img.style.transform=`translate(${px}px,${py}px) rotate(${rot}deg) scale(${flipH?-sc:sc},${sc})`;
   v.style.cursor=zoom>1||!fit?'grab':'default';
  }
  function go(d){const i=list.findIndex(x=>x.id===cur);if(i<0||list.length<2)return;view(list[(i+d+list.length)%list.length].id)}
  function stopSlide(){if(slide){clearInterval(slide);slide=null}}
  function toggleSlide(){
   if(slide){stopSlide();OS.toast('已停止幻燈片放映');return}
   if(list.length<2){OS.toast('至少需要兩張相片');return}
   OS.toast('幻燈片放映開始，按空白鍵停止');
   slide=setInterval(()=>go(1),OS.R.fast?200:3000);
  }
  async function del(){
   const n=FS.get(cur);if(!n)return;
   const i=list.findIndex(x=>x.id===cur);
   if(!await OS.trashIds([cur],{parent:win}))return;
   list=list.filter(x=>x.id!==cur);
   if(list.length)view(list[Math.min(i,list.length-1)].id);else gallery();
  }
  root.addEventListener('click',async e=>{
   const t=e.target.closest('.pht2');if(t){view(t.dataset.id);return}
   const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
   const a=b.dataset.a;
   if(a==='back'){stopSlide();gallery()}
   else if(a==='prev')go(-1);else if(a==='next')go(1);
   else if(a==='zin'){zoom=clamp(zoom*1.25,.1,16);apply()}else if(a==='zout'){zoom=clamp(zoom/1.25,.1,16);apply()}
   else if(a==='fit'){zoom=1;fit=true;px=py=0;apply()}
   else if(a==='rotl'){rot=(rot+270)%360;apply()}else if(a==='rotr'){rot=(rot+90)%360;apply()}
   else if(a==='flip'){flipH=!flipH;apply()}
   else if(a==='slide')toggleSlide();
   else if(a==='wall')OS.setWallFromNode(cur);
   else if(a==='paint')OS.open('paint',{id:cur});
   else if(a==='del')del();
   else if(a==='info')OS.props(cur);
   else if(a==='imp'){const i=document.createElement('input');i.type='file';i.accept='image/*';i.multiple=true;i.onchange=async()=>{const r=await FS.importFiles([...i.files].filter(f=>f.type.startsWith('image/')),'pictures');OS.toast('已匯入 '+r.ok+' 張相片');gallery()};i.click()}
   else if(a==='exp')OS.open('explorer',{path:'pictures'});
  });
  main.addEventListener('dblclick',e=>{if(mode==='view'&&e.target.closest('.phv')){if(fit&&zoom===1){fit=false;zoom=1;apply()}else{fit=true;zoom=1;px=py=0;apply()}}});
  main.addEventListener('wheel',e=>{
   if(mode!=='view')return;e.preventDefault();
   if(e.ctrlKey||true){zoom=clamp(zoom*(e.deltaY<0?1.12:1/1.12),.1,16);apply()}
  },{passive:false});
  main.addEventListener('pointerdown',e=>{
   if(mode!=='view'||e.button!==0||!e.target.closest('.phv'))return;
   const sx=e.clientX,sy=e.clientY,ox=px,oy=py,v=e.target.closest('.phv');
   try{v.setPointerCapture(e.pointerId)}catch(_){}
   v.style.cursor='grabbing';
   const mv=ev=>{px=ox+ev.clientX-sx;py=oy+ev.clientY-sy;apply()};
   const up=()=>{v.removeEventListener('pointermove',mv);v.removeEventListener('pointerup',up);v.removeEventListener('pointercancel',up);apply()};
   v.addEventListener('pointermove',mv);v.addEventListener('pointerup',up);v.addEventListener('pointercancel',up);
  });
  win.key(e=>{
   if(mode==='view'){
    if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}else if(e.key==='ArrowRight'){e.preventDefault();go(1)}
    else if(e.key==='Escape'){e.preventDefault();stopSlide();gallery()}
    else if(e.key==='Delete'){e.preventDefault();del()}
    else if(e.key==='+'||e.key==='='){zoom=clamp(zoom*1.25,.1,16);apply()}else if(e.key==='-'){zoom=clamp(zoom/1.25,.1,16);apply()}
    else if(e.key==='0'){zoom=1;fit=true;px=py=0;apply()}
    else if(e.key===' '){e.preventDefault();toggleSlide()}
    else if(e.key.toLowerCase()==='r'){rot=(rot+90)%360;apply()}
   }
  });
  win.on('fs',()=>{
   if(mode==='gallery')gallery();
   else if(!FS.get(cur)){list=list.filter(x=>FS.get(x.id));if(list.length)view(list[0].id);else gallery()}
  });
  if(args&&args.id&&FS.get(args.id))view(args.id);else gallery();
  return {
   focusEl:()=>$('.phv',main)||$('.phg',main)||root,
   onResize(){if(mode==='view')apply()},
   onArgs(a){if(a&&a.id)view(a.id)}
  };
 }
});
})();
