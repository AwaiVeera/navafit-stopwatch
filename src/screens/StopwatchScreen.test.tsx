import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StopwatchScreen } from './StopwatchScreen'
import type { SessionPreset, StopwatchModeConfig, WeatherSnapshot } from '../types'

const MODE: StopwatchModeConfig = {
  id: 'intermediate',
  label: 'Intermediate',
  lapCount: 5,
  lapDurationSeconds: 180,
  intervalSeconds: 60,
  isAutoLap: true,
}

const PRESET = {
  id: 'p1',
  title: 'Test Session',
  summary: '',
  targetMinutes: 24,
  recoveryBias: 'balanced',
  sourceLabel: '',
  rationale: [],
  breathPreset: { inhaleSeconds: 4, holdSeconds: 4, exhaleSeconds: 4, cycleSeconds: 12, label: 'Box' },
} as unknown as SessionPreset

function renderScreen() {
  const onSaveSession = vi.fn()
  render(
    <StopwatchScreen
      onBack={vi.fn()}
      weatherSnapshot={{} as WeatherSnapshot}
      heartRate={0}
      sessionPreset={PRESET}
      stopwatchMode={MODE}
      onSaveSession={onSaveSession}
    />,
  )
  return { onSaveSession }
}

describe('StopwatchScreen', () => {
  it('opens in the Prepare phase on round 1 of the mode', () => {
    renderScreen()
    expect(screen.getAllByText(/prepare/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/round 1 \/ 5/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /^start$/i })).toBeTruthy()
  })

  it('start switches to the running transport, and pause/resume toggle', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /^start$/i }))
    // Running transport: Pause + Skip + End + Reset visible.
    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /skip phase/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /end session/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /pause/i }))
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy()
  })

  it('renders both the Chronometer and Digital faces', () => {
    renderScreen()
    // Digital face exposes Work/Rest duration labels; chronometer exposes a dial.
    expect(screen.getAllByText(/^work$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^rest$/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: /chronometer/i })).toBeTruthy()
  })
})
