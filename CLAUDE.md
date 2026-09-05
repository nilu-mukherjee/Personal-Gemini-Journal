# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js, localhost:3000)
npm run build         # Production build
npm run start         # Serve production build
npm run lint           # ESLint (flat config in eslint.config.mjs)
npm run test:security  # Run scripts/security-check.js — required before push (see below)
npm run test            # Run the Vitest suite once (lib/firestore-utils.test.ts, app/api/gemini/reflect/route.test.ts)
npm run test:watch      # Run Vitest in watch mode
npm run clean          # next clean
```

Unit tests use Vitest (`vitest.config.mts`, Node environment). `test:security` is a separate static-analysis compliance script, not the test runner — both gate the pipeline (see below). Package manager is Bun (`bun.lock` present) but scripts are run via `npm run …`.

## Security gate (blocks commits and pushes)

`npm run prepare` (runs automatically on `npm install`) points git at `.githooks/` (`core.hooksPath`). Both `pre-commit` and `pre-push` run `scripts/security-check.js`, which fails (exit 1) the commit/push if any of these hold:

1. `.gitignore` doesn't ignore `gcp-key.json` and `.env*`.
2. Any tracked file contains a private key, a service-account JSON blob, or the string `NEXT_PUBLIC_GEMINI_API_KEY` (client-side exposure of the Gemini key is forbidden — it must stay server-only).
3. `firestore.rules` doesn't enforce `request.auth != null && request.auth.uid == userId` (or contains `allow ... if true`).
4. Any of `components/{ReflectionWorkspace,AuthView,Navbar,HistorySidebar}.tsx` imports `@google/genai`/`GoogleGenAI` directly — all Gemini calls must go through the `/api/gemini/reflect` backend route.

When adding a new client component that might call Gemini, or a new env var, check this script — it will reject changes that violate these invariants. CI (`.github/workflows/deploy.yml`) runs this same script as a gating job before every Cloud Run deploy.

## Architecture

Next.js 15 App Router (`app/`), React 19, single-page app behind Firebase Auth. No dedicated backend — Firestore is the only persistence layer, accessed directly from the client SDK.

**Auth & data flow** (`app/page.tsx` is the composition root):
- `lib/firebase.ts` initializes the Firebase app from `firebase-applet-config.json` (checked into the repo — non-secret client config), overridable via `NEXT_PUBLIC_FIREBASE_*` env vars. Exports `auth`, `db`, `loginWithGoogle`, `loginAsGuestDemo` (anonymous sign-in demo mode), `logout`.
- `lib/firestore-utils.ts` is the sole Firestore access layer. All reads/writes go through `getUserInteractionsRef`, `subscribeUserInteractions` (realtime `onSnapshot`), `persistInteraction`, `removeInteraction` — all scoped under `/users/{userId}/interactions/{interactionId}`. `cleanPayload` strips `undefined` before every write since the Firestore SDK rejects it.
- `firestore.rules` enforces owner-only access server-side (`request.auth.uid == userId`) — this is the actual security boundary, not just app-layer discipline.

**Gemini integration** is isolated to one server route, `app/api/gemini/reflect/route.ts`:
- Reads `GEMINI_API_KEY` from env (never exposed to the client — see security gate above).
- `MODEL_FALLBACK_LADDER` tries `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash` in order on recoverable errors (404/429/500/503, quota/overload/unavailable strings).
- Three `mode`s (`reflection` | `summary` | `brainstorm`) select a different `taskGuidance` system-instruction fragment.
- User input is wrapped in `<user_journal_content>` tags with an explicit system-prompt instruction not to treat that content as commands — this is the app's indirect-prompt-injection defense; preserve this pattern if you touch the route.
- The client (`components/ReflectionWorkspace.tsx`) is the only caller — it posts `{ prompt, history, mode, title }`, then persists the resulting turn pair to Firestore via `persistInteraction` only after a successful response.

**Component structure**: `app/page.tsx` owns `user`/`interactions`/`activeInteraction` state and wires four presentational-ish components — `Navbar`, `HistorySidebar` (list/search/delete past entries), `ReflectionWorkspace` (composer + message stream + mode switcher, ~500 lines, the core interaction surface), `AuthView` (signed-out landing). There is no global state library; state flows down as props and up via callbacks (`onUpdateInteraction`, etc.).

**Deployment**: containerized (multi-stage `Dockerfile`, Next `output: 'standalone'`) to Google Cloud Run. `.github/workflows/deploy.yml` is the active CI/CD path (security-tests job gates build-and-deploy); `cloudbuild.yaml` is an equivalent Cloud Build definition for direct `gcloud builds submit` use. Both target project `fixmycity-506122`, region `asia-southeast1`, service `gemini-journal`, and inject `GEMINI_API_KEY` from Secret Manager via `--set-secrets`. See `README.md` for the full manual setup sequence (enabling GCP services, creating the secret, deploying Firestore rules, applying the `dev-tutorial=cloud-run-ai-challenge` label).

## Conventions to preserve

- Never call `GoogleGenAI`/`@google/genai` from a client component — route everything through `app/api/gemini/reflect`.
- Never introduce `NEXT_PUBLIC_GEMINI_API_KEY` or otherwise ship the Gemini key to the browser.
- Any change to `firestore.rules` must keep the `request.auth.uid == userId` ownership check.
- `firebase-applet-config.json` holds public Firebase client config (API key here is a public web API key, restricted by Firebase's own rules) — it's intentionally committed; don't confuse it with `GEMINI_API_KEY` or GCP service-account credentials, which must never be committed.
