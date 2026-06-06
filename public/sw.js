/**
 * Service Worker — Genshin Wish Tracker PWA
 *
 * Stratégie :
 * - Cache-first pour les assets statiques (JS, CSS, fonts, images)
 * - Network-first pour les appels API (HoYoverse, genshin.jmp.blue)
 * - Offline fallback : retourne le cache si réseau indisponible
 */

const CACHE_NAME = 'genshin-tracker-v1';

// Assets critiques à précacher lors de l'installation
const PRECACHE_URLS = [
  '/wish-counter/',
  '/wish-counter/index.html',
];

// ---- Installation : précache les pages critiques ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---- Activation : supprime les anciens caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch : cache-first pour assets, network-first pour API ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes vers des API externes (HoYoverse, genshin.jmp.blue)
  const isExternal = !url.origin.includes(self.location.origin) ||
    url.pathname.startsWith('/gacha_info') ||
    url.hostname.includes('hoyoverse') ||
    url.hostname.includes('jmp.blue');

  if (isExternal || request.method !== 'GET') {
    return; // Laisser passer sans cache
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Retour immédiat depuis le cache, mise à jour en arrière-plan
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Pas en cache : fetch réseau, puis stocker
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      });
    })
  );
});
