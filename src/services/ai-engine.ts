import type {
  HealthMetrics,
  TrainingLevel,
  TrainingProgression,
  WorkoutLog,
} from '../types'

export const AI_ENGINE_LABEL = 'NavaFit AI Engine v1'

// --- Session Quality Scoring ---

export interface SessionQualityScore {
  overall: number
  completionScore: number
  consistencyScore: number
  label: string
  tip: string
}

export function scoreSession(log: WorkoutLog): SessionQualityScore {
  const metadata = (log as { metadata?: Record<string, unknown> }).metadata
  const lapSplits = Array.isArray(metadata?.lapSplitsMs) ? (metadata.lapSplitsMs as number[]) : []
  const presetTarget = typeof metadata?.presetTargetMinutes === 'number' ? metadata.presetTargetMinutes : null

  const completionScore = presetTarget && presetTarget > 0
    ? Math.min(100, Math.round((log.durationMinutes / presetTarget) * 100))
    : log.durationMinutes >= 10 ? 80 : 50

  let consistencyScore = 75
  if (lapSplits.length >= 2) {
    const mean = lapSplits.reduce((a, b) => a + b, 0) / lapSplits.length
    const variance = lapSplits.reduce((sum, v) => sum + (v - mean) ** 2, 0) / lapSplits.length
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
    consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - cv * 200)))
  }

  const overall = Math.round(completionScore * 0.6 + consistencyScore * 0.4)

  let label: string
  let tip: string

  if (overall >= 85) {
    label = 'Excellent'
    tip = 'Strong session. Your pacing and completion are dialled in.'
  } else if (overall >= 70) {
    label = 'Good'
    tip = 'Solid work. Focus on consistent lap pacing to push higher.'
  } else if (overall >= 50) {
    label = 'Developing'
    tip = 'Building your base. Try to hit the full preset duration next time.'
  } else {
    label = 'Foundation'
    tip = 'Every session counts. Consistency over intensity at this stage.'
  }

  return { overall, completionScore, consistencyScore, label, tip }
}

export function scoreRecentSessions(logs: WorkoutLog[]): SessionQualityScore | null {
  const appSessions = logs.filter((l) => l.source === 'app' || !l.source).slice(0, 5)
  if (appSessions.length === 0) return null

  const scores = appSessions.map(scoreSession)
  const avgOverall = Math.round(scores.reduce((s, q) => s + q.overall, 0) / scores.length)
  const avgCompletion = Math.round(scores.reduce((s, q) => s + q.completionScore, 0) / scores.length)
  const avgConsistency = Math.round(scores.reduce((s, q) => s + q.consistencyScore, 0) / scores.length)

  let label: string
  let tip: string

  if (avgOverall >= 85) {
    label = 'Excellent trend'
    tip = 'Your recent sessions show strong consistency. Consider advancing your training mode.'
  } else if (avgOverall >= 70) {
    label = 'Good trend'
    tip = 'Solid recent performance. Keep building at this level before advancing.'
  } else if (avgOverall >= 50) {
    label = 'Building'
    tip = 'Progress is forming. Focus on completing full sessions before increasing intensity.'
  } else {
    label = 'Foundation phase'
    tip = 'Stay at your current level and build consistency before moving up.'
  }

  return { overall: avgOverall, completionScore: avgCompletion, consistencyScore: avgConsistency, label, tip }
}

// --- Smart Mode Recommendation ---

export interface ModeRecommendation {
  stopwatch: TrainingLevel
  breathwork: TrainingLevel
  stopwatchReason: string
  breathworkReason: string
}

export function recommendTrainingModes(
  progression: TrainingProgression,
  health: HealthMetrics,
  logs: WorkoutLog[],
): ModeRecommendation {
  const quality = scoreRecentSessions(logs)
  const qualityOk = quality !== null && quality.overall >= 65

  const swIntermediate = progression.stopwatch.intermediate
  const swAdvanced = progression.stopwatch.advanced
  const bwIntermediate = progression.breathwork.intermediate
  const bwAdvanced = progression.breathwork.advanced

  let stopwatch: TrainingLevel = 'novice'
  let stopwatchReason: string

  if (swAdvanced >= 30 && qualityOk && health.readiness >= 75 && health.stressLevel < 50) {
    stopwatch = 'expert'
    stopwatchReason = `${swAdvanced} Advanced sessions completed with ${quality?.label.toLowerCase()} quality. Ready for Expert.`
  } else if (swIntermediate >= 30 && qualityOk && health.readiness >= 65) {
    stopwatch = 'advanced'
    stopwatchReason = `${swIntermediate} Intermediate sessions completed. Health markers support Advanced.`
  } else if (swIntermediate >= 5 || (qualityOk && logs.length >= 3)) {
    stopwatch = 'intermediate'
    stopwatchReason = logs.length < 3
      ? 'Build a few more sessions before progressing.'
      : 'Session quality supports Intermediate training.'
  } else {
    stopwatchReason = 'Start with Novice to build your baseline.'
  }

  let breathwork: TrainingLevel = 'novice'
  let breathworkReason: string

  if (bwAdvanced >= 30 && health.readiness >= 75 && health.stressLevel < 50) {
    breathwork = 'expert'
    breathworkReason = `${bwAdvanced} Advanced breathwork sessions. Ready for peak performance protocols.`
  } else if (bwIntermediate >= 30 && health.readiness >= 60) {
    breathwork = 'advanced'
    breathworkReason = `${bwIntermediate} Intermediate sessions. CO2 tolerance protocols available.`
  } else if (bwIntermediate >= 3 || logs.length >= 2) {
    breathwork = 'intermediate'
    breathworkReason = 'Stability and regulation protocols will strengthen your foundation.'
  } else {
    breathworkReason = 'Guided breathwork at Novice builds awareness of your breath pattern.'
  }

  return { stopwatch, breathwork, stopwatchReason, breathworkReason }
}

// --- Recovery Prediction ---

export interface RecoveryPrediction {
  score: number
  level: 'low' | 'moderate' | 'high'
  suggestion: string
  optimalIntensity: string
  breathProtocolId: string | null
}

export function predictRecovery(health: HealthMetrics, logs: WorkoutLog[]): RecoveryPrediction {
  const recentLoad = logs.slice(0, 5).reduce((sum, l) => sum + l.durationMinutes, 0)
  const loadFactor = recentLoad > 200 ? -15 : recentLoad > 120 ? -8 : recentLoad > 60 ? 0 : 5

  const hrvComponent = health.readiness * 0.35
  const stressComponent = (100 - health.stressLevel) * 0.25
  const breathComponent = health.breathPerMinute <= 16 ? 20 : health.breathPerMinute <= 20 ? 12 : 4
  const enduranceComponent = health.endurance * 0.15

  const raw = hrvComponent + stressComponent + breathComponent + enduranceComponent + loadFactor
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  let level: RecoveryPrediction['level']
  let suggestion: string
  let optimalIntensity: string
  let breathProtocolId: string | null = null

  if (score >= 75) {
    level = 'high'
    suggestion = 'Recovery is strong. You can train at full intensity today.'
    optimalIntensity = 'Full session — build or maintain'
    if (health.stressLevel < 35) breathProtocolId = 'quad-ratio'
  } else if (score >= 50) {
    level = 'moderate'
    suggestion = 'Moderate recovery. A controlled session is fine, but avoid maximal effort.'
    optimalIntensity = 'Controlled session — stay below peak'
    breathProtocolId = 'box-breathing'
  } else {
    level = 'low'
    suggestion = 'Recovery is low. Prioritise breathwork, hydration, and sleep over intense training.'
    optimalIntensity = 'Recovery session — breath and mobility only'
    breathProtocolId = '4-7-8'
  }

  return { score, level, suggestion, optimalIntensity, breathProtocolId }
}

// --- Breath Protocol Coaching ---

export interface BreathCoachingSuggestion {
  protocolId: string
  protocolLabel: string
  reason: string
}

export function suggestBreathProtocol(health: HealthMetrics): BreathCoachingSuggestion {
  if (health.stressLevel > 65 || health.breathPerMinute > 20) {
    return {
      protocolId: '4-7-8',
      protocolLabel: '4-7-8 Relaxation',
      reason: `Stress is elevated at ${health.stressLevel}%. The extended exhale in 4-7-8 will shift your nervous system toward calm.`,
    }
  }

  if (health.stressLevel > 45 || health.breathPerMinute > 16) {
    return {
      protocolId: 'box-breathing',
      protocolLabel: 'Box Breathing',
      reason: `Breath rate at ${health.breathPerMinute}/min suggests mild activation. Box breathing will stabilise your rhythm.`,
    }
  }

  if (health.readiness >= 80 && health.endurance >= 70) {
    return {
      protocolId: 'quad-ratio',
      protocolLabel: 'QUAD-Ratio',
      reason: 'Recovery and endurance are strong. QUAD-Ratio builds CO2 tolerance for performance gains.',
    }
  }

  return {
    protocolId: 'physiological-sigh',
    protocolLabel: 'Physiological Sigh',
    reason: 'Markers are balanced. A physiological sigh is a quick reset before or after any session.',
  }
}
