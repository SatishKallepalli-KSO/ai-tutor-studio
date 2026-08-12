import type { CSSProperties } from 'react'
import type { MockSessionSummary } from './mockSession'

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
              <p>{r.prompt.slice(0, 120)}{r.prompt.length > 120 ? '…' : ''}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="actions">
        <button type="button" className="btn primary" onClick={onClose}>
          Back to practice hub
        </button>
        {onRetry ? (
          <button type="button" className="btn ghost" onClick={onRetry}>
            Run mock again
          </button>
        ) : null}
      </div>
    </section>
  )
}
