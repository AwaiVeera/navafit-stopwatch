import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { tapFeedback } from './utils/feedback'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { AYScreen } from './screens/AYScreen'
import { BreathScreen } from './screens/BreathScreen'
import { ConsentScreen } from './screens/ConsentScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { BiometricsScreen } from './screens/BiometricsScreen'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PreSessionScreen } from './screens/PreSessionScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StopwatchScreen } from './screens/StopwatchScreen'
import {
  deleteOwnAccount,
  finalizeAuthFromUrl,
  formatAuthError,
  getProviderLabel,
  isAuthRedirectUrl,
  normalizeSupabaseSession,
  requestPasswordReset,
  signOutCurrentUser,
  startSocialAuth,
  submitEmailAuth,
  subscribeToFirebaseAuthChanges,
  type AppSession,
} from './services/auth-backend'
import { resolveAuthenticatedView } from './services/app-flow'
import {
  ensureProfile,
  loadPersistedAppState,
  saveOnboardingProfile,
  upsertUserConsent,
} from './services/data-backend'
import {
  loadCloudProgression,
  loadLocalOnboardingProfile,
  loadLocalProgression,
  loadLocalWorkoutCache,
  mergeProgressions,
  recordAppUsageEvent,
  saveCloudProgression,
  saveLocalProgression,
  saveLocalWorkoutCache,
  saveWorkoutSession,
} from './services/data'
import { BREATHWORK_MODES, getBreathworkMode } from './services/breath-protocols'
import { getStopwatchMode, STOPWATCH_MODES } from './services/stopwatch-modes'
import { buildInsightSnapshot } from './services/insights'
import {
  buildRecommendedSessionPreset,
  getDraftPresetForMode,
  readPresetModePreference,
  savePresetModePreference,
  STANDARD_SESSION_PRESET,
} from './services/presets'
import { supportsNativeHealthSync, writeSessionToAppleHealth } from './services/health'
import { getSupabaseSetupMessage, isSupabaseConfigured, supabase, usesNativeAuthRedirect } from './services/supabase'
import { getAuthBackend, getFirebaseSetupMessage, isFirebaseConfigured } from './services/firebase'
import { createInitialTelemetryState, fetchLiveWeatherSnapshot, syncTelemetry } from './services/telemetry'
import { hasAcceptedCurrentLegalVersions } from './legal'
import type {
  EmailAuthMode,
  HealthMetrics,
  OnboardingProfile,
  PresetMode,
  SessionPreset,
  SessionSavePayload,
  SocialAuthProvider,
  TrainingLevel,
  TrainingProgression,
  UserConsentRecord,
  ViewId,
  WorkoutLog,
} from './types'

const INITIAL_PROGRESSION: TrainingProgression = {
  stopwatch: { intermediate: 0, advanced: 0 },
  breathwork: { intermediate: 0, advanced: 0 },
}

const initialHealth: HealthMetrics = {
  heartRate: 0,
  readiness: 0,
  stamina: 0,
  breathPerMinute: 0,
  endurance: 0,
  stressLevel: 0,
  stepsToday: null,
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
  const [session, setSession] = useState<AppSession | null>(null)
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState(getSupabaseSetupMessage())
  const [authError, setAuthError] = useState('')
  const [consentError, setConsentError] = useState('')
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [health, setHealth] = useState<HealthMetrics>(initialHealth)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs)
  const [telemetry, setTelemetry] = useState(() => createInitialTelemetryState())
  const [consentRecord, setConsentRecord] = useState<UserConsentRecord | null>(null)
  const [presetMode, setPresetMode] = useState<PresetMode>(() => readPresetModePreference())
  const [draftPreset, setDraftPreset] = useState<SessionPreset>(STANDARD_SESSION_PRESET)
  const [activeSessionPreset, setActiveSessionPreset] = useState<SessionPreset>(STANDARD_SESSION_PRESET)
  const [isTelemetrySyncing, setIsTelemetrySyncing] = useState(false)
  const [weatherUiPhase, setWeatherUiPhase] = useState<'idle' | 'loading' | 'offline' | 'error'>('idle')
  const [stopwatchLevel, setStopwatchLevel] = useState<TrainingLevel>('novice')
  const [breathworkLevel, setBreathworkLevel] = useState<TrainingLevel>('novice')
  const [progression, setProgression] = useState<TrainingProgression>(INITIAL_PROGRESSION)
  const sessionRef = useRef<AppSession | null>(null)
  const presetModeRef = useRef(presetMode)
  const pendingProviderRef = useRef<SocialAuthProvider | null>(null)
  const lastUsageScreenRef = useRef('')

  const activeStopwatchMode = useMemo(() => getStopwatchMode(stopwatchLevel), [stopwatchLevel])
  const activeBreathworkMode = useMemo(() => getBreathworkMode(breathworkLevel), [breathworkLevel])

  const totalMinutes = useMemo(
    () => logs.reduce((total, item) => total + item.durationMinutes, 0),
    [logs],
  )
  const insights = useMemo(
    () => buildInsightSnapshot({ health, telemetry, logs, progression }),
    [health, logs, progression, telemetry],
  )
  const recommendedPreset = useMemo(
    () => buildRecommendedSessionPreset({ health, telemetry, logs, onboardingProfile }),
    [health, logs, onboardingProfile, telemetry],
  )
  const isAuthenticated = session !== null
  const accountEmail = session?.user.email ?? 'Signed-in user'
  const isAuthConfigured = getAuthBackend() === 'firebase' ? isFirebaseConfigured : isSupabaseConfigured
  const authConfigMessage = getAuthBackend() === 'firebase' ? getFirebaseSetupMessage() : getSupabaseSetupMessage()
  const hasCurrentConsent = hasAcceptedCurrentLegalVersions(consentRecord)
  const usageAnalyticsEnabled = hasCurrentConsent && Boolean(consentRecord?.acceptedUsageAnalyticsAt)
  const navActiveView =
    currentView === 'pre-session'
      ? 'stopwatch'
      : currentView === 'biometrics'
        ? 'settings'
        : currentView === 'login' || currentView === 'onboarding' || currentView === 'consent'
          ? 'dashboard'
          : currentView

  const handleAuthRedirect = useCallback(async (url: string) => {
    if (!isAuthRedirectUrl(url)) {
      return
    }

    if (sessionRef.current && !pendingProviderRef.current) {
      await Browser.close().catch(() => undefined)
      return
    }

    let shouldKeepBootstrapping = false

    setIsAuthBusy(true)
    setAuthError('')
    setAuthMessage('Finalizing secure sign-in...')

    try {
      await Browser.close().catch(() => undefined)
      const nextSession = await finalizeAuthFromUrl(url)

      if (nextSession) {
        shouldKeepBootstrapping = true
        sessionRef.current = nextSession
        setSession(nextSession)
        setAuthMessage('')
        setIsAuthBootstrapping(true)
      } else {
        setAuthMessage('')
      }
    } catch (error) {
      setAuthError(formatAuthError(error))
      setAuthMessage('')
    } finally {
      pendingProviderRef.current = null
      setIsAuthBusy(false)

      if (!shouldKeepBootstrapping) {
        setIsAuthBootstrapping(false)
      }
    }
  }, [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    presetModeRef.current = presetMode
  }, [presetMode])

  useEffect(() => {
    let isMounted = true

    if (getAuthBackend() !== 'supabase') {
      return () => {
        isMounted = false
      }
    }

    let authSubscription: { unsubscribe: () => void } | null = null
    const applyAuthStateChange = (event: string, nextSession: Session | null) => {
      const previousUserId = sessionRef.current?.user.id ?? null

      const normalizedSession = normalizeSupabaseSession(nextSession)
      sessionRef.current = normalizedSession
      setSession(normalizedSession)

      if (nextSession) {
        const enteredAuthenticatedSession =
          previousUserId === null || nextSession.user.id !== previousUserId

        if (event === 'SIGNED_IN' && enteredAuthenticatedSession) {
          setCurrentView('dashboard')
        }

        setAuthError('')
        setAuthMessage('')

        if (enteredAuthenticatedSession) {
          setIsAuthBootstrapping(true)
        }
      } else {
        setCurrentView('login')
        setHealth(initialHealth)
        setLogs(initialLogs)
        setWeatherUiPhase('idle')
        setTelemetry(createInitialTelemetryState())
        setConsentRecord(null)
        setOnboardingProfile(null)
        setIsOnboardingComplete(false)
        setDraftPreset(STANDARD_SESSION_PRESET)
        setActiveSessionPreset(STANDARD_SESSION_PRESET)
        setConsentError('')
        setOnboardingError('')
        setIsAuthBootstrapping(false)
      }

      setIsAuthBusy(false)
    }

    const bootstrapSession = async () => {
      if (!supabase) {
        if (isMounted) {
          setCurrentView('login')
          setIsAuthBootstrapping(false)
        }
        return
      }

      const SESSION_BOOTSTRAP_TIMEOUT_MS = 20_000

      const sessionOutcome = await Promise.race([
        supabase.auth.getSession().then((result) => ({ kind: 'result' as const, result })),
        new Promise<{ kind: 'timeout' }>((resolve) => {
          setTimeout(() => resolve({ kind: 'timeout' }), SESSION_BOOTSTRAP_TIMEOUT_MS)
        }),
      ])

      if (!isMounted) {
        return
      }

      if (sessionOutcome.kind === 'timeout') {
        setAuthError(
          'Could not reach Supabase in time. Check Wi-Fi or cellular data, wait a moment, then fully quit the app and open it again.',
        )
        setSession(null)
        setCurrentView('login')
        setIsAuthBootstrapping(false)

        const { data: listenerData } = supabase.auth.onAuthStateChange((event, nextSession) => {
          applyAuthStateChange(event, nextSession)
        })

        authSubscription = listenerData.subscription
        return
      }

      const { data, error } = sessionOutcome.result

      if (error) {
        setAuthError(formatAuthError(error))
      }

      sessionRef.current = normalizeSupabaseSession(data.session ?? null)
      setSession(normalizeSupabaseSession(data.session ?? null))
      setCurrentView(data.session ? 'dashboard' : 'login')
      setIsAuthBootstrapping(Boolean(data.session))

      const { data: listenerData } = supabase.auth.onAuthStateChange((event, nextSession) => {
        applyAuthStateChange(event, nextSession)
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
    if (getAuthBackend() !== 'firebase') {
      return undefined
    }

    const unsubscribe = subscribeToFirebaseAuthChanges((nextSession) => {
      const previousUserId = sessionRef.current?.user.id ?? null

      sessionRef.current = nextSession
      setSession(nextSession)

      if (nextSession) {
        const enteredAuthenticatedSession = previousUserId === null || nextSession.user.id !== previousUserId

        if (enteredAuthenticatedSession) {
          setCurrentView('dashboard')
          setIsAuthBootstrapping(true)
        }

        setAuthError('')
        setAuthMessage('')
      } else {
        setCurrentView('login')
        setHealth(initialHealth)
        setLogs(initialLogs)
        setWeatherUiPhase('idle')
        setTelemetry(createInitialTelemetryState())
        setConsentRecord(null)
        setOnboardingProfile(null)
        setIsOnboardingComplete(false)
        setDraftPreset(STANDARD_SESSION_PRESET)
        setActiveSessionPreset(STANDARD_SESSION_PRESET)
        setConsentError('')
        setOnboardingError('')
        setIsAuthBootstrapping(false)
      }

      setIsAuthBusy(false)
    })

    setIsAuthBootstrapping(false)

    return () => {
      unsubscribe()
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
        const storedOnboardingProfile = loadLocalOnboardingProfile(session.user.id)
        const cachedWorkoutLogs = loadLocalWorkoutCache(session.user.id)
        const mergedWorkoutLogs = mergeWorkoutLogs(persistedState.logs, cachedWorkoutLogs)
        const onboardingCompleted = persistedState.onboardingCompleted || Boolean(storedOnboardingProfile)
        const localProg = loadLocalProgression(session.user.id)
        const cloudProg = await loadCloudProgression(session.user.id)
        const mergedProg = mergeProgressions(localProg, cloudProg)
        saveLocalProgression(session.user.id, mergedProg)

        if (!isMounted) {
          return
        }

        setProgression(mergedProg)
        setHealth(persistedState.health)
        setLogs(mergedWorkoutLogs)
        saveLocalWorkoutCache(session.user.id, mergedWorkoutLogs)
        setTelemetry(persistedState.telemetry)
        setConsentRecord(persistedState.consent)
        setOnboardingProfile(storedOnboardingProfile)
        setIsOnboardingComplete(onboardingCompleted)
        setOnboardingError('')
        const nextPresetMode = presetModeRef.current
        const nextRecommendedPreset = buildRecommendedSessionPreset({
          health: persistedState.health,
          telemetry: persistedState.telemetry,
          logs: mergedWorkoutLogs,
          onboardingProfile: storedOnboardingProfile,
        })
        const resolvedView = resolveAuthenticatedView(persistedState.consent, onboardingCompleted)
        setDraftPreset(
          getDraftPresetForMode(
            nextPresetMode,
            nextRecommendedPreset,
          ),
        )
        setCurrentView(resolvedView)
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
  }, [session?.user.id, session?.user.email])

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
    let shouldKeepBootstrapping = false

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

      if (result.hasSession) {
        shouldKeepBootstrapping = true
        setIsAuthBootstrapping(true)
      }
    } catch (error) {
      const message = formatAuthError(error)

      setAuthError(message)
      setAuthMessage('')
    } finally {
      setIsAuthBusy(false)

      if (!shouldKeepBootstrapping) {
        setIsAuthBootstrapping(false)
      }
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

  const handleRequestPasswordReset = useCallback(async (email: string) => {
    setAuthError('')
    setIsAuthBusy(true)
    setAuthMessage('Sending reset link...')

    try {
      await requestPasswordReset(email)
      setAuthMessage('If that email has an account, a reset link is on its way.')
    } catch (error) {
      setAuthError(formatAuthError(error))
      setAuthMessage('')
    } finally {
      setIsAuthBusy(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    setIsAuthBusy(true)
    setAuthError('')

    try {
      await signOutCurrentUser()
      setAuthMessage('You have signed out.')
      setConsentError('')
    } catch (error) {
      setAuthError(formatAuthError(error))
    } finally {
      pendingProviderRef.current = null
      setIsAuthBusy(false)
    }
  }, [])

  const handleDeleteAccount = useCallback(async () => {
    setAuthError('')
    await deleteOwnAccount()
    setAuthMessage('Your NavaFit account has been deleted.')
    setConsentError('')
    pendingProviderRef.current = null
  }, [])

  const handleOnboardingSubmit = useCallback(async (profile: OnboardingProfile) => {
    if (!session?.user.id) {
      return
    }

    setIsAuthBusy(true)
    setOnboardingError('')

    try {
      const result = await saveOnboardingProfile({
        userId: session.user.id,
        profile,
      })

      setOnboardingProfile(profile)
      setIsOnboardingComplete(true)
      setCurrentView(resolveAuthenticatedView(consentRecord, true))

      if (!result.savedToCloud) {
        setAuthMessage('Profile saved on this device. Cloud sync will retry when network is stable.')
      } else {
        setAuthMessage('')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your onboarding details.'
      setOnboardingError(message)
    } finally {
      setIsAuthBusy(false)
    }
  }, [consentRecord, session?.user.id])

  const handleConsentSubmit = useCallback(async (submission: { acceptsHealthSync: boolean; acceptsUsageAnalytics: boolean }) => {
    if (!session?.user.id) {
      return
    }

    setIsAuthBusy(true)
    setConsentError('')

    try {
      const savedConsent = await upsertUserConsent(session.user.id, submission)
      setConsentRecord(savedConsent)
      setCurrentView(resolveAuthenticatedView(savedConsent, isOnboardingComplete))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your consent choices.'

      setConsentError(message)
    } finally {
      setIsAuthBusy(false)
    }
  }, [isOnboardingComplete, session?.user.id])

  const handleTelemetrySync = useCallback(async () => {
    if (isTelemetrySyncing || !session?.user.id) {
      return
    }

    setIsTelemetrySyncing(true)
    setTelemetry((previous) => ({
      ...previous,
      healthApp: previous.healthApp === 'unavailable' ? 'unavailable' : 'syncing',
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
      setWeatherUiPhase('idle')
      if (synced.importedWorkouts.length > 0) {
        setLogs((previous) => {
          const mergedLogs = mergeWorkoutLogs(previous, synced.importedWorkouts)
          saveLocalWorkoutCache(session.user.id, mergedLogs)
          return mergedLogs
        })
      }
    } finally {
      setIsTelemetrySyncing(false)
    }
  }, [consentRecord?.acceptedHealthSyncAt, hasCurrentConsent, health, isTelemetrySyncing, session?.user.id, telemetry])

  const handleEnableHealthAndWeather = useCallback(async () => {
    if (!session?.user.id) {
      return
    }

    if (!hasCurrentConsent) {
      setCurrentView('consent')
      return
    }

    if (!consentRecord?.acceptedHealthSyncAt) {
      await handleConsentSubmit({
        acceptsHealthSync: true,
        acceptsUsageAnalytics: Boolean(consentRecord?.acceptedUsageAnalyticsAt),
      })
    }

    await handleTelemetrySync()
  }, [
    consentRecord?.acceptedHealthSyncAt,
    consentRecord?.acceptedUsageAnalyticsAt,
    handleConsentSubmit,
    handleTelemetrySync,
    hasCurrentConsent,
    session?.user.id,
  ])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined
    }

    let listener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | undefined

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        return
      }

      void handleTelemetrySync()
    }).then((handle) => {
      listener = handle
    })

    return () => {
      void listener?.remove()
    }
  }, [handleTelemetrySync])

  useEffect(() => {
    if (!isAuthenticated || !hasCurrentConsent || isAuthBootstrapping) {
      return undefined
    }

    const WEATHER_REFRESH_MS = 15 * 60 * 1000
    let cancelled = false

    const refreshWeatherOnly = async () => {
      if (cancelled || document.hidden) {
        return
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setWeatherUiPhase('offline')
        return
      }

      setWeatherUiPhase('loading')

      try {
        const snapshot = await fetchLiveWeatherSnapshot()
        if (cancelled) {
          return
        }

        setTelemetry((previous) => ({
          ...previous,
          weatherSnapshot: snapshot,
          weather: snapshot.source === 'disabled' ? previous.weather : 'ready',
        }))

        const liveFailed =
          snapshot.source === 'simulated' && typeof navigator !== 'undefined' && navigator.onLine

        setWeatherUiPhase(liveFailed ? 'error' : 'idle')
      } catch {
        if (!cancelled) {
          setWeatherUiPhase('error')
        }
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshWeatherOnly()
    }, WEATHER_REFRESH_MS)

    const onVisibility = () => {
      if (!document.hidden) {
        void refreshWeatherOnly()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, hasCurrentConsent, isAuthBootstrapping])

  useEffect(() => {
    if (!isAuthenticated || !hasCurrentConsent || isAuthBootstrapping) {
      return
    }

    const allowHealthSync = Boolean(consentRecord?.acceptedHealthSyncAt && hasCurrentConsent)
    // A row in telemetry_snapshots always yields lastSyncLabel "Synced …", even when that run used
    // the non-Health stub (web or pre-consent). Users who later opt into Health on iOS would never
    // auto-sync again if we only keyed off lastSyncLabel.
    const needsInitialTelemetryRow = telemetry.lastSyncLabel === 'Not synced yet'
    const needsIosHealthKitPull =
      allowHealthSync && supportsNativeHealthSync() && telemetry.healthApp === 'idle'

    if (!needsInitialTelemetryRow && !needsIosHealthKitPull) {
      return
    }

    void handleTelemetrySync()
  }, [
    consentRecord?.acceptedHealthSyncAt,
    handleTelemetrySync,
    hasCurrentConsent,
    isAuthBootstrapping,
    isAuthenticated,
    telemetry.healthApp,
    telemetry.lastSyncLabel,
  ])

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

  const incrementProgression = useCallback((category: 'stopwatch' | 'breathwork', level: TrainingLevel) => {
    if (level !== 'intermediate' && level !== 'advanced') return

    setProgression((prev) => {
      const updated: TrainingProgression = {
        ...prev,
        [category]: {
          ...prev[category],
          [level]: prev[category][level] + 1,
        },
      }

      if (session?.user.id) {
        saveLocalProgression(session.user.id, updated)
        void saveCloudProgression(session.user.id, updated)
      }

      return updated
    })
  }, [session?.user.id])

  const handleSaveStopwatchSession = useCallback(async (sessionPayload: SessionSavePayload) => {
    if (sessionPayload.durationMinutes <= 0) {
      return
    }

    incrementProgression('stopwatch', stopwatchLevel)

    void writeSessionToAppleHealth({
      durationMinutes: sessionPayload.durationMinutes,
      startedAt: sessionPayload.startedAt,
      endedAt: sessionPayload.endedAt,
      weightKg: onboardingProfile?.weightKg,
    })

    if (session?.user.id && isSupabaseConfigured) {
      try {
        const savedWorkout = await (async () => {
          try {
            return await saveWorkoutSession(session.user.id, sessionPayload)
          } catch {
            await new Promise<void>((resolve) => window.setTimeout(resolve, 450))
            return await saveWorkoutSession(session.user.id, sessionPayload)
          }
        })()
        setLogs((previous) => {
          const mergedLogs = mergeWorkoutLogs(previous, [savedWorkout])
          saveLocalWorkoutCache(session.user.id, mergedLogs)
          return mergedLogs
        })
        return
      } catch {
        setTelemetry((previous) => ({
          ...previous,
          lastSyncLabel: 'Session saved locally. Supabase retry needed.',
        }))
      }
    }

    const localWorkout = toLocalWorkoutLog(sessionPayload)
    if (session?.user.id) {
      setLogs((previous) => {
        const mergedLogs = mergeWorkoutLogs(previous, [localWorkout])
        saveLocalWorkoutCache(session.user.id, mergedLogs)
        return mergedLogs
      })
      return
    }

    setLogs((previous) => mergeWorkoutLogs(previous, [localWorkout]))
  }, [incrementProgression, onboardingProfile?.weightKg, session?.user.id, stopwatchLevel])

  const handleChangeStopwatchMode = useCallback((level: TrainingLevel) => {
    setStopwatchLevel(level)
  }, [])

  const handleChangeBreathworkMode = useCallback((level: TrainingLevel) => {
    setBreathworkLevel(level)
  }, [])

  return (
    <div className="app-root relative overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-backdrop" />
      <div className="pointer-events-none absolute inset-0 app-frost" />

      <main className="app-frame">
        {!isAuthenticated ? (
          <div className="app-screen screen-fade">
            <LoginScreen
              onEmailAuth={handleEmailAuth}
              onSocialAuth={handleSocialAuth}
              onRequestPasswordReset={handleRequestPasswordReset}
              isAuthBusy={isAuthBusy}
              isBootstrapping={isAuthBootstrapping}
              authMessage={authMessage}
              authError={authError}
              isAuthConfigured={isAuthConfigured}
              authConfigMessage={authConfigMessage}
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
        ) : currentView === 'onboarding' ? (
          <div className="app-screen screen-fade">
            <OnboardingScreen
              accountEmail={accountEmail}
              initialProfile={onboardingProfile}
              isSaving={isAuthBusy}
              error={onboardingError}
              onSubmit={handleOnboardingSubmit}
              onSignOut={handleSignOut}
            />
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
                  onEnableHealthWeather={handleEnableHealthAndWeather}
                  totalMinutes={totalMinutes}
                  onOpenStopwatch={handleOpenPreSession}
                  recommendedPreset={recommendedPreset}
                  presetMode={presetMode}
                  weatherUiPhase={weatherUiPhase}
                />
              )}

              {currentView === 'ay' && <AYScreen />}

              {currentView === 'pre-session' && (
                <PreSessionScreen
                  presetMode={presetMode}
                  recommendedPreset={recommendedPreset}
                  draftPreset={draftPreset}
                  stopwatchMode={activeStopwatchMode}
                  breathworkMode={activeBreathworkMode}
                  allStopwatchModes={STOPWATCH_MODES}
                  allBreathworkModes={BREATHWORK_MODES}
                  progression={progression}
                  health={health}
                  logs={logs}
                  onBack={() => setCurrentView('dashboard')}
                  onChangeMode={handleChangePresetMode}
                  onUseRecommended={handleUseRecommendedPreset}
                  onUseStandard={handleUseStandardPreset}
                  onStartSession={handleStartSession}
                  onChangeStopwatchMode={handleChangeStopwatchMode}
                  onChangeBreathworkMode={handleChangeBreathworkMode}
                />
              )}

              {currentView === 'stopwatch' && (
                <StopwatchScreen
                  onBack={() => setCurrentView('dashboard')}
                  weatherSnapshot={telemetry.weatherSnapshot}
                  heartRate={health.heartRate}
                  sessionPreset={activeSessionPreset}
                  stopwatchMode={activeStopwatchMode}
                  onSaveSession={handleSaveStopwatchSession}
                />
              )}

              {currentView === 'breath' && (
                <BreathScreen
                  health={health}
                  sessionPreset={activeSessionPreset}
                  breathworkMode={activeBreathworkMode}
                  onBack={() => setCurrentView('dashboard')}
                  onSaveSession={handleSaveStopwatchSession}
                />
              )}

              {currentView === 'biometrics' && (
                <BiometricsScreen
                  health={health}
                  insights={insights}
                  onBack={() => setCurrentView('settings')}
                />
              )}

              {currentView === 'settings' && (
                <SettingsScreen
                  accountEmail={accountEmail}
                  onSignOut={handleSignOut}
                  isSigningOut={isAuthBusy}
                  health={health}
                  healthAppStatus={telemetry.healthApp}
                  isTelemetrySyncing={isTelemetrySyncing}
                  onSyncTelemetry={handleTelemetrySync}
                  consentRecord={consentRecord}
                  onUpdateConsent={handleConsentSubmit}
                  onOpenBiometrics={() => setCurrentView('biometrics')}
                  onDeleteAccount={handleDeleteAccount}
                />
              )}
            </div>

            <nav className="tab-nav" aria-label="Main navigation">
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
                label="AY"
                active={navActiveView === 'ay'}
                icon={<AYIcon />}
                onClick={() => setCurrentView('ay')}
              />
              <TabButton
                label="BreathWork"
                active={navActiveView === 'breath'}
                icon={<BreathIcon />}
                onClick={() => setCurrentView('breath')}
              />
              <TabButton
                label="Settings"
                active={navActiveView === 'settings'}
                icon={<GearIcon />}
                onClick={() => setCurrentView('settings')}
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
  const [isTapAnimating, setIsTapAnimating] = useState(false)
  const tapTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current)
      }
    }
  }, [])

  const handlePress = () => {
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current)
    }

    tapFeedback()

    setIsTapAnimating(false)
    window.requestAnimationFrame(() => {
      setIsTapAnimating(true)
    })

    tapTimerRef.current = window.setTimeout(() => {
      setIsTapAnimating(false)
    }, 220)

    onClick()
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`tab-btn ${active ? 'tab-btn-active' : ''} ${isTapAnimating ? 'tab-btn-tap' : ''}`}
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

function AYIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 5.5h14M3 10h9M3 14.5h6" />
      <circle cx="16" cy="14.5" r="2.5" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
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
