import {
  recordSyncEvent,
  saveDeviceConnections,
  saveImportedWorkouts,
  saveTelemetrySnapshot,
} from './data'
import { supportsNativeHealthSync, syncNativeHealth } from './health'
import type {
  TelemetryState,
  TelemetrySyncContext,
  TelemetrySyncResult,
  WeatherSnapshot,
} from '../types'

interface DeviceCapabilities {
  healthApp: boolean
  fitnessWatch: boolean
  weather: boolean
}

const SYNC_DELAY_MS = 280

export function createInitialTelemetryState(): TelemetryState {
  const capabilities = detectCapabilities()

  return {
    healthApp: capabilities.healthApp ? 'idle' : 'unavailable',
    fitnessWatch: capabilities.fitnessWatch ? 'idle' : 'unavailable',
    weather: capabilities.weather ? 'idle' : 'unavailable',
    weatherSnapshot: {
      condition: 'Not synced',
      temperatureC: null,
      source: 'disabled',
    },
    lastSyncLabel: 'Not synced yet',
    healthSourceLabel: capabilities.healthApp ? 'Waiting for consent' : 'Native health unavailable',
    watchSourceLabel: 'Watch not connected',
  }
}

export function buildSyncErrorTelemetry(previousTelemetry: TelemetryState, message: string): TelemetryState {
  return {
    ...previousTelemetry,
    healthApp: 'error',
    fitnessWatch: previousTelemetry.fitnessWatch === 'unavailable' ? 'unavailable' : 'error',
    weather: previousTelemetry.weather === 'unavailable' ? 'unavailable' : 'ready',
    lastSyncLabel: message,
  }
}

export async function syncTelemetry({
  userId,
  currentHealth,
  previousTelemetry,
  allowHealthSync,
}: TelemetrySyncContext): Promise<TelemetrySyncResult> {
  const capabilities = detectCapabilities()
  await sleep(SYNC_DELAY_MS)
  const startedAt = new Date().toISOString()
  const weatherSnapshot = buildWeatherSnapshot(capabilities.weather)
  const completedAt = new Date().toISOString()

  try {
    const nativeHealthSync =
      allowHealthSync && supportsNativeHealthSync()
        ? await syncNativeHealth(currentHealth)
        : {
            source: 'app' as const,
            health: currentHealth,
            importedWorkouts: [],
            deviceConnections: [],
            lastSyncedAt: completedAt,
            providerLabel: allowHealthSync
              ? 'Apple Health needs the native iPhone build'
              : 'Health sync waiting for consent',
            summary: allowHealthSync
              ? 'Open the native iPhone build to sync Apple Health.'
              : 'Accept health sync consent to start pulling Apple Health data.',
          }

    const savedWorkouts = nativeHealthSync.importedWorkouts.length
      ? await saveImportedWorkouts(userId, nativeHealthSync.importedWorkouts)
      : []

    await saveTelemetrySnapshot({
      userId,
      source: nativeHealthSync.source,
      health: nativeHealthSync.health,
      weatherCondition: weatherSnapshot.condition,
      weatherTemperatureC: weatherSnapshot.temperatureC,
      recordedAt: completedAt,
    })

    if (nativeHealthSync.deviceConnections.length > 0) {
      await saveDeviceConnections(userId, nativeHealthSync.deviceConnections)
      await recordSyncEvent({
        userId,
        provider: nativeHealthSync.source === 'apple_watch' ? 'apple_watch' : 'apple_health',
        status: 'success',
        startedAt,
        completedAt,
        details: {
          summary: nativeHealthSync.summary,
          workoutsImported: savedWorkouts.length,
          providerLabel: nativeHealthSync.providerLabel,
        },
      })
    }

    return {
      health: nativeHealthSync.health,
      telemetry: {
        healthApp: nativeHealthSync.deviceConnections.some((connection) => connection.provider === 'apple_health')
          ? 'ready'
          : allowHealthSync && capabilities.healthApp
            ? 'idle'
            : capabilities.healthApp
              ? 'idle'
              : 'unavailable',
        fitnessWatch: nativeHealthSync.deviceConnections.some((connection) => connection.provider === 'apple_watch')
          ? 'ready'
          : capabilities.fitnessWatch
            ? 'idle'
            : 'unavailable',
        weather: capabilities.weather ? 'ready' : 'unavailable',
        weatherSnapshot,
        lastSyncLabel: `Synced ${new Date(completedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        healthSourceLabel: nativeHealthSync.providerLabel,
        watchSourceLabel: nativeHealthSync.deviceConnections.some((connection) => connection.provider === 'apple_watch')
          ? 'Apple Watch'
          : 'Watch not connected',
      },
      deviceConnections: nativeHealthSync.deviceConnections,
      importedWorkouts: savedWorkouts,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Telemetry sync failed.'

    try {
      await recordSyncEvent({
        userId,
        provider: 'apple_health',
        status: 'error',
        startedAt,
        completedAt: new Date().toISOString(),
        details: {
          message: errorMessage,
        },
      })
    } catch {
      // Ignore secondary logging failures so the UI can still recover.
    }

    return {
      health: currentHealth,
      telemetry: buildSyncErrorTelemetry(previousTelemetry, errorMessage),
      deviceConnections: [],
      importedWorkouts: [],
    }
  }
}

function detectCapabilities(): DeviceCapabilities {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const platformHasCapacitor = hasWindow && Boolean((window as { Capacitor?: unknown }).Capacitor)
  const geolocationAvailable = hasNavigator && 'geolocation' in navigator

  return {
    healthApp: platformHasCapacitor,
    fitnessWatch: platformHasCapacitor,
    weather: geolocationAvailable,
  }
}

function buildWeatherSnapshot(weatherCapability: boolean): WeatherSnapshot {
  if (!weatherCapability) {
    return {
      condition: 'Unavailable',
      temperatureC: null,
      source: 'disabled',
    }
  }

  const hour = new Date().getHours()
  const isDay = hour >= 6 && hour < 18
  const baseTemp = isDay ? 29 : 23

  return {
    condition: isDay ? 'Clear' : 'Night',
    temperatureC: clamp(nudge(baseTemp, 2), 16, 37),
    source: 'simulated',
  }
}

function nudge(value: number, spread: number) {
  return Math.round(value + (Math.random() * 2 - 1) * spread)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), ms)
  })
}
