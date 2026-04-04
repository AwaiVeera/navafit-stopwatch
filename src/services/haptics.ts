import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canFireHaptics(): boolean {
  return Capacitor.isNativePlatform() && !prefersReducedMotion()
}

export function hapticLap() {
  if (!canFireHaptics()) return
  void Haptics.impact({ style: ImpactStyle.Light })
}

export function hapticStartPause() {
  if (!canFireHaptics()) return
  void Haptics.impact({ style: ImpactStyle.Medium })
}
