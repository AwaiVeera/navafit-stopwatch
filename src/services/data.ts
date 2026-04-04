import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '../legal'
import type {
  ConsentSubmission,
  DeviceConnectionRecord,
  DeviceConnectionStatus,
  DeviceProvider,
  HealthMetrics,
  OnboardingProfile,
  PersistedAppState,
  SessionSavePayload,
  TelemetryState,
  UserConsentRecord,
  WorkoutLog,
  WorkoutSource,
} from '../types'
import { supabase } from './supabase'

const RECENT_WORKOUT_LIMIT = 12
const LOCAL_WORKOUT_CACHE_PREFIX = 'navafit:workout-cache:'
const LOCAL_ONBOARDING_PROFILE_PREFIX = 'navafit:onboarding-profile:'

interface WorkoutSessionRow {
  id: string
  source: WorkoutSource
  title: string
  note: string
  started_at: string
  ended_at: string | null
  duration_minutes: number
}

interface TelemetrySnapshotRow {
  source: WorkoutSource | 'weather'
  heart_rate: number | null
  readiness: number | null
  stamina: number | null
  breath_per_minute: number | null
  endurance: number | null
  stress_level: number | null
  weather_condition: string | null
  weather_temperature_c: number | null
  recorded_at: string
}

interface DeviceConnectionRow {
  id: string
  provider: DeviceProvider
  connection_status: DeviceConnectionStatus
  provider_user_id: string | null
  scopes: unknown
  last_synced_at: string | null
}

interface UserConsentRow {
  user_id: string
  privacy_policy_version: string
  terms_version: string
  accepted_privacy_policy_at: string
  accepted_terms_at: string
  accepted_health_sync_at: string | null
  accepted_usage_analytics_at: string | null
}

interface ProfileRow {
  onboarding_completed: boolean | null
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  return supabase
}

function formatWorkoutDate(startedAt: string) {
  return startedAt.slice(0, 10)
}

function toTimeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function coerceStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function toWorkoutLog(row: WorkoutSessionRow): WorkoutLog {
  return {
    id: row.id,
    date: formatWorkoutDate(row.started_at),
    title: row.title,
    durationMinutes: row.duration_minutes,
    note: row.note,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    source: row.source,
  }
}

function getLocalWorkoutCacheKey(userId: string) {
  return `${LOCAL_WORKOUT_CACHE_PREFIX}${userId}`
}

function isWorkoutSource(value: unknown): value is WorkoutSource {
  return value === 'app' || value === 'apple_health' || value === 'apple_watch' || value === 'garmin_connect'
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.durationMinutes !== 'number' ||
    !Number.isFinite(candidate.durationMinutes) ||
    typeof candidate.note !== 'string'
  ) {
    return false
  }

  if (candidate.startedAt !== undefined && typeof candidate.startedAt !== 'string') {
    return false
  }

  if (candidate.endedAt !== undefined && candidate.endedAt !== null && typeof candidate.endedAt !== 'string') {
    return false
  }

  if (candidate.source !== undefined && !isWorkoutSource(candidate.source)) {
    return false
  }

  return true
}

export function loadLocalWorkoutCache(userId: string): WorkoutLog[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(getLocalWorkoutCacheKey(userId))

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is WorkoutLog => isWorkoutLog(entry)).slice(0, RECENT_WORKOUT_LIMIT)
  } catch {
    return []
  }
}

export function saveLocalWorkoutCache(userId: string, logs: WorkoutLog[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      getLocalWorkoutCacheKey(userId),
      JSON.stringify(logs.slice(0, RECENT_WORKOUT_LIMIT)),
    )
  } catch {
    // Ignore storage write failures (private mode / quota limits).
  }
}

function getLocalOnboardingProfileKey(userId: string) {
  return `${LOCAL_ONBOARDING_PROFILE_PREFIX}${userId}`
}

function isOnboardingProfile(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.ageYears === 'number'
    && Number.isFinite(candidate.ageYears)
    && typeof candidate.heightCm === 'number'
    && Number.isFinite(candidate.heightCm)
    && typeof candidate.weightKg === 'number'
    && Number.isFinite(candidate.weightKg)
    && typeof candidate.trainingDaysPerWeek === 'number'
    && Number.isFinite(candidate.trainingDaysPerWeek)
  )
}

export function loadLocalOnboardingProfile(userId: string): OnboardingProfile | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getLocalOnboardingProfileKey(userId))

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!isOnboardingProfile(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function saveLocalOnboardingProfile(userId: string, profile: OnboardingProfile) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(getLocalOnboardingProfileKey(userId), JSON.stringify(profile))
  } catch {
    // Ignore storage write failures (private mode / quota limits).
  }
}

function toConsentRecord(row: UserConsentRow): UserConsentRecord {
  return {
    userId: row.user_id,
    privacyPolicyVersion: row.privacy_policy_version,
    termsVersion: row.terms_version,
    acceptedPrivacyPolicyAt: row.accepted_privacy_policy_at,
    acceptedTermsAt: row.accepted_terms_at,
    acceptedHealthSyncAt: row.accepted_health_sync_at,
    acceptedUsageAnalyticsAt: row.accepted_usage_analytics_at,
  }
}

function toDeviceConnectionRecord(row: DeviceConnectionRow): DeviceConnectionRecord {
  return {
    provider: row.provider,
    status: row.connection_status,
    providerUserId: row.provider_user_id,
    scopes: coerceStringArray(row.scopes),
    lastSyncedAt: row.last_synced_at,
  }
}

function mapConnectionToSyncStatus(connection: DeviceConnectionRecord | undefined): TelemetryState['healthApp'] {
  if (!connection) {
    return 'idle'
  }

  if (connection.status === 'error') {
    return 'error'
  }

  if (connection.status === 'revoked') {
    return 'unavailable'
  }

  if (connection.status === 'active' && connection.lastSyncedAt) {
    return 'ready'
  }

  return 'idle'
}

function getHealthSourceLabel(
  latestSnapshot: TelemetrySnapshotRow | null,
  deviceConnections: DeviceConnectionRecord[],
) {
  if (latestSnapshot?.source === 'apple_watch') {
    return 'Apple Watch via HealthKit'
  }

  if (latestSnapshot?.source === 'apple_health') {
    return 'Apple Health'
  }

  if (deviceConnections.some((connection) => connection.provider === 'apple_health' && connection.status === 'active')) {
    return 'Apple Health linked'
  }

  if (deviceConnections.some((connection) => connection.provider === 'garmin_connect' && connection.status === 'active')) {
    return 'Garmin linked'
  }

  return 'App baseline'
}

function getWatchSourceLabel(deviceConnections: DeviceConnectionRecord[]) {
  if (deviceConnections.some((connection) => connection.provider === 'apple_watch' && connection.status === 'active')) {
    return 'Apple Watch'
  }

  if (deviceConnections.some((connection) => connection.provider === 'garmin_connect' && connection.status === 'active')) {
    return 'Garmin watch'
  }

  return 'Watch not connected'
}

export function buildWorkoutInsertPayload(userId: string, session: SessionSavePayload) {
  return {
    user_id: userId,
    source: session.source,
    title: session.title,
    note: session.note,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    duration_minutes: session.durationMinutes,
    metadata: session.metadata ?? {},
  }
}

export function buildConsentUpsertPayload(
  userId: string,
  submission: ConsentSubmission,
  acceptedAt = new Date().toISOString(),
) {
  return {
    user_id: userId,
    privacy_policy_version: PRIVACY_POLICY_VERSION,
    terms_version: TERMS_OF_SERVICE_VERSION,
    accepted_privacy_policy_at: acceptedAt,
    accepted_terms_at: acceptedAt,
    accepted_health_sync_at: submission.acceptsHealthSync ? acceptedAt : null,
    accepted_usage_analytics_at: submission.acceptsUsageAnalytics ? acceptedAt : null,
  }
}

export function buildSyncEventPayload({
  userId,
  provider,
  status,
  startedAt,
  completedAt,
  details,
}: {
  userId: string
  provider: 'supabase_auth' | 'apple_health' | 'apple_watch' | 'garmin_connect'
  status: 'success' | 'error'
  startedAt: string
  completedAt: string
  details: Record<string, unknown>
}) {
  return {
    user_id: userId,
    provider,
    sync_status: status,
    started_at: startedAt,
    completed_at: completedAt,
    details,
  }
}

export async function ensureProfile({
  userId,
  email,
}: {
  userId: string
  email: string | null | undefined
}) {
  const client = requireSupabase()
  const timezone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined

  const { error } = await client.from('profiles').upsert(
    {
      id: userId,
      email: email ?? null,
      timezone: timezone ?? null,
    },
    {
      onConflict: 'id',
    },
  )

  if (error) {
    throw error
  }
}

export async function saveOnboardingProfile({
  userId,
  profile,
}: {
  userId: string
  profile: OnboardingProfile
}) {
  saveLocalOnboardingProfile(userId, profile)

  if (!supabase) {
    return {
      savedToCloud: false,
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
    })
    .eq('id', userId)

  if (error) {
    return {
      savedToCloud: false,
    }
  }

  return {
    savedToCloud: true,
  }
}

export async function loadPersistedAppState({
  userId,
  fallbackHealth,
  fallbackTelemetry,
}: {
  userId: string
  fallbackHealth: HealthMetrics
  fallbackTelemetry: TelemetryState
}): Promise<PersistedAppState> {
  const client = requireSupabase()

  const [
    workoutResponse,
    telemetryResponse,
    consentResponse,
    deviceConnectionsResponse,
    profileResponse,
  ] = await Promise.all([
    client
      .from('workout_sessions')
      .select('id, source, title, note, started_at, ended_at, duration_minutes')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(RECENT_WORKOUT_LIMIT),
    client
      .from('telemetry_snapshots')
      .select(
        'source, heart_rate, readiness, stamina, breath_per_minute, endurance, stress_level, weather_condition, weather_temperature_c, recorded_at',
      )
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('user_consents')
      .select(
        'user_id, privacy_policy_version, terms_version, accepted_privacy_policy_at, accepted_terms_at, accepted_health_sync_at, accepted_usage_analytics_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('device_connections')
      .select('id, provider, connection_status, provider_user_id, scopes, last_synced_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    client
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (workoutResponse.error) {
    throw workoutResponse.error
  }

  if (telemetryResponse.error) {
    throw telemetryResponse.error
  }

  if (consentResponse.error) {
    throw consentResponse.error
  }

  if (deviceConnectionsResponse.error) {
    throw deviceConnectionsResponse.error
  }

  if (profileResponse.error) {
    throw profileResponse.error
  }

  const latestSnapshot = telemetryResponse.data as TelemetrySnapshotRow | null
  const deviceConnections = (deviceConnectionsResponse.data ?? []).map((row) =>
    toDeviceConnectionRecord(row as DeviceConnectionRow),
  )
  const appleHealthConnection = deviceConnections.find((connection) => connection.provider === 'apple_health')
  const appleWatchConnection = deviceConnections.find((connection) => connection.provider === 'apple_watch')

  return {
    logs: (workoutResponse.data ?? []).map((row) => toWorkoutLog(row as WorkoutSessionRow)),
    health: {
      heartRate: latestSnapshot?.heart_rate ?? fallbackHealth.heartRate,
      readiness: latestSnapshot?.readiness ?? fallbackHealth.readiness,
      stamina: latestSnapshot?.stamina ?? fallbackHealth.stamina,
      breathPerMinute: latestSnapshot?.breath_per_minute ?? fallbackHealth.breathPerMinute,
      endurance: latestSnapshot?.endurance ?? fallbackHealth.endurance,
      stressLevel: latestSnapshot?.stress_level ?? fallbackHealth.stressLevel,
    },
    telemetry: {
      healthApp: mapConnectionToSyncStatus(appleHealthConnection),
      fitnessWatch: mapConnectionToSyncStatus(appleWatchConnection),
      weather: latestSnapshot?.weather_condition ? 'ready' : fallbackTelemetry.weather,
      weatherSnapshot: latestSnapshot?.weather_condition
        ? {
            condition: latestSnapshot.weather_condition,
            temperatureC: latestSnapshot.weather_temperature_c,
            source: 'device',
          }
        : fallbackTelemetry.weatherSnapshot,
      lastSyncLabel: latestSnapshot?.recorded_at
        ? `Synced ${toTimeLabel(latestSnapshot.recorded_at)}`
        : fallbackTelemetry.lastSyncLabel,
      healthSourceLabel: getHealthSourceLabel(latestSnapshot, deviceConnections),
      watchSourceLabel: getWatchSourceLabel(deviceConnections),
    },
    consent: consentResponse.data ? toConsentRecord(consentResponse.data as UserConsentRow) : null,
    deviceConnections,
    onboardingCompleted: Boolean((profileResponse.data as ProfileRow | null)?.onboarding_completed),
  }
}

export async function saveWorkoutSession(userId: string, session: SessionSavePayload, dedupe = false) {
  const client = requireSupabase()

  if (dedupe) {
    const { data: existing, error: lookupError } = await client
      .from('workout_sessions')
      .select('id, source, title, note, started_at, ended_at, duration_minutes')
      .eq('user_id', userId)
      .eq('source', session.source)
      .eq('started_at', session.startedAt)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existing) {
      return toWorkoutLog(existing as WorkoutSessionRow)
    }
  }

  const { data, error } = await client
    .from('workout_sessions')
    .insert(buildWorkoutInsertPayload(userId, session))
    .select('id, source, title, note, started_at, ended_at, duration_minutes')
    .single()

  if (error) {
    throw error
  }

  return toWorkoutLog(data as WorkoutSessionRow)
}

export async function saveImportedWorkouts(userId: string, sessions: SessionSavePayload[]) {
  const savedWorkouts: WorkoutLog[] = []

  for (const session of sessions) {
    const savedWorkout = await saveWorkoutSession(userId, session, true)
    savedWorkouts.push(savedWorkout)
  }

  return savedWorkouts
}

export async function saveTelemetrySnapshot({
  userId,
  source,
  health,
  weatherCondition,
  weatherTemperatureC,
  recordedAt,
}: {
  userId: string
  source: WorkoutSource | 'weather'
  health: HealthMetrics
  weatherCondition: string | null
  weatherTemperatureC: number | null
  recordedAt: string
}) {
  const client = requireSupabase()

  const { error } = await client.from('telemetry_snapshots').insert({
    user_id: userId,
    source,
    heart_rate: health.heartRate,
    readiness: health.readiness,
    stamina: health.stamina,
    breath_per_minute: health.breathPerMinute,
    endurance: health.endurance,
    stress_level: health.stressLevel,
    weather_condition: weatherCondition,
    weather_temperature_c: weatherTemperatureC,
    recorded_at: recordedAt,
  })

  if (error) {
    throw error
  }
}

export async function upsertUserConsent(userId: string, submission: ConsentSubmission) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('user_consents')
    .upsert(buildConsentUpsertPayload(userId, submission), {
      onConflict: 'user_id',
    })
    .select(
      'user_id, privacy_policy_version, terms_version, accepted_privacy_policy_at, accepted_terms_at, accepted_health_sync_at, accepted_usage_analytics_at',
    )
    .single()

  if (error) {
    throw error
  }

  return toConsentRecord(data as UserConsentRow)
}

export async function recordSyncEvent({
  userId,
  provider,
  status,
  startedAt,
  completedAt,
  details,
}: {
  userId: string
  provider: 'supabase_auth' | 'apple_health' | 'apple_watch' | 'garmin_connect'
  status: 'success' | 'error'
  startedAt: string
  completedAt: string
  details: Record<string, unknown>
}) {
  const client = requireSupabase()
  const { error } = await client.from('sync_events').insert(
    buildSyncEventPayload({
      userId,
      provider,
      status,
      startedAt,
      completedAt,
      details,
    }),
  )

  if (error) {
    throw error
  }
}

export async function upsertDeviceConnection({
  userId,
  provider,
  status,
  scopes,
  providerUserId,
  lastSyncedAt,
}: {
  userId: string
  provider: DeviceProvider
  status: DeviceConnectionStatus
  scopes: string[]
  providerUserId?: string | null
  lastSyncedAt?: string | null
}) {
  const client = requireSupabase()
  const { data: existing, error: existingError } = await client
    .from('device_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const payload = {
    user_id: userId,
    provider,
    connection_status: status,
    provider_user_id: providerUserId ?? null,
    scopes,
    last_synced_at: lastSyncedAt ?? null,
  }

  if (existing?.id) {
    const { error } = await client.from('device_connections').update(payload).eq('id', existing.id)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await client.from('device_connections').insert(payload)

  if (error) {
    throw error
  }
}

export async function saveDeviceConnections(userId: string, deviceConnections: DeviceConnectionRecord[]) {
  for (const connection of deviceConnections) {
    await upsertDeviceConnection({
      userId,
      provider: connection.provider,
      status: connection.status,
      scopes: connection.scopes,
      providerUserId: connection.providerUserId,
      lastSyncedAt: connection.lastSyncedAt,
    })
  }
}

export async function recordAppUsageEvent({
  userId,
  screen,
  eventName,
  metadata = {},
}: {
  userId: string
  screen: string
  eventName: string
  metadata?: Record<string, unknown>
}) {
  const client = requireSupabase()
  const { error } = await client.from('app_usage_events').insert({
    user_id: userId,
    screen,
    event_name: eventName,
    metadata,
  })

  if (error) {
    throw error
  }
}
