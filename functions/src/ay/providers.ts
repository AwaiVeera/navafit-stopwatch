import { SYSTEM_PROMPT } from './prompt'

export interface AYMsg {
  role: 'user' | 'assistant'
  content: string
}

export type Provider = 'gemini' | 'openai' | 'perplexity'

interface ChatCompletionChoice {
  message?: { content?: string | null }
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[]
}

interface GeminiPart {
  text?: string
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] }
}

interface GeminiGenerateResponse {
  candidates?: GeminiCandidate[]
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_FALLBACK_MODELS = [DEFAULT_GEMINI_MODEL, 'gemini-1.5-flash']

export function resolveProviderFromEnv(): Provider | null {
  const explicit = (process.env.AY_AI_PROVIDER || '').trim().toLowerCase()
  if (explicit === 'gemini' || explicit === 'openai' || explicit === 'perplexity') {
    return explicit
  }
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  if (process.env.PERPLEXITY_API_KEY?.trim()) return 'perplexity'
  return null
}

export async function callPerplexity(apiKey: string, messages: AYMsg[]): Promise<string> {
  const model = (process.env.PERPLEXITY_MODEL || '').trim() || 'sonar'
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Perplexity ${res.status}: ${text}`)
  }

  const data = (await res.json()) as ChatCompletionResponse
  return data.choices?.[0]?.message?.content ?? ''
}

export async function callOpenAI(apiKey: string, messages: AYMsg[]): Promise<string> {
  const model = (process.env.OPENAI_MODEL || '').trim() || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${text}`)
  }

  const data = (await res.json()) as ChatCompletionResponse
  return data.choices?.[0]?.message?.content ?? ''
}

function shouldRetryGemini(status: number, errorBody: string): boolean {
  if (status !== 404) return false
  const normalized = errorBody.toLowerCase()
  return (
    normalized.includes('no longer available') ||
    normalized.includes('not found') ||
    normalized.includes('is not found')
  )
}

async function callGeminiOnce(apiKey: string, model: string, messages: AYMsg[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status} (${model}): ${text}`)
  }

  const data = (await res.json()) as GeminiGenerateResponse
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
}

export async function callGemini(apiKey: string, messages: AYMsg[]): Promise<string> {
  const configured = (process.env.GEMINI_MODEL || '').trim()
  const candidates = [configured, ...GEMINI_FALLBACK_MODELS].filter(
    (m, i, self): m is string => Boolean(m) && self.indexOf(m) === i,
  )

  let lastError: Error | null = null
  for (let i = 0; i < candidates.length; i += 1) {
    const model = candidates[i]
    try {
      return await callGeminiOnce(apiKey, model, messages)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      lastError = error
      const match = error.message.match(/Gemini\s+(\d+)\s+\(/)
      const status = match ? Number(match[1]) : NaN
      const canRetry = Number.isFinite(status) && shouldRetryGemini(status, error.message)
      const hasNext = i < candidates.length - 1
      if (!canRetry || !hasNext) throw error
    }
  }
  throw lastError ?? new Error('Gemini request failed')
}
