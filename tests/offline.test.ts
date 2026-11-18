import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { serviceWorkerSource } from '../scripts/offline.ts'

test('saved app reopens without a network and updates never erase model downloads', async () => {
  const handlers: Record<string, (event: any) => void> = {}
  const files = new Map([['/index.html', new Response('<main>Turaco</main>')], ['/assets/engine.wasm', new Response('wasm')]])
  const source = serviceWorkerSource(['/index.html', '/assets/engine.wasm'], 'test')
  let claims = 0
  let networkCalls = 0
  vm.runInNewContext(source, {
    self: { location: { origin: 'https://turaco.test' }, addEventListener(name: string, handler: any) { handlers[name] = handler }, clients: { async claim() { claims++ } } },
    caches: { async open(name: string) { assert.equal(name, 'turaco-shell-v1'); return { async match(url: string) { return files.get(url)?.clone() } } }, async delete() { assert.fail('No cache should ever be erased automatically') } },
    URL, Response, fetch: async () => { networkCalls++; throw new Error('Offline') },
  })
  let activation: Promise<unknown> | undefined
  handlers.activate({ waitUntil(value: Promise<unknown>) { activation = value } })
  await activation
  assert.equal(claims, 1)
  for (const [mode, path, expected] of [['navigate', '/', '<main>Turaco</main>'], ['same-origin', '/assets/engine.wasm', 'wasm']]) {
    let response: Promise<Response> | undefined
    handlers.fetch({ request: { method: 'GET', mode, url: `https://turaco.test${path}` }, respondWith(value: Promise<Response>) { response = value } })
    assert.equal(await (await response)!.text(), expected)
  }
  assert.equal(networkCalls, 0)
})
test('app updates reuse an already saved speech engine instead of downloading it again', async () => {
  const handlers: Record<string, (event: any) => void> = {}
  const downloads: string[] = []
  vm.runInNewContext(serviceWorkerSource(['/index.html', '/assets/engine.wasm', '/assets/new-app.js'], 'next'), {
    self: { addEventListener(name: string, handler: any) { handlers[name] = handler }, async skipWaiting() {} },
    caches: { async open() { return {
      async match(url: string) { return url === '/assets/engine.wasm' ? new Response('saved engine') : undefined },
      async addAll(requests: { url: string }[]) { downloads.push(...requests.map(request => request.url)) },
    } } },
    Response, Request: class { url: string; constructor(url: string) { this.url = url } },
  })
  let installation: Promise<unknown> | undefined
  handlers.install({ waitUntil(value: Promise<unknown>) { installation = value } })
  await installation
  assert.deepEqual(downloads, ['/index.html', '/assets/new-app.js'])
})
