/* 青魚電腦 — 媒體播放器 */
(function(){
'use strict';
const OS=window.OS,{$,$$,esc,clamp}=OS.U,FS=OS.FS,S=OS.S;
const ICON='<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="#fff"/>';
const isMedia=n=>n&&n.type==='file'&&(n.kind==='audio'||n.kind==='video');
function folderList(dir){return FS.kids(dir).filter(isMedia).sort((a,b)=>OS.U.cmp(a.name,b.name))}
OS.register({id:'media',name:'媒體播放器',kw:'media player music video audio mp3 mp4 媒體 播放器 音樂 影片 音訊',
 g:'linear-gradient(145deg,#a06bff,#4a2ad9)',s:ICON,w:820,h:540,minW:420,minH:320,single:true,
 create(win,args){
  const root=document.createElement('div');root.className='md';win.body.appendChild(root);
  let list=[],idx=-1,shuffle=false,repeat='off',vol=1,showList=true,order=[];
  root.innerHTML=`<div class="mdm"><div class="mds" tabindex="0"><video class="mdv" playsinline></video><canvas class="mdc"></canvas><div class="mdn"><b></b><small></small></div></div><div class="mdl"></div></div>
  <div class="mdc2"><input type="range" class="mdseek" min="0" max="1000" value="0" step="1" aria-label="播放進度"><div class="mdr"><span class="mdt">0:00 / 0:00</span><span class="grow"></span><button type="button" class="ab" data-a="shuf" title="隨機播放">${OS.ico('shuffle',16)}</button><button type="button" class="ab" data-a="prev" title="上一首">${OS.ico('prev',16)}</button><button type="button" class="ab big" data-a="play" title="播放 / 暫停">${OS.ico('play',20)}</button><button type="button" class="ab" data-a="next" title="下一首">${OS.ico('next',16)}</button><button type="button" class="ab" data-a="rep" title="重複播放">${OS.ico('repeat',16)}</button><span class="grow"></span><select class="inp mdsp" aria-label="播放速度"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button type="button" class="ab" data-a="mute" title="靜音">${OS.ico('vol',16)}</button><input type="range" class="mdvol" min="0" max="100" value="100" aria-label="媒體音量"><button type="button" class="ab" data-a="fs" title="全螢幕">${OS.ico('full',16)}</button><button type="button" class="ab" data-a="lst" title="播放清單">${OS.ico('list',16)}</button><button type="button" class="ab" data-a="add" title="加入檔案">${OS.ico('plus',16)}</button></div></div>`;
  const v=$('.mdv',root),cv=$('.mdc',root),L=$('.mdl',root),seek=$('.mdseek',root),stage=$('.mds',root);
  let an=null,ac=null,src=null,raf=0,seeking=false;
  function applyVol(){v.volume=clamp(vol*(S.vol/100),0,1);v.muted=!!S.muted}
  win.on('vol',applyVol);
  function fmt(s){return isFinite(s)?OS.U.fmtDur(s):'0:00'}
  function setPlaying(p){OS.R.mediaPlaying=p;$('[data-a=play]',root).innerHTML=OS.ico(p?'pause':'play',20)}
  function ensureAnalyser(){
   if(an||an===false)return;
   try{
    ac=OS.audioCtx();if(!ac){an=false;return}
    src=ac.createMediaElementSource(v);an=ac.createAnalyser();an.fftSize=128;src.connect(an);an.connect(ac.destination);
   }catch(e){an=false}
  }
  function draw(){
   raf=0;
   const n=list[idx];
   if(!n||n.kind!=='audio'||!an){return}
   const w=cv.width=stage.clientWidth,h=cv.height=stage.clientHeight,c=cv.getContext('2d');
   const d=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(d);
   c.clearRect(0,0,w,h);
   const bars=40,bw=w/bars;
   for(let i=0;i<bars;i++){const val=d[Math.floor(i*d.length/bars)]/255,bh=Math.max(3,val*h*.5);c.fillStyle=`hsla(${170+i*2},70%,60%,.85)`;c.fillRect(i*bw+2,h*.75-bh,bw-4,bh)}
   if(!v.paused)raf=requestAnimationFrame(draw);
  }
  function renderList(){
   L.hidden=!showList;
   L.innerHTML=list.length?list.map((n,i)=>`<button type="button" class="mdi${i===idx?' on':''}" data-i="${i}">${OS.fileIcon(n,18)}<span>${esc(FS.shown(n))}</span></button>`).join(''):'<p class="empty-s">播放清單是空的。<br>按右下角的 ＋ 加入檔案。</p>';
  }
  async function load(i,play){
   if(i<0||i>=list.length)return;
   const n=list[i];if(!FS.get(n.id)){list.splice(i,1);renderList();return}
   idx=i;const u=await FS.url(n.id);if(win.closing||list[idx]!==n)return;
   v.src=u;v.playbackRate=+$('.mdsp',root).value;applyVol();
   win.setTitle(FS.shown(n)+' - 媒體播放器');
   $('.mdn b',root).textContent=FS.shown(n);$('.mdn small',root).textContent=n.kind==='audio'?'音訊':'影片';
   stage.classList.toggle('au',n.kind==='audio');
   renderList();
   if(play){try{ensureAnalyser();await v.play()}catch(e){if(e&&e.name!=='AbortError')setPlaying(false)}}
  }
  function nextIdx(d){
   if(!list.length)return -1;
   if(repeat==='one'&&d>0&&false)return idx;
   if(shuffle&&d>0){if(list.length===1)return 0;let r;do{r=Math.floor(Math.random()*list.length)}while(r===idx);return r}
   let n=idx+d;
   if(n>=list.length){if(repeat==='all')n=0;else return -1}
   if(n<0)n=repeat==='all'?list.length-1:0;
   return n;
  }
  v.addEventListener('play',()=>{setPlaying(true);if(!raf)raf=requestAnimationFrame(draw)});
  v.addEventListener('pause',()=>setPlaying(false));
  v.addEventListener('ended',()=>{
   if(repeat==='one'){v.currentTime=0;v.play().catch(()=>{});return}
   const n=nextIdx(1);if(n>=0)load(n,true);else setPlaying(false);
  });
  v.addEventListener('timeupdate',()=>{
   if(!seeking&&v.duration)seek.value=Math.round(v.currentTime/v.duration*1000);
   $('.mdt',root).textContent=fmt(v.currentTime)+' / '+fmt(v.duration);
  });
  v.addEventListener('loadedmetadata',()=>{$('.mdt',root).textContent='0:00 / '+fmt(v.duration)});
  v.addEventListener('error',()=>{const n=list[idx];if(n)OS.toast('無法播放「'+n.name+'」');setPlaying(false)});
  seek.addEventListener('input',()=>{seeking=true;if(v.duration)v.currentTime=seek.value/1000*v.duration});
  seek.addEventListener('change',()=>{seeking=false});
  $('.mdvol',root).addEventListener('input',e=>{vol=e.target.value/100;applyVol()});
  $('.mdsp',root).addEventListener('change',e=>{v.playbackRate=+e.target.value});
  async function addFiles(){
   const r=await OS.fileDialog({parent:win,mode:'open',kinds:['audio','video'],start:'music',title:'加入媒體檔案'});
   if(r&&r.id){const n=FS.get(r.id);const ex=list.findIndex(x=>x.id===n.id);if(ex>=0)load(ex,true);else{list.push(n);renderList();load(list.length-1,true)}}
  }
  root.addEventListener('click',e=>{
   const i=e.target.closest('.mdi');if(i){load(+i.dataset.i,true);return}
   const b=e.target.closest('[data-a]');if(!b)return;
   const a=b.dataset.a;
   if(a==='play'){if(idx<0){if(list.length)load(0,true);else addFiles()}else if(v.paused){ensureAnalyser();v.play().catch(()=>{})}else v.pause()}
   else if(a==='prev'){if(v.currentTime>3)v.currentTime=0;else{const n=nextIdx(-1);if(n>=0)load(n,!v.paused)}}
   else if(a==='next'){const n=nextIdx(1);if(n>=0)load(n,!v.paused||true)}
   else if(a==='shuf'){shuffle=!shuffle;b.classList.toggle('on',shuffle)}
   else if(a==='rep'){repeat=repeat==='off'?'all':repeat==='all'?'one':'off';b.classList.toggle('on',repeat!=='off');b.title='重複播放：'+({off:'關閉',all:'全部',one:'單曲'}[repeat]);b.innerHTML=OS.ico('repeat',16)+(repeat==='one'?'<small>1</small>':'')}
   else if(a==='mute'){S.muted=!S.muted;OS.setVol(S.vol,S.muted)}
   else if(a==='fs'){const el=stage;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else if(el.requestFullscreen)el.requestFullscreen().catch(()=>OS.toast('無法進入全螢幕'))}
   else if(a==='lst'){showList=!showList;L.hidden=!showList}
   else if(a==='add')addFiles();
  });
  stage.addEventListener('click',e=>{if(e.target.closest('.mds')&&idx>=0&&e.target===v||e.target===cv){if(v.paused)v.play().catch(()=>{});else v.pause()}});
  stage.addEventListener('dblclick',()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else if(stage.requestFullscreen)stage.requestFullscreen().catch(()=>{})});
  win.key(e=>{
   if(e.target.closest('select,input[type=text]'))return;
   if(e.key===' '&&!e.target.closest('button')){e.preventDefault();$('[data-a=play]',root).click()}
   else if(e.key==='ArrowRight'){e.preventDefault();v.currentTime=Math.min(v.duration||0,v.currentTime+5)}
   else if(e.key==='ArrowLeft'){e.preventDefault();v.currentTime=Math.max(0,v.currentTime-5)}
   else if(e.key==='ArrowUp'&&!e.target.closest('input')){e.preventDefault();vol=clamp(vol+.1,0,1);$('.mdvol',root).value=vol*100;applyVol()}
   else if(e.key==='ArrowDown'&&!e.target.closest('input')){e.preventDefault();vol=clamp(vol-.1,0,1);$('.mdvol',root).value=vol*100;applyVol()}
   else if(e.key.toLowerCase()==='n')$('[data-a=next]',root).click();
   else if(e.key.toLowerCase()==='p')$('[data-a=prev]',root).click();
   else if(e.key.toLowerCase()==='m')$('[data-a=mute]',root).click();
   else if(e.key.toLowerCase()==='f')$('[data-a=fs]',root).click();
  });
  function open(a){
   if(a&&a.id&&isMedia(FS.get(a.id))){
    const n=FS.get(a.id);
    list=folderList(n.p);idx=list.findIndex(x=>x.id===n.id);
    if(idx<0){list=[n];idx=0}
    load(idx,true);
   }
  }
  if(args&&args.id)open(args);
  else{list=FS.kids('music').filter(isMedia).concat(FS.kids('videos').filter(isMedia));renderList()}
  win.cleanup(()=>{try{v.pause();v.removeAttribute('src');v.load()}catch(e){}cancelAnimationFrame(raf);OS.R.mediaPlaying=false;try{if(document.fullscreenElement&&stage.contains(document.fullscreenElement))document.exitFullscreen()}catch(e){}});
  return {focusEl:()=>stage,onArgs:open,onResize(){}};
 }
});
})();
