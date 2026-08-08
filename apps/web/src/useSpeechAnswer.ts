import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
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
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!getRecognitionCtor()
}

export function useSpeechAnswer(options: {
  onTranscript: (finalChunk: string, interim: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => speechSupported())
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onTranscriptRef = useRef(options.onTranscript)
  onTranscriptRef.current = options.onTranscript

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.onend = null
        rec.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    setError(null)
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError(
        'Voice input needs Chrome, Edge, or Safari. Type your answer if speech is unavailable.',
      )
      return
    }
    stop()
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
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
      if (event.error === 'aborted' || event.error === 'no-speech') return
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission blocked. Allow mic access to answer by voice.'
          : `Speech error: ${event.error}`,
      )
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    try {
      recognitionRef.current = rec
      rec.start()
      setListening(true)
    } catch {
      setError('Could not start microphone. Check browser permissions.')
      setListening(false)
    }
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return { supported, listening, error, start, stop, setError }
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
