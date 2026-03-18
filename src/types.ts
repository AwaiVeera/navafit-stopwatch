export type ViewId = 'login' | 'dashboard' | 'stopwatch' | 'breath' | 'biometrics'
export type EmailAuthMode = 'sign-in' | 'sign-up'
export type SocialAuthProvider = 'apple' | 'google'

export interface HealthMetrics {
  heartRate: number
  readiness: number
  stamina: number
  breathPerMinute: number
  endurance: number
  stressLevel: number
}

export interface WorkoutLog {
  id: string
  date: string
  title: string
  durationMinutes: number
  note: string
}

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'unavailable' | 'error'

export interface WeatherSnapshot {
  condition: string
  temperatureC: number | null
  source: 'disabled' | 'simulated' | 'device'
}

export interface TelemetryState {
  healthApp: SyncStatus
  fitnessWatch: SyncStatus
  weather: SyncStatus
  weatherSnapshot: WeatherSnapshot
  lastSyncLabel: string
}

export type InsightDomain = 'training' | 'recovery' | 'sync'

export type InsightSource = 'deterministic' | 'simulated-input'

export interface InsightItem {
  id: string
  domain: InsightDomain
  title: string
  summary: string
  emphasis: string
  actionLabel: string
  source: InsightSource
}

export interface InsightSnapshot {
  engineLabel: string
  generatedAtLabel: string
  items: InsightItem[]
}
