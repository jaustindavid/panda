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

Active candidates for the immediate next dispatch.

- `[~]` **M1 — Infrastructure (ops)** [ops; high-friction] — new
  Firebase project under the **shared** billing account; Firebase Auth
  (Google) + allowlist gate; Firestore + rules; Hosting + deploy; Maps
  API key (Places API New, referrer-restricted) + **per-API daily quota
  cap**; project-scoped budget alert. Requirements-shaped brief; run
  past the route7 nautilus first (kit M1 consult); owner executes the
  console steps. ARCHITECTURE.md gets drafted here. _Design: PRD §4, §8,
  §10, §13. Brief: dispatch/M1-infra.md — drafted, pending route7
  consult._

---

## Soon

The v1 feature build, smallest-friction-first after M1.

- `[~]` **M2 — Discovery core + go-able** [L] — geolocation → one Nearby
  Search → the go-able filter (chips Now/+15/+30/+60 default +15, m=75,
  place-local time, precedence override > KITCHEN > posted, midnight
  wrap, no period-merge, override clamp, hours-unknown shown) → list +
  map, genre filter. The go-able filter is the project's most edge-dense
  code → thorough unit tests. Fact-finder facts already gathered.
  _Design: PRD §3, §7 (F1), §8, §11.2 Q1–Q2._
- `[~]` **M3 — Place detail + notes** [M] — place detail view; shared,
  attributed notes (read / write / edit-own / delete-own). _Design: PRD
  §5, §6, §7 (F4)._
- `[~]` **M4 — Here-now + visits + overrides** [M] — one-tap "here now"
  → shared Visit; recent-visits view; the good-time-to-go override
  (`closeBufferMin`, F4b) feeding the go-able filter; notes/visit
  annotations on discovery results. _Design: PRD §5, §6, §7 (F3, F4b,
  F5)._
- `[~]` **M5 — Roulette** [S] — random pick over the on-screen go-able +
  filtered set; accept or respin. _Design: PRD §7 (F2)._

---

## Later

Committed and speculative chambers, post-core. Move to Soon as triggers
fire.

- `[~]` **No-go list** [S] — circle-shared **per-place** block (one-tap
  "never show", the inverse of favoriting); hard-excludes from
  discovery + roulette. Per-place only; no brand/category rules. _Committed.
  Design: PRD §1.3, §3, §5 (NoGo), §6, §7 (F7)._
- `[~]` **Departure buffer + per-place travel time** [M] — reinterpret
  the when-chip as "leave in…"; `arrival(place) = now + buffer +
  travel(place)`. Lean first cut: estimate travel from straight-line
  distance (no extra API); accurate = Routes / Distance Matrix (extra
  SKU). _Design: PRD §11.2 Q9._
- `[ ]` **`{placeId, name}` history snapshot** [XS] — gated on the
  Places caching-ToS answer (PRD §11.2 Q3). Resolve before M3/M4 if
  visit history needs offline-readable place names.
- `[ ]` **Holiday-aware hours** [S] — prefer `currentOpeningHours`
  (special-days, ~7-day window) over `regularOpeningHours` in the go-able
  filter. _Deferred from M2 (PRD §11.2 Q2)._
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
