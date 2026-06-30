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

Owner-directed queue (owner sets order). The 2026-06-29 order — holiday hours
→ search radius + genre-scope — is **fully shipped** (both in Done). Queue
clear; nothing in flight. Owner picks the next item from Later.

---

## Later

Committed and speculative chambers, post-core. Move to Soon as triggers
fire.

- `[ ]` **"Meal at <future time>" — pick an arrival clock time** [M] — owner
  FR 2026-06-29. Concept: it's 5pm, *where could we go at 7:30?* Today the
  "when" control is **relative** (Now / +15 / +30 / +60, i.e. "leave in N");
  add an **absolute target arrival time** ("dinner at 7:30"). **Cheap —
  client-side re-eval over the already-fetched set, NO new Maps call** (like
  the chip re-filter; drive times are traffic-unaware so they don't change with
  the target). The go-able core already takes any offset (`evaluateGoable` =
  `nowMs` plus offset, full day/week wrap), so it's a UI + semantics job, not a
  core change. **Semantics (decided in discussion):** "dinner at 7:30" = *be
  seated at 7:30* → go-able ⇔ open across `[target, target+75min meal]`; the
  target is hours out, so **drive time stops gating** (everything within the
  100 km cap is reachable by then) and becomes informational ("≈20 min, leave
  by ~7:10"). Impl: in target mode pass `offset = target − now` and **do not
  add drive** to arrival (drive only gates the imminent chips). **Optional
  unification (follow-on, not v1):** treat all when-controls as "arrive by"
  with `arrival = later of {target, now+drive}` — one model for imminent and
  planned, but it reinterprets today's chips from "leave in" to "arrive by"
  (needs owner nod). **UI:** a "Later…" affordance beside the chips → clock
  picker or evening presets (6/7/8/9 PM); label → "Arriving around 7:30"; a
  today-vs-tomorrow rule for times already past. _PRD §3 / §7 F1 (when-chips);
  relates to travel-time §11.2 Q9._
- `[ ]` **"Search this area" exempt from the distance cap** [S] — owner FR
  2026-06-29. The 100 km cap (§7 F1) is measured from the user's **GPS**, so
  panning "search this area" >100 km away returns empty — the explicitly
  searched far hits get dropped. They should NOT be capped. **Not a one-liner:**
  the travel-time gate (§11.2 Q9) is ALSO GPS-relative (`arrival = now + chip +
  drive-from-GPS`), so a far hit is excluded as not-go-able even once it's
  exempt from the distance cap. Real fix = **area-relative evaluation when
  `searchOverride` is set**: measure distance AND travel from the **search
  center**, not GPS ("show what's open in this area" / browse-mode), while the
  GPS-relative cap + travel still apply to the default search and to favorites.
  _From the distance-cap ship, §7 F1._
- `[~]` **Aggressive restaurant-list caching — NOT VIABLE** [killed] —
  fact-finder (2026-06-28) confirmed Maps ToS §3.2.3 forbids caching
  content (hours/name/types). Monthly-poll-and-cache is out. The compliant
  remnant: store **Place IDs** for the circle's known set (skip repeat
  *searches*) + tight Place Details field masks — folded into the
  re-hydration item above. _Caching is not a cost lever; §8 quota
  discipline is. PRD §11.2 Q3._
- `[ ]` **Tighten API daily quotas (Places + Routes)** [XS] — **Routes API
  `ComputeRouteMatrix`** is now USED (travel time, enabled 2026-06-29) at the
  default high quota → give it a daily cap (mirror Places). **`SearchTextRequest`**
  is also USED (add-by-name + genre-scope) and sits at the default → cap it
  ~50/day too (do **not** zero it). `GetPhotoMediaRequest` is still unused →
  cap/zero. The key is API- but **not** method-restricted, so caps shrink a
  leaked-key blast radius. `SearchNearbyRequest` + `GetPlaceRequest` already at
  50/day; $5 budget alert is the backstop. _Owner console; from M1 §7.4._
- `[ ]` **Map: AdvancedMarker + Map ID** [XS] — the map uses the classic
  `google.maps.Marker` (no Map ID needed, but logs a deprecation warning).
  Upgrade to `AdvancedMarker` once a vector **Map ID** is created in the
  console — removes the warning and allows custom/branded pins (★ for
  favorites, 🚫 for the blocked-places map below). Owner console step + small
  code swap. _From map view, 2026-06-29._
- `[ ]` **Audit / manage the no-go list — blocked-places map** [M] — owner FR
  2026-06-29. **Trigger: only if blocked places actually pile up** — owner
  isn't sure it's a real problem yet. **Problem:** the no-go list is **not
  auditable in-app** — `nogos` is only read as a Set of IDs to filter
  discovery, blocked places are excluded from discovery + roulette (so you
  can't browse to them), and no screen lists them. Only recovery today =
  remember the name → "Add by name" search → tap → detail → un-block
  (add-by-name doesn't filter nogos, and results link to `/place/:id`). Raw
  who/when is in the Firestore console, but as **place IDs, not names**.
  **Proposed: a blocked-places MAP** (owner's call — scales better than a list
  for many): reuse the `@vis.gl` map from discovery, with a marker per blocked
  place (and a "You" marker), tap a marker → its detail → un-block; reached via
  a discreet **"🚫 Blocked (N)"** entry (top nav is full). **Key design call —
  coordinates:** blocks store **ID only** (no location), so either **(a) store
  lat/lng at block time** (recommended — lat/lng caching is ToS-allowed, map
  renders from stored data = **zero per-place calls, scales free**; change
  `addNoGo(place)` to snapshot `location` + `loadNoGos()` to return it; legacy
  ID-only blocks re-hydrate once) or **(b) re-hydrate every blocked place on
  map-open** (ToS-purest but **N billed Place Details per open** — bad at the
  expected scale). **Markers:** literal 🚫-emoji pins need AdvancedMarker + a
  Map ID (item above) — classic red/distinct markers until then. _Fallback if
  the map is overkill: a simple Visits-style list screen (names re-hydrated).
  Diagnosed 2026-06-29; PRD §7 F7._
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

- `[x]` **Favorite / no-go mutual exclusion** [XS] — 2026-06-29 (owner FR —
  "can someone accidentally/prankily mark a favorite as do-not-go?"). The two
  toggles were independent, so a place could be **both** ★ and 🚫 at once, with
  no-go silently winning (filtered out of discovery + roulette) — and any
  member could block another's favorite. Now `addFavorite` / `addNoGo` each
  **atomically clear the other** (write batch: set one, delete the other), so a
  place is always-include XOR always-exclude, never both. Cross-member delete
  is permitted by design (collective lists) — locked in with +2 emulator tests
  (33 total). Reversible as before. _PRD §7 F7._
- `[x]` **Eatery type coverage — beyond `restaurant`** [S] — 2026-06-29 (owner
  FR; Ruby's Bagels didn't show). Discovery searched `includedTypes:
  ['restaurant']`, missing food places Google doesn't tag `restaurant` (bagel
  shops, coffee shops, bakeries). Now a shared `EATERY_TYPES = ['restaurant',
  'cafe', 'bakery']` (PRD §11.2 Q11, guiding-examples reference) drives both
  the Nearby `includedTypes` and the Text Search path (add-by-name +
  genre-scope), the latter via a **client-side filter** (its `includedType` is
  singular) — which also replaced the old strict restaurant-only filter,
  fixing the "non-restaurant leak" more robustly. Verified live: Kudu/café/
  pâtisserie enter discovery; "Ruby's" addable by name (6 hits, was 0); hotels
  excluded. Living set — extend on a missed should-be-hit. _PRD §11.2 Q11._
- `[x]` **Distance cap on discovery (100 km)** [XS] — 2026-06-29 (owner FR;
  surfaced by the "wife in SLC" favorites question). `rankDiscovery` drops any
  candidate whose straight-line distance from the user's GPS exceeds
  `MAX_DISTANCE_M` (100 km), however go-able — cleanly caps far-flung favorites
  (home favorites while travelling) instead of relying on the messier
  travel-gate. The travel effect also skips capped places so no Route Matrix
  element is spent on them. 2 unit tests (66 total). _Measured from GPS, so a
  "search this area" pan >100 km away also returns empty — consistent with the
  bound. PRD §7 F1._
- `[x]` **Feedback capture** [S] — 2026-06-29 (owner FR). A "Feedback" nav
  link → `/feedback` route: one text box, author **auto-stamped** from sign-in
  (owner chose auto over a typed username; "Posting as {name}"), Send →
  `feedback` collection `{authorUid, authorName, text, createdAt}`. Rules:
  member read (circle-wide, owner's choice) + create-self, **immutable** (no
  update/delete); +5 emulator tests (31 total). Reviewed later via the
  Firestore console — no in-app review screen in v1 (trivial follow-up).
  Mirrors the notes pattern. `src/lib/feedback.ts`, `src/feedback/`.
- `[x]` **Travel time vs straight-line distance** [M] — 2026-06-29 (owner
  picked; chose **b1+b2**, **Essentials** tier). Drive time from the user via
  Routes API **Compute Route Matrix** (`src/lib/travel.ts`, DRIVE +
  TRAFFIC_UNAWARE = Essentials, no live traffic). **(b1)** cards show
  "genre · 1.8 km · ~20 min"; **(b2)** the chip is now "leave in…" and
  `arrival(place) = now + chip + drive(place)`, so a 20-min-via-bridge place
  is judged correctly. One matrix call per batch (≤25 dests), cached per
  session by placeId, computed from the user's GPS (not the search center).
  **Graceful degrade:** until Routes is enabled the call fails quietly →
  filter falls back to chip-only, cards omit "~min" (no regression). Cost:
  ~free (Compute Route Matrix Essentials $5/1k elements, **10k free/mo**;
  ~660 elements/mo expected). 7 unit tests (parser + per-place arrival).
  **Routes API enabled + contract verified live 2026-06-29** (browser harness:
  SF→Oakland 13.4 km straight / 20 min drive vs Ferry Building 3.2 km / 16 min
  — the bridge effect, confirmed). Owner: consider a daily quota cap on Routes
  (mirror Places); $5 budget alert is the backstop. _PRD §11.2 Q9._
- `[x]` **Search radius + genre-scope re-search** [S] — 2026-06-29. The
  expand-search residue after "search this area". **(a) Search wider:** the
  Nearby radius is now state (tiers 5 → 15 → 50 km, the New API max); a
  "🔭 Search wider" control (list footer + empty state) steps the tier and
  re-runs Nearby, with a "Searching within N km" caption. **(b) Genre-scoped
  re-search:** with a genre active, "Find more {genre}" runs a Text Search
  (maxResultCount 20) for that genre near the center; results merge into the
  candidate set so the genre filter reaches beyond the fetched ≤20. Both are
  one user-triggered billed call, **no auto-fanout** (§8) — widen = Nearby
  Enterprise, genre-more = Text Search (hours mask → Enterprise). Controls
  hidden in favorites-only view. Gates green; boots clean (no regression);
  the billed buttons are owner-verified on-device. _PRD §11.2 Q10._
- `[x]` **Holiday-aware hours** [S] — 2026-06-29. The Nearby/Text/Details
  field masks now request `currentOpeningHours` + `currentSecondaryOpeningHours`
  (holiday-aware, ~7-day window), and `mapPlace` **prefers them over the
  `regular*` weekly schedule**, falling back when absent/empty. So a holiday
  closure the regular schedule would miss now reads as not-go-able. **Zero
  cost impact** — `current*` sit in the *same* Nearby Search Enterprise SKU
  as `regular*` (verified against Google's data-fields doc, 2026-06-29); no
  SKU bump. Go-able core unchanged (still day-of-week week-minute matching;
  `current` points carry a `date` the mapper ignores). `mapPlace` exported +
  5 unit tests (57 total). _PRD §11.2 Q2._
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
