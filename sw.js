const CACHE_NAME = 'mercado-manu-v4-ios14pm';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalación y guardado en caché de archivos principales
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(function() {})
  );
});

// Limpieza de versiones antiguas de caché para forzar actualización inmediata en iPhone y Android
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Estrategia Network-First para las APIs de tasas y Stale-While-Revalidate para la app
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // Siempre consultar internet primero para las tasas BCV / Euro / USDT
  if (url.indexOf('dolarapi.com') !== -1 || url.indexOf('er-api.com') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Para la interfaz de la app: busca la versión más reciente y respalda en caché offline
  event.respondWith(
    fetch(event.request)
      .then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});
