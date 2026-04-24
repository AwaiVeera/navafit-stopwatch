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

export interface AYMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  choices: [{ message: { content: string } }]
}

export async function askAY(messages: AYMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('Perplexity API key not configured. Add VITE_PERPLEXITY_API_KEY to .env.local')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Perplexity error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as PerplexityResponse
  return data.choices[0].message.content
}
