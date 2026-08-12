import type { Feedback } from './api'

const KEY = 'ats_attempt_replay_v1'

export type AttemptSnapshot = {
  score: number
  answer: string
  at: string
  provider?: string
  dims?: { content: number; clarity: number; delivery: number }
}

export type QuestionReplay = {
  trackId: string
  questionId: string
  /** Best scoring attempt (ties → most recent). */
  best: AttemptSnapshot
  /** Most recent submission. */
  latest: AttemptSnapshot
  history: AttemptSnapshot[]
}

type Store = Record<string, QuestionReplay>

function storageKey(trackId: string, questionId: string) {
  return `${trackId}::${questionId}`
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* ignore quota */
  }
}

export function getQuestionReplay(
  trackId: string,
  questionId: string,
): QuestionReplay | null {
  return readStore()[storageKey(trackId, questionId)] ?? null
}

export function recordReplayAttempt(input: {
  trackId: string
  questionId: string
  answer: string
  feedback: Feedback
  dims?: AttemptSnapshot['dims']
}): QuestionReplay {
  const store = readStore()
  const key = storageKey(input.trackId, input.questionId)
  const prev = store[key]
  const snap: AttemptSnapshot = {
    score: input.feedback.score,
    answer: input.answer.trim().slice(0, 4000),
    at: new Date().toISOString(),
    provider: input.feedback.provider,
    dims: input.dims,
  }
  const history = [...(prev?.history ?? []), snap].slice(-8)
  const best =
    !prev?.best ||
    snap.score > prev.best.score ||
    (snap.score === prev.best.score && snap.at >= prev.best.at)
      ? snap
      : prev.best
  const next: QuestionReplay = {
    trackId: input.trackId,
    questionId: input.questionId,
    best,
    latest: snap,
    history,
  }
  store[key] = next
  writeStore(store)
  return next
}

export type ReplayTrend = 'up' | 'down' | 'flat' | 'first'

export function replayTrend(replay: QuestionReplay | null): {
  trend: ReplayTrend
  delta: number | null
  prior: AttemptSnapshot | null
} {
  if (!replay) return { trend: 'first', delta: null, prior: null }
  const hist = replay.history
  if (hist.length < 2) {
    return { trend: 'first', delta: null, prior: null }
  }
  const prior = hist[hist.length - 2]
  const latest = hist[hist.length - 1]
  if (!prior || !latest) return { trend: 'first', delta: null, prior: null }
  const delta = latest.score - prior.score
  return {
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    delta,
    prior,
  }
}

export function clipAnswer(text: string, max = 280): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}
