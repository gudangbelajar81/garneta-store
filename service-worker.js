const CACHE_NAME = 'garneta-cache-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activate new service worker immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Menghapus cache lama:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all clients immediately
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass cache completely and always fetch from network
  event.respondWith(fetch(event.request));
});
