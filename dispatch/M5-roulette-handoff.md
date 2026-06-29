# panda — M5: roulette handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Handoff for M5 (roulette) — **the last core v1 milestone**. **Status:
COMPLETE 2026-06-28; mechanics verified (harness, on live data). A
populated live spin on the owner's device is a no-rush confirm (it was
midnight Sunday at hand-off — little open / go-able).**

## What shipped

- **`/roulette` route** (`src/roulette/RouletteScreen.tsx`) — a route, so
  swipe/Back dismisses it (the router from the back-nav fix). A **🎲 Spin**
  button on discovery navigates to it (shown when the list is non-empty).
- **Plain uniform random, no weighting** (PRD §11.2 Q5) over the current
  **go-able + genre-filtered** set. Deliberately **excludes hours-unknown**
  (PRD §7 F2 AC "go-able + filtered set" — roulette shouldn't decide on a
  maybe-closed place).
- **Light spin** — cycles a highlight ~0.9s, then settles. Candidates read
  via a ref so the 60s go-able refresh doesn't re-spin (no
  exhaustive-deps disable).
- **Accept** ("Let's go") → place detail · **Respin** → new pick · empty
  state when nothing's go-able.
- Provider now exposes `shown` (ranked after the genre filter), shared by
  the list + roulette.

## Verification

- 52 unit + 20 rules tests; typecheck/lint/build/markdown green.
- Harness (mock-geo, live Maps): Spin → /roulette → animated cycle →
  result card ("Go here" / name / genre·distance / Let's go · Respin);
  go-able-only filter confirmed (correctly shows the empty state once only
  hours-unknown places remained as the clock advanced). No console errors.
- Deployed (`index-BZ92IHvU.js`).

## v1 core complete

M1 (infra/auth) · M2 (discovery + go-able) · M3 (detail + notes) · M4
(here-now/visits/overrides) · M5 (roulette) + the router nav fix — all
shipped and deployed. panda answers "where can we eat right now?" end to
end, behind an allowlisted Google sign-in.

## Deferred / queued (post-core chambers — BACKLOG)

Add-by-name favorites (SavedPlace), the boba-panda app icon, the discovery
map view, the no-go list; plus the travel-time and expand-search FRs, the
unused-quota hardening, JS bundle-size, and the two-`<h1>` a11y nit.

## Owner action

Optional: a daytime live spin to see a populated pick. Then pick the next
post-core chamber.
