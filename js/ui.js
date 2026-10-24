/* 青魚電腦 — 共用介面元件：圖示、右鍵選單、對話方塊 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U;
const osEl=()=>document.getElementById('os');

/* ---------- 應用程式與檔案圖示 ---------- */
OS.register=def=>{OS.apps[def.id]=def;return def};
OS.appInstalled=id=>{const a=OS.apps[id];return !!a&&(!a.store||OS.S.inst.includes(id))};
OS.installedApps=()=>Object.values(OS.apps).filter(a=>!a.hidden&&OS.appInstalled(a.id));
OS.appIcon=(id,s)=>{
 const a=OS.apps[id];if(!a)return '';
 return `<span class="ai" style="--s:${s||32}px;background:${a.g}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a.s}</svg></span>`;
};
const PAGE=(inner,c)=>`<path d="M10 4h19l9 9v29a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" stroke="#b9cccc"/><path d="M29 4v7a2 2 0 0 0 2 2h7z" fill="#dbe7e7"/>${inner}`;
OS.fileIcon=(n,s)=>{
 s=s||48;
 if(n&&n.type==='file'&&n.kind==='app'&&OS.apps[n.app]){return `<span class="lnk">${OS.appIcon(n.app,Math.round(s*.82))}<i></i></span>`}
 let g='';
 if(!n||n.type==='dir'){
  if(n&&n.sys==='root')g='<rect x="4" y="18" width="40" height="18" rx="4" fill="#9db5b8"/><rect x="4" y="18" width="40" height="7" rx="3" fill="#c3d3d5"/><circle cx="37" cy="31" r="2" fill="#2e9e6b"/><rect x="9" y="29" width="16" height="3" rx="1.5" fill="#6d8a8e"/>';
  else if(n&&n.sys==='bin'){const full=OS.FS.allKids('bin').length>0;g=`<path d="M12 12h24l-2 28a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="${full?'#8fb4b8':'#b9d0d3'}" stroke="#6d8a8e"/><path d="M9 12h30" stroke="#6d8a8e" stroke-width="3" stroke-linecap="round"/><path d="M19 8h10v4H19z" fill="#6d8a8e"/><path d="M20 18v18M24 18v18M28 18v18" stroke="#6d8a8e" stroke-width="1.5"/>${full?'<path d="M16 12l3-4 4 3 3-3 5 4z" fill="#f0e6c8"/>':''}`}
  else{
   g='<path d="M4 12a3 3 0 0 1 3-3h11l4 5h19a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e0a93a"/><path d="M4 19h40v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#f8d36c"/>';
   const m={desktop:'<rect x="17" y="24" width="14" height="9" rx="1.5" fill="none" stroke="#b07c14" stroke-width="2"/>',documents:'<path d="M18 23h12M18 27h12M18 31h8" stroke="#b07c14" stroke-width="2" stroke-linecap="round"/>',pictures:'<circle cx="19" cy="25" r="2" fill="#b07c14"/><path d="M15 33l6-6 4 4 3-3 5 5z" fill="#b07c14"/>',downloads:'<path d="M24 22v10M19 28l5 5 5-5" fill="none" stroke="#b07c14" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',music:'<path d="M21 33V23l9-2v10" fill="none" stroke="#b07c14" stroke-width="2.2" stroke-linecap="round"/><circle cx="19" cy="33" r="2.4" fill="#b07c14"/><circle cx="28" cy="31" r="2.4" fill="#b07c14"/>',videos:'<path d="M20 22l10 6-10 6z" fill="#b07c14"/>'};
   if(n&&m[n.sys])g+=m[n.sys];
  }
 }else if(n.kind==='text')g=PAGE('<path d="M15 20h18M15 26h18M15 32h12" stroke="#5b7f86" stroke-width="2.2" stroke-linecap="round"/>');
 else if(n.kind==='image')g=PAGE('<rect x="14" y="20" width="20" height="16" rx="2" fill="#bfe3ee"/><circle cx="20" cy="25" r="2.2" fill="#f4c95d"/><path d="M14 34l7-7 5 5 3-3 5 5v1a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#3aa08f"/>');
 else if(n.kind==='video')g=PAGE('<rect x="13" y="20" width="22" height="16" rx="3" fill="#7a5cd6"/><path d="M21 24l7 4-7 4z" fill="#fff"/>');
 else if(n.kind==='audio')g=PAGE('<path d="M20 34V22l11-2v12" fill="none" stroke="#d6456f" stroke-width="2.4" stroke-linecap="round"/><circle cx="18" cy="34" r="3" fill="#d6456f"/><circle cx="29" cy="32" r="3" fill="#d6456f"/>');
 else g=PAGE('<path d="M16 24h16M16 30h10" stroke="#9fb2b5" stroke-width="2.2" stroke-linecap="round"/>');
 return `<svg class="fi" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">${g}</svg>`;
};

/* ---------- 右鍵選單 ---------- */
let cur=null,lastClose={a:null,t:0};
function removeFrom(depth){
 if(!cur)return;
 while(cur.els.length>depth){const e=cur.els.pop();e.remove()}
}
function closeMenu(byOutside){
 if(!cur)return;
 const c=cur;cur=null;
 if(byOutside)lastClose={a:c.anchor,t:performance.now()};
 c.els.forEach(e=>e.remove());
 if(c.anchor&&c.anchor.classList)c.anchor.classList.remove('menu-open');
 try{c.onClose&&c.onClose()}catch(e){console.error(e)}
}
OS.closeMenu=closeMenu;
OS.menuIsOpen=()=>!!cur;
OS.menuRecentlyClosedBy=a=>!!a&&lastClose.a===a&&performance.now()-lastClose.t<400;
function build(items,depth){
 const hasChk=items.some(i=>i.chk||i.radio),hasIco=items.some(i=>i.ico);
 const m=document.createElement('div');m.className='menu';m.setAttribute('role','menu');m._depth=depth;m._items=items;
 m.innerHTML=items.map((it,i)=>{
  if(it.sep)return '<div class="msep" role="separator"></div>';
  if(it.hdr)return `<div class="mhdr">${esc(it.hdr)}</div>`;
  return `<div class="mi${it.dis?' dis':''}${it.danger?' dng':''}" role="menuitem" data-i="${i}"${it.dis?' aria-disabled="true"':''}>${hasChk?`<span class="mck">${it.chk?OS.ico('check',14):it.radio&&it.on?'<i class="rad"></i>':''}</span>`:''}${hasIco?`<span class="mic">${it.ico?OS.ico(it.ico,16):''}</span>`:''}<span class="ml">${esc(it.label)}</span>${it.kbd?`<span class="mk">${esc(it.kbd)}</span>`:''}${it.sub?`<span class="msub">${OS.ico('chevR',12)}</span>`:''}</div>`;
 }).join('');
 return m;
}
function place(m,x,y,rectRight){
 const vw=innerWidth,vh=innerHeight;
 m.style.left='0px';m.style.top='0px';m.style.visibility='hidden';
 osEl().appendChild(m);
 const w=m.offsetWidth,h=m.offsetHeight;
 let nx=x,ny=y;
 if(nx+w>vw-4){nx=rectRight!=null?Math.max(4,rectRight-w):Math.max(4,vw-w-4)}
 if(ny+h>vh-4)ny=Math.max(4,vh-h-4);
 m.style.left=nx+'px';m.style.top=ny+'px';m.style.visibility='';
 if(h>vh-8){m.style.maxHeight=(vh-8)+'px';m.style.overflowY='auto'}
}
function openSub(parent,i){
 const it=parent._items[i];if(!it||!it.sub)return;
 removeFrom(parent._depth+1);
 const el=parent.querySelector(`[data-i="${i}"]`);if(!el)return;
 const sub=build(typeof it.sub==='function'?it.sub():it.sub,parent._depth+1);sub.classList.add('submenu');
 const r=el.getBoundingClientRect();
 place(sub,r.right-4,r.top-5,r.left+4);
 cur.els.push(sub);sub._parentIdx=i;
}
OS.menu=(items,x,y,opts)=>{
 closeMenu();opts=opts||{};
 items=items.filter(Boolean);
 if(!items.length)return;
 const root=build(items,0);
 cur={els:[root],anchor:opts.anchor||null,onClose:opts.onClose,hl:null};
 place(root,x,y);
 if(opts.anchor&&opts.anchor.classList)opts.anchor.classList.add('menu-open');
 return {close:()=>closeMenu()};
};
OS.menuAt=(anchor,items,opts)=>{
 const r=anchor.getBoundingClientRect();
 return OS.menu(items,opts&&opts.right?r.right:r.left,r.bottom+2,Object.assign({anchor},opts));
};
OS.menuUp=(anchor,items)=>{ // 往上展開（工作列用）
 const r=anchor.getBoundingClientRect();
 OS.menu(items,r.left,r.top-6,{anchor});
 if(cur){const m=cur.els[0];const h=m.offsetHeight;m.style.top=Math.max(4,r.top-h-6)+'px'}
};
function hlSet(m,i){
 $$('.mi.hl',m).forEach(e=>e.classList.remove('hl'));
 const el=m.querySelector(`[data-i="${i}"]`);if(el){el.classList.add('hl');el.scrollIntoView({block:'nearest'})}
}
function activate(m,i){
 const it=m._items[i];if(!it||it.dis||it.sep||it.hdr)return;
 if(it.sub){openSub(m,i);return}
 closeMenu();
 try{it.fn&&it.fn()}catch(e){console.error(e)}
}
document.addEventListener('pointerdown',e=>{if(cur&&!e.target.closest('.menu'))closeMenu(true)},true);
document.addEventListener('contextmenu',e=>{if(cur&&!e.target.closest('.menu'))closeMenu(true)},true);
addEventListener('blur',()=>closeMenu());
addEventListener('resize',()=>closeMenu());
document.addEventListener('click',e=>{
 if(!cur)return;
 const el=e.target.closest('.mi');if(!el)return;
 const m=el.closest('.menu');if(!m)return;
 activate(m,+el.dataset.i);
},true);
document.addEventListener('mouseover',e=>{
 if(!cur)return;
 const el=e.target.closest('.mi'),m=e.target.closest('.menu');if(!el||!m)return;
 const i=+el.dataset.i;hlSet(m,i);
 const it=m._items[i];
 clearTimeout(cur.st);
 if(it&&it.sub&&!it.dis){cur.st=setTimeout(()=>{if(cur&&m.isConnected&&!(cur.els[m._depth+1]&&cur.els[m._depth+1]._parentIdx===i))openSub(m,i)},140)}
 else cur.st=setTimeout(()=>{if(cur)removeFrom(m._depth+1)},140);
});
document.addEventListener('keydown',e=>{
 if(!cur)return;
 const m=cur.els[cur.els.length-1];
 const items=m._items,enabled=items.map((it,i)=>(!it.sep&&!it.hdr&&!it.dis)?i:-1).filter(i=>i>=0);
 const hl=m.querySelector('.mi.hl'),hi=hl?+hl.dataset.i:-1;
 let h=true;
 if(e.key==='Escape'){if(cur.els.length>1)removeFrom(cur.els.length-1);else closeMenu()}
 else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(!enabled.length)return;
  let p=enabled.indexOf(hi);p=e.key==='ArrowDown'?(p+1)%enabled.length:(p<=0?enabled.length-1:p-1);hlSet(m,enabled[p]);
 }
 else if(e.key==='ArrowRight'){if(hi>=0&&items[hi].sub){openSub(m,hi);const sm=cur.els[cur.els.length-1];const f=sm._items.findIndex(x=>!x.sep&&!x.hdr&&!x.dis);if(f>=0)hlSet(sm,f)}}
 else if(e.key==='ArrowLeft'){if(cur.els.length>1)removeFrom(cur.els.length-1);else h=false}
 else if(e.key==='Enter'||e.key===' '){if(hi>=0)activate(m,hi)}
 else if(e.key==='Tab'){closeMenu();h=false}
 else h=false;
 if(h){e.preventDefault();e.stopPropagation()}
},true);

/* ---------- 對話方塊 ---------- */
OS.dialogEx=o=>{
 const par=o.parent&&o.parent.el&&o.parent.el.isConnected?o.parent:null;
 const wrap=document.createElement('div');wrap.className='dlgwrap'+(par?' inwin':'');
 const btns=(o.buttons||[{id:'ok',label:'確定',primary:true}]);
 wrap.innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(o.title||'')}"${o.w?` style="width:${o.w}px"`:''}><div class="dlgt">${o.icon||''}<span>${esc(o.title||'')}</span></div><div class="dlgb">${o.body||''}</div><div class="dlgf">${btns.map(b=>`<button type="button" class="btn${b.primary?' pri':''}${b.danger?' dng':''}" data-id="${esc(b.id)}">${esc(b.label)}</button>`).join('')}</div></div>`;
 (par?par.el:osEl()).appendChild(wrap);
 if(par)par.modals=(par.modals||0)+1;
 const prev=document.activeElement;
 let done=false,resolve;
 const promise=new Promise(r=>{resolve=r});
 const cancelId=o.cancelId||(btns.find(b=>b.id==='cancel')?'cancel':null);
 const finish=(id,force)=>{
  if(done)return;
  if(!force&&o.beforeClose&&o.beforeClose(id,wrap)===false)return;
  done=true;
  if(par){par.modals=Math.max(0,(par.modals||1)-1);const i=par.clean.indexOf(cl);if(i>=0)par.clean.splice(i,1)}
  wrap.remove();
  try{if(prev&&prev.isConnected&&prev.focus)prev.focus({preventScroll:true});else if(par)par.el.focus({preventScroll:true})}catch(e){}
  resolve(id);
 };
 const cl=()=>finish(cancelId,true);
 if(par)par.clean.push(cl);
 wrap.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b&&wrap.contains(b))finish(b.dataset.id)});
 wrap.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(cancelId)}
  else if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&!(e.target.tagName==='BUTTON')){
   const p=wrap.querySelector('.btn.pri');if(p){e.preventDefault();e.stopPropagation();p.click()}
  }
  else if(e.key==='Tab'){
   const f=$$('input:not([disabled]),textarea,select,button:not([disabled]),[tabindex="0"]',wrap).filter(x=>x.offsetParent!==null);
   if(!f.length)return;
   const i=f.indexOf(document.activeElement);
   if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}
   else if(!e.shiftKey&&(i===f.length-1||i<0)){e.preventDefault();f[0].focus()}
  }
  e.stopPropagation();
 });
 wrap.addEventListener('pointerdown',e=>e.stopPropagation());
 if(o.onShow)try{o.onShow(wrap)}catch(e){console.error(e)}
 setTimeout(()=>{
  if(done)return;
  const f=wrap.querySelector('[data-autofocus],input:not([type=hidden]),textarea')||wrap.querySelector('.btn.pri')||wrap.querySelector('.btn');
  if(f){f.focus({preventScroll:true});if(f.select&&f.tagName==='INPUT'&&o.select!==false)try{f.select()}catch(e){}}
 },20);
 return {el:wrap,promise,close:id=>finish(id==null?cancelId:id,true)};
};
OS.dialog=o=>OS.dialogEx(o).promise;
const ICON={info:OS.ico('info',16),warn:OS.ico('info',16),err:OS.ico('close',16)};
OS.alert=(msg,o)=>{o=o||{};return OS.dialog({title:o.title||'青魚電腦',body:`<p class="dmsg">${o.html?msg:esc(msg)}</p>`,parent:o.parent,buttons:[{id:'ok',label:o.ok||'確定',primary:true}],cancelId:'ok',icon:ICON[o.kind||'info'],w:o.w})};
OS.confirm=async(msg,o)=>{o=o||{};const r=await OS.dialog({title:o.title||'確認',body:`<p class="dmsg">${o.html?msg:esc(msg)}</p>`,parent:o.parent,buttons:[{id:'ok',label:o.ok||'確定',primary:!o.danger,danger:!!o.danger},{id:'cancel',label:o.cancel||'取消',primary:false}],icon:ICON.warn,w:o.w});return r==='ok'};
OS.prompt=async o=>{
 let val=null;
 const r=await OS.dialog({title:o.title||'輸入',parent:o.parent,w:o.w||380,
  body:`${o.msg?`<p class="dmsg">${esc(o.msg)}</p>`:''}<input class="inp dinp" type="${o.type||'text'}" value="${esc(o.value||'')}" placeholder="${esc(o.placeholder||'')}" maxlength="${o.max||200}" autocomplete="off" spellcheck="false"><div class="derr" role="alert"></div>`,
  buttons:[{id:'ok',label:o.ok||'確定',primary:true},{id:'cancel',label:'取消'}],
  beforeClose:(id,w)=>{
   if(id!=='ok')return true;
   const v=$('.dinp',w).value;
   const err=o.validate?o.validate(v):'';
   if(err){$('.derr',w).textContent=err;$('.dinp',w).focus();return false}
   val=v;return true;
  },
  onShow:w=>{const i=$('.dinp',w);i.addEventListener('input',()=>{$('.derr',w).textContent=''});
   if(o.selectName){setTimeout(()=>{const v=i.value,d=v.lastIndexOf('.');i.focus();i.setSelectionRange(0,d>0?d:v.length)},30)}}
 });
 return r==='ok'?val:null;
};
/* 開啟檔案時，依類型選擇應用程式 */
OS.openNode=(id,opt)=>{
 const n=OS.FS.get(id);if(!n)return false;
 if(n.type==='dir'){OS.open('explorer',{path:id});return true}
 const bump=()=>{const r=OS.S.recent.filter(x=>x!==id);r.unshift(id);OS.S.recent=r.slice(0,12);OS.save()};
 if(n.kind==='app'){if(OS.apps[n.app]&&OS.appInstalled(n.app))OS.open(n.app);else OS.alert('這個捷徑指向的程式已被移除。',{title:'捷徑'});return true}
 if(n.kind==='text'){bump();OS.open('notepad',{id});return true}
 if(n.kind==='image'){bump();OS.open('photos',{id});return true}
 if(n.kind==='video'||n.kind==='audio'){bump();OS.open('media',{id});return true}
 OS.dialog({title:'開啟檔案',body:`<p class="dmsg">沒有可以開啟「${esc(n.name)}」的程式。要把檔案下載到你的實際電腦嗎？</p>`,buttons:[{id:'dl',label:'下載',primary:true},{id:'cancel',label:'取消'}]}).then(r=>{if(r==='dl')OS.FS.download(id)});
 return true;
};
})();
