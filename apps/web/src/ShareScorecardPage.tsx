import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { BRAND } from './brand'
import { Shell } from './Shell'
import { decodeLocalShare, type ShareableScorecard } from './shareScorecard'
import './App.css'

function ringStyle(score: number): CSSProperties {
  return { '--p': `${(Math.max(0, score) / 5) * 100}%` } as CSSProperties
}

export function ShareScorecardPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [card, setCard] = useState<ShareableScorecard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const localEncoded = params.get('d')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (localEncoded) {
      const decoded = decodeLocalShare(localEncoded)
      if (!cancelled) {
        if (decoded) setCard(decoded)
        else setError('This local share link is invalid or truncated.')
        setLoading(false)
      }
      return () => {
        cancelled = true
      }
    }

    if (!id) {
      setError('Missing scorecard id.')
      setLoading(false)
      return
    }

    void api
      .getScorecard(id)
      .then((row) => {
        if (cancelled) return
        const summary = row.summary as ShareableScorecard
        if (!summary?.title) {
          setError('Scorecard payload incomplete.')
          return
        }
        setCard(summary)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Scorecard not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, localEncoded])

  const mins = useMemo(
    () => (card ? Math.max(1, Math.round(card.durationSec / 60)) : 0),
    [card],
  )

  return (
    <Shell>
      <article className="share-scorecard page-narrow reveal">
        <p className="eyebrow">{BRAND.product} · Scorecard</p>
        {loading && <p className="muted">Loading scorecard…</p>}
        {error && <div className="banner error">{error}</div>}
        {card && !loading && (
          <>
            <h1>{card.title}</h1>
            <p className="muted">
              Timed mock · {mins} min ·{' '}
              {new Date(card.finishedAt).toLocaleString()}
            </p>

            <div className="mock-score-avg">
              <div
                className="score-ring lg"
                style={ringStyle(card.averages.overall ?? 0)}
              >
                <strong>{card.averages.overall ?? '—'}</strong>
                <span>/5</span>
              </div>
              <div className="mock-dim-avgs">
                <div>
                  <span className="muted">Content</span>
                  <strong>{card.averages.content || '—'}</strong>
                </div>
                <div>
                  <span className="muted">Clarity</span>
                  <strong>{card.averages.clarity || '—'}</strong>
                </div>
                <div>
                  <span className="muted">Delivery</span>
                  <strong>{card.averages.delivery || '—'}</strong>
                </div>
              </div>
            </div>

            <h2>Per question</h2>
            <ol className="mock-q-results">
              {card.results.map((r, i) => (
                <li key={`${i}-${r.prompt.slice(0, 24)}`}>
                  <span className="mock-q-idx">Q{i + 1}</span>
                  <div>
                    <strong>
                      {r.skipped
                        ? 'Skipped'
                        : r.score != null
                          ? `${r.score}/5`
                          : '—'}
                    </strong>
                    {r.dims && !r.skipped ? (
                      <span className="muted">
                        {' '}
                        · C {r.dims.content} · Cl {r.dims.clarity} · D{' '}
                        {r.dims.delivery}
                      </span>
                    ) : null}
                    <p>
                      {r.prompt}
                      {r.prompt.length >= 200 ? '…' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="actions share-scorecard-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => window.print()}
              >
                Print / PDF
              </button>
              <Link className="btn primary" to="/?hub=practice">
                Practice Out Loud
              </Link>
            </div>
          </>
        )}
      </article>
    </Shell>
  )
}
