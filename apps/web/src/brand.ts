/** Central product positioning — magnet first, Hire secondary. */

export const BRAND = {
  product: 'AI Tutor Studio',
  company: 'Kallepalli Labs',
  /** Long-term platform story (secondary on homepage). */
  tagline: 'Learn. Practice. Hire.',
  /** Primary customer magnet — what we sell today. */
  magnet: 'Practice Staff & EM interviews out loud',
  magnetSub:
    'Free to start. Study the path, speak your answers, get AI coaching on content and delivery — the part coding platforms never train.',
  oneLiner:
    'AI Tutor Studio helps senior engineers practice Staff and EM interview loops out loud — with structured paths and coaching — Free to start, Pro for full access.',
  copyright: '© 2026 Kallepalli Labs. All rights reserved.',
  contactEmail: 'hello@kallepallilabs.com',
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
    blurb: 'Staff/EM voice practice first — then paths, jobs, network.',
  },
  recruiter: {
    label: 'Recruiter / hiring',
    short: 'Hire',
    homePath: '/jobs',
    blurb: 'Secondary: post jobs and reach practice-ready talent.',
  },
}

export const AUDIENCES = {
  talent: {
    label: 'Who it’s for',
    title: 'Senior / Staff / EM candidates',
    blurb:
      'You already know how to code. You need oral narrative, system ownership stories, and delivery under pressure — practiced out loud before the real panel.',
  },
  companies: {
    label: 'Later · B2B',
    title: 'Hiring teams (phase 2)',
    blurb:
      'Jobs, talent profiles, and messaging exist today — sold as a hiring pilot after the practice product wins learners.',
  },
} as const
