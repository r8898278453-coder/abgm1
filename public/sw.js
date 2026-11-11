// Public shell only. Private API/files are always network-only and never receive an HTML fallback.
const CACHE_NAME='aaditech-public-v2';
const SHELL=['/','/index.html','/manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('message',event=>{if(event.data?.type==='CLEAR_PRIVATE_STATE')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/uploads/')||request.headers.has('Authorization'))return;
 if(request.mode==='navigate'&&SHELL.includes(url.pathname))event.respondWith(fetch(request).catch(async()=>await caches.match('/index.html')||Response.error()));
});
