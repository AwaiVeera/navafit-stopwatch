import type {
  HealthMetrics,
  InsightItem,
  InsightSnapshot,
  TelemetryState,
  TrainingProgression,
  WorkoutLog,
} from '../types'
import {
  AI_ENGINE_LABEL,
  predictRecovery,
  scoreRecentSessions,
  suggestBreathProtocol,
} from './ai-engine'

interface InsightInput {
  health: HealthMetrics
  telemetry: TelemetryState
  logs: WorkoutLog[]
  progression?: TrainingProgression | null
}

export function buildInsightSnapshot({
  health,
  telemetry,
  logs,
  progression,
}: InsightInput): InsightSnapshot {
  const quality = scoreRecentSessions(logs)
  const recovery = predictRecovery(health, logs)
  const breathSuggestion = suggestBreathProtocol(health)

  return {
    engineLabel: AI_ENGINE_LABEL,
    generatedAtLabel: `Prepared ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    items: [
      buildTrainingInsight(health, logs, quality),
      buildRecoveryInsight(health, recovery),
      buildBreathCoachingInsight(health, breathSuggestion),
      buildSessionQualityInsight(quality),
      buildSyncInsight(telemetry),
      ...(progression ? [buildProgressionInsight(progression)] : []),
    ].filter((item): item is InsightItem => item !== null),
  }
}

function buildTrainingInsight(
  health: HealthMetrics,
  logs: WorkoutLog[],
  quality: ReturnType<typeof scoreRecentSessions>,
): InsightItem {
  const recentMinutes = logs.slice(0, 3).reduce((total, item) => total + item.durationMinutes, 0)
  const canProgress = health.endurance >= 65 && health.stamina >= 70
  const qualityStrong = quality !== null && quality.overall >= 75

  if (canProgress && qualityStrong) {
    return {
      id: 'training-load',
      domain: 'training',
      title: 'Ready to progress',
      summary: `Session quality is ${quality.label.toLowerCase()} (${quality.overall}%) with strong endurance. Your body can handle more.`,
      emphasis: `${recentMinutes} min logged · Quality ${quality.overall}%`,
      actionLabel: 'Consider advancing your training mode',
      source: 'deterministic',
    }
  }

  if (canProgress) {
    return {
      id: 'training-load',
      domain: 'training',
      title: 'Load window looks stable',
      summary: 'Recent endurance and stamina support extending one longer interval in the next cycle.',
      emphasis: `${recentMinutes} min logged across recent sessions`,
      actionLabel: 'Add one longer set next week',
      source: 'deterministic',
    }
  }

  return {
    id: 'training-load',
    domain: 'training',
    title: 'Hold the current training load',
    summary: 'Keep the next session controlled and extend duration only after your breath rhythm settles.',
    emphasis: `${recentMinutes} min logged across recent sessions`,
    actionLabel: 'Repeat current interval target',
    source: 'deterministic',
  }
}

function buildRecoveryInsight(
  health: HealthMetrics,
  recovery: ReturnType<typeof predictRecovery>,
): InsightItem {
  if (recovery.level === 'low') {
    return {
      id: 'recovery-window',
      domain: 'recovery',
      title: 'Recovery bias recommended',
      summary: recovery.suggestion,
      emphasis: `Recovery ${recovery.score}% · Stress ${health.stressLevel}% · ${recovery.optimalIntensity}`,
      actionLabel: 'Prioritise breath, hydration, and sleep',
      source: 'deterministic',
    }
  }

  if (recovery.level === 'moderate') {
    return {
      id: 'recovery-window',
      domain: 'recovery',
      title: 'Moderate recovery — train smart',
      summary: recovery.suggestion,
      emphasis: `Recovery ${recovery.score}% · Stress ${health.stressLevel}% · ${recovery.optimalIntensity}`,
      actionLabel: 'Keep intensity below peak today',
      source: 'deterministic',
    }
  }

  return {
    id: 'recovery-window',
    domain: 'recovery',
    title: 'Recovery is strong — green light',
    summary: recovery.suggestion,
    emphasis: `Recovery ${recovery.score}% · Stress ${health.stressLevel}% · ${recovery.optimalIntensity}`,
    actionLabel: 'Full intensity session available',
    source: 'deterministic',
  }
}

function buildBreathCoachingInsight(
  _health: HealthMetrics,
  suggestion: ReturnType<typeof suggestBreathProtocol>,
): InsightItem {
  return {
    id: 'breath-coaching',
    domain: 'training',
    title: `Try ${suggestion.protocolLabel}`,
    summary: suggestion.reason,
    emphasis: `Recommended protocol: ${suggestion.protocolLabel}`,
    actionLabel: 'Open BreathWork to start',
    source: 'deterministic',
  }
}

function buildSessionQualityInsight(
  quality: ReturnType<typeof scoreRecentSessions>,
): InsightItem | null {
  if (!quality) return null

  return {
    id: 'session-quality',
    domain: 'training',
    title: `Session quality: ${quality.label}`,
    summary: quality.tip,
    emphasis: `Overall ${quality.overall}% · Completion ${quality.completionScore}% · Consistency ${quality.consistencyScore}%`,
    actionLabel: quality.overall >= 75 ? 'Keep this momentum' : 'Focus on full preset completion',
    source: 'deterministic',
  }
}

function buildSyncInsight(telemetry: TelemetryState): InsightItem {
  const readyFeeds = [telemetry.healthApp, telemetry.weather].filter(
    (status) => status === 'ready',
  ).length
  const hasConnectedHealth = /apple|garmin/i.test(telemetry.healthSourceLabel)
  const weatherMode =
    telemetry.weatherSnapshot.source === 'simulated'
      ? 'Weather still uses simulated input.'
      : telemetry.weatherSnapshot.source === 'device'
        ? 'Weather connector is live.'
        : 'Weather feed is unavailable.'

  return {
    id: 'sync-readiness',
    domain: 'sync',
    title: readyFeeds >= 2
      ? hasConnectedHealth
        ? 'Connected data path is active'
        : 'Telemetry contract is live'
      : 'Telemetry inputs are still partial',
    summary: hasConnectedHealth
      ? `${weatherMode} ${telemetry.healthSourceLabel} is now feeding the AI engine.`
      : `${weatherMode} Health sync is still waiting for a connected source, so NavaFit falls back to its app baseline.`,
    emphasis: `${readyFeeds}/2 telemetry feeds ready`,
    actionLabel: hasConnectedHealth ? 'Review the next preset before training' : 'Connect health data to unlock live presets',
    source: hasConnectedHealth ? 'deterministic' : 'simulated-input',
  }
}

function buildProgressionInsight(progression: TrainingProgression): InsightItem {
  const swTotal = progression.stopwatch.intermediate + progression.stopwatch.advanced
  const bwTotal = progression.breathwork.intermediate + progression.breathwork.advanced
  const totalSessions = swTotal + bwTotal

  if (totalSessions === 0) {
    return {
      id: 'progression',
      domain: 'training',
      title: 'Start your training journey',
      summary: 'Complete sessions at Intermediate or Advanced level to build your progression and unlock higher training modes.',
      emphasis: 'No progression sessions logged yet',
      actionLabel: 'Try an Intermediate session',
      source: 'deterministic',
    }
  }

  const nextUnlock = progression.stopwatch.intermediate < 30
    ? `${30 - progression.stopwatch.intermediate} more Intermediate stopwatch sessions to unlock Advanced`
    : progression.stopwatch.advanced < 30
      ? `${30 - progression.stopwatch.advanced} more Advanced stopwatch sessions to unlock Expert`
      : progression.breathwork.intermediate < 30
        ? `${30 - progression.breathwork.intermediate} more Intermediate breathwork sessions to unlock Advanced`
        : progression.breathwork.advanced < 30
          ? `${30 - progression.breathwork.advanced} more Advanced breathwork sessions to unlock Expert`
          : 'All modes unlocked'

  return {
    id: 'progression',
    domain: 'training',
    title: `${totalSessions} progression sessions completed`,
    summary: nextUnlock,
    emphasis: `Stopwatch: ${swTotal} sessions · Breathwork: ${bwTotal} sessions`,
    actionLabel: nextUnlock === 'All modes unlocked' ? 'Train at any level' : 'Keep building',
    source: 'deterministic',
  }
}
