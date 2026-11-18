import init, { Model } from 'phonon-tts/raw'
import wasmUrl from 'phonon-tts/wasm/phonon_tts_simd_bg.wasm?url'
import { assets } from './assets'
let model: Model | undefined
let voice = 0
let busy = false
const send = (message: object, transfer: Transferable[] = []) => self.postMessage(message, { transfer })
async function download(url: string, progress: (bytes: number) => void) {
  // Deliberately bypass HTTP cache; never write CacheStorage or IndexedDB.
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit' })
  if (!response.ok) throw new Error(`Model download failed (${response.status}). Please try again.`)
  if (!response.body) throw new Error('This browser cannot stream the model download.')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); size += value.length; progress(value.length)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
self.onmessage = async ({ data }) => {
  if (busy) return
  busy = true
  try {
    if (data.type === 'load') {
      let loaded = 0
      const progress = (n: number) => { loaded += n; send({ type: 'progress', loaded }) }
      const [weights, tokenizer, config, speaker] = await Promise.all([
        download(assets.weights, progress), download(assets.tokenizer, progress),
        download(assets.config, progress), download(assets.voice, progress),
      ])
      send({ type: 'preparing' })
      await init({ module_or_path: wasmUrl })
      model = await Model.load(weights, tokenizer, config, 'q8', 'none', 'none', undefined, 'cpu')
      voice = model.add_voice(speaker)
      send({ type: 'ready' })
    } else if (data.type === 'generate' && model) {
      const chunks: Float32Array[] = []
      let samples = 0
      model.start_generation(voice, data.text, 0.7, BigInt(data.seed))
      while (model.next_chunk() !== undefined) {
        while (true) {
          const frame = await model.generation_step() as Float32Array | undefined
          if (!frame) break
          if (!frame.every(Number.isFinite)) throw new Error('The model produced invalid audio. Please retry.')
          chunks.push(frame); samples += frame.length
          send({ type: 'generating', seconds: samples / model.sample_rate() })
          if (samples > model.sample_rate() * 90) throw new Error('Generation exceeded 90 seconds. Try a shorter sentence.')
        }
      }
      if (!samples) throw new Error('No audio was generated. Try another sentence.')
      const pcm = new Float32Array(samples)
      let offset = 0
      for (const frame of chunks) { pcm.set(frame, offset); offset += frame.length }
      send({ type: 'audio', pcm, sampleRate: model.sample_rate() }, [pcm.buffer])
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally { busy = false }
}
