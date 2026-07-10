/**
 * Pure, synchronous Firebase auth helpers with NO Firebase SDK imports.
 *
 * These are split out of firebase-auth.ts so auth-backend.ts can dispatch the
 * synchronous parts of the API (labels, error formatting, redirect-url check)
 * without statically importing the Firebase SDK. firebase-auth.ts re-exports
 * them so its own public surface is unchanged.
 */
import type { SocialAuthProvider } from '../types'

export function getProviderLabel(provider: SocialAuthProvider): string {
  if (provider === 'apple') return 'Apple'
  if (provider === 'google') return 'Google'
  return 'Facebook'
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
