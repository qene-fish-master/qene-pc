/* 青魚電腦 — 設定 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S,WM=OS.WM;
const ICON='<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>';
const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],S);
const set=(p,v)=>{const a=p.split('.'),l=a.pop();a.reduce((o,k)=>o[k],S)[l]=v};

/* ================= 軟體更新管理（不依附視窗） ================= */
const U=OS.upd={st:'idle',pct:0,t:0,speed:0,paused:false};
OS.nextVerInfo=()=>{const v=OS.nextVer();return v?Object.assign({v},OS.UPDI[v]):null};
U.check=()=>{
 if(!OS.isOnline()){OS.toast('需要網路連線才能檢查更新');return}
 if(U.st==='checking'||U.st==='dl')return;
 U.st='checking';OS.emit('upd');
 setTimeout(()=>{if(U.st==='checking'){U.st='result';U.checked=Date.now();OS.emit('upd')}},1300);
};
U.start=()=>{
 if(!OS.isOnline()){OS.toast('需要網路連線才能下載');return}
 const n=OS.nextVerInfo();if(!n)return;
 U.st='dl';U.pct=U.pct>0&&U.pct<100?U.pct:0;U.paused=false;U.mb=n.mb;
 clearInterval(U.t);
 U.t=setInterval(()=>{
  if(U.st!=='dl'){clearInterval(U.t);return}
  if(!OS.isOnline()){U.paused=true;U.speed=0;OS.emit('upd');return}
  if(U.paused&&OS.isOnline()&&!U.manual)U.paused=false;
  if(U.paused){U.speed=0;return}
  U.speed=8+Math.random()*14;
  U.pct=Math.min(100,U.pct+(OS.R.fast?25:2+Math.random()*4));
  if(U.pct>=100){clearInterval(U.t);U.st='ready';OS.emit('upd');OS.notify({app:'settings',title:'更新已就緒',body:'QeneOS '+OS.nextVer()+' 已下載完成，重新啟動後即可安裝。',fn:()=>OS.open('settings',{page:'update'})})}
  else OS.emit('upd');
 },OS.R.fast?30:300);
 OS.emit('upd');
};
U.pause=()=>{if(U.st!=='dl')return;U.manual=!U.manual;U.paused=U.manual;if(!U.manual&&OS.isOnline())U.paused=false;OS.emit('upd')};
U.reset=()=>{clearInterval(U.t);U.st='idle';U.pct=0;U.paused=false;U.manual=false;OS.emit('upd')};
OS.on('net',()=>{if(U.st==='dl')OS.emit('upd')});

/* ================= 設定頁面 ================= */
const TZ=[['','自動（使用瀏覽器時區）'],['Asia/Taipei','台北'],['Asia/Tokyo','東京'],['Asia/Seoul','首爾'],['Asia/Shanghai','上海'],['Asia/Hong_Kong','香港'],['Asia/Singapore','新加坡'],['Europe/London','倫敦'],['Europe/Paris','巴黎'],['America/New_York','紐約'],['America/Chicago','芝加哥'],['America/Los_Angeles','洛杉磯'],['Australia/Sydney','雪梨'],['UTC','UTC']];
const GROUPS=[
 ['',[['home','首頁','home']]],
 ['系統',[['display','顯示','desktop'],['sound','音效','vol'],['notif','通知','bell'],['power','電源與睡眠','power'],['storage','儲存空間','drive'],['about','關於','info']]],
 ['藍牙與裝置',[['bluetooth','藍牙','bt'],['mouse','滑鼠','mouse']]],
 ['網路',[['network','Wi-Fi 與網路','wifi']]],
 ['個人化',[['wallpaper','背景','image'],['color','色彩','brush'],['taskbar','工作列','taskview'],['start','開始','grid'],['deskicons','桌面圖示','desktop']]],
 ['應用程式',[['apps','已安裝的應用程式','grid'],['startup','啟動','play']]],
 ['帳戶與時間',[['accounts','你的資訊','user'],['time','日期與時間','clock'],['access','協助工具','star'],['privacy','隱私權與安全性','shield']]],
 ['',[['update','軟體更新','refresh2']]]
];
const KW={display:'亮度 夜間光 深色 文字大小 縮放 全螢幕',sound:'音量 靜音 音效 喇叭',notif:'通知 橫幅 專注 勿擾',power:'睡眠 關機 重新啟動 鎖定 閒置 節電',storage:'儲存 磁碟 空間 資源回收筒',about:'關於 裝置 版本 規格 重設 電腦名稱 重新安裝',bluetooth:'藍牙 耳機',mouse:'滑鼠 指標 游標 軌跡 雙擊 波紋 cursor mouse pointer',network:'網路 wifi 無線 飛航',wallpaper:'背景 桌布 圖片',color:'色彩 主題 強調色 深色 淺色',taskbar:'工作列 對齊 搜尋',start:'開始 選單 釘選',deskicons:'桌面 圖示 排列',apps:'應用程式 解除安裝 程式',startup:'啟動 開機 自動',accounts:'帳戶 名稱 密碼 大頭貼 登入',time:'時間 日期 時區 24 小時',access:'協助 文字 對比 動畫',privacy:'隱私 相機 麥克風 紀錄',update:'更新 版本 下載 安裝 qeneos'};
OS.settingsIndex=()=>{const o=[];GROUPS.forEach(([g,l])=>l.forEach(([id,n])=>o.push({id,name:n,kw:KW[id]||''})));return o};
const ALIAS={personal:'wallpaper'};

OS.register({id:'settings',name:'設定',kw:'settings control panel 設定 控制台 偏好',single:true,
 g:'linear-gradient(145deg,#7d9aa0,#34545b)',s:ICON,w:900,h:620,minW:420,minH:360,
 create(win,args){
  const root=document.createElement('div');root.className='st';win.body.appendChild(root);
  let page=ALIAS[args&&args.page]||(args&&args.page)||'home',q='';
  const valid=id=>OS.settingsIndex().some(s=>s.id===id);
  if(!valid(page))page='home';
  root.innerHTML=`<nav class="stnav"><div class="stsb"><div class="stus"></div><label class="stsrchb">${OS.ico('search',14)}<input type="text" placeholder="搜尋設定" aria-label="搜尋設定" autocomplete="off" spellcheck="false"></label></div><div class="stlist2"></div></nav><main class="stpg"><div class="stph"><button type="button" class="ab stbk" aria-label="返回">${OS.ico('back',16)}</button><h2></h2></div><div class="stpc"></div></main>`;
  const nav=$('.stlist2',root),pc=$('.stpc',root),h2=$('h2',root),sq=$('.stsrchb input',root);
  const nameOf=id=>(OS.settingsIndex().find(s=>s.id===id)||{}).name||'設定';
  function renderNav(){
   const res=q?OS.settingsIndex().filter(s=>(s.name+' '+s.kw).toLowerCase().includes(q.toLowerCase())):null;
   if(res){nav.innerHTML=res.length?res.map(s=>`<button type="button" class="sni${s.id===page?' cur':''}" data-pg="${s.id}"><span>${esc(s.name)}</span></button>`).join(''):'<p class="empty-s">找不到符合的設定</p>';return}
   const upd=OS.nextVer()&&S.autoUpd;
   nav.innerHTML=GROUPS.map(([g,l])=>(g?`<div class="sngh">${g}</div>`:'')+l.map(([id,n,ic])=>`<button type="button" class="sni${id===page?' cur':''}" data-pg="${id}">${OS.ico(ic==='mouse'?'pin':ic,17)}<span>${n}</span>${id==='update'&&upd?'<i class="sbadge"></i>':''}</button>`).join('')).join('');
   $('.stus',root).innerHTML=`${OS.avatar(40)}<div><b>${esc(S.name)}</b><small>${esc(S.pcName)}</small></div>`;
  }
  /* ---------- 小元件 ---------- */
  const tg=(p,t,d)=>`<div class="sr1"><div class="sr1t"><b>${t}</b>${d?`<small>${d}</small>`:''}</div><button type="button" class="tg${get(p)?' on':''}" role="switch" aria-checked="${!!get(p)}" aria-label="${esc(t)}" data-tg="${p}"></button></div>`;
  const row=(t,d,c)=>`<div class="sr1"><div class="sr1t"><b>${t}</b>${d?`<small>${d}</small>`:''}</div><div class="sr1c">${c||''}</div></div>`;
  const grp=h=>`<div class="sgrp">${h}</div>`;
  const seg=(p,o)=>`<div class="sseg" role="radiogroup">${o.map(([v,l])=>`<button type="button" role="radio" aria-checked="${get(p)===v}" class="${get(p)===v?'on':''}" data-sg="${p}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const rng=(p,min,max,step,fmt,val)=>{const v=val==null?get(p):val;return `<span class="srg"><input type="range" min="${min}" max="${max}" step="${step||1}" value="${v}" data-rg="${p}" data-fmt="${fmt||''}" aria-label="${esc(p)}"><em>${fmtv(fmt,v)}</em></span>`};
  const fmtv=(f,v)=>f==='pct'?Math.round(v*100)+'%':f==='ms'?v+' 毫秒':f==='x'?v+'×':f==='n'?String(v):f==='vol'?v+'%':v;
  const btn=(a,l,cls,dis)=>`<button type="button" class="btn${cls?' '+cls:''}" data-act="${a}"${dis?' disabled':''}>${l}</button>`;
  const sel=(p,o)=>`<select class="inp" data-sl="${p}" aria-label="${esc(p)}">${o.map(([v,l])=>`<option value="${esc(v)}"${String(get(p))===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const note=t=>`<p class="cap">${t}</p>`;

  /* ---------- 各頁 ---------- */
  const P={};
  P.home=()=>{
   const n=OS.nextVer();
   return `<div class="shero">${OS.avatar(64)}<div><b>${esc(S.name)}</b><small>${esc(S.pcName)} ・ QeneOS ${esc(S.ver)}</small></div></div>
   <div class="stiles"><button type="button" data-pg="network" class="stile">${OS.ico(OS.wifiOn()?'wifi':'wifioff',22)}<b>Wi-Fi</b><small>${OS.wifiOn()?esc(S.net):'關閉'}</small></button><button type="button" data-pg="wallpaper" class="stile">${OS.ico('image',22)}<b>個人化</b><small>背景、色彩</small></button><button type="button" data-pg="update" class="stile">${OS.ico('refresh2',22)}<b>軟體更新</b><small>${n?'有可用的更新':'已是最新'}</small></button><button type="button" data-pg="mouse" class="stile">${OS.ico('pin',22)}<b>滑鼠</b><small>指標與效果</small></button><button type="button" data-pg="storage" class="stile">${OS.ico('drive',22)}<b>儲存空間</b><small>${OS.U.fmtSize(FS.stats().total)}</small></button><button type="button" data-pg="accounts" class="stile">${OS.ico('user',22)}<b>帳戶</b><small>${S.passOn?'已設定密碼':'沒有密碼'}</small></button></div>`;
  };
  P.display=()=>grp(row('亮度','調整螢幕亮度',rng('bright',30,100,1,'pct',Math.round(S.bright*100)))+tg('nightOn','夜間光','減少藍光，讓畫面偏暖色')+(S.nightOn?row('夜間光強度','',rng('night',10,100,1,'pct',Math.round(S.night*100))):'')+tg('dark','深色模式','')+row('文字大小','',seg('fs',[[14,'小'],[16,'中'],[18,'大'],[20,'特大']]))+row('全螢幕','',btn('full',OS.isFs()?'結束全螢幕':'進入全螢幕')))+grp(row('螢幕解析度',`${innerWidth} × ${innerHeight}（縮放比例 ${Math.round((devicePixelRatio||1)*100)}%）`,''));
  P.sound=()=>grp(row('主音量','',rng('vol',0,100,1,'vol',S.muted?0:S.vol))+tg('muted','靜音','')+tg('sounds','系統音效','開機、通知與錯誤提示聲')+row('測試音效','',btn('beep','播放')));
  P.notif=()=>grp(tg('notif','通知','從應用程式與系統接收通知')+tg('banner','顯示通知橫幅','')+tg('nsound','通知音效','')+tg('focus','專注輔助（勿擾）','開啟時，通知只會進入通知中心'))+grp(row('通知中心',OS.R.notes.length+' 則通知',btn('clrn','全部清除',null,!OS.R.notes.length)));
  P.power=()=>{
   return grp(row('閒置多久後自動鎖定','玩遊戲、瀏覽或播放媒體時不會鎖定',sel('idle',[[0,'永不'],[1,'1 分鐘'],[5,'5 分鐘'],[10,'10 分鐘'],[15,'15 分鐘'],[30,'30 分鐘']]))+tg('saver','節電模式','關閉動畫效果以節省電力'))+grp(row('鎖定','',btn('p-lock','鎖定'))+row('睡眠','',btn('p-sleep','睡眠'))+row('重新啟動','',btn('p-restart','重新啟動'))+row('關機','',btn('p-off','關機')));
  };
  P.storage=()=>{
   const st=FS.stats(),tot=Math.max(1,st.total);
   const cats=[['文字文件',st.text,'#2f7bd9'],['影像',st.image,'#d6456f'],['影片',st.video,'#7a5cd6'],['音訊',st.audio,'#e07b1f'],['其他',st.other,'#5f7b80']];
   return `<div class="sgrp"><div class="sr1 col"><b>本機磁碟 (C:)</b><small>已使用 ${OS.U.fmtSize(st.total)}　共 ${st.files} 個檔案</small><div class="stbar">${cats.map(c=>`<i style="width:${c[1]/tot*100}%;background:${c[2]}" title="${c[0]}"></i>`).join('')}</div><div class="stleg">${cats.map(c=>`<span><i style="background:${c[2]}"></i>${c[0]} ${OS.U.fmtSize(c[1])}</span>`).join('')}</div></div></div>`+
   grp(row('瀏覽器儲存空間','<span class="qest">計算中…</span>','')+row('資源回收筒',FS.allKids('bin').length+' 個項目',btn('emptybin','清空',null,!FS.allKids('bin').length))+row('檔案總管','',btn('openx','開啟')));
  };
  P.about=()=>{
   const mem=navigator.deviceMemory?navigator.deviceMemory+' GB':'未知',cores=navigator.hardwareConcurrency||'?';
   return grp(row('裝置名稱',esc(S.pcName),btn('renpc','重新命名')))+grp(`<div class="sr1 col"><b>裝置規格</b><table class="ptab"><tr><th>處理器</th><td>${cores} 個邏輯核心</td></tr><tr><th>記憶體</th><td>${mem}（瀏覽器回報）</td></tr><tr><th>系統類型</th><td>QeneOS ${esc(S.ver)}（網頁模擬）</td></tr><tr><th>顯示器</th><td>${screen.width} × ${screen.height}</td></tr><tr><th>瀏覽器</th><td>${esc((navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)||['未知'])[0])}</td></tr><tr><th>安裝日期</th><td>${S.instDate?OS.fmtDateShort(new Date(S.instDate)):'—'}</td></tr></table></div>`)+
   grp(row('重設此電腦','刪除所有檔案、設定與已安裝的應用程式，然後重新安裝 QeneOS',btn('reset','重設電腦','dng')))+note('這是網頁模擬器，不是真正的作業系統，所有資料都只存在這個瀏覽器。');
  };
  P.bluetooth=()=>grp(tg('bt','藍牙',OS.btOn()?'已開啟':'已關閉')+(OS.btOn()?row('青魚耳機 Pro',S.btDev?'已連線':'已配對',`<button type="button" class="tg${S.btDev?' on':''}" role="switch" aria-checked="${!!S.btDev}" aria-label="青魚耳機 Pro" data-tg="btDev"></button>`):''))+(S.airplane?note('飛航模式已開啟，藍牙無法使用。'):'');
  P.mouse=()=>{
   const m=S.mouse,pv=(k)=>{const s=OS.mouse.shape(m.cur==='default'?'classic':m.cur,k,m.size,m.color);return `<img alt="" src="data:image/svg+xml,${encodeURIComponent(s.svg)}" width="${s.w}" height="${s.h}">`};
   return grp(`<div class="sr1 col"><b>滑鼠指標</b><div class="mprev"><div><span class="mpb">${pv('arrow')}</span><small>一般</small></div><div><span class="mpb">${pv('hand')}</span><small>連結</small></div><div class="mtest" tabindex="-1">把滑鼠移到這裡看看</div></div>${m.cur==='default'?'<small class="mut">目前使用系統預設指標，預覽僅供參考。</small>':''}</div>`+
    row('指標樣式','',seg('mouse.cur',[['default','系統預設'],['classic','經典'],['fish','青魚'],['dot','圓點']]))+
    row('指標大小','',seg('mouse.size',[[1,'1×'],[1.5,'1.5×'],[2,'2×'],[2.5,'2.5×'],[3,'3×']]))+
    row('指標色彩','',`<div class="sswc">${[['white','#ffffff'],['black','#0d1b20'],['accent',S.accent],['yellow','#ffd23f'],['red','#ff4d4d']].map(([v,c])=>`<button type="button" class="${m.color===v?'on':''}" data-sg="mouse.color" data-v="${v}" style="background:${c}" aria-label="${v}" title="${{white:'白色',black:'黑色',accent:'強調色',yellow:'黃色',red:'紅色'}[v]}"></button>`).join('')}</div>`))+
   grp(tg('mouse.ripple','顯示點擊波紋','按下滑鼠時在指標位置顯示圓形動畫')+tg('mouse.locate','按 Ctrl 鍵顯示指標位置','單獨按一下 Ctrl，指標位置會出現收縮的圓圈')+tg('mouse.trail','顯示指標軌跡','移動時留下一道漸漸淡去的軌跡')+(m.trail?row('軌跡長度','',rng('mouse.trailLen',4,30,1,'n')):'')+tg('mouse.hideTyping','輸入時隱藏指標','在文字欄位打字時隱藏指標，移動滑鼠就會回來')+tg('mouse.shake','搖動視窗標題列以最小化其他視窗','按住標題列左右快速搖動；再搖一次可還原'))+
   grp(row('雙擊速度','兩次點擊的間隔在這個時間內，就算雙擊',rng('mouse.dbl',200,900,10,'ms'))+`<div class="sr1 col"><b>測試雙擊速度</b><div class="dbltest" data-dbltest><span class="dtf">${OS.fileIcon(FS.get('documents'),44)}</span><small class="dtm">在資料夾上快速點兩下</small></div></div>`)+
   grp(row('捷徑','',`<small class="mut">滑鼠滾輪滾過工作列右側的音量圖示可調整音量；在工作列按鈕上按滑鼠中鍵可關閉視窗。</small>`)+row('還原預設','',btn('mouse-reset','還原滑鼠設定')));
  };
  P.network=()=>grp(tg('airplane','飛航模式','關閉所有無線通訊')+tg('wifi','Wi-Fi',OS.wifiOn()?'已連線到 '+esc(S.net):'關閉'))+(OS.wifiOn()?grp(OS.NETS.map(n=>`<button type="button" class="sr1 sbtn" data-net="${esc(n)}"><div class="sr1t"><b>${OS.ico('wifi',15)} ${esc(n)}</b></div><div class="sr1c">${n===S.net?'已連線':'連線'}</div></button>`).join('')):'')+note(OS.isOnline()?'目前有網際網路連線。':'沒有連線，瀏覽器、商店與軟體更新需要網路。');
  P.wallpaper=()=>grp(`<div class="sr1 col"><b>選擇背景</b><div class="swalls">${OS.WALLS.map((w,i)=>`<button type="button" class="${!S.useCustom&&S.wall===i?'on':''}" style="background:${w.c}" data-wall="${i}" title="${w.n}" aria-label="${w.n}"></button>`).join('')}${S.custom?`<button type="button" class="${S.useCustom?'on':''}" style="background:url('${S.custom}') center/cover" data-wall="custom" title="自訂圖片" aria-label="自訂圖片"></button>`:''}</div></div>`+
   row('自訂圖片','從「圖片」資料夾或實際電腦選擇影像',btn('wpick','瀏覽…')+btn('wup','從電腦選擇…'))+(S.custom?row('符合方式','',sel('wallFit',[['fill','填滿'],['fit','符合'],['stretch','延展'],['tile','並排'],['center','置中']])):'')+tg('scales','顯示魚鱗圖樣','')+(S.custom?row('移除自訂圖片','',btn('wclr','移除')):''));
  P.color=()=>grp(row('模式','',seg('dark',[[false,'淺色'],[true,'深色']]))+`<div class="sr1 col"><b>強調色</b><div class="sswc big">${['#14a094','#2f7bd9','#7a5cd6','#d6456f','#e07b1f','#2e9e6b','#5f7b80','#d6453d'].map(c=>`<button type="button" class="${S.accent===c?'on':''}" data-acc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="swcc" title="自訂色彩"><input type="color" value="${S.accent}" data-acci aria-label="自訂強調色"></label></div></div>`);
  P.taskbar=()=>grp(row('工作列對齊','',seg('tbAlign',[['center','置中'],['left','靠左']]))+tg('tbSearch','顯示搜尋','')+tg('tbTaskView','顯示工作檢視','')+row('已釘選的程式',S.tbPinned.length+' 個',btn('tbreset','重設')));
  P.start=()=>grp(tg('startRecent','顯示最近開啟的項目','')+row('已釘選的程式',S.startPinned.length+' 個',btn('streset','重設為預設值')));
  P.deskicons=()=>grp(tg('showDeskIcons','顯示桌面圖示','')+row('圖示大小','',seg('iconSize',[['s','小'],['m','中'],['l','大']]))+tg('autoArrange','自動排列圖示','')+tg('align','對齊格線',''))+grp(tg('deskSys.pc','本機','')+tg('deskSys.bin','資源回收筒','')+tg('deskSys.user','使用者的檔案',''));
  P.apps=()=>{
   const l=OS.installedApps().sort((a,b)=>OS.U.cmp(a.name,b.name));
   return grp(l.map(a=>`<div class="sr1">${OS.appIcon(a.id,34)}<div class="sr1t"><b>${esc(a.name)}</b><small>${a.store?'從 Qene 商店安裝':'系統內建'}</small></div><div class="sr1c"><button type="button" class="btn" data-open="${a.id}">開啟</button>${a.store?`<button type="button" class="btn dng" data-un="${a.id}">解除安裝</button>`:''}</div></div>`).join(''))+note('共 '+l.length+' 個應用程式。');
  };
  P.startup=()=>{
   const l=OS.installedApps().sort((a,b)=>OS.U.cmp(a.name,b.name));
   return grp(l.map(a=>`<div class="sr1">${OS.appIcon(a.id,28)}<div class="sr1t"><b>${esc(a.name)}</b></div><button type="button" class="tg${S.startup.includes(a.id)?' on':''}" role="switch" aria-checked="${S.startup.includes(a.id)}" aria-label="${esc(a.name)}" data-su="${a.id}"></button></div>`).join(''))+note('開啟的項目會在你登入後自動啟動。');
  };
  P.accounts=()=>grp(`<div class="sr1"><div class="shero sm">${OS.avatar(56)}<div><b>${esc(S.name)}</b><small>本機帳戶</small></div></div><div class="sr1c">${btn('ren','變更名稱')}</div></div>`+
   `<div class="sr1 col"><b>大頭貼</b><div class="sswc big">${OS.AVCOLORS.map((c,i)=>`<button type="button" class="${!S.avatarImg&&S.avatar%OS.AVCOLORS.length===i?'on':''}" data-av="${i}" style="background:${c}" aria-label="顏色 ${i+1}"></button>`).join('')}</div><div class="btnrow">${btn('avimg','使用圖片…')}${S.avatarImg?btn('avclr','移除圖片'):''}</div></div>`)+
   grp(tg2('passOn','登入密碼',S.passOn?'已設定':'尚未設定')+(S.passOn?row('變更密碼','',btn('pwchg','變更'))+row('密碼提示',esc(S.hint||'（無）'),''):'')+row('登出','關閉所有應用程式並回到登入畫面',btn('signout','登出')))+note('密碼只存在這個瀏覽器，不會上傳。忘記密碼時，在登入畫面按錯五次後可以用重設碼 00000 重設。');
  function tg2(k,t,d){return `<div class="sr1"><div class="sr1t"><b>${t}</b><small>${d}</small></div><button type="button" class="tg${S[k]?' on':''}" role="switch" aria-checked="${!!S[k]}" aria-label="${t}" data-act="pwtg"></button></div>`}
  P.time=()=>{
   const d=new Date();
   return grp(`<div class="sr1 col"><b>目前時間</b><div class="bigclock">${esc(OS.fmtTime(d,true))}</div><small>${esc(OS.fmtDateLong(d))}</small></div>`+tg('h24','使用 24 小時制','')+tg('showSec','在工作列時鐘顯示秒數','')+row('時區','',sel('tz',TZ))+row('每週的第一天','',seg('weekStart',[[0,'星期日'],[1,'星期一']])));
  };
  P.access=()=>grp(row('文字大小','縮放整個介面的文字',seg('fs',[[14,'小'],[16,'中'],[18,'大'],[20,'特大']]))+tg('abold','粗體文字','')+tg('acon','高對比','增加畫面的對比度')+tg('anomo','減少動畫','關閉視窗與選單的動畫效果'))+grp(row('滑鼠指標','改變大小、顏色與效果',btn('gomouse','開啟滑鼠設定')));
  P.privacy=()=>grp(row('相機使用中',OS.R.camUse>0?'有應用程式正在使用相機':'目前沒有應用程式使用相機','')+row('瀏覽紀錄',(S.hist||[]).length+' 筆',btn('clrhist','清除',null,!(S.hist||[]).length))+row('最近開啟的檔案',S.recent.length+' 個',btn('clrrec','清除',null,!S.recent.length)))+note('相機與麥克風只有在你開啟相機應用程式並允許瀏覽器權限時才會使用，影像不會離開這台電腦。');
  P.update=()=>{
   const n=OS.nextVerInfo(),u=U,chk=u.checked?OS.fmtTime(new Date(u.checked))+' '+OS.fmtDateShort(new Date(u.checked)):'尚未檢查';
   let h=grp(`<div class="sr1 col"><b>目前版本</b><div class="verbig">QeneOS ${esc(S.ver)}</div><small>上次檢查：${chk}</small></div>`);
   if(u.st==='checking')h+=`<div class="sgrp"><div class="sr1"><div class="spinm"></div><div class="sr1t"><b>正在檢查更新…</b></div></div></div>`;
   else if(!n)h+=grp(`<div class="sr1"><div class="sr1t"><b>${OS.ico('check',16)} 你的系統是最新版本</b><small>沒有可用的更新</small></div><div class="sr1c">${btn('upchk','檢查更新','pri')}</div></div>`);
   else{
    const notes=`<ul class="upn">${n.n.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    let ctl='';
    if(u.st==='dl'){const done=n.mb*u.pct/100;ctl=`<div class="upbar"><i style="width:${u.pct}%"></i></div><small>${u.paused?(OS.isOnline()?'已暫停':'沒有網路，已暫停'):'正在下載…'} ${Math.floor(u.pct)}%　${done.toFixed(0)} / ${n.mb} MB${u.paused?'':'　'+u.speed.toFixed(1)+' MB/秒'}</small><div class="btnrow">${btn('uppause',u.manual?'繼續':'暫停')}${btn('upcancel','取消')}</div>`}
    else if(u.st==='ready')ctl=`<small>更新已下載完成。安裝時電腦會重新啟動數次，請勿關閉電腦。</small><div class="btnrow">${btn('upinst','立即重新啟動並安裝','pri')}</div>`;
    else ctl=`<div class="btnrow">${btn('updl','下載並安裝','pri')}${btn('upchk','再檢查一次')}</div>`;
    h+=grp(`<div class="sr1 col"><b>QeneOS ${n.v} 可供使用</b><small>${n.mb} MB</small>${notes}${ctl}</div>`);
   }
   h+=grp(tg('autoUpd','自動檢查更新','有新版本時通知我')+row('更新紀錄','',''))+((S.updLog||[]).length?grp(S.updLog.map(x=>`<div class="sr1"><div class="sr1t"><b>QeneOS ${esc(x.v)}</b><small>已安裝於 ${OS.fmtDateShort(new Date(x.ts))}</small></div><div class="sr1c"><em class="okt">成功</em></div></div>`).join('')):'<p class="cap">還沒有安裝過更新。</p>');
   return h+note('這是模擬的系統更新，只會改變這個模擬器內的版本號。');
  };

  /* ---------- 繪製 ---------- */
  let pendingRender=false;
  function render(){
   if(win.closing)return;
   const top=pc.scrollTop;
   h2.textContent=nameOf(page);
   win.setTitle(nameOf(page)+' - 設定');
   renderNav();
   pc.innerHTML=(P[page]||P.home)();
   pc.scrollTop=top;
   root.classList.toggle('inpage',page!=='home'||root.classList.contains('narrow')&&!!root.dataset.open);
   if(page==='storage'&&navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(e=>{const el=$('.qest',pc);if(el&&e&&e.quota)el.textContent='已使用 '+OS.U.fmtSize(e.usage||0)+'，可用上限約 '+OS.U.fmtSize(e.quota)}).catch(()=>{const el=$('.qest',pc);if(el)el.textContent='無法取得'});
   else if(page==='storage'){const el=$('.qest',pc);if(el)el.textContent='瀏覽器不支援查詢'}
  }
  function go(id){
   if(!valid(id))id='home';
   page=id;root.dataset.open='1';q='';sq.value='';pc.scrollTop=0;render();
  }
  /* ---------- 設定值變更 ---------- */
  function after(path){
   const k=path.split('.')[0];
   if(path.startsWith('mouse.')){OS.mouse.normalize();OS.mouse.apply();OS.save();return}
   if(k==='vol'){OS.setVol(S.vol);return}
   if(k==='muted'){OS.setVol(S.vol,S.muted);return}
   if(k==='wifi'){OS.setWifi(S.wifi);return}
   if(k==='airplane'){OS.setAirplane(S.airplane);return}
   if(k==='tz'||k==='h24'||k==='showSec'||k==='weekStart'){OS.save();OS.clockRender();OS.lockClock();return}
   if(['tbAlign','tbSearch','tbTaskView'].includes(k)){OS.save();OS.applyAll();OS.tbRender();return}
   if(['showDeskIcons','iconSize','autoArrange','align','deskSys'].includes(k)){OS.save();OS.applyAll();OS.desk.render();return}
   if(k==='startRecent'){OS.save();return}
   if(k==='idle'){S.idle=+S.idle||0;OS.save();OS.idleBump();return}
   if(k==='fs'){S.fs=+S.fs;OS.save();OS.applyAll();return}
   if(k==='bright'||k==='night'){OS.save();OS.applyAll();return}
   if(k==='bt'||k==='btDev'){OS.save();OS.trayRender();return}
   OS.save();OS.applyAll();OS.trayRender&&OS.trayRender();
  }
  pc.addEventListener('click',async e=>{
   const t=e.target;let b;
   if(b=t.closest('[data-pg]')){go(b.dataset.pg);return}
   if(b=t.closest('[data-tg]')){const p=b.dataset.tg;set(p,!get(p));if(p==='nightOn'&&S.nightOn&&S.night<.1)S.night=.5;after(p);render();return}
   if(b=t.closest('[data-sg]')){
    const p=b.dataset.sg;let v=b.dataset.v;const cur=get(p);
    if(typeof cur==='number')v=+v;else if(typeof cur==='boolean')v=v==='true';
    if(p==='dark'&&typeof cur==='boolean')v=(b.dataset.v==='true');
    set(p,v);after(p);render();return;
   }
   if(b=t.closest('[data-wall]')){const v=b.dataset.wall;if(v==='custom'){S.useCustom=true}else{S.wall=+v;S.useCustom=false}OS.save();OS.applyAll();OS.emit('wall');render();return}
   if(b=t.closest('[data-acc]')){S.accent=b.dataset.acc;after('accent');render();return}
   if(b=t.closest('[data-av]')){S.avatar=+b.dataset.av;S.avatarImg='';OS.save();OS.tbRender();OS.emit('look');render();return}
   if(b=t.closest('[data-net]')){S.net=b.dataset.net;OS.save();OS.trayRender();OS.emit('net');render();return}
   if(b=t.closest('[data-open]')){OS.open(b.dataset.open);return}
   if(b=t.closest('[data-un]')){await OS.uninstall(b.dataset.un);render();return}
   if(b=t.closest('[data-su]')){const id=b.dataset.su;S.startup=S.startup.includes(id)?S.startup.filter(x=>x!==id):S.startup.concat(id);OS.save();render();return}
   const dt=t.closest('[data-dbltest]');
   if(dt){dblTest(dt);return}
   if(b=t.closest('[data-act]'))act(b.dataset.act);
  });
  let dtLast=0;
  function dblTest(el){
   const now=performance.now(),m=$('.dtm',el),f=$('.dtf',el);
   if(now-dtLast<=S.mouse.dbl){dtLast=0;m.textContent='雙擊成功！間隔 '+Math.round(now-(el._t||now))+' 毫秒';f.classList.add('hit');setTimeout(()=>f.classList.remove('hit'),300)}
   else{dtLast=now;el._t=now;m.textContent='再點一次…'}
  }
  pc.addEventListener('input',e=>{
   const r=e.target.closest('[data-rg]');if(!r)return;
   const p=r.dataset.rg,v=+r.value,f=r.dataset.fmt;
   if(f==='pct'){set(p,v/100);if(p==='bright')S.bright=clamp(v/100,.3,1)}
   else set(p,v);
   $('em',r.parentNode).textContent=fmtv(f,f==='pct'?v/100:v);
   if(p==='vol'){S.muted=false;OS.setVol(v,false)}else after(p);
  });
  pc.addEventListener('change',e=>{
   const r=e.target;
   if(r.dataset.rg!=null){OS.saveNow();return}
   if(r.dataset.sl!=null){const p=r.dataset.sl,cur=get(p);set(p,typeof cur==='number'?+r.value:r.value);after(p);render();return}
   if(r.dataset.acci!=null){S.accent=r.value;after('accent');render()}
  });
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-pg]');if(b)go(b.dataset.pg)});
  $('.stbk',root).addEventListener('click',()=>{delete root.dataset.open;page='home';render()});
  sq.addEventListener('input',()=>{q=sq.value.trim();renderNav()});
  sq.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){const r=OS.settingsIndex().filter(s=>(s.name+' '+s.kw).toLowerCase().includes(q.toLowerCase()));if(r[0])go(r[0].id)}else if(e.key==='Escape'){sq.value='';q='';renderNav()}});
  async function act(a){
   if(a==='full')OS.toggleFs();
   else if(a==='beep'){OS.sfx('notify')}
   else if(a==='clrn'){OS.R.notes=[];OS.emit('notes')}
   else if(a==='p-lock')OS.lock();else if(a==='p-sleep')OS.sleep();else if(a==='p-restart')OS.restart();else if(a==='p-off')OS.shutdown();
   else if(a==='emptybin'){if(await win.confirm('要永久刪除資源回收筒中的所有項目嗎？',{title:'清空資源回收筒',ok:'清空',danger:true})){FS.emptyBin();OS.sfx('trash')}}
   else if(a==='openx')OS.open('explorer');
   else if(a==='renpc'){
    const v=await win.prompt({title:'重新命名電腦',msg:'只能使用英文字母、數字與連字號 (-)。',value:S.pcName,max:15,validate:x=>!x.trim()?'請輸入名稱。':!/^[A-Za-z0-9-]+$/.test(x.trim())?'只能使用英文字母、數字與連字號。':''});
    if(v!=null){S.pcName=v.trim();OS.save();OS.emit('look')}
   }
   else if(a==='reset')OS.reinstall();
   else if(a==='mouse-reset'){S.mouse=Object.assign({},OS.mouse.defaults);OS.mouse.apply();OS.save()}
   else if(a==='wpick'){
    const r=await OS.fileDialog({parent:win,mode:'open',kinds:['image'],start:'pictures',title:'選擇背景圖片'});
    if(r&&r.id)await OS.setWallFromNode(r.id);
   }
   else if(a==='wup')pickReal(async f=>{const out=await FS.importFiles([f],'pictures');if(out.nodes[0])await OS.setWallFromNode(out.nodes[0].id)});
   else if(a==='wclr'){S.custom='';S.useCustom=false;OS.save();OS.applyAll();OS.emit('wall')}
   else if(a==='tbreset'){S.tbPinned=D().tbPinned.slice();OS.save();OS.tbRender()}
   else if(a==='streset'){S.startPinned=D().startPinned.slice();OS.save();OS.emit('apps')}
   else if(a==='ren'){
    const v=await win.prompt({title:'變更名稱',value:S.name,max:20,validate:x=>x.trim()?'':'請輸入名稱。'});
    if(v!=null){S.name=v.trim();OS.save();OS.tbRender();OS.emit('look')}
   }
   else if(a==='avimg')pickReal(f=>avatarFrom(f));
   else if(a==='avclr'){S.avatarImg='';OS.save();OS.emit('look')}
   else if(a==='pwtg'){if(S.passOn)pwDlg('remove');else pwDlg('set')}
   else if(a==='pwchg')pwDlg('change');
   else if(a==='signout')OS.signOut();
   else if(a==='gomouse')go('mouse');
   else if(a==='clrhist'){S.hist=[];OS.save()}
   else if(a==='clrrec'){S.recent=[];OS.save();OS.emit('look')}
   else if(a==='upchk')U.check();else if(a==='updl')U.start();else if(a==='uppause')U.pause();else if(a==='upcancel')U.reset();
   else if(a==='upinst')OS.installUpdate(OS.nextVer());
   render();
  }
  const D=()=>OS.D;
  function pickReal(cb){
   const i=document.createElement('input');i.type='file';i.accept='image/*';
   i.addEventListener('change',()=>{if(i.files&&i.files[0])cb(i.files[0])});
   i.click();
  }
  function avatarFrom(f){
   const url=URL.createObjectURL(f),img=new Image();
   img.onload=()=>{
    try{
     const s=Math.min(img.width,img.height),c=document.createElement('canvas');c.width=c.height=192;
     c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,192,192);
     S.avatarImg=c.toDataURL('image/jpeg',.85);OS.save();OS.tbRender();OS.emit('look');render();
    }catch(e){OS.toast('無法使用這張圖片')}
    URL.revokeObjectURL(url);
   };
   img.onerror=()=>{URL.revokeObjectURL(url);OS.toast('無法使用這張圖片')};
   img.src=url;
  }
  function pwDlg(mode){
   const inp=(id,ph,ac)=>`<input class="inp dinp pwi" id="${id}" type="password" placeholder="${ph}" maxlength="40" autocomplete="${ac||'off'}" aria-label="${ph}">`;
   const body=(mode!=='set'?inp('pw0','目前的密碼','current-password'):'')+(mode!=='remove'?inp('pw1','新密碼','new-password')+inp('pw2','再輸入一次新密碼','new-password')+`<input class="inp dinp pwi" id="pwh" type="text" placeholder="密碼提示（選用）" maxlength="40" value="${esc(S.hint||'')}" aria-label="密碼提示">`:'<p class="dmsg">輸入目前的密碼以移除登入密碼。</p>')+'<div class="derr"></div>';
   win.dialog({title:mode==='set'?'設定密碼':mode==='change'?'變更密碼':'移除密碼',w:380,body,buttons:[{id:'ok',label:'確定',primary:true},{id:'cancel',label:'取消'}],
    beforeClose:(id,w)=>{
     if(id!=='ok')return true;
     const v=i=>{const e=$('#'+i,w);return e?e.value:''},er=$('.derr',w);
     if(mode!=='set'&&v('pw0')!==S.pass){er.textContent='目前的密碼不正確。';return false}
     if(mode==='remove'){S.passOn=false;S.pass='';S.hint='';OS.save();return true}
     if(!v('pw1')){er.textContent='請輸入新密碼。';return false}
     if(v('pw1')!==v('pw2')){er.textContent='兩次輸入的密碼不一致。';return false}
     S.pass=v('pw1');S.passOn=true;S.hint=v('pwh').trim();OS.save();return true;
    }}).then(()=>render());
  }
  /* ---------- 事件與生命週期 ---------- */
  ['upd','net','look','notes','fs','apps'].forEach(ev=>win.on(ev,()=>{if(['range'].includes(document.activeElement&&document.activeElement.type))return;if(ev==='look'&&document.activeElement&&document.activeElement.type==='color')return;render()}));
  win.on('tick',()=>{if(page==='time'&&!document.activeElement.closest('select'))render()});
  win.key(e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();sq.focus();sq.select()}});
  function narrow(){const n=win.body.clientWidth<600;root.classList.toggle('narrow',n);if(!n)delete root.dataset.open;root.classList.toggle('inpage',n&&!!root.dataset.open)}
  narrow();
  if(args&&args.page)root.dataset.open='1';
  narrow();render();
  return {
   focusEl:()=>sq,
   onResize(){narrow()},
   onArgs(a){if(a&&a.page){go(ALIAS[a.page]||a.page)}}
  };
 }
});
})();
