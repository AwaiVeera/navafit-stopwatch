import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

interface RateLimitOptions {
  /** Unique bucket key per callable (e.g. "ayChat"). */
  bucket: string
  /** Max calls allowed inside the window. */
  max: number
  /** Window length in seconds. */
  windowSeconds: number
}

/**
 * Simple per-user, per-bucket sliding-window rate limit backed by
 * _rateLimits/{uid} in Firestore. Server-only collection.
 */
export async function assertRateLimit(uid: string, options: RateLimitOptions): Promise<void> {
  const { bucket, max, windowSeconds } = options
  const db = getFirestore()
  const ref = db.collection('_rateLimits').doc(uid)
  const now = Timestamp.now()
  const cutoffMillis = now.toMillis() - windowSeconds * 1000

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() ?? {} : {}
    const raw = Array.isArray(data[bucket]) ? (data[bucket] as unknown[]) : []
    const recent: Timestamp[] = raw
      .filter((v): v is Timestamp => v instanceof Timestamp)
      .filter((ts) => ts.toMillis() >= cutoffMillis)

    if (recent.length >= max) {
      throw new HttpsError(
        'resource-exhausted',
        `Too many requests. Try again shortly.`,
      )
    }

    recent.push(now)
    tx.set(ref, { [bucket]: recent, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  })
}
