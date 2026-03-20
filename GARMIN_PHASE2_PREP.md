# Garmin Phase 2 Prep

This file prepares the Garmin workstream without making Garmin a launch blocker for the first iPhone production candidate.

## Current Decision

- Apple Health and Apple Watch ship first.
- Garmin is phase 2.
- The current NavaFit data model is already ready for Garmin because these tables already support it:
  - `device_connections.provider = 'garmin_connect'`
  - `workout_sessions.source = 'garmin_connect'`
  - `telemetry_snapshots.source = 'garmin_connect'`
  - `sync_events.provider = 'garmin_connect'`

## Garmin Access Request

Use Garmin's official Garmin Connect Developer Program access path:

- Program overview: `https://developer.garmin.com/gc-developer-program/`
- Access request form: `https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/`
- Health API overview: `https://developer.garmin.com/gc-developer-program/health-api/`
- FAQ: `https://developer.garmin.com/gc-developer-program/program-faq/`

## What To Submit

Prepare these details before applying:

- Product name: `NavaFit Alignment`
- Primary market: `Singapore` first
- App surface: `iPhone-first`
- Data use case:
  - Read Garmin wellness and workout data
  - Sync recent activities into NavaFit
  - Use recovery signals to prepare pre-session stopwatch presets
- Privacy policy URL: `https://navafit.sg/privacy-policy/`
- Terms URL: `https://navafit.sg/terms-of-service/`
- Support email: `awaiveera@navafit.sg`

## Planned OAuth Shape

Garmin Connect uses OAuth 2.0 PKCE for approved developers.

When Garmin access is approved, keep the same app-side pattern already used for Supabase social auth:

- Native redirect URL: `com.navafit.alignment://auth-callback`
- App-side exchange should remain provider-specific and not be mixed into the stopwatch UI
- Garmin tokens should only be introduced after the approval docs confirm the exact scopes and token lifetime

## NavaFit Data Mapping

When Garmin is approved, the ingestion path should map like this:

- `device_connections`
  - `provider = 'garmin_connect'`
  - `connection_status = 'active' | 'revoked' | 'error'`
- `telemetry_snapshots`
  - map supported Garmin metrics into `heart_rate`, `breath_per_minute`, `stress_level`, and other available columns
  - store `source = 'garmin_connect'`
- `workout_sessions`
  - import completed Garmin activities with `source = 'garmin_connect'`
  - keep provider identifiers in `metadata`
- `sync_events`
  - record success and error outcomes for each Garmin pull or backfill

## Guardrails

- Do not block TestFlight on Garmin approval.
- Do not invent Garmin scopes or endpoints until the developer portal exposes them for this app.
- Keep the preset engine source-agnostic so Garmin becomes another data source, not a rewrite.
