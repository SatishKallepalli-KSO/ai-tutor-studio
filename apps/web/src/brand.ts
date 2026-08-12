/** Central product positioning — Agentic skill + interview readiness. */

export const BRAND = {
  product: 'Practice Out Loud',
  domain: 'practiceoutloud.com',
  company: 'Kallepalli Labs',
  /** Short nav line under the brand. */
  tagline: 'Agentic AI · Interview practice · AI feedback',
  /** Primary headline under the product name. */
  magnet: 'Learn Agentic AI. Rehearse interviews out loud.',
  magnetSub:
    'One engine — study the Agentic path, or run oral interview drills with AI coaching. Free to start.',
  /** Homepage primary CTA label. */
  ctaStart: 'Start practicing',
  ctaContinue: 'Continue',
  ctaCustomQuestion: 'Your own question',
  ctaExploreAgentic: 'Become an Agentic AI developer',
  customFeatureTitle: 'Bring any interview question',
  customFeatureBlurb:
    'Paste a real panel prompt, speak or type your answer, and get AI coaching on content, clarity, and delivery — same coach as the curated bank. Free includes 2 AI feedbacks on your own questions per topic; Pro unlocks unlimited custom practice.',
  oneLiner:
    'Practice Out Loud builds Agentic AI skill and interview readiness — watch the path, practice concepts and panel prompts out loud, get AI feedback. Free to start (2 custom AI feedbacks per topic), Pro for full access.',
  /** Learner home chooser (3–4 doors). */
  launchpadTitle: 'Where to go',
  launchpadBlurb:
    'Two labeled paths: become an Agentic AI developer, or rehearse interviews — pick a door.',
  packsTitle: 'Role packs',
  packsBlurb:
    'Curated oral queues with clear rubric signals — Staff loop, EM hiring manager, AI engineer screen.',
  /** Hire home — brand-first magnet under the product name. */
  hireMagnet: 'Evaluate candidates who practiced out loud',
  hireMagnetSub:
    'Talent trains on Agentic AI and oral interview practice — see the paths, post roles, or talk pricing.',
  hireCtaDemo: 'See Agentic path',
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
    blurb:
      'Become an Agentic AI developer and rehearse interviews out loud — then jobs and network.',
  },
  recruiter: {
    label: 'Recruiter / hiring',
    short: 'Hire',
    homePath: '/jobs',
    blurb:
      'Secondary: post jobs and reach talent trained on Agentic AI + oral practice.',
  },
}

export const AUDIENCES = {
  talent: {
    label: 'Who it’s for',
    title: 'Engineers becoming Agentic AI developers',
    blurb:
      'Backend and fullstack engineers leveling into production Agentic AI — and anyone who wants oral interview coaching before the real loop.',
  },
  companies: {
    label: 'For companies',
    title: 'Hiring teams',
    blurb:
      'Post roles, find practice-ready talent, and message candidates who already trained on Agentic AI and drilled interviews out loud.',
  },
} as const

/** Homepage roadmap — learn → practice → feedback → hire. */
export const AI_ENGINEER_JOURNEY = [
  {
    step: '01',
    title: 'Learn Agentic AI',
    blurb:
      'Become an Agentic AI developer — video path, languages, and stack fundamentals.',
  },
  {
    step: '02',
    title: 'Practice interviews',
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
