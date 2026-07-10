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

import {
  firebaseWebConfig as rawConfig,
  getFirebaseSetupMessage,
  isFirebaseConfigured,
} from './firebase-config'

// Re-exported so existing consumers (perplexity.ts's dynamic import of this
// module) keep working. Modules on the live Supabase path must import these
// from ./firebase-config directly to avoid pulling in the SDK.
export { getFirebaseSetupMessage, isFirebaseConfigured }
export { getAuthBackend, type AuthBackend } from './firebase-config'

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

