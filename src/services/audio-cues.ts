/**
 * Audio cue service using the Web Audio API.
 *
 * Design constraints:
 * - Zero external assets. All cues are synthesized from oscillator tones.
 * - Fire-and-forget and safe: never throws, never blocks the timer loops.
 * - Respects a user-controlled volume preference (0.0–1.0) stored in localStorage.
 * - iOS WebView requires a user gesture to unlock the AudioContext; callers
 *   should invoke `primeAudioCues()` from a user-initiated handler (e.g. the
 *   Start / Begin buttons). Before priming, `playAudioCue()` is a no-op.
 *
 * Sound character per cue:
 *   bell-ring    — struck bell with harmonic overtone (lap end, interval end)
 *   loud-chime   — bright 3-note ascending chime (session start, complete, interval-start)
 *   peaceful-hymn — soft major-chord triangle waves (breathwork start / finish)
 */

export type AudioCue =
  | 'start'
  | 'pause'
  | 'lap'
  | 'interval-start'
  | 'interval-end'
  | 'complete'
  | 'breath-start'
  | 'breath-complete'
  | 'inhale'
  | 'hold'
  | 'exhale'

const AUDIO_PREFERENCE_KEY = 'navafit:audio-cues-enabled'
const AUDIO_VOLUME_KEY = 'navafit:audio-volume'
const DEFAULT_VOLUME = 0.72

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

/** Returns the current volume multiplier in [0, 1]. Defaults to 0.65. */
export function getAudioVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME
  try {
    const stored = window.localStorage.getItem(AUDIO_VOLUME_KEY)
    if (stored === null) return DEFAULT_VOLUME
    const parsed = parseFloat(stored)
    if (Number.isNaN(parsed)) return DEFAULT_VOLUME
    return Math.min(1, Math.max(0, parsed))
  } catch {
    return DEFAULT_VOLUME
  }
}

/** Persists a volume level in [0, 1]. Values are clamped. */
export function setAudioVolume(volume: number): void {
  if (typeof window === 'undefined') return
  try {
    const clamped = Math.min(1, Math.max(0, volume))
    window.localStorage.setItem(AUDIO_VOLUME_KEY, clamped.toString())
  } catch {
    // Ignore storage write failures.
  }
}

interface ToneSpec {
  frequency: number
  durationMs: number
  type?: OscillatorType
  /** Base peak gain at volume = 1.0. Actual gain = peakGain * getAudioVolume(). */
  peakGain?: number
  /**
   * Explicit start offset in seconds from cue trigger time.
   * If omitted, tones play sequentially spaced by CUE_STEP_SECONDS.
   */
  offsetSec?: number
  /** Attack ramp duration in seconds. Default 0.012 (snappy). Use ~0.08 for soft pads. */
  attackSec?: number
}

function scheduleTone(ctx: AudioContext, spec: ToneSpec, startOffsetSec: number, volume: number): void {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const startAt = ctx.currentTime + startOffsetSec
    const durationSec = spec.durationMs / 1000
    const peak = (spec.peakGain ?? 0.18) * volume
    const attack = spec.attackSec ?? 0.012

    osc.type = spec.type ?? 'sine'
    osc.frequency.setValueAtTime(spec.frequency, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), startAt + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startAt)
    osc.stop(startAt + durationSec + 0.02)
  } catch {
    // Ignore scheduling errors so timers never break.
  }
}

// Bell ring: A6 fundamental + E7 overtone, both start simultaneously,
// fast 12 ms attack, slightly longer decay for better audibility.
const BELL_RING: ToneSpec[] = [
  { frequency: 1760, durationMs: 880, peakGain: 0.82, offsetSec: 0 },
  { frequency: 2637, durationMs: 880, peakGain: 0.34, offsetSec: 0 },
]

// Loud chime (3-note ascending): C6 → E6 → G6, slightly slower sequence.
const LOUD_CHIME_3: ToneSpec[] = [
  { frequency: 1047, durationMs: 380, peakGain: 0.88, offsetSec: 0 },
  { frequency: 1319, durationMs: 380, peakGain: 0.88, offsetSec: 0.18 },
  { frequency: 1568, durationMs: 420, peakGain: 0.9, offsetSec: 0.36 },
]

// Loud chime (4-note finish): C6 → E6 → G6 → C7, grander completion fanfare.
const LOUD_CHIME_4: ToneSpec[] = [
  { frequency: 1047, durationMs: 420, peakGain: 0.88, offsetSec: 0 },
  { frequency: 1319, durationMs: 420, peakGain: 0.88, offsetSec: 0.18 },
  { frequency: 1568, durationMs: 420, peakGain: 0.88, offsetSec: 0.36 },
  { frequency: 2093, durationMs: 620, peakGain: 0.94, offsetSec: 0.54 },
]

// Loud chime (2-note bright): E6 → G6, for interval rest-start signal.
const LOUD_CHIME_2: ToneSpec[] = [
  { frequency: 1319, durationMs: 360, peakGain: 0.84, offsetSec: 0 },
  { frequency: 1568, durationMs: 400, peakGain: 0.86, offsetSec: 0.18 },
]

// Peaceful hymn: soft C5–E5–G5 major triad, triangle waves, slow 80 ms attack.
const PEACEFUL_HYMN_START: ToneSpec[] = [
  { frequency: 523, durationMs: 1200, type: 'triangle', peakGain: 0.30, offsetSec: 0, attackSec: 0.08 },
  { frequency: 659, durationMs: 1200, type: 'triangle', peakGain: 0.24, offsetSec: 0, attackSec: 0.08 },
  { frequency: 784, durationMs: 1200, type: 'triangle', peakGain: 0.20, offsetSec: 0, attackSec: 0.08 },
]

// Peaceful hymn finish: same triad with a high C5 echo for resolution.
const PEACEFUL_HYMN_FINISH: ToneSpec[] = [
  { frequency: 523, durationMs: 1400, type: 'triangle', peakGain: 0.32, offsetSec: 0, attackSec: 0.08 },
  { frequency: 659, durationMs: 1400, type: 'triangle', peakGain: 0.26, offsetSec: 0, attackSec: 0.08 },
  { frequency: 784, durationMs: 1400, type: 'triangle', peakGain: 0.22, offsetSec: 0, attackSec: 0.08 },
  { frequency: 1047, durationMs: 1100, type: 'triangle', peakGain: 0.14, offsetSec: 0.22, attackSec: 0.10 },
]

const CUE_STEP_SECONDS = 0.12

const CUE_PATTERNS: Record<AudioCue, ToneSpec[]> = {
  // Loud chimes — session begins
  start: LOUD_CHIME_3,

  // Soft descending single tone — paused
  pause: [{ frequency: 440, durationMs: 360, peakGain: 0.34 }],

  // Bell ring — individual lap completed
  lap: BELL_RING,

  // Loud chimes — rest period begins (new interval starting)
  'interval-start': LOUD_CHIME_2,

  // Bell ring — rest period over (interval ends, next lap begins)
  'interval-end': BELL_RING,

  // Loud chimes — session fully complete
  complete: LOUD_CHIME_4,

  // Peaceful hymn — breathwork session begins
  'breath-start': PEACEFUL_HYMN_START,

  // Peaceful hymn — breathwork session finishes
  'breath-complete': PEACEFUL_HYMN_FINISH,

  // Breathwork guidance cues — soft triangle tones (unchanged)
  inhale: [{ frequency: 620, durationMs: 200, type: 'triangle', peakGain: 0.22 }],
  hold:   [{ frequency: 820, durationMs: 170, type: 'triangle', peakGain: 0.20 }],
  exhale: [{ frequency: 420, durationMs: 240, type: 'triangle', peakGain: 0.18 }],
}

export function playAudioCue(cue: AudioCue): void {
  if (!isPrimed) return
  if (!isAudioCuesEnabled()) return
  const ctx = ensureContext()
  if (!ctx) return

  const pattern = CUE_PATTERNS[cue]
  if (!pattern) return

  const volume = getAudioVolume()

  for (let index = 0; index < pattern.length; index += 1) {
    const spec = pattern[index]
    const offset = spec.offsetSec !== undefined ? spec.offsetSec : index * CUE_STEP_SECONDS
    scheduleTone(ctx, spec, offset, volume)
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
