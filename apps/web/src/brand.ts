/** Central product positioning — learn, practice, AI feedback. */

export const BRAND = {
  product: 'Practice Out Loud',
  domain: 'practiceoutloud.com',
  company: 'Kallepalli Labs',
  /** Short nav line under the brand. */
  tagline: 'Learn · Practice · AI feedback',
  /** Primary headline under the product name. */
  magnet: 'Learn, practice out loud, get AI feedback',
  magnetSub:
    'Study a path, speak drills or your own interview question, and get AI coaching — free to start.',
  /** Homepage primary CTA label. */
  ctaStart: 'Start practicing',
  ctaContinue: 'Continue',
  ctaCustomQuestion: 'Your own question',
  ctaExploreAgentic: 'Agentic AI',
  customFeatureTitle: 'Bring any interview question',
  customFeatureBlurb:
    'Paste a real panel prompt, speak or type your answer, and get AI coaching on content, clarity, and delivery — same coach as the curated bank. Free includes 2 AI feedbacks on your own questions per topic; Pro unlocks unlimited custom practice.',
  oneLiner:
    'Practice Out Loud helps you learn AI engineering, practice out loud, and get AI feedback — including your own interview questions, Agentic paths, and stack depth. Free to start (2 custom AI feedbacks per topic), Pro for full access.',
  /** Learner home chooser (3–4 doors). */
  launchpadTitle: 'Where to go',
  launchpadBlurb: 'Pick one — nothing starts until you choose.',
  /** Hire home — brand-first magnet under the product name. */
  hireMagnet: 'Evaluate candidates who practiced out loud',
  hireMagnetSub:
    'See the paths talent trains on, post roles on the jobs board, or talk pricing — one clear next step.',
  hireCtaDemo: 'See demo path',
  hireCtaJobs: 'Jobs board',
  hireLaunchpadTitle: 'Where to go',
  hireLaunchpadBlurb: 'Four doors — pick one action.',
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
    label: 'For companies',
    title: 'Hiring teams',
    blurb:
      'Post roles, find practice-ready talent, and message candidates who already drilled the interview out loud.',
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
    blurb:
      'Speak curated drills — or bring your own interview question — timed out loud, not silent reading.',
  },
  {
    step: '03',
    title: 'Get AI feedback',
    blurb:
      'Coaching on content, clarity, and delivery for bank drills and your own prompts (2 free custom feedbacks per topic).',
  },
  {
    step: '04',
    title: 'Get hired',
    blurb: 'Browse roles when you’re ready — practice-ready profiles, not cold apply.',
  },
] as const
