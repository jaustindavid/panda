# panda — M1: infrastructure handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Handoff for the M1 infrastructure dispatch (`dispatch/M1-infra.md`).
**Status: COMPLETE 2026-06-28.** Allowlisted Google sign-in works on the
deployed URL; a probe read/write succeeds under rules (20 emulator tests).

---

## What shipped

**Cloud (owner, console):**

- GCP project **`panda-bamboo-lane`** (display name "Panda"), no
  auto-suffix; on the owner's **personal Cloud Billing account** (the
  account route7 uses — "shared" per PRD §8), Blaze plan.
- Firebase: Auth (Google, External/Testing), Firestore (production,
  `nam5`, deny-all baseline → real rules deployed), Hosting live at
  `panda-bamboo-lane.web.app`.
- Maps: **Places API (New)** enabled; browser key referrer- + API-
  restricted; **`SearchNearbyRequest` + `GetPlaceRequest` capped at
  50/day**; account-wide $5 budget covers the project.
- Captured config in gitignored `dispatch/M1-g-outputs.md`.

**Code (nautilus, commits `281cef7` / `860af30` / `749bfa8`):**

- `src/lib/firebase.ts` — init from `VITE_FIREBASE_*`; `measurementId`
  omitted; Google provider `prompt: 'select_account'`.
- Auth gate — `AuthProvider` + `auth-context.ts` (split for Fast
  Refresh), **redirect** sign-in, surfaced `getRedirectResult` errors,
  loading / sign-in / not-on-the-list screens.
- **Hardcoded allowlist** (PRD §11.2 Q4): 4 emails in **both**
  `src/lib/allowlist.ts` and `firestore.rules` `isMember()` — keep in
  sync; `isMember()` also requires `email_verified`.
- `firestore.rules` — maps 1:1 to PRD §6 (`users`, `notes`, `visits`,
  `overrides`, deny baseline; NoGo deferred) + **20 emulator rules
  tests**, one+ per access row (`npm run test:rules`).
- Deploy wiring — `.firebaserc`, `firebase.json` (hosting SPA rewrite +
  firestore + emulator), `.env.example`, `npm run deploy`.

---

## Deviations from the brief (UI/behavior drift since flog's runbook)

- **OAuth consent flow reshuffled** — the Get-started wizard now collects
  only user type + support email; publishing status (`Testing`) and logo
  live under the **Branding** sub-screen and are already the correct
  defaults (verify, don't set).
- **Firestore create wizard order** — asks **location before** mode
  (was create → mode → location).
- **Places quotas are per-method** — no single "Requests per day"; cap
  `SearchNearbyRequest` (the core call) + `GetPlaceRequest`.
- **Firebase forces Blaze** — with billing linked first, the Add-Firebase
  flow offers only Pay-as-you-go (no Spark choice). Expected (Δ1).
- **Allowlist design changed** — owner chose **hardcoded-in-rules** over
  a Firestore Membership collection (PRD §5/§6/§11.2 Q4 updated).
- **Budget** — satisfied by an existing account-wide $5 budget; no
  separate project budget created.

## Rakes hit (folded into M1-infra.md §6)

- **GCP project-count ceiling** (~5 default) — needed a quota-increase
  request **and** deleting a defunct project; since raised to 15.
- **PWA service worker hijacks `/__/auth/*`** — the headline rake. The
  Workbox SPA navigation fallback served `index.html` for Firebase's auth
  handler/iframe → sign-in hung on "Loading…" with **no errors (all
  200s)**. Fix: `workbox.navigateFallbackDenylist: [/^\/__\//]`
  (`749bfa8`). Diagnosed from the Network tab. **Any PWA + Firebase Auth
  on one domain hits this.**
- **Stale service worker masks fixes** — retest in incognito / unregister
  the SW after redeploy.
- Inherited-and-honored: manual Project-ID edit, three authorized-domains
  lists, `/__/auth/handler` suffix, `authDomain` = `.web.app`,
  `prompt: 'select_account'`, don't swallow `getRedirectResult`.

## Items deferred (→ BACKLOG)

- **Tighten unused Places method quotas** [XS] — cap/zero
  `SearchTextRequest` / `GetPhotoMediaRequest` now that it works (key is
  API- but not method-restricted).
- **JS bundle size** [XS] — Firebase SDK pushes the bundle to ~207 kB
  gzip (over Vite's 500 kB raw warning); revisit code-splitting for
  first-paint-on-cellular (PRD §9) once M2 lands more code.
- `{placeId, name}` history-snapshot ToS question (PRD §11.2 Q3) — before
  M3/M4.

## Verification (M1 done-when, all met)

- Project on the shared billing account; Places API enabled; key
  restricted; daily quota cap set; budget alert covers it.
- Auth: Google enabled; three domain lists populated; redirect URIs carry
  `/__/auth/handler`; `authDomain` = `.web.app`.
- Firestore: production, deny-all baseline, `nam5`; real rules deployed +
  20 emulator tests green.
- Hosting `panda-bamboo-lane.web.app` serves the shell (200).
- **End-to-end: allowlisted Google sign-in lands on the home screen.** ✅

---

## Notes for the next milestone (M2)

- Firestore collections are fixed: `users`, `notes` (`authorUid`),
  `visits` (`byUid`), `overrides` (doc id = `placeId`). M2+ code must
  match these and the rules.
- Adding a circle member = edit **both** `src/lib/allowlist.ts` and
  `firestore.rules` `isMember()`, then `npm run deploy`.
- `ARCHITECTURE.md` drafted from what landed (this milestone).
