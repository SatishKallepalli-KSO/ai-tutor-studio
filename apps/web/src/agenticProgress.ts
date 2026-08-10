/** Persist Agentic path completion + watch position locally (mirrors learnProgress). */

/** Auto-mark complete when watch ratio reaches this threshold. */
export const AUTO_COMPLETE_THRESHOLD = 0.9

/** Don't resume for tiny watches; restart if already near the end. */
const RESUME_MIN_SECONDS = 5
const RESUME_RESTART_RATIO = 0.95

const DONE_KEY = 'ats_agentic_video_done'
const WATCH_KEY = 'ats_agentic_video_watch'

export type VideoWatchProgress = {
  seconds: number
  duration?: number
  updatedAt: number
}

export type WatchProgressMap = Record<string, VideoWatchProgress>

function readDone(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeDone(done: Set<string>) {
  localStorage.setItem(DONE_KEY, JSON.stringify([...done]))
}

function readWatch(): WatchProgressMap {
  try {
    const raw = localStorage.getItem(WATCH_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: WatchProgressMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue
      const entry = value as Partial<VideoWatchProgress>
      if (typeof entry.seconds !== 'number' || !Number.isFinite(entry.seconds)) {
        continue
      }
      out[id] = {
        seconds: Math.max(0, entry.seconds),
        ...(typeof entry.duration === 'number' &&
        Number.isFinite(entry.duration) &&
        entry.duration > 0
          ? { duration: entry.duration }
          : {}),
        updatedAt:
          typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt)
            ? entry.updatedAt
            : Date.now(),
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeWatch(all: WatchProgressMap) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(all))
}

export function loadVideoProgress(): Set<string> {
  return readDone()
}

export function saveVideoProgress(done: Set<string>) {
  writeDone(done)
}

export function getWatchProgress(): WatchProgressMap {
  return readWatch()
}

export function getVideoWatch(videoId: string): VideoWatchProgress | undefined {
  return readWatch()[videoId]
}

/** Read-modify-write furthest-watched seconds (keeps max), like recordAttempt. */
export function recordWatchProgress(
  videoId: string,
  seconds: number,
  duration?: number,
): WatchProgressMap {
  const all = readWatch()
  const prev = all[videoId]
  const nextSeconds = Math.max(prev?.seconds ?? 0, Math.max(0, seconds))
  const nextDuration =
    duration && duration > 0
      ? Math.max(prev?.duration ?? 0, duration)
      : prev?.duration
  // Skip no-op writes so 2s polling does not thrash localStorage.
  if (
    prev &&
    prev.seconds === nextSeconds &&
    (prev.duration ?? undefined) === nextDuration
  ) {
    return all
  }
  all[videoId] = {
    seconds: nextSeconds,
    ...(nextDuration ? { duration: nextDuration } : {}),
    updatedAt: Date.now(),
  }
  writeWatch(all)
  return all
}

export function markVideoDone(done: Set<string>, videoId: string): Set<string> {
  if (done.has(videoId)) return done
  const next = new Set(done)
  next.add(videoId)
  writeDone(next)
  return next
}

export function toggleVideoDone(
  done: Set<string>,
  videoId: string,
): { done: Set<string>; markedDone: boolean } {
  const next = new Set(done)
  const markedDone = !next.has(videoId)
  if (markedDone) next.add(videoId)
  else next.delete(videoId)
  writeDone(next)
  return { done: next, markedDone }
}

/** Seconds to resume from when opening a lesson. */
export function resumeSeconds(progress?: VideoWatchProgress): number {
  if (!progress?.seconds) return 0
  const s = Math.floor(progress.seconds)
  if (s < RESUME_MIN_SECONDS) return 0
  if (progress.duration && progress.duration > 0) {
    if (s / progress.duration >= RESUME_RESTART_RATIO) return 0
  }
  return Math.max(0, s - 2)
}

export function watchPercent(progress?: VideoWatchProgress): number {
  if (!progress) return 0
  if (progress.duration && progress.duration > 0) {
    return Math.min(
      100,
      Math.round((progress.seconds / progress.duration) * 100),
    )
  }
  // No duration yet — modest in-progress signal once watching started.
  if (progress.seconds > 0) return Math.min(15, Math.round(progress.seconds / 10))
  return 0
}

/** Per-lesson bar: done = 100%, else watch %. */
export function lessonProgressPercent(
  videoId: string,
  done: Set<string>,
  watch: WatchProgressMap,
): number {
  if (done.has(videoId)) return 100
  return watchPercent(watch[videoId])
}

/** Average of lesson progress across a phase (or whole path). */
export function aggregateProgressPercent(
  videos: ReadonlyArray<{ id: string }>,
  done: Set<string>,
  watch: WatchProgressMap,
): number {
  if (!videos.length) return 0
  const sum = videos.reduce(
    (acc, v) => acc + lessonProgressPercent(v.id, done, watch),
    0,
  )
  return Math.round(sum / videos.length)
}

export function formatWatchTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}
