import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import { PRODUCT_STATS } from './productStats'
import './App.css'

type Cell = { text: string; tone?: 'yes' | 'mid' | 'no' }

const DIMENSIONS: {
  label: string
  cells: Cell[]
}[] = [
  {
    label: 'Spoken interview practice',
    cells: [
      { text: 'Mic answers + delivery tips', tone: 'yes' },
      { text: 'Rare / typed', tone: 'no' },
      { text: 'Live voice with humans', tone: 'yes' },
      { text: 'DIY prompts', tone: 'mid' },
      { text: 'Sometimes chat-only', tone: 'mid' },
      { text: 'Not the focus', tone: 'no' },
    ],
  },
  {
    label: 'Structured topic docs',
    cells: [
      { text: 'Per-path curriculum', tone: 'yes' },
      { text: 'Problems, not docs', tone: 'mid' },
      { text: 'Session-based', tone: 'mid' },
      { text: 'No curriculum', tone: 'no' },
      { text: 'Varies by app', tone: 'mid' },
      { text: 'Course modules', tone: 'yes' },
    ],
  },
  {
    label: 'Coding problem volume',
    cells: [
      { text: 'Not our focus', tone: 'mid' },
      { text: 'Very strong', tone: 'yes' },
      { text: 'Limited', tone: 'mid' },
      { text: 'Ad hoc', tone: 'no' },
      { text: 'Usually thin', tone: 'no' },
      { text: 'Assignments', tone: 'mid' },
    ],
  },
  {
    label: 'Human mock interviews',
    cells: [
      { text: 'AI coaching loop', tone: 'mid' },
      { text: 'Peer contests', tone: 'mid' },
      { text: 'Core product', tone: 'yes' },
      { text: 'No', tone: 'no' },
      { text: 'Rare', tone: 'no' },
      { text: 'No', tone: 'no' },
    ],
  },
  {
    label: 'AI coaching on your answer',
    cells: [
      { text: 'Substance + delivery', tone: 'yes' },
      { text: 'Judge / tests', tone: 'mid' },
      { text: 'Human feedback', tone: 'mid' },
      { text: 'Generic chat', tone: 'mid' },
      { text: 'Often shallow', tone: 'mid' },
      { text: 'Quizzes / grades', tone: 'mid' },
    ],
  },
  {
    label: 'Staff / EM narrative loops',
    cells: [
      { text: 'Native paths', tone: 'yes' },
      { text: 'Limited', tone: 'no' },
      { text: 'Depends on peer', tone: 'mid' },
      { text: 'Unstructured', tone: 'no' },
      { text: 'Rarely deep', tone: 'no' },
      { text: 'General leadership courses', tone: 'mid' },
    ],
  },
  {
    label: 'Career switch paths (AI / Snowflake)',
    cells: [
      {
        text: `${PRODUCT_STATS.agenticVideosCount}+ & ${PRODUCT_STATS.snowflakeVideosCount}+ video libs`,
        tone: 'yes',
      },
      { text: 'Not career-path native', tone: 'no' },
      { text: 'Not curriculum-first', tone: 'no' },
      { text: 'DIY', tone: 'no' },
      { text: 'Generic tutors', tone: 'mid' },
      { text: 'Many courses, slow loop', tone: 'mid' },
    ],
  },
  {
    label: 'Free → Pro freemium',
    cells: [
      { text: 'Free practice + Pro depth', tone: 'yes' },
      { text: 'Yes', tone: 'yes' },
      { text: 'Paid sessions', tone: 'mid' },
      { text: 'ChatGPT Plus optional', tone: 'mid' },
      { text: 'Varies', tone: 'mid' },
      { text: 'Course / sub pricing', tone: 'mid' },
    ],
  },
  {
    label: 'Best when you need…',
    cells: [
      { text: 'Docs → speak → coach', tone: 'yes' },
      { text: 'Algorithm reps', tone: 'yes' },
      { text: 'Live human mocks', tone: 'yes' },
      { text: 'Open-ended Q&A', tone: 'mid' },
      { text: 'Quick AI chat', tone: 'mid' },
      { text: 'Long-form courses', tone: 'yes' },
    ],
  },
]

const COLUMNS = [
  'Practice Out Loud',
  'HackerRank / LeetCode',
  'Interviewing.io / Pramp',
  'ChatGPT alone',
  'Generic AI tutors',
  'Coursera-style courses',
] as const

export function ComparePage() {
  return (
    <Shell wide>
      <article className="company-page compare-page">
        <section className="company-hero reveal">
          <p className="eyebrow">Practice Out Loud</p>
          <h1>
            Compare
            <span>Talent tools and hiring tools — honest fit.</span>
          </h1>
          <p className="hero-lede">
            Practice Out Loud is built for spoken Staff/EM interview loops:
            study a path, speak answers, get AI coaching. Competitors often win
            on coding volume or live human mocks — those strengths are marked
            plainly below.
          </p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Try paths free
            </Link>
            <Link className="btn ghost" to="/for-companies">
              For companies
            </Link>
            <Link className="btn ghost" to="/pricing">
              Free vs Pro
            </Link>
          </div>
        </section>

        <TrustStats variant="strip" className="reveal" />

        <section className="company-section reveal">
          <p className="eyebrow">Comparison</p>
          <h2>Where each tool is stronger.</h2>
          <p className="company-copy">
            Green highlights where a tool is a natural fit. Mid-tone means
            partial coverage. We do not invent endorsements — only product
            shape.
          </p>
          <div className="compare-table-wrap compare-page-table">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  {COLUMNS.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={`${row.label}-${COLUMNS[i]}`}
                        className={
                          cell.tone === 'yes'
                            ? 'yes'
                            : cell.tone === 'no'
                              ? 'cmp-no'
                              : 'cmp-mid'
                        }
                      >
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">Fair takeaways</p>
          <h2>Pick the tool that matches the loop.</h2>
          <ul className="company-list">
            <li>
              <strong>Choose Practice Out Loud</strong>
              <span>
                When you need topic docs, voice answers, delivery coaching, and
                career paths (Backend→AI, Snowflake) in one freemium product.
              </span>
            </li>
            <li>
              <strong>Choose LeetCode / HackerRank</strong>
              <span>
                When the bottleneck is algorithmic problem volume and timed
                coding drills — they remain stronger there.
              </span>
            </li>
            <li>
              <strong>Choose Interviewing.io / Pramp</strong>
              <span>
                When you want live human mocks and peer pressure more than a
                structured self-serve curriculum.
              </span>
            </li>
            <li>
              <strong>ChatGPT alone / generic tutors</strong>
              <span>
                Flexible, but you assemble the curriculum and practice loop
                yourself — easy to drift without Staff/EM structure.
              </span>
            </li>
          </ul>
          <div className="hero-cta" style={{ marginTop: '1.25rem' }}>
            <Link className="btn primary" to="/register">
              Practice free
            </Link>
            <Link className="btn ghost" to="/company">
              Company overview
            </Link>
          </div>
        </section>

        <AdSlot
          id="compare-footer"
          variant="banner"
          className="company-ad"
          headline="Prep & hiring partners"
          detail="Below-fold only — comparison stays product-first above."
        />
      </article>
    </Shell>
  )
}
