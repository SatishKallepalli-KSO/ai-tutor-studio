import type { TrackId, TutorQuestion } from './api'
import { localQuestions } from './data'

/**
 * Curated company/role packs — fixed oral queues with rubric signals.
 * Packs wrap existing track questions (same tutor feedback), not a random catalog.
 */
export type RolePack = {
  id: string
  trackId: TrackId
  title: string
  eyebrow: string
  blurb: string
  durationMin: number
  questionIds: string[]
  /** What the coach listens for — shown before/during the pack. */
  rubricSignals: string[]
  /** Pro practice via underlying track; free packs use FREE_PRACTICE_TRACKS. */
  proPractice: boolean
}

export const ROLE_PACKS: RolePack[] = [
  {
    id: 'staff-loop',
    trackId: 'staff-interview',
    title: 'Staff loop',
    eyebrow: 'IC pack',
    blurb:
      'Ownership, design tradeoffs, influence, and production AI — spoken like a real Staff loop.',
    durationMin: 40,
    questionIds: [
      'staff-ownership',
      'staff-mentor',
      'staff-design-sync',
      'staff-api-tradeoff',
      'staff-design-review',
      'staff-influence',
      'staff-cross-team',
      'staff-incident',
      'staff-oncall-story',
      'staff-ai-guardrails',
      'staff-ai-prod',
      'staff-ambiguity',
    ],
    rubricSignals: [
      'Scope + stake in first 20s',
      'Tradeoffs with a clear recommendation',
      'Metrics or outcomes, not just activity',
      'Cross-team influence without authority',
      'Production safety for AI (authz, evals, failure modes)',
    ],
    proPractice: true,
  },
  {
    id: 'em-hiring-manager',
    trackId: 'em-interview',
    title: 'EM hiring manager',
    eyebrow: 'Manager pack',
    blurb:
      'People, hiring bar, delivery risk, and exec updates — the HM screen in one sitting.',
    durationMin: 40,
    questionIds: [
      'em-opener',
      'em-conflict',
      'em-performance',
      'em-1on1-hard',
      'em-hiring-bar',
      'em-hiring-signal',
      'em-roadmap',
      'em-incident-leadership',
      'em-delivery-risk',
      'em-exec',
      'em-exec-update',
      'em-org',
    ],
    rubricSignals: [
      'People + delivery ownership in the opener',
      'Specific coaching / performance moves',
      'Hiring bar with concrete signals',
      'Options for execs, not status dumps',
      'Protects the team under SEV / launch pressure',
    ],
    proPractice: true,
  },
  {
    id: 'ai-engineer-screen',
    trackId: 'java-to-ai',
    title: 'AI engineer screen',
    eyebrow: 'AI pack',
    blurb:
      'RAG, agents, evals, cost, and entitlements — a production AI screen for backend engineers.',
    durationMin: 45,
    questionIds: [
      'java-ai-map',
      'java-rag',
      'java-rag-vs-fine',
      'java-rag-authz',
      'java-agents',
      'java-ai-grounding',
      'java-ai-hitl',
      'java-ai-evals',
      'java-eval-gate',
      'java-ai-ops',
      'java-cost-control',
      'java-ai-agent-observability',
    ],
    rubricSignals: [
      'RAG vs fine-tune decision with evals',
      'Entitlement-safe retrieval (no doc leakage)',
      'Agent steps, tools, and stop conditions',
      'Offline + online eval gates before ship',
      'Latency, cost, and failure modes in prod',
    ],
    proPractice: true,
  },
]

export function getPack(packId: string | null | undefined): RolePack | null {
  if (!packId) return null
  return ROLE_PACKS.find((p) => p.id === packId) ?? null
}

export function packQuestions(pack: RolePack): TutorQuestion[] {
  const byId = new Map(localQuestions(pack.trackId).map((q) => [q.id, q]))
  return pack.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is TutorQuestion => !!q)
}

export function filterQuestionsForPack(
  questions: TutorQuestion[],
  pack: RolePack | null,
): TutorQuestion[] {
  if (!pack) return questions
  const order = new Map(pack.questionIds.map((id, i) => [id, i]))
  return questions
    .filter((q) => order.has(q.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

export function buildPackSearch(pack: RolePack, questionId?: string | null): string {
  const sp = new URLSearchParams()
  sp.set('path', pack.trackId)
  sp.set('mode', 'practice')
  sp.set('pack', pack.id)
  const first = questionId ?? pack.questionIds[0]
  if (first) {
    const q = packQuestions(pack).find((item) => item.id === first)
    if (q) {
      sp.set('topic', q.topic_id)
      sp.set('q', q.id)
    } else {
      sp.set('q', first)
    }
  }
  return `?${sp.toString()}`
}
