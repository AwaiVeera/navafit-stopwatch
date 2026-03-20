import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export async function openExternalUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
    })
    return
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
