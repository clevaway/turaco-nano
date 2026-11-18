const revision = '6c36009c7722ca3342bf907227921699ec7043bb'
const hf = `https://huggingface.co/fotiecodes/turaco-nano-tts-wes/resolve/${revision}`
export const assets = {
  weights: { url: `${hf}/browser/model.q8.gguf`, bytes: 177252320 },
  config: { url: `${hf}/browser/config.json`, bytes: 1210 },
  tokenizer: { url: `${hf}/tokenizer.json`, bytes: 245020 },
  voice: { url: `${hf}/voice.safetensors`, bytes: 2361136 },
}
export const modelAssets = Object.values(assets)
export const downloadBytes = modelAssets.reduce((total, asset) => total + asset.bytes, 0)
