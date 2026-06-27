const STATIC_CACHE = 'meteo-huescar-static-v4';
const API_CACHE = 'meteo-huescar-api-v4';
const API_CACHE_TTL = 10 * 60 * 1000;
const OFFLINE_FALLBACK_URL = '/huescar';

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
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

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
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  event.respondWith(fetch(request).catch(() => new Response('Sin conexión', { status: 503 })));
});

async function networkFirst(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, withCacheTimestamp(response));
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

async function navigationNetworkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, withCacheTimestamp(response));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return (await cache.match(OFFLINE_FALLBACK_URL)) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, withCacheTimestamp(response));
    }
    return response;
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}

function withCacheTimestamp(response) {
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set('sw-cached-at', String(Date.now()));
  return new Response(cloned.body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers,
  });
}

self.addEventListener('push', (event) => {
  let payload = { title: 'Meteo Huéscar', body: '', url: '/huescar' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192-maskable.png',
    tag: payload.tag || 'meteo-huescar',
    renotify: true,
    data: { url: payload.url || '/huescar' },
    vibrate: payload.vibrate || [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/huescar';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
