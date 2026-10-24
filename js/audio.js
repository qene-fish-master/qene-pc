/* 青魚電腦 — 系統音效（Web Audio，沒有外部檔案） */
(function(){
'use strict';
const OS=window.OS;
let ac=null;
function ctx(){
 if(ac===null){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){ac=false}}
 if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
 return ac||null;
}
OS.audioCtx=ctx;
/* 單一音：freq(Hz) 持續秒數 音量(0~1) 波形 延遲秒數 */
OS.tone=(f,d,v,type,when)=>{
 const S=OS.S;if(S.muted||!S.vol)return;
 const a=ctx();if(!a)return;
 try{
  const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(when||0),vol=Math.max(0,Math.min(1,(v==null?.5:v)*S.vol/100*.35));
  o.type=type||'sine';o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(vol,0.0002),t+.01);g.gain.exponentialRampToValueAtTime(0.0001,t+(d||.12));
  o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+(d||.12)+.02);
 }catch(e){}
};
const SFX={
 start:()=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>OS.tone(f,.5,.6,'sine',i*.14))},
 notify:()=>{OS.tone(880,.14,.5,'sine',0);OS.tone(1175,.2,.5,'sine',.12)},
 error:()=>{OS.tone(220,.18,.6,'triangle',0);OS.tone(180,.25,.6,'triangle',.16)},
 vol:()=>OS.tone(660,.08,.5),
 click:()=>OS.tone(1200,.03,.25),
 unlock:()=>{OS.tone(660,.1,.5,'sine',0);OS.tone(990,.16,.5,'sine',.09)},
 shutdown:()=>{[784,659,523,392].forEach((f,i)=>OS.tone(f,.45,.5,'sine',i*.16))},
 trash:()=>OS.tone(300,.1,.4,'triangle')
};
OS.sfx=n=>{if(OS.S.sounds===false)return;const f=SFX[n];if(f)f()};
/* 鬧鐘／計時器響鈴：連續幾聲 */
OS.ring=(sec)=>{
 let n=0;const t=setInterval(()=>{OS.tone(988,.18,.9,'square');OS.tone(1319,.18,.9,'square',.22);if(++n>=Math.max(2,Math.round((sec||5)/.9)))clearInterval(t)},900);
 OS.tone(988,.18,.9,'square');OS.tone(1319,.18,.9,'square',.22);
 return ()=>clearInterval(t);
};
})();
