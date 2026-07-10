/**
 * Selector for the four data calls the auth/onboarding/consent flow needs,
 * dispatching to Supabase (src/services/data.ts) or Firestore
 * (src/services/firestore-data.ts) based on getAuthBackend(). Every other
 * screen's data calls (workout logs, telemetry, progression) still import
 * directly from src/services/data.ts and are unaffected by this flag.
 *
 * The Firestore client is loaded with dynamic import() so the Firebase SDK
 * stays out of the main bundle while Supabase is the active backend. Read the
 * backend flag from ./firebase-config (SDK-free), never from ./firebase.
 */
import { getAuthBackend } from './firebase-config'
import * as supabaseData from './data'
import type {
  ConsentSubmission,
  HealthMetrics,
  OnboardingProfile,
  PersistedAppState,
  TelemetryState,
  UserConsentRecord,
} from '../types'

/** Lazily pulls in the Firebase SDK-backed Firestore data client. */
function loadFirestoreData() {
  return import('./firestore-data')
}

export async function ensureProfile(params: {
  userId: string
  email: string | null | undefined
}): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    const firestoreData = await loadFirestoreData()
    await firestoreData.ensureProfile(params)
    return
  }
  await supabaseData.ensureProfile(params)
}

export async function loadPersistedAppState(params: {
  userId: string
  fallbackHealth: HealthMetrics
  fallbackTelemetry: TelemetryState
}): Promise<PersistedAppState> {
  if (getAuthBackend() === 'firebase') {
    const firestoreData = await loadFirestoreData()
    return firestoreData.loadPersistedAppState(params)
  }
  return supabaseData.loadPersistedAppState(params)
}

export async function saveOnboardingProfile(params: {
  userId: string
  profile: OnboardingProfile
}): Promise<{ savedToCloud: boolean }> {
  if (getAuthBackend() === 'firebase') {
    const firestoreData = await loadFirestoreData()
    return firestoreData.saveOnboardingProfile(params)
  }
  return supabaseData.saveOnboardingProfile(params)
}

export async function upsertUserConsent(
  userId: string,
  submission: ConsentSubmission,
): Promise<UserConsentRecord> {
  if (getAuthBackend() === 'firebase') {
    const firestoreData = await loadFirestoreData()
    return firestoreData.upsertUserConsent(userId, submission)
  }
  return supabaseData.upsertUserConsent(userId, submission)
}
