const CACHE_NAME = 'garneta-store-v7-1788156875';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/images/pwa-icon.svg',
  '/assets/images/garneta-logo-g.svg',
  '/assets/css/style.css',
  '/assets/js/main.js'
];

// INSTALL: Skip waiting so update takes over immediately
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

// ACTIVATE: Delete all old caches, claim clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Take control of ALL open tabs immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all open clients that a new version is available
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

// FETCH: Network-First Strategy for JS/CSS/HTML (always fresh from server)
// Cache-First only for images/fonts
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Always skip API requests
  if (url.pathname.startsWith('/api')) return;

  // Network-First for core app files (JS, CSS, HTML)
  const isCoreAsset = url.pathname.endsWith('.js') || 
                      url.pathname.endsWith('.css') || 
                      url.pathname.endsWith('.html') || 
                      url.pathname === '/';

  if (isCoreAsset) {
    e.respondWith(
      fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => {
        // Offline fallback from cache
        return caches.match(e.request);
      })
    );
  } else {
    // Cache-First for images/icons (no need to re-fetch)
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return response;
        });
      })
    );
  }
});
