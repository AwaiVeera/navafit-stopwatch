# Login/Onboarding Rebuild + Firebase Auth Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LoginScreen`, `OnboardingScreen`, and `ConsentScreen` with the approved "Dawn Quartz" visual identity, add Facebook Login + password reset, and lay the Firebase Auth/Firestore cutover these screens need — feature-flagged and defaulting to the current Supabase behavior in production.

**Architecture:** Two new selector modules (`src/services/auth-backend.ts`, `src/services/data-backend.ts`) dispatch to the existing Supabase clients (`auth.ts`, `data.ts`) or the existing-but-unwired Firebase clients (`firebase-auth.ts`, `firestore-data.ts`) based on `getAuthBackend()` (`src/services/firebase.ts:99-102`, reads `VITE_AUTH_BACKEND`, defaults to `'supabase'`). `App.tsx` and the three rebuilt screens import only from the selectors, never the backend-specific files directly. The existing Supabase bootstrap code path in `App.tsx` is preserved untouched (just gated behind a flag check) so default/production behavior is unchanged; a new, additive Firebase bootstrap path runs only when the flag is set to `'firebase'`.

**Tech Stack:** React 19, TypeScript, Vite 7, Tailwind v4 + CSS custom properties, Vitest + React Testing Library (new), Firebase JS SDK v12 + `@capacitor-firebase/authentication` (already a dependency), Supabase JS v2 (already a dependency).

## Global Constraints

- Every screen/service touched must keep passing `npm run lint`, `npm test`, and `npm run build:web` after each task.
- `VITE_AUTH_BACKEND` stays defaulted to `supabase` — do not flip the default in `.env` or `.env.example` as part of this plan.
- Do not modify `src/screens/DashboardScreen.tsx`, `StopwatchScreen.tsx`, `BreathScreen.tsx`, `BiometricsScreen.tsx`, `SettingsScreen.tsx`, `AYScreen.tsx`, or their data calls — out of scope per the approved design spec (`docs/superpowers/specs/2026-07-10-login-onboarding-firebase-rebuild-design.md`).
- Do not modify the shared `.glass-sheet`, `.glass-card`, `.section-kicker`, `.section-title`, `.support-copy`, `.label-text`, `.info-row`, `.matte-input` (outside Onboarding), or `.consent-row` (outside Consent) CSS classes — they're used by other screens not in scope. New styling goes in new `.dq-*`-prefixed classes.
- Preserve every existing prop contract for `OnboardingScreen` and `ConsentScreen` exactly (same prop names/types) — only their JSX/CSS classes change. `LoginScreen`'s prop contract gains `onRequestPasswordReset`, `isAuthConfigured` (renamed from `isSupabaseConfigured`), and `authConfigMessage`.
- No jest-dom dependency — write component tests with plain Vitest assertions (`.disabled`, `.hasAttribute(...)`) against real DOM nodes, not `toBeInTheDocument()`/`toBeDisabled()` matchers.

---

### Task 1: Test infrastructure (jsdom + React Testing Library)

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test-setup.ts`

**Interfaces:**
- Produces: a working `render()`/`screen`/`userEvent` stack for `.test.tsx` files under a `jsdom` environment. Later tasks import `render, screen` from `@testing-library/react` and `userEvent` from `@testing-library/user-event`.

- [ ] **Step 1: Add test dependencies**

Add to `package.json` under `devDependencies` (keep alphabetical with existing entries):

```json
"@testing-library/react": "^16.3.0",
"@testing-library/user-event": "^14.6.1",
"jsdom": "^25.0.1",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: exits 0, `node_modules/@testing-library` and `node_modules/jsdom` exist.

- [ ] **Step 3: Switch vite.config.ts to vitest/config and add the test block**

Replace the full contents of `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `src/test-setup.ts`:

```ts
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Verify existing suite still passes under the new config**

Run: `npm test`
Expected: `Test Files 6 passed (6)`, `Tests 25 passed (25)` — same as before this task, since no test files changed yet.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test-setup.ts
git commit -m "test: add jsdom + React Testing Library infrastructure"
```

---

### Task 2: Dawn Quartz design tokens and component classes

**Files:**
- Modify: `src/index.css` (append new section at end of file, after line 2596 — do not touch any existing rule)

**Interfaces:**
- Produces: CSS classes `.dq-root`, `.dq-hero`, `.dq-logo-ring`, `.dq-logo-ring--pulse`, `.dq-logo`, `.dq-brand`, `.dq-tagline`, `.dq-brand-static`, `.dq-sheet`, `.dq-sheet-flat`, `.dq-btn`, `.dq-btn-sso`, `.dq-btn-primary`, `.dq-divider`, `.dq-field`, `.dq-label`, `.dq-input`, `.dq-link`, `.dq-mode-toggle` (+ `.dq-is-active` on its buttons), `.dq-status`, `.dq-status-error`, `.dq-checkbox-row`, `.dq-heading`, `.dq-support-copy`. Consumed by Tasks 7-9 (Login/Onboarding/Consent screens).

- [ ] **Step 1: Append the Dawn Quartz section to `src/index.css`**

Append this exact block to the end of the file:

```css

/* ═══════════════════════════════════════════════════
   DAWN QUARTZ — Login / Onboarding / Consent identity
   Scoped to .dq-root so it never affects other screens.
   ═══════════════════════════════════════════════════ */

.dq-root {
  --dq-bg-top: #fbf5ee;
  --dq-bg-bottom: #f4e9dc;
  --dq-text-primary: #2e2620;
  --dq-text-muted: #a9765f;
  --dq-accent: #b5654a;
  --dq-accent-soft: rgba(181, 101, 74, 0.14);
  --dq-border: #e3cdb9;
  --dq-sheet-bg: #fffaf3;
  --dq-input-bg: #ffffff;
  --dq-danger: #a3402c;
  --dq-font-display: 'Cormorant Garamond', Georgia, serif;
  --dq-font-ui: 'Inter', Arial, sans-serif;

  color: var(--dq-text-primary);
  font-family: var(--dq-font-ui);
}

[data-theme='dark'] .dq-root {
  --dq-bg-top: #241a12;
  --dq-bg-bottom: #1c140f;
  --dq-text-primary: #f4e9dc;
  --dq-text-muted: #d8ac93;
  --dq-accent: #d68a68;
  --dq-accent-soft: rgba(214, 138, 104, 0.18);
  --dq-border: #3a2a1f;
  --dq-sheet-bg: #2a1f17;
  --dq-input-bg: rgba(255, 255, 255, 0.05);
  --dq-danger: #e0705a;
}

.dq-hero {
  position: relative;
  flex: 0 0 44%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 1.5rem 1.25rem 2.5rem;
  overflow: hidden;
  background: radial-gradient(circle at 50% 32%, var(--dq-bg-top), var(--dq-bg-bottom) 72%);
}

.dq-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 18% 20%, var(--dq-accent-soft) 0 26px, transparent 27px),
    radial-gradient(circle at 85% 15%, var(--dq-accent-soft) 0 20px, transparent 21px),
    radial-gradient(circle at 80% 78%, var(--dq-accent-soft) 0 34px, transparent 35px),
    radial-gradient(circle at 12% 85%, var(--dq-accent-soft) 0 22px, transparent 23px);
  pointer-events: none;
}

.dq-logo-ring {
  position: relative;
  width: 4.5rem;
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dq-logo-ring::before,
.dq-logo-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--dq-accent);
  opacity: 0.35;
}

.dq-logo-ring::before {
  inset: -0.65rem;
}

.dq-logo-ring::after {
  inset: -1.3rem;
  opacity: 0.18;
}

.dq-logo-ring--pulse::before,
.dq-logo-ring--pulse::after {
  animation: dq-pulse 2.4s ease-in-out infinite;
}

.dq-logo-ring--pulse::after {
  animation-delay: 0.15s;
}

@keyframes dq-pulse {
  0%, 100% { transform: scale(1); opacity: 0.35; }
  50% { transform: scale(1.08); opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
  .dq-logo-ring--pulse::before,
  .dq-logo-ring--pulse::after {
    animation: none;
  }
}

.dq-logo {
  position: relative;
  z-index: 1;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--dq-sheet-bg);
  border: 2px solid var(--dq-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--dq-font-display);
  font-weight: 600;
  font-size: 1.4rem;
  color: var(--dq-accent);
  object-fit: cover;
}

.dq-brand {
  position: relative;
  font-family: var(--dq-font-display);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--dq-text-primary);
}

.dq-tagline {
  position: relative;
  font-family: var(--dq-font-display);
  font-style: italic;
  font-size: 0.78rem;
  color: var(--dq-text-muted);
}

.dq-brand-static {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--dq-sheet-bg);
  border: 1.5px solid var(--dq-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--dq-font-display);
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--dq-accent);
  margin: 0 auto;
}

.dq-sheet {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: -1.1rem;
  padding: 1.35rem 1.15rem;
  border-radius: 1.5rem 1.5rem 0 0;
  background: var(--dq-sheet-bg);
  box-shadow: 0 -6px 20px rgba(46, 38, 32, 0.08);
  overflow-y: auto;
}

.dq-sheet-flat {
  flex: none;
  border-radius: 1.25rem;
  margin-top: 0;
  overflow: visible;
  box-shadow: 0 10px 26px rgba(46, 38, 32, 0.08);
}

.dq-btn {
  width: 100%;
  border-radius: 0.75rem;
  padding: 0.7rem 1rem;
  font-family: var(--dq-font-ui);
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  transition: transform 150ms ease, opacity 150ms ease;
  cursor: pointer;
}

.dq-btn:active {
  transform: scale(0.98);
}

.dq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dq-btn-sso {
  background: var(--dq-input-bg);
  border-color: var(--dq-border);
  color: var(--dq-text-primary);
}

.dq-btn-primary {
  background: var(--dq-accent);
  color: #fff;
}

.dq-divider {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: var(--dq-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.dq-divider::before,
.dq-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--dq-border);
}

.dq-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dq-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--dq-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dq-input {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--dq-border);
  background: var(--dq-input-bg);
  color: var(--dq-text-primary);
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  font-family: var(--dq-font-ui);
}

.dq-input:focus {
  outline: none;
  border-color: var(--dq-accent);
  box-shadow: 0 0 0 3px var(--dq-accent-soft);
}

.dq-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--dq-accent);
  cursor: pointer;
}

.dq-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dq-mode-toggle {
  display: flex;
  border-radius: 0.75rem;
  background: var(--dq-accent-soft);
  padding: 0.2rem;
  gap: 0.2rem;
}

.dq-mode-toggle button {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 0.55rem;
  padding: 0.45rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--dq-text-muted);
  cursor: pointer;
}

.dq-mode-toggle button.dq-is-active {
  background: var(--dq-sheet-bg);
  color: var(--dq-text-primary);
  box-shadow: 0 2px 8px rgba(46, 38, 32, 0.12);
}

.dq-status {
  font-size: 0.8rem;
  border-radius: 0.65rem;
  padding: 0.6rem 0.75rem;
  background: var(--dq-accent-soft);
  color: var(--dq-text-primary);
}

.dq-status-error {
  background: color-mix(in srgb, var(--dq-danger) 14%, transparent);
  color: var(--dq-danger);
}

.dq-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: var(--dq-text-primary);
  text-align: left;
  cursor: pointer;
}

.dq-checkbox-row input {
  margin-top: 0.2rem;
  accent-color: var(--dq-accent);
}

.dq-heading {
  font-family: var(--dq-font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--dq-text-primary);
}

.dq-support-copy {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--dq-text-muted);
}
```

- [ ] **Step 2: Verify the build still compiles the stylesheet**

Run: `npm run build:web`
Expected: exits 0, `dist/assets/*.css` is produced with no PostCSS/Tailwind errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: add Dawn Quartz design tokens for login/onboarding/consent"
```

---

### Task 3: Supabase auth additions (Facebook provider, password reset, sign-out)

**Files:**
- Modify: `src/types.ts`
- Modify: `src/services/auth.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SocialAuthProvider` now includes `'facebook'`. `auth.ts` exports `requestPasswordReset(email: string): Promise<void>` and `signOutCurrentUser(): Promise<void>` (new), and `getProviderLabel`/`providerMap` handle `'facebook'`.

- [ ] **Step 1: Extend `SocialAuthProvider`**

In `src/types.ts`, change line 3:

```ts
export type SocialAuthProvider = 'apple' | 'google' | 'facebook'
```

- [ ] **Step 2: Update `auth.ts`'s provider map and label**

In `src/services/auth.ts`, change the `providerMap` (around line 18) and `getProviderLabel` (around line 23):

```ts
const providerMap: Record<SocialAuthProvider, Provider> = {
  apple: 'apple',
  google: 'google',
  facebook: 'facebook',
}

export function getProviderLabel(provider: SocialAuthProvider) {
  if (provider === 'apple') return 'Apple'
  if (provider === 'google') return 'Google'
  return 'Facebook'
}
```

- [ ] **Step 3: Add `requestPasswordReset` and `signOutCurrentUser`**

Add to `src/services/auth.ts`, after `submitEmailAuth` and before `startSocialAuth`:

```ts
export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  })

  if (error) {
    throw error
  }
}
```

Add at the end of the file, after `formatAuthError`:

```ts
export async function signOutCurrentUser(): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
```

- [ ] **Step 4: Type-check and test**

Run: `npm run build:web && npm test`
Expected: both exit 0. (`App.tsx` still imports the old `SocialAuthProvider` union structurally — adding a union member doesn't break existing exhaustive code here since there's no `switch` over the type elsewhere yet; if `tsc -b` reports an unused-case error anywhere, fix it before moving on.)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/services/auth.ts
git commit -m "feat(auth): add Facebook provider, password reset, sign-out to Supabase client"
```

---

### Task 4: Firebase auth additions (Facebook provider, password reset, sign-out)

**Files:**
- Modify: `src/services/firebase-auth.ts`

**Interfaces:**
- Consumes: `SocialAuthProvider` (now includes `'facebook'`, from Task 3).
- Produces: `firebase-auth.ts` exports `requestPasswordReset(email: string): Promise<void>` and `signOutCurrentUser(): Promise<void>` (new), and `startSocialAuth`/`getProviderLabel` handle `'facebook'`.

- [ ] **Step 1: Import the additional Firebase Auth symbols**

In `src/services/firebase-auth.ts`, change the `firebase/auth` import block (lines 11-23) to:

```ts
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth'
```

- [ ] **Step 2: Update `getProviderLabel`**

Replace the function (around line 40):

```ts
export function getProviderLabel(provider: SocialAuthProvider): string {
  if (provider === 'apple') return 'Apple'
  if (provider === 'google') return 'Google'
  return 'Facebook'
}
```

- [ ] **Step 3: Add Facebook to the native branch of `startSocialAuth`**

In `startSocialAuth`, inside the `if (Capacitor.isNativePlatform())` block, after the Google branch (around line 100) and before the Apple fallback, insert:

```ts
    if (provider === 'facebook') {
      const { credential } = await FirebaseAuthentication.signInWithFacebook()
      const accessToken = credential?.accessToken
      if (!accessToken) {
        throw new Error('Facebook sign-in returned no access token.')
      }
      const facebookCred = FacebookAuthProvider.credential(accessToken)
      await signInWithCredential(auth, facebookCred)
      return
    }

```

- [ ] **Step 4: Add Facebook to the web branch of `startSocialAuth`**

At the end of `startSocialAuth` (the web popup-flow section, around line 117), before the Apple popup fallback, insert:

```ts
  if (provider === 'facebook') {
    await signInWithPopup(auth, new FacebookAuthProvider())
    return
  }
```

- [ ] **Step 5: Add `requestPasswordReset` and `signOutCurrentUser`**

Add to `src/services/firebase-auth.ts`, after `submitEmailAuth` and before `startSocialAuth`:

```ts
export async function requestPasswordReset(email: string): Promise<void> {
  const auth = requireAuth()
  await sendPasswordResetEmail(auth, email)
}
```

Add at the end of the file, after `formatAuthError`:

```ts
export async function signOutCurrentUser(): Promise<void> {
  const auth = requireAuth()
  await signOut(auth)
}
```

- [ ] **Step 6: Type-check and test**

Run: `npm run build:web && npm test`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/services/firebase-auth.ts
git commit -m "feat(auth): add Facebook provider, password reset, sign-out to Firebase client"
```

**Note:** Facebook sign-in via Firebase requires a Facebook App ID/Secret registered in the Firebase Console's Facebook provider settings — a manual provisioning step, not a code change. Until that's done, the Firebase-backend Facebook path will throw at runtime; this doesn't affect the default Supabase-backend path, which already routes Facebook through Supabase's own OAuth provider config (also requires the same manual Facebook App provisioning on the Supabase side — tracked as a prerequisite, out of scope for this plan).

---

### Task 5: `auth-backend.ts` selector

**Files:**
- Create: `src/services/auth-backend.ts`

**Interfaces:**
- Consumes: `getAuthBackend()`, `getFirebaseAuth()` (`src/services/firebase.ts:71-76,99-102`); all of `src/services/auth.ts`'s and `src/services/firebase-auth.ts`'s exports (including the new ones from Tasks 3-4).
- Produces: `AppSession` type (`{ user: { id: string; email: string | null } }`), `normalizeSupabaseSession(session: Session | null): AppSession | null`, `subscribeToFirebaseAuthChanges(callback: (session: AppSession | null) => void): () => void`, and backend-dispatched `getProviderLabel`, `isAuthRedirectUrl`, `submitEmailAuth`, `startSocialAuth`, `requestPasswordReset`, `finalizeAuthFromUrl`, `deleteOwnAccount`, `signOutCurrentUser`, `formatAuthError`. Consumed by Task 7 (LoginScreen) and Task 10 (App.tsx).

- [ ] **Step 1: Create the file**

Create `src/services/auth-backend.ts`:

```ts
/**
 * Single entry point for the app's auth calls. Dispatches to the Supabase
 * client (src/services/auth.ts) or the Firebase client
 * (src/services/firebase-auth.ts) based on getAuthBackend()
 * (src/services/firebase.ts). App.tsx and the screens import only from
 * here, never the backend-specific files directly.
 */
import type { Session } from '@supabase/supabase-js'
import { onAuthStateChanged, type User } from 'firebase/auth'

import { getAuthBackend, getFirebaseAuth } from './firebase'
import * as supabaseAuth from './auth'
import * as firebaseAuthClient from './firebase-auth'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

export interface AppSession {
  user: {
    id: string
    email: string | null
  }
}

interface EmailAuthParams {
  email: string
  password: string
  mode: EmailAuthMode
}

interface EmailAuthResult {
  message: string
  hasSession: boolean
}

export function normalizeSupabaseSession(session: Session | null): AppSession | null {
  if (!session) return null
  return { user: { id: session.user.id, email: session.user.email ?? null } }
}

function normalizeFirebaseUser(user: User | null): AppSession | null {
  if (!user) return null
  return { user: { id: user.uid, email: user.email } }
}

export function getProviderLabel(provider: SocialAuthProvider): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.getProviderLabel(provider)
    : supabaseAuth.getProviderLabel(provider)
}

export function isAuthRedirectUrl(url: string): boolean {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.isAuthRedirectUrl(url)
    : supabaseAuth.isAuthRedirectUrl(url)
}

export async function submitEmailAuth(params: EmailAuthParams): Promise<EmailAuthResult> {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.submitEmailAuth(params)
    : supabaseAuth.submitEmailAuth(params)
}

export async function startSocialAuth(provider: SocialAuthProvider): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.startSocialAuth(provider)
    return
  }
  await supabaseAuth.startSocialAuth(provider)
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.requestPasswordReset(email)
    return
  }
  await supabaseAuth.requestPasswordReset(email)
}

export async function finalizeAuthFromUrl(url: string): Promise<AppSession | null> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.finalizeAuthFromUrl(url)
    return null
  }

  const session = await supabaseAuth.finalizeAuthFromUrl(url)
  return normalizeSupabaseSession(session)
}

export async function deleteOwnAccount(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.deleteOwnAccount()
    return
  }
  await supabaseAuth.deleteOwnAccount()
}

export async function signOutCurrentUser(): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firebaseAuthClient.signOutCurrentUser()
    return
  }
  await supabaseAuth.signOutCurrentUser()
}

export function formatAuthError(error: unknown): string {
  return getAuthBackend() === 'firebase'
    ? firebaseAuthClient.formatAuthError(error)
    : supabaseAuth.formatAuthError(error)
}

/**
 * Firebase-only auth state subscription, normalized to AppSession. Callers
 * should only invoke this when getAuthBackend() === 'firebase'. Returns a
 * no-op unsubscribe if Firebase isn't configured yet.
 */
export function subscribeToFirebaseAuthChanges(
  callback: (session: AppSession | null) => void,
): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    return () => undefined
  }

  return onAuthStateChanged(auth, (user) => {
    callback(normalizeFirebaseUser(user))
  })
}
```

- [ ] **Step 2: Write a unit test for the selector**

Create `src/services/auth-backend.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { normalizeSupabaseSession } from './auth-backend'

describe('normalizeSupabaseSession', () => {
  it('returns null for a null session', () => {
    expect(normalizeSupabaseSession(null)).toBeNull()
  })

  it('maps a Supabase session to the normalized shape, defaulting a missing email to null', () => {
    const fakeSession = {
      user: { id: 'user-123', email: undefined },
    } as unknown as Parameters<typeof normalizeSupabaseSession>[0]

    expect(normalizeSupabaseSession(fakeSession)).toEqual({
      user: { id: 'user-123', email: null },
    })
  })

  it('preserves a present email', () => {
    const fakeSession = {
      user: { id: 'user-456', email: 'person@example.com' },
    } as unknown as Parameters<typeof normalizeSupabaseSession>[0]

    expect(normalizeSupabaseSession(fakeSession)).toEqual({
      user: { id: 'user-456', email: 'person@example.com' },
    })
  })
})
```

- [ ] **Step 3: Run the new test**

Run: `npx vitest run src/services/auth-backend.test.ts`
Expected: `Tests 3 passed (3)`.

- [ ] **Step 4: Full verification**

Run: `npm run lint && npm run build:web && npm test`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/services/auth-backend.ts src/services/auth-backend.test.ts
git commit -m "feat(auth): add auth-backend selector between Supabase and Firebase clients"
```

---

### Task 6: `data-backend.ts` selector

**Files:**
- Create: `src/services/data-backend.ts`

**Interfaces:**
- Consumes: `getAuthBackend()` (`src/services/firebase.ts`); `ensureProfile`, `loadPersistedAppState`, `saveOnboardingProfile`, `upsertUserConsent` from both `src/services/data.ts` (verified signatures at lines 370, 397, 430, 622) and `src/services/firestore-data.ts` (verified matching signatures at lines 272, 298, 337, 690).
- Produces: the same four functions, re-exported with identical signatures, dispatched by backend flag. Consumed by Task 10 (App.tsx). No other screen's data calls are touched.

- [ ] **Step 1: Create the file**

Create `src/services/data-backend.ts`:

```ts
/**
 * Selector for the four data calls the auth/onboarding/consent flow needs,
 * dispatching to Supabase (src/services/data.ts) or Firestore
 * (src/services/firestore-data.ts) based on getAuthBackend(). Every other
 * screen's data calls (workout logs, telemetry, progression) still import
 * directly from src/services/data.ts and are unaffected by this flag.
 */
import { getAuthBackend } from './firebase'
import * as supabaseData from './data'
import * as firestoreData from './firestore-data'
import type {
  ConsentSubmission,
  HealthMetrics,
  OnboardingProfile,
  PersistedAppState,
  TelemetryState,
  UserConsentRecord,
} from '../types'

export async function ensureProfile(params: {
  userId: string
  email: string | null | undefined
}): Promise<void> {
  if (getAuthBackend() === 'firebase') {
    await firestoreData.ensureProfile(params)
    return
  }
  await supabaseData.ensureProfile(params)
}

export async function loadPersistedAppState(params: {
  userId: string
  fallbackHealth: HealthMetrics
  fallbackTelemetry: TelemetryState
}): Promise<PersistedAppState> {
  return getAuthBackend() === 'firebase'
    ? firestoreData.loadPersistedAppState(params)
    : supabaseData.loadPersistedAppState(params)
}

export async function saveOnboardingProfile(params: {
  userId: string
  profile: OnboardingProfile
}): Promise<{ savedToCloud: boolean }> {
  return getAuthBackend() === 'firebase'
    ? firestoreData.saveOnboardingProfile(params)
    : supabaseData.saveOnboardingProfile(params)
}

export async function upsertUserConsent(
  userId: string,
  submission: ConsentSubmission,
): Promise<UserConsentRecord> {
  return getAuthBackend() === 'firebase'
    ? firestoreData.upsertUserConsent(userId, submission)
    : supabaseData.upsertUserConsent(userId, submission)
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build:web`
Expected: exits 0. If `tsc` reports a signature mismatch against `firestore-data.ts` or `data.ts`, fix the selector's parameter/return types to match exactly rather than changing either backend file.

- [ ] **Step 3: Commit**

```bash
git add src/services/data-backend.ts
git commit -m "feat(data): add data-backend selector for auth/onboarding/consent data calls"
```

---

### Task 7: Rebuild `LoginScreen.tsx`

**Files:**
- Create: `src/utils/motion.ts`
- Modify: `src/screens/LoginScreen.tsx` (full rewrite)
- Create: `src/screens/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `getProviderLabel` from `./services/auth-backend` (Task 5); `.dq-*` CSS classes (Task 2); `EmailAuthMode`, `SocialAuthProvider` from `../types`.
- Produces: `LoginScreenProps` = `{ onEmailAuth, onSocialAuth, onRequestPasswordReset, isAuthBusy, isBootstrapping, authMessage, authError, isAuthConfigured, authConfigMessage }`. Consumed by Task 10 (App.tsx).

- [ ] **Step 1: Create the shared reduced-motion helper**

Create `src/utils/motion.ts`:

```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 2: Rewrite `LoginScreen.tsx`**

Replace the full contents of `src/screens/LoginScreen.tsx`:

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'

import { getProviderLabel } from '../services/auth-backend'
import { prefersReducedMotion } from '../utils/motion'
import type { EmailAuthMode, SocialAuthProvider } from '../types'

interface LoginScreenProps {
  onEmailAuth: (params: { email: string; password: string; mode: EmailAuthMode }) => Promise<void>
  onSocialAuth: (provider: SocialAuthProvider) => Promise<void>
  onRequestPasswordReset: (email: string) => Promise<void>
  isAuthBusy: boolean
  isBootstrapping: boolean
  authMessage: string
  authError: string
  isAuthConfigured: boolean
  authConfigMessage: string
}

const LOGO_SRC = '/navafit-logo.png'
const SOCIAL_PROVIDERS: SocialAuthProvider[] = ['apple', 'google', 'facebook']

type ScreenMode = 'auth' | 'reset'

export function LoginScreen({
  onEmailAuth,
  onSocialAuth,
  onRequestPasswordReset,
  isAuthBusy,
  isBootstrapping,
  authMessage,
  authError,
  isAuthConfigured,
  authConfigMessage,
}: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<EmailAuthMode>('sign-in')
  const [screenMode, setScreenMode] = useState<ScreenMode>('auth')
  const [resetEmail, setResetEmail] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)

  const isFormDisabled = isAuthBusy || isBootstrapping || !isAuthConfigured
  const statusText = authError || authMessage || (isBootstrapping ? 'Checking your saved session...' : '')

  const submitLabel = isBootstrapping
    ? 'Checking session...'
    : isAuthBusy
      ? mode === 'sign-in' ? 'Signing in...' : 'Creating account...'
      : mode === 'sign-in' ? 'Sign In' : 'Create Account'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onEmailAuth({ email, password, mode })
  }

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onRequestPasswordReset(resetEmail)
  }

  return (
    <div className="dq-root h-full w-full flex-1 flex flex-col">
      <div className="dq-hero">
        <div className={`dq-logo-ring${prefersReducedMotion() ? '' : ' dq-logo-ring--pulse'}`}>
          {!logoFailed ? (
            <img
              src={LOGO_SRC}
              alt="NavaFit logo"
              className="dq-logo"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="dq-logo">N</div>
          )}
        </div>
        <p className="dq-brand">NavaFit</p>
        <p className="dq-tagline">Train with intent.</p>
      </div>

      <section className="dq-sheet" aria-label={screenMode === 'auth' ? 'Sign in' : 'Reset password'}>
        {screenMode === 'auth' ? (
          <>
            <div className="flex flex-col gap-2">
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="dq-btn dq-btn-sso"
                  onClick={() => void onSocialAuth(provider)}
                  disabled={isFormDisabled}
                >
                  <SocialIcon provider={provider} />
                  Continue with {getProviderLabel(provider)}
                </button>
              ))}
            </div>

            <div className="dq-divider" aria-hidden>
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!isAuthConfigured && (
                <div className="dq-status dq-status-error" role="alert">
                  <p className="dq-heading" style={{ fontSize: '0.9rem' }}>Sign-in is turned off in this build</p>
                  <p className="dq-support-copy mt-1">{authConfigMessage}</p>
                </div>
              )}

              <div className="dq-mode-toggle">
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'dq-is-active' : ''}
                  onClick={() => setMode('sign-in')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'dq-is-active' : ''}
                  onClick={() => setMode('sign-up')}
                  disabled={isAuthBusy || isBootstrapping}
                >
                  Create Account
                </button>
              </div>

              <div className="dq-field">
                <label className="dq-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="dq-input"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="dq-field">
                <div className="flex items-center justify-between">
                  <label className="dq-label" htmlFor="login-password">Password</label>
                  {mode === 'sign-in' && (
                    <button
                      type="button"
                      className="dq-link"
                      onClick={() => {
                        setResetEmail(email)
                        setScreenMode('reset')
                      }}
                      disabled={isAuthBusy || isBootstrapping}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="dq-input"
                  placeholder="••••••••"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  disabled={isFormDisabled}
                />
              </div>

              <button type="submit" disabled={isFormDisabled} className="dq-btn dq-btn-primary">
                {submitLabel}
              </button>

              {statusText && (
                <div className={`dq-status${authError ? ' dq-status-error' : ''}`} aria-live="polite">
                  {statusText}
                </div>
              )}
            </form>
          </>
        ) : (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
            <p className="dq-heading">Reset your password</p>
            <p className="dq-support-copy">
              Enter your account email and we will send you a link to choose a new password.
            </p>

            <div className="dq-field">
              <label className="dq-label" htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="dq-input"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isAuthBusy || !isAuthConfigured}
              />
            </div>

            <button type="submit" disabled={isAuthBusy || !isAuthConfigured} className="dq-btn dq-btn-primary">
              {isAuthBusy ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              className="dq-link"
              style={{ textAlign: 'center', width: '100%' }}
              onClick={() => setScreenMode('auth')}
              disabled={isAuthBusy}
            >
              Back to sign in
            </button>

            {statusText && (
              <div className={`dq-status${authError ? ' dq-status-error' : ''}`} aria-live="polite">
                {statusText}
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  )
}

function SocialIcon({ provider }: { provider: SocialAuthProvider }) {
  if (provider === 'apple') return <AppleIcon />
  if (provider === 'google') return <GoogleIcon />
  return <FacebookIcon />
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M13.03 3.06c.76-.91 1.26-2.17 1.12-3.06-1.1.04-2.39.72-3.18 1.62-.71.8-1.33 2.08-1.15 3.29 1.22.09 2.45-.62 3.21-1.85ZM16.78 10.89c-.02-2.38 1.97-3.52 2.06-3.58-1.12-1.62-2.84-1.84-3.45-1.87-1.47-.15-2.89.87-3.64.87-.76 0-1.91-.85-3.15-.82-1.61.03-3.11.95-3.94 2.42-1.69 2.91-.43 7.21 1.2 9.52.79 1.12 1.75 2.39 3 2.35 1.19-.05 1.64-.75 3.08-.75 1.45 0 1.84.75 3.1.73 1.29-.02 2.1-1.15 2.89-2.28.92-1.31 1.29-2.6 1.31-2.67-.03-.01-2.48-.95-2.46-3.92Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M19.6 10.23c0-.68-.06-1.34-.18-1.97H10v3.73h5.39a4.62 4.62 0 0 1-2 3.03v2.52h3.23c1.88-1.72 2.98-4.27 2.98-7.31Z" />
      <path d="M10 20c2.7 0 4.96-.9 6.61-2.44l-3.23-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.58-4.11H1.08v2.6A9.99 9.99 0 0 0 10 20Z" />
      <path d="M4.42 11.89a6 6 0 0 1 0-3.78V5.5H1.08a10 10 0 0 0 0 9l3.34-2.61Z" />
      <path d="M10 3.98c1.46 0 2.77.5 3.8 1.48l2.85-2.85C14.95 1.04 12.7 0 10 0a10 10 0 0 0-8.92 5.5l3.34 2.61C5.2 5.73 7.4 3.98 10 3.98Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M18 10a8 8 0 1 0-9.25 7.9v-5.59H6.63V10h2.12V8.16c0-2.1 1.24-3.26 3.15-3.26.91 0 1.87.16 1.87.16v2.06h-1.05c-1.04 0-1.36.64-1.36 1.3V10h2.32l-.37 2.31h-1.95v5.59A8 8 0 0 0 18 10Z" />
    </svg>
  )
}
```

- [ ] **Step 3: Write `LoginScreen.test.tsx`**

Create `src/screens/LoginScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { LoginScreen } from './LoginScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof LoginScreen>> = {}) {
  const props: ComponentProps<typeof LoginScreen> = {
    onEmailAuth: vi.fn().mockResolvedValue(undefined),
    onSocialAuth: vi.fn().mockResolvedValue(undefined),
    onRequestPasswordReset: vi.fn().mockResolvedValue(undefined),
    isAuthBusy: false,
    isBootstrapping: false,
    authMessage: '',
    authError: '',
    isAuthConfigured: true,
    authConfigMessage: '',
    ...overrides,
  }
  const utils = render(<LoginScreen {...props} />)
  return { props, ...utils }
}

describe('LoginScreen', () => {
  it('renders all three social sign-in options', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeTruthy()
  })

  it('submits email and password on sign in', async () => {
    const user = userEvent.setup()
    const { props, container } = renderScreen()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'hunter22')

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    await user.click(submitButton)

    expect(props.onEmailAuth).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hunter22',
      mode: 'sign-in',
    })
  })

  it('switches to reset mode and submits the reset email', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByText(/reset your password/i)).toBeTruthy()

    await user.type(screen.getByLabelText(/^email$/i), 'reset@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(props.onRequestPasswordReset).toHaveBeenCalledWith('reset@example.com')
  })

  it('disables the form and shows the config message when auth is not configured', () => {
    const { container } = renderScreen({ isAuthConfigured: false, authConfigMessage: 'Add env vars.' })
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement

    expect(submitButton.disabled).toBe(true)
    expect(screen.getByText(/add env vars/i)).toBeTruthy()
  })
})
```

- [ ] **Step 4: Run the new tests**

Run: `npx vitest run src/screens/LoginScreen.test.tsx`
Expected: `Tests 4 passed (4)`.

- [ ] **Step 5: Full verification**

Run: `npm run lint && npm run build:web && npm test`
Expected: all exit 0. (`npm run build:web` will still show `App.tsx` type errors referencing the old `LoginScreen` props until Task 10 — that's expected; confirm the *new* errors are only in `App.tsx`, not in `LoginScreen.tsx` itself.)

- [ ] **Step 6: Commit**

```bash
git add src/utils/motion.ts src/screens/LoginScreen.tsx src/screens/LoginScreen.test.tsx
git commit -m "feat(login): rebuild LoginScreen with Dawn Quartz identity, Facebook, password reset"
```

---

### Task 8: Rebuild `OnboardingScreen.tsx`

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx` (restyle only — validation logic and prop contract unchanged)
- Create: `src/screens/OnboardingScreen.test.tsx`

**Interfaces:**
- Consumes: `.dq-*` CSS classes (Task 2). Prop contract identical to the current file: `{ accountEmail, initialProfile, isSaving, error, onSubmit, onSignOut }`.

- [ ] **Step 1: Rewrite `OnboardingScreen.tsx`**

Replace the full contents of `src/screens/OnboardingScreen.tsx`:

```tsx
import { useMemo, useState } from 'react'

import type { OnboardingProfile } from '../types'

interface OnboardingScreenProps {
  accountEmail: string
  initialProfile: OnboardingProfile | null
  isSaving: boolean
  error: string
  onSubmit: (profile: OnboardingProfile) => Promise<void>
  onSignOut: () => Promise<void>
}

export function OnboardingScreen({
  accountEmail,
  initialProfile,
  isSaving,
  error,
  onSubmit,
  onSignOut,
}: OnboardingScreenProps) {
  const [ageYears, setAgeYears] = useState(initialProfile ? String(initialProfile.ageYears) : '')
  const [heightCm, setHeightCm] = useState(initialProfile ? String(initialProfile.heightCm) : '')
  const [weightKg, setWeightKg] = useState(initialProfile ? String(initialProfile.weightKg) : '')
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(
    initialProfile ? String(initialProfile.trainingDaysPerWeek) : '3',
  )
  const [localError, setLocalError] = useState('')

  const canSubmit = useMemo(() => {
    return ageYears.trim() !== ''
      && heightCm.trim() !== ''
      && weightKg.trim() !== ''
      && trainingDaysPerWeek.trim() !== ''
      && !isSaving
  }, [ageYears, heightCm, isSaving, trainingDaysPerWeek, weightKg])

  const handleSubmit = async () => {
    const parsedAge = Number(ageYears)
    const parsedHeight = Number(heightCm)
    const parsedWeight = Number(weightKg)
    const parsedTrainingDays = Number(trainingDaysPerWeek)

    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 90) {
      setLocalError('Enter an age between 13 and 90.')
      return
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 240) {
      setLocalError('Enter a height between 120 cm and 240 cm.')
      return
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight < 35 || parsedWeight > 250) {
      setLocalError('Enter a weight between 35 kg and 250 kg.')
      return
    }

    if (!Number.isFinite(parsedTrainingDays) || parsedTrainingDays < 1 || parsedTrainingDays > 7) {
      setLocalError('Enter weekly training days between 1 and 7.')
      return
    }

    setLocalError('')

    await onSubmit({
      ageYears: Math.round(parsedAge),
      heightCm: Math.round(parsedHeight),
      weightKg: Math.round(parsedWeight),
      trainingDaysPerWeek: Math.round(parsedTrainingDays),
    })
  }

  return (
    <section className="screen-shell justify-center dq-root">
      <div className="content-stack my-auto space-y-4 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="dq-brand-static">N</div>
          <p className="dq-heading">Set up your training profile</p>
          <p className="dq-support-copy">
            Signed in as {accountEmail}. Add your baseline data so NavaFit can structure session timing with better
            personalization.
          </p>
        </div>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-heading" style={{ fontSize: '1rem' }}>Required profile fields</p>
              <p className="dq-support-copy mt-1">Enter your current baseline values.</p>
            </div>
            <button
              type="button"
              className="dq-btn dq-btn-sso"
              style={{ width: 'auto' }}
              onClick={() => void onSignOut()}
              disabled={isSaving}
            >
              Sign out
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="dq-field text-left">
              <span className="dq-label">Age (years)</span>
              <input
                type="number"
                min={13}
                max={90}
                className="dq-input"
                value={ageYears}
                onChange={(event) => setAgeYears(event.target.value)}
                placeholder="28"
                inputMode="numeric"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Height (cm)</span>
              <input
                type="number"
                min={120}
                max={240}
                className="dq-input"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="178"
                inputMode="numeric"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Weight (kg)</span>
              <input
                type="number"
                min={35}
                max={250}
                className="dq-input"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="74"
                inputMode="decimal"
              />
            </label>

            <label className="dq-field text-left">
              <span className="dq-label">Training days per week</span>
              <input
                type="number"
                min={1}
                max={7}
                className="dq-input"
                value={trainingDaysPerWeek}
                onChange={(event) => setTrainingDaysPerWeek(event.target.value)}
                placeholder="3"
                inputMode="numeric"
              />
            </label>
          </div>

          {localError ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {localError}
            </div>
          ) : null}

          {error ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="dq-btn dq-btn-primary"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? 'Saving profile...' : 'Continue to consent'}
          </button>
        </section>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `OnboardingScreen.test.tsx`**

Create `src/screens/OnboardingScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { OnboardingScreen } from './OnboardingScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof OnboardingScreen>> = {}) {
  const props: ComponentProps<typeof OnboardingScreen> = {
    accountEmail: 'user@example.com',
    initialProfile: null,
    isSaving: false,
    error: '',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<OnboardingScreen {...props} />)
  return { props }
}

describe('OnboardingScreen', () => {
  it('shows a validation error for an out-of-range age instead of submitting', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.type(screen.getByLabelText(/age \(years\)/i), '5')
    await user.type(screen.getByLabelText(/height \(cm\)/i), '178')
    await user.type(screen.getByLabelText(/weight \(kg\)/i), '74')
    await user.type(screen.getByLabelText(/training days per week/i), '3')
    await user.click(screen.getByRole('button', { name: /continue to consent/i }))

    expect(screen.getByText(/enter an age between 13 and 90/i)).toBeTruthy()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('submits rounded profile values when all fields are valid', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.type(screen.getByLabelText(/age \(years\)/i), '29')
    await user.type(screen.getByLabelText(/height \(cm\)/i), '177.6')
    await user.type(screen.getByLabelText(/weight \(kg\)/i), '73.4')
    await user.type(screen.getByLabelText(/training days per week/i), '4')
    await user.click(screen.getByRole('button', { name: /continue to consent/i }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      ageYears: 29,
      heightCm: 178,
      weightKg: 73,
      trainingDaysPerWeek: 4,
    })
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `npx vitest run src/screens/OnboardingScreen.test.tsx`
Expected: `Tests 2 passed (2)`.

- [ ] **Step 4: Full verification**

Run: `npm run lint && npm run build:web && npm test`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/screens/OnboardingScreen.tsx src/screens/OnboardingScreen.test.tsx
git commit -m "feat(onboarding): restyle OnboardingScreen with Dawn Quartz identity"
```

---

### Task 9: Rebuild `ConsentScreen.tsx`

**Files:**
- Modify: `src/screens/ConsentScreen.tsx` (restyle only — logic and prop contract unchanged)
- Create: `src/screens/ConsentScreen.test.tsx`

**Interfaces:**
- Consumes: `.dq-*` CSS classes (Task 2). Prop contract identical to the current file: `{ accountEmail, initialHealthSync, initialUsageAnalytics, isSaving, error, onSubmit, onSignOut }`.

- [ ] **Step 1: Rewrite `ConsentScreen.tsx`**

Replace the full contents of `src/screens/ConsentScreen.tsx`:

```tsx
import { useState } from 'react'

import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../legal'
import { openExternalUrl } from '../services/external'
import type { ConsentSubmission } from '../types'

interface ConsentScreenProps {
  accountEmail: string
  initialHealthSync: boolean
  initialUsageAnalytics: boolean
  isSaving: boolean
  error: string
  onSubmit: (submission: ConsentSubmission) => Promise<void>
  onSignOut: () => Promise<void>
}

export function ConsentScreen({
  accountEmail,
  initialHealthSync,
  initialUsageAnalytics,
  isSaving,
  error,
  onSubmit,
  onSignOut,
}: ConsentScreenProps) {
  const [acceptsPrivacy, setAcceptsPrivacy] = useState(false)
  const [acceptsTerms, setAcceptsTerms] = useState(false)
  const [acceptsHealthSync, setAcceptsHealthSync] = useState(initialHealthSync)
  const [acceptsUsageAnalytics, setAcceptsUsageAnalytics] = useState(initialUsageAnalytics)

  const canContinue = acceptsPrivacy && acceptsTerms && !isSaving

  return (
    <section className="screen-shell justify-center dq-root">
      <div className="content-stack my-auto space-y-4 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="dq-brand-static">N</div>
          <p className="dq-heading">Review data permissions</p>
          <p className="dq-support-copy">
            Signed in as {accountEmail}. Before health syncing starts, review the legal pages and choose what
            NavaFit may use on this device.
          </p>
        </div>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-heading" style={{ fontSize: '1rem' }}>Required legal approvals</p>
              <p className="dq-support-copy mt-1">Open each page first, then tick the boxes below.</p>
            </div>
            <button
              type="button"
              className="dq-btn dq-btn-sso"
              style={{ width: 'auto' }}
              onClick={() => void onSignOut()}
              disabled={isSaving}
            >
              Sign out
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="dq-input text-left"
              style={{ cursor: 'pointer' }}
              onClick={() => void openExternalUrl(PRIVACY_POLICY_URL)}
            >
              <span className="dq-label block">Privacy Policy</span>
              <span className="dq-support-copy mt-1 block">Open the live privacy page at navafit.sg.</span>
            </button>
            <button
              type="button"
              className="dq-input text-left"
              style={{ cursor: 'pointer' }}
              onClick={() => void openExternalUrl(TERMS_OF_SERVICE_URL)}
            >
              <span className="dq-label block">Terms Of Service</span>
              <span className="dq-support-copy mt-1 block">Open the live terms page at navafit.sg.</span>
            </button>
          </div>

          <label className="dq-checkbox-row">
            <input type="checkbox" checked={acceptsPrivacy} onChange={(event) => setAcceptsPrivacy(event.target.checked)} />
            <span>I reviewed the Privacy Policy and agree to NavaFit storing my account and workout data.</span>
          </label>

          <label className="dq-checkbox-row">
            <input type="checkbox" checked={acceptsTerms} onChange={(event) => setAcceptsTerms(event.target.checked)} />
            <span>I reviewed the Terms of Service and agree to continue using the app.</span>
          </label>
        </section>

        <section className="dq-sheet dq-sheet-flat space-y-4">
          <div>
            <p className="dq-heading" style={{ fontSize: '1rem' }}>Optional production features</p>
            <p className="dq-support-copy mt-1">
              These switches control Apple Health sync and product analytics. You can keep them off and still use the
              app manually.
            </p>
          </div>

          <label className="dq-checkbox-row">
            <input
              type="checkbox"
              checked={acceptsHealthSync}
              onChange={(event) => setAcceptsHealthSync(event.target.checked)}
            />
            <span>Allow Apple Health data to personalize future session presets.</span>
          </label>

          <label className="dq-checkbox-row">
            <input
              type="checkbox"
              checked={acceptsUsageAnalytics}
              onChange={(event) => setAcceptsUsageAnalytics(event.target.checked)}
            />
            <span>Allow usage analytics so we can measure which screens and flows are actually used.</span>
          </label>

          {error ? (
            <div className="dq-status dq-status-error" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="dq-btn dq-btn-primary"
            disabled={!canContinue}
            onClick={() =>
              void onSubmit({
                acceptsHealthSync,
                acceptsUsageAnalytics,
              })
            }
          >
            {isSaving ? 'Saving consent...' : 'Continue to NavaFit'}
          </button>
        </section>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `ConsentScreen.test.tsx`**

Create `src/screens/ConsentScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { ConsentScreen } from './ConsentScreen'

function renderScreen(overrides: Partial<ComponentProps<typeof ConsentScreen>> = {}) {
  const props: ComponentProps<typeof ConsentScreen> = {
    accountEmail: 'user@example.com',
    initialHealthSync: false,
    initialUsageAnalytics: false,
    isSaving: false,
    error: '',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<ConsentScreen {...props} />)
  return { props }
}

describe('ConsentScreen', () => {
  it('keeps continue disabled until both required checkboxes are checked', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    const continueButton = screen.getByRole('button', { name: /continue to navafit/i }) as HTMLButtonElement
    expect(continueButton.disabled).toBe(true)

    await user.click(screen.getByText(/i reviewed the privacy policy/i))
    expect(continueButton.disabled).toBe(true)

    await user.click(screen.getByText(/i reviewed the terms of service/i))
    expect(continueButton.disabled).toBe(false)

    await user.click(continueButton)
    expect(props.onSubmit).toHaveBeenCalledWith({
      acceptsHealthSync: false,
      acceptsUsageAnalytics: false,
    })
  })

  it('includes optional toggles in the submission when checked', async () => {
    const user = userEvent.setup()
    const { props } = renderScreen()

    await user.click(screen.getByText(/i reviewed the privacy policy/i))
    await user.click(screen.getByText(/i reviewed the terms of service/i))
    await user.click(screen.getByText(/allow apple health data/i))
    await user.click(screen.getByRole('button', { name: /continue to navafit/i }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      acceptsHealthSync: true,
      acceptsUsageAnalytics: false,
    })
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `npx vitest run src/screens/ConsentScreen.test.tsx`
Expected: `Tests 2 passed (2)`.

- [ ] **Step 4: Full verification**

Run: `npm run lint && npm run build:web && npm test`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ConsentScreen.tsx src/screens/ConsentScreen.test.tsx
git commit -m "feat(consent): restyle ConsentScreen with Dawn Quartz identity"
```

---

### Task 10: Wire `App.tsx` to the new selectors and screens

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 5-9 (`auth-backend.ts`, `data-backend.ts`, the three rebuilt screens).
- Produces: `App.tsx` compiles against the new `LoginScreen` prop contract, uses `AppSession` instead of Supabase's `Session` for its `session` state, and gains a Firebase-flagged bootstrap path alongside the untouched-logic Supabase path.

- [ ] **Step 1: Update imports**

In `src/App.tsx`, remove line 6 (`import type { Session } from '@supabase/supabase-js'`).

Replace the import block at lines 20-45 (from `deleteOwnAccount...` through the closing `} from './services/data'`) with:

```ts
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
```

Add, alongside the existing `import { getSupabaseSetupMessage, isSupabaseConfigured, supabase, usesNativeAuthRedirect } from './services/supabase'` line:

```ts
import { getAuthBackend, getFirebaseSetupMessage, isFirebaseConfigured } from './services/firebase'
```

- [ ] **Step 2: Change the `session` state type**

Change line 125 from:

```ts
const [session, setSession] = useState<Session | null>(null)
```

to:

```ts
const [session, setSession] = useState<AppSession | null>(null)
```

Change the ref type at line 146 from `useRef<Session | null>(null)` to `useRef<AppSession | null>(null)`.

- [ ] **Step 3: Guard the existing Supabase bootstrap effect behind the flag**

In the `useEffect` that starts at line 225 (`let isMounted = true` / `let authSubscription...`), make two changes without altering any other logic:

1. Inside `applyAuthStateChange`, change every place that assigns the raw Supabase session to normalize it first. Specifically, change:
   ```ts
   sessionRef.current = nextSession
   setSession(nextSession)
   ```
   to:
   ```ts
   const normalizedSession = normalizeSupabaseSession(nextSession)
   sessionRef.current = normalizedSession
   setSession(normalizedSession)
   ```
   and leave the `nextSession` references used later in that function (`nextSession.user.id`) untouched — `applyAuthStateChange`'s parameter stays `Session | null` from Supabase since it's called directly from `supabase.auth.onAuthStateChange`; only the two assignment lines above change. `normalizeSupabaseSession` is already imported per Step 1.

2. Inside `bootstrapSession`, change:
   ```ts
   sessionRef.current = data.session ?? null
   setSession(data.session ?? null)
   ```
   to:
   ```ts
   sessionRef.current = normalizeSupabaseSession(data.session ?? null)
   setSession(normalizeSupabaseSession(data.session ?? null))
   ```

3. At the very start of the effect callback (right after `let isMounted = true`), add:
   ```ts
   if (getAuthBackend() !== 'supabase') {
     return () => {
       isMounted = false
     }
   }
   ```
   Everything else in this effect (the 20s timeout race, the `onAuthStateChange` subscription, all `setCurrentView`/`setAuthError` calls) stays exactly as it is today.

- [ ] **Step 4: Add the new, additive Firebase bootstrap effect**

Immediately after the Supabase bootstrap `useEffect` (which ends around line 333), add a new effect:

```ts
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
```

- [ ] **Step 5: Update `handleSignOut`**

Replace the body of `handleSignOut` (currently calling `supabase.auth.signOut()` directly around line 534) with:

```ts
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
```

- [ ] **Step 6: Add `handleRequestPasswordReset`**

Add a new handler after `handleSocialAuth` (around line 532):

```ts
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
```

- [ ] **Step 7: Compute the backend-neutral config flags**

Add near the other `const` derivations (after `isAuthenticated`/`accountEmail`, around line 166-169):

```ts
  const isAuthConfigured = getAuthBackend() === 'firebase' ? isFirebaseConfigured : isSupabaseConfigured
  const authConfigMessage = getAuthBackend() === 'firebase' ? getFirebaseSetupMessage() : getSupabaseSetupMessage()
```

- [ ] **Step 8: Update the `LoginScreen` render call**

Replace the `<LoginScreen ... />` block (around line 937):

```tsx
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
```

- [ ] **Step 9: Remove the now-unused `authMessage` initializer's direct Supabase coupling (optional cleanup)**

Leave `const [authMessage, setAuthMessage] = useState(getSupabaseSetupMessage())` (line 128) as-is — it's just the initial value before the first render's flag check runs, and it self-corrects via `authConfigMessage` in the rendered UI. No change needed here.

- [ ] **Step 10: Type-check, lint, and test**

Run: `npm run lint && npm run build:web && npm test`
Expected: all exit 0, with zero TypeScript errors referencing `Session`, `LoginScreen`, `auth-backend`, or `data-backend`.

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire App.tsx to auth-backend/data-backend selectors and new LoginScreen"
```

---

### Task 11: Full verification and iOS build readiness

**Files:** none (verification only).

- [ ] **Step 1: Full project verification**

Run: `npm run verify:production` (runs lint, test, build in sequence)
Expected: exits 0.

- [ ] **Step 2: Confirm the default runtime path is unchanged**

Run: `grep VITE_AUTH_BACKEND .env.example` and confirm it still reads `VITE_AUTH_BACKEND=supabase` (or is absent, which also defaults to `'supabase'` per `getAuthBackend()`). Do not edit this file in this task.

- [ ] **Step 3: Sync the web build into the iOS Capacitor project**

Run: `npm run cap:sync` (this runs `build:web` again, then `cap sync`, which copies `dist/` into `ios/App/App/public` and runs `pod install` for the iOS platform).
Expected: exits 0, output ends with `[capacitor] Sync finished`.

If `cap sync` fails specifically because CocoaPods isn't installed in this environment, report that exact error — do not attempt to install Xcode/CocoaPods system tools as part of this task; that's an environment prerequisite, not something this plan can fix.

- [ ] **Step 4: Attempt an iOS Simulator build to confirm the Xcode project compiles**

Run:

```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  build
```

Expected: output ends with `** BUILD SUCCEEDED **`.

If `xcodebuild` is not available in this environment (no Xcode installed), report that explicitly: "Xcode CLI tools are not available in this environment — the web build is synced into `ios/App/App/public` and ready; run `npm run ios:open` on a machine with Xcode to build and run." Do not claim the Xcode build succeeded if this step could not run.

- [ ] **Step 5: Report final status**

Summarize: which of lint/test/build/cap-sync/xcodebuild passed, any that couldn't run due to missing environment tooling, and the exact commit range on `worktree-login-onboarding-rebuild` covering this work.
