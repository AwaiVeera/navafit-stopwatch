/**
 * Breathwork levels for the rebuilt screen. Beginner adds safe, responsible
 * introductory protocols; Intermediate/Advanced reuse the app's existing shipped
 * protocols. Harder levels sit behind the entitlement seam (accessible now).
 *
 * No aggressive hyperventilation or prolonged retention is introduced.
 */
import type { BreathProtocol, TrainingLevel } from '../types'
import { BREATHWORK_MODES } from './breath-protocols'
import { isProLevel } from './entitlements'

const BEGINNER_PROTOCOLS: BreathProtocol[] = [
  {
    id: 'diaphragmatic',
    label: 'Diaphragmatic',
    description: 'Relaxed belly breathing with a longer exhale to settle the nervous system.',
    pathway: 'Nasal',
    phases: [
      { name: 'Inhale', durationSeconds: 4, instruction: 'Breathe into your belly through your nose' },
      { name: 'Exhale', durationSeconds: 6, instruction: 'Release slowly and completely' },
    ],
    rounds: null,
    safetyWarning: null,
  },
  {
    id: 'equal-paced',
    label: 'Equal Paced',
    description: 'Even inhales and exhales to steady your rhythm.',
    pathway: 'Nasal',
    phases: [
      { name: 'Inhale', durationSeconds: 4, instruction: 'Breathe in through your nose' },
      { name: 'Exhale', durationSeconds: 4, instruction: 'Breathe out through your nose' },
    ],
    rounds: null,
    safetyWarning: null,
  },
  {
    id: 'intro-box',
    label: 'Intro Box',
    description: 'A gentle box pattern introducing comfortable breath holds.',
    pathway: 'Nasal',
    phases: [
      { name: 'Inhale', durationSeconds: 4, instruction: 'In through the nose' },
      { name: 'Hold', durationSeconds: 4, instruction: 'Hold gently' },
      { name: 'Exhale', durationSeconds: 4, instruction: 'Out through the nose' },
      { name: 'Hold', durationSeconds: 4, instruction: 'Hold empty, relaxed' },
    ],
    rounds: null,
    safetyWarning: null,
  },
]

export interface BreathLevelOption {
  level: TrainingLevel
  label: string
  protocols: BreathProtocol[]
  isPro: boolean
}

const protocolsFor = (id: string): BreathProtocol[] =>
  [...(BREATHWORK_MODES.find((m) => m.id === id)?.protocols ?? [])]

export const BREATH_LEVELS: readonly BreathLevelOption[] = [
  { level: 'novice', label: 'Beginner', protocols: BEGINNER_PROTOCOLS, isPro: false },
  { level: 'intermediate', label: 'Intermediate', protocols: protocolsFor('intermediate'), isPro: true },
  { level: 'advanced', label: 'Advanced', protocols: protocolsFor('advanced'), isPro: true },
]

/** Session length options in seconds. */
export const BREATH_DURATIONS = [120, 180, 300] as const
export const DEFAULT_BREATH_DURATION = 180

export function getBreathLevel(level: TrainingLevel): BreathLevelOption {
  return BREATH_LEVELS.find((l) => l.level === level) ?? BREATH_LEVELS[0]
}

export { isProLevel }
