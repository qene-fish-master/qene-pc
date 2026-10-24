/* 青魚電腦 — 工作管理員 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S,WM=OS.WM;
const ICON='<path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6"/>';
OS.register({id:'taskmgr',name:'工作管理員',kw:'task manager taskmgr process performance 工作管理員 處理程序 效能 結束工作 記憶體 cpu',
 g:'linear-gradient(145deg,#4ec3a0,#16667a)',s:ICON,w:760,h:520,minW:420,minH:340,single:true,
 create(win){
  const root=document.createElement('div');root.className='tk';win.body.appendChild(root);
  let tab='proc',sel=null,sortKey='name',sortDir=1;
  const cpuH=Array(60).fill(0),memH=Array(60).fill(0),netH=Array(60).fill(0),dskH=Array(60).fill(0);
  let lag=0,last=performance.now(),cpu=3,rowsCache={};
  root.innerHTML=`<div class="tkbar"><div class="tktabs" role="tablist"><button type="button" role="tab" data-t="proc" class="on">處理程序</button><button type="button" role="tab" data-t="perf">效能</button><button type="button" role="tab" data-t="start">啟動應用程式</button></div><span class="grow"></span><button type="button" class="btn" data-a="run">執行新工作</button><button type="button" class="btn dng" data-a="end" disabled>結束工作</button></div><div class="tkb"></div>`;
  const body=$('.tkb',root);
  const BASE={explorer:62,browser:140,settings:48,notepad:28,paint:70,calc:20,terminal:30,photos:80,media:90,camera:100,games:110,store:55,calendar:26,clock:24,stickies:18,aquarium:45,phone:38,recorder:34,taskmgr:32};
  const memOf=w=>{
   const base=BASE[w.app]||40,nodes=w.el.getElementsByTagName('*').length;
   return base+nodes*.04;
  };
  const real=()=>performance.memory?performance.memory.usedJSHeapSize/1048576:null;
  function sample(){
   const now=performance.now(),dt=now-last-1000;last=now;
   lag=lag*.6+clamp(dt,0,500)*.4;
   const wins=WM.list.filter(w=>!w.closing).length;
   cpu=clamp(2+lag/6+wins*.8+(OS.R.mediaPlaying?6:0)+Math.random()*2,1,100);
   cpuH.push(cpu);cpuH.shift();
   const mm=real(),tot=totalMem();memH.push(mm?Math.min(100,tot/1024*100):clamp(tot/20,0,100));memH.shift();
   netH.push(OS.isOnline()?Math.random()*(OS.upd.st==='dl'?60:6)+(OS.upd.st==='dl'?30:0):0);netH.shift();
   dskH.push(Math.random()*3);dskH.shift();
  }
  function totalMem(){return WM.list.filter(w=>!w.closing).reduce((a,w)=>a+memOf(w),0)+180}
  function rows(){
   const l=WM.list.filter(w=>!w.closing).map(w=>{
    const m=memOf(w);
    const c=(rowsCache[w.id]=(rowsCache[w.id]||1)*.7+(w===WM.active?cpu*.4:Math.random()*1.2)*.3);
    return {id:w.id,name:w.title,app:w.app,status:w.state==='min'?'已暫停':'執行中',cpu:c,mem:m,w};
   });
   const k=sortKey,d=sortDir;
   l.sort((a,b)=>{let r=k==='cpu'?a.cpu-b.cpu:k==='mem'?a.mem-b.mem:OS.U.cmp(a.name,b.name);return r*d});
   return l;
  }
  const sys=()=>[['青魚桌面視窗管理員',cpu*.18,95],['系統',cpu*.12,60],['檔案系統服務',.2,24],['音訊服務',OS.R.mediaPlaying?3:.1,18]];
  function drawProc(){
   const l=rows();
   if(sel&&!l.some(r=>r.id===sel))sel=null;
   const sy=sys(),h=(k,t,c)=>`<span class="${c}" data-s="${k}">${t}${sortKey===k?`<em>${sortDir>0?'▲':'▼'}</em>`:''}</span>`;
   body.innerHTML=`<div class="tkh">${h('name','名稱','tkn')}<span class="tks">狀態</span>${h('cpu','CPU','tkv')}${h('mem','記憶體','tkv')}</div><div class="tkrows"><div class="tksec">應用程式 (${l.length})</div>${l.map(r=>`<div class="tkr${r.id===sel?' sel':''}" data-id="${r.id}"><span class="tkn">${OS.appIcon(r.app,18)}${esc(r.name)}</span><span class="tks">${r.status}</span><span class="tkv">${r.cpu.toFixed(1)}%</span><span class="tkv">${r.mem.toFixed(1)} MB</span></div>`).join('')||'<div class="empty-s">沒有執行中的應用程式。</div>'}<div class="tksec">背景處理程序 (${sy.length})</div>${sy.map(s=>`<div class="tkr dis"><span class="tkn">${OS.ico('gear',16)}${s[0]}</span><span class="tks"></span><span class="tkv">${s[1].toFixed(1)}%</span><span class="tkv">${s[2]} MB</span></div>`).join('')}</div>`;
   $('[data-a=end]',root).disabled=!sel;
  }
  function upProc(){ // 更新數字而不重建（保留捲動）
   const l=rows();
   if(!$$('.tkr[data-id]',body).length&&l.length||$$('.tkr[data-id]',body).length!==l.length||l.some((r,i)=>$$('.tkr[data-id]',body)[i].dataset.id!==r.id)){const st=$('.tkrows',body)&&$('.tkrows',body).scrollTop;drawProc();const e=$('.tkrows',body);if(e&&st)e.scrollTop=st;return}
   l.forEach(r=>{const e=$(`.tkr[data-id="${r.id}"]`,body);if(!e)return;const v=e.children;v[1].textContent=r.status;v[2].textContent=r.cpu.toFixed(1)+'%';v[3].textContent=r.mem.toFixed(1)+' MB'});
   $$('.tkr.dis',body).forEach((e,i)=>{const s=sys()[i];if(s){e.children[2].textContent=s[1].toFixed(1)+'%'}});
  }
  function spark(h,col,max){
   const w=300,hh=70,m=max||100;
   const pts=h.map((v,i)=>`${(i/(h.length-1)*w).toFixed(1)},${(hh-clamp(v/m,0,1)*hh).toFixed(1)}`).join(' ');
   return `<svg viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none" class="tkg"><polyline fill="none" stroke="${col}" stroke-width="1.6" points="${pts}"/><polygon fill="${col}" fill-opacity=".15" points="0,${hh} ${pts} ${w},${hh}"/></svg>`;
  }
  let perfSel='cpu';
  function drawPerf(){
   const st=FS.stats(),mm=real(),tot=totalMem();
   const items={cpu:['CPU',cpu.toFixed(0)+'%',cpuH,'#2f7bd9',100],mem:['記憶體',(mm?mm.toFixed(0):tot.toFixed(0))+' MB',memH,'#7a5cd6',100],dsk:['磁碟 (C:)',OS.U.fmtSize(st.total),dskH,'#2e9e6b',10],net:['Wi-Fi',OS.isOnline()?(netH[netH.length-1]).toFixed(1)+' Mb/s':'未連線',netH,'#e07b1f',100]};
   const it=items[perfSel];
   body.innerHTML=`<div class="tkpf"><div class="tkpl">${Object.entries(items).map(([k,v])=>`<button type="button" class="tkpi${k===perfSel?' on':''}" data-p="${k}"><b>${v[0]}</b><small>${v[1]}</small>${spark(v[2],v[3],v[4]).replace('class="tkg"','class="tkg mini"')}</button>`).join('')}</div><div class="tkpd"><h3>${it[0]}　<span>${it[1]}</span></h3>${spark(it[2],it[3],it[4])}<table class="ptab"><tr><th>執行中視窗</th><td>${WM.list.filter(w=>!w.closing).length}</td></tr><tr><th>已執行時間</th><td>${OS.U.fmtDur(performance.now()/1000)}</td></tr><tr><th>邏輯處理器</th><td>${navigator.hardwareConcurrency||'?'}</td></tr><tr><th>估計記憶體</th><td>${tot.toFixed(0)} MB${mm?'（JS 堆積 '+mm.toFixed(0)+' MB）':''}</td></tr><tr><th>磁碟檔案</th><td>${st.files} 個，${OS.U.fmtSize(st.total)}</td></tr><tr><th>網路</th><td>${OS.isOnline()?esc(S.net):'未連線'}</td></tr></table></div></div>`;
  }
  function drawStart(){
   const l=OS.installedApps();
   body.innerHTML=`<div class="tkh"><span class="tkn">名稱</span><span class="tks">狀態</span></div><div class="tkrows">${l.map(a=>`<div class="tkr"><span class="tkn">${OS.appIcon(a.id,18)}${esc(a.name)}</span><span class="tks">${S.startup.includes(a.id)?'已啟用':'已停用'}</span><button type="button" class="btn" data-su="${a.id}">${S.startup.includes(a.id)?'停用':'啟用'}</button></div>`).join('')}</div>`;
  }
  function draw(){if(tab==='proc')drawProc();else if(tab==='perf')drawPerf();else drawStart()}
  root.addEventListener('click',async e=>{
   const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;$$('.tktabs button',root).forEach(b=>b.classList.toggle('on',b===t));draw();return}
   const s=e.target.closest('[data-s]');if(s){const k=s.dataset.s;if(sortKey===k)sortDir=-sortDir;else{sortKey=k;sortDir=1}drawProc();return}
   const r=e.target.closest('.tkr[data-id]');if(r){sel=r.dataset.id;$$('.tkr',body).forEach(x=>x.classList.toggle('sel',x===r));$('[data-a=end]',root).disabled=false;return}
   const p=e.target.closest('[data-p]');if(p){perfSel=p.dataset.p;drawPerf();return}
   const su=e.target.closest('[data-su]');if(su){const id=su.dataset.su;S.startup=S.startup.includes(id)?S.startup.filter(x=>x!==id):S.startup.concat(id);OS.save();drawStart();return}
   const a=e.target.closest('[data-a]');
   if(a){
    if(a.dataset.a==='run')OS.run();
    else if(a.dataset.a==='end'&&sel){const w=WM.list.find(x=>x.id===sel);if(w){if(w===win){if(!await win.confirm('這會關閉工作管理員本身。要繼續嗎？',{ok:'結束工作'}))return}sel=null;await WM.close(w,true)}drawProc()}
   }
  });
  root.addEventListener('contextmenu',e=>{
   const r=e.target.closest('.tkr[data-id]');if(!r)return;e.preventDefault();
   sel=r.dataset.id;$$('.tkr',body).forEach(x=>x.classList.toggle('sel',x===r));$('[data-a=end]',root).disabled=false;
   const w=WM.list.find(x=>x.id===sel);if(!w)return;
   OS.menu([{label:'切換到',fn:()=>WM.focus(w)},{label:'結束工作',danger:true,fn:()=>{WM.close(w,true);sel=null}}],e.clientX,e.clientY);
  });
  win.key(e=>{if(e.key==='Delete'&&sel&&tab==='proc'){const w=WM.list.find(x=>x.id===sel);if(w&&w!==win){sel=null;WM.close(w,true)}}});
  win.every(()=>{sample();if(tab==='proc')upProc();else if(tab==='perf')drawPerf()},1000);
  win.on('wm',()=>{if(tab==='proc')upProc()});
  sample();draw();
  return {focusEl:()=>root.querySelector('.tktabs .on')};
 }
});
})();
