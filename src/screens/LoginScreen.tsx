import { useState } from 'react'
import type { FormEvent } from 'react'

import { getSupabaseSetupMessage } from '../services/supabase'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

interface LoginScreenProps {
  onEmailAuth: (params: { email: string; password: string; mode: EmailAuthMode }) => Promise<void>
  onSocialAuth: (provider: SocialAuthProvider) => Promise<void>
  isAuthBusy: boolean
  isBootstrapping: boolean
  authMessage: string
  authError: string
  isSupabaseConfigured: boolean
}

const LOGO_SRC = '/navafit-logo.png'

export function LoginScreen({
  onEmailAuth,
  onSocialAuth,
  isAuthBusy,
  isBootstrapping,
  authMessage,
  authError,
  isSupabaseConfigured,
}: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<EmailAuthMode>('sign-in')
  const [logoFailed, setLogoFailed] = useState(false)

  const isFormDisabled = isAuthBusy || isBootstrapping || !isSupabaseConfigured
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

  return (
    <div className="login-screen-dark h-full w-full flex-1">
      <section className="screen-shell justify-center">
        <div className="content-stack my-auto space-y-3">

          {/* ── Hero panel ── */}
          <div className="login-hero-panel">
            {!logoFailed ? (
              <img
                src={LOGO_SRC}
                alt="NavaFit logo"
                className="login-hero-logo"
                onError={() => {
                  setLogoFailed(true)
                }}
              />
            ) : (
              <div className="login-hero-logo flex items-center justify-center">
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#8a9a4a' }}>N</span>
              </div>
            )}
            <p className="login-hero-brand">NavaFit</p>
            <p className="login-hero-sub">Alignment System</p>
            <p className="login-hero-tagline">Art Of Tactical Flowmentum</p>
          </div>

          {/* ── Stat cards ── */}
          <div className="login-stat-row">
            <div className="login-stat-card">
              <p className="login-stat-label">Discipline</p>
              <p className="login-stat-value">Kalari · Gadah</p>
            </div>
            <div className="login-stat-card">
              <p className="login-stat-label">Method</p>
              <p className="login-stat-value">Breathwork</p>
            </div>
          </div>

          {/* ── Auth form ── */}
          <form onSubmit={handleSubmit} className="login-form-sheet">
            {!isSupabaseConfigured && (
              <div
                className="rounded-xl border border-[rgba(157,109,109,0.35)] bg-[rgba(157,109,109,0.12)] p-3 text-left text-sm"
                role="alert"
              >
                <p className="font-medium" style={{ color: '#e2e8d4' }}>Login is turned off in this build</p>
                <p className="mt-2 text-[0.82rem]" style={{ color: '#7a8a60' }}>{getSupabaseSetupMessage()}</p>
              </div>
            )}

            <div>
              <p className="login-label">Access mode</p>
              <div className="login-mode-toggle">
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'is-active' : ''}
                  onClick={() => setMode('sign-in')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'login-mode-create is-active' : 'login-mode-create'}
                  onClick={() => setMode('sign-up')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Create Account
                </button>
              </div>
            </div>

            <div>
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isFormDisabled}
              />
            </div>

            <div>
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
                placeholder="••••••••"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                disabled={isFormDisabled}
              />
            </div>

            <button type="submit" disabled={isFormDisabled} className="primary-btn primary-btn-strong w-full justify-center">
              {submitLabel}
            </button>

            {statusText && (
              <div
                className={`login-status-card ${authError ? '' : ''}`}
                style={{ color: authError ? '#c47a7a' : '#8a9a6a' }}
                aria-live="polite"
              >
                {statusText}
              </div>
            )}
          </form>

          {/* ── SSO ── */}
          <div className="login-form-sheet">
            <p className="login-label">Continue with</p>
            <div className="login-sso-row">
              <button
                type="button"
                className="login-sso-btn"
                onClick={() => void onSocialAuth('apple')}
                disabled={isFormDisabled}
              >
                <AppleIcon />
                Apple
              </button>
              <button
                type="button"
                className="login-sso-btn"
                onClick={() => void onSocialAuth('google')}
                disabled={isFormDisabled}
              >
                <GoogleIcon />
                Google
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
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
