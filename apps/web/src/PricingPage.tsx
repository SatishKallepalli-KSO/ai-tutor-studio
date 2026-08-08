import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type BillingPlans } from './api'
import { useAuth } from './auth'

export function PricingPage() {
  const { user, refresh, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [billing, setBilling] = useState<BillingPlans | null>(null)
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .plans()
      .then(setBilling)
      .catch(() =>
        setBilling({
          plans: [
            {
              id: 'free',
              name: 'Free',
              price_monthly: '$0',
              price_yearly: '$0',
              features: [
                'All topic documentation (Learn)',
                'Practice on HTML, CSS, JavaScript, Python',
                '5 feedback reviews per day',
                'Local rubric coaching',
              ],
              limits: {},
            },
            {
              id: 'pro',
              name: 'Pro',
              price_monthly: '$19',
              price_yearly: '$149',
              features: [
                'Everything in Free',
                'All tracks including Staff, EM, Java→AI',
                'Unlimited practice + AI feedback',
                'Manage subscription in billing portal',
              ],
              limits: {},
            },
          ],
          stripe_enabled: false,
          demo_upgrade_available: true,
        }),
      )
  }, [])

  useEffect(() => {
    if (params.get('billing') === 'success') {
      void refresh()
    }
  }, [params, refresh])

  async function upgrade() {
    if (!user) {
      navigate('/register')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (billing?.stripe_enabled) {
        const session = await api.checkout(interval)
        window.location.href = session.url
        return
      }
      const res = await api.demoUpgrade()
      setUser(res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed')
    } finally {
      setLoading(false)
    }
  }

  async function openPortal() {
    setLoading(true)
    setError(null)
    try {
      const portal = await api.portal()
      window.location.href = portal.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pricing-page">
      <div className="section-head">
        <Link className="linkish" to="/">
          ← Back to tracks
        </Link>
        <h1>Simple pricing</h1>
        <p className="tagline">
          HackerRank-style freemium: learn free, unlock full interview tracks and
          unlimited AI coaching on Pro.
        </p>
      </div>

      {params.get('billing') === 'success' && (
        <div className="banner success">Payment received — refreshing your Pro access…</div>
      )}
      {error && <div className="banner error">{error}</div>}

      <div className="billing-toggle">
        <button
          className={interval === 'month' ? 'tab active' : 'tab'}
          onClick={() => setInterval('month')}
          type="button"
        >
          Monthly
        </button>
        <button
          className={interval === 'year' ? 'tab active' : 'tab'}
          onClick={() => setInterval('year')}
          type="button"
        >
          Yearly <span className="save">save ~35%</span>
        </button>
      </div>

      <div className="pricing-grid">
        {(billing?.plans ?? []).map((plan) => {
          const price =
            interval === 'year' ? plan.price_yearly : plan.price_monthly
          const isCurrent =
            (user?.is_pro && plan.id === 'pro') ||
            (!user?.is_pro && plan.id === 'free')
          return (
            <article
              key={plan.id}
              className={plan.id === 'pro' ? 'price-card featured' : 'price-card'}
            >
              <p className="pill">{plan.name}</p>
              <h2>
                {price}
                <small>/{interval === 'year' ? 'yr' : 'mo'}</small>
              </h2>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <button className="btn" type="button" disabled={isCurrent}>
                  {isCurrent ? 'Current plan' : 'Included free'}
                </button>
              ) : user?.is_pro ? (
                <button
                  className="btn primary"
                  type="button"
                  onClick={openPortal}
                  disabled={loading || !billing?.stripe_enabled}
                >
                  {billing?.stripe_enabled
                    ? 'Manage subscription'
                    : 'Pro active (demo)'}
                </button>
              ) : (
                <button
                  className="btn primary"
                  type="button"
                  onClick={upgrade}
                  disabled={loading}
                >
                  {loading
                    ? 'Starting…'
                    : billing?.stripe_enabled
                      ? 'Upgrade with Stripe'
                      : 'Unlock Pro (demo)'}
                </button>
              )}
            </article>
          )
        })}
      </div>

      {!billing?.stripe_enabled && (
        <p className="muted center-note">
          Stripe keys not configured yet — demo upgrade unlocks Pro locally.
          Add <code>STRIPE_SECRET_KEY</code> + price IDs on the API for live
          subscriptions.
        </p>
      )}
    </div>
  )
}
