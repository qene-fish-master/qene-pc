/* 青魚電腦 — 行事曆 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,pad,uid}=OS.U,S=OS.S;
const ICON='<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>';
OS.register({id:'calendar',name:'行事曆',kw:'calendar 行事曆 日曆 行程 日期 事件',
 g:'linear-gradient(145deg,#6bb7ff,#2a62d9)',s:ICON,w:900,h:620,minW:420,minH:420,single:true,
 create(win){
  const root=document.createElement('div');root.className='calapp';win.body.appendChild(root);
  const now=OS.parts();
  let y=now.y,m=now.m,sel=OS.dateKey(now);
  root.innerHTML=`<div class="calside"><div class="calnav"><button type="button" class="ab" data-c="today">今天</button><button type="button" class="ab" data-c="prev" aria-label="上個月">${OS.ico('chevU',15)}</button><button type="button" class="ab" data-c="next" aria-label="下個月">${OS.ico('chevD',15)}</button><b class="calt"></b></div><div class="calgrid"></div></div><div class="calday"><div class="caldh"><h3></h3><button type="button" class="btn pri" data-c="add">${OS.ico('plus',14)} 新增行程</button></div><div class="calev"></div></div>`;
  const grid=$('.calgrid',root),ev=$('.calev',root);
  const cnt=k=>S.events.filter(e=>e.date===k).length;
  function draw(){
   const ws=S.weekStart,mat=OS.calMatrix(y,m,ws),today=OS.dateKey(OS.parts());
   $('.calt',root).textContent=y+' 年 '+m+' 月';
   grid.innerHTML=Array.from({length:7},(_,i)=>`<i class="wd">${OS.WDAYS[(i+ws)%7]}</i>`).join('')+mat.map(d=>{
    const k=d.y+'-'+pad(d.m)+'-'+pad(d.d),n=cnt(k);
    return `<button type="button" class="cdy${d.other?' o':''}${k===today?' today':''}${k===sel?' sel':''}" data-d="${k}"><span>${d.d}</span>${n?`<em>${n>3?'3+':'●'.repeat(n)}</em>`:''}</button>`;
   }).join('');
   const [sy,sm,sd]=sel.split('-').map(Number);
   $('h3',root).textContent=OS.fmtDateLong(new Date(sy,sm-1,sd),'');
   const l=S.events.filter(e=>e.date===sel).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
   ev.innerHTML=l.length?l.map(e=>`<div class="cev2" data-id="${e.id}"><b>${esc(e.time||'全天')}</b><span>${esc(e.title)}</span><button type="button" class="ab" data-ed="${e.id}" aria-label="編輯">${OS.ico('edit',14)}</button><button type="button" class="ab" data-del="${e.id}" aria-label="刪除">${OS.ico('trash',14)}</button></div>`).join(''):'<p class="empty-s">這一天沒有行程。</p>';
  }
  async function editEv(e0){
   const e=e0||{date:sel,time:'',title:''};
   const r=await win.dialog({title:e0?'編輯行程':'新增行程',w:380,body:`<label class="ol2">標題</label><input class="inp dinp ev-t" maxlength="60" value="${esc(e.title)}" aria-label="標題"><label class="ol2">日期</label><input class="inp dinp ev-d" type="date" value="${e.date}" aria-label="日期"><label class="ol2">時間（留空表示全天）</label><input class="inp dinp ev-h" type="time" value="${e.time||''}" aria-label="時間"><div class="derr"></div>`,
    buttons:[{id:'ok',label:'儲存',primary:true},{id:'cancel',label:'取消'}],
    beforeClose:(id,w)=>{
     if(id!=='ok')return true;
     const t=$('.ev-t',w).value.trim(),d=$('.ev-d',w).value;
     if(!t){$('.derr',w).textContent='請輸入標題。';return false}
     if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){$('.derr',w).textContent='請選擇日期。';return false}
     e.title=t;e.date=d;e.time=$('.ev-h',w).value||'';return true;
    }});
   if(r!=='ok')return;
   if(!e0){e.id=uid();S.events.push(e)}
   sel=e.date;const p=e.date.split('-').map(Number);y=p[0];m=p[1];
   OS.save();draw();OS.emit('notes');
  }
  root.addEventListener('click',async ev2=>{
   const b=ev2.target.closest('button');if(!b)return;
   const c=b.dataset.c;
   if(c==='today'){const n=OS.parts();y=n.y;m=n.m;sel=OS.dateKey(n);draw()}
   else if(c==='prev'){m--;if(m<1){m=12;y--}draw()}
   else if(c==='next'){m++;if(m>12){m=1;y++}draw()}
   else if(c==='add')editEv(null);
   else if(b.dataset.d){sel=b.dataset.d;const p=sel.split('-').map(Number);if(p[1]!==m||p[0]!==y){y=p[0];m=p[1]}draw()}
   else if(b.dataset.ed){const e=S.events.find(x=>x.id===b.dataset.ed);if(e)editEv(e)}
   else if(b.dataset.del){if(await win.confirm('要刪除這個行程嗎？',{ok:'刪除',danger:true})){S.events=S.events.filter(x=>x.id!==b.dataset.del);OS.save();draw()}}
  });
  grid.addEventListener('dblclick',e=>{const b=e.target.closest('[data-d]');if(b){sel=b.dataset.d;draw();editEv(null)}});
  win.key(e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){if(e.target.closest('input,select,textarea'))return;e.preventDefault();const [sy,sm,sd]=sel.split('-').map(Number);const dt=new Date(sy,sm-1,sd+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key]));sel=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());y=dt.getFullYear();m=dt.getMonth()+1;draw();const x=$('.cdy.sel',root);if(x)x.focus()}});
  win.on('look',draw);
  draw();
  return {focusEl:()=>$('.cdy.sel',root)};
 }
});
/* 行程提醒（開始當天時間到時通知） */
let lastMin='';
OS.on('tick',()=>{
 if(OS.R.state!=='desktop')return;
 const p=OS.parts(),k=OS.dateKey(p)+' '+pad(p.hh)+':'+pad(p.mm);
 if(k===lastMin)return;lastMin=k;
 S.events.filter(e=>e.date===OS.dateKey(p)&&e.time===pad(p.hh)+':'+pad(p.mm)).forEach(e=>OS.notify({app:'calendar',title:'行程提醒',body:e.title,fn:()=>OS.open('calendar')}));
});
})();
