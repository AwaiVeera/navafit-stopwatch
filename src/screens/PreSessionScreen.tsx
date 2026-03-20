import type {
  PresetMode,
  SessionPreset,
} from '../types'

interface PreSessionScreenProps {
  presetMode: PresetMode
  recommendedPreset: SessionPreset
  draftPreset: SessionPreset
  onBack: () => void
  onChangeMode: (mode: PresetMode) => void
  onUseRecommended: () => void
  onUseStandard: () => void
  onStartSession: () => void
}

export function PreSessionScreen({
  presetMode,
  recommendedPreset,
  draftPreset,
  onBack,
  onChangeMode,
  onUseRecommended,
  onUseStandard,
  onStartSession,
}: PreSessionScreenProps) {
  const isRecommendedActive = draftPreset.id === recommendedPreset.id

  return (
    <section className="screen-shell">
      <div className="top-chrome">
        <button type="button" className="round-icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="dashboard-status-chip">{presetMode === 'auto_apply' ? 'Auto Apply' : 'Suggest Only'}</div>
      </div>

      <div className="content-stack space-y-4">
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
        </article>

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
            <PresetMetric label="Breath" value={recommendedPreset.breathPreset.label} />
            <PresetMetric label="Bias" value={recommendedPreset.recoveryBias} />
            <PresetMetric label="Source" value={recommendedPreset.sourceLabel} />
          </div>

          <div className="mt-4 space-y-2">
            {recommendedPreset.rationale.map((line) => (
              <div key={line} className="glass-card-compact text-sm text-[var(--text-secondary)]">
                {line}
              </div>
            ))}
          </div>

          <div className="button-row mt-5">
            <button type="button" className="primary-btn primary-btn-strong" onClick={onUseRecommended}>
              {presetMode === 'auto_apply' ? 'Keep auto-applied preset' : 'Use recommended preset'}
            </button>
            <button type="button" className="secondary-btn" onClick={onUseStandard}>
              Use standard 45 min
            </button>
          </div>
        </article>

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
            <div className="glass-card">
              <p className="label-text">Stopwatch target</p>
              <p className="metric-number-soft mt-3">{draftPreset.targetMinutes}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{draftPreset.title}</p>
            </div>
            <div className="glass-card">
              <p className="label-text">Breath cadence</p>
              <p className="metric-number-soft mt-3">{draftPreset.breathPreset.label}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {draftPreset.breathPreset.inhaleSeconds}s inhale, {draftPreset.breathPreset.holdSeconds}s hold,{' '}
                {draftPreset.breathPreset.exhaleSeconds}s exhale
              </p>
            </div>
          </div>

          <button type="button" className="primary-btn primary-btn-strong mt-5 w-full justify-center" onClick={onStartSession}>
            Start session with this preset
          </button>
        </article>
      </div>
    </section>
  )
}

function PresetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-chip">
      <p className="metric-chip-label">{label}</p>
      <p className="mt-3 text-sm leading-snug text-[var(--text-primary)]">{value}</p>
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
