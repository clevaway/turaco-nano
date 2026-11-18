import init, { Model } from 'phonon-tts/raw'
import wasmUrl from 'phonon-tts/wasm/phonon_tts_simd_bg.wasm?url'
import { assets } from './assets'
import { openModelCache, readModelAsset } from './model-cache'
let model: Model | undefined
let voice = 0
let busy = false
const send = (message: object, transfer: Transferable[] = []) => self.postMessage(message, { transfer })
self.onmessage = async ({ data }) => {
  if (busy) return
  busy = true
  try {
    if (data.type !== 'generate') return
    if (!model) {
      let loaded = 0
      let downloaded = 0
      const cache = await openModelCache()
      const progress = (update: { bytes: number; cached: boolean }) => {
        loaded += update.bytes
        if (!update.cached) downloaded += update.bytes
        send({ type: 'progress', loaded, downloaded })
      }
      const read = (asset: { url: string; bytes: number }) => readModelAsset(asset, progress, { cache, fetch })
      const results = await Promise.all([read(assets.weights), read(assets.tokenizer), read(assets.config), read(assets.voice)])
      const [weights, tokenizer, config, speaker] = results.map(result => result.bytes)
      send({ type: 'saved', saved: results.every(result => result.saved) })
      send({ type: 'preparing' })
      await init({ module_or_path: wasmUrl })
      model = await Model.load(weights, tokenizer, config, 'q8', 'none', 'none', undefined, 'cpu')
      voice = model.add_voice(speaker)
    }
    if (model) {
      send({ type: 'generating', seconds: 0 })
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
