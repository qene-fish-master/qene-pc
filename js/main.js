/* 青魚電腦 — 啟動 */
(function(){
'use strict';
const OS=window.OS,{$}=OS.U;
$('#os').style.setProperty('--scale',OS.scaleUrl);
if(/[?&#]fast/.test(location.href))OS.R.fast=true;
OS.applyAll();
OS.initTaskbar();
OS.initMouse();
OS.initPower();
OS.desk.init();
OS.on('quota',()=>{if(!OS.R.quotaWarned){OS.R.quotaWarned=1;OS.toast('儲存空間已滿，部分變更可能無法保存');}});
OS.boot();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
 addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
