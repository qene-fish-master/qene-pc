/* 青魚電腦 — 相機 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>';
OS.register({id:'camera',name:'相機',kw:'camera photo video webcam 相機 拍照 錄影 視訊',
 g:'linear-gradient(145deg,#6b7c80,#1d2a2e)',s:ICON,w:760,h:560,minW:380,minH:320,single:true,
 create(win){
  const root=document.createElement('div');root.className='cm';win.body.appendChild(root);
  let stream=null,devs=[],devIdx=0,mirror=true,grid=false,timer=0,rec=null,recT=0,recStart=0,counted=false,starting=false;
  root.innerHTML=`<div class="cms"><video class="cmv" autoplay playsinline muted></video><div class="cmg" hidden></div><div class="cmf"></div><div class="cmc" hidden></div><div class="cmm"></div></div><div class="cmb"><div class="cmo"><button type="button" class="ab" data-a="mir" title="鏡像">${OS.ico('flip',16)}<span>鏡像</span></button><button type="button" class="ab" data-a="grid" title="格線">${OS.ico('grid',16)}<span>格線</span></button><button type="button" class="ab" data-a="tmr" title="計時器">${OS.ico('clock',16)}<span>計時器：關</span></button><button type="button" class="ab" data-a="sw" title="切換相機">${OS.ico('refresh2',16)}<span>切換</span></button></div><div class="cmk"><button type="button" class="cmth" data-a="gal" title="開啟相簿" aria-label="最近的相片"></button><button type="button" class="cmsh" data-a="shot" title="拍照" aria-label="拍照"></button><button type="button" class="cmrc" data-a="rec" title="錄影" aria-label="錄影">${OS.ico('record',22)}</button></div></div>`;
  const v=$('.cmv',root),msg=$('.cmm',root),cnt=$('.cmc',root);
  function use(on){
   if(on&&!counted){counted=true;OS.R.camUse++}else if(!on&&counted){counted=false;OS.R.camUse=Math.max(0,OS.R.camUse-1)}
   OS.trayRender&&OS.trayRender();
  }
  function say(t,html){msg.innerHTML=t?`<div class="cmt">${html?t:esc(t)}</div>`:''}
  async function start(){
   if(starting||win.closing)return;starting=true;say('');
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){say('這個瀏覽器不支援相機。');starting=false;return}
   try{
    stopStream();
    const c={video:devs[devIdx]&&devs[devIdx].deviceId?{deviceId:{exact:devs[devIdx].deviceId}}:true,audio:false};
    const s=await navigator.mediaDevices.getUserMedia(c);
    if(win.closing){s.getTracks().forEach(t=>t.stop());starting=false;return}
    stream=s;v.srcObject=s;await v.play().catch(()=>{});use(true);
    try{devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');const cur=s.getVideoTracks()[0].getSettings().deviceId;const i=devs.findIndex(d=>d.deviceId===cur);if(i>=0)devIdx=i}catch(e){}
    $('[data-a=sw]',root).disabled=devs.length<2;
    applyMirror();
   }catch(e){
    use(false);
    const n=e&&e.name;
    say(n==='NotAllowedError'||n==='SecurityError'?'相機存取被拒絕。請在瀏覽器網址列的權限設定中允許使用相機，然後<br><button type="button" class="btn pri" data-a="retry">再試一次</button>':n==='NotFoundError'||n==='OverconstrainedError'?'找不到相機。請確認裝置已連接，然後<br><button type="button" class="btn pri" data-a="retry">再試一次</button>':'無法啟動相機。<br><button type="button" class="btn pri" data-a="retry">再試一次</button>',true);
   }
   starting=false;
  }
  function stopStream(){
   if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
   v.srcObject=null;
  }
  function applyMirror(){v.style.transform=mirror?'scaleX(-1)':'';$('[data-a=mir]',root).classList.toggle('on',mirror)}
  function ready(){return !!stream&&v.videoWidth>0}
  async function shoot(){
   if(!ready()){OS.toast('相機尚未準備好');return}
   if(timer){
    for(let i=timer;i>0;i--){cnt.hidden=false;cnt.textContent=i;await OS.U.wait(OS.R.fast?20:1000);if(win.closing)return}
    cnt.hidden=true;
   }
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
   const x=c.getContext('2d');if(mirror){x.translate(c.width,0);x.scale(-1,1)}x.drawImage(v,0,0);
   const f=$('.cmf',root);f.classList.remove('go');void f.offsetWidth;f.classList.add('go');
   OS.tone(1500,.05,.4,'square');OS.tone(900,.06,.4,'square',.06);
   const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));
   if(!b){OS.toast('無法儲存相片');return}
   try{
    const dir=FS.ensureDir('pictures','相機膠卷');
    const d=new Date(),p=OS.U.pad,nm=`相片_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
    const n=FS.create({parent:dir.id,name:FS.unique(dir.id,nm),blob:b,kind:'image',mime:'image/jpeg'});
    lastId=n.id;thumb();OS.toast('相片已儲存到「圖片\\相機膠卷」');
   }catch(e){OS.toast(e.message||'無法儲存相片')}
  }
  let lastId=null;
  async function thumb(){
   const t=$('.cmth',root);
   if(!lastId||!FS.get(lastId)){const dir=FS.find1('pictures','相機膠卷');const l=dir?FS.kids(dir.id).filter(n=>n.kind==='image').sort((a,b)=>b.m-a.m):[];lastId=l[0]?l[0].id:null}
   if(!lastId){t.style.backgroundImage='';return}
   const u=await FS.url(lastId);if(u&&t.isConnected)t.style.backgroundImage=`url("${u}")`;
  }
  async function record(){
   if(rec){rec.stop();return}
   if(!ready()){OS.toast('相機尚未準備好');return}
   if(typeof MediaRecorder==='undefined'){OS.toast('這個瀏覽器不支援錄影');return}
   try{
    const mt=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const chunks=[];rec=new MediaRecorder(stream,mt?{mimeType:mt}:undefined);
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    rec.onstop=()=>{
     clearInterval(recT);rec=null;$('.cmrc',root).classList.remove('on');$('.cmrc',root).innerHTML=OS.ico('record',22);$('.cmc',root).hidden=true;
     const b=new Blob(chunks,{type:'video/webm'});
     if(!b.size){OS.toast('錄影內容是空的');return}
     try{const dir=FS.ensureDir('videos','相機錄影');const d=new Date(),p=OS.U.pad;
      FS.create({parent:dir.id,name:FS.unique(dir.id,`錄影_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.webm`),blob:b,kind:'video',mime:'video/webm'});
      OS.toast('錄影已儲存到「影片\\相機錄影」');}catch(e){OS.toast(e.message||'無法儲存錄影')}
    };
    rec.start(500);recStart=Date.now();
    $('.cmrc',root).classList.add('on');$('.cmrc',root).innerHTML=OS.ico('stop',22);
    recT=setInterval(()=>{const c=$('.cmc',root);c.hidden=false;c.className='cmc rc';c.textContent='● '+OS.U.fmtDur((Date.now()-recStart)/1000)},500);
   }catch(e){rec=null;OS.toast('無法開始錄影')}
  }
  root.addEventListener('click',e=>{
   const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
   const a=b.dataset.a;
   if(a==='retry')start();
   else if(a==='shot')shoot();else if(a==='rec')record();
   else if(a==='mir'){mirror=!mirror;applyMirror()}
   else if(a==='grid'){grid=!grid;$('.cmg',root).hidden=!grid;b.classList.toggle('on',grid)}
   else if(a==='tmr'){timer=timer===0?3:timer===3?10:0;b.querySelector('span').textContent='計時器：'+(timer?timer+' 秒':'關')}
   else if(a==='sw'){if(devs.length>1){devIdx=(devIdx+1)%devs.length;start()}}
   else if(a==='gal'){OS.open('explorer',{path:FS.find1('pictures','相機膠卷')?FS.find1('pictures','相機膠卷').id:'pictures'})}
  });
  win.key(e=>{if((e.key===' '||e.key==='Enter')&&!e.target.closest('button')){e.preventDefault();shoot()}});
  win.cleanup(()=>{if(rec){try{rec.onstop=null;rec.stop()}catch(e){}rec=null}clearInterval(recT);stopStream();use(false)});
  applyMirror();thumb();start();
  return {focusEl:()=>$('.cmsh',root)};
 }
});
})();
