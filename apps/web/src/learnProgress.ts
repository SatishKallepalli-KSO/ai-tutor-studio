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

const KEY = 'ats_learn_progress_v1'

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
