// 青魚遊戲 Service Worker:大廳 + 數獨 + 五子棋 + 7 款小遊戲共用,離線可玩。
// 更新任何檔案後,請把 VERSION 加一。
const VERSION='v4';
const CACHE='qingyu-games-'+VERSION;
const CFG='qingyu-cfg'; // 數獨每日提醒設定(不可刪除)
const ASSETS=['./','./index.html','./sudoku.html','./gomoku.html','./g2048.html','./g2248.html','./snake.html','./minesweeper.html','./slide.html','./blocks.html','./flappy.html','./qy.css','./qy.js','./manifest.webmanifest',
 './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==CFG&&(k.startsWith('qingyu-games-')||k.startsWith('qingyu-sudoku-')||k.startsWith('qingyu-gomoku-'))).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

// 網路優先(最多等 3 秒),逾時或離線就用快取,所以更新後能拿到新版、離線也能開。
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 e.respondWith(handle(e,req));
});
async function handle(e,req){
 const cache=await caches.open(CACHE);
 const hit=await cache.match(req,{ignoreSearch:true});
 let stored=Promise.resolve();
 const net=fetch(req).then(res=>{
  if(res&&res.ok&&res.type==='basic')stored=cache.put(req,res.clone()).catch(()=>{});
  return res;
 });
 e.waitUntil(net.then(()=>stored,()=>{})); // 即使已先回傳快取,也讓背景更新跑完
 if(!hit){
  try{return await net}
  catch(err){
   if(req.mode==='navigate'){const home=await cache.match('./index.html');if(home)return home}
   return Response.error();
  }
 }
 const res=await Promise.race([net.catch(()=>null),new Promise(r=>setTimeout(()=>r(null),3000))]);
 return res&&res.ok?res:hit;
}

/* 數獨每日提醒 */
async function remind(){
 const c=await caches.open(CFG),r=await c.match('cfg');if(!r)return;
 const cfg=await r.json();if(!cfg.on)return;
 const d=new Date(),k=d.toLocaleDateString('sv');
 if(cfg.last===k||cfg.done===k||d.getHours()*60+d.getMinutes()<cfg.min)return;
 await self.registration.showNotification('青魚數獨 🐟',{body:'今天的每日挑戰在等你,來玩一局吧!',icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'daily'});
 cfg.last=k;await c.put('cfg',new Response(JSON.stringify(cfg)));
}
self.addEventListener('periodicsync',e=>{if(e.tag==='daily')e.waitUntil(remind())});
self.addEventListener('message',e=>{
 if(e.data&&e.data.cfg)e.waitUntil(caches.open(CFG).then(c=>c.put('cfg',new Response(JSON.stringify(e.data.cfg)))));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  const w=l.find(c=>c.url.includes('sudoku.html'));
  return w?w.focus():clients.openWindow('./sudoku.html');
 }));
});
