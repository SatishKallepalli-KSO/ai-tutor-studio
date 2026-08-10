import { useEffect, useId, useRef } from 'react'
import { AUTO_COMPLETE_THRESHOLD } from './agenticProgress'
import type { PathVideo } from './agenticPath'
import {
  loadYouTubeApi,
  type YtNamespace,
  type YtPlayer,
  type YtPlayerVars,
} from './youtubeApi'

type Props = {
  video: PathVideo
  /** Resume position in seconds (from localStorage). */
  startSeconds?: number
  title: string
  onProgress: (seconds: number, duration: number) => void
  /** Fired once when watch ratio crosses AUTO_COMPLETE_THRESHOLD or video ends. */
  onNearComplete?: () => void
}

const POLL_MS = 2000

export function YouTubePlayer({
  video,
  startSeconds = 0,
  title,
  onProgress,
  onNearComplete,
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const shellRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const pollRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const onProgressRef = useRef(onProgress)
  const onNearCompleteRef = useRef(onNearComplete)
  const startRef = useRef(startSeconds)

  onProgressRef.current = onProgress
  onNearCompleteRef.current = onNearComplete
  startRef.current = startSeconds

  useEffect(() => {
    completedRef.current = false
    let cancelled = false
    let yt: YtNamespace | null = null
    const shell = shellRef.current
    if (!shell) return

    // Fresh mount node each lesson — YT.Player replaces the target element.
    shell.replaceChildren()
    const mount = document.createElement('div')
    const hostId = `yt-player-${reactId}-${video.id}`
    mount.id = hostId
    mount.className = 'yt-player-host'
    shell.appendChild(mount)

    function stopPoll() {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    function persist(player: YtPlayer) {
      try {
        const seconds = player.getCurrentTime()
        const duration = player.getDuration()
        if (!Number.isFinite(seconds) || seconds < 0) return
        const dur = Number.isFinite(duration) && duration > 0 ? duration : 0
        onProgressRef.current(seconds, dur)
        if (
          !completedRef.current &&
          dur > 0 &&
          seconds / dur >= AUTO_COMPLETE_THRESHOLD
        ) {
          completedRef.current = true
          onNearCompleteRef.current?.()
        }
      } catch {
        /* player may be mid-destroy */
      }
    }

    function startPoll(player: YtPlayer) {
      stopPoll()
      pollRef.current = window.setInterval(() => persist(player), POLL_MS)
    }

    function destroyPlayer() {
      stopPoll()
      const p = playerRef.current
      playerRef.current = null
      if (!p) return
      try {
        persist(p)
      } catch {
        /* ignore */
      }
      try {
        p.destroy()
      } catch {
        /* ignore */
      }
    }

    const onPageHide = () => {
      if (playerRef.current) persist(playerRef.current)
    }

    void loadYouTubeApi()
      .then((api) => {
        if (cancelled || !document.getElementById(hostId)) return
        yt = api

        const start = Math.max(0, Math.floor(startRef.current))
        const playerVars: YtPlayerVars = {
          enablejsapi: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        }
        if (start > 0) playerVars.start = start

        if (video.playlistId) {
          playerVars.listType = 'playlist'
          playerVars.list = video.playlistId
        }

        const player = new api.Player(hostId, {
          width: '100%',
          height: '100%',
          videoId: video.playlistId ? undefined : video.youtubeId,
          playerVars,
          events: {
            onReady: (event) => {
              if (cancelled) {
                try {
                  event.target.destroy()
                } catch {
                  /* ignore */
                }
                return
              }
              playerRef.current = event.target
              if (start > 0) {
                try {
                  event.target.seekTo(start, true)
                } catch {
                  /* start param may already apply */
                }
              }
              persist(event.target)
            },
            onStateChange: (event) => {
              if (cancelled || !yt) return
              const target = event.target
              playerRef.current = target
              const { PLAYING, PAUSED, ENDED } = yt.PlayerState
              if (event.data === PLAYING) {
                startPoll(target)
              } else if (event.data === PAUSED) {
                stopPoll()
                persist(target)
              } else if (event.data === ENDED) {
                stopPoll()
                persist(target)
                if (!completedRef.current) {
                  completedRef.current = true
                  onNearCompleteRef.current?.()
                }
              }
            },
          },
        })
        playerRef.current = player
      })
      .catch(() => {
        /* API load failure — Open on YouTube still works */
      })

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)

    return () => {
      cancelled = true
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
      destroyPlayer()
      shell.replaceChildren()
    }
  }, [video.id, video.youtubeId, video.playlistId, reactId])

  return (
    <div className="video-frame" aria-label={title}>
      <div ref={shellRef} className="yt-player-shell" />
    </div>
  )
}
