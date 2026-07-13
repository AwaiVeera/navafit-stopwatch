import { useCallback, useEffect, useMemo, useRef } from 'react'

import { ScreenPager, ScreenPage } from '../components/ScreenPager'
import { useIntervalTimer } from '../hooks/useIntervalTimer'
import { intervalSpecFromMode } from '../services/interval-presets'
import type { SessionState } from '../services/timer-engine'
import type { SessionPreset, SessionSavePayload, StopwatchModeConfig, WeatherSnapshot } from '../types'
import { ChronometerFace } from './stopwatch/ChronometerFace'
import { DigitalFace } from './stopwatch/DigitalFace'
import { StopwatchControls } from './stopwatch/StopwatchControls'

const MIN_SAVE_DURATION_MS = 5_000

interface StopwatchScreenProps {
  onBack: () => void
  weatherSnapshot: WeatherSnapshot
  heartRate: number
  sessionPreset: SessionPreset
  stopwatchMode: StopwatchModeConfig
  onSaveSession: (session: SessionSavePayload) => Promise<void> | void
}

export function StopwatchScreen({
  onBack,
  sessionPreset,
  stopwatchMode,
  onSaveSession,
}: StopwatchScreenProps) {
  const spec = useMemo(() => intervalSpecFromMode(stopwatchMode), [stopwatchMode])

  const savedRef = useRef(false)
  const startedAtRef = useRef<string | null>(null)
  const latestStateRef = useRef<SessionState | null>(null)

  const save = useCallback(
    (state: SessionState) => {
      if (savedRef.current) return
      if (state.totalElapsedMs < MIN_SAVE_DURATION_MS) return
      savedRef.current = true

      const endedAt = new Date().toISOString()
      const startedAt =
        startedAtRef.current ?? new Date(Date.now() - state.totalElapsedMs).toISOString()

      void onSaveSession({
        title: sessionPreset.title,
        note: `${stopwatchMode.label} interval session using the ${sessionPreset.breathPreset.label}.`,
        durationMinutes: Math.max(1, Math.round(state.totalElapsedMs / 60_000)),
        startedAt,
        endedAt,
        source: 'app',
        metadata: {
          presetId: sessionPreset.id,
          presetTitle: sessionPreset.title,
          presetTargetMinutes: sessionPreset.targetMinutes,
          breathPreset: sessionPreset.breathPreset.label,
          stopwatchMode: stopwatchMode.id,
          rounds: spec.rounds,
          completed: state.isComplete,
        },
      })
    },
    [onSaveSession, sessionPreset, stopwatchMode, spec.rounds],
  )

  const { state, status, controls } = useIntervalTimer(spec, save)

  // Track the latest state and capture the real start time on first run.
  useEffect(() => {
    latestStateRef.current = state
    if (status === 'running' && startedAtRef.current === null) {
      startedAtRef.current = new Date(Date.now() - state.totalElapsedMs).toISOString()
    }
  }, [state, status])

  // New session when the spec changes → allow a fresh save.
  useEffect(() => {
    savedRef.current = false
    startedAtRef.current = null
  }, [spec])

  // Persist a partial session if the user leaves mid-way.
  useEffect(() => {
    return () => {
      if (latestStateRef.current) save(latestStateRef.current)
    }
  }, [save])

  return (
    <section className="screen-shell screen-shell--paged sw-screen">
      <div className="sw-head">
        <button type="button" className="sw-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <p className="section-kicker">{stopwatchMode.label} · Interval</p>
          <h2 className="section-title">{sessionPreset.title}</h2>
        </div>
      </div>

      <ScreenPager ariaLabel="Stopwatch interfaces">
        <ScreenPage>
          <div className="sw-face-wrap">
            <ChronometerFace state={state} status={status} />
          </div>
        </ScreenPage>
        <ScreenPage>
          <div className="sw-face-wrap">
            <DigitalFace state={state} status={status} spec={spec} />
          </div>
        </ScreenPage>
      </ScreenPager>

      <StopwatchControls status={status} controls={controls} />
    </section>
  )
}
