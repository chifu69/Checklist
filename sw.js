const CACHE="sr-lead-v1.12";
const ASSETS=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./report-share.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith("sr-lead-")).map(k=>caches.delete(k))))])));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
