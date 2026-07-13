import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BreathScreen } from './BreathScreen'
import type { BreathworkMode, HealthMetrics, SessionPreset } from '../types'

const PRESET = {
  id: 'p1',
  title: 'Session',
  summary: '',
  targetMinutes: 3,
  recoveryBias: 'balanced',
  sourceLabel: '',
  rationale: [],
  breathPreset: { inhaleSeconds: 4, holdSeconds: 4, exhaleSeconds: 4, cycleSeconds: 12, label: 'Box' },
} as unknown as SessionPreset

function renderScreen(mode: BreathworkMode) {
  render(
    <BreathScreen
      health={{} as HealthMetrics}
      sessionPreset={PRESET}
      breathworkMode={mode}
      onBack={vi.fn()}
      onSaveSession={vi.fn()}
    />,
  )
}

const NOVICE: BreathworkMode = { id: 'novice', label: 'Novice', protocols: [] }
const INTERMEDIATE: BreathworkMode = { id: 'intermediate', label: 'Intermediate', protocols: [] }

beforeEach(() => {
  localStorage.clear()
})

describe('BreathScreen', () => {
  it('gates a first-time beginner behind the safety foundation', async () => {
    const user = userEvent.setup()
    renderScreen(NOVICE)

    // Foundation shown first.
    expect(screen.getByText(/breathe with care/i)).toBeTruthy()
    expect(screen.getByText(/not medical advice/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /i understand/i }))

    // Now on setup.
    expect(screen.getByText(/^level$/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /start session/i })).toBeTruthy()
  })

  it('skips the foundation once acknowledged', () => {
    localStorage.setItem('navafit:breath-foundation-ack', 'true')
    renderScreen(NOVICE)
    expect(screen.queryByText(/breathe with care/i)).toBeNull()
    expect(screen.getByText(/^level$/i)).toBeTruthy()
  })

  it('starts a guided session from setup', async () => {
    const user = userEvent.setup()
    renderScreen(INTERMEDIATE) // non-beginner → straight to setup

    await user.click(screen.getByRole('button', { name: /start session/i }))

    // Session running: phase label + cycle + running transport.
    expect(screen.getByText(/inhale/i)).toBeTruthy()
    expect(screen.getByText(/cycle 1 \//i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /end session/i })).toBeTruthy()
  })
})
