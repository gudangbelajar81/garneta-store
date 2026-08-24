const CACHE_NAME = 'garneta-store-v4-1787582075.87504.50489.38395';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/images/pwa-icon.svg',
  '/assets/images/garneta-logo-g.svg',
  '/assets/css/style.css',
  '/assets/js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('fetch', (e) => {
  // PWA requires a fetch handler. We can just do a network-first or cache-first.
  // For this POS, network-first is safer so they always get the latest API.
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
