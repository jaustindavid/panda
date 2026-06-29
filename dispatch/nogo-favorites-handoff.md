# panda — No-go + favorites handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Two post-core chambers, built together (symmetric twins). **Status:
SHIPPED + deployed 2026-06-29; owner live-check pending.**

## What shipped

- **Rules** — `nogos` + `savedPlaces` collections (read/write: any member,
  collective; doc id = placeId). +6 emulator tests (**26 total**).
- **No-go (PRD §7 F7)** — `src/lib/nogo.ts`; the provider drops blocked
  Place IDs from `ranked` → gone from discovery **and** roulette.
- **Favorites (PRD §7 F8)** — `src/lib/favorites.ts` stores a Place
  **snapshot** (name + hours + location — the favorites-only caching
  step-over, §11.2 Q3c). The provider **merges** favorites into the
  candidate set, so a far "not close" favorite still appears (still
  go-able-tested on its own hours). ★ on cards.
- **Add-by-name** — `/add` route (`AddByNameScreen`) → Places **Text
  Search** (`searchTextRestaurants`, location-**biased** not restricted) →
  ☆ Save. Entry: "＋ Add a favorite by name" on discovery.
- **PlaceActions** on the detail — Save/★ + Never-show/🚫 toggles (any
  member); `PlaceDetail` now takes the full `Place` so saving snapshots it.

## Verification

- 26 emulator rules tests + 52 unit tests; typecheck/lint/build green.
- Harness (live): add-by-name Text Search returned a real place; /add UI +
  Save toggle render; unauthed writes fail gracefully ("Not signed in" /
  permission-denied).
- **Discovery 429'd during verification** — the **50/day SearchNearbyRequest
  cap working as designed** (cost protection confirmed; calls 429, not
  billed). Burned by ~50 verification reloads. Resets daily (~midnight PT).

## ⚠️ Quota notes (owner)

- **Discovery (Nearby Search) is at the daily cap for today** — it'll 429
  until reset. Favorites, no-go, and add-by-name are unaffected — they use
  Firestore plus the separate, uncapped Text Search. Test discovery tomorrow.
- **Text Search is now USED** (add-by-name) and is **uncapped** at default.
  Recommend a ~50/day cap on `SearchTextRequest` (console), and do **not**
  zero it in the unused-quota-hardening item (that item now only covers
  `GetPhotoMediaRequest`).

## Owner live-check (authed)

- Detail → **★ Save** a place → it gets a ★ in discovery; **Never show** →
  it disappears from discovery + roulette; toggle both back.
- **＋ Add a favorite by name** → search "Baroni's" → Save → it appears in
  discovery even though far (when open).
