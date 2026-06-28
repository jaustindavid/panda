# panda — M2: discovery core handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Handoff for M2 (discovery core + go-able). **Status: COMPLETE 2026-06-28,
owner-verified on real data.** Authored directly by the nautilus.

---

## What shipped

- **`src/lib/goable.ts`** — the go-able filter (PRD §3 / §11.2 Q1): tests
  `[arrival, finish]` within ONE open interval in the place's local time;
  precedence override > KITCHEN > posted; past-midnight + week wrap; no
  period merge; override clamp+flag; hours-unknown reported. **20 unit
  tests.**
- **`src/lib/places.ts`** — one Nearby Search (Places API New), restaurants
  nearest-first, `includedTypes:['restaurant']`, Enterprise hours field
  mask (NO rating/priceLevel → avoids the Atmosphere SKU, PRD §8). Live
  contract validated against the real API before building on it.
- **`src/lib/discovery.ts`** — `rankDiscovery`: annotate (status / distance
  / genre), exclude not-go-able, keep go-able + hours-unknown, sort
  go-able-first then nearest. `availableGenres` for the filter chips.
- **`src/lib/distance.ts` / `genre.ts` / `time.ts`** — pure utils
  (haversine + format, Maps-type → label, chip clock), all unit-tested.
- **`src/hooks/useGeolocation.ts`** — transient location, retry fallback.
- **UI** (`src/discovery/`) — `WhenChips` (Now/+15/+30/+60, default +15,
  **client-side re-filter — no Maps call per tap**), `GenreFilter` (derived
  chips), `PlaceCard`, `DiscoveryScreen`; behind the auth gate, header
  sign-out. **42 unit tests total**, all gates green; deployed.

## Decisions

- **List-first; map deferred** (owner) — the map is a fast-follow (needs
  Maps JS API enabled + key restriction + the dynamic-map SKU).
- **Restaurants, nearest-first** (owner) — `includedTypes:['restaurant']`,
  `rankPreference:DISTANCE`, radius 5000 m, ≤20.
- **m = 75 min fixed, default arrival +15**, hours-unknown shown (badge),
  not-go-able excluded — per PRD §3 / §7 F1.
- **Enterprise-only field mask** — no rating, to hold the cheaper SKU (§8).

## Verification

- 42 unit tests (20 go-able incl. midnight/week wrap, split periods,
  override clamp+flag, KITCHEN precedence, tz; + distance/time/genre/
  discovery).
- **Live API contract** probed in-browser (the referrer-restricted key
  only works from an allowed origin, not Node) — confirmed `periods[]`
  shape, `utcOffsetMinutes`, hours-absent (hours-unknown) cases.
- **Discovery UI** rendered with live Maps data via a throwaway
  mock-geolocation harness (deleted after) — nearest-first, hours-unknown
  sorted last, genre chips, distances all correct; no console errors.
- Deployed to `panda-bamboo-lane.web.app`; **owner live-verified** ("LGTM").

## Rakes hit

- **react-hooks v7 strict rules** (ESLint 10): `set-state-in-effect` +
  `purity` reject the naive fetch-on-mount + `Date.now()`-in-render
  patterns. Resolution: lazy state init, effects that set state only from
  async callbacks, **derived** loading (not stored), and "now" as
  timer-refreshed state — never `Date.now()` in render.
- **Referrer-restricted Maps key is browser-only** — can't probe the
  Places API from Node/curl (no `Referer` → 403); validate in-browser at
  an allowed origin.

## Deferred / captured for later (all in BACKLOG + PRD)

- **Discovery map view** [S] — the deferred fast-follow.
- **Expand search / "search this area"** (PRD §11.2 Q10) — genre filter is
  client-side over the nearest-20; getting beyond it is user-triggered +
  quota-aware.
- **Travel time vs straight-line** (PRD §11.2 Q9) — the river/bridge case;
  real routing needed.
- **Aggressive list-caching** (PRD §11.2 Q3b) — **fact-finder running** on
  the Places caching ToS (gates this + the M3/M4 `{placeId,name}` snapshot).
- **JS bundle size** [XS] — Firebase SDK heft (from M1).
- **App icon** [S] — replace the 🐼 emoji + SVG icons with the owner's
  boba-panda artwork.

## Owner action

None — M2 is verified and live. Next: M3 (place detail + notes) and/or the
discovery map fast-follow.
