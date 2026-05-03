import { useEffect, useRef, useState } from 'react'

import { getAudioVolume, setAudioVolume } from '../services/audio-cues'
import type { HealthMetrics, SyncStatus, UserConsentRecord } from '../types'

interface SettingsScreenProps {
  accountEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  health: HealthMetrics
  healthAppStatus: SyncStatus
  watchStatus: SyncStatus
  onDisconnectWatch: () => void
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
  watchStatus,
  onDisconnectWatch,
  isTelemetrySyncing,
  onSyncTelemetry,
  consentRecord,
  onUpdateConsent,
  onOpenBiometrics,
  onDeleteAccount,
}: SettingsScreenProps) {
  const [volume, setVolume] = useState(() => getAudioVolume())
  const [healthSync, setHealthSync] = useState(Boolean(consentRecord?.acceptedHealthSyncAt))
  const [usageAnalytics, setUsageAnalytics] = useState(Boolean(consentRecord?.acceptedUsageAnalyticsAt))
  const [watchAnimating, setWatchAnimating] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const watchAnimRef = useRef<number | null>(null)
  const [prevConsentRecord, setPrevConsentRecord] = useState(consentRecord)
  if (prevConsentRecord !== consentRecord) {
    setPrevConsentRecord(consentRecord)
    setHealthSync(Boolean(consentRecord?.acceptedHealthSyncAt))
    setUsageAnalytics(Boolean(consentRecord?.acceptedUsageAnalyticsAt))
  }

  useEffect(() => {
    return () => {
      if (watchAnimRef.current !== null) window.clearTimeout(watchAnimRef.current)
    }
  }, [])

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value)
    setVolume(value)
    setAudioVolume(value)
  }

  const handleDisconnectWatch = () => {
    setWatchAnimating(true)
    setIsDisconnecting(true)
    if (watchAnimRef.current !== null) window.clearTimeout(watchAnimRef.current)
    watchAnimRef.current = window.setTimeout(() => {
      setWatchAnimating(false)
      setIsDisconnecting(false)
      onDisconnectWatch()
    }, 480)
  }

  const handleHealthSyncToggle = async () => {
    const next = !healthSync
    setHealthSync(next)
    await onUpdateConsent({ acceptsHealthSync: next, acceptsUsageAnalytics: usageAnalytics })
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

  const watchConnected = watchStatus === 'ready'
  const watchLabel = watchStatus === 'ready' ? 'Connected' : watchStatus === 'syncing' ? 'Syncing…' : watchStatus === 'unavailable' ? 'Unavailable' : 'Disconnected'

  const stepsUnavailableCopy =
    healthAppStatus === 'unavailable'
      ? 'Apple Health steps are only available in the native iPhone app.'
      : !healthSync
        ? 'Turn on Apple Health sync below to load today’s steps.'
        : healthAppStatus === 'error'
          ? 'Health sync hit an error. Tap Sync below to try again.'
          : 'Tap Sync below to refresh. If steps stay blank, open the Health app and allow Steps for NavaFit.'

  return (
    <section className="screen-shell settings-screen">
      <div className="top-chrome">
        <p className="title-font text-[1.4rem] font-semibold text-[var(--text-primary)]">Settings</p>
      </div>

      <div className="content-stack space-y-4">

        {/* ── Account ── */}
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

        {/* ── Daily activity (profile) ── */}
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

        {/* ── Sound ── */}
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

        {/* ── Apple Watch ── */}
        <section className="glass-sheet cinema-surface space-y-4">
          <p className="label-text">Apple Watch</p>
          <div className="info-row items-center">
            <div className="flex items-center gap-3">
              <div className={`watch-status-dot ${watchConnected ? 'watch-status-dot--connected' : 'watch-status-dot--disconnected'} ${watchAnimating ? 'watch-status-dot--animating' : ''}`} />
              <div>
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">{watchLabel}</p>
                <p className="support-copy mt-0.5">
                  {watchConnected ? 'Health data flowing in' : 'Pair via Apple Health app'}
                </p>
              </div>
            </div>
            {watchConnected && (
              <button
                type="button"
                className={`secondary-btn ${watchAnimating ? 'settings-btn--shake' : ''}`}
                onClick={handleDisconnectWatch}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            )}
          </div>
        </section>

        {/* ── Sync ── */}
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
            label="Apple Health Sync"
            description="Read heart rate, steps, workouts, and readiness from Apple Health"
            checked={healthSync}
            onChange={() => void handleHealthSyncToggle()}
          />

          <ToggleRow
            label="Usage Analytics"
            description="Help improve NavaFit with anonymous screen and feature usage data"
            checked={usageAnalytics}
            onChange={() => void handleAnalyticsToggle()}
          />
        </section>

        {/* ── Biometrics ── */}
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

        {/* ── Danger zone ── */}
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

      </div>

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
