import { useState } from 'react'

import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../legal'
import { openExternalUrl } from '../services/external'
import type { ConsentSubmission } from '../types'

interface ConsentScreenProps {
  accountEmail: string
  initialHealthSync: boolean
  initialUsageAnalytics: boolean
  isSaving: boolean
  error: string
  onSubmit: (submission: ConsentSubmission) => Promise<void>
  onSignOut: () => Promise<void>
}

export function ConsentScreen({
  accountEmail,
  initialHealthSync,
  initialUsageAnalytics,
  isSaving,
  error,
  onSubmit,
  onSignOut,
}: ConsentScreenProps) {
  const [acceptsPrivacy, setAcceptsPrivacy] = useState(false)
  const [acceptsTerms, setAcceptsTerms] = useState(false)
  const [acceptsHealthSync, setAcceptsHealthSync] = useState(initialHealthSync)
  const [acceptsUsageAnalytics, setAcceptsUsageAnalytics] = useState(initialUsageAnalytics)

  const canContinue = acceptsPrivacy && acceptsTerms && !isSaving

  return (
    <section className="screen-shell justify-center">
      <div className="content-stack my-auto space-y-4">
        <section className="hero-surface hero-surface-login">
          <div className="login-hero-copy">
            <p className="section-kicker">Consent Gate</p>
            <h1 className="section-title mt-3">Review data permissions</h1>
            <p className="support-copy mt-3">
              Signed in as {accountEmail}. Before health syncing starts, review the legal pages and choose what
              NavaFit may use on this device.
            </p>
          </div>

          <div className="glass-card">
            <p className="label-text">Singapore-first setup</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              Privacy and usage choices are recorded against the live legal versions and can be updated later.
            </p>
          </div>
        </section>

        <section className="glass-sheet space-y-4">
          <div className="info-row">
            <div>
              <p className="title-font text-[1.25rem] font-medium text-[var(--text-primary)]">Required legal approvals</p>
              <p className="support-copy mt-1">Open each page first, then tick the boxes below.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={() => void onSignOut()} disabled={isSaving}>
              Sign out
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="glass-card text-left" onClick={() => void openExternalUrl(PRIVACY_POLICY_URL)}>
              <p className="label-text">Privacy Policy</p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Open the live privacy page at `navafit.sg`.</p>
            </button>
            <button type="button" className="glass-card text-left" onClick={() => void openExternalUrl(TERMS_OF_SERVICE_URL)}>
              <p className="label-text">Terms Of Service</p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Open the live terms page at `navafit.sg`.</p>
            </button>
          </div>

          <label className="consent-row">
            <input type="checkbox" checked={acceptsPrivacy} onChange={(event) => setAcceptsPrivacy(event.target.checked)} />
            <span>I reviewed the Privacy Policy and agree to NavaFit storing my account and workout data.</span>
          </label>

          <label className="consent-row">
            <input type="checkbox" checked={acceptsTerms} onChange={(event) => setAcceptsTerms(event.target.checked)} />
            <span>I reviewed the Terms of Service and agree to continue using the app.</span>
          </label>
        </section>

        <section className="glass-sheet space-y-4">
          <div>
            <p className="title-font text-[1.25rem] font-medium text-[var(--text-primary)]">Optional production features</p>
            <p className="support-copy mt-1">
              These switches control Apple Health sync and product analytics. You can keep them off and still use the
              app manually.
            </p>
          </div>

          <label className="consent-row">
            <input
              type="checkbox"
              checked={acceptsHealthSync}
              onChange={(event) => setAcceptsHealthSync(event.target.checked)}
            />
            <span>Allow Apple Health data to personalize future session presets.</span>
          </label>

          <label className="consent-row">
            <input
              type="checkbox"
              checked={acceptsUsageAnalytics}
              onChange={(event) => setAcceptsUsageAnalytics(event.target.checked)}
            />
            <span>Allow usage analytics so we can measure which screens and flows are actually used.</span>
          </label>

          {error ? (
            <div className="glass-card-compact text-sm text-[var(--danger-soft)]" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="primary-btn primary-btn-strong w-full justify-center"
            disabled={!canContinue}
            onClick={() =>
              void onSubmit({
                acceptsHealthSync,
                acceptsUsageAnalytics,
              })
            }
          >
            {isSaving ? 'Saving consent...' : 'Continue to NavaFit'}
          </button>
        </section>
      </div>
    </section>
  )
}
