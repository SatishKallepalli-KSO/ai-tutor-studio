import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { MockSessionSummary } from './mockSession'
import { localSharePath, toShareable } from './shareScorecard'
import { track as trackEvent } from './analytics'

type Props = {
  summary: MockSessionSummary
  onClose: () => void
  onRetry?: () => void
}

function ringStyle(score: number): CSSProperties {
  return { '--p': `${(score / 5) * 100}%` } as CSSProperties
}

export function MockScorecard({ summary, onClose, onRetry }: Props) {
  const avg = summary.averages
  const answered = summary.results.filter((r) => !r.skipped).length
  const skipped = summary.results.filter((r) => r.skipped).length
  const mins = Math.max(1, Math.round(summary.durationSec / 60))
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  async function resolveShareUrl(): Promise<string> {
    if (shareUrl) return shareUrl
    setShareBusy(true)
    setShareError(null)
    const card = toShareable(summary)
    try {
      const row = await api.createScorecard({
        title: card.title,
        summary: card as unknown as Record<string, unknown>,
      })
      const url = `${window.location.origin}/scorecard/${row.id}`
      setShareUrl(url)
      trackEvent('scorecard_share', {
        path: '/scorecard',
        properties: { id: row.id, via: 'api' },
      })
      return url
    } catch {
      const path = localSharePath(card)
      const url = `${window.location.origin}${path}`
      setShareUrl(url)
      trackEvent('scorecard_share', {
        path: '/scorecard',
        properties: { via: 'local' },
      })
      if (url.length > 1800) {
        setShareError(
          'Link created locally (API unavailable). Very long — prefer Print/PDF.',
        )
      }
      return url
    } finally {
      setShareBusy(false)
    }
  }

  async function copyShare() {
    const url = await resolveShareUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      setShareError('Copy failed — select the link manually.')
    }
  }

  return (
    <section className="mock-scorecard panel reveal" aria-label="Mock scorecard">
      <div className="section-title">
        <p className="eyebrow">Timed mock</p>
        <h2>{summary.title} — scorecard</h2>
        <p className="muted">
          {answered} answered
          {skipped ? ` · ${skipped} skipped` : ''} · {mins} min
        </p>
      </div>

      <div className="mock-score-avg">
        <div className="score-ring lg" style={ringStyle(avg.overall ?? 0)}>
          <strong>{avg.overall ?? '—'}</strong>
          <span>/5</span>
        </div>
        <div className="mock-dim-avgs">
          <div>
            <span className="muted">Content</span>
            <strong>{avg.content || '—'}</strong>
          </div>
          <div>
            <span className="muted">Clarity</span>
            <strong>{avg.clarity || '—'}</strong>
          </div>
          <div>
            <span className="muted">Delivery</span>
            <strong>{avg.delivery || '—'}</strong>
          </div>
        </div>
      </div>

      <h3>Per question</h3>
      <ol className="mock-q-results">
        {summary.results.map((r, i) => (
          <li key={r.questionId}>
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
                {r.prompt.slice(0, 120)}
                {r.prompt.length > 120 ? '…' : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {shareUrl ? (
        <p className="share-link-row">
          <span className="muted">Share link</span>
          <a href={shareUrl}>{shareUrl}</a>
        </p>
      ) : null}
      {shareError ? <p className="muted">{shareError}</p> : null}

      <div className="actions">
        <button type="button" className="btn primary" onClick={onClose}>
          Back to practice hub
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={shareBusy}
          onClick={() => void copyShare()}
        >
          {shareUrl ? 'Copy share link' : 'Share scorecard'}
        </button>
        {shareUrl ? (
          <Link className="btn ghost" to={shareUrl.replace(window.location.origin, '')}>
            Open page
          </Link>
        ) : null}
        {onRetry ? (
          <button type="button" className="btn ghost" onClick={onRetry}>
            Run mock again
          </button>
        ) : null}
      </div>
    </section>
  )
}
