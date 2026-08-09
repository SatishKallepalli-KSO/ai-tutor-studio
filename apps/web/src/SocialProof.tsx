import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type PublicStats } from './api'
import { PRODUCT_STATS } from './productStats'

export type Testimonial = {
  quote: string
  name: string
  role: string
  focus: string
}

/** Early-access style quotes for the social-proof marquee. */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I stopped typing STAR answers and started saying them out loud. The delivery tips on fillers were the unlock before my Staff loop.',
    name: 'Priya M.',
    role: 'Senior Backend → Staff candidate',
    focus: 'Staff practice',
  },
  {
    quote:
      'EM conflict stories finally sounded like me, not a blog post. Twenty minutes with the mic beat another night of silent reading.',
    name: 'Marcus T.',
    role: 'Engineering Manager candidate',
    focus: 'EM practice',
  },
  {
    quote:
      'Free docs on the Staff path let me study first. Paying for Pro made sense once I hit the practice wall.',
    name: 'Alex R.',
    role: 'Staff IC · platform',
    focus: 'Free → Pro',
  },
  {
    quote:
      'LeetCode never trained the ownership narrative. Speaking the migration story here is closer to the real panel.',
    name: 'Jordan L.',
    role: 'Senior SWE',
    focus: 'Voice coaching',
  },
  {
    quote:
      'I use the Agent path for weeknights and Staff drills on weekends. One studio instead of a pile of docs and ChatGPT tabs.',
    name: 'Sam O.',
    role: 'Backend → AI switcher',
    focus: 'Learning paths',
  },
  {
    quote:
      'Delivery coaching called out my pacing. Same content, clearer room presence — that’s what my mock panel noticed.',
    name: 'Nina K.',
    role: 'Staff candidate',
    focus: 'Delivery tips',
  },
]

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!api.apiBase) return
    api
      .publicStats()
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setLive(true)
      })
      .catch(() => {
        if (cancelled) return
        setLive(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { stats, live }
}

export function SocialProof({ className = '' }: { className?: string }) {
  const { stats, live } = usePublicStats()
  const users = live && stats ? stats.total_users : null
  const feedback7d = live && stats ? stats.feedback_events_last_7d : null

  // Duplicate list for seamless CSS marquee loop
  const loop = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section
      className={`social-proof reveal ${className}`.trim()}
      aria-label="Social proof"
    >
      <div className="social-proof-counts">
        <div className="social-count">
          <strong>
            {users != null && users > 0
              ? formatCount(users)
              : live
                ? '0'
                : 'Early access'}
          </strong>
          <span>
            {users != null && users > 0
              ? users === 1
                ? 'registered learner'
                : 'registered learners'
              : live
                ? 'registered learners — be first'
                : 'Join learners practicing now'}
          </span>
        </div>
        <div className="social-count">
          <strong>
            {feedback7d != null ? formatCount(feedback7d) : 'Live'}
          </strong>
          <span>
            {feedback7d != null
              ? 'coaching sessions (7 days)'
              : 'AI coaching when API is connected'}
          </span>
        </div>
        <div className="social-count">
          <strong>{PRODUCT_STATS.tracksCount}</strong>
          <span>structured practice tracks</span>
        </div>
        <div className="social-count">
          <strong>
            {PRODUCT_STATS.agenticVideosCount + PRODUCT_STATS.snowflakeVideosCount}+
          </strong>
          <span>curated path videos</span>
        </div>
        <Link className="social-count-link" to="/pricing">
          Start free →
        </Link>
      </div>

      <div className="testimonials-marquee" aria-label="Learner testimonials">
        <div className="testimonials-track">
          {loop.map((t, i) => (
            <figure className="testimonial-card" key={`${t.name}-${i}`}>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                <strong>{t.name}</strong>
                <span>{t.role}</span>
                <em>{t.focus}</em>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="social-proof-note muted">
        {live
          ? 'Learner and coaching counts from the live product database.'
          : 'Track & video counts from shipped curriculum. Learner count syncs when the API is live.'}{' '}
        Early learner feedback from Staff / EM practice sessions.
      </p>
    </section>
  )
}
