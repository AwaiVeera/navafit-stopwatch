import type { HealthMetrics, TelemetryState, WeatherSnapshot } from '../types'

interface DeviceCapabilities {
  healthApp: boolean
  fitnessWatch: boolean
  weather: boolean
}

interface TelemetrySyncResult {
  health: HealthMetrics
  telemetry: TelemetryState
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
  }
}

export async function syncTelemetry(currentHealth: HealthMetrics): Promise<TelemetrySyncResult> {
  const capabilities = detectCapabilities()
  await sleep(SYNC_DELAY_MS)

  const syncedHealth = buildSyncedHealth(currentHealth)
  const weatherSnapshot = buildWeatherSnapshot(capabilities.weather)

  return {
    health: syncedHealth,
    telemetry: {
      healthApp: capabilities.healthApp ? 'ready' : 'unavailable',
      fitnessWatch: capabilities.fitnessWatch ? 'ready' : 'unavailable',
      weather: capabilities.weather ? 'ready' : 'unavailable',
      weatherSnapshot,
      lastSyncLabel: `Synced ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    },
  }
}

function detectCapabilities(): DeviceCapabilities {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const platformHasCapacitor = hasWindow && Boolean((window as { Capacitor?: unknown }).Capacitor)
  const geolocationAvailable = hasNavigator && 'geolocation' in navigator

  return {
    // Real vendor auth/connect flows are TBD; this only checks runtime capability.
    healthApp: platformHasCapacitor,
    fitnessWatch: platformHasCapacitor,
    weather: geolocationAvailable,
  }
}

function buildSyncedHealth(previous: HealthMetrics): HealthMetrics {
  return {
    heartRate: clamp(nudge(previous.heartRate, 3), 52, 188),
    readiness: clamp(nudge(previous.readiness, 4), 0, 100),
    stamina: clamp(nudge(previous.stamina, 3), 0, 100),
    breathPerMinute: clamp(nudge(previous.breathPerMinute, 1), 6, 40),
    endurance: clamp(nudge(previous.endurance, 3), 0, 100),
    stressLevel: clamp(nudge(previous.stressLevel, 4), 0, 100),
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
