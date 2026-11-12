// Eigener Cache-Präfix, damit andere Werkzeuge unter derselben Adresse unberührt bleiben.
const CACHE = 'winkel-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('winkel-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst vom Netz laden, nach 4 Sekunden ohne Antwort die gespeicherte Fassung nehmen.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    net.catch(() => {});
    const timeout = new Promise(r => setTimeout(r, 4000, null));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch (err) {}
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || net;
  })());
});
