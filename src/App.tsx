import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, AudioLines, Check, Download, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { downloadBytes, modelAssets } from './speech/assets'
import { hasSavedModel } from './speech/model-cache'
import { prepareOfflineApp, requestPersistentStorage } from './offline/register'
import { wav } from './speech/wav'
import { examples } from './examples'
import { preparePlayback, playResult } from './speech/playback'

type Status = 'idle' | 'loading' | 'preparing' | 'ready' | 'generating' | 'error'
const modelUrl = 'https://huggingface.co/fotiecodes/turaco-nano-tts-wes'
export default function App() {
  const [text, setText] = useState(examples[0])
  const [status, setStatus] = useState<Status>('idle')
  const [loaded, setLoaded] = useState(0)
  const [downloaded, setDownloaded] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [audio, setAudio] = useState('')
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [offlineUnavailable, setOfflineUnavailable] = useState(false)
  const worker = useRef<Worker | null>(null)
  const running = useRef(false)
  const audioUrl = useRef('')
  const player = useRef<HTMLAudioElement>(null)
  const releaseAudio = useCallback(() => {
    player.current?.pause()
    player.current?.removeAttribute('src')
    player.current?.load()
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    audioUrl.current = ''; setAudio(''); setPlaybackBlocked(false)
  }, [])
  useEffect(() => {
    let mounted = true
    void hasSavedModel(modelAssets).then(value => { if (mounted) setSaved(value) })
    void prepareOfflineApp().then(value => { if (mounted) { setOfflineReady(value); setOfflineUnavailable(!value && import.meta.env.PROD) } })
    return () => {
      mounted = false
      worker.current?.terminate(); worker.current = null
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
      // Release working memory only. Saved model and app files remain in browser storage.
    }
  }, [])
  useEffect(() => {
    if (!audio || !player.current) return
    let current = true
    player.current.src = audio
    void playResult(player.current).then(played => {
      if (current) setPlaybackBlocked(!played)
    })
    return () => { current = false }
  }, [audio])
  function cancel() {
    worker.current?.terminate(); worker.current = null; running.current = false
    releaseAudio(); setStatus('idle'); setLoaded(0); setDownloaded(0); setSeconds(0); setError('')
  }
  function generate() {
    if (running.current || !text.trim()) return
    running.current = true
    requestPersistentStorage()
    releaseAudio(); setSeconds(0); setError('')
    if (player.current) preparePlayback(player.current)
    setLoaded(0); setDownloaded(0)
    setStatus(worker.current ? 'generating' : 'loading')
    let next = worker.current
    if (!next) {
      next = new Worker(new URL('./speech/speech.worker.ts', import.meta.url), { type: 'module' })
      worker.current = next
      const activeWorker = next
      next.onmessage = ({ data }) => {
        if (worker.current !== activeWorker) return
        if (data.type === 'progress') { setLoaded(data.loaded); setDownloaded(data.downloaded) }
        else if (data.type === 'preparing') setStatus('preparing')
        else if (data.type === 'saved') { setSaved(data.saved); setSaveFailed(!data.saved) }
        else if (data.type === 'generating') { setStatus('generating'); setSeconds(data.seconds) }
        else if (data.type === 'audio') {
          releaseAudio()
          audioUrl.current = URL.createObjectURL(wav(data.pcm, data.sampleRate))
          setAudio(audioUrl.current); setStatus('ready'); running.current = false
        } else if (data.type === 'error') {
          activeWorker.terminate(); worker.current = null; running.current = false
          setError(data.message); setStatus('error')
        }
      }
      next.onerror = () => {
        if (worker.current !== activeWorker) return
        activeWorker.terminate(); worker.current = null; running.current = false
        setError('The voice could not start. Try a current browser and close other tabs to free some memory.')
        setStatus('error')
      }
    }
    // One action loads saved files or downloads them, then speaks this exact text.
    next.postMessage({ type: 'generate', text: text.trim(), seed: crypto.getRandomValues(new Uint32Array(1))[0] })
  }
  const downloading = status === 'loading' || status === 'preparing'
  const busy = downloading || status === 'generating'
  const percent = Math.min(100, loaded / downloadBytes * 100)
  const openingSavedVoice = status === 'loading' && saved && downloaded === 0
  const savedMessage = saved ? (offlineReady ? 'Saved on this device · available offline' : 'Voice saved in this browser') : 'First use downloads about 180 MB · kept for next time'
  const statusMessage = status === 'loading' ? (downloaded ? `Downloading voice · ${(downloaded / 1e6).toFixed(1)} / 180 MB` : 'Opening your voice…')
    : status === 'preparing' ? 'Getting your voice ready…'
    : status === 'generating' ? `Creating speech · ${seconds.toFixed(1)}s of audio`
    : savedMessage
  return (
    <div className="site-shell">
      <header className="site-header">
        <a href="#" className="wordmark" aria-label="Turaco Nano TTS home"><span>Turaco<span className="wordmark-secondary"> Nano TTS</span></span></a>
        <a className="quiet-link" href={modelUrl} target="_blank" rel="noreferrer">Model & research <ArrowUpRight aria-hidden="true" /></a>
      </header>
      <main>
        <section className="intro" aria-labelledby="title">
          <p className="intro-label">RESEARCH PREVIEW</p>
          <h1 id="title">Cameroon Pidgin, in speech.</h1>
          <div className="intro-description">
            <p>A lightweight speech model from Project Turaco.</p>
            <p>Give it some text and listen. Results may vary.</p>
          </div>
        </section>
        <section className="studio" aria-label="Speech playground">
          <div className="studio-top"><span className="eyebrow">PLAYGROUND</span><Badge variant="secondary">Cameroon Pidgin · WES</Badge></div>
          <FieldGroup>
            <Field>
              <div className="label-line"><FieldLabel htmlFor="speech-text">What would you like to say?</FieldLabel><span className="character-count">{text.length} / 300</span></div>
              <Textarea id="speech-text" placeholder={examples[0]} value={text} maxLength={300} onChange={e => setText(e.target.value)} aria-describedby="text-tip" disabled={busy} />
            </Field>
          </FieldGroup>
          <div className="example-line"><Button variant="ghost" size="sm" onClick={() => setText(examples[(examples.indexOf(text) + 1) % examples.length])} disabled={busy}>Try an example <ArrowUpRight data-icon="inline-end" /></Button><span id="text-tip">Short sentences work best.</span></div>
          <Separator />
          <div className="model-row">
            <div className="model-description"><span className="model-name">turaco-nano-tts-wes <span className="model-edition">01</span></span><span className="model-status" data-downloaded-bytes={downloaded} role="status" aria-live="polite">{statusMessage}</span></div>
            {busy && <div className="model-actions"><Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button></div>}
          </div>
          {downloading && <Progress value={status === 'loading' ? percent : null} aria-label={openingSavedVoice ? 'Opening saved voice' : status === 'loading' ? 'Voice download' : 'Getting ready'} />}
          {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Something interrupted your speech</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {saveFailed && <Alert><AlertCircle /><AlertTitle>Your voice couldn’t be saved</AlertTitle><AlertDescription>You can still listen now. Your browser may need to download the voice again on your next visit. Free some storage or try another browser to keep it for later.</AlertDescription></Alert>}
          {saved && offlineUnavailable && <Alert><AlertCircle /><AlertTitle>Keep this page open when offline</AlertTitle><AlertDescription>Your voice is saved, but this browser couldn’t save the page for offline reopening. Try another browser if you want to reopen it without internet.</AlertDescription></Alert>}
          <div className="generate-row"><span className="session-note"><ShieldCheck aria-hidden="true" />{saved ? 'Your download stays here for next time.' : 'Download once. Come back and use it again.'}</span><Button size="lg" disabled={busy || !text.trim()} onClick={generate}>{busy ? <Spinner data-icon="inline-start" /> : <AudioLines data-icon="inline-start" />}{status === 'loading' ? (openingSavedVoice ? 'Opening voice' : 'Downloading voice') : status === 'preparing' ? 'Getting ready' : status === 'generating' ? 'Creating speech' : 'Generate speech'}</Button></div>
          <div className="result" hidden={!audio}><div className="result-heading"><span><Check aria-hidden="true" />Your speech is ready</span><a className="quiet-link" href={audio || undefined} download="turaco-nano-tts-wes.wav"><Download aria-hidden="true" />Download WAV</a></div><audio ref={player} controls preload="metadata" aria-label="Generated Pidgin speech" />{playbackBlocked && <p className="playback-hint" role="status">Tap play to listen.</p>}</div>
        </section>
        <div className="below-studio"><span><ShieldCheck aria-hidden="true" />Your text stays on your device.</span><span>No account. No speech server.</span></div>
        <div className="experiment-notes" aria-label="About the experiment">
          <section className="experiment-section" aria-labelledby="why-nano">
            <p className="section-index">01 · Project Turaco</p>
            <div className="experiment-copy">
              <h2 id="why-nano">Applied research, starting with Pidgin.</h2>
              <p>Project Turaco is an independent applied AI research initiative focused on underrepresented African languages, starting with Cameroon Pidgin English. Through model adaptation, fine-tuning and experimentation, our work spans language models, translation, speech synthesis and speech recognition.</p>
              <p>turaco-nano-tts-wes explores lighter, local speech for chat interfaces, smartphones and edge devices. This demo runs on your device’s CPU; phone performance and latency improvements remain to be measured. We share models and findings to help the wider community build on this work.</p>
              <dl className="experiment-facts">
                <div><dt>Parameters</dt><dd>109.5M</dd></div>
                <div><dt>Browser download</dt><dd>~180 MB</dd></div>
                <div><dt>Speech generation</dt><dd>On device</dd></div>
              </dl>
            </div>
          </section>
          <Separator />
          <section className="experiment-section" aria-labelledby="turaco-family">
            <p className="section-index">02 · The Turaco family</p>
            <div className="experiment-copy">
              <h2 id="turaco-family">The same language. A smaller footprint.</h2>
              <p>Our earlier <a href="https://huggingface.co/fotiecodes/turaco-csm-tts-wes-1b" target="_blank" rel="noreferrer">Turaco CSM experiment</a> explores Cameroon Pidgin with a larger model. turaco-nano-tts-wes takes that work toward a different deployment budget: 177 MB of browser weights, compared with the earlier release’s 3.30 GB checkpoint.</p>
              <p>A smaller footprint comes with tradeoffs. This is an early, single-voice experiment; pronunciation, rhythm and expression can be uneven. We haven’t established speech-quality parity or a latency advantage over CSM.</p>
              <p className="measurement-note">Weight files use different precisions: CSM FP16, turaco-nano-tts-wes a mix of Q8 and FP32. These are file sizes, not runtime memory measurements. The <a href={modelUrl} target="_blank" rel="noreferrer">model card</a> documents the base model, adaptation, dataset and evaluation limits.</p>
              <a className="experiment-link" href="https://huggingface.co/fotiecodes/turaco-csm-tts-wes-1b" target="_blank" rel="noreferrer">Explore Turaco CSM on Hugging Face <ArrowUpRight aria-hidden="true" /></a>
            </div>
          </section>
          <Separator />
          <section className="experiment-section" aria-labelledby="applications">
            <p className="section-index">03 · Use cases</p>
            <div className="experiment-copy">
              <h2 id="applications">A voice for everyday tools.</h2>
              <p>Bring spoken Pidgin to learning tools, AI assistants and local services, including places where internet access is unreliable.</p>
              <ul className="application-list">
                <li><h3>Education and literacy</h3><p>Read lessons, stories and practice exercises aloud in Pidgin, helping learners follow along in a familiar language.</p></li>
                <li><h3>Spoken AI assistants</h3><p>Give chat and assistant replies a Pidgin voice. Pair it with locally running language models to bring spoken interactions to phones without a cloud speech service.</p></li>
                <li><h3>Community information and services</h3><p>Turn notices, farming information and service instructions into spoken Pidgin. Keep the content and voice on the device so people can listen without a connection.</p></li>
              </ul>
              <p className="measurement-note">After the first download, speech generation works offline. Phone performance and suitability for each application still need evaluation.</p>
            </div>
          </section>
        </div>
      </main>
      <footer><span>Turaco Nano TTS · Research preview</span><div><a href={modelUrl} target="_blank" rel="noreferrer">Model card <ArrowUpRight aria-hidden="true" /></a><a href="https://clevaway.com" target="_blank" rel="noreferrer">Research by Clevaway <ArrowUpRight aria-hidden="true" /></a></div></footer>
    </div>
  )
}
