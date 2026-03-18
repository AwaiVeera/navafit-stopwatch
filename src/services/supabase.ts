import { Capacitor } from '@capacitor/core'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const NATIVE_AUTH_REDIRECT_URL =
  import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL?.trim() || 'com.navafit.alignment://auth-callback'

const configIssues = [
  !supabaseUrl ? 'VITE_SUPABASE_URL is missing.' : null,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY is missing.' : null,
].filter((issue): issue is string => issue !== null)

export const isSupabaseConfigured = configIssues.length === 0

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        storageKey: 'navafit-alignment-auth',
      },
    })
  : null

export function getAuthRedirectUrl() {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_REDIRECT_URL
  }

  if (typeof window === 'undefined') {
    return NATIVE_AUTH_REDIRECT_URL
  }

  return window.location.origin
}

export function getSupabaseSetupMessage() {
  if (isSupabaseConfigured) {
    return ''
  }

  return `Add ${configIssues.join(' ')} to .env.local, then restart the app.`
}

export function usesNativeAuthRedirect() {
  return Capacitor.isNativePlatform()
}
