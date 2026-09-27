/// <reference lib="webworker" />

const CACHE_NAME = 'edutrack-v2';
const OFFLINE_URL = '/offline';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Offline assets are optional: one failed page fetch must not disable Web Push.
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)));
      } catch {
        // Push also works when the browser cannot allocate offline storage.
      }
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('edutrack-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).finally(() => self.clients.claim())
  );
});

// Fetch event - Network first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api')) return;

  // Skip chrome-extension and other non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // For navigation requests (HTML pages) - Network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Try cache first, then offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images) - Cache first, network fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cache hit, but also update cache in background
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }).catch(() => {});
          return cachedResponse;
        }
        // Not in cache, fetch from network
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // For other requests - Network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event
function notificationUrl(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/dashboard', self.location.origin);
    if (url.origin !== self.location.origin) return `${self.location.origin}/dashboard`;
    // Accept reminders already queued by older backend versions.
    url.pathname = url.pathname.replace(/^\/dashboard\/classes(?=\/|$)/, '/classes');
    return url.href;
  } catch {
    return `${self.location.origin}/dashboard`;
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = typeof data.title === 'string' && data.title ? data.title : 'EduTrack';
  const options = {
    body: typeof data.body === 'string' && data.body ? data.body : 'Bạn có thông báo mới',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true, // Browser/OS may ignore these presentation preferences.
    ...(typeof data.tag === 'string' ? { tag: data.tag } : {}),
    data: {
      url: notificationUrl(data.url),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = notificationUrl(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const exactClient = windowClients.find((client) => client.url === targetUrl);
      if (exactClient) {
        try { return await exactClient.focus(); } catch { /* Window closed during click. */ }
      }
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          const navigated = await client.navigate(targetUrl);
          if (navigated) return await navigated.focus();
        } catch { /* Try another client, or open a fresh window. */ }
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
