/* 青魚電腦 — 設定、儲存、時間 */
(function(){
'use strict';
const OS=window.OS,{pad,clamp}=OS.U;
const KEY='qene.pc.v1',OLD='qene.v1';
const D={
 name:'青魚',avatar:0,avatarImg:'',pass:'',passOn:false,hint:'',pcName:'QENE-PC',
 dark:false,accent:'#14a094',wall:0,wallFit:'fill',custom:'',useCustom:false,scales:true,
 bright:1,night:0,nightOn:false,vol:50,muted:false,sounds:true,
 wifi:true,net:'QeneFish-5G',airplane:false,bt:true,btDev:true,
 focus:false,notif:true,banner:true,nsound:true,
 h24:true,tz:'',showSec:false,weekStart:0,
 tbAlign:'center',tbSearch:true,tbTaskView:true,tbPinned:['explorer','browser','store','settings'],
 startPinned:['explorer','browser','notepad','writer','paint','calc','terminal','photos','camera','media','games','store','settings','taskmgr'],
 startRecent:true,recent:[],
 deskSys:{pc:true,bin:true,user:false},iconSize:'m',showDeskIcons:true,autoArrange:false,align:true,iconPos:{},sortBy:'name',
 fs:16,abold:false,acon:false,anomo:false,saver:false,
 idle:0,ver:'1.0',autoUpd:true,mouse:{cur:'default',size:1,color:'white',trail:false,trailLen:12,ripple:true,locate:true,hideTyping:false,shake:true,dbl:500},
 oobe:true,pend:null,updLog:[],instDate:0,
 inst:[],startup:[],stickyOpen:[],
 bm:[{t:'青魚說明',u:'qene:about'},{t:'維基百科',u:'https://zh.wikipedia.org'}],home:'qene:home',bmHome:true,bmBar:true,hist:[],
 msgs:{},calls:[],usage:{},fed:0,
 alarms:[],events:[],stickies:[],clocks:['Asia/Tokyo','Europe/London','America/New_York'],
 view:{},first:true,seeded:false,mig:null,legacy:false
};
OS.D=D;
let S=JSON.parse(JSON.stringify(D));
let raw=null,old=null;
try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){raw=null}
if(raw&&typeof raw==='object'){
 for(const k of Object.keys(D)){
  if(!(k in raw))continue;const v=raw[k],d=D[k];
  if(Array.isArray(d)){if(Array.isArray(v))S[k]=v}
  else if(d&&typeof d==='object'){if(v&&typeof v==='object'&&!Array.isArray(v))S[k]=Object.assign({},d,v)}
  else if(typeof v===typeof d)S[k]=v;
 }
}else{
 /* 從舊版「青魚手機」搬移設定與筆記 */
 try{old=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){old=null}
 if(old&&typeof old==='object'){
  const m={dark:'dark',bm:'bm',home:'home',bmHome:'bmHome',msgs:'msgs',calls:'calls',usage:'usage',fed:'fed',vol:'vol',wifi:'wifi',net:'net',bt:'bt',inst:'inst',h24:'h24',notif:'notif',banner:'banner',nsound:'nsound',scales:'scales',anomo:'anomo',abold:'abold',acon:'acon',ver:'ver',autoUpd:'autoUpd'};
  for(const k in m){if(k in old&&typeof old[k]===typeof D[m[k]]&&(!Array.isArray(D[m[k]])||Array.isArray(old[k])))S[m[k]]=old[k]}
  if(typeof old.pass==='string'&&/^\d{4}$/.test(old.pass)&&old.passOn){S.pass=old.pass;S.passOn=true}
  if(old.useCustom&&typeof old.custom==='string'&&old.custom.startsWith('data:image/')){S.custom=old.custom;S.useCustom=true}
  if(typeof old.note==='string'&&old.note.trim())S.mig={note:old.note};
  S.inst=[];
  if(Array.isArray(old.inst)&&(old.inst.includes('sw')||old.inst.includes('wc')))S.inst.push('clock');
  if(old.fed)S.inst.push('aquarium');
  if(old.msgs&&Object.keys(old.msgs).length)S.inst.push('phone');
 }
}
if(!['fill','fit','stretch','tile','center'].includes(S.wallFit))S.wallFit='fill';
if(!['l','m','s'].includes(S.iconSize))S.iconSize='m';
if(!['center','left'].includes(S.tbAlign))S.tbAlign='center';
if(!['name','size','type','date'].includes(S.sortBy))S.sortBy='name';
S.vol=clamp(+S.vol||0,0,100);S.bright=clamp(+S.bright||1,.3,1);S.night=clamp(+S.night||0,0,1);
S.fs=[14,16,18,20].includes(S.fs)?S.fs:16;
OS.S=S;
let st=0;
OS.save=()=>{clearTimeout(st);st=setTimeout(OS.saveNow,200)};
OS.saveNow=()=>{clearTimeout(st);if(OS.R.wiping)return;try{localStorage.setItem(KEY,JSON.stringify(OS.S))}catch(e){OS.emit('quota')}};
addEventListener('pagehide',OS.saveNow);
document.addEventListener('visibilitychange',()=>{if(document.hidden)OS.saveNow()});

/* ---- 桌布 ---- */
OS.WALLS=[
 {n:'深海',c:'linear-gradient(170deg,#0e5a66 0%,#06242b 58%,#021419)'},
 {n:'潮光',c:'linear-gradient(160deg,#25b8a8,#0d6b78 52%,#073a47)'},
 {n:'夕鱗',c:'linear-gradient(165deg,#e8794f,#a63f6b 52%,#2f2459)'},
 {n:'霧灣',c:'linear-gradient(170deg,#4f9fa6,#2f7584 55%,#1b4656)'},
 {n:'極光',c:'linear-gradient(160deg,#1fd1a0,#2a6fb3 48%,#4b2a86)'},
 {n:'墨魚',c:'linear-gradient(170deg,#3a4c55,#1c2830 55%,#0b1115)'},
 {n:'珊瑚',c:'linear-gradient(160deg,#ffb08a,#f0647a 50%,#9a3b7f)'},
 {n:'晨曦',c:'linear-gradient(170deg,#e8f6f2,#a9dcd8 50%,#5fb0b8)'}
];
const scaleSvg="<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><g fill='none' stroke='white' stroke-width='1.5'><circle cx='0' cy='0' r='22'/><circle cx='44' cy='0' r='22'/><circle cx='22' cy='22' r='22'/><circle cx='0' cy='44' r='22'/><circle cx='44' cy='44' r='22'/></g></svg>";
OS.scaleUrl='url("data:image/svg+xml,'+encodeURIComponent(scaleSvg)+'")';
OS.wallCss=()=>{
 const s=OS.S;
 if(s.useCustom&&s.custom){
  const u='url("'+s.custom+'")',f=s.wallFit;
  const base='#031a20';
  if(f==='fit')return `${u} center/contain no-repeat ${base}`;
  if(f==='stretch')return `${u} center/100% 100% no-repeat ${base}`;
  if(f==='tile')return `${u} 0 0/auto repeat ${base}`;
  if(f==='center')return `${u} center/auto no-repeat ${base}`;
  return `${u} center/cover no-repeat ${base}`;
 }
 return OS.WALLS[clamp(s.wall|0,0,OS.WALLS.length-1)].c;
};
OS.wallLight=()=>!OS.S.useCustom&&OS.S.wall===7;

/* ---- 時間（支援自訂時區）---- */
const fmtCache={};
function validTz(z){if(!z)return '';try{new Intl.DateTimeFormat('en-US',{timeZone:z});return z}catch(e){return ''}}
OS.tz=()=>validTz(OS.S.tz);
OS.parts=(date,tz)=>{
 tz=tz===undefined?OS.tz():validTz(tz);
 const k=tz||'_';
 const f=fmtCache[k]||(fmtCache[k]=new Intl.DateTimeFormat('en-US',Object.assign({year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',weekday:'short',hourCycle:'h23'},tz?{timeZone:tz}:{})));
 const o={};f.formatToParts(date||new Date()).forEach(p=>{o[p.type]=p.value});
 const wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday);
 return {y:+o.year,m:+o.month,d:+o.day,hh:(+o.hour)%24,mm:+o.minute,ss:+o.second,dow:wd<0?0:wd};
};
OS.fmtTime=(date,sec,tz)=>{
 tz=tz===undefined?OS.tz():validTz(tz);
 const o={hour:'2-digit',minute:'2-digit',hourCycle:OS.S.h24?'h23':'h12'};
 if(sec)o.second='2-digit';if(tz)o.timeZone=tz;
 return (date||new Date()).toLocaleTimeString('zh-TW',o);
};
OS.fmtDateLong=(date,tz)=>{
 tz=tz===undefined?OS.tz():validTz(tz);
 const o={year:'numeric',month:'long',day:'numeric',weekday:'long'};if(tz)o.timeZone=tz;
 return (date||new Date()).toLocaleDateString('zh-TW',o);
};
OS.fmtDateShort=(date,tz)=>{
 tz=tz===undefined?OS.tz():validTz(tz);
 const o={year:'numeric',month:'numeric',day:'numeric'};if(tz)o.timeZone=tz;
 return (date||new Date()).toLocaleDateString('zh-TW',o);
};
OS.dateKey=p=>p.y+'-'+pad(p.m)+'-'+pad(p.d);
OS.isOnline=()=>!OS.S.airplane&&!!OS.S.wifi;
})();
