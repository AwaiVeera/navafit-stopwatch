import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'

/**
 * Firebase client init - mirrors the graceful-degradation pattern used by
 * src/services/supabase.ts. If the env vars are absent (they will be, until
 * you add the web firebaseConfig to .env.local), every export stays null and
 * the app continues to run against Supabase. Nothing breaks until the switch.
 *
 * See docs/FIREBASE_PROVISIONING_GUIDE.md for how to fill the values.
 */

const env = import.meta.env

const rawConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
}

const REQUIRED_KEYS: Array<keyof typeof rawConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
]

const missing = REQUIRED_KEYS.filter((key) => !rawConfig[key])

export const isFirebaseConfigured = missing.length === 0

export function getFirebaseSetupMessage(): string {
  if (isFirebaseConfigured) return ''
  const names = missing.map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
  return `Add ${names.join(', ')} to .env.local, then restart the app.`
}

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null
let cachedFirestore: Firestore | null = null
let cachedFunctions: Functions | null = null

function ensureApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null
  if (cachedApp) return cachedApp

  cachedApp = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: rawConfig.apiKey!,
        authDomain: rawConfig.authDomain!,
        projectId: rawConfig.projectId!,
        storageBucket: rawConfig.storageBucket,
        messagingSenderId: rawConfig.messagingSenderId,
        appId: rawConfig.appId!,
        measurementId: rawConfig.measurementId,
      })
  return cachedApp
}

export function getFirebaseApp(): FirebaseApp | null {
  return ensureApp()
}

export function getFirebaseAuth(): Auth | null {
  const app = ensureApp()
  if (!app) return null
  if (!cachedAuth) cachedAuth = getAuth(app)
  return cachedAuth
}

export function getFirebaseFirestore(): Firestore | null {
  const app = ensureApp()
  if (!app) return null
  if (!cachedFirestore) cachedFirestore = getFirestore(app)
  return cachedFirestore
}

export function getFirebaseFunctions(): Functions | null {
  const app = ensureApp()
  if (!app) return null
  // Region matches setGlobalOptions() in functions/src/index.ts.
  if (!cachedFunctions) cachedFunctions = getFunctions(app, 'asia-southeast1')
  return cachedFunctions
}

/**
 * Feature flag used during the staged Supabase -> Firebase cutover.
 * Defaults to 'supabase' so the live app is unaffected by these additions.
 */
export type AuthBackend = 'supabase' | 'firebase'

export function getAuthBackend(): AuthBackend {
  const value = env.VITE_AUTH_BACKEND?.trim().toLowerCase()
  return value === 'firebase' ? 'firebase' : 'supabase'
}
