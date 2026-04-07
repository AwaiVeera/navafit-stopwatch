import type { BreathworkMode } from '../types'

const EXPERT_SAFETY_WARNING =
  'Do not practice in or near water. Do not practice while driving or operating machinery.'

export const BREATHWORK_MODES: readonly BreathworkMode[] = [
  {
    id: 'novice',
    label: 'Novice',
    protocols: [],
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    protocols: [
      {
        id: 'box-breathing',
        label: 'Box Breathing',
        description: 'Predictable rhythm used by Navy SEALs for stress inoculation. Calms the nervous system through equal-phase breathing.',
        pathway: 'Nose to nose',
        phases: [
          { name: 'Inhale', durationSeconds: 4, instruction: 'Breathe in slowly through your nose' },
          { name: 'Hold', durationSeconds: 4, instruction: 'Hold your breath gently' },
          { name: 'Exhale', durationSeconds: 4, instruction: 'Breathe out slowly through your nose' },
          { name: 'Hold', durationSeconds: 4, instruction: 'Hold empty before the next inhale' },
        ],
        rounds: null,
        safetyWarning: null,
      },
      {
        id: '4-7-8',
        label: '4-7-8 Relaxation',
        description: 'Extended exhale pattern that shifts the nervous system toward rest and digest. Developed by Dr. Andrew Weil.',
        pathway: 'Nose in, pursed-lip exhale',
        phases: [
          { name: 'Inhale', durationSeconds: 4, instruction: 'Breathe in through your nose' },
          { name: 'Hold', durationSeconds: 7, instruction: 'Hold your breath' },
          { name: 'Exhale', durationSeconds: 8, instruction: 'Exhale slowly with a whoosh through pursed lips' },
        ],
        rounds: null,
        safetyWarning: null,
      },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    protocols: [
      {
        id: 'quad-ratio',
        label: 'QUAD-Ratio (1:1:2:1)',
        description: 'Extended exhale-to-inhale ratio builds CO2 tolerance and improves VO2max recovery. Nasal breathing only.',
        pathway: 'Nasal only',
        phases: [
          { name: 'Inhale', durationSeconds: 3, instruction: 'Inhale slowly through your nose' },
          { name: 'Pause', durationSeconds: 3, instruction: 'Brief pause at the top' },
          { name: 'Exhale', durationSeconds: 6, instruction: 'Long controlled exhale through your nose' },
          { name: 'Pause', durationSeconds: 3, instruction: 'Brief pause before inhaling' },
        ],
        rounds: null,
        safetyWarning: null,
      },
      {
        id: 'physiological-sigh',
        label: 'Physiological Sigh',
        description: 'Stanford-researched technique. Double inhale reinflates collapsed alveoli, long exhale maximises CO2 offload for rapid calm.',
        pathway: 'Nose in, mouth out',
        phases: [
          { name: 'Inhale 1', durationSeconds: 2, instruction: 'Short sharp inhale through nose' },
          { name: 'Inhale 2', durationSeconds: 2, instruction: 'Second deeper inhale through nose on top' },
          { name: 'Exhale', durationSeconds: 6, instruction: 'Long slow exhale through your mouth' },
        ],
        rounds: null,
        safetyWarning: null,
      },
    ],
  },
  {
    id: 'expert',
    label: 'Expert',
    protocols: [
      {
        id: 'cyclical-hyperventilation',
        label: 'Cyclical Hyperventilation',
        description: 'WHM-style breathwork. 30 deep circular breaths, then a retention hold after the last exhale, then a recovery inhale with a 15-second hold.',
        pathway: 'Deep circular breathing',
        phases: [
          { name: 'Deep Breath', durationSeconds: 3, instruction: 'Full deep inhale and immediate exhale' },
        ],
        rounds: 30,
        safetyWarning: EXPERT_SAFETY_WARNING,
      },
      {
        id: 'max-co2-challenge',
        label: 'Max CO2 Challenge',
        description: 'One deep nasal inhale followed by the slowest possible controlled exhale through a pin-sized mouth opening. Benchmark target: 60+ seconds.',
        pathway: 'Nose in, pin-hole mouth out',
        phases: [
          { name: 'Deep Inhale', durationSeconds: 5, instruction: 'One full deep inhale through your nose' },
          { name: 'Slow Exhale', durationSeconds: 60, instruction: 'Exhale as slowly as possible through a pin-sized mouth opening' },
        ],
        rounds: 1,
        safetyWarning: EXPERT_SAFETY_WARNING,
      },
    ],
  },
] as const

export function getBreathworkMode(id: string): BreathworkMode {
  return BREATHWORK_MODES.find((mode) => mode.id === id) ?? BREATHWORK_MODES[0]
}
