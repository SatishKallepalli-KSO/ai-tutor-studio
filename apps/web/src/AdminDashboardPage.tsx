import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, ApiError, type AdminOverview } from './api'
import { useAuth } from './auth'
import { Shell } from './Shell'
import './App.css'

function BarRow({
  label,
  count,
  max,
}: {
  label: string
  count: number
  max: number
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="admin-bar-row">
      <div className="admin-bar-meta">
        <span title={label}>{label}</span>
        <strong>{count}</strong>
      </div>
      <div className="admin-bar-track" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const overview = await api.adminOverview(14)
      setData(overview)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Admin access required. Set ADMIN_EMAILS on the API for your account.')
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Sign in required.')
      } else if (!api.apiBase) {
        setError(
          'Admin dashboard needs the API running (VITE_API_BASE). GitHub Pages alone cannot store user analytics.',
        )
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user?.is_admin) void load()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user, load])

  if (authLoading) {
    return (
      <Shell wide>
        <p className="muted">Loading…</p>
      </Shell>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_admin) {
    return (
      <Shell>
        <section className="panel admin-denied reveal">
          <h1>Admin only</h1>
          <p className="muted">
            Your account is signed in but not marked as admin. Add your email to{' '}
            <code>ADMIN_EMAILS</code> on the API, then sign out and back in.
          </p>
          <Link className="btn ghost" to="/">
            Back to paths
          </Link>
        </section>
      </Shell>
    )
  }

  const maxFeature = Math.max(1, ...(data?.top_features.map((f) => f.count) ?? [1]))
  const maxPath = Math.max(1, ...(data?.top_paths.map((f) => f.count) ?? [1]))
  const maxTrack = Math.max(1, ...(data?.top_tracks.map((f) => f.count) ?? [1]))
  const maxSignup = Math.max(1, ...(data?.signups_by_day.map((d) => d.count) ?? [1]))

  return (
    <Shell wide>
      <section className="admin-hero reveal">
        <div>
          <p className="eyebrow">AI Tutor Studio · Admin</p>
          <h1>Usage dashboard</h1>
          <p className="hero-lede">
            Registrations, Free vs Pro mix, and which surfaces users hit most —
            paths, practice, feedback, Agentic AI, plans.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={() => void load()}>
          Refresh
        </button>
      </section>

      {error && <p className="error-banner">{error}</p>}
      {loading && !data && <p className="muted">Loading metrics…</p>}

      {data && (
        <>
          <div className="admin-kpi-grid reveal">
            <div className="admin-kpi">
              <em>Registered users</em>
              <strong>{data.total_users}</strong>
              <span>
                +{data.signups_last_7d} / 7d · +{data.signups_last_30d} / 30d
              </span>
            </div>
            <div className="admin-kpi">
              <em>Free / Pro</em>
              <strong>
                {data.free_users} / {data.pro_users}
              </strong>
              <span>{data.admin_users} admin account(s)</span>
            </div>
            <div className="admin-kpi">
              <em>Events (7d)</em>
              <strong>{data.events_last_7d}</strong>
              <span>{data.feedback_events_last_7d} feedback submits</span>
            </div>
            <div className="admin-kpi">
              <em>Free feedback today</em>
              <strong>{data.free_feedback_today}</strong>
              <span>Quota counter (Free plan)</span>
            </div>
          </div>

          <div className="admin-panels reveal">
            <section className="panel">
              <h3>Signups (last 14 days)</h3>
              <div className="admin-spark">
                {data.signups_by_day.map((d) => (
                  <div key={d.day} className="admin-spark-col" title={`${d.day}: ${d.count}`}>
                    <span
                      style={{
                        height: `${Math.max(8, Math.round((d.count / maxSignup) * 100))}%`,
                      }}
                    />
                    <em>{d.day.slice(5)}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h3>Most-used features</h3>
              {data.top_features.length === 0 ? (
                <p className="muted">No events yet — browse the app while API is running.</p>
              ) : (
                data.top_features.map((f) => (
                  <BarRow
                    key={f.key}
                    label={f.label || f.key}
                    count={f.count}
                    max={maxFeature}
                  />
                ))
              )}
            </section>

            <section className="panel">
              <h3>Top tracks</h3>
              {data.top_tracks.length === 0 ? (
                <p className="muted">No track activity yet.</p>
              ) : (
                data.top_tracks.map((t) => (
                  <BarRow key={t.key} label={t.key} count={t.count} max={maxTrack} />
                ))
              )}
            </section>

            <section className="panel">
              <h3>Top pages / paths</h3>
              {data.top_paths.length === 0 ? (
                <p className="muted">No page views yet.</p>
              ) : (
                data.top_paths.map((p) => (
                  <BarRow key={p.key} label={p.key} count={p.count} max={maxPath} />
                ))
              )}
            </section>
          </div>

          <section className="panel admin-users reveal">
            <h3>Recent registrations</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name || u.email}</strong>
                        <div className="muted">{u.email}</div>
                      </td>
                      <td>
                        <span className={u.is_pro ? 'plan-badge pro' : 'plan-badge'}>
                          {u.plan}
                          {u.is_admin ? ' · admin' : ''}
                        </span>
                      </td>
                      <td className="muted">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Shell>
  )
}
