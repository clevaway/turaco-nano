import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, AudioLines, Check, Download, ShieldCheck, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { downloadBytes } from './speech/assets'
import { wav } from './speech/wav'

type Status = 'idle' | 'loading' | 'preparing' | 'ready' | 'generating' | 'error'
const modelUrl = 'https://huggingface.co/fotiecodes/turaco-nano-tts-wes'
const examples = ['How you dey? A hope say you dey fine.', 'We go meet for market tomorrow morning.', 'Dis na we own voice. Make we tell we story.']
export default function App() {
  const [text, setText] = useState(examples[0])
  const [status, setStatus] = useState<Status>('idle')
  const [loaded, setLoaded] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [audio, setAudio] = useState('')
  const worker = useRef<Worker | null>(null)
  const audioUrl = useRef('')
  const player = useRef<HTMLAudioElement>(null)
  const releaseAudio = useCallback(() => {
    player.current?.pause()
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    audioUrl.current = ''; setAudio('')
  }, [])
  const clear = useCallback(() => {
    // Terminating the worker drops its WASM heap and cancels its fetches, even while busy.
    worker.current?.terminate(); worker.current = null
    releaseAudio(); setStatus('idle'); setLoaded(0); setSeconds(0); setError('')
  }, [releaseAudio])
  useEffect(() => {
    window.addEventListener('pagehide', clear)
    return () => { window.removeEventListener('pagehide', clear); clear() }
  }, [clear])
  function load() {
    clear(); setStatus('loading')
    const next = new Worker(new URL('./speech/speech.worker.ts', import.meta.url), { type: 'module' })
    worker.current = next
    next.onmessage = ({ data }) => {
      if (worker.current !== next) return
      if (data.type === 'progress') setLoaded(data.loaded)
      else if (data.type === 'preparing') setStatus('preparing')
      else if (data.type === 'ready') setStatus('ready')
      else if (data.type === 'generating') setSeconds(data.seconds)
      else if (data.type === 'audio') {
        releaseAudio()
        audioUrl.current = URL.createObjectURL(wav(data.pcm, data.sampleRate))
        setAudio(audioUrl.current); setStatus('ready')
      } else if (data.type === 'error') {
        next.terminate(); worker.current = null; setError(data.message); setStatus('error')
      }
    }
    next.onerror = () => {
      if (worker.current !== next) return
      next.terminate(); worker.current = null
      setError('The speech engine could not start. Try a current browser with WebAssembly support and enough free memory.')
      setStatus('error')
    }
    next.postMessage({ type: 'load' })
  }
  function generate() {
    if (status !== 'ready' || !text.trim()) return
    releaseAudio(); setSeconds(0); setStatus('generating')
    worker.current?.postMessage({ type: 'generate', text: text.trim(), seed: crypto.getRandomValues(new Uint32Array(1))[0] })
  }
  const downloading = status === 'loading' || status === 'preparing'
  const active = downloading || status === 'ready' || status === 'generating'
  const percent = Math.min(100, loaded / downloadBytes * 100)
  return (
    <div className="site-shell">
      <header className="site-header">
        <a href="#" className="wordmark" aria-label="Turaco Nano TTS home"><span>Turaco<span className="wordmark-secondary"> Nano TTS</span></span></a>
        <a className="quiet-link" href={modelUrl} target="_blank" rel="noreferrer">Model & research <ArrowUpRight aria-hidden="true" /></a>
      </header>
      <main>
        <section className="intro" aria-labelledby="title">
          <p className="intro-label">PROJECT TURACO</p>
          <h1 id="title">Cameroon Pidgin, in speech.</h1>
          <div className="intro-description">
            <p>A lightweight text-to-speech research model.</p>
            <p>Give it some text and hear how it sounds.</p>
          </div>
        </section>
        <section className="studio" aria-label="Speech playground">
          <div className="studio-top"><span className="eyebrow">PLAYGROUND</span><Badge variant="secondary">Cameroon Pidgin · WES</Badge></div>
          <FieldGroup>
            <Field>
              <div className="label-line"><FieldLabel htmlFor="speech-text">What would you like to say?</FieldLabel><span className="character-count">{text.length} / 300</span></div>
              <Textarea id="speech-text" value={text} maxLength={300} onChange={e => setText(e.target.value)} aria-describedby="text-tip" disabled={status === 'generating'} />
            </Field>
          </FieldGroup>
          <div className="example-line"><Button variant="ghost" size="sm" onClick={() => setText(examples[(examples.indexOf(text) + 1) % examples.length])} disabled={status === 'generating'}>Try an example <ArrowUpRight data-icon="inline-end" /></Button><span id="text-tip">Short sentences work best.</span></div>
          <Separator />
          <div className="model-row">
            <div className="model-description"><span className="model-name">turaco-nano-tts-wes <span className="model-edition">01</span></span><span className="model-status" role="status" aria-live="polite">{status === 'idle' ? 'Not loaded · ~180 MB download' : status === 'loading' ? `Downloading · ${(loaded / 1e6).toFixed(1)} MB` : status === 'preparing' ? 'Preparing the voice on your device…' : status === 'generating' ? `Creating speech · ${seconds.toFixed(1)}s of audio` : status === 'ready' ? 'Ready · running on your device' : 'Model unavailable'}</span></div>
            <div className="model-actions">{active && <Button variant="ghost" size="sm" onClick={clear}><Trash2 data-icon="inline-start" />Clear model</Button>}{!active && <Button variant="outline" size="lg" onClick={load}><ArrowDown data-icon="inline-start" />{status === 'error' ? 'Retry download' : 'Load model'}</Button>}</div>
          </div>
          {downloading && <Progress value={status === 'loading' ? percent : null} aria-label={status === 'loading' ? 'Model download' : 'Preparing model'} />}
          {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Something interrupted the model</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="generate-row"><span className="session-note"><ShieldCheck aria-hidden="true" />Temporary download. This tab only.</span><Button size="lg" disabled={status !== 'ready' || !text.trim()} onClick={generate}>{status === 'generating' ? <Spinner data-icon="inline-start" /> : <AudioLines data-icon="inline-start" />}{status === 'generating' ? 'Creating speech' : 'Generate speech'}</Button></div>
          {audio && <div className="result"><div className="result-heading"><span><Check aria-hidden="true" />Your speech is ready</span><a className="quiet-link" href={audio} download="turaco-nano-tts-wes.wav"><Download aria-hidden="true" />Download WAV</a></div><audio ref={player} controls src={audio} preload="metadata" aria-label="Generated Pidgin speech" /></div>}
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
            <p className="section-index">03 · What we’re testing toward</p>
            <div className="experiment-copy">
              <h2 id="applications">More places for Pidgin speech.</h2>
              <p>These are directions we want to explore in future experiments.</p>
              <ul className="application-list">
                <li><h3>Voice for chat</h3><p>Short spoken replies in Pidgin, with less dependence on a remote speech service.</p></li>
                <li><h3>Local mobile experiences</h3><p>Speech on smartphones and edge devices, where memory, connectivity and compute are limited.</p></li>
                <li><h3>Reading and learning</h3><p>Trying spoken versions of short passages, learning material and everyday information.</p></li>
              </ul>
              <p className="measurement-note">Try it, listen critically, and compare. Native-speaker feedback on words, accent and intonation will help guide the next experiment.</p>
            </div>
          </section>
        </div>
      </main>
      <footer><span>Turaco Nano TTS · Research preview</span><div><a href={modelUrl} target="_blank" rel="noreferrer">Model card <ArrowUpRight aria-hidden="true" /></a><a href="https://clevaway.com" target="_blank" rel="noreferrer">Research by Clevaway <ArrowUpRight aria-hidden="true" /></a></div></footer>
    </div>
  )
}
