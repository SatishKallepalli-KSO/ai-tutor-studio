import type { Feedback, Track, TrackId, TutorQuestion } from './api'

export const TRACKS: Track[] = [
  {
    id: 'staff-interview',
    title: 'Staff Engineer Interview Prep',
    audience: 'Senior / Staff IC candidates',
    summary:
      'System design, ownership stories, and production AI depth for Staff loops.',
    outcomes: [
      'Tell Staff-level ownership stories with metrics',
      'Design distributed systems with clear tradeoffs',
      'Explain production AI guardrails (entitlements, audit, evals)',
    ],
    study_plan: [
      'Day 1–2: Rewrite 3 ownership stories (Context → Action → Metric)',
      'Day 3–4: Drill 2 system designs (sync engine, NLQ platform)',
      'Day 5: Mock behavioral + deep dive on one production AI project',
      'Day 6–7: Timed answers + tighten resume bullets to stories',
    ],
  },
  {
    id: 'em-interview',
    title: 'Engineering Manager Interview Prep',
    audience: 'EM / player-coach leaders',
    summary:
      'People leadership, delivery, hiring, and vendor/team-build narratives.',
    outcomes: [
      'Lead with people + delivery ownership, not only IC craft',
      'Run hiring / performance / incident stories cleanly',
      'Show technical credibility without competing for IC tickets',
    ],
    study_plan: [
      'Day 1: Memorize 30–40s EM opener',
      'Day 2–3: Team-from-scratch + vendor-to-in-house STAR cards',
      'Day 4: Hiring loop + performance management scenarios',
      'Day 5–7: Mock HM screen + conflict / prioritization drills',
    ],
  },
  {
    id: 'java-to-ai',
    title: 'Java → Production AI Upskilling',
    audience: 'Java/backend engineers moving into AI',
    summary:
      'Practical path from Spring services to RAG, agents, and safe LLM features.',
    outcomes: [
      'Map Spring concepts to FastAPI / AI service patterns',
      'Explain RAG vs fine-tuning vs prompt-only clearly',
      'Design an entitlement-safe NLQ or document pipeline',
    ],
    study_plan: [
      'Week 1: Python fluency + HTTP/LLM basics',
      'Week 2: RAG building blocks (chunk, embed, retrieve, cite)',
      'Week 3: Agents/tools + guardrails + evals',
      'Week 4: Ship a tiny production-shaped AI feature',
    ],
  },
  {
    id: 'java',
    title: 'Java',
    audience: 'Backend / JVM engineers',
    summary: 'Core Java, concurrency, Spring Boot, and production service patterns.',
    outcomes: [
      'Explain OOP, collections, and concurrency clearly',
      'Design Spring Boot APIs with solid error handling',
      'Talk JVM memory, threads, and performance tradeoffs',
    ],
    study_plan: [
      'Day 1–2: OOP, equals/hashCode, collections, generics',
      'Day 3–4: Threads, executors, CompletableFuture',
      'Day 5: Spring Boot REST, validation, transactions',
      'Day 6–7: Practice debugging and production failure scenarios',
    ],
  },
  {
    id: 'python',
    title: 'Python',
    audience: 'Backend / scripting / AI-adjacent',
    summary: 'Python fundamentals, typing, async, and packaging for real services.',
    outcomes: [
      'Write clean typed Python with clear module structure',
      'Explain GIL, async/await, and when to use each',
      'Build FastAPI-style request/response flows',
    ],
    study_plan: [
      'Day 1–2: Data structures, comprehensions, typing',
      'Day 3: OOP, dataclasses, protocols',
      'Day 4–5: Async IO + HTTP clients',
      'Day 6–7: Packaging, testing, FastAPI basics',
    ],
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    audience: 'Web / fullstack beginners → mid',
    summary: 'Modern JS: language essentials, async, DOM, and browser APIs.',
    outcomes: [
      'Master closures, prototypes, and this-binding',
      'Use promises/async-await confidently',
      'Manipulate the DOM and handle events cleanly',
    ],
    study_plan: [
      'Day 1–2: Types, scope, hoisting, closures',
      'Day 3: Arrays/objects + functional helpers',
      'Day 4–5: Promises, async/await, fetch',
      'Day 6–7: DOM events and small UI scripts',
    ],
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    audience: 'JS developers leveling up',
    summary: 'Types, generics, utility types, and typing React/Node apps.',
    outcomes: [
      'Model domain data with interfaces and unions',
      'Use generics and utility types effectively',
      'Type API responses and component props safely',
    ],
    study_plan: [
      'Day 1–2: Primitives, unions, narrowing',
      'Day 3: Interfaces vs types, generics',
      'Day 4: Utility types + mapped types',
      'Day 5–7: Type a small React + API client',
    ],
  },
  {
    id: 'react',
    title: 'React',
    audience: 'Frontend engineers',
    summary: 'Components, hooks, state, effects, and production React patterns.',
    outcomes: [
      'Build components with clean props and state',
      'Use effects correctly without common bugs',
      'Explain rendering, keys, and performance basics',
    ],
    study_plan: [
      'Day 1–2: Components, props, state, lists/keys',
      'Day 3–4: useEffect, data fetching, cleanup',
      'Day 5: Context + lifting state',
      'Day 6–7: Forms, errors, and a mini feature',
    ],
  },
  {
    id: 'nodejs',
    title: 'Node.js',
    audience: 'Backend / fullstack JS',
    summary: 'Node runtime, Express/Fastify APIs, async I/O, and packaging.',
    outcomes: [
      'Explain event loop and non-blocking I/O',
      'Build REST APIs with middleware and validation',
      'Handle errors, env config, and basic security',
    ],
    study_plan: [
      'Day 1–2: Modules, npm, event loop basics',
      'Day 3–4: HTTP servers + Express routes',
      'Day 5: Auth/JWT overview + validation',
      'Day 6–7: Logging, errors, deploy checklist',
    ],
  },
  {
    id: 'html',
    title: 'HTML',
    audience: 'Web fundamentals',
    summary: 'Semantic HTML, forms, accessibility, and document structure.',
    outcomes: [
      'Use semantic tags for structure and SEO',
      'Build accessible forms and navigation',
      'Understand HTML5 APIs at a practical level',
    ],
    study_plan: [
      'Day 1: Document structure + semantic landmarks',
      'Day 2–3: Forms, inputs, validation attributes',
      'Day 4: Media, tables, metadata',
      'Day 5–7: Accessibility checklist + rebuild a landing section',
    ],
  },
  {
    id: 'css',
    title: 'CSS',
    audience: 'Web fundamentals / UI',
    summary: 'Layout, flex/grid, responsive design, and modern styling patterns.',
    outcomes: [
      'Build layouts with Flexbox and Grid',
      'Make responsive UIs with media queries',
      'Use variables, specificity, and clean organization',
    ],
    study_plan: [
      'Day 1–2: Cascade, specificity, box model',
      'Day 3–4: Flexbox + Grid layouts',
      'Day 5: Responsive design + typography',
      'Day 6–7: Recreate a card/hero section pixel-clean',
    ],
  },
]

export const QUESTIONS: TutorQuestion[] = [
  {
    id: 'staff-ownership',
    track_id: 'staff-interview',
    category: 'Behavioral',
    prompt:
      'Tell me about a system you owned end-to-end. What was hard, what did you decide, and what measurable outcome did you drive?',
    hints: [
      'Lead with scope and users',
      'Name 1–2 hard tradeoffs',
      'End with a metric (uptime, latency, manual hours saved)',
    ],
    strong_answer_signals: [
      'owned',
      'tradeoff',
      'metric',
      'production',
      'reliability',
      'customer',
    ],
  },
  {
    id: 'staff-design-sync',
    track_id: 'staff-interview',
    category: 'System design',
    prompt:
      'Design a customer data syncing engine that must move large volumes of data to destinations reliably. How would you approach batch today and streaming later?',
    hints: [
      'Separate ingest, transform, deliver, observe',
      'Talk retries, idempotency, backpressure',
      'Call out multi-tenant isolation and failure modes',
    ],
    strong_answer_signals: [
      'idempotent',
      'retry',
      'queue',
      'batch',
      'stream',
      'observability',
      'backpressure',
    ],
  },
  {
    id: 'staff-ai-guardrails',
    track_id: 'staff-interview',
    category: 'AI / production',
    prompt:
      "How would you ship an enterprise natural-language-to-SQL feature safely when different customers must never see each other's data?",
    hints: [
      'Entitlements before model call',
      'Fail-closed validation on generated SQL',
      'Audit + rate limits + eval set',
    ],
    strong_answer_signals: [
      'entitlement',
      'guardrail',
      'fail-closed',
      'audit',
      'rate limit',
      'eval',
    ],
  },
  {
    id: 'em-opener',
    track_id: 'em-interview',
    category: 'Leadership',
    prompt:
      "Give your 30–40 second introduction as an Engineering Manager. Include scope, signature wins, and what you're looking for next.",
    hints: [
      'Lead with people ownership',
      'Mention team size / footprint',
      'One transformation win + one AI/product win',
    ],
    strong_answer_signals: [
      'team',
      'hiring',
      'delivery',
      'coaching',
      'uptime',
      'product',
    ],
  },
  {
    id: 'em-vendor',
    track_id: 'em-interview',
    category: 'Transformation',
    prompt:
      'Describe leading a vendor-to-in-house transition. How did you protect delivery and uptime while building the team?',
    hints: [
      'Continuity plan first',
      'Hiring + knowledge transfer',
      'Explicit uptime / customer impact metric',
    ],
    strong_answer_signals: [
      'vendor',
      'in-house',
      'hiring',
      'uptime',
      'knowledge transfer',
      'stakeholder',
    ],
  },
  {
    id: 'em-conflict',
    track_id: 'em-interview',
    category: 'People',
    prompt:
      'Product wants more features; your team is drowning in reliability work. How do you handle the conflict?',
    hints: [
      'Reframe to shared outcomes',
      'Bring options with risk',
      'Escalate only with a recommendation',
    ],
    strong_answer_signals: [
      'tradeoff',
      'risk',
      'capacity',
      'roadmap',
      'option',
      'reliability',
    ],
  },
  {
    id: 'java-ai-map',
    track_id: 'java-to-ai',
    category: 'Concepts',
    prompt:
      "You're a Java/Spring engineer. Explain how you would structure a production AI feature service and what maps from Spring Boot patterns.",
    hints: [
      'Controllers → API routes',
      'Services → orchestration + tools',
      'Observability and config still matter',
    ],
    strong_answer_signals: [
      'spring',
      'api',
      'service',
      'observability',
      'config',
      'timeout',
      'retry',
    ],
  },
  {
    id: 'java-rag',
    track_id: 'java-to-ai',
    category: 'RAG',
    prompt:
      'When would you use RAG instead of fine-tuning, and how would you evaluate whether retrieval quality is good enough?',
    hints: [
      'Fresh / private knowledge → RAG',
      'Behavior/style → maybe fine-tune',
      'Eval with golden questions + citation checks',
    ],
    strong_answer_signals: [
      'rag',
      'fine-tune',
      'retrieval',
      'citation',
      'eval',
      'chunk',
    ],
  },
  {
    id: 'java-agents',
    track_id: 'java-to-ai',
    category: 'Agents',
    prompt:
      'Design a simple document extraction agent for messy Excel/PDF inputs. What steps, tools, and failure handling do you need?',
    hints: [
      'Ingest → extract → validate → retry → store',
      'Deterministic validation gates',
      'Human review on low confidence',
    ],
    strong_answer_signals: [
      'validate',
      'retry',
      'tool',
      'confidence',
      'pipeline',
      'human',
    ],
  },
  {
    id: 'java-oop',
    track_id: 'java',
    category: 'Fundamentals',
    prompt:
      'Explain encapsulation, inheritance, and polymorphism with a realistic Spring service example.',
    hints: [
      'Prefer composition when inheritance gets messy',
      'Show interface + implementation',
      'Mention testability',
    ],
    strong_answer_signals: [
      'interface',
      'encapsulation',
      'polymorphism',
      'inheritance',
      'spring',
      'test',
    ],
  },
  {
    id: 'java-concurrency',
    track_id: 'java',
    category: 'Concurrency',
    prompt:
      'How would you parallelize independent I/O-bound tasks in Java without blocking the request thread carelessly?',
    hints: [
      'ExecutorService / CompletableFuture',
      'Timeouts and cancellation',
      'Backpressure / bounded pools',
    ],
    strong_answer_signals: [
      'executor',
      'completablefuture',
      'timeout',
      'thread',
      'pool',
      'async',
    ],
  },
  {
    id: 'java-spring-api',
    track_id: 'java',
    category: 'Spring Boot',
    prompt:
      'Design a Spring Boot REST endpoint that validates input, calls a service, and returns consistent error responses.',
    hints: [
      'Controller → Service separation',
      '@Valid + problem details',
      'Transaction boundaries',
    ],
    strong_answer_signals: [
      'controller',
      'service',
      'validation',
      'exception',
      'dto',
      'transaction',
    ],
  },
  {
    id: 'python-typing',
    track_id: 'python',
    category: 'Fundamentals',
    prompt:
      'Why use type hints in Python services, and how do dataclasses/pydantic help API boundaries?',
    hints: [
      'Catch bugs earlier',
      'Better editor support',
      'Validate request/response shapes',
    ],
    strong_answer_signals: [
      'typing',
      'dataclass',
      'pydantic',
      'validation',
      'mypy',
      'api',
    ],
  },
  {
    id: 'python-async',
    track_id: 'python',
    category: 'Async',
    prompt:
      'When should you use asyncio in Python, and what mistakes do people make with blocking calls inside async functions?',
    hints: [
      'I/O-bound concurrency',
      'Do not block the event loop',
      'Use thread/process offload for CPU',
    ],
    strong_answer_signals: [
      'asyncio',
      'await',
      'event loop',
      'blocking',
      'io',
      'concurrent',
    ],
  },
  {
    id: 'python-fastapi',
    track_id: 'python',
    category: 'APIs',
    prompt:
      'Sketch a FastAPI endpoint that accepts JSON, validates it, and returns a typed response model.',
    hints: [
      'Pydantic models',
      'Dependency injection',
      'HTTPException for errors',
    ],
    strong_answer_signals: [
      'fastapi',
      'pydantic',
      'response',
      'dependency',
      'validation',
      'httpexception',
    ],
  },
  {
    id: 'js-closures',
    track_id: 'javascript',
    category: 'Language',
    prompt:
      'Explain closures with a practical example (e.g. private counters or event handlers).',
    hints: [
      'Function remembers outer scope',
      'Useful for encapsulation',
      'Watch accidental loop captures',
    ],
    strong_answer_signals: [
      'closure',
      'scope',
      'lexical',
      'function',
      'private',
      'callback',
    ],
  },
  {
    id: 'js-async',
    track_id: 'javascript',
    category: 'Async',
    prompt:
      'Compare callbacks, promises, and async/await. When does Promise.all matter?',
    hints: [
      'Error handling differences',
      'Parallel vs sequential awaits',
      'Promise.allSettled for partial failure',
    ],
    strong_answer_signals: [
      'promise',
      'async',
      'await',
      'callback',
      'promise.all',
      'error',
    ],
  },
  {
    id: 'js-dom',
    track_id: 'javascript',
    category: 'DOM',
    prompt:
      'How would you build a small interactive UI (toggle + list render) with vanilla JS and event delegation?',
    hints: [
      'querySelector / createElement',
      'addEventListener',
      'Delegate from parent for dynamic lists',
    ],
    strong_answer_signals: [
      'dom',
      'event',
      'delegation',
      'queryselector',
      'listener',
      'render',
    ],
  },
  {
    id: 'ts-unions',
    track_id: 'typescript',
    category: 'Types',
    prompt:
      'Explain union types and type narrowing with an example of API success vs error responses.',
    hints: [
      'Discriminated unions',
      'in / typeof / switch',
      'Exhaustiveness checks',
    ],
    strong_answer_signals: [
      'union',
      'narrowing',
      'discriminated',
      'typeof',
      'interface',
      'exhaustive',
    ],
  },
  {
    id: 'ts-generics',
    track_id: 'typescript',
    category: 'Generics',
    prompt:
      'Write (in words or pseudocode) a generic fetchJson<T>() helper and explain the type parameter.',
    hints: [
      'Return Promise<T>',
      'Caller chooses T',
      'Validate at runtime separately if needed',
    ],
    strong_answer_signals: [
      'generic',
      'promise',
      'type parameter',
      'fetch',
      'json',
      'reuse',
    ],
  },
  {
    id: 'ts-react-props',
    track_id: 'typescript',
    category: 'React + TS',
    prompt:
      'How do you type React props and state for a form component with optional fields?',
    hints: [
      'Props interface',
      'useState<Type>',
      'Partial / required utilities',
    ],
    strong_answer_signals: [
      'props',
      'interface',
      'usestate',
      'optional',
      'component',
      'type',
    ],
  },
  {
    id: 'react-state',
    track_id: 'react',
    category: 'State',
    prompt:
      'When do you lift state up vs keep it local? Give a concrete UI example.',
    hints: [
      'Share only what siblings need',
      'Avoid prop drilling with context carefully',
      'Keep ephemeral UI state local',
    ],
    strong_answer_signals: [
      'state',
      'lift',
      'props',
      'parent',
      'context',
      'local',
    ],
  },
  {
    id: 'react-effects',
    track_id: 'react',
    category: 'Hooks',
    prompt:
      'What are common useEffect mistakes, and how do you fetch data safely in React?',
    hints: [
      'Dependency arrays',
      'Cleanup / abort controllers',
      'Prefer frameworks or query libs for caching',
    ],
    strong_answer_signals: [
      'useeffect',
      'dependency',
      'cleanup',
      'abort',
      'fetch',
      'race',
    ],
  },
  {
    id: 'react-keys',
    track_id: 'react',
    category: 'Rendering',
    prompt:
      'Why are keys important in lists, and what goes wrong if you use array index as key during reordering?',
    hints: [
      'Identity across renders',
      'State can attach to wrong item',
      'Stable ids from data',
    ],
    strong_answer_signals: [
      'key',
      'list',
      'identity',
      'index',
      'reorder',
      'state',
    ],
  },
  {
    id: 'node-eventloop',
    track_id: 'nodejs',
    category: 'Runtime',
    prompt:
      'Explain the Node.js event loop in practical terms. What happens if you run CPU-heavy work on the main thread?',
    hints: [
      'Non-blocking I/O',
      'Phases at a high level',
      'Offload CPU to worker threads',
    ],
    strong_answer_signals: [
      'event loop',
      'non-blocking',
      'io',
      'cpu',
      'worker',
      'async',
    ],
  },
  {
    id: 'node-express',
    track_id: 'nodejs',
    category: 'APIs',
    prompt:
      'Design an Express (or similar) REST API with middleware for logging, auth, and centralized error handling.',
    hints: [
      'Router + middleware chain',
      'next(err) pattern',
      'Validate body/query',
    ],
    strong_answer_signals: [
      'express',
      'middleware',
      'router',
      'auth',
      'error',
      'validation',
    ],
  },
  {
    id: 'node-security',
    track_id: 'nodejs',
    category: 'Production',
    prompt:
      'List practical security basics for a Node API in production (secrets, headers, input, deps).',
    hints: [
      'Env secrets, not hardcoding',
      'Helmet / CORS awareness',
      'Dependency audits',
    ],
    strong_answer_signals: [
      'secret',
      'env',
      'helmet',
      'cors',
      'validation',
      'dependency',
    ],
  },
  {
    id: 'html-semantic',
    track_id: 'html',
    category: 'Semantics',
    prompt:
      'Why does semantic HTML matter for accessibility and SEO? Give tag examples for a blog post page.',
    hints: [
      'header/nav/main/article/footer',
      'Screen readers',
      'Meaningful structure',
    ],
    strong_answer_signals: [
      'semantic',
      'accessibility',
      'seo',
      'article',
      'nav',
      'main',
    ],
  },
  {
    id: 'html-forms',
    track_id: 'html',
    category: 'Forms',
    prompt:
      'Build (describe) an accessible signup form with labels, required fields, and useful input types.',
    hints: [
      'label for= / wrapping',
      'type=email password',
      'required + autocomplete',
    ],
    strong_answer_signals: [
      'label',
      'input',
      'required',
      'accessible',
      'type',
      'form',
    ],
  },
  {
    id: 'html-a11y',
    track_id: 'html',
    category: 'Accessibility',
    prompt:
      'What are 5 HTML accessibility checks you would run before shipping a marketing page?',
    hints: [
      'Alt text',
      'Keyboard focus',
      'Color is not the only signal',
      'Landmarks/headings',
    ],
    strong_answer_signals: [
      'alt',
      'keyboard',
      'aria',
      'contrast',
      'heading',
      'focus',
    ],
  },
  {
    id: 'css-box',
    track_id: 'css',
    category: 'Fundamentals',
    prompt:
      'Explain the box model and how box-sizing: border-box changes layout math.',
    hints: [
      'content + padding + border',
      'margin collapse awareness',
      'border-box includes padding/border in width',
    ],
    strong_answer_signals: [
      'box model',
      'padding',
      'border',
      'margin',
      'border-box',
      'width',
    ],
  },
  {
    id: 'css-flexgrid',
    track_id: 'css',
    category: 'Layout',
    prompt:
      'When do you choose Flexbox vs Grid? Describe a header + card gallery layout.',
    hints: [
      'Flex for 1D alignment',
      'Grid for 2D page areas',
      'Can combine both',
    ],
    strong_answer_signals: [
      'flexbox',
      'grid',
      'layout',
      'responsive',
      'header',
      'cards',
    ],
  },
  {
    id: 'css-responsive',
    track_id: 'css',
    category: 'Responsive',
    prompt:
      'How would you make a page responsive using relative units and media queries without breaking desktop layout?',
    hints: [
      'Mobile-first media queries',
      'rem/em/%/clamp',
      'Test common breakpoints',
    ],
    strong_answer_signals: [
      'media query',
      'responsive',
      'rem',
      'breakpoint',
      'mobile-first',
      'clamp',
    ],
  },
]

export function localQuestions(trackId: string): TutorQuestion[] {
  return QUESTIONS.filter((q) => q.track_id === trackId)
}

export function localFeedback(input: {
  track_id: TrackId
  question_id: string
  answer: string
}): Feedback {
  const question = QUESTIONS.find(
    (q) => q.id === input.question_id && q.track_id === input.track_id,
  )
  if (!question) {
    throw new Error('Unknown question')
  }

  const text = input.answer.trim()
  const lower = text.toLowerCase()
  const words = lower.match(/[a-z0-9']+/g) ?? []
  const hits = question.strong_answer_signals.filter((s) => lower.includes(s))

  let score = 2
  if (words.length >= 80) score += 1
  if (hits.length >= 2) score += 1
  if (hits.length >= 4 || /\d|%/.test(text)) score += 1
  score = Math.max(1, Math.min(5, score))

  const strengths: string[] = []
  const gaps: string[] = []

  if (words.length >= 60) {
    strengths.push('Enough detail to sound senior — not a one-liner.')
  } else {
    gaps.push(
      'Expand with context, decision, and outcome (aim for ~90–120 seconds spoken).',
    )
  }
  if (hits.length) {
    strengths.push(`Hit key signals: ${hits.slice(0, 4).join(', ')}.`)
  } else {
    gaps.push(
      `Weave in concepts like: ${question.strong_answer_signals.slice(0, 4).join(', ')}.`,
    )
  }
  if (/\d|%|uptime|million|team/.test(lower)) {
    strengths.push('Includes concrete scale or metrics — interviewers love this.')
  } else {
    gaps.push('Add one concrete example or metric when possible.')
  }

  return {
    score,
    summary: `Rubric score ${score}/5 for ${question.category.toLowerCase()}. Running in free static hosting mode.`,
    strengths: strengths.length
      ? strengths
      : ['You attempted a full answer — good start.'],
    gaps: gaps.length
      ? gaps
      : ['Tighten structure and end on a measurable outcome.'],
    better_answer: [
      'Stronger shape for this prompt:',
      '1) Context: who/what system.',
      '2) Ownership: what you owned.',
      '3) Decision/tradeoff.',
      '4) Outcome with metric.',
      `Hint to include: ${question.hints.join(', ')}.`,
    ].join('\n'),
    next_drill: question.hints[0] ?? 'Practice out loud once, timed.',
    provider: 'browser-rubric',
  }
}
