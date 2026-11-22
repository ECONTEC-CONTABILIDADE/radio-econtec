// Rádio ECONTEC: sempre busca a versão nova (sem cache); usa a cópia salva só sem internet.
const C='radio-econtec-v3';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||/\.mp3$/.test(u.pathname))return;
 const html=e.request.mode==='navigate'||/\.(html|json|webmanifest)$|\/$/.test(u.pathname);
 e.respondWith(fetch(e.request,html?{cache:'no-store'}:{}).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
