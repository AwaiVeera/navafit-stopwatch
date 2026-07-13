import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom does not implement matchMedia; stub it so components that check
// prefers-reduced-motion (etc.) can render under test.
//
// `matches` is always false, so prefersReducedMotion() is always false here.
// To assert the reduced-motion branch, override window.matchMedia in that
// test — do not assume this stub can produce a true match.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
}

afterEach(() => {
  cleanup()
})
