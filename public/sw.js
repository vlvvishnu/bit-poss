// BITE. POS Service Worker
const CACHE = 'bite-pos-v1'
const STATIC = ['/']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // Only cache GET requests, skip Supabase API calls
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) return
  if (e.request.url.includes('fonts.googleapis')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const reqUrl = new URL(e.request.url)
          if (reqUrl.protocol === 'http:' || reqUrl.protocol === 'https:') {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone).catch(() => {}))
          }
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
