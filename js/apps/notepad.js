/* 青魚電腦 — 記事本 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>';
OS.register({id:'notepad',name:'記事本',kw:'notepad text editor 記事本 文字 編輯器 筆記 txt',
 g:'linear-gradient(145deg,#f4c95d,#d88a2b)',s:ICON,w:720,h:500,minW:360,minH:260,
 key:a=>a&&a.id?a.id:null,
 create(win,args){
  const P=Object.assign({wrap:true,fs:15,status:true,mono:false},S.view.notepad||{});
  const root=document.createElement('div');root.className='np';win.body.appendChild(root);
  let doc={id:null,name:'未命名.txt',dirty:false},ver=0,findMode=null;
  const mb=OS.menubar(root,[
   {label:'檔案',items:()=>[{label:'新增',kbd:'Ctrl+N',fn:()=>OS.open('notepad')},{label:'開啟…',ico:'folderplus',kbd:'Ctrl+O',fn:openDlg},{sep:1},{label:'儲存',ico:'save',kbd:'Ctrl+S',fn:()=>save(false)},{label:'另存新檔…',kbd:'Ctrl+Shift+S',fn:()=>save(true)},{sep:1},{label:'列印…',ico:'print',kbd:'Ctrl+P',fn:()=>doPrint()},{sep:1},{label:'結束',fn:()=>win.close()}]},
   {label:'編輯',items:()=>[{label:'復原',ico:'undo',kbd:'Ctrl+Z',fn:()=>cmd('undo')},{label:'取消復原',ico:'redo',kbd:'Ctrl+Y',fn:()=>cmd('redo')},{sep:1},{label:'剪下',ico:'cut',kbd:'Ctrl+X',fn:()=>cmd('cut')},{label:'複製',ico:'copy',kbd:'Ctrl+C',fn:()=>cmd('copy')},{label:'貼上',ico:'paste',kbd:'Ctrl+V',fn:pasteClip},{label:'刪除',kbd:'Del',fn:()=>cmd('delete')},{sep:1},{label:'尋找…',ico:'search',kbd:'Ctrl+F',fn:()=>openFind('find')},{label:'取代…',kbd:'Ctrl+H',fn:()=>openFind('replace')},{label:'移至行…',kbd:'Ctrl+G',fn:gotoLine},{sep:1},{label:'全選',kbd:'Ctrl+A',fn:()=>{ta.focus();ta.select()}},{label:'時間/日期',kbd:'F5',fn:insDate}]},
   {label:'格式',items:()=>[{label:'自動換行',chk:P.wrap,fn:()=>{P.wrap=!P.wrap;pref();applyFmt()}},{label:'字型大小',sub:()=>[12,14,15,16,18,20,24,32].map(n=>({label:n+' pt',radio:1,on:P.fs===n,fn:()=>{P.fs=n;pref();applyFmt()}}))},{label:'字型',sub:()=>[{label:'等寬字型',radio:1,on:P.mono,fn:()=>{P.mono=true;pref();applyFmt()}},{label:'系統字型',radio:1,on:!P.mono,fn:()=>{P.mono=false;pref();applyFmt()}}]}]},
   {label:'檢視',items:()=>[{label:'放大',kbd:'Ctrl++',fn:()=>zoom(1)},{label:'縮小',kbd:'Ctrl+-',fn:()=>zoom(-1)},{label:'還原預設縮放',kbd:'Ctrl+0',fn:()=>{P.fs=15;pref();applyFmt()}},{sep:1},{label:'狀態列',chk:P.status,fn:()=>{P.status=!P.status;pref();applyFmt()}}]}
  ]);
  root.insertAdjacentHTML('beforeend',`<div class="npf" hidden><div class="npfr"><input class="inp nf1" placeholder="尋找" aria-label="尋找" spellcheck="false" autocomplete="off"><button type="button" class="btn nfp">上一個</button><button type="button" class="btn nfn">下一個</button><label class="nfc"><input type="checkbox" class="nfcs"> 區分大小寫</label><span class="nfm"></span><button type="button" class="ab nfx" aria-label="關閉">${OS.ico('close',14)}</button></div><div class="npfr nfrep"><input class="inp nf2" placeholder="取代為" aria-label="取代為" spellcheck="false" autocomplete="off"><button type="button" class="btn nfr1">取代</button><button type="button" class="btn nfra">全部取代</button></div></div><textarea class="npt" spellcheck="false" aria-label="文字編輯區" autocomplete="off"></textarea><div class="nps"><span class="npp">第 1 行，第 1 欄</span><span class="npc">0 個字元</span><span class="npz">100%</span><span>UTF-8</span></div>`);
  const ta=$('.npt',root),fbar=$('.npf',root),f1=$('.nf1',root),f2=$('.nf2',root),fm=$('.nfm',root),st=$('.nps',root);
  function pref(){S.view.notepad={wrap:P.wrap,fs:P.fs,status:P.status,mono:P.mono};OS.save()}
  function applyFmt(){
   ta.style.fontSize=P.fs+'px';ta.wrap=P.wrap?'soft':'off';ta.classList.toggle('mono',P.mono);ta.style.whiteSpace=P.wrap?'':'pre';
   st.style.display=P.status?'':'none';$('.npz',root).textContent=Math.round(P.fs/15*100)+'%';
  }
  function zoom(d){P.fs=clamp(P.fs+d*(P.fs>=24?4:P.fs>=16?2:1),8,48);pref();applyFmt()}
  const dispName=()=>doc.name;
  function title(){win.setTitle((doc.dirty?'*':'')+dispName()+' - 記事本');win.setDirty(doc.dirty)}
  function stat(){
   const v=ta.value,p=ta.selectionStart,before=v.slice(0,p),ln=before.split('\n').length,col=p-before.lastIndexOf('\n');
   $('.npp',root).textContent=`第 ${ln} 行，第 ${col} 欄`;
   $('.npc',root).textContent=v.length+' 個字元';
  }
  function setDirty(d){if(doc.dirty!==d){doc.dirty=d;title()}}
  ta.addEventListener('input',()=>{setDirty(true);stat();if(findMode)updFindCount()});
  ['keyup','click','select','focus'].forEach(t=>ta.addEventListener(t,stat));
  ta.addEventListener('keydown',e=>{
   if(e.key==='Tab'&&!e.ctrlKey&&!e.altKey&&!e.shiftKey){e.preventDefault();document.execCommand('insertText',false,'\t')}
  });
  ta.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();zoom(e.deltaY<0?1:-1)}},{passive:false});
  function cmd(c){ta.focus();try{document.execCommand(c)}catch(e){}stat()}
  async function pasteClip(){
   ta.focus();
   try{const t=await navigator.clipboard.readText();if(t)document.execCommand('insertText',false,t)}
   catch(e){OS.toast('無法讀取剪貼簿，請改用 Ctrl+V 貼上')}
   stat();
  }
  function insDate(){ta.focus();document.execCommand('insertText',false,OS.fmtTime(new Date())+' '+OS.fmtDateShort(new Date()));stat()}
  async function gotoLine(){
   const v=await win.prompt({title:'移至行',msg:'行號：',value:'1',type:'number',validate:x=>/^\d+$/.test(x.trim())&&+x>0?'':'請輸入有效的行號。'});
   if(v==null)return;
   const lines=ta.value.split('\n'),n=Math.min(+v,lines.length);
   let pos=0;for(let i=0;i<n-1;i++)pos+=lines[i].length+1;
   ta.focus();ta.setSelectionRange(pos,pos);reveal(pos);stat();
  }
  function reveal(pos,end){ // 讓選取範圍捲動到可見處
   const was=ta.selectionStart,wend=ta.selectionEnd;
   ta.blur();ta.focus();ta.setSelectionRange(pos,end==null?pos:end);
  }
  /* ---- 尋找與取代 ---- */
  function openFind(mode){
   findMode=mode;fbar.hidden=false;$('.nfrep',root).hidden=mode!=='replace';
   const sel=ta.value.slice(ta.selectionStart,ta.selectionEnd);
   if(sel&&!sel.includes('\n'))f1.value=sel;
   f1.focus();f1.select();updFindCount();
  }
  function closeFind(){findMode=null;fbar.hidden=true;fm.textContent='';ta.focus()}
  const cs=()=>$('.nfcs',root).checked;
  function hay(){return cs()?ta.value:ta.value.toLowerCase()}
  function needle(){return cs()?f1.value:f1.value.toLowerCase()}
  function updFindCount(){
   const n=needle();if(!n){fm.textContent='';return}
   const h=hay();let c=0,i=-1;while((i=h.indexOf(n,i+1))>=0&&c<99999)c++;
   fm.textContent=c?c+' 個符合':'找不到';fm.classList.toggle('bad',!c);
  }
  function findNext(back,keepFocus){
   const n=needle();if(!n){f1.focus();return false}
   const h=hay();let i;
   if(back){i=h.lastIndexOf(n,Math.max(0,ta.selectionStart-1));if(i<0||(i===ta.selectionStart&&ta.selectionStart===0))i=h.lastIndexOf(n)}
   else{i=h.indexOf(n,ta.selectionEnd);if(i<0)i=h.indexOf(n)}
   if(i<0){fm.textContent='找不到';fm.classList.add('bad');return false}
   ta.focus();ta.setSelectionRange(i,i+n.length);
   if(keepFocus!==false){f1.focus()}
   stat();return true;
  }
  function replaceOne(){
   const n=needle();if(!n)return;
   const s=ta.value.slice(ta.selectionStart,ta.selectionEnd);
   if((cs()?s:s.toLowerCase())===n){
    ta.focus();ta.setSelectionRange(ta.selectionStart,ta.selectionEnd);document.execCommand('insertText',false,f2.value);setDirty(true);
   }
   findNext(false);updFindCount();
  }
  function replaceAll(){
   const n=f1.value;if(!n)return;
   const h=hay(),nn=needle();let out='',i=0,c=0,j;
   while((j=h.indexOf(nn,i))>=0){out+=ta.value.slice(i,j)+f2.value;i=j+nn.length;c++}
   if(!c){fm.textContent='找不到';return}
   out+=ta.value.slice(i);
   ta.focus();ta.select();document.execCommand('insertText',false,out);setDirty(true);
   fm.textContent='已取代 '+c+' 處';fm.classList.remove('bad');
  }
  $('.nfn',root).addEventListener('click',()=>findNext(false));
  $('.nfp',root).addEventListener('click',()=>findNext(true));
  $('.nfx',root).addEventListener('click',closeFind);
  $('.nfr1',root).addEventListener('click',replaceOne);
  $('.nfra',root).addEventListener('click',replaceAll);
  $('.nfcs',root).addEventListener('change',updFindCount);
  f1.addEventListener('input',updFindCount);
  fbar.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeFind()}
   else if(e.key==='Enter'&&e.target===f1){e.preventDefault();findNext(e.shiftKey)}
   else if(e.key==='Enter'&&e.target===f2){e.preventDefault();replaceOne()}
  });
  /* ---- 檔案操作 ---- */
  async function load(id){
   const n=FS.get(id);if(!n||n.type!=='file')return false;
   const t=await FS.readText(id);
   if(win.closing)return false;
   ta.value=t==null?'':t;doc={id,name:n.name,dirty:false};win.dk=id;
   ta.setSelectionRange(0,0);ta.scrollTop=0;title();stat();return true;
  }
  async function openDlg(){
   if(!await askSave())return;
   const r=await OS.fileDialog({parent:win,mode:'open',kinds:['text'],start:doc.id&&FS.get(doc.id)?FS.get(doc.id).p:undefined});
   if(r&&r.id){
    const ex=WMfind(r.id);if(ex&&ex!==win){OS.WM.focus(ex);return}
    await load(r.id);
   }
  }
  const WMfind=id=>OS.WM.list.find(w=>w.app==='notepad'&&w.dk===id&&!w.closing);
  async function save(as){
   let n=doc.id?FS.get(doc.id):null;
   if(n&&FS.inBin(n))n=null;
   if(!as&&n){
    if(n.type==='file'){FS.writeText(n.id,ta.value);doc.name=n.name;setDirty(false);title();return true}
   }
   const r=await OS.fileDialog({parent:win,mode:'save',kinds:['text'],defExt:'txt',name:n?n.name:doc.name,start:n?n.p:undefined});
   if(!r)return false;
   try{
    let id=r.id;
    if(id)FS.writeText(id,ta.value);
    else id=FS.create({parent:r.dir,name:r.name,text:ta.value,kind:'text'}).id;
    doc={id,name:FS.get(id).name,dirty:false};win.dk=id;title();
    OS.toast('已儲存「'+doc.name+'」');return true;
   }catch(e){await win.alert(e.message||'無法儲存檔案。',{title:'記事本',kind:'err'});return false}
  }
  async function askSave(){
   if(!doc.dirty)return true;
   const r=await win.dialog({title:'記事本',body:`<p class="dmsg">要儲存對「${esc(doc.name)}」所做的變更嗎？</p>`,buttons:[{id:'save',label:'儲存',primary:true},{id:'no',label:'不儲存'},{id:'cancel',label:'取消'}]});
   if(r==='save')return await save(false);
   return r==='no';
  }
  function doPrint(){
   const w=window.open('','_blank');if(!w){OS.toast('瀏覽器擋住了列印視窗');return}
   w.document.write('<pre style="white-space:pre-wrap;font:14px/1.5 monospace">'+esc(ta.value)+'</pre>');w.document.close();w.focus();setTimeout(()=>w.print(),200);
  }
  win.key(e=>{
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(ctrl&&k==='s'){e.preventDefault();save(e.shiftKey)}
   else if(ctrl&&k==='o'){e.preventDefault();openDlg()}
   else if(ctrl&&k==='n'&&!e.shiftKey){e.preventDefault();OS.open('notepad')}
   else if(ctrl&&k==='f'){e.preventDefault();openFind('find')}
   else if(ctrl&&k==='h'){e.preventDefault();openFind('replace')}
   else if(ctrl&&k==='g'){e.preventDefault();gotoLine()}
   else if(ctrl&&k==='p'){e.preventDefault();doPrint()}
   else if(ctrl&&(k==='='||k==='+')){e.preventDefault();zoom(1)}
   else if(ctrl&&k==='-'){e.preventDefault();zoom(-1)}
   else if(ctrl&&k==='0'){e.preventDefault();P.fs=15;pref();applyFmt()}
   else if(e.key==='F5'){e.preventDefault();insDate()}
   else if(e.key==='F3'){e.preventDefault();if(f1.value)findNext(e.shiftKey,false);else openFind('find')}
  });
  applyFmt();title();stat();
  if(args&&args.id&&FS.get(args.id))load(args.id);
  else if(args&&typeof args.text==='string'){ta.value=args.text;stat()}
  return {
   focusEl:()=>ta,
   isDirty:()=>doc.dirty,
   canClose:async()=>{mb.close();return await askSave()},
   onArgs(a){if(a&&a.id&&!doc.dirty&&a.id!==doc.id)load(a.id)}
  };
 }
});
})();
