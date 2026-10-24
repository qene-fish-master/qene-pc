/* 青魚電腦 — 虛擬檔案系統（資料存在瀏覽器 IndexedDB） */
(function(){
'use strict';
const OS=window.OS,{uid,cmp}=OS.U;
const DB={db:null,mem:false,m:{kv:new Map(),blobs:new Map()}};
DB.open=()=>new Promise(res=>{
 try{
  const q=indexedDB.open('qene-pc',1);
  q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('blobs'))d.createObjectStore('blobs')};
  q.onsuccess=()=>{DB.db=q.result;DB.db.onversionchange=()=>{try{DB.db.close()}catch(e){}DB.db=null;DB.mem=true};res()};
  q.onerror=q.onblocked=()=>{DB.mem=true;res()};
 }catch(e){DB.mem=true;res()}
});
DB.get=(store,key)=>new Promise(res=>{
 if(!DB.db)return res(DB.m[store].has(key)?DB.m[store].get(key):null);
 try{const t=DB.db.transaction(store,'readonly'),r=t.objectStore(store).get(key);t.oncomplete=()=>res(r.result===undefined?null:r.result);t.onerror=t.onabort=()=>res(null)}catch(e){res(null)}
});
DB.put=(store,key,val)=>new Promise(res=>{
 if(!DB.db){DB.m[store].set(key,val);return res(true)}
 try{const t=DB.db.transaction(store,'readwrite');t.objectStore(store).put(val,key);t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>res(false)}catch(e){res(false)}
});
DB.del=(store,key)=>new Promise(res=>{
 if(!DB.db){DB.m[store].delete(key);return res(true)}
 try{const t=DB.db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>res(false)}catch(e){res(false)}
});
DB.clear=store=>new Promise(res=>{
 if(!DB.db){DB.m[store].clear();return res(true)}
 try{const t=DB.db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>res(false)}catch(e){res(false)}
});
OS.DB=DB;

const FS=OS.FS={nodes:{},ready:false,bc:new Map(),urls:new Map()};
const nodes=()=>FS.nodes;
const BAD=/[\\/:*?"<>|]/;
const EXT={
 text:'txt md json csv log js css html htm xml ini cfg yml yaml ts py c cpp h java sh bat tsv rtf'.split(' '),
 image:'png jpg jpeg gif webp bmp svg ico avif'.split(' '),
 video:'mp4 webm mov mkv ogv m4v'.split(' '),
 audio:'mp3 wav ogg m4a flac aac oga opus'.split(' ')
};
FS.DN={desktop:'桌面',documents:'文件',pictures:'圖片',downloads:'下載',music:'音樂',videos:'影片',bin:'資源回收筒',users:'使用者',root:'本機 (C:)'};
const ALIAS={'資源回收筒':'資源回收筒'};
FS.ext=name=>{const i=String(name).lastIndexOf('.');return i>0?name.slice(i+1).toLowerCase():''};
FS.kindOf=(name,mime)=>{
 const e=FS.ext(name);
 if(e==='lnk')return 'app';
 for(const k in EXT)if(EXT[k].includes(e))return k;
 mime=mime||'';
 if(mime.startsWith('image/'))return 'image';
 if(mime.startsWith('video/'))return 'video';
 if(mime.startsWith('audio/'))return 'audio';
 if(mime.startsWith('text/'))return 'text';
 return 'other';
};
FS.KIND={dir:'檔案資料夾',text:'文字文件',image:'影像檔案',video:'影片檔案',audio:'音訊檔案',app:'捷徑',other:'檔案'};
FS.typeName=n=>{
 if(n.type==='dir')return n.sys==='root'?'本機磁碟':'檔案資料夾';
 const e=FS.ext(n.name).toUpperCase();
 if(n.kind==='app')return '捷徑';
 return e?(e+' 檔案'):(FS.KIND[n.kind]||'檔案');
};
FS.get=id=>nodes()[id]||null;
FS.isDir=n=>!!n&&n.type==='dir';
FS.locked=n=>!n||!!n.sys;
FS.byteLen=s=>{try{return new TextEncoder().encode(s).length}catch(e){return s.length}};
FS.shown=n=>{if(!n)return '';if(n.type==='file'&&n.kind==='app')return n.name.replace(/\.lnk$/i,'');return FS.dname(n)};
FS.dname=n=>{if(!n)return '';if(n.sys&&FS.DN[n.sys])return FS.DN[n.sys];return n.name};
const idx=()=>{
 if(FS._ix)return FS._ix;const m=new Map();
 for(const id in nodes()){const n=nodes()[id];if(!m.has(n.p))m.set(n.p,[]);m.get(n.p).push(n)}
 return FS._ix=m;
};
FS.kids=id=>(idx().get(id)||[]).filter(n=>!n.hide);
FS.allKids=id=>idx().get(id)||[];
FS.find1=(pid,name)=>{const l=name.toLowerCase();return (idx().get(pid)||[]).find(n=>n.name.toLowerCase()===l)||null};
FS.isIn=(n,anc)=>{let c=n,g=0;while(c&&g++<64){if(c.id===anc)return true;c=nodes()[c.p]}return false};
FS.inBin=n=>FS.isIn(n,'bin')&&n.id!=='bin';
FS.path=id=>{
 const a=[];let n=nodes()[id],g=0;
 while(n&&g++<64){a.unshift(n.id==='root'?'C:':n.name);n=nodes()[n.p]}
 const s=a.join('\\');return a.length===1?s+'\\':s;
};
FS.dpath=id=>{ // 顯示用路徑
 const a=[];let n=nodes()[id],g=0;
 while(n&&g++<64){a.unshift(n.id==='root'?'本機 (C:)':FS.dname(n));n=nodes()[n.p]}return a.join(' › ');
};
FS.chain=id=>{const a=[];let n=nodes()[id],g=0;while(n&&g++<64){a.unshift(n);n=nodes()[n.p]}return a};
FS.sizeOf=id=>{
 const n=nodes()[id];if(!n)return 0;if(n.type!=='dir')return n.size||0;
 let t=0;(idx().get(id)||[]).forEach(k=>{t+=FS.sizeOf(k.id)});return t;
};
FS.countIn=id=>{let f=0,d=0;(idx().get(id)||[]).forEach(k=>{if(k.type==='dir'){d++;const c=FS.countIn(k.id);f+=c.f;d+=c.d}else f++});return {f,d}};
/* 名稱檢查 */
FS.checkName=(name,pid,ignore)=>{
 if(typeof name!=='string')return '名稱無效。';
 const t=name.trim();
 if(!t)return '檔案名稱不能是空白。';
 if(t.length>120)return '檔案名稱太長。';
 if(BAD.test(t))return '檔案名稱不可包含下列任何字元：\\ / : * ? " < > |';
 if(/^\.+$/.test(t)||/\.$/.test(t))return '檔案名稱不可以句點結尾。';
 const ex=FS.find1(pid,t);
 if(ex&&ex.id!==ignore)return '此位置已經有相同名稱的檔案或資料夾。';
 return '';
};
FS.unique=(pid,name,style)=>{
 name=name.trim();if(!FS.find1(pid,name))return name;
 const i=name.lastIndexOf('.'),hasExt=i>0&&i<name.length-1,base=hasExt?name.slice(0,i):name,ext=hasExt?name.slice(i):'';
 if(style==='copy'){const c=base+' - 複本'+ext;if(!FS.find1(pid,c))return c;for(let k=2;k<9999;k++){const c2=base+' - 複本 ('+k+')'+ext;if(!FS.find1(pid,c2))return c2}}
 for(let k=2;k<9999;k++){const c=base+' ('+k+')'+ext;if(!FS.find1(pid,c))return c}
 return name+uid();
};
let saveT=0;
FS.changed=()=>{FS._ix=null;clearTimeout(saveT);saveT=setTimeout(FS.saveNow,250);OS.emit('fs')};
FS.saveNow=async()=>{
 clearTimeout(saveT);if(OS.R.wiping)return;
 const ok=await DB.put('kv','fs',{v:1,nodes:FS.nodes});
 if(!ok)OS.emit('quota');
};
addEventListener('pagehide',()=>{if(saveT)FS.saveNow()});
/* 建立 */
FS.create=o=>{
 const pid=o.parent,par=nodes()[pid];
 if(!par||par.type!=='dir')throw new Error('找不到目的資料夾。');
 let name=(o.name||'').trim();
 if(o.unique)name=FS.unique(pid,name||'新增項目');
 const err=FS.checkName(name,pid);if(err)throw new Error(err);
 const n={id:o.id||uid(),name,type:o.type||'file',p:pid,c:o.ts||Date.now(),m:o.ts||Date.now()};
 if(nodes()[n.id])n.id=uid();
 if(n.type==='file'){
  n.kind=o.kind||FS.kindOf(name,o.mime);
  if(o.app)n.app=o.app;
  if(o.blob){n.size=o.blob.size;n.mime=o.blob.type||o.mime||'';FS.bc.set(n.id,o.blob);DB.put('blobs',n.id,o.blob).then(ok=>{if(!ok)OS.emit('quota')})}
  else{n.text=o.text||'';n.size=FS.byteLen(n.text)}
 }
 if(o.sys)n.sys=o.sys;if(o.hide)n.hide=true;
 nodes()[n.id]=n;FS.changed();return n;
};
FS.mkdir=(pid,name,unique)=>FS.create({parent:pid,name,type:'dir',unique});
FS.ensureDir=(pid,name)=>FS.find1(pid,name)||FS.mkdir(pid,name);
FS.writeText=(id,text)=>{const n=nodes()[id];if(!n||n.type!=='file')return false;n.text=text;n.size=FS.byteLen(text);n.m=Date.now();delete n.mime;FS.bc.delete(id);FS.urlFree(id);DB.del('blobs',id);FS.changed();return true};
FS.setBlob=(id,blob)=>{const n=nodes()[id];if(!n||n.type!=='file')return false;delete n.text;n.size=blob.size;n.mime=blob.type||'';n.m=Date.now();FS.bc.set(id,blob);FS.urlFree(id);DB.put('blobs',id,blob);FS.changed();return true};
FS.readText=async id=>{
 const n=nodes()[id];if(!n)return null;
 if(typeof n.text==='string')return n.text;
 const b=await FS.getBlob(id);if(!b)return '';
 try{return await b.text()}catch(e){return ''}
};
FS.getBlob=async id=>{
 const n=nodes()[id];if(!n||n.type!=='file')return null;
 if(FS.bc.has(id))return FS.bc.get(id);
 if(typeof n.text==='string')return new Blob([n.text],{type:'text/plain'});
 const b=await DB.get('blobs',id);if(b)FS.bc.set(id,b);return b;
};
FS.url=async id=>{
 if(FS.urls.has(id))return FS.urls.get(id);
 const b=await FS.getBlob(id);if(!b)return '';
 if(FS.urls.has(id))return FS.urls.get(id);
 const u=URL.createObjectURL(b);FS.urls.set(id,u);return u;
};
FS.urlFree=id=>{const u=FS.urls.get(id);if(u){try{URL.revokeObjectURL(u)}catch(e){}FS.urls.delete(id)}};
/* 重新命名 */
FS.rename=(id,name)=>{
 const n=nodes()[id];if(!n)return '找不到項目。';if(FS.locked(n))return '系統資料夾無法重新命名。';
 name=String(name).trim();
 if(name===n.name)return '';
 const err=FS.checkName(name,n.p,id);if(err)return err;
 n.name=name;n.m=Date.now();FS.changed();return '';
};
/* 移動 / 複製 */
FS.canMove=(n,dest)=>{
 const d=nodes()[dest];
 if(!n||!d||d.type!=='dir')return false;
 if(FS.locked(n))return false;
 if(n.type==='dir'&&FS.isIn(d,n.id))return false;
 if(dest==='bin')return false;
 return true;
};
FS.move=(ids,dest)=>{
 const out=[];
 FS.batchStart();
 ids.forEach(id=>{
  const n=nodes()[id];if(!n||!FS.canMove(n,dest))return;
  if(n.p===dest)return;
  const wasBin=FS.inBin(n)&&n.del;
  n.name=FS.unique(dest,n.name);n.p=dest;n.m=Date.now();if(wasBin)delete n.del;
  FS._ix=null;out.push(n);
 });
 FS.batchEnd(out.length>0);return out;
};
FS.copy=(ids,dest)=>{
 const out=[];const d=nodes()[dest];if(!d||d.type!=='dir'||dest==='bin')return out;
 FS.batchStart();
 const dup=(n,pid,top)=>{
  const nn=Object.assign({},n);delete nn.sys;delete nn.del;delete nn.hide;
  nn.id=uid();nn.p=pid;nn.c=nn.m=Date.now();
  nn.name=top?FS.unique(pid,n.name,'copy'):n.name;
  if(n.type==='file'){
   if(typeof n.text!=='string'){
    const b=FS.bc.get(n.id);
    if(b){FS.bc.set(nn.id,b);DB.put('blobs',nn.id,b)}
    else DB.get('blobs',n.id).then(bb=>{if(bb){FS.bc.set(nn.id,bb);DB.put('blobs',nn.id,bb)}});
   }
  }
  nodes()[nn.id]=nn;FS._ix=null;
  if(n.type==='dir')FS.allKids(n.id).slice().forEach(k=>dup(k,nn.id,false));
  return nn;
 };
 ids.forEach(id=>{
  const n=nodes()[id];if(!n||n.sys)return;
  if(n.type==='dir'&&FS.isIn(d,n.id))return; // 不能複製到自己裡面
  out.push(dup(n,dest,true));
 });
 FS.batchEnd(out.length>0);return out;
};
let bdepth=0,bdirty=false;
FS.batchStart=()=>{bdepth++};
FS.batchEnd=ch=>{if(ch)bdirty=true;if(--bdepth<=0){bdepth=0;if(bdirty){bdirty=false;FS.changed()}}};
/* 資源回收筒 */
FS.trash=ids=>{
 const out=[];FS.batchStart();
 ids.forEach(id=>{
  const n=nodes()[id];if(!n||FS.locked(n)||FS.inBin(n))return;
  const o=n.p,on=n.name;
  n.name=FS.unique('bin',n.name);n.p='bin';n.del={o,n:on,t:Date.now()};
  FS._ix=null;out.push(n);
 });
 FS.batchEnd(out.length>0);return out;
};
FS.restore=ids=>{
 const out=[];FS.batchStart();
 ids.forEach(id=>{
  const n=nodes()[id];if(!n||n.p!=='bin')return;
  let dest=n.del&&nodes()[n.del.o];
  if(!dest||dest.type!=='dir'||FS.inBin(dest)||dest.id==='bin')dest=nodes().home||nodes().root;
  const nm=n.del&&n.del.n||n.name;
  n.name=FS.unique(dest.id,nm);n.p=dest.id;delete n.del;n.m=Date.now();
  FS._ix=null;out.push(n);
 });
 FS.batchEnd(out.length>0);return out;
};
FS.purge=ids=>{
 let c=0;FS.batchStart();
 const rm=id=>{
  const n=nodes()[id];if(!n)return;
  FS.allKids(id).slice().forEach(k=>rm(k.id));
  if(n.type==='file'){FS.bc.delete(id);FS.urlFree(id);DB.del('blobs',id)}
  delete nodes()[id];FS._ix=null;c++;
 };
 ids.forEach(id=>{const n=nodes()[id];if(!n||FS.locked(n))return;rm(id)});
 FS.batchEnd(c>0);return c;
};
FS.emptyBin=()=>{const ids=FS.allKids('bin').map(n=>n.id);return FS.purge(ids)};
/* 搜尋與路徑解析 */
FS.search=(q,rootId,limit)=>{
 q=(q||'').trim().toLowerCase();const out=[];if(!q)return out;limit=limit||200;
 const walk=id=>{
  for(const k of FS.kids(id)){
   if(out.length>=limit)return;
   if(k.name.toLowerCase().includes(q)||(FS.dname(k)||'').toLowerCase().includes(q))out.push(k);
   if(k.type==='dir'&&k.id!=='bin')walk(k.id);
  }
 };
 walk(rootId||'root');return out;
};
FS.parse=(str,cwd)=>{
 let s=String(str==null?'':str).trim();
 if(s.length>1&&/^(["']).*\1$/.test(s))s=s.slice(1,-1);
 s=s.replace(/\//g,'\\');
 let cur=nodes()[cwd||'home']||nodes().root;
 if(!s)return cur;
 if(/^[a-zA-Z]:/.test(s)){if(s[0].toLowerCase()!=='c')return null;cur=nodes().root;s=s.slice(2)}
 else if(s[0]==='\\'){cur=nodes().root}
 else if(s[0]==='~'){cur=nodes().home;s=s.slice(1)}
 const parts=s.split('\\').filter(Boolean);
 for(const p of parts){
  if(p==='.')continue;
  if(p==='..'){cur=nodes()[cur.p]||cur;continue}
  if(cur.type!=='dir')return null;
  let nx=FS.find1(cur.id,p);
  if(!nx){
   const l=p.toLowerCase();
   nx=FS.allKids(cur.id).find(k=>FS.dname(k).toLowerCase()===l)||null;
  }
  if(!nx&&cur.id==='root'&&(p.toLowerCase()==='$recycle.bin'||p===ALIAS['資源回收筒']||p==='資源回收筒'))nx=nodes().bin;
  if(!nx)return null;cur=nx;
 }
 return cur;
};
FS.stats=()=>{
 const o={total:0,text:0,image:0,video:0,audio:0,other:0,files:0};
 for(const id in nodes()){const n=nodes()[id];if(n.type!=='file')continue;o.files++;const s=n.size||0;o.total+=s;
  if(n.kind==='text')o.text+=s;else if(n.kind==='image')o.image+=s;else if(n.kind==='video')o.video+=s;else if(n.kind==='audio')o.audio+=s;else o.other+=s}
 return o;
};
/* 匯入真實電腦的檔案 */
FS.importFiles=async(files,pid)=>{
 let ok=0,fail=0;const out=[];
 for(const f of files){
  try{
   const kind=FS.kindOf(f.name,f.type);
   const name=FS.unique(pid,(f.name||'檔案').replace(BAD,'_'));
   if(kind==='text'&&f.size<2e6){out.push(FS.create({parent:pid,name,text:await f.text(),kind:'text'}))}
   else out.push(FS.create({parent:pid,name,blob:f.slice(0,f.size,f.type||'application/octet-stream'),kind,mime:f.type}));
   ok++;
  }catch(e){fail++}
 }
 return {ok,fail,nodes:out};
};
/* 下載到真實電腦 */
FS.download=async id=>{
 const n=nodes()[id];if(!n||n.type!=='file')return false;
 const b=await FS.getBlob(id);if(!b)return false;
 const a=document.createElement('a');const u=URL.createObjectURL(b);a.href=u;a.download=n.name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),4000);return true;
};
/* ---- 初始化 ---- */
FS.seedTree=()=>{
 const N=FS.nodes;
 const mk=(id,name,p,sys,extra)=>{if(N[id])return;N[id]=Object.assign({id,name,type:'dir',p,c:Date.now(),m:Date.now(),sys},extra||{})};
 if(!N.root)N.root={id:'root',name:'C:',type:'dir',p:null,c:Date.now(),m:Date.now(),sys:'root'};
 mk('users','Users','root','users');mk('home','Fish','users','home');
 mk('bin','$Recycle.Bin','root','bin',{hide:true});
 mk('desktop','Desktop','home','desktop');mk('documents','Documents','home','documents');mk('pictures','Pictures','home','pictures');
 mk('downloads','Downloads','home','downloads');mk('music','Music','home','music');mk('videos','Videos','home','videos');
 FS._ix=null;
};
FS.seedFiles=()=>{
 const W=`歡迎使用青魚電腦！

這是一台用網頁做成的模擬電腦（QeneOS），不是真正的 Windows、macOS 或 Linux。
你的檔案、設定都只存在這個瀏覽器裡，不會上傳到任何地方。

【小提示】
• 雙擊桌面圖示或按「開始」按鈕可以開啟程式。
• 在桌面或資料夾按滑鼠右鍵，可以新增資料夾與文字文件。
• 把真實電腦上的檔案拖進「檔案總管」或桌面，就能匯入；右鍵選「下載到實際電腦」可以匯出。
• Ctrl+Shift+Esc 開啟工作管理員，Ctrl+Alt+L 鎖定電腦，Alt+Tab 切換視窗。
• 刪除的檔案會先進資源回收筒，可以還原。

祝你使用愉快！ 🐟
`;
 FS.create({parent:'documents',name:'歡迎使用青魚電腦.txt',text:W});
 FS.create({parent:'desktop',name:'青魚瀏覽器.lnk',kind:'app',app:'browser',text:''});
 FS.create({parent:'desktop',name:'青魚遊戲.lnk',kind:'app',app:'games',text:''});
 const mg=OS.S.mig;
 if(mg&&mg.note){FS.create({parent:'documents',name:'青魚筆記（來自舊版手機）.txt',text:mg.note,unique:true});OS.S.mig=null;OS.save()}
};
FS.makeImage=(w,h,wallIdx,label)=>new Promise(res=>{
 try{
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  const cols=[['#0e5a66','#06242b'],['#25b8a8','#073a47'],['#e8794f','#2f2459'],['#4f9fa6','#1b4656']][wallIdx%4];
  const gr=g.createLinearGradient(0,0,w*.3,h);gr.addColorStop(0,cols[0]);gr.addColorStop(1,cols[1]);g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=2;
  for(let y=0;y<=h+44;y+=22)for(let x=(y/22%2)*22;x<=w+44;x+=44){g.beginPath();g.arc(x,y,22,Math.PI,0);g.stroke()}
  const p=new Path2D('M2.5 16C7.5 7 18 6 24 12l6-5v18l-6-5C18 26 7.5 25 2.5 16z'),s=h/32*.8;
  g.save();g.translate(w/2-16*s,h/2-16*s-10);g.scale(s,s);g.fillStyle='rgba(255,255,255,.92)';g.fill(p);g.fillStyle='#06242b';g.beginPath();g.arc(9.5,14,1.6,0,7);g.fill();g.restore();
  g.fillStyle='rgba(255,255,255,.9)';g.font='600 '+Math.round(h/12)+'px sans-serif';g.textAlign='center';g.fillText(label,w/2,h-h/9);
  c.toBlob(b=>res(b),'image/png');
 }catch(e){res(null)}
});
FS.makeWav=()=>{
 const sr=16000,dur=16,n=sr*dur,pcm=new Float32Array(n);
 const pent=[261.63,293.66,329.63,392,440,523.25,587.33];
 const seq=[0,2,4,2,3,1,0,2,4,5,4,3,2,1,0,-1];
 const step=.5;
 for(let k=0;k<seq.length*2;k++){
  const idxn=seq[k%seq.length];const f=idxn<0?196:pent[idxn];
  const t0=Math.floor(k*step*sr),len=Math.floor(step*1.6*sr);
  for(let i=0;i<len&&t0+i<n;i++){
   const t=i/sr,env=Math.exp(-t*3.2)*Math.min(1,i/200);
   const v=(Math.sin(2*Math.PI*f*t)*.7+Math.sin(4*Math.PI*f*t)*.2+Math.sin(6*Math.PI*f*t)*.08)*env*.45;
   pcm[t0+i]+=v;
  }
  if(k%4===0){const bf=pent[0]/2,bl=Math.floor(2*sr);for(let i=0;i<bl&&t0+i<n;i++){const t=i/sr;pcm[t0+i]+=Math.sin(2*Math.PI*bf*t)*Math.exp(-t*1.1)*.25}}
 }
 const buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
 const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 ws(0,'RIFF');v.setUint32(4,36+n*2,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);
 return new Blob([buf],{type:'audio/wav'});
};
FS.seedMedia=async()=>{
 try{
  const labels=['深海','潮光','夕鱗'];
  for(let i=0;i<3;i++){const b=await FS.makeImage(1280,720,i,'青魚 · '+labels[i]);if(b)FS.create({parent:'pictures',name:'青魚 '+labels[i]+'.png',blob:b,kind:'image'})}
  FS.create({parent:'music',name:'青魚小夜曲.wav',blob:FS.makeWav(),kind:'audio'});
 }catch(e){}
};
async function legacyMedia(){
 if(OS.S.legacy)return;
 OS.S.legacy=true;OS.save();
 try{
  if(!indexedDB.databases)return;
  const dbs=await indexedDB.databases();
  if(!dbs.some(d=>d.name==='qene-media'))return;
  const db=await new Promise(r=>{const q=indexedDB.open('qene-media');q.onsuccess=()=>r(q.result);q.onerror=q.onblocked=()=>r(null)});
  if(!db)return;
  if(!db.objectStoreNames.contains('m')){db.close();return}
  const all=await new Promise(r=>{try{const t=db.transaction('m','readonly'),q=t.objectStore('m').getAll();t.oncomplete=()=>r(q.result||[]);t.onerror=t.onabort=()=>r([])}catch(e){r([])}});
  db.close();
  for(const it of all){
   if(!it||!it.blob)continue;
   try{FS.create({parent:'pictures',name:FS.unique('pictures',it.name||'相簿項目'),blob:it.blob,kind:it.type==='video'?'video':'image',ts:it.ts})}catch(e){}
  }
 }catch(e){}
}
FS.init=async()=>{
 await DB.open();
 let t=await DB.get('kv','fs');
 let fresh=false;
 if(t&&t.nodes&&typeof t.nodes==='object'&&t.nodes.root){FS.nodes=t.nodes}
 else{FS.nodes={};fresh=true}
 FS.seedTree();
 for(const id in FS.nodes){const n=FS.nodes[id];if(n.p&&!FS.nodes[n.p]&&id!=='root'){n.p='home'}} // 修復遺失的父層
 if(fresh){FS.seedFiles();await FS.seedMedia()}
 await legacyMedia();
 FS._ix=null;FS.ready=true;
 await FS.saveNow();
 if(DB.mem)OS.R.memOnly=true;
};
})();
