# Xcode Signing – First-Time Setup (Step-by-Step)

This guide fixes the error: **"Signing for 'App' requires a development team."**

You need to tell Xcode which Apple account to use for signing. Follow these steps in order.

---

## Step 1: Add Your Apple ID to Xcode (If You Haven’t Yet)

1. Open **Xcode**.
2. In the top menu bar, click **Xcode** → **Settings…** (or press **⌘ ,**).
3. Click the **Accounts** tab.
4. Click the **+** button at the bottom left.
5. Choose **Apple ID** and click **Continue**.
6. Sign in with your Apple ID (email and password).
7. When you see your account in the list, you’re done. Close Settings.

---

## Step 2: Open the Project and Select the App Target

1. In Xcode, open the project: `ios/App/App.xcodeproj`.
2. In the **left sidebar** (Project Navigator), click the blue **App** icon at the very top.
3. In the main area, under **TARGETS**, click **App** (not the project name above it).

---

## Step 3: Open Signing & Capabilities

1. At the top of the main area, click the **Signing & Capabilities** tab.
2. You should see a section called **Signing**.

---

## Step 4: Choose Your Development Team

1. Check the box **Automatically manage signing**.
2. In the **Team** dropdown, choose your Apple ID or team.
   - If you see **"Add an Account…"**, go back to Step 1 and add your Apple ID first.
   - If you use a **free Apple ID**, you’ll see your name or email as the team.
   - If you have a **paid Apple Developer account**, you’ll see your team name.
3. Leave the other options as they are.

---

## Step 5: Build Again

1. In the top-left of Xcode, choose a **destination**:
   - **Simulator**: e.g. "iPhone 16" (no signing needed).
   - **Physical iPhone**: your connected device name.
2. Click the **Play** button (▶) or press **⌘ R**.

---

## If You Still See Errors

### "No accounts with App Store Connect access"

- You can still run on your own device with a **free Apple ID**.
- Make sure you completed Step 1 and selected your account in the Team dropdown.

### "Failed to register bundle identifier"

- The app ID may already be in use.
- Reply with the exact error message so we can fix it without guessing.

### "Untrusted Developer" on your iPhone

1. On your iPhone: **Settings** → **General** → **VPN & Device Management**.
2. Find your Apple ID under **Developer App**.
3. Tap it and tap **Trust**.

---

## Free vs Paid Apple Developer Account

| | Free Apple ID | Paid ($99/year) |
|---|---|---|
| Run on your own iPhone | ✅ Yes | ✅ Yes |
| TestFlight | ❌ No | ✅ Yes |
| App Store | ❌ No | ✅ Yes |
| Provisioning profile | 1 week, then renew | 1 year |

For local testing on your iPhone, a free Apple ID is enough.
