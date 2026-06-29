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

**🎉 v1 core (M1–M5 + nav) AND all committed post-core chambers shipped**
(map view · "search this area" · favorites · no-go · icon). What remains is
refinements + FRs in Later — owner picks if/when. Nothing in flight.

---

## Soon

(v1 core all shipped — see Done. Post-core chambers are in Next / Later.)

---

## Later

Committed and speculative chambers, post-core. Move to Soon as triggers
fire.

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
- `[~]` **Expand search / "search this area"** — core **shipped**
  2026-06-29 (commit on `main`): pan the map → a "🔍 Search this area"
  button (appears once panned >1km from the current results center) re-runs
  Nearby Search around the new center. One new billed call per explicit tap,
  no auto-fanout (§8); distance still measured from the user's GPS, "You"
  marker stays put. _Optional residue (owner picks if wanted): a "wider
  radius" control; genre-scoped re-search when a tapped genre is sparse (the
  client-side genre filter still only sees the fetched set). `searchNearby`
  (New) has no paging → bigger radius / recenter, or switch to Text Search._
  Owner FR 2026-06-28. _Design: PRD §11.2 Q10._
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
- `[ ]` **Tighten Places method quotas** [XS] — **`SearchTextRequest` is
  now USED** (add-by-name favorites) and sits at the default high quota →
  give it a ~50/day cap too (do **not** zero it). `GetPhotoMediaRequest`
  is still unused → cap/zero. The key is API- but **not** method-
  restricted, so this shrinks a leaked-key blast radius.
  `SearchNearbyRequest` + `GetPlaceRequest` already at 50/day. _Owner
  console; from M1 §7.4._
- `[ ]` **Map: AdvancedMarker + Map ID** [XS] — the map uses the classic
  `google.maps.Marker` (no Map ID needed, but logs a deprecation warning).
  Upgrade to `AdvancedMarker` once a vector **Map ID** is created in the
  console — removes the warning and allows custom/branded pins (e.g. ★ for
  favorites). Owner console step + small code swap. _From map view,
  2026-06-29._
- `[ ]` **Favorites snapshot refresh / drift-detection** [S] — favorites
  store the hours snapshot from save-time; if a place changes hours it goes
  stale until re-saved. Re-poll a favorite live on a short interval (or on
  open) to refresh the snapshot, and flag "this place may have changed" when
  the live name ≠ snapshot name. The posture is already written (§11.2 Q3c);
  just not built. _From the favorites chamber, 2026-06-29._
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

- `[x]` **A11y: single `<h1>` per route + brand → home link** [XS] —
  2026-06-29. The persistent header brand (icon + "panda") was an `<h1>`, so
  detail/add screens (which add their own `<h1>`) had two. Brand is now a
  **home `<Link>`** (banner nav, not a heading — tapping the icon/wordmark
  returns to `/`); each route owns exactly one `<h1>` (detail = place name,
  add = "Add a favorite", home/visits/roulette got sr-only titles). Preserves
  detail's `h1 → h2` section nesting. _From the a11y nit, owner FR._
- `[x]` **Visit/saved-place re-hydration pattern** [XS] — 2026-06-29
  (resolved, shipped earlier). Visits store **`placeId` only** and re-hydrate
  names via Place Details (`fields=id,displayName`, session-cached) — landed
  in M4 (`getPlaceName`, `VisitsScreen`). Saved places (favorites)
  deliberately use the approved name/hours **snapshot** instead (§11.2 Q3c,
  the one bounded ToS step-over), not re-hydration. Either way no outstanding
  work. _ToS §11.2 Q3._
- `[x]` **"Search this area" on the map** [S] — 2026-06-29. Pan the map →
  a "🔍 Search this area" button (shows once panned >1km from the current
  results center) re-runs Nearby Search around the new center: one new
  billed call per explicit tap, no auto-fanout (§8). Search center is now
  overridable in `DiscoveryProvider` (`searchOverride ?? GPS`); the Nearby
  effect re-fires on change. Distance still measured from the user's GPS;
  "You" marker fixed. Map render verified (no regression); pan-and-search
  gesture owner-verified on-device (synthetic drags don't fire Google's
  gesture handler). _Remaining residue (wider-radius / genre-scoped
  re-search) parked in Later. PRD §11.2 Q10._
- `[x]` **Discovery map view** [S] — 2026-06-29 (commit prior to this).
  List ⇄ Map toggle on discovery via `@vis.gl/react-google-maps` (owner-
  approved dep); dark map, a marker per `shown` place + "You", tap a pin →
  detail; reuses the fetched results (no extra Nearby Search); lazy-loads
  the Maps JS API on open. Classic Marker (Map-ID-free; AdvancedMarker
  upgrade backlogged). Plus: ★ Favorites filter + add-by-name polish
  (strict restaurant filter, addresses, clickable results) shipped same day.
  Verified live (map loads dark/centered, markers render). _Owner enabled
  Maps JS API + key restriction._
- `[x]` **No-go list + add-by-name favorites** [S+M] — 2026-06-29 (commit
  78767f8; shipped, owner live-check pending). Symmetric circle-shared
  per-place flags built together: `nogos` (hard-exclude from discovery +
  roulette) and `savedPlaces` (favorites — name/hours snapshot per §11.2
  Q3c, merged into the candidate set so far favorites still appear,
  go-able-tested; ★ on cards; add-by-name via Text Search on `/add`).
  Save/Never-show toggles on the detail. Rules + 6 emulator tests (26
  total). Verified: rules + live add-by-name. Reverses the §1.2 "no
  favorites" non-goal. Detail: dispatch/nogo-favorites-handoff.md. _NB:
  Text Search now used → cap SearchTextRequest (above)._
- `[x]` **App icon — boba panda** [S] — 2026-06-29 (commit bc291f5).
  Owner's art (`assets/icon-source.png`, 2048²) → PWA icon set via
  sips/ImageMagick (no dep): icon-192/512, icon-maskable (512, white
  corners flood-filled to bg blue for clean masks), apple-touch (180),
  favicon-48. Wired into manifest + index.html; header emoji → icon;
  placeholder SVGs retired. theme_color kept dark slate. Live (icons 200).
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
