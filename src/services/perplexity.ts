import { isSupabaseConfigured, supabase } from './supabase'

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
 * Calls the Supabase Edge Function `ay-chat`.
 * The Edge Function talks to Gemini, OpenAI, or Perplexity on the server — never put those keys in Vite env.
 */
export async function askAY(messages: AYMessage[]): Promise<string> {
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

  const contextMessages = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))

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
