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
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  FacebookAuthProvider,
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

// Pure helpers live in firebase-auth-messages.ts (no SDK import) so that
// auth-backend.ts can dispatch them synchronously without pulling the
// Firebase SDK into the main bundle. Re-exported here for API parity.
export { formatAuthError, getProviderLabel, isAuthRedirectUrl } from './firebase-auth-messages'

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

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = requireAuth()
  await sendPasswordResetEmail(auth, email)
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

    if (provider === 'facebook') {
      const { credential } = await FirebaseAuthentication.signInWithFacebook()
      const accessToken = credential?.accessToken
      if (!accessToken) {
        throw new Error('Facebook sign-in returned no access token.')
      }
      const facebookCred = FacebookAuthProvider.credential(accessToken)
      await signInWithCredential(auth, facebookCred)
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
  if (provider === 'facebook') {
    await signInWithPopup(auth, new FacebookAuthProvider())
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

export async function signOutCurrentUser(): Promise<void> {
  const auth = requireAuth()
  await signOut(auth)
}
