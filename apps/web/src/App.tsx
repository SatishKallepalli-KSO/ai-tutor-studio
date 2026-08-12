import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  api,
  FREE_CUSTOM_FEEDBACK_PER_TOPIC,
  FREE_PRACTICE_TRACKS,
  type CustomFeedbackQuota,
  type Feedback,
  type Track,
  type TutorQuestion,
} from './api'
import { AdSlot } from './AdSlot'
import { track as trackEvent } from './analytics'
import { useAuth } from './auth'
import { BRAND } from './brand'
import { getTopic, topicsForTrack, type Topic } from './curriculum'
import { localQuestions } from './data'
import {
  defaultCustomTitle,
  deleteCustomQuestion,
  getCustomQuestion,
  listCustomQuestions,
  mergeCloudCustomQuestions,
  recordCustomAttemptLocal,
  renameCustomQuestion,
  setCustomQuestionSaved,
  upsertCustomQuestion,
  type CustomQuestionRecord,
} from './customQuestions'
import {
  DEFAULT_CUSTOM_CONTEXT_TRACK,
  getRecommendedNext,
  getResumePointer,
  getTrackProgress,
  markTopicStudied,
  pathStats,
  recordAttempt,
  unmarkTopicStudied,
} from './learnProgress'
import { MockScorecard } from './MockScorecard'
import {
  createActiveMock,
  deriveDims,
  finishMock,
  formatCountdown,
  FREE_SHORT_MOCK,
  readActiveMock,
  writeActiveMock,
  type ActiveMock,
  type MockQuestionResult,
  type MockSessionSummary,
} from './mockSession'
import {
  filterQuestionsForPack,
  getPack,
  ROLE_PACKS,
  type RolePack,
} from './packs'
import { usePersona } from './persona'
import { Shell, TRACK_GROUPS } from './Shell'
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
  const [customMode, setCustomMode] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customQuestionId, setCustomQuestionId] = useState<string | null>(null)
  const [customTick, setCustomTick] = useState(0)
  const [customQuota, setCustomQuota] = useState<CustomFeedbackQuota | null>(
    null,
  )
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const loadingTrackRef = useRef<string | null>(null)
  const [activeMock, setActiveMock] = useState<ActiveMock | null>(() =>
    readActiveMock(),
  )
  const [mockSummary, setMockSummary] = useState<MockSessionSummary | null>(
    null,
  )
  const [nowMs, setNowMs] = useState(() => Date.now())
  const mockForceRef = useRef<string | null>(null)

  const customRemaining =
    user?.is_pro || customQuota?.remaining === 'unlimited'
      ? null
      : typeof customQuota?.remaining === 'number'
        ? customQuota.remaining
        : user
          ? FREE_CUSTOM_FEEDBACK_PER_TOPIC
          : null
  const customQuotaExhausted =
    !!user && !user.is_pro && customRemaining !== null && customRemaining <= 0

  /** Keep learn/practice in the URL so browser Back works. */
  function writeLearnUrl(next: {
    path: string | null
    mode?: 'learn' | 'practice'
    topic?: string | null
    q?: string | null
    custom?: boolean
    cq?: string | null
    pack?: string | null
    mock?: boolean | null
    replace?: boolean
  }) {
    const sp = new URLSearchParams()
    const billing = params.get('billing')
    if (billing) sp.set('billing', billing)
    if (next.path) {
      sp.set('path', next.path)
      sp.set('mode', next.mode ?? 'learn')
      if (next.topic) sp.set('topic', next.topic)
      const packId =
        next.pack === undefined ? params.get('pack') : next.pack
      if (packId && !next.custom) sp.set('pack', packId)
      const mockOn =
        next.mock === undefined
          ? params.get('mock') === '1'
          : !!next.mock
      if (mockOn && !next.custom) sp.set('mock', '1')
      if (next.custom) {
        sp.set('custom', '1')
        if (next.cq) sp.set('cq', next.cq)
      } else if (next.q) {
        sp.set('q', next.q)
      }
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

  /** Open Home focused on the Practice hub chooser — never auto-enter a track. */
  function openPracticeHub(opts?: { replace?: boolean }) {
    const sp = new URLSearchParams()
    const billing = params.get('billing')
    if (billing) sp.set('billing', billing)
    sp.set('hub', 'practice')
    navigate(
      { pathname: '/', search: `?${sp.toString()}` },
      { replace: opts?.replace },
    )
  }

  const practiceHubFocused = params.get('hub') === 'practice' && !params.get('path')
  const mockMode =
    !!activeMock && params.get('mock') === '1' && step === 'practice'

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
  const activePack = useMemo(
    () => getPack(params.get('pack')),
    [params],
  )
  const topics = useMemo(
    () => (trackId ? topicsForTrack(trackId) : []),
    [trackId],
  )
  const topic = useMemo(
    () => (topicId ? getTopic(topicId) ?? null : null),
    [topicId],
  )
  /** Bank questions, optionally scoped to a curated role pack or timed mock. */
  const bankQuestions = useMemo(() => {
    if (activeMock && params.get('mock') === '1') {
      const order = new Map(
        activeMock.questionIds.map((id, i) => [id, i] as const),
      )
      return questions
        .filter((q) => order.has(q.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    }
    return filterQuestionsForPack(questions, activePack)
  }, [questions, activePack, activeMock, params])
  const topicQuestions = useMemo(() => {
    if (activeMock && params.get('mock') === '1') return bankQuestions
    if (activePack) return bankQuestions
    if (!topicId) return bankQuestions
    return bankQuestions.filter((q) => q.topic_id === topicId)
  }, [bankQuestions, topicId, activePack, activeMock, params])
  const question = useMemo(
    () => bankQuestions.find((q) => q.id === questionId) ?? null,
    [questionId, bankQuestions],
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
    const qids = (activePack ? bankQuestions : questions).map((q) => q.id)
    const topicIds = activePack
      ? [...new Set(bankQuestions.map((q) => q.topic_id))]
      : topics.map((t) => t.id)
    return pathStats(trackId, topicIds, qids)
  }, [trackId, topics, questions, bankQuestions, activePack, progressTick])

  const trackProgress = useMemo(() => {
    void progressTick
    return trackId ? getTrackProgress(trackId) : null
  }, [trackId, progressTick])

  const resume = useMemo(() => {
    void progressTick
    return getResumePointer()
  }, [progressTick])

  const resumeCard = useMemo(() => {
    if (!resume) return null
    const topicIds = topicsForTrack(resume.trackId).map((t) => t.id)
    const qs = localQuestions(resume.trackId)
    const stats = pathStats(
      resume.trackId,
      topicIds,
      qs.map((q) => q.id),
    )
    const recommended = getRecommendedNext({
      trackId: resume.trackId,
      topicIds,
      questions: qs,
      topicTitle: (id) => getTopic(id)?.title,
    })
    return {
      ...resume,
      stats,
      recommended,
      trackTitle:
        tracks.find((t) => t.id === resume.trackId)?.title ?? resume.trackId,
      topicTitle: resume.lastTopicId
        ? (getTopic(resume.lastTopicId)?.title ?? resume.lastTopicId)
        : undefined,
    }
  }, [resume, tracks])

  const queueIndex = useMemo(() => {
    if (!questionId) return -1
    return topicQuestions.findIndex((q) => q.id === questionId)
  }, [questionId, topicQuestions])
  const queuePos = queueIndex >= 0 ? queueIndex + 1 : 0
  const queueTotal = topicQuestions.length
  const sessionPct =
    queueTotal > 0 ? Math.round((queuePos / queueTotal) * 100) : 0

  const customHistory = useMemo(() => {
    void customTick
    if (!trackId) return [] as CustomQuestionRecord[]
    return listCustomQuestions({ trackId })
  }, [trackId, customTick])

  const topicCustomHistory = useMemo(() => {
    if (!topicId) return customHistory
    const scoped = customHistory.filter((r) => (r.topicId || '') === topicId)
    return scoped.length ? scoped : customHistory
  }, [customHistory, topicId])

  useEffect(() => {
    api
      .tracks()
      .then(setTracks)
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (params.get('billing') === 'success') void refresh()
  }, [params, refresh])

  // Focus Practice hub when navigated via nav or Start practicing (no silent path dump).
  useEffect(() => {
    if (params.get('hub') !== 'practice' || params.get('path')) return
    const el = document.getElementById('practice-hub')
    if (!el) return
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [params])

  // Browser Back/Forward + deep links: URL is the source of truth for workspace.
  useEffect(() => {
    const urlPath = params.get('path')
    const urlMode = params.get('mode') === 'practice' ? 'practice' : 'learn'
    const urlTopic = params.get('topic')
    const urlQ = params.get('q')
    const urlCustom = params.get('custom') === '1'
    const urlCq = params.get('cq')

    if (!urlPath) {
      if (step !== 'tracks' || trackId) {
        setStep('tracks')
        setTrackId(null)
        setTopicId(null)
        setQuestionId(null)
        setQuestions([])
        setFeedback(null)
        setPaywall(null)
        setCustomMode(false)
        setCustomPrompt('')
        setCustomQuestionId(null)
        speech.stop()
        stopSpeaking()
      }
      return
    }

    setStep(urlMode)
    setCustomMode(urlCustom && urlMode === 'practice')
    if (urlTopic) setTopicId(urlTopic)
    if (urlCustom) {
      if (urlCq) {
        const saved = getCustomQuestion(urlCq)
        setCustomQuestionId(urlCq)
        if (saved) setCustomPrompt(saved.prompt)
      }
    } else if (urlQ) {
      setQuestionId(urlQ)
    }

    if (trackId === urlPath && questions.length > 0) {
      if (urlTopic && urlTopic !== topicId) {
        const qs = questions.filter((q) => q.topic_id === urlTopic)
        if (!urlCustom && !urlQ) setQuestionId(qs[0]?.id ?? null)
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
        const pack = getPack(params.get('pack'))
        const scoped = filterQuestionsForPack(qs, pack)
        const topics = topicsForTrack(urlPath)
        const topic =
          (urlTopic && topics.some((t) => t.id === urlTopic) && urlTopic) ||
          scoped[0]?.topic_id ||
          topics[0]?.id ||
          qs[0]?.topic_id ||
          null
        setTopicId(topic)
        const topicQs =
          pack && scoped.length
            ? scoped
            : topic
              ? qs.filter((q) => q.topic_id === topic)
              : qs
        const qid =
          (urlQ && scoped.some((q) => q.id === urlQ) && urlQ) ||
          (urlQ && qs.some((q) => q.id === urlQ) && urlQ) ||
          topicQs[0]?.id ||
          scoped[0]?.id ||
          qs[0]?.id ||
          null
        if (!urlCustom) setQuestionId(qid)
        setStep(urlMode)
        setCustomMode(urlCustom && urlMode === 'practice')
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

  // Cloud sync custom questions when signed in on a practice path.
  useEffect(() => {
    if (!user || !trackId || step !== 'practice') return
    let cancelled = false
    void api
      .listCustomQuestions({ track_id: trackId })
      .then((rows) => {
        if (cancelled) return
        mergeCloudCustomQuestions(rows)
        setCustomTick((n) => n + 1)
      })
      .catch(() => {
        /* offline / unsigned API — localStorage only */
      })
    return () => {
      cancelled = true
    }
  }, [user, trackId, step])

  // Server-backed free custom AI feedback quota (per topic).
  useEffect(() => {
    if (!user || !trackId || step !== 'practice' || !customMode) {
      setCustomQuota(null)
      return
    }
    if (user.is_pro) {
      setCustomQuota({
        track_id: trackId,
        topic_id: topicId ?? '',
        used: 0,
        limit: 'unlimited',
        remaining: 'unlimited',
        is_pro: true,
      })
      return
    }
    let cancelled = false
    void api
      .customFeedbackQuota({ track_id: trackId, topic_id: topicId })
      .then((q) => {
        if (!cancelled) setCustomQuota(q)
      })
      .catch(() => {
        if (cancelled) return
        const key = `ats_custom_fb_${user.id}_${trackId}_${topicId ?? ''}`
        const used = Number(localStorage.getItem(key) || '0')
        const remaining = Math.max(0, FREE_CUSTOM_FEEDBACK_PER_TOPIC - used)
        setCustomQuota({
          track_id: trackId,
          topic_id: topicId ?? '',
          used,
          limit: FREE_CUSTOM_FEEDBACK_PER_TOPIC,
          remaining,
          is_pro: false,
        })
      })
    return () => {
      cancelled = true
    }
  }, [user, trackId, topicId, step, customMode, customTick])

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
      pack: null,
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
    writeLearnUrl({
      path: trackId ?? params.get('path'),
      mode: step === 'practice' ? 'practice' : 'learn',
      topic: next.id,
      custom: step === 'practice' && customMode,
      cq: step === 'practice' && customMode ? customQuestionId : null,
      q:
        step === 'practice' && !customMode
          ? (questions.find((q) => q.topic_id === next.id)?.id ?? null)
          : null,
    })
    trackEvent('topic_open', {
      path: '/',
      properties: { track_id: trackId, topic_id: next.id },
    })
  }

  function toggleCurrentReviewed() {
    if (!trackId || !topicId) return
    const already = getTrackProgress(trackId).studiedTopicIds.includes(topicId)
    if (already) unmarkTopicStudied(trackId, topicId)
    else markTopicStudied(trackId, topicId)
    setProgressTick((n) => n + 1)
  }

  function goNextQuestion() {
    if (activeMock && params.get('mock') === '1' && questionId) {
      const idx = activeMock.questionIds.indexOf(questionId)
      advanceMockTo(idx + 1, activeMock.results)
      return
    }
    const list = topicQuestions.length ? topicQuestions : bankQuestions
    if (!list.length) return
    const idx = list.findIndex((q) => q.id === questionId)
    const next = list[(idx >= 0 ? idx + 1 : 0) % list.length]
    if (!next) return
    // Pack mode: stay in the curated queue (across topics).
    if (activePack) {
      writeLearnUrl({
        path: trackId,
        mode: 'practice',
        topic: next.topic_id,
        q: next.id,
        pack: activePack.id,
      })
      setFeedback(null)
      setAnswer('')
      setInterim('')
      setInputMode('text')
      speech.stop()
      stopSpeaking()
      return
    }
    // If wrapped and there is a next topic with questions, advance topic
    if (idx === list.length - 1 && topicId && topics.length) {
      const tIdx = topics.findIndex((t) => t.id === topicId)
      const nextTopic = topics[tIdx + 1]
      if (nextTopic) {
        writeLearnUrl({
          path: trackId,
          mode: 'practice',
          topic: nextTopic.id,
          pack: null,
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
      pack: null,
    })
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
  }

  function startPack(pack: RolePack) {
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    setActiveMock(null)
    writeActiveMock(null)
    setMockSummary(null)
    if (!user) {
      setPaywall('Sign in to practice a role pack and get AI feedback.')
      trackEvent('pack_gate', {
        path: '/',
        properties: { pack_id: pack.id, reason: 'auth' },
      })
      // Still open the pack URL so they land after sign-in.
    } else if (pack.proPractice && !user.is_pro) {
      setPaywall(
        'Role packs are Pro practice. Free still includes language paths and custom questions.',
      )
      trackEvent('pack_gate', {
        path: '/',
        properties: { pack_id: pack.id, reason: 'pro' },
      })
    }
    const firstId = pack.questionIds[0]
    const firstQ = filterQuestionsForPack(
      localQuestions(pack.trackId),
      pack,
    )[0]
    writeLearnUrl({
      path: pack.trackId,
      mode: 'practice',
      topic: firstQ?.topic_id ?? null,
      q: firstQ?.id ?? firstId ?? null,
      pack: pack.id,
      mock: false,
    })
    trackEvent('pack_open', {
      path: '/',
      properties: {
        pack_id: pack.id,
        track_id: pack.trackId,
        questions: pack.questionIds.length,
      },
    })
  }

  function completeTimedMock(results?: MockQuestionResult[]) {
    if (!activeMock) return
    const byId = new Map(
      (results ?? activeMock.results).map((r) => [r.questionId, r]),
    )
    const filled: MockQuestionResult[] = activeMock.questionIds.map((id) => {
      const existing = byId.get(id)
      if (existing) return existing
      const q =
        questions.find((item) => item.id === id) ||
        localQuestions(activeMock.trackId).find((item) => item.id === id)
      return {
        questionId: id,
        prompt: q?.prompt ?? id,
        category: q?.category ?? '',
        score: null,
        dims: null,
        skipped: true,
        at: new Date().toISOString(),
      }
    })
    const summary = finishMock(activeMock, filled)
    setMockSummary(summary)
    setActiveMock(null)
    writeActiveMock(null)
    setFeedback(null)
    setAnswer('')
    speech.stop()
    stopSpeaking()
    openPracticeHub({ replace: true })
    trackEvent('mock_complete', {
      path: '/',
      properties: {
        mock_id: summary.id,
        pack_id: summary.packId,
        overall: summary.averages.overall,
        answered: filled.filter((r) => !r.skipped).length,
      },
    })
  }

  function advanceMockTo(questionIndex: number, results: MockQuestionResult[]) {
    if (!activeMock) return
    if (questionIndex >= activeMock.questionIds.length) {
      completeTimedMock(results)
      return
    }
    const nextId = activeMock.questionIds[questionIndex]
    const nextQ =
      questions.find((q) => q.id === nextId) ||
      localQuestions(activeMock.trackId).find((q) => q.id === nextId)
    const updated: ActiveMock = {
      ...activeMock,
      results,
      questionStartedAt: Date.now(),
    }
    setActiveMock(updated)
    writeActiveMock(updated)
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    mockForceRef.current = null
    writeLearnUrl({
      path: activeMock.trackId,
      mode: 'practice',
      topic: nextQ?.topic_id ?? null,
      q: nextId,
      pack:
        activeMock.packId && activeMock.packId !== FREE_SHORT_MOCK.id
          ? activeMock.packId
          : null,
      mock: true,
      replace: true,
    })
  }

  function recordMockResult(
    result: Feedback,
    qid: string,
    prompt: string,
    category: string,
  ) {
    if (!activeMock) return
    const dims = deriveDims(result)
    const entry: MockQuestionResult = {
      questionId: qid,
      prompt,
      category,
      score: result.score,
      dims,
      skipped: false,
      at: new Date().toISOString(),
    }
    const results = [
      ...activeMock.results.filter((r) => r.questionId !== qid),
      entry,
    ]
    const idx = activeMock.questionIds.indexOf(qid)
    const updated: ActiveMock = {
      ...activeMock,
      results,
      questionStartedAt: Date.now(),
    }
    setActiveMock(updated)
    writeActiveMock(updated)
    // Auto-advance after a short beat so the score is visible.
    window.setTimeout(() => {
      advanceMockTo(idx + 1, results)
    }, 1600)
  }

  function startTimedMock(pack: RolePack) {
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    setMockSummary(null)
    speech.stop()
    stopSpeaking()
    if (!user) {
      setPaywall('Sign in to run a timed mock and get AI feedback.')
      trackEvent('mock_gate', {
        path: '/',
        properties: { pack_id: pack.id, reason: 'auth' },
      })
      return
    }
    if (pack.proPractice && !user.is_pro) {
      setPaywall(
        'Full timed mocks on role packs are Pro. Free includes a short 15-minute mock — start that below.',
      )
      trackEvent('mock_gate', {
        path: '/',
        properties: { pack_id: pack.id, reason: 'pro' },
      })
      return
    }
    const mock = createActiveMock(pack)
    setActiveMock(mock)
    writeActiveMock(mock)
    mockForceRef.current = null
    const firstId = mock.questionIds[0]
    const firstQ = localQuestions(pack.trackId).find((q) => q.id === firstId)
    writeLearnUrl({
      path: pack.trackId,
      mode: 'practice',
      topic: firstQ?.topic_id ?? null,
      q: firstId ?? null,
      pack: pack.id === FREE_SHORT_MOCK.id ? null : pack.id,
      mock: true,
    })
    trackEvent('mock_start', {
      path: '/',
      properties: {
        mock_id: mock.id,
        pack_id: pack.id,
        track_id: pack.trackId,
        questions: mock.questionIds.length,
        duration_min: pack.durationMin,
      },
    })
  }

  function retrySameQuestion() {
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
  }

  function startPracticing() {
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    const pointer = getResumePointer()
    const canUseResume =
      !!pointer &&
      (FREE_PRACTICE_TRACKS.has(pointer.trackId) || !!user?.is_pro)
    if (!canUseResume || !pointer) {
      openPracticeHub()
      trackEvent('practice_hub_open', {
        path: '/',
        properties: { source: 'hero_start' },
      })
      return
    }
    const path = pointer.trackId
    const topics = topicsForTrack(path)
    const topic = pointer.lastTopicId || topics[0]?.id || null
    const qs = localQuestions(path)
    const topicQs = topic ? qs.filter((q) => q.topic_id === topic) : qs
    const q =
      (pointer.lastQuestionId &&
        qs.some((item) => item.id === pointer.lastQuestionId) &&
        pointer.lastQuestionId) ||
      topicQs[0]?.id ||
      null
    writeLearnUrl({
      path,
      mode: 'practice',
      topic,
      q,
    })
    trackEvent('practice_start', {
      path: '/',
      properties: { track_id: path, topic_id: topic, source: 'hero_start' },
    })
  }

  function startCustomPractice(opts?: { path?: string; topic?: string | null }) {
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    const pointer = getResumePointer()
    const canUseResume =
      !!pointer &&
      (FREE_PRACTICE_TRACKS.has(pointer.trackId) || !!user?.is_pro)
    const path =
      opts?.path ||
      (canUseResume && pointer ? pointer.trackId : DEFAULT_CUSTOM_CONTEXT_TRACK)
    const topics = topicsForTrack(path)
    const topic =
      opts?.topic ??
      (canUseResume && pointer?.lastTopicId
        ? pointer.lastTopicId
        : null) ??
      topics[0]?.id ??
      null
    setCustomMode(true)
    setCustomPrompt('')
    setCustomQuestionId(null)
    writeLearnUrl({
      path,
      mode: 'practice',
      topic,
      custom: true,
    })
    trackEvent('practice_start', {
      path: '/',
      properties: {
        track_id: path,
        topic_id: topic,
        source: 'custom_question_cta',
        custom: true,
      },
    })
    trackEvent('custom_practice', {
      path: '/',
      properties: { track_id: path, topic_id: topic, source: 'entry' },
    })
  }

  function enterCustomMode() {
    if (!trackId) return
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    setCustomMode(true)
    writeLearnUrl({
      path: trackId,
      mode: 'practice',
      topic: topicId,
      custom: true,
      cq: customQuestionId,
    })
  }

  function exitCustomMode() {
    if (!trackId) return
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    setCustomMode(false)
    writeLearnUrl({
      path: trackId,
      mode: 'practice',
      topic: topicId,
      q: questionId ?? topicQuestions[0]?.id ?? null,
    })
  }

  function reuseCustomQuestion(row: CustomQuestionRecord) {
    setCustomMode(true)
    setCustomQuestionId(row.id)
    setCustomPrompt(row.prompt)
    setFeedback(null)
    setAnswer('')
    setInterim('')
    setInputMode('text')
    speech.stop()
    stopSpeaking()
    upsertCustomQuestion(row)
    setCustomTick((n) => n + 1)
    writeLearnUrl({
      path: trackId ?? row.trackId,
      mode: 'practice',
      topic: row.topicId ?? topicId,
      custom: true,
      cq: row.id,
    })
    if (user) {
      void api
        .upsertCustomQuestion({
          client_id: row.id,
          track_id: row.trackId,
          topic_id: row.topicId,
          prompt: row.prompt,
          title: row.title,
          saved: row.saved,
        })
        .catch(() => undefined)
    }
  }

  function continueWhereLeftOff() {
    const pointer = getResumePointer()
    if (!pointer) return
    setError(null)
    setPaywall(null)
    setFeedback(null)
    setAnswer('')
    const canPracticeTrack =
      FREE_PRACTICE_TRACKS.has(pointer.trackId) || !!user?.is_pro
    const mode =
      pointer.lastQuestionId && canPracticeTrack ? 'practice' : 'learn'
    writeLearnUrl({
      path: pointer.trackId,
      mode,
      topic: pointer.lastTopicId ?? null,
      q: mode === 'practice' ? (pointer.lastQuestionId ?? null) : null,
    })
    trackEvent(mode === 'practice' ? 'practice_start' : 'learn_open', {
      path: '/',
      properties: {
        track_id: pointer.trackId,
        topic_id: pointer.lastTopicId,
        source: 'hero_continue',
      },
    })
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
    setFeedback(null)
    setAnswer('')
    setPaywall(null)
    if (activePack) {
      const qs = bankQuestions
      const preferred =
        (id && qs.find((q) => q.topic_id === id)) || qs[0] || null
      writeLearnUrl({
        path: trackId,
        mode: 'practice',
        topic: preferred?.topic_id ?? id,
        q: preferred?.id ?? questionId,
        pack: activePack.id,
      })
    } else {
      const qs = id ? questions.filter((q) => q.topic_id === id) : questions
      writeLearnUrl({
        path: trackId,
        mode: 'practice',
        topic: id,
        q: qs[0]?.id ?? questionId,
        pack: null,
      })
    }
    trackEvent('practice_start', {
      path: '/',
      properties: {
        track_id: trackId,
        topic_id: id ?? topicId,
        pack_id: activePack?.id,
      },
    })
  }

  async function submitAnswer() {
    if (!trackId) return
    const spokenOrTyped = liveAnswer.trim()
    if (!spokenOrTyped) return
    if (customMode && customPrompt.trim().length < 8) {
      setError('Write your interview question first (at least a short prompt).')
      return
    }
    if (!customMode && !questionId) return
    if (!user) {
      setPaywall('Sign in to get feedback.')
      return
    }
    if (customMode && customQuotaExhausted) {
      setPaywall(
        `Free plan includes ${FREE_CUSTOM_FEEDBACK_PER_TOPIC} AI feedbacks on your own questions per topic. Upgrade to Pro for unlimited custom practice.`,
      )
      return
    }
    speech.stop()
    setInterim('')
    setAnswer(spokenOrTyped)
    setLoading(true)
    setError(null)
    setFeedback(null)
    setPaywall(null)

    let activeCustom: CustomQuestionRecord | null = null
    if (customMode) {
      activeCustom = upsertCustomQuestion({
        id: customQuestionId ?? undefined,
        trackId,
        topicId,
        prompt: customPrompt,
        title: customQuestionId
          ? getCustomQuestion(customQuestionId)?.title
          : defaultCustomTitle(customPrompt),
      })
      setCustomQuestionId(activeCustom.id)
      setCustomTick((n) => n + 1)
      writeLearnUrl({
        path: trackId,
        mode: 'practice',
        topic: topicId,
        custom: true,
        cq: activeCustom.id,
        replace: true,
      })
    }

    try {
      const result = await api.feedback({
        track_id: trackId as Track['id'],
        question_id: customMode ? null : questionId,
        custom_prompt: customMode ? customPrompt.trim() : null,
        topic_id: topicId,
        custom_question_client_id: activeCustom?.id ?? null,
        answer: spokenOrTyped,
        input_mode: inputMode,
      })
      setFeedback(result)
      if (customMode && activeCustom) {
        recordCustomAttemptLocal(activeCustom.id, result.score)
        setCustomTick((n) => n + 1)
        void api
          .recordCustomAttempt({
            client_id: activeCustom.id,
            track_id: trackId,
            topic_id: topicId ?? undefined,
            prompt: activeCustom.prompt,
            title: activeCustom.title,
            score: result.score,
            provider: result.provider,
            input_mode: inputMode,
          })
          .catch(() => undefined)
        trackEvent('custom_practice', {
          path: '/practice',
          properties: {
            track_id: trackId,
            topic_id: topicId,
            score: result.score,
            source: 'submit',
          },
        })
      } else if (questionId) {
        recordAttempt(trackId, questionId, result.score, result.provider)
        setProgressTick((n) => n + 1)
        if (activeMock && params.get('mock') === '1') {
          recordMockResult(
            result,
            questionId,
            question?.prompt ?? questionId,
            question?.category ?? '',
          )
        }
      }
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(err.message)
      } else if (err instanceof ApiError && err.status === 401) {
        setPaywall('Sign in to get feedback on your answers.')
      } else if (!api.apiBase && user) {
        const key = `ats_fb_${new Date().toISOString().slice(0, 10)}`
        const used = Number(localStorage.getItem(key) || '0')
        const customKey = `ats_custom_fb_${user.id}_${trackId}_${topicId ?? ''}`
        const customUsed = Number(localStorage.getItem(customKey) || '0')
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
        } else if (
          customMode &&
          !user.is_pro &&
          customUsed >= FREE_CUSTOM_FEEDBACK_PER_TOPIC
        ) {
          setPaywall(
            `Free plan includes ${FREE_CUSTOM_FEEDBACK_PER_TOPIC} AI feedbacks on your own questions per topic. Upgrade to Pro for unlimited custom practice.`,
          )
        } else {
          const result = api.localFeedback({
            track_id: trackId as Track['id'],
            question_id: customMode ? null : questionId,
            custom_prompt: customMode ? customPrompt.trim() : null,
            answer: spokenOrTyped,
            input_mode: inputMode,
          })
          setFeedback(result)
          if (customMode && activeCustom) {
            recordCustomAttemptLocal(activeCustom.id, result.score)
            if (!user.is_pro) {
              localStorage.setItem(customKey, String(customUsed + 1))
            }
            setCustomTick((n) => n + 1)
          } else if (questionId) {
            recordAttempt(trackId, questionId, result.score, result.provider)
            setProgressTick((n) => n + 1)
            if (activeMock && params.get('mock') === '1') {
              recordMockResult(
                result,
                questionId,
                question?.prompt ?? questionId,
                question?.category ?? '',
              )
            }
          }
          if (!user.is_pro) localStorage.setItem(key, String(used + 1))
        }
      } else {
        setError(err instanceof Error ? err.message : 'Feedback failed')
      }
    } finally {
      setLoading(false)
    }
  }

  // Timed mock: tick clock + forced advance / end.
  useEffect(() => {
    if (!mockMode || !activeMock) return
    const id = window.setInterval(() => setNowMs(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [mockMode, activeMock])

  useEffect(() => {
    if (!mockMode || !activeMock || loading) return
    if (nowMs >= activeMock.endsAt) {
      if (mockForceRef.current === 'end') return
      mockForceRef.current = 'end'
      completeTimedMock()
      return
    }
    if (!questionId || feedback) return
    const qDeadline =
      activeMock.questionStartedAt + activeMock.perQuestionSec * 1000
    if (nowMs < qDeadline) return
    const key = `q:${questionId}`
    if (mockForceRef.current === key) return
    mockForceRef.current = key
    const spoken = liveAnswer.trim()
    if (spoken.length >= 12) {
      void submitAnswer()
      return
    }
    const idx = activeMock.questionIds.indexOf(questionId)
    const q =
      questions.find((item) => item.id === questionId) ||
      localQuestions(activeMock.trackId).find((item) => item.id === questionId)
    const skip: MockQuestionResult = {
      questionId,
      prompt: q?.prompt ?? questionId,
      category: q?.category ?? '',
      score: null,
      dims: null,
      skipped: true,
      at: new Date().toISOString(),
    }
    const results = [
      ...activeMock.results.filter((r) => r.questionId !== questionId),
      skip,
    ]
    advanceMockTo(idx + 1, results)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer-driven mock advance
  }, [nowMs, mockMode, activeMock, loading, questionId, feedback])

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
              {BRAND.product}
              <span>{isRecruiter ? BRAND.hireMagnet : BRAND.magnet}</span>
            </h1>
            <p className="hero-lede">
              {isRecruiter ? BRAND.hireMagnetSub : BRAND.magnetSub}
            </p>
            <div className="hero-cta">
              {isRecruiter ? (
                <>
                  <Link className="btn primary" to="/agentic-path">
                    {BRAND.hireCtaDemo}
                  </Link>
                  <Link className="btn ghost" to="/jobs">
                    {BRAND.hireCtaJobs}
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={loading}
                    onClick={startPracticing}
                  >
                    {BRAND.ctaStart}
                  </button>
                  {resume && (
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={loading}
                      onClick={continueWhereLeftOff}
                    >
                      {BRAND.ctaContinue}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn ghost hero-cta-custom"
                    disabled={loading}
                    onClick={() => startCustomPractice()}
                  >
                    {BRAND.ctaCustomQuestion}
                  </button>
                </>
              )}
            </div>
            {!isRecruiter && (
              <p className="hero-secondary">
                <Link to="/agentic-path">{BRAND.ctaExploreAgentic} path →</Link>
              </p>
            )}
            <div className="hero-stage" aria-hidden="true">
              <div className="hero-orbit" />
              <div className="hero-panel">
                <span className="pulse-dot" />
                {isRecruiter
                  ? 'Hire · oral practice signal'
                  : 'Bank drills · your questions · AI feedback'}
                <em>
                  {isRecruiter
                    ? '“See who already drilled the loop — then post the role.”'
                    : '“Speak the answer. Get coached on what to fix.”'}
                </em>
              </div>
            </div>
          </section>

          {!isRecruiter && resumeCard && (
            <section
              className="continue-strip reveal"
              aria-label="Continue where you left off"
            >
              <div className="continue-strip-copy">
                <p className="eyebrow">Continue</p>
                <strong>
                  {resumeCard.trackTitle}
                  {resumeCard.topicTitle ? ` · ${resumeCard.topicTitle}` : ''}
                </strong>
                <p>
                  {resumeCard.stats.pct}% complete
                  {resumeCard.recommended
                    ? ` · ${resumeCard.recommended.label}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn primary sm"
                disabled={loading}
                onClick={continueWhereLeftOff}
              >
                {BRAND.ctaContinue}
              </button>
            </section>
          )}

          {!isRecruiter && (
            <section
              id="practice-hub"
              className={`practice-hub launchpad-doors reveal${practiceHubFocused ? ' focused' : ''}`}
              aria-label="Where to go"
            >
              <div className="section-title">
                <h2>{BRAND.launchpadTitle}</h2>
                <p className="muted">{BRAND.launchpadBlurb}</p>
              </div>

              <div className="practice-hub-grid doors-4">
                <Link to="/agentic-path" className="practice-hub-card agentic">
                  <span className="eyebrow">Path</span>
                  <strong>Agentic AI</strong>
                  <p>Watch → mark done → practice with AI feedback.</p>
                  <span className="meta">Open path →</span>
                </Link>

                <button
                  type="button"
                  className="practice-hub-card"
                  disabled={loading}
                  onClick={() => {
                    const pack = ROLE_PACKS[0]
                    if (pack) startPack(pack)
                  }}
                >
                  <span className="eyebrow">Pack</span>
                  <strong>Staff loop</strong>
                  <p>12 oral drills — ownership, design, influence, AI safety.</p>
                  <span className="meta">Start pack →</span>
                </button>

                <button
                  type="button"
                  className="practice-hub-card custom"
                  disabled={loading}
                  onClick={() => startCustomPractice()}
                >
                  <span className="eyebrow">Custom</span>
                  <strong>Your question</strong>
                  <p>Paste a panel prompt and get the same AI coach.</p>
                  <span className="meta">{BRAND.ctaCustomQuestion} →</span>
                </button>

                <button
                  type="button"
                  className="practice-hub-card"
                  onClick={() => {
                    const el = document.getElementById(
                      'role-packs',
                    ) as HTMLElement | null
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span className="eyebrow">Packs</span>
                  <strong>All role packs</strong>
                  <p>Staff · EM hiring manager · AI engineer screen.</p>
                  <span className="meta">See packs →</span>
                </button>
              </div>

              <div
                id="role-packs"
                className="role-packs reveal"
                aria-label="Role packs"
              >
                <div className="section-title">
                  <h2>{BRAND.packsTitle}</h2>
                  <p className="muted">{BRAND.packsBlurb}</p>
                </div>
                <div className="practice-hub-grid doors-3">
                  {ROLE_PACKS.map((pack) => {
                    const locked = pack.proPractice && !user?.is_pro
                    return (
                      <div
                        key={pack.id}
                        className={`practice-hub-card pack pack-with-actions${locked ? ' locked' : ''}`}
                      >
                        <span className="eyebrow">{pack.eyebrow}</span>
                        <strong>{pack.title}</strong>
                        <p>{pack.blurb}</p>
                        <span className="meta">
                          {pack.questionIds.length} drills · ~{pack.durationMin}{' '}
                          min
                          {locked ? ' · Pro' : ''}
                        </span>
                        <div className="pack-actions">
                          <button
                            type="button"
                            className="btn ghost sm"
                            disabled={loading}
                            onClick={() => startPack(pack)}
                          >
                            Practice
                          </button>
                          <button
                            type="button"
                            className="btn primary sm"
                            disabled={loading}
                            onClick={() => startTimedMock(pack)}
                          >
                            Timed mock
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="timed-mock-strip">
                  <div>
                    <strong>Timed mock loop</strong>
                    <p className="muted">
                      Countdown, forced advance, end scorecard — Content /
                      Clarity / Delivery.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={loading}
                    onClick={() =>
                      startTimedMock(
                        user?.is_pro
                          ? (ROLE_PACKS[0] ?? FREE_SHORT_MOCK)
                          : FREE_SHORT_MOCK,
                      )
                    }
                  >
                    {user?.is_pro
                      ? 'Start 40-min Staff mock'
                      : 'Start free 15-min mock'}
                  </button>
                </div>
              </div>

              {mockSummary ? (
                <MockScorecard
                  summary={mockSummary}
                  onClose={() => {
                    setMockSummary(null)
                    openPracticeHub()
                  }}
                  onRetry={() => {
                    const pack =
                      mockSummary.packId === FREE_SHORT_MOCK.id
                        ? FREE_SHORT_MOCK
                        : getPack(mockSummary.packId) ||
                          (user?.is_pro ? ROLE_PACKS[0] : FREE_SHORT_MOCK)
                    if (pack) startTimedMock(pack)
                  }}
                />
              ) : null}
            </section>
          )}

          {isRecruiter && (
            <section
              className="practice-hub launchpad-doors reveal"
              aria-label="Where to go"
            >
              <div className="section-title">
                <h2>{BRAND.hireLaunchpadTitle}</h2>
                <p className="muted">{BRAND.hireLaunchpadBlurb}</p>
              </div>

              <div className="practice-hub-grid doors-4">
                <button
                  type="button"
                  className="practice-hub-card"
                  onClick={() => {
                    const el = document.getElementById(
                      'paths-catalog',
                    ) as HTMLDetailsElement | null
                    if (!el) return
                    el.open = true
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span className="eyebrow">Paths</span>
                  <strong>Candidate-ready paths</strong>
                  <p>Browse what talent studies before they apply.</p>
                  <span className="meta">Browse paths →</span>
                </button>

                <Link to="/jobs" className="practice-hub-card">
                  <span className="eyebrow">Jobs</span>
                  <strong>Jobs board</strong>
                  <p>Post roles where learners already practice out loud.</p>
                  <span className="meta">Open jobs →</span>
                </Link>

                <Link to="/pricing" className="practice-hub-card">
                  <span className="eyebrow">Plans</span>
                  <strong>Pricing</strong>
                  <p>Free practice path and Pro — clear for hiring pilots.</p>
                  <span className="meta">See pricing →</span>
                </Link>

                <Link to="/for-companies" className="practice-hub-card">
                  <span className="eyebrow">Product</span>
                  <strong>How it works</strong>
                  <p>Hiring kits, voice signals, and partner early access.</p>
                  <span className="meta">For companies →</span>
                </Link>
              </div>
            </section>
          )}

          <section className="section paths-layout" id="paths">
            <details id="paths-catalog" className="paths-catalog-details reveal">
              <summary className="paths-catalog-summary">
                <span>
                  <strong>
                    {isRecruiter
                      ? 'Paths talent trains on'
                      : 'Browse all paths'}
                  </strong>
                  <span className="muted">
                    {' '}
                    · Career · Interview · Languages
                    {isRecruiter ? ` · ${tracks.length} paths` : ''}
                  </span>
                </span>
                <span className="paths-catalog-chevron" aria-hidden="true">
                  ▾
                </span>
              </summary>
              <div className="paths-catalog-body">
                <p className="muted paths-catalog-lede">
                  {isRecruiter
                    ? 'Same curriculum candidates use — open a path to evaluate the practice loop.'
                    : 'Study free, practice when ready — same speak → coach loop.'}
                </p>
                {TRACK_GROUPS.map((group) => {
                  const items = group.trackIds
                    .map((id) => tracks.find((t) => t.id === id))
                    .filter(Boolean) as Track[]
                  if (!items.length) return null
                  return (
                    <div key={group.id} className="track-group">
                      <div className="track-group-head">
                        <h3>{group.title}</h3>
                        <p>{group.blurb}</p>
                      </div>
                      {group.id === 'career' && (
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
                              Core → Cortex → agents → interview prep →
                            </span>
                          </Link>
                        </>
                      )}
                      <div className="track-grid">
                        {items.map((item) => {
                          const count = topicsForTrack(item.id).length
                          const locked =
                            !FREE_PRACTICE_TRACKS.has(item.id) &&
                            !(user?.is_pro)
                          return (
                            <button
                              key={item.id}
                              className={`track-card ${locked ? 'locked' : ''}`}
                              onClick={() => selectTrack(item.id)}
                              disabled={loading}
                            >
                              <span
                                className="course-cover"
                                aria-hidden="true"
                              />
                              <span className="course-body">
                                <span className="pill-row">
                                  <span className="pill">{item.audience}</span>
                                  {locked ? (
                                    <span className="pill lock">Pro</span>
                                  ) : (
                                    <span className="pill free">
                                      Free practice
                                    </span>
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
                <p className="launchpad-jobs-link">
                  <Link className="linkish" to="/jobs">
                    {isRecruiter
                      ? 'Post or browse open roles →'
                      : "When you're ready — browse open jobs →"}
                  </Link>
                </p>
              </div>
            </details>
          </section>
        </>
      )}

      {activeTrack && step !== 'tracks' && (
        <section className="workspace reveal">
          <div className="workspace-head">
            <nav className="workspace-crumb" aria-label="Breadcrumb">
              <button
                type="button"
                className="linkish"
                onClick={() => clearLearnUrl()}
              >
                Home
              </button>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  if (step === 'practice') {
                    openPracticeHub()
                    return
                  }
                  clearLearnUrl()
                }}
              >
                {step === 'practice' ? 'Practice' : 'Study'}
              </button>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="crumb-current">
                {activePack ? activePack.title : activeTrack.title}
              </span>
            </nav>
            <div className="workspace-title">
              <h2>
                {activePack ? activePack.title : activeTrack.title}
                {activePack ? (
                  <span className="pill soft">Role pack</span>
                ) : null}
                {trackIsProOnly && !user?.is_pro && (
                  <span className="pill lock">Pro practice</span>
                )}
              </h2>
              <p>{activePack ? activePack.blurb : activeTrack.summary}</p>
            </div>
            {activePack ? (
              <div className="pack-rubric panel">
                <h4>Rubric signals</h4>
                <ul className="check-list">
                  {activePack.rubricSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="progress-block">
              <div className="progress-label">
                {activePack ? 'Pack' : 'Path'} {learnStats?.pct ?? progressPct}%
                {!activePack ? (
                  <>
                    {' '}
                    · reviewed {learnStats?.studied ?? 0}/
                    {learnStats?.topicsTotal ?? topics.length}
                  </>
                ) : null}{' '}
                · practiced {learnStats?.practiced ?? 0}/
                {learnStats?.questionsTotal ??
                  (activePack ? bankQuestions.length : questions.length)}
                {learnStats?.avg != null ? ` · avg ${learnStats.avg}/5` : ''}
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${learnStats?.pct ?? progressPct}%` }} />
              </div>
              <p className="progress-hint muted">
                {activePack
                  ? `Curated queue · ${activePack.questionIds.length} oral drills · ~${activePack.durationMin} min. Speak → score ≥4 → next.`
                  : `Loop: Study → Speak → score ≥4 → next topic. Mastery: ${learnStats?.mastery ?? 0}/${learnStats?.questionsTotal ?? 0} drills ≥4`}
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
                  pack: null,
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
                  const reviewed = !!trackProgress?.studiedTopicIds.includes(
                    item.id,
                  )
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
                      {reviewed ? (
                        <span className="pill done">Reviewed</span>
                      ) : null}
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
                        onClick={toggleCurrentReviewed}
                      >
                        {trackProgress?.studiedTopicIds.includes(topic.id)
                          ? 'Mark as not reviewed'
                          : 'Mark as reviewed'}
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
                {activePack ? (
                  <>
                    <h3>Role pack</h3>
                    <div className="topic-item active pack-sidebar-card">
                      <strong>{activePack.title}</strong>
                      <span>
                        {bankQuestions.length} drills · ~{activePack.durationMin}{' '}
                        min
                      </span>
                    </div>
                    <button
                      type="button"
                      className="topic-item"
                      onClick={() => {
                        writeLearnUrl({
                          path: trackId,
                          mode: 'practice',
                          topic: topicId,
                          q: questionId,
                          pack: null,
                        })
                      }}
                    >
                      <strong>Exit pack · full path</strong>
                      <span>Browse all {questions.length} questions</span>
                    </button>
                  </>
                ) : (
                  <>
                <h3>Topics</h3>
                <button
                  className={!topicId ? 'topic-item active' : 'topic-item'}
                  onClick={() => {
                    setTopicId(null)
                    setQuestionId(questions[0]?.id ?? null)
                    setFeedback(null)
                    setAnswer('')
                    writeLearnUrl({
                      path: trackId,
                      mode: 'practice',
                      custom: customMode,
                      cq: customMode ? customQuestionId : null,
                      pack: null,
                    })
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
                  </>
                )}

                <button
                  type="button"
                  className={
                    customMode
                      ? 'topic-item active custom-entry'
                      : 'topic-item custom-entry'
                  }
                  onClick={enterCustomMode}
                >
                  <strong>Practice your own question</strong>
                  <span>
                    {user?.is_pro
                      ? 'Unlimited custom AI feedback'
                      : user
                        ? `${FREE_CUSTOM_FEEDBACK_PER_TOPIC} free AI feedbacks / topic`
                        : 'Bring any interview prompt · AI coach'}
                  </span>
                </button>

                <AdSlot
                  id="practice-sidebar"
                  variant="sidebar"
                  headline="Practice partners"
                  detail="Reserved while you queue the next spoken answer."
                />

                {customMode ? (
                  <>
                    <h3>Your questions</h3>
                    {!topicCustomHistory.length && (
                      <p className="muted custom-history-empty">
                        Recent and saved prompts for this path show up here.
                      </p>
                    )}
                    {topicCustomHistory.map((row) => (
                      <div
                        key={row.id}
                        className={
                          row.id === customQuestionId
                            ? 'custom-q-item active'
                            : 'custom-q-item'
                        }
                      >
                        <button
                          type="button"
                          className="custom-q-main"
                          onClick={() => reuseCustomQuestion(row)}
                        >
                          <span>
                            {row.saved ? 'Saved' : 'Recent'}
                            {row.lastScore != null
                              ? ` · last ${row.lastScore}/5`
                              : ''}
                            {row.attemptCount
                              ? ` · ${row.attemptCount} try${row.attemptCount === 1 ? '' : 'ies'}`
                              : ''}
                          </span>
                          <strong>
                            {(row.title || defaultCustomTitle(row.prompt)).slice(
                              0,
                              72,
                            )}
                          </strong>
                        </button>
                        <div className="custom-q-tools">
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => {
                              const next = setCustomQuestionSaved(
                                row.id,
                                !row.saved,
                              )
                              setCustomTick((n) => n + 1)
                              if (next && user) {
                                void api
                                  .patchCustomQuestion(row.id, {
                                    saved: next.saved,
                                  })
                                  .catch(() => undefined)
                              }
                            }}
                          >
                            {row.saved ? 'Unsave' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => {
                              setRenameId(row.id)
                              setRenameDraft(row.title || '')
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="linkish danger"
                            onClick={() => {
                              deleteCustomQuestion(row.id)
                              if (customQuestionId === row.id) {
                                setCustomQuestionId(null)
                                setCustomPrompt('')
                              }
                              setCustomTick((n) => n + 1)
                              if (user) {
                                void api
                                  .deleteCustomQuestion(row.id)
                                  .catch(() => undefined)
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        {renameId === row.id && (
                          <form
                            className="custom-rename-form"
                            onSubmit={(e) => {
                              e.preventDefault()
                              const next = renameCustomQuestion(
                                row.id,
                                renameDraft,
                              )
                              setRenameId(null)
                              setCustomTick((n) => n + 1)
                              if (next && user) {
                                void api
                                  .patchCustomQuestion(row.id, {
                                    title: next.title || '',
                                  })
                                  .catch(() => undefined)
                              }
                            }}
                          >
                            <input
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              placeholder="Short title"
                              maxLength={200}
                              aria-label="Rename custom question"
                            />
                            <button type="submit" className="btn ghost sm">
                              OK
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h3>{activePack ? 'Pack queue' : 'Queue'}</h3>
                    {topicQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        className={
                          q.id === questionId ? 'q-item active' : 'q-item'
                        }
                        onClick={() => {
                          setFeedback(null)
                          setAnswer('')
                          setInterim('')
                          setInputMode('text')
                          speech.stop()
                          stopSpeaking()
                          setCustomMode(false)
                          writeLearnUrl({
                            path: trackId,
                            mode: 'practice',
                            topic: q.topic_id,
                            q: q.id,
                            pack: activePack?.id ?? null,
                          })
                        }}
                      >
                        <span>
                          {q.category} · Q{idx + 1}
                          {activePack &&
                          trackProgress?.attempts[q.id]?.score != null
                            ? ` · ${trackProgress.attempts[q.id].score}/5`
                            : ''}
                        </span>
                        <strong>{q.prompt.slice(0, 72)}…</strong>
                      </button>
                    ))}
                  </>
                )}
              </aside>

              <div className="panel practice-main">
                {mockMode && activeMock ? (
                  <div className="mock-timer-bar" role="status">
                    <div className="mock-timer-meta">
                      <strong>Timed mock · {activeMock.title}</strong>
                      <span>
                        Q{' '}
                        {Math.max(
                          1,
                          activeMock.questionIds.indexOf(questionId ?? '') + 1,
                        )}
                        /{activeMock.questionIds.length}
                      </span>
                    </div>
                    <div className="mock-timer-clocks">
                      <span
                        className={
                          activeMock.endsAt - nowMs < 60_000 ? 'urgent' : ''
                        }
                      >
                        Overall {formatCountdown(activeMock.endsAt - nowMs)}
                      </span>
                      <span
                        className={
                          activeMock.questionStartedAt +
                            activeMock.perQuestionSec * 1000 -
                            nowMs <
                          30_000
                            ? 'urgent'
                            : ''
                        }
                      >
                        This Q{' '}
                        {formatCountdown(
                          activeMock.questionStartedAt +
                            activeMock.perQuestionSec * 1000 -
                            nowMs,
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => completeTimedMock()}
                    >
                      End mock · scorecard
                    </button>
                  </div>
                ) : (
                  <div
                    className="practice-source-switch"
                    role="tablist"
                    aria-label="Practice source"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!customMode}
                      className={
                        !customMode ? 'source-tab active' : 'source-tab'
                      }
                      onClick={exitCustomMode}
                    >
                      Curated bank
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={customMode}
                      className={
                        customMode ? 'source-tab active' : 'source-tab'
                      }
                      onClick={enterCustomMode}
                    >
                      Your own question
                    </button>
                  </div>
                )}

                {!customMode && !mockMode && (
                  <div className="session-progress">
                    <div className="session-progress-meta">
                      <span>
                        {queueTotal > 0
                          ? `Question ${queuePos} of ${queueTotal}`
                          : 'Practice session'}
                        {topic ? ` · ${topic.title}` : ''}
                      </span>
                      <span>{sessionPct}%</span>
                    </div>
                    <div
                      className="session-progress-bar"
                      role="progressbar"
                      aria-valuenow={sessionPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Session progress"
                    >
                      <span style={{ width: `${sessionPct}%` }} />
                    </div>
                  </div>
                )}

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

                {customMode ? (
                  <>
                    <div className="question-tools">
                      <p className="pill">Your question</p>
                      {customPrompt.trim().length >= 8 && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => speakText(customPrompt)}
                        >
                          Hear question
                        </button>
                      )}
                    </div>
                    <label className="answer-label" htmlFor="custom-prompt">
                      Interview question
                    </label>
                    <textarea
                      id="custom-prompt"
                      className="custom-prompt-input"
                      value={customPrompt}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value)
                        setFeedback(null)
                      }}
                      placeholder="Paste any interview question — from a real panel, job post, or mock…"
                      rows={4}
                    />
                    <p className="muted custom-prompt-hint">
                      Scoped to this path
                      {topic ? ` · ${topic.title}` : ''}. Custom tries do not
                      inflate bank mastery scores.
                      {user?.is_pro
                        ? ' Pro: unlimited AI feedback on your own questions.'
                        : user
                          ? ` Free: ${FREE_CUSTOM_FEEDBACK_PER_TOPIC} AI feedbacks on your own questions per topic.`
                          : ' Sign in for AI feedback on your own questions.'}
                    </p>
                    {user && !user.is_pro && customRemaining !== null && (
                      <p
                        className={
                          customQuotaExhausted
                            ? 'custom-quota-banner exhausted'
                            : 'custom-quota-banner'
                        }
                        role="status"
                      >
                        {customQuotaExhausted ? (
                          <>
                            No free custom AI feedbacks left on this topic.{' '}
                            <Link to="/pricing">Upgrade to Pro</Link> for
                            unlimited practice on your own questions.
                          </>
                        ) : (
                          <>
                            {customRemaining} free left on this topic — then Pro
                            unlocks the rest.
                          </>
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  question && (
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
                    </>
                  )
                )}

                {(customMode || question) && (
                  <>
                    <div className="answer-toolbar">
                      <label className="answer-label" htmlFor="answer">
                        Your answer{' '}
                        {inputMode === 'voice' && (
                          <span className="pill voice">Voice</span>
                        )}
                      </label>
                      <div className="practice-actions">
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
                            disabled={
                              !speech.supported ||
                              (customMode && customPrompt.trim().length < 8)
                            }
                          >
                            Speak
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setInputMode('text')
                            speech.stop()
                            setInterim('')
                            document.getElementById('answer')?.focus()
                          }}
                        >
                          Type
                        </button>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={submitAnswer}
                          disabled={
                            loading ||
                            !liveAnswer.trim() ||
                            (customMode && customPrompt.trim().length < 8) ||
                            (customMode && customQuotaExhausted)
                          }
                        >
                          {loading
                            ? 'Coaching…'
                            : customMode && customQuotaExhausted
                              ? 'Upgrade for more'
                              : 'Submit'}
                        </button>
                        {customMode && customQuotaExhausted && (
                          <Link className="btn ghost" to="/pricing">
                            See Pro plans
                          </Link>
                        )}
                        {!customMode && (
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={goNextQuestion}
                            disabled={queueTotal <= 1}
                          >
                            Skip
                          </button>
                        )}
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
                          {customMode ? ' · custom question' : ''}
                        </small>
                      </div>
                    </div>
                    <div className="feedback-dims">
                      <div className="fb-dim content">
                        <h4>Content</h4>
                        <p className="muted">{feedback.summary}</p>
                        {!!feedback.strengths.length && (
                          <ul>
                            {feedback.strengths.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="fb-dim clarity">
                        <h4>Clarity</h4>
                        {feedback.gaps.length ? (
                          <ul>
                            {feedback.gaps.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">No clarity gaps called out.</p>
                        )}
                      </div>
                      <div className="fb-dim delivery">
                        <h4>Delivery</h4>
                        {feedback.delivery_tips?.length ? (
                          <ul>
                            {feedback.delivery_tips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">
                            No delivery notes — try Speak next time for voice
                            tips.
                          </p>
                        )}
                      </div>
                    </div>
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
                        Practice again
                      </button>
                      {!customMode && (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={goNextQuestion}
                        >
                          Next question
                        </button>
                      )}
                      {customMode && (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setCustomQuestionId(null)
                            setCustomPrompt('')
                            setFeedback(null)
                            setAnswer('')
                            writeLearnUrl({
                              path: trackId,
                              mode: 'practice',
                              topic: topicId,
                              custom: true,
                            })
                          }}
                        >
                          New custom question
                        </button>
                      )}
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
                        Review docs
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
