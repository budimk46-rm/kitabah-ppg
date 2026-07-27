/* ============================================================
   KITABAH v2 — Service Worker v6
   Strategi: cache-first + stale-while-revalidate untuk app shell
   supaya kunjungan ulang tetap cepat walau sinyal lemah.
   ============================================================ */

const CACHE_NAME = 'ppg-siduta-cache-v2';

const APP_SHELL = [
  './index.html',
  './app.min.js',
  './supabase.min.js',
  './manifest.json',
];

// Install: precache app shell
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
  // (data harus selalu fresh; font & lib pihak ketiga di-cache browser sendiri)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdn.sheetjs.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return; // biarkan browser handle langsung
  }

  if (event.request.mode === 'navigate' || event.request.method !== 'GET') {
    // Navigasi halaman: coba network dulu (biar dapat index.html terbaru),
    // fallback ke cache kalau offline/lambat gagal total.
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // App shell (JS/CSS/manifest/icon lokal): CACHE-FIRST.
  // Langsung sajikan dari cache kalau ada (instan, tak nunggu jaringan lemah),
  // lalu update cache di background (stale-while-revalidate) supaya
  // kunjungan berikutnya dapat versi terbaru.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, respClone));
        }
        return resp;
      }).catch(() => cached); // jaringan gagal → tetap andalkan cache

      // Kalau ada di cache, sajikan itu dulu (cepat), update jalan di background.
      // Kalau belum ada di cache (kunjungan pertama), tunggu network.
      return cached || networkFetch;
    })
  );
});
