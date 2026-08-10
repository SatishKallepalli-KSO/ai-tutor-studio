/** Central product positioning — learn, practice, AI feedback. */

export const BRAND = {
  product: 'Practice Out Loud',
  domain: 'practiceoutloud.com',
  company: 'Kallepalli Labs',
  /** Short nav line under the brand. */
  tagline: 'Learn · Practice · AI feedback',
  /** Primary headline under the product name. */
  magnet: 'Learn, practice, and get AI feedback',
  magnetSub:
    'One platform to become an AI engineer — study paths, practice out loud, and get coaching on content and delivery. Free to start.',
  oneLiner:
    'Practice Out Loud helps you learn AI engineering, practice out loud, and get AI feedback — Agentic paths, interviews, and stack depth in one place. Free to start, Pro for full access.',
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
    blurb: 'Learn AI paths, practice out loud, get feedback — then jobs and network.',
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
      'Backend and fullstack engineers leveling into production AI — and anyone who wants to learn, practice out loud, and get AI coaching before the real interview.',
  },
  companies: {
    label: 'Later · B2B',
    title: 'Hiring teams (phase 2)',
    blurb:
      'Jobs, talent profiles, and messaging exist today — sold as a hiring pilot after the practice product wins learners.',
  },
} as const

/** Homepage roadmap — learn → practice → feedback → hire. */
export const AI_ENGINEER_JOURNEY = [
  {
    step: '01',
    title: 'Learn',
    blurb: 'AI engineer paths, Agentic video, languages, and stack fundamentals.',
  },
  {
    step: '02',
    title: 'Practice',
    blurb: 'Speak answers out loud on real prompts — timed drills, not silent reading.',
  },
  {
    step: '03',
    title: 'Get AI feedback',
    blurb: 'Coaching on content and delivery so you know what to fix before the next try.',
  },
  {
    step: '04',
    title: 'Get hired',
    blurb: 'Browse roles when you’re ready — practice-ready profiles, not cold apply.',
  },
] as const
