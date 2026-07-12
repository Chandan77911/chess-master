/* ============================================================
   Project Grandmaster — Service Worker
   Caches the whole app on first load so it works fully offline
   afterward, and is required for the browser's "Install app"
   prompt to appear.
   ============================================================ */

const CACHE_NAME = 'grandmaster-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './fonts.css',
  './manifest.json',
  './js/engine.js',
  './js/ai.js',
  './js/modes.js',
  './js/board.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/fonts/fraunces-latin-500-normal.woff2',
  './assets/fonts/fraunces-latin-600-normal.woff2',
  './assets/fonts/fraunces-latin-700-normal.woff2',
  './assets/fonts/work-sans-latin-400-normal.woff2',
  './assets/fonts/work-sans-latin-500-normal.woff2',
  './assets/fonts/work-sans-latin-600-normal.woff2',
  './assets/fonts/ibm-plex-mono-latin-400-normal.woff2',
  './assets/fonts/ibm-plex-mono-latin-500-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first: once loaded, the app never needs the network again.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
