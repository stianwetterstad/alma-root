const CACHE_NAME = 'alma-v15';
const OFFLINE_URL = '/offline.html';
const CACHE_URLS = [
  '/index.html',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  OFFLINE_URL,
  '/spill/',
  '/spill/index.html',
  '/spill/kosekaos/',
  '/spill/kosekaos/index.html',
  '/spill/kosekaos/firebase-config.js',
  '/spill/loopelakk-5000/',
  '/spill/loopelakk-5000/index.html',
  '/tur/',
  '/tur/index.html',
  '/tur/sykkeltur-frotvedt-kart.png',
  '/tur/rute-illustrasjon.svg',
  '/ukelonn/',
  '/ukelonn/index.html',
  '/laering/',
  '/laering/index.html',
  '/laering/ki/',
  '/laering/ki/index.html',
  '/laering/assets/gangetrappen-preview.png',
  '/laering/assets/KIfilm.MP4',
  '/laering/assets/kiforklaring.png',
  '/laering/assets/lagetavki.png',
  '/laering/assets/lagetavkimedfork.png',
  '/laering/assets/delingsduellen.png',
  '/laering/gangetrappen/',
  '/laering/gangetrappen/index.html',
  '/laering/gangetrappen/firebase-config.js',
  '/laering/delingsduellen/',
  '/laering/delingsduellen/index.html',
  '/laering/delingsduellen/styles.css',
  '/laering/delingsduellen/app.js',
  '/laering/delingsduellen/assets/delingsduellen.png',
  '/laering/delingsduellen/assets/delingsduellen-title.png'
];

// Install event - cache required resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Only handle GET requests for same-origin resources.
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // For navigation requests, prefer network and fall back to offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        let offlineResponse = await caches.match(OFFLINE_URL);
        if (!offlineResponse) {
          offlineResponse = await caches.match('/offline.html');
        }
        if (offlineResponse) {
          const body = await offlineResponse.clone().text();
          const headers = new Headers(offlineResponse.headers);
          if (!headers.has('content-type')) {
            headers.set('content-type', 'text/html; charset=utf-8');
          }
          return new Response(body, {
            status: 200,
            headers
          });
        }
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For static same-origin assets, use cache-first and update cache on network success.
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok && !networkResponse.redirected) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
  );
});
