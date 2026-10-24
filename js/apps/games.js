/* 青魚電腦 — 青魚遊戲 */
(function(){
'use strict';
const OS=window.OS;
OS.register({id:'games',name:'青魚遊戲',kw:'games game play 遊戲 小遊戲 2048 貪吃蛇 數獨 踩地雷 俄羅斯方塊 五子棋',
 g:'linear-gradient(145deg,#3ed6c4,#0e5a66)',s:'<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="15.5" cy="11.5" r=".8"/><circle cx="18" cy="14" r=".8"/>',
 w:560,h:640,minW:340,minH:420,single:true,
 create(win){
  const f=document.createElement('iframe');f.className='gmf';f.src='games/index.html';f.title='青魚遊戲';
  f.setAttribute('allow','fullscreen; autoplay');
  win.body.appendChild(f);
  win.on('message',()=>{});
  const onMsg=e=>{
   if(e.source!==f.contentWindow)return;
   const d=e.data;
   if(d&&d.qene==='notify'&&typeof d.t==='string')OS.notify({app:'games',title:String(d.t).slice(0,60),body:String(d.b||'').slice(0,120)});
  };
  addEventListener('message',onMsg);win.cleanup(()=>removeEventListener('message',onMsg));
  return {focusEl:()=>f,onFocus(){try{f.contentWindow.focus()}catch(e){}}};
 }
});
})();
