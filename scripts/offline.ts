import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

export function serviceWorkerSource(files: string[], version: string): string {
  return `// Built app files only. Model downloads live in a separate cache with no expiry.
const SHELL = "turaco-shell-v1";
// App version: ${version}
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const missing = [];
    for (const url of FILES) {
      // Reuse already saved, content-hashed engines and assets across app updates.
      if (!url.startsWith('/assets/') || !(await cache.match(url))) missing.push(url);
    }
    await cache.addAll(missing.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  // Keep previous app versions, and never delete the model cache.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message', event => {
  if (event.data !== 'PREPARE_OFFLINE') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL);
      const missing = [];
      for (const url of FILES) if (!(await cache.match(url))) missing.push(url);
      await cache.addAll(missing.map(url => new Request(url, { cache: 'reload' })));
      event.ports[0]?.postMessage(true);
    } catch { event.ports[0]?.postMessage(false); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      return (await cache.match('/index.html')) || fetch(request);
    })());
    return;
  }
  if (!FILES.includes(url.pathname) && !url.pathname.startsWith('/assets/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    return (await cache.match(url.pathname)) || (await caches.match(request)) || fetch(request);
  })());
});
`
}

export function offlineApp(): Plugin {
  return {
    name: 'turaco-offline-app', apply: 'build', enforce: 'post',
    generateBundle(_options, bundle) {
      const files = ['/site.webmanifest', '/social-preview-v2.png', ...Object.keys(bundle)
        .filter(name => !name.startsWith('phonon_tts_bg-') && !name.includes('/phonon_tts_bg-'))
        .map(name => `/${name}`)]
      const version = createHash('sha256').update(JSON.stringify(files) + JSON.stringify(bundle['index.html'])).digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(files, version) })
    },
  }
}
