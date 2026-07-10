/**
 * Firebase Auth client. Public API mirrors src/services/auth.ts exactly so
 * App.tsx can swap by feature flag (see getAuthBackend() in firebase.ts).
 *
 * Native platforms (iOS/Android) use @capacitor-firebase/authentication for
 * Google + Apple sign-in so users see the OS-native sheet. Web uses the
 * Firebase JS SDK popup flow. Email/password uses the JS SDK on both.
 */
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'

import { getFirebaseAuth, getFirebaseFunctions } from './firebase'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

interface EmailAuthParams {
  email: string
  password: string
  mode: EmailAuthMode
}

interface EmailAuthResult {
  message: string
  hasSession: boolean
}

export function getProviderLabel(provider: SocialAuthProvider): string {
  return provider === 'apple' ? 'Apple' : 'Google'
}

/**
 * Firebase never puts tokens or an OAuth code in the return URL when using
 * the Capacitor plugin (native) or signInWithPopup (web). Kept for API
 * parity with auth.ts so App.tsx does not need to change its deep-link
 * handling when the flag flips. Returns false because there is nothing
 * for finalizeAuthFromUrl to do on Firebase.
 */
export function isAuthRedirectUrl(_url: string): boolean {
  return false
}

function requireAuth(): Auth {
  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('Firebase is not configured yet.')
  }
  return auth
}

export async function submitEmailAuth({
  email,
  password,
  mode,
}: EmailAuthParams): Promise<EmailAuthResult> {
  const auth = requireAuth()

  if (mode === 'sign-in') {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password)
    return {
      message: 'Signed in successfully.',
      hasSession: Boolean(cred.user),
    }
  }

  const cred: UserCredential = await createUserWithEmailAndPassword(auth, email, password)
  return {
    message: 'Account created and signed in.',
    hasSession: Boolean(cred.user),
  }
}

export async function startSocialAuth(provider: SocialAuthProvider): Promise<void> {
  const auth = requireAuth()

  if (Capacitor.isNativePlatform()) {
    // Native OS sheet via the Capacitor plugin, then hand the resulting
    // credential to Firebase JS SDK so onAuthStateChanged fires.
    if (provider === 'google') {
      const { credential } = await FirebaseAuthentication.signInWithGoogle()
      const idToken = credential?.idToken
      if (!idToken) {
        throw new Error('Google sign-in returned no ID token.')
      }
      const googleCred = GoogleAuthProvider.credential(idToken, credential?.accessToken ?? undefined)
      await signInWithCredential(auth, googleCred)
      return
    }

    const { credential } = await FirebaseAuthentication.signInWithApple()
    const idToken = credential?.idToken
    if (!idToken) {
      throw new Error('Apple sign-in returned no ID token.')
    }
    const appleProvider = new OAuthProvider('apple.com')
    const appleCred = appleProvider.credential({
      idToken,
      rawNonce: credential?.nonce,
    })
    await signInWithCredential(auth, appleCred)
    return
  }

  // Web: popup flow.
  if (provider === 'google') {
    await signInWithPopup(auth, new GoogleAuthProvider())
    return
  }
  const appleProvider = new OAuthProvider('apple.com')
  appleProvider.addScope('email')
  appleProvider.addScope('name')
  await signInWithPopup(auth, appleProvider)
}

/**
 * Firebase does not use the token-in-URL redirect pattern that Supabase does,
 * so this is a no-op on Firebase. Kept only for API parity with auth.ts.
 */
export async function finalizeAuthFromUrl(_url: string): Promise<User | null> {
  return null
}

export async function deleteOwnAccount(): Promise<void> {
  const auth = requireAuth()
  const functions = getFirebaseFunctions()
  const currentUser = auth.currentUser

  if (!currentUser || !functions) {
    throw new Error('Sign in is required before deleting your account.')
  }

  const callable = httpsCallable<void, { ok: boolean }>(functions, 'deleteMyAccount')
  try {
    const result = await callable()
    if (!result.data?.ok) {
      throw new Error('Account deletion did not complete. Please contact support.')
    }
  } catch (err) {
    // If the callable already deleted the auth user, currentUser goes null
    // and we're done. Anything else is a real failure to surface.
    if (auth.currentUser) {
      // Fall back to client-side auth delete when the callable is unavailable.
      try {
        await deleteUser(currentUser)
      } catch {
        throw err
      }
    }
  }

  try {
    await signOut(auth)
  } catch {
    // Already signed out.
  }
}

/**
 * Turn Firebase error codes into user-facing strings. Mirrors the shape of
 * formatAuthError in auth.ts (returns a friendly string, never throws).
 */
export function formatAuthError(error: unknown): string {
  const fallbackMessage = 'Something went wrong while talking to Firebase Auth.'
  if (!error) return fallbackMessage

  const code = (error as { code?: string }).code ?? ''
  const message = error instanceof Error ? error.message : String(error)

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password does not match an existing account.'
    case 'auth/email-already-in-use':
      return 'That email already has an account. Switch to Sign In instead.'
    case 'auth/weak-password':
      return 'Use a longer password (at least 6 characters), then try again.'
    case 'auth/invalid-email':
      return 'That email address does not look valid.'
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/user-cancelled':
      return 'Sign-in was cancelled.'
    case 'auth/account-exists-with-different-credential':
      return 'This email is already linked to another sign-in method. Try that method.'
    default:
      break
  }

  if (/firebase is not configured yet/i.test(message)) {
    return 'Firebase is not configured yet. Add the environment values before signing in.'
  }

  return message || fallbackMessage
}
