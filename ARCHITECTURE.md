# panda — Architecture

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

How panda is built. Expands PRD §4 with what actually landed in M1.
Drafted 2026-06-28 after M1 (infrastructure) shipped; grows per milestone.
For *what* to build see [PRD.md](PRD.md); for guardrails see
[AGENTS.md](AGENTS.md).

---

## 1. Shape

A static, installable **PWA** — a React SPA that talks **directly** to
Firebase (Auth + Firestore) and, from M2, to Google Maps Platform from the
client. **No server, no Cloud Functions, no SSR** (AGENTS.md). All access
control lives in Firestore security rules; everything not enforceable there
is out of scope for v1.

```text
 ┌────────────────────────── browser (PWA) ──────────────────────────┐
 │  React SPA (Vite build)         service worker (Workbox precache)  │
 │     │                                                              │
 │     ├── Firebase Auth (Google sign-in, redirect)                  │
 │     ├── Firestore  ←── security rules (allowlist + per-entity) ──┐ │
 │     └── Places API (New)  [M2+, client-side, quota-capped]      │ │
 └────────────────────────────────────────────────────────────────┼─┘
                                                                    │
                          Firebase Hosting (panda-bamboo-lane.web.app)
```

## 2. Stack

- **Client:** React 19 + Vite + TypeScript (strict) + Tailwind v4.
- **PWA:** `vite-plugin-pwa` (Workbox `generateSW`, `autoUpdate`).
- **Auth:** Firebase Auth, Google provider, redirect flow.
- **Data:** Firestore (direct client SDK, one-shot reads — no
  `onSnapshot`).
- **Places:** Google Maps Platform **Places API (New) v1**, client-side
  (M2+).
- **Hosting/deploy:** Firebase Hosting; `npm run deploy`.
- **State:** React Context + local state only (no Redux/Zustand).
- **Tests:** Vitest (unit) + `@firebase/rules-unit-testing` (emulator).

## 3. Code structure

```text
src/
  main.tsx              React root
  App.tsx               AuthProvider → AppShell → Gate (auth routing)
  index.css             Tailwind import + dark-first / safe-area base
  components/
    AppShell.tsx        mobile-first chrome every flow mounts into
  auth/
    auth-context.ts     AuthContext + useAuth (split for Fast Refresh)
    AuthProvider.tsx    auth state, sign-in/out, redirect handling
    SignInScreen.tsx    signed-out
    NotAllowedScreen.tsx signed-in but not allowlisted
  lib/
    firebase.ts         app/auth/db singletons + Google provider
    allowlist.ts        client mirror of the rules allowlist
tests/
  firestore-rules.test.ts   emulator rules tests (run via npm run test:rules)
firestore.rules         security rules (1:1 with PRD §6)
firebase.json / .firebaserc   hosting + firestore + emulator config
```

## 4. Auth & access control

- **Sign-in:** Google via `signInWithRedirect`. `authDomain` is the
  **hosting** domain (`panda-bamboo-lane.web.app`), not `.firebaseapp.com`
  — the default breaks on Chrome storage partitioning.
- **Allowlist (v1):** the circle's emails are **hardcoded** in two places
  that must stay in sync — `firestore.rules` `isMember()` (the real
  enforcement; also requires `email_verified`) and `src/lib/allowlist.ts`
  (drives the "not on the list" UI). No Firestore Membership collection
  (PRD §11.2 Q4). Adding a member = edit both + `npm run deploy`.
- **Gate:** `App` routes loading → sign-in → not-allowed → app.
- **Rules** mirror the PRD §6 table 1:1. Collections: `users` (write:
  self), `notes` (create: self, edit/delete: author), `visits` (create:
  self, delete: creator), `overrides` (read/write: any member). Everything
  else denied (NoGo is a later chamber). One+ emulator test per row.

## 5. Place data & cost (M2+)

- One **Nearby Search per screen-load** (`maxResultCount: 20`, hours in
  the field mask); **never** fan out to per-place Place Details for the
  list. Chip re-filtering is **client-side** (no new billed call).
- Place content is **not persisted** beyond the Place ID (Maps ToS); the
  circle's own data (notes/visits/overrides) keys on Place ID.
- Hard ceiling: per-method **daily quota cap** (`SearchNearbyRequest` +
  `GetPlaceRequest` at 50/day) — calls 429 at the cap, not billed.
- Key is HTTP-referrer + API restricted; lives in gitignored `.env.local`.

## 6. PWA & offline

- Workbox precaches the app shell + assets; `autoUpdate` with
  `skipWaiting`/`clientsClaim`.
- **`navigateFallbackDenylist: [/^\/__\//]`** — the SPA navigation
  fallback must NOT serve `index.html` for Firebase's `/__/auth/*` routes,
  or sign-in hangs (M1 rake; see M1-infra.md §6).
- Offline data scope (cached notes/visits vs shell-only) is an open
  question (PRD §11.2 Q6).

## 7. Config & secrets

- `VITE_FIREBASE_*` + `VITE_GOOGLE_MAPS_API_KEY` in gitignored
  `.env.local` (template: `.env.example`); captured values in gitignored
  `dispatch/M1-g-outputs.md`. `measurementId` deliberately omitted (no
  analytics, PRD §1.4).

## 8. Build, test, deploy

- `npm run dev` · `npm run build` · `npm run preview`
- Gates: `npm run typecheck` · `npm run lint` · `npm run test:run` ·
  `npm run test:rules` (emulator) · `npx markdownlint-cli2 "**/*.md"`
- `npm run deploy` → build → `firebase deploy --only hosting,firestore:rules`.
  After redeploy, retest auth in incognito (stale SW masks changes).

## 9. What's not here yet

Discovery + the go-able filter (M2), place detail + notes (M3), here-now +
visits + overrides (M4), roulette (M5). This doc grows as they land.
