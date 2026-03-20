# HealthKit & Related Settings Checklist

Use this checklist before running the app on a physical iPhone. It lists every setting that affects Apple Health / HealthKit.

---

## 1. Xcode Signing (Required to Build)

| Setting | Where | What to Check |
|---------|-------|----------------|
| Development Team | Xcode → App target → **Signing & Capabilities** | Select your Apple ID or team. See `docs/XCODE_SIGNING_FIRST_TIME.md` if you see "Signing for 'App' requires a development team." |
| Automatically manage signing | Same tab | Check this box. |

---

## 2. HealthKit Capability (Required for Apple Health)

| Setting | Where | What to Check |
|---------|-------|----------------|
| HealthKit capability | Xcode → App target → **Signing & Capabilities** | HealthKit must appear in the list. If it does **not** appear: click **+ Capability**, search for **HealthKit**, add it. |
| Clinical Health Records | Same HealthKit section | Leave **unchecked**. NavaFit does not use clinical records. Enabling it without use can cause App Review rejection. |

**Why this matters:** Without the HealthKit capability, the app will build but HealthKit calls will fail on a real device.

---

## 3. Info.plist Usage Descriptions (Already in Place)

These are already configured in `ios/App/App/Info.plist`:

| Key | Purpose |
|-----|---------|
| `NSHealthShareUsageDescription` | Shown when the app asks to **read** health data. |
| `NSHealthUpdateUsageDescription` | Shown when the app asks to **write** health data. |

You do **not** need to change these unless you want different wording.

---

## 4. Entitlements File (Already in Place)

The file `ios/App/App/App.entitlements` already contains:

- `com.apple.developer.healthkit` = true  
- `com.apple.developer.healthkit.access` = []  

You do **not** need to edit this file. Xcode uses it when the HealthKit capability is enabled.

---

## 5. Apple Developer Portal (Automatic with Xcode)

When you use **Automatically manage signing** and add the HealthKit capability in Xcode:

- Xcode updates your App ID to include HealthKit.
- Provisioning profiles are regenerated with HealthKit support.

You do **not** need to change anything manually in the Apple Developer Portal unless you use manual signing.

---

## 6. Google Sign-In (Not Health-Related)

"Google" in your question may mean:

- **Google Sign-In** – Uses Supabase OAuth. No extra Xcode settings. Configured in Supabase Dashboard and `.env.local`.
- **Google Fit / Health Connect** – NavaFit is iOS-only for now. There is no Android build, so no Google Health setup is needed yet.

---

## 7. Quick Verification Steps

Before pressing Play (▶) in Xcode:

1. **Signing & Capabilities** – Team selected, "Automatically manage signing" checked.
2. **HealthKit** – Visible under Capabilities. If not, add it with + Capability.
3. **Destination** – Choose your physical iPhone (not "Any iOS Device").
4. **Build** – Press ⌘ R.

---

## 8. If HealthKit Still Fails

- **"Health data is unavailable"** – HealthKit is not available on iPad (iOS 16 or earlier) or in some restricted environments. Use an iPhone.
- **Permission denied** – The user must tap "Allow" when the Health permission sheet appears. Check that `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` are in Info.plist.
- **Provisioning profile error** – Remove the HealthKit capability, clean build (⇧⌘K), add HealthKit again, then build.

---

## Summary: What You Must Verify

| # | Item | Action |
|---|------|--------|
| 1 | Development team | Select in Signing & Capabilities |
| 2 | HealthKit capability | Add if missing; do not enable Clinical Health Records |
| 3 | Run destination | Select your physical iPhone |

Everything else (Info.plist, entitlements, Developer Portal) is already set up or handled by Xcode.
