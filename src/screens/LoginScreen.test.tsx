import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { LoginScreen } from './LoginScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof LoginScreen>> = {}) {
  const props: ComponentProps<typeof LoginScreen> = {
    onEmailAuth: vi.fn().mockResolvedValue(undefined),
    onSocialAuth: vi.fn().mockResolvedValue(undefined),
    onRequestPasswordReset: vi.fn().mockResolvedValue(undefined),
    isAuthBusy: false,
    isBootstrapping: false,
    authMessage: '',
    authError: '',
    isAuthConfigured: true,
    authConfigMessage: '',
    ...overrides,
  }
  const utils = render(<LoginScreen {...props} />)
  return { props, ...utils }
}

describe('LoginScreen', () => {
  it('renders Apple and Google, and hides Facebook by default (flag off)', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy()
    // VITE_ENABLE_FACEBOOK is unset in tests, so Facebook must not render —
    // it stays hidden until provisioned. See FACEBOOK_ENABLED in LoginScreen.
    expect(screen.queryByRole('button', { name: /continue with facebook/i })).toBeNull()
  })

  it('submits email and password on sign in', async () => {
    const user = userEvent.setup()
    const { props, container } = renderScreen()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'hunter22')

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    await user.click(submitButton)

    expect(props.onEmailAuth).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hunter22',
      mode: 'sign-in',
    })
  })

  it('switches to reset mode and submits the reset email', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByText(/reset your password/i)).toBeTruthy()

    await user.type(screen.getByLabelText(/^email$/i), 'reset@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(props.onRequestPasswordReset).toHaveBeenCalledWith('reset@example.com')
  })

  it('disables the form and shows the config message when auth is not configured', () => {
    const { container } = renderScreen({ isAuthConfigured: false, authConfigMessage: 'Add env vars.' })
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement

    expect(submitButton.disabled).toBe(true)
    expect(screen.getByText(/add env vars/i)).toBeTruthy()
  })
})
