const CACHE_NAME = 'kitabah-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Pasang Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Jalankan Service Worker untuk menangkap request (fitur offline dasar)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});