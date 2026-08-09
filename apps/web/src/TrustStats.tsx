import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type PublicStats } from './api'
import { PRODUCT_STATS } from './productStats'

type Status = 'loading' | 'live' | 'fallback'

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    if (!api.apiBase) {
      setStatus('fallback')
      setStats(null)
      return
    }
    api
      .publicStats()
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setStatus('live')
      })
      .catch(() => {
        if (cancelled) return
        setStats(null)
        setStatus('fallback')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { stats, status }
}

type TrustStatsProps = {
  /** Compact strip for home; fuller block for company pages. */
  variant?: 'strip' | 'panel'
  className?: string
}

export function TrustStats({
  variant = 'strip',
  className = '',
}: TrustStatsProps) {
  const { stats, status } = usePublicStats()

  const usersLabel =
    status === 'live' && stats
      ? formatCount(stats.total_users)
      : status === 'loading'
        ? '…'
        : null

  const feedbackLabel =
    status === 'live' && stats
      ? formatCount(stats.feedback_events_last_7d)
      : null

  return (
    <section
      className={`trust-stats trust-stats-${variant} ${className}`.trim()}
      aria-label="Product credibility metrics"
    >
      <div className="trust-stats-grid">
        <div className="trust-stat">
          <strong>
            {usersLabel ?? (
              <span className="trust-fallback">Connect API</span>
            )}
          </strong>
          <span>
            {usersLabel != null
              ? 'Registered learners'
              : 'Live learner count when connected to API'}
          </span>
        </div>
        <div className="trust-stat">
          <strong>{PRODUCT_STATS.tracksCount}</strong>
          <span>Interview &amp; language tracks</span>
        </div>
        <div className="trust-stat">
          <strong>{PRODUCT_STATS.agenticVideosCount}</strong>
          <span>Agentic AI path videos</span>
        </div>
        <div className="trust-stat">
          <strong>{PRODUCT_STATS.snowflakeVideosCount}</strong>
          <span>Snowflake path videos</span>
        </div>
        {variant === 'panel' && feedbackLabel != null && (
          <div className="trust-stat">
            <strong>{feedbackLabel}</strong>
            <span>AI coaching sessions (7d)</span>
          </div>
        )}
      </div>
      <p className="trust-stats-note muted">
        {status === 'live'
          ? 'Learner count from live product database. Track & video counts from shipped curriculum.'
          : status === 'loading'
            ? 'Loading live learner count…'
            : 'Static Pages build: track & video counts are real; learner count needs the API.'}{' '}
        <Link to="/compare">Compare vs similar tools →</Link>
      </p>
    </section>
  )
}
