import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readModelAsset } from '../src/speech/model-cache.ts'

const asset = { url: 'https://models.example.org/pinned/voice', bytes: 4 }
function storage() {
  const files = new Map<string, Response>()
  return {
    files,
    async match(url: RequestInfo | URL) { return files.get(String(url))?.clone() },
    async put(url: RequestInfo | URL, response: Response) { files.set(String(url), response.clone()) },
    async delete(url: RequestInfo | URL) { return files.delete(String(url)) },
  }
}
test('downloads once, then reopens from persistent storage without any network access', async () => {
  const cache = storage()
  let calls = 0
  const first = await readModelAsset(asset, () => {}, { cache, fetch: async () => {
    calls++; return new Response(new Uint8Array([1, 2, 3, 4]))
  } })
  assert.equal(first.saved, true)
  const sources: boolean[] = []
  const second = await readModelAsset(asset, value => sources.push(value.cached), {
    cache, fetch: async () => { throw new Error('Offline: network must not be used') },
  })
  assert.deepEqual([...second.bytes], [1, 2, 3, 4])
  assert.equal(second.saved, true)
  assert.equal(calls, 1)
  assert.deepEqual(sources, [true])
})
test('interrupted downloads are never saved, and completed files remain intact', async () => {
  const cache = storage()
  await cache.put('other-complete-file', new Response('safe'))
  await assert.rejects(readModelAsset(asset, () => {}, {
    cache, fetch: async () => new Response(new Uint8Array([1, 2])),
  }), /interrupted/)
  assert.equal(await cache.match(asset.url), undefined)
  assert.equal(await (await cache.match('other-complete-file'))!.text(), 'safe')
})
test('repairs a corrupt cached asset using the pinned download', async () => {
  const cache = storage()
  await cache.put(asset.url, new Response('bad'))
  const result = await readModelAsset(asset, () => {}, {
    cache, fetch: async () => new Response('good'),
  })
  assert.equal(new TextDecoder().decode(result.bytes), 'good')
  assert.equal(await (await cache.match(asset.url))!.text(), 'good')
})
test('storage quota errors allow speech now but do not report a saved download', async () => {
  const cache = storage()
  cache.put = async () => { throw new DOMException('Full', 'QuotaExceededError') }
  const result = await readModelAsset(asset, () => {}, {
    cache, fetch: async () => new Response('good'),
  })
  assert.equal(result.saved, false)
  assert.equal(result.bytes.length, 4)
})
test('new model revisions never reuse an unrelated cached file', async () => {
  const cache = storage()
  await cache.put(asset.url, new Response('old!'))
  const next = { ...asset, url: 'https://models.example.org/new-revision/voice' }
  const result = await readModelAsset(next, () => {}, { cache, fetch: async () => new Response('new!') })
  assert.equal(new TextDecoder().decode(result.bytes), 'new!')
  assert.equal(await (await cache.match(asset.url))!.text(), 'old!')
})
test('calls the browser fetch API without binding it to a dependency object', async () => {
  const result = await readModelAsset(asset, () => {}, {
    fetch: async function(this: unknown) {
      assert.equal(this, undefined)
      return new Response('good')
    },
  })
  assert.equal(result.bytes.length, 4)
})
test('network failures explain the retry in plain language', async () => {
  await assert.rejects(readModelAsset(asset, () => {}, { fetch: async () => { throw new TypeError('Failed to fetch') } }), /check your internet connection/)
})
