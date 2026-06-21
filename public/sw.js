const CACHE = 'meteo-huescar-v2';
const API_CACHE = 'meteo-huescar-api-v2';
const STATIC_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const API_CACHE_TTL = 3 * 60 * 1000;

const PRECACHE_URLS = [
  '/',
  '/huescar',
  '/huescar/agricultura',
  '/motor-climatico',
  '/meteo',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/apple-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/weather/')) {
    event.respondWith(networkFirst(request, API_CACHE, API_CACHE_TTL));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request, CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request, CACHE, STATIC_CACHE_TTL));
    return;
  }

  event.respondWith(fetch(request));
});

async function networkFirst(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      const headers = new Headers(cloned.headers);
      headers.append('sw-cached-at', String(Date.now()));
      cache.put(request, new Response(cloned.body, { status: cloned.status, statusText: cloned.statusText, headers }));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedTime = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
      if (Date.now() - cachedTime < ttl) return cached;
    }
    return new Response(JSON.stringify({ error: 'Sin conexión' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function networkFirstWithOffline(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedTime = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
      if (Date.now() - cachedTime < ttl) return cached;
    }
    return await cache.match('/');
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      const headers = new Headers(cloned.headers);
      headers.append('sw-cached-at', String(Date.now()));
      cache.put(request, new Response(cloned.body, { status: cloned.status, statusText: cloned.statusText, headers }));
    }
    return response;
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}
