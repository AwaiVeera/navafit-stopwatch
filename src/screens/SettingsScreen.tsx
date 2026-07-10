import { useState } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

import { ScreenPager, ScreenPage } from '../components/ScreenPager'
import { getAudioVolume, setAudioVolume } from '../services/audio-cues'
import { getStoredTheme, setTheme, type ThemeMode } from '../services/theme'
import type { HealthMetrics, SyncStatus, UserConsentRecord } from '../types'

interface SettingsScreenProps {
  accountEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  health: HealthMetrics
  healthAppStatus: SyncStatus
  isTelemetrySyncing: boolean
  onSyncTelemetry: () => void
  consentRecord: UserConsentRecord | null
  onUpdateConsent: (submission: { acceptsHealthSync: boolean; acceptsUsageAnalytics: boolean }) => Promise<void>
  onOpenBiometrics: () => void
  onDeleteAccount: () => Promise<void>
}

export function SettingsScreen({
  accountEmail,
  onSignOut,
  isSigningOut,
  health,
  healthAppStatus,
  isTelemetrySyncing,
  onSyncTelemetry,
  consentRecord,
  onUpdateConsent,
  onOpenBiometrics,
  onDeleteAccount,
}: SettingsScreenProps) {
  const [volume, setVolume] = useState(() => getAudioVolume())
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme())
  const [healthSync, setHealthSync] = useState(Boolean(consentRecord?.acceptedHealthSyncAt))
  const [usageAnalytics, setUsageAnalytics] = useState(Boolean(consentRecord?.acceptedUsageAnalyticsAt))
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [prevConsentRecord, setPrevConsentRecord] = useState(consentRecord)
  if (prevConsentRecord !== consentRecord) {
    setPrevConsentRecord(consentRecord)
    setHealthSync(Boolean(consentRecord?.acceptedHealthSyncAt))
    setUsageAnalytics(Boolean(consentRecord?.acceptedUsageAnalyticsAt))
  }

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value)
    setVolume(value)
    setAudioVolume(value)
  }

  const handleThemeSelect = (next: ThemeMode) => {
    setThemeState(next)
    setTheme(next)
  }

  const handleHealthSyncToggle = async () => {
    const next = !healthSync
    setHealthSync(next)
    await onUpdateConsent({ acceptsHealthSync: next, acceptsUsageAnalytics: usageAnalytics })
    if (next) {
      onSyncTelemetry()
    }
  }

  const handleAnalyticsToggle = async () => {
    const next = !usageAnalytics
    setUsageAnalytics(next)
    await onUpdateConsent({ acceptsHealthSync: healthSync, acceptsUsageAnalytics: next })
  }

  const openDeleteDialog = () => {
    setDeleteConfirmText('')
    setDeleteError('')
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    if (isDeleting) return
    setIsDeleteDialogOpen(false)
    setDeleteConfirmText('')
    setDeleteError('')
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.')
      return
    }
    setIsDeleting(true)
    setDeleteError('')
    try {
      await onDeleteAccount()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete account. Try again.'
      setDeleteError(message)
      setIsDeleting(false)
      return
    }
    setIsDeleting(false)
    setIsDeleteDialogOpen(false)
  }

  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const healthProviderLabel = isAndroidNative ? 'Health Connect' : 'Apple Health'
  const shouldShowInstallHealthConnect =
    isAndroidNative && (healthAppStatus === 'unavailable' || healthAppStatus === 'error')

  const stepsUnavailableCopy =
    healthAppStatus === 'unavailable'
      ? isAndroidNative
        ? 'Health Connect is not installed or not available yet. Install it, then tap Sync.'
        : 'Apple Health steps are only available in the native iPhone app.'
      : !healthSync
        ? `Turn on ${healthProviderLabel} sync below to load today’s steps.`
        : healthAppStatus === 'error'
          ? `${healthProviderLabel} sync hit an error. Tap Sync below to try again.`
          : `Tap Sync below to refresh. If steps stay blank, open ${healthProviderLabel} and allow Steps for NavaFit.`

  const handleInstallHealthConnect = async () => {
    await Browser.open({
      url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata',
    })
  }

  return (
    <section className="screen-shell settings-screen screen-shell--paged">
      <div className="top-chrome">
        <p className="title-font text-[1.4rem] font-semibold text-[var(--text-primary)]">Settings</p>
      </div>

      <ScreenPager ariaLabel="Settings">
        {/* Page 1 — Account + activity */}
        <ScreenPage className="screen-page--scroll">
          <section className="glass-sheet cinema-surface space-y-4">
            <p className="label-text">Account</p>
            <div className="info-row items-center">
              <div>
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">{accountEmail}</p>
                <p className="support-copy mt-1">Supabase session active</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={onSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>

          <section className="glass-sheet cinema-surface space-y-4" aria-labelledby="daily-activity-heading">
            <p id="daily-activity-heading" className="label-text">
              Daily activity
            </p>
            <div className="space-y-3">
              <div>
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">Steps walked today</p>
                {health.stepsToday !== null ? (
                  <p className="hud-font mt-1 text-2xl tabular-nums text-[var(--accent-primary)]">
                    {health.stepsToday.toLocaleString()}
                  </p>
                ) : (
                  <p className="support-copy mt-1">{stepsUnavailableCopy}</p>
                )}
              </div>
              <p className="support-copy rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                Drink enough water throughout the day.
              </p>
            </div>
          </section>
        </ScreenPage>

        {/* Page 2 — Sound + Appearance */}
        <ScreenPage className="screen-page--scroll">
          <section className="glass-sheet cinema-surface space-y-4">
            <div className="info-row">
              <p className="label-text">Sound</p>
              <p className="hud-font text-sm text-[var(--accent-primary)]">{Math.round(volume * 100)}%</p>
            </div>
            <div className="settings-slider-row">
              <SoftIcon />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="settings-volume-slider"
                aria-label="Audio volume"
              />
              <LoudIcon />
            </div>
            <p className="support-copy">
              Controls bell rings, chimes, and breathwork hymn volume.
            </p>
          </section>

          <section className="glass-sheet cinema-surface space-y-4">
            <p className="label-text">Appearance</p>
            <div className="theme-toggle-group" role="group" aria-label="App theme">
              <button
                type="button"
                className={`theme-toggle-option ${theme === 'dark' ? 'theme-toggle-option--active' : ''}`}
                aria-pressed={theme === 'dark'}
                onClick={() => handleThemeSelect('dark')}
              >
                Cosmic dark
              </button>
              <button
                type="button"
                className={`theme-toggle-option ${theme === 'light' ? 'theme-toggle-option--active' : ''}`}
                aria-pressed={theme === 'light'}
                onClick={() => handleThemeSelect('light')}
              >
                White screen
              </button>
            </div>
            <p className="support-copy">
              Switch between the cosmic dark theme and a bright white screen mode.
            </p>
          </section>
        </ScreenPage>

        {/* Page 3 — Sync & privacy */}
        <ScreenPage className="screen-page--scroll">
          <section className="glass-sheet cinema-surface space-y-4">
            <div className="info-row">
              <p className="label-text">Sync & Privacy</p>
              <button
                type="button"
                onClick={onSyncTelemetry}
                disabled={isTelemetrySyncing}
                className="round-icon-btn-soft"
                aria-label="Sync now"
              >
                <SyncIcon spinning={isTelemetrySyncing} />
              </button>
            </div>

            <ToggleRow
              label={`${healthProviderLabel} Sync`}
              description={`Read heart rate, steps, workouts, and readiness from ${healthProviderLabel}`}
              checked={healthSync}
              onChange={() => void handleHealthSyncToggle()}
            />

            <ToggleRow
              label="Usage Analytics"
              description="Help improve NavaFit with anonymous screen and feature usage data"
              checked={usageAnalytics}
              onChange={() => void handleAnalyticsToggle()}
            />

            {shouldShowInstallHealthConnect && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => void handleInstallHealthConnect()}
              >
                Install Health Connect
              </button>
            )}
          </section>
        </ScreenPage>

        {/* Page 4 — Biometrics + danger zone */}
        <ScreenPage className="screen-page--scroll">
          <section className="glass-sheet cinema-surface">
            <button
              type="button"
              className="info-row w-full text-left"
              onClick={onOpenBiometrics}
            >
              <div>
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">Biometrics</p>
                <p className="support-copy mt-1">Body report, recovery score, and readiness metrics</p>
              </div>
              <ChevronIcon />
            </button>
          </section>

          <section className="glass-sheet cinema-surface space-y-3" aria-labelledby="danger-zone-heading">
            <p id="danger-zone-heading" className="label-text">
              Danger zone
            </p>
            <div className="info-row items-center">
              <div className="flex-1 pr-3">
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">Delete account</p>
                <p className="support-copy mt-1">
                  Permanently removes your NavaFit account, sessions, and synced health data. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="settings-danger-btn"
                onClick={openDeleteDialog}
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </section>
        </ScreenPage>
      </ScreenPager>

      {isDeleteDialogOpen && (
        <div
          className="settings-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="settings-modal-card glass-sheet cinema-surface">
            <p id="delete-account-title" className="title-font text-[1.2rem] font-semibold text-[var(--text-primary)]">
              Delete your account?
            </p>
            <p className="support-copy mt-2">
              This permanently removes your sessions, telemetry, and consent records from NavaFit. To confirm, type
              {' '}
              <span className="hud-font text-[var(--accent-primary)]">DELETE</span>
              {' '}
              below.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="DELETE"
              className="settings-modal-input mt-4"
              aria-label="Type DELETE to confirm"
              disabled={isDeleting}
            />
            {deleteError && (
              <p className="support-copy mt-2 text-[var(--accent-warning,#f87171)]">{deleteError}</p>
            )}
            <div className="settings-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-danger-btn"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="info-row items-start gap-3">
      <div className="flex-1">
        <p className="title-font text-[1rem] font-medium text-[var(--text-primary)]">{label}</p>
        <p className="support-copy mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}`}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  )
}

function SoftIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6] shrink-0 text-[var(--text-muted)]">
      <circle cx="8" cy="10" r="3" />
      <path d="M11 10h2" />
    </svg>
  )
}

function LoudIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6] shrink-0 text-[var(--text-secondary)]">
      <path d="M3 7.5v5l3.5 2V5.5L3 7.5ZM9.5 7a4.5 4.5 0 0 1 0 6M12 4.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6] text-[var(--text-muted)] shrink-0">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  )
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-4 w-4 fill-none stroke-current stroke-[1.6] ${spinning ? 'animate-spin' : ''}`}
    >
      <path d="M17 10a7 7 0 1 1-1.8-4.7M17 3v3.3h-3.3" />
    </svg>
  )
}
