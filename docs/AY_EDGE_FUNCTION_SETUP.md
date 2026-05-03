# AY chatbot — Supabase Edge Function (manual steps)

The app calls **`POST /functions/v1/ay-chat`** with your signed-in Supabase JWT. The **Gemini / OpenAI / Perplexity** API key lives **only** in Supabase secrets (never in the app bundle).

## Pick a backend (one key is enough)

The Edge Function chooses the provider in this order:

1. **`AY_AI_PROVIDER`** if set to `gemini`, `openai`, or `perplexity`
2. Otherwise it picks the **first secret it finds**: **`GEMINI_API_KEY`** → **`OPENAI_API_KEY`** → **`PERPLEXITY_API_KEY`**

So for **Gemini only**, set `GEMINI_API_KEY` and deploy (no Perplexity key needed).

If you have **more than one** key stored in Supabase, the auto-pick order prefers **Gemini**, then **OpenAI**, then **Perplexity**. To force one backend, set **`AY_AI_PROVIDER`** to `gemini`, `openai`, or `perplexity`.

Optional model overrides (Supabase secrets):

| Secret | Purpose |
|--------|---------|
| `GEMINI_MODEL` | Default `gemini-2.5-flash` (function auto-fallback tries `gemini-1.5-flash` if a model is unavailable) |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `PERPLEXITY_MODEL` | Default `sonar` |

## What you need in `.env.local` (frontend only)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No AI provider keys in `.env.local`.
 
---

## Baby steps (pause after each checkpoint)

### 1) Install Supabase CLI (one time on your Mac)

Homebrew: `brew install supabase/tap/supabase`. Then:

```bash
supabase --version
```

**Checkpoint:** You see a version number.

### 2) Log in to Supabase CLI

```bash
supabase login
```

**Checkpoint:** Browser opens and the CLI finishes without error.

### 3) Link this folder to your project

From the project root (`navafit-stopwatch`):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is **Project Settings → General → Reference ID** in the Supabase dashboard (looks like `abcdefghijklmnopqrst` — **not** the project name).

**Checkpoint:** Command finishes without error.

### 4) Set secrets (never paste keys into chat or commit them)

**Gemini (Google AI Studio key):**

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-key-here
```

Optional explicit provider (if you also have other keys saved):

```bash
supabase secrets set AY_AI_PROVIDER=gemini
```

**OpenAI:**

```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase secrets set AY_AI_PROVIDER=openai
```

**Perplexity (legacy):**

```bash
supabase secrets set PERPLEXITY_API_KEY=pplx-your-key-here
supabase secrets set AY_AI_PROVIDER=perplexity
```

**Checkpoint:** Each `secrets set` succeeds.

### 5) Deploy the function

```bash
supabase functions deploy ay-chat
```

The repo sets `verify_jwt = true` for `ay-chat` so only signed-in users can call it.

**Checkpoint:** Deploy prints success.

### 6) Test a tiny message

1. Run `npm run dev`, sign in.
2. Open the **AY** tab, type `Hello`, send.
3. If it fails, open **Network** → request to `ay-chat` → note status (401 = auth; 502 = upstream AI error text in response body).

**Checkpoint:** You get an assistant reply.

### 7) Sync Capacitor after web works

```bash
npm run cap:sync
```

Rebuild in Xcode for device/simulator.

---

## Terminal tips (what went wrong in your log)

- **`failed to scan line: expected newline`** — often caused by **pasting multiple lines or markdown** into the shell as one “command”. Run **one** command per line: first `supabase login`, wait until it finishes, then `supabase link --project-ref ...`.
- **`Invalid project ref`** — use the **Reference ID** from the dashboard, not the project display name.
- **`supabase init` says config exists** — this repo already has `supabase/config.toml`. You do **not** need `supabase init` unless you intend to overwrite it.

---

## Never do this

- Do not put `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY` in `VITE_*` variables (they ship in the app bundle).
- Do not commit `.env.local` or secrets to git.
