// 本垒：只用来弹出系统通知（比赛提醒），不缓存任何内容
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>x.url.split('#')[0]===url.split('#')[0]);
    if(c){c.navigate(url).catch(()=>{});return c.focus();}
    return self.clients.openWindow(url);
  }));
});
