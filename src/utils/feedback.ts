import { playAudioCue } from '../services/audio-cues'
import type { AudioCue } from '../services/audio-cues'
import {
  hapticBreathPhase,
  hapticSuccess,
  hapticTap,
  hapticWarning,
} from '../services/haptics'

export function tapFeedback(): void {
  try { hapticTap() } catch { /* graceful degradation */ }
}

export function successFeedback(): void {
  try { hapticSuccess() } catch { /* graceful degradation */ }
}

export function warningFeedback(): void {
  try { hapticWarning() } catch { /* graceful degradation */ }
}

export function breathPhaseFeedback(phase: string): void {
  try { hapticBreathPhase(phase) } catch { /* graceful degradation */ }
}

export function playCue(type: AudioCue): void {
  try { playAudioCue(type) } catch { /* graceful degradation */ }
}
