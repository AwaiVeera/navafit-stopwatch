import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'

/**
 * Seed a profile document when the client (post-signup) writes a placeholder
 * marker at users/{uid}/_bootstrap/init. Firebase Auth v2 does not expose a
 * blocking onCreate trigger for auth events without Identity Platform, so we
 * key the seed on the first Firestore write instead — the client fires it
 * once after createUserWithEmailAndPassword / OAuth sign-in.
 *
 * If the profile already exists we leave it untouched.
 */
export const onUserBootstrap = onDocumentCreated(
  {
    document: 'users/{uid}/_bootstrap/init',
    region: 'asia-southeast1',
  },
  async (event) => {
    const uid = event.params.uid
    const db = getFirestore()
    const profileRef = db.collection('users').doc(uid)

    try {
      const snap = await profileRef.get()
      if (snap.exists) {
        logger.info('onUserBootstrap: profile exists, skipping seed', { uid })
        return
      }

      const data = event.data?.data() ?? {}
      const email = typeof data.email === 'string' ? data.email : null
      const timezone = typeof data.timezone === 'string' ? data.timezone : null

      await profileRef.set(
        {
          email,
          timezone,
          onboardingCompleted: false,
          trainingProgression: {},
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      logger.info('onUserBootstrap: profile seeded', { uid })
    } catch (err) {
      logger.error('onUserBootstrap failed', { uid, err })
    }
  },
)
