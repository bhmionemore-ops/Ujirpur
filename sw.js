const CACHE_NAME = 'barnia-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only intercept and cache GET requests
  if (event.request.method !== 'GET') {
    return; // Bypass completely for POST, PUT, DELETE, etc.
  }

  // 2. Only handle http/https requests (skip chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Bypass caching for API endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network First strategy with error handling for static files
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the standard successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch((err) => {
              console.warn('[Service Worker] Cache put failed:', err);
            });
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
