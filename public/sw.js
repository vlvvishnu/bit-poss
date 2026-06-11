// BITE. POS Service Worker
const CACHE = 'bite-pos-v5'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  if (!isHttp) return

  // Only handle same-origin static app resources. Let the browser/network
  // handle third-party QR/image/API requests so a transient failure is not
  // converted into our app-level 503 Offline response.
  if (url.origin !== self.location.origin) return

  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('googleapis.com')) return
  if (url.hostname.includes('gstatic.com')) return
  if (url.hostname.includes('static.cloudflareinsights.com')) return

  // Never cache Vite build assets or HTML navigations to avoid stale bundle mismatches.
  if (url.pathname.startsWith('/assets/')) return
  if (event.request.mode === 'navigate') return

  event.respondWith((async () => {
    try {
      const res = await fetch(event.request)
      if (res && res.ok) {
        const clone = res.clone()
        const cache = await caches.open(CACHE)
        cache.put(event.request, clone).catch(() => {})
      }
      return res
    } catch {
      const cached = await caches.match(event.request)
      if (cached) return cached
      return new Response('Offline', { status: 503, statusText: 'Offline' })
    }
  })())
})

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting()
})
