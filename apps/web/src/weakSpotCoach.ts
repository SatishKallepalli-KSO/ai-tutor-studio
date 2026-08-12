import type { TrackId, TutorQuestion } from './api'
import { localQuestions } from './data'
import {
  getTrackProgress,
  type QuestionAttempt,
  type TrackProgress,
} from './learnProgress'

const MIN_ATTEMPTS = 5

export type WeakSpot = {
  id: string
  label: string
  detail: string
  trackId: string
  category: string
  avgScore: number
  questionIds: string[]
}

export type WeakSpotPlan = {
  totalAttempts: number
  ready: boolean
  spots: WeakSpot[]
  /** Flattened auto-queue across top spots (max 8). */
  drillQueue: { trackId: string; questionId: string; prompt: string }[]
  headline: string | null
}

function readAllProgress(): Record<string, TrackProgress> {
  try {
    const raw = localStorage.getItem('ats_learn_progress_v1')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, TrackProgress>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function attemptCount(a: QuestionAttempt): number {
  return Math.max(1, a.attemptCount ?? 1)
}

/** Total scored tries across all tracks (counts retries). */
export function totalAttemptCount(
  all: Record<string, TrackProgress> = readAllProgress(),
): number {
  let n = 0
  for (const progress of Object.values(all)) {
    for (const a of Object.values(progress.attempts)) {
      n += attemptCount(a)
    }
  }
  return n
}

type CatBucket = {
  trackId: string
  category: string
  scores: number[]
  questionIds: string[]
  gapHints: string[]
}

/**
 * After enough attempts, cluster low scores by question category
 * and build an auto-queued drill list.
 */
export function analyzeWeakSpots(opts?: {
  trackId?: string | null
  minAttempts?: number
}): WeakSpotPlan {
  const minAttempts = opts?.minAttempts ?? MIN_ATTEMPTS
  const all = readAllProgress()
  const total = totalAttemptCount(all)
  const empty: WeakSpotPlan = {
    totalAttempts: total,
    ready: false,
    spots: [],
    drillQueue: [],
    headline: null,
  }
  if (total < minAttempts) return empty

  const buckets = new Map<string, CatBucket>()
  const trackIds = opts?.trackId
    ? [opts.trackId]
    : Object.keys(all).filter((id) => Object.keys(all[id]?.attempts ?? {}).length)

  for (const trackId of trackIds) {
    const progress = all[trackId] ?? getTrackProgress(trackId)
    const qs = localQuestions(trackId)
    const byId = new Map(qs.map((q) => [q.id, q]))
    for (const [qid, attempt] of Object.entries(progress.attempts)) {
      if (attempt.score >= 4) continue
      const q = byId.get(qid)
      const category = attempt.category || q?.category || 'General'
      const key = `${trackId}::${category}`
      const bucket = buckets.get(key) ?? {
        trackId,
        category,
        scores: [],
        questionIds: [],
        gapHints: [],
      }
      bucket.scores.push(attempt.score)
      if (!bucket.questionIds.includes(qid)) bucket.questionIds.push(qid)
      for (const g of attempt.gaps ?? []) {
        if (bucket.gapHints.length < 3 && !bucket.gapHints.includes(g)) {
          bucket.gapHints.push(g)
        }
      }
      buckets.set(key, bucket)
    }
  }

  const spots: WeakSpot[] = [...buckets.values()]
    .map((b) => {
      const avg =
        Math.round(
          (b.scores.reduce((a, c) => a + c, 0) / b.scores.length) * 10,
        ) / 10
      const detail =
        b.gapHints[0] ||
        `Average ${avg}/5 on ${b.questionIds.length} drill${b.questionIds.length === 1 ? '' : 's'} — speak these again with a clearer structure.`
      return {
        id: `${b.trackId}-${b.category}`.toLowerCase().replace(/\s+/g, '-'),
        label: `You need work on ${b.category}`,
        detail,
        trackId: b.trackId,
        category: b.category,
        avgScore: avg,
        questionIds: b.questionIds.slice(0, 4),
      }
    })
    .filter((s) => s.avgScore < 4)
    .sort((a, b) => a.avgScore - b.avgScore || b.questionIds.length - a.questionIds.length)
    .slice(0, 4)

  if (!spots.length) {
    return {
      totalAttempts: total,
      ready: true,
      spots: [],
      drillQueue: [],
      headline: 'No major weak spots — keep pushing scores to 4+.',
    }
  }

  const drillQueue: WeakSpotPlan['drillQueue'] = []
  for (const spot of spots) {
    const qs = localQuestions(spot.trackId)
    const byId = new Map(qs.map((q) => [q.id, q]))
    for (const id of spot.questionIds) {
      if (drillQueue.length >= 8) break
      const q = byId.get(id)
      if (!q) continue
      if (drillQueue.some((d) => d.questionId === id)) continue
      drillQueue.push({
        trackId: spot.trackId as TrackId,
        questionId: id,
        prompt: q.prompt,
      })
    }
  }

  return {
    totalAttempts: total,
    ready: true,
    spots,
    drillQueue,
    headline: spots[0]?.label ?? null,
  }
}

export function questionsForWeakQueue(
  plan: WeakSpotPlan,
  trackId: string,
): TutorQuestion[] {
  const ids = plan.drillQueue
    .filter((d) => d.trackId === trackId)
    .map((d) => d.questionId)
  if (!ids.length) return []
  const order = new Map(ids.map((id, i) => [id, i]))
  return localQuestions(trackId)
    .filter((q) => order.has(q.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
