import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { OnboardingScreen } from './OnboardingScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof OnboardingScreen>> = {}) {
  const props: ComponentProps<typeof OnboardingScreen> = {
    accountEmail: 'user@example.com',
    initialProfile: null,
    isSaving: false,
    error: '',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<OnboardingScreen {...props} />)
  return { props }
}

describe('OnboardingScreen', () => {
  it('shows a validation error for an out-of-range age instead of submitting', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.type(screen.getByLabelText(/age \(years\)/i), '5')
    await user.type(screen.getByLabelText(/height \(cm\)/i), '178')
    await user.type(screen.getByLabelText(/weight \(kg\)/i), '74')
    await user.type(screen.getByLabelText(/training days per week/i), '3')
    await user.click(screen.getByRole('button', { name: /continue to consent/i }))

    expect(screen.getByText(/enter an age between 13 and 90/i)).toBeTruthy()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('submits rounded profile values when all fields are valid', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.type(screen.getByLabelText(/age \(years\)/i), '29')
    await user.type(screen.getByLabelText(/height \(cm\)/i), '177.6')
    await user.type(screen.getByLabelText(/weight \(kg\)/i), '73.4')
    await user.clear(screen.getByLabelText(/training days per week/i))
    await user.type(screen.getByLabelText(/training days per week/i), '4')
    await user.click(screen.getByRole('button', { name: /continue to consent/i }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      ageYears: 29,
      heightCm: 178,
      weightKg: 73,
      trainingDaysPerWeek: 4,
    })
  })
})
