/* 青魚電腦 — 青魚文書（文書處理器，原創設計）
   檔案格式 .qdoc：JSON {v,w,ls,html}。也能開啟 .txt / .md / .html 並匯出。 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp,pad}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>';
const FONTS=[['','預設字型'],['"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif','正黑體'],['"PMingLiU","Songti TC","Noto Serif TC",serif','明體'],['"DFKai-SB","Kaiti TC",serif','楷體'],['Arial,Helvetica,sans-serif','Arial'],['Georgia,serif','Georgia'],['"Times New Roman",Times,serif','Times New Roman'],['Verdana,sans-serif','Verdana'],['"Courier New",monospace','Courier New']];
const SIZES=[10,11,12,14,16,18,20,24,28,32,40,48,64,80];
const STYLES=[['p','本文'],['h1','大標題'],['h2','標題'],['h3','小標題'],['blockquote','引言'],['pre','程式碼']];
const PAGES={a4:['A4 紙張',794],wide:['寬版',1000],narrow:['窄版',620]};
const SYMS=['—','…','·','©','®','™','°','±','×','÷','≠','≈','≤','≥','←','→','↑','↓','✓','✗','★','♥','「」','『』','（）','【】'];
const PALETTE=['#000000','#444444','#888888','#d93025','#e8710a','#f2b600','#1e8e3e','#14a094','#1a73e8','#7b3fe4','#c2185b','#ffffff'];
const HILITE=['#fff176','#ffd180','#ff9e9e','#b9f6ca','#9fe8ff','#d1c4ff','#f8bbd0',''];

/* ---------- 清理 HTML（只保留安全、基本的排版標籤與樣式） ---------- */
const OKTAG=new Set('p div br b strong i em u s strike del span a ul ol li h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr td th colgroup col img blockquote pre code sub sup hr'.split(' '));
const DROP=new Set('script style iframe object embed link meta noscript template svg form input button textarea select audio video canvas frame frameset applet base head title'.split(' '));
const OKSTYLE=new Set(['font-weight','font-style','text-decoration','text-decoration-line','color','background-color','font-size','font-family','text-align','text-indent','margin-left','width','height','vertical-align','line-height']);
const safeUrl=(u,img)=>{
 u=String(u||'').trim();
 if(img)return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(u)||/^https?:\/\//i.test(u)?u:'';
 return /^(https?:|mailto:|tel:|#)/i.test(u)?u:'';
};
function cleanNode(root){
 const walk=el=>{
  [...el.childNodes].forEach(n=>{
   if(n.nodeType===3)return;
   if(n.nodeType!==1){n.remove();return}
   const tag=n.tagName.toLowerCase();
   if(DROP.has(tag)){n.remove();return}
   walk(n);
   if(!OKTAG.has(tag)){while(n.firstChild)n.parentNode.insertBefore(n.firstChild,n);n.remove();return}
   const keep={};
   if(tag==='a'){const h=safeUrl(n.getAttribute('href'));if(h)keep.href=h}
   if(tag==='img'){const s=safeUrl(n.getAttribute('src'),true);if(!s){n.remove();return}keep.src=s;keep.alt=(n.getAttribute('alt')||'').slice(0,200)}
   if(tag==='td'||tag==='th'){['colspan','rowspan'].forEach(k=>{const v=parseInt(n.getAttribute(k));if(v>1&&v<50)keep[k]=v})}
   if(tag==='hr'&&n.classList.contains('pb'))keep.class='pb';
   let st='';
   for(let i=0;i<n.style.length;i++){
    const p=n.style[i];if(!OKSTYLE.has(p))continue;
    const v=n.style.getPropertyValue(p);if(/url\(|expression|javascript|[<>]/i.test(v))continue;
    st+=p+':'+v+';';
   }
   if(st)keep.style=st;
   [...n.attributes].map(a=>a.name).forEach(a=>n.removeAttribute(a));
   Object.keys(keep).forEach(k=>n.setAttribute(k,keep[k]));
   if(tag==='a')n.setAttribute('rel','noopener noreferrer');
  });
 };
 walk(root);return root;
}
function cleanHtml(html){
 let d;try{d=new DOMParser().parseFromString(String(html||''),'text/html')}catch(e){return ''}
 return cleanNode(d.body).innerHTML;
}
const textToHtml=t=>String(t||'').replace(/\r\n?/g,'\n').split('\n').map(l=>'<p>'+(l?esc(l):'<br>')+'</p>').join('');
const EMPTY='<p><br></p>';

OS.register({id:'writer',name:'青魚文書',kw:'writer word document doc 文書 文件 文字處理 編輯 排版 qdoc 報告 作業',
 g:'linear-gradient(145deg,#4aa3f0,#2457b8)',s:ICON,w:980,h:660,minW:520,minH:380,
 key:a=>a&&a.id?a.id:null,
 create(win,args){
  const P=Object.assign({zoom:100,panel:true,spell:false,pw:'a4',ls:1.6,focus:false},S.view.writer||{});
  const root=document.createElement('div');root.className='wr';win.body.appendChild(root);
  let doc={id:null,name:'未命名文件.qdoc',dirty:false};
  let saved=null,tab='outline',findOpen=false,rep=false,selImg=null,statT=0,outT=0;

  const mb=OS.menubar(root,[
   {label:'檔案',items:()=>[
    {label:'新增文件',kbd:'Ctrl+N',fn:()=>OS.open('writer',{fresh:1})},
    {label:'開啟…',ico:'folderplus',kbd:'Ctrl+O',fn:openDlg},{sep:1},
    {label:'儲存',ico:'save',kbd:'Ctrl+S',fn:()=>save(false)},
    {label:'另存新檔…',kbd:'Ctrl+Shift+S',fn:()=>save(true)},{sep:1},
    {label:'匯出為網頁 (.html)…',fn:()=>exportAs('html')},
    {label:'匯出為純文字 (.txt)…',fn:()=>exportAs('txt')},
    {label:'列印／存成 PDF…',kbd:'Ctrl+P',fn:doPrint},{sep:1},
    {label:'關閉',fn:()=>win.close()}]},
   {label:'編輯',items:()=>[
    {label:'復原',ico:'undo',kbd:'Ctrl+Z',fn:()=>ex('undo')},{label:'重做',ico:'redo',kbd:'Ctrl+Y',fn:()=>ex('redo')},{sep:1},
    {label:'剪下',ico:'cut',kbd:'Ctrl+X',fn:()=>ex('cut')},{label:'複製',ico:'copy',kbd:'Ctrl+C',fn:()=>ex('copy')},{label:'貼上',ico:'paste',kbd:'Ctrl+V',fn:pasteClip},{sep:1},
    {label:'全選',kbd:'Ctrl+A',fn:()=>ex('selectAll')},{sep:1},
    {label:'尋找…',kbd:'Ctrl+F',fn:()=>openFind(false)},{label:'取代…',kbd:'Ctrl+H',fn:()=>openFind(true)}]},
   {label:'插入',items:()=>[
    {label:'表格…',fn:insTable},
    {label:'圖片（從檔案總管）…',fn:insImgFs},{label:'圖片（從這台裝置）…',fn:insImgReal},
    {label:'連結…',kbd:'Ctrl+K',fn:insLink},{sep:1},
    {label:'水平分隔線',fn:()=>ex('insertHorizontalRule')},
    {label:'分頁線',fn:()=>ex('insertHTML','<hr class="pb"><p><br></p>')},
    {label:'目前日期與時間',fn:()=>ex('insertText',OS.fmtDateShort(new Date())+' '+OS.fmtTime(new Date()))},
    {label:'符號',sub:()=>SYMS.map(s=>({label:s,fn:()=>ex('insertText',s)}))}]},
   {label:'格式',items:()=>[
    {label:'段落樣式',sub:()=>STYLES.map(([t,n])=>({label:n,radio:1,on:curBlock()===t,fn:()=>block(t)}))},
    {label:'上標',kbd:'',fn:()=>ex('superscript')},{label:'下標',fn:()=>ex('subscript')},
    {label:'清除格式',fn:clearFmt},{sep:1},
    {label:'增加縮排',fn:()=>ex('indent')},{label:'減少縮排',fn:()=>ex('outdent')},{sep:1},
    {label:'行距',sub:()=>[1.2,1.4,1.6,2,2.4].map(n=>({label:n+' 倍',radio:1,on:doc.ls===n,fn:()=>{doc.ls=n;applyPage();touch()}}))},
    {label:'頁面寬度',sub:()=>Object.keys(PAGES).map(k=>({label:PAGES[k][0],radio:1,on:doc.pw===k,fn:()=>{doc.pw=k;applyPage();touch()}}))}]},
   {label:'表格',items:()=>{const t=inTable();return [
    {label:'插入表格…',fn:insTable},{sep:1},
    {label:'在上方插入列',dis:!t,fn:()=>tbl('rowU')},{label:'在下方插入列',dis:!t,fn:()=>tbl('rowD')},
    {label:'在左側插入欄',dis:!t,fn:()=>tbl('colL')},{label:'在右側插入欄',dis:!t,fn:()=>tbl('colR')},{sep:1},
    {label:'刪除列',dis:!t,fn:()=>tbl('delRow')},{label:'刪除欄',dis:!t,fn:()=>tbl('delCol')},{label:'刪除表格',dis:!t,danger:true,fn:()=>tbl('delTbl')}]}},
   {label:'檢視',items:()=>[
    {label:'縮放',sub:()=>[50,75,100,125,150,200].map(n=>({label:n+'%',radio:1,on:P.zoom===n,fn:()=>setZoom(n)}))},
    {label:'符合視窗寬度',fn:fitZoom},
    {label:'放大',kbd:'Ctrl++',fn:()=>setZoom(P.zoom+10)},{label:'縮小',kbd:'Ctrl+-',fn:()=>setZoom(P.zoom-10)},{sep:1},
    {label:'側邊欄（大綱與資訊）',chk:P.panel,fn:()=>{P.panel=!P.panel;pref();applyView()}},
    {label:'專注模式',chk:P.focus,kbd:'F11',fn:()=>{P.focus=!P.focus;pref();applyView()}},
    {label:'拼字檢查',chk:P.spell,fn:()=>{P.spell=!P.spell;pref();applyView()}}]}
  ]);

  const BT=(c,t,h)=>`<button type="button" class="wb" data-c="${c}" title="${t}" aria-label="${t}">${h}</button>`;
  const li=d=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${d}</svg>`;
  root.insertAdjacentHTML('beforeend',`
   <div class="wrtb" role="toolbar" aria-label="格式工具列">
    <select class="wsel w-style" aria-label="段落樣式" title="段落樣式">${STYLES.map(([t,n])=>`<option value="${t}">${n}</option>`).join('')}</select>
    <select class="wsel w-font" aria-label="字型" title="字型">${FONTS.map(([v,n])=>`<option value="${esc(v)}">${n}</option>`).join('')}</select>
    <select class="wsel w-size" aria-label="字級" title="字級"><option value="">字級</option>${SIZES.map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
    <span class="wsep"></span>
    ${BT('bold','粗體 (Ctrl+B)','<b>B</b>')}${BT('italic','斜體 (Ctrl+I)','<i>I</i>')}${BT('underline','底線 (Ctrl+U)','<u>U</u>')}${BT('strikeThrough','刪除線','<s>S</s>')}
    <span class="wsep"></span>
    <label class="wb wcol" title="文字顏色"><span class="wcl" style="color:#d93025">A</span><i class="wcb w-fgb" style="background:#d93025"></i><input type="color" class="w-fg" value="#d93025" aria-label="文字顏色"></label>
    <button type="button" class="wb" data-m="fg" title="文字顏色選單" aria-label="文字顏色選單">▾</button>
    <label class="wb wcol" title="螢光標示"><span class="wcl wcl2">▮</span><i class="wcb w-hlb" style="background:#fff176"></i><input type="color" class="w-hl" value="#fff176" aria-label="螢光標示顏色"></label>
    <button type="button" class="wb" data-m="hl" title="螢光標示選單" aria-label="螢光標示選單">▾</button>
    <span class="wsep"></span>
    ${BT('justifyLeft','靠左',li('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'))}${BT('justifyCenter','置中',li('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'))}${BT('justifyRight','靠右',li('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'))}${BT('justifyFull','左右對齊',li('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'))}
    <span class="wsep"></span>
    ${BT('insertUnorderedList','項目符號',li('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'))}${BT('insertOrderedList','編號清單',li('<path d="M10 6h10M10 12h10M10 18h10M4 5l1-1v4M4 11h2l-2 3h2M4 17h2v1.500H4V20h2"/>'))}
    ${BT('outdent','減少縮排',li('<path d="M4 6h16M12 10h8M12 14h8M4 18h16M8 9l-3 3 3 3"/>'))}${BT('indent','增加縮排',li('<path d="M4 6h16M12 10h8M12 14h8M4 18h16M4 9l3 3-3 3"/>'))}
    <span class="wsep"></span>
    ${BT('@table','插入表格',li('<rect x="4" y="5" width="16" height="14" rx="1.500"/><path d="M4 10h16M4 14.500h16M10 5v14"/>'))}${BT('@image','插入圖片',li('<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.500"/><path d="M5 18l5-5 3 3 2-2 4 4"/>'))}${BT('@link','插入連結',li('<path d="M10 14a4 4 0 0 0 5.500 0l3-3a4 4 0 0 0-5.500-5.500l-1 1M14 10a4 4 0 0 0-5.500 0l-3 3a4 4 0 0 0 5.500 5.500l1-1"/>'))}${BT('@clear','清除格式',li('<path d="M5 5h14M12 5v4M8 19l3-10M14 14l5 5M19 14l-5 5"/>'))}
    ${BT('@find','尋找與取代 (Ctrl+F)',li('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500"/>'))}
   </div>
   <div class="wrfind" hidden>
    <div class="wrfr"><input class="inp wf1" placeholder="尋找" aria-label="尋找" autocomplete="off" spellcheck="false"><button type="button" class="btn wfp">上一個</button><button type="button" class="btn wfn">下一個</button><label class="wfc"><input type="checkbox" class="wfcs"> 區分大小寫</label><span class="wfm" aria-live="polite"></span><button type="button" class="ab wfx" aria-label="關閉尋找">${OS.ico('close',14)}</button></div>
    <div class="wrfr wfrep" hidden><input class="inp wf2" placeholder="取代為" aria-label="取代為" autocomplete="off" spellcheck="false"><button type="button" class="btn wfr1">取代</button><button type="button" class="btn wfra">全部取代</button></div>
   </div>
   <div class="wrmain">
    <aside class="wrside"><div class="wrstabs"><button type="button" data-t="outline" class="on">大綱</button><button type="button" data-t="info">資訊</button></div><div class="wrsb"></div></aside>
    <div class="wrdesk"><div class="wrzoom"><div class="wrpaper" contenteditable="true" role="textbox" aria-multiline="true" aria-label="文件內容" spellcheck="false"></div></div></div>
   </div>
   <div class="wrst"><span class="ws-w"></span><span class="ws-c"></span><span class="ws-p"></span><span class="ws-s"></span><span class="grow"></span><button type="button" class="ab" data-z="-" aria-label="縮小">−</button><input type="range" class="wzr" min="50" max="200" step="10" aria-label="縮放"><button type="button" class="ab" data-z="+" aria-label="放大">＋</button><em class="wzv">100%</em></div>`);
  const paper=$('.wrpaper',root),tb=$('.wrtb',root),fbar=$('.wrfind',root),f1=$('.wf1',root),f2=$('.wf2',root),fm=$('.wfm',root),sb=$('.wrsb',root);
  const selStyle=$('.w-style',root),selFont=$('.w-font',root),selSize=$('.w-size',root),zr=$('.wzr',root);
  doc.w=null;doc.pw=P.pw;doc.ls=P.ls;

  /* ---------- 選取範圍保存（工具列控制項會搶走焦點） ---------- */
  let lastRange=null;
  const inPaper=n=>!!n&&paper.contains(n.nodeType===1?n:n.parentNode);
  document.addEventListener('selectionchange',onSel);
  win.cleanup(()=>document.removeEventListener('selectionchange',onSel));
  function onSel(){
   const s=getSelection();
   if(s&&s.rangeCount&&inPaper(s.anchorNode)&&inPaper(s.focusNode)){lastRange=s.getRangeAt(0).cloneRange();clearTimeout(statT);statT=setTimeout(()=>{reflect();stats()},60)}
  }
  function restore(){
   paper.focus({preventScroll:true});
   if(lastRange&&lastRange.startContainer.isConnected&&lastRange.endContainer.isConnected){const s=getSelection();s.removeAllRanges();s.addRange(lastRange)}
  }
  function ex(c,v){
   restore();
   try{document.execCommand('styleWithCSS',false,c==='fontSize'?'false':'true');document.execCommand(c,false,v==null?null:v)}catch(e){}
   afterEdit();
  }
  function afterEdit(){touch();reflect();stats();scheduleOutline()}
  function touch(){setDirty(true)}
  const hasEmpty=()=>!paper.firstChild;
  function ensureP(){if(hasEmpty())paper.innerHTML=EMPTY}

  /* ---------- 工具列 ---------- */
  tb.addEventListener('mousedown',e=>{if(!e.target.closest('select,input,label'))e.preventDefault()});
  tb.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.m){
    const kind=b.dataset.m,cols=kind==='fg'?PALETTE:HILITE;
    OS.menuAt(b,cols.map(c=>({label:c?c.toUpperCase():'無',fn:()=>{if(kind==='fg'){setFg(c)}else{if(c)setHl(c);else ex('hiliteColor','transparent')}}})));
    return;
   }
   const c=b.dataset.c;if(!c)return;
   if(c[0]==='@'){({'@table':insTable,'@image':insImgMenu,'@link':insLink,'@clear':clearFmt,'@find':()=>openFind(false)})[c]();return}
   ex(c);
  });
  selStyle.addEventListener('change',()=>{block(selStyle.value)});
  selFont.addEventListener('change',()=>{if(selFont.value)ex('fontName',selFont.value);else{restore();paper.focus()}});
  selSize.addEventListener('change',()=>{const v=+selSize.value;if(v)setSize(v)});
  function setFg(c){$('.w-fg',root).value=c.length===7?c:'#000000';$('.w-fgb',root).style.background=c;$('.wcl',root).style.color=c;ex('foreColor',c)}
  function setHl(c){$('.w-hl',root).value=c.length===7?c:'#fff176';$('.w-hlb',root).style.background=c;ex('hiliteColor',c)}
  $('.w-fg',root).addEventListener('input',e=>setFg(e.target.value));
  $('.w-hl',root).addEventListener('input',e=>setHl(e.target.value));
  function setSize(px){
   restore();
   try{document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,'7')}catch(e){}
   const made=[];
   $$('font[size="7"]',paper).forEach(f=>{const sp=document.createElement('span');sp.style.fontSize=px+'px';while(f.firstChild)sp.appendChild(f.firstChild);f.replaceWith(sp);made.push(sp)});
   if(made.length){const nr=document.createRange();nr.setStartBefore(made[0]);nr.setEndAfter(made[made.length-1]);const sl=getSelection();sl.removeAllRanges();sl.addRange(nr);lastRange=nr.cloneRange()}
   afterEdit();
  }
  function block(t){
   restore();
   const s=getSelection();if(!s.rangeCount||!inPaper(s.anchorNode)){return}
   const r=s.getRangeAt(0);
   const isB=el=>/^(P|H[1-6]|BLOCKQUOTE|PRE|DIV)$/.test(el.tagName);
   const all=[...paper.querySelectorAll('p,h1,h2,h3,h4,h5,h6,blockquote,pre,div')].filter(el=>!el.querySelector('p,h1,h2,h3,h4,h5,h6,blockquote,pre,div')&&!el.closest('li')&&r.intersectsNode(el));
   const top=[...paper.children].filter(el=>isB(el)&&r.intersectsNode(el));
   let blocks=all.filter(el=>el.parentNode===paper);
   if(!blocks.length&&all.length)blocks=all;
   if(!blocks.length&&!top.length){
    try{document.execCommand('formatBlock',false,'<'+t+'>')}catch(e){}
    afterEdit();return;
   }
   // 一次處理一個區塊，保留文字對齊
   const fresh=[];
   blocks.forEach(el=>{
    if(el.tagName.toLowerCase()===t){fresh.push(el);return}
    const n=document.createElement(t);
    if(el.style.textAlign)n.style.textAlign=el.style.textAlign;
    while(el.firstChild)n.appendChild(el.firstChild);
    if(!n.firstChild)n.appendChild(document.createElement('br'));
    el.replaceWith(n);fresh.push(n);
   });
   if(fresh.length){
    const nr=document.createRange();nr.setStart(fresh[0],0);nr.setEnd(fresh[fresh.length-1],fresh[fresh.length-1].childNodes.length);
    s.removeAllRanges();s.addRange(nr);lastRange=nr.cloneRange();
   }
   afterEdit();
  }
  function curBlock(){
   const s=getSelection();let n=s&&s.anchorNode&&inPaper(s.anchorNode)?s.anchorNode:null;
   if(!n&&lastRange)n=lastRange.startContainer;
   while(n&&n!==paper){if(n.nodeType===1){const t=n.tagName.toLowerCase();if(['p','h1','h2','h3','h4','h5','h6','blockquote','pre'].includes(t))return t==='h4'||t==='h5'||t==='h6'?'h3':t;if(t==='div')return 'p'}n=n.parentNode}
   return 'p';
  }
  function reflect(){
   if(win.closing)return;
   const q=c=>{try{return document.queryCommandState(c)}catch(e){return false}};
   $$('.wb[data-c]',tb).forEach(b=>{const c=b.dataset.c;if(c[0]==='@'||c==='indent'||c==='outdent')return;b.classList.toggle('on',q(c))});
   selStyle.value=curBlock();
   const s=getSelection();let n=s&&s.anchorNode&&inPaper(s.anchorNode)?s.anchorNode:null;if(n&&n.nodeType===3)n=n.parentNode;
   if(n){
    const cs=getComputedStyle(n),px=Math.round(parseFloat(cs.fontSize));
    selSize.value=SIZES.includes(px)?String(px):'';
    const fam=cs.fontFamily.replace(/["']/g,'').toLowerCase();let fv='';
    FONTS.forEach(([v])=>{if(v&&fam.startsWith(v.replace(/["']/g,'').split(',')[0].toLowerCase()))fv=v});
    selFont.value=fv;
   }
  }

  /* ---------- 版面與檢視 ---------- */
  function pref(){S.view.writer={zoom:P.zoom,panel:P.panel,spell:P.spell,pw:doc.pw,ls:doc.ls,focus:P.focus};OS.save()}
  function applyPage(){
   const w=PAGES[doc.pw]||PAGES.a4;
   paper.style.width=w[1]+'px';paper.style.lineHeight=String(doc.ls);
   $('.wrzoom',root).style.width=w[1]+'px';
  }
  function setZoom(n){P.zoom=clamp(Math.round(n/10)*10,50,200);pref();applyView()}
  function applyView(){
   $('.wrzoom',root).style.zoom=P.zoom/100;
   $('.wzv',root).textContent=P.zoom+'%';zr.value=P.zoom;
   root.classList.toggle('noside',!P.panel||P.focus);root.classList.toggle('focus',!!P.focus);
   paper.spellcheck=!!P.spell;
   applyPage();
  }
  function fitZoom(){
   const d=$('.wrdesk',root),w=(PAGES[doc.pw]||PAGES.a4)[1];
   if(!d||!d.clientWidth)return;
   setZoom(clamp(Math.floor((d.clientWidth-40)/w*10)*10,50,200));
  }
  root.addEventListener('click',e=>{
   const z=e.target.closest('[data-z]');if(z){setZoom(P.zoom+(z.dataset.z==='+'?10:-10))}
  });
  zr.addEventListener('input',()=>setZoom(+zr.value));
  $('.wrdesk',root).addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(P.zoom+(e.deltaY<0?10:-10))}},{passive:false});
  $('.wrstabs',root).addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;tab=b.dataset.t;$$('.wrstabs button',root).forEach(x=>x.classList.toggle('on',x===b));side()});

  /* ---------- 側邊欄：大綱與資訊 ---------- */
  function scheduleOutline(){clearTimeout(outT);outT=setTimeout(side,250)}
  function side(){
   if(win.closing)return;
   if(tab==='outline'){
    const hs=$$('h1,h2,h3',paper);
    sb.innerHTML=hs.length?hs.map((h,i)=>`<button type="button" class="wol l${h.tagName[1]}" data-h="${i}">${esc((h.textContent||'').trim().slice(0,60)||'（空白標題）')}</button>`).join(''):'<p class="empty-s">用「段落樣式」設定標題後，這裡會列出文件大綱。</p>';
   }else{
    const s=count();const n=doc.id?FS.get(doc.id):null;
    sb.innerHTML=`<dl class="wri"><dt>檔名</dt><dd>${esc(doc.name)}</dd><dt>位置</dt><dd>${n?esc(FS.dpath(n.p)):'尚未儲存'}</dd><dt>字數</dt><dd>${s.words}</dd><dt>字元（含空白）</dt><dd>${s.chars}</dd><dt>段落</dt><dd>${s.paras}</dd><dt>閱讀時間</dt><dd>約 ${Math.max(1,Math.round(s.words/400))} 分鐘</dd>${n?`<dt>建立</dt><dd>${esc(OS.fmtDateShort(new Date(n.c))+' '+OS.fmtTime(new Date(n.c)))}</dd><dt>修改</dt><dd>${esc(OS.fmtDateShort(new Date(n.m))+' '+OS.fmtTime(new Date(n.m)))}</dd>`:''}</dl>`;
   }
  }
  sb.addEventListener('click',e=>{const b=e.target.closest('[data-h]');if(!b)return;const h=$$('h1,h2,h3',paper)[+b.dataset.h];if(h){h.scrollIntoView({block:'start',behavior:'smooth'});const r=document.createRange();r.selectNodeContents(h);r.collapse(true);paper.focus({preventScroll:true});const s=getSelection();s.removeAllRanges();s.addRange(r)}});

  /* ---------- 統計 ---------- */
  function count(){
   const t=paper.innerText.replace(/​/g,'');
   const cjk=(t.match(/[㐀-鿿豈-﫿぀-ヿ가-힯]/g)||[]).length;
   const lat=(t.replace(/[㐀-鿿豈-﫿぀-ヿ가-힯]/g,' ').match(/[A-Za-z0-9À-ɏ]+(?:['’\-][A-Za-z0-9]+)*/g)||[]).length;
   const paras=$$('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,td,th',paper).filter(e=>(e.textContent||'').trim()&&!e.querySelector('p,li,h1,h2,h3,blockquote,pre')).length;
   return {words:cjk+lat,chars:t.replace(/\n/g,'').length,paras};
  }
  function stats(){
   if(win.closing)return;
   const s=count();
   $('.ws-w',root).textContent='字數 '+s.words;$('.ws-c',root).textContent='字元 '+s.chars;$('.ws-p',root).textContent='段落 '+s.paras;
   const sel=getSelection(),st=$('.ws-s',root);
   const txt=sel&&!sel.isCollapsed&&inPaper(sel.anchorNode)?sel.toString():'';
   st.textContent=txt?'已選取 '+txt.replace(/\s/g,'').length+' 字':'';
   if(tab==='info')side();
  }

  /* ---------- 標題、髒標記 ---------- */
  function title(){win.setTitle((doc.dirty?'*':'')+doc.name+' - 青魚文書');win.setDirty(doc.dirty)}
  function setDirty(d){if(doc.dirty!==d){doc.dirty=d;title()}}

  paper.addEventListener('input',()=>{ensureP();afterEdit()});
  paper.addEventListener('keydown',e=>{
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(e.key==='Tab'&&!ctrl&&!e.altKey){
    e.preventDefault();
    const cell=inTable()?lastRange&&closestIn(lastRange.startContainer,'td,th'):null;
    if(cell){const cells=$$('td,th',cell.closest('table'));let i=cells.indexOf(cell)+(e.shiftKey?-1:1);if(i>=0&&i<cells.length){const r=document.createRange();r.selectNodeContents(cells[i]);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}return}
    if(document.queryCommandState('insertUnorderedList')||document.queryCommandState('insertOrderedList'))document.execCommand(e.shiftKey?'outdent':'indent');
    else document.execCommand('insertText',false,'\u00a0\u00a0\u00a0\u00a0');
    afterEdit();
   }else if(ctrl&&k==='k'){e.preventDefault();insLink()}
  });
  paper.addEventListener('paste',e=>{
   e.preventDefault();
   const cd=e.clipboardData;if(!cd)return;
   const f=[...(cd.files||[])].find(x=>/^image\//.test(x.type));
   if(f){readImg(f);return}
   const h=cd.getData('text/html');
   if(h){const c=cleanHtml(h);if(c.trim()){document.execCommand('insertHTML',false,c);afterEdit();return}}
   const t=cd.getData('text/plain');if(t){document.execCommand('insertText',false,t);afterEdit()}
  });
  paper.addEventListener('drop',e=>{
   const f=e.dataTransfer&&[...(e.dataTransfer.files||[])].find(x=>/^image\//.test(x.type));
   if(f){e.preventDefault();readImg(f)}
  });
  paper.addEventListener('click',e=>{
   const a=e.target.closest('a');
   if(a&&(e.ctrlKey||e.metaKey)){e.preventDefault();const h=safeUrl(a.getAttribute('href'));if(h&&/^https?:/i.test(h))window.open(h,'_blank','noopener')}
   if(selImg){selImg.classList.remove('wsel1');selImg=null}
   if(e.target.tagName==='IMG'){selImg=e.target;selImg.classList.add('wsel1')}
  });
  paper.addEventListener('contextmenu',e=>{
   e.preventDefault();
   const img=e.target.tagName==='IMG'?e.target:null,t=inTableAt(e.target);
   const items=[{label:'剪下',kbd:'Ctrl+X',fn:()=>ex('cut')},{label:'複製',kbd:'Ctrl+C',fn:()=>ex('copy')},{label:'貼上',kbd:'Ctrl+V',fn:pasteClip},{sep:1}];
   if(img)items.push({label:'圖片寬度',sub:()=>[25,50,75,100].map(n=>({label:n+'%',fn:()=>{img.style.width=n+'%';img.style.height='';touch()}}))},{label:'刪除圖片',danger:true,fn:()=>{img.remove();afterEdit()}},{sep:1});
   if(t)items.push({label:'表格',sub:()=>[{label:'在上方插入列',fn:()=>tbl('rowU',e.target)},{label:'在下方插入列',fn:()=>tbl('rowD',e.target)},{label:'在左側插入欄',fn:()=>tbl('colL',e.target)},{label:'在右側插入欄',fn:()=>tbl('colR',e.target)},{sep:1},{label:'刪除列',fn:()=>tbl('delRow',e.target)},{label:'刪除欄',fn:()=>tbl('delCol',e.target)},{label:'刪除表格',danger:true,fn:()=>tbl('delTbl',e.target)}]},{sep:1});
   items.push({label:'連結…',fn:insLink},{label:'清除格式',fn:clearFmt});
   OS.menu(items,e.clientX,e.clientY);
  });
  async function pasteClip(){
   restore();
   try{
    if(navigator.clipboard&&navigator.clipboard.read){
     const items=await navigator.clipboard.read();
     for(const it of items){
      if(it.types.includes('text/html')){const h=await(await it.getType('text/html')).text();const c=cleanHtml(h);if(c.trim()){restore();document.execCommand('insertHTML',false,c);afterEdit();return}}
      if(it.types.includes('text/plain')){const t=await(await it.getType('text/plain')).text();restore();document.execCommand('insertText',false,t);afterEdit();return}
     }
    }else{const t=await navigator.clipboard.readText();if(t){restore();document.execCommand('insertText',false,t);afterEdit()}}
   }catch(e){OS.toast('無法讀取剪貼簿，請改用 Ctrl+V 貼上')}
  }
  function clearFmt(){
   restore();
   try{document.execCommand('removeFormat');document.execCommand('formatBlock',false,'<p>')}catch(e){}
   afterEdit();
  }

  /* ---------- 表格 ---------- */
  const closestIn=(n,sel)=>{while(n&&n!==paper){if(n.nodeType===1&&n.matches(sel))return n;n=n.parentNode}return null};
  const inTableAt=n=>{const c=closestIn(n,'td,th');return c&&paper.contains(c)?c:null};
  function inTable(){const r=lastRange;return r&&inPaper(r.startContainer)?!!closestIn(r.startContainer,'td,th'):false}
  async function insTable(){
   const r=await win.dialog({title:'插入表格',w:340,body:`<label class="ol2">列數</label><input class="inp dinp t-r" type="number" min="1" max="30" value="3" aria-label="列數"><label class="ol2">欄數</label><input class="inp dinp t-c" type="number" min="1" max="12" value="3" aria-label="欄數"><label class="ol2"><input type="checkbox" class="t-h" checked> 第一列當作標題列</label><div class="derr"></div>`,buttons:[{id:'ok',label:'插入',primary:true},{id:'cancel',label:'取消'}],
    beforeClose:(id,w)=>{if(id!=='ok')return true;const a=+$('.t-r',w).value,b=+$('.t-c',w).value;if(!(a>=1&&a<=30&&b>=1&&b<=12&&Number.isInteger(a)&&Number.isInteger(b))){$('.derr',w).textContent='列數 1–30、欄數 1–12。';return false}tblSpec={r:a,c:b,h:$('.t-h',w).checked};return true}});
   if(r!=='ok')return;
   let h='<table><tbody>';
   for(let i=0;i<tblSpec.r;i++){h+='<tr>';for(let j=0;j<tblSpec.c;j++)h+=(i===0&&tblSpec.h?'<th><br></th>':'<td><br></td>');h+='</tr>'}
   h+='</tbody></table><p><br></p>';
   ex('insertHTML',h);
  }
  let tblSpec=null;
  function tbl(op,from){
   const cell=from?inTableAt(from):(lastRange?closestIn(lastRange.startContainer,'td,th'):null);
   if(!cell)return;
   const tr=cell.parentNode,table=cell.closest('table'),idx=[...tr.children].indexOf(cell);
   const mk=src=>{const c=document.createElement(src&&src.tagName==='TH'?'th':'td');c.innerHTML='<br>';return c};
   if(op==='rowU'||op==='rowD'){const n=document.createElement('tr');[...tr.children].forEach(c=>n.appendChild((()=>{const x=document.createElement('td');x.innerHTML='<br>';return x})()));tr.parentNode.insertBefore(n,op==='rowU'?tr:tr.nextSibling)}
   else if(op==='colL'||op==='colR'){$$('tr',table).forEach(r=>{const c=r.children[idx];const n=mk(c);r.insertBefore(n,op==='colL'?c:c&&c.nextSibling)})}
   else if(op==='delRow'){if($$('tr',table).length<=1)table.remove();else tr.remove()}
   else if(op==='delCol'){if(tr.children.length<=1)table.remove();else $$('tr',table).forEach(r=>{if(r.children[idx])r.children[idx].remove()})}
   else if(op==='delTbl')table.remove();
   ensureP();paper.focus({preventScroll:true});afterEdit();
  }

  /* ---------- 圖片與連結 ---------- */
  function insImgMenu(){OS.menuAt($('.wb[data-c="@image"]',root),[{label:'從檔案總管…',fn:insImgFs},{label:'從這台裝置…',fn:insImgReal}])}
  function readImg(f){
   if(f.size>8e6){OS.toast('圖片太大（上限 8 MB）');return}
   const fr=new FileReader();
   fr.onload=()=>{if(win.closing)return;const u=String(fr.result);if(!safeUrl(u,true)){OS.toast('不支援的圖片格式');return}restore();document.execCommand('insertHTML',false,`<img src="${u}" alt="${esc(f.name||'圖片')}" style="width:50%">`);afterEdit()};
   fr.onerror=()=>OS.toast('無法讀取圖片');
   fr.readAsDataURL(f);
  }
  async function insImgFs(){
   const r=await OS.fileDialog({parent:win,mode:'open',kinds:['image'],start:'pictures',title:'插入圖片'});
   if(!r||!r.id||win.closing)return;
   const b=await FS.getBlob(r.id);if(!b){OS.toast('找不到圖片');return}
   readImg(new File([b],FS.get(r.id).name,{type:b.type||'image/png'}));
  }
  function insImgReal(){
   const i=document.createElement('input');i.type='file';i.accept='image/png,image/jpeg,image/gif,image/webp';
   i.onchange=()=>{if(i.files&&i.files[0])readImg(i.files[0])};i.click();
  }
  async function insLink(){
   const s=getSelection();const sel=lastRange?lastRange.toString():'';
   const cur=lastRange?closestIn(lastRange.startContainer,'a'):null;
   const v=await win.prompt({title:'連結',msg:cur||sel?'網址（留空可移除連結）：':'網址：',value:cur?cur.getAttribute('href')||'':'https://',max:500,validate:x=>{x=x.trim();if(!x)return '';return /^(https?:\/\/|mailto:|tel:)/i.test(x)||/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(x)?'':'請輸入有效的網址。'}});
   if(v==null)return;
   let u=v.trim();
   if(!u||u==='https://'){restore();document.execCommand('unlink');afterEdit();return}
   if(!/^(https?:|mailto:|tel:)/i.test(u))u='https://'+u;
   restore();
   if(lastRange&&lastRange.collapsed&&!cur)document.execCommand('insertHTML',false,`<a href="${esc(u)}">${esc(u)}</a>&nbsp;`);
   else document.execCommand('createLink',false,u);
   afterEdit();
  }

  /* ---------- 尋找與取代 ---------- */
  function openFind(r){
   findOpen=true;rep=!!r;fbar.hidden=false;$('.wfrep',root).hidden=!rep;
   const s=lastRange?lastRange.toString():'';if(s&&!s.includes('\n')&&s.length<80)f1.value=s;
   f1.focus();f1.select();updFind();
  }
  function closeFind(){findOpen=false;fbar.hidden=true;fm.textContent='';restore()}
  const cs=()=>$('.wfcs',root).checked;
  function mapText(){
   const w=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);const nodes=[];let s='',n,prevBlock=null;
   const blk=t=>closestBlock(t);
   while(n=w.nextNode()){const b=blk(n);if(prevBlock&&b!==prevBlock)s+='\n';nodes.push({n,off:s.length});s+=n.nodeValue;prevBlock=b}
   return {s,nodes};
  }
  function closestBlock(n){while(n&&n!==paper){if(n.nodeType===1&&/^(P|DIV|H[1-6]|LI|TD|TH|BLOCKQUOTE|PRE|TR)$/.test(n.tagName))return n;n=n.parentNode}return paper}
  function findAll(){
   const q=f1.value;if(!q)return {list:[],m:null};
   const m=mapText(),h=cs()?m.s:m.s.toLowerCase(),nd=cs()?q:q.toLowerCase();
   const list=[];let i=-1;while((i=h.indexOf(nd,i+1))>=0&&list.length<5000)list.push(i);
   return {list,m,len:q.length};
  }
  function rangeFor(m,start,len){
   const end=start+len,r=document.createRange();let a=false;
   for(let k=0;k<m.nodes.length;k++){
    const {n,off}=m.nodes[k],e=off+n.nodeValue.length;
    if(!a&&start<=e&&(start<e||k===m.nodes.length-1||true)&&start>=off){if(start===e&&k<m.nodes.length-1&&m.nodes[k+1].off<=start)continue;r.setStart(n,start-off);a=true}
    if(a&&end<=e){r.setEnd(n,end-off);return r}
   }
   return a?r:null;
  }
  function updFind(){
   const {list}=findAll();
   fm.textContent=!f1.value?'':list.length?list.length+' 個符合':'找不到';fm.classList.toggle('bad',!!f1.value&&!list.length);
  }
  function findNext(back){
   const {list,m,len}=findAll();if(!list.length){fm.textContent=f1.value?'找不到':'';fm.classList.add('bad');return false}
   let pos=0;
   if(lastRange&&inPaper(lastRange.startContainer)){
    const pre=document.createRange();pre.selectNodeContents(paper);pre.setEnd(lastRange.startContainer,lastRange.startOffset);
    const startIdx=mapIndex(m,lastRange.startContainer,lastRange.startOffset);const endIdx=mapIndex(m,lastRange.endContainer,lastRange.endOffset);
    pos=back?startIdx:endIdx;
   }
   let pick;
   if(back){pick=[...list].reverse().find(i=>i<pos);if(pick==null)pick=list[list.length-1]}
   else{pick=list.find(i=>i>=pos);if(pick==null)pick=list[0]}
   const r=rangeFor(m,pick,len);if(!r)return false;
   const s=getSelection();s.removeAllRanges();s.addRange(r);lastRange=r.cloneRange();
   const el=r.startContainer.parentElement;if(el)el.scrollIntoView({block:'center'});
   fm.classList.remove('bad');return true;
  }
  function mapIndex(m,node,off){
   const k=m.nodes.find(x=>x.n===node);
   if(k)return k.off+off;
   // 選取在元素上：改用第一個落在其後的文字節點
   const probe=document.createRange();probe.setStart(node,Math.min(off,node.childNodes.length));
   for(const x of m.nodes){const r=document.createRange();r.selectNodeContents(x.n);if(probe.compareBoundaryPoints(Range.START_TO_START,r)<=0)return x.off}
   return m.s.length;
  }
  function replaceOne(){
   if(!f1.value)return;
   const sel=lastRange?lastRange.toString():'';
   if((cs()?sel:sel.toLowerCase())===(cs()?f1.value:f1.value.toLowerCase())&&sel){restore();document.execCommand('insertText',false,f2.value);afterEdit()}
   findNext(false);updFind();
  }
  function replaceAll(){
   if(!f1.value)return;
   const {list,m,len}=findAll();if(!list.length){fm.textContent='找不到';return}
   const rs=list.map(i=>rangeFor(m,i,len)).filter(Boolean);
   paper.focus({preventScroll:true});
   for(let i=rs.length-1;i>=0;i--){const s=getSelection();s.removeAllRanges();s.addRange(rs[i]);document.execCommand('insertText',false,f2.value)}
   afterEdit();fm.textContent='已取代 '+rs.length+' 處';fm.classList.remove('bad');
  }
  $('.wfn',root).addEventListener('click',()=>findNext(false));
  $('.wfp',root).addEventListener('click',()=>findNext(true));
  $('.wfx',root).addEventListener('click',closeFind);
  $('.wfr1',root).addEventListener('click',replaceOne);
  $('.wfra',root).addEventListener('click',replaceAll);
  $('.wfcs',root).addEventListener('change',updFind);
  f1.addEventListener('input',updFind);
  fbar.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeFind()}
   else if(e.key==='Enter'&&e.target===f1){e.preventDefault();findNext(e.shiftKey)}
   else if(e.key==='Enter'&&e.target===f2){e.preventDefault();replaceOne()}
  });

  /* ---------- 檔案 ---------- */
  function serialize(){return JSON.stringify({v:1,w:doc.pw,ls:doc.ls,html:cleanHtml(paper.innerHTML)})}
  function loadContent(text,name,asImport){
   let html=EMPTY;
   const ext=FS.ext(name||'');
   if(ext==='qdoc'||(!asImport&&ext==='')){
    if(String(text||'').trim()){
     try{const o=JSON.parse(text);if(o&&typeof o==='object'){html=cleanHtml(o.html||'')||EMPTY;if(PAGES[o.w])doc.pw=o.w;if([1.2,1.4,1.6,2,2.4].includes(+o.ls))doc.ls=+o.ls}else html=textToHtml(text)}
     catch(e){html=textToHtml(text)}
    }
   }else if(ext==='html'||ext==='htm'){html=cleanHtml(text)||EMPTY}
   else html=text?textToHtml(text):EMPTY;
   paper.innerHTML=html;ensureP();
  }
  async function load(id){
   const n=FS.get(id);if(!n||n.type!=='file')return false;
   const t=await FS.readText(id);if(win.closing)return false;
   doc.pw=P.pw;doc.ls=P.ls;
   loadContent(t==null?'':t,n.name,n.kind!=='doc');
   const imp=n.kind!=='doc';
   if(imp){ // 匯入的文字／網頁檔：另存時用新檔名 .qdoc
    doc={id:null,name:n.name.replace(/\.[^.]+$/,'')+'.qdoc',dirty:true,pw:doc.pw,ls:doc.ls,from:id};win.dk=null;
   }else{doc={id,name:n.name,dirty:false,pw:doc.pw,ls:doc.ls};win.dk=id}
   applyPage();title();stats();side();paper.scrollTop=0;
   return true;
  }
  const WMfind=id=>OS.WM.list.find(w=>w.app==='writer'&&w.dk===id&&!w.closing);
  async function openDlg(){
   if(!await askSave())return;
   const r=await OS.fileDialog({parent:win,mode:'open',kinds:['doc','text'],start:doc.id&&FS.get(doc.id)?FS.get(doc.id).p:'documents',title:'開啟文件'});
   if(r&&r.id){const ex2=WMfind(r.id);if(ex2&&ex2!==win){OS.WM.focus(ex2);return}await load(r.id)}
  }
  async function save(as){
   let n=doc.id?FS.get(doc.id):null;if(n&&FS.inBin(n))n=null;
   if(!as&&n&&n.type==='file'){FS.writeText(n.id,serialize());doc.name=n.name;setDirty(false);title();side();OS.toast('已儲存');return true}
   const r=await OS.fileDialog({parent:win,mode:'save',kinds:['doc'],defExt:'qdoc',name:n?n.name:doc.name,start:n?n.p:'documents'});
   if(!r)return false;
   try{
    let id=r.id;
    if(id)FS.writeText(id,serialize());else id=FS.create({parent:r.dir,name:r.name,text:serialize(),kind:'doc'}).id;
    doc={id,name:FS.get(id).name,dirty:false,pw:doc.pw,ls:doc.ls};win.dk=id;title();side();
    OS.toast('已儲存「'+doc.name+'」');return true;
   }catch(e){await win.alert(e.message||'無法儲存檔案。',{title:'青魚文書',kind:'err'});return false}
  }
  async function exportAs(kind){
   const base=doc.name.replace(/\.[^.]+$/,'');
   const r=await OS.fileDialog({parent:win,mode:'save',kinds:['text'],defExt:kind,name:base+'.'+kind,start:'documents',title:kind==='html'?'匯出為網頁':'匯出為純文字'});
   if(!r)return;
   const body=kind==='html'?htmlPage():paper.innerText.replace(/​/g,'');
   try{
    if(r.id)FS.writeText(r.id,body);else FS.create({parent:r.dir,name:r.name,text:body,kind:'text'});
    OS.toast('已匯出「'+r.name+'」');
   }catch(e){await win.alert(e.message||'無法匯出。',{title:'青魚文書',kind:'err'})}
  }
  const PCSS='body{font:16px/1.6 "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;color:#111;margin:0}.page{max-width:794px;margin:0 auto;padding:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px;vertical-align:top}th{background:#eef2f3}img{max-width:100%}blockquote{margin:1em 0;padding:.2em 1em;border-left:4px solid #14a094;color:#455}pre{background:#f1f4f5;padding:10px;border-radius:6px;white-space:pre-wrap;font-family:"Courier New",monospace}hr.pb{border:0;page-break-after:always;visibility:hidden}hr{border:0;border-top:1px solid #bbb}@page{margin:18mm}';
  const htmlPage=()=>`<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><title>${esc(doc.name.replace(/\.[^.]+$/,''))}</title><style>${PCSS}.page{line-height:${doc.ls}}</style></head><body><div class="page">${cleanHtml(paper.innerHTML)}</div></body></html>`;
  function doPrint(){
   const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';f.setAttribute('aria-hidden','true');
   document.body.appendChild(f);
   try{const d=f.contentWindow.document;d.open();d.write(htmlPage());d.close();setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){OS.toast('無法開啟列印')}setTimeout(()=>f.remove(),2000)},300)}
   catch(e){f.remove();OS.toast('無法開啟列印')}
  }
  async function askSave(){
   if(!doc.dirty)return true;
   const r=await win.dialog({title:'青魚文書',body:`<p class="dmsg">要儲存對「${esc(doc.name)}」所做的變更嗎？</p>`,buttons:[{id:'save',label:'儲存',primary:true},{id:'no',label:'不儲存'},{id:'cancel',label:'取消'}]});
   if(r==='save')return await save(false);
   return r==='no';
  }

  win.key(e=>{
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(ctrl&&k==='s'){e.preventDefault();save(e.shiftKey)}
   else if(ctrl&&k==='o'){e.preventDefault();openDlg()}
   else if(ctrl&&k==='n'&&!e.shiftKey){e.preventDefault();OS.open('writer',{fresh:1})}
   else if(ctrl&&k==='f'){e.preventDefault();openFind(false)}
   else if(ctrl&&k==='h'){e.preventDefault();openFind(true)}
   else if(ctrl&&k==='p'){e.preventDefault();doPrint()}
   else if(ctrl&&(k==='='||k==='+')){e.preventDefault();setZoom(P.zoom+10)}
   else if(ctrl&&k==='-'){e.preventDefault();setZoom(P.zoom-10)}
   else if(ctrl&&k==='0'){e.preventDefault();setZoom(100)}
   else if(e.key==='F3'){e.preventDefault();if(f1.value)findNext(e.shiftKey);else openFind(false)}
   else if(e.key==='F11'){e.preventDefault();P.focus=!P.focus;pref();applyView()}
  });

  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
  paper.innerHTML=EMPTY;
  applyView();title();stats();side();reflect();
  if(args&&args.id&&FS.get(args.id))load(args.id);
  requestAnimationFrame(()=>{if(!win.closing){const d=$('.wrdesk',root);if(d&&d.clientWidth&&d.clientWidth-40<(PAGES[doc.pw]||PAGES.a4)[1]*P.zoom/100)fitZoom()}});
  return {
   focusEl:()=>paper,
   isDirty:()=>doc.dirty,
   canClose:async()=>{mb.close();return await askSave()},
   onArgs(a){if(a&&a.id&&!doc.dirty&&a.id!==doc.id)load(a.id)}
  };
 }
});
})();
