import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canFireHaptics(): boolean {
  return Capacitor.isNativePlatform() && !prefersReducedMotion()
}

export function hapticTap() {
  if (!canFireHaptics()) return
  void Haptics.impact({ style: ImpactStyle.Light })
}

export function hapticLap() {
  if (!canFireHaptics()) return
  void Haptics.impact({ style: ImpactStyle.Light })
}

export function hapticStartPause() {
  if (!canFireHaptics()) return
  void Haptics.impact({ style: ImpactStyle.Medium })
}

export function hapticSuccess() {
  if (!canFireHaptics()) return
  void Haptics.notification({ type: NotificationType.Success })
}

export function hapticWarning() {
  if (!canFireHaptics()) return
  void Haptics.notification({ type: NotificationType.Warning })
}

export function hapticBreathPhase(phase: string) {
  if (!canFireHaptics()) return
  const normalised = phase.toLowerCase()
  if (normalised.includes('inhale') || normalised.includes('deep')) {
    void Haptics.impact({ style: ImpactStyle.Medium })
  } else if (normalised.includes('hold') || normalised.includes('pause')) {
    void Haptics.impact({ style: ImpactStyle.Light })
  } else {
    void Haptics.impact({ style: ImpactStyle.Light })
  }
}
