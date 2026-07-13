import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Shared <Button> primitive.
 *
 * Consumes existing CSS classes so visual output matches hand-rolled buttons
 * across the app while giving screens a single component contract.
 *
 * Variants:
 *   primary      → .primary-btn.primary-btn-strong (gold CTA)
 *   secondary    → .secondary-btn (glass fallback)
 *   destructive  → .settings-danger-btn
 *   ghost        → .secondary-btn with transparent tint
 *   sso          → .sso-btn (also used inside the login SSO row)
 *
 * All variants keep the shared .primary-btn/.secondary-btn/.sso-btn styling
 * so screens can migrate incrementally without visual drift.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'sso'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  icon?: ReactNode
}

const CLASS_FOR_VARIANT: Record<ButtonVariant, string> = {
  primary: 'primary-btn primary-btn-strong',
  secondary: 'secondary-btn',
  destructive: 'settings-danger-btn',
  ghost: 'secondary-btn',
  sso: 'sso-btn',
}

export function Button({
  variant = 'primary',
  fullWidth,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const baseClass = CLASS_FOR_VARIANT[variant]
  const width = fullWidth ? 'w-full justify-center' : ''
  const combined = `${baseClass} ${width} ${className}`.trim().replace(/\s+/g, ' ')

  return (
    <button type={type} className={combined} {...rest}>
      {icon}
      {children}
    </button>
  )
}
