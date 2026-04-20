/**
 * Audio cue service using the Web Audio API.
 *
 * Design constraints:
 * - Zero external assets. All cues are generated from short oscillator tones.
 * - Fire-and-forget and safe: never throws, never blocks the timer loops.
 * - Respects a user-controlled enable/disable preference stored in localStorage.
 * - iOS WebView requires a user gesture to unlock the AudioContext; callers
 *   should invoke `primeAudioCues()` from a user-initiated handler (e.g. the
 *   Start / Begin buttons). Before priming, `playAudioCue()` is a no-op.
 */

export type AudioCue =
  | 'start'
  | 'pause'
  | 'lap'
  | 'interval-start'
  | 'interval-end'
  | 'complete'
  | 'inhale'
  | 'hold'
  | 'exhale'

const AUDIO_PREFERENCE_KEY = 'navafit:audio-cues-enabled'

type WindowWithAudio = typeof window & {
  webkitAudioContext?: typeof AudioContext
}

let cachedContext: AudioContext | null = null
let isPrimed = false

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as WindowWithAudio
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function ensureContext(): AudioContext | null {
  if (cachedContext) return cachedContext
  const Ctor = getAudioContextCtor()
  if (!Ctor) return null
  try {
    cachedContext = new Ctor()
    return cachedContext
  } catch {
    return null
  }
}

/**
 * Must be called from a user gesture handler to unlock audio playback on iOS.
 * Subsequent `playAudioCue` calls will produce sound only after this succeeds.
 */
export function primeAudioCues(): void {
  const ctx = ensureContext()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined)
    }
    isPrimed = true
  } catch {
    // Ignore; remain unprimed.
  }
}

export function isAudioCuesEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(AUDIO_PREFERENCE_KEY)
    // Default ON when not yet set so first-time users hear feedback.
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

export function setAudioCuesEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUDIO_PREFERENCE_KEY, enabled ? 'true' : 'false')
  } catch {
    // Ignore storage write failures.
  }
}

interface ToneSpec {
  frequency: number
  durationMs: number
  type?: OscillatorType
  peakGain?: number
}

function scheduleTone(ctx: AudioContext, spec: ToneSpec, startOffsetSec: number): void {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const startAt = ctx.currentTime + startOffsetSec
    const durationSec = spec.durationMs / 1000
    const peak = spec.peakGain ?? 0.18

    osc.type = spec.type ?? 'sine'
    osc.frequency.setValueAtTime(spec.frequency, startAt)

    // Fast attack + exponential decay envelope to avoid clicks.
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startAt)
    osc.stop(startAt + durationSec + 0.02)
  } catch {
    // Ignore scheduling errors so timers never break.
  }
}

const CUE_PATTERNS: Record<AudioCue, ToneSpec[]> = {
  start: [{ frequency: 880, durationMs: 140 }],
  pause: [{ frequency: 440, durationMs: 160 }],
  lap: [
    { frequency: 1320, durationMs: 90 },
    { frequency: 1320, durationMs: 90 },
  ],
  'interval-start': [
    { frequency: 660, durationMs: 110 },
    { frequency: 520, durationMs: 140 },
  ],
  'interval-end': [
    { frequency: 760, durationMs: 110 },
    { frequency: 1000, durationMs: 140 },
  ],
  complete: [
    { frequency: 784, durationMs: 130 },
    { frequency: 988, durationMs: 130 },
    { frequency: 1319, durationMs: 220 },
  ],
  inhale: [{ frequency: 620, durationMs: 180, type: 'triangle' }],
  hold: [{ frequency: 820, durationMs: 150, type: 'triangle' }],
  exhale: [{ frequency: 420, durationMs: 220, type: 'triangle' }],
}

const CUE_STEP_SECONDS = 0.12

export function playAudioCue(cue: AudioCue): void {
  if (!isPrimed) return
  if (!isAudioCuesEnabled()) return
  const ctx = ensureContext()
  if (!ctx) return

  const pattern = CUE_PATTERNS[cue]
  if (!pattern) return

  for (let index = 0; index < pattern.length; index += 1) {
    scheduleTone(ctx, pattern[index], index * CUE_STEP_SECONDS)
  }
}

// Test-only helpers. Not part of the public runtime contract.
export const __audioCuesTestInternals = {
  reset(): void {
    cachedContext = null
    isPrimed = false
  },
  isPrimed(): boolean {
    return isPrimed
  },
  getPatterns(): typeof CUE_PATTERNS {
    return CUE_PATTERNS
  },
}
