/* 青魚電腦 — 計算機 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc}=OS.U,S=OS.S;
const ICON='<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>';
/* 遞迴下降運算式解析器（不使用 eval） */
function parse(src,deg){
 const t=[];let i=0;
 const s=src.replace(/\s+/g,'');
 while(i<s.length){
  const c=s[i];
  if(/[0-9.]/.test(c)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;const raw=s.slice(i,j);if((raw.match(/\./g)||[]).length>1||raw==='.')throw new Error('數字格式不正確');t.push({n:parseFloat(raw)});i=j}
  else if('+-×÷*/^()!%'.includes(c)||c==='−'){t.push({o:c==='*'?'×':c==='/'?'÷':c==='−'?'-':c});i++}
  else if(c==='π'){t.push({n:Math.PI});i++}
  else if(c==='e'&&!/[a-z]/.test(s[i+1]||'')){t.push({n:Math.E});i++}
  else if(c==='√'){t.push({f:'sqrt'});i++}
  else if(/[a-z]/.test(c)){let j=i;while(j<s.length&&/[a-z]/.test(s[j]))j++;t.push({f:s.slice(i,j)});i=j}
  else throw new Error('不正確的字元');
 }
 let p=0;
 const peek=()=>t[p],isO=o=>t[p]&&t[p].o===o;
 const FN={sin:x=>Math.sin(deg?x*Math.PI/180:x),cos:x=>Math.cos(deg?x*Math.PI/180:x),tan:x=>Math.tan(deg?x*Math.PI/180:x),asin:x=>{const r=Math.asin(x);return deg?r*180/Math.PI:r},acos:x=>{const r=Math.acos(x);return deg?r*180/Math.PI:r},atan:x=>{const r=Math.atan(x);return deg?r*180/Math.PI:r},log:Math.log10,ln:Math.log,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp};
 function expr(){let v=term();while(isO('+')||isO('-')){const o=t[p++].o;const r=term();v=o==='+'?v+r:v-r}return v}
 function term(){let v=unary();while(isO('×')||isO('÷')||(peek()&&(peek().n!==undefined||peek().f||isO('('))&&!isO(')'))){
   if(isO('×')||isO('÷')){const o=t[p++].o;const r=unary();if(o==='÷'){if(r===0)throw new Error('無法除以零');v=v/r}else v=v*r}
   else{v=v*unary()} // 隱含乘法：2π、3(4)
  }return v}
 function unary(){if(isO('-')){p++;return -unary()}if(isO('+')){p++;return unary()}return power()}
 function power(){let b=postfix();if(isO('^')){p++;const e=unary();return Math.pow(b,e)}return b}
 function postfix(){let v=primary();while(isO('!')||isO('%')){const o=t[p++].o;if(o==='%')v=v/100;else{if(v<0||v>170||Math.floor(v)!==v)throw new Error('階乘只能用於 0 到 170 的整數');let r=1;for(let k=2;k<=v;k++)r*=k;v=r}}return v}
 function primary(){
  const k=t[p];if(!k)throw new Error('運算式不完整');
  if(k.n!==undefined){p++;return k.n}
  if(k.f){p++;const fn=FN[k.f];if(!fn)throw new Error('不明的函數 '+k.f);let a;if(isO('(')){p++;a=expr();if(!isO(')'))throw new Error('缺少右括號');p++}else a=unary();const r=fn(a);if(!isFinite(r))throw new Error('輸入無效');return r}
  if(k.o==='('){p++;const v=expr();if(!isO(')'))throw new Error('缺少右括號');p++;return v}
  throw new Error('運算式不正確');
 }
 const v=expr();if(p<t.length)throw new Error('運算式不正確');
 if(!isFinite(v))throw new Error('結果超出範圍');
 return v;
}
const fmt=v=>{
 if(Object.is(v,-0))v=0;
 let s=String(+v.toPrecision(14));
 if(/e/.test(s)){return s.replace('e+','×10^').replace('e-','×10^-')}
 return s;
};
OS.register({id:'calc',name:'計算機',kw:'calculator calc 計算機 算數 數學',
 g:'linear-gradient(145deg,#ff9a6b,#d8503f)',s:ICON,w:340,h:560,minW:300,minH:460,single:true,
 create(win){
  const root=document.createElement('div');root.className='cc';win.body.appendChild(root);
  let expr='',res='',justEq=false,deg=true,sci=!!(S.view.calcSci),mem=0,hist=S.view.calcHist||[],showH=false;
  root.innerHTML=`<div class="ccd"><div class="cch"><button type="button" class="ab cmode" title="切換標準／科學">${OS.ico('list2',15)}<span></span></button><span class="grow"></span><span class="ccm"></span><button type="button" class="ab chb" title="歷程記錄" aria-label="歷程記錄">${OS.ico('clock',15)}</button></div><div class="cce" aria-live="polite"></div><div class="ccr" aria-live="polite">0</div></div><div class="cchist" hidden></div><div class="ccmem"></div><div class="cckeys"></div>`;
  const E=$('.cce',root),R=$('.ccr',root),K=$('.cckeys',root),H=$('.cchist',root);
  const std=[['%','%'],['CE','CE'],['C','C'],['⌫','⌫'],['1/x','1/x'],['x²','x²'],['√','√'],['÷','÷'],['7'],['8'],['9'],['×','×'],['4'],['5'],['6'],['−','−'],['1'],['2'],['3'],['+','+'],['±'],['0'],['.'],['=']];
  const scF=[['deg','deg'],['sin'],['cos'],['tan'],['π'],['e'],['ln'],['log'],['x^y','^'],['(','('],[')',')'],['n!','!']];
  function buildKeys(){
   $('.cmode span',root).textContent=sci?'科學':'標準';
   const mk=(a,sc)=>a.map(([l,v])=>{const val=v||l;const num=/^[0-9.]$/.test(val)||val==='±';const op=['÷','×','−','+'].includes(val);return `<button type="button" class="ck${num?' num':''}${op?' op':''}${val==='='?' eq':''}${sc?' sc':''}" data-k="${esc(val)}">${l==='deg'?(deg?'DEG':'RAD'):esc(l)}</button>`}).join('');
   $('.ccmem',root).innerHTML=['MC','MR','M+','M−','MS'].map(m=>`<button type="button" class="cmb" data-m="${m}"${(m==='MC'||m==='MR')&&!mem?' disabled':''}>${m}</button>`).join('');
   K.className='cckeys'+(sci?' sci':'');
   K.innerHTML=(sci?mk(scF,true):'')+mk(std);
   upd();
  }
  function preview(){
   if(!expr){res='0';return}
   try{res=fmt(parse(expr,deg))}catch(e){res=''}
  }
  function upd(){
   E.textContent=expr||' ';
   if(justEq)R.textContent=res;
   else{preview();R.textContent=expr?(res||'…'):'0'}
   R.classList.toggle('long',R.textContent.length>14);
   $('.ccm',root).textContent=mem?'M':'';
   $$('.cmb',root).forEach(b=>{if(b.dataset.m==='MC'||b.dataset.m==='MR')b.disabled=!mem});
  }
  function eq(){
   if(!expr)return;
   try{
    const v=fmt(parse(expr,deg));
    hist.unshift({e:expr,r:v});hist=hist.slice(0,30);S.view.calcHist=hist;OS.save();
    E.textContent=expr+' =';expr=v;res=v;justEq=true;R.textContent=v;R.classList.toggle('long',v.length>14);renderHist();$('.ccm',root).textContent=mem?'M':'';
   }catch(e){R.textContent=e.message;R.classList.remove('long');OS.sfx('error');justEq=false}
  }
  const OPS=['÷','×','−','+','^'];
  function lastNum(){const m=expr.match(/[0-9.]+(?:%|!)*$/);return m?m[0]:''}
  function press(k){
   if(justEq&&!OPS.includes(k)&&!['%','!','1/x','x²'].includes(k)&&k!=='='){if(/^[0-9.πe(√]$/.test(k)||/^(sin|cos|tan|ln|log)$/.test(k)||k==='±'){expr='';}}
   if(k!=='=')justEq=justEq&&(['%','!','1/x','x²','⌫','CE','C','±'].includes(k));
   if(/^[0-9]$/.test(k)){expr+=k}
   else if(k==='.'){const n=lastNum();if(n.includes('.')&&!/[%!]$/.test(n))return;expr+=(n&&!/[%!]$/.test(n)?'.':'0.')}
   else if(OPS.includes(k)){
    if(!expr){if(k==='−')expr='−';else expr='0'+k;}
    else if(OPS.includes(expr.slice(-1))){expr=expr.slice(0,-1)+k}
    else if(expr==='−'){return}
    else if(expr.slice(-1)==='('&&k!=='−')return;
    else expr+=k;
   }
   else if(k==='C'||k==='CE'){if(k==='CE'&&expr&&!justEq){const m=expr.match(/([0-9.]+(?:%|!)*|π|e)$/);expr=m?expr.slice(0,-m[0].length):''}else expr='';justEq=false}
   else if(k==='⌫'){if(justEq){expr='';justEq=false}else expr=expr.replace(/(sin|cos|tan|ln|log)\($|.$/,'')}
   else if(k==='±'){
    if(!expr)return;
    const m=expr.match(/(−?)([0-9.]+(?:%|!)*)$/);
    if(m){const before=expr.slice(0,expr.length-m[0].length);expr=m[1]?(/[0-9)πe%!]$/.test(before)?before+'+'+m[2]:before+m[2]):before+'−'+m[2]}
   }
   else if(k==='%'||k==='!'){if(/[0-9)πe%!]$/.test(expr))expr+=k}
   else if(k==='x²'){if(/[0-9)πe]$/.test(expr)||(justEq&&expr))expr='('+expr+')^2'}
   else if(k==='1/x'){if(expr){expr='1÷('+expr+')'}}
   else if(k==='√'){expr+='√('}
   else if(k==='('){expr+='('}
   else if(k===')'){const o=(expr.match(/\(/g)||[]).length,c=(expr.match(/\)/g)||[]).length;if(o>c&&/[0-9)πe%!]$/.test(expr))expr+=')'}
   else if(k==='π'||k==='e'){expr+=k}
   else if(['sin','cos','tan','ln','log'].includes(k)){expr+=k+'('}
   else if(k==='deg'){deg=!deg;buildKeys();return}
   else if(k==='='){autoClose();eq();return}
   if(expr.length>120)expr=expr.slice(0,120);
   upd();
  }
  function autoClose(){const o=(expr.match(/\(/g)||[]).length,c=(expr.match(/\)/g)||[]).length;if(o>c)expr+=')'.repeat(o-c)}
  function renderHist(){
   H.innerHTML=hist.length?hist.map((h,i)=>`<button type="button" class="chi" data-h="${i}"><small>${esc(h.e)} =</small><b>${esc(h.r)}</b></button>`).join('')+'<button type="button" class="btn chc">清除歷程記錄</button>':'<p class="empty-s">尚無歷程記錄</p>';
  }
  K.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)press(b.dataset.k)});
  $('.ccmem',root).addEventListener('click',e=>{
   const b=e.target.closest('[data-m]');if(!b||b.disabled)return;
   const m=b.dataset.m;let cur=0;try{cur=expr?parse(expr,deg):0}catch(er){cur=NaN}
   if(m==='MC')mem=0;
   else if(m==='MR'){expr=fmt(mem);justEq=false}
   else if(isNaN(cur)){OS.sfx('error');return}
   else if(m==='MS')mem=cur;else if(m==='M+')mem+=cur;else mem-=cur;
   upd();
  });
  H.addEventListener('click',e=>{
   if(e.target.closest('.chc')){hist=[];S.view.calcHist=hist;OS.save();renderHist();return}
   const b=e.target.closest('[data-h]');if(b){const h=hist[+b.dataset.h];if(h){expr=h.r;justEq=true;res=h.r;showH=false;H.hidden=true;K.hidden=false;$('.ccmem',root).hidden=false;upd();R.textContent=h.r}}
  });
  $('.chb',root).addEventListener('click',()=>{showH=!showH;H.hidden=!showH;K.hidden=showH;$('.ccmem',root).hidden=showH;if(showH)renderHist()});
  $('.cmode',root).addEventListener('click',()=>{sci=!sci;S.view.calcSci=sci;OS.save();buildKeys()});
  win.key(e=>{
   const k=e.key;let m=null;
   if(e.ctrlKey||e.metaKey||e.altKey)return;
   if(/^[0-9]$/.test(k))m=k;else if(k==='.'||k===',')m='.';else if(k==='+')m='+';else if(k==='-')m='−';else if(k==='*')m='×';else if(k==='/')m='÷';else if(k==='^')m='^';
   else if(k==='Enter'||k==='='){m='=';e.preventDefault()}else if(k==='Backspace')m='⌫';else if(k==='Escape')m='C';else if(k==='Delete')m='CE';else if(k==='%')m='%';else if(k==='('||k===')')m=k;else if(k==='!')m='!';
   if(m){e.preventDefault();press(m)}
  });
  win.on('look',()=>{});
  buildKeys();renderHist();
  return {focusEl:()=>root.querySelector('.cckeys .eq')||root};
 }
});
OS.calcParse=parse;
})();
