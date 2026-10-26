const SERVICE_WORKER_URL = '/service-worker.js'

function announceUpdate(registration) {
  window.dispatchEvent(new CustomEvent('pwa:update-available', { detail: registration }))
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' })
    if (registration.waiting) announceUpdate(registration)

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) announceUpdate(registration)
      })
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_OPERATIONAL_DATA') window.dispatchEvent(new Event('pwa:sync-requested'))
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sessionStorage.getItem('meu-gas-update-requested') !== '1') return
      sessionStorage.removeItem('meu-gas-update-requested')
      window.location.reload()
    })

    return registration
  } catch {
    return null
  }
}

export function activateServiceWorkerUpdate(registration) {
  if (!registration?.waiting) return false
  sessionStorage.setItem('meu-gas-update-requested', '1')
  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}
