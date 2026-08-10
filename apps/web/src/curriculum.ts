export type TrackId =
  | 'staff-interview'
  | 'em-interview'
  | 'java-to-ai'
  | 'java-to-python'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nodejs'
  | 'html'
  | 'css'

export type TopicDoc = {
  overview: string
  keyPoints: string[]
  example: { title: string; code: string; note: string }
  commonMistakes: string[]
  beforeYouPractice: string[]
}

export type Topic = {
  id: string
  trackId: TrackId
  title: string
  summary: string
  doc: TopicDoc
}

function t(
  id: string,
  trackId: TrackId,
  title: string,
  summary: string,
  doc: TopicDoc,
): Topic {
  return { id, trackId, title, summary, doc }
}

export const TOPICS: Topic[] = [
  // Java
  t('java-oop', 'java', 'OOP & Core Language', 'Classes, interfaces, equals/hashCode, generics.', {
    overview:
      'Java OOP is about modeling behavior with clear contracts. Prefer interfaces for APIs, keep state encapsulated, and use composition when inheritance creates fragile hierarchies.',
    keyPoints: [
      'Encapsulation protects invariants; expose behavior, not raw fields.',
      'equals/hashCode must stay consistent for collections.',
      'Generics give compile-time safety without runtime casts.',
      'Prefer composition + interfaces over deep inheritance.',
    ],
    example: {
      title: 'Interface + service implementation',
      code: `public interface OrderService {
  Order place(PlaceOrderCommand cmd);
}

@Service
public class OrderServiceImpl implements OrderService {
  public Order place(PlaceOrderCommand cmd) {
    // validate → persist → publish event
    return orderRepository.save(Order.from(cmd));
  }
}`,
      note: 'Callers depend on OrderService, not the impl — easier to test and swap.',
    },
    commonMistakes: [
      'God classes that mix persistence, validation, and HTTP.',
      'Broken equals/hashCode causing HashMap bugs.',
      'Overusing inheritance for code reuse.',
    ],
    beforeYouPractice: [
      'Explain polymorphism with a Spring service example.',
      'Say when you choose an interface vs abstract class.',
    ],
  }),
  t('java-concurrency', 'java', 'Concurrency', 'Threads, executors, CompletableFuture, pools.', {
    overview:
      'Java concurrency is about safe parallel work. Use bounded executors, timeouts, and clear cancellation — never unbounded thread creation in request paths.',
    keyPoints: [
      'ExecutorService manages pooled workers.',
      'CompletableFuture composes async steps.',
      'Always set timeouts for remote calls.',
      'CPU-heavy work needs careful pooling; I/O can fan out more.',
    ],
    example: {
      title: 'Parallel I/O with CompletableFuture',
      code: `var f1 = CompletableFuture.supplyAsync(() -> client.a(), pool);
var f2 = CompletableFuture.supplyAsync(() -> client.b(), pool);
var both = f1.thenCombine(f2, Result::merge)
             .orTimeout(2, TimeUnit.SECONDS)
             .join();`,
      note: 'Use a bounded pool shared by the service, not ForkJoinPool.commonPool() for everything.',
    },
    commonMistakes: [
      'Blocking the Tomcat/Netty event threads with long sync calls.',
      'No timeout → cascading latency.',
      'Shared mutable state without synchronization.',
    ],
    beforeYouPractice: [
      'Describe how you would parallelize independent API calls.',
      'Name failure modes: timeout, partial success, pool exhaustion.',
    ],
  }),
  t('java-spring', 'java', 'Spring Boot APIs', 'Controllers, validation, errors, transactions.', {
    overview:
      'Spring Boot APIs should be thin at the HTTP edge: validate input, call a service, map errors consistently, and keep transactions in the service layer.',
    keyPoints: [
      'Controller = HTTP adapter; Service = business logic.',
      'Use @Valid / Bean Validation on DTOs.',
      'Centralize exception → Problem Details responses.',
      'Transactional boundaries belong in services.',
    ],
    example: {
      title: 'Validated endpoint',
      code: `@PostMapping("/orders")
ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest req) {
  return ResponseEntity.status(201).body(orderService.create(req));
}`,
      note: 'Keep controllers boring — that is a feature.',
    },
    commonMistakes: [
      'Business logic inside controllers.',
      'Swallowing exceptions into 200 OK.',
      'Opening transactions in the controller.',
    ],
    beforeYouPractice: [
      'Walk through request → validation → service → response.',
      'Explain how you return consistent 4xx/5xx bodies.',
    ],
  }),

  // Python
  t('python-basics', 'python', 'Python Fundamentals', 'Data structures, typing, modules.', {
    overview:
      'Modern Python for services means readable code, type hints, and clear module boundaries. Typing helps editors and reviewers catch bugs before runtime.',
    keyPoints: [
      'Prefer list/dict/set comprehensions when clear.',
      'Add type hints on public functions.',
      'Use dataclasses or Pydantic for structured data.',
      'Keep modules cohesive; avoid circular imports.',
    ],
    example: {
      title: 'Typed function + dataclass',
      code: `from dataclasses import dataclass

@dataclass
class User:
    id: str
    email: str

def display_name(user: User) -> str:
    return user.email.split("@")[0]`,
      note: 'Types document contracts for teammates and tooling.',
    },
    commonMistakes: [
      'No types on APIs → silent None bugs.',
      'Giant utils.py dumping ground.',
      'Mutable default arguments (def f(x=[])).',
    ],
    beforeYouPractice: [
      'Why type hints in services?',
      'When dataclasses vs Pydantic models?',
    ],
  }),
  t('python-async', 'python', 'Async IO', 'asyncio, await, event loop pitfalls.', {
    overview:
      'asyncio shines for many concurrent I/O waits. Never call blocking libraries directly inside async functions without offloading.',
    keyPoints: [
      'await suspends until I/O completes.',
      'Blocking calls freeze the event loop.',
      'Use asyncio.gather for concurrent tasks.',
      'CPU-bound work → threads/processes.',
    ],
    example: {
      title: 'Concurrent fetches',
      code: `async def load():
    a, b = await asyncio.gather(fetch("a"), fetch("b"))
    return a, b`,
      note: 'gather fails fast unless you handle exceptions explicitly.',
    },
    commonMistakes: [
      'time.sleep / requests inside async def.',
      'Creating unbounded tasks without backpressure.',
      'Ignoring CancelledError cleanup.',
    ],
    beforeYouPractice: [
      'When asyncio vs threads?',
      'What breaks if you block the loop?',
    ],
  }),
  t('python-fastapi', 'python', 'FastAPI Services', 'Routes, models, validation, errors.', {
    overview:
      'FastAPI maps closely to Spring Boot: routes, Pydantic validation, dependency injection, and OpenAPI docs for free.',
    keyPoints: [
      'Request/response models validate shapes.',
      'Depends() injects shared resources.',
      'HTTPException for expected client errors.',
      'Keep business logic out of route handlers.',
    ],
    example: {
      title: 'Typed route',
      code: `@app.post("/users", response_model=UserOut)
def create(user: UserIn, db=Depends(get_db)) -> UserOut:
    return UserOut.model_validate(db.save(user))`,
      note: 'Pydantic is your DTO + validation layer.',
    },
    commonMistakes: [
      'Returning raw dicts with no schema.',
      'Catch-all except Exception hiding bugs.',
      'Doing DB work without dependency boundaries.',
    ],
    beforeYouPractice: [
      'Sketch a validated POST endpoint.',
      'Map Spring annotations to FastAPI equivalents.',
    ],
  }),

  // JavaScript
  t('js-language', 'javascript', 'Language Essentials', 'Scope, closures, this, prototypes.', {
    overview:
      'JavaScript’s core mental model is scope + closures + the event loop. Master these before frameworks.',
    keyPoints: [
      'let/const are block-scoped; var is function-scoped.',
      'Closures remember outer variables.',
      'this depends on call site (or arrow lexical binding).',
      'Prototypes underpin object inheritance.',
    ],
    example: {
      title: 'Closure counter',
      code: `function makeCounter() {
  let n = 0;
  return () => ++n;
}
const c = makeCounter();
c(); // 1`,
      note: 'n stays private to the returned function.',
    },
    commonMistakes: [
      'Assuming this is always the object you defined on.',
      'Loop + var capturing the final index.',
      'Mutating shared objects unintentionally.',
    ],
    beforeYouPractice: [
      'Explain a closure with a real UI example.',
      'Describe how this works in a method vs arrow.',
    ],
  }),
  t('js-async', 'javascript', 'Async JS', 'Promises, async/await, fetch.', {
    overview:
      'Async JS avoids callback hell with promises. Prefer async/await for readability; use Promise.all for parallel work.',
    keyPoints: [
      'A Promise is pending → fulfilled/rejected.',
      'async functions always return promises.',
      'await pauses only that function, not the whole app.',
      'Promise.all fails fast; allSettled keeps going.',
    ],
    example: {
      title: 'Parallel fetch',
      code: `const [a, b] = await Promise.all([
  fetch('/a').then(r => r.json()),
  fetch('/b').then(r => r.json()),
]);`,
      note: 'Don’t await in a loop when requests are independent.',
    },
    commonMistakes: [
      'Floating promises with no catch.',
      'Sequential awaits that should be parallel.',
      'Ignoring non-2xx fetch responses.',
    ],
    beforeYouPractice: [
      'Compare callbacks vs promises vs async/await.',
      'When Promise.all vs allSettled?',
    ],
  }),
  t('js-dom', 'javascript', 'DOM & Events', 'Selectors, rendering, delegation.', {
    overview:
      'Vanilla DOM skills still matter. Event delegation keeps listeners efficient for dynamic lists.',
    keyPoints: [
      'querySelector finds nodes; createElement builds them.',
      'addEventListener > inline handlers.',
      'Delegate clicks from a parent for dynamic children.',
      'Keep render functions idempotent when possible.',
    ],
    example: {
      title: 'Event delegation',
      code: `list.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  removeItem(btn.dataset.id);
});`,
      note: 'One listener handles many future buttons.',
    },
    commonMistakes: [
      'Attaching listeners inside loops without cleanup.',
      'innerHTML with unsanitized user input (XSS).',
      'Re-querying the whole DOM constantly.',
    ],
    beforeYouPractice: [
      'Describe building a toggle + list with delegation.',
      'Name one XSS risk in DOM updates.',
    ],
  }),

  // TypeScript
  t('ts-basics', 'typescript', 'Types & Narrowing', 'Unions, interfaces, control flow.', {
    overview:
      'TypeScript catches impossible states at compile time. Discriminated unions + narrowing make API results safe to handle.',
    keyPoints: [
      'Prefer unknown over any at boundaries.',
      'Union types model alternatives.',
      'Narrow with typeof / in / switch.',
      'Interfaces describe object shapes.',
    ],
    example: {
      title: 'Discriminated union',
      code: `type Result =
  | { ok: true; data: User }
  | { ok: false; error: string };

function render(r: Result) {
  if (r.ok) return r.data.email;
  return r.error;
}`,
      note: 'After if (r.ok), TS knows data exists.',
    },
    commonMistakes: [
      'Using any everywhere “to move fast”.',
      'Non-null assertions (!) hiding bugs.',
      'Optional fields that should be explicit states.',
    ],
    beforeYouPractice: [
      'Model success/error API responses with unions.',
      'Explain narrowing with an example.',
    ],
  }),
  t('ts-generics', 'typescript', 'Generics', 'Reusable typed helpers.', {
    overview:
      'Generics parameterize types like functions parameterize values. Use them for reusable containers and API helpers.',
    keyPoints: [
      'T is a placeholder chosen by the caller.',
      'Constraints (extends) limit allowed types.',
      'Don’t over-generic simple one-off code.',
      'Pair generics with runtime validation at boundaries.',
    ],
    example: {
      title: 'Generic fetch helper',
      code: `async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<T>;
}`,
      note: 'Caller: fetchJson<User[]>("/users").',
    },
    commonMistakes: [
      'Generics with no benefit (noise).',
      'Casting instead of modeling types.',
      'Assuming JSON matches T without validation.',
    ],
    beforeYouPractice: [
      'Describe fetchJson<T> and who chooses T.',
      'When would you avoid generics?',
    ],
  }),
  t('ts-react', 'typescript', 'Typing React', 'Props, state, events.', {
    overview:
      'Type props and state so components fail loudly at compile time. Keep prop interfaces near the component.',
    keyPoints: [
      'type Props = { ... } or interface.',
      'useState<Type>(initial).',
      'Event types: React.ChangeEvent<HTMLInputElement>.',
      'Children?: React.ReactNode.',
    ],
    example: {
      title: 'Typed form props',
      code: `type Props = {
  initialEmail?: string;
  onSave: (email: string) => void;
};

export function EmailForm({ initialEmail = '', onSave }: Props) {
  const [email, setEmail] = useState(initialEmail);
  return (
    <input value={email} onChange={(e) => setEmail(e.target.value)} />
  );
}`,
      note: 'Optional props need defaults or undefined handling.',
    },
    commonMistakes: [
      'props: any.',
      'Ignoring controlled vs uncontrolled inputs.',
      'Huge shared Prop types unrelated to the component.',
    ],
    beforeYouPractice: [
      'Type a form with optional fields.',
      'Explain useState typing briefly.',
    ],
  }),

  // React
  t('react-components', 'react', 'Components & State', 'Props, state, lifting state.', {
    overview:
      'React UI is components + state. Keep state as close as possible to where it’s used; lift only when siblings must share.',
    keyPoints: [
      'Props flow down; events flow up.',
      'Local state for ephemeral UI.',
      'Lift state when two children need the same data.',
      'Don’t sync derived data into state if you can compute it.',
    ],
    example: {
      title: 'Lifted selection state',
      code: `function Parent() {
  const [id, setId] = useState<string | null>(null);
  return (
    <>
      <List selected={id} onSelect={setId} />
      <Detail id={id} />
    </>
  );
}`,
      note: 'Parent owns shared selection; children stay focused.',
    },
    commonMistakes: [
      'Prop drilling 6 levels instead of composition/context.',
      'Duplicating the same state in multiple places.',
      'Storing derived values that go stale.',
    ],
    beforeYouPractice: [
      'When lift vs local state?',
      'Give a concrete UI example.',
    ],
  }),
  t('react-effects', 'react', 'Effects & Data Fetching', 'useEffect rules and cleanup.', {
    overview:
      'Effects synchronize React with external systems. Most bugs come from wrong dependencies or missing cleanup.',
    keyPoints: [
      'Dependency array declares reactive inputs.',
      'Cleanup aborts fetches / removes listeners.',
      'Don’t fetch in effects if a data library fits better.',
      'Avoid setting state after unmount.',
    ],
    example: {
      title: 'Abortable fetch',
      code: `useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });
  return () => ac.abort();
}, [url]);`,
      note: 'Abort prevents race conditions when url changes quickly.',
    },
    commonMistakes: [
      'Empty deps when you read changing values.',
      'Infinite loops from setting state every render.',
      'No abort → wrong response wins the race.',
    ],
    beforeYouPractice: [
      'List common useEffect mistakes.',
      'How do you fetch safely?',
    ],
  }),
  t('react-lists', 'react', 'Lists, Keys, Rendering', 'Reconciliation and identity.', {
    overview:
      'Keys tell React which item is which across renders. Index keys break when lists reorder or insert.',
    keyPoints: [
      'Keys should be stable identities from data.',
      'Reordering with index keys mis-attaches state.',
      'Avoid recreating huge trees unnecessarily.',
      'React re-renders when state/props change.',
    ],
    example: {
      title: 'Stable keys',
      code: `{users.map(u => (
  <UserRow key={u.id} user={u} />
))}`,
      note: 'u.id survives sort/filter; index may not.',
    },
    commonMistakes: [
      'key={index} on editable lists.',
      'Using Math.random() as key.',
      'Mutating arrays in state instead of copying.',
    ],
    beforeYouPractice: [
      'Why keys matter?',
      'What breaks with index keys on reorder?',
    ],
  }),

  // Node.js
  t('node-runtime', 'nodejs', 'Node Runtime', 'Event loop, modules, npm.', {
    overview:
      'Node is great at concurrent I/O. CPU-heavy work on the main thread stalls everyone — offload it.',
    keyPoints: [
      'Event loop schedules callbacks/promises.',
      'Non-blocking I/O keeps throughput high.',
      'Use worker threads for CPU tasks.',
      'ESM vs CommonJS module systems.',
    ],
    example: {
      title: 'Don’t block',
      code: `// bad in a request handler:
crypto.pbkdf2Sync(password, salt, 1e6, 64, 'sha512');

// better: async pbkdf2 or worker thread`,
      note: 'Sync CPU work freezes the loop.',
    },
    commonMistakes: [
      'Sync fs in hot paths.',
      'Unbounded concurrency against DBs.',
      'Ignoring unhandledRejection.',
    ],
    beforeYouPractice: [
      'Explain event loop practically.',
      'What if CPU work runs on main thread?',
    ],
  }),
  t('node-apis', 'nodejs', 'HTTP APIs', 'Express-style routes & middleware.', {
    overview:
      'Node APIs are middleware pipelines: logging → auth → validate → handler → error middleware.',
    keyPoints: [
      'Routers group endpoints.',
      'Middleware shares cross-cutting concerns.',
      'Central error handler keeps responses consistent.',
      'Validate inputs at the edge.',
    ],
    example: {
      title: 'Middleware chain',
      code: `app.use(logger);
app.use('/api', auth, apiRouter);
app.use(errorHandler);`,
      note: 'Order matters — auth before protected routes.',
    },
    commonMistakes: [
      'Forgetting next(err) in async middleware.',
      'No validation → injection/garbage data.',
      'Leaking stack traces to clients.',
    ],
    beforeYouPractice: [
      'Design logging + auth + error middleware.',
      'Where does validation live?',
    ],
  }),
  t('node-prod', 'nodejs', 'Production Basics', 'Config, security, observability.', {
    overview:
      'Production Node means secrets in env, safe headers, dependency hygiene, and structured logs.',
    keyPoints: [
      'Never commit secrets.',
      'Helmet/CORS thoughtfully.',
      'Audit dependencies.',
      'Structured logs + request ids.',
    ],
    example: {
      title: 'Env config',
      code: `const port = Number(process.env.PORT ?? 3000);
const dbUrl = required('DATABASE_URL');`,
      note: 'Fail fast if required config is missing.',
    },
    commonMistakes: [
      'Hardcoded API keys.',
      'overly permissive CORS * with credentials.',
      'No health checks.',
    ],
    beforeYouPractice: [
      'List practical API security basics.',
      'What belongs in env vs code?',
    ],
  }),

  // HTML
  t('html-semantic', 'html', 'Semantic HTML', 'Structure, landmarks, SEO.', {
    overview:
      'Semantic tags describe meaning. They help accessibility, SEO, and maintainability more than div soup.',
    keyPoints: [
      'Use header/nav/main/article/footer.',
      'One h1 per page generally.',
      'Landmarks help screen readers.',
      'Meaningful HTML reduces ARIA needs.',
    ],
    example: {
      title: 'Blog skeleton',
      code: `<header><nav>...</nav></header>
<main>
  <article>
    <h1>Title</h1>
    <p>...</p>
  </article>
</main>
<footer>...</footer>`,
      note: 'Structure first, style later.',
    },
    commonMistakes: [
      'Everything is a div.',
      'Clickable divs without button/link semantics.',
      'Skipping headings levels randomly.',
    ],
    beforeYouPractice: [
      'Why semantic HTML for a11y/SEO?',
      'Name tags for a blog page.',
    ],
  }),
  t('html-forms', 'html', 'Forms & Inputs', 'Labels, types, validation attrs.', {
    overview:
      'Accessible forms need labels wired to inputs, correct types, and clear required/error states.',
    keyPoints: [
      'Every input needs a label.',
      'type=email/password/url helps mobile keyboards.',
      'required/minlength are first-line validation.',
      'autocomplete improves UX and security.',
    ],
    example: {
      title: 'Labeled email field',
      code: `<label for="email">Email</label>
<input id="email" name="email" type="email" required autocomplete="email" />`,
      note: 'for/id association is essential for screen readers.',
    },
    commonMistakes: [
      'Placeholder as the only label.',
      'Divs pretending to be inputs.',
      'No name attributes so forms don’t submit.',
    ],
    beforeYouPractice: [
      'Describe an accessible signup form.',
      'Which attributes help mobile + a11y?',
    ],
  }),
  t('html-a11y', 'html', 'Accessibility', 'Alt text, keyboard, contrast basics.', {
    overview:
      'Accessibility is part of quality. Start with semantic HTML, keyboard access, alt text, and visible focus.',
    keyPoints: [
      'Images need meaningful alt (or alt="" if decorative).',
      'All interactive elements keyboard reachable.',
      'Don’t rely on color alone.',
      'Keep focus styles visible.',
    ],
    example: {
      title: 'Icon button',
      code: `<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>`,
      note: 'Name the action when there is no visible text.',
    },
    commonMistakes: [
      'Removing outline without replacement.',
      'Empty buttons.',
      'Low-contrast gray on gray.',
    ],
    beforeYouPractice: [
      'List 5 pre-ship a11y checks.',
      'How do you label icon-only buttons?',
    ],
  }),

  // CSS
  t('css-box', 'css', 'Box Model & Cascade', 'Specificity, margin, border-box.', {
    overview:
      'Layout math starts with the box model. border-box makes widths predictable by including padding/border.',
    keyPoints: [
      'Width = content (+ padding/border depending on box-sizing).',
      'Specificity decides which rule wins.',
      'Margin collapse can surprise vertical spacing.',
      'Use CSS variables for design tokens.',
    ],
    example: {
      title: 'Predictable sizing',
      code: `*, *::before, *::after { box-sizing: border-box; }
.card { width: 320px; padding: 16px; border: 1px solid #ccc; }`,
      note: 'With border-box, 320px is the final outer width.',
    },
    commonMistakes: [
      '!important everywhere.',
      'Fighting specificity instead of simplifying selectors.',
      'Mixing content-box assumptions.',
    ],
    beforeYouPractice: [
      'Explain box model + border-box.',
      'How does specificity work at a high level?',
    ],
  }),
  t('css-layout', 'css', 'Flexbox & Grid', '1D vs 2D layout.', {
    overview:
      'Flexbox aligns in one direction; Grid designs two-dimensional page areas. Combining them is normal.',
    keyPoints: [
      'Flex: nav bars, spacing items in a row/column.',
      'Grid: page regions and card galleries.',
      'gap replaces most margin hacks.',
      'minmax() helps responsive tracks.',
    ],
    example: {
      title: 'Responsive card grid',
      code: `.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}`,
      note: 'Cards wrap automatically as space shrinks.',
    },
    commonMistakes: [
      'Absolute positioning for everything.',
      'Using floats for modern layout.',
      'Fixed pixel grids that break on mobile.',
    ],
    beforeYouPractice: [
      'Flex vs Grid with a header + gallery example.',
      'When combine both?',
    ],
  }),
  t('css-responsive', 'css', 'Responsive Design', 'Units, media queries, mobile-first.', {
    overview:
      'Responsive CSS adapts layout to viewport. Prefer mobile-first media queries and fluid units.',
    keyPoints: [
      'Start simple on small screens, enhance upward.',
      'rem/em/%/clamp for fluid type/spacing.',
      'Test real breakpoints used by your design.',
      'Avoid horizontal scroll surprises.',
    ],
    example: {
      title: 'Mobile-first query',
      code: `.nav { flex-direction: column; }
@media (min-width: 768px) {
  .nav { flex-direction: row; }
}`,
      note: 'Base styles = mobile; min-width adds desktop.',
    },
    commonMistakes: [
      'Desktop-first only, then patching mobile.',
      'Fixed px font sizes everywhere.',
      'Hiding critical content on small screens.',
    ],
    beforeYouPractice: [
      'How do you make a page responsive safely?',
      'Why mobile-first?',
    ],
  }),

  // Interview / AI tracks — topic docs
  t('staff-stories', 'staff-interview', 'Ownership Stories', 'Staff-level behavioral narrative.', {
    overview:
      'Staff interviews reward ownership stories with tradeoffs and metrics. Structure: Context → Ownership → Decision → Outcome.',
    keyPoints: [
      'Lead with scope and users impacted.',
      'Name a hard tradeoff explicitly.',
      'End with a measurable result.',
      'Keep it to ~90–120 seconds spoken.',
    ],
    example: {
      title: 'Story spine',
      code: `Context: loyalty platform for millions of members
Owned: event pipeline design + peak readiness
Tradeoff: consistency vs latency on redemption path
Outcome: millions txn/day, Gatling-validated peaks`,
      note: 'Memorize 3 spines, not essays.',
    },
    commonMistakes: [
      'Team “we” with no personal ownership.',
      'No metric.',
      'Too much low-level code detail too early.',
    ],
    beforeYouPractice: [
      'Prepare one end-to-end ownership story.',
      'Add one tradeoff + one metric.',
    ],
  }),
  t('staff-design', 'staff-interview', 'System Design', 'Distributed design for interviews.', {
    overview:
      'Interview system design is about requirements, APIs, data flow, failure modes, and evolution — not drawing every box.',
    keyPoints: [
      'Clarify functional + non-functional needs.',
      'Propose a simple path first, then scale.',
      'Call out idempotency, retries, observability.',
      'Discuss multi-tenant / security early for enterprise.',
    ],
    example: {
      title: 'Sync engine sketch',
      code: `Sources → Ingest → Transform → Deliver → Observe
         (queue)   (workers)  (destinations)`,
      note: 'Then add DLQ, retries, backpressure.',
    },
    commonMistakes: [
      'Jumping to Kafka/K8s before requirements.',
      'Ignoring failure modes.',
      'No capacity estimate at all.',
    ],
    beforeYouPractice: [
      'Design batch sync with a streaming future.',
      'List top 5 failure modes.',
    ],
  }),
  t('staff-ai-safe', 'staff-interview', 'Safe Enterprise AI', 'Entitlements, guardrails, evals.', {
    overview:
      'Production AI features need the same bar as backends: authz, audit, rate limits, and fail-closed behavior.',
    keyPoints: [
      'Inject entitlements before model calls.',
      'Validate model output (SQL/tools) before execute.',
      'Audit every request for support/compliance.',
      'Golden eval sets catch regressions.',
    ],
    example: {
      title: 'NLQ safety path',
      code: `question → entitle filters → LLM SQL
       → guardrail validate → run query → audit`,
      note: 'If guardrail fails, refuse — don’t “best effort”.',
    },
    commonMistakes: [
      'Trusting model SQL blindly.',
      'No tenant isolation story.',
      'Demo quality without evals.',
    ],
    beforeYouPractice: [
      'Explain fail-closed NLQ.',
      'What do you log for audit?',
    ],
  }),
  t('staff-influence', 'staff-interview', 'Cross-team Influence', 'Lead without authority.', {
    overview:
      'Staff scope often means aligning multiple teams. Interviewers want to hear how you used evidence, prototypes, and clear decision framing — not politics — to ship the right thing.',
    keyPoints: [
      'Name the decision and the conflict explicitly.',
      'Bring options with tradeoffs and a recommendation.',
      'Use a spike/prototype or incident data when opinions stall.',
      'Close the loop: what shipped and what you learned.',
    ],
    example: {
      title: 'Influence spine',
      code: `Conflict: Team A wants sync batch; Team B wants event stream
Evidence: peak load + customer SLA miss risk
Move: 2-week spike + shared RFC with rollback plan
Outcome: phased batch→stream; p95 within SLO`,
      note: 'Decision + evidence + outcome — keep under 2 minutes.',
    },
    commonMistakes: [
      'Vague “I convinced them” with no mechanism.',
      'Taking credit for a VP decision you didn’t shape.',
      'No shipping result.',
    ],
    beforeYouPractice: [
      'Pick one real cross-team decision you influenced.',
      'Write the conflict in one sentence.',
    ],
  }),
  t('staff-incidents', 'staff-interview', 'Incidents & Production', 'Lead under fire.', {
    overview:
      'Staff candidates must sound calm and structured in incidents: mitigate first, communicate clearly, find root cause, and leave a lasting prevention.',
    keyPoints: [
      'Customer impact timeline before deep forensics.',
      'Mitigate (rollback/feature flag) before perfect RCA.',
      'Communicate status to eng + stakeholders.',
      'End with a concrete prevention (alert, test, runbook, design change).',
    ],
    example: {
      title: 'Incident spine',
      code: `Detect → Mitigate → Communicate → RCA → Follow-ups
Flag off bad path in 12m; customer error rate ↓
Postmortem: missing saturation alert + retry storm
Fix: circuit breaker + runbook + alert`,
      note: 'Show ownership of the system, not hero debugging lore.',
    },
    commonMistakes: [
      'Jumping to root cause while customers are still broken.',
      'No communication story.',
      'No lasting fix — only “we restarted it”.',
    ],
    beforeYouPractice: [
      'Prepare one SEV-level story with times and impact.',
      'Name the prevention that still exists today.',
    ],
  }),
  t('staff-ambiguity', 'staff-interview', 'Ambiguous Problems', 'Turn fog into a plan.', {
    overview:
      'Staff interviews often open with vague asks. Strong candidates clarify users and metrics, propose a thin slice, and explicitly refuse unbounded scope.',
    keyPoints: [
      'Clarify who, success metric, and constraints first.',
      'Ship a vertical slice with kill criteria.',
      'Name risks early: data, authz, cost, evals.',
      'Say what you will not build in v0.',
    ],
    example: {
      title: 'Ambiguity spine',
      code: `Ask: "make search smarter with AI"
Week 1: top queries, fail modes, entitle model
Slice: rewrite + rank for 20 intents, eval set n=100
Refuse: open-ended chat until retrieval quality ≥ bar`,
      note: 'Clarity beats clever architecture.',
    },
    commonMistakes: [
      'Jumping to LangChain/architecture diagrams.',
      'No success metric.',
      'Boiling the ocean in week one.',
    ],
    beforeYouPractice: [
      'Pick a vague ask from your job and write the first two weeks.',
      'List three things you refuse in v0.',
    ],
  }),
  t('staff-strategy', 'staff-interview', 'Technical Strategy', 'Multi-quarter direction.', {
    overview:
      'Staff strategy is influence over time: diagnose cost/complexity, paint a north star, sequence migrations, and build a coalition without needing a VP title.',
    keyPoints: [
      'Start with quantified pain (cost, incidents, velocity).',
      'North-star architecture with staged migration.',
      'Early wins that fund trust.',
      'Explicit owners and decision forums.',
    ],
    example: {
      title: 'Platform consolidation',
      code: `Pain: 3 overlapping pipelines, $X/mo waste
North star: one event bus + shared schemas
Stage 1: stop net-new on legacy
Stage 2: migrate top 2 producers
Coalition: EM partners + FinOps metric dashboard`,
      note: 'Strategy without sequencing is a slide deck.',
    },
    commonMistakes: [
      'Big-bang rewrite proposals.',
      'No coalition / only IC heroics.',
      'No measurable milestones.',
    ],
    beforeYouPractice: [
      'Draft a 4-quarter strategy in 8 bullets.',
      'Name your first win in 30 days.',
    ],
  }),
  t('em-people', 'em-interview', 'People Leadership', 'Hiring, coaching, performance.', {
    overview:
      'EM interviews lead with people outcomes: hiring bar, growth, performance, and healthy delivery systems.',
    keyPoints: [
      'Own hiring loops and leveling signals.',
      '1:1s are for growth + delivery reality.',
      'Performance issues early and documented.',
      'Raise the engineering bar without heroics.',
    ],
    example: {
      title: 'EM opener spine',
      code: `I manage 2 teams (~15). Own hiring, coaching, delivery.
Built Halogen team from scratch; vendor→in-house at 99.9% uptime.
Looking for EM ownership of platform/AI products.`,
      note: 'People first, tech as proof.',
    },
    commonMistakes: [
      'Opening as a Staff IC who “also manages”.',
      'No concrete team-size/scope.',
      'Only tech stories, no people stories.',
    ],
    beforeYouPractice: [
      'Write a 30–40s EM intro.',
      'Prepare one hiring + one performance story.',
    ],
  }),
  t('em-transform', 'em-interview', 'Team & Vendor Transitions', 'Build teams, migrate ownership.', {
    overview:
      'Transformation stories show EM leverage: continuity plans, hiring, knowledge transfer, and uptime through change.',
    keyPoints: [
      'Protect customers during migration.',
      'Hire ahead of critical path risk.',
      'Make knowledge transfer explicit.',
      'Measure success with uptime/delivery metrics.',
    ],
    example: {
      title: 'Vendor → in-house',
      code: `1) Freeze risky changes
2) Hire core owners
3) Shadow + dual-run
4) Cutover with rollback
5) Keep 99.9% uptime narrative honest`,
      note: 'Process + people beat heroic coding.',
    },
    commonMistakes: [
      'No continuity plan.',
      'Big-bang cutover with no dual-run.',
      'Success claimed without metrics.',
    ],
    beforeYouPractice: [
      'Tell the vendor transition story in 2 minutes.',
      'What did you personally own?',
    ],
  }),
  t('em-hiring', 'em-interview', 'Hiring Bar', 'Loops, signals, tough calls.', {
    overview:
      'Great EMs protect the hiring bar under delivery pressure. Interviewers listen for structured loops, calibrated signals, and the courage to reject when the bar isn’t met.',
    keyPoints: [
      'Define level expectations before the loop.',
      'Use structured rubrics and written debriefs.',
      'Separate “urgent headcount” from “right hire”.',
      'Close the loop with candidates and hiring managers.',
    ],
    example: {
      title: 'Bar story',
      code: `Pressure: “ship Q3 — hire anyone senior”
Move: published Staff rubric + paired debriefs
Call: no-hire on weak system design signal
Outcome: delayed 3 weeks, hired stronger — fewer incidents later`,
      note: 'Show the cost of a bad hire vs waiting.',
    },
    commonMistakes: [
      'No clear bar — vibes-based hiring.',
      'Overriding the panel without data.',
      'Ignoring candidate experience.',
    ],
    beforeYouPractice: [
      'Explain your hiring loop in 60 seconds.',
      'Prepare one no-hire decision you defended.',
    ],
  }),
  t('em-delivery', 'em-interview', 'Delivery & Prioritization', 'Roadmaps under constraints.', {
    overview:
      'EM delivery interviews test whether you can make capacity real: roadmap options, reliability budgets, and stakeholder alignment without burning the team.',
    keyPoints: [
      'Make capacity and WIP visible.',
      'Offer options with risk — don’t just say no.',
      'Protect reliability / quality allocation.',
      'Reset commitments early when reality changes.',
    ],
    example: {
      title: 'Roadmap options',
      code: `A) Ship Feature X, slip reliability work (risk: SEV)
B) Cut X scope 40%, keep reliability budget
C) Add contractor capacity for X (cost + ramp)
Recommend B + written risk to VP Product`,
      note: 'Managers bring choices, not blockers.',
    },
    commonMistakes: [
      'Silent overcommitment.',
      'No reliability budget.',
      'Escalating without a recommendation.',
    ],
    beforeYouPractice: [
      'Prepare one roadmap conflict story with 2–3 options.',
      'Name the reliability work you protected.',
    ],
  }),
  t('em-exec', 'em-interview', 'Exec Communication', 'Status, options, asks.', {
    overview:
      'EMs who get promoted speak in impact and decisions. Practice short updates: what changed for customers, options, recommendation, and the ask.',
    keyPoints: [
      'Lead with impact, not task inventory.',
      'Always offer options with risk.',
      'Make a clear recommendation and ask.',
      'No surprise — surface risk early.',
    ],
    example: {
      title: '3-minute VP update',
      code: `Impact: checkout errors ↑ affecting 4% sessions
Why: capacity miss + flaky dependency
Options: (A) cut scope (B) add on-call surge (C) slip 1 week
Recommend B + ask for contractor budget approval today`,
      note: 'Decision-ready, not status theater.',
    },
    commonMistakes: [
      'Jira walkthroughs.',
      'Problems without options.',
      'Hiding bad news.',
    ],
    beforeYouPractice: [
      'Rewrite one late project as a 3-minute exec brief.',
      'Practice the ask out loud.',
    ],
  }),
  t('em-org', 'em-interview', 'Org Design', 'Teams, ownership, span.', {
    overview:
      'When teams grow, delivery slows from unclear ownership and meeting load. EM interviews probe how you redesign missions and spans without chaos.',
    keyPoints: [
      'Diagnose: ownership, skill mix, or process?',
      'Mission-based teams beat arbitrary headcount splits.',
      'Manager span and IC career paths both matter.',
      'Transitions need explicit people + system plans.',
    ],
    example: {
      title: 'Split a 18-person team',
      code: `Missions: Platform Reliability | Product Surfaces
Managers: 2 (span ~8)
Shared: on-call + architecture review
Transition: 4 weeks dual ownership, then cutover`,
      note: 'Org chart follows work, not the reverse.',
    },
    commonMistakes: [
      'Reorg for politics, not missions.',
      'No transition plan.',
      'Ignoring IC Staff career paths.',
    ],
    beforeYouPractice: [
      'Draw current vs proposed missions for a team you know.',
      'List risks of the reorg.',
    ],
  }),
  t('ai-path', 'java-to-ai', 'Backend → AI Path', 'Map Spring skills to AI systems.', {
    overview:
      'Your Java/Spring strengths transfer: APIs, validation, queues, observability. Learn Python + RAG/agent patterns on top.',
    keyPoints: [
      'Models are flaky dependencies — budget them.',
      'RAG before fine-tuning for private knowledge.',
      'Eval and guardrails are product requirements.',
      'Ship thin vertical slices.',
    ],
    example: {
      title: 'Concept map',
      code: `Spring Controller → FastAPI route
DTO validation     → Pydantic
Queues             → embed/eval jobs
Micrometer         → token/latency metrics`,
      note: 'Say this map in interviews — it’s persuasive.',
    },
    commonMistakes: [
      'Thinking you must become a researcher first.',
      'Skipping evals.',
      'Prompt-only demos without systems thinking.',
    ],
    beforeYouPractice: [
      'Map Spring concepts to an AI service.',
      'When RAG vs fine-tune?',
    ],
  }),
  t('ai-rag', 'java-to-ai', 'RAG Systems', 'Chunk, embed, retrieve, cite, evaluate.', {
    overview:
      'RAG grounds answers in your documents. Quality comes from chunking, retrieval ranking, citation, and eval — not from a fancy prompt alone.',
    keyPoints: [
      'Chunk for retrieval units, not arbitrary page size.',
      'Retrieve top-k, then generate with citations.',
      'Measure recall/precision on a golden question set.',
      'Refuse when retrieval confidence is weak.',
    ],
    example: {
      title: 'Pipeline sketch',
      code: `ingest → chunk → embed → vector index
query  → embed → retrieve top-k → prompt + cites → answer
nightly: eval set → score faithfulness / citation coverage`,
      note: 'Treat retrieval quality as a first-class product metric.',
    },
    commonMistakes: [
      'Huge chunks that bury the answer.',
      'No citations → unverifiable answers.',
      'No eval set → silent regressions.',
    ],
    beforeYouPractice: [
      'Walk through RAG end-to-end in 90 seconds.',
      'Name two failure modes and how you detect them.',
    ],
  }),
  t('ai-agents', 'java-to-ai', 'Agents & Tools', 'Tool calling, loops, guardrails.', {
    overview:
      'Agents let the model call tools (search, SQL, APIs). Keep loops bounded, validate tool args, and log every step for audit.',
    keyPoints: [
      'Tools are typed functions with schema validation.',
      'Cap steps and tokens; fail closed on loops.',
      'Prefer deterministic workflows when the path is known.',
      'Human-in-the-loop for irreversible actions.',
    ],
    example: {
      title: 'Bounded tool loop',
      code: `for step in range(MAX_STEPS):
  decision = llm.plan(state, tools)
  if decision.done: break
  result = run_tool(decision.tool, validate(decision.args))
  state.append(result)`,
      note: 'Always validate tool arguments server-side.',
    },
    commonMistakes: [
      'Unbounded agent loops in production.',
      'Letting the model invent SQL/API params unchecked.',
      'No audit trail of tool calls.',
    ],
    beforeYouPractice: [
      'When is an agent better than a fixed pipeline?',
      'How do you stop runaway tool use?',
    ],
  }),
  t('ai-evals', 'java-to-ai', 'Evals & Gates', 'Prove quality before deploy.', {
    overview:
      'Production AI needs an evaluation harness: golden sets, regression gates, and fail-closed safety checks — the same seriousness you’d give a payment API.',
    keyPoints: [
      'Golden questions with expected citations/answers.',
      'Offline regression before every prompt/model change.',
      'Online shadow traffic when risk is high.',
      'Hard gates for entitlement/safety failures.',
    ],
    example: {
      title: 'Deploy gate',
      code: `suite: 120 golden + 30 adversarial
metrics: faithfulness, citation hit, latency p95
block deploy if safety fail > 0 OR faithfulness ↓ > 3%`,
      note: 'Evals are a product feature, not a research side quest.',
    },
    commonMistakes: [
      'Shipping on vibe checks.',
      'Only happy-path examples.',
      'No owner for the eval suite.',
    ],
    beforeYouPractice: [
      'Describe your pre-prod eval gate in 60 seconds.',
      'What would auto-block a release?',
    ],
  }),
  t('ai-ops', 'java-to-ai', 'LLM Ops & Cost', 'Latency, tokens, quality.', {
    overview:
      'LLM features fail in production on cost and latency. Staff-level AI engineers measure tokens, cache, retrieval size, and protect quality while cutting spend.',
    keyPoints: [
      'Instrument token use, cache hit rate, retrieval k.',
      'Route cheap vs strong models deliberately.',
      'Cache embeddings and frequent prompts safely.',
      'Never cut cost without a quality check.',
    ],
    example: {
      title: 'Cost attack plan',
      code: `1) Trace top expensive routes
2) Shrink context / top-k
3) Cache retrieval for hot queries
4) Route FAQ → small model; hard cases → large
5) Re-run eval suite`,
      note: 'Ops without quality gates creates silent regressions.',
    },
    commonMistakes: [
      'No token dashboards.',
      'One model for every request.',
      'Cutting context blindly.',
    ],
    beforeYouPractice: [
      'Explain how you’d cut LLM cost 40% safely.',
      'Which metrics do you watch weekly?',
    ],
  }),

  // Java → Python
  t(
    'j2p-mindset',
    'java-to-python',
    'Mindset shift',
    'What carries over from Java — and what to unlearn.',
    {
      overview:
        'You already know APIs, OOP, concurrency, and production discipline. Python trades ceremony for clarity: prefer readable modules, explicit dependencies, and “batteries included” libraries over heavy frameworks — until scale demands structure.',
      keyPoints: [
        'Keep your systems instincts; drop “everything needs a class” habits.',
        'Python is multi-paradigm: functions + classes + modules.',
        'Dynamic runtime + optional static typing (mypy/pyright) is the modern combo.',
        'Packaging and envs (venv/poetry) replace “one big WAR” mental model.',
      ],
      example: {
        title: 'Same job, less boilerplate',
        code: `// Java
public int sum(List<Integer> xs) {
  int t = 0;
  for (Integer x : xs) t += x;
  return t;
}

# Python
def sum_nums(xs: list[int]) -> int:
    return sum(xs)`,
        note: 'Idiomatic Python is short — but still typed in serious services.',
      },
      commonMistakes: [
        'Writing Java-in-Python (getters/setters everywhere, huge class trees).',
        'Ignoring virtualenvs and polluting the system interpreter.',
        'Treating “dynamic” as “no types in production code”.',
      ],
      beforeYouPractice: [
        'Name three Java strengths that still apply in Python.',
        'Name one habit you will unlearn.',
      ],
    },
  ),
  t(
    'j2p-syntax',
    'java-to-python',
    'Syntax & collections',
    'Lists, dicts, sets, comprehensions, exceptions.',
    {
      overview:
        'Map Java collections to Python builtins. Prefer list/dict/set, use comprehensions for transforms, and raise/catch exceptions with clear types.',
      keyPoints: [
        'List ≈ ArrayList, dict ≈ HashMap, set ≈ HashSet.',
        'Tuples are immutable records; dataclasses for richer objects.',
        'Comprehensions replace many trivial loops.',
        'EAFP: try/except is common; still validate at API boundaries.',
      ],
      example: {
        title: 'Collection map',
        code: `names = ["Ada", "Grace", "Linus"]
lengths = {n: len(n) for n in names}      # dict comprehension
adults = [u for u in users if u.age >= 18] # list comprehension

# exceptions
try:
    value = cache[key]
except KeyError:
    value = load(key)`,
        note: 'Say the Java equivalent out loud — it sticks faster.',
      },
      commonMistakes: [
        'Mutating a list while iterating.',
        'Using mutable default args: def f(xs=[]).',
        'Catching bare Exception everywhere.',
      ],
      beforeYouPractice: [
        'Translate an ArrayList + HashMap snippet to Python.',
        'When do you use a tuple vs a dataclass?',
      ],
    },
  ),
  t(
    'j2p-oop',
    'java-to-python',
    'OOP in Python',
    'Classes, dataclasses, protocols, composition.',
    {
      overview:
        'Python classes are simpler: no access modifiers by convention (_private), dataclasses cut boilerplate, and Protocol (typing) replaces many interface hierarchies.',
      keyPoints: [
        'dataclass ≈ record/Lombok data class.',
        'Protocol = structural typing (duck typing with checks).',
        'Prefer composition and small modules over deep inheritance.',
        '@property replaces many getters.',
      ],
      example: {
        title: 'Dataclass + protocol',
        code: `from dataclasses import dataclass
from typing import Protocol

class Payable(Protocol):
    def total(self) -> int: ...

@dataclass
class Order:
    items: list[int]
    def total(self) -> int:
        return sum(self.items)

def invoice(p: Payable) -> int:
    return p.total()`,
        note: 'Protocols let you type duck-typed APIs without inheritance.',
      },
      commonMistakes: [
        'Giant “Manager” classes ported from enterprise Java.',
        'Overusing inheritance for code reuse.',
        'Ignoring __init__ clarity and invariants.',
      ],
      beforeYouPractice: [
        'When is a dataclass better than a raw dict?',
        'How does Protocol differ from a Java interface?',
      ],
    },
  ),
  t(
    'j2p-typing',
    'java-to-python',
    'Typing & tooling',
    'type hints, mypy, venv, pytest.',
    {
      overview:
        'Production Python uses type hints + a checker (mypy/pyright), isolated envs, and pytest. This is how Java teams keep safety without the JVM ceremony.',
      keyPoints: [
        'Annotate public functions and domain models.',
        'venv/poetry/uv isolate dependencies like Maven modules.',
        'pytest replaces JUnit for most services.',
        'Black/ruff format and lint — CI quality gates.',
      ],
      example: {
        title: 'Typed function + pytest',
        code: `# app.py
def discount(price: int, pct: float) -> int:
    return int(price * (1 - pct))

# test_app.py
def test_discount():
    assert discount(100, 0.1) == 90`,
        note: 'Show the toolchain in interviews: types + tests + env.',
      },
      commonMistakes: [
        'No requirements.lock / poetry.lock in services.',
        'Types only in your head, never checked in CI.',
        'unittest boilerplate when pytest fixtures are enough.',
      ],
      beforeYouPractice: [
        'Explain venv vs installing packages globally.',
        'What would you put in CI for a Python API?',
      ],
    },
  ),
  t(
    'j2p-async',
    'java-to-python',
    'Concurrency map',
    'Threads / executors → asyncio and when not to.',
    {
      overview:
        'Java ExecutorService maps to threads or process pools; Python asyncio shines for many I/O waits. CPU-heavy work still needs processes or native extensions.',
      keyPoints: [
        'asyncio await ≈ non-blocking I/O event loop.',
        'Do not call blocking JDBC-style I/O inside async handlers.',
        'concurrent.futures for thread/process pools.',
        'Pick async frameworks (FastAPI) when concurrency is I/O bound.',
      ],
      example: {
        title: 'Parallel I/O',
        code: `import asyncio

async def fetch_all(urls: list[str]) -> list[str]:
    async with aiohttp.ClientSession() as session:
        tasks = [session.get(u) for u in urls]
        responses = await asyncio.gather(*tasks)
        return [await r.text() for r in responses]`,
        note: 'Compare to CompletableFuture.allOf in Java.',
      },
      commonMistakes: [
        'Blocking the event loop with time.sleep or sync HTTP.',
        'Assuming asyncio speeds up CPU-bound math.',
        'Unbounded gather without timeouts.',
      ],
      beforeYouPractice: [
        'When would you keep sync Flask/Django style instead of asyncio?',
        'Map CompletableFuture to an asyncio pattern.',
      ],
    },
  ),
  t(
    'j2p-fastapi',
    'java-to-python',
    'Spring → FastAPI',
    'Routes, Pydantic models, dependency injection.',
    {
      overview:
        'FastAPI is the closest “Spring Boot feeling” for many Java backend engineers: typed request models, OpenAPI, dependency injection, and async support.',
      keyPoints: [
        'Pydantic models ≈ Bean Validation DTOs.',
        'Depends() ≈ Spring DI for request-scoped deps.',
        'APIRouter ≈ controller grouping.',
        'Keep business logic out of route functions — same as Java.',
      ],
      example: {
        title: 'Validated endpoint',
        code: `from fastapi import FastAPI
from pydantic import BaseModel, Field

class CreateOrder(BaseModel):
    sku: str
    qty: int = Field(gt=0)

app = FastAPI()

@app.post("/orders")
def create(order: CreateOrder) -> dict:
    return {"ok": True, "qty": order.qty}`,
        note: 'Mention OpenAPI auto-docs — interviewers like the Spring parallel.',
      },
      commonMistakes: [
        'Fat route handlers with SQL and business rules mixed.',
        'No request validation (raw dicts everywhere).',
        'Ignoring status codes and error models.',
      ],
      beforeYouPractice: [
        'Map @RestController + @Valid to FastAPI + Pydantic.',
        'Where do transactions/services live in a FastAPI app?',
      ],
    },
  ),
]

export function topicsForTrack(trackId: string): Topic[] {
  return TOPICS.filter((topic) => topic.trackId === trackId)
}

export function getTopic(topicId: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === topicId)
}
