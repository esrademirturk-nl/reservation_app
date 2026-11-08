import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { LANGS, placeById, type Lang, type Place } from '../data/places'

/**
 * Audio guide player shared by the place page and the mini player.
 * Narration uses the browser's speech synthesis; one sentence at a time so the transcript can follow along.
 */
interface AudioState {
  place?: Place
  lang: Lang
  playing: boolean
  cur: number // current sentence
  elapsed: number // seconds
  speed: number
  sentences: string[]
  total: number
  status: string
  load: (placeId: string) => void
  toggle: () => void
  playFrom: (i: number) => void
  seek: (sec: number) => void
  setLang: (l: Lang) => void
  cycleSpeed: () => void
  close: () => void
}

const Ctx = createContext<AudioState | null>(null)
export const useAudio = () => useContext(Ctx)!

const SPEEDS = [0.75, 1, 1.25, 1.5]
const split = (t: string) => (t.match(/[^.!?]+[.!?]+/g) ?? [t]).map((s) => s.trim())

export function AudioProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place>()
  const [lang, setLangState] = useState<Lang>('en')
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [status, setStatus] = useState('')
  const token = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  const text = place ? (place.narration[lang] ?? place.narration.en) : ''
  const sentences = text ? split(text) : []
  const total = place?.seconds ?? 0
  const bounds = useCallback(() => {
    const tot = sentences.reduce((a, s) => a + s.length, 0) || 1
    let acc = 0
    return sentences.map((s) => {
      const start = (acc / tot) * total
      acc += s.length
      return [start, (acc / tot) * total] as const
    })
  }, [sentences, total])

  const stop = useCallback(() => {
    token.current++
    window.clearInterval(timer.current)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback(
    (i: number, rate = speed) => {
      stop()
      if (i >= sentences.length) {
        setPlaying(false)
        setCur(0)
        setElapsed(0)
        return
      }
      const b = bounds()[i]
      setCur(i)
      setElapsed(b[0])
      setPlaying(true)
      const my = token.current
      // Simulated clock keeps the progress bar moving even without speech support
      timer.current = window.setInterval(() => setElapsed((e) => Math.min(b[1] - 0.2, e + 0.25 * rate)), 250)
      if (!('speechSynthesis' in window)) {
        setStatus('Speech is not available in this browser')
        globalThis.setTimeout(() => token.current === my && speak(i + 1, rate), ((b[1] - b[0]) / rate) * 1000)
        return
      }
      const u = new SpeechSynthesisUtterance(sentences[i])
      const L = LANGS.find((l) => l.code === lang)!
      u.lang = L.voice
      u.rate = rate
      const v = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(L.code))
      if (v) u.voice = v
      u.onend = () => token.current === my && speak(i + 1, rate)
      window.speechSynthesis.speak(u)
    },
    [bounds, lang, sentences, speed, stop],
  )

  useEffect(() => stop, [stop])

  const value: AudioState = {
    place, lang, playing, cur, elapsed, speed, sentences, total, status,
    load: (id) => {
      if (place?.id === id) return
      stop()
      setPlace(placeById(id))
      setPlaying(false)
      setCur(0)
      setElapsed(0)
      setStatus('')
    },
    toggle: () => (playing ? (stop(), setPlaying(false)) : speak(cur)),
    playFrom: (i) => speak(i),
    seek: (sec) => {
      const b = bounds()
      let i = b.findIndex((x) => sec < x[1])
      if (i < 0) i = b.length - 1
      if (playing) speak(i)
      else {
        setCur(i)
        setElapsed(b[i][0])
      }
    },
    setLang: (l) => {
      stop()
      setLangState(l)
      setPlaying(false)
      setCur(0)
      setElapsed(0)
    },
    cycleSpeed: () => {
      const n = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
      setSpeed(n)
      if (playing) speak(cur, n)
    },
    close: () => {
      stop()
      setPlaying(false)
      setPlace(undefined)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
