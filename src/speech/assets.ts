const revision = '6c36009c7722ca3342bf907227921699ec7043bb'
const hf = `https://huggingface.co/fotiecodes/turaco-nano-tts-wes/resolve/${revision}`
export const assets = {
  weights: `${hf}/browser/model.q8.gguf`,
  config: `${hf}/browser/config.json`,
  tokenizer: `${hf}/tokenizer.json`,
  voice: `${hf}/voice.safetensors`,
}
export const downloadBytes = 179859686
