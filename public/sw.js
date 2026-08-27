/**
 * SELF-UNREGISTERING CLEANUP SERVICE WORKER
 * Unregisters any active service worker and clears all legacy caches.
 * Does not intercept any fetch events.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Clear all Cache Storage instances
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (e) {}

      try {
        // Unregister this service worker
        await self.registration.unregister();
      } catch (e) {}

      try {
        // Claim clients and force reload to ensure direct network fetch
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        }
      } catch (e) {}
    })()
  );
});

// No fetch listener: all requests pass directly to the network without interception
