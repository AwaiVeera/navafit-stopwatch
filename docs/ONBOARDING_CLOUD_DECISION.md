# Onboarding data: cloud vs device-only (decision)

## Decision (Phase A / current)

- **Height, weight, age, training days/week** stay **on the device** in local storage after onboarding completes.
- **Supabase `profiles`** row is updated with **`onboarding_completed = true` only** when cloud sync succeeds. See `saveOnboardingProfile` in `src/services/data.ts`.

## Why

- **Privacy and scope:** Body metrics are sensitive; shipping them to the server requires explicit product consent copy, retention policy, and security review.
- **Schema simplicity:** Phase 1 foundation already has `onboarding_completed`; no migration required for current behavior.
- **Speed to TestFlight:** Avoids blocking launch on new RLS rules and App Privacy disclosures for extra profile fields.

## When to change

Choose **cloud-backed onboarding profile** if you need:

- Same metrics **immediately after login on a second device** without re-entering onboarding, or
- Server-side **personalization or analytics** that must read those fields.

## Recommended shape if you enable cloud later

Prefer a **single JSON column** (e.g. `onboarding_profile jsonb`) over many nullable scalar columns: easier to evolve fields without repeated migrations. Apply **`SUPABASE_ONBOARDING_PROFILE_OPTIONAL.sql`** in the Supabase SQL editor (staging first), then extend `saveOnboardingProfile` / `loadPersistedAppState` to read and write that column under existing **RLS** (“Users can update own profile”).

## Verification

- New user: complete onboarding → `onboarding_completed` is true in DB when online; metrics still available offline from local cache.
- Existing users: unchanged until you run optional migration and code updates.
