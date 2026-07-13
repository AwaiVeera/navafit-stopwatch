import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { assertAppCheck, assertAuthenticated } from '../security/auth'

interface DeleteAccountResult {
  ok: true
}

/**
 * Recursively deletes users/{uid} and all of its subcollections, plus the
 * matching _rateLimits/{uid} doc, then removes the Firebase Auth user.
 * Mirrors project_bhairava's deleteMyAccount, adapted for NavaFit's schema.
 */
export const deleteMyAccount = onCall<void, Promise<DeleteAccountResult>>(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 120,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request: CallableRequest<void>): Promise<DeleteAccountResult> => {
    const uid = assertAuthenticated(request)
    assertAppCheck(request)

    const db = getFirestore()
    const userRef = db.collection('users').doc(uid)

    // Wipe every subcollection under users/{uid}.
    const subcollections = await userRef.listCollections()
    for (const sub of subcollections) {
      // Batch delete in pages; Firestore limits recursive delete via admin SDK.
      let snap = await sub.limit(400).get()
      while (!snap.empty) {
        const batch = db.batch()
        snap.docs.forEach((d) => batch.delete(d.ref))
        await batch.commit()
        snap = await sub.limit(400).get()
      }
    }

    // Delete the profile document + rate-limit bucket.
    await userRef.delete().catch(() => undefined)
    await db.collection('_rateLimits').doc(uid).delete().catch(() => undefined)

    // Finally delete the Firebase Auth user (invalidates sessions).
    try {
      await getAuth().deleteUser(uid)
    } catch (err) {
      throw new HttpsError(
        'internal',
        `Account data removed but auth deletion failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }

    return { ok: true }
  },
)
