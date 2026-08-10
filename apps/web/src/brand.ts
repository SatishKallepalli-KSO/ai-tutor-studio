/** Central product positioning — AI engineer platform; speak practice is the edge. */

export const BRAND = {
  product: 'Practice Out Loud',
  domain: 'practiceoutloud.com',
  company: 'Kallepalli Labs',
  /** Short nav line under the brand. */
  tagline: 'Become an AI engineer',
  /** Primary customer magnet — platform promise. */
  magnet: 'One-stop platform to become an AI engineer',
  magnetSub:
    'Learn the stack, build RAG & agents, practice Staff/EM interviews out loud, then apply — study → speak → coach in one place.',
  oneLiner:
    'Practice Out Loud is the one-stop platform to become an AI engineer: structured AI paths, spoken interview coaching, and hiring surfaces when you’re ready. Free to start, Pro for full access.',
  copyright: '© 2026 Practice Out Loud · Kallepalli Labs. All rights reserved.',
  contactEmail: 'hello@practiceoutloud.com',
} as const

export type Persona = 'learner' | 'recruiter'

export const PERSONAS: Record<
  Persona,
  { label: string; short: string; homePath: string; blurb: string }
> = {
  learner: {
    label: 'Learner',
    short: 'Learn',
    homePath: '/',
    blurb: 'AI engineer paths first — then Staff/EM voice practice, jobs, network.',
  },
  recruiter: {
    label: 'Recruiter / hiring',
    short: 'Hire',
    homePath: '/jobs',
    blurb: 'Secondary: post jobs and reach practice-ready AI talent.',
  },
}

export const AUDIENCES = {
  talent: {
    label: 'Who it’s for',
    title: 'Engineers becoming AI engineers',
    blurb:
      'Backend and fullstack engineers leveling into production AI — plus seniors who need Staff/EM loops practiced out loud before the panel.',
  },
  companies: {
    label: 'Later · B2B',
    title: 'Hiring teams (phase 2)',
    blurb:
      'Jobs, talent profiles, and messaging exist today — sold as a hiring pilot after the practice product wins learners.',
  },
} as const

/** Homepage roadmap — one-stop AI engineer journey. */
export const AI_ENGINEER_JOURNEY = [
  {
    step: '01',
    title: 'Learn the stack',
    blurb: 'Python, Java, TypeScript, and web fundamentals — the base every AI engineer needs.',
  },
  {
    step: '02',
    title: 'Build AI systems',
    blurb: 'RAG, agents, evals, LLM ops, Agentic AI, and Snowflake Cortex — production paths, not toy demos.',
  },
  {
    step: '03',
    title: 'Practice out loud',
    blurb: 'Staff & EM interview loops with AI coaching on content and delivery — the skill coding sites skip.',
  },
  {
    step: '04',
    title: 'Get hired',
    blurb: 'Browse roles and show practice-ready profiles when you’re ready to apply.',
  },
] as const
