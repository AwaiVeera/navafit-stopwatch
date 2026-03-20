import { Capacitor } from '@capacitor/core'
import {
  Health,
  type HealthDataType,
  type HealthSample,
  type Workout,
} from '@capgo/capacitor-health'

import type {
  DeviceConnectionRecord,
  HealthMetrics,
  SessionSavePayload,
  WorkoutSource,
} from '../types'

const HEALTH_SAMPLE_TYPES: HealthDataType[] = [
  'heartRate',
  'restingHeartRate',
  'respiratoryRate',
  'heartRateVariability',
  'sleep',
]

// The plugin README documents a dedicated workouts permission, but the current typings do not expose it yet.
const WORKOUT_PERMISSION = 'workouts' as unknown as HealthDataType
const HEALTH_READ_TYPES: HealthDataType[] = [...HEALTH_SAMPLE_TYPES, WORKOUT_PERMISSION]

interface DerivedHealthInput {
  fallbackHealth: HealthMetrics
  heartRate: number | null
  restingHeartRate: number | null
  respiratoryRate: number | null
  heartRateVariability: number | null
  sleepMinutes: number | null
  recentWorkoutMinutes: number
  recentWorkoutCount: number
}

export interface NativeHealthSyncResult {
  source: WorkoutSource
  health: HealthMetrics
  importedWorkouts: SessionSavePayload[]
  deviceConnections: DeviceConnectionRecord[]
  lastSyncedAt: string
  providerLabel: string
  summary: string
}

export function supportsNativeHealthSync() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export function deriveHealthMetricsFromHealthKit({
  fallbackHealth,
  heartRate,
  restingHeartRate,
  respiratoryRate,
  heartRateVariability,
  sleepMinutes,
  recentWorkoutMinutes,
  recentWorkoutCount,
}: DerivedHealthInput): HealthMetrics {
  const readiness = averageOrFallback(
    [
      heartRateVariability === null ? null : scaleLinear(heartRateVariability, 18, 120),
      sleepMinutes === null ? null : scaleLinear(sleepMinutes, 240, 540),
      restingHeartRate === null ? null : scaleInverse(restingHeartRate, 45, 82),
    ],
    fallbackHealth.readiness,
  )

  const stressLevel = averageOrFallback(
    [
      respiratoryRate === null ? null : scaleLinear(respiratoryRate, 10, 26),
      heartRateVariability === null ? null : scaleInverse(heartRateVariability, 18, 120),
      heartRate !== null && restingHeartRate !== null
        ? scaleLinear(Math.max(heartRate - restingHeartRate, 0), 0, 55)
        : null,
    ],
    fallbackHealth.stressLevel,
  )

  const endurance = averageOrFallback(
    [
      scaleLinear(recentWorkoutMinutes, 20, 260),
      sleepMinutes === null ? null : scaleLinear(sleepMinutes, 240, 540),
      restingHeartRate === null ? null : scaleInverse(restingHeartRate, 45, 82),
    ],
    fallbackHealth.endurance,
  )

  const averageWorkoutMinutes =
    recentWorkoutCount > 0 ? recentWorkoutMinutes / recentWorkoutCount : recentWorkoutMinutes

  const stamina = averageOrFallback(
    [
      scaleLinear(averageWorkoutMinutes, 12, 70),
      heartRateVariability === null ? null : scaleLinear(heartRateVariability, 18, 120),
      heartRate === null ? null : scaleInverse(heartRate, 82, 172),
    ],
    fallbackHealth.stamina,
  )

  return {
    heartRate: clampRounded(heartRate ?? fallbackHealth.heartRate, 45, 210),
    readiness: clampRounded(readiness, 0, 100),
    stamina: clampRounded(stamina, 0, 100),
    breathPerMinute: clampRounded(respiratoryRate ?? fallbackHealth.breathPerMinute, 6, 40),
    endurance: clampRounded(endurance, 0, 100),
    stressLevel: clampRounded(stressLevel, 0, 100),
  }
}

export async function syncNativeHealth(fallbackHealth: HealthMetrics): Promise<NativeHealthSyncResult> {
  if (!supportsNativeHealthSync()) {
    return {
      source: 'app',
      health: fallbackHealth,
      importedWorkouts: [],
      deviceConnections: [],
      lastSyncedAt: new Date().toISOString(),
      providerLabel: 'Native health unavailable',
      summary: 'Apple Health sync is only available inside the native iPhone build.',
    }
  }

  const availability = await Health.isAvailable()

  if (!availability.available) {
    throw new Error(availability.reason || 'Apple Health is unavailable on this device.')
  }

  const authorization = await Health.checkAuthorization({
    read: HEALTH_READ_TYPES,
  })
  const missingReads = HEALTH_READ_TYPES.filter((scope) => !authorization.readAuthorized.includes(scope))

  if (missingReads.length > 0) {
    const afterRequest = await Health.requestAuthorization({
      read: HEALTH_READ_TYPES,
    })
    const stillMissing = HEALTH_READ_TYPES.filter((scope) => !afterRequest.readAuthorized.includes(scope))

    if (stillMissing.length > 0) {
      throw new Error('Apple Health permission was not granted for all required data types.')
    }
  }

  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const last36Hours = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const endDate = now.toISOString()

  const [
    heartRateResult,
    restingHeartRateResult,
    respiratoryRateResult,
    heartRateVariabilityResult,
    sleepResult,
    workoutsResult,
  ] = await Promise.all([
    Health.readSamples({
      dataType: 'heartRate',
      startDate: last24Hours,
      endDate,
      limit: 20,
    }),
    Health.readSamples({
      dataType: 'restingHeartRate',
      startDate: last7Days,
      endDate,
      limit: 20,
    }),
    Health.readSamples({
      dataType: 'respiratoryRate',
      startDate: last24Hours,
      endDate,
      limit: 20,
    }),
    Health.readSamples({
      dataType: 'heartRateVariability',
      startDate: last7Days,
      endDate,
      limit: 20,
    }),
    Health.readSamples({
      dataType: 'sleep',
      startDate: last36Hours,
      endDate,
      limit: 30,
    }),
    Health.queryWorkouts({
      startDate: last30Days,
      endDate,
      limit: 8,
    }),
  ])

  const latestHeartRate = getLatestSampleValue(heartRateResult.samples)
  const latestRestingHeartRate = getLatestSampleValue(restingHeartRateResult.samples)
  const latestRespiratoryRate = getLatestSampleValue(respiratoryRateResult.samples)
  const latestHeartRateVariability = getLatestSampleValue(heartRateVariabilityResult.samples)
  const recentSleepMinutes = sumSleepMinutes(sleepResult.samples)
  const importedWorkouts = workoutsResult.workouts.map((workout) => toImportedWorkout(workout))
  const recentWorkoutMinutes = importedWorkouts.reduce((total, workout) => total + workout.durationMinutes, 0)
  const hasAppleWatchSource = workoutsResult.workouts.some(isAppleWatchWorkout)
    || heartRateResult.samples.some(isAppleWatchSample)
    || respiratoryRateResult.samples.some(isAppleWatchSample)

  const health = deriveHealthMetricsFromHealthKit({
    fallbackHealth,
    heartRate: latestHeartRate,
    restingHeartRate: latestRestingHeartRate,
    respiratoryRate: latestRespiratoryRate,
    heartRateVariability: latestHeartRateVariability,
    sleepMinutes: recentSleepMinutes,
    recentWorkoutMinutes,
    recentWorkoutCount: importedWorkouts.length,
  })

  const lastSyncedAt = new Date().toISOString()
  const deviceConnections: DeviceConnectionRecord[] = [
    {
      provider: 'apple_health',
      status: 'active',
      scopes: [
        'heartRate',
        'restingHeartRate',
        'respiratoryRate',
        'heartRateVariability',
        'sleep',
        'workouts',
      ],
      lastSyncedAt,
    },
  ]

  if (hasAppleWatchSource) {
    deviceConnections.push({
      provider: 'apple_watch',
      status: 'active',
      scopes: ['healthkit-ingested'],
      lastSyncedAt,
    })
  }

  return {
    source: hasAppleWatchSource ? 'apple_watch' : 'apple_health',
    health,
    importedWorkouts,
    deviceConnections,
    lastSyncedAt,
    providerLabel: hasAppleWatchSource ? 'Apple Watch via HealthKit' : 'Apple Health',
    summary: `Synced Apple Health metrics and ${importedWorkouts.length} recent workout${importedWorkouts.length === 1 ? '' : 's'}.`,
  }
}

function toImportedWorkout(workout: Workout): SessionSavePayload {
  const source = isAppleWatchWorkout(workout) ? 'apple_watch' : 'apple_health'
  const durationMinutes = Math.max(1, Math.round(workout.duration / 60))
  const sourceLabel = workout.sourceName?.trim() || 'Apple Health'

  return {
    title: formatWorkoutType(workout.workoutType),
    note: `Imported from ${sourceLabel}.`,
    durationMinutes,
    startedAt: workout.startDate,
    endedAt: workout.endDate,
    source,
    metadata: {
      sourceName: workout.sourceName ?? null,
      sourceId: workout.sourceId ?? null,
      platformId: workout.platformId ?? null,
      totalEnergyBurned: workout.totalEnergyBurned ?? null,
      totalDistance: workout.totalDistance ?? null,
      workoutType: workout.workoutType,
    },
  }
}

function formatWorkoutType(workoutType: Workout['workoutType']) {
  return workoutType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase())
    .trim()
}

function getLatestSampleValue(samples: HealthSample[]) {
  if (samples.length === 0) {
    return null
  }

  const sorted = [...samples].sort((left, right) => {
    return new Date(right.endDate).getTime() - new Date(left.endDate).getTime()
  })

  return sorted[0]?.value ?? null
}

function sumSleepMinutes(samples: HealthSample[]) {
  const sleepStates = new Set(['asleep', 'deep', 'light', 'rem'])

  return samples.reduce((total, sample) => {
    if (!sample.sleepState || !sleepStates.has(sample.sleepState)) {
      return total
    }

    return total + sample.value
  }, 0)
}

function isAppleWatchWorkout(workout: Workout) {
  return /watch/i.test(`${workout.sourceName ?? ''} ${workout.sourceId ?? ''}`)
}

function isAppleWatchSample(sample: HealthSample) {
  return /watch/i.test(`${sample.sourceName ?? ''} ${sample.sourceId ?? ''}`)
}

function averageOrFallback(values: Array<number | null>, fallback: number) {
  const validValues = values.filter((value): value is number => value !== null)

  if (validValues.length === 0) {
    return fallback
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length
}

function scaleLinear(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100
}

function scaleInverse(value: number, min: number, max: number) {
  return 100 - scaleLinear(value, min, max)
}

function clampRounded(value: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, value)))
}
