/**
 * Selector for the four data calls the auth/onboarding/consent flow needs,
 * dispatching to Supabase (src/services/data.ts) or Firestore
 * (src/services/firestore-data.ts) based on getAuthBackend(). Every other
 * screen's data calls (workout logs, telemetry, progression) still import
 * directly from src/services/data.ts and are unaffected by this flag.
 */
import { getAuthBackend } from './firebase'
import * as supabaseData from './data'
import * as firestoreData from './firestore-data'
import type {
  ConsentSubmission,
  HealthMetrics,
  OnboardingProfile,
  PersistedAppState,
  TelemetryState,
  UserConsentRecord,
} from '../types'

export async function ensureProfile(params: {
  userId: string
  email: string | null | undefined
}): Promise<void> {
  if (getAuthBackend() === 'firebase') {
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
  return getAuthBackend() === 'firebase'
    ? firestoreData.loadPersistedAppState(params)
    : supabaseData.loadPersistedAppState(params)
}

export async function saveOnboardingProfile(params: {
  userId: string
  profile: OnboardingProfile
}): Promise<{ savedToCloud: boolean }> {
  return getAuthBackend() === 'firebase'
    ? firestoreData.saveOnboardingProfile(params)
    : supabaseData.saveOnboardingProfile(params)
}

export async function upsertUserConsent(
  userId: string,
  submission: ConsentSubmission,
): Promise<UserConsentRecord> {
  return getAuthBackend() === 'firebase'
    ? firestoreData.upsertUserConsent(userId, submission)
    : supabaseData.upsertUserConsent(userId, submission)
}
