import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

/**
 * Ensures the callable request has an authenticated Firebase user.
 * Throws unauthenticated if not.
 */
export function assertAuthenticated(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }
  return uid
}

/**
 * Enforces Firebase App Check when ENFORCE_APP_CHECK=true.
 * In dev/staging you can leave it off to unblock local testing.
 */
export function assertAppCheck(request: CallableRequest<unknown>): void {
  if (request.app) return

  if (process.env.ENFORCE_APP_CHECK === 'true') {
    throw new HttpsError(
      'failed-precondition',
      'App Check token missing. Protected endpoint denied.',
    )
  }
}
