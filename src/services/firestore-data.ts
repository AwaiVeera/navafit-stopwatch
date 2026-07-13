/**
 * Firestore data layer. Public API mirrors src/services/data.ts so App.tsx
 * and telemetry.ts can swap by feature flag / import when the migration
 * flips. Owner-scoped under users/{uid}/**, matching firestore.rules.
 *
 * localStorage helpers are intentionally duplicated from data.ts for the
 * staged cutover; at Phase 11 (Supabase decommission) data.ts is deleted
 * and this file becomes the single source of truth.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { addDoc } from 'firebase/firestore'

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
  TrainingProgression,
  UserConsentRecord,
  WorkoutLog,
  WorkoutSource,
} from '../types'
import { getFirebaseFirestore, getFirebaseAuth } from './firebase'

const RECENT_WORKOUT_LIMIT = 12
const LOCAL_WORKOUT_CACHE_PREFIX = 'navafit:workout-cache:'
const LOCAL_ONBOARDING_PROFILE_PREFIX = 'navafit:onboarding-profile:'
const LOCAL_PROGRESSION_PREFIX = 'navafit:progression:'

const EMPTY_PROGRESSION: TrainingProgression = {
  stopwatch: { intermediate: 0, advanced: 0 },
  breathwork: { intermediate: 0, advanced: 0 },
}

// -----------------------------------------------------------------------------
// Firestore helpers
// -----------------------------------------------------------------------------

function requireFirestore(): Firestore {
  const db = getFirebaseFirestore()
  if (!db) {
    throw new Error('Firebase is not configured yet.')
  }
  return db
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return null
}

function requireIso(value: unknown, fallback: string): string {
  return toIsoOrNull(value) ?? fallback
}

function formatWorkoutDate(startedAt: string): string {
  return startedAt.slice(0, 10)
}

function toTimeLabel(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function isWorkoutSource(value: unknown): value is WorkoutSource {
  return value === 'app' || value === 'apple_health' || value === 'apple_watch' || value === 'garmin_connect'
}

// -----------------------------------------------------------------------------
// Local storage helpers (duplicated from data.ts for staged cutover safety)
// -----------------------------------------------------------------------------

function getLocalWorkoutCacheKey(userId: string) {
  return `${LOCAL_WORKOUT_CACHE_PREFIX}${userId}`
}

function getLocalOnboardingProfileKey(userId: string) {
  return `${LOCAL_ONBOARDING_PROFILE_PREFIX}${userId}`
}

function getLocalProgressionKey(userId: string) {
  return `${LOCAL_PROGRESSION_PREFIX}${userId}`
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!value || typeof value !== 'object') return false
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
  if (candidate.startedAt !== undefined && typeof candidate.startedAt !== 'string') return false
  if (candidate.endedAt !== undefined && candidate.endedAt !== null && typeof candidate.endedAt !== 'string') return false
  if (candidate.source !== undefined && !isWorkoutSource(candidate.source)) return false
  return true
}

function isOnboardingProfile(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return (
    typeof c.ageYears === 'number' &&
    Number.isFinite(c.ageYears) &&
    typeof c.heightCm === 'number' &&
    Number.isFinite(c.heightCm) &&
    typeof c.weightKg === 'number' &&
    Number.isFinite(c.weightKg) &&
    typeof c.trainingDaysPerWeek === 'number' &&
    Number.isFinite(c.trainingDaysPerWeek)
  )
}

function isTrainingProgression(value: unknown): value is TrainingProgression {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (!candidate.stopwatch || typeof candidate.stopwatch !== 'object') return false
  if (!candidate.breathwork || typeof candidate.breathwork !== 'object') return false
  const sw = candidate.stopwatch as Record<string, unknown>
  const bw = candidate.breathwork as Record<string, unknown>
  return (
    typeof sw.intermediate === 'number' &&
    typeof sw.advanced === 'number' &&
    typeof bw.intermediate === 'number' &&
    typeof bw.advanced === 'number'
  )
}

export function loadLocalWorkoutCache(userId: string): WorkoutLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getLocalWorkoutCacheKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is WorkoutLog => isWorkoutLog(entry)).slice(0, RECENT_WORKOUT_LIMIT)
  } catch {
    return []
  }
}

export function saveLocalWorkoutCache(userId: string, logs: WorkoutLog[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      getLocalWorkoutCacheKey(userId),
      JSON.stringify(logs.slice(0, RECENT_WORKOUT_LIMIT)),
    )
  } catch {
    // Ignore quota/private-mode failures.
  }
}

export function loadLocalOnboardingProfile(userId: string): OnboardingProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(getLocalOnboardingProfileKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isOnboardingProfile(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function saveLocalOnboardingProfile(userId: string, profile: OnboardingProfile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getLocalOnboardingProfileKey(userId), JSON.stringify(profile))
  } catch {
    // Ignore
  }
}

export function loadLocalProgression(userId: string): TrainingProgression {
  if (typeof window === 'undefined') return { ...EMPTY_PROGRESSION }
  try {
    const raw = window.localStorage.getItem(getLocalProgressionKey(userId))
    if (!raw) return { ...EMPTY_PROGRESSION }
    const parsed: unknown = JSON.parse(raw)
    if (isTrainingProgression(parsed)) return parsed
    return { ...EMPTY_PROGRESSION }
  } catch {
    return { ...EMPTY_PROGRESSION }
  }
}

export function saveLocalProgression(userId: string, progression: TrainingProgression): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getLocalProgressionKey(userId), JSON.stringify(progression))
  } catch {
    // Ignore
  }
}

export function mergeProgressions(local: TrainingProgression, cloud: TrainingProgression): TrainingProgression {
  return {
    stopwatch: {
      intermediate: Math.max(local.stopwatch.intermediate, cloud.stopwatch.intermediate),
      advanced: Math.max(local.stopwatch.advanced, cloud.stopwatch.advanced),
    },
    breathwork: {
      intermediate: Math.max(local.breathwork.intermediate, cloud.breathwork.intermediate),
      advanced: Math.max(local.breathwork.advanced, cloud.breathwork.advanced),
    },
  }
}

// -----------------------------------------------------------------------------
// Bootstrap marker (triggers onUserBootstrap Cloud Function, which seeds the
// users/{uid} profile if it does not already exist).
// -----------------------------------------------------------------------------

async function ensureBootstrapMarker(userId: string, email: string | null | undefined, timezone: string | null): Promise<void> {
  const db = requireFirestore()
  const bootstrapRef = doc(db, 'users', userId, '_bootstrap', 'init')
  await setDoc(
    bootstrapRef,
    {
      email: email ?? null,
      timezone,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export async function ensureProfile({
  userId,
  email,
}: {
  userId: string
  email: string | null | undefined
}): Promise<void> {
  const db = requireFirestore()
  const timezone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null

  const profileRef = doc(db, 'users', userId)
  await setDoc(
    profileRef,
    {
      email: email ?? null,
      timezone: timezone ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  // Fire the bootstrap trigger for first-time seeding of defaults.
  await ensureBootstrapMarker(userId, email, timezone)
}

export async function saveOnboardingProfile({
  userId,
  profile,
}: {
  userId: string
  profile: OnboardingProfile
}): Promise<{ savedToCloud: boolean }> {
  saveLocalOnboardingProfile(userId, profile)

  const db = getFirebaseFirestore()
  if (!db) return { savedToCloud: false }

  try {
    await updateDoc(doc(db, 'users', userId), {
      onboardingCompleted: true,
      onboardingProfile: profile,
      updatedAt: serverTimestamp(),
    })
    return { savedToCloud: true }
  } catch {
    return { savedToCloud: false }
  }
}

// -----------------------------------------------------------------------------
// Consent
// -----------------------------------------------------------------------------

export function buildConsentPayload(submission: ConsentSubmission, acceptedAt = new Date().toISOString()) {
  return {
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    termsVersion: TERMS_OF_SERVICE_VERSION,
    acceptedPrivacyPolicyAt: acceptedAt,
    acceptedTermsAt: acceptedAt,
    acceptedHealthSyncAt: submission.acceptsHealthSync ? acceptedAt : null,
    acceptedUsageAnalyticsAt: submission.acceptsUsageAnalytics ? acceptedAt : null,
  }
}

export async function upsertUserConsent(userId: string, submission: ConsentSubmission): Promise<UserConsentRecord> {
  const db = requireFirestore()
  const payload = buildConsentPayload(submission)
  // A single stable doc ("current") keeps the read path simple; historical
  // consents live under users/{uid}/consents/{docId} if we ever need them.
  const ref = doc(db, 'users', userId, 'consents', 'current')
  await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
  return {
    userId,
    privacyPolicyVersion: payload.privacyPolicyVersion,
    termsVersion: payload.termsVersion,
    acceptedPrivacyPolicyAt: payload.acceptedPrivacyPolicyAt,
    acceptedTermsAt: payload.acceptedTermsAt,
    acceptedHealthSyncAt: payload.acceptedHealthSyncAt,
    acceptedUsageAnalyticsAt: payload.acceptedUsageAnalyticsAt,
  }
}

// -----------------------------------------------------------------------------
// Workout sessions
// -----------------------------------------------------------------------------

interface WorkoutSessionDoc {
  source: WorkoutSource
  title: string
  note: string
  startedAt: string | Timestamp
  endedAt: string | Timestamp | null
  durationMinutes: number
  metadata?: Record<string, unknown>
}

function toWorkoutLog(id: string, data: WorkoutSessionDoc): WorkoutLog {
  const startedAt = requireIso(data.startedAt, new Date().toISOString())
  return {
    id,
    date: formatWorkoutDate(startedAt),
    title: data.title,
    durationMinutes: data.durationMinutes,
    note: data.note,
    startedAt,
    endedAt: toIsoOrNull(data.endedAt),
    source: data.source,
  }
}

function workoutIdFromStartedAt(source: WorkoutSource, startedAt: string): string {
  // Stable ID so the same import (same started_at + source) is deduped on retry.
  return `${source}_${startedAt.replace(/[^0-9A-Za-z]/g, '')}`
}

export async function saveWorkoutSession(
  userId: string,
  session: SessionSavePayload,
  dedupe = false,
): Promise<WorkoutLog> {
  const db = requireFirestore()
  const sessionsCol = collection(db, 'users', userId, 'workoutSessions')

  if (dedupe) {
    const id = workoutIdFromStartedAt(session.source, session.startedAt)
    const ref = doc(sessionsCol, id)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return toWorkoutLog(snap.id, snap.data() as WorkoutSessionDoc)
    }
    const payload: WorkoutSessionDoc = {
      source: session.source,
      title: session.title,
      note: session.note,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      durationMinutes: session.durationMinutes,
      metadata: session.metadata ?? {},
    }
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
    return toWorkoutLog(id, payload)
  }

  // Non-dedupe path: use Firestore auto-id.
  const ref = await addDoc(sessionsCol, {
    source: session.source,
    title: session.title,
    note: session.note,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    durationMinutes: session.durationMinutes,
    metadata: session.metadata ?? {},
    createdAt: serverTimestamp(),
  })
  return toWorkoutLog(ref.id, {
    source: session.source,
    title: session.title,
    note: session.note,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    durationMinutes: session.durationMinutes,
  })
}

export async function saveImportedWorkouts(userId: string, sessions: SessionSavePayload[]): Promise<WorkoutLog[]> {
  const saved: WorkoutLog[] = []
  for (const session of sessions) {
    const workout = await saveWorkoutSession(userId, session, true)
    saved.push(workout)
  }
  return saved
}

// -----------------------------------------------------------------------------
// Telemetry snapshots (create-only per rules)
// -----------------------------------------------------------------------------

interface TelemetrySnapshotDoc {
  source: WorkoutSource | 'weather'
  heartRate: number | null
  readiness: number | null
  stamina: number | null
  breathPerMinute: number | null
  endurance: number | null
  stressLevel: number | null
  weatherCondition: string | null
  weatherTemperatureC: number | null
  recordedAt: string | Timestamp
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
}): Promise<void> {
  const db = requireFirestore()
  await addDoc(collection(db, 'users', userId, 'telemetrySnapshots'), {
    source,
    heartRate: health.heartRate,
    readiness: health.readiness,
    stamina: health.stamina,
    breathPerMinute: health.breathPerMinute,
    endurance: health.endurance,
    stressLevel: health.stressLevel,
    weatherCondition,
    weatherTemperatureC,
    recordedAt,
    createdAt: serverTimestamp(),
  } satisfies TelemetrySnapshotDoc & { createdAt: unknown })
}

// -----------------------------------------------------------------------------
// Device connections (owner-writable, keyed by provider so upsert is stable)
// -----------------------------------------------------------------------------

interface DeviceConnectionDoc {
  provider: DeviceProvider
  status: DeviceConnectionStatus
  providerUserId: string | null
  scopes: string[]
  lastSyncedAt: string | Timestamp | null
}

function toDeviceConnectionRecord(data: DeviceConnectionDoc): DeviceConnectionRecord {
  return {
    provider: data.provider,
    status: data.status,
    providerUserId: data.providerUserId ?? null,
    scopes: coerceStringArray(data.scopes),
    lastSyncedAt: toIsoOrNull(data.lastSyncedAt),
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
}): Promise<void> {
  const db = requireFirestore()
  const ref = doc(db, 'users', userId, 'deviceConnections', provider)
  await setDoc(
    ref,
    {
      provider,
      status,
      providerUserId: providerUserId ?? null,
      scopes,
      lastSyncedAt: lastSyncedAt ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function saveDeviceConnections(userId: string, connections: DeviceConnectionRecord[]): Promise<void> {
  for (const connection of connections) {
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

// -----------------------------------------------------------------------------
// Sync events + usage analytics (create-only)
// -----------------------------------------------------------------------------

export async function recordSyncEvent({
  userId,
  provider,
  status,
  startedAt,
  completedAt,
  details,
}: {
  userId: string
  provider: 'supabase_auth' | 'firebase_auth' | 'apple_health' | 'apple_watch' | 'garmin_connect'
  status: 'success' | 'error'
  startedAt: string
  completedAt: string
  details: Record<string, unknown>
}): Promise<void> {
  const db = requireFirestore()
  await addDoc(collection(db, 'users', userId, 'syncEvents'), {
    provider,
    syncStatus: status,
    startedAt,
    completedAt,
    details,
    createdAt: serverTimestamp(),
  })
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
}): Promise<void> {
  const db = requireFirestore()
  await addDoc(collection(db, 'users', userId, 'usageEvents'), {
    screen,
    eventName,
    metadata,
    createdAt: serverTimestamp(),
  })
}

// -----------------------------------------------------------------------------
// Progression (stored on the profile doc, mirrors Supabase's approach)
// -----------------------------------------------------------------------------

export async function loadCloudProgression(userId: string): Promise<TrainingProgression> {
  const db = getFirebaseFirestore()
  if (!db) return { ...EMPTY_PROGRESSION }
  try {
    const snap = await getDoc(doc(db, 'users', userId))
    if (!snap.exists()) return { ...EMPTY_PROGRESSION }
    const raw = (snap.data() as { trainingProgression?: unknown }).trainingProgression
    if (isTrainingProgression(raw)) return raw
    return { ...EMPTY_PROGRESSION }
  } catch {
    return { ...EMPTY_PROGRESSION }
  }
}

export async function saveCloudProgression(userId: string, progression: TrainingProgression): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) return
  try {
    await updateDoc(doc(db, 'users', userId), { trainingProgression: progression })
  } catch {
    // Non-critical: local copy is primary.
  }
}

// -----------------------------------------------------------------------------
// Bulk load for App boot
// -----------------------------------------------------------------------------

interface UserProfileDoc {
  email?: string | null
  timezone?: string | null
  onboardingCompleted?: boolean
  onboardingProfile?: OnboardingProfile
  trainingProgression?: TrainingProgression
}

interface UserConsentDoc {
  privacyPolicyVersion: string
  termsVersion: string
  acceptedPrivacyPolicyAt: string | Timestamp
  acceptedTermsAt: string | Timestamp
  acceptedHealthSyncAt: string | Timestamp | null
  acceptedUsageAnalyticsAt: string | Timestamp | null
}

function toConsentRecord(userId: string, data: UserConsentDoc): UserConsentRecord {
  return {
    userId,
    privacyPolicyVersion: data.privacyPolicyVersion,
    termsVersion: data.termsVersion,
    acceptedPrivacyPolicyAt: requireIso(data.acceptedPrivacyPolicyAt, ''),
    acceptedTermsAt: requireIso(data.acceptedTermsAt, ''),
    acceptedHealthSyncAt: toIsoOrNull(data.acceptedHealthSyncAt),
    acceptedUsageAnalyticsAt: toIsoOrNull(data.acceptedUsageAnalyticsAt),
  }
}

function mapConnectionToSyncStatus(connection: DeviceConnectionRecord | undefined): TelemetryState['healthApp'] {
  if (!connection) return 'idle'
  if (connection.status === 'error') return 'error'
  if (connection.status === 'revoked') return 'unavailable'
  if (connection.status === 'active' && connection.lastSyncedAt) return 'ready'
  return 'idle'
}

function getHealthSourceLabel(
  latestSnapshotSource: TelemetrySnapshotDoc['source'] | undefined,
  deviceConnections: DeviceConnectionRecord[],
): string {
  if (latestSnapshotSource === 'apple_watch') return 'Apple Watch via HealthKit'
  if (latestSnapshotSource === 'apple_health') return 'Apple Health'
  if (deviceConnections.some((c) => c.provider === 'apple_health' && c.status === 'active')) return 'Apple Health linked'
  if (deviceConnections.some((c) => c.provider === 'garmin_connect' && c.status === 'active')) return 'Garmin linked'
  return 'App baseline'
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
  const db = requireFirestore()
  const userRef = doc(db, 'users', userId)

  const [profileSnap, consentSnap, workoutsSnap, telemetrySnap, deviceSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(doc(db, 'users', userId, 'consents', 'current')),
    getDocs(
      query(
        collection(db, 'users', userId, 'workoutSessions'),
        orderBy('startedAt', 'desc'),
        limit(RECENT_WORKOUT_LIMIT),
      ),
    ),
    getDocs(
      query(
        collection(db, 'users', userId, 'telemetrySnapshots'),
        orderBy('recordedAt', 'desc'),
        limit(1),
      ),
    ),
    getDocs(collection(db, 'users', userId, 'deviceConnections')),
  ])

  const profile = (profileSnap.exists() ? (profileSnap.data() as UserProfileDoc) : null) ?? {}
  const logs: WorkoutLog[] = workoutsSnap.docs.map((d) => toWorkoutLog(d.id, d.data() as WorkoutSessionDoc))
  const latestSnapshot: TelemetrySnapshotDoc | null = telemetrySnap.empty
    ? null
    : (telemetrySnap.docs[0].data() as TelemetrySnapshotDoc)
  const deviceConnections: DeviceConnectionRecord[] = deviceSnap.docs.map((d) =>
    toDeviceConnectionRecord(d.data() as DeviceConnectionDoc),
  )

  const appleHealth = deviceConnections.find((c) => c.provider === 'apple_health')

  return {
    logs,
    health: {
      heartRate: latestSnapshot?.heartRate ?? fallbackHealth.heartRate,
      readiness: latestSnapshot?.readiness ?? fallbackHealth.readiness,
      stamina: latestSnapshot?.stamina ?? fallbackHealth.stamina,
      breathPerMinute: latestSnapshot?.breathPerMinute ?? fallbackHealth.breathPerMinute,
      endurance: latestSnapshot?.endurance ?? fallbackHealth.endurance,
      stressLevel: latestSnapshot?.stressLevel ?? fallbackHealth.stressLevel,
      stepsToday: fallbackHealth.stepsToday,
    },
    telemetry: {
      healthApp: mapConnectionToSyncStatus(appleHealth),
      weather: latestSnapshot?.weatherCondition ? 'ready' : fallbackTelemetry.weather,
      weatherSnapshot: latestSnapshot?.weatherCondition
        ? {
            condition: latestSnapshot.weatherCondition,
            temperatureC: latestSnapshot.weatherTemperatureC,
            source: 'device',
          }
        : fallbackTelemetry.weatherSnapshot,
      lastSyncLabel: latestSnapshot?.recordedAt
        ? `Synced ${toTimeLabel(requireIso(latestSnapshot.recordedAt, ''))}`
        : fallbackTelemetry.lastSyncLabel,
      healthSourceLabel: getHealthSourceLabel(latestSnapshot?.source, deviceConnections),
    },
    consent: consentSnap.exists() ? toConsentRecord(userId, consentSnap.data() as UserConsentDoc) : null,
    deviceConnections,
    onboardingCompleted: Boolean(profile.onboardingCompleted),
  }
}

// -----------------------------------------------------------------------------
// Batch delete helper (used by dev tooling; account deletion runs server-side
// via the deleteMyAccount callable — see functions/src/account/deleteMyAccount.ts).
// -----------------------------------------------------------------------------

export async function deleteAllUserSubcollectionsClient(userId: string): Promise<void> {
  // Client-side wipe should ONLY be used by the migration tooling / tests.
  // Production account deletion goes through the callable to also delete the
  // Firebase Auth user in one atomic step.
  const db = requireFirestore()
  const auth = getFirebaseAuth()
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Client-side subcollection wipe requires an authenticated matching user.')
  }
  const subs = ['workoutSessions', 'telemetrySnapshots', 'syncEvents', 'usageEvents', 'consents', 'deviceConnections']
  for (const sub of subs) {
    const snap = await getDocs(query(collection(db, 'users', userId, sub), limit(400)))
    if (snap.empty) continue
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  // Silence unused-import compile warnings for `where` (kept for future filtered queries).
  void where
}
