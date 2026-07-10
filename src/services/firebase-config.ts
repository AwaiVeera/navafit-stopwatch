/**
 * Firebase env/flag reads with NO Firebase SDK imports.
 *
 * Anything that runs on the live Supabase path (App.tsx, auth-backend.ts,
 * data-backend.ts) must read the backend flag and config state from here,
 * never from ./firebase — importing ./firebase statically drags the whole
 * Firebase SDK into the main bundle even when Supabase is the active
 * backend. See the same warning in perplexity.ts.
 */

const env = import.meta.env

export const firebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
}

const REQUIRED_KEYS: Array<keyof typeof firebaseWebConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
]

const missing = REQUIRED_KEYS.filter((key) => !firebaseWebConfig[key])

export const isFirebaseConfigured = missing.length === 0

export function getFirebaseSetupMessage(): string {
  if (isFirebaseConfigured) return ''
  const names = missing.map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
  return `Add ${names.join(', ')} to .env.local, then restart the app.`
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
