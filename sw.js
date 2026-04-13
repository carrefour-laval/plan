// Service Worker — Plan Carrefour Laval
// Stratégie : Cache First pour les assets, puis réseau
const CACHE_NAME = 'carrefour-plan-v3';
const ASSETS = [
  './',
  './index.html',
  './rayons.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap'
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On tente de mettre en cache, les erreurs réseau sont ignorées
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : Cache First → réseau → fallback
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Revalider en arrière-plan (stale-while-revalidate)
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      // Pas en cache : aller chercher sur le réseau
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => {
        // Hors-ligne et pas en cache : retourner index.html comme fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
