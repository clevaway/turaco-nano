import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wav } from '../src/speech/wav.ts'
test('exports valid mono 24 kHz PCM WAV with clamped signed samples', async () => {
  const blob = wav(new Float32Array([-2, -1, 0, 1, 2]), 24000)
  const bytes = await blob.arrayBuffer()
  const view = new DataView(bytes)
  assert.equal(blob.type, 'audio/wav')
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF')
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE')
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8)
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 24000)
  assert.equal(view.getUint32(40, true), 10)
  assert.deepEqual(Array.from({ length: 5 }, (_, i) => view.getInt16(44 + i * 2, true)), [-32767, -32767, 0, 32767, 32767])
})
