import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  api,
  FREE_PRACTICE_TRACKS,
  type Feedback,
  type Track,
  type TutorQuestion,
} from './api'
import { AdSlot } from './AdSlot'
import { track as trackEvent } from './analytics'
import { useAuth } from './auth'
import { AUDIENCES, AI_ENGINEER_JOURNEY, BRAND } from './brand'
import { getTopic, topicsForTrack, type Topic } from './curriculum'
import {
  getTrackProgress,
  markTopicStudied,
  pathStats,
  recordAttempt,
} from './learnProgress'
import { usePersona } from './persona'
import { Shell, TRACK_GROUPS } from './Shell'
import { SocialProof } from './SocialProof'
import { speakText, stopSpeaking, useSpeechAnswer } from './useSpeechAnswer'
import './App.css'

type Step = 'tracks' | 'learn' | 'practice'

function wordCount(text: string) {
  return (text.trim().match(/[a-z0-9']+/gi) ?? []).length
}

function speakSeconds(words: number) {
  return Math.max(0, Math.round((words / 140) * 60))
}

export default function App() {
  const { user, refresh } = useAuth()
  const { isRecruiter } = usePersona()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackId, setTrackId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TutorQuestion[]>([])
  const [topicId, setTopicId] = useState<string | null>(null)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [interim, setInterim] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [step, setStep] = useState<Step>('tracks')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paywall, setPaywall] = useState<string | null>(null)
  const [progressTick, setProgressTick] = useState(0)
  const loadingTrackRef = useRef<string | null>(null)

  /** Keep learn/practice in the URL so browser Back works. */
  function writeLearnUrl(next: {
    path: string | null
    mode?: 'learn' | 'practice'
    topic?: string | null
    q?: string | null
    replace?: boolean
  }) {
    const sp = new URLSearchParams()
    const billing = params.get('billing')
    if (billing) sp.set('billing', billing)
    if (next.path) {
      sp.set('path', next.path)
      sp.set('mode', next.mode ?? 'learn')
      if (next.topic) sp.set('topic', next.topic)
      if (next.q) sp.set('q', next.q)
    }
    const search = sp.toString()
    navigate({ pathname: '/', search: search ? `?${search}` : '' }, {
      replace: next.replace,
    })
  }

  function clearLearnUrl() {
    const sp = new URLSearchParams()
    const billing = params.get('billing')
    if (billing) sp.set('billing', billing)
    const search = sp.toString()
    navigate({ pathname: '/', search: search ? `?${search}` : '' })
  }

  const speech = useSpeechAnswer({
    onTranscript: (finalChunk, liveInterim) => {
      if (finalChunk) {
        setAnswer(
          (prev) =>
            `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${finalChunk}`,
        )
        setInputMode('voice')
      }
      setInterim(liveInterim)
    },
  })

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === trackId) ?? null,
    [trackId, tracks],
  )
  const topics = useMemo(
    () => (trackId ? topicsForTrack(trackId) : []),
    [trackId],
  )
  const topic = useMemo(
    () => (topicId ? getTopic(topicId) ?? null : null),
    [topicId],
  )
  const topicQuestions = useMemo(() => {
    if (!topicId) return questions
    return questions.filter((q) => q.topic_id === topicId)
  }, [questions, topicId])
  const question = useMemo(
    () => questions.find((q) => q.id === questionId) ?? null,
    [questionId, questions],
  )

  const trackIsProOnly = trackId ? !FREE_PRACTICE_TRACKS.has(trackId) : false
  const canPractice =
    !!user &&
    (user.is_pro || (trackId ? FREE_PRACTICE_TRACKS.has(trackId) : false))

  const liveAnswer = interim
    ? `${answer}${answer && !answer.endsWith(' ') ? ' ' : ''}${interim}`
    : answer
  const words = wordCount(liveAnswer)
  const seconds = speakSeconds(words)
  const topicIndex = Math.max(
    0,
    topics.findIndex((t) => t.id === topicId),
  )
  const progressPct =
    topics.length > 0 ? Math.round(((topicIndex + 1) / topics.length) * 100) : 0

  const learnStats = useMemo(() => {
    void progressTick
    if (!trackId) return null
    return pathStats(
      trackId,
      topics.map((t) => t.id),
      questions.map((q) => q.id),
    )
  }, [trackId, topics, questions, progressTick])

  const trackProgress = useMemo(() => {
    void progressTick
    return trackId ? getTrackProgress(trackId) : null
  }, [trackId, progressTick])

  useEffect(() => {
    api
      .tracks()
      .then(setTracks)
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (params.get('billing') === 'success') void refresh()
  }, [params, refresh])

  // Browser Back/Forward + deep links: URL is the source of truth for workspace.
  useEffect(() => {
    const urlPath = params.get('path')
    const urlMode = params.get('mode') === 'practice' ? 'practice' : 'learn'
    const urlTopic = params.get('topic')
    const urlQ = params.get('q')

    if (!urlPath) {
      if (step !== 'tracks' || trackId) {
        setStep('tracks')
        setTrackId(null)
        setTopicId(null)
        setQuestionId(null)
        setQuestions([])
        setFeedback(null)
        setPaywall(null)
        speech.stop()
        stopSpeaking()
      }
      return
    }

    setStep(urlMode)
    if (urlTopic) setTopicId(urlTopic)
    if (urlQ) setQuestionId(urlQ)

    if (trackId === urlPath && questions.length > 0) {
      if (urlTopic && urlTopic !== topicId) {
        const qs = questions.filter((q) => q.topic_id === urlTopic)
        if (!urlQ) setQuestionId(qs[0]?.id ?? null)
      }
      return
    }

    if (loadingTrackRef.current === urlPath) return
    loadingTrackRef.current = urlPath
    setError(null)
    setPaywall(null)
    setTrackId(urlPath)
    setFeedback(null)
    setAnswer('')
    setLoading(true)
    void api
      .questions(urlPath)
      .then((qs) => {
        setQuestions(qs)
        const topics = topicsForTrack(urlPath)
        const topic =
          (urlTopic && topics.some((t) => t.id === urlTopic) && urlTopic) ||
          topics[0]?.id ||
          qs[0]?.topic_id ||
          null
        setTopicId(topic)
        const topicQs = topic ? qs.filter((q) => q.topic_id === topic) : qs
        const qid =
          (urlQ && qs.some((q) => q.id === urlQ) && urlQ) ||
          topicQs[0]?.id ||
          qs[0]?.id ||
          null
        setQuestionId(qid)
        setStep(urlMode)
      })
      .catch((err: Error) => {
        setError(err.message)
        clearLearnUrl()
      })
      .finally(() => {
        setLoading(false)
        loadingTrackRef.current = null
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL params only
  }, [params])

  async function selectTrack(id: string) {
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    const firstTopic = topicsForTrack(id)[0]
    writeLearnUrl({
      path: id,
      mode: 'learn',
      topic: firstTopic?.id ?? null,
    })
    trackEvent('track_open', {
      path: '/',
      properties: { track_id: id },
    })
    trackEvent('learn_open', {
      path: '/',
      properties: { track_id: id },
    })
  }

  function selectTopic(next: Topic) {
    setFeedback(null)
    setAnswer('')
    if (trackId) {
      markTopicStudied(trackId, next.id)
      setProgressTick((n) => n + 1)
    }
    writeLearnUrl({
      path: trackId ?? params.get('path'),
      mode: step === 'practice' ? 'practice' : 'learn',
      topic: next.id,
    })
    trackEvent('topic_open', {
      path: '/',
      properties: { track_id: trackId, topic_id: next.id },
    })
  }

  function markCurrentStudied() {
    if (!trackId || !topicId) return
    markTopicStudied(trackId, topicId)
    setProgressTick((n) => n + 1)
  }

  function goNextQuestion() {
    const list = topicQuestions.length ? topicQuestions : questions
    if (!list.length) return
    const idx = list.findIndex((q) => q.id === questionId)
    const next = list[(idx >= 0 ? idx + 1 : 0) % list.length]
    if (!next) return
    // If wrapped and there is a next topic with questions, advance topic
    if (idx === list.length - 1 && topicId && topics.length) {
      const tIdx = topics.findIndex((t) => t.id === topicId)
      const nextTopic = topics[tIdx + 1]
      if (nextTopic) {
        if (trackId) {
          markTopicStudied(trackId, nextTopic.id)
          setProgressTick((n) => n + 1)
        }
        writeLearnUrl({
          path: trackId,
          mode: 'practice',
          topic: nextTopic.id,
        })
        setFeedback(null)
        setAnswer('')
        setInterim('')
        setInputMode('text')
        speech.stop()
        stopSpeaking()
        return
      }
    }
    writeLearnUrl({
      path: trackId,
      mode: 'practice',
      topic: topicId,
      q: next.id,
    })
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
  }

  function retrySameQuestion() {
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
  }

  function goPractice(forTopicId?: string) {
    if (!user) {
      setPaywall('Sign in to practice and get feedback on your answers.')
      return
    }
    if (trackId && !user.is_pro && !FREE_PRACTICE_TRACKS.has(trackId)) {
      setPaywall(
        'This path is Pro-only. Go Pro to unlock Staff, EM, Java→AI, and advanced language drills.',
      )
      return
    }
    const id = forTopicId ?? topicId
    if (id && trackId) {
      markTopicStudied(trackId, id)
      setProgressTick((n) => n + 1)
    }
    setFeedback(null)
    setAnswer('')
    setPaywall(null)
    const qs = id ? questions.filter((q) => q.topic_id === id) : questions
    writeLearnUrl({
      path: trackId,
      mode: 'practice',
      topic: id,
      q: qs[0]?.id ?? questionId,
    })
    trackEvent('practice_start', {
      path: '/',
      properties: { track_id: trackId, topic_id: id ?? topicId },
    })
  }

  async function submitAnswer() {
    if (!trackId || !questionId) return
    const spokenOrTyped = liveAnswer.trim()
    if (!spokenOrTyped) return
    if (!user) {
      setPaywall('Sign in to get feedback.')
      return
    }
    speech.stop()
    setInterim('')
    setAnswer(spokenOrTyped)
    setLoading(true)
    setError(null)
    setFeedback(null)
    setPaywall(null)
    try {
      const result = await api.feedback({
        track_id: trackId as Track['id'],
        question_id: questionId,
        answer: spokenOrTyped,
        input_mode: inputMode,
      })
      setFeedback(result)
      recordAttempt(trackId, questionId, result.score, result.provider)
      setProgressTick((n) => n + 1)
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(err.message)
      } else if (err instanceof ApiError && err.status === 401) {
        setPaywall('Sign in to get feedback on your answers.')
      } else if (!api.apiBase && user) {
        const key = `ats_fb_${new Date().toISOString().slice(0, 10)}`
        const used = Number(localStorage.getItem(key) || '0')
        if (!user.is_pro && used >= 5) {
          setPaywall(
            'Free daily coaching limit reached. Go Pro for unlimited feedback.',
          )
        } else if (
          !user.is_pro &&
          trackId &&
          !FREE_PRACTICE_TRACKS.has(trackId)
        ) {
          setPaywall('This path is Pro-only. Go Pro to unlock full access.')
        } else {
          const result = api.localFeedback({
            track_id: trackId as Track['id'],
            question_id: questionId,
            answer: spokenOrTyped,
            input_mode: inputMode,
          })
          setFeedback(result)
          recordAttempt(trackId, questionId, result.score, result.provider)
          setProgressTick((n) => n + 1)
          if (!user.is_pro) localStorage.setItem(key, String(used + 1))
        }
      } else {
        setError(err instanceof Error ? err.message : 'Feedback failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell wide={step !== 'tracks'}>
      {error && <div className="banner error">{error}</div>}
      {paywall && (
        <div className="banner paywall reveal">
          <div>
            <strong>Ready for Pro?</strong>
            <p>{paywall}</p>
          </div>
          <div className="actions">
            {!user ? (
              <Link className="btn primary" to="/register">
                Create free account
              </Link>
            ) : (
              <Link className="btn primary" to="/pricing">
                See Pro plans
              </Link>
            )}
          </div>
        </div>
      )}

      {step === 'tracks' && (
        <>
          <section className="hero reveal">
            <p className="eyebrow">practiceoutloud.com</p>
            <h1 className="brand-hero">
              {isRecruiter ? 'Hire practice-ready talent' : BRAND.product}
              <span>
                {isRecruiter
                  ? 'Secondary surface — post jobs after candidates train here.'
                  : BRAND.magnet}
              </span>
            </h1>
            <p className="hero-lede">
              {isRecruiter ? AUDIENCES.companies.blurb : BRAND.magnetSub}
            </p>
            <div className="hero-cta">
              {isRecruiter ? (
                <>
                  <Link className="btn primary" to="/jobs">
                    Browse &amp; post jobs
                  </Link>
                  <Link className="btn ghost" to="/">
                    See learner product
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn primary" to="/agentic-path">
                    Explore Agentic AI
                  </Link>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={loading}
                    onClick={() => void selectTrack('staff-interview')}
                  >
                    Practice Staff loop
                  </button>
                  <a className="btn ghost" href="#paths">
                    Browse all paths
                  </a>
                </>
              )}
            </div>
            <div className="hero-stage" aria-hidden="true">
              <div className="hero-orbit" />
              <div className="hero-panel">
                <span className="pulse-dot" />
                {isRecruiter
                  ? 'Hiring · phase 2'
                  : 'Learn · practice · AI feedback'}
                <em>
                  {isRecruiter
                    ? '“Reach candidates who already practiced out loud.”'
                    : '“I learned the path, practiced out loud, and the coach told me exactly what to fix.”'}
                </em>
              </div>
            </div>
          </section>

          {!isRecruiter && (
            <div className="learning-trust reveal" aria-label="Product highlights">
              <span>
                <b>Learn</b> AI paths &amp; Agentic curriculum
              </span>
              <span>
                <b>Practice</b> out loud on real prompts
              </span>
              <span>
                <b>AI feedback</b> on content &amp; delivery
              </span>
              <span>
                <b>Free</b> to start · Pro when ready
              </span>
            </div>
          )}

          {!isRecruiter && <SocialProof />}

          {!isRecruiter && (
            <section className="magnet-proof reveal" aria-label="AI engineer journey">
              {AI_ENGINEER_JOURNEY.map((item) => (
                <div key={item.step}>
                  <strong>
                    {item.step}. {item.title}
                  </strong>
                  <p>{item.blurb}</p>
                </div>
              ))}
            </section>
          )}

          {!isRecruiter && (
            <section
              className="featured-learning reveal"
              aria-label="Featured learning paths"
            >
              <div className="section-title">
                <h2>Learn · practice · AI feedback</h2>
                <p className="muted">
                  Agentic AI, production AI upskilling, and interview loops —
                  same study → speak → coach loop.
                </p>
              </div>
              <div className="featured-grid">
                <Link to="/agentic-path" className="featured-course agentic">
                  <span className="cover" aria-hidden="true" />
                  <span className="body">
                    <span className="pill-row">
                      <span className="pill">Headline path</span>
                      <span className="pill">Free videos</span>
                    </span>
                    <strong>Agentic AI curriculum</strong>
                    <p>
                      Backend → Python for AI → LLMs → tools/agents → RAG →
                      LangGraph → production. Watch, mark done, then practice
                      with AI feedback.
                    </p>
                    <span className="meta">Open Agentic path →</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="featured-course em"
                  disabled={loading}
                  onClick={() => void selectTrack('staff-interview')}
                >
                  <span className="cover" aria-hidden="true" />
                  <span className="body">
                    <span className="pill-row">
                      <span className="pill">Interview</span>
                      <span className="pill lock">Pro practice</span>
                    </span>
                    <strong>Staff Engineer interview loop</strong>
                    <p>
                      Ownership, design, AI safety, and influence — practiced
                      out loud until the panel is easy.
                    </p>
                    <span className="meta">Open path →</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="featured-course ai"
                  disabled={loading}
                  onClick={() => void selectTrack('java-to-ai')}
                >
                  <span className="cover" aria-hidden="true" />
                  <span className="body">
                    <span className="pill-row">
                      <span className="pill">AI Engineer</span>
                      <span className="pill lock">Pro practice</span>
                    </span>
                    <strong>Java → Production AI</strong>
                    <p>
                      Map your backend skills to RAG, agents, evals, and LLM
                      ops — then speak the story.
                    </p>
                    <span className="meta">Open path →</span>
                  </span>
                </button>
              </div>
            </section>
          )}

          {!isRecruiter && (
            <section className="learner-path-highlights reveal" aria-label="More AI paths">
              <button
                type="button"
                className="path-banner path-banner-btn"
                disabled={loading}
                onClick={() => void selectTrack('em-interview')}
              >
                <strong>Engineering Manager interview loop</strong>
                <span>People · conflict · org design — speak them →</span>
              </button>
              <Link to="/snowflake-path" className="path-banner">
                <strong>Data Engineer → Snowflake + Cortex</strong>
                <span>Core → Cortex → agents → interview prep →</span>
              </Link>
            </section>
          )}

          {isRecruiter && (
            <section className="dual-audience reveal" aria-label="Who it’s for">
              <div className="dual-card">
                <p className="eyebrow">{AUDIENCES.talent.label}</p>
                <h3>{AUDIENCES.talent.title}</h3>
                <p>{AUDIENCES.talent.blurb}</p>
                <Link className="btn ghost sm" to="/">
                  Learner product
                </Link>
              </div>
              <div className="dual-card dual-card-accent">
                <p className="eyebrow">{AUDIENCES.companies.label}</p>
                <h3>{AUDIENCES.companies.title}</h3>
                <p>{AUDIENCES.companies.blurb}</p>
                <Link className="btn primary sm" to="/jobs">
                  Post a job
                </Link>
              </div>
            </section>
          )}

          <AdSlot
            id="home-below-hero"
            variant="banner"
            headline="Interview prep partners"
            detail="Partner strip under the learn/practice magnet — not in the hero."
          />

          {isRecruiter ? (
            <section className="diff-row reveal">
              <div>
                <strong>Practice-ready talent</strong>
                <p>Candidates who train voice loops before they apply.</p>
              </div>
              <div>
                <strong>Job board</strong>
                <p>Post roles where learners already practice.</p>
              </div>
              <div>
                <strong>Network</strong>
                <p>Connect and message — phase-2 hire surface.</p>
              </div>
            </section>
          ) : (
            <section className="diff-row reveal">
              <div>
                <strong>Not another LeetCode</strong>
                <p>AI systems + spoken narrative — not puzzle grinding alone.</p>
              </div>
              <div>
                <strong>Not raw ChatGPT</strong>
                <p>Curriculum, paths, and coaching product — not a blank prompt.</p>
              </div>
              <div>
                <strong>One stop → AI engineer</strong>
                <p>Learn, build, practice out loud, then apply from one platform.</p>
              </div>
            </section>
          )}

          {isRecruiter && (
          <section className="compare reveal">
            <div className="section-title">
              <h2>Why teams look here later</h2>
              <Link className="linkish" to="/compare">
                Full comparison →
              </Link>
            </div>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Practice Out Loud</th>
                    <th>Coding platforms</th>
                    <th>Generic ChatGPT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Spoken interview practice</td>
                    <td className="yes">Yes + delivery tips</td>
                    <td>Rare</td>
                    <td>DIY prompts</td>
                  </tr>
                  <tr>
                    <td>Structured topic docs</td>
                    <td className="yes">Per-path curriculum</td>
                    <td>Problems only</td>
                    <td>No curriculum</td>
                  </tr>
                  <tr>
                    <td>Staff / EM loops</td>
                    <td className="yes">Native paths</td>
                    <td>Limited</td>
                    <td>Unstructured</td>
                  </tr>
                  <tr>
                    <td>Free → Pro path</td>
                    <td className="yes">Stripe-ready</td>
                    <td>Yes</td>
                    <td>No product</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          )}

          <section className="section paths-layout" id="paths">
            <div className="section-title">
              <h2>
                {isRecruiter
                  ? 'Paths talent trains on'
                  : 'Full catalog — AI engineer to interview'}
              </h2>
              <p className="muted">
                {isRecruiter
                  ? `${tracks.length} paths learners use before they apply`
                  : 'Learn · practice · AI feedback · become an AI engineer'}
              </p>
            </div>

            <div className="paths-with-ad">
              <div className="paths-main">
                {TRACK_GROUPS.map((group) => {
                  const items = group.trackIds
                    .map((id) => tracks.find((t) => t.id === id))
                    .filter(Boolean) as Track[]
                  if (!items.length) return null
                  return (
                    <div key={group.id} className="track-group reveal">
                      <div className="track-group-head">
                        <h3>{group.title}</h3>
                        <p>{group.blurb}</p>
                      </div>
                      {group.id === 'ai-engineer' && (
                        <>
                          <Link to="/agentic-path" className="path-banner">
                            <strong>Full Agentic AI video curriculum</strong>
                            <span>
                              Watch → mark done → practice with AI feedback →
                            </span>
                          </Link>
                          <Link to="/snowflake-path" className="path-banner">
                            <strong>
                              Data Engineer → Snowflake + Agentic AI
                            </strong>
                            <span>
                              Validated YouTube library: core → Cortex → agents
                              → interview prep →
                            </span>
                          </Link>
                        </>
                      )}
                      <div className="track-grid">
                        {items.map((item) => {
                          const count = topicsForTrack(item.id).length
                          const locked =
                            !FREE_PRACTICE_TRACKS.has(item.id) && !(user?.is_pro)
                          return (
                            <button
                              key={item.id}
                              className={`track-card ${locked ? 'locked' : ''}`}
                              onClick={() => selectTrack(item.id)}
                              disabled={loading}
                            >
                              <span className="course-cover" aria-hidden="true" />
                              <span className="course-body">
                                <span className="pill-row">
                                  <span className="pill">{item.audience}</span>
                                  {locked ? (
                                    <span className="pill lock">Pro</span>
                                  ) : (
                                    <span className="pill free">Free practice</span>
                                  )}
                                </span>
                                <strong>{item.title}</strong>
                                <p>{item.summary}</p>
                                <span className="meta">
                                  {count} topics · Study free · Practice{' '}
                                  {locked ? 'Pro' : 'included'}
                                </span>
                                <span className="track-go">Open path →</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <AdSlot
                id="home-paths-sidebar"
                variant="sidebar"
                className="paths-ad"
                headline="Career switch partners"
                detail="Sidebar placement for bootcamps, certs, and hiring tools."
              />
            </div>
          </section>

          {!isRecruiter && (
            <section className="learner-jobs-strip reveal" aria-label="Open jobs">
              <div className="section-title">
                <h2>When you&apos;re ready — open jobs</h2>
                <p className="muted">
                  Secondary: browse roles recruiters post after you practice.
                </p>
              </div>
              <Link className="btn ghost" to="/jobs">
                View open jobs
              </Link>
            </section>
          )}
        </>
      )}

      {activeTrack && step !== 'tracks' && (
        <section className="workspace reveal">
          <div className="workspace-head">
            <button
              className="linkish"
              onClick={() => {
                clearLearnUrl()
              }}
            >
              ← All paths
            </button>
            <div className="workspace-title">
              <h2>
                {activeTrack.title}
                {trackIsProOnly && !user?.is_pro && (
                  <span className="pill lock">Pro practice</span>
                )}
              </h2>
              <p>{activeTrack.summary}</p>
            </div>
            <div className="progress-block">
              <div className="progress-label">
                Path {learnStats?.pct ?? progressPct}% · studied{' '}
                {learnStats?.studied ?? 0}/{learnStats?.topicsTotal ?? topics.length} ·
                practiced {learnStats?.practiced ?? 0}/
                {learnStats?.questionsTotal ?? questions.length}
                {learnStats?.avg != null ? ` · avg ${learnStats.avg}/5` : ''}
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${learnStats?.pct ?? progressPct}%` }} />
              </div>
              <p className="progress-hint muted">
                Loop: Study → Speak → score ≥4 → next topic. Mastery:{' '}
                {learnStats?.mastery ?? 0}/{learnStats?.questionsTotal ?? 0} drills ≥4
              </p>
            </div>
          </div>

          <div className="mode-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={step === 'learn'}
              className={step === 'learn' ? 'mode active' : 'mode'}
              onClick={() =>
                writeLearnUrl({
                  path: trackId,
                  mode: 'learn',
                  topic: topicId,
                })
              }
            >
              <span>01</span> Study
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'practice'}
              className={step === 'practice' ? 'mode active' : 'mode'}
              onClick={() => goPractice()}
            >
              <span>02</span> Speak &amp; coach
            </button>
          </div>

          <AdSlot
            id="learn-practice-inline"
            variant="inline"
            className="workspace-inline-ad"
            headline="Between study and the drill"
            detail="Inline partner space — swap creatives via AdSlot props later."
          />

          {step === 'learn' && (
            <div className="learn">
              <aside className="topic-list">
                <h3>Curriculum</h3>
                {topics.map((item, idx) => {
                  const studied = trackProgress?.studiedTopicIds.includes(item.id)
                  const topicQs = questions.filter((q) => q.topic_id === item.id)
                  const best = topicQs
                    .map((q) => trackProgress?.attempts[q.id]?.score ?? 0)
                    .reduce((a, b) => Math.max(a, b), 0)
                  return (
                  <button
                    key={item.id}
                    className={
                      item.id === topicId ? 'topic-item active' : 'topic-item'
                    }
                    onClick={() => selectTopic(item)}
                  >
                    <em>{String(idx + 1).padStart(2, '0')}</em>
                    <strong>
                      {item.title}
                      {studied ? <span className="pill done">Studied</span> : null}
                      {best > 0 ? (
                        <span className={`pill ${best >= 4 ? 'good' : 'soft'}`}>
                          {best}/5
                        </span>
                      ) : null}
                    </strong>
                    <span>{item.summary}</span>
                  </button>
                  )
                })}
                <div className="panel plan-mini">
                  <h4>Study plan</h4>
                  <ol>
                    {activeTrack.study_plan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
                <AdSlot
                  id="learn-sidebar"
                  variant="sidebar"
                  headline="Study partners"
                  detail="Compact placement while you read the curriculum."
                />
              </aside>

              <div className="panel doc">
                {topic ? (
                  <>
                    <p className="pill">Documentation</p>
                    <h3>{topic.title}</h3>
                    <p className="lede">{topic.doc.overview}</p>

                    <h4>Key points</h4>
                    <ul className="check-list">
                      {topic.doc.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>

                    <h4>{topic.doc.example.title}</h4>
                    <pre className="code">{topic.doc.example.code}</pre>
                    <p className="muted note">{topic.doc.example.note}</p>

                    <div className="doc-split">
                      <div>
                        <h4>Common mistakes</h4>
                        <ul>
                          {topic.doc.commonMistakes.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Before you practice</h4>
                        <ul>
                          {topic.doc.beforeYouPractice.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="actions sticky-actions">
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={markCurrentStudied}
                      >
                        Mark studied
                      </button>
                      <button
                        className="btn primary"
                        onClick={() => goPractice(topic.id)}
                      >
                        {canPractice
                          ? 'Practice this topic out loud'
                          : trackIsProOnly
                            ? 'Unlock practice (Pro)'
                            : 'Sign in to practice'}
                      </button>
                    </div>
                    {activeTrack.outcomes?.length ? (
                      <div className="path-outcomes">
                        <h4>Path outcomes</h4>
                        <ul className="check-list">
                          {activeTrack.outcomes.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="muted">Select a topic to read the docs.</p>
                )}
              </div>
            </div>
          )}

          {step === 'practice' && (
            <div className="practice">
              <aside className="question-list">
                <h3>Topics</h3>
                <button
                  className={!topicId ? 'topic-item active' : 'topic-item'}
                  onClick={() => {
                    setTopicId(null)
                    setQuestionId(questions[0]?.id ?? null)
                    setFeedback(null)
                    setAnswer('')
                  }}
                >
                  <strong>All topics</strong>
                  <span>{questions.length} questions</span>
                </button>
                {topics.map((item) => {
                  const count = questions.filter(
                    (q) => q.topic_id === item.id,
                  ).length
                  return (
                    <button
                      key={item.id}
                      className={
                        item.id === topicId ? 'topic-item active' : 'topic-item'
                      }
                      onClick={() => selectTopic(item)}
                    >
                      <strong>{item.title}</strong>
                      <span>
                        {count} question{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}

                <AdSlot
                  id="practice-sidebar"
                  variant="sidebar"
                  headline="Practice partners"
                  detail="Reserved while you queue the next spoken answer."
                />

                <h3>Queue</h3>
                {topicQuestions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={q.id === questionId ? 'q-item active' : 'q-item'}
                    onClick={() => {
                      setFeedback(null)
                      setAnswer('')
                      setInterim('')
                      setInputMode('text')
                      speech.stop()
                      stopSpeaking()
                      writeLearnUrl({
                        path: trackId,
                        mode: 'practice',
                        topic: topicId,
                        q: q.id,
                      })
                    }}
                  >
                    <span>
                      {q.category} · Q{idx + 1}
                    </span>
                    <strong>{q.prompt.slice(0, 72)}…</strong>
                  </button>
                ))}
              </aside>

              <div className="panel practice-main">
                {topic && (
                  <button
                    className="linkish doc-link"
                    onClick={() =>
                      writeLearnUrl({
                        path: trackId,
                        mode: 'learn',
                        topic: topicId,
                      })
                    }
                  >
                    ← Review docs: {topic.title}
                  </button>
                )}

                {question && (
                  <>
                    <div className="question-tools">
                      <p className="pill">{question.category}</p>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => speakText(question.prompt)}
                      >
                        Hear question
                      </button>
                    </div>
                    <h3 className="prompt">{question.prompt}</h3>
                    <div className="hint-row">
                      <p className="muted">Hints</p>
                      <ul className="hint-chips">
                        {question.hints.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="answer-toolbar">
                      <label className="answer-label" htmlFor="answer">
                        Your answer{' '}
                        {inputMode === 'voice' && (
                          <span className="pill voice">Voice</span>
                        )}
                      </label>
                      <div className="voice-actions">
                        {speech.listening ? (
                          <button
                            type="button"
                            className="btn danger-outline"
                            onClick={() => {
                              speech.stop()
                              setInterim('')
                            }}
                          >
                            <span className="pulse-dot" /> Stop
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => {
                              setInputMode('voice')
                              speech.start()
                            }}
                            disabled={!speech.supported}
                          >
                            Speak answer
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => {
                            setAnswer('')
                            setInterim('')
                            setInputMode('text')
                            speech.stop()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {speech.listening && (
                      <p className="listening-bar" aria-live="polite">
                        Listening… aim for ~90–120 seconds.
                        {interim ? ` “${interim}”` : ''}
                      </p>
                    )}
                    {speech.error && (
                      <div className="banner error">{speech.error}</div>
                    )}

                    <textarea
                      id="answer"
                      value={liveAnswer}
                      onChange={(e) => {
                        setAnswer(e.target.value)
                        setInterim('')
                        if (inputMode === 'voice') setInputMode('text')
                      }}
                      placeholder="Speak or type a 90–120 second interview answer…"
                      rows={11}
                    />
                    <div className="answer-meta">
                      <span>
                        {words} words · ~{seconds}s spoken
                      </span>
                      <span
                        className={
                          seconds >= 90 && seconds <= 130 ? 'good' : 'soft'
                        }
                      >
                        Target 90–120s
                      </span>
                    </div>
                    <div className="actions">
                      <button
                        className="btn primary"
                        onClick={submitAnswer}
                        disabled={loading || !liveAnswer.trim()}
                      >
                        {loading
                          ? 'Coaching…'
                          : inputMode === 'voice'
                            ? 'Get voice + content feedback'
                            : 'Get AI feedback'}
                      </button>
                    </div>
                  </>
                )}

                {feedback && (
                  <div className="feedback reveal">
                    <div className="score-row">
                      <div
                        className="score-ring"
                        style={
                          {
                            '--p': `${(feedback.score / 5) * 100}%`,
                          } as CSSProperties
                        }
                      >
                        <strong>{feedback.score}</strong>
                        <span>/5</span>
                      </div>
                      <div>
                        <p className="score-summary">{feedback.summary}</p>
                        <small>
                          {feedback.provider}
                          {feedback.input_mode === 'voice'
                            ? ' · voice coaching'
                            : ''}
                        </small>
                      </div>
                    </div>
                    <div className="feedback-grid">
                      <div className="fb-col good">
                        <h4>Strengths</h4>
                        <ul>
                          {feedback.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="fb-col gap">
                        <h4>Gaps</h4>
                        <ul>
                          {feedback.gaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {!!feedback.delivery_tips?.length && (
                      <div className="delivery">
                        <h4>Spoken delivery &amp; grammar</h4>
                        <ul>
                          {feedback.delivery_tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <h4>Stronger answer shape</h4>
                    <pre>{feedback.better_answer}</pre>
                    <p className="next">
                      <strong>Coach says:</strong> {feedback.next_drill}
                    </p>
                    <div className="actions feedback-actions">
                      <button
                        type="button"
                        className="btn primary"
                        onClick={retrySameQuestion}
                      >
                        {feedback.score < 4
                          ? 'Retry out loud (aim ≥4)'
                          : 'Retry for polish'}
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={goNextQuestion}
                      >
                        Next question
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          writeLearnUrl({
                            path: trackId,
                            mode: 'learn',
                            topic: topicId,
                          })
                        }
                      >
                        Review docs for gaps
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </Shell>
  )
}
