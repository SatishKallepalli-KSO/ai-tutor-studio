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
import { AUDIENCES, BRAND } from './brand'
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
    replace?: boolean
  }) {
    const sp = new URLSearchParams()
    const billing = params.get('billing')
    if (billing) sp.set('billing', billing)
    if (next.path) {
      sp.set('path', next.path)
      sp.set('mode', next.mode ?? 'learn')
      if (next.topic) sp.set('topic', next.topic)
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
                  ? 'Hiring · phase 2'
                  : 'Bank drills · your questions · AI feedback'}
                <em>
                  {isRecruiter
                    ? '“Reach candidates who already practiced out loud.”'
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
                  onClick={() => void selectTrack('staff-interview')}
                >
                  <span className="eyebrow">Interview</span>
                  <strong>Interview practice</strong>
                  <p>Staff loop — ownership, design, influence out loud.</p>
                  <span className="meta">Open path →</span>
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
                      'paths-catalog',
                    ) as HTMLDetailsElement | null
                    if (!el) return
                    el.open = true
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span className="eyebrow">Catalog</span>
                  <strong>Browse paths</strong>
                  <p>Career switches, interviews, languages — full list.</p>
                  <span className="meta">Browse all paths →</span>
                </button>
              </div>
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

          {isRecruiter && (
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
            {isRecruiter ? (
              <>
                <div className="section-title">
                  <h2>Paths talent trains on</h2>
                  <p className="muted">
                    {tracks.length} paths learners use before they apply
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
                                  Validated YouTube library: core → Cortex →
                                  agents → interview prep →
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
                  </div>
                  <AdSlot
                    id="home-paths-sidebar"
                    variant="sidebar"
                    className="paths-ad"
                    headline="Career switch partners"
                    detail="Sidebar placement for bootcamps, certs, and hiring tools."
                  />
                </div>
              </>
            ) : (
              <details id="paths-catalog" className="paths-catalog-details reveal">
                <summary className="paths-catalog-summary">
                  <span>
                    <strong>Browse all paths</strong>
                    <span className="muted">
                      {' '}
                      · Career · Interview · Languages
                    </span>
                  </span>
                  <span className="paths-catalog-chevron" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className="paths-catalog-body">
                  <p className="muted paths-catalog-lede">
                    Study free, practice when ready — same speak → coach loop.
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
                      When you&apos;re ready — browse open jobs →
                    </Link>
                  </p>
                </div>
              </details>
            )}
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
              <span className="crumb-current">{activeTrack.title}</span>
            </nav>
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
                Path {learnStats?.pct ?? progressPct}% · reviewed{' '}
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
                    <h3>Queue</h3>
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
                  </>
                )}
              </aside>

              <div className="panel practice-main">
                <div
                  className="practice-source-switch"
                  role="tablist"
                  aria-label="Practice source"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!customMode}
                    className={!customMode ? 'source-tab active' : 'source-tab'}
                    onClick={exitCustomMode}
                  >
                    Curated bank
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={customMode}
                    className={customMode ? 'source-tab active' : 'source-tab'}
                    onClick={enterCustomMode}
                  >
                    Your own question
                  </button>
                </div>

                {!customMode && (
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
