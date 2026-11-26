/* Bridge Relax : mode hors ligne.
   L'application est gardée sur l'appareil. Avec du réseau, on prend toujours la dernière version
   (et on met la copie à jour) ; sans réseau, on ouvre la copie enregistrée. */
const CACHE = 'bridge-relax';
const PAGE = './relax.html';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(PAGE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function withTimeout(p, ms) {
  return new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('délai')), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || /relax\.html$/.test(url.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // réseau d'abord (4 s maximum), pour avoir la dernière version
      const res = await withTimeout(fetch(req, { cache: 'no-cache' }), 4000);
      if (res && res.ok) cache.put(isPage ? PAGE : req, res.clone());
      return res;
    } catch (err) {
      // pas de réseau : la copie enregistrée
      const hit = await cache.match(isPage ? PAGE : req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
