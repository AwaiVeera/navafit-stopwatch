import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { ConsentScreen } from './ConsentScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof ConsentScreen>> = {}) {
  const props: ComponentProps<typeof ConsentScreen> = {
    accountEmail: 'user@example.com',
    initialHealthSync: false,
    initialUsageAnalytics: false,
    isSaving: false,
    error: '',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<ConsentScreen {...props} />)
  return { props }
}

describe('ConsentScreen', () => {
  it('keeps continue disabled until both required checkboxes are checked', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    const continueButton = screen.getByRole('button', { name: /continue to navafit/i }) as HTMLButtonElement
    expect(continueButton.disabled).toBe(true)

    await user.click(screen.getByText(/i reviewed the privacy policy/i))
    expect(continueButton.disabled).toBe(true)

    await user.click(screen.getByText(/i reviewed the terms of service/i))
    expect(continueButton.disabled).toBe(false)

    await user.click(continueButton)
    expect(props.onSubmit).toHaveBeenCalledWith({
      acceptsHealthSync: false,
      acceptsUsageAnalytics: false,
    })
  })

  it('includes optional toggles in the submission when checked', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.click(screen.getByText(/i reviewed the privacy policy/i))
    await user.click(screen.getByText(/i reviewed the terms of service/i))
    await user.click(screen.getByText(/allow apple health data/i))
    await user.click(screen.getByRole('button', { name: /continue to navafit/i }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      acceptsHealthSync: true,
      acceptsUsageAnalytics: false,
    })
  })
})
