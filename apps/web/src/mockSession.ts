import type { Feedback, TrackId } from './api'
import { FREE_PRACTICE_TRACKS } from './api'
import { localQuestions } from './data'
import { getPack, type RolePack } from './packs'

export type DimScores = {
  content: number
  clarity: number
  delivery: number
}

export type MockQuestionResult = {
  questionId: string
  prompt: string
  category: string
  score: number | null
  dims: DimScores | null
  skipped: boolean
  at: string
}

export type MockSessionSummary = {
  id: string
  packId: string | null
  trackId: TrackId | string
  title: string
  startedAt: string
  finishedAt: string
  durationSec: number
  results: MockQuestionResult[]
  averages: DimScores & { overall: number | null }
}

export type ActiveMock = {
  id: string
  packId: string | null
  trackId: TrackId | string
  title: string
  questionIds: string[]
  startedAt: number
  endsAt: number
  perQuestionSec: number
  questionStartedAt: number
  results: MockQuestionResult[]
}

const ACTIVE_KEY = 'ats_mock_active_v1'
const HISTORY_KEY = 'ats_mock_sessions_v1'
const MAX_HISTORY = 20

/** Free users get one short mock on a free practice track. */
export const FREE_SHORT_MOCK: RolePack = {
  id: 'free-short-mock',
  trackId: 'python',
  title: 'Short free mock',
  eyebrow: 'Free mock',
  blurb:
    'Four spoken drills · ~15 minutes — a taste of the timed mock loop before Pro packs.',
  durationMin: 15,
  questionIds: [
    'python-typing',
    'python-async',
    'python-fastapi',
    'py-decorators',
  ],
  rubricSignals: [
    'Clear answer in the first sentence',
    'Concrete example or tradeoff',
    'Interview length (~90s), not a lecture',
  ],
  proPractice: false,
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)))
}

/** Map tutor feedback lists into Content / Clarity / Delivery scores. */
export function deriveDims(fb: Feedback): DimScores {
  const base = fb.score
  const gaps = fb.gaps?.length ?? 0
  const strengths = fb.strengths?.length ?? 0
  const tips = fb.delivery_tips ?? []
  const content = clampScore(base)
  const clarity = clampScore(
    base - Math.min(2, Math.floor(gaps / 2)) + (strengths >= 3 ? 0.5 : 0),
  )
  const deliveryHit = tips.some((t) =>
    /filler|trim|long|pacing|ramble|pause/i.test(t),
  )
  const delivery =
    fb.input_mode === 'voice'
      ? clampScore(base - (deliveryHit ? 1 : 0) + (tips.length && !deliveryHit ? 0.5 : 0))
      : clampScore(base)
  return { content, clarity, delivery }
}

export function avgDims(
  results: MockQuestionResult[],
): DimScores & { overall: number | null } {
  const scored = results.filter((r) => r.score != null && r.dims)
  if (!scored.length) {
    return { content: 0, clarity: 0, delivery: 0, overall: null }
  }
  const sum = scored.reduce(
    (acc, r) => ({
      content: acc.content + (r.dims?.content ?? 0),
      clarity: acc.clarity + (r.dims?.clarity ?? 0),
      delivery: acc.delivery + (r.dims?.delivery ?? 0),
      overall: acc.overall + (r.score ?? 0),
    }),
    { content: 0, clarity: 0, delivery: 0, overall: 0 },
  )
  const n = scored.length
  const round1 = (x: number) => Math.round((x / n) * 10) / 10
  return {
    content: round1(sum.content),
    clarity: round1(sum.clarity),
    delivery: round1(sum.delivery),
    overall: round1(sum.overall),
  }
}

function resolveQuestionIds(pack: RolePack): string[] {
  const available = new Set(localQuestions(pack.trackId).map((q) => q.id))
  const ids = pack.questionIds.filter((id) => available.has(id))
  if (ids.length) return ids
  // Fallback: first N from track if curated ids drift.
  return localQuestions(pack.trackId)
    .slice(0, Math.min(4, pack.questionIds.length || 4))
    .map((q) => q.id)
}

export function mockPackForStart(opts: {
  packId?: string | null
  isPro: boolean
}): RolePack | null {
  if (opts.packId === FREE_SHORT_MOCK.id) return FREE_SHORT_MOCK
  if (opts.packId) {
    const pack = getPack(opts.packId)
    if (!pack) return null
    if (pack.proPractice && !opts.isPro) return null
    return pack
  }
  if (!opts.isPro) return FREE_SHORT_MOCK
  return getPack('staff-loop')
}

export function createActiveMock(pack: RolePack): ActiveMock {
  const questionIds = resolveQuestionIds(pack)
  const durationSec = Math.max(10, pack.durationMin) * 60
  const perQuestionSec = Math.max(
    90,
    Math.floor(durationSec / Math.max(1, questionIds.length)),
  )
  const now = Date.now()
  return {
    id: `mock_${now.toString(36)}`,
    packId: pack.id,
    trackId: pack.trackId,
    title: pack.title,
    questionIds,
    startedAt: now,
    endsAt: now + durationSec * 1000,
    perQuestionSec,
    questionStartedAt: now,
    results: [],
  }
}

export function readActiveMock(): ActiveMock | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveMock
  } catch {
    return null
  }
}

export function writeActiveMock(mock: ActiveMock | null) {
  try {
    if (!mock) localStorage.removeItem(ACTIVE_KEY)
    else localStorage.setItem(ACTIVE_KEY, JSON.stringify(mock))
  } catch {
    /* ignore quota */
  }
}

export function listMockSummaries(): MockSessionSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MockSessionSummary[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMockSummary(summary: MockSessionSummary) {
  const prev = listMockSummaries().filter((s) => s.id !== summary.id)
  const next = [summary, ...prev].slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  writeActiveMock(null)
  return summary
}

export function finishMock(
  mock: ActiveMock,
  remainingResults?: MockQuestionResult[],
): MockSessionSummary {
  const results = remainingResults ?? mock.results
  const finishedAt = new Date().toISOString()
  const summary: MockSessionSummary = {
    id: mock.id,
    packId: mock.packId,
    trackId: mock.trackId,
    title: mock.title,
    startedAt: new Date(mock.startedAt).toISOString(),
    finishedAt,
    durationSec: Math.max(0, Math.round((Date.now() - mock.startedAt) / 1000)),
    results,
    averages: avgDims(results),
  }
  return saveMockSummary(summary)
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function canStartTimedMock(opts: {
  pack: RolePack
  isPro: boolean
}): boolean {
  if (!opts.pack.proPractice) return true
  if (opts.isPro) return true
  return FREE_PRACTICE_TRACKS.has(opts.pack.trackId)
}

export function getLatestMockSummary(): MockSessionSummary | null {
  return listMockSummaries()[0] ?? null
}
