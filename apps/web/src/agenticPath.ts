export type PathVideo = {
  id: string
  title: string
  channel: string
  duration: string
  why: string
  youtubeId?: string
  playlistId?: string
  url: string
}

export type PathPhase = {
  id: string
  step: number
  title: string
  blurb: string
  javaBridge: string
  videos: PathVideo[]
}

/** Ordered Java → Agentic AI engineer path (curated free YouTube). */
export const AGENTIC_PATH: PathPhase[] = [
  {
    id: 'python-bridge',
    step: 1,
    title: 'Python bridge (from Java)',
    blurb: 'Get fluent enough in Python to ship services — not “learn everything.”',
    javaBridge:
      'Map List/Map → list/dict, Spring services → modules + FastAPI, JUnit → pytest.',
    videos: [
      {
        id: 'py-fcc',
        title: 'Learn Python – Full Course for Beginners',
        channel: 'freeCodeCamp.org',
        duration: '~4.5h',
        why: 'Fast syntax fluency so Java habits translate cleanly.',
        youtubeId: 'rfscVS0vtbw',
        url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
      },
      {
        id: 'py-types',
        title: 'Learn Python by Thinking in Types',
        channel: 'freeCodeCamp.org',
        duration: 'Full course',
        why: 'Type hints ≈ Java static safety — critical for production AI code.',
        youtubeId: 'jH85McHenvw',
        url: 'https://www.youtube.com/watch?v=jH85McHenvw',
      },
      {
        id: 'fastapi',
        title: 'Python API Development with FastAPI',
        channel: 'freeCodeCamp.org',
        duration: '~19h (skim or follow)',
        why: 'Closest Spring Boot feeling: routes, validation, SQL, deploy.',
        youtubeId: '0sOvCWFmrtA',
        url: 'https://www.youtube.com/watch?v=0sOvCWFmrtA',
      },
    ],
  },
  {
    id: 'llm-foundations',
    step: 2,
    title: 'LLM foundations',
    blurb: 'Understand what models are before wiring frameworks.',
    javaBridge:
      'Treat the model like an unreliable remote dependency with latency + cost SLOs.',
    videos: [
      {
        id: 'karp-intro',
        title: '[1hr Talk] Intro to Large Language Models',
        channel: 'Andrej Karpathy',
        duration: '~1h',
        why: 'Best single overview of weights, training, and the new compute stack.',
        youtubeId: 'zjkBMFhNj_g',
        url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
      },
      {
        id: 'karp-deep',
        title: 'Deep Dive into LLMs like ChatGPT',
        channel: 'Andrej Karpathy',
        duration: 'Long form',
        why: 'Tokens, training, fine-tuning — depth for Staff/AI interviews.',
        youtubeId: '7xTGNNLPyMI',
        url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
      },
    ],
  },
  {
    id: 'tools-agents-basics',
    step: 3,
    title: 'Tool calling & first agents',
    blurb: 'Agents = model + tools + loop. Start with function calling.',
    javaBridge:
      'Tool schemas are like interface contracts; validate args server-side like any API.',
    videos: [
      {
        id: 'fn-call',
        title: 'OpenAI Function Calling – Full Beginner Tutorial',
        channel: 'YouTube',
        duration: 'Tutorial',
        why: 'Core pattern behind every modern agent framework.',
        youtubeId: 'aqdWSYWC_LI',
        url: 'https://www.youtube.com/watch?v=aqdWSYWC_LI',
      },
      {
        id: 'lc-crash',
        title: 'LangChain Crash Course for Beginners',
        channel: 'freeCodeCamp.org',
        duration: '~1h',
        why: 'Chains, tools, and a first agent-style app.',
        youtubeId: 'lG7Uxts9SXs',
        url: 'https://www.youtube.com/watch?v=lG7Uxts9SXs',
      },
      {
        id: 'llm-dev',
        title: 'Development with LLMs – OpenAI, LangChain, Agents, Chroma',
        channel: 'freeCodeCamp.org',
        duration: '~2h',
        why: 'End-to-end: embeddings, vector store, browsing agents.',
        youtubeId: 'xZDB1naRUlk',
        url: 'https://www.youtube.com/watch?v=xZDB1naRUlk',
      },
    ],
  },
  {
    id: 'rag',
    step: 4,
    title: 'RAG systems',
    blurb: 'Ground answers in your data — the default enterprise pattern.',
    javaBridge:
      'Index = search service; retriever = query API; generator = orchestration layer.',
    videos: [
      {
        id: 'rag-p1',
        title: 'RAG From Scratch: Part 1 (Overview)',
        channel: 'LangChain',
        duration: '~5m',
        why: 'Official mental model: index → retrieve → generate.',
        youtubeId: 'wd7TZ4w1mSw',
        url: 'https://www.youtube.com/watch?v=wd7TZ4w1mSw',
      },
      {
        id: 'rag-playlist',
        title: 'RAG From Scratch (full playlist)',
        channel: 'LangChain',
        duration: 'Multi-video series',
        why: 'Chunking, query rewriting, adaptive/agentic RAG patterns.',
        playlistId: 'PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x',
        url: 'https://www.youtube.com/playlist?list=PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x',
      },
      {
        id: 'rag-langgraph-pl',
        title: 'RAG techniques with LangGraph (playlist)',
        channel: 'Community / hands-on',
        duration: 'Episode series',
        why: 'CRAG, Self-RAG, reranking — agentic retrieval pipelines.',
        playlistId: 'PLEHeb1HGikpRX0---E12X1hyt5yOFlz_6',
        url: 'https://www.youtube.com/playlist?list=PLEHeb1HGikpRX0---E12X1hyt5yOFlz_6',
      },
    ],
  },
  {
    id: 'langgraph-agentic',
    step: 5,
    title: 'LangGraph & agentic workflows',
    blurb: 'Stateful graphs, loops, multi-agent, human-in-the-loop.',
    javaBridge:
      'Think state machines / saga orchestration — nodes, edges, checkpoints.',
    videos: [
      {
        id: 'langgraph-fcc',
        title: 'LangGraph Complete Course – Complex AI Agents with Python',
        channel: 'freeCodeCamp.org',
        duration: 'Full course',
        why: 'Primary hands-on path to production-shaped agents.',
        youtubeId: 'jGg_1h0qzaM',
        url: 'https://www.youtube.com/watch?v=jGg_1h0qzaM',
      },
      {
        id: 'langgraph-series',
        title: 'LangGraph learning series (playlist)',
        channel: 'Yash Jain',
        duration: 'Multi-episode',
        why: 'Graphs → tools → multi-agent → agentic RAG.',
        playlistId: 'PLjuA_yqsfemenaOq4hjs3zTRRXVlQM0gR',
        url: 'https://www.youtube.com/playlist?list=PLjuA_yqsfemenaOq4hjs3zTRRXVlQM0gR',
      },
      {
        id: 'build-agent',
        title: 'Build Your Own AI Agent – OpenAI, LangChain, Deploy',
        channel: 'freeCodeCamp.org',
        duration: 'Project course',
        why: 'Ship an agent outside the notebook (deploy mindset).',
        youtubeId: 'MnG0ugK2JAI',
        url: 'https://www.youtube.com/watch?v=MnG0ugK2JAI',
      },
    ],
  },
  {
    id: 'production',
    step: 6,
    title: 'Production AI engineer habits',
    blurb: 'Evals, guardrails, observability — what separates demos from systems.',
    javaBridge:
      'Same as Java prod: SLOs, authz, audit logs, circuit breakers, cost budgets.',
    videos: [
      {
        id: 'rag-eval-note',
        title: 'Revisit RAG From Scratch advanced parts (evals / adaptive)',
        channel: 'LangChain',
        duration: 'Playlist segments',
        why: 'Production quality = retrieval + faithfulness metrics, not vibes.',
        playlistId: 'PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x',
        url: 'https://www.youtube.com/playlist?list=PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x',
      },
      {
        id: 'agent-deploy',
        title: 'Build & deploy agent project (re-watch deploy chapters)',
        channel: 'freeCodeCamp.org',
        duration: 'Project',
        why: 'Docker / host deploy closes the Java→AI loop.',
        youtubeId: 'MnG0ugK2JAI',
        url: 'https://www.youtube.com/watch?v=MnG0ugK2JAI',
      },
    ],
  },
]

export function allPathVideos(): PathVideo[] {
  return AGENTIC_PATH.flatMap((p) => p.videos)
}

export function embedUrl(video: PathVideo): string {
  if (video.playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${video.playlistId}`
  }
  return `https://www.youtube.com/embed/${video.youtubeId}`
}

const PROGRESS_KEY = 'ats_agentic_video_done'

export function loadVideoProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function saveVideoProgress(done: Set<string>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]))
}
