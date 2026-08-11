/** Persist Learn progress locally so paths feel like a program, not one-shots. */

export type QuestionAttempt = {
  score: number
  at: string
  provider?: string
}

export type TrackProgress = {
  studiedTopicIds: string[]
  attempts: Record<string, QuestionAttempt>
  lastTopicId?: string
  lastQuestionId?: string
}

export type ResumePointer = {
  trackId: string
  lastTopicId?: string
  lastQuestionId?: string
  /** Most recent activity timestamp (ms), if known. */
  lastActiveAt: number
}

export type RecommendedNext = {
  trackId: string
  topicId: string
  questionId?: string
  reason: 'weakest' | 'unattempted' | 'unstudied'
  label: string
}

const KEY = 'ats_learn_progress_v1'
const LAST_TRACK_KEY = 'ats_learn_last_track_v1'

/** Default free practice path — AI-oriented, no Pro gate. */
export const DEFAULT_PRACTICE_TRACK = 'java-to-python'

function readAll(): Record<string, TrackProgress> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, TrackProgress>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, TrackProgress>) {
  localStorage.setItem(KEY, JSON.stringify(all))
}

function setLastTrackId(trackId: string) {
  try {
    localStorage.setItem(LAST_TRACK_KEY, trackId)
  } catch {
    /* ignore quota */
  }
}

export function getLastTrackId(): string | null {
  try {
    const id = localStorage.getItem(LAST_TRACK_KEY)
    return id && id.trim() ? id : null
  } catch {
    return null
  }
}

export function getTrackProgress(trackId: string): TrackProgress {
  const all = readAll()
  return (
    all[trackId] ?? {
      studiedTopicIds: [],
      attempts: {},
    }
  )
}

export function markTopicStudied(trackId: string, topicId: string) {
  const all = readAll()
  const cur = getTrackProgress(trackId)
  if (!cur.studiedTopicIds.includes(topicId)) {
    cur.studiedTopicIds = [...cur.studiedTopicIds, topicId]
  }
  cur.lastTopicId = topicId
  all[trackId] = cur
  writeAll(all)
  setLastTrackId(trackId)
  return cur
}

export function recordAttempt(
  trackId: string,
  questionId: string,
  score: number,
  provider?: string,
) {
  const all = readAll()
  const cur = getTrackProgress(trackId)
  const prev = cur.attempts[questionId]
  // Keep best score, always refresh timestamp
  const best = prev ? Math.max(prev.score, score) : score
  cur.attempts = {
    ...cur.attempts,
    [questionId]: {
      score: best,
      at: new Date().toISOString(),
      provider: provider ?? prev?.provider,
    },
  }
  cur.lastQuestionId = questionId
  all[trackId] = cur
  writeAll(all)
  setLastTrackId(trackId)
  return cur
}

export function pathStats(
  trackId: string,
  topicIds: string[],
  questionIds: string[],
) {
  const p = getTrackProgress(trackId)
  const studied = topicIds.filter((id) => p.studiedTopicIds.includes(id)).length
  const practiced = questionIds.filter((id) => !!p.attempts[id]).length
  const scores = questionIds
    .map((id) => p.attempts[id]?.score)
    .filter((s): s is number => typeof s === 'number')
  const avg =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null
  const mastery = questionIds.filter((id) => (p.attempts[id]?.score ?? 0) >= 4)
    .length
  return {
    studied,
    topicsTotal: topicIds.length,
    practiced,
    questionsTotal: questionIds.length,
    avg,
    mastery,
    pct:
      questionIds.length + topicIds.length > 0
        ? Math.round(
            ((studied + practiced) /
              (topicIds.length + questionIds.length)) *
              100,
          )
        : 0,
  }
}

function trackActivityAt(progress: TrackProgress): number {
  let max = 0
  for (const a of Object.values(progress.attempts)) {
    const t = Date.parse(a.at)
    if (Number.isFinite(t) && t > max) max = t
  }
  if (max > 0) return max
  if (
    progress.lastTopicId ||
    progress.lastQuestionId ||
    progress.studiedTopicIds.length > 0
  ) {
    return 1
  }
  return 0
}

/** Most recently active track with any learn/practice progress. */
export function getResumePointer(): ResumePointer | null {
  const all = readAll()
  const preferred = getLastTrackId()
  if (preferred && all[preferred]) {
    const progress = all[preferred]
    if (
      progress.lastTopicId ||
      progress.lastQuestionId ||
      progress.studiedTopicIds.length > 0
    ) {
      return {
        trackId: preferred,
        lastTopicId: progress.lastTopicId,
        lastQuestionId: progress.lastQuestionId,
        lastActiveAt: trackActivityAt(progress),
      }
    }
  }

  let best: ResumePointer | null = null
  for (const [trackId, progress] of Object.entries(all)) {
    const at = trackActivityAt(progress)
    if (at <= 0) continue
    if (!best || at > best.lastActiveAt) {
      best = {
        trackId,
        lastTopicId: progress.lastTopicId,
        lastQuestionId: progress.lastQuestionId,
        lastActiveAt: at,
      }
    }
  }
  return best
}

/**
 * Pick a sensible next drill: lowest-scoring attempt, else first unattempted
 * question in the resume topic/track, else next unstudied topic.
 */
export function getRecommendedNext(input: {
  trackId: string
  topicIds: string[]
  questions: { id: string; topic_id: string; prompt: string }[]
  topicTitle?: (topicId: string) => string | undefined
}): RecommendedNext | null {
  const { trackId, topicIds, questions } = input
  const progress = getTrackProgress(trackId)
  if (!questions.length && !topicIds.length) return null

  const scored = questions
    .map((q) => ({ q, attempt: progress.attempts[q.id] }))
    .filter((x): x is { q: (typeof questions)[0]; attempt: QuestionAttempt } =>
      !!x.attempt,
    )
    .sort((a, b) => a.attempt.score - b.attempt.score || Date.parse(a.attempt.at) - Date.parse(b.attempt.at))

  const weak = scored.find((x) => x.attempt.score < 4)
  if (weak) {
    return {
      trackId,
      topicId: weak.q.topic_id,
      questionId: weak.q.id,
      reason: 'weakest',
      label: `Retry low score (${weak.attempt.score}/5)`,
    }
  }

  const focusTopic =
    progress.lastTopicId && topicIds.includes(progress.lastTopicId)
      ? progress.lastTopicId
      : topicIds[0]

  const inFocus = focusTopic
    ? questions.filter((q) => q.topic_id === focusTopic)
    : questions
  const unattempted = inFocus.find((q) => !progress.attempts[q.id])
  if (unattempted) {
    return {
      trackId,
      topicId: unattempted.topic_id,
      questionId: unattempted.id,
      reason: 'unattempted',
      label: 'Next unpracticed question',
    }
  }

  const anyUnattempted = questions.find((q) => !progress.attempts[q.id])
  if (anyUnattempted) {
    return {
      trackId,
      topicId: anyUnattempted.topic_id,
      questionId: anyUnattempted.id,
      reason: 'unattempted',
      label: 'Next unpracticed question',
    }
  }

  const unstudied = topicIds.find((id) => !progress.studiedTopicIds.includes(id))
  if (unstudied) {
    const title = input.topicTitle?.(unstudied)
    return {
      trackId,
      topicId: unstudied,
      reason: 'unstudied',
      label: title ? `Study: ${title}` : 'Next unstudied topic',
    }
  }

  return null
}

/** Build learn/practice deep-link search string (leading ?). */
export function buildLearnSearch(opts: {
  path: string
  mode?: 'learn' | 'practice'
  topic?: string | null
  q?: string | null
  custom?: boolean
  cq?: string | null
}): string {
  const sp = new URLSearchParams()
  sp.set('path', opts.path)
  sp.set('mode', opts.mode ?? 'learn')
  if (opts.topic) sp.set('topic', opts.topic)
  if (opts.custom) {
    sp.set('custom', '1')
    if (opts.cq) sp.set('cq', opts.cq)
  } else if (opts.q) {
    sp.set('q', opts.q)
  }
  return `?${sp.toString()}`
}
