import type { ReactNode } from 'react'

/**
 * Shared <SegmentedControl> primitive.
 *
 * Renders 2+ options as a horizontally-linked pill group, mirroring the
 * .soft-toggle pattern already used by Dashboard's chart range and
 * PreSession's mode picker.
 *
 * Each option gets:
 *   - role="group" on the wrapper (with aria-label)
 *   - aria-pressed on each button
 *   - .is-active class routed through the existing .soft-toggle styles
 *
 * Wire-in is deliberately conservative: screens migrate call sites when
 * ready. Legacy call sites keep working with their inline patterns.
 */
export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  fullWidth?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  fullWidth,
  className = '',
}: SegmentedControlProps<T>) {
  const width = fullWidth ? 'w-full justify-between' : ''
  const wrapper = `soft-toggle ${width} ${className}`.trim().replace(/\s+/g, ' ')

  return (
    <div className={wrapper} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={isActive ? 'is-active' : ''}
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
