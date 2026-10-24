/* 青魚電腦 — 共用工具 */
(function(){
'use strict';
const OS=window.OS=window.OS||{};
OS.apps={};OS.ev={};OS.R={state:'off',session:false,notes:[],camUse:0,sleepAt:0};
OS.VER='QeneOS';
const U=OS.U={};
U.$=(s,r)=>(r||document).querySelector(s);
U.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
U.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
U.wait=ms=>new Promise(r=>setTimeout(r,ms));
U.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
U.uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
U.pad=n=>String(n).padStart(2,'0');
U.html=s=>{const t=document.createElement('template');t.innerHTML=s.trim();return t.content.firstElementChild};
U.fmtSize=n=>{n=+n||0;if(n<1024)return n+' 位元組';const u=['KB','MB','GB','TB'];let i=-1;do{n/=1024;i++}while(n>=1024&&i<3);return (n>=100?n.toFixed(0):n>=10?n.toFixed(1):n.toFixed(2)).replace(/\.?0+$/,'')+' '+u[i]};
U.fmtDate=ts=>{const d=new Date(ts);return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+' '+U.pad(d.getHours())+':'+U.pad(d.getMinutes())};
U.fmtDur=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':'+U.pad(m):m)+':'+U.pad(s%60)};
U.cmp=(a,b)=>String(a).localeCompare(String(b),'zh-Hant',{numeric:true,sensitivity:'base'});
U.isTyping=el=>!!(el&&el.closest&&el.closest('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]),textarea,select,[contenteditable=true]'));
/* 事件匯流排 */
OS.on=(e,f)=>{(OS.ev[e]=OS.ev[e]||[]).push(f);return()=>OS.off(e,f)};
OS.off=(e,f)=>{const a=OS.ev[e];if(!a)return;const i=a.indexOf(f);if(i>=0)a.splice(i,1)};
OS.emit=(e,d)=>{(OS.ev[e]||[]).slice().forEach(f=>{try{f(d)}catch(err){console.error(err)}})};
/* 小型圖示庫 */
const I={
back:'<path d="M15 5l-7 7 7 7"/>',forward:'<path d="M9 5l7 7-7 7"/>',up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
chevD:'<path d="M6 9l6 6 6-6"/>',chevU:'<path d="M6 15l6-6 6 6"/>',chevR:'<path d="M9 6l6 6-6 6"/>',chevL:'<path d="M15 6l-6 6 6 6"/>',
refresh:'<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4h-4"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',
min:'<path d="M5 12h14"/>',max:'<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
restore:'<rect x="5" y="9" width="10" height="10" rx="1.5"/><path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5H17.5A1.5 1.5 0 0 1 19 6.5V13.5A1.5 1.5 0 0 1 17.5 15H15"/>',
cut:'<circle cx="6" cy="18" r="2.5"/><circle cx="6" cy="6" r="2.5"/><path d="M8 7.5l12 10M8 16.5l12-10"/>',
copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
paste:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>',
trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',sort:'<path d="M7 5v14M4 16l3 3 3-3M17 19V5M14 8l3-3 3 3"/>',
grid:'<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',details:'<path d="M4 6h16M4 12h16M4 18h16"/>',
star:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
starf:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" fill="currentColor"/>',
home:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',power:'<path d="M12 3v9M6.5 6.5a8 8 0 1 0 11 0"/>',
moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M6 12.5a9 9 0 0 1 12 0M9.2 16a4.5 4.5 0 0 1 5.6 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
wifioff:'<path d="M2.5 9a14 14 0 0 1 5-3M21.5 9a14 14 0 0 0-8-4M6 12.5a9 9 0 0 1 3-2M18 12.5a9 9 0 0 0-3-2M9.2 16a4.5 4.5 0 0 1 5.6 0"/><path d="M3 3l18 18"/>',
bt:'<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
vol:'<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
volmid:'<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
mute:'<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
battery:'<rect x="2.5" y="8" width="16" height="9" rx="2"/><path d="M21 11v3"/>',
bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
plane:'<path d="M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z"/>',
taskview:'<rect x="3" y="5" width="12" height="9" rx="1.5"/><path d="M8 17h10a2 2 0 0 0 2-2V8"/>',
desktop:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
more:'<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
folderplus:'<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M12 10.5v5M9.5 13h5"/>',
fileplus:'<path d="M6 3h8l4 4v14H6z"/><path d="M12 11v6M9 14h6"/>',
download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',upload:'<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
play:'<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
prev:'<path d="M18 5v14l-9-7zM6 5v14"/>',next:'<path d="M6 5v14l9-7zM18 5v14"/>',
rotate:'<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/>',rotater:'<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4h-4"/>',
zin:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/>',zout:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6"/>',
camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
image:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
save:'<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>',
eraser:'<path d="M4 16l9-9 6 6-6 6H8zM9 11l6 6M12 19h8"/>',pencil:'<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
brush:'<path d="M9 14a3 3 0 0 0-3 3c0 1.5-1 2.5-2 3 3 .5 7 .5 8-2a3 3 0 0 0-3-4zM11 13l8-8 1.5 1.5-8 8"/>',
bucket:'<path d="M5 11l7-7 7 7-6 6a2 2 0 0 1-2.8 0zM4 11h15M20 15c1 1.5 1 3-.5 3S18 16.5 20 15z"/>',
line:'<path d="M5 19L19 5"/>',rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',ellipse:'<ellipse cx="12" cy="12" rx="8" ry="6"/>',
text:'<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',pipette:'<path d="M15 4l5 5-3 1-1-1-8 8-3 1 1-3 8-8-1-1z"/>',
undo:'<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3"/>',redo:'<path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h3"/>',
flip:'<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z"/>',
full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
battsave:'<path d="M5 19c0-9 5-14 15-15 0 9-5 14-15 15zM5 19l8-8"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
refresh2:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
send:'<path d="M4 12l16-8-6 16-3-7z"/>',phone:'<path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
drive:'<rect x="3" y="12" width="18" height="7" rx="2"/><path d="M6 8h12l3 4H3zM16.5 15.5h.01"/>',
pin:'<path d="M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v6"/>',
tab:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h8"/>',
print:'<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/>',
list2:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 10v9"/>',
shuffle:'<path d="M4 7h3c5 0 5 10 10 10h3M20 17l-3-3M20 17l-3 3M4 17h3c1.5 0 2.5-.8 3.5-2M14 9c1-1.5 2-2 3-2h3M20 7l-3-3M20 7l-3 3"/>',
repeat:'<path d="M5 11V9a2 2 0 0 1 2-2h12M17 3l3 4-3 4M19 13v2a2 2 0 0 1-2 2H5M7 21l-3-4 3-4"/>',
music:'<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
record:'<circle cx="12" cy="12" r="7" fill="currentColor"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>'
};
OS.I=I;
OS.ico=(n,s,c)=>`<svg class="ui ${c||''}" width="${s||16}" height="${s||16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]||''}</svg>`;
})();
