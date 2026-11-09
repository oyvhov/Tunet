// Minimal service worker for PWA installability
// Serves cached shell offline and caches immutable build assets at runtime.

// Replaced with the app version at build time (vite plugin `version-service-worker`).
// The shell cache must change on every release: otherwise a failed navigation right
// after an upgrade serves the previous index.html and the app keeps the old bundle.
const CACHE_VERSION = '__APP_VERSION__';
const SHELL_CACHE_NAME = `tunet-shell-${CACHE_VERSION}`;
const ASSET_CACHE_NAME = `tunet-assets-${CACHE_VERSION}`;
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

// The first page load after a release runs through the previous worker, so the new
// entry files must be cached here for the page to start with the server down.
async function cacheEntryAssets() {
  const response = await fetch('./index.html', { cache: 'no-store' });
  if (!response.ok) return;
  const html = await response.text();
  const urls = Array.from(
    html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g),
    (match) => match[1]
  );
  const cache = await caches.open(ASSET_CACHE_NAME);
  await cache.addAll(urls);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
      cacheEntryAssets().catch(() => {}),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
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
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }

  if (isBuildAssetRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE_NAME));
  }
});
