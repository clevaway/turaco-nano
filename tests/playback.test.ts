import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparePlayback, playResult } from '../src/speech/playback.ts'

test('prepares the same player synchronously during the Generate gesture', async () => {
  let starts = 0
  let pauses = 0
  const player = { src: '', play() { starts++; return Promise.resolve() }, pause() { pauses++ } }
  preparePlayback(player as HTMLAudioElement)
  assert.equal(starts, 1)
  assert.match(player.src, /^blob:/)
  await Promise.resolve()
  assert.equal(pauses, 1)
})
test('late silent preparation never pauses the real speech result', async () => {
  let resolve!: () => void
  let pauses = 0
  const player = { src: '', play() { return new Promise<void>(done => { resolve = done }) }, pause() { pauses++ } }
  preparePlayback(player as HTMLAudioElement)
  player.src = 'blob:completed-speech'
  resolve()
  await Promise.resolve()
  assert.equal(pauses, 0)
})
test('starts completed speech and handles browser autoplay restrictions without rejecting', async () => {
  assert.equal(await playResult({ play: async () => {} } as HTMLAudioElement), true)
  assert.equal(await playResult({ play: async () => { throw new DOMException('Blocked', 'NotAllowedError') } } as HTMLAudioElement), false)
})
