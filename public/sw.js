// BITE. POS legacy service worker cleaner.
// The app no longer registers a runtime caching service worker because stale
// app-shell bundles can hide deployed fixes. Existing installations receive
// this no-op worker once, then the main loader unregisters it and clears caches.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', () => {
  // Intentionally let the browser perform every network request.
  // Never serve cached JS/HTML from a previous release.
})

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting()
})
