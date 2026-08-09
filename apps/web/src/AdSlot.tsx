import type { CSSProperties } from 'react'

export type AdVariant = 'banner' | 'sidebar' | 'inline'

type AdSlotProps = {
  id: string
  variant?: AdVariant
  /** Optional partner / creative label shown in the slot */
  label?: string
  /** Optional headline for the placeholder creative */
  headline?: string
  /** Optional supporting line */
  detail?: string
  /** When set, the whole slot becomes a link (real creatives later) */
  href?: string
  className?: string
  style?: CSSProperties
}

const DEFAULTS: Record<
  AdVariant,
  { label: string; headline: string; detail: string }
> = {
  banner: {
    label: 'Sponsored',
    headline: 'Partner placement',
    detail: 'Reserved for interview tools, bootcamps, and hiring partners.',
  },
  sidebar: {
    label: 'Sponsored',
    headline: 'Partner spotlight',
    detail: 'Compact placement for relevant career products.',
  },
  inline: {
    label: 'Sponsored',
    headline: 'From our partners',
    detail: 'Non-intrusive creative space between study and practice.',
  },
}

/**
 * Intentional ad placement with labeled placeholder creatives.
 * Swap in real creatives later via id / href / label props.
 */
export function AdSlot({
  id,
  variant = 'banner',
  label,
  headline,
  detail,
  href,
  className = '',
  style,
}: AdSlotProps) {
  const copy = DEFAULTS[variant]
  const body = (
    <>
      <span className="ad-slot-label">{label ?? copy.label}</span>
      <span className="ad-slot-copy">
        <strong>{headline ?? copy.headline}</strong>
        <em>{detail ?? copy.detail}</em>
      </span>
      <span className="ad-slot-meta" aria-hidden="true">
        {id}
      </span>
    </>
  )

  const classes = `ad-slot ad-slot-${variant}${className ? ` ${className}` : ''}`

  if (href) {
    return (
      <a
        className={classes}
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-ad-id={id}
        style={style}
      >
        {body}
      </a>
    )
  }

  return (
    <aside
      className={classes}
      data-ad-id={id}
      aria-label={`${label ?? copy.label}: ${headline ?? copy.headline}`}
      style={style}
    >
      {body}
    </aside>
  )
}
