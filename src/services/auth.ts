import { Browser } from '@capacitor/browser'
import type { Provider, Session } from '@supabase/supabase-js'

import { getAuthRedirectUrl, supabase, usesNativeAuthRedirect } from './supabase'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

interface EmailAuthParams {
  email: string
  password: string
  mode: EmailAuthMode
}

interface EmailAuthResult {
  message: string
  hasSession: boolean
}

const providerMap: Record<SocialAuthProvider, Provider> = {
  apple: 'apple',
  google: 'google',
  facebook: 'facebook',
}

export function getProviderLabel(provider: SocialAuthProvider) {
  if (provider === 'apple') return 'Apple'
  if (provider === 'google') return 'Google'
  return 'Facebook'
}

export function isAuthRedirectUrl(url: string) {
  return /access_token=|refresh_token=|code=|error_description=/.test(url)
}

export async function submitEmailAuth({
  email,
  password,
  mode,
}: EmailAuthParams): Promise<EmailAuthResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  if (mode === 'sign-in') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }

    return {
      message: 'Signed in successfully.',
      hasSession: Boolean(data.session),
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })

  if (error) {
    throw error
  }

  if (data.session) {
    return {
      message: 'Account created and signed in.',
      hasSession: true,
    }
  }

  return {
    message: 'Account created. Check your email to confirm before signing in.',
    hasSession: false,
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  })

  if (error) {
    throw error
  }
}

export async function startSocialAuth(provider: SocialAuthProvider) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const redirectTo = getAuthRedirectUrl()

  if (usesNativeAuthRedirect()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: providerMap[provider],
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      throw error
    }

    if (!data.url) {
      throw new Error(`Supabase did not return an OAuth URL for ${getProviderLabel(provider)}.`)
    }

    await Browser.open({
      url: data.url,
      presentationStyle: 'fullscreen',
    })

    return
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: providerMap[provider],
    options: {
      redirectTo,
    },
  })

  if (error) {
    throw error
  }
}

export async function finalizeAuthFromUrl(url: string): Promise<Session | null> {
  if (!supabase) {
    return null
  }

  const parsedUrl = new URL(url)
  const hashParams = new URLSearchParams(parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash)
  const errorDescription = hashParams.get('error_description') ?? parsedUrl.searchParams.get('error_description')

  if (errorDescription) {
    throw new Error(errorDescription)
  }

  const accessToken = hashParams.get('access_token') ?? parsedUrl.searchParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token') ?? parsedUrl.searchParams.get('refresh_token')

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      throw error
    }

    return data.session
  }

  const code = parsedUrl.searchParams.get('code')

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      throw error
    }

    return data.session
  }

  return null
}

export async function deleteOwnAccount(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'delete-account',
    { method: 'POST' },
  )

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.ok) {
    throw new Error('Account deletion did not complete. Please contact support.')
  }

  await supabase.auth.signOut()
}

export function formatAuthError(error: unknown) {
  const fallbackMessage = 'Something went wrong while talking to Supabase Auth.'
  const message = error instanceof Error ? error.message : fallbackMessage

  if (/invalid login credentials/i.test(message)) {
    return 'That email or password does not match an existing account.'
  }

  if (/email not confirmed/i.test(message)) {
    return 'Check your email, confirm your account, then try signing in again.'
  }

  if (/user already registered/i.test(message)) {
    return 'That email already has an account. Switch to Sign In instead.'
  }

  if (/password/i.test(message) && /short|least/i.test(message)) {
    return 'Use a longer password, then try again.'
  }

  if (/supabase is not configured yet/i.test(message)) {
    return 'Supabase is not configured yet. Add the environment values before signing in.'
  }

  return message || fallbackMessage
}

export async function signOutCurrentUser(): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
