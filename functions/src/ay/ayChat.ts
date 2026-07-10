import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

import { assertAppCheck, assertAuthenticated } from '../security/auth'
import { assertRateLimit } from '../security/rateLimit'
import {
  callGemini,
  callOpenAI,
  callPerplexity,
  resolveProviderFromEnv,
  type AYMsg,
} from './providers'
import { enforceGrounding } from './prompt'

// Secrets are defined here so the deploy tooling wires them into the function
// runtime; only the provider key you actually configure will be non-null.
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')
const PERPLEXITY_API_KEY = defineSecret('PERPLEXITY_API_KEY')

interface AYChatPayload {
  messages?: AYMsg[]
}

interface AYChatResult {
  content: string
}

export const ayChat = onCall<AYChatPayload, Promise<AYChatResult>>(
  {
    region: 'asia-southeast1',
    secrets: [GEMINI_API_KEY, OPENAI_API_KEY, PERPLEXITY_API_KEY],
    timeoutSeconds: 60,
    memory: '512MiB',
    enforceAppCheck: false,
  },
  async (request: CallableRequest<AYChatPayload>): Promise<AYChatResult> => {
    const uid = assertAuthenticated(request)
    assertAppCheck(request)
    await assertRateLimit(uid, { bucket: 'ayChat', max: 20, windowSeconds: 60 })

    const messages = request.data?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages required')
    }

    const provider = resolveProviderFromEnv()
    if (!provider) {
      throw new HttpsError(
        'failed-precondition',
        'No AI backend configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY.',
      )
    }

    try {
      let content = ''
      if (provider === 'gemini') {
        const key = GEMINI_API_KEY.value()
        if (!key) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not set')
        content = await callGemini(key, messages)
      } else if (provider === 'openai') {
        const key = OPENAI_API_KEY.value()
        if (!key) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not set')
        content = await callOpenAI(key, messages)
      } else {
        const key = PERPLEXITY_API_KEY.value()
        if (!key) throw new HttpsError('failed-precondition', 'PERPLEXITY_API_KEY not set')
        content = await callPerplexity(key, messages)
      }

      const grounded = enforceGrounding(content)
      if (!grounded.trim()) {
        throw new HttpsError('unavailable', 'Empty model reply')
      }
      return { content: grounded }
    } catch (err) {
      if (err instanceof HttpsError) throw err
      const message = err instanceof Error ? err.message : 'Upstream AI error'
      throw new HttpsError('unavailable', message)
    }
  },
)
