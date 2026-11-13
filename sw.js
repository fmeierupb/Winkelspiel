// Eigener Cache-Präfix, damit andere Werkzeuge unter derselben Adresse unberührt bleiben.
const CACHE = 'winkel-1c39352c';
// Alles, was beim ersten Aufruf in den Speicher kommt.
const FILES = [
  './',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './index.html',
  './manifest.webmanifest'
];

// 'reload' umgeht den Browser-Zwischenspeicher, damit wirklich die neue Fassung im Speicher landet.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok && !new URL(req.url).search) cache.put(req, res.clone());
      return res;
    });
    net.catch(() => {});
    const timeout = new Promise(r => setTimeout(r, 4000, null));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch (err) {}
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // Eine Seite, die weder im Netz noch im Speicher ist, führt zur Startseite statt auf eine Fehlerseite ohne Rückweg.
    if (req.mode === 'navigate') { const start = await cache.match('./'); if (start) return start; }
    return net;
  })());
});
