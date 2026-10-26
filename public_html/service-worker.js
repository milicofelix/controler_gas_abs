const CACHE_PREFIX = 'meu-gas-shell'
const CACHE_VERSION = 'v7-2026-10-26'
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`
const CORE_ASSETS = ['/', '/offline.html', '/manifest.webmanifest', '/favicon.svg', '/icons.svg', '/icons/icon-48.webp', '/icons/icon-72.webp', '/icons/icon-96.webp', '/icons/icon-128.webp', '/icons/icon-192.webp', '/icons/icon-256.webp', '/icons/icon-512.webp', '/screenshots/dashboard-mobile.svg', '/screenshots/dashboard-wide.svg']

async function cacheApplicationShell() {
  const cache = await caches.open(STATIC_CACHE)
  await cache.addAll(CORE_ASSETS)
  try {
    const response = await fetch('/', { cache: 'no-store' })
    if (!response.ok) return
    await cache.put('/', response.clone())
    const html = await response.text()
    const assetUrls = [...html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)].map((match) => match[1]).filter((url) => !url.startsWith('/api/'))
    await Promise.allSettled(assetUrls.map((url) => cache.add(url)))
  } catch {
    // Os assets essenciais já foram incluídos acima.
  }
}

self.addEventListener('install', (event) => event.waitUntil(cacheApplicationShell()))
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE).map((key) => caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting() })
self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-operational-data') return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => clients.forEach((client) => client.postMessage({ type: 'SYNC_OPERATIONAL_DATA' }))))
})

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put('/', response.clone())
    return response
  } catch {
    return (await cache.match('/')) || (await cache.match('/offline.html'))
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/auth')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ offline: true, message: 'Serviço indisponível sem conexão.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }
  if (['style', 'script', 'image', 'font', 'manifest'].includes(request.destination)) event.respondWith(cacheFirstAsset(request))
})
