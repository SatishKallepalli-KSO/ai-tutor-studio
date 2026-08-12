import type { MockSessionSummary } from './mockSession'

/** Compact payload for share links / API. */
export type ShareableScorecard = {
  v: 1
  title: string
  trackId: string
  packId: string | null
  finishedAt: string
  durationSec: number
  averages: MockSessionSummary['averages']
  results: {
    prompt: string
    score: number | null
    skipped: boolean
    dims: MockSessionSummary['results'][0]['dims']
  }[]
}

export function toShareable(summary: MockSessionSummary): ShareableScorecard {
  return {
    v: 1,
    title: summary.title,
    trackId: String(summary.trackId),
    packId: summary.packId,
    finishedAt: summary.finishedAt,
    durationSec: summary.durationSec,
    averages: summary.averages,
    results: summary.results.map((r) => ({
      prompt: r.prompt.slice(0, 200),
      score: r.score,
      skipped: r.skipped,
      dims: r.dims,
    })),
  }
}

export function encodeLocalShare(card: ShareableScorecard): string {
  const json = JSON.stringify(card)
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return b64
}

export function decodeLocalShare(raw: string): ShareableScorecard | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const json = decodeURIComponent(escape(atob(padded + pad)))
    const parsed = JSON.parse(json) as ShareableScorecard
    if (parsed?.v !== 1 || !parsed.title) return null
    return parsed
  } catch {
    return null
  }
}

export function localSharePath(card: ShareableScorecard): string {
  return `/scorecard?d=${encodeLocalShare(card)}`
}
