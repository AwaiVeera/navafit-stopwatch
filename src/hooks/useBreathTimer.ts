import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { playAudioCue, primeAudioCues } from '../services/audio-cues'
import { hapticBreathPhase, hapticStartPause, hapticSuccess } from '../services/haptics'
import { BreathController, type BreathSample, type BreathStatus } from '../services/breath-controller'
import type { BreathSpec, BreathState } from '../services/breath-engine'

/**
 * React binding over the tested BreathController. Owns only the rAF sampling
 * loop and cue/haptic side-effects; timing lives in the controller/engine.
 * Same React-Compiler-safe shape as useIntervalTimer (controller in state, loop
 * in a status-keyed effect).
 */

export interface BreathTimerControls {
  start(): void
  pause(): void
  resume(): void
  toggle(): void
  skip(): void
  reset(): void
  restart(): void
  end(): void
}

export interface UseBreathTimer {
  state: BreathState
  status: BreathStatus
  controls: BreathTimerControls
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const specKeyOf = (s: BreathSpec): string =>
  `${s.targetSeconds}|${s.phases.map((p) => `${p.name}:${p.durationSeconds}`).join(',')}`

export function useBreathTimer(spec: BreathSpec, onComplete?: (state: BreathState) => void): UseBreathTimer {
  const [controller, setController] = useState(() => new BreathController(spec))
  const [snapshot, setSnapshot] = useState<BreathSample>(() => controller.sample(nowMs()))

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const emitCues = useCallback((sample: BreathSample) => {
    if (!sample.transition) return
    const kind = sample.transition.kind
    if (kind === 'complete') {
      playAudioCue('breath-complete')
      hapticSuccess()
      onCompleteRef.current?.(sample.state)
      return
    }
    if (kind === 'inhale') playAudioCue('inhale')
    else if (kind === 'hold') playAudioCue('hold')
    else if (kind === 'exhale') playAudioCue('exhale')
    hapticBreathPhase(kind)
  }, [])

  useEffect(() => {
    if (snapshot.status !== 'running') return
    let raf = 0
    const loop = () => {
      const sample = controller.sample(nowMs())
      setSnapshot(sample)
      emitCues(sample)
      if (sample.status === 'running') raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [snapshot.status, controller, emitCues])

  const specKey = specKeyOf(spec)
  const lastSpecKeyRef = useRef(specKey)
  useEffect(() => {
    if (lastSpecKeyRef.current === specKey) return
    lastSpecKeyRef.current = specKey
    setController(new BreathController(spec))
  }, [specKey, spec])

  useEffect(() => {
    setSnapshot(controller.sample(nowMs()))
  }, [controller])

  const controls = useMemo<BreathTimerControls>(() => {
    const refresh = () => setSnapshot(controller.sample(nowMs()))
    return {
      start: () => {
        primeAudioCues()
        playAudioCue('breath-start')
        hapticStartPause()
        controller.start(nowMs())
        refresh()
      },
      pause: () => {
        controller.pause(nowMs())
        hapticStartPause()
        refresh()
      },
      resume: () => {
        controller.resume(nowMs())
        hapticStartPause()
        refresh()
      },
      toggle: () => {
        const status = controller.status
        if (status === 'running') {
          controller.pause(nowMs())
          hapticStartPause()
        } else if (status === 'paused') {
          controller.resume(nowMs())
          hapticStartPause()
        } else {
          primeAudioCues()
          playAudioCue('breath-start')
          hapticStartPause()
          controller.start(nowMs())
        }
        refresh()
      },
      skip: () => {
        controller.skip(nowMs())
        refresh()
      },
      reset: () => {
        controller.reset()
        refresh()
      },
      restart: () => {
        primeAudioCues()
        controller.restart(nowMs())
        refresh()
      },
      end: () => {
        controller.end(nowMs())
        refresh()
      },
    }
  }, [controller])

  return { state: snapshot.state, status: snapshot.status, controls }
}
