/** Soft ambient field — voice/signal metaphor for interview practice. CSS-driven, non-interactive. */
export function AmbientField() {
  return (
    <div className="ambient-field" aria-hidden="true">
      <span className="ambient-orb ambient-orb-a" />
      <span className="ambient-orb ambient-orb-b" />
      <span className="ambient-orb ambient-orb-c" />
      <span className="ambient-ring ambient-ring-1" />
      <span className="ambient-ring ambient-ring-2" />
      <span className="ambient-ring ambient-ring-3" />
      <span className="ambient-beam" />
      <svg className="ambient-wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          className="ambient-wave-path ambient-wave-path-a"
          d="M0 60 Q150 20 300 60 T600 60 T900 60 T1200 60"
          fill="none"
        />
        <path
          className="ambient-wave-path ambient-wave-path-b"
          d="M0 60 Q150 95 300 60 T600 60 T900 60 T1200 60"
          fill="none"
        />
      </svg>
    </div>
  )
}
