// Minimal service worker for PWA installability
// Serves cached shell offline and caches immutable build assets at runtime.

const SHELL_CACHE_NAME = 'tunet-shell-v3';
const ASSET_CACHE_NAME = 'tunet-assets-v2';
const SHELL_ASSETS = ['./', './index.html'];

function isBuildAssetRequest(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  return url.origin === self.location.origin && url.pathname.includes('/assets/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE_NAME, ASSET_CACHE_NAME].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isBuildAssetRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE_NAME));
  }
});
