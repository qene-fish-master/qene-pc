/* 青魚電腦 — 青魚瀏覽器 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp,uid}=OS.U,S=OS.S;
const ICON='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>';
function norm(u){
 u=(u||'').trim();if(!u)return '';
 if(/^qene:/i.test(u)||/^https?:\/\//i.test(u))return u;
 if(/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(u)||/^localhost(:\d+)?(\/\S*)?$/i.test(u))return 'https://'+u;
 return 'qene:search?q='+encodeURIComponent(u);
}
function label(u){
 const m={'qene:home':'新分頁','qene:about':'青魚說明','qene:fish':'認識青魚','qene:bookmarks':'書籤','qene:history':'歷史紀錄'};
 if(m[u])return m[u];if(u.startsWith('qene:search'))return '搜尋';
 try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}
}
const isQ=u=>/^qene:/i.test(u);
OS.register({id:'browser',name:'青魚瀏覽器',kw:'browser web internet 瀏覽器 網頁 網路 上網 chrome edge 搜尋',
 g:'linear-gradient(145deg,#37d9c5,#0b7f8c)',s:ICON,w:1000,h:640,minW:420,minH:320,
 create(win,args){
  const root=document.createElement('div');root.className='br';win.body.appendChild(root);
  root.innerHTML=`<div class="brt"><div class="brtabs" role="tablist"></div><button type="button" class="ab brnt" title="新增分頁 (Ctrl+T)" aria-label="新增分頁">${OS.ico('plus',16)}</button></div><div class="brn"><button type="button" class="ab" data-a="back" title="上一頁" aria-label="上一頁">${OS.ico('back',16)}</button><button type="button" class="ab" data-a="fwd" title="下一頁" aria-label="下一頁">${OS.ico('forward',16)}</button><button type="button" class="ab" data-a="reload" title="重新載入 (Ctrl+R)" aria-label="重新載入">${OS.ico('refresh',16)}</button><button type="button" class="ab" data-a="home" title="首頁" aria-label="首頁">${OS.ico('home',16)}</button><form class="brf"><span class="brs"></span><input class="brurl" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="搜尋或輸入網址" aria-label="網址列"><button type="button" class="ab brstar" data-a="star" title="將這個頁面加入書籤 (Ctrl+D)" aria-label="書籤">${OS.ico('star',16)}</button></form><button type="button" class="ab" data-a="menu" title="更多" aria-label="更多">${OS.ico('more',16)}</button></div><div class="brbm"></div><div class="brld"><i></i></div><div class="brv"></div>`;
  const tabsEl=$('.brtabs',root),url=$('.brurl',root),view=$('.brv',root),ld=$('.brld',root),bm=$('.brbm',root);
  let tabs=[],cur=null;
  const tabOf=id=>tabs.find(t=>t.id===id);
  function addTab(u,bg){
   if(tabs.length>=12){OS.toast('分頁太多了，請先關閉一些分頁');return null}
   const t={id:uid(),url:'',title:'新分頁',hist:[],hi:-1,el:document.createElement('div'),frame:null,loading:false};
   t.el.className='brp';t.el.hidden=true;view.appendChild(t.el);
   tabs.push(t);
   if(!bg)activate(t);
   nav(t,u||S.home||'qene:home',true);
   renderTabs();
   return t;
  }
  function activate(t){
   cur=t;tabs.forEach(x=>x.el.hidden=x!==t);
   renderTabs();sync();
   if(!t.url||t.url==='qene:home')setTimeout(()=>{const i=$('[data-search] input',t.el);if(i&&document.activeElement!==url&&win.state!=='min'&&WMactive())i.focus({preventScroll:true})},50);
  }
  const WMactive=()=>OS.WM.active===win;
  function closeTab(t){
   const i=tabs.indexOf(t);if(i<0)return;
   if(t.frame){try{t.frame.src='about:blank'}catch(e){}}
   t.el.remove();tabs.splice(i,1);
   if(!tabs.length){win.close(true);return}
   if(cur===t)activate(tabs[Math.min(i,tabs.length-1)]);else renderTabs();
  }
  function renderTabs(){
   tabsEl.innerHTML=tabs.map(t=>`<div class="brtab${t===cur?' on':''}" role="tab" data-id="${t.id}" tabindex="0" aria-selected="${t===cur}" title="${esc(t.title)}"><span class="brti">${t.loading?'<i class="brsp"></i>':OS.ico(isQ(t.url)?'home':'tab',14)}</span><span class="brtt">${esc(t.title)}</span><button type="button" class="brtx" data-x="${t.id}" aria-label="關閉分頁" tabindex="-1">${OS.ico('close',12)}</button></div>`).join('');
  }
  function sync(){
   if(!cur)return;
   url.value=cur.url==='qene:home'?'':cur.url;
   $('[data-a=back]',root).disabled=cur.hi<1;$('[data-a=fwd]',root).disabled=cur.hi>=cur.hist.length-1;
   const on=S.bm.some(b=>b.u===cur.url);
   const st=$('.brstar',root);st.classList.toggle('on',on);st.innerHTML=OS.ico(on?'starf':'star',16);
   $('.brs',root).innerHTML=OS.ico(isQ(cur.url)?'home':cur.url.startsWith('https')?'lock':'info',13);
   win.setTitle(cur.title+' - 青魚瀏覽器');
   ld.classList.toggle('on',cur.loading);
  }
  function bmBar(){
   bm.hidden=!S.bmBar||!S.bm.length;
   bm.innerHTML=S.bm.map((b,i)=>`<button type="button" class="brb" data-bm="${i}" title="${esc(b.u)}">${OS.ico('star',12)}<span>${esc(b.t)}</span></button>`).join('');
  }
  function addHist(u,title){
   if(isQ(u)&&!/^qene:search/.test(u))return;
   S.hist=(S.hist||[]).filter(h=>h.u!==u);S.hist.unshift({u,t:title,ts:Date.now()});S.hist=S.hist.slice(0,150);OS.save();
  }
  /* ---------- 導覽 ---------- */
  function nav(t,u,push){
   u=norm(u);if(!u)return;
   if(push!==false){t.hist=t.hist.slice(0,t.hi+1);t.hist.push(u);t.hi=t.hist.length-1}
   load(t,u);
  }
  function load(t,u){
   t.url=u;t.title=label(u);
   if(t.frame){try{t.frame.src='about:blank'}catch(e){}t.frame=null}
   t.el.innerHTML='';t.loading=false;
   if(isQ(u)){t.el.className='brp q';t.el.innerHTML='<div class="brpg">'+qpage(u)+'</div>';t.title=qtitle(u);addHist(u,t.title);OS.sfx&&0}
   else if(!/^https?:\/\//i.test(u)){t.el.className='brp q';t.el.innerHTML='<div class="brpg"><h2>無法開啟這個網址</h2><p>只支援 http、https 與 qene: 開頭的網址。</p></div>'}
   else if(!OS.isOnline()){t.el.className='brp q';t.el.innerHTML=`<div class="brpg err"><h2>無法連線到網際網路</h2><p>${OS.S.airplane?'飛航模式已開啟。':!OS.S.wifi?'Wi-Fi 已關閉。':'沒有網路連線。'}請檢查網路設定，然後重新載入。</p><p><button type="button" class="btn pri" data-a="reload">重新載入</button> <button type="button" class="btn" data-set="network">網路設定</button></p><p class="mut">錯誤代碼：ERR_INTERNET_DISCONNECTED</p></div>`}
   else{
    t.el.className='brp x';
    const f=document.createElement('iframe');f.className='brif';f.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');f.setAttribute('referrerpolicy','no-referrer');f.setAttribute('title',u);
    t.loading=true;
    f.addEventListener('load',()=>{if(t.frame===f){t.loading=false;renderTabs();sync()}});
    t.el.innerHTML=`<div class="brnote">這是模擬瀏覽器。許多網站（例如 Google、YouTube）不允許被嵌入，頁面會是空白——請按右邊的按鈕用你自己的瀏覽器開啟。<button type="button" class="btn" data-ext="1">在新視窗開啟</button><button type="button" class="ab" data-a="dismiss" aria-label="關閉提示">${OS.ico('close',12)}</button></div>`;
    t.el.appendChild(f);t.frame=f;t.loading=true;f.src=u;addHist(u,t.title);
    setTimeout(()=>{if(t.frame===f&&t.loading){t.loading=false;renderTabs();sync()}},12000);
   }
   renderTabs();if(t===cur)sync();
  }
  function qtitle(u){
   const m={'qene:home':'新分頁','qene:about':'青魚說明','qene:fish':'認識青魚','qene:bookmarks':'書籤','qene:history':'歷史紀錄'};
   if(m[u])return m[u];if(u.startsWith('qene:search'))return '搜尋：'+qs(u);return u;
  }
  function qs(u){try{return decodeURIComponent((u.split('q=')[1]||'').split('&')[0])}catch(e){return ''}}
  function qpage(u){
   const p=u.replace(/^qene:/i,'').split('?')[0];
   if(p==='about')return '<h2>青魚說明</h2><p>青魚瀏覽器是青魚電腦裡的模擬瀏覽器，不是完整的瀏覽器引擎。</p><p>以 <b>qene:</b> 開頭的是本機頁面。輸入網址時，會嘗試用 iframe 載入外部網站；許多網站不允許被嵌入，頁面會顯示空白，請改用「在新視窗開啟」。</p><p>Wi-Fi 關閉或開啟飛航模式後，外部網站將無法載入。</p><p><a data-go="qene:home">回到首頁</a></p>';
   if(p==='fish')return '<h2>認識青魚</h2><p>青魚（Mylopharyngodon piceus）是中國四大家魚之一，體型修長，背部青黑，常以螺、蚌為食。</p><p>青魚電腦的鱗片桌布，靈感就來自魚鱗的排列。</p><p><a data-go="qene:home">回到首頁</a></p>';
   if(p==='bookmarks')return `<h2>書籤</h2>${S.bm.length?`<div class="brl">${S.bm.map((b,i)=>`<div class="brli"><a data-go="${esc(b.u)}"><b>${esc(b.t)}</b><small>${esc(b.u)}</small></a><button type="button" class="ab" data-ebm="${i}" aria-label="編輯">${OS.ico('edit',14)}</button><button type="button" class="ab" data-dbm="${i}" aria-label="刪除">${OS.ico('trash',14)}</button></div>`).join('')}</div>`:'<p class="mut">還沒有書籤。在網址列按星號就可以加入。</p>'}`;
   if(p==='history'){const h=S.hist||[];return `<h2>歷史紀錄</h2>${h.length?`<p><button type="button" class="btn" data-a="clrhist">清除瀏覽紀錄</button></p><div class="brl">${h.map(x=>`<div class="brli"><a data-go="${esc(x.u)}"><b>${esc(x.t||x.u)}</b><small>${esc(x.u)}　${OS.fmtDateShort(new Date(x.ts))} ${OS.fmtTime(new Date(x.ts))}</small></a></div>`).join('')}</div>`:'<p class="mut">沒有瀏覽紀錄。</p>'}`}
   if(p==='search'){const k=qs(u);return `<h2>搜尋：${esc(k)}</h2><p class="mut">這是本機模擬的搜尋結果，不是真實搜尋引擎。</p>${localResults(k)}<p><a href="https://www.bing.com/search?q=${encodeURIComponent(k)}" target="_blank" rel="noopener noreferrer">用 Bing 搜尋「${esc(k)}」（在新視窗開啟）</a></p>`}
   return `<div class="bh"><svg><use href="#fish"/></svg><h2>青魚瀏覽器</h2><p class="mut">Qene Fish Browser</p><form class="sbox" data-search><input name="q" placeholder="搜尋或輸入網址" autocomplete="off" aria-label="搜尋或輸入網址"><button class="btn pri">前往</button></form><div class="quick"><a data-go="qene:about">說明</a><a data-go="qene:fish">認識青魚</a><a data-go="qene:bookmarks">書籤</a><a data-go="qene:history">歷史紀錄</a></div>${S.bmHome&&S.bm.length?'<div class="bgrid">'+S.bm.map(b=>`<a data-go="${esc(b.u)}">${esc(b.t)}</a>`).join('')+'</div>':''}</div>`;
  }
  function localResults(k){
   const q=k.toLowerCase(),r=[];
   [['qene:about','青魚說明','瀏覽器如何運作'],['qene:fish','認識青魚','青魚的介紹'],['qene:bookmarks','書籤','你儲存的網頁'],['qene:history','歷史紀錄','你瀏覽過的網頁']].forEach(x=>{if((x[1]+x[2]).toLowerCase().includes(q)||'qene fish 青魚'.includes(q))r.push(x)});
   S.bm.forEach(b=>{if((b.t+b.u).toLowerCase().includes(q))r.push([b.u,b.t,'書籤'])});
   return r.length?r.map(x=>`<p><a data-go="${esc(x[0])}">${esc(x[1])}</a><br><small>${esc(x[0])}　${esc(x[2])}</small></p>`).join(''):'<p class="mut">沒有符合的本機結果。</p>';
  }
  /* ---------- 事件 ---------- */
  root.addEventListener('click',async e=>{
   const t=e.target;let b;
   if(b=t.closest('.brtx')){e.stopPropagation();const tb=tabOf(b.dataset.x);if(tb)closeTab(tb);return}
   if(b=t.closest('.brtab')){const tb=tabOf(b.dataset.id);if(tb)activate(tb);return}
   if(t.closest('.brnt')){addTab('qene:home');return}
   if(b=t.closest('[data-bm]')){const x=S.bm[+b.dataset.bm];if(x)nav(cur,x.u);return}
   if(b=t.closest('[data-go]')){e.preventDefault();nav(cur,b.dataset.go);return}
   if(b=t.closest('[data-set]')){OS.open('settings',{page:b.dataset.set});return}
   if(b=t.closest('[data-ext]')){if(cur&&/^https?:/.test(cur.url))window.open(cur.url,'_blank','noopener,noreferrer');return}
   if(b=t.closest('[data-dbm]')){S.bm.splice(+b.dataset.dbm,1);OS.save();bmBar();load(cur,cur.url);return}
   if(b=t.closest('[data-ebm]')){const x=S.bm[+b.dataset.ebm];if(!x)return;const nm=await win.prompt({title:'編輯書籤',msg:'名稱：',value:x.t,max:60,validate:v=>v.trim()?'':'請輸入名稱'});if(nm!=null){x.t=nm.trim();OS.save();bmBar();load(cur,cur.url)}return}
   if(b=t.closest('[data-a]')){action(b.dataset.a,b);return}
  });
  root.addEventListener('submit',e=>{
   const f=e.target.closest('[data-search]');
   if(f){e.preventDefault();const v=f.q.value.trim();if(v)nav(cur,v);return}
   if(e.target.classList.contains('brf')){e.preventDefault();const v=url.value.trim();if(v){nav(cur,v);if(cur.frame)cur.frame.focus();else url.blur()}}
  });
  tabsEl.addEventListener('auxclick',e=>{if(e.button!==1)return;const b=e.target.closest('.brtab');if(b){e.preventDefault();const tb=tabOf(b.dataset.id);if(tb)closeTab(tb)}});
  tabsEl.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('brtab')){e.preventDefault();const tb=tabOf(e.target.dataset.id);if(tb)activate(tb)}});
  url.addEventListener('focus',()=>setTimeout(()=>url.select(),0));
  url.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){url.value=cur.url==='qene:home'?'':cur.url;url.blur()}});
  function action(a,b){
   if(a==='back'&&cur.hi>0){cur.hi--;load(cur,cur.hist[cur.hi])}
   else if(a==='fwd'&&cur.hi<cur.hist.length-1){cur.hi++;load(cur,cur.hist[cur.hi])}
   else if(a==='reload')load(cur,cur.url);
   else if(a==='home')nav(cur,S.home||'qene:home');
   else if(a==='star')toggleBm();
   else if(a==='dismiss'){const n=b.closest('.brnote');if(n)n.remove()}
   else if(a==='clrhist'){S.hist=[];OS.save();load(cur,cur.url)}
   else if(a==='menu')menu(b);
  }
  function toggleBm(){
   if(!cur||cur.url==='qene:home')return;
   const i=S.bm.findIndex(x=>x.u===cur.url);
   if(i>=0){S.bm.splice(i,1);OS.toast('已移除書籤')}
   else{S.bm.push({t:(cur.title||cur.url).slice(0,40),u:cur.url});OS.toast('已加入書籤')}
   OS.save();bmBar();sync();if(cur.url==='qene:bookmarks')load(cur,cur.url);
  }
  function menu(b){
   if(OS.menuRecentlyClosedBy(b))return;
   OS.menuAt(b,[{label:'新增分頁',kbd:'Ctrl+T',fn:()=>addTab('qene:home')},{sep:1},{label:'書籤',ico:'star',fn:()=>nav(cur,'qene:bookmarks')},{label:'歷史紀錄',ico:'clock',fn:()=>nav(cur,'qene:history')},{label:'顯示書籤列',chk:S.bmBar,fn:()=>{S.bmBar=!S.bmBar;OS.save();bmBar()}},{sep:1},
    {label:'將目前頁面設為首頁',dis:!cur||cur.url==='qene:home',fn:()=>{S.home=cur.url;OS.save();OS.toast('首頁已更新')}},{label:'還原預設首頁',fn:()=>{S.home='qene:home';OS.save();OS.toast('已還原預設首頁')}},{sep:1},
    {label:'清除瀏覽紀錄',fn:()=>{S.hist=[];OS.save();if(cur.url==='qene:history')load(cur,cur.url);OS.toast('已清除瀏覽紀錄')}},{label:'網路設定',fn:()=>OS.open('settings',{page:'network'})}],{right:true});
  }
  win.key(e=>{
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(ctrl&&k==='t'){e.preventDefault();addTab('qene:home')}
   else if(ctrl&&k==='w'){e.preventDefault();closeTab(cur)}
   else if(ctrl&&k==='l'||e.key==='F6'||(e.altKey&&k==='d')){e.preventDefault();url.focus()}
   else if(ctrl&&k==='r'||e.key==='F5'){e.preventDefault();load(cur,cur.url)}
   else if(ctrl&&k==='d'){e.preventDefault();toggleBm()}
   else if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();action('back')}
   else if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();action('fwd')}
   else if(ctrl&&e.key==='Tab'){e.preventDefault();const i=tabs.indexOf(cur);activate(tabs[(i+(e.shiftKey?-1:1)+tabs.length)%tabs.length])}
   else if(ctrl&&/^[1-8]$/.test(e.key)){e.preventDefault();const t=tabs[+e.key-1];if(t)activate(t)}
  });
  win.on('net',()=>{tabs.forEach(t=>{if(/^https?:/.test(t.url)&&(!OS.isOnline()||t.el.classList.contains('q')))load(t,t.url)})});
  win.on('look',bmBar);
  bmBar();
  addTab(args&&args.url?args.url:(S.home||'qene:home'));
  return {
   focusEl:()=>$('[data-search] input',cur.el)||(cur.frame||url),
   onArgs(a){if(!a||!a.url)return;if(a.newTab||!cur)addTab(a.url);else nav(cur,a.url)}
  };
 }
});
})();
