import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import {
  agenticPracticeHref,
  type PathPhase,
  type PathVideo,
} from './agenticPath'
import {
  aggregateProgressPercent,
  lessonProgressPercent,
  type WatchProgressMap,
} from './agenticProgress'
import { track } from './analytics'

type Props = {
  phases: PathPhase[]
  activeId: string | undefined
  done: Set<string>
  watch: WatchProgressMap
  onSelect: (videoId: string) => void
}

/** Phase + lesson list for the Agentic path player. */
export function AgenticPathSidebar({
  phases,
  activeId,
  done,
  watch,
  onSelect,
}: Props) {
  return (
    <aside className="path-sidebar reveal">
      <AdSlot
        id="agentic-sidebar"
        variant="sidebar"
        headline="Learning partners"
        detail="Compact placement beside the video curriculum."
      />
      {phases.length === 0 && (
        <p className="muted">No videos match that search.</p>
      )}
      {phases.map((phase) => {
        const phaseDoneCount = phase.videos.filter((v) => done.has(v.id)).length
        const phaseDone =
          phase.videos.length > 0 && phaseDoneCount === phase.videos.length
        const phasePct = aggregateProgressPercent(phase.videos, done, watch)
        return (
          <div key={phase.id} className="path-phase">
            <div className="path-phase-head">
              <span className="pill">Phase {phase.step}</span>
              {phaseDone ? <span className="pill done">Done</span> : null}
              <strong>{phase.title}</strong>
              <p>
                {phase.blurb} · {phase.videos.length} items
                {phaseDoneCount > 0
                  ? ` · ${phaseDoneCount}/${phase.videos.length} watched`
                  : ''}
              </p>
              <div
                className="progress-bar path-lesson-bar"
                role="progressbar"
                aria-valuenow={phasePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Phase ${phase.step} progress`}
              >
                <span style={{ width: `${phasePct}%` }} />
              </div>
              <p className="path-lesson-pct muted">{phasePct}% complete</p>
              {phaseDone ? (
                <Link
                  className="path-phase-practice"
                  to={agenticPracticeHref(phase.practiceTopicId)}
                  onClick={() =>
                    track('agentic_practice_cta', {
                      path: '/agentic-path',
                      properties: {
                        source: 'phase_sidebar',
                        phase_id: phase.id,
                        topic_id: phase.practiceTopicId,
                      },
                    })
                  }
                >
                  Practice with AI feedback →
                </Link>
              ) : null}
            </div>
            {phase.videos.map((video: PathVideo, i) => {
              const lessonPct = lessonProgressPercent(video.id, done, watch)
              return (
                <button
                  key={video.id}
                  type="button"
                  className={
                    video.id === activeId
                      ? 'path-video-item active'
                      : 'path-video-item'
                  }
                  onClick={() => onSelect(video.id)}
                >
                  <span className="path-video-idx">
                    {done.has(video.id) ? '✓' : `${phase.step}.${i + 1}`}
                  </span>
                  <span className="path-video-meta">
                    <strong>{video.title}</strong>
                    <em>
                      {video.channel} · {video.duration}
                      {lessonPct > 0 && !done.has(video.id)
                        ? ` · ${lessonPct}%`
                        : ''}
                      {done.has(video.id) ? ' · Complete' : ''}
                    </em>
                    <span
                      className="progress-bar path-video-bar"
                      aria-hidden="true"
                    >
                      <span style={{ width: `${lessonPct}%` }} />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </aside>
  )
}
