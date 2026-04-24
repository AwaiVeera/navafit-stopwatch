interface Quote {
  text: string
  source: string
}

const QUOTES: Quote[] = [
  { text: "The body is the bow, the breath is the arrow, the target is the mind.", source: "Kalaripayattu tradition" },
  { text: "In stillness, find strength. In breath, find power.", source: "Gadah practice" },
  { text: "Master your breath, master your mind.", source: "Pranayama" },
  { text: "The mace does not yield to the impatient warrior.", source: "Gadah proverb" },
  { text: "Breath is the bridge between the body and the infinite.", source: "Pranayama teaching" },
  { text: "Kalaripayattu is not a sport — it is a way of living the body.", source: "Kalaripayattu masters" },
  { text: "Control the inhale, control the moment. Control the exhale, control the outcome.", source: "Breathwork principle" },
  { text: "The mace teaches patience. Each swing is a question — are you ready?", source: "Gadah tradition" },
  { text: "When the breath is steady, so is the warrior.", source: "Kalaripayattu" },
  { text: "Speed is born from stillness. Power is born from breath.", source: "Kalaripayattu principle" },
  { text: "The Gadah reveals your nature — you cannot lie to the mace.", source: "Gadah saying" },
  { text: "Breathe in discipline. Breathe out doubt.", source: "Pranayama" },
  { text: "A warrior who commands the breath commands the battlefield.", source: "Kalaripayattu" },
  { text: "The body follows the mind. The mind follows the breath.", source: "Pranayama teaching" },
  { text: "Every rep with the mace is a conversation between you and gravity.", source: "Gadah practice" },
  { text: "Flexibility without strength is vulnerability. Strength without breath is brute force.", source: "Kalaripayattu" },
  { text: "The exhale is a warrior's release. The inhale is a warrior's preparation.", source: "Breathwork principle" },
  { text: "Ancient warriors did not count sets — they counted breaths.", source: "Kalaripayattu tradition" },
  { text: "The Gadah is not lifted — it is guided. Let the breath lead.", source: "Gadah teaching" },
  { text: "Stillness is not the absence of motion. It is motion held in perfect readiness.", source: "Kalaripayattu" },
  { text: "Breathwork is the original performance technology.", source: "Pranayama research" },
  { text: "The spinning mace trains the mind more than the muscle.", source: "Gadah proverb" },
  { text: "Inhale intention. Exhale resistance.", source: "Breathwork principle" },
  { text: "Kalaripayattu begins and ends with reverence — to the body, to the art, to the breath.", source: "Kalaripayattu" },
  { text: "Slow breath, clear mind. Clear mind, precise strike.", source: "Kalaripayattu masters" },
  { text: "The warrior who breathes last, lasts.", source: "Gadah tradition" },
  { text: "One conscious breath is more powerful than a thousand unconscious repetitions.", source: "Pranayama" },
  { text: "The Kalari floor is a mirror — what you bring in, you will face.", source: "Kalaripayattu" },
  { text: "Train the nervous system, not just the muscle. Breath is the tool.", source: "Breathwork research" },
  { text: "Discipline is not force. It is the quiet consistency of the breath.", source: "Kalaripayattu tradition" },
]

/** Returns a quote that rotates daily based on day-of-year. */
export function getDailyQuote(): Quote {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  return QUOTES[dayOfYear % QUOTES.length]
}
