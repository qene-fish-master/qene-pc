/* 青魚電腦 — 檔案總管 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;
const FOLDER='<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>';
const SIDE=[['desktop','桌面'],['downloads','下載'],['documents','文件'],['pictures','圖片'],['music','音樂'],['videos','影片']];
OS.setWallFromNode=async id=>{
 const b=await FS.getBlob(id);if(!b){OS.toast('找不到影像');return}
 const url=URL.createObjectURL(b),img=new Image();
 img.onload=()=>{
  try{
   const k=Math.min(1,1920/Math.max(img.width,img.height)),c=document.createElement('canvas');
   c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);
   S.custom=c.toDataURL('image/jpeg',.85);S.useCustom=true;OS.saveNow();OS.applyAll();OS.emit('wall');OS.toast('已設為桌面背景');
  }catch(e){OS.toast('無法使用這個影像')}
  URL.revokeObjectURL(url);
 };
 img.onerror=()=>{URL.revokeObjectURL(url);OS.toast('無法使用這個影像')};
 img.src=url;
};
OS.register({id:'explorer',name:'檔案總管',kw:'explorer files folder file manager 檔案 資料夾 資源管理員 檔案總管',
 g:'linear-gradient(145deg,#ffd45e,#e0931f)',s:FOLDER,w:920,h:580,minW:520,minH:340,
 create(win,args){
  const root=document.createElement('div');root.className='xp';win.body.appendChild(root);
  let anc0=null;let loc='home',hist=[],hi=-1,sel=new Set(),anchor=null,query='',renaming=null,pendingRefresh=false;
  let sortKey='name',sortDir=1,view=S.view.explorer||'details',lastClick={id:null,t:0},typeBuf='',typeT=0;
  const isPc=()=>loc==='pc',isBin=()=>loc==='bin';
  const valid=l=>l==='pc'||(FS.get(l)&&FS.get(l).type==='dir');
  root.innerHTML=`<div class="xpbar"></div>
  <div class="xpnav"><button type="button" class="xb" data-n="back" title="返回 (Alt+←)" aria-label="返回">${OS.ico('back',16)}</button><button type="button" class="xb" data-n="fwd" title="往前 (Alt+→)" aria-label="往前">${OS.ico('forward',16)}</button><button type="button" class="xb" data-n="up" title="上一層 (Alt+↑)" aria-label="上一層">${OS.ico('up',16)}</button><button type="button" class="xb" data-n="ref" title="重新整理 (F5)" aria-label="重新整理">${OS.ico('refresh',15)}</button>
   <div class="xaddr" tabindex="0" title="點一下可以輸入路徑"></div>
   <label class="xsrch">${OS.ico('search',14)}<input type="text" placeholder="搜尋" autocomplete="off" spellcheck="false" aria-label="搜尋"></label></div>
  <div class="xpmain"><div class="xpside" role="tree"></div><div class="xpc" tabindex="0" data-filedrop="1"></div></div>
  <div class="xpstat"><span class="xs1"></span><span class="xs2"></span><span class="xsv"></span></div><input type="file" class="xfile" multiple hidden>`;
  const bar=$('.xpbar',root),addr=$('.xaddr',root),side=$('.xpside',root),c=$('.xpc',root),sInp=$('.xsrch input',root);

  /* ---------- 導覽 ---------- */
  function nav(t,push){
   if(!valid(t))t='home';
   if(push!==false){hist=hist.slice(0,hi+1);if(hist[hist.length-1]!==t){hist.push(t)}hi=hist.length-1}
   loc=t;sel=new Set();anchor=null;query='';sInp.value='';renaming=null;
   c.scrollTop=0;
   renderAll();
  }
  const upTarget=()=>{if(isPc())return null;if(isBin())return 'pc';const n=FS.get(loc);if(!n)return 'pc';return n.p||'pc'};
  function title(){
   if(query)return '搜尋結果';
   if(isPc())return '本機';if(isBin())return '資源回收筒';
   const n=FS.get(loc);return n?FS.dname(n):'檔案總管';
  }
  /* ---------- 資料 ---------- */
  function items(){
   if(isPc())return [];
   let l;
   if(query){
    const q=query.toLowerCase();
    l=isBin()?FS.kids('bin').filter(n=>n.name.toLowerCase().includes(q)):FS.search(query,loc,300).filter(n=>!FS.inBin(n));
   }else l=FS.kids(loc).slice();
   const k=sortKey,d=sortDir;
   l.sort((a,b)=>{
    if(a.type!==b.type)return a.type==='dir'?-1:1;
    let r=0;
    if(k==='date')r=a.m-b.m;
    else if(k==='size')r=(a.size||0)-(b.size||0);
    else if(k==='type')r=OS.U.cmp(FS.typeName(a),FS.typeName(b));
    else if(k==='loc')r=OS.U.cmp((a.del&&a.del.o)||'',(b.del&&b.del.o)||'');
    else if(k==='del')r=((a.del&&a.del.t)||0)-((b.del&&b.del.t)||0);
    if(!r)r=OS.U.cmp(FS.shown(a),FS.shown(b));
    return r*d;
   });
   return l;
  }
  /* ---------- 繪製 ---------- */
  function renderAll(){win.setTitle(title()+' - 檔案總管');renderSide();renderAddr();render();updBar();updNav()}
  function renderSide(){
   const row=(id,ico,label,drop)=>`<div class="xsi${loc===id&&!query?' cur':''}" data-go="${id}"${drop?` data-drop="${drop}"`:''} role="treeitem" tabindex="-1">${ico}<span>${esc(label)}</span></div>`;
   side.innerHTML=`<div class="xsh">快速存取</div>`+SIDE.map(([id,l])=>row(id,OS.fileIcon(FS.get(id),18),l,id)).join('')+`<div class="xsh">本機</div>`+
    row('pc',OS.sysIcon('pc',18),'本機')+row('root',OS.fileIcon(FS.get('root'),18),'本機磁碟 (C:)','root')+row('bin',OS.fileIcon(FS.get('bin'),18),'資源回收筒','bin');
  }
  function renderAddr(){
   if(addr.classList.contains('edit'))return;
   let segs=[];
   if(isPc())segs=[['pc','本機']];
   else if(isBin())segs=[['pc','本機'],['bin','資源回收筒']];
   else{segs.push(['pc','本機']);FS.chain(loc).forEach(n=>segs.push([n.id,n.id==='root'?'本機磁碟 (C:)':FS.dname(n)]))}
   addr.innerHTML=segs.map(([id,l],i)=>`${i?`<span class="xsep">${OS.ico('chevR',12)}</span>`:''}<button type="button" class="xseg" data-go="${id}" data-drop="${id==='pc'?'':id}">${esc(l)}</button>`).join('');
  }
  function updNav(){
   $('[data-n=back]',root).disabled=hi<=0;$('[data-n=fwd]',root).disabled=hi>=hist.length-1;$('[data-n=up]',root).disabled=!upTarget();
  }
  const fmt=n=>n.type==='dir'?'':OS.U.fmtSize(n.size||0).replace(' 位元組',' B');
  function thumbOk(n){return n.kind==='image'&&(n.size||0)<6e6}
  function itemHtml(n,v){
   const cut=OS.clip&&OS.clip.op==='cut'&&OS.clip.ids.includes(n.id)?' cut':'';
   const s=sel.has(n.id)?' sel':'';
   const drop=n.type==='dir'&&!isBin()?` data-drop="${n.id}"`:'';
   const nm=renaming===n.id?`<input class="xren" value="${esc(FS.shown(n))}" spellcheck="false" maxlength="120">`:`<span class="xnm">${esc(FS.shown(n))}</span>`;
   if(v==='details'){
    const base=`<div class="xi xr${s}${cut}" data-id="${n.id}"${drop} role="row"><span class="xn">${OS.fileIcon(n,20)}${nm}</span>`;
    if(isBin())return base+`<span class="xd">${esc(n.del?FS.dpath(n.del.o):'')}</span><span class="xd">${n.del?OS.U.fmtDate(n.del.t):''}</span><span class="xz">${fmt(n)}</span></div>`;
    return base+`<span class="xd">${OS.U.fmtDate(n.m)}</span><span class="xt">${query?esc(FS.dpath(n.p)):esc(FS.typeName(n))}</span><span class="xz">${fmt(n)}</span></div>`;
   }
   if(v==='list')return `<div class="xi xli${s}${cut}" data-id="${n.id}"${drop}>${OS.fileIcon(n,18)}${nm}</div>`;
   return `<div class="xi xg${s}${cut}" data-id="${n.id}"${drop}><span class="xgi">${thumbOk(n)?`<img class="xth" data-th="${n.id}" alt="">`:OS.fileIcon(n,56)}</span>${nm}</div>`;
  }
  let capCache=null;
  function pcHtml(){
   const st=FS.stats(),used=st.total;
   const cap=capCache||{q:64*1024**3,u:used,real:false};
   const pct=clamp(Math.max(cap.u,used)/cap.q*100,.6,100);
   const lib=SIDE.map(([id])=>FS.get(id));
   return `<div class="xpc-sec">資料夾 (${lib.length})</div><div class="xgrid">${lib.map(n=>`<div class="xi xg${sel.has(n.id)?' sel':''}" data-id="${n.id}" data-drop="${n.id}"><span class="xgi">${OS.fileIcon(n,56)}</span><span class="xnm">${esc(FS.dname(n))}</span></div>`).join('')}</div>
   <div class="xpc-sec">裝置和磁碟機 (1)</div><div class="xdrives"><div class="xi xdrive${sel.has('root')?' sel':''}" data-id="root" data-drop="root">${OS.fileIcon(FS.get('root'),52)}<div class="xdi"><b>本機磁碟 (C:)</b><div class="xbar"><i style="width:${pct}%"></i></div><small>${cap.real?'瀏覽器儲存空間':'模擬磁碟'}：已使用 ${OS.U.fmtSize(Math.max(cap.u,used))}，共 ${OS.U.fmtSize(cap.q)}</small></div></div></div>`;
  }
  function render(){
   const st=c.scrollTop;
   c.dataset.dropdir=(isPc()||isBin()&&false)?'':loc;
   if(isPc()){
    c.className='xpc xpc-pc';c.innerHTML=pcHtml();
    if(!capCache&&navigator.storage&&navigator.storage.estimate){
     navigator.storage.estimate().then(e=>{if(e&&e.quota){capCache={q:e.quota,u:e.usage||0,real:true};if(win.closing||!isPc())return;if(!renaming)render()}}).catch(()=>{});
    }
   }else{
    const l=items();
    sel=new Set([...sel].filter(id=>FS.get(id)));
    if(view==='details'){
     c.className='xpc xpc-d';
     const hs=(k,l,cl)=>`<span class="${cl}" data-sort="${k}">${l}${sortKey===k?`<em>${sortDir>0?'▲':'▼'}</em>`:''}</span>`;
     const head=isBin()?`<div class="xh">${hs('name','名稱','xn')}${hs('loc','原始位置','xd')}${hs('del','刪除日期','xd')}${hs('size','大小','xz')}</div>`:`<div class="xh">${hs('name','名稱','xn')}${hs('date','修改日期','xd')}${hs('type',query?'位置':'類型','xt')}${hs('size','大小','xz')}</div>`;
     c.innerHTML=head+l.map(n=>itemHtml(n,'details')).join('');
    }else{
     c.className='xpc '+(view==='list'?'xpc-l':'xpc-g');
     c.innerHTML=l.map(n=>itemHtml(n,view)).join('');
    }
    if(!l.length)c.insertAdjacentHTML('beforeend',`<div class="xemp">${query?'找不到符合的項目。':isBin()?'資源回收筒是空的。':'這個資料夾是空的。'}</div>`);
    $$('[data-th]',c).forEach(img=>FS.url(img.dataset.th).then(u=>{if(img.isConnected&&u)img.src=u}));
    if(renaming){const i=$('.xren',c);if(i){i.focus();const v=i.value,d=v.lastIndexOf('.'),n=FS.get(renaming);i.setSelectionRange(0,d>0&&n&&n.type==='file'?d:v.length);bindRename(i)}}
   }
   c.scrollTop=st;
   updStatus();
  }
  function updStatus(){
   const l=isPc()?[]:items();
   $('.xs1',root).textContent=isPc()?'2 個項目':l.length+' 個項目';
   const ids=[...sel].filter(id=>FS.get(id));
   const files=ids.filter(id=>FS.get(id).type==='file');
   $('.xs2',root).textContent=ids.length?`已選取 ${ids.length} 個項目`+(files.length===ids.length?'　'+OS.U.fmtSize(files.reduce((a,id)=>a+(FS.get(id).size||0),0)):''):'';
   $$('.xsv button',root).forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  }
  $('.xsv',root).innerHTML=[['details','details','詳細資料'],['large','grid','大圖示']].map(([v,i,t])=>`<button type="button" data-v="${v}" title="${t}" aria-label="${t}">${OS.ico(i,14)}</button>`).join('');
  $('.xsv',root).addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)setView(b.dataset.v)});
  function setView(v){view=v;S.view.explorer=v;OS.save();render()}
  /* ---------- 命令列 ---------- */
  function updBar(){
   const ids=[...sel].filter(id=>FS.get(id)),one=ids.length===1,fs=ids.filter(id=>!FS.locked(FS.get(id)));
   const B=(c,ico,tip,dis,txt)=>`<button type="button" class="xb xcmd" data-c="${c}" title="${tip}" aria-label="${tip}"${dis?' disabled':''}>${OS.ico(ico,16)}${txt?`<span>${txt}</span>`:''}</button>`;
   if(isPc()){bar.innerHTML=B('view','list2','檢視',false,'檢視')+'<span class="xvs"></span>'+B('props','info','內容',true);return}
   if(isBin()){
    bar.innerHTML=B('empty','trash','清空資源回收筒',!FS.allKids('bin').length,'清空資源回收筒')+B('restore','refresh2','還原選取的項目',!ids.length,'還原選取的項目')+B('restoreall','refresh2','還原所有項目',!FS.allKids('bin').length,'還原所有項目')+'<span class="xvs"></span>'+B('sort','sort','排序',false)+B('view','list2','檢視',false);
    return;
   }
   bar.innerHTML=`<button type="button" class="xb xcmd" data-c="new" title="新增"><span class="xplus">${OS.ico('plus',16)}</span><span>新增</span>${OS.ico('chevD',12)}</button><span class="xvs"></span>`+
    B('cut','cut','剪下 (Ctrl+X)',!fs.length)+B('copy','copy','複製 (Ctrl+C)',!ids.length)+B('paste','paste','貼上 (Ctrl+V)',!OS.canPaste()||isPc())+B('rename','edit','重新命名 (F2)',!(one&&!FS.locked(FS.get(ids[0]))))+B('del','trash','刪除 (Del)',!fs.length)+
    '<span class="xvs"></span>'+B('sort','sort','排序',false,'排序')+B('view','list2','檢視',false,'檢視')+'<span class="xvs"></span>'+B('import','upload','從實際電腦匯入檔案',false)+B('dl','download','下載到實際電腦',!(one&&FS.get(ids[0]).type==='file'&&FS.get(ids[0]).kind!=='app'))+B('props','info','內容 (Alt+Enter)',!one);
  }
  bar.addEventListener('click',e=>{
   const b=e.target.closest('.xcmd');if(!b||b.disabled)return;
   const k=b.dataset.c,ids=[...sel].filter(id=>FS.get(id));
   if(k==='new'){if(OS.menuRecentlyClosedBy(b))return;OS.menuAt(b,newItems())}
   else if(k==='cut')doCut();else if(k==='copy')doCopy();else if(k==='paste')doPaste();
   else if(k==='rename')startRename();else if(k==='del')doDelete(false);
   else if(k==='sort'){if(OS.menuRecentlyClosedBy(b))return;OS.menuAt(b,sortItems())}
   else if(k==='view'){if(OS.menuRecentlyClosedBy(b))return;OS.menuAt(b,viewItems())}
   else if(k==='import')$('.xfile',root).click();
   else if(k==='dl'){if(ids.length===1)FS.download(ids[0])}
   else if(k==='props'){if(ids.length===1)OS.props(ids[0])}
   else if(k==='empty')emptyBin();else if(k==='restore')restoreSel();else if(k==='restoreall')restoreAll();
  });
  const newItems=()=>[{label:'資料夾',ico:'folderplus',fn:()=>mkNew('folder')},{label:'文字文件',ico:'fileplus',fn:()=>mkNew('text')},{label:'青魚文件',ico:'fileplus',fn:()=>mkNew('doc')}];
  const sortItems=()=>{
   const ks=isBin()?[['name','名稱'],['loc','原始位置'],['del','刪除日期'],['size','大小']]:[['name','名稱'],['date','修改日期'],['type','類型'],['size','大小']];
   return ks.map(([k,l])=>({label:l,radio:1,on:sortKey===k,fn:()=>{sortKey=k;render()}})).concat([{sep:1},{label:'遞增',radio:1,on:sortDir>0,fn:()=>{sortDir=1;render()}},{label:'遞減',radio:1,on:sortDir<0,fn:()=>{sortDir=-1;render()}}]);
  };
  const viewItems=()=>[['details','詳細資料'],['list','清單'],['large','大圖示']].map(([v,l])=>({label:l,radio:1,on:view===v,fn:()=>setView(v)}));
  /* ---------- 動作 ---------- */
  const selIds=()=>[...sel].filter(id=>FS.get(id));
  function doCopy(){const ids=selIds();if(ids.length){OS.clipSet('copy',ids)}}
  function doCut(){const ids=selIds().filter(id=>!FS.locked(FS.get(id)));if(ids.length)OS.clipSet('cut',ids)}
  function doPaste(){
   if(isPc()||isBin()||!OS.canPaste())return;
   const out=OS.paste(loc);
   if(out.length){sel=new Set(out.map(n=>n.id));anchor=out[0].id;render();updBar()}
  }
  async function doDelete(perm){
   const ids=selIds().filter(id=>!FS.locked(FS.get(id)));
   if(!ids.length)return;
   const n=await OS.trashIds(ids,{perm,parent:win});
   if(n){sel=new Set();render();updBar()}
  }
  function mkNew(kind){
   if(isPc()||isBin())return;
   const n=OS.newItem(loc,kind);if(!n)return;
   sel=new Set([n.id]);anchor=n.id;renaming=n.id;render();
   const el=$(`[data-id="${n.id}"]`,c);if(el)el.scrollIntoView({block:'nearest'});
  }
  function startRename(){
   const ids=selIds();if(ids.length!==1||FS.locked(FS.get(ids[0]))||isPc())return;
   renaming=ids[0];render();
  }
  function bindRename(inp){
   let done=false;
   const finish=ok=>{
    if(done)return;done=true;
    const id=renaming;renaming=null;
    if(ok&&id){
     const n=FS.get(id);
     let v=inp.value.trim();
     if(n&&n.type==='file'&&n.kind==='app'&&v&&!/\.lnk$/i.test(v))v+='.lnk';
     if(n&&v!==n.name&&v){
      const old=FS.ext(n.name),nw=FS.ext(v);
      const doIt=()=>{const err=FS.rename(id,v);if(err)return win.alert(err,{title:'重新命名',kind:'err'}).then(()=>{renaming=id;render()});render();return null};
      if(n.type==='file'&&old!==nw&&old){
       win.confirm('如果變更副檔名，檔案可能會無法使用。確定要變更嗎？',{title:'重新命名',ok:'是',cancel:'否'}).then(y=>{if(y)doIt();else render()});
       return;
      }
      doIt();return;
     }
    }
    render();if(pendingRefresh){pendingRefresh=false;refresh()}
   };
   inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}});
   inp.addEventListener('blur',()=>finish(true));
   inp.addEventListener('pointerdown',e=>e.stopPropagation());
   inp.addEventListener('dblclick',e=>e.stopPropagation());
  }
  async function emptyBin(){
   if(!FS.allKids('bin').length)return;
   if(await win.confirm('要永久刪除資源回收筒中的所有項目嗎？這個動作無法復原。',{title:'清空資源回收筒',ok:'清空',danger:true})){FS.emptyBin();OS.sfx('trash')}
  }
  function restoreSel(){const ids=selIds().filter(id=>FS.get(id).p==='bin');if(ids.length){FS.restore(ids);sel=new Set()}}
  function restoreAll(){FS.restore(FS.allKids('bin').map(n=>n.id));sel=new Set()}
  function openId(id){
   const n=FS.get(id);if(!n)return;
   if(n.type==='dir'){nav(id);return}
   if(isBin()){win.alert('無法開啟資源回收筒中的項目。請先將它還原，再開啟。',{title:'資源回收筒'});return}
   OS.openNode(id);
  }
  async function doImport(files){
   if(isPc()||isBin()||!files.length){if(isPc()||isBin())OS.toast('請先開啟一個資料夾再匯入檔案');return}
   const r=await FS.importFiles(files,loc);
   if(r.nodes.length)sel=new Set(r.nodes.map(n=>n.id));
   OS.toast(r.fail?`已匯入 ${r.ok} 個檔案，${r.fail} 個失敗`:`已匯入 ${r.ok} 個檔案`);
  }
  $('.xfile',root).addEventListener('change',e=>{const f=[...e.target.files];e.target.value='';doImport(f)});
  c.addEventListener('dragover',e=>{if(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';c.classList.add('dropok')}});
  c.addEventListener('dragleave',()=>c.classList.remove('dropok'));
  c.addEventListener('drop',e=>{c.classList.remove('dropok');if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault();doImport([...e.dataTransfer.files])}});
  /* ---------- 選取與滑鼠操作 ---------- */
  function setSel(ids,keepAnchor){
   sel=new Set(ids);if(!keepAnchor){anc0=null}if(!keepAnchor)anchor=ids.length?ids[ids.length-1]:null;
   $$('.xi',c).forEach(el=>el.classList.toggle('sel',sel.has(el.dataset.id)));
   updStatus();updBar();
  }
  const order=()=>$$('.xi',c).map(e=>e.dataset.id);
  c.addEventListener('pointerdown',e=>{
   anc0=null;
   if(e.target.closest('input'))return;
   if(e.target.closest('.xh'))return;
   const el=e.target.closest('.xi'),id=el&&el.dataset.id;
   if(e.button===2){if(el){if(!sel.has(id))setSel([id])}else if(!(e.ctrlKey))setSel([]);return}
   if(e.button!==0)return;
   if(!el){
    if(!(e.ctrlKey||e.metaKey))setSel([]);
    OS.rubber(e,{items:()=>$$('.xi',c).map(x=>({k:x.dataset.id,el:x})),base:sel,onChange:s=>setSel([...s],true)});
    return;
   }
   const ctrl=e.ctrlKey||e.metaKey,shift=e.shiftKey,was=sel.has(id);
   if(shift&&anchor){
    const o=order(),a=o.indexOf(anchor),b=o.indexOf(id);
    if(a>=0&&b>=0){const [x,y]=a<b?[a,b]:[b,a];setSel(o.slice(x,y+1),true)}
   }else if(ctrl){const s=new Set(sel);if(was)s.delete(id);else s.add(id);setSel([...s]);anchor=id;if(was)return}
   else if(!was)setSel([id]);
   else anchor=id;
   if(shift)return;
   const ids=selIds(),prim=FS.get(id);
   const dragIds=(isPc())?[]:ids.filter(i=>!FS.locked(FS.get(i)));
   OS.dnd.start(e,dragIds,{from:'explorer',count:ids.length,label:prim?FS.shown(prim):'',html:el.querySelector('svg.fi,.lnk')?el.querySelector('svg.fi,.lnk').outerHTML:'',
    onClick:()=>{
     if(!ctrl&&sel.size>1)setSel([id]);
     const now=Date.now();
     if(lastClick.id===id&&now-lastClick.t<OS.dblMs()){lastClick={id:null,t:0};openId(id)}else lastClick={id,t:now};
    }});
  });
  c.addEventListener('click',e=>{
   const h=e.target.closest('[data-sort]');
   if(h){const k=h.dataset.sort;if(sortKey===k)sortDir=-sortDir;else{sortKey=k;sortDir=1}render()}
  });
  c.addEventListener('contextmenu',e=>{
   e.preventDefault();
   if(e.target.closest('.xren'))return;
   const el=e.target.closest('.xi');
   if(el){const id=el.dataset.id;if(!sel.has(id))setSel([id]);itemMenu(e.clientX,e.clientY)}
   else bgMenu(e.clientX,e.clientY);
  });
  function itemMenu(x,y){
   const ids=selIds(),one=ids.length===1,n=one?FS.get(ids[0]):null;
   const locked=ids.some(i=>FS.locked(FS.get(i)));
   let m;
   if(isBin()){
    m=[{label:'還原',ico:'refresh2',fn:restoreSel},{sep:1},{label:'刪除',ico:'trash',danger:true,fn:()=>doDelete(true)},{label:'內容',dis:!one,fn:()=>OS.props(ids[0])}];
   }else if(isPc()){
    m=[{label:'開啟',dis:!one,fn:()=>openId(ids[0])},{label:'在新視窗中開啟',dis:!one,fn:()=>OS.open('explorer',{path:ids[0]})},{sep:1},{label:'內容',dis:!one,fn:()=>OS.props(ids[0])}];
   }else{
    m=[{label:'開啟',dis:!one,fn:()=>openId(ids[0])},
     one&&n.type==='dir'?{label:'在新視窗中開啟',fn:()=>OS.open('explorer',{path:n.id})}:null,
     one&&n.type==='file'&&n.kind==='text'?{label:'用記事本編輯',fn:()=>OS.open('notepad',{id:n.id})}:null,
     one&&n.type==='file'&&(n.kind==='text'||n.kind==='doc')?{label:'用青魚文書開啟',fn:()=>OS.open('writer',{id:n.id})}:null,
     one&&n.type==='file'&&n.kind==='image'?{label:'設為桌面背景',ico:'image',fn:()=>OS.setWallFromNode(n.id)}:null,
     one&&n.type==='file'&&n.kind!=='app'?{label:'下載到實際電腦',ico:'download',fn:()=>FS.download(n.id)}:null,
     one&&n.type==='dir'?{label:'在此開啟終端機',fn:()=>OS.open('terminal',{cwd:n.id})}:null,
     {sep:1},{label:'剪下',ico:'cut',kbd:'Ctrl+X',dis:locked,fn:doCut},{label:'複製',ico:'copy',kbd:'Ctrl+C',fn:doCopy},
     {sep:1},{label:'刪除',ico:'trash',kbd:'Del',dis:locked,fn:()=>doDelete(false)},{label:'重新命名',ico:'edit',kbd:'F2',dis:!one||locked,fn:startRename},
     {sep:1},{label:'內容',kbd:'Alt+Enter',dis:!one,fn:()=>OS.props(ids[0])}];
   }
   OS.menu(m,x,y);
  }
  function bgMenu(x,y){
   if(isPc()){OS.menu([{label:'重新整理',ico:'refresh',fn:refresh}],x,y);return}
   if(isBin()){OS.menu([{label:'清空資源回收筒',ico:'trash',dis:!FS.allKids('bin').length,fn:emptyBin},{label:'還原所有項目',dis:!FS.allKids('bin').length,fn:restoreAll},{sep:1},{label:'重新整理',ico:'refresh',fn:refresh}],x,y);return}
   OS.menu([{label:'檢視',sub:viewItems},{label:'排序方式',sub:sortItems},{label:'重新整理',ico:'refresh',fn:refresh},{sep:1},
    {label:'貼上',ico:'paste',kbd:'Ctrl+V',dis:!OS.canPaste(),fn:doPaste},{sep:1},{label:'新增',sub:newItems},{sep:1},
    {label:'從實際電腦匯入檔案…',ico:'upload',fn:()=>$('.xfile',root).click()},
    {label:'在此開啟終端機',fn:()=>OS.open('terminal',{cwd:loc})},{label:'內容',dis:isPc(),fn:()=>OS.props(loc)}],x,y);
  }
  /* ---------- 側邊欄、導覽按鈕、網址列 ---------- */
  side.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)nav(b.dataset.go)});
  side.addEventListener('contextmenu',e=>{
   e.preventDefault();const b=e.target.closest('[data-go]');if(!b)return;
   const id=b.dataset.go;
   OS.menu([{label:'開啟',fn:()=>nav(id)},{label:'在新視窗中開啟',fn:()=>OS.open('explorer',{path:id})}],e.clientX,e.clientY);
  });
  $('.xpnav',root).addEventListener('click',e=>{
   const b=e.target.closest('[data-n]');
   if(b){
    const k=b.dataset.n;
    if(k==='back'&&hi>0){hi--;nav(hist[hi],false)}
    else if(k==='fwd'&&hi<hist.length-1){hi++;nav(hist[hi],false)}
    else if(k==='up'){const t=upTarget();if(t)nav(t)}
    else if(k==='ref')refresh();
    return;
   }
   const g=e.target.closest('.xseg');if(g)nav(g.dataset.go);
  });
  addr.addEventListener('click',e=>{if(e.target.closest('.xseg'))return;editAddr()});
  addr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='F4'){e.preventDefault();editAddr()}});
  function editAddr(){
   if(addr.classList.contains('edit'))return;
   addr.classList.add('edit');
   const cur=isPc()?'':isBin()?'C:\\$Recycle.Bin':FS.path(loc);
   addr.innerHTML=`<input type="text" value="${esc(cur)}" spellcheck="false" aria-label="位址">`;
   const i=$('input',addr);i.focus();i.select();
   let done=false;
   const fin=ok=>{
    if(done)return;done=true;addr.classList.remove('edit');
    const v=i.value.trim();
    renderAddr();
    if(!ok||!v)return;
    if(/^(本機|this pc|pc)$/i.test(v)){nav('pc');return}
    if(/^(資源回收筒|recycle bin)$/i.test(v)){nav('bin');return}
    const n=FS.parse(v,isPc()||isBin()?'home':loc);
    if(!n){win.alert(`找不到「${v}」。請檢查拼字，然後再試一次。`,{title:'檔案總管',kind:'err'});return}
    if(n.type==='dir')nav(n.id);else OS.openNode(n.id);
   };
   i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();fin(true)}else if(e.key==='Escape'){e.preventDefault();fin(false);addr.focus()}});
   i.addEventListener('blur',()=>fin(false));
  }
  let st=0;
  sInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{query=sInp.value.trim();sel=new Set();renderAll()},140)});
  sInp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){sInp.value='';query='';sel=new Set();renderAll();c.focus()}else if(e.key==='ArrowDown'){e.preventDefault();const f=order()[0];if(f){setSel([f]);c.focus()}}});
  function refresh(){
   if(renaming){pendingRefresh=true;return}
   if(!valid(loc)){
    // 目前資料夾已被刪除：回到最近的上層
    let t='home';hist=hist.filter(h=>valid(h));hi=Math.min(hi,hist.length-1);loc=t;nav(t);return;
   }
   renderAll();
  }
  win.on('fs',()=>{if(renaming){pendingRefresh=true;return}refresh()});
  win.on('clip',()=>{if(!renaming){render();updBar()}});
  win.on('look',()=>{renderSide()});
  /* ---------- 鍵盤 ---------- */
  function moveSel(dir,ext){
   const els=$$('.xi',c);if(!els.length)return;
   let cur=anchor&&els.find(e=>e.dataset.id===anchor);
   if(!cur){setSel([els[0].dataset.id]);els[0].scrollIntoView({block:'nearest'});return}
   const r=cur.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   let best=null,bd=1e9;
   els.forEach(e=>{
    if(e===cur)return;const q=e.getBoundingClientRect(),qx=q.left+q.width/2,qy=q.top+q.height/2;
    let ok=false,d=0;
    if(dir==='down'){ok=qy>cy+4;d=(qy-cy)*3+Math.abs(qx-cx)}
    else if(dir==='up'){ok=qy<cy-4;d=(cy-qy)*3+Math.abs(qx-cx)}
    else if(dir==='right'){ok=qx>cx+4&&Math.abs(qy-cy)<r.height/2+2;d=(qx-cx)+Math.abs(qy-cy)*3}
    else{ok=qx<cx-4&&Math.abs(qy-cy)<r.height/2+2;d=(cx-qx)+Math.abs(qy-cy)*3}
    if(ok&&d<bd){bd=d;best=e}
   });
   if(!best)return;
   const id=best.dataset.id;
   if(ext){if(!anc0)anc0=anchor;const o=order(),a=o.indexOf(anchor0()),b=o.indexOf(id);const [x,y]=a<b?[a,b]:[b,a];sel=new Set(o.slice(x,y+1));setSel([...sel],true);anchor=id}
   else setSel([id]);
   best.scrollIntoView({block:'nearest'});
  }
  const anchor0=()=>anc0||anchor;
  win.key(e=>{
   if(U_typing(e.target)&&!e.target.classList.contains('xpc'))return;
   const k=e.key,ctrl=e.ctrlKey||e.metaKey,lk=k.toLowerCase();
   if(ctrl&&lk==='a'){e.preventDefault();setSel(order())}
   else if(ctrl&&lk==='c'){e.preventDefault();doCopy()}
   else if(ctrl&&lk==='x'){e.preventDefault();doCut()}
   else if(ctrl&&lk==='v'){e.preventDefault();doPaste()}
   else if(ctrl&&e.shiftKey&&lk==='n'){e.preventDefault();mkNew('folder')}
   else if(ctrl&&lk==='f'||k==='F3'){e.preventDefault();sInp.focus();sInp.select()}
   else if(ctrl&&lk==='l'||(e.altKey&&lk==='d')){e.preventDefault();editAddr()}
   else if(k==='F5'){e.preventDefault();refresh()}
   else if(k==='F2'){e.preventDefault();startRename()}
   else if(k==='Delete'){e.preventDefault();doDelete(e.shiftKey)}
   else if(k==='Enter'&&e.altKey){e.preventDefault();const ids=selIds();if(ids.length===1)OS.props(ids[0])}
   else if(k==='Enter'){e.preventDefault();const ids=selIds();if(ids.length===1)openId(ids[0]);else ids.filter(i=>FS.get(i).type==='file').forEach(i=>openId(i))}
   else if(k==='Backspace'||(e.altKey&&k==='ArrowLeft')){e.preventDefault();if(hi>0){hi--;nav(hist[hi],false)}}
   else if(e.altKey&&k==='ArrowRight'){e.preventDefault();if(hi<hist.length-1){hi++;nav(hist[hi],false)}}
   else if(e.altKey&&k==='ArrowUp'){e.preventDefault();const t=upTarget();if(t)nav(t)}
   else if(k==='Escape'){if(query){sInp.value='';query='';renderAll()}else setSel([])}
   else if(k==='ArrowDown'||k==='ArrowUp'||k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();moveSel(k.slice(5).toLowerCase(),e.shiftKey)}
   else if(k==='Home'||k==='End'){e.preventDefault();const o=order();if(o.length)setSel([k==='Home'?o[0]:o[o.length-1]]);const el=$(`[data-id="${[...sel][0]}"]`,c);if(el)el.scrollIntoView({block:'nearest'})}
   else if(k.length===1&&!ctrl&&!e.altKey){
    const now=Date.now();typeBuf=(now-typeT>900?'':typeBuf)+k.toLowerCase();typeT=now;
    const o=items().concat(isPc()?[]:[]).find(n=>FS.shown(n).toLowerCase().startsWith(typeBuf));
    if(o){setSel([o.id]);const el=$(`[data-id="${o.id}"]`,c);if(el)el.scrollIntoView({block:'nearest'})}
   }
  });
  const U_typing=OS.U.isTyping;
  /* ---------- 啟動 ---------- */
  const start=args&&args.path?args.path:'home';
  hist=[];hi=-1;
  nav(valid(start)?start:'home');
  if(args&&args.select&&FS.get(args.select)){sel=new Set([args.select]);anchor=args.select;render()}
  return {
   onArgs(a){if(a&&a.path){nav(valid(a.path)?a.path:'home')}},
   focusEl:()=>c,
   onFocus(){},
   isDirty:()=>false
  };
 }
});
})();
