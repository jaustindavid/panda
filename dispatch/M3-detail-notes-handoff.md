# panda — M3: place detail + notes handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Handoff for M3 (place detail + shared notes). **Status: COMPLETE
2026-06-28, owner-verified.** Authored directly by the nautilus.

## What shipped

- **Place detail** (`src/place/PlaceDetail.tsx`) — tap a discovery result →
  detail view (name, genre · distance, go-able badge). Reuses the
  already-fetched `Place` from discovery — **no extra Maps call**.
- **Shared, attributed notes** (`src/place/NotesSection.tsx`,
  `src/lib/notes.ts`) — any member adds; author edits/deletes own; loading
  / empty / error states; relative timestamps. Runs on the **notes rules
  shipped + emulator-tested in M1** (no rules change in M3).
- **Navigation** — `PlaceCard` is now a tappable button; `DiscoveryScreen`
  routes list ⇄ detail via local state (no router dependency).
- `time.ts` `formatRelative` + tests (**47 unit tests** total).

## Decisions

- **`authorName` denormalized onto each note** (PRD §5) — the circle's own
  data (the author's name), not Maps content, so attribution needs no
  User-profile collection. Snapshot-at-write: old notes keep the old name
  if an author later renames (fine / arguably desirable for a family app).
- **One-shot reads, client-sorted** (no `onSnapshot`, no composite index) —
  per AGENTS.md guardrails + cost.
- **No router** — local view state; revisit if navigation grows
  (discovery/detail/visits/roulette).

## Verification

- 47 unit tests; typecheck / lint / build / markdown green.
- UI verified via a throwaway mock-geo harness (deleted): list → tap →
  detail renders; notes form + states; **graceful permission-denied** when
  unauthed (proves the rules gate + error UI). No console errors.
- Deployed; **owner live-verified** the authed notes round-trip ("looks
  great").

## Deferred / not here

- **Hardware/swipe back** (PWA history integration) — in-app Back button
  for now; revisit with a router if nav grows.
- User-profile collection — deferred; denormalized attribution covers M3
  (and will cover M4 visits the same way).

## Owner action

None — M3 verified and live. Next: **M4 (here-now + visits + overrides)**.
