import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

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
  const weatherSnapshot = await fetchWeatherSnapshot(capabilities.weather)
  const completedAt = new Date().toISOString()
  const canUseNativeHealth = allowHealthSync && supportsNativeHealthSync()

  try {
    const nativeHealthSync =
      canUseNativeHealth
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
  const webGeolocation = hasNavigator && 'geolocation' in navigator
  // Native iOS uses @capacitor/geolocation (Info.plist must include NSLocationWhenInUseUsageDescription).
  const weather = Capacitor.isNativePlatform() || webGeolocation

  return {
    healthApp: platformHasCapacitor,
    fitnessWatch: platformHasCapacitor,
    weather,
  }
}

/** Fetches Open-Meteo weather for current device position; no HealthKit or Supabase writes. */
export async function fetchLiveWeatherSnapshot(): Promise<WeatherSnapshot> {
  const capabilities = detectCapabilities()
  return fetchWeatherSnapshot(capabilities.weather)
}

async function fetchWeatherSnapshot(weatherCapability: boolean): Promise<WeatherSnapshot> {
  if (!weatherCapability) {
    return { condition: 'Unavailable', temperatureC: null, source: 'disabled' }
  }

  try {
    const position = await getDevicePosition()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${position.lat}&longitude=${position.lon}&current=temperature_2m,weather_code`
    const response = await fetch(url)

    if (!response.ok) {
      return buildSimulatedWeather()
    }

    const data = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number }
    }

    if (!data.current || data.current.temperature_2m === undefined) {
      return buildSimulatedWeather()
    }

    return {
      condition: weatherCodeToLabel(data.current.weather_code ?? 0),
      temperatureC: Math.round(data.current.temperature_2m),
      source: 'device',
    }
  } catch {
    return buildSimulatedWeather()
  }
}

async function getDevicePosition(): Promise<{ lat: number; lon: number }> {
  if (Capacitor.isNativePlatform()) {
    const status = await Geolocation.requestPermissions().catch(() => null)
    if (status && status.location === 'denied') {
      throw new Error('Location permission denied')
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300_000,
    })

    return { lat: position.coords.latitude, lon: position.coords.longitude }
  }

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation unavailable'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 300000 },
    )
  })
}

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Stormy'
}

function buildSimulatedWeather(): WeatherSnapshot {
  const hour = new Date().getHours()
  const isDay = hour >= 6 && hour < 18

  return {
    condition: isDay ? 'Clear' : 'Night',
    temperatureC: isDay ? 29 : 23,
    source: 'simulated',
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), ms)
  })
}
