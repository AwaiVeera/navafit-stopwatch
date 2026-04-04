export type ViewId = 'login' | 'onboarding' | 'consent' | 'dashboard' | 'pre-session' | 'stopwatch' | 'breath' | 'biometrics'
export type EmailAuthMode = 'sign-in' | 'sign-up'
export type SocialAuthProvider = 'apple' | 'google'
export type WorkoutSource = 'app' | 'apple_health' | 'apple_watch' | 'garmin_connect'
export type TelemetrySource = WorkoutSource | 'weather'
export type DeviceProvider = 'apple_health' | 'apple_watch' | 'garmin_connect'
export type DeviceConnectionStatus = 'pending' | 'active' | 'revoked' | 'error'
export type PresetMode = 'suggest_only' | 'auto_apply'
export type RecoveryBias = 'recover' | 'maintain' | 'build'

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
  startedAt?: string
  endedAt?: string | null
  source?: WorkoutSource
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
  healthSourceLabel: string
  watchSourceLabel: string
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

export interface BreathPreset {
  inhaleSeconds: number
  holdSeconds: number
  exhaleSeconds: number
  cycleSeconds: number
  label: string
}

export interface SessionPreset {
  id: string
  title: string
  summary: string
  targetMinutes: number
  recoveryBias: RecoveryBias
  sourceLabel: string
  rationale: string[]
  breathPreset: BreathPreset
}

export interface SessionSavePayload {
  title: string
  note: string
  durationMinutes: number
  startedAt: string
  endedAt: string
  source: WorkoutSource
  metadata?: Record<string, unknown>
}

export interface DeviceConnectionRecord {
  provider: DeviceProvider
  status: DeviceConnectionStatus
  scopes: string[]
  providerUserId?: string | null
  lastSyncedAt?: string | null
}

export interface UserConsentRecord {
  userId: string
  privacyPolicyVersion: string
  termsVersion: string
  acceptedPrivacyPolicyAt: string
  acceptedTermsAt: string
  acceptedHealthSyncAt: string | null
  acceptedUsageAnalyticsAt: string | null
}

export interface ConsentSubmission {
  acceptsHealthSync: boolean
  acceptsUsageAnalytics: boolean
}

export interface OnboardingProfile {
  ageYears: number
  heightCm: number
  weightKg: number
  trainingDaysPerWeek: number
}

export interface PersistedAppState {
  logs: WorkoutLog[]
  health: HealthMetrics
  telemetry: TelemetryState
  deviceConnections: DeviceConnectionRecord[]
  consent: UserConsentRecord | null
  onboardingCompleted: boolean
}

export interface TelemetrySyncContext {
  userId: string
  currentHealth: HealthMetrics
  previousTelemetry: TelemetryState
  allowHealthSync: boolean
}

export interface TelemetrySyncResult {
  health: HealthMetrics
  telemetry: TelemetryState
  deviceConnections: DeviceConnectionRecord[]
  importedWorkouts: WorkoutLog[]
}
