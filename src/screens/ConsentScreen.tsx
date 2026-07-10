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
    <section className="screen-shell justify-center dq-root">
      <div className="content-stack my-auto space-y-4 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="dq-brand-static">N</div>
          <p className="dq-heading">Review data permissions</p>
          <p className="dq-support-copy">
            Signed in as {accountEmail}. Before health syncing starts, review the legal pages and choose what
            NavaFit may use on this device.
          </p>
        </div>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-heading" style={{ fontSize: '1rem' }}>Required legal approvals</p>
              <p className="dq-support-copy mt-1">Open each page first, then tick the boxes below.</p>
            </div>
            <button
              type="button"
              className="dq-btn dq-btn-sso"
              style={{ width: 'auto' }}
              onClick={() => void onSignOut()}
              disabled={isSaving}
            >
              Sign out
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="dq-input text-left"
              style={{ cursor: 'pointer' }}
              onClick={() => void openExternalUrl(PRIVACY_POLICY_URL)}
            >
              <span className="dq-label block">Privacy Policy</span>
              <span className="dq-support-copy mt-1 block">Open the live privacy page at navafit.sg.</span>
            </button>
            <button
              type="button"
              className="dq-input text-left"
              style={{ cursor: 'pointer' }}
              onClick={() => void openExternalUrl(TERMS_OF_SERVICE_URL)}
            >
              <span className="dq-label block">Terms Of Service</span>
              <span className="dq-support-copy mt-1 block">Open the live terms page at navafit.sg.</span>
            </button>
          </div>

          <label className="dq-checkbox-row">
            <input type="checkbox" checked={acceptsPrivacy} onChange={(event) => setAcceptsPrivacy(event.target.checked)} />
            <span>I reviewed the Privacy Policy and agree to NavaFit storing my account and workout data.</span>
          </label>

          <label className="dq-checkbox-row">
            <input type="checkbox" checked={acceptsTerms} onChange={(event) => setAcceptsTerms(event.target.checked)} />
            <span>I reviewed the Terms of Service and agree to continue using the app.</span>
          </label>
        </section>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div>
            <p className="dq-heading" style={{ fontSize: '1rem' }}>Optional production features</p>
            <p className="dq-support-copy mt-1">
              These switches control Apple Health sync and product analytics. You can keep them off and still use the
              app manually.
            </p>
          </div>

          <label className="dq-checkbox-row">
            <input
              type="checkbox"
              checked={acceptsHealthSync}
              onChange={(event) => setAcceptsHealthSync(event.target.checked)}
            />
            <span>Allow Apple Health data to personalize future session presets.</span>
          </label>

          <label className="dq-checkbox-row">
            <input
              type="checkbox"
              checked={acceptsUsageAnalytics}
              onChange={(event) => setAcceptsUsageAnalytics(event.target.checked)}
            />
            <span>Allow usage analytics so we can measure which screens and flows are actually used.</span>
          </label>

          {error ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="dq-btn dq-btn-primary"
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
