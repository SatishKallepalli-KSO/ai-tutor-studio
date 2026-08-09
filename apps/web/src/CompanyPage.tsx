import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { AUDIENCES, BRAND } from './brand'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import { PRODUCT_STATS } from './productStats'
import './App.css'

const TECH_PARTNERS = [
  { name: 'OpenAI', role: 'AI coaching models' },
  { name: 'Stripe', role: 'Billing' },
  { name: 'Snowflake', role: 'Career path curriculum' },
  { name: 'React', role: 'Web product' },
  { name: 'FastAPI', role: 'API platform' },
] as const

const OPEN_SLOTS = [
  {
    role: 'Hiring partner',
    blurb: 'Companies running structured interviews — early access seats.',
  },
  {
    role: 'Advisor',
    blurb: 'Talent, GTM, or AI product advisors welcome.',
  },
  {
    role: 'Design partner',
    blurb: 'Early design / brand collaborators — label reserved.',
  },
] as const

export function CompanyPage() {
  return (
    <Shell>
      <article className="company-page">
        <section className="company-hero reveal">
          <p className="eyebrow">{BRAND.company}</p>
          <h1>
            {BRAND.product}
            <span>{BRAND.tagline}</span>
          </h1>
          <p className="hero-lede">{BRAND.oneLiner}</p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Talent experience
            </Link>
            <Link className="btn ghost" to="/for-companies">
              Hiring teams
            </Link>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
          </div>
        </section>

        <TrustStats variant="panel" className="reveal" />

        <section className="dual-audience reveal">
          <div className="dual-card">
            <p className="eyebrow">{AUDIENCES.talent.label}</p>
            <h3>{AUDIENCES.talent.title}</h3>
            <p>{AUDIENCES.talent.blurb}</p>
            <Link className="btn ghost sm" to="/">
              Open Learn
            </Link>
          </div>
          <div className="dual-card dual-card-accent">
            <p className="eyebrow">{AUDIENCES.companies.label}</p>
            <h3>{AUDIENCES.companies.title}</h3>
            <p>{AUDIENCES.companies.blurb}</p>
            <Link className="btn primary sm" to="/for-companies">
              Explore Hire
            </Link>
          </div>
        </section>

        <section className="company-partner-strip reveal" aria-label="Built with">
          <p className="company-tech-label">Technology stack</p>
          <ul className="company-logo-row" aria-label="Technology partners">
            {TECH_PARTNERS.map((item) => (
              <li key={item.name}>
                <span>
                  {item.name}
                  <em className="company-logo-role">{item.role}</em>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted company-tech-note">
            Integration &amp; curriculum partners — not investors. No fabricated
            VC logos or Fortune-500 customer claims.
          </p>
        </section>

        <section className="company-section reveal" id="mission">
          <p className="eyebrow">Mission</p>
          <h2>One studio from practice to hire decision.</h2>
          <p className="company-copy">
            Talent learns and practices with voice-first coaching. Companies run
            structured interviews with a consistent bar. Same product family —
            not two disconnected tools.
          </p>
        </section>

        <section className="company-section reveal" id="product">
          <p className="eyebrow">Product</p>
          <h2>Learn · Practice · Hire</h2>
          <p className="company-copy">
            {PRODUCT_STATS.tracksCount} tracks, Agentic (
            {PRODUCT_STATS.agenticVideosCount} videos) and Snowflake (
            {PRODUCT_STATS.snowflakeVideosCount} videos) libraries for talent —
            plus a hiring studio for companies (structured kits, scorecards,
            readiness signals) now opening to design partners.
          </p>
          <div className="company-snapshot">
            <div>
              <strong>Learn</strong>
              <p>Paths and docs for engineers leveling up or switching stacks.</p>
            </div>
            <div>
              <strong>Practice</strong>
              <p>Voice drills and AI coaching on substance and delivery.</p>
            </div>
            <div>
              <strong>Hire</strong>
              <p>Structured interviews and fairness for panels hiring them.</p>
            </div>
          </div>
        </section>

        <section className="company-section reveal" id="team">
          <p className="eyebrow">Team</p>
          <h2>Built by {BRAND.company}</h2>
          <p className="company-copy">
            Founded by <strong>Satish Kallepalli</strong>. We ship practical AI
            products for talent markets — credibility means ownership, shipping,
            and honest partner language.
          </p>
          <div className="hero-cta" style={{ marginTop: '1rem' }}>
            <Link className="btn ghost" to="/about">
              About the lab
            </Link>
            <a className="btn ghost" href={`mailto:${BRAND.contactEmail}`}>
              Contact
            </a>
          </div>
        </section>

        <section className="company-section reveal" id="why-now">
          <p className="eyebrow">Why now</p>
          <h2>Learning and hiring still don’t share a system of record.</h2>
          <p className="company-copy">
            Prep tools ignore how companies interview. ATS tools ignore how
            candidates actually practice. We connect both sides in one studio.
          </p>
        </section>

        <section className="company-section reveal" id="open-slots">
          <p className="eyebrow">Open slots</p>
          <h2>Partner seats, labeled honestly.</h2>
          <ul className="company-slot-row">
            {OPEN_SLOTS.map((slot) => (
              <li key={slot.role}>
                <em>{slot.role}</em>
                <span>{slot.blurb}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="company-cta-band reveal" id="partner">
          <div>
            <p className="eyebrow">Partner &amp; invest</p>
            <h2>Help build the talent studio category.</h2>
            <p className="company-copy">
              Advisors, hiring design partners, and early investors welcome. No
              invented round announcements — just a clear conversation.
            </p>
          </div>
          <div className="hero-cta">
            <Link className="btn primary" to="/investors">
              Investor relations
            </Link>
            <Link className="btn ghost" to="/for-companies">
              Hiring early access
            </Link>
          </div>
        </section>

        <AdSlot
          id="company-footer"
          variant="banner"
          className="company-ad"
          headline="Hiring &amp; learning partners"
          detail="Below-fold placement only — company story stays brand-first above."
        />
      </article>
    </Shell>
  )
}
