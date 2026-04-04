const CACHE_NAME = 'aegis-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests entirely
  if (event.request.method !== 'GET') return;

  // Never cache API calls or auth-related requests
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/rest') ||
    url.searchParams.has('token')
  ) {
    return;
  }

  // Only serve from cache for explicit static assets; don't cache-on-the-fly.
  // This prevents caching auth-sensitive rendered pages on shared devices.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    }).catch(() => caches.match('/'))
  );
});
