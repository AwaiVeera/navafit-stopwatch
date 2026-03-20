import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { BreathScreen } from './screens/BreathScreen'
import { ConsentScreen } from './screens/ConsentScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { BiometricsScreen } from './screens/BiometricsScreen'
import { LoginScreen } from './screens/LoginScreen'
import { PreSessionScreen } from './screens/PreSessionScreen'
import { StopwatchScreen } from './screens/StopwatchScreen'
import {
  finalizeAuthFromUrl,
  formatAuthError,
  getProviderLabel,
  isAuthRedirectUrl,
  startSocialAuth,
  submitEmailAuth,
} from './services/auth'
import { resolveAuthenticatedView } from './services/app-flow'
import {
  ensureProfile,
  loadPersistedAppState,
  recordAppUsageEvent,
  saveWorkoutSession,
  upsertUserConsent,
} from './services/data'
import { buildInsightSnapshot } from './services/insights'
import {
  buildRecommendedSessionPreset,
  getDraftPresetForMode,
  readPresetModePreference,
  savePresetModePreference,
  STANDARD_SESSION_PRESET,
} from './services/presets'
import { getSupabaseSetupMessage, isSupabaseConfigured, supabase, usesNativeAuthRedirect } from './services/supabase'
import { createInitialTelemetryState, syncTelemetry } from './services/telemetry'
import { hasAcceptedCurrentLegalVersions } from './legal'
import type {
  EmailAuthMode,
  HealthMetrics,
  PresetMode,
  SessionPreset,
  SessionSavePayload,
  SocialAuthProvider,
  UserConsentRecord,
  ViewId,
  WorkoutLog,
} from './types'

const initialHealth: HealthMetrics = {
  heartRate: 132,
  readiness: 78,
  stamina: 71,
  breathPerMinute: 16,
  endurance: 66,
  stressLevel: 39,
}

const initialLogs: WorkoutLog[] = []

function mergeWorkoutLogs(currentLogs: WorkoutLog[], nextLogs: WorkoutLog[]) {
  const merged = new Map<string, WorkoutLog>()

  for (const log of [...nextLogs, ...currentLogs]) {
    const key = `${log.source ?? 'app'}-${log.startedAt ?? log.date}-${log.title}-${log.durationMinutes}`

    if (!merged.has(key)) {
      merged.set(key, log)
    }
  }

  return [...merged.values()].sort((left, right) => {
    const leftTimestamp = new Date(left.startedAt ?? left.date).getTime()
    const rightTimestamp = new Date(right.startedAt ?? right.date).getTime()
    return rightTimestamp - leftTimestamp
  })
}

function toLocalWorkoutLog(session: SessionSavePayload): WorkoutLog {
  return {
    id: crypto.randomUUID(),
    date: session.startedAt.slice(0, 10),
    title: session.title,
    durationMinutes: session.durationMinutes,
    note: session.note,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    source: session.source,
  }
}

function App() {
  const [currentView, setCurrentView] = useState<ViewId>('login')
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState(getSupabaseSetupMessage())
  const [authError, setAuthError] = useState('')
  const [consentError, setConsentError] = useState('')
  const [health, setHealth] = useState<HealthMetrics>(initialHealth)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs)
  const [telemetry, setTelemetry] = useState(() => createInitialTelemetryState())
  const [consentRecord, setConsentRecord] = useState<UserConsentRecord | null>(null)
  const [presetMode, setPresetMode] = useState<PresetMode>(() => readPresetModePreference())
  const [draftPreset, setDraftPreset] = useState<SessionPreset>(STANDARD_SESSION_PRESET)
  const [activeSessionPreset, setActiveSessionPreset] = useState<SessionPreset>(STANDARD_SESSION_PRESET)
  const [isTelemetrySyncing, setIsTelemetrySyncing] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  const pendingProviderRef = useRef<SocialAuthProvider | null>(null)
  const lastUsageScreenRef = useRef('')

  const totalMinutes = useMemo(
    () => logs.reduce((total, item) => total + item.durationMinutes, 0),
    [logs],
  )
  const insights = useMemo(
    () => buildInsightSnapshot({ health, telemetry, logs }),
    [health, logs, telemetry],
  )
  const recommendedPreset = useMemo(
    () => buildRecommendedSessionPreset({ health, telemetry, logs }),
    [health, logs, telemetry],
  )
  const isAuthenticated = session !== null
  const accountEmail = session?.user.email ?? 'Signed-in user'
  const hasCurrentConsent = hasAcceptedCurrentLegalVersions(consentRecord)
  const usageAnalyticsEnabled = hasCurrentConsent && Boolean(consentRecord?.acceptedUsageAnalyticsAt)
  const navActiveView =
    currentView === 'pre-session'
      ? 'stopwatch'
      : currentView === 'login' || currentView === 'consent'
        ? 'dashboard'
        : currentView

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
        setAuthMessage('')
        setIsAuthBootstrapping(true)
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
      setIsAuthBootstrapping(Boolean(data.session))

      const { data: listenerData } = supabase.auth.onAuthStateChange((event, nextSession) => {
        sessionRef.current = nextSession
        setSession(nextSession)

        if (nextSession) {
          if (event === 'SIGNED_IN') {
            setCurrentView('dashboard')
          }

          setAuthError('')
          setAuthMessage('')
          setIsAuthBootstrapping(true)
        } else {
          setCurrentView('login')
          setHealth(initialHealth)
          setLogs(initialLogs)
          setTelemetry(createInitialTelemetryState())
          setConsentRecord(null)
          setDraftPreset(STANDARD_SESSION_PRESET)
          setActiveSessionPreset(STANDARD_SESSION_PRESET)
          setConsentError('')
          setIsAuthBootstrapping(false)
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
    let isMounted = true

    const bootstrapAuthenticatedData = async () => {
      if (!session?.user.id) {
        return
      }

      setIsAuthBootstrapping(true)

      try {
        await ensureProfile({
          userId: session.user.id,
          email: session.user.email,
        })

        const persistedState = await loadPersistedAppState({
          userId: session.user.id,
          fallbackHealth: initialHealth,
          fallbackTelemetry: createInitialTelemetryState(),
        })

        if (!isMounted) {
          return
        }

        setHealth(persistedState.health)
        setLogs(persistedState.logs)
        setTelemetry(persistedState.telemetry)
        setConsentRecord(persistedState.consent)
        setDraftPreset(
          getDraftPresetForMode(
            presetMode,
            buildRecommendedSessionPreset({
              health: persistedState.health,
              telemetry: persistedState.telemetry,
              logs: persistedState.logs,
            }),
          ),
        )
        setCurrentView(resolveAuthenticatedView(persistedState.consent))
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Could not load your saved NavaFit production data.'
        setAuthError(message)
        setCurrentView('dashboard')
      } finally {
        if (isMounted) {
          setIsAuthBootstrapping(false)
        }
      }
    }

    void bootstrapAuthenticatedData()

    return () => {
      isMounted = false
    }
  }, [presetMode, session?.user.id, session?.user.email])

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
      setConsentError('')
    } catch (error) {
      setAuthError(formatAuthError(error))
    } finally {
      pendingProviderRef.current = null
      setIsAuthBusy(false)
    }
  }, [])

  const handleConsentSubmit = useCallback(async (submission: { acceptsHealthSync: boolean; acceptsUsageAnalytics: boolean }) => {
    if (!session?.user.id) {
      return
    }

    setIsAuthBusy(true)
    setConsentError('')

    try {
      const savedConsent = await upsertUserConsent(session.user.id, submission)
      setConsentRecord(savedConsent)
      setCurrentView('dashboard')
    } catch (error) {
      setConsentError(error instanceof Error ? error.message : 'Could not save your consent choices.')
    } finally {
      setIsAuthBusy(false)
    }
  }, [session?.user.id])

  const handleTelemetrySync = useCallback(async () => {
    if (isTelemetrySyncing || !session?.user.id) {
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
      const synced = await syncTelemetry({
        userId: session.user.id,
        currentHealth: health,
        previousTelemetry: telemetry,
        allowHealthSync: Boolean(consentRecord?.acceptedHealthSyncAt && hasCurrentConsent),
      })
      setHealth(synced.health)
      setTelemetry(synced.telemetry)
      if (synced.importedWorkouts.length > 0) {
        setLogs((previous) => mergeWorkoutLogs(previous, synced.importedWorkouts))
      }
    } finally {
      setIsTelemetrySyncing(false)
    }
  }, [consentRecord?.acceptedHealthSyncAt, hasCurrentConsent, health, isTelemetrySyncing, session?.user.id, telemetry])

  useEffect(() => {
    if (!isAuthenticated || !hasCurrentConsent || isAuthBootstrapping) {
      return
    }

    if (telemetry.lastSyncLabel !== 'Not synced yet') {
      return
    }

    void handleTelemetrySync()
  }, [handleTelemetrySync, hasCurrentConsent, isAuthBootstrapping, isAuthenticated, telemetry.lastSyncLabel])

  useEffect(() => {
    if (!isAuthenticated || !usageAnalyticsEnabled || !session?.user.id) {
      lastUsageScreenRef.current = ''
      return
    }

    const usageKey = `${session.user.id}:${currentView}`

    if (lastUsageScreenRef.current === usageKey) {
      return
    }

    lastUsageScreenRef.current = usageKey

    void recordAppUsageEvent({
      userId: session.user.id,
      screen: currentView,
      eventName: 'screen_view',
      metadata: {
        presetMode,
        healthSource: telemetry.healthSourceLabel,
      },
    }).catch(() => undefined)
  }, [currentView, isAuthenticated, presetMode, session?.user.id, telemetry.healthSourceLabel, usageAnalyticsEnabled])

  useEffect(() => {
    if (currentView !== 'pre-session') {
      return
    }

    setDraftPreset(getDraftPresetForMode(presetMode, recommendedPreset))
  }, [currentView, presetMode, recommendedPreset])

  const handleOpenPreSession = useCallback(() => {
    setDraftPreset(getDraftPresetForMode(presetMode, recommendedPreset))
    setCurrentView('pre-session')
  }, [presetMode, recommendedPreset])

  const handleChangePresetMode = useCallback((mode: PresetMode) => {
    setPresetMode(mode)
    savePresetModePreference(mode)
    setDraftPreset(getDraftPresetForMode(mode, recommendedPreset))
  }, [recommendedPreset])

  const handleUseRecommendedPreset = useCallback(() => {
    setDraftPreset(recommendedPreset)
  }, [recommendedPreset])

  const handleUseStandardPreset = useCallback(() => {
    setDraftPreset(STANDARD_SESSION_PRESET)
  }, [])

  const handleStartSession = useCallback(() => {
    setActiveSessionPreset(draftPreset)
    setCurrentView('stopwatch')
  }, [draftPreset])

  const handleSaveStopwatchSession = useCallback(async (sessionPayload: SessionSavePayload) => {
    if (sessionPayload.durationMinutes <= 0) {
      return
    }

    if (session?.user.id && isSupabaseConfigured) {
      try {
        const savedWorkout = await saveWorkoutSession(session.user.id, sessionPayload)
        setLogs((previous) => mergeWorkoutLogs(previous, [savedWorkout]))
        return
      } catch {
        setTelemetry((previous) => ({
          ...previous,
          lastSyncLabel: 'Session saved locally. Supabase retry needed.',
        }))
      }
    }

    setLogs((previous) => mergeWorkoutLogs(previous, [toLocalWorkoutLog(sessionPayload)]))
  }, [session?.user.id])

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
        ) : isAuthBootstrapping ? (
          <div className="app-screen screen-fade">
            <section className="screen-shell justify-center">
              <div className="content-stack my-auto">
                <section className="glass-sheet text-center">
                  <p className="section-kicker">Secure bootstrapping</p>
                  <h2 className="section-title mt-2">Loading your production data</h2>
                  <p className="support-copy mt-3">
                    NavaFit is restoring your profile, consent state, recent workouts, and the latest telemetry snapshot.
                  </p>
                </section>
              </div>
            </section>
          </div>
        ) : currentView === 'consent' ? (
          <div className="app-screen screen-fade">
            <ConsentScreen
              accountEmail={accountEmail}
              initialHealthSync={Boolean(consentRecord?.acceptedHealthSyncAt)}
              initialUsageAnalytics={Boolean(consentRecord?.acceptedUsageAnalyticsAt)}
              isSaving={isAuthBusy}
              error={consentError}
              onSubmit={handleConsentSubmit}
              onSignOut={handleSignOut}
            />
          </div>
        ) : (
          <>
            <div key={currentView} className="app-screen screen-fade app-screen-with-tab-nav">
              {currentView === 'dashboard' && (
                <DashboardScreen
                  health={health}
                  insights={insights}
                  logs={logs}
                  telemetry={telemetry}
                  isTelemetrySyncing={isTelemetrySyncing}
                  onSyncTelemetry={handleTelemetrySync}
                  totalMinutes={totalMinutes}
                  onOpenStopwatch={handleOpenPreSession}
                  onOpenBiometrics={() => setCurrentView('biometrics')}
                  accountEmail={accountEmail}
                  onSignOut={handleSignOut}
                  isSigningOut={isAuthBusy}
                  recommendedPreset={recommendedPreset}
                  presetMode={presetMode}
                />
              )}

              {currentView === 'pre-session' && (
                <PreSessionScreen
                  presetMode={presetMode}
                  recommendedPreset={recommendedPreset}
                  draftPreset={draftPreset}
                  onBack={() => setCurrentView('dashboard')}
                  onChangeMode={handleChangePresetMode}
                  onUseRecommended={handleUseRecommendedPreset}
                  onUseStandard={handleUseStandardPreset}
                  onStartSession={handleStartSession}
                />
              )}

              {currentView === 'stopwatch' && (
                <StopwatchScreen
                  onBack={() => setCurrentView('dashboard')}
                  weatherSnapshot={telemetry.weatherSnapshot}
                  heartRate={health.heartRate}
                  sessionPreset={activeSessionPreset}
                  onSaveSession={handleSaveStopwatchSession}
                />
              )}

              {currentView === 'breath' && (
                <BreathScreen
                  health={health}
                  sessionPreset={activeSessionPreset}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}

              {currentView === 'biometrics' && (
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
                active={navActiveView === 'dashboard'}
                icon={<HomeIcon />}
                onClick={() => setCurrentView('dashboard')}
              />
              <TabButton
                label="Stopwatch"
                active={navActiveView === 'stopwatch'}
                icon={<ChronoIcon />}
                onClick={handleOpenPreSession}
              />
              <TabButton
                label="Breath"
                active={navActiveView === 'breath'}
                icon={<BreathIcon />}
                onClick={() => setCurrentView('breath')}
              />
              <TabButton
                label="Recovery"
                active={navActiveView === 'biometrics'}
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
