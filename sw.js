/* ============================================================
   KITABAH v2 — Service Worker v5
   ============================================================ */

const CACHE_NAME = 'kitabah-v2-cache-v5';

const APP_SHELL = [
  './index.html',
  './app.js',
  './supabase.js',
  './manifest.json',
];

// Install
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(APP_SHELL).catch(err =>
        console.warn('SW: cache sebagian gagal:', err)
      )
    )
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase & CDN eksternal: selalu network, jangan cache
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdn.sheetjs.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return; // biarkan browser handle langsung
  }

  // App shell: network-first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Hanya cache response sukses dan bukan opaque
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        // Offline: ambil dari cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ke index.html untuk navigasi
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
