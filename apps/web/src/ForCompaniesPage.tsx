import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { AUDIENCES, BRAND } from './brand'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import './App.css'

const HIRING_CAPABILITIES = [
  {
    title: 'Structured interview kits',
    body: 'Role-ready question banks aligned to Staff, EM, language, and AI/data paths — same bar across every interviewer.',
    status: 'Live curriculum · hiring kits expanding',
  },
  {
    title: 'Voice & live-style screens',
    body: 'Candidates practice spoken answers; hiring teams can review delivery-aware coaching signals before the panel.',
    status: 'Talent voice live · company review early access',
  },
  {
    title: 'Scorecards & consistency',
    body: 'Shared rubrics so panels compare apples to apples — strengths, gaps, and hire/no-hire notes in one flow.',
    status: 'Partner design · early access',
  },
  {
    title: 'Readiness from practice',
    body: 'See who has actually drilled the loop — tracks completed, feedback volume, and path progress — not just a résumé PDF.',
    status: 'Signals roadmap · partner with us',
  },
] as const

export function ForCompaniesPage() {
  return (
    <Shell>
      <article className="company-page hire-page">
        <section className="company-hero reveal">
          <p className="eyebrow">{AUDIENCES.companies.label}</p>
          <h1>
            Hire with confidence
            <span>{BRAND.tagline}</span>
          </h1>
          <p className="hero-lede">{AUDIENCES.companies.blurb}</p>
          <div className="hero-cta">
            <a
              className="btn primary"
              href={`mailto:${BRAND.contactEmail}?subject=Hiring%20team%20access%20—%20AI%20Tutor%20Studio`}
            >
              Talk to us about hiring
            </a>
            <Link className="btn ghost" to="/jobs">
              Post a job
            </Link>
            <Link className="btn ghost" to="/">
              See talent experience
            </Link>
          </div>
        </section>

        <TrustStats variant="strip" className="reveal" />

        <section className="company-section reveal">
          <p className="eyebrow">The problem</p>
          <h2>Hiring is fragmented. Prep is disconnected.</h2>
          <p className="company-copy">
            Companies juggle ATS tools, calendar links, and inconsistent panel
            questions. Candidates prep on puzzle sites that never sound like
            your interview. {BRAND.product} connects both sides: talent builds
            readiness here; hiring teams run structured loops against the same
            bar.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">What companies get</p>
          <h2>One studio from screen to decision.</h2>
          <ul className="company-list">
            {HIRING_CAPABILITIES.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <em className="hire-status">{item.status}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="dual-audience reveal" aria-label="Two audiences">
          <div className="dual-card">
            <p className="eyebrow">{AUDIENCES.talent.label}</p>
            <h3>{AUDIENCES.talent.title}</h3>
            <p>{AUDIENCES.talent.blurb}</p>
            <Link className="btn ghost sm" to="/">
              Open learning paths
            </Link>
          </div>
          <div className="dual-card dual-card-accent">
            <p className="eyebrow">{AUDIENCES.companies.label}</p>
            <h3>{AUDIENCES.companies.title}</h3>
            <p>{AUDIENCES.companies.blurb}</p>
            <a
              className="btn primary sm"
              href={`mailto:${BRAND.contactEmail}?subject=Company%20pilot`}
            >
              Request a pilot
            </a>
          </div>
        </section>

        <section className="company-cta-band reveal">
          <div>
            <p className="eyebrow">Early access</p>
            <h2>Design partners for hiring teams.</h2>
            <p className="company-copy">
              We are onboarding companies that want structured interviews plus
              candidate practice data in one product. No fake customer logos —
              just a direct line to {BRAND.company}.
            </p>
          </div>
          <div className="hero-cta">
            <a
              className="btn primary"
              href={`mailto:${BRAND.contactEmail}?subject=Hiring%20design%20partner`}
            >
              Email {BRAND.contactEmail}
            </a>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
          </div>
        </section>

        <AdSlot
          id="hire-below-fold"
          variant="banner"
          className="company-ad"
          headline="HR tech & assessment partners"
          detail="Sponsored placement for hiring-stack partners — below the brand story."
        />
      </article>
    </Shell>
  )
}
