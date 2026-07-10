import { useState } from 'react'

import { ScreenPager, ScreenPage } from '../components/ScreenPager'
import type {
  BreathworkMode,
  HealthMetrics,
  PresetMode,
  SessionPreset,
  StopwatchModeConfig,
  TrainingLevel,
  TrainingProgression,
  WorkoutLog,
} from '../types'
import {
  AI_ENGINE_LABEL,
  predictRecovery,
  recommendTrainingModes,
  suggestBreathProtocol,
} from '../services/ai-engine'
import {
  isAudioCuesEnabled,
  playAudioCue,
  primeAudioCues,
  setAudioCuesEnabled,
} from '../services/audio-cues'

const UNLOCK_THRESHOLD = 30

interface PreSessionScreenProps {
  presetMode: PresetMode
  recommendedPreset: SessionPreset
  draftPreset: SessionPreset
  stopwatchMode: StopwatchModeConfig
  breathworkMode: BreathworkMode
  allStopwatchModes: readonly StopwatchModeConfig[]
  allBreathworkModes: readonly BreathworkMode[]
  progression: TrainingProgression
  health: HealthMetrics
  logs: WorkoutLog[]
  onBack: () => void
  onChangeMode: (mode: PresetMode) => void
  onUseRecommended: () => void
  onUseStandard: () => void
  onStartSession: () => void
  onChangeStopwatchMode: (level: TrainingLevel) => void
  onChangeBreathworkMode: (level: TrainingLevel) => void
}

function isLevelUnlocked(
  level: TrainingLevel,
  category: 'stopwatch' | 'breathwork',
  progression: TrainingProgression,
): boolean {
  if (level === 'novice' || level === 'intermediate') return true

  if (level === 'advanced') {
    return progression[category].intermediate >= UNLOCK_THRESHOLD
  }

  if (level === 'expert') {
    return progression[category].advanced >= UNLOCK_THRESHOLD
  }

  return false
}

function getProgressLabel(
  level: TrainingLevel,
  category: 'stopwatch' | 'breathwork',
  progression: TrainingProgression,
): string | null {
  if (level === 'advanced') {
    const count = progression[category].intermediate
    if (count >= UNLOCK_THRESHOLD) return null
    return `${count}/${UNLOCK_THRESHOLD} Intermediate sessions`
  }

  if (level === 'expert') {
    const count = progression[category].advanced
    if (count >= UNLOCK_THRESHOLD) return null
    return `${count}/${UNLOCK_THRESHOLD} Advanced sessions`
  }

  return null
}

export function PreSessionScreen({
  presetMode,
  recommendedPreset,
  draftPreset,
  stopwatchMode,
  breathworkMode,
  allStopwatchModes,
  allBreathworkModes,
  progression,
  health,
  logs,
  onBack,
  onChangeMode,
  onUseRecommended,
  onUseStandard,
  onStartSession,
  onChangeStopwatchMode,
  onChangeBreathworkMode,
}: PreSessionScreenProps) {
  const isRecommendedActive = draftPreset.id === recommendedPreset.id
  const modeRec = recommendTrainingModes(progression, health, logs)
  const recovery = predictRecovery(health, logs)
  const breathSuggestion = suggestBreathProtocol(health)
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => isAudioCuesEnabled())

  const handleToggleAudio = (nextEnabled: boolean) => {
    primeAudioCues()
    setAudioCuesEnabled(nextEnabled)
    setAudioEnabled(nextEnabled)
    if (nextEnabled) {
      playAudioCue('start')
    }
  }

  return (
    <section className="screen-shell screen-shell--paged">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="dashboard-status-chip">{presetMode === 'auto_apply' ? 'Auto Apply' : 'Suggest Only'}</div>
      </div>

      <ScreenPager ariaLabel="Pre-session tuning">
        {/* Page 1 — Tuning */}
        <ScreenPage className="screen-page--scroll">
          <article className="glass-sheet">
            <p className="section-kicker">Pre-session tuning</p>
            <h2 className="section-title mt-2">Adaptive stopwatch preset</h2>
            <p className="support-copy mt-2">
              NavaFit now calculates the next stopwatch target before the session starts, based on your latest recovery
              signals and synced workouts.
            </p>

            <div className="soft-toggle mt-4 w-full justify-between">
              <button
                type="button"
                className={presetMode === 'suggest_only' ? 'is-active' : ''}
                onClick={() => onChangeMode('suggest_only')}
              >
                Suggest Only
              </button>
              <button
                type="button"
                className={presetMode === 'auto_apply' ? 'is-active' : ''}
                onClick={() => onChangeMode('auto_apply')}
              >
                Auto Apply
              </button>
            </div>

            <div className="info-row mt-5 items-start">
              <div>
                <p className="title-font text-[1.05rem] font-medium text-[var(--text-primary)]">Audio Alerts</p>
                <p className="support-copy mt-1">
                  Tone cues for lap starts, rest intervals, breath phases, and session completion.
                </p>
              </div>
            </div>
            <div className="soft-toggle mt-3 w-full justify-between" role="group" aria-label="Audio Alerts">
              <button
                type="button"
                className={audioEnabled ? 'is-active' : ''}
                onClick={() => handleToggleAudio(true)}
                aria-pressed={audioEnabled}
              >
                On
              </button>
              <button
                type="button"
                className={!audioEnabled ? 'is-active' : ''}
                onClick={() => handleToggleAudio(false)}
                aria-pressed={!audioEnabled}
              >
                Off
              </button>
            </div>
          </article>
        </ScreenPage>

        {/* Page 2 — AI Recommendation */}
        <ScreenPage className="screen-page--scroll">
          <article className="glass-sheet cinema-surface">
            <div className="info-row items-start">
              <div>
                <p className="section-kicker">{AI_ENGINE_LABEL}</p>
                <h2 className="section-title mt-2">Today's recommendation</h2>
              </div>
              <div className="glass-card-compact ai-engine-badge px-3 py-2 text-xs text-[var(--text-secondary)]">AI</div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="glass-card-compact text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Recovery {recovery.score}%</span> — {recovery.optimalIntensity}
              </div>
              <div className="glass-card-compact text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Stopwatch:</span> {modeRec.stopwatchReason}
              </div>
              <div className="glass-card-compact text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Breathwork:</span> {modeRec.breathworkReason}
              </div>
              <div className="glass-card-compact text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Try {breathSuggestion.protocolLabel}:</span> {breathSuggestion.reason}
              </div>
            </div>
          </article>
        </ScreenPage>

        {/* Page 3 — Stopwatch mode picker */}
        <ScreenPage className="screen-page--scroll">
          <article className="glass-sheet cinema-surface">
            <p className="section-kicker">Stopwatch Training Mode</p>
            <h2 className="section-title mt-2">Choose your level</h2>

            <div className="mode-picker-grid mt-4">
              {allStopwatchModes.map((mode) => {
                const unlocked = isLevelUnlocked(mode.id, 'stopwatch', progression)
                const progressLabel = getProgressLabel(mode.id, 'stopwatch', progression)
                const isActive = stopwatchMode.id === mode.id

                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-picker-card ${isActive ? 'mode-picker-card--active' : ''} ${!unlocked ? 'mode-picker-card--locked' : ''}`}
                    onClick={() => unlocked && onChangeStopwatchMode(mode.id)}
                    disabled={!unlocked}
                  >
                    <span className="mode-picker-label">{mode.label}</span>
                    {!unlocked && <LockIcon />}
                    {mode.isAutoLap ? (
                      <span className="mode-picker-detail">
                        {mode.lapCount} laps &times; {(mode.lapDurationSeconds ?? 0) / 60}m
                      </span>
                    ) : (
                      <span className="mode-picker-detail">Manual</span>
                    )}
                    {progressLabel && !unlocked && (
                      <span className="mode-picker-progress">{progressLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </article>
        </ScreenPage>

        {/* Page 4 — Breathwork mode picker */}
        <ScreenPage className="screen-page--scroll">
          <article className="glass-sheet cinema-surface">
            <p className="section-kicker">Breathwork Training Mode</p>
            <h2 className="section-title mt-2">Choose your level</h2>

            <div className="mode-picker-grid mt-4">
              {allBreathworkModes.map((mode) => {
                const unlocked = isLevelUnlocked(mode.id, 'breathwork', progression)
                const progressLabel = getProgressLabel(mode.id, 'breathwork', progression)
                const isActive = breathworkMode.id === mode.id

                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-picker-card ${isActive ? 'mode-picker-card--active' : ''} ${!unlocked ? 'mode-picker-card--locked' : ''}`}
                    onClick={() => unlocked && onChangeBreathworkMode(mode.id)}
                    disabled={!unlocked}
                  >
                    <span className="mode-picker-label">{mode.label}</span>
                    {!unlocked && <LockIcon />}
                    <span className="mode-picker-detail">
                      {mode.protocols.length === 0
                        ? 'Guided + Manual'
                        : `${mode.protocols.length} protocols`}
                    </span>
                    {progressLabel && !unlocked && (
                      <span className="mode-picker-progress">{progressLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </article>
        </ScreenPage>

        {/* Page 5 — Recommended preset */}
        <ScreenPage
          className="screen-page--scroll"
          cta={
            <div className="button-row button-row--2">
              <button type="button" className="primary-btn primary-btn-strong" onClick={onUseRecommended}>
                {presetMode === 'auto_apply' ? 'Keep auto-applied preset' : 'Use recommended preset'}
              </button>
              <button type="button" className="secondary-btn" onClick={onUseStandard}>
                Use standard 45 min
              </button>
            </div>
          }
        >
          <article className="glass-sheet">
            <div className="info-row items-start">
              <div>
                <p className="title-font text-[1.3rem] font-medium text-[var(--text-primary)]">{recommendedPreset.title}</p>
                <p className="support-copy mt-1">{recommendedPreset.summary}</p>
              </div>
              <div className="text-right">
                <p className="metric-number-soft text-[1.9rem]">{recommendedPreset.targetMinutes}</p>
                <p className="metric-unit">min</p>
              </div>
            </div>

            <div className="metric-chip-grid mt-4">
              <PresetMetric label="Breath" value={recommendedPreset.breathPreset.label} compact />
              <PresetMetric label="Bias" value={recommendedPreset.recoveryBias} />
              <PresetMetric label="Source" value={recommendedPreset.sourceLabel} compact />
            </div>

            <div className="mt-4 space-y-2">
              {recommendedPreset.rationale.map((line) => (
                <div key={line} className="glass-card-compact text-sm text-[var(--text-secondary)]">
                  {line}
                </div>
              ))}
            </div>
          </article>
        </ScreenPage>

        {/* Page 6 — Confirm and start */}
        <ScreenPage
          className="screen-page--scroll"
          cta={
            <button type="button" className="primary-btn primary-btn-strong w-full justify-center" onClick={onStartSession}>
              Start session with this preset
            </button>
          }
        >
          <article className="glass-sheet">
            <div className="info-row">
              <div>
                <p className="title-font text-[1.2rem] font-medium text-[var(--text-primary)]">Current session draft</p>
                <p className="support-copy mt-1">
                  {isRecommendedActive
                    ? 'The adaptive recommendation is active for the next stopwatch session.'
                    : 'The standard preset is active for the next stopwatch session.'}
                </p>
              </div>
              <div className="dashboard-status-chip">{draftPreset.targetMinutes} min</div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="glass-card cinema-surface cinema-surface--sub">
                <p className="label-text">Stopwatch target</p>
                <p className="metric-number-soft mt-3">{draftPreset.targetMinutes}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{draftPreset.title}</p>
              </div>
              <div className="glass-card cinema-surface cinema-surface--sub">
                <p className="label-text">Breath cadence</p>
                <p className="metric-number-soft mt-3">{draftPreset.breathPreset.label}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {draftPreset.breathPreset.inhaleSeconds}s inhale, {draftPreset.breathPreset.holdSeconds}s hold,{' '}
                  {draftPreset.breathPreset.exhaleSeconds}s exhale
                </p>
              </div>
            </div>
          </article>
        </ScreenPage>
      </ScreenPager>
    </section>
  )
}

function PresetMetric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      <p className={`${compact ? 'metric-chip-value-compact' : 'metric-chip-value'} mt-3`}>{value}</p>
    </div>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M11.8 4.5 6.2 10l5.6 5.5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mode-picker-lock-icon">
      <rect x="5" y="9" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
