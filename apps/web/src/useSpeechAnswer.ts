import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives?: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** iOS/Android WebViews and desktop Firefox often lack SpeechRecognition. */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!getRecognitionCtor()
}

export function speechSecureContext(): boolean {
  return typeof window !== 'undefined' && !!window.isSecureContext
}

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function isAndroidUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isAppleMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Mic permission warm-up. Web Speech has its own prompt, but getUserMedia
 * surfaces a clearer permission UI on Android Chrome / some iOS versions.
 * Failures are non-fatal — recognition may still work.
 */
async function warmMicPermission(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    for (const track of stream.getTracks()) track.stop()
    return null
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Microphone permission blocked. Allow mic access (Safari/Chrome site settings), then try Speak again.'
    }
    if (name === 'NotFoundError') {
      return 'No microphone found. Type your answer instead.'
    }
    return null
  }
}

export function useSpeechAnswer(options: {
  onTranscript: (finalChunk: string, interim: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => speechSupported())
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListenRef = useRef(false)
  const startingRef = useRef(false)
  const onTranscriptRef = useRef(options.onTranscript)
  onTranscriptRef.current = options.onTranscript

  const stop = useCallback(() => {
    wantListenRef.current = false
    startingRef.current = false
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.onend = null
        rec.onerror = null
        rec.onresult = null
        rec.onstart = null
        rec.stop()
      } catch {
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const beginRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError(
        'Voice input isn’t supported in this browser. Type your answer — AI coaching works the same.',
      )
      wantListenRef.current = false
      setListening(false)
      return
    }
    if (!speechSecureContext()) {
      setError('Voice input needs HTTPS. Open practiceoutloud.com and try again, or type your answer.')
      wantListenRef.current = false
      setListening(false)
      return
    }

    // Tear down prior instance without clearing wantListenRef.
    const prev = recognitionRef.current
    if (prev) {
      try {
        prev.onend = null
        prev.onerror = null
        prev.onresult = null
        prev.onstart = null
        prev.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }

    const mobile = isMobileUa()
    const rec = new Ctor()
    // iOS Safari largely ignores continuous=true and ends after a pause;
    // restart from onend while the user still wants to listen.
    rec.continuous = !mobile
    rec.interimResults = true
    rec.lang = 'en-US'
    if (typeof rec.maxAlternatives === 'number') rec.maxAlternatives = 1

    rec.onstart = () => {
      startingRef.current = false
      setListening(true)
    }
    rec.onresult = (event) => {
      let interim = ''
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalChunk += `${piece} `
        else interim += piece
      }
      onTranscriptRef.current(finalChunk.trim(), interim.trim())
    }
    rec.onerror = (event) => {
      startingRef.current = false
      // Transient / expected — keep session or let onend restart on mobile.
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') {
        // Mobile: recognition ends; onend may restart. Don't flash an error.
        return
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantListenRef.current = false
        setError(
          'Microphone permission blocked. Allow mic access for this site, then tap Speak again — or type your answer.',
        )
        setListening(false)
        recognitionRef.current = null
        return
      }
      if (event.error === 'audio-capture') {
        wantListenRef.current = false
        setError('Could not capture audio. Check your mic, or type your answer.')
        setListening(false)
        recognitionRef.current = null
        return
      }
      if (event.error === 'network') {
        setError(
          'Speech service network error. Check connectivity, try Speak again, or type your answer.',
        )
        // Don't force-stop wantListen — onend may still fire.
        return
      }
      setError(`Speech error: ${event.error}. You can type your answer instead.`)
    }
    rec.onend = () => {
      recognitionRef.current = null
      startingRef.current = false
      // Mobile / short sessions: auto-restart while user still wants listening.
      if (wantListenRef.current) {
        window.setTimeout(() => {
          if (!wantListenRef.current) {
            setListening(false)
            return
          }
          try {
            beginRecognition()
          } catch {
            wantListenRef.current = false
            setListening(false)
            setError('Voice session ended. Tap Speak to continue, or type your answer.')
          }
        }, mobile ? 180 : 0)
        return
      }
      setListening(false)
    }

    recognitionRef.current = rec
    startingRef.current = true
    try {
      rec.start()
    } catch {
      startingRef.current = false
      recognitionRef.current = null
      // InvalidStateError if already started — retry once after abort.
      try {
        const retry = new Ctor()
        retry.continuous = !mobile
        retry.interimResults = true
        retry.lang = 'en-US'
        recognitionRef.current = retry
        retry.onresult = rec.onresult
        retry.onerror = rec.onerror
        retry.onend = rec.onend
        retry.onstart = rec.onstart
        retry.start()
        startingRef.current = true
      } catch {
        wantListenRef.current = false
        setListening(false)
        setError('Could not start microphone. Check browser permissions, or type your answer.')
      }
    }
  }, [])

  const start = useCallback(() => {
    setError(null)
    if (!supported) {
      setError(
        'Voice input isn’t supported in this browser. Type your answer — AI coaching works the same.',
      )
      return
    }
    if (!speechSecureContext()) {
      setError('Voice input needs HTTPS. Open practiceoutloud.com and try again, or type your answer.')
      return
    }
    if (wantListenRef.current || listening || startingRef.current) {
      stop()
      return
    }
    wantListenRef.current = true
    setListening(true)

    // iOS: start recognition synchronously in the user-gesture turn.
    // Async getUserMedia before start() breaks Safari's gesture requirement.
    if (isAppleMobileUa()) {
      beginRecognition()
      return
    }

    // Android Chrome: warm mic permission first for a clearer prompt, then start.
    if (isAndroidUa()) {
      void warmMicPermission().then((permErr) => {
        if (permErr) {
          wantListenRef.current = false
          setListening(false)
          setError(permErr)
          return
        }
        if (!wantListenRef.current) return
        beginRecognition()
      })
      return
    }

    beginRecognition()
  }, [beginRecognition, listening, stop, supported])

  useEffect(() => () => stop(), [stop])

  return {
    supported,
    listening,
    error,
    start,
    stop,
    setError,
    secureContext: typeof window !== 'undefined' ? speechSecureContext() : true,
  }
}

export function speakText(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1
  utter.lang = 'en-US'
  window.speechSynthesis.speak(utter)
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
