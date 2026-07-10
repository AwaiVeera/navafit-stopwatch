import { isSupabaseConfigured, supabase } from './supabase'

// Inline flag read (do NOT import from ./firebase here — that would eagerly
// pull the entire Firebase SDK into the main bundle even when we're still on
// Supabase. The Firebase branch below uses dynamic imports.
function isFirebaseBackend(): boolean {
  return (import.meta.env.VITE_AUTH_BACKEND ?? '').trim().toLowerCase() === 'firebase'
}

export interface AYMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AyChatSuccess {
  content?: string
}

interface AyChatError {
  error?: string
  detail?: string
}

const AY_REQUEST_TIMEOUT_MS = 25000
const MAX_CONTEXT_MESSAGES = 20

/**
 * Calls the AY assistant. When VITE_AUTH_BACKEND=firebase this routes to the
 * Firebase Cloud Function `ayChat` (Node 22, App-Check + auth + rate-limited);
 * otherwise it hits the Supabase Edge Function `ay-chat` (legacy, kept live
 * during the staged migration). Provider keys live only in function secrets.
 */
export async function askAY(messages: AYMessage[]): Promise<string> {
  const contextMessages = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))

  if (isFirebaseBackend()) {
    // Lazy-load the Firebase SDK so it stays out of the main bundle while
    // Supabase is still the active backend. Once the flag flips this chunk
    // is fetched on demand and cached by the browser.
    const [{ httpsCallable }, { getFirebaseFunctions, isFirebaseConfigured }] = await Promise.all([
      import('firebase/functions'),
      import('./firebase'),
    ])
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to .env.local')
    }
    const functions = getFirebaseFunctions()
    if (!functions) {
      throw new Error('Firebase Functions unavailable.')
    }
    const callable = httpsCallable<{ messages: AYMessage[] }, { content: string }>(
      functions,
      'ayChat',
    )
    try {
      const result = await callable({ messages: contextMessages })
      const content = result.data?.content?.trim()
      if (!content) throw new Error('Empty reply from AY.')
      return content
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'unauthenticated') throw new Error('Sign in to use AY.')
      if (code === 'resource-exhausted') throw new Error('Too many AY requests. Try again shortly.')
      throw err
    }
  }

  // Legacy Supabase path.
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sign in to use AY.')
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()?.replace(/\/$/, '')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!baseUrl || !anonKey) {
    throw new Error('Missing Supabase URL or anon key.')
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AY_REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/functions/v1/ay-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ messages: contextMessages }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('AY request timed out. Please try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  const raw = await response.text()
  let parsed: AyChatSuccess & AyChatError
  try {
    parsed = JSON.parse(raw) as AyChatSuccess & AyChatError
  } catch {
    throw new Error(`AY service returned invalid JSON (${response.status})`)
  }

  if (!response.ok) {
    throw new Error(parsed.error ?? parsed.detail ?? `AY error ${response.status}`)
  }

  const content = parsed.content?.trim()
  if (!content) {
    throw new Error('Empty reply from AY.')
  }

  return content
}
