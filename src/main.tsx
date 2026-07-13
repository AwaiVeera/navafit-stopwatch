import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initTheme } from './services/theme'

initTheme()

// DEV-only screen preview harness (e.g. ?preview=stopwatch) — verify in-app
// screens in a browser without a live auth session. Stripped from prod builds.
let root: ReactNode = <App />
if (import.meta.env.DEV) {
  const previewName = new URLSearchParams(window.location.search).get('preview')
  if (previewName) {
    const preview = await import('./dev/ScreenPreview')
    const registry: Record<string, () => ReactNode> = {
      stopwatch: () => <preview.StopwatchPreview />,
      breath: () => <preview.BreathPreview />,
      dashboard: () => <preview.DashboardPreview />,
    }
    root = registry[previewName]?.() ?? <App />
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
