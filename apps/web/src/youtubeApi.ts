/** Load the YouTube IFrame API script once and share the ready promise. */

export type YtPlayer = {
  destroy: () => void
  getCurrentTime: () => number
  getDuration: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getPlayerState: () => number
}

export type YtPlayerOptions = {
  videoId?: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, string | number | undefined>
  events?: {
    onReady?: (event: { target: YtPlayer }) => void
    onStateChange?: (event: { data: number; target: YtPlayer }) => void
    onError?: (event: { data: number }) => void
  }
}

export type YtNamespace = {
  Player: new (elementId: string | HTMLElement, options: YtPlayerOptions) => YtPlayer
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YtNamespace> | null = null

export function loadYouTubeApi(): Promise<YtNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API requires a browser'))
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.()
      } catch {
        /* ignore prior handler errors */
      }
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube API ready but YT.Player missing'))
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-yt-iframe-api]',
    )
    if (!existing) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.dataset.ytIframeApi = '1'
      tag.onerror = () => {
        apiPromise = null
        reject(new Error('Failed to load YouTube IFrame API'))
      }
      document.head.appendChild(tag)
    }

    // Script may have finished between check and handler registration.
    if (window.YT?.Player) resolve(window.YT)
  })

  return apiPromise
}
