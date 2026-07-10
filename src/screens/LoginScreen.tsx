import { useState } from 'react'
import type { FormEvent } from 'react'

import { getProviderLabel } from '../services/auth-backend'
import { prefersReducedMotion } from '../utils/motion'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

interface LoginScreenProps {
  onEmailAuth: (params: { email: string; password: string; mode: EmailAuthMode }) => Promise<void>
  onSocialAuth: (provider: SocialAuthProvider) => Promise<void>
  onRequestPasswordReset: (email: string) => Promise<void>
  isAuthBusy: boolean
  isBootstrapping: boolean
  authMessage: string
  authError: string
  isAuthConfigured: boolean
  authConfigMessage: string
}

const LOGO_SRC = '/navafit-logo.png'
const SOCIAL_PROVIDERS: SocialAuthProvider[] = ['apple', 'google', 'facebook']

type ScreenMode = 'auth' | 'reset'

export function LoginScreen({
  onEmailAuth,
  onSocialAuth,
  onRequestPasswordReset,
  isAuthBusy,
  isBootstrapping,
  authMessage,
  authError,
  isAuthConfigured,
  authConfigMessage,
}: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<EmailAuthMode>('sign-in')
  const [screenMode, setScreenMode] = useState<ScreenMode>('auth')
  const [resetEmail, setResetEmail] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)

  const isFormDisabled = isAuthBusy || isBootstrapping || !isAuthConfigured
  const statusText = authError || authMessage || (isBootstrapping ? 'Checking your saved session...' : '')

  const submitLabel = isBootstrapping
    ? 'Checking session...'
    : isAuthBusy
      ? mode === 'sign-in' ? 'Signing in...' : 'Creating account...'
      : mode === 'sign-in' ? 'Sign In' : 'Create Account'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onEmailAuth({ email, password, mode })
  }

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onRequestPasswordReset(resetEmail)
  }

  return (
    <div className="dq-root h-full w-full flex-1 flex flex-col">
      <div className="dq-hero">
        <div className={`dq-logo-ring${prefersReducedMotion() ? '' : ' dq-logo-ring--pulse'}`}>
          {!logoFailed ? (
            <img
              src={LOGO_SRC}
              alt="NavaFit logo"
              className="dq-logo"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="dq-logo">N</div>
          )}
        </div>
        <p className="dq-brand">NavaFit</p>
        <p className="dq-tagline">Train with intent.</p>
      </div>

      <section className="dq-sheet" aria-label={screenMode === 'auth' ? 'Sign in' : 'Reset password'}>
        {screenMode === 'auth' ? (
          <>
            <div className="flex flex-col gap-2">
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="dq-btn dq-btn-sso"
                  onClick={() => void onSocialAuth(provider)}
                  disabled={isFormDisabled}
                >
                  <SocialIcon provider={provider} />
                  Continue with {getProviderLabel(provider)}
                </button>
              ))}
            </div>

            <div className="dq-divider" aria-hidden>
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!isAuthConfigured && (
                <div className="dq-status dq-status-error" role="alert">
                  <p className="dq-heading" style={{ fontSize: '0.9rem' }}>Sign-in is turned off in this build</p>
                  <p className="dq-support-copy mt-1">{authConfigMessage}</p>
                </div>
              )}

              <div className="dq-mode-toggle">
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'dq-is-active' : ''}
                  onClick={() => setMode('sign-in')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'dq-is-active' : ''}
                  onClick={() => setMode('sign-up')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Create Account
                </button>
              </div>

              <div className="dq-field">
                <label className="dq-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="dq-input"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="dq-field">
                <div className="flex items-center justify-between">
                  <label className="dq-label" htmlFor="login-password">Password</label>
                  {mode === 'sign-in' && (
                    <button
                      type="button"
                      className="dq-link"
                      onClick={() => {
                        setResetEmail(email)
                        setScreenMode('reset')
                      }}
                      disabled={isAuthBusy || isBootstrapping}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="dq-input"
                  placeholder="••••••••"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  disabled={isFormDisabled}
                />
              </div>

              <button type="submit" disabled={isFormDisabled} className="dq-btn dq-btn-primary">
                {submitLabel}
              </button>

              {statusText && (
                <div className={`dq-status${authError ? ' dq-status-error' : ''}`} aria-live="polite">
                  {statusText}
                </div>
              )}
            </form>
          </>
        ) : (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
            <p className="dq-heading">Reset your password</p>
            <p className="dq-support-copy">
              Enter your account email and we will send you a link to choose a new password.
            </p>

            <div className="dq-field">
              <label className="dq-label" htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="dq-input"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isAuthBusy || !isAuthConfigured}
              />
            </div>

            <button type="submit" disabled={isAuthBusy || !isAuthConfigured} className="dq-btn dq-btn-primary">
              {isAuthBusy ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              className="dq-link"
              style={{ textAlign: 'center', width: '100%' }}
              onClick={() => setScreenMode('auth')}
              disabled={isAuthBusy}
            >
              Back to sign in
            </button>

            {statusText && (
              <div className={`dq-status${authError ? ' dq-status-error' : ''}`} aria-live="polite">
                {statusText}
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  )
}

function SocialIcon({ provider }: { provider: SocialAuthProvider }) {
  if (provider === 'apple') return <AppleIcon />
  if (provider === 'google') return <GoogleIcon />
  return <FacebookIcon />
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M13.03 3.06c.76-.91 1.26-2.17 1.12-3.06-1.1.04-2.39.72-3.18 1.62-.71.8-1.33 2.08-1.15 3.29 1.22.09 2.45-.62 3.21-1.85ZM16.78 10.89c-.02-2.38 1.97-3.52 2.06-3.58-1.12-1.62-2.84-1.84-3.45-1.87-1.47-.15-2.89.87-3.64.87-.76 0-1.91-.85-3.15-.82-1.61.03-3.11.95-3.94 2.42-1.69 2.91-.43 7.21 1.2 9.52.79 1.12 1.75 2.39 3 2.35 1.19-.05 1.64-.75 3.08-.75 1.45 0 1.84.75 3.1.73 1.29-.02 2.1-1.15 2.89-2.28.92-1.31 1.29-2.6 1.31-2.67-.03-.01-2.48-.95-2.46-3.92Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M19.6 10.23c0-.68-.06-1.34-.18-1.97H10v3.73h5.39a4.62 4.62 0 0 1-2 3.03v2.52h3.23c1.88-1.72 2.98-4.27 2.98-7.31Z" />
      <path d="M10 20c2.7 0 4.96-.9 6.61-2.44l-3.23-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.58-4.11H1.08v2.6A9.99 9.99 0 0 0 10 20Z" />
      <path d="M4.42 11.89a6 6 0 0 1 0-3.78V5.5H1.08a10 10 0 0 0 0 9l3.34-2.61Z" />
      <path d="M10 3.98c1.46 0 2.77.5 3.8 1.48l2.85-2.85C14.95 1.04 12.7 0 10 0a10 10 0 0 0-8.92 5.5l3.34 2.61C5.2 5.73 7.4 3.98 10 3.98Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M18 10a8 8 0 1 0-9.25 7.9v-5.59H6.63V10h2.12V8.16c0-2.1 1.24-3.26 3.15-3.26.91 0 1.87.16 1.87.16v2.06h-1.05c-1.04 0-1.36.64-1.36 1.3V10h2.32l-.37 2.31h-1.95v5.59A8 8 0 0 0 18 10Z" />
    </svg>
  )
}
