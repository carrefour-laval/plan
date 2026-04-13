// Service Worker — Plan Carrefour Laval
// Stratégie : Network First pour HTML (toujours à jour), Cache First pour assets statiques
const CACHE_NAME = 'carrefour-plan-v7';
const STATIC_ASSETS = [
  './rayons.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap'
];

// Installation : mise en cache des assets statiques uniquement (pas le HTML)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})));
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

// Fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // HTML (index.html, '/') : Network First — toujours charger la version la plus récente
  // Fallback sur le cache seulement si hors-ligne
  if (event.request.destination === 'document' ||
      event.request.url.endsWith('/') ||
      event.request.url.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Stocker en cache pour fallback offline
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statiques (JS, fonts, manifest) : Cache First avec revalidation en arrière-plan
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => {});
    })
  );
});
