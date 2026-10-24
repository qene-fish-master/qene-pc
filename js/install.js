/* 青魚電腦 — 系統安裝畫面：系統更新、重設電腦、首次設定 (OOBE) */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,wait}=OS.U,S=OS.S,WM=OS.WM,FS=OS.FS;
const T=ms=>wait(OS.R.fast?4:ms);
let el=null;
function ensure(){
 if(el&&el.isConnected)return el;
 el=document.createElement('div');el.id='inst';el.className='scr';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.innerHTML=`<svg class="blogo"><use href="#fish"/></svg><div class="ititle"></div><div class="ispin"><i></i><i></i><i></i><i></i><i></i></div><div class="ipct"></div><div class="imsg"></div><div class="iwarn">請不要關閉電腦</div>`;
 $('#os').appendChild(el);return el;
}
function showInst(on){ensure().classList.toggle('show',!!on)}
function paint(title,pct,msg,warn){
 const e=ensure();
 $('.ititle',e).textContent=title;
 $('.ipct',e).textContent=pct==null?'':Math.floor(pct)+'% 完成';
 $('.imsg',e).textContent=msg||'';
 $('.iwarn',e).style.visibility=warn===false?'hidden':'';
}
async function ramp(title,from,to,msgFor,tick){
 let p=from;
 while(p<to){
  p=Math.min(to,p+1+Math.floor(Math.random()*3));
  paint(title,p,msgFor(p));
  if(S.pend){S.pend.pct=p;if(p%8===0)OS.saveNow()}
  await T(tick||120);
 }
 OS.saveNow();
}
/* ---------- 系統更新 ---------- */
const UMSG_A=p=>p<12?'正在準備更新…':p<26?'正在關閉應用程式…':'正在儲存您的設定…';
const UMSG_B=p=>p<52?'正在複製新的檔案…':p<72?'正在安裝系統元件…':p<90?'正在更新應用程式與驅動程式…':'正在完成設定…';
OS.installUpdate=async v=>{
 const F=OS.flow;
 if(F.busy||OS.R.state!=='desktop'||!OS.UPDI[v])return;
 if(WM.anyDirty()&&!await OS.confirm('有些應用程式還有尚未儲存的內容。如果繼續安裝更新，這些變更會遺失。',{title:'有未儲存的內容',ok:'仍要安裝',danger:true}))return;
 F.busy=true;
 OS.closeAllPanels();OS.sfx('shutdown');
 OS.R.state='boot';OS.bootScreen('');showInst(false);
 await WM.closeAll();WM.resetDesks();OS.R.notes=[];OS.clearToasts();OS.R.session=false;
 S.pend={kind:'update',v,pct:0};OS.saveNow();
 showInst(true);
 await ramp('正在處理更新',0,35,UMSG_A);
 showInst(false);OS.bootScreen('正在重新啟動…');await T(1500);
 F.busy=false;
 OS.boot('');
};
async function finishUpdate(p){
 await ramp('正在處理更新',Math.max(35,p.pct||0),100,UMSG_B);
 S.ver=p.v;S.updLog=[{v:p.v,ts:Date.now()}].concat(S.updLog||[]).slice(0,20);
 S.pend=null;OS.R.updNoted=0;OS.R.afterUpdate=p.v;OS.saveNow();
 paint('請稍候…',null,'我們正在讓一切準備就緒',false);await T(1800);
}
/* ---------- 重設此電腦（重新安裝系統） ---------- */
OS.reinstall=async()=>{
 const F=OS.flow;
 if(F.busy||OS.R.state!=='desktop')return;
 const ok=await OS.confirm('這會刪除這台電腦上的所有檔案、設定與已安裝的應用程式，然後重新安裝 QeneOS。這個動作無法復原。\n\n確定要重設嗎？',{title:'重設此電腦',ok:'重設',danger:true});
 if(!ok)return;
 F.busy=true;
 OS.closeAllPanels();OS.sfx('shutdown');
 OS.R.state='boot';OS.bootScreen('');
 await WM.closeAll();WM.resetDesks();OS.R.notes=[];OS.clearToasts();OS.R.session=false;
 S.pend={kind:'reset',pct:0};OS.saveNow();
 F.busy=false;
 await OS.resumePend();
};
const RMSG=p=>p<12?'正在準備重設…':p<22?'正在刪除個人檔案與設定…':p<40?'正在複製系統檔案…':p<62?'正在安裝系統功能…':p<82?'正在安裝驅動程式…':p<95?'正在設定 QeneOS…':'即將完成…';
async function doReset(p){
 showInst(true);
 const title='正在重設此電腦';
 if((p.pct||0)<20)await ramp(title,p.pct||0,20,RMSG);
 // 清除資料
 OS.R.wiping=true;
 try{
  await OS.DB.clear('kv');await OS.DB.clear('blobs');
  const fresh=JSON.parse(JSON.stringify(OS.D));
  fresh.ver=S.ver;fresh.oobe=true;fresh.first=true;fresh.instDate=Date.now();fresh.pend={kind:'reset',pct:20};
  localStorage.setItem('qene.pc.v1',JSON.stringify(fresh));
  localStorage.removeItem('qene.v1');
 }catch(e){console.error(e)}
 await ramp(title,Math.max(20,p.pct||0),100,RMSG);
 try{const f=JSON.parse(localStorage.getItem('qene.pc.v1')||'{}');f.pend=null;localStorage.setItem('qene.pc.v1',JSON.stringify(f))}catch(e){}
 paint('正在重新啟動…',null,'',false);await T(1200);
 location.reload();
 await new Promise(()=>{}); // 等待重新載入
}
OS.resumePend=async()=>{
 const p=S.pend;if(!p)return;
 OS.R.state='boot';
 try{
  if(p.kind==='update'&&OS.UPDI[p.v]){
   showInst(true);
   if((p.pct||0)<35){await ramp('正在處理更新',p.pct||0,35,UMSG_A);showInst(false);OS.bootScreen('正在重新啟動…');await T(1200);showInst(true)}
   await finishUpdate(p);
  }else if(p.kind==='reset'){
   await doReset(p);return;
  }else{S.pend=null;OS.saveNow()}
 }catch(e){console.error(e);S.pend=null;OS.saveNow()}
 showInst(false);OS.bootScreen('');
};

/* ---------- 首次設定 (OOBE) ---------- */
OS.runOobe=()=>new Promise(resolve=>{
 const os=$('#os');
 const d={pcName:S.pcName,name:S.name,avatar:S.avatar,pass:'',pass2:'',hint:'',dark:S.dark,accent:S.accent,wall:S.wall};
 let step=0,busy=false;
 const box=document.createElement('div');box.id='oobe';box.className='scr show';
 box.innerHTML=`<div class="oobebg"></div><div class="oobec"><svg class="blogo"><use href="#fish"/></svg><div class="oobeb"></div><div class="oobeerr" role="alert"></div><div class="oobef"></div></div>`;
 os.appendChild(box);
 OS.bootScreen('');$('#boot').classList.remove('show');
 const bg=$('.oobebg',box);bg.style.background=OS.wallCss();
 const SW=['#14a094','#2f7bd9','#7a5cd6','#d6456f','#e07b1f','#2e9e6b'];
 const STEPS=[
  {t:'你好',h:()=>`<p>歡迎使用青魚電腦。我們先花一分鐘完成幾個設定。</p><label class="ol">地區與語言</label><select class="inp" disabled aria-label="地區"><option>台灣・繁體中文</option></select><label class="ol">時區</label><select class="inp otz" aria-label="時區">${[['','自動（瀏覽器）'],['Asia/Taipei','台北 (UTC+8)'],['Asia/Tokyo','東京 (UTC+9)'],['Europe/London','倫敦'],['America/New_York','紐約'],['America/Los_Angeles','洛杉磯']].map(([v,l])=>`<option value="${v}"${S.tz===v?' selected':''}>${l}</option>`).join('')}</select>`,ok:()=>{S.tz=$('.otz',box).value;return ''}},
  {t:'為你的電腦命名',h:()=>`<p>這個名稱會顯示在「設定」和網路上。</p><input class="inp oin" data-k="pcName" value="${esc(d.pcName)}" maxlength="15" aria-label="電腦名稱" spellcheck="false" autocomplete="off">`,ok:()=>{const v=d.pcName.trim();if(!v)return '請輸入電腦名稱。';if(!/^[A-Za-z0-9-]+$/.test(v))return '電腦名稱只能包含英文字母、數字與連字號 (-)。';return ''}},
  {t:'誰會使用這台電腦？',h:()=>`<p>輸入你的名字，並選一個喜歡的大頭貼顏色。</p><input class="inp oin" data-k="name" value="${esc(d.name)}" maxlength="20" aria-label="使用者名稱" spellcheck="false" autocomplete="off"><div class="osw av">${OS.AVCOLORS.map((c,i)=>`<button type="button" class="${i===d.avatar%OS.AVCOLORS.length?'on':''}" data-av="${i}" style="background:${c}" aria-label="顏色 ${i+1}"></button>`).join('')}</div>`,ok:()=>{if(!d.name.trim())return '請輸入使用者名稱。';return ''}},
  {t:'建立密碼（選用）',h:()=>`<p>設定密碼後，每次開機都需要輸入。想先不設定可以直接按「下一步」。</p><input class="inp oin" type="password" data-k="pass" value="${esc(d.pass)}" placeholder="密碼" maxlength="40" aria-label="密碼" autocomplete="new-password"><input class="inp oin" type="password" data-k="pass2" value="${esc(d.pass2)}" placeholder="再輸入一次" maxlength="40" aria-label="確認密碼" autocomplete="new-password"><input class="inp oin" data-k="hint" value="${esc(d.hint)}" placeholder="密碼提示（選用）" maxlength="40" aria-label="密碼提示" autocomplete="off">`,ok:()=>{if(d.pass||d.pass2){if(d.pass!==d.pass2)return '兩次輸入的密碼不一致。'}return ''}},
  {t:'選擇外觀',h:()=>`<div class="omode"><button type="button" data-m="0" class="${d.dark?'':'on'}">淺色</button><button type="button" data-m="1" class="${d.dark?'on':''}">深色</button></div><div class="osw ac">${SW.map(c=>`<button type="button" class="${c===d.accent?'on':''}" data-ac="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div><div class="osw wl">${OS.WALLS.map((w,i)=>`<button type="button" class="${i===d.wall?'on':''}" data-w="${i}" style="background:${w.c}" aria-label="${w.n}" title="${w.n}"></button>`).join('')}</div>`,ok:()=>''}
 ];
 const body=$('.oobeb',box),err=$('.oobeerr',box),foot=$('.oobef',box);
 function live(){S.dark=d.dark;S.accent=d.accent;S.wall=d.wall;S.useCustom=false;OS.applyAll();bg.style.background=OS.wallCss()}
 function draw(){
  const s=STEPS[step];err.textContent='';
  body.innerHTML=`<h1>${s.t}</h1>${s.h()}`;
  foot.innerHTML=`<button type="button" class="btn" data-o="back"${step?'':' style="visibility:hidden"'}>上一步</button><span class="oobed">${STEPS.map((_,i)=>`<i class="${i===step?'on':''}"></i>`).join('')}</span><button type="button" class="btn pri" data-o="next">${step===STEPS.length-1?'完成':'下一步'}</button>`;
  const f=$('.oin,.otz',body);if(f)setTimeout(()=>{f.focus();if(f.select)f.select()},30);else setTimeout(()=>$('[data-o=next]',box).focus(),30);
 }
 box.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.k;if(k){d[k]=e.target.value;err.textContent=''}});
 box.addEventListener('click',e=>{
  if(busy)return;
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.o==='back'){if(step>0){step--;draw()}}
  else if(b.dataset.o==='next')next();
  else if(b.dataset.av!=null){d.avatar=+b.dataset.av;$$('.av button',body).forEach(x=>x.classList.toggle('on',x===b))}
  else if(b.dataset.m!=null){d.dark=b.dataset.m==='1';$$('.omode button',body).forEach(x=>x.classList.toggle('on',x===b));live()}
  else if(b.dataset.ac){d.accent=b.dataset.ac;$$('.ac button',body).forEach(x=>x.classList.toggle('on',x===b));live()}
  else if(b.dataset.w!=null){d.wall=+b.dataset.w;$$('.wl button',body).forEach(x=>x.classList.toggle('on',x===b));live()}
 });
 box.addEventListener('keydown',e=>{if(e.key==='Enter'&&!busy&&e.target.tagName!=='BUTTON'){e.preventDefault();next()}});
 async function next(){
  const s=STEPS[step],m=s.ok();
  if(m){err.textContent=m;OS.sfx('error');return}
  if(step<STEPS.length-1){step++;draw();return}
  busy=true;
  S.pcName=d.pcName.trim();S.name=d.name.trim();S.avatar=d.avatar;S.dark=d.dark;S.accent=d.accent;S.wall=d.wall;S.useCustom=false;
  if(d.pass){S.pass=d.pass;S.passOn=true;S.hint=d.hint.trim()}else{S.pass='';S.passOn=false;S.hint=''}
  S.oobe=false;OS.saveNow();OS.applyAll();
  body.innerHTML='<h1>正在為你準備一切</h1><div class="ispin"><i></i><i></i><i></i><i></i><i></i></div><p class="oobem"></p>';foot.innerHTML='';
  const msgs=['正在設定你的帳戶…','正在套用外觀設定…','正在安裝內建應用程式…','正在準備桌面…','即將完成…'];
  for(const m of msgs){const q=$('.oobem',body);if(q)q.textContent=m;await T(750)}
  box.remove();
  OS.R.state='lock';
  OS.signInNow();
  resolve();
 }
 draw();
});
})();
