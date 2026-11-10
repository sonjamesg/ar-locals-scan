const C='ar-desk-v28';const SHELL=['./','./index.html','./manifest.webmanifest','./ar-logo.png','./favicon-192.png','./favicon-512.png','./favicon-32.png','./favicon-180.png','./favicon.ico'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 if(/\.zip$/i.test(new URL(r.url).pathname))return; // extension download always from network (never a stale cached zip)
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cl=res.clone();caches.open(C).then(c=>c.put('./index.html',cl));return res;}).catch(()=>caches.match('./index.html')));return;}
 e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok){const cl=res.clone();caches.open(C).then(c=>c.put(r,cl));}return res;})));});
