import { wav } from './wav.ts'

/** Unlock this same player during the Generate gesture for browsers with strict audio policies. */
export function preparePlayback(player: HTMLAudioElement): void {
  const silence = URL.createObjectURL(wav(new Float32Array(240), 24000))
  player.src = silence
  void player.play().then(() => {
    if (player.src === silence) player.pause()
  }).catch(() => {}).finally(() => URL.revokeObjectURL(silence))
}

/** Start the completed result; keep manual controls available when browser settings block playback. */
export async function playResult(player: HTMLAudioElement): Promise<boolean> {
  try { await player.play(); return true }
  catch { return false }
}
