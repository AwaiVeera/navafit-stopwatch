import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { playAudioCue, primeAudioCues } from '../services/audio-cues'
import { hapticLap, hapticStartPause, hapticSuccess, hapticTap } from '../services/haptics'
import { IntervalTimerController, type TimerSample, type TimerStatus } from '../services/interval-controller'
import type { IntervalSpec, SessionState } from '../services/timer-engine'

/**
 * React binding over the tested IntervalTimerController. This layer owns only
 * the rAF sampling loop and cue/haptic side-effects; all timing correctness
 * lives in the controller/engine (unit-tested). Audio is primed inside `start`
 * because that runs from a user gesture, satisfying iOS autoplay unlock.
 *
 * The loop lives in an effect keyed on run status (not a render-time ref), so it
 * complies with the React Compiler ref rules and self-heals on unmount.
 */

export interface IntervalTimerControls {
  start(): void
  pause(): void
  resume(): void
  toggle(): void
  skip(): void
  reset(): void
  end(): void
}

export interface UseIntervalTimer {
  state: SessionState
  status: TimerStatus
  controls: IntervalTimerControls
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const specKeyOf = (s: IntervalSpec): string =>
  `${s.prepSeconds}|${s.rounds}|${s.workSeconds}|${s.restSeconds}`

export function useIntervalTimer(
  spec: IntervalSpec,
  onComplete?: (state: SessionState) => void,
): UseIntervalTimer {
  const [controller, setController] = useState(() => new IntervalTimerController(spec))
  const [snapshot, setSnapshot] = useState<TimerSample>(() => controller.sample(nowMs()))

  const onCompleteRef = useRef(onComplete)
  const lastTickSecondRef = useRef(-1)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const emitCues = useCallback((sample: TimerSample) => {
    if (sample.transition) {
      lastTickSecondRef.current = -1 // fresh countdown window per phase
      const to = sample.transition.to
      if (to === 'work') {
        playAudioCue('interval-start')
        hapticLap()
      } else if (to === 'rest') {
        playAudioCue('interval-end')
        hapticLap()
      } else if (to === 'complete') {
        playAudioCue('complete')
        hapticSuccess()
        onCompleteRef.current?.(sample.state)
      }
    }

    // Final-seconds countdown ticks during prep/work (last 3 whole seconds).
    const remainingSec = Math.ceil(sample.state.phaseRemainingMs / 1000)
    const inCountdownPhase = sample.state.phase === 'prep' || sample.state.phase === 'work'
    if (
      !sample.state.isComplete &&
      inCountdownPhase &&
      remainingSec >= 1 &&
      remainingSec <= 3 &&
      remainingSec !== lastTickSecondRef.current
    ) {
      lastTickSecondRef.current = remainingSec
      playAudioCue('countdown-tick')
    }
  }, [])

  // rAF sampling loop, active only while running.
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

  // Rebuild the controller when the spec changes (e.g. level switch).
  const specKey = specKeyOf(spec)
  const lastSpecKeyRef = useRef(specKey)
  useEffect(() => {
    if (lastSpecKeyRef.current === specKey) return
    lastSpecKeyRef.current = specKey
    lastTickSecondRef.current = -1
    setController(new IntervalTimerController(spec))
  }, [specKey, spec])

  // Reflect a freshly-built controller into the snapshot.
  useEffect(() => {
    setSnapshot(controller.sample(nowMs()))
  }, [controller])

  const controls = useMemo<IntervalTimerControls>(() => {
    const refresh = () => setSnapshot(controller.sample(nowMs()))
    return {
      start: () => {
        primeAudioCues()
        playAudioCue('start')
        hapticStartPause()
        controller.start(nowMs())
        refresh()
      },
      pause: () => {
        controller.pause(nowMs())
        playAudioCue('pause')
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
          playAudioCue('pause')
          hapticStartPause()
        } else if (status === 'paused') {
          controller.resume(nowMs())
          hapticStartPause()
        } else {
          primeAudioCues()
          playAudioCue('start')
          hapticStartPause()
          controller.start(nowMs())
        }
        refresh()
      },
      skip: () => {
        controller.skip(nowMs())
        hapticTap()
        refresh()
      },
      reset: () => {
        controller.reset()
        lastTickSecondRef.current = -1
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
