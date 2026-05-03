import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are AY, the NavaFit knowledge guide.
You answer ONLY questions about these three domains:
  1. Kalaripayattu (Kalari) — the ancient Indian martial art
  2. Gadah (mace) training — traditional mace/gada exercise
  3. Breathwork and Pranayama — breath-based practice and research

Rules you must never break:
- For every factual claim, cite the research study, historical text, or established tradition it comes from.
- If a question falls outside the three domains above, respond with exactly:
  "I only guide on Kalari, Gadah, and Breathwork. Ask me anything in those domains."
- Never invent sources, statistics, or facts. If you are unsure, say so and recommend a primary source to consult.
- Keep answers concise, practical, and grounded in documented evidence or living tradition.`

interface AYMsg {
  role: 'user' | 'assistant'
  content: string
}

type Provider = 'perplexity' | 'gemini' | 'openai'

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

function resolveProvider(explicit: string | undefined): Provider | null {
  const v = explicit?.trim().toLowerCase()
  if (v === 'perplexity' || v === 'gemini' || v === 'openai') {
    return v
  }
  return null
}

/** If AY_AI_PROVIDER is unset, pick the first backend that has a secret set. */
function inferProviderFromSecrets(): Provider | null {
  const p = Deno.env.get('PERPLEXITY_API_KEY')?.trim()
  const g = Deno.env.get('GEMINI_API_KEY')?.trim()
  const o = Deno.env.get('OPENAI_API_KEY')?.trim()

  if (g) return 'gemini'
  if (o) return 'openai'
  if (p) return 'perplexity'
  return null
}

async function callPerplexity(apiKey: string, messages: AYMsg[]): Promise<string> {
  const model = Deno.env.get('PERPLEXITY_MODEL')?.trim() || 'sonar'
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

async function callOpenAI(apiKey: string, messages: AYMsg[]): Promise<string> {
  const model = Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini'
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

function shouldRetryWithAnotherGeminiModel(status: number, errorBody: string): boolean {
  if (status !== 404) {
    return false
  }

  const normalized = errorBody.toLowerCase()
  return (
    normalized.includes('no longer available to new users') ||
    normalized.includes('not found') ||
    normalized.includes('is not found')
  )
}

async function callGeminiWithModel(apiKey: string, model: string, messages: AYMsg[]): Promise<string> {
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
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return text
}

async function callGemini(apiKey: string, messages: AYMsg[]): Promise<string> {
  const configuredModel = Deno.env.get('GEMINI_MODEL')?.trim()
  const modelCandidates = [configuredModel, ...GEMINI_FALLBACK_MODELS].filter(
    (model, index, self): model is string => Boolean(model) && self.indexOf(model) === index,
  )

  let lastError: Error | null = null

  for (let i = 0; i < modelCandidates.length; i += 1) {
    const model = modelCandidates[i]
    try {
      return await callGeminiWithModel(apiKey, model, messages)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      lastError = error

      const statusMatch = error.message.match(/Gemini\s+(\d+)\s+\(/)
      const statusCode = statusMatch ? Number(statusMatch[1]) : NaN
      const canRetry =
        Number.isFinite(statusCode) && shouldRetryWithAnotherGeminiModel(statusCode, error.message)
      const hasNextModel = i < modelCandidates.length - 1

      if (!canRetry || !hasNextModel) {
        throw error
      }
    }
  }

  throw lastError ?? new Error('Gemini request failed')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { messages?: AYMsg[] }
  try {
    body = (await req.json()) as { messages?: AYMsg[] }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const explicit = resolveProvider(Deno.env.get('AY_AI_PROVIDER'))
  const inferred = inferProviderFromSecrets()
  const provider: Provider | null = explicit ?? inferred

  if (!provider) {
    return new Response(
      JSON.stringify({
        error:
          'No AI backend configured. Set one secret: GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY (optionally AY_AI_PROVIDER=gemini|openai|perplexity).',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const pKey = Deno.env.get('PERPLEXITY_API_KEY')?.trim()
  const gKey = Deno.env.get('GEMINI_API_KEY')?.trim()
  const oKey = Deno.env.get('OPENAI_API_KEY')?.trim()

  try {
    let content = ''

    if (provider === 'perplexity') {
      if (!pKey) {
        return new Response(JSON.stringify({ error: 'PERPLEXITY_API_KEY not set' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      content = await callPerplexity(pKey, messages)
    } else if (provider === 'gemini') {
      if (!gKey) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      content = await callGemini(gKey, messages)
    } else {
      if (!oKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      content = await callOpenAI(oKey, messages)
    }

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: 'Empty model reply' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ content: content.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream AI error'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
