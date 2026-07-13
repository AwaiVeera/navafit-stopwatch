import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useBreathTimer } from '../hooks/useBreathTimer'
import type { BreathSpec, BreathState } from '../services/breath-engine'
import {
  acknowledgeFoundation,
  hasAcknowledgedFoundation,
} from '../services/breath-foundation'
import {
  BREATH_DURATIONS,
  BREATH_LEVELS,
  DEFAULT_BREATH_DURATION,
  getBreathLevel,
} from '../services/breath-levels'
import { formatElapsed } from '../services/format-time'
import type {
  BreathworkMode,
  HealthMetrics,
  SessionPreset,
  SessionSavePayload,
  TrainingLevel,
} from '../types'
import { BreathControls } from './breath/BreathControls'
import { BreathFoundation } from './breath/BreathFoundation'
import { BreathOrb } from './breath/BreathOrb'

const MIN_BREATH_SAVE_DURATION_MS = 5_000

type Stage = 'foundation' | 'setup' | 'session'

interface BreathScreenProps {
  health: HealthMetrics
  sessionPreset: SessionPreset
  breathworkMode: BreathworkMode
  onBack: () => void
  onSaveSession?: (session: SessionSavePayload) => Promise<void> | void
}

export function BreathScreen({ sessionPreset, breathworkMode, onBack, onSaveSession }: BreathScreenProps) {
  const [stage, setStage] = useState<Stage>(() =>
    breathworkMode.id === 'novice' && !hasAcknowledgedFoundation() ? 'foundation' : 'setup',
  )
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel>(breathworkMode.id)
  const level = getBreathLevel(selectedLevel)
  const [protocolId, setProtocolId] = useState(() => level.protocols[0]?.id ?? '')
  const [durationSeconds, setDurationSeconds] = useState<number>(DEFAULT_BREATH_DURATION)

  const protocol = useMemo(
    () => level.protocols.find((p) => p.id === protocolId) ?? level.protocols[0],
    [level, protocolId],
  )

  const spec = useMemo<BreathSpec>(
    () => ({ phases: protocol?.phases ?? [], targetSeconds: durationSeconds }),
    [protocol, durationSeconds],
  )

  const savedRef = useRef(false)
  const startedAtRef = useRef<string | null>(null)
  const latestStateRef = useRef<BreathState | null>(null)

  const save = useCallback(
    (state: BreathState) => {
      if (!onSaveSession) return
      if (savedRef.current) return
      if (state.totalElapsedMs < MIN_BREATH_SAVE_DURATION_MS) return
      savedRef.current = true

      const endedAt = new Date().toISOString()
      const startedAt =
        startedAtRef.current ?? new Date(Date.now() - state.totalElapsedMs).toISOString()

      void onSaveSession({
        title: `${protocol?.label ?? 'Breathwork'} Breathwork`,
        note: `${level.label} breathwork · ${protocol?.label ?? ''}`,
        durationMinutes: Math.max(1, Math.round(state.totalElapsedMs / 60_000)),
        startedAt,
        endedAt,
        source: 'app',
        metadata: {
          presetId: sessionPreset.id,
          breathLevel: selectedLevel,
          protocol: protocol?.id,
          durationSeconds,
          cyclesCompleted: state.cycleIndex,
          completed: state.isComplete,
        },
      })
    },
    [onSaveSession, sessionPreset.id, protocol, level.label, selectedLevel, durationSeconds],
  )

  const { state, status, controls } = useBreathTimer(spec, save)

  useEffect(() => {
    latestStateRef.current = state
    if (status === 'running' && startedAtRef.current === null) {
      startedAtRef.current = new Date(Date.now() - state.totalElapsedMs).toISOString()
    }
  }, [state, status])

  useEffect(() => {
    savedRef.current = false
    startedAtRef.current = null
  }, [spec])

  useEffect(() => {
    return () => {
      if (latestStateRef.current) save(latestStateRef.current)
    }
  }, [save])

  const handleSelectLevel = (lvl: TrainingLevel) => {
    setSelectedLevel(lvl)
    setProtocolId(getBreathLevel(lvl).protocols[0]?.id ?? '')
  }

  const handleAcknowledge = () => {
    acknowledgeFoundation()
    setStage('setup')
  }

  const handleBegin = () => {
    setStage('session')
    controls.start()
  }

  const handleExitSession = () => {
    controls.reset()
    setStage('setup')
  }

  return (
    <section className="screen-shell breath-screen">
      <div className="sw-head">
        <button
          type="button"
          className="sw-back"
          onClick={stage === 'session' ? handleExitSession : onBack}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <p className="section-kicker">Breathwork</p>
          <h2 className="section-title">{stage === 'session' ? (protocol?.label ?? 'Session') : 'Guided breathing'}</h2>
        </div>
      </div>

      {stage === 'foundation' && <BreathFoundation onAcknowledge={handleAcknowledge} />}

      {stage === 'setup' && (
        <div className="breath-setup content-stack">
          <div className="breath-choice">
            <p className="breath-choice-label">Level</p>
            <div className="breath-chip-row">
              {BREATH_LEVELS.map((lvl) => (
                <button
                  key={lvl.level}
                  type="button"
                  className={`breath-chip${lvl.level === selectedLevel ? ' breath-chip--active' : ''}`}
                  onClick={() => handleSelectLevel(lvl.level)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="breath-choice">
            <p className="breath-choice-label">Protocol</p>
            <div className="breath-chip-row breath-chip-row--wrap">
              {level.protocols.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`breath-chip${p.id === protocolId ? ' breath-chip--active' : ''}`}
                  onClick={() => setProtocolId(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {protocol && (
            <p className="breath-protocol-desc">{protocol.description}</p>
          )}
          {protocol?.safetyWarning && (
            <p className="breath-safety" role="note">{protocol.safetyWarning}</p>
          )}

          <div className="breath-choice">
            <p className="breath-choice-label">Duration</p>
            <div className="breath-chip-row">
              {BREATH_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`breath-chip${d === durationSeconds ? ' breath-chip--active' : ''}`}
                  onClick={() => setDurationSeconds(d)}
                >
                  {d / 60} min
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="sw-btn sw-btn-primary"
            onClick={handleBegin}
            disabled={!protocol}
          >
            Start session
          </button>
        </div>
      )}

      {stage === 'session' && (
        <div className="breath-session">
          <div className="breath-session-body">
            <BreathOrb state={state} />
            {state.isComplete ? (
              <div className="breath-summary" role="status">
                <p className="breath-summary-title">Well done</p>
                <p className="breath-summary-line">
                  {state.totalCycles} cycles · {formatElapsed(state.totalElapsedMs)}
                </p>
              </div>
            ) : (
              <>
                <p className="breath-instruction">{state.instruction}</p>
                <p className="breath-cycle">Cycle {state.cycleIndex} / {state.totalCycles}</p>
              </>
            )}
          </div>
          <BreathControls status={status} controls={controls} onExit={handleExitSession} />
        </div>
      )}
    </section>
  )
}
