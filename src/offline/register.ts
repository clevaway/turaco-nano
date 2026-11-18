let installation: Promise<boolean> | undefined
export function prepareOfflineApp(): Promise<boolean> {
  if (installation) return installation
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return Promise.resolve(false)
  installation = (async () => {
    try {
      const existing = await navigator.serviceWorker.getRegistration('/')
      const registration = existing || await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      if (existing) void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
      if (registration.active) {
        return await new Promise<boolean>(resolve => {
          const channel = new MessageChannel()
          const timeout = setTimeout(() => { channel.port1.close(); resolve(false) }, 15000)
          channel.port1.onmessage = ({ data }) => { clearTimeout(timeout); channel.port1.close(); resolve(data === true) }
          registration.active!.postMessage('PREPARE_OFFLINE', [channel.port2])
        })
      }
      const installing = registration.installing || registration.waiting
      if (!installing) return false
      return await new Promise<boolean>(resolve => {
        const finish = () => {
          if (installing.state === 'activated') resolve(true)
          else if (installing.state === 'redundant') resolve(false)
        }
        installing.addEventListener('statechange', finish)
        finish()
      })
    } catch { return false }
  })()
  return installation
}

export function requestPersistentStorage(): void {
  // Browsers decide whether to grant protection against automatic storage eviction.
  try { void navigator.storage?.persist?.().catch(() => false) } catch { /* Optional. */ }
}
