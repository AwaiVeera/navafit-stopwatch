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

const PRIMARY_HERO_SOURCE = '/Font.png'
const FALLBACK_HERO_SOURCE = '/font-fallback.svg'

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
  const [showFallbackHero, setShowFallbackHero] = useState(false)
  const [heroSource, setHeroSource] = useState(PRIMARY_HERO_SOURCE)
  const isFormDisabled = isAuthBusy || isBootstrapping || !isSupabaseConfigured
  const statusText = authError || authMessage || (isBootstrapping ? 'Checking your saved session...' : '')
  const submitLabel = isBootstrapping
    ? 'Checking session...'
    : isAuthBusy
      ? mode === 'sign-in'
        ? 'Signing in...'
        : 'Creating account...'
      : mode === 'sign-in'
        ? 'Sign In'
        : 'Create Account'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onEmailAuth({ email, password, mode })
  }

  const handleHeroError = () => {
    if (heroSource === PRIMARY_HERO_SOURCE) {
      setHeroSource(FALLBACK_HERO_SOURCE)
      return
    }
    setShowFallbackHero(true)
  }

  const handleSocialClick = async (provider: SocialAuthProvider) => {
    await onSocialAuth(provider)
  }

  return (
    <section className="screen-shell login-screen justify-center">
      <div className="content-stack my-auto space-y-3">
        <section className="hero-surface hero-surface-login">
          <div className="login-hero-copy">
            <p className="section-kicker">NavaFit Alignment</p>
            <h1 className="section-title mt-3">Tactical Flowmentum</h1>
            <p className="brand-font mt-2 text-[1.2rem] text-[var(--text-secondary)]">NavaFit</p>
          </div>

          <div className="login-hero-logo-wrap">
            {!showFallbackHero && (
              <div className="hero-logo-panel">
                <img
                  src={heroSource}
                  alt="NavaFit Alignment logo"
                  className="hero-logo-image"
                  onError={handleHeroError}
                />
              </div>
            )}

            {showFallbackHero && (
              <div className="hero-logo-panel hero-logo-placeholder">
                <p className="brand-font text-[2.4rem] tracking-[0.08em] text-[var(--text-primary)]">NavaFit</p>
              </div>
            )}
          </div>

          <div className="login-hero-support glass-card">
            <p className="support-copy text-center">
              Art Of Tactical Flowmentum
            </p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="glass-sheet space-y-3">
          {!isSupabaseConfigured ? (
            <div
              className="rounded-xl border border-[color-mix(in_srgb,var(--danger-soft)_45%,transparent)] bg-[color-mix(in_srgb,var(--danger-soft)_12%,transparent)] p-3 text-left text-sm"
              role="alert"
            >
              <p className="title-font font-medium text-[var(--text-primary)]">Login is turned off in this build</p>
              <p className="support-copy mt-2 text-[var(--text-secondary)]">{getSupabaseSetupMessage()}</p>
              <p className="support-copy mt-2 text-[var(--text-secondary)]">
                On your Mac: put those values in the file <span className="text-[var(--text-primary)]">.env.local</span> in
                the project folder. Then run <span className="text-[var(--text-primary)]">npm run build</span>, then{' '}
                <span className="text-[var(--text-primary)]">npm run cap:sync</span>, then install from Xcode again. The
                buttons below stay disabled until a new build is on your phone.
              </p>
            </div>
          ) : null}

          <div>
            <p className="label-text">Email access</p>
            <div className="soft-toggle mt-2 w-full justify-between">
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
                className={mode === 'sign-up' ? 'is-active' : ''}
                onClick={() => setMode('sign-up')}
                disabled={isAuthBusy || isBootstrapping}
              >
                Create Account
              </button>
            </div>
            <p className="support-copy mt-3">
              Use <span className="text-[var(--text-secondary)]">Create Account</span> for first-time signup. Supabase may ask
              the user to confirm by email before the first sign-in.
            </p>
          </div>

          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="matte-input mt-2"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isFormDisabled}
            />
          </div>

          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="matte-input mt-2"
              placeholder="••••••••"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={isFormDisabled}
            />
          </div>

          <button type="submit" disabled={isFormDisabled} className="primary-btn primary-btn-strong mt-2 w-full justify-center">
            {submitLabel}
          </button>

          {statusText ? (
            <div
              className={`glass-card-compact text-sm ${authError ? 'text-[var(--danger-soft)]' : 'text-[var(--text-secondary)]'}`}
              aria-live="polite"
            >
              {statusText}
            </div>
          ) : null}
        </form>

        <div className="glass-sheet space-y-3">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.2rem] font-medium text-[var(--text-primary)]">Continue with</p>
              <p className="support-copy mt-1">Apple and Google route through Supabase OAuth.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="sso-btn"
              onClick={() => handleSocialClick('apple')}
              disabled={isFormDisabled}
            >
              <AppleIcon />
              Apple
            </button>
            <button
              type="button"
              className="sso-btn"
              onClick={() => handleSocialClick('google')}
              disabled={isFormDisabled}
            >
              <GoogleIcon />
              Google
            </button>
          </div>
        </div>
      </div>
    </section>
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
