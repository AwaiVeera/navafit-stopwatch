export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'navafit-alignment-theme'
const DEFAULT_THEME: ThemeMode = 'dark'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isThemeMode(stored)) {
      return stored
    }
  } catch {
    // localStorage may be unavailable; fall back to default.
  }

  return DEFAULT_THEME
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
}

export function setTheme(theme: ThemeMode): void {
  applyTheme(theme)

  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Persisting is best-effort; ignore storage failures.
  }
}

/** Reads the stored preference and applies it to the document. Call once on boot. */
export function initTheme(): ThemeMode {
  const theme = getStoredTheme()
  applyTheme(theme)
  return theme
}
