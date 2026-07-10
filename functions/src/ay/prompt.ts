export const SYSTEM_PROMPT = `You are AY, the NavaFit knowledge guide.
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

/**
 * Post-processing grounding guardrail. Rejects obvious out-of-domain replies
 * that skipped the required deflection line. Mirrors project_bhairava's
 * enforceGrounding() pattern (client never sees ungrounded content).
 */
export function enforceGrounding(reply: string): string {
  const text = reply.trim()
  if (!text) return text

  const OFF_TOPIC_MARKERS = [
    /\bstock market\b/i,
    /\bcryptocurrency\b/i,
    /\bpolitics?\b/i,
    /\bpolitical\b/i,
    /\bcelebrity\b/i,
    /\brelationship advice\b/i,
    /\bcooking recipe\b/i,
  ]

  const looksOffTopic = OFF_TOPIC_MARKERS.some((re) => re.test(text))
  if (looksOffTopic) {
    return 'I only guide on Kalari, Gadah, and Breathwork. Ask me anything in those domains.'
  }

  return text
}
