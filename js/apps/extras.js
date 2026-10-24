/* 青魚電腦 — 商店應用程式：時鐘、魚缸、手機連結、便利貼、錄音機 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp,pad,uid}=OS.U,FS=OS.FS,S=OS.S;
const CITIES=[['台北','Asia/Taipei'],['東京','Asia/Tokyo'],['首爾','Asia/Seoul'],['上海','Asia/Shanghai'],['香港','Asia/Hong_Kong'],['新加坡','Asia/Singapore'],['雪梨','Australia/Sydney'],['倫敦','Europe/London'],['巴黎','Europe/Paris'],['紐約','America/New_York'],['芝加哥','America/Chicago'],['洛杉磯','America/Los_Angeles'],['UTC','UTC']];
const cityName=z=>(CITIES.find(c=>c[1]===z)||[z])[0];

/* ================= 時鐘 ================= */
const SW=OS.R.sw={run:false,t:0,s:0,laps:[]};
const TM=OS.R.tm={run:false,left:0,total:0,end:0,done:false};
const swMs=()=>SW.t+(SW.run?performance.now()-SW.s:0);
const swFmt=ms=>pad(Math.floor(ms/60000))+':'+pad(Math.floor(ms/1000)%60)+'.'+pad(Math.floor(ms/10)%100);
OS.on('tick',()=>{
 if(OS.R.state!=='desktop')return;
 // 計時器
 if(TM.run&&Date.now()>=TM.end){TM.run=false;TM.left=0;TM.done=true;OS.ring(6);OS.notify({app:'clock',title:'計時器',body:'時間到了！',fn:()=>OS.open('clock',{tab:'timer'})});OS.emit('clockui')}
 // 鬧鐘
 if(!OS.appInstalled('clock'))return;
 const p=OS.parts(),hm=pad(p.hh)+':'+pad(p.mm),k=OS.dateKey(p)+' '+hm;
 if(OS.R.alarmMin===k)return;OS.R.alarmMin=k;
 S.alarms.forEach(a=>{
  if(!a.on||a.time!==hm||!(p.ss<5||true))return;
  if(a.days&&a.days.length&&!a.days.includes(p.dow))return;
  OS.ring(8);OS.notify({app:'clock',title:'鬧鐘 '+a.time,body:a.label||'時間到了',fn:()=>OS.open('clock',{tab:'alarm'})});
  if(!a.days||!a.days.length){a.on=false;OS.save();OS.emit('clockui')}
 });
});
OS.register({id:'clock',name:'時鐘',kw:'clock alarm timer stopwatch world 時鐘 鬧鐘 計時器 碼表 世界時鐘',store:true,cat:'tool',desc:'世界時鐘、鬧鐘、計時器與碼表',
 g:'linear-gradient(145deg,#f4c95d,#c9822b)',s:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',w:520,h:560,minW:360,minH:420,single:true,
 create(win,args){
  const root=document.createElement('div');root.className='ck2';win.body.appendChild(root);
  let tab=(args&&args.tab)||'world';
  root.innerHTML=`<div class="tktabs ckt"><button type="button" data-t="world">世界時鐘</button><button type="button" data-t="alarm">鬧鐘</button><button type="button" data-t="timer">計時器</button><button type="button" data-t="sw">碼表</button></div><div class="ckb"></div>`;
  const body=$('.ckb',root);
  function draw(){
   $$('.ckt button',root).forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
   if(tab==='world'){
    const now=new Date();
    body.innerHTML=`<div class="ckw">${S.clocks.map((z,i)=>{const p=OS.parts(now,z),loc=OS.parts(now),d=Math.round(((Date.UTC(p.y,p.m-1,p.d,p.hh,p.mm)-Date.UTC(loc.y,loc.m-1,loc.d,loc.hh,loc.mm))/3600000));return `<div class="ckwi"><div><b>${esc(cityName(z))}</b><small>${d===0?'與本地相同':(d>0?'比本地快 ':'比本地慢 ')+Math.abs(d)+' 小時'}</small></div><span class="ckwt" data-z="${esc(z)}">${esc(OS.fmtTime(now,true,z))}</span><button type="button" class="ab" data-rm="${i}" aria-label="移除">${OS.ico('close',14)}</button></div>`}).join('')||'<p class="empty-s">沒有城市。</p>'}</div><div class="ckadd"><select class="inp" aria-label="新增城市">${CITIES.filter(c=>!S.clocks.includes(c[1])).map(c=>`<option value="${c[1]}">${c[0]}</option>`).join('')}</select><button type="button" class="btn pri" data-a="addc">新增城市</button></div>`;
   }else if(tab==='alarm'){
    body.innerHTML=`<div class="ckal">${S.alarms.map(a=>`<div class="ckai"><div><b>${esc(a.time)}</b><small>${esc(a.label||'鬧鐘')}${a.days&&a.days.length?'　每週 '+a.days.map(d=>OS.WDAYS[d]).join('、'):'　一次'}</small></div><button type="button" class="tg${a.on?' on':''}" role="switch" aria-checked="${!!a.on}" aria-label="啟用鬧鐘" data-tg="${a.id}"></button><button type="button" class="ab" data-ed="${a.id}" aria-label="編輯">${OS.ico('edit',14)}</button><button type="button" class="ab" data-del="${a.id}" aria-label="刪除">${OS.ico('trash',14)}</button></div>`).join('')||'<p class="empty-s">還沒有鬧鐘。</p>'}</div><div class="ckadd"><button type="button" class="btn pri" data-a="adda">${OS.ico('plus',14)} 新增鬧鐘</button></div>`;
   }else if(tab==='timer'){
    const left=TM.run?Math.max(0,TM.end-Date.now()):TM.left;
    const h=Math.floor(left/3600000),m=Math.floor(left/60000)%60,s=Math.ceil(left/1000)%60;
    body.innerHTML=`<div class="ckt2"><div class="ckbig" id="tmd">${pad(h)}:${pad(m)}:${pad(s%60)}</div>${!TM.run&&!TM.left?`<div class="ckset"><label>時<input class="inp" type="number" min="0" max="99" value="0" id="tmh"></label><label>分<input class="inp" type="number" min="0" max="59" value="5" id="tmm"></label><label>秒<input class="inp" type="number" min="0" max="59" value="0" id="tms"></label></div>`:`<div class="upbar ckpb"><i id="tmb" style="width:${TM.total?(1-left/TM.total)*100:0}%"></i></div>`}<div class="btnrow ckbr">${TM.run?'<button type="button" class="btn" data-a="tpause">暫停</button>':TM.left?'<button type="button" class="btn pri" data-a="tgo">繼續</button>':'<button type="button" class="btn pri" data-a="tgo">開始</button>'}${TM.run||TM.left?'<button type="button" class="btn" data-a="trst">重設</button>':''}</div>${TM.done?'<p class="okt">時間到了！</p>':''}</div>`;
   }else{
    body.innerHTML=`<div class="ckt2"><div class="ckbig" id="swd">${swFmt(swMs())}</div><div class="btnrow ckbr"><button type="button" class="btn pri" data-a="swgo">${SW.run?'停止':'開始'}</button><button type="button" class="btn" data-a="swlap"${SW.run?'':' disabled'}>分圈</button><button type="button" class="btn" data-a="swrst"${!SW.run&&!SW.t?' disabled':''}>重設</button></div><div class="sgrp ckla">${SW.laps.map((l,i)=>`<div class="sr1"><span>第 ${SW.laps.length-i} 圈</span><em>${l}</em></div>`).join('')}</div></div>`;
   }
  }
  async function alarmDlg(a0){
   const a=a0||{id:uid(),time:'07:30',label:'',on:true,days:[]};
   const r=await win.dialog({title:a0?'編輯鬧鐘':'新增鬧鐘',w:360,body:`<label class="ol2">時間</label><input class="inp dinp al-t" type="time" value="${a.time}" aria-label="時間"><label class="ol2">名稱</label><input class="inp dinp al-l" maxlength="30" value="${esc(a.label)}" aria-label="名稱"><label class="ol2">重複（不選＝只響一次）</label><div class="aldays">${[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" value="${d}"${(a.days||[]).includes(d)?' checked':''}>${OS.WDAYS[d]}</label>`).join('')}</div><div class="derr"></div>`,buttons:[{id:'ok',label:'儲存',primary:true},{id:'cancel',label:'取消'}],
    beforeClose:(id,w)=>{if(id!=='ok')return true;const t=$('.al-t',w).value;if(!/^\d{2}:\d{2}$/.test(t)){$('.derr',w).textContent='請選擇時間。';return false}a.time=t;a.label=$('.al-l',w).value.trim();a.days=$$('.aldays input:checked',w).map(x=>+x.value);a.on=true;return true}});
   if(r!=='ok')return;
   if(!a0)S.alarms.push(a);S.alarms.sort((x,y)=>x.time.localeCompare(y.time));OS.save();draw();
  }
  root.addEventListener('click',async e=>{
   const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;draw();return}
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.rm!=null){S.clocks.splice(+b.dataset.rm,1);OS.save();draw();return}
   if(b.dataset.tg){const a=S.alarms.find(x=>x.id===b.dataset.tg);if(a){a.on=!a.on;OS.save();draw()}return}
   if(b.dataset.ed){const a=S.alarms.find(x=>x.id===b.dataset.ed);if(a)alarmDlg(a);return}
   if(b.dataset.del){S.alarms=S.alarms.filter(x=>x.id!==b.dataset.del);OS.save();draw();return}
   const a=b.dataset.a;if(!a)return;
   if(a==='addc'){const v=$('.ckadd select',root).value;if(v&&!S.clocks.includes(v)){S.clocks.push(v);OS.save();draw()}}
   else if(a==='adda')alarmDlg(null);
   else if(a==='tgo'){
    if(!TM.left){const h=clamp(parseInt($('#tmh',root).value)||0,0,99),m=clamp(parseInt($('#tmm',root).value)||0,0,59),s=clamp(parseInt($('#tms',root).value)||0,0,59),ms=((h*60+m)*60+s)*1000;if(!ms){OS.toast('請設定大於 0 的時間');return}TM.total=ms;TM.left=ms}
    TM.run=true;TM.done=false;TM.end=Date.now()+TM.left;draw();
   }
   else if(a==='tpause'){TM.left=Math.max(0,TM.end-Date.now());TM.run=false;draw()}
   else if(a==='trst'){TM.run=false;TM.left=0;TM.total=0;TM.done=false;draw()}
   else if(a==='swgo'){if(SW.run){SW.t+=performance.now()-SW.s;SW.run=false}else{SW.s=performance.now();SW.run=true}draw()}
   else if(a==='swlap'){if(SW.run){SW.laps.unshift(swFmt(swMs()))}draw()}
   else if(a==='swrst'){SW.run=false;SW.t=0;SW.laps=[];draw()}
  });
  win.every(()=>{
   if(tab==='world')$$('.ckwt',root).forEach(e=>{e.textContent=OS.fmtTime(new Date(),true,e.dataset.z)});
   else if(tab==='timer'&&TM.run){const left=Math.max(0,TM.end-Date.now()),h=Math.floor(left/3600000),m=Math.floor(left/60000)%60,s=Math.ceil(left/1000)%60;const d=$('#tmd',root);if(d)d.textContent=pad(h)+':'+pad(m)+':'+pad(s%60);const bb=$('#tmb',root);if(bb)bb.style.width=((1-left/TM.total)*100)+'%'}
  },250);
  win.every(()=>{if(tab==='sw'&&SW.run){const d=$('#swd',root);if(d)d.textContent=swFmt(swMs())}},50);
  win.on('clockui',draw);
  draw();
  return {focusEl:()=>$('.ckt .on',root),onArgs(a){if(a&&a.tab){tab=a.tab;draw()}}};
 }
});

/* ================= 魚缸 ================= */
OS.register({id:'aquarium',name:'魚缸',kw:'aquarium fish tank 魚缸 水族 餵魚',store:true,cat:'fun',desc:'放鬆一下，看看青魚游來游去',
 g:'linear-gradient(145deg,#4fb8ff,#1c5fb0)',s:'<path d="M2.5 12c3-5 9-5.5 13-2l5-3v10l-5-3c-4 3.500-10 3-13-2z"/>',w:560,h:460,minW:320,minH:300,single:true,
 create(win){
  const root=document.createElement('div');root.className='aq';win.body.appendChild(root);
  root.innerHTML=`<div class="aqt"><svg class="aqf" style="top:14%;animation-duration:9s"><use href="#fish"/></svg><svg class="aqf" style="top:42%;animation-duration:13s;animation-delay:-5s;color:#f4c95d"><use href="#fish"/></svg><svg class="aqf" style="top:68%;animation-duration:11s;animation-delay:-2s;color:#ff9a6b"><use href="#fish"/></svg><div class="aqfd"></div></div><div class="aqb"><span class="aqn"></span><button type="button" class="btn pri">餵食</button></div>`;
  const tank=$('.aqt',root),n=$('.aqn',root);
  const up=()=>{n.textContent='已餵食 '+S.fed+' 次'};up();
  $('.aqb .btn',root).addEventListener('click',()=>{
   S.fed++;OS.save();up();
   OS.tone(500,.05,.3);
   for(let i=0;i<10;i++){const d=document.createElement('i');d.className='aqp';d.style.left=(20+Math.random()*60)+'%';d.style.animationDelay=(Math.random()*.5)+'s';tank.appendChild(d);setTimeout(()=>d.remove(),2600)}
  });
  return {focusEl:()=>$('.aqb .btn',root)};
 }
});

/* ================= 手機連結 ================= */
const CON=[{id:'k',n:'kiwe bire',num:'0900 000 001'},{id:'q',n:'qene',num:'0900 000 002'}];
const conOf=id=>CON.find(c=>c.id===id);
const hm=ts=>OS.fmtTime(new Date(ts));
OS.register({id:'phone',name:'手機連結',kw:'phone call message sms 電話 訊息 簡訊 通話 手機',store:true,cat:'life',desc:'撥打電話、傳送訊息給聯絡人',
 g:'linear-gradient(145deg,#4fd68a,#1c8f55)',s:'<path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>',w:420,h:600,minW:340,minH:460,single:true,
 create(win,args){
  const root=document.createElement('div');root.className='ph2';win.body.appendChild(root);
  let tab=(args&&args.tab)||'pad',num='',thr=null,ringT=null,calling=false;
  root.innerHTML=`<div class="tktabs pht"><button type="button" data-t="pad">撥號</button><button type="button" data-t="con">聯絡人</button><button type="button" data-t="log">通話紀錄</button><button type="button" data-t="msg">訊息</button></div><div class="phb"></div><div class="phcall" hidden></div>`;
  const body=$('.phb',root),callEl=$('.phcall',root);
  const dg=s=>s.replace(/\D/g,'');
  function draw(){
   $$('.pht button',root).forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
   if(tab==='pad')body.innerHTML=`<div class="pnum">${esc(num)||'&nbsp;'}</div><div class="kp">${[...'123456789*0#'].map(k=>`<button type="button" data-k="${k}">${k}</button>`).join('')}<span></span><button type="button" class="callg" data-a="call" aria-label="撥打">${OS.ico('phone',22)}</button><button type="button" data-a="del" aria-label="刪除">⌫</button></div><p class="cap" style="text-align:center">只能撥打聯絡人的號碼</p>`;
   else if(tab==='con')body.innerHTML=`<div class="sgrp">${CON.map(c=>`<div class="sr1"><div class="sr1t"><b>${esc(c.n)}</b><small>${c.num}</small></div><div class="sr1c"><button type="button" class="btn" data-msg="${c.id}">訊息</button><button type="button" class="btn pri" data-call="${c.id}">撥打</button></div></div>`).join('')}</div>`;
   else if(tab==='log')body.innerHTML=S.calls.length?`<div class="sgrp">${S.calls.slice(0,30).map(c=>`<div class="sr1"><div class="sr1t"><b style="color:var(--danger)">${esc(conOf(c.id).n)}</b><small>無人接聽　${OS.fmtDateShort(new Date(c.ts))} ${hm(c.ts)}</small></div><div class="sr1c"><button type="button" class="btn pri" data-call="${c.id}">撥打</button></div></div>`).join('')}</div><div class="btnrow"><button type="button" class="btn" data-a="clrlog">清除紀錄</button></div>`:'<p class="empty-s">沒有通話紀錄</p>';
   else if(thr==null)body.innerHTML=`<div class="sgrp">${CON.map(c=>{const m=(S.msgs[c.id]||[]).slice(-1)[0];return `<button type="button" class="sr1 sbtn" data-thr="${c.id}"><div class="sr1t"><b>${esc(c.n)}</b><small>${m?esc(m.t):'尚無訊息'}</small></div><em>${m?hm(m.ts):''}</em></button>`}).join('')}</div>`;
   else{
    const L=S.msgs[thr]||[];
    body.innerHTML=`<div class="phth"><button type="button" class="ab" data-a="tback">${OS.ico('back',16)}</button><b>${esc(conOf(thr).n)}</b></div><div class="phms">${L.length?L.map(m=>`<div class="bub"><span>${esc(m.t)}</span><small>${hm(m.ts)} ・ 已傳送</small></div>`).join(''):'<p class="empty-s">還沒有訊息，傳一則吧。</p>'}</div><form class="phsf"><input class="inp" maxlength="500" placeholder="輸入訊息" aria-label="訊息" autocomplete="off"><button class="btn pri">傳送</button></form>`;
    const ms=$('.phms',body);ms.scrollTop=ms.scrollHeight;
   }
  }
  function startCall(id){
   if(calling)return;
   if(!OS.isOnline()){OS.toast('沒有網路連線，無法撥打電話');return}
   const c=conOf(id);calling=true;callEl.hidden=false;
   callEl.innerHTML=`<div class="pcn">${esc(c.n)}</div><div class="pcs">撥號中…</div><button type="button" class="pch" aria-label="結束通話">${OS.ico('phone',24)}</button>`;
   let n=0;
   const end=miss=>{clearInterval(ringT);ringT=null;calling=false;if(miss){S.calls.unshift({id,ts:Date.now()});S.calls=S.calls.slice(0,50);OS.save();const s=$('.pcs',callEl);if(s)s.textContent='無人接聽';setTimeout(()=>{callEl.hidden=true;draw()},OS.R.fast?50:1300)}else{callEl.hidden=true}};
   ringT=setInterval(()=>{n++;if(n===1)$('.pcs',callEl).textContent='響鈴中…';if(n%2===1)OS.tone(480,.4,.4);if(n>=(OS.R.fast?2:6))end(true)},OS.R.fast?30:1200);
   $('.pch',callEl).onclick=()=>end(false);
  }
  win.cleanup(()=>{clearInterval(ringT)});
  root.addEventListener('click',e=>{
   const t=e.target.closest('[data-t]');if(t&&!calling){tab=t.dataset.t;thr=null;draw();return}
   const k=e.target.closest('[data-k]');if(k){if(num.length<15){num+=k.dataset.k;draw()}return}
   const c=e.target.closest('[data-call]');if(c){startCall(c.dataset.call);return}
   const m=e.target.closest('[data-msg]');if(m){tab='msg';thr=m.dataset.msg;draw();return}
   const th=e.target.closest('[data-thr]');if(th){thr=th.dataset.thr;draw();return}
   const a=e.target.closest('[data-a]');if(!a)return;
   if(a.dataset.a==='del'){num=num.slice(0,-1);draw()}
   else if(a.dataset.a==='call'){const d=dg(num);if(!d)return;const c2=CON.find(x=>dg(x.num)===d);if(!c2){OS.toast('只能撥打聯絡人的號碼');return}startCall(c2.id)}
   else if(a.dataset.a==='tback'){thr=null;draw()}
   else if(a.dataset.a==='clrlog'){S.calls=[];OS.save();draw()}
  });
  root.addEventListener('submit',e=>{
   e.preventDefault();const i=$('.phsf input',root),v=i.value.trim();if(!v||!thr)return;
   if(!OS.isOnline()){OS.toast('沒有網路連線，無法傳送');return}
   (S.msgs[thr]=S.msgs[thr]||[]).push({t:v,ts:Date.now()});OS.save();OS.sfx('click');draw();$('.phsf input',root).focus();
  });
  win.key(e=>{if(tab==='pad'&&!calling&&/^[0-9*#]$/.test(e.key)&&!e.target.closest('input')){if(num.length<15){num+=e.key;draw()}}else if(tab==='pad'&&e.key==='Backspace'&&!calling){num=num.slice(0,-1);draw()}else if(tab==='pad'&&e.key==='Enter'&&!calling)$('[data-a=call]',root).click()});
  draw();
  return {focusEl:()=>root};
 }
});

/* ================= 便利貼 ================= */
const NC=['#fff2a8','#ffd1dc','#c9f0d4','#cfe6ff','#e6d4ff','#ffe0b8'];
const newNote=()=>{const n={id:uid(),text:'',c:0,x:null,y:null};S.stickies.push(n);OS.save();return n};
OS.register({id:'stickies',name:'便利貼',kw:'sticky notes 便利貼 便條 備忘 筆記',store:true,cat:'life',desc:'把想法貼在桌面上',
 g:'linear-gradient(145deg,#ffe36b,#f0a81c)',s:'<path d="M5 4h14v11l-5 5H5zM14 20v-5h5"/>',w:300,h:300,minW:200,minH:160,
 key:a=>a&&a.id?a.id:null,
 create(win,args){
  let n=args&&args.id&&S.stickies.find(x=>x.id===args.id);
  if(!n){n=S.stickies.length&&!(args&&args.fresh)?S.stickies[0]:newNote();if(S.stickies.includes(n)&&args&&args.fresh)n=S.stickies[S.stickies.length-1]}
  win.dk=n.id;
  const root=document.createElement('div');root.className='sn';win.body.appendChild(root);
  root.innerHTML=`<div class="snb"><button type="button" class="ab" data-a="new" title="新增便利貼" aria-label="新增便利貼">${OS.ico('plus',15)}</button><button type="button" class="ab" data-a="col" title="顏色" aria-label="顏色">${OS.ico('brush',15)}</button><span class="grow"></span><button type="button" class="ab" data-a="del" title="刪除便利貼" aria-label="刪除便利貼">${OS.ico('trash',15)}</button></div><textarea class="snt" placeholder="輸入你的備忘…" aria-label="便利貼內容" maxlength="5000"></textarea>`;
  const ta=$('.snt',root);ta.value=n.text;
  const paint=()=>{root.style.background=NC[n.c%NC.length];win.setTitle('便利貼')};
  paint();
  let st=0;
  ta.addEventListener('input',()=>{n.text=ta.value;clearTimeout(st);st=setTimeout(OS.save,400)});
  win.cleanup(()=>{clearTimeout(st);OS.saveNow()});
  if(!S.stickyOpen.includes(n.id)){S.stickyOpen.push(n.id);OS.save()}
  root.addEventListener('click',async e=>{
   const b=e.target.closest('[data-a]');if(!b)return;
   if(b.dataset.a==='new'){const m=newNote();OS.open('stickies',{id:m.id,x:win.x+30,y:win.y+30})}
   else if(b.dataset.a==='col'){OS.menuAt(b,NC.map((c,i)=>({label:['黃色','粉紅','綠色','藍色','紫色','橘色'][i],radio:1,on:n.c===i,fn:()=>{n.c=i;OS.save();paint()}})))}
   else if(b.dataset.a==='del'){
    if(n.text.trim()&&!await win.confirm('要刪除這張便利貼嗎？',{ok:'刪除',danger:true}))return;
    S.stickies=S.stickies.filter(x=>x!==n);S.stickyOpen=S.stickyOpen.filter(x=>x!==n.id);OS.save();win.close(true);
   }
  });
  win.cleanup(()=>{if(OS.R.state==='desktop'||true){/* 關閉視窗但保留便利貼；登出/關機時保留開啟清單 */}});
  return {focusEl:()=>ta,destroy(){if(win.userClosed)S.stickyOpen=S.stickyOpen.filter(x=>x!==n.id)}};
 }
});
/* 啟動時重新開啟上次開著的便利貼 */
OS.hooks.start.push(()=>{
 if(!OS.appInstalled('stickies'))return;
 S.stickyOpen=S.stickyOpen.filter(id=>S.stickies.some(n=>n.id===id));
 S.stickyOpen.forEach((id,i)=>setTimeout(()=>{if(OS.R.state==='desktop')OS.open('stickies',{id,x:120+i*40,y:90+i*40})},400+i*150));
});

/* ================= 錄音機 ================= */
OS.register({id:'recorder',name:'錄音機',kw:'recorder voice audio mic 錄音 錄音機 麥克風',store:true,cat:'tool',desc:'用麥克風錄音，存成音訊檔案',
 g:'linear-gradient(145deg,#ff7a7a,#c0392b)',s:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',w:420,h:500,minW:340,minH:360,single:true,
 create(win){
  const root=document.createElement('div');root.className='rc';win.body.appendChild(root);
  let rec=null,stream=null,t0=0,tm=0,chunks=[];
  root.innerHTML=`<div class="rct"><div class="ckbig rcd">0:00</div><button type="button" class="cmrc rcb" aria-label="開始錄音">${OS.ico('record',26)}</button><p class="cap rcm">按下按鈕開始錄音</p></div><div class="rcl"></div>`;
  const d=$('.rcd',root),btn=$('.rcb',root),msg=$('.rcm',root),L=$('.rcl',root);
  function list(){
   const dir=FS.find1('music','錄音');const l=dir?FS.kids(dir.id).filter(n=>n.kind==='audio').sort((a,b)=>b.m-a.m):[];
   L.innerHTML=l.length?l.map(n=>`<div class="rci"><span>${esc(n.name)}</span><small>${OS.U.fmtSize(n.size||0)}</small><button type="button" class="ab" data-p="${n.id}" aria-label="播放">${OS.ico('play',14)}</button><button type="button" class="ab" data-d="${n.id}" aria-label="刪除">${OS.ico('trash',14)}</button></div>`).join(''):'<p class="empty-s">還沒有錄音。</p>';
  }
  function stopAll(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}clearInterval(tm);tm=0}
  async function toggle(){
   if(rec){rec.stop();return}
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){msg.textContent='這個瀏覽器不支援錄音。';return}
   try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(win.closing){stopAll();return}
    chunks=[];rec=new MediaRecorder(stream);
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    rec.onstop=()=>{
     const b=new Blob(chunks,{type:rec.mimeType||'audio/webm'});rec=null;stopAll();btn.classList.remove('on');btn.innerHTML=OS.ico('record',26);msg.textContent='錄音已停止';
     if(!b.size){msg.textContent='錄音內容是空的';return}
     try{const dir=FS.ensureDir('music','錄音'),dt=new Date();FS.create({parent:dir.id,name:FS.unique(dir.id,`錄音_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}.webm`),blob:b,kind:'audio',mime:b.type});msg.textContent='已儲存到「音樂\\錄音」'}catch(e){msg.textContent=e.message||'無法儲存'}
     list();
    };
    rec.start(500);t0=Date.now();btn.classList.add('on');btn.innerHTML=OS.ico('stop',26);msg.textContent='錄音中…';
    tm=setInterval(()=>{d.textContent=OS.U.fmtDur((Date.now()-t0)/1000)},250);
   }catch(e){stopAll();rec=null;msg.textContent=e&&(e.name==='NotAllowedError')?'麥克風存取被拒絕。請在瀏覽器權限設定中允許。':e&&e.name==='NotFoundError'?'找不到麥克風。':'無法開始錄音。'}
  }
  btn.addEventListener('click',toggle);
  L.addEventListener('click',async e=>{
   const p=e.target.closest('[data-p]');if(p){OS.open('media',{id:p.dataset.p});return}
   const x=e.target.closest('[data-d]');if(x&&await win.confirm('要刪除這個錄音嗎？',{ok:'刪除',danger:true})){OS.trashIds([x.dataset.d],{});list()}
  });
  win.on('fs',list);
  win.cleanup(()=>{if(rec){try{rec.onstop=null;rec.stop()}catch(e){}rec=null}stopAll()});
  list();
  return {focusEl:()=>btn};
 }
});
})();
