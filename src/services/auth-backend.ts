/**
 * Single entry point for the app's auth calls. Dispatches to the Supabase
 * client (src/services/auth.ts) or the Firebase client
 * (src/services/firebase-auth.ts) based on getAuthBackend()
 * (src/services/firebase.ts). App.tsx and the screens import only from
 * here, never the backend-specific files directly.
 */
import type { Session } from '@supabase/supabase-js'
import { onAuthStateChanged, type User } from 'firebase/auth'

import { getAuthBackend, getFirebaseAuth } from './firebase'
import * as supabaseAuth from './auth'
import * as firebaseAuthClient from './firebase-auth'
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

export function normalizeSupabaseSession(session: Session | null): AppSession | null {
  if (!session) return null
  return { user: { id: session.user.id, email: session.user.email ?? null } }
}

function normalizeFirebaseUser(user: User | null): AppSession | null {
  if (!user) return null
  return { user: { id: user.uid, email: user.email } }
}

export function getProviderLabel(provider: SocialAuthProvider): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.getProviderLabel(provider)
    : supabaseAuth.getProviderLabel(provider)
}

export function isAuthRedirectUrl(url: string): boolean {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.isAuthRedirectUrl(url)
    : supabaseAuth.isAuthRedirectUrl(url)
}

export async function submitEmailAuth(params: EmailAuthParams): Promise<EmailAuthResult> {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.submitEmailAuth(params)
    : supabaseAuth.submitEmailAuth(params)
}

export async function startSocialAuth(provider: SocialAuthProvider): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.startSocialAuth(provider)
    return
  }
  await supabaseAuth.startSocialAuth(provider)
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.requestPasswordReset(email)
    return
  }
  await supabaseAuth.requestPasswordReset(email)
}

export async function finalizeAuthFromUrl(url: string): Promise<AppSession | null> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.finalizeAuthFromUrl(url)
    return null
  }

  const session = await supabaseAuth.finalizeAuthFromUrl(url)
  return normalizeSupabaseSession(session)
}

export async function deleteOwnAccount(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.deleteOwnAccount()
    return
  }
  await supabaseAuth.deleteOwnAccount()
}

export async function signOutCurrentUser(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.signOutCurrentUser()
    return
  }
  await supabaseAuth.signOutCurrentUser()
}

export function formatAuthError(error: unknown): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.formatAuthError(error)
    : supabaseAuth.formatAuthError(error)
}

/**
 * Firebase-only auth state subscription, normalized to AppSession. Callers
 * should only invoke this when getAuthBackend() === 'firebase'. Returns a
 * no-op unsubscribe if Firebase isn't configured yet.
 */
export function subscribeToFirebaseAuthChanges(
  callback: (session: AppSession | null) => void,
): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    return () => undefined
  }

  return onAuthStateChanged(auth, (user) => {
    callback(normalizeFirebaseUser(user))
  })
}
