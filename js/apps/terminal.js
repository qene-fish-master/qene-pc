/* 青魚電腦 — 終端機 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,wait}=OS.U,FS=OS.FS,S=OS.S,WM=OS.WM;
const ICON='<path d="M4 6l6 6-6 6M12 18h8"/>';
const FISH=['      ><(((º>','   ><(((º>   ><(((º>','       青魚電腦 QeneOS'];
function tokenize(line){
 const t=[];let cur='',q=null,has=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(q){if(c===q)q=null;else cur+=c}
  else if(c==='"'||c==="'"){q=c;has=true}
  else if(/\s/.test(c)){if(cur||has){t.push(cur);cur='';has=false}}
  else if(c==='>'){if(cur||has){t.push(cur);cur='';has=false}if(line[i+1]==='>'){t.push('>>');i++}else t.push('>')}
  else cur+=c;
 }
 if(q)throw new Error('引號沒有結束');
 if(cur||has)t.push(cur);
 return t;
}
OS.register({id:'terminal',name:'終端機',kw:'terminal cmd shell console command 終端機 命令列 指令 cmd powershell',
 g:'linear-gradient(145deg,#3c4a52,#10181c)',s:ICON,w:760,h:460,minW:360,minH:240,
 create(win,args){
  const root=document.createElement('div');root.className='tm';win.body.appendChild(root);
  root.innerHTML=`<div class="tmo" aria-live="polite" role="log"></div><div class="tml"><span class="tmp"></span><input class="tmi" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="命令"></div>`;
  const out=$('.tmo',root),inp=$('.tmi',root),pr=$('.tmp',root);
  let cwd=args&&args.cwd&&FS.get(args.cwd)&&FS.get(args.cwd).type==='dir'&&!FS.inBin(FS.get(args.cwd))?args.cwd:'home';
  let hist=[],hi=0,busy=false,abort=false,timers=[];
  win.cleanup(()=>{abort=true;timers.forEach(clearTimeout)});
  const prompt=()=>FS.path(cwd)+'>';
  function setPrompt(){pr.textContent=prompt()+' '}
  function line(t,cls){
   const d=document.createElement('div');d.className='tl'+(cls?' '+cls:'');d.textContent=t;out.appendChild(d);
   while(out.childNodes.length>1500)out.removeChild(out.firstChild);
   return d;
  }
  const scroll=()=>{out.scrollTop=out.scrollHeight};
  const resolve=p=>FS.parse(p,cwd);
  const dirOf=p=>{const n=resolve(p);return n&&n.type==='dir'?n:null};
  function fmtLs(n){
   const d=new Date(n.m);
   return OS.U.fmtDate(n.m).padEnd(17)+(n.type==='dir'?'<DIR>'.padStart(12):OS.U.fmtSize(n.size||0).padStart(12))+'  '+FS.shown(n)+(n.type==='dir'?'':'');
  }
  function tree(id,pre,o,depth){
   const k=FS.kids(id).slice().sort((a,b)=>(a.type!==b.type?(a.type==='dir'?-1:1):OS.U.cmp(a.name,b.name)));
   k.forEach((n,i)=>{const last=i===k.length-1;o.push(pre+(last?'└─ ':'├─ ')+FS.shown(n));if(n.type==='dir'&&depth<6&&n.id!=='bin')tree(n.id,pre+(last?'   ':'│  '),o,depth+1)});
  }
  function allFiles(id,o){FS.kids(id).forEach(n=>{if(n.type==='dir'){if(n.id!=='bin')allFiles(n.id,o)}else o.push(n)})}
  const APPNAMES=()=>OS.installedApps();
  function findApp(name){
   const l=name.toLowerCase().replace(/\.(exe|lnk)$/,'');
   return APPNAMES().find(a=>a.id===l||a.name.toLowerCase()===l||(a.kw||'').toLowerCase().split(/\s+/).includes(l));
  }
  const C={};
  C.help=()=>[
   '可用命令（括號內是別名）：',
   '  help                 顯示這份說明',
   '  dir (ls) [路徑]      列出資料夾內容',
   '  cd [路徑]            切換資料夾    pwd 顯示目前位置',
   '  type (cat) 檔案      顯示文字檔內容',
   '  echo 文字 [> 檔案]   輸出文字，可用 > 或 >> 寫入檔案',
   '  mkdir (md) 名稱      建立資料夾    touch 檔名  建立空白文字檔',
   '  del (rm) 檔案  /  rd (rmdir) 資料夾  移到資源回收筒（加 -f 永久刪除）',
   '  copy (cp) 來源 目的   move (mv) 來源 目的   ren 舊名 新名',
   '  tree [路徑]  find 關鍵字  grep 文字 檔案',
   '  start (open) 程式或檔案   開啟應用程式或檔案',
   '  calc 運算式          例如 calc 3*(4+5)',
   '  date  time  whoami  hostname  ver  uname  uptime  neofetch',
   '  theme dark|light     切換深淺色    ping 主機',
   '  history  cls (clear)  fish  exit',
   '  lock  sleep  restart  shutdown  update   系統電源與更新',
   '提示：按 Tab 自動完成，↑ ↓ 切換歷史命令，Ctrl+C 中斷。'
  ];
  C.cls=C.clear=()=>{out.innerHTML='';return null};
  C.echo=a=>[a.join(' ')];
  C.pwd=()=>[FS.path(cwd)];
  C.dir=C.ls=a=>{
   const p=a.filter(x=>!x.startsWith('-'))[0];
   const n=p?resolve(p):FS.get(cwd);
   if(!n)throw new Error('找不到路徑 '+p);
   if(n.type!=='dir')return [fmtLs(n)];
   const k=FS.kids(n.id).slice().sort((x,y)=>(x.type!==y.type?(x.type==='dir'?-1:1):OS.U.cmp(FS.shown(x),FS.shown(y))));
   const o=[' 目錄：'+FS.path(n.id),''];
   if(!k.length)o.push('（空的）');
   k.forEach(x=>o.push(fmtLs(x)));
   o.push('',`   ${k.filter(x=>x.type==='file').length} 個檔案　${k.filter(x=>x.type==='dir').length} 個資料夾`);
   return o;
  };
  C.cd=a=>{
   const p=a.join(' ');
   if(!p){return [FS.path(cwd)]}
   const n=resolve(p);
   if(!n)throw new Error('系統找不到指定的路徑：'+p);
   if(n.type!=='dir')throw new Error('目錄名稱無效：'+p);
   cwd=n.id;setPrompt();return null;
  };
  C.type=C.cat=async a=>{
   if(!a.length)throw new Error('用法：type 檔案');
   const o=[];
   for(const p of a){
    const n=resolve(p);if(!n)throw new Error('找不到檔案：'+p);
    if(n.type!=='file')throw new Error(p+' 是資料夾');
    if(n.kind!=='text')throw new Error('「'+n.name+'」不是文字檔案');
    const t=await FS.readText(n.id);o.push(...String(t).split('\n'));
   }
   return o;
  };
  C.mkdir=C.md=a=>{
   if(!a.length)throw new Error('用法：mkdir 名稱');
   a.forEach(nm=>{const d=resolve(nm);if(d&&d.type==='dir')throw new Error('子目錄或檔案 '+nm+' 已經存在');try{FS.mkdir(cwd,nm)}catch(e){throw new Error(e.message)}});return null;
  };
  C.touch=a=>{
   if(!a.length)throw new Error('用法：touch 檔名');
   a.forEach(nm=>{const ex=FS.find1(cwd,nm);if(ex){ex.m=Date.now();FS.changed();return}FS.create({parent:cwd,name:nm,text:''})});return null;
  };
  C.del=C.rm=C.rd=C.rmdir=a=>{
   const force=a.includes('-f')||a.includes('/f'),rec=a.includes('-r')||a.includes('/s')||a.includes('-rf');
   const ps=a.filter(x=>!/^[-/][a-z]+$/i.test(x));
   if(!ps.length)throw new Error('用法：del 檔案');
   ps.forEach(p=>{
    const n=resolve(p);if(!n)throw new Error('找不到：'+p);
    if(FS.locked(n))throw new Error('無法刪除系統項目：'+p);
    if(n.type==='dir'&&FS.kids(n.id).length&&!rec)throw new Error('資料夾不是空的（加上 -r 可以連同內容刪除）：'+p);
    if(force||FS.inBin(n))FS.purge([n.id]);else FS.trash([n.id]);
    if(cwd&&!FS.get(cwd)){cwd='home';setPrompt()}
   });
   return null;
  };
  C.copy=C.cp=a=>{
   if(a.length<2)throw new Error('用法：copy 來源 目的');
   const s=resolve(a[0]);if(!s)throw new Error('找不到：'+a[0]);
   const d=resolve(a[1]);
   if(d&&d.type==='dir'){const r=FS.copy([s.id],d.id);if(!r.length)throw new Error('無法複製');return ['已複製 1 個項目。']}
   if(d)throw new Error('目的地已經存在：'+a[1]);
   if(s.type!=='file')throw new Error('目的地必須是現有的資料夾');
   const r=FS.copy([s.id],s.p);if(r[0]){const e=FS.rename(r[0].id,a[1].replace(/^.*[\\/]/,''));if(e){FS.purge([r[0].id]);throw new Error(e)}}
   return ['已複製 1 個項目。'];
  };
  C.move=C.mv=a=>{
   if(a.length<2)throw new Error('用法：move 來源 目的');
   const s=resolve(a[0]);if(!s)throw new Error('找不到：'+a[0]);
   if(FS.locked(s))throw new Error('無法移動系統項目');
   const d=resolve(a[1]);
   if(d&&d.type==='dir'){if(!FS.canMove(s,d.id))throw new Error('無法移動到那裡');FS.move([s.id],d.id);return null}
   if(d)throw new Error('目的地已經存在：'+a[1]);
   const e=FS.rename(s.id,a[1]);if(e)throw new Error(e);return null;
  };
  C.ren=C.rename=a=>{
   if(a.length<2)throw new Error('用法：ren 舊名 新名');
   const s=resolve(a[0]);if(!s)throw new Error('找不到：'+a[0]);
   const e=FS.rename(s.id,a[1]);if(e)throw new Error(e);return null;
  };
  C.tree=a=>{const n=a[0]?resolve(a[0]):FS.get(cwd);if(!n||n.type!=='dir')throw new Error('找不到資料夾');const o=[FS.path(n.id)];tree(n.id,'',o,0);return o};
  C.find=a=>{
   if(!a.length)throw new Error('用法：find 關鍵字');
   const r=FS.search(a.join(' '),cwd,100).filter(n=>!FS.inBin(n));
   return r.length?r.map(n=>FS.path(n.id)).concat(['','找到 '+r.length+' 個項目。']):['找不到符合的項目。'];
  };
  C.grep=async a=>{
   if(a.length<2)throw new Error('用法：grep 文字 檔案');
   const [needle,...fs]=a,o=[];
   const files=[];fs.forEach(p=>{const n=resolve(p);if(!n)throw new Error('找不到：'+p);if(n.type==='dir')allFiles(n.id,files);else files.push(n)});
   for(const n of files){if(n.kind!=='text')continue;const t=await FS.readText(n.id);String(t).split('\n').forEach((l,i)=>{if(l.toLowerCase().includes(needle.toLowerCase()))o.push((files.length>1?FS.shown(n)+':':'')+(i+1)+': '+l)})}
   return o.length?o:['沒有符合的行。'];
  };
  C.start=C.open=a=>{
   if(!a.length)throw new Error('用法：start 程式或檔案');
   const p=a.join(' ');
   const n=FS.parse(p,cwd);
   if(n&&!(n.type==='dir'&&n.id==='root'&&false)){OS.openNode(n.id);return null}
   const ap=findApp(p);if(ap){OS.open(ap.id);return null}
   if(OS.runCmd(p))return null;
   throw new Error('找不到「'+p+'」');
  };
  C.notepad=a=>{const n=a[0]?resolve(a[0]):null;if(a[0]&&!n){const t=FS.create({parent:cwd,name:a[0],text:''});OS.open('notepad',{id:t.id});return null}if(n&&n.type!=='file')throw new Error('不是檔案');OS.open('notepad',n?{id:n.id}:{});return null};
  C.calc=a=>{if(!a.length){OS.open('calc');return null}const v=OS.calcParse(a.join(' '),true);return [String(+v.toPrecision(14))]};
  C.date=()=>[OS.fmtDateLong(new Date())];
  C.time=()=>[OS.fmtTime(new Date(),true)];
  C.whoami=()=>[S.pcName.toLowerCase()+'\\'+S.name];
  C.hostname=()=>[S.pcName];
  C.ver=C.version=()=>['QeneOS 版本 '+S.ver+'（網頁模擬）'];
  C.uname=()=>['QeneOS '+S.ver+' '+S.pcName+' web'];
  C.uptime=()=>{const s=Math.floor(performance.now()/1000);return ['已執行 '+OS.U.fmtDur(s)+'（'+Math.floor(s/3600)+' 小時 '+Math.floor(s%3600/60)+' 分 '+s%60+' 秒）']};
  C.neofetch=()=>{
   const st=FS.stats();
   return ['      ><(((º>        '+S.name+'@'+S.pcName,'   ><(((º>   ><(((º>   ------------------','       ><(((º>         OS: QeneOS '+S.ver,'                       主機: 網頁瀏覽器','                       核心: '+(navigator.hardwareConcurrency||'?')+' 個邏輯處理器','                       磁碟: '+OS.U.fmtSize(st.total)+'（'+st.files+' 個檔案）','                       主題: '+(S.dark?'深色':'淺色'),'                       解析度: '+innerWidth+'×'+innerHeight];
  };
  C.fish=()=>FISH;
  C.history=()=>hist.map((h,i)=>String(i+1).padStart(4)+'  '+h);
  C.theme=a=>{const v=(a[0]||'').toLowerCase();if(v!=='dark'&&v!=='light')throw new Error('用法：theme dark 或 theme light');S.dark=v==='dark';OS.save();OS.applyAll();return ['已切換為'+(S.dark?'深色':'淺色')+'模式。']};
  C.exit=()=>{setTimeout(()=>win.close(true),0);return null};
  C.lock=()=>{setTimeout(()=>OS.lock(),50);return null};
  C.sleep=()=>{setTimeout(()=>OS.sleep(),50);return null};
  C.restart=C.reboot=()=>{setTimeout(()=>OS.restart(),50);return ['正在重新啟動…']};
  C.shutdown=()=>{setTimeout(()=>OS.shutdown(),50);return ['正在關機…']};
  C.update=()=>{OS.open('settings',{page:'update'});return ['已開啟軟體更新。']};
  C.ping=async a=>{
   const h=a[0];if(!h)throw new Error('用法：ping 主機');
   if(!/^[\w.-]{1,60}$/.test(h))throw new Error('找不到主機 '+h);
   line('Ping '+h+'（模擬）：');
   for(let i=0;i<4;i++){
    await wait(OS.R.fast?5:600);if(abort)return null;
    if(!OS.isOnline()){line('一般失敗。');continue}
    line('來自 '+h+' 的回覆：位元組=32 時間='+(8+Math.floor(Math.random()*30))+'ms TTL=57');
   }
   return null;
  };
  /* ---------- 執行 ---------- */
  async function run(raw){
   const s=raw.trim();if(!s)return;
   line(prompt()+' '+raw,'tcmd');
   if(hist[hist.length-1]!==s){hist.push(s);if(hist.length>200)hist.shift()}
   hi=hist.length;
   let t;try{t=tokenize(s)}catch(e){line(e.message,'terr');return}
   let redir=null,op=null;
   const ri=t.findIndex(x=>x==='>'||x==='>>');
   if(ri>=0){op=t[ri];redir=t[ri+1];t=t.slice(0,ri).concat(t.slice(ri+2));if(!redir){line('語法錯誤：缺少檔案名稱','terr');return}}
   if(!t.length)return;
   const name=t[0].toLowerCase(),a=t.slice(1);
   busy=true;
   try{
    let f=C[name];
    let res;
    if(f)res=await f(a);
    else{
     const n=FS.parse(t.join(' '),cwd)||FS.parse(t[0],cwd);
     const ap=findApp(t.join(' '))||findApp(t[0]);
     if(ap){OS.open(ap.id);res=null}
     else if(n&&n.type==='file'&&n.kind==='app'){OS.openNode(n.id);res=null}
     else throw new Error("「"+t[0]+"」不是內部或外部命令。輸入 help 查看可用命令。");
    }
    if(res&&res.length){
     if(redir){
      const text=res.join('\n')+'\n';
      const ex=resolve(redir);
      if(ex&&ex.type==='dir')throw new Error('存取被拒：'+redir+' 是資料夾');
      if(ex){const old=op==='>>'?await FS.readText(ex.id):'';if(ex.kind!=='text')throw new Error('無法寫入非文字檔案');FS.writeText(ex.id,(old||'')+text)}
      else FS.create({parent:cwd,name:redir,text,kind:'text'});
     }else res.forEach(l=>line(l));
    }
   }catch(e){line(e.message||String(e),'terr')}
   busy=false;
  }
  /* ---------- 輸入處理 ---------- */
  inp.addEventListener('keydown',async e=>{
   if(e.key==='Enter'){
    e.preventDefault();if(busy)return;
    const v=inp.value;inp.value='';await run(v);setPrompt();scroll();
   }else if(e.key==='ArrowUp'){e.preventDefault();if(hi>0){hi--;inp.value=hist[hi];setTimeout(()=>inp.setSelectionRange(inp.value.length,inp.value.length))}}
   else if(e.key==='ArrowDown'){e.preventDefault();if(hi<hist.length-1){hi++;inp.value=hist[hi]}else{hi=hist.length;inp.value=''}}
   else if(e.key==='Tab'){e.preventDefault();complete()}
   else if(e.key==='c'&&e.ctrlKey&&inp.selectionStart===inp.selectionEnd){e.preventDefault();line(prompt()+' '+inp.value+'^C','tcmd');inp.value='';abort=true;busy=false;setTimeout(()=>{abort=false},50)}
   else if(e.key==='l'&&e.ctrlKey){e.preventDefault();out.innerHTML=''}
   e.stopPropagation();
  });
  function complete(){
   const v=inp.value,pos=inp.selectionStart,before=v.slice(0,pos),m=before.match(/(^|\s)([^\s"']*)$/),word=m?m[2]:'';
   const first=!/\s/.test(before.trim())&&!/\s$/.test(before);
   let cands=[];
   if(first&&!/[\\/]/.test(word)){cands=Object.keys(C).filter(k=>k.startsWith(word.toLowerCase()))}
   else{
    const sl=Math.max(word.lastIndexOf('\\'),word.lastIndexOf('/')),dirP=sl>=0?word.slice(0,sl+1):'',base=sl>=0?word.slice(sl+1):word;
    const d=dirP?resolve(dirP):FS.get(cwd);
    if(d&&d.type==='dir')cands=FS.kids(d.id).filter(n=>FS.shown(n).toLowerCase().startsWith(base.toLowerCase())).map(n=>dirP+FS.shown(n)+(n.type==='dir'?'\\':''));
   }
   if(!cands.length)return;
   let pre=cands[0];for(const c of cands){let i=0;while(i<pre.length&&i<c.length&&pre[i].toLowerCase()===c[i].toLowerCase())i++;pre=pre.slice(0,i)}
   if(cands.length>1){line(prompt()+' '+v,'tcmd');line(cands.join('    '))}
   if(pre.length>=word.length){
    let ins=pre;if(/\s/.test(ins))ins='"'+ins+'"';
    const start=pos-word.length;inp.value=v.slice(0,start)+ins+v.slice(pos);
    const np=start+ins.length;inp.setSelectionRange(np,np);
   }
   scroll();
  }
  root.addEventListener('pointerdown',e=>{if(!e.target.closest('.tmi')&&!window.getSelection().toString())setTimeout(()=>{if(!window.getSelection().toString())inp.focus()},0)});
  root.addEventListener('click',()=>{if(!window.getSelection().toString())inp.focus({preventScroll:true})});
  line('青魚電腦終端機  [QeneOS 版本 '+S.ver+']');line('輸入 help 查看可用命令。');line('');
  setPrompt();
  return {focusEl:()=>inp,run:(c)=>run(c)};
 }
});
})();
