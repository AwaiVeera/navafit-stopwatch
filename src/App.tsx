import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { BreathScreen } from './screens/BreathScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { BiometricsScreen } from './screens/BiometricsScreen'
import { LoginScreen } from './screens/LoginScreen'
import { StopwatchScreen } from './screens/StopwatchScreen'
import {
  finalizeAuthFromUrl,
  formatAuthError,
  getProviderLabel,
  isAuthRedirectUrl,
  startSocialAuth,
  submitEmailAuth,
} from './services/auth'
import { buildInsightSnapshot } from './services/insights'
import { getSupabaseSetupMessage, isSupabaseConfigured, supabase, usesNativeAuthRedirect } from './services/supabase'
import { createInitialTelemetryState, syncTelemetry } from './services/telemetry'
import type { EmailAuthMode, HealthMetrics, SocialAuthProvider, ViewId, WorkoutLog } from './types'

const initialHealth: HealthMetrics = {
  heartRate: 132,
  readiness: 78,
  stamina: 71,
  breathPerMinute: 16,
  endurance: 66,
  stressLevel: 39,
}

const initialLogs: WorkoutLog[] = [
  {
    id: '1',
    date: '2026-03-09',
    title: 'Kalari + Gadah Mix',
    durationMinutes: 43,
    note: 'Good stamina. Keep breath pace stable during final set.',
  },
  {
    id: '2',
    date: '2026-03-08',
    title: 'Animal Flow + Breath',
    durationMinutes: 36,
    note: 'Stress dropped after long exhale cycle.',
  },
]

function App() {
  const [currentView, setCurrentView] = useState<ViewId>('login')
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState(getSupabaseSetupMessage())
  const [authError, setAuthError] = useState('')
  const [health, setHealth] = useState<HealthMetrics>(initialHealth)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs)
  const [telemetry, setTelemetry] = useState(() => createInitialTelemetryState())
  const [isTelemetrySyncing, setIsTelemetrySyncing] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  const pendingProviderRef = useRef<SocialAuthProvider | null>(null)

  const totalMinutes = useMemo(
    () => logs.reduce((total, item) => total + item.durationMinutes, 0),
    [logs],
  )
  const insights = useMemo(
    () => buildInsightSnapshot({ health, telemetry, logs }),
    [health, logs, telemetry],
  )
  const isAuthenticated = session !== null
  const activeView = currentView === 'login' ? 'dashboard' : currentView
  const accountEmail = session?.user.email ?? 'Signed-in user'

  const handleAuthRedirect = useCallback(async (url: string) => {
    if (!isAuthRedirectUrl(url)) {
      return
    }

    setIsAuthBusy(true)
    setAuthError('')
    setAuthMessage('Finalizing secure sign-in...')

    try {
      await Browser.close().catch(() => undefined)
      const nextSession = await finalizeAuthFromUrl(url)

      if (nextSession) {
        sessionRef.current = nextSession
        setSession(nextSession)
        setCurrentView('dashboard')
        setAuthMessage('')
      }
    } catch (error) {
      setAuthError(formatAuthError(error))
      setAuthMessage('')
    } finally {
      pendingProviderRef.current = null
      setIsAuthBusy(false)
      setIsAuthBootstrapping(false)
    }
  }, [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    let isMounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    const bootstrapSession = async () => {
      if (!supabase) {
        if (isMounted) {
          setCurrentView('login')
          setIsAuthBootstrapping(false)
        }
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setAuthError(formatAuthError(error))
      }

      sessionRef.current = data.session ?? null
      setSession(data.session ?? null)
      setCurrentView(data.session ? 'dashboard' : 'login')
      setIsAuthBootstrapping(false)

      const { data: listenerData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        sessionRef.current = nextSession
        setSession(nextSession)
        setCurrentView(nextSession ? 'dashboard' : 'login')

        if (nextSession) {
          setAuthError('')
          setAuthMessage('')
        }

        setIsAuthBusy(false)
      })

      authSubscription = listenerData.subscription
    }

    void bootstrapSession()

    return () => {
      isMounted = false
      authSubscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!usesNativeAuthRedirect()) {
      return
    }

    let isActive = true
    let urlListener: PluginListenerHandle | null = null
    let browserListener: PluginListenerHandle | null = null

    const registerNativeListeners = async () => {
      urlListener = await CapacitorApp.addListener('appUrlOpen', (event) => {
        if (!isActive) {
          return
        }

        void handleAuthRedirect(event.url)
      })

      browserListener = await Browser.addListener('browserFinished', () => {
        if (!isActive) {
          return
        }

        const pendingProvider = pendingProviderRef.current

        if (pendingProvider && !sessionRef.current) {
          pendingProviderRef.current = null
          setIsAuthBusy(false)
          setAuthMessage(`${getProviderLabel(pendingProvider)} sign-in window closed before completion.`)
        }
      })

      const launchUrl = await CapacitorApp.getLaunchUrl()

      if (isActive && launchUrl?.url) {
        await handleAuthRedirect(launchUrl.url)
      }
    }

    void registerNativeListeners()

    return () => {
      isActive = false
      void urlListener?.remove()
      void browserListener?.remove()
    }
  }, [handleAuthRedirect])

  const handleEmailAuth = useCallback(async (
    { email, password, mode }: { email: string; password: string; mode: EmailAuthMode },
  ) => {
    setAuthError('')

    if (!isSupabaseConfigured) {
      setAuthMessage(getSupabaseSetupMessage())
      return
    }

    setIsAuthBusy(true)
    setAuthMessage(mode === 'sign-in' ? 'Signing you in...' : 'Creating your account...')

    try {
      const result = await submitEmailAuth({ email, password, mode })
      setAuthMessage(result.message)
    } catch (error) {
      setAuthError(formatAuthError(error))
      setAuthMessage('')
    } finally {
      setIsAuthBusy(false)
      setIsAuthBootstrapping(false)
    }
  }, [])

  const handleSocialAuth = useCallback(async (provider: SocialAuthProvider) => {
    setAuthError('')

    if (!isSupabaseConfigured) {
      setAuthMessage(getSupabaseSetupMessage())
      return
    }

    const providerLabel = getProviderLabel(provider)
    pendingProviderRef.current = provider
    setIsAuthBusy(true)
    setAuthMessage(`Opening ${providerLabel} sign-in...`)

    try {
      await startSocialAuth(provider)

      if (usesNativeAuthRedirect()) {
        setAuthMessage(`Continue with ${providerLabel} in the secure browser window.`)
        return
      }
    } catch (error) {
      pendingProviderRef.current = null
      setAuthError(formatAuthError(error))
      setAuthMessage('')
    } finally {
      if (!usesNativeAuthRedirect()) {
        setIsAuthBusy(false)
      }
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    setIsAuthBusy(true)
    setAuthError('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setAuthMessage('You have signed out.')
    } catch (error) {
      setAuthError(formatAuthError(error))
    } finally {
      pendingProviderRef.current = null
      setIsAuthBusy(false)
    }
  }, [])

  const handleTelemetrySync = useCallback(async () => {
    if (isTelemetrySyncing) {
      return
    }

    setIsTelemetrySyncing(true)
    setTelemetry((previous) => ({
      ...previous,
      healthApp: previous.healthApp === 'unavailable' ? 'unavailable' : 'syncing',
      fitnessWatch: previous.fitnessWatch === 'unavailable' ? 'unavailable' : 'syncing',
      weather: previous.weather === 'unavailable' ? 'unavailable' : 'syncing',
    }))

    try {
      const synced = await syncTelemetry(health)
      setHealth(synced.health)
      setTelemetry(synced.telemetry)
    } finally {
      setIsTelemetrySyncing(false)
    }
  }, [health, isTelemetrySyncing])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (telemetry.lastSyncLabel !== 'Not synced yet') {
      return
    }

    void handleTelemetrySync()
  }, [handleTelemetrySync, isAuthenticated, telemetry.lastSyncLabel])

  const handleSaveStopwatchSession = useCallback((minutes: number) => {
    if (minutes <= 0) {
      return
    }

    setLogs((previous) => [
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        title: 'Combat Stopwatch Session',
        durationMinutes: minutes,
        note: 'Auto-captured from stopwatch prototype.',
      },
      ...previous,
    ])
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-backdrop" />
      <div className="pointer-events-none absolute inset-0 app-frost" />

      <main className="app-frame">
        {!isAuthenticated ? (
          <div className="app-screen screen-fade">
            <LoginScreen
              onEmailAuth={handleEmailAuth}
              onSocialAuth={handleSocialAuth}
              isAuthBusy={isAuthBusy}
              isBootstrapping={isAuthBootstrapping}
              authMessage={authMessage}
              authError={authError}
              isSupabaseConfigured={isSupabaseConfigured}
            />
          </div>
        ) : (
          <>
            <div key={activeView} className="app-screen screen-fade app-screen-with-tab-nav">
              {activeView === 'dashboard' && (
                <DashboardScreen
                  health={health}
                  insights={insights}
                  logs={logs}
                  telemetry={telemetry}
                  isTelemetrySyncing={isTelemetrySyncing}
                  onSyncTelemetry={handleTelemetrySync}
                  totalMinutes={totalMinutes}
                  onOpenStopwatch={() => setCurrentView('stopwatch')}
                  onOpenBiometrics={() => setCurrentView('biometrics')}
                  accountEmail={accountEmail}
                  onSignOut={handleSignOut}
                  isSigningOut={isAuthBusy}
                />
              )}

              {activeView === 'stopwatch' && (
                <StopwatchScreen
                  onBack={() => setCurrentView('dashboard')}
                  weatherSnapshot={telemetry.weatherSnapshot}
                  heartRate={health.heartRate}
                  onSaveSession={handleSaveStopwatchSession}
                />
              )}

              {activeView === 'breath' && (
                <BreathScreen
                  health={health}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}

              {activeView === 'biometrics' && (
                <BiometricsScreen
                  health={health}
                  insights={insights}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}
            </div>

            <nav className="tab-nav">
              <TabButton
                label="Dashboard"
                active={activeView === 'dashboard'}
                icon={<HomeIcon />}
                onClick={() => setCurrentView('dashboard')}
              />
              <TabButton
                label="Stopwatch"
                active={activeView === 'stopwatch'}
                icon={<ChronoIcon />}
                onClick={() => setCurrentView('stopwatch')}
              />
              <TabButton
                label="Breath"
                active={activeView === 'breath'}
                icon={<BreathIcon />}
                onClick={() => setCurrentView('breath')}
              />
              <TabButton
                label="Recovery"
                active={activeView === 'biometrics'}
                icon={<PulseIcon />}
                onClick={() => setCurrentView('biometrics')}
              />
            </nav>
          </>
        )}
      </main>
    </div>
  )
}

function TabButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`tab-btn ${active ? 'tab-btn-active' : ''}`}
    >
      <span className="flex flex-col items-center justify-center">
        {icon}
        {active ? <span className="tab-btn-indicator" /> : <span className="h-[0.28rem]" />}
      </span>
    </button>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 8.8 10 3l7 5.8V17a1 1 0 0 1-1 1h-3.8v-5h-4.4v5H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function ChronoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <circle cx="10" cy="11" r="6.5" />
      <path d="M10 11 12.7 8.7M7.8 2.8h4.4M14.4 4.5l1.5-1.5" />
    </svg>
  )
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M2.5 10h3.3l1.6-3.1 3.1 6.1 1.8-4H17.5" />
      <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
    </svg>
  )
}

function BreathIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 10.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
      <path d="M3 13.5c1.4-2.6 3.2-3.9 5.3-3.9 2.4 0 3.4 1.7 5.1 1.7 1.2 0 2.2-.6 3.6-2" />
    </svg>
  )
}

export default App
