const CACHE="sr-lead-v1.4";
const ASSETS=["./","./index.html","./styles.css","./app.js","./photo-ocr.js","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith("sr-lead-")).map(k=>caches.delete(k))))])));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
