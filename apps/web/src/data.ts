import type { Feedback, Track, TrackId, TutorQuestion } from './api'

export const TRACKS: Track[] = [
  {
    id: 'staff-interview',
    title: 'Staff Engineer Interview Prep',
    audience: 'Senior / Staff IC candidates',
    summary:
      'System design, ownership stories, and production AI depth for Staff loops.',
    outcomes: [
      'Tell Staff-level ownership stories with metrics',
      'Design distributed systems with clear tradeoffs',
      'Explain production AI guardrails (entitlements, audit, evals)',
    ],
    study_plan: [
      'Day 1–2: Rewrite 3 ownership stories (Context → Action → Metric)',
      'Day 3–4: Drill 2 system designs (sync engine, NLQ platform)',
      'Day 5: Mock behavioral + deep dive on one production AI project',
      'Day 6–7: Timed answers + tighten resume bullets to stories',
    ],
  },
  {
    id: 'em-interview',
    title: 'Engineering Manager Interview Prep',
    audience: 'EM / player-coach leaders',
    summary:
      'People leadership, delivery, hiring, and vendor/team-build narratives.',
    outcomes: [
      'Lead with people + delivery ownership, not only IC craft',
      'Run hiring / performance / incident stories cleanly',
      'Show technical credibility without competing for IC tickets',
    ],
    study_plan: [
      'Day 1: Memorize 30–40s EM opener',
      'Day 2–3: Team-from-scratch + vendor-to-in-house STAR cards',
      'Day 4: Hiring loop + performance management scenarios',
      'Day 5–7: Mock HM screen + conflict / prioritization drills',
    ],
  },
  {
    id: 'java-to-ai',
    title: 'Java → Production AI Upskilling',
    audience: 'Java/backend engineers moving into AI',
    summary:
      'Practical path from Spring services to RAG, agents, and safe LLM features.',
    outcomes: [
      'Map Spring concepts to FastAPI / AI service patterns',
      'Explain RAG vs fine-tuning vs prompt-only clearly',
      'Design an entitlement-safe NLQ or document pipeline',
    ],
    study_plan: [
      'Week 1: Python fluency + HTTP/LLM basics',
      'Week 2: RAG building blocks (chunk, embed, retrieve, cite)',
      'Week 3: Agents/tools + guardrails + evals',
      'Week 4: Ship a tiny production-shaped AI feature',
    ],
  },
]

export const QUESTIONS: TutorQuestion[] = [
  {
    id: 'staff-ownership',
    track_id: 'staff-interview',
    category: 'Behavioral',
    prompt:
      'Tell me about a system you owned end-to-end. What was hard, what did you decide, and what measurable outcome did you drive?',
    hints: [
      'Lead with scope and users',
      'Name 1–2 hard tradeoffs',
      'End with a metric (uptime, latency, manual hours saved)',
    ],
    strong_answer_signals: [
      'owned',
      'tradeoff',
      'metric',
      'production',
      'reliability',
      'customer',
    ],
  },
  {
    id: 'staff-design-sync',
    track_id: 'staff-interview',
    category: 'System design',
    prompt:
      'Design a customer data syncing engine that must move large volumes of data to destinations reliably. How would you approach batch today and streaming later?',
    hints: [
      'Separate ingest, transform, deliver, observe',
      'Talk retries, idempotency, backpressure',
      'Call out multi-tenant isolation and failure modes',
    ],
    strong_answer_signals: [
      'idempotent',
      'retry',
      'queue',
      'batch',
      'stream',
      'observability',
      'backpressure',
    ],
  },
  {
    id: 'staff-ai-guardrails',
    track_id: 'staff-interview',
    category: 'AI / production',
    prompt:
      "How would you ship an enterprise natural-language-to-SQL feature safely when different customers must never see each other's data?",
    hints: [
      'Entitlements before model call',
      'Fail-closed validation on generated SQL',
      'Audit + rate limits + eval set',
    ],
    strong_answer_signals: [
      'entitlement',
      'guardrail',
      'fail-closed',
      'audit',
      'rate limit',
      'eval',
    ],
  },
  {
    id: 'em-opener',
    track_id: 'em-interview',
    category: 'Leadership',
    prompt:
      "Give your 30–40 second introduction as an Engineering Manager. Include scope, signature wins, and what you're looking for next.",
    hints: [
      'Lead with people ownership',
      'Mention team size / footprint',
      'One transformation win + one AI/product win',
    ],
    strong_answer_signals: [
      'team',
      'hiring',
      'delivery',
      'coaching',
      'uptime',
      'product',
    ],
  },
  {
    id: 'em-vendor',
    track_id: 'em-interview',
    category: 'Transformation',
    prompt:
      'Describe leading a vendor-to-in-house transition. How did you protect delivery and uptime while building the team?',
    hints: [
      'Continuity plan first',
      'Hiring + knowledge transfer',
      'Explicit uptime / customer impact metric',
    ],
    strong_answer_signals: [
      'vendor',
      'in-house',
      'hiring',
      'uptime',
      'knowledge transfer',
      'stakeholder',
    ],
  },
  {
    id: 'em-conflict',
    track_id: 'em-interview',
    category: 'People',
    prompt:
      'Product wants more features; your team is drowning in reliability work. How do you handle the conflict?',
    hints: [
      'Reframe to shared outcomes',
      'Bring options with risk',
      'Escalate only with a recommendation',
    ],
    strong_answer_signals: [
      'tradeoff',
      'risk',
      'capacity',
      'roadmap',
      'option',
      'reliability',
    ],
  },
  {
    id: 'java-ai-map',
    track_id: 'java-to-ai',
    category: 'Concepts',
    prompt:
      "You're a Java/Spring engineer. Explain how you would structure a production AI feature service and what maps from Spring Boot patterns.",
    hints: [
      'Controllers → API routes',
      'Services → orchestration + tools',
      'Observability and config still matter',
    ],
    strong_answer_signals: [
      'spring',
      'api',
      'service',
      'observability',
      'config',
      'timeout',
      'retry',
    ],
  },
  {
    id: 'java-rag',
    track_id: 'java-to-ai',
    category: 'RAG',
    prompt:
      'When would you use RAG instead of fine-tuning, and how would you evaluate whether retrieval quality is good enough?',
    hints: [
      'Fresh / private knowledge → RAG',
      'Behavior/style → maybe fine-tune',
      'Eval with golden questions + citation checks',
    ],
    strong_answer_signals: [
      'rag',
      'fine-tune',
      'retrieval',
      'citation',
      'eval',
      'chunk',
    ],
  },
  {
    id: 'java-agents',
    track_id: 'java-to-ai',
    category: 'Agents',
    prompt:
      'Design a simple document extraction agent for messy Excel/PDF inputs. What steps, tools, and failure handling do you need?',
    hints: [
      'Ingest → extract → validate → retry → store',
      'Deterministic validation gates',
      'Human review on low confidence',
    ],
    strong_answer_signals: [
      'validate',
      'retry',
      'tool',
      'confidence',
      'pipeline',
      'human',
    ],
  },
]

export function localQuestions(trackId: string): TutorQuestion[] {
  return QUESTIONS.filter((q) => q.track_id === trackId)
}

export function localFeedback(input: {
  track_id: TrackId
  question_id: string
  answer: string
}): Feedback {
  const question = QUESTIONS.find(
    (q) => q.id === input.question_id && q.track_id === input.track_id,
  )
  if (!question) {
    throw new Error('Unknown question')
  }

  const text = input.answer.trim()
  const lower = text.toLowerCase()
  const words = lower.match(/[a-z0-9']+/g) ?? []
  const hits = question.strong_answer_signals.filter((s) => lower.includes(s))

  let score = 2
  if (words.length >= 80) score += 1
  if (hits.length >= 2) score += 1
  if (hits.length >= 4 || /\d|%/.test(text)) score += 1
  score = Math.max(1, Math.min(5, score))

  const strengths: string[] = []
  const gaps: string[] = []

  if (words.length >= 60) {
    strengths.push('Enough detail to sound senior — not a one-liner.')
  } else {
    gaps.push(
      'Expand with context, decision, and outcome (aim for ~90–120 seconds spoken).',
    )
  }
  if (hits.length) {
    strengths.push(`Hit key signals: ${hits.slice(0, 4).join(', ')}.`)
  } else {
    gaps.push(
      `Weave in concepts like: ${question.strong_answer_signals.slice(0, 4).join(', ')}.`,
    )
  }
  if (/\d|%|uptime|million|team/.test(lower)) {
    strengths.push('Includes concrete scale or metrics — interviewers love this.')
  } else {
    gaps.push('Add one hard metric (uptime, txn/day, team size, % improvement).')
  }

  return {
    score,
    summary: `Rubric score ${score}/5 for ${question.category.toLowerCase()}. Running in free static hosting mode.`,
    strengths: strengths.length
      ? strengths
      : ['You attempted a full answer — good start.'],
    gaps: gaps.length
      ? gaps
      : ['Tighten structure and end on a measurable outcome.'],
    better_answer: [
      'Stronger shape for this prompt:',
      '1) Context: who/what system.',
      '2) Ownership: what you owned.',
      '3) Decision/tradeoff.',
      '4) Outcome with metric.',
      `Hint to include: ${question.hints.join(', ')}.`,
    ].join('\n'),
    next_drill: question.hints[0] ?? 'Practice out loud once, timed.',
    provider: 'browser-rubric',
  }
}
