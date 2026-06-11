async function clearStaleAppShell() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const resetKey = 'bite-app-shell-reset-v4'
  const hasController = Boolean(navigator.serviceWorker.controller)
  const alreadyReset = localStorage.getItem(resetKey) === 'done'

  if (alreadyReset && !hasController) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))

    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    }

    localStorage.setItem(resetKey, 'done')
  } catch (error) {
    console.warn('[BITE] app shell cache reset failed:', error)
  }

  if (hasController && sessionStorage.getItem(resetKey) !== 'reloaded') {
    sessionStorage.setItem(resetKey, 'reloaded')
    window.location.reload()
    return new Promise(() => {})
  }
}

clearStaleAppShell()
  .then(() => import('./main.jsx'))
  .catch(error => {
    console.error('[BITE] failed to start app:', error)
    import('./main.jsx')
  })
