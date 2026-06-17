/**
 * Service Worker — Genshin Wish Tracker PWA
 *
 * Stratégies :
 * - Network-first pour index.html et banners-current.json (contenu qui change à chaque deploy)
 * - Cache-first + stale-while-revalidate pour les assets hashés (JS/CSS/fonts/images)
 * - Pass-through pour les API externes (HoYoverse, enka.network)
 *
 * Bump CACHE_NAME à chaque changement de stratégie pour vider les anciens caches.
 */

const CACHE_NAME = 'genshin-tracker-v4';

// URLs qui doivent toujours aller au réseau d'abord (contenu dynamique / non-hashé)
const NETWORK_FIRST_PATTERNS = [
  /\/wish-counter\/?$/,
  /\/wish-counter\/index\.html/,
  /\/banners-current\.json/,
  /\/banners-history\.json/,
];

// ---- Installation ----
self.addEventListener('install', (event) => {
  // Pas de précache — on laisse les visites remplir le cache naturellement
  self.skipWaiting();
});

// ---- Activation : supprime tous les anciens caches ----
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

// ---- Fetch ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne pas intercepter les API externes (HoYoverse, enka.network, workers.dev, etc.)
  const isExternal = url.origin !== self.location.origin;
  if (isExternal) return;

  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some((re) => re.test(url.href));

  if (isNetworkFirst) {
    // Network-first : on essaie le réseau, fallback sur cache si hors-ligne
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first + stale-while-revalidate pour les assets hashés
    event.respondWith(
      caches.match(request).then((cached) => {
        // Mise à jour en arrière-plan même si on a le cache
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
  }
});
