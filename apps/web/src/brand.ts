/** Central product positioning — dual audience: talent + hiring teams. */

export const BRAND = {
  product: 'AI Tutor Studio',
  company: 'Kallepalli Labs',
  tagline: 'Learn. Practice. Hire.',
  oneLiner:
    'One-stop talent studio — candidates learn and practice; companies run interviews and hire with confidence.',
  copyright: '© 2026 Kallepalli Labs. All rights reserved.',
  contactEmail: 'hello@kallepallilabs.com',
} as const

export const AUDIENCES = {
  talent: {
    label: 'For talent',
    title: 'Learn & practice like the real room',
    blurb:
      'Study structured paths, answer out loud, and get AI coaching on substance and delivery — from languages to Staff/EM and career switches.',
  },
  companies: {
    label: 'For companies',
    title: 'Hire with structured interviews',
    blurb:
      'Run consistent interview loops, score candidates fairly, and see practice readiness — one place from screen to hire.',
  },
} as const
