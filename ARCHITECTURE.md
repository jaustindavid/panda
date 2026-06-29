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
  self, delete: creator), `overrides` / `nogos` / `savedPlaces` (read/write:
  any member — collective). Everything else denied. One+ emulator test per
  row (26 tests).

## 5. Discovery & place data (M2 — landed)

The discovery flow (PRD §7 F1) is layered as pure logic + a thin UI:

- **`lib/places.ts`** — one **Nearby Search per screen-load**
  (`includedTypes:['restaurant']`, `rankPreference:DISTANCE`, ≤20,
  Enterprise hours field mask; **no rating** → not the Atmosphere SKU).
- **`lib/goable.ts`** — the pure go-able filter (PRD §3): `[arrival,
  finish]` within one open interval, place-local time, precedence
  override > KITCHEN > posted, wrap-safe, override clamp+flag. The
  most-tested code in the repo.
- **`lib/discovery.ts`** — `rankDiscovery`: exclude not-go-able, keep
  go-able + hours-unknown, sort go-able-first then nearest;
  `availableGenres` for the filter.
- **`lib/{distance,genre,time}.ts`** — pure helpers (haversine, Maps-type
  → label, chip clock).
- **UI** (`discovery/`, `hooks/useGeolocation.ts`) — when-chips
  (client-side re-filter), genre chips, list. "now" is timer-refreshed
  state and loading is derived — never `Date.now()` in render, never
  synchronous setState in an effect (react-hooks v7 strict rules).

Cost (PRD §8): chip re-filtering is **client-side** (no new billed call);
**never** fan out to per-place Place Details for the list; place content is
**not persisted** beyond the Place ID (Maps ToS — caching scope is PRD
§11.2 Q3, fact-finder pending). Hard ceiling: per-method daily quota cap
(`SearchNearbyRequest` + `GetPlaceRequest` at 50/day). The key is
referrer- and API-restricted (browser-origin only — not callable from Node).

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

- **Single environment — prod only** (deliberate). No dev/staging Firebase
  project or env tiers; `npm run deploy` goes straight to
  `panda-bamboo-lane`. Config is one gitignored `.env.local` (no
  `.env.development` / `.env.production` split). Local work uses
  `npm run dev` + the Firestore emulator.
- `npm run dev` · `npm run build` · `npm run preview`
- Gates: `npm run typecheck` · `npm run lint` · `npm run test:run` ·
  `npm run test:rules` (emulator) · `npx markdownlint-cli2 "**/*.md"`
- `npm run deploy` → build → `firebase deploy --only hosting,firestore:rules`.
  After redeploy, retest auth in incognito (stale SW masks changes).

## 9. What's not here yet

Landed: M1 (infra/auth), M2 (discovery + go-able, §5), M3 (place detail +
notes), **M4 (here-now visits + good-time-to-go override + discovery
annotations** — `src/lib/{visits,overrides,annotations}.ts`,
`src/place/{PlaceVisits,OverrideControl}.tsx`, `src/visits/VisitsScreen.tsx`;
on the M1 visits/overrides rules; override feeds `rankDiscovery`; visit
names re-hydrated via `getPlaceName`, deduped + session-cached).

**Navigation: react-router-dom** (routes `/` · `/place/:placeId` ·
`/visits`). `DiscoveryProvider` holds geo + the Nearby Search + circle data
**above** the routes, so list ⇄ detail ⇄ visits never re-fetch (one search
per app session — fixed the swipe/hardware-back-exits bug). Deep links work
(firebase.json SPA rewrite + a cold Place Details fetch when a detail opens
without discovery context).

**v1 core complete** — M1 (infra/auth) · M2 (discovery + go-able) · M3
(detail + notes) · M4 (here-now/visits/overrides) · M5 (roulette) + router
nav. **Post-core shipped:** app icon; **no-go** (`nogos`, excluded from
ranked) + **add-by-name favorites** (`savedPlaces`, snapshot merged into
the candidate set; Text Search on `/add`). Routes: `/` · `/place/:id` ·
`/add` · `/roulette` · `/visits`. **Discovery map view** — `DiscoveryMap`
(`@vis.gl/react-google-maps`): a List/Map toggle renders the same `shown`
set as markers (no extra Nearby Search), lazy-loaded on open; classic Marker
(AdvancedMarker + Map ID is a backlogged upgrade). **"Search this area"** —
the provider's search center is overridable (`searchOverride ?? GPS`); panning
the map >1km surfaces a button that re-runs Nearby Search around the new
center (one billed call per explicit tap, no auto-fanout — §8), the Nearby
effect keying on `searchCenter`. Distance still measured from the user's GPS.
**All v1 core + committed post-core chambers (favorites, no-go, icon, map,
search-this-area) are shipped.** Remaining is refinements/FRs in BACKLOG
(travel-time, expand-search residue, drift-detection, quota caps, bundle
size). This doc grows as they land.
