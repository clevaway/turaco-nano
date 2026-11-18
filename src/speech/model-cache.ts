export const MODEL_CACHE = 'turaco-models-v1'
export type ModelAsset = { url: string; bytes: number }
type AssetProgress = { bytes: number; cached: boolean }
type CacheAccess = Pick<Cache, 'match' | 'put' | 'delete'>
type AssetDependencies = { cache?: CacheAccess; fetch: typeof fetch }

export async function openModelCache(): Promise<Cache | undefined> {
  try { return await caches.open(MODEL_CACHE) } catch { return undefined }
}

/** Only complete, validated files are saved. Completed files survive interrupted downloads. */
export async function readModelAsset(
  asset: ModelAsset,
  progress: (update: AssetProgress) => void,
  dependencies: AssetDependencies,
): Promise<{ bytes: Uint8Array; saved: boolean }> {
  const { cache, fetch: request } = dependencies
  let response: Response | undefined
  try { response = await cache?.match(asset.url) } catch { /* Storage may be unavailable. */ }
  if (response) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length === asset.bytes) {
      progress({ bytes: bytes.length, cached: true })
      return { bytes, saved: true }
    }
    // An incomplete/corrupt file is repaired; valid model downloads never expire.
    try { await cache?.delete(asset.url) } catch { /* Retry from the network. */ }
  }
  try { response = await request(asset.url, { credentials: 'omit' }) }
  catch { throw new Error('Please check your internet connection and try again. Files already saved will be reused.') }
  if (!response.ok || !response.body) throw new Error('The download was interrupted. Check your connection and try again. Files already saved will be reused.')
  const reader = response.body.getReader()
  const bytes = new Uint8Array(asset.bytes)
  let offset = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (offset + value.length > asset.bytes) {
      await reader.cancel()
      throw new Error('The voice download could not be verified. Please try again.')
    }
    bytes.set(value, offset); offset += value.length
    progress({ bytes: value.length, cached: false })
  }
  if (offset !== asset.bytes) throw new Error('The download was interrupted. Check your connection and try again.')
  let saved = false
  if (cache) {
    try {
      await cache.put(asset.url, new Response(bytes.slice().buffer, { headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(bytes.length),
        'X-Turaco-Complete': String(bytes.length),
      } }))
      saved = true
    } catch { /* Speech can still run when the browser cannot save the download. */ }
  }
  return { bytes, saved }
}

export async function hasSavedModel(assets: ModelAsset[]): Promise<boolean> {
  const cache = await openModelCache()
  if (!cache) return false
  try {
    const entries = await Promise.all(assets.map(asset => cache.match(asset.url)))
    return entries.every((entry, i) => entry?.headers.get('X-Turaco-Complete') === String(assets[i].bytes))
  } catch { return false }
}
