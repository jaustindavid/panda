# panda — Working backlog

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

**Single source of truth** for everything deferred. The v1 build
sequence (M1–M5) is mirrored from PRD §10; the deferred chambers live in
Later. Dispatch handoffs feed this file; items move between horizons as
priorities shift.

Status: `[ ]` not started · `[~]` design captured · `[›]` in flight ·
`[x]` done. Sizes XS/S/M/L/XL per the kit BACKLOG-TEMPLATE scale.

---

## Next

**🎉 v1 core complete (M1–M5 + nav).** Post-core chambers — owner picks
the order.

- `[ ]` **Discovery map view** [S] — the deferred M2 fast-follow: list ⇄
  map toggle on the discovery home (PRD §7 F1, §9). Needs **Maps
  JavaScript API** enabled on `panda-bamboo-lane` + added to the Maps key
  restriction (owner console), and adds the dynamic-map billing SKU.
  Reuses the same fetched result set (no extra Nearby Search). Pairs with
  the "search this area" item. _Design: PRD §7 (F1), §9._
- `[ ]` **App icon — boba panda** [S] — replace the 🐼 emoji (AppShell
  header) and the placeholder SVG icons (`public/icon*.svg`, manifest,
  apple-touch) with the owner's artwork: a cartoon panda holding boba +
  eating fried chicken on a blue rounded square (supplied 2026-06-28).
  Generate the PNG set (192/512 + maskable safe-zone + apple-touch 180),
  wire into `vite.config.ts` manifest + `index.html`. ⚠️ Owner to add the
  source PNG to the repo (suggest `public/icon-source.png`) at dispatch
  time. Note: art is blue; decide whether to align `theme_color`.

---

## Soon

(v1 core all shipped — see Done. Post-core chambers are in Next / Later.)

---

## Later

Committed and speculative chambers, post-core. Move to Soon as triggers
fire.

- `[~]` **No-go list** [S] — circle-shared **per-place** block (one-tap
  "never show", the inverse of favoriting); hard-excludes from
  discovery + roulette. Per-place only; no brand/category rules. _Committed.
  Design: PRD §1.3, §3, §5 (NoGo), §6, §7 (F7)._
- `[~]` **Add restaurants by name (saved favorites)** [M] — owner FR
  2026-06-28. Search a place **by name** (Places **Text Search** — a new
  surface, same key/API) → one-tap "favorite" stores `{placeId, name,
  hours, snapshotAt}` in a circle-shared `SavedPlace` set → it joins
  discovery + roulette **regardless of proximity** (far favorites stay in
  the wheel). Symmetric twin of the no-go list; reverses the §1.2 "no
  favorites" non-goal (owner-confirmed). **Favorites store a re-polled Maps
  snapshot** — the accepted bounded ToS step-over (AGENTS.md guardrail +
  PRD §11.2 Q3c): renders with no per-load API call; re-poll live on a
  short interval (freshness + drift detection). Place ID is the identity
  anchor (content never follows a successor business). **Watch
  `GetPlaceRequest` consumption; reversible to ID-only if quota is ample**
  (§13.3). Pairs with **M5 roulette**. _Committed. Design: PRD §1.3, §5
  (SavedPlace), §6, §7 (F8), §11.2 Q3c._
- `[~]` **Travel time vs straight-line distance** [M] — reinterpret the
  when-chip as "leave in…"; `arrival(place) = now + buffer +
  travel(place)`. **Owner FR 2026-06-28 (lives near a river):**
  straight-line distance is *misleading* across barriers — 1.8 km
  crow-flies can be 20 min via a bridge — which **defeats** the lean
  distance÷speed estimate; real routing (Routes / Distance Matrix, extra
  SKU) is what delivers it. Split: (b1) just **show** "1.8 km · ~20 min"
  on cards (smaller, no go-able change); (b2) feed travel time into the
  per-place arrival calc. Mind the §8 quota (batch ≤20, cache per
  session). _Design: PRD §11.2 Q9._
- `[ ]` **Expand search / "search this area"** [M] — get beyond the
  nearest-20 single Nearby Search. The genre filter is client-side over
  that set, so a sparse genre shows only what was fetched, not "all pizza
  open nearby." User-triggered options (keep §8 quota-aware — a new billed
  call per explicit action, no auto-fanout): a "wider radius" control;
  Maps-style "search this area" on the panned map (pairs with the map
  fast-follow); genre-scoped re-search when a tapped genre is sparse.
  `searchNearby` (New) has no paging → bigger radius / recenter, or switch
  to Text Search. Owner FR 2026-06-28. _Design: PRD §11.2 Q10._
- `[ ]` **Visit/saved-place re-hydration pattern** [XS] — ToS-settled
  (§11.2 Q3): store **`placeId` only** for history/saved places; re-hydrate
  the display name via Place Details (`fields=id,displayName`) on render.
  No `{placeId,name}` durable snapshot. Bake this into M3/M4. _Supersedes
  the old "{placeId,name} snapshot" item._
- `[~]` **Aggressive restaurant-list caching — NOT VIABLE** [killed] —
  fact-finder (2026-06-28) confirmed Maps ToS §3.2.3 forbids caching
  content (hours/name/types). Monthly-poll-and-cache is out. The compliant
  remnant: store **Place IDs** for the circle's known set (skip repeat
  *searches*) + tight Place Details field masks — folded into the
  re-hydration item above. _Caching is not a cost lever; §8 quota
  discipline is. PRD §11.2 Q3._
- `[ ]` **Holiday-aware hours** [S] — prefer `currentOpeningHours`
  (special-days, ~7-day window) over `regularOpeningHours` in the go-able
  filter. _Deferred from M2 (PRD §11.2 Q2)._
- `[ ]` **Tighten unused Places method quotas** [XS] — cap/zero the
  per-day quotas panda never calls (`SearchTextRequest`,
  `GetPhotoMediaRequest`) once discovery is verified working. The Maps
  key is API- but **not** method-restricted, so this shrinks a
  leaked-key blast radius on the shared billing account.
  `SearchNearbyRequest` + `GetPlaceRequest` are already at 50/day.
  _From M1 §7.4; deferred 2026-06-28 — harden after it works._
- `[ ]` **JS bundle size / code-splitting** [XS] — the Firebase SDK pushes
  the bundle to ~207 kB gzip (over Vite's 500 kB raw warning). Lazy-load
  Firestore / split chunks for faster first paint on cellular (PRD §9).
  _From M1; revisit once M2 lands more code._
- `[ ]` **Live "here now" presence** [L] — broadcast presence to the
  circle (push, ephemerality, privacy controls). Big; only if asked for.
- `[ ]` **Invite-link onboarding** [M] — replace manual allowlist edits
  (PRD §11.2 Q4) with invite links.
- `[ ]` **Per-day / per-meal override granularity** [M] — only if usage
  shows day-varying kitchen gaps (PRD §11.2 Q7).
- `[ ]` **Speculative chambers** [M–XL] — custom tags, saved lists,
  multi-circle, brand/category-level blocking, per-place meal-duration
  (PRD §1.3, §11.2 Q8). File real versions when demand appears.

---

## Done

- `[x]` **M5 — Roulette** [S] — 2026-06-28, **owner-verified** (live spin
  confirmed on device). `/roulette` route (swipe-dismissable);
  🎲 Spin from discovery; plain uniform random over the **go-able** +
  genre-filtered set (excludes hours-unknown, PRD §7 F2); light spin
  animation (candidates via ref → no spurious re-spin on the 60s refresh);
  Let's-go / Respin / empty state. Provider exposes `shown`. **Completes the
  v1 core.** Detail: dispatch/M5-roulette-handoff.md.
- `[x]` **Back-nav fix (router)** [S] — 2026-06-28. Swipe/hardware back was
  exiting the PWA (local-state nav, no History integration). Adopted
  **react-router-dom** (owner-approved): routes / · /place/:placeId ·
  /visits; `DiscoveryProvider` holds geo + Nearby Search + circle data
  above the routes so back/forward never re-fetch (one search per session);
  deep links work (SPA rewrite + cold Place Details fetch). Verified via
  harness (back → list, no re-fetch). Commit cfe8c01.
- `[x]` **M4 — Here-now + visits + overrides** [M] — 2026-06-28,
  owner-verified. One-tap "I'm here" → Visit (byName denormalized);
  good-time-to-go override (presets → `closeBufferMin`) feeding the go-able
  filter via DiscoveryScreen's override map; recent-visits view with place
  names **re-hydrated** (owner ToS-clean choice §11.2 Q3a, deduped +
  session-cached); discovery annotations (note count + last visit, pure +
  tested); Eat ⇄ Visits nav. On the M1 visits/overrides rules (no rules
  change). 52 unit + 20 rules tests. Known follow-up: back-nav fix (in
  Next). Detail: dispatch/M4-visits-overrides-handoff.md; ARCHITECTURE §9.
- `[x]` **M3 — Place detail + notes** [M] — 2026-06-28, owner-verified.
  Tap a discovery result → detail (reuses fetched place, no extra Maps
  call) → shared, attributed notes (add / edit-own / delete-own) on the M1
  notes rules. One-shot reads, client-sorted (no index/listener);
  `authorName` denormalized for attribution (PRD §5); list ⇄ detail via
  local state (no router). 47 unit tests; UI verified via mock-geo harness
  (nav + notes chrome + graceful permission-denied) + owner live check.
  Detail: dispatch/M3-detail-notes-handoff.md; ARCHITECTURE §9.
- `[x]` **M2 — Discovery core + go-able** [L] — 2026-06-28, owner-verified
  on live data. Geolocation → one Nearby Search (Places API New,
  restaurants nearest-first, Enterprise hours field mask, no Atmosphere
  SKU) → the go-able filter (`src/lib/goable.ts`: place-local time,
  override > KITCHEN > posted, wrap-safe, clamp+flag; 20 unit tests) →
  ranked list (go-able + hours-unknown, nearest-first) with when-chips
  (client-side re-filter) + genre filter. 42 unit tests; live API contract
  validated; deployed. Map view deferred (now its own item). Decisions:
  list-first, restaurants-nearest, m=75/default+15. Rakes: react-hooks v7
  set-state-in-effect/purity (→ lazy init, async-only setState, derived
  loading, timer-based now); referrer-key is browser-only. Detail:
  dispatch/M2-discovery-handoff.md; ARCHITECTURE.md §5.
- `[x]` **M1 — Infrastructure** [ops] — 2026-06-28. GCP/Firebase project
  `panda-bamboo-lane` on the owner's personal (route7-shared) billing
  account; Google Auth (External/Testing) + **hardcoded-in-rules
  allowlist** (4 members; PRD §11.2 Q4 — no Membership collection);
  Firestore (`nam5`, deny baseline → rules deployed, mirrors PRD §6) with
  20 emulator rules tests; Hosting live at `panda-bamboo-lane.web.app`;
  Places API (New) key (referrer + API restricted) with
  `SearchNearbyRequest`/`GetPlaceRequest` capped at 50/day. Code companion
  (`281cef7`): firebase init, redirect auth gate, screens. **Headline
  rake:** the PWA service worker hijacked Firebase's `/__/auth/*` routes →
  sign-in hung on "Loading…" (no errors); fixed with
  `navigateFallbackDenylist` (`749bfa8`). End-to-end Google sign-in
  verified on the deployed PWA. Full record: dispatch/M1-infra.md +
  dispatch/M1-infra-handoff.md; ARCHITECTURE.md drafted.
- `[x]` **App scaffold** [M] — 2026-06-27. Vite 8 + React 19 + TS 6
  (strict, project refs) + Tailwind v4 (`@tailwindcss/vite`, no config
  file) + PWA (`vite-plugin-pwa`, autoUpdate, generated SW + manifest,
  SVG icons). Mobile-first `AppShell` (dark-first, safe-area) the
  discovery UI mounts into; placeholder home. ESLint v10 flat config
  (`no-explicit-any` = error); Vitest wired with a smoke test (go-able
  suite lands M2). Runs with no backend. All gates green; shell visually
  verified. Authored by the nautilus directly (no sub-agent). Decisions +
  rakes (notably the react-hooks v7 / ESLint 10 flat-config array bug) in
  dispatch/app-scaffold-handoff.md. _Owner reviews + commits._

---

## Maintenance

- Dispatch handoff lists "Items deferred" → append them here.
- A backlog item ships → move to Done with a short note.
- Owner feedback arrives → re-rank Next; promote from Soon / Later.
- Periodic Later cleanup; name a splitting plan for anything XL.
