/* 青魚電腦 — 應用程式共用：功能表列、開啟／儲存檔案對話方塊 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc}=OS.U,FS=OS.FS;

/* ---- 功能表列 ----
   defs: [{label, items:()=>[menu items]}]  回傳 {el, close()} */
OS.menubar=(host,defs)=>{
 const el=document.createElement('div');el.className='mb';el.setAttribute('role','menubar');
 el.innerHTML=defs.map((d,i)=>`<button type="button" class="mbb" data-i="${i}" role="menuitem" aria-haspopup="true">${esc(d.label)}</button>`).join('');
 host.appendChild(el);
 let openIdx=-1;
 const show=(b)=>{
  const i=+b.dataset.i;
  openIdx=i;
  OS.menuAt(b,defs[i].items(),{onClose:()=>{if(openIdx===i)openIdx=-1}});
 };
 el.addEventListener('click',e=>{
  const b=e.target.closest('.mbb');if(!b)return;
  if(OS.menuRecentlyClosedBy(b))return;
  show(b);
 });
 el.addEventListener('mouseover',e=>{
  const b=e.target.closest('.mbb');
  if(!b||openIdx<0||+b.dataset.i===openIdx||!OS.menuIsOpen())return;
  show(b);
 });
 return {el,close:()=>OS.closeMenu()};
};

/* ---- 開啟／儲存檔案 ----
   o: {parent:win, mode:'open'|'save', title, kinds:['text'], defExt:'txt', name:'未命名.txt', start:dirId}
   回傳 Promise<{id|null, dir, name}|null> */
OS.fileDialog=o=>{
 o=o||{};
 const save=o.mode==='save',kinds=o.kinds||null;
 let cur=FS.get(o.start)&&FS.get(o.start).type==='dir'&&!FS.inBin(FS.get(o.start))?o.start:'documents';
 if(!FS.get(cur))cur='home';
 let selId=null,result=null,warned='';const api={};
 const QUICK=[['desktop','桌面'],['documents','文件'],['downloads','下載'],['pictures','圖片'],['music','音樂'],['videos','影片'],['home','使用者資料夾'],['root','本機磁碟 (C:)']];
 const body=`<div class="fdlg"><div class="fdnav"><button type="button" class="xb fdup" title="上一層" aria-label="上一層">${OS.ico('up',16)}</button><select class="inp fdq" aria-label="快速位置">${QUICK.map(([id,l])=>`<option value="${id}">${l}</option>`).join('')}</select><div class="fdpath"></div></div>
 <div class="fdlist" tabindex="0" role="listbox"></div>
 <div class="fdrow"><label for="fdn">檔案名稱</label><input id="fdn" class="inp fdname" type="text" spellcheck="false" autocomplete="off" maxlength="120" value="${esc(o.name||'')}"></div><div class="derr fdmsg" role="alert"></div></div>`;
 const dlg=OS.dialogEx({title:o.title||(save?'另存新檔':'開啟舊檔'),w:540,parent:o.parent,body,
  buttons:[{id:'ok',label:save?'儲存':'開啟',primary:true},{id:'cancel',label:'取消'}],
  beforeClose:(id,wrap)=>{
   if(id!=='ok')return true;
   const msg=$('.fdmsg',wrap),inp=$('.fdname',wrap);
   let name=inp.value.trim();
   if(!save){
    let n=selId&&FS.get(selId);
    if(!n||n.type!=='file'){n=name?FS.find1(cur,name):null}
    if(!n||n.type!=='file'){
     if(n&&n.type==='dir'){go(n.id);return false}
     msg.textContent=name?`找不到「${name}」。請確認檔案名稱是否正確。`:'請選擇一個檔案。';return false;
    }
    result={id:n.id,dir:n.p,name:n.name};return true;
   }
   if(!name){msg.textContent='請輸入檔案名稱。';return false}
   if(o.defExt&&!/\.[^.\\/]+$/.test(name))name+='.'+o.defExt;
   const ex=FS.find1(cur,name);
   if(ex&&ex.type==='dir'){go(ex.id);inp.value='';return false}
   const err=ex?'':FS.checkName(name,cur);
   if(err){msg.textContent=err;return false}
   if(FS.inBin(FS.get(cur))){msg.textContent='無法儲存到資源回收筒。';return false}
   if(ex){
    if(warned!==name){warned=name;msg.textContent=`「${name}」已經存在。再按一次「儲存」就會取代它。`;return false}
    if(ex.kind==='app'){msg.textContent='無法取代捷徑。';return false}
   }
   result={id:ex?ex.id:null,dir:cur,name};return true;
  },
  onShow:wrap=>{
   const list=$('.fdlist',wrap),pathEl=$('.fdpath',wrap),inp=$('.fdname',wrap),q=$('.fdq',wrap),msg=$('.fdmsg',wrap);
   const show=n=>n.type==='dir'||!kinds||kinds.includes(n.kind);
   const rerender=()=>{
    const l=FS.kids(cur).filter(show).sort((a,b)=>(a.type!==b.type?(a.type==='dir'?-1:1):OS.U.cmp(FS.shown(a),FS.shown(b))));
    list.innerHTML=l.length?l.map(n=>`<div class="fdi${n.id===selId?' sel':''}" data-id="${n.id}" role="option">${OS.fileIcon(n,20)}<span class="xnm">${esc(FS.shown(n))}</span><em>${n.type==='dir'?'':OS.U.fmtSize(n.size||0)}</em></div>`).join(''):'<div class="xemp">這個資料夾沒有符合的項目。</div>';
    pathEl.textContent=FS.path(cur);
    q.value=QUICK.some(x=>x[0]===cur)?cur:'';
    if(!q.value){q.selectedIndex=-1}
    $('.fdup',wrap).disabled=!FS.get(cur).p;
   };
   api.go=id=>{cur=id;selId=null;msg.textContent='';warned='';rerender()};
   rerender();
   list.addEventListener('click',e=>{
    const it=e.target.closest('.fdi');if(!it)return;
    const n=FS.get(it.dataset.id);if(!n)return;
    selId=n.id;msg.textContent='';warned='';
    $$('.fdi',list).forEach(x=>x.classList.toggle('sel',x===it));
    if(n.type==='file')inp.value=n.name;
   });
   list.addEventListener('dblclick',e=>{
    const it=e.target.closest('.fdi');if(!it)return;
    const n=FS.get(it.dataset.id);if(!n)return;
    if(n.type==='dir')api.go(n.id);else{inp.value=n.name;selId=n.id;$('[data-id=ok]',wrap).click()}
   });
   list.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&selId){const n=FS.get(selId);if(n&&n.type==='dir'){e.preventDefault();e.stopPropagation();api.go(n.id)}}
    else if(e.key==='Backspace'){e.preventDefault();const p=FS.get(cur).p;if(p)api.go(p)}
   });
   $('.fdup',wrap).addEventListener('click',()=>{const p=FS.get(cur).p;if(p)api.go(p)});
   q.addEventListener('change',()=>{if(FS.get(q.value))api.go(q.value)});
   inp.addEventListener('input',()=>{msg.textContent='';warned='';selId=null;$$('.fdi.sel',list).forEach(x=>x.classList.remove('sel'))});
   if(save)setTimeout(()=>{inp.focus();const v=inp.value,d=v.lastIndexOf('.');inp.setSelectionRange(0,d>0?d:v.length)},40);
  }});
 function go(id){if(api.go)api.go(id)}
 return dlg.promise.then(r=>r==='ok'?result:null);
};
})();
