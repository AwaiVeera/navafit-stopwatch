import type { ReactNode } from 'react'

/**
 * Shared <MetricChip> primitive.
 *
 * Renders the existing .metric-chip surface with a label, primary value, and
 * an optional trailing unit. Supports `compact` value styling for narrow chips
 * (matches the current .metric-chip-value-compact pattern used on Dashboard).
 *
 * Existing per-screen local MetricChip helpers can adopt this incrementally.
 */
interface MetricChipProps {
  label: string
  value: ReactNode
  unit?: string
  compact?: boolean
  className?: string
}

export function MetricChip({ label, value, unit, compact, className }: MetricChipProps) {
  const valueClass = compact ? 'metric-chip-value-compact' : 'metric-chip-value'
  const wrapperClass = `metric-chip${className ? ` ${className}` : ''}`

  return (
    <div className={wrapperClass}>
      <p className="metric-chip-label">{label}</p>
      {unit ? (
        <div className="metric-chip-value-row mt-3">
          <p className={valueClass}>{value}</p>
          <p className="metric-unit">{unit}</p>
        </div>
      ) : (
        <p className={`${valueClass} mt-3`}>{value}</p>
      )}
    </div>
  )
}
