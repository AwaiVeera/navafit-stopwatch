# Phase 5 - Firebase + Cloudflare Provisioning (you click, I guide)

This is a manual setup you do in the browser. It assumes zero coding background - follow each numbered step exactly. When done, send me the items in section 7 and I'll continue with the code.

IMPORTANT: Create a NEW project for NavaFit. Do not modify your existing unrelated Firebase project.

## Progress tracker (updated 2026-07-03, verified against files on disk)


| Step                                     | Status                        | Evidence                                                           |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| 1. Firebase project created              | DONE                          | Project `navafit-alignment-9b93e` (in both config files)           |
| 2a. Email/Password provider              | DONE                          | Confirmed by you                                                   |
| 2b. Google provider                      | DONE                          | Confirmed by you (Android SHA-1 step still pending, see section 8) |
| 2c. Apple provider                       | PENDING                       | See section 9 for the full walkthrough                             |
| 3. Firestore created                     | DONE                          | Confirmed by you                                                   |
| 4a. Web app registered                   | **PENDING - BIGGEST BLOCKER** | `.env.local` has no Firebase values yet                            |
| 4b. iOS app registered + plist placed    | DONE                          | `ios/App/App/GoogleService-Info.plist` on disk                     |
| 4c. Android app registered + json placed | DONE                          | `android/app/google-services.json` on disk                         |
| 5. App Check: Android Play Integrity     | DONE (debug fingerprint)      | Registered by you. Do NOT enable "Enforce"                         |
| 5. App Check: iOS App Attest             | PENDING (optional now)        | Can wait until pre-production                                      |
| 6. Cloudflare Pages connected            | PENDING                       | Deferred until web deploy phase                                    |




## 1. Create the Firebase project - DONE

Project: `navafit-alignment-9b93e`.

## 2. Enable Authentication providers

- Email/Password: DONE.
- Google: DONE in the console, but Android needs a SHA-1 fingerprint before Google sign-in will work on Android (section 8).
- Apple: follow section 9.



## 3. Create the Firestore database - DONE



## 4. Register the apps

- iOS: DONE (`GoogleService-Info.plist` placed correctly).
- Android: DONE (`google-services.json` placed correctly).
- Web: PENDING - do section 7 first; I cannot write any Firebase code without it.



## 5. App Check

- Android Play Integrity: registered with the debug keystore SHA-256. Before Play Store release we must add the production "App signing key" SHA-256 from Play Console -> Test and release -> Setup -> App signing.
- iOS App Attest: optional for now. When you want it: Firebase console -> Build -> App Check -> Apps tab -> click the iOS app -> choose "App Attest" -> Save. No certificate needed. (App Attest only works on a real iPhone, not the simulator.)
- CRITICAL: never click "Enforce" on any App Check screen until I tell you the code is ready. Enforcing early locks the app out of its own backend.



## 6. Cloudflare Pages (web hosting) - do this LAST

1. Open [https://dash.cloudflare.com](https://dash.cloudflare.com) -> "Workers & Pages" -> "Create" -> "Pages" -> "Connect to Git".
2. Authorize and select the NavaFit repository.
3. Build settings:
  - Framework preset: None.
  - Build command: `npm run build:web`
  - Build output directory: `dist`
4. Do NOT deploy to production yet - I will confirm the env vars first. Save the project.
5. Tell me the Pages project name and the production domain you want (or use the default `*.pages.dev`).



## 7. Register the Web app (NEXT ACTION - unblocks all coding)

1. Open [https://console.firebase.google.com](https://console.firebase.google.com) and click your project `NavaFit Alignment`.
2. Look at the very top-left area of the page. Next to "Project Overview" there is a small gear icon. Click the gear icon, then click "Project settings".
3. You are now on the "General" tab. Scroll DOWN until you see a card titled "Your apps". You should see your iOS app and Android app listed there.
4. In that "Your apps" card, click the button "Add app".
5. A row of platform icons appears. Click the one that looks like `</>` (angle brackets - that is "Web").
6. In "App nickname" type: `NavaFit Web`
7. There is a checkbox "Also set up Firebase Hosting". LEAVE IT UNCHECKED (we host on Cloudflare).
8. Click "Register app".
9. Firebase now shows a block of code. Inside it is a part that looks like this:

```
const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "navafit-alignment-9b93e.firebaseapp.com",
  projectId: "navafit-alignment-9b93e",
  storageBucket: "navafit-alignment-9b93e.firebasestorage.app",
  messagingSenderId: "967264796871",
  appId: "1:967264796871:web:...."
};
```

1. Select everything from the `{` to the `}` with your mouse, press Cmd+C to copy, and PASTE IT TO ME IN THE CHAT. (These values are not secrets - they are safe to share and to put in the app.)
2. Click "Continue to console". Done.



## 8. Google Sign-In on Android - add the SHA-1 fingerprint

Why: your `android/app/google-services.json` currently has `"oauth_client": []` (empty). That means Google sign-in is not yet wired for Android. Fixing it needs a "SHA-1 fingerprint" (a signature ID of the key that signs the Android app).

### 8a. Get your debug SHA-1 (for development)

1. Open the "Terminal" app on your Mac (press Cmd+Space, type `Terminal`, press Enter).
2. Copy-paste this entire line and press Enter:

```
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep "SHA1"
```

1. You will see a line like `SHA1: AB:CD:12:...`. Select the long value after `SHA1:`  and copy it.
  - If you instead see an error like "keystore not found", tell me - it means the debug keystore does not exist yet and I will generate it with you.



### 8b. Add it in Firebase

1. Firebase console -> gear icon -> "Project settings" -> "General" tab.
2. Scroll to "Your apps" -> click your ANDROID app (package `com.navafit.alignment`).
3. Find "SHA certificate fingerprints" -> click "Add fingerprint".
4. Paste the SHA-1 value -> click "Save".



### 8c. Re-download the config file

1. Still in "Your apps" with the Android app selected, click the "google-services.json" download button.
2. The file lands in your Downloads folder. Move it to the project, replacing the old one:
  - In Finder: open Downloads, right-click `google-services.json`, choose "Copy".
  - Navigate to `Desktop -> navafit-stopwatch -> android -> app`, right-click inside the folder, choose "Paste Item", and confirm "Replace".
3. Tell me it is replaced - I will verify `oauth_client` is now filled.

Note: before the Play Store release we must repeat 8b with the production "App signing key" SHA-1 from Play Console.

## 9. Apple Sign-In on Firebase (step-by-step)



### What exists today (honest status)

- The live app signs in with Apple THROUGH SUPABASE using a web browser window (evidence: `src/services/auth.ts` opens a Supabase OAuth URL in the in-app browser and returns via the deep link `com.navafit.alignment://auth-callback`). It does NOT use Apple's native sign-in sheet.
- Because that web flow works in production, your Apple Developer account almost certainly already has: (a) an App ID `com.navafit.alignment` with the "Sign in with Apple" capability, and (b) a Services ID + a Sign in with Apple key configured for Supabase. I cannot see your Apple Developer or Supabase dashboards, so treat these as TBD until you check.
- I have added the native "Sign in with Apple" entitlement to the iOS app (`ios/App/App/App.entitlements`) so the FIREBASE version can use Apple's native sign-in sheet (nicer UX, required for the native flow). This is a local file change; it takes effect on the next build.



### What Firebase needs (per Firebase's official docs)

- For NATIVE iOS sign-in: only the Apple provider toggled ON in Firebase. The Services ID / Team ID / Key ID / private key fields can stay EMPTY for iOS-only. (Source: Firebase docs - "If you're deploying your app only on Apple platforms, you can leave the Service ID, Apple Team ID, private key and key ID fields empty.")
- For WEB and ANDROID Apple sign-in: the OAuth web flow is required, which needs 4 values from Apple Developer: Services ID, Team ID, Key ID, private key (.p8 file), plus a Return URL registered with Apple: `https://navafit-alignment-9b93e.firebaseapp.com/__/auth/handler`

Since NavaFit runs on iOS + Android + web, we should configure the full set.

### 9a. Find your Apple Team ID

1. Open [https://developer.apple.com/account](https://developer.apple.com/account) and sign in with the Apple ID you use for the App Store.
2. Scroll down to the "Membership details" card. "Team ID" is a 10-character code like `AB12CD34EF`. Write it down (TBD-1).



### 9b. Check the App ID capability

1. Same site: click "Certificates, Identifiers & Profiles" (left menu or main page).
2. Click "Identifiers" in the left column.
3. In the list, find and click `com.navafit.alignment`.
4. Scroll the "Capabilities" list and confirm "Sign In with Apple" has a checkmark. If it is already checked (expected, since the live app uses it), do nothing. If not, check it and click "Save" (top right).



### 9c. Create (or reuse) a Services ID

1. Still in "Identifiers": look at the top-left of the list for a small filter dropdown that says "App IDs". Click it and choose "Services IDs".
2. If you see an existing Services ID that mentions Supabase or navafit - that is the one Supabase uses. We will make a NEW one for Firebase to avoid breaking the live app.
3. Click the blue "+" button next to "Identifiers".
4. Choose "Services IDs" -> "Continue".
5. Description: `NavaFit Firebase` . Identifier: `com.navafit.alignment.firebase` -> "Continue" -> "Register".
6. Now click the newly created `com.navafit.alignment.firebase` in the list.
7. Check the box "Sign In with Apple", then click "Configure" next to it.
8. "Primary App ID": choose `com.navafit.alignment`.
9. Under "Website URLs":
  - Domains: `navafit-alignment-9b93e.firebaseapp.com`
  - Return URLs: `c`
10. Click "Next" -> "Done" -> "Continue" -> "Save".
11. Write down the Services ID `com.navafit.alignment.firebase` (TBD-2).



### 9d. Create a Sign in with Apple private key

1. Left column: click "Keys".
2. Click the blue "+" button.
3. Key Name: `NavaFit Firebase Apple Key`.
4. Check the box "Sign In with Apple", click "Configure" next to it, pick Primary App ID `com.navafit.alignment`, click "Save".
5. Click "Continue" -> "Register".
6. Click "Download". You get a file like `AuthKey_XXXXXXXXXX.p8`. SAVE IT SOMEWHERE SAFE (it can only be downloaded ONCE). The `XXXXXXXXXX` in the filename is the Key ID (TBD-3) - it is also shown on the page.



### 9e. Enter everything in Firebase

1. Firebase console -> "Build" -> "Authentication" -> "Sign-in method" tab.
2. Click "Add new provider" (or click "Apple" if listed) -> enable the toggle.
3. Fill in:
  - "Services ID": `com.navafit.alignment.firebase` (TBD-2)
  - Expand "OAuth code flow configuration (optional)":
    - "Apple team ID": your Team ID (TBD-1)
    - "Key ID": from the .p8 filename (TBD-3)
    - "Private key": open the .p8 file with TextEdit (right-click -> Open With -> TextEdit), select ALL the text (including the BEGIN/END lines), copy, paste into the box.
4. Click "Save".



### Safety note

Nothing in 9a-9e touches the live Supabase Apple setup. The live app keeps working unchanged until we flip the app code to Firebase (later phases, staged cutover).

## What to send me when done

- The Web `firebaseConfig` block (section 7, step 10) - REQUIRED before I can flip anything.
- Confirmation the new `google-services.json` replaced the old one (section 8c).
- Your Apple Team ID / confirmation 9a-9e are done (or where you got stuck).
- Cloudflare Pages project name + domain (section 6, when we get there).



## Code work already done on my end (as of this session)

All of this landed BEFORE you provided the web config. It's all env-var-guarded so nothing changes in your live app until you flip the flag.

- [functions/](../functions/) - full Cloud Functions codebase (Node 22, TypeScript), builds clean:
  - `ayChat` - port of `ay-chat/index.ts` with grounding, App Check hook, and 20 calls/60s rate limit.
  - `deleteMyAccount` - recursive Firestore wipe + Firebase Auth delete.
  - `onUserBootstrap` - seeds `users/{uid}` profile on first sign-in marker.
- [firestore.rules](../firestore.rules) - owner-scoped `users/{uid}/**`, server-only `_rateLimits`.
- [firebase.json](../firebase.json), [.firebaserc](../.firebaserc) - project alias `navafit-alignment-9b93e`.
- Client SDK installed: `firebase@12.15.0` + `@capacitor-firebase/authentication@8.3.0` (Capacitor 8 compatible).
- [src/services/firebase.ts](../src/services/firebase.ts) - init module (graceful degradation when env vars are blank).
- [src/services/firebase-auth.ts](../src/services/firebase-auth.ts) - full parallel implementation of `auth.ts` using Firebase Auth (email, Google, Apple via the Capacitor plugin on native, popup on web).
- [src/services/firestore-data.ts](../src/services/firestore-data.ts) - full parallel implementation of `data.ts` for the 7 datasets, targeting Firestore.
- [src/services/perplexity.ts](../src/services/perplexity.ts) - AY chat routes by `VITE_AUTH_BACKEND` flag: when `firebase`, it lazy-loads the Firebase SDK and calls the `ayChat` callable; when `supabase`, unchanged. Verified: main bundle stays 527KB / 150KB gzip; Firebase code splits into its own chunk that only downloads if the flag flips.



## What happens the moment you paste the web config

I will:

1. Add the 6 values you paste to `.env.local` (locally on your Mac; never committed).
2. Deploy the Cloud Functions to `navafit-alignment-9b93e` (I'll walk you through the one-time `firebase login` step in Terminal).
3. Set `VITE_AUTH_BACKEND=firebase` in a scratch env, `npm run dev`, and smoke-test AY chat end-to-end - a totally isolated risk (does not touch auth or data).
4. Only after that works, wire the auth swap in `App.tsx` and start Phase 9 (existing users export/import) - approval-gated.

Supabase stays live at every step. Nothing is destroyed until you sign off.

## Notes (technical, for the code phase)

- The web `firebaseConfig` (apiKey etc.) is NOT a secret - it is safe to put in the client `.env` / Cloudflare env. AI provider keys (Gemini etc.) stay server-side in Cloud Functions only.
- Native Firebase sign-in on Capacitor uses `@capacitor-firebase/authentication` (installed, plugin registered via `cap sync`).
- The config files (`GoogleService-Info.plist`, `google-services.json`) contain project identifiers, not secrets, but we will keep them out of public commits per your preference.

