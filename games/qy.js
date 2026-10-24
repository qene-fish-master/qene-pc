(function(){
const $=s=>document.querySelector(s);
const LS={
 get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
 set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
 del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const TH=['','light','dark'],TN={'':'跟隨系統',light:'淺色',dark:'深色'};
function cur(){try{const v=localStorage.getItem('qy-theme');return TH.includes(v)?v:''}catch(e){return ''}}
function apply(v){
 if(v)document.documentElement.dataset.theme=v;else delete document.documentElement.dataset.theme;
 const b=$('#bTheme');if(b)b.title='主題:'+TN[v];
 const dk=v==='dark'||(!v&&matchMedia('(prefers-color-scheme:dark)').matches);
 const m=$('meta[name=theme-color]');if(m)m.content=dk?'#0e1d24':'#e6eeee';
 try{window.dispatchEvent(new Event('qy-theme'))}catch(e){}
}
apply(cur());
try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>apply(cur()))}catch(e){}
addEventListener('storage',e=>{if(e.key==='qy-theme')apply(cur())});
addEventListener('DOMContentLoaded',()=>{
 const b=$('#bTheme');
 if(b)b.onclick=()=>{const n=TH[(TH.indexOf(cur())+1)%3];try{localStorage.setItem('qy-theme',n)}catch(e){}apply(n)};
 apply(cur());
});
/* 取得 CSS 變數顏色(給 canvas 用) */
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
/* 滑動手勢:回呼 f(dir) dir=0上 1右 2下 3左 */
function swipe(el,f,min){
 min=min||24;let sx,sy,id=null;
 el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;id=e.pointerId;sx=e.clientX;sy=e.clientY});
 const end=e=>{
  if(e.pointerId!==id)return;id=null;
  const dx=e.clientX-sx,dy=e.clientY-sy;
  if(Math.max(Math.abs(dx),Math.abs(dy))<min)return;
  f(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));
 };
 el.addEventListener('pointerup',end);
 el.addEventListener('pointercancel',e=>{if(e.pointerId===id)id=null});
}
window.QY={$,LS,css,swipe,pad:n=>String(n).padStart(2,'0'),
 fmt:t=>{t=Math.max(0,Math.floor(t));return QY.pad(t/60|0)+':'+QY.pad(t%60)}};
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
