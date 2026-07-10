/**
 * Single entry point for the app's auth calls. Dispatches to the Supabase
 * client (src/services/auth.ts) or the Firebase client
 * (src/services/firebase-auth.ts) based on getAuthBackend()
 * (src/services/firebase-config.ts). App.tsx and the screens import only from
 * here, never the backend-specific files directly.
 *
 * The Firebase client is loaded with dynamic import() so the Firebase SDK
 * stays out of the main bundle while Supabase is the active backend. Only
 * SDK-free modules (./firebase-config, ./firebase-auth-messages) may be
 * imported statically here. See the same warning in perplexity.ts.
 */
import type { Session } from '@supabase/supabase-js'

import { getAuthBackend } from './firebase-config'
import * as supabaseAuth from './auth'
import * as firebaseAuthMessages from './firebase-auth-messages'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

export interface AppSession {
  user: {
    id: string
    email: string | null
  }
}

interface EmailAuthParams {
  email: string
  password: string
  mode: EmailAuthMode
}

interface EmailAuthResult {
  message: string
  hasSession: boolean
}

/** Lazily pulls in the Firebase SDK-backed auth client. */
function loadFirebaseAuthClient() {
  return import('./firebase-auth')
}

export function normalizeSupabaseSession(session: Session | null): AppSession | null {
  if (!session) return null
  return { user: { id: session.user.id, email: session.user.email ?? null } }
}

function normalizeFirebaseUser(user: { uid: string; email: string | null } | null): AppSession | null {
  if (!user) return null
  return { user: { id: user.uid, email: user.email } }
}

export function getProviderLabel(provider: SocialAuthProvider): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthMessages.getProviderLabel(provider)
    : supabaseAuth.getProviderLabel(provider)
}

export function isAuthRedirectUrl(url: string): boolean {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthMessages.isAuthRedirectUrl(url)
    : supabaseAuth.isAuthRedirectUrl(url)
}

export async function submitEmailAuth(params: EmailAuthParams): Promise<EmailAuthResult> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    return firebaseAuthClient.submitEmailAuth(params)
  }
  return supabaseAuth.submitEmailAuth(params)
}

export async function startSocialAuth(provider: SocialAuthProvider): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    await firebaseAuthClient.startSocialAuth(provider)
    return
  }
  await supabaseAuth.startSocialAuth(provider)
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    await firebaseAuthClient.requestPasswordReset(email)
    return
  }
  await supabaseAuth.requestPasswordReset(email)
}

export async function finalizeAuthFromUrl(url: string): Promise<AppSession | null> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    await firebaseAuthClient.finalizeAuthFromUrl(url)
    return null
  }

  const session = await supabaseAuth.finalizeAuthFromUrl(url)
  return normalizeSupabaseSession(session)
}

export async function deleteOwnAccount(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    await firebaseAuthClient.deleteOwnAccount()
    return
  }
  await supabaseAuth.deleteOwnAccount()
}

export async function signOutCurrentUser(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    const firebaseAuthClient = await loadFirebaseAuthClient()
    await firebaseAuthClient.signOutCurrentUser()
    return
  }
  await supabaseAuth.signOutCurrentUser()
}

export function formatAuthError(error: unknown): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthMessages.formatAuthError(error)
    : supabaseAuth.formatAuthError(error)
}

/**
 * Firebase-only auth state subscription, normalized to AppSession. Callers
 * should only invoke this when getAuthBackend() === 'firebase'. Returns a
 * no-op unsubscribe if Firebase isn't configured yet.
 *
 * The subscription is wired up asynchronously because the Firebase SDK is
 * dynamically imported; the returned unsubscribe is safe to call before the
 * import settles (it cancels the pending subscription).
 */
export function subscribeToFirebaseAuthChanges(
  callback: (session: AppSession | null) => void,
): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  void (async () => {
    const [{ onAuthStateChanged }, { getFirebaseAuth }] = await Promise.all([
      import('firebase/auth'),
      import('./firebase'),
    ])

    const auth = getFirebaseAuth()
    if (!auth || cancelled) {
      return
    }

    const handle = onAuthStateChanged(auth, (user) => {
      callback(normalizeFirebaseUser(user))
    })

    if (cancelled) {
      handle()
      return
    }

    unsubscribe = handle
  })()

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}
