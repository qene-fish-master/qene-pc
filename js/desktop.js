/* 青魚電腦 — 外觀套用、桌面圖示、拖放、剪貼簿 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;

/* ---------- 外觀 ---------- */
OS.applyAll=()=>{
 const os=$('#os');if(!os)return;
 os.classList.toggle('dark',!!S.dark);document.documentElement.classList.toggle('dark',!!S.dark);
 os.classList.toggle('acon',!!S.acon);os.classList.toggle('abold',!!S.abold);
 os.classList.toggle('anomo',!!(S.anomo||S.saver));
 os.classList.toggle('tbleft',S.tbAlign==='left');os.classList.toggle('notbsearch',!S.tbSearch);os.classList.toggle('notbtv',!S.tbTaskView);
 os.classList.toggle('wlight',OS.wallLight());
 os.classList.toggle('nodesk',!S.showDeskIcons);
 os.style.setProperty('--ac',S.accent);os.style.setProperty('--fs',S.fs+'px');
 const w=$('#wall');w.style.background=OS.wallCss();w.classList.toggle('noscale',!S.scales);
 $('#dim').style.opacity=String((1-S.bright)*.8);
 $('#night').style.background=S.nightOn?`rgba(255,140,40,${(S.night*.32).toFixed(3)})`:'transparent';
 const m=$('meta[name=theme-color]');if(m)m.content=S.dark?'#0b1d22':'#e8f1f1';
 OS.emit('look');
};

/* ---------- 剪貼簿（檔案） ---------- */
OS.clip=null;
OS.clipSet=(op,ids)=>{OS.clip={op,ids:ids.slice()};OS.emit('clip')};
OS.canPaste=()=>!!(OS.clip&&OS.clip.ids.some(id=>FS.get(id)));
OS.paste=dest=>{
 const c=OS.clip;if(!c)return [];
 const ids=c.ids.filter(id=>FS.get(id));
 let out;
 if(c.op==='cut'){out=FS.move(ids,dest);OS.clip=null}else out=FS.copy(ids,dest);
 OS.emit('clip');return out;
};
OS.newItem=(dest,kind)=>{
 try{
  if(kind==='folder')return FS.mkdir(dest,'新增資料夾',true);
  if(kind==='doc')return FS.create({parent:dest,name:'新增青魚文件.qdoc',text:'',unique:true,kind:'doc'});
  return FS.create({parent:dest,name:'新增文字文件.txt',text:'',unique:true,kind:'text'});
 }catch(e){OS.alert(e.message,{title:'無法建立',kind:'err'});return null}
};
OS.trashIds=async(ids,opt)=>{
 ids=ids.filter(id=>{const n=FS.get(id);return n&&!FS.locked(n)});
 if(!ids.length)return 0;
 if(opt&&opt.perm){
  const ok=await OS.confirm(ids.length===1?`要永久刪除「${FS.get(ids[0]).name}」嗎？`:`要永久刪除這 ${ids.length} 個項目嗎？`,{title:'刪除項目',ok:'永久刪除',danger:true,parent:opt.parent});
  if(!ok)return 0;FS.purge(ids);OS.sfx('trash');return ids.length;
 }
 const inBin=ids.every(id=>FS.inBin(FS.get(id)));
 if(inBin){
  const ok=await OS.confirm(ids.length===1?`要永久刪除「${FS.get(ids[0]).name}」嗎？`:`要永久刪除這 ${ids.length} 個項目嗎？`,{title:'刪除項目',ok:'永久刪除',danger:true,parent:opt&&opt.parent});
  if(!ok)return 0;FS.purge(ids);OS.sfx('trash');return ids.length;
 }
 const r=FS.trash(ids);if(r.length)OS.sfx('trash');return r.length;
};
OS.props=id=>{
 const n=FS.get(id);if(!n)return;
 const dir=n.type==='dir',row=(a,b)=>`<tr><th>${a}</th><td>${b}</td></tr>`;
 let extra='';
 if(dir){const c=FS.countIn(id);extra=row('內容',`${c.f} 個檔案，${c.d} 個資料夾`)}
 OS.dialog({title:'內容 — '+FS.dname(n),w:420,body:`<div class="pfhead">${OS.fileIcon(n,44)}<b>${esc(FS.dname(n))}</b></div><table class="ptab">${row('類型',esc(FS.typeName(n)))}${row('位置',esc(n.p?FS.path(n.p):'—'))}${row('大小',dir?FS.sizeOf(id)?U_size(FS.sizeOf(id)):'0 位元組':U_size(n.size||0))}${extra}${row('建立時間',OS.U.fmtDate(n.c))}${row('修改時間',OS.U.fmtDate(n.m))}</table>`,buttons:[{id:'ok',label:'確定',primary:true}],cancelId:'ok'});
};
const U_size=n=>OS.U.fmtSize(n)+(n>=1024?`（${n.toLocaleString()} 位元組）`:'');

/* ---------- 拖放（檔案在桌面與檔案總管之間移動） ---------- */
OS.dnd={
 target(ev){
  const t=document.elementFromPoint(ev.clientX,ev.clientY);if(!t)return null;
  const d=t.closest('[data-drop]');if(d)return {type:'dir',id:d.dataset.drop,el:d};
  const c=t.closest('[data-dropdir]');if(c)return {type:'dir',id:c.dataset.dropdir,el:c};
  if(t.closest('.win,#taskbar,.menu,.dlgwrap,#start,.flyout'))return null;
  if(t.closest('#desktop'))return {type:'desktop',el:$('#desktop')};
  return null;
 },
 /* ids: 要移動的檔案 id；o: {label, html, from, keys, onDesktop(ev), onClick(ev)} */
 start(e,ids,o){
  const sx=e.clientX,sy=e.clientY;let ghost=null,on=false,hot=null,ended=false;
  const clear=()=>{if(hot){hot.classList.remove('dropok');hot=null}};
  const cleanup=()=>{
   if(ended)return;ended=true;
   document.removeEventListener('pointermove',mv,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('keydown',key,true);
   clear();if(ghost)ghost.remove();$('#os').classList.remove('dragging');
  };
  const canDrop=t=>{
   if(!t)return false;
   if(t.type==='desktop')return true;
   if(t.id==='bin')return ids.length>0&&ids.every(id=>{const n=FS.get(id);return n&&!FS.locked(n)&&!FS.inBin(n)});
   return ids.some(id=>{const n=FS.get(id);return n&&n.p!==t.id&&FS.canMove(n,t.id)});
  };
  const mv=ev=>{
   if(!on){
    if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
    on=true;
    ghost=document.createElement('div');ghost.className='dghost';
    ghost.innerHTML=(o.html||'')+(o.count>1?`<b class="dcnt">${o.count}</b>`:'')+`<span>${esc(o.label||'')}</span>`;
    $('#os').appendChild(ghost);$('#os').classList.add('dragging');
   }
   ghost.style.transform=`translate(${ev.clientX+10}px,${ev.clientY+10}px)`;
   const t=OS.dnd.target(ev);
   const el=t&&t.type==='dir'&&canDrop(t)?t.el:null;
   if(el!==hot){clear();if(el){el.classList.add('dropok');hot=el}}
   ghost.classList.toggle('copy',!!ev.ctrlKey&&t&&t.type==='dir'&&t.id!=='bin');
  };
  const up=ev=>{
   const was=on;cleanup();
   if(!was){o.onClick&&o.onClick(ev);return}
   const t=OS.dnd.target(ev);if(!t)return;
   const copy=!!ev.ctrlKey;
   if(t.type==='desktop'){
    if(o.from==='desktop'){o.onDesktop&&o.onDesktop(ev)}
    else if(ids.length){
     const out=copy?FS.copy(ids,'desktop'):FS.move(ids,'desktop');
     const cell=OS.desk.cellAt(ev.clientX,ev.clientY);
     out.forEach((n,i)=>{S.iconPos['fs:'+n.id]={c:cell.c+Math.floor(i/OS.desk.rows()),r:cell.r+(i%OS.desk.rows())}});OS.save();OS.emit('desk-layout');
    }
    return;
   }
   if(t.id==='bin'){OS.trashIds(ids);return}
   const dst=FS.get(t.id);if(!dst||dst.type!=='dir')return;
   if(copy)FS.copy(ids,t.id);else FS.move(ids,t.id);
  };
  const cancel=()=>cleanup();
  const key=ev=>{if(ev.key==='Escape'){ev.stopPropagation();cleanup()}};
  document.addEventListener('pointermove',mv,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('keydown',key,true);
 }
};

/* ---------- 框選 ---------- */
OS.rubber=(e,o)=>{
 // o: {items:()=>[{k,el}], base:Set, onChange(set)}
 const sx=e.clientX,sy=e.clientY;let box=null,on=false;
 const ctrl=e.ctrlKey||e.metaKey;
 const base=ctrl?new Set(o.base||[]):new Set();
 const mv=ev=>{
  if(!on){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;on=true;box=document.createElement('div');box.className='rbox';$('#os').appendChild(box);$('#os').classList.add('dragging')}
  const x1=Math.min(sx,ev.clientX),y1=Math.min(sy,ev.clientY),x2=Math.max(sx,ev.clientX),y2=Math.max(sy,ev.clientY);
  box.style.cssText=`left:${x1}px;top:${y1}px;width:${x2-x1}px;height:${y2-y1}px`;
  const set=new Set(base);
  o.items().forEach(it=>{const r=it.el.getBoundingClientRect();if(r.right>=x1&&r.left<=x2&&r.bottom>=y1&&r.top<=y2)set.add(it.k)});
  o.onChange(set);
 };
 const end=()=>{
  document.removeEventListener('pointermove',mv,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',end,true);
  if(box)box.remove();$('#os').classList.remove('dragging');
 };
 document.addEventListener('pointermove',mv,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
};

/* ---------- 桌面圖示 ---------- */
const SZ={l:{w:104,h:112,ic:56},m:{w:90,h:98,ic:46},s:{w:76,h:84,ic:34}};
let sel=new Set(),items=[],last={k:null,t:0},pendingRename=null,grid={cols:1,rows:1};
const D=OS.desk={};
const box=()=>$('#icons');
const sz=()=>SZ[S.iconSize]||SZ.m;
D.rows=()=>grid.rows;
D.cellAt=(x,y)=>{
 const r=box().getBoundingClientRect(),z=sz();
 return {c:clamp(Math.floor((x-r.left-6)/z.w),0,Math.max(0,grid.cols-1)),r:clamp(Math.floor((y-r.top-6)/z.h),0,Math.max(0,grid.rows-1))};
};
OS.sysIcon=(k,s)=>{
 if(k==='pc')return `<svg class="fi" width="${s}" height="${s}" viewBox="0 0 48 48"><rect x="5" y="8" width="38" height="25" rx="3" fill="#3b5560"/><rect x="8" y="11" width="32" height="19" rx="1.5" fill="url(#pcg)"/><path d="M18 40h12M24 33v7" stroke="#3b5560" stroke-width="3" stroke-linecap="round"/><defs><linearGradient id="pcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37d9c5"/><stop offset="1" stop-color="#0b7f8c"/></linearGradient></defs></svg>`;
 if(k==='user')return `<svg class="fi" width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M4 12a3 3 0 0 1 3-3h11l4 5h19a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e0a93a"/><path d="M4 19h40v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#f8d36c"/><circle cx="24" cy="27" r="4" fill="#b07c14"/><path d="M16 38a8 8 0 0 1 16 0z" fill="#b07c14"/></svg>`;
 return OS.fileIcon(FS.get('bin'),s);
};
function build(){
 const L=[];
 const ds=S.deskSys;
 if(ds.pc)L.push({k:'sys:pc',name:'本機',sys:true});
 if(ds.user)L.push({k:'sys:user',name:S.name,sys:true});
 if(ds.bin)L.push({k:'sys:bin',name:'資源回收筒',sys:true});
 let ks=FS.kids('desktop').slice();
 const by=S.sortBy;
 ks.sort((a,b)=>{
  if(by==='size')return (b.size||0)-(a.size||0)||OS.U.cmp(a.name,b.name);
  if(by==='type')return OS.U.cmp(FS.ext(a.name)||(a.type==='dir'?'':'zzz'),FS.ext(b.name)||(b.type==='dir'?'':'zzz'))||OS.U.cmp(a.name,b.name);
  if(by==='date')return b.m-a.m;
  if(a.type!==b.type)return a.type==='dir'?-1:1;
  return OS.U.cmp(a.name,b.name);
 });
 ks.forEach(n=>L.push({k:'fs:'+n.id,id:n.id,name:n.name,shown:FS.shown(n),n}));
 return L;
}
function layout(L){
 const el=box(),z=sz();
 const W=el.clientWidth||innerWidth,H=el.clientHeight||innerHeight-48;
 grid.cols=Math.max(1,Math.floor((W-12)/z.w));grid.rows=Math.max(1,Math.floor((H-12)/z.h));
 const used=new Set(),pos={};
 const cap=grid.cols*grid.rows;
 const cellKey=(c,r)=>c+','+r;
 const nextFree=()=>{for(let c=0;c<grid.cols;c++)for(let r=0;r<grid.rows;r++)if(!used.has(cellKey(c,r)))return {c,r};return {c:grid.cols-1,r:grid.rows-1,over:true}};
 if(!S.autoArrange){
  L.forEach(it=>{
   const p=S.iconPos[it.k];
   if(p&&p.c<grid.cols&&p.r<grid.rows&&p.c>=0&&p.r>=0&&!used.has(cellKey(p.c,p.r))){used.add(cellKey(p.c,p.r));pos[it.k]=p}
  });
 }
 L.forEach(it=>{if(pos[it.k])return;const f=nextFree();if(!f.over)used.add(cellKey(f.c,f.r));pos[it.k]={c:f.c,r:f.r}});
 void cap;
 if(!S.autoArrange){
  let ch=false;L.forEach(it=>{const p=S.iconPos[it.k];if(!p||p.c!==pos[it.k].c||p.r!==pos[it.k].r){S.iconPos[it.k]={c:pos[it.k].c,r:pos[it.k].r};ch=true}});
  if(ch)OS.save();
 }
 return pos;
}
D.render=()=>{
 const el=box();if(!el)return;
 if(el.querySelector('.dren input')&&!pendingRename)return; // 正在改名，不要重繪
 items=build();
 // 清掉已不存在的選取
 sel=new Set([...sel].filter(k=>items.some(i=>i.k===k)));
 const pos=layout(items),z=sz();
 el.style.setProperty('--iw',z.w+'px');el.style.setProperty('--ih',z.h+'px');el.style.setProperty('--ic',z.ic+'px');
 el.className=el.className.replace(/\bsz-\w\b/g,'')+' sz-'+S.iconSize;
 const cutIds=OS.clip&&OS.clip.op==='cut'?OS.clip.ids:[];
 el.innerHTML=items.map(it=>{
  const p=pos[it.k];
  let icon,nm=it.shown||it.name,drop='';
  if(it.sys){icon=OS.sysIcon(it.k==='sys:pc'?'pc':it.k==='sys:user'?'user':'bin',z.ic);if(it.k==='sys:bin')drop=' data-drop="bin"'}
  else{icon=OS.fileIcon(it.n,z.ic);if(it.n.type==='dir')drop=` data-drop="${it.id}"`}
  const nameHtml=(pendingRename===it.k)?`<span class="dren"><input value="${esc(nm)}" spellcheck="false" maxlength="120"></span>`:`<span class="dl">${esc(nm)}</span>`;
  return `<div class="dic${sel.has(it.k)?' sel':''}${it.id&&cutIds.includes(it.id)?' cut':''}" data-k="${esc(it.k)}"${drop} style="left:${6+p.c*z.w}px;top:${6+p.r*z.h}px" title="${esc(nm)}">${icon}${nameHtml}</div>`;
 }).join('');
 if(pendingRename){
  const k=pendingRename;pendingRename=null;
  const inp=el.querySelector('.dren input');
  if(inp){inp.focus();const v=inp.value,d=v.lastIndexOf('.');inp.setSelectionRange(0,d>0&&items.find(i=>i.k===k)?.n?.type!=='dir'?d:v.length);bindRename(inp,k)}
 }
};
function bindRename(inp,k){
 let done=false;
 const finish=ok=>{
  if(done)return;done=true;
  const it=items.find(i=>i.k===k),v=inp.value;
  if(ok&&it&&it.id){
   const err=FS.rename(it.id,v);
   if(err){OS.alert(err,{title:'重新命名',kind:'err'});}
  }
  pendingRename=null;D.render();
 };
 inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}});
 inp.addEventListener('blur',()=>finish(true));
 inp.addEventListener('pointerdown',e=>e.stopPropagation());
}
D.startRename=k=>{pendingRename=k;sel=new Set([k]);D.render()};
D.selected=()=>[...sel];
function selFs(){return [...sel].map(k=>k.startsWith('fs:')?k.slice(3):null).filter(Boolean)}
function itemOf(k){return items.find(i=>i.k===k)}
function openItem(k){
 if(k==='sys:pc')OS.open('explorer',{path:'pc'});
 else if(k==='sys:user')OS.open('explorer',{path:'home'});
 else if(k==='sys:bin')OS.open('explorer',{path:'bin'});
 else{const it=itemOf(k);if(it)OS.openNode(it.id)}
}
D.open=openItem;
function setSel(s){sel=new Set(s);$$('.dic',box()).forEach(e=>e.classList.toggle('sel',sel.has(e.dataset.k)))}
function deactivate(){if(OS.WM.active){OS.WM.active=null;OS.WM.paint();OS.emit('wm')}if(document.activeElement&&document.activeElement!==document.body&&!OS.U.isTyping(document.activeElement))try{document.activeElement.blur()}catch(e){}}
function bindDesktop(){
 const dk=$('#desktop'),el=box();
 dk.addEventListener('pointerdown',e=>{
  OS.closeStartAndFlyouts&&OS.closeStartAndFlyouts();
  if(e.target.closest('.dren'))return;
  if(OS.U.isTyping(document.activeElement)&&document.activeElement.closest('#icons'))document.activeElement.blur();
  deactivate();
  const ic=e.target.closest('.dic');
  if(e.button===2){
   if(ic&&!sel.has(ic.dataset.k))setSel([ic.dataset.k]);
   else if(!ic&&!(e.ctrlKey))setSel([]);
   return;
  }
  if(e.button!==0)return;
  if(!ic){
   if(!(e.ctrlKey||e.metaKey))setSel([]);
   OS.rubber(e,{items:()=>$$('.dic',el).map(x=>({k:x.dataset.k,el:x})),base:sel,onChange:s=>setSel(s)});
   return;
  }
  const k=ic.dataset.k,ctrl=e.ctrlKey||e.metaKey;
  const wasSel=sel.has(k);
  if(ctrl){const s=new Set(sel);if(wasSel)s.delete(k);else s.add(k);setSel(s);if(wasSel)return}
  else if(!wasSel)setSel([k]);
  const keys=[...sel],fsIds=selFs();
  const prim=itemOf(k);
  const gx=e.clientX,gy=e.clientY;
  OS.dnd.start(e,fsIds,{
   from:'desktop',keys,count:keys.length,label:prim?prim.name:'',html:ic.querySelector('svg,.lnk')?ic.querySelector('svg,.lnk').outerHTML:'',
   onClick:ev=>{
    if(!ctrl&&sel.size>1)setSel([k]);
    const now=Date.now();
    if(last.k===k&&now-last.t<OS.dblMs()){last={k:null,t:0};openItem(k)}else last={k,t:now};
   },
   onDesktop:ev=>{
    // 拖到桌面空白處：重新定位
    const from=S.iconPos[k]||{c:0,r:0},to=D.cellAt(ev.clientX-(gx-ic.getBoundingClientRect().left-6)+6,ev.clientY-(gy-ic.getBoundingClientRect().top-6)+6);
    if(S.autoArrange)return;
    let dc=to.c-from.c,dr=to.r-from.r;
    keys.forEach(kk=>{const p=S.iconPos[kk];if(!p)return;dc=clamp(dc,-p.c,grid.cols-1-p.c);dr=clamp(dr,-p.r,grid.rows-1-p.r)});
    if(!dc&&!dr)return;
    const targets={};
    keys.forEach(kk=>{const p=S.iconPos[kk];if(p)targets[kk]={c:p.c+dc,r:p.r+dr}});
    const tk=new Set(Object.values(targets).map(p=>p.c+','+p.r));
    items.forEach(it=>{if(keys.includes(it.k))return;const p=S.iconPos[it.k];if(p&&tk.has(p.c+','+p.r))delete S.iconPos[it.k]});
    Object.assign(S.iconPos,targets);OS.save();D.render();
   }
  });
 });
 /* 右鍵選單 */
 dk.addEventListener('contextmenu',e=>{
  e.preventDefault();
  const ic=e.target.closest('.dic');
  if(ic)itemMenu(e,ic.dataset.k);else deskMenu(e);
 });
 /* 從真實電腦拖檔案進來 */
 dk.addEventListener('dragover',e=>{if(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
 dk.addEventListener('drop',async e=>{
  if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;
  e.preventDefault();
  const r=await FS.importFiles([...e.dataTransfer.files],'desktop');
  const cell=D.cellAt(e.clientX,e.clientY);
  r.nodes.forEach((n,i)=>{S.iconPos['fs:'+n.id]={c:Math.min(grid.cols-1,cell.c+Math.floor(i/grid.rows)),r:(cell.r+i)%grid.rows}});OS.save();
  OS.toast(r.fail?`已匯入 ${r.ok} 個檔案，${r.fail} 個失敗`:`已匯入 ${r.ok} 個檔案到桌面`);
 });
 el.addEventListener('keydown',()=>{});
}
function itemMenu(e,k){
 if(!sel.has(k))setSel([k]);
 const ids=selFs(),single=sel.size===1;
 const it=itemOf(k);
 let m=[];
 if(k==='sys:pc')m=[{label:'開啟',fn:()=>openItem(k)},{sep:1},{label:'內容',fn:()=>OS.open('settings',{page:'about'})}];
 else if(k==='sys:user')m=[{label:'開啟',fn:()=>openItem(k)},{sep:1},{label:'隱藏此圖示',fn:()=>{S.deskSys.user=false;OS.save();D.render()}}];
 else if(k==='sys:bin')m=[{label:'開啟',fn:()=>openItem(k)},{label:'清空資源回收筒',dis:!FS.allKids('bin').length,fn:async()=>{if(await OS.confirm('要永久刪除資源回收筒中的所有項目嗎？',{title:'清空資源回收筒',ok:'清空',danger:true})){FS.emptyBin();OS.sfx('trash')}}},{sep:1},{label:'隱藏此圖示',fn:()=>{S.deskSys.bin=false;OS.save();D.render()}}];
 else{
  const dirOnly=ids.length===1&&it&&it.n.type==='dir';
  m=[{label:'開啟',fn:()=>openItem(k),dis:!single},
   dirOnly?{label:'在新視窗中開啟',fn:()=>OS.open('explorer',{path:it.id,fresh:1})}:null,
   (single&&it&&it.n.type==='file'&&it.n.kind==='text')?{label:'用記事本編輯',fn:()=>OS.open('notepad',{id:it.id})}:null,
   (single&&it&&it.n.type==='file'&&it.n.kind!=='app')?{label:'下載到實際電腦',ico:'download',fn:()=>FS.download(it.id)}:null,
   {sep:1},{label:'剪下',ico:'cut',kbd:'Ctrl+X',fn:()=>OS.clipSet('cut',ids)},{label:'複製',ico:'copy',kbd:'Ctrl+C',fn:()=>OS.clipSet('copy',ids)},
   {sep:1},{label:'刪除',ico:'trash',kbd:'Del',fn:()=>OS.trashIds(ids)},{label:'重新命名',ico:'edit',kbd:'F2',dis:!single,fn:()=>D.startRename(k)},
   {sep:1},{label:'內容',kbd:'Alt+Enter',dis:!single,fn:()=>OS.props(it.id)}].filter(Boolean);
 }
 OS.menu(m,e.clientX,e.clientY);
}
function deskMenu(e){
 const cur=S.iconSize,srt=S.sortBy;
 OS.menu([
  {label:'檢視',sub:[
   {label:'大圖示',radio:1,on:cur==='l',fn:()=>{S.iconSize='l';OS.save();D.render()}},
   {label:'中圖示',radio:1,on:cur==='m',fn:()=>{S.iconSize='m';OS.save();D.render()}},
   {label:'小圖示',radio:1,on:cur==='s',fn:()=>{S.iconSize='s';OS.save();D.render()}},
   {sep:1},
   {label:'自動排列圖示',chk:S.autoArrange,fn:()=>{S.autoArrange=!S.autoArrange;OS.save();D.render()}},
   {label:'顯示桌面圖示',chk:S.showDeskIcons,fn:()=>{S.showDeskIcons=!S.showDeskIcons;OS.save();OS.applyAll()}}
  ]},
  {label:'排序方式',sub:[['name','名稱'],['size','大小'],['type','項目類型'],['date','修改日期']].map(([v,l])=>({label:l,radio:1,on:srt===v,fn:()=>{S.sortBy=v;S.iconPos={};if(!S.autoArrange){}OS.save();D.render()}}))},
  {label:'重新整理',ico:'refresh',fn:()=>{D.render()}},
  {sep:1},
  {label:'貼上',ico:'paste',kbd:'Ctrl+V',dis:!OS.canPaste(),fn:()=>{const out=OS.paste('desktop');const c=D.cellAt(e.clientX,e.clientY);out.forEach((n,i)=>{S.iconPos['fs:'+n.id]={c:Math.min(grid.cols-1,c.c+Math.floor(i/grid.rows)),r:(c.r+i)%grid.rows}});OS.save();D.render()}},
  {sep:1},
  {label:'新增',sub:[
   {label:'資料夾',ico:'folderplus',fn:()=>{const n=OS.newItem('desktop','folder');if(n)placeAt(n,e);}},
   {label:'文字文件',ico:'fileplus',fn:()=>{const n=OS.newItem('desktop','text');if(n)placeAt(n,e);}},
   {label:'青魚文件',ico:'fileplus',fn:()=>{const n=OS.newItem('desktop','doc');if(n)placeAt(n,e);}}
  ]},
  {sep:1},
  {label:'在此開啟終端機',fn:()=>OS.open('terminal',{cwd:'desktop'})},
  {label:'顯示設定',ico:'desktop',fn:()=>OS.open('settings',{page:'display'})},
  {label:'個人化',ico:'brush',fn:()=>OS.open('settings',{page:'personal'})}
 ],e.clientX,e.clientY);
}
function placeAt(n,e){
 const c=D.cellAt(e.clientX,e.clientY);
 if(!S.autoArrange){
  const taken=Object.keys(S.iconPos).some(k=>k!=='fs:'+n.id&&S.iconPos[k].c===c.c&&S.iconPos[k].r===c.r);
  if(!taken)S.iconPos['fs:'+n.id]={c:c.c,r:c.r};
 }
 OS.save();D.startRename('fs:'+n.id);
}
/* 桌面鍵盤操作（沒有任何視窗取得焦點時） */
document.addEventListener('keydown',e=>{
 if(OS.R.state!=='desktop'||OS.WM.active||OS.U.isTyping(e.target)||document.querySelector('.dlgwrap')||OS.menuIsOpen())return;
 if(e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='a'){e.preventDefault();setSel(items.map(i=>i.k));return}
 if(!sel.size)return;
 const ids=selFs();
 if(e.key==='Enter'&&!e.altKey){e.preventDefault();sel.size===1&&openItem([...sel][0]);}
 else if(e.key==='Enter'&&e.altKey&&ids.length===1){e.preventDefault();OS.props(ids[0])}
 else if(e.key==='Delete'){e.preventDefault();OS.trashIds(ids,{perm:e.shiftKey})}
 else if(e.key==='F2'&&sel.size===1&&ids.length===1){e.preventDefault();D.startRename([...sel][0])}
 else if(e.ctrlKey&&e.key.toLowerCase()==='c'&&ids.length){e.preventDefault();OS.clipSet('copy',ids)}
 else if(e.ctrlKey&&e.key.toLowerCase()==='x'&&ids.length){e.preventDefault();OS.clipSet('cut',ids)}
 else if(e.ctrlKey&&e.key.toLowerCase()==='v'){e.preventDefault();OS.paste('desktop');D.render()}
 else if(e.key==='Escape')setSel([]);
});
document.addEventListener('keydown',e=>{
 if(OS.R.state!=='desktop'||OS.WM.active||OS.U.isTyping(e.target)||document.querySelector('.dlgwrap')||OS.menuIsOpen())return;
 if(e.ctrlKey&&e.key.toLowerCase()==='v'&&!sel.size){e.preventDefault();OS.paste('desktop')}
});
OS.on('fs',()=>{D.render()});
OS.on('clip',()=>{D.render()});
OS.on('desk-layout',()=>D.render());
addEventListener('resize',()=>{clearTimeout(D._rt);D._rt=setTimeout(D.render,80)});
D.init=()=>{bindDesktop();D.render()};
})();
