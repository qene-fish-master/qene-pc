/* 青魚電腦 — 開機、鎖定、登入、睡眠、關機、系統更新 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,wait}=OS.U,S=OS.S,WM=OS.WM,FS=OS.FS;
OS.hooks={start:[]};
const SCR=['boot','off','lockscr','login','sleep','welcome'];
function showScr(id){SCR.forEach(s=>{const e=$('#'+s);if(e)e.classList.toggle('show',s===id)})}
function setInert(on){['wins','desktop','taskbar'].forEach(i=>{const e=$('#'+i);if(e)e.inert=!!on})}
function bgSync(){const b=OS.wallCss();$$('.scr-bg').forEach(e=>{e.style.background=b})}
const FLOW={busy:false,fails:0};OS.flow=FLOW;
OS.bootScreen=msg=>{showScr('boot');setInert(true);$('#bootmsg').textContent=msg||'';const bar=$('#bootbar');bar.style.opacity='';bar.classList.remove('run');void bar.offsetWidth;bar.classList.add('run')};
OS.signInNow=()=>signIn();
OS.lockClock=()=>{
 const d=new Date();
 const t=$('#lkTime'),dt=$('#lkDate');if(!t)return;
 t.textContent=OS.fmtTime(d,false);dt.textContent=OS.fmtDateLong(d);
 const n=$('#lkNotes');
 if(n){
  const L=S.notif?OS.R.notes.slice(0,3):[];
  n.innerHTML=L.map(x=>`<div class="lkn"><b>${esc(x.title)}</b><span>${esc(x.body)}</span></div>`).join('');
 }
};
OS.on('tick',()=>{if(OS.R.state==='lock')OS.lockClock()});
OS.on('notes',()=>{if(OS.R.state==='lock')OS.lockClock()});

/* ---- 開機 ---- */
OS.boot=async(msg)=>{
 if(FLOW.busy)return;FLOW.busy=true;
 OS.closeAllPanels&&OS.closeAllPanels();
 OS.R.state='boot';showScr('boot');setInert(true);
 $('#bootmsg').textContent=msg||'';
 const bar=$('#bootbar');bar.classList.remove('run');void bar.offsetWidth;bar.classList.add('run');
 try{
  await Promise.all([FS.ready?Promise.resolve():FS.init(),wait(2300)]);
 }catch(e){console.error(e);OS.R.memOnly=true;if(!FS.ready){FS.nodes={};FS.seedTree();FS.ready=true}}
 OS.applyAll();OS.desk.render();OS.tbRender();OS.clockRender();OS.trayRender&&OS.trayRender();
 FLOW.busy=false;
 if(S.pend&&OS.resumePend){await OS.resumePend();OS.applyAll();OS.desk.render();OS.tbRender()}
 if(S.oobe&&OS.runOobe){OS.R.state='oobe';await OS.runOobe();return}
 showLock();
};
function showLock(){
 OS.R.state='lock';bgSync();OS.lockClock();
 showScr('lockscr');setInert(true);
 const l=$('#lockscr');l.classList.remove('up');
 try{if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur()}catch(e){}
 l.focus({preventScroll:true});
}
function toLogin(){
 if(OS.R.state!=='lock')return;
 if(!S.passOn){signIn();return}
 OS.R.state='login';bgSync();
 $('#lgAv').innerHTML=OS.avatar(112);$('#lgName').textContent=S.name;
 $('#lgPass').value='';$('#lgMsg').textContent='';
 $('#lgHint').textContent=FLOW.fails>=2&&S.hint?'密碼提示：'+S.hint:'';
 $('#lgReset').style.display=FLOW.fails>=5?'':'none';
 showScr('login');
 setTimeout(()=>$('#lgPass').focus(),60);
}
function loginTry(){
 const v=$('#lgPass').value;
 if(v===S.pass){FLOW.fails=0;signIn();return}
 FLOW.fails++;OS.sfx('error');
 const f=$('#lgForm');f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');
 $('#lgMsg').textContent='密碼不正確，請再試一次。';
 $('#lgHint').textContent=FLOW.fails>=2&&S.hint?'密碼提示：'+S.hint:'';
 $('#lgReset').style.display=FLOW.fails>=5?'':'none';
 $('#lgPass').value='';$('#lgPass').focus();
}
async function resetPass(){
 const v=await OS.prompt({title:'重設密碼',msg:'這是模擬環境，沒有真正的帳戶可以驗證。請輸入重設碼 00000，就會移除登入密碼。',type:'text',placeholder:'重設碼',max:10});
 if(v==null)return;
 if(v.trim()==='00000'){S.passOn=false;S.pass='';S.hint='';OS.save();FLOW.fails=0;OS.toast('已移除登入密碼');signIn()}
 else{OS.sfx('error');OS.alert('重設碼不正確。',{kind:'err'})}
}
function signIn(){
 const fresh=!OS.R.session;
 OS.sfx(fresh?'start':'unlock');
 setInert(false);
 OS.R.state='desktop';
 if(fresh){
  OS.R.session=true;
  $('#wlAv').innerHTML=OS.avatar(96);$('#wlName').textContent='你好，'+S.name;
  showScr('welcome');
  OS.desk.render();
  setTimeout(()=>{if(OS.R.state==='desktop')showScr(null);startSession()},1300);
 }else{
  showScr(null);
  OS.idleBump();
 }
 OS.idleBump();
}
function startSession(){
 OS.tbRender();OS.clockRender();OS.desk.render();
 S.startup.filter(id=>OS.apps[id]&&OS.appInstalled(id)).forEach((id,i)=>setTimeout(()=>{if(OS.R.state==='desktop')OS.open(id)},250+i*200));
 OS.hooks.start.forEach(f=>{try{f()}catch(e){console.error(e)}});
 if(S.first){
  S.first=false;OS.save();
  setTimeout(()=>OS.notify({app:'explorer',title:'歡迎使用青魚電腦',body:'這是網頁模擬器，不是真正的作業系統。點這裡看看說明文件。',fn:()=>{const n=FS.find1('documents','歡迎使用青魚電腦.txt');if(n)OS.openNode(n.id)}}),1200);
 }
 if(OS.R.afterUpdate){const v=OS.R.afterUpdate;OS.R.afterUpdate=null;setTimeout(()=>OS.notify({app:'settings',title:'QeneOS 已更新',body:'目前版本：QeneOS '+v}),1500)}
 if(OS.R.memOnly&&!OS.R.memWarned){OS.R.memWarned=1;setTimeout(()=>OS.notify({app:'settings',title:'無法永久儲存',body:'這個瀏覽器環境不允許儲存資料，關閉頁面後檔案會消失。'}),2500)}
 setTimeout(OS.checkUpdate,4000);
}
/* ---- 鎖定、登出、睡眠 ---- */
OS.lock=()=>{
 if(OS.R.state!=='desktop')return;
 OS.closeAllPanels&&OS.closeAllPanels();OS.clearToasts&&OS.clearToasts();
 FLOW.fails=0;showLock();
};
async function dirtyOk(what){
 if(!WM.anyDirty())return true;
 return OS.confirm('有些應用程式還有尚未儲存的內容。如果繼續'+what+'，這些變更會遺失。',{title:'有未儲存的內容',ok:'仍要'+what,danger:true});
}
OS.signOut=async()=>{
 if(OS.R.state!=='desktop')return;
 if(!await dirtyOk('登出'))return;
 OS.closeAllPanels();await WM.closeAll();WM.resetDesks();OS.R.notes=[];OS.clearToasts();
 OS.R.session=false;FLOW.fails=0;showLock();
};
OS.sleep=()=>{
 if(OS.R.state!=='desktop')return;
 OS.closeAllPanels();
 OS.R.state='sleep';setInert(true);showScr('sleep');
 try{if(document.activeElement)document.activeElement.blur()}catch(e){}
 $('#sleep').focus({preventScroll:true});
};
function wakeUp(){if(OS.R.state!=='sleep')return;FLOW.fails=0;showLock()}
async function powerDown(restart,what,msg){
 if(FLOW.busy||(OS.R.state!=='desktop'&&OS.R.state!=='lock'&&OS.R.state!=='login'))return;
 if(OS.R.state==='desktop'&&!await dirtyOk(what))return;
 FLOW.busy=true;
 OS.closeAllPanels();OS.sfx('shutdown');
 OS.R.state='boot';showScr('boot');setInert(true);
 $('#bootmsg').textContent=msg;const bar=$('#bootbar');bar.classList.remove('run');bar.style.opacity='0';
 await WM.closeAll();WM.resetDesks();OS.R.notes=[];OS.clearToasts();OS.R.session=false;
 OS.saveNow();await FS.saveNow();
 await wait(1500);
 bar.style.opacity='';
 FLOW.busy=false;
 if(restart)OS.boot('');else{OS.R.state='off';showScr('off');setTimeout(()=>$('#offbtn').focus(),50)}
}
OS.shutdown=()=>powerDown(false,'關機','正在關機…');
OS.restart=()=>powerDown(true,'重新啟動','正在重新啟動…');
/* ---- 系統更新 ---- */
const VERS=['1.0','1.1','1.2','2.0'];
OS.VERS=VERS;
OS.UPDI={'1.1':{mb:182,n:['改善鎖定畫面與登入動畫','修正已知問題']},'1.2':{mb:240,n:['提升工作列與開始選單的反應速度','改善檔案總管穩定性']},'2.0':{mb:512,n:['全新青魚潮汐介面','更快的應用程式啟動','安全性改善']}};
OS.nextVer=()=>VERS[VERS.indexOf(S.ver)+1]||null;
OS.checkUpdate=()=>{
 const n=OS.nextVer();
 if(S.autoUpd&&OS.isOnline()&&n&&!OS.R.updNoted&&OS.R.state==='desktop'){
  OS.R.updNoted=1;
  OS.notify({app:'settings',title:'軟體更新',body:'QeneOS '+n+' 已可下載，請到「設定 > 軟體更新」。',fn:()=>OS.open('settings',{page:'update'})});
 }
};
/* ---- 閒置自動鎖定 ---- */
let lastAct=Date.now();
OS.idleBump=()=>{lastAct=Date.now()};
['pointerdown','pointermove','keydown','wheel','touchstart'].forEach(t=>addEventListener(t,()=>{lastAct=Date.now()},{passive:true,capture:true}));
OS.keepAwake=()=>{
 const a=WM.active;
 if(a&&(a.app==='games'||a.app==='browser'||a.app==='media'||a.app==='camera'))return true;
 return !!OS.R.mediaPlaying;
};
setInterval(()=>{
 if(OS.R.state!=='desktop'||!S.idle)return;
 if(OS.keepAwake()){lastAct=Date.now();return}
 if(Date.now()-lastAct>S.idle*60000)OS.lock();
},5000);
/* ---- 事件綁定 ---- */
OS.initPower=()=>{
 const lk=$('#lockscr');
 let sy=null;
 lk.addEventListener('pointerdown',e=>{if(e.target.closest('.scrbtn'))return;sy=e.clientY});
 lk.addEventListener('pointerup',e=>{
  if(e.target.closest('.scrbtn')){sy=null;return}
  sy=null;toLogin();
 });
 lk.addEventListener('keydown',e=>{
  if(['Shift','Control','Alt','Meta','CapsLock','Tab'].includes(e.key))return;
  e.preventDefault();toLogin();
 });
 $('#lgForm').addEventListener('submit',e=>{e.preventDefault();loginTry()});
 $('#lgBack').addEventListener('click',()=>{if(OS.R.state==='login')showLock()});
 $('#lgReset').addEventListener('click',resetPass);
 $('#login').addEventListener('keydown',e=>{if(e.key==='Escape'&&OS.R.state==='login')showLock()});
 const pw=e=>{
  const b=e.currentTarget;
  OS.menuUp(b,[{label:'睡眠',ico:'moon',fn:()=>OS.sleep2()},{label:'關機',ico:'power',fn:()=>OS.shutdown()},{label:'重新啟動',ico:'refresh',fn:()=>OS.restart()}]);
 };
 $$('.scrpw').forEach(b=>b.addEventListener('click',pw));
 OS.sleep2=()=>{ // 從登入畫面睡眠
  OS.R.state='sleep';showScr('sleep');try{document.activeElement.blur()}catch(e){}$('#sleep').focus({preventScroll:true});
 };
 const sl=$('#sleep');
 ['pointerdown','keydown'].forEach(t=>sl.addEventListener(t,e=>{if(t==='keydown'&&['Shift','Control','Alt','Meta'].includes(e.key))return;wakeUp()}));
 const off=$('#off');
 off.addEventListener('click',()=>{if(OS.R.state==='off')OS.boot('')});
 off.addEventListener('keydown',e=>{if(OS.R.state==='off'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();OS.boot('')}});
 addEventListener('beforeunload',e=>{if(WM.anyDirty()){e.preventDefault();e.returnValue=''}});
};
})();
