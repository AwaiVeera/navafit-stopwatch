import { useMemo, useState } from 'react'

import type { OnboardingProfile } from '../types'

interface OnboardingScreenProps {
  accountEmail: string
  initialProfile: OnboardingProfile | null
  isSaving: boolean
  error: string
  onSubmit: (profile: OnboardingProfile) => Promise<void>
  onSignOut: () => Promise<void>
}

export function OnboardingScreen({
  accountEmail,
  initialProfile,
  isSaving,
  error,
  onSubmit,
  onSignOut,
}: OnboardingScreenProps) {
  const [ageYears, setAgeYears] = useState(initialProfile ? String(initialProfile.ageYears) : '')
  const [heightCm, setHeightCm] = useState(initialProfile ? String(initialProfile.heightCm) : '')
  const [weightKg, setWeightKg] = useState(initialProfile ? String(initialProfile.weightKg) : '')
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(
    initialProfile ? String(initialProfile.trainingDaysPerWeek) : '3',
  )
  const [localError, setLocalError] = useState('')

  const canSubmit = useMemo(() => {
    return ageYears.trim() !== ''
      && heightCm.trim() !== ''
      && weightKg.trim() !== ''
      && trainingDaysPerWeek.trim() !== ''
      && !isSaving
  }, [ageYears, heightCm, isSaving, trainingDaysPerWeek, weightKg])

  const handleSubmit = async () => {
    const parsedAge = Number(ageYears)
    const parsedHeight = Number(heightCm)
    const parsedWeight = Number(weightKg)
    const parsedTrainingDays = Number(trainingDaysPerWeek)

    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 90) {
      setLocalError('Enter an age between 13 and 90.')
      return
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 240) {
      setLocalError('Enter a height between 120 cm and 240 cm.')
      return
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight < 35 || parsedWeight > 250) {
      setLocalError('Enter a weight between 35 kg and 250 kg.')
      return
    }

    if (!Number.isFinite(parsedTrainingDays) || parsedTrainingDays < 1 || parsedTrainingDays > 7) {
      setLocalError('Enter weekly training days between 1 and 7.')
      return
    }

    setLocalError('')

    await onSubmit({
      ageYears: Math.round(parsedAge),
      heightCm: Math.round(parsedHeight),
      weightKg: Math.round(parsedWeight),
      trainingDaysPerWeek: Math.round(parsedTrainingDays),
    })
  }

  return (
    <section className="screen-shell justify-center dq-root">
      <div className="content-stack my-auto space-y-4 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="dq-brand-static">N</div>
          <p className="dq-heading">Set up your training profile</p>
          <p className="dq-support-copy">
            Signed in as {accountEmail}. Add your baseline data so NavaFit can structure session timing with better
            personalization.
          </p>
        </div>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-heading" style={{ fontSize: '1rem' }}>Required profile fields</p>
              <p className="dq-support-copy mt-1">Enter your current baseline values.</p>
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
            <label className="dq-field text-left">
              <span className="dq-label">Age (years)</span>
              <input
                type="number"
                min={13}
                max={90}
                className="dq-input"
                value={ageYears}
                onChange={(event) => setAgeYears(event.target.value)}
                placeholder="28"
                inputMode="numeric"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Height (cm)</span>
              <input
                type="number"
                min={120}
                max={240}
                className="dq-input"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="178"
                inputMode="numeric"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Weight (kg)</span>
              <input
                type="number"
                min={35}
                max={250}
                className="dq-input"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="74"
                inputMode="decimal"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Training days per week</span>
              <input
                type="number"
                min={1}
                max={7}
                className="dq-input"
                value={trainingDaysPerWeek}
                onChange={(event) => setTrainingDaysPerWeek(event.target.value)}
                placeholder="3"
                inputMode="numeric"
              />
            </label>
          </div>

          {localError ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {localError}
            </div>
          ) : null}

          {error ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="dq-btn dq-btn-primary"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? 'Saving profile...' : 'Continue to consent'}
          </button>
        </section>
      </div>
    </section>
  )
}
