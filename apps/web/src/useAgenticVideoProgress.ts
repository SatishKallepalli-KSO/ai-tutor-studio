import { useCallback, useEffect, useState } from 'react'
import {
  getWatchProgress,
  lessonProgressPercent,
  loadVideoProgress,
  markVideoDone,
  recordWatchProgress,
  toggleVideoDone,
  type WatchProgressMap,
} from './agenticProgress'
import { track } from './analytics'

/**
 * Agentic path done-set + watch-% state, persisted in localStorage.
 * Mirrors how Learn progress is read/written outside the page component.
 */
export function useAgenticVideoProgress() {
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const [watch, setWatch] = useState<WatchProgressMap>({})

  useEffect(() => {
    setDone(loadVideoProgress())
    setWatch(getWatchProgress())
  }, [])

  const markDone = useCallback(
    (videoId: string, source: 'manual' | 'auto' = 'manual') => {
      setDone((prev) => {
        if (prev.has(videoId)) return prev
        const next = markVideoDone(prev, videoId)
        track('agentic_video_complete', {
          path: '/agentic-path',
          properties: { video_id: videoId, source },
        })
        return next
      })
    },
    [],
  )

  const toggleDone = useCallback((videoId: string) => {
    setDone((prev) => {
      const { done: next, markedDone } = toggleVideoDone(prev, videoId)
      if (markedDone) {
        track('agentic_video_complete', {
          path: '/agentic-path',
          properties: { video_id: videoId, source: 'manual' },
        })
      }
      return next
    })
  }, [])

  const recordProgress = useCallback(
    (videoId: string, seconds: number, duration: number) => {
      const next = recordWatchProgress(videoId, seconds, duration)
      setWatch((prev) => {
        const prevPct = lessonProgressPercent(videoId, done, prev)
        const nextPct = lessonProgressPercent(videoId, done, next)
        const prevSec = Math.floor(prev[videoId]?.seconds ?? 0)
        const nextSec = Math.floor(next[videoId]?.seconds ?? 0)
        // Skip React updates when UI-facing progress is unchanged.
        if (prevPct === nextPct && prevSec === nextSec) return prev
        return next
      })
    },
    [done],
  )

  return { done, watch, markDone, toggleDone, recordProgress }
}
