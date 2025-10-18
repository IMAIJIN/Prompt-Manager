const CACHE_NAME = 'prompt-manager-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Strategy: Cache First, falling back to Network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // If both cache and network fail, return offline page
                    return caches.match('/index.html');
                });
            })
    );
});

// Background Sync (for future implementation)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prompts') {
        event.waitUntil(syncPrompts());
    }
});

async function syncPrompts() {
    // Placeholder for future sync functionality
    console.log('Background sync triggered');
}

// Push Notifications (for future implementation)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('Prompt Manager', options)
    );
});
