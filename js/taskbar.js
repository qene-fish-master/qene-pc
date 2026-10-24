/* 青魚電腦 — 工作列、開始選單、快速設定、通知與行事曆、工作檢視、全域快速鍵 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp,pad,uid}=OS.U,FS=OS.FS,S=OS.S,WM=OS.WM;
const AV=['#14a094','#2f7bd9','#7a5cd6','#d6456f','#e07b1f','#2e9e6b','#5f7b80','#d6453d'];
OS.avatar=(s,cls)=>{
 s=s||40;
 if(S.avatarImg)return `<span class="avt ${cls||''}" style="--s:${s}px"><img src="${S.avatarImg}" alt=""></span>`;
 return `<span class="avt ${cls||''}" style="--s:${s}px;background:${AV[S.avatar%AV.length]}"><svg viewBox="0 0 32 32" width="${Math.round(s*.6)}" height="${Math.round(s*.6)}"><path d="M2.5 16C7.5 7 18 6 24 12l6-5v18l-6-5C18 26 7.5 25 2.5 16z" fill="#fff"/><circle cx="9.5" cy="14" r="1.6" fill="#06242b"/></svg></span>`;
};
OS.AVCOLORS=AV;
OS.wifiOn=()=>!!S.wifi&&!S.airplane;
OS.btOn=()=>!!S.bt&&!S.airplane;
const NETS=['QeneFish-5G','Ocean_Guest','Reef-Lab'];OS.NETS=NETS;

/* ---------- 訊息小提示 ---------- */
let mtT=0;
OS.toast=m=>{
 let t=$('#msgtoast');if(!t){t=document.createElement('div');t.id='msgtoast';t.setAttribute('role','status');$('#os').appendChild(t)}
 t.textContent=m;t.classList.add('show');clearTimeout(mtT);mtT=setTimeout(()=>t.classList.remove('show'),2000);
};
/* ---------- 通知 ---------- */
const toasts=[];
OS.notify=o=>{
 if(!S.notif)return null;
 const n={id:uid(),app:o.app||'',title:String(o.title||'').slice(0,80),body:String(o.body==null?'':o.body).slice(0,200),ts:Date.now(),fn:o.fn};
 OS.R.notes.unshift(n);if(OS.R.notes.length>40)OS.R.notes.length=40;
 OS.emit('notes');
 if(S.focus)return n;
 if(S.nsound)OS.sfx('notify');
 if(S.banner&&OS.R.state==='desktop')showToast(n);
 return n;
};
function showToast(n){
 const box=$('#toasts');if(!box)return;
 const el=document.createElement('div');el.className='toast';el.dataset.id=n.id;
 el.innerHTML=`<div class="tth">${n.app&&OS.apps[n.app]?OS.appIcon(n.app,18):OS.appIcon('settings',18)}<span class="lbl">${esc(n.app&&OS.apps[n.app]?OS.apps[n.app].name:'青魚電腦')}</span><button class="tx" aria-label="關閉">${OS.ico('close',12)}</button></div><b>${esc(n.title)}</b><p>${esc(n.body)}</p>`;
 box.appendChild(el);
 requestAnimationFrame(()=>el.classList.add('in'));
 const rec={el,t:0};toasts.push(rec);
 const kill=()=>{clearTimeout(rec.t);const i=toasts.indexOf(rec);if(i>=0)toasts.splice(i,1);el.classList.remove('in');setTimeout(()=>el.remove(),250)};
 const arm=()=>{clearTimeout(rec.t);rec.t=setTimeout(kill,5500)};
 arm();
 el.addEventListener('mouseenter',()=>clearTimeout(rec.t));el.addEventListener('mouseleave',arm);
 el.addEventListener('click',e=>{
  if(e.target.closest('.tx')){kill();return}
  kill();if(n.fn){try{n.fn()}catch(err){console.error(err)}}
 });
 while(toasts.length>3){const o=toasts.shift();clearTimeout(o.t);o.el.remove()}
}
OS.clearToasts=()=>{toasts.splice(0).forEach(r=>{clearTimeout(r.t);r.el.remove()})};

/* ---------- 工作列 ---------- */
const tbApps=()=>$('#tbApps');
let popFor=null;
function tbList(){
 const vis=WM.visibleList().filter(w=>!w.closing);
 const ids=[];
 S.tbPinned.forEach(id=>{if(OS.apps[id]&&OS.appInstalled(id)&&!ids.includes(id))ids.push(id)});
 // 依視窗開啟順序加入未釘選的執行中程式
 WM.list.filter(w=>!w.closing&&w.desk===WM.desk).forEach(w=>{if(!ids.includes(w.app))ids.push(w.app)});
 return ids.map(id=>({id,wins:vis.filter(w=>w.app===id)}));
}
OS.tbRender=()=>{
 const el=tbApps();if(!el)return;
 const act=WM.active;
 el.innerHTML=tbList().map(({id,wins})=>{
  const a=OS.apps[id],isAct=!!(act&&act.app===id&&act.desk===WM.desk&&act.state!=='min');
  return `<button type="button" class="tbb${wins.length?' run':''}${isAct?' act':''}${wins.length>1?' multi':''}" data-app="${id}" title="${esc(a.name)}${wins.length>1?'（'+wins.length+' 個視窗）':''}" aria-label="${esc(a.name)}">${OS.appIcon(id,26)}<i class="ind"></i></button>`;
 }).join('');
 const st=$('#tbStart');if(st)st.classList.toggle('open',startOpen);
};
function winPopup(btn,wins){
 closePop();
 const pop=document.createElement('div');pop.className='tbpop';
 pop.innerHTML=wins.map(w=>`<div class="tpi${w.state==='min'?' min':''}" data-w="${w.id}">${OS.appIcon(w.app,16)}<span>${esc(w.title)}</span><button class="tpx" data-x="${w.id}" aria-label="關閉視窗">${OS.ico('close',12)}</button></div>`).join('');
 $('#os').appendChild(pop);
 const r=btn.getBoundingClientRect(),w=pop.offsetWidth;
 pop.style.left=clamp(r.left+r.width/2-w/2,6,innerWidth-w-6)+'px';
 pop.style.bottom=(innerHeight-r.top+8)+'px';
 popFor={el:pop,btn};
 pop.addEventListener('click',e=>{
  const x=e.target.closest('[data-x]');
  if(x){const w=WM.list.find(k=>k.id===x.dataset.x);if(w)WM.close(w).then(()=>{closePop()});return}
  const it=e.target.closest('[data-w]');
  if(it){const w=WM.list.find(k=>k.id===it.dataset.w);closePop();if(w)WM.focus(w)}
 });
}
function closePop(){if(popFor){popFor.el.remove();popFor=null}}
function bindTaskbar(){
 const bar=$('#taskbar');
 bar.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(e.target.closest('.tbb[data-app]')||e.target.closest('#tbStart'))return;
  OS.menu([{label:'工作管理員',ico:'gear',fn:()=>OS.open('taskmgr')},{sep:1},{label:'工作列設定',ico:'gear',fn:()=>OS.open('settings',{page:'taskbar'})},{label:'顯示桌面',ico:'desktop',fn:()=>WM.showDesktop()}],e.clientX,e.clientY);
 });
 tbApps().addEventListener('click',e=>{
  const b=e.target.closest('[data-app]');if(!b)return;
  closeAllPanels();
  const id=b.dataset.app,wins=WM.visibleList().filter(w=>w.app===id&&!w.closing);
  if(!wins.length){OS.open(id);return}
  if(wins.length===1){const w=wins[0];if(WM.active===w&&w.state!=='min')WM.minimize(w);else WM.focus(w);return}
  if(popFor&&popFor.btn===b){closePop();return}
  winPopup(b,wins);
 });
 tbApps().addEventListener('auxclick',e=>{
  if(e.button!==1)return;const b=e.target.closest('[data-app]');if(!b)return;e.preventDefault();
  const id=b.dataset.app;if(OS.apps[id]&&!OS.apps[id].single)OS.open(id,{fresh:1,x:undefined});else OS.open(id);
 });
 tbApps().addEventListener('contextmenu',e=>{
  const b=e.target.closest('[data-app]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  const id=b.dataset.app,a=OS.apps[id],wins=WM.visibleList().filter(w=>w.app===id&&!w.closing),pinned=S.tbPinned.includes(id);
  OS.menuUp(b,[
   {label:a.name,ico:null,fn:()=>OS.open(id,a.single?{}:{fresh:1})},
   {sep:1},
   pinned?{label:'從工作列取消釘選',ico:'pin',fn:()=>OS.unpinTaskbar(id)}:{label:'釘選到工作列',ico:'pin',fn:()=>OS.pinTaskbar(id)},
   wins.length?{label:wins.length>1?'關閉所有視窗':'關閉視窗',ico:'close',fn:()=>wins.forEach(w=>WM.close(w))}:null
  ]);
 });
 $('#tbStart').addEventListener('click',()=>{if(startOpen)startClose();else{closeAllPanels();startShow()}});
 $('#tbStart').addEventListener('contextmenu',e=>{
  e.preventDefault();e.stopPropagation();
  OS.menuUp($('#tbStart'),[
   {label:'應用程式與功能',fn:()=>OS.open('settings',{page:'apps'})},
   {label:'電源選項',fn:()=>OS.open('settings',{page:'power'})},
   {label:'工作管理員',fn:()=>OS.open('taskmgr')},
   {label:'設定',ico:'gear',fn:()=>OS.open('settings')},
   {label:'檔案總管',fn:()=>OS.open('explorer')},
   {label:'搜尋',fn:()=>startShow(true)},
   {label:'執行',kbd:'Win+R',fn:()=>OS.run()},
   {sep:1},
   {label:'關機或登出',sub:[{label:'鎖定',fn:()=>OS.lock()},{label:'登出',fn:()=>OS.signOut()},{label:'睡眠',fn:()=>OS.sleep()},{label:'關機',fn:()=>OS.shutdown()},{label:'重新啟動',fn:()=>OS.restart()}]},
   {label:'桌面',ico:'desktop',fn:()=>WM.showDesktop()}
  ]);
 });
 $('#tbSearch').addEventListener('click',()=>{if(startOpen&&startSearchMode)startClose();else{closeAllPanels();startShow(true)}});
 $('#tbTV').addEventListener('click',()=>{if(tvOpen)tvClose();else{closeAllPanels();tvShow()}});
 $('#tbDesk').addEventListener('click',()=>{closeAllPanels();WM.showDesktop()});
 $('#tbDesk').title='顯示桌面';
 $('#tbQS').addEventListener('click',()=>{if(flyout==='qs')flyClose();else{closeAllPanels();flyShow('qs')}});
 $('#tbClock').addEventListener('click',()=>{if(flyout==='cal')flyClose();else{closeAllPanels();calMonth=null;flyShow('cal')}});
 $('#tbCam').addEventListener('click',()=>OS.toast('相機正在使用中'));
 bar.addEventListener('pointerdown',e=>{if(!e.target.closest('.tbpop'))closePop()});
}
OS.pinTaskbar=id=>{if(!S.tbPinned.includes(id)&&OS.apps[id]){S.tbPinned.push(id);OS.save();OS.tbRender()}};
OS.unpinTaskbar=id=>{S.tbPinned=S.tbPinned.filter(x=>x!==id);OS.save();OS.tbRender()};
OS.pinStart=id=>{if(!S.startPinned.includes(id)&&OS.apps[id]){S.startPinned.push(id);OS.save();if(startOpen)startRender()}};
OS.unpinStart=id=>{S.startPinned=S.startPinned.filter(x=>x!==id);OS.save();if(startOpen)startRender()};

/* ---------- 系統匣與時鐘 ---------- */
let batt=null;
function battInit(){
 if(!navigator.getBattery)return;
 navigator.getBattery().then(b=>{batt=b;['levelchange','chargingchange'].forEach(t=>b.addEventListener(t,trayRender));trayRender()}).catch(()=>{});
}
function trayRender(){
 const wifi=$('#tIcNet'),vol=$('#tIcVol'),bt=$('#tIcBat');if(!wifi)return;
 wifi.innerHTML=OS.ico(S.airplane?'plane':OS.wifiOn()?'wifi':'wifioff',16);
 const v=S.muted||!S.vol?'mute':S.vol<40?'volmid':'vol';
 vol.innerHTML=OS.ico(v,16);
 if(batt){bt.style.display='';bt.innerHTML=OS.ico('battery',16)+`<small>${Math.round(batt.level*100)}%${batt.charging?'⚡':''}</small>`}else bt.style.display='none';
 $('#tbCam').style.display=OS.R.camUse>0?'':'none';
 $('#tbQS').title=`網路：${OS.wifiOn()?S.net:'未連線'}　音量：${S.muted?'靜音':S.vol+'%'}`;
}
OS.trayRender=trayRender;
let lastClock='';
function clockRender(){
 const d=new Date(),t=OS.fmtTime(d,S.showSec),dt=OS.fmtDateShort(d);
 const k=t+'|'+dt;if(k===lastClock)return;lastClock=k;
 $('#tbClock').innerHTML=`<span>${esc(t)}</span><small>${esc(dt)}</small>`;
 $('#tbClock').title=OS.fmtDateLong(d);
}
OS.clockRender=()=>{lastClock='';clockRender()};
setInterval(()=>{clockRender();OS.emit('tick')},1000);

/* ---------- 面板共用 ---------- */
let startOpen=false,startSearchMode=false,flyout=null,tvOpen=false,calMonth=null,qsView='main';
function closeAllPanels(){startClose();flyClose();tvClose();closePop();OS.closeMenu()}
OS.closeStartAndFlyouts=()=>{if(startOpen)startClose();if(flyout)flyClose();closePop()};
document.addEventListener('pointerdown',e=>{
 const t=e.target;
 if(startOpen&&!t.closest('#start')&&!t.closest('#tbStart')&&!t.closest('#tbSearch')&&!t.closest('.menu'))startClose();
 if(flyout&&!t.closest('#flyout')&&!t.closest('#tbQS')&&!t.closest('#tbClock')&&!t.closest('.menu')&&!t.closest('.dlgwrap'))flyClose();
 if(popFor&&!t.closest('.tbpop')&&!t.closest('.tbb'))closePop();
},true);
addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement&&document.activeElement.tagName==='IFRAME'){startClose();flyClose();closePop()}},0)});

/* ---------- 開始選單 ---------- */
let stSel=0,stResults=[],stAll=false;
function startShow(search){
 if(OS.R.state!=='desktop')return;
 startOpen=true;stAll=false;
 const st=$('#start');st.classList.add('show');st.classList.toggle('left',S.tbAlign==='left');
 $('#stq').value='';startRender();
 startSearchMode=!!search;
 $('#tbStart').classList.add('open');
 setTimeout(()=>{if(startOpen)$('#stq').focus({preventScroll:true})},30);
}
function startClose(){
 if(!startOpen)return;startOpen=false;startSearchMode=false;
 $('#start').classList.remove('show');$('#tbStart').classList.remove('open');
 $('#stq').blur();
}
OS.startToggle=()=>{if(startOpen)startClose();else{closeAllPanels();startShow()}};
function tile(id,cls){
 const a=OS.apps[id];return `<button type="button" class="stt ${cls||''}" data-app="${id}" title="${esc(a.name)}">${OS.appIcon(id,36)}<span>${esc(a.name)}</span></button>`;
}
function startRender(){
 const home=$('#stHome'),allv=$('#stAllV'),res=$('#stRes');
 const q=$('#stq').value.trim();
 home.style.display=!q&&!stAll?'':'none';allv.style.display=!q&&stAll?'':'none';res.style.display=q?'':'none';
 $('#stUser').innerHTML=OS.avatar(28)+`<span>${esc(S.name)}</span>`;
 if(q){renderResults(q);return}
 if(stAll){
  const apps=OS.installedApps().sort((a,b)=>OS.U.cmp(a.name,b.name));
  allv.innerHTML=`<div class="stsec"><button type="button" class="stback" id="stBack">${OS.ico('chevL',14)} 返回</button><b>所有應用程式</b></div><div class="stlist">${apps.map(a=>`<button type="button" class="stli" data-app="${a.id}">${OS.appIcon(a.id,28)}<span>${esc(a.name)}</span></button>`).join('')}</div>`;
  return;
 }
 const pins=S.startPinned.filter(id=>OS.apps[id]&&OS.appInstalled(id));
 const rec=S.startRecent?S.recent.map(id=>FS.get(id)).filter(n=>n&&!FS.inBin(n)&&n.type==='file').slice(0,6):[];
 home.innerHTML=`<div class="stsec"><b>已釘選</b><button type="button" id="stAllBtn">所有應用程式 ${OS.ico('chevR',12)}</button></div><div class="stgrid">${pins.map(id=>tile(id)).join('')||'<p class="stemp">沒有釘選的應用程式</p>'}</div>`+
 (S.startRecent?`<div class="stsec"><b>建議的項目</b></div><div class="strec">${rec.map(n=>`<button type="button" class="strc" data-open="${n.id}">${OS.fileIcon(n,30)}<span><b>${esc(FS.shown(n))}</b><small>${esc(FS.dpath(n.p))}</small></span></button>`).join('')||'<p class="stemp">開啟檔案後，會在這裡顯示最近的項目</p>'}</div>`:'');
}
function matchApp(a,q){
 const l=q.toLowerCase();
 return a.name.toLowerCase().includes(l)||(a.kw||'').toLowerCase().split(/\s+/).some(k=>k&&(k.startsWith(l)||l.startsWith(k)&&k.length>2))||(a.en||'').toLowerCase().includes(l);
}
function renderResults(q){
 const res=[];
 OS.installedApps().filter(a=>matchApp(a,q)).slice(0,6).forEach(a=>res.push({t:'應用程式',label:a.name,sub:'應用程式',icon:OS.appIcon(a.id,28),run:()=>OS.open(a.id)}));
 (OS.settingsIndex?OS.settingsIndex():[]).filter(s=>(s.name+' '+(s.kw||'')).toLowerCase().includes(q.toLowerCase())).slice(0,4).forEach(s=>res.push({t:'設定',label:s.name,sub:'設定',icon:OS.appIcon('settings',28),run:()=>OS.open('settings',{page:s.id})}));
 FS.search(q,'home',8).filter(n=>!FS.inBin(n)).forEach(n=>res.push({t:'檔案',label:FS.shown(n),sub:FS.dpath(n.p),icon:OS.fileIcon(n,28),run:()=>OS.openNode(n.id)}));
 res.push({t:'網頁',label:`搜尋「${q}」`,sub:'在青魚瀏覽器中搜尋',icon:OS.appIcon('browser',28),run:()=>OS.open('browser',{url:'qene:search?q='+encodeURIComponent(q),newTab:true})});
 stResults=res;stSel=0;
 const groups=[];res.forEach((r,i)=>{let g=groups.find(x=>x.t===r.t);if(!g){g={t:r.t,items:[]};groups.push(g)}g.items.push([r,i])});
 $('#stRes').innerHTML=groups.map(g=>`<div class="stsec"><b>${g.t}</b></div>`+g.items.map(([r,i])=>`<button type="button" class="stli${i===0?' sel':''}" data-r="${i}">${r.icon}<span>${esc(r.label)}<small>${esc(r.sub)}</small></span></button>`).join('')).join('');
}
function stRun(i){const r=stResults[i];if(!r)return;startClose();setTimeout(()=>r.run(),0)}
function bindStart(){
 const st=$('#start');
 $('#stq').addEventListener('input',()=>{startRender()});
 $('#stq').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if($('#stq').value){$('#stq').value='';startRender()}else startClose();return}
  if(!$('#stq').value.trim())return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();stSel=clamp(stSel+(e.key==='ArrowDown'?1:-1),0,stResults.length-1);
   $$('#stRes .stli').forEach(b=>b.classList.toggle('sel',+b.dataset.r===stSel));
   const s=$(`#stRes .stli[data-r="${stSel}"]`);if(s)s.scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'){e.preventDefault();stRun(stSel)}
 });
 st.addEventListener('click',e=>{
  const t=e.target;let b;
  if(t.closest('#stAllBtn')){stAll=true;startRender();return}
  if(t.closest('#stBack')){stAll=false;startRender();return}
  if(b=t.closest('[data-app]')){const id=b.dataset.app;startClose();OS.open(id);return}
  if(b=t.closest('[data-open]')){const id=b.dataset.open;startClose();OS.openNode(id);return}
  if(b=t.closest('[data-r]')){stRun(+b.dataset.r);return}
  if(t.closest('#stUser')){OS.menuUp($('#stUser'),[{label:'變更帳戶設定',ico:'user',fn:()=>{startClose();OS.open('settings',{page:'accounts'})}},{label:'鎖定',ico:'lock',fn:()=>{startClose();OS.lock()}},{label:'登出',fn:()=>{startClose();OS.signOut()}}]);return}
  if(t.closest('#stPower')){OS.menuUp($('#stPower'),[{label:'睡眠',ico:'moon',fn:()=>{startClose();OS.sleep()}},{label:'關機',ico:'power',fn:()=>{startClose();OS.shutdown()}},{label:'重新啟動',ico:'refresh',fn:()=>{startClose();OS.restart()}}]);return}
 });
 st.addEventListener('contextmenu',e=>{
  const b=e.target.closest('[data-app]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  const id=b.dataset.app,a=OS.apps[id];
  const pinned=S.startPinned.includes(id);
  OS.menu([
   {label:'開啟',fn:()=>{startClose();OS.open(id)}},
   pinned?{label:'從「開始」取消釘選',ico:'pin',fn:()=>OS.unpinStart(id)}:{label:'釘選到「開始」',ico:'pin',fn:()=>OS.pinStart(id)},
   S.tbPinned.includes(id)?{label:'從工作列取消釘選',fn:()=>OS.unpinTaskbar(id)}:{label:'釘選到工作列',fn:()=>OS.pinTaskbar(id)},
   {label:'建立桌面捷徑',fn:()=>{try{FS.create({parent:'desktop',name:a.name+'.lnk',kind:'app',app:id,text:'',unique:true});OS.toast('已在桌面建立捷徑')}catch(err){OS.alert(err.message)}}},
   a.store?{sep:1}:null,
   a.store?{label:'解除安裝',ico:'trash',danger:true,fn:()=>OS.uninstall(id)}:null
  ],e.clientX,e.clientY);
 });
}
OS.uninstall=async id=>{
 const a=OS.apps[id];if(!a||!a.store)return;
 if(!await OS.confirm(`要解除安裝「${a.name}」嗎？`,{title:'解除安裝',ok:'解除安裝',danger:true}))return;
 await Promise.all(WM.byApp(id).map(w=>WM.close(w,true)));
 S.inst=S.inst.filter(x=>x!==id);S.startPinned=S.startPinned.filter(x=>x!==id);S.tbPinned=S.tbPinned.filter(x=>x!==id);S.startup=S.startup.filter(x=>x!==id);
 // 刪除桌面上指向它的捷徑
 FS.allKids('desktop').filter(n=>n.kind==='app'&&n.app===id).forEach(n=>FS.purge([n.id]));
 OS.save();OS.tbRender();if(startOpen)startRender();OS.emit('apps');OS.toast(a.name+' 已解除安裝');
};

/* ---------- 飛出面板：快速設定 / 通知與行事曆 ---------- */
function flyShow(kind){
 if(OS.R.state!=='desktop')return;
 flyout=kind;qsView='main';
 const f=$('#flyout');f.className='flyout show '+kind;
 flyRender();
 $('#tbQS').classList.toggle('open',kind==='qs');$('#tbClock').classList.toggle('open',kind==='cal');
}
function flyClose(){
 if(!flyout)return;flyout=null;
 const f=$('#flyout');f.classList.remove('show');
 $('#tbQS').classList.remove('open');$('#tbClock').classList.remove('open');
}
function flyRender(){if(flyout==='qs')qsRender();else if(flyout==='cal')calRender()}
function tileQ(k,ico,label,sub,on,arrow){return `<div class="qt${on?' on':''}"><button type="button" class="qtb" data-q="${k}">${OS.ico(ico,20)}<span><b>${label}</b><small>${esc(sub)}</small></span></button>${arrow?`<button type="button" class="qta" data-q="${k}-more" aria-label="${label}選項">${OS.ico('chevR',14)}</button>`:''}</div>`}
function qsRender(){
 const f=$('#flyout');
 if(qsView==='net'){
  f.innerHTML=`<div class="qsh"><button type="button" class="qback" data-q="back">${OS.ico('chevL',16)}</button><b>Wi-Fi</b><span style="flex:1"></span><button type="button" class="tg${OS.wifiOn()?' on':''}" data-q="wifi" role="switch" aria-checked="${OS.wifiOn()}" aria-label="Wi-Fi"></button></div>`+
  (OS.wifiOn()?`<div class="qnets">${NETS.map(n=>`<button type="button" class="qn${n===S.net?' cur':''}" data-net="${esc(n)}">${OS.ico('wifi',18)}<span>${esc(n)}</span>${n===S.net?'<small>已連線</small>':''}</button>`).join('')}</div>`:'<p class="qemp">Wi-Fi 已關閉</p>');
  return;
 }
 const wOn=OS.wifiOn();
 f.innerHTML=`<div class="qgrid">${
  tileQ('wifi',wOn?'wifi':'wifioff','Wi-Fi',wOn?S.net:'關閉',wOn,true)+
  tileQ('bt','bt','藍牙',OS.btOn()?(S.btDev?'青魚耳機 Pro':'開啟'):'關閉',OS.btOn(),false)+
  tileQ('air','plane','飛航模式',S.airplane?'開啟':'關閉',S.airplane,false)+
  tileQ('focus','moon','專注輔助',S.focus?'勿擾':'關閉',S.focus,false)+
  tileQ('night','sun','夜間光',S.nightOn?'開啟':'關閉',S.nightOn,false)+
  tileQ('saver','battsave','節電模式',S.saver?'開啟':'關閉',S.saver,false)+
  tileQ('dark','moon','深色模式',S.dark?'開啟':'關閉',S.dark,false)+
  tileQ('full','full','全螢幕',isFs()?'開啟':'關閉',isFs(),false)
 }</div>
 <div class="qsl"><span>${OS.ico('sun',18)}</span><input type="range" min="30" max="100" value="${Math.round(S.bright*100)}" data-r="bright" aria-label="亮度"></div>
 <div class="qsl"><button type="button" class="qmute" data-q="mute" aria-label="靜音">${OS.ico(S.muted||!S.vol?'mute':'vol',18)}</button><input type="range" min="0" max="100" value="${S.muted?0:S.vol}" data-r="vol" aria-label="音量"></div>
 <div class="qsf"><span>${batt?OS.ico('battery',16)+' '+Math.round(batt.level*100)+'%'+(batt.charging?'（充電中）':''):OS.ico('desktop',16)+' '+esc(S.pcName)}</span><button type="button" class="qgear" data-q="settings" title="所有設定" aria-label="所有設定">${OS.ico('gear',18)}</button></div>`;
}
const isFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
OS.isFs=isFs;
OS.toggleFs=()=>{
 const d=document,el=d.documentElement;
 if(isFs()){try{(d.exitFullscreen||d.webkitExitFullscreen).call(d)}catch(e){}return}
 const f=el.requestFullscreen||el.webkitRequestFullscreen;
 if(!f){OS.toast('此瀏覽器不支援全螢幕');return}
 try{const r=f.call(el);if(r&&r.catch)r.catch(()=>OS.toast('無法進入全螢幕'))}catch(e){OS.toast('無法進入全螢幕')}
};
['fullscreenchange','webkitfullscreenchange'].forEach(t=>document.addEventListener(t,()=>{if(flyout==='qs'&&qsView==='main')qsRender()}));
OS.setWifi=on=>{
 if(on){S.airplane=false;S.wifi=true}else S.wifi=false;
 OS.save();trayRender();OS.emit('net');if(flyout==='qs')qsRender();
};
OS.setAirplane=on=>{S.airplane=!!on;OS.save();trayRender();OS.emit('net');if(flyout==='qs')qsRender()};
OS.setVol=(v,mute)=>{S.vol=clamp(Math.round(v),0,100);if(mute!==undefined)S.muted=!!mute;else if(S.vol>0)S.muted=false;OS.save();trayRender();OS.emit('vol')};
function bindFlyout(){
 const f=$('#flyout');
 f.addEventListener('click',e=>{
  const t=e.target;let b;
  if(b=t.closest('[data-q]')){
   const k=b.dataset.q;
   if(k==='wifi')OS.setWifi(!OS.wifiOn());
   else if(k==='wifi-more'){qsView='net';qsRender()}
   else if(k==='back'){qsView='main';qsRender()}
   else if(k==='bt'){if(S.airplane){S.airplane=false;S.bt=true}else S.bt=!S.bt;OS.save();trayRender();OS.emit('net');qsRender()}
   else if(k==='air')OS.setAirplane(!S.airplane);
   else if(k==='focus'){S.focus=!S.focus;OS.save();qsRender()}
   else if(k==='night'){S.nightOn=!S.nightOn;if(S.nightOn&&S.night<.1)S.night=.5;OS.save();OS.applyAll();qsRender()}
   else if(k==='saver'){S.saver=!S.saver;OS.save();OS.applyAll();qsRender()}
   else if(k==='dark'){S.dark=!S.dark;OS.save();OS.applyAll();qsRender()}
   else if(k==='full')OS.toggleFs();
   else if(k==='mute'){OS.setVol(S.vol,!S.muted);qsRender()}
   else if(k==='settings'){flyClose();OS.open('settings')}
   return;
  }
  if(b=t.closest('[data-net]')){S.net=b.dataset.net;S.wifi=true;OS.save();trayRender();OS.emit('net');qsRender();return}
  if(b=t.closest('[data-cal]')){
   const v=b.dataset.cal;
   if(v==='prev'||v==='next'){const c=calMonth||OS.parts();let m=c.m-1+(v==='next'?1:-1),y=c.y;if(m<0){m=11;y--}if(m>11){m=0;y++}calMonth={y,m:m+1,d:1};calRender();return}
   if(v==='today'){calMonth=null;calSel=null;calRender();return}
   if(v==='clear'){OS.R.notes=[];OS.emit('notes');return}
   if(v==='cal'){flyClose();OS.open('calendar');return}
  }
  if(b=t.closest('[data-day]')){calSel=b.dataset.day;calRender();return}
  if(b=t.closest('[data-nx]')){const id=b.dataset.nx;OS.R.notes=OS.R.notes.filter(n=>n.id!==id);OS.emit('notes');return}
  if(b=t.closest('[data-nopen]')){const n=OS.R.notes.find(x=>x.id===b.dataset.nopen);flyClose();if(n&&n.fn)try{n.fn()}catch(err){console.error(err)}return}
 });
 f.addEventListener('input',e=>{
  const r=e.target.closest('[data-r]');if(!r)return;
  const v=+r.value;
  if(r.dataset.r==='bright'){S.bright=v/100;OS.save();OS.applyAll()}
  else if(r.dataset.r==='vol'){OS.setVol(v,v===0);const m=$('.qmute',f);if(m)m.innerHTML=OS.ico(S.muted||!S.vol?'mute':'vol',18)}
 });
 f.addEventListener('change',e=>{const r=e.target.closest('[data-r="vol"]');if(r)OS.sfx('vol')});
}
OS.on('notes',()=>{if(flyout==='cal')calRender()});
OS.on('net',()=>{trayRender()});
OS.on('vol',()=>trayRender());
/* ---------- 行事曆資料 ---------- */
OS.calMatrix=(y,m,ws)=>{ // m: 1~12
 const first=new Date(y,m-1,1),off=(first.getDay()-ws+7)%7,out=[];
 for(let i=0;i<42;i++){const d=new Date(y,m-1,1-off+i);out.push({y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate(),other:d.getMonth()!==m-1})}
 return out;
};
const WD=['日','一','二','三','四','五','六'];
OS.WDAYS=WD;
let calSel=null;
function calRender(){
 const f=$('#flyout'),now=OS.parts(),c=calMonth||now,ws=S.weekStart;
 const notes=OS.R.notes;
 const mat=OS.calMatrix(c.y,c.m,ws),key=d=>d.y+'-'+pad(d.m)+'-'+pad(d.d);
 const today=OS.dateKey(now),selKey=calSel||today;
 const ev=S.events.filter(e=>e.date===selKey).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const hasEv=new Set(S.events.map(e=>e.date));
 f.innerHTML=`<div class="nhead"><b>通知</b><button type="button" class="nclr" data-cal="clear"${notes.length?'':' disabled'}>全部清除</button></div>
 <div class="nlist">${notes.length?notes.map(n=>`<div class="ni" data-nopen="${n.id}"><div class="nih">${n.app&&OS.apps[n.app]?OS.appIcon(n.app,16):OS.appIcon('settings',16)}<span class="lbl">${esc(n.app&&OS.apps[n.app]?OS.apps[n.app].name:'青魚電腦')}</span><small>${esc(OS.fmtTime(new Date(n.ts)))}</small><button type="button" class="nx" data-nx="${n.id}" aria-label="移除通知">${OS.ico('close',12)}</button></div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div>`).join(''):'<p class="qemp">沒有新的通知</p>'}</div>
 <div class="chead"><b>${OS.fmtDateLong()}</b></div>
 <div class="cnav"><b>${c.y} 年 ${c.m} 月</b><span><button type="button" data-cal="today" title="今天">${OS.ico('home',14)}</button><button type="button" data-cal="prev" aria-label="上個月">${OS.ico('chevU',14)}</button><button type="button" data-cal="next" aria-label="下個月">${OS.ico('chevD',14)}</button></span></div>
 <div class="cgrid">${Array.from({length:7},(_,i)=>`<i class="wd">${WD[(i+ws)%7]}</i>`).join('')}${mat.map(d=>{const k=key(d);return `<button type="button" class="cd${d.other?' o':''}${k===today?' today':''}${k===selKey?' sel':''}" data-day="${k}">${d.d}${hasEv.has(k)?'<u></u>':''}</button>`}).join('')}</div>
 <div class="cev">${ev.length?ev.map(e=>`<div><b>${esc(e.time||'全天')}</b> ${esc(e.title)}</div>`).join(''):`<span>${selKey} 沒有行程</span>`}${OS.appInstalled('calendar')?`<button type="button" class="clink" data-cal="cal">開啟行事曆</button>`:''}</div>`;
}

/* ---------- 工作檢視與虛擬桌面 ---------- */
function tvShow(){
 if(OS.R.state!=='desktop')return;
 tvOpen=true;$('#tv').classList.add('show');tvRender();$('#tbTV').classList.add('open');
}
function tvClose(){if(!tvOpen)return;tvOpen=false;$('#tv').classList.remove('show');$('#tbTV').classList.remove('open')}
function tvRender(){
 const tv=$('#tv');
 const ws=WM.visibleList().filter(w=>!w.closing);
 tv.innerHTML=`<div class="tvd">${WM.desks.map((d,i)=>`<div class="tvdi${i===WM.desk?' cur':''}" data-desk="${i}" tabindex="0"><span>桌面 ${i+1}</span>${WM.desks.length>1?`<button type="button" class="tvdx" data-delds="${i}" aria-label="關閉桌面 ${i+1}">${OS.ico('close',12)}</button>`:''}</div>`).join('')}${WM.desks.length<6?`<button type="button" class="tvadd" data-newds="1">${OS.ico('plus',14)} 新增桌面</button>`:''}</div>
 <div class="tvw">${ws.length?ws.map(w=>`<div class="tvc${w===WM.active?' act':''}" data-wid="${w.id}" tabindex="0"><div class="tvch">${OS.appIcon(w.app,18)}<span>${esc(w.title)}</span><button type="button" class="tvx" data-wx="${w.id}" aria-label="關閉視窗">${OS.ico('close',12)}</button></div><div class="tvcb">${OS.appIcon(w.app,64)}</div></div>`).join(''):'<p class="tvemp">這個桌面沒有開啟的視窗</p>'}</div>`;
}
function bindTV(){
 const tv=$('#tv');
 tv.addEventListener('click',e=>{
  const t=e.target;let b;
  if(b=t.closest('[data-wx]')){const w=WM.list.find(x=>x.id===b.dataset.wx);if(w)WM.close(w).then(()=>{if(tvOpen)tvRender()});return}
  if(b=t.closest('[data-delds]')){WM.removeDesk(+b.dataset.delds);tvRender();return}
  if(b=t.closest('[data-newds]')){const i=WM.addDesk();if(i>=0){WM.switchDesk(i);tvRender()}return}
  if(b=t.closest('[data-desk]')){WM.switchDesk(+b.dataset.desk);tvRender();return}
  if(b=t.closest('[data-wid]')){const w=WM.list.find(x=>x.id===b.dataset.wid);tvClose();if(w)WM.focus(w);return}
  if(t===tv||t.classList.contains('tvw'))tvClose();
 });
 tv.addEventListener('contextmenu',e=>{
  const b=e.target.closest('[data-wid]');e.preventDefault();if(!b)return;
  const w=WM.list.find(x=>x.id===b.dataset.wid);if(!w)return;
  OS.menu([{label:'關閉',fn:()=>WM.close(w).then(()=>{if(tvOpen)tvRender()})},{sep:1},...WM.desks.map((d,i)=>({label:'移至桌面 '+(i+1),dis:i===w.desk,fn:()=>{WM.moveToDesk(w,i);tvRender()}}))],e.clientX,e.clientY);
 });
 tv.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-wid],[data-desk]')){e.preventDefault();e.target.click()}});
}
OS.on('wm',()=>{OS.tbRender();if(tvOpen)tvRender()});
OS.on('desk',()=>{if(tvOpen)tvRender()});
OS.on('apps',()=>{OS.tbRender()});
OS.on('look',()=>{OS.tbRender();OS.clockRender();trayRender()});

/* ---------- 執行 ---------- */
OS.runCmd=str=>{
 let s=String(str||'').trim();if(!s)return false;
 if(/^(https?:\/\/|qene:)/i.test(s)||/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)&&!FS.parse(s)){OS.open('browser',{url:s,newTab:true});return true}
 const l=s.toLowerCase().replace(/\.exe$/,'');
 const app=Object.values(OS.apps).find(a=>OS.appInstalled(a.id)&&!a.hidden&&(a.name.toLowerCase()===l||(a.kw||'').toLowerCase().split(/\s+/).includes(l)));
 if(app){OS.open(app.id);return true}
 const n=FS.parse(s,'home');
 if(n){OS.openNode(n.id);return true}
 return false;
};
OS.run=()=>{
 let go=false,val='';
 OS.dialog({title:'執行',w:420,icon:OS.ico('desktop',16),body:`<p class="dmsg">輸入程式、資料夾、檔案或網址的名稱，青魚電腦會為你開啟。</p><div class="runrow"><label for="runin">開啟(O)：</label><input id="runin" class="inp dinp" type="text" autocomplete="off" spellcheck="false" list="runlist"><datalist id="runlist">${OS.installedApps().map(a=>`<option value="${esc(a.name)}">`).join('')}</datalist></div><div class="derr" role="alert"></div>`,
  buttons:[{id:'ok',label:'確定',primary:true},{id:'cancel',label:'取消'}],
  beforeClose:(id,w)=>{
   if(id!=='ok')return true;
   val=$('.dinp',w).value;
   if(!val.trim()){$('.derr',w).textContent='請輸入要開啟的項目。';return false}
   if(!OS.runCmd(val)){$('.derr',w).textContent=`找不到「${val.trim()}」。請確認名稱是否正確，然後再試一次。`;OS.sfx('error');return false}
   go=true;return true;
  },onShow:w=>{$('.dinp',w).addEventListener('input',()=>{$('.derr',w).textContent=''})}});
 void go;void val;
};

/* ---------- 快速鍵 ---------- */
let metaDown=false,metaCombo=false;
const kd=e=>{
 if(OS.R.state!=='desktop')return;
 if(document.querySelector('.dlgwrap')&&!(e.key==='Meta'))return;
 const k=e.key,lk=k.length===1?k.toLowerCase():k;
 if(k==='Meta'){metaDown=true;metaCombo=false;return}
 if(metaDown){
  metaCombo=true;
  const a=WM.active;
  if(lk==='d'){e.preventDefault();WM.showDesktop()}
  else if(lk==='e'){e.preventDefault();OS.open('explorer')}
  else if(lk==='r'){e.preventDefault();OS.run()}
  else if(lk==='l'){e.preventDefault();OS.lock()}
  else if(lk==='i'){e.preventDefault();OS.open('settings')}
  else if(lk==='Tab'){e.preventDefault();tvOpen?tvClose():(closeAllPanels(),tvShow())}
  else if(lk==='ArrowLeft'&&a){e.preventDefault();WM.snapTo(a,'left')}
  else if(lk==='ArrowRight'&&a){e.preventDefault();WM.snapTo(a,'right')}
  else if(lk==='ArrowUp'&&a){e.preventDefault();WM.maximize(a)}
  else if(lk==='ArrowDown'&&a){e.preventDefault();if(a.state==='max'||a.snap)WM.restore(a);else WM.minimize(a)}
  return;
 }
 if(k==='Escape'){
  if(startOpen){startClose();return}
  if(flyout){flyClose();return}
  if(tvOpen){tvClose();return}
  if(popFor){closePop();return}
 }
 if(e.ctrlKey&&k==='Escape'){e.preventDefault();OS.startToggle();return}
 if(e.ctrlKey&&e.shiftKey&&k==='Escape'){e.preventDefault();OS.open('taskmgr');return}
 if(e.ctrlKey&&e.altKey&&lk==='l'){e.preventDefault();OS.lock();return}
 if(e.ctrlKey&&e.altKey&&k==='ArrowLeft'){e.preventDefault();WM.switchDesk(Math.max(0,WM.desk-1));return}
 if(e.ctrlKey&&e.altKey&&k==='ArrowRight'){e.preventDefault();WM.switchDesk(Math.min(WM.desks.length-1,WM.desk+1));return}
 if(e.altKey&&!e.ctrlKey&&k==='F4'){e.preventDefault();if(WM.active)WM.close(WM.active);return}
 if(e.altKey&&!e.ctrlKey&&k==='Tab'){
  e.preventDefault();
  const vis=WM.order.filter(w=>w.desk===WM.desk&&!w.closing);
  if(vis.length>1)WM.focus(vis[vis.length-2]);
  return;
 }
 if(e.altKey&&!e.ctrlKey&&k===' '&&WM.active){e.preventDefault();const r=WM.active.el.getBoundingClientRect();WM.sysMenu(WM.active,r.left+6,r.top+30);return}
 if(e.altKey&&e.shiftKey&&WM.active){
  if(k==='ArrowLeft'){e.preventDefault();WM.snapTo(WM.active,'left')}
  else if(k==='ArrowRight'){e.preventDefault();WM.snapTo(WM.active,'right')}
  else if(k==='ArrowUp'){e.preventDefault();WM.maximize(WM.active)}
  return;
 }
 // 開始選單開啟時，直接打字就會跑到搜尋框
 if(startOpen&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&k.length===1&&document.activeElement!==$('#stq')){$('#stq').focus({preventScroll:true})}
};
document.addEventListener('keydown',kd,true);
document.addEventListener('keyup',e=>{
 if(e.key==='Meta'){
  const solo=metaDown&&!metaCombo;metaDown=false;metaCombo=false;
  if(solo&&OS.R.state==='desktop'&&!document.querySelector('.dlgwrap'))OS.startToggle();
 }
});
addEventListener('blur',()=>{metaDown=false;metaCombo=false});

/* ---------- 觸控長按 → 右鍵選單 ---------- */
(()=>{
 let t=0,sx=0,sy=0,synAt=0,tgt=null;
 document.addEventListener('pointerdown',e=>{
  clearTimeout(t);
  if(e.pointerType!=='touch'||!e.isPrimary)return;
  sx=e.clientX;sy=e.clientY;tgt=e.target;
  t=setTimeout(()=>{
   if(!tgt||!tgt.isConnected)return;
   synAt=performance.now();
   tgt.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:sx,clientY:sy,button:2}));
  },560);
 },true);
 const cancel=e=>{if(e.type==='pointermove'&&Math.hypot(e.clientX-sx,e.clientY-sy)<10)return;clearTimeout(t)};
 document.addEventListener('pointermove',cancel,true);document.addEventListener('pointerup',cancel,true);document.addEventListener('pointercancel',cancel,true);
 document.addEventListener('contextmenu',e=>{
  if(e.isTrusted&&performance.now()-synAt<900){e.preventDefault();e.stopImmediatePropagation();return}
  if(!OS.U.isTyping(e.target))e.preventDefault();
 },true);
 // 控制項（輸入框）內仍保留系統右鍵選單；其餘區域在冒泡階段再擋一次
 document.addEventListener('contextmenu',e=>{if(!OS.U.isTyping(e.target))e.preventDefault()});
})();
document.addEventListener('dragstart',e=>{if(!e.target.closest('input,textarea,[draggable=true]'))e.preventDefault()});
document.addEventListener('dragover',e=>{ // 避免把檔案拖進頁面時瀏覽器直接開啟
 if(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')&&!e.target.closest('#desktop,[data-filedrop]'))e.preventDefault();
});
document.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length&&!e.defaultPrevented)e.preventDefault()});

OS.initTaskbar=()=>{
 bindTaskbar();bindStart();bindFlyout();bindTV();
 battInit();OS.tbRender();trayRender();OS.clockRender();
 $('#tbStart').innerHTML=`<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><path d="M2.5 16C7.5 7 18 6 24 12l6-5v18l-6-5C18 26 7.5 25 2.5 16z" fill="currentColor"/><circle cx="9.5" cy="14" r="1.6" fill="var(--tbbg0)"/></svg>`;
 $('#tbSearch').innerHTML=OS.ico('search',16)+'<span>搜尋</span>';
 $('#tbTV').innerHTML=OS.ico('taskview',20);
 $('#tbCam').innerHTML=OS.ico('camera',16);$('#tbCam').title='相機正在使用中';
};
OS.closeAllPanels=closeAllPanels;
})();
