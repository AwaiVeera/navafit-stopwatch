import type { BreathPreset } from '../types'

export interface GuidedBreathLevel {
  id: string
  level: number
  label: string
  description: string
  source: string
  preset: BreathPreset
}

function buildPreset(
  inhaleSeconds: number,
  holdSeconds: number,
  exhaleSeconds: number,
  label: string,
): BreathPreset {
  return {
    inhaleSeconds,
    holdSeconds,
    exhaleSeconds,
    cycleSeconds: inhaleSeconds + holdSeconds + exhaleSeconds,
    label,
  }
}

/**
 * Research-backed progression ladder for guided breathwork.
 * Levels move from gentle starter cadences up to slower, longer-exhale CO2-tolerance work.
 */
export const GUIDED_BREATH_LEVELS: readonly GuidedBreathLevel[] = [
  {
    id: 'level-01-steady-cadence',
    level: 1,
    label: 'Level 1 - Steady Cadence',
    description: 'Gentle 4-2-4 starter rhythm. Settles the nervous system before deeper work.',
    source: 'NavaFit base preset',
    preset: buildPreset(4, 2, 4, '4-2-4 steady cadence'),
  },
  {
    id: 'level-02-box-breathing',
    level: 2,
    label: 'Level 2 - Box Breathing',
    description: 'Equal 4-4-4 timing used by Navy SEALs for stress inoculation and focus.',
    source: 'Box breathing (Navy SEAL)',
    preset: buildPreset(4, 4, 4, '4-4-4 box breathing'),
  },
  {
    id: 'level-03-recovery',
    level: 3,
    label: 'Level 3 - Recovery',
    description: 'Slightly extended exhale 4-2-6 to bias the body toward parasympathetic recovery.',
    source: 'Vagal-tone recovery cadence',
    preset: buildPreset(4, 2, 6, '4-2-6 recovery cadence'),
  },
  {
    id: 'level-04-resonance',
    level: 4,
    label: 'Level 4 - Resonance Breathing',
    description: '5-0-5 around 6 breaths per minute; the resonance band shown to optimise HRV.',
    source: 'Lehrer / Vaschillo resonance studies',
    preset: buildPreset(5, 0, 5, '5-0-5 resonance breathing'),
  },
  {
    id: 'level-05-coherent',
    level: 5,
    label: 'Level 5 - Coherent Breathing',
    description: '6-0-6 around 5 breaths per minute. HeartMath coherent breathing for steady focus.',
    source: 'HeartMath coherent breathing',
    preset: buildPreset(6, 0, 6, '6-0-6 coherent breathing'),
  },
  {
    id: 'level-06-parasympathetic',
    level: 6,
    label: 'Level 6 - Parasympathetic',
    description: '5-2-7 with a longer exhale to push deeper into a rest-and-digest state.',
    source: 'Extended-exhale parasympathetic cadence',
    preset: buildPreset(5, 2, 7, '5-2-7 parasympathetic'),
  },
  {
    id: 'level-07-relax-4-7-8',
    level: 7,
    label: 'Level 7 - 4-7-8 Relaxation',
    description: 'Inhale 4, hold 7, exhale 8. Long retention then long exhale for downshifting.',
    source: 'Dr. Andrew Weil 4-7-8 method',
    preset: buildPreset(4, 7, 8, '4-7-8 relaxation'),
  },
  {
    id: 'level-08-yogic-1-1-2',
    level: 8,
    label: 'Level 8 - Yogic 1:1:2',
    description: '4-4-8 yogic ratio: equal inhale and hold, double-length exhale.',
    source: 'Pranayama 1:1:2 ratio',
    preset: buildPreset(4, 4, 8, '4-4-8 yogic 1:1:2'),
  },
  {
    id: 'level-09-triangle-long',
    level: 9,
    label: 'Level 9 - Long Triangle',
    description: '6-2-10 with an extended exhale to build CO2 tolerance.',
    source: 'CO2 tolerance triangle work',
    preset: buildPreset(6, 2, 10, '6-2-10 long triangle'),
  },
  {
    id: 'level-10-master-coherence',
    level: 10,
    label: 'Level 10 - Master Coherence',
    description: '7-7-14 ultra-slow cycle for deep CO2 mastery and sustained focus.',
    source: 'Advanced slow-breath CO2 mastery',
    preset: buildPreset(7, 7, 14, '7-7-14 master coherence'),
  },
] as const

export function findGuidedLevelByPresetLabel(label: string): GuidedBreathLevel | null {
  const match = GUIDED_BREATH_LEVELS.find((level) => level.preset.label === label)
  return match ?? null
}
