/**
 * Shared <AiBadge> primitive.
 *
 * Renders the "AI" pill used on Dashboard, Biometrics, and PreSession headers.
 * Uses the existing .glass-card-compact + .ai-engine-badge styling so it
 * matches every prior call site while giving screens a single contract.
 */
interface AiBadgeProps {
  label?: string
  className?: string
}

export function AiBadge({ label = 'AI', className = '' }: AiBadgeProps) {
  const combined =
    `glass-card-compact ai-engine-badge px-3 py-2 text-xs text-[var(--text-secondary)] ${className}`
      .trim()
      .replace(/\s+/g, ' ')
  return <div className={combined}>{label}</div>
}
