import type {
  HealthMetrics,
  InsightItem,
  InsightSnapshot,
  TelemetryState,
  WorkoutLog,
} from '../types'

interface InsightInput {
  health: HealthMetrics
  telemetry: TelemetryState
  logs: WorkoutLog[]
}

export function buildInsightSnapshot({
  health,
  telemetry,
  logs,
}: InsightInput): InsightSnapshot {
  const recentMinutes = logs.slice(0, 3).reduce((total, item) => total + item.durationMinutes, 0)

  return {
    engineLabel: 'NavaFit Insight Scaffold',
    generatedAtLabel: `Prepared ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    items: [
      buildTrainingInsight(health, recentMinutes),
      buildRecoveryInsight(health),
      buildSyncInsight(telemetry),
    ],
  }
}

function buildTrainingInsight(health: HealthMetrics, recentMinutes: number): InsightItem {
  const canProgress = health.endurance >= 65 && health.stamina >= 70

  return {
    id: 'training-load',
    domain: 'training',
    title: canProgress ? 'Load window looks stable' : 'Hold the current training load',
    summary: canProgress
      ? 'Recent endurance and stamina support extending one longer interval in the next cycle.'
      : 'Keep the next session controlled and extend duration only after your breath rhythm settles.',
    emphasis: `${recentMinutes} min logged across recent sessions`,
    actionLabel: canProgress ? 'Add one longer set next week' : 'Repeat current interval target',
    source: 'deterministic',
  }
}

function buildRecoveryInsight(health: HealthMetrics): InsightItem {
  const needsRecoveryBias = health.stressLevel > 55 || health.breathPerMinute > 18

  return {
    id: 'recovery-window',
    domain: 'recovery',
    title: needsRecoveryBias ? 'Recovery bias recommended' : 'Recovery markers look steady',
    summary: needsRecoveryBias
      ? 'Favor Ujjayi work, hydration, and a shorter next block before increasing intensity again.'
      : 'Current recovery markers can support another moderate session if you maintain sleep and breathwork.',
    emphasis: `Stress ${health.stressLevel}% · Breath ${health.breathPerMinute}/min`,
    actionLabel: needsRecoveryBias ? 'Prioritize breath and electrolytes' : 'Maintain 12-18 min evening recovery',
    source: 'deterministic',
  }
}

function buildSyncInsight(telemetry: TelemetryState): InsightItem {
  const readyFeeds = [telemetry.healthApp, telemetry.fitnessWatch, telemetry.weather].filter(
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
        : 'Telemetry contract is partially live'
      : 'Telemetry inputs are still partial',
    summary: hasConnectedHealth
      ? `${weatherMode} ${telemetry.healthSourceLabel} is now feeding the preset and insight layer.`
      : `${weatherMode} Health sync is still waiting for a connected source, so NavaFit falls back to its app baseline.`,
    emphasis: `${readyFeeds}/3 telemetry feeds ready`,
    actionLabel: hasConnectedHealth ? 'Review the next preset before training' : 'Connect health data to unlock live presets',
    source: hasConnectedHealth ? 'deterministic' : 'simulated-input',
  }
}
