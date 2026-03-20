import { describe, expect, it } from 'vitest'

import {
  buildSyncErrorTelemetry,
  createInitialTelemetryState,
} from './telemetry'

describe('telemetry helpers', () => {
  it('preserves unavailable feeds while marking live feeds as errored', () => {
    const telemetry = buildSyncErrorTelemetry(
      {
        ...createInitialTelemetryState(),
        healthApp: 'syncing',
        fitnessWatch: 'unavailable',
        weather: 'syncing',
      },
      'Apple Health permission was denied.',
    )

    expect(telemetry.healthApp).toBe('error')
    expect(telemetry.fitnessWatch).toBe('unavailable')
    expect(telemetry.weather).toBe('ready')
    expect(telemetry.lastSyncLabel).toBe('Apple Health permission was denied.')
  })
})
