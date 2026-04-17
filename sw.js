/* ============================================================
   FINANCIE — Service Worker (PWA)
   Cache-first para assets estáticos, network-first para Firebase
   ============================================================ */

const CACHE_NAME = 'financie-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.html',
  './css/main.css',
  './js/app.js',
  './js/auth.js',
  './js/accounts.js',
  './js/bills.js',
  './js/categories.js',
  './js/config.js',
  './js/dashboard.js',
  './js/db.js',
  './js/recurring.js',
  './js/settings.js',
  './js/transactions.js',
  './js/utils.js',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js'
];

// ── Install: pre-cache static assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts.googleapis') || url.includes('jsdelivr')));
    }).catch(err => console.warn('[SW] Cache install error:', err))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static, network-first for Firebase ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and firebase/firestore requests (always network)
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Background Sync placeholder (future) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    console.log('[SW] Background sync: transactions');
  }
});

// ── Push Notifications placeholder ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'Financie', body: 'Você tem contas a vencer!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'financie-alert',
      renotify: true
    })
  );
});
