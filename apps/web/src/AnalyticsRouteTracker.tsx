import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { track } from './analytics'

const PATH_EVENTS: Record<string, string> = {
  '/': 'page_view',
  '/pricing': 'pricing_view',
  '/agentic-path': 'agentic_path_open',
  '/snowflake-path': 'snowflake_path_open',
  '/for-companies': 'page_view',
  '/jobs': 'page_view',
  '/admin': 'page_view',
}

/** Tracks route changes for the product admin dashboard. */
export function AnalyticsRouteTracker() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname || '/'
    const event = PATH_EVENTS[path] ?? 'page_view'
    track(event, { path, properties: { search: location.search || undefined } })
  }, [location.pathname, location.search])

  return null
}
