# panda — M4: here-now + visits + overrides handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Handoff for M4 (here-now + visits + overrides). **Status: COMPLETE
2026-06-28, owner-verified.** Built on the visits + overrides rules
already shipped + emulator-tested in M1 (no rules change).

## What shipped

- **Here-now (F3)** — `src/lib/visits.ts` + `PlaceVisits`: one-tap "I'm
  here" logs a Visit (`byName` denormalized); per-place visit list with
  delete-own.
- **Good-time-to-go override (F4b)** — `src/lib/overrides.ts` +
  `OverrideControl`: presets (to-close / 30 / 60 / 120m early) + note →
  `overrides/{placeId}`. DiscoveryScreen loads the override map into
  `rankDiscovery`, so it re-tunes go-ability for the whole circle.
- **Recent visits (F5)** — `src/visits/VisitsScreen.tsx`: who · place ·
  when. Place names **re-hydrated** from Place IDs via `getPlaceName`
  (Place Details) — owner's ToS-clean choice (§11.2 Q3a), deduped +
  session-cached against the `GetPlaceRequest` cap.
- **Annotations (F1)** — `src/lib/annotations.ts` (pure, +5 tests): note
  count + last visit on discovery cards.
- **Nav** — Eat ⇄ Visits header toggle; circle data reloads on return
  from a detail.

## Decisions

- **Visit place names: re-hydrate, not snapshot** (owner, §11.2 Q3a) —
  visits stay strictly ToS-clean; favorites remain the only snapshot
  exception. Re-hydration is deduped + session-cached.
- **`byName` denormalized** on visits (same pattern as note `authorName`).
- Override feeds the existing go-able `closeBufferMin` (clamp/flag already
  in `goable.ts`).

## Verification

- 52 unit tests + 20 emulator rules tests green; typecheck/lint/build/md.
- UI verified via a throwaway mock-geo harness (deleted): detail's
  visits/override/notes sections, Eat ⇄ Visits nav, Visits view — all
  render with graceful permission-denied when unauthed. No console errors.
- Deployed; **owner live-verified** ("it's good").

## Known issue (tracked, not M4-specific)

- **Swipe/hardware back exits the app** — in-app nav (list ⇄ detail, tabs)
  uses React state with no History API integration, so a back gesture
  pops nothing and leaves the PWA. Promoted from the M3 deferral; fix is
  the next item (lightweight History wiring vs a router — owner to pick).

## Owner action

None — M4 verified and live. Next: fix back-nav, then **M5 (roulette)**.
