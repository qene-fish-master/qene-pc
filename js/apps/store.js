/* 青魚電腦 — Qene 商店 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc}=OS.U,S=OS.S;
const ICON='<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>';
const jobs=OS.R.jobs={};
const CATS=[['all','全部'],['tool','工具'],['life','生活'],['fun','娛樂']];
OS.installApp=id=>{
 const a=OS.apps[id];
 if(!a||!a.store||OS.appInstalled(id)||jobs[id])return;
 if(!OS.isOnline()){OS.toast('需要網路連線才能下載應用程式');return}
 jobs[id]={pct:0,phase:'下載中'};OS.emit('store');
 const step=OS.R.fast?25:3+Math.random()*5,tick=OS.R.fast?30:120;
 const t=setInterval(()=>{
  const j=jobs[id];if(!j){clearInterval(t);return}
  if(!OS.isOnline()){j.phase='等待網路連線…';OS.emit('store');return}
  j.pct=Math.min(100,j.pct+step*(j.pct<60?1:.8));
  j.phase=j.pct<60?'下載中':j.pct<100?'正在安裝':'完成';
  if(j.pct>=100){
   clearInterval(t);delete jobs[id];
   if(!S.inst.includes(id))S.inst.push(id);
   if(!S.startPinned.includes(id))S.startPinned.push(id);
   OS.save();OS.emit('apps');OS.emit('store');
   OS.notify({app:id,title:'已安裝「'+a.name+'」',body:'現在可以從開始選單開啟。',fn:()=>OS.open(id)});
  }else OS.emit('store');
 },tick);
 jobs[id].t=t;
};
OS.cancelInstall=id=>{const j=jobs[id];if(j){clearInterval(j.t);delete jobs[id];OS.emit('store')}};
OS.register({id:'store',name:'Qene 商店',kw:'store app market install 商店 應用程式 下載 安裝 軟體',
 g:'linear-gradient(145deg,#5b8cff,#1fb5a6)',s:ICON,w:880,h:620,minW:400,minH:340,single:true,
 create(win){
  const root=document.createElement('div');root.className='sto';win.body.appendChild(root);
  let cat='all',q='';
  root.innerHTML=`<div class="stoh"><b class="stot">${OS.ico('star',18)} Qene 商店</b><label class="xsrch stos">${OS.ico('search',14)}<input type="text" placeholder="搜尋應用程式" aria-label="搜尋應用程式" autocomplete="off"></label></div><div class="stoc"></div><div class="stol"></div>`;
  const list=$('.stol',root),cs=$('.stoc',root);
  function draw(){
   cs.innerHTML=CATS.map(([k,l])=>`<button type="button" class="stoch${k===cat?' on':''}" data-c="${k}">${l}</button>`).join('');
   const l=Object.values(OS.apps).filter(a=>a.store&&(cat==='all'||a.cat===cat)&&(!q||(a.name+a.desc+(a.kw||'')).toLowerCase().includes(q.toLowerCase())));
   const off=!OS.isOnline();
   list.innerHTML=(off?'<div class="stoo">目前沒有網路連線，無法下載新的應用程式。</div>':'')+(l.length?l.map(a=>{
    const inst=OS.appInstalled(a.id),j=jobs[a.id];
    return `<div class="stor" data-id="${a.id}">${OS.appIcon(a.id,56)}<div class="stoi"><b>${esc(a.name)}</b><small>${esc(a.desc||'')}</small>${j?`<div class="upbar"><i style="width:${j.pct}%"></i></div><small>${j.phase} ${Math.floor(j.pct)}%</small>`:''}</div><div class="stob">${j?`<button type="button" class="btn" data-a="cancel">取消</button>`:inst?`<button type="button" class="btn pri" data-a="open">開啟</button><button type="button" class="btn" data-a="un">解除安裝</button>`:`<button type="button" class="btn pri" data-a="get"${off?' disabled':''}>取得</button>`}</div></div>`;
   }).join(''):'<div class="empty-s">找不到符合的應用程式。</div>');
  }
  root.addEventListener('click',e=>{
   const c=e.target.closest('[data-c]');if(c){cat=c.dataset.c;draw();return}
   const b=e.target.closest('[data-a]');if(!b)return;
   const id=b.closest('.stor').dataset.id,a=b.dataset.a;
   if(a==='get')OS.installApp(id);else if(a==='cancel')OS.cancelInstall(id);
   else if(a==='open')OS.open(id);
   else if(a==='un')OS.uninstall(id).then(draw);
  });
  $('.stos input',root).addEventListener('input',e=>{q=e.target.value.trim();draw()});
  ['store','apps','net'].forEach(ev=>win.on(ev,draw));
  draw();
  return {focusEl:()=>$('.stos input',root)};
 }
});
})();
