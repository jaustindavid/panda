# panda — AGENTS.md

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

This file is the entry point for any coding agent (Claude Code, Cursor,
Aider, Codex, etc.) picking up work on panda. Read it first. It is
intentionally short; the canonical docs do the heavy lifting.

---

## Required reading, in order

1. **[PRD.md](PRD.md)** — what to build. Data model (§5), access
   control (§6), user flows (§7), cost spec (§8), milestones (§10),
   open questions (§11.2).
2. **ARCHITECTURE.md** — how to build it. _Not written yet; drafted
   during M1 once infra settles. Until then, PRD §4 is the high-level
   shape._

Do not start writing code until the PRD (and ARCHITECTURE, once it
exists) is read. The planning docs are written for cold-read.

---

## The load-bearing sections

- **[PRD §8 — Cost control](PRD.md)** — opening-hours fields force the
  **Enterprise SKU** (1,000 free calls/mo). One Nearby Search per
  screen-load (`maxResultCount: 20`, hours in the field mask); **never
  fan out** to per-place Place Details for the list; chip re-filtering
  is **client-side**. A per-API daily quota cap is the hard ceiling.
- **[PRD §3 + §11.2 Q1 — the go-able filter](PRD.md)** — the core pure
  function. Precedence **override > KITCHEN > posted hours**; test
  `[arrival, finish]` within ONE continuous interval; evaluate in the
  place's local time; defensive past-midnight wrap; never merge
  lunch/dinner periods; clamp + flag overrides that zero out a place;
  hours-unknown shown, not excluded. The most edge-case-dense code in
  the project — it gets thorough unit tests.
- **[PRD §5 + §6 — data model + access](PRD.md)** — the access table
  maps 1:1 to Firestore rules. Read before any data-access or rules
  code.

Violating any of these is violating v1's primary commitments.

---

## Hard guardrails — do not cross without asking

- **No cached Maps place content beyond the Place ID.** Google ToS.
  Display details re-hydrate from Maps; the circle's own data (notes,
  visits, overrides, no-go) keys on Place ID. (Open question §11.2 Q3:
  whether a minimal `{placeId, name}` history snapshot is permitted.)
- **No Cloud Functions or server code** in v1. Anything not enforceable
  in Firestore security rules is out of scope. (A thin read-only Maps
  proxy is a documented cost tripwire in PRD §8 — not a default.)
- **No real-time listeners** (`onSnapshot`, WebSocket, SSE). One-shot
  reads. The model is async-by-explicit-action.
- **No external state library** (Redux, Zustand). React Context + local
  state.
- **No SSR.** Static SPA / PWA.
- **No `any`** in TypeScript without an inline comment explaining why.
- **No checked-in secrets.** The Maps key goes in `.env.local`
  (gitignored), referrer-restricted + quota-capped.
- **No behavioral tracking / analytics SDKs.** PRD §1.4.

Project-specific guardrails accrue here as they're established.

---

## Commit & PR hygiene

- One PR per dispatch (or smaller). Each runnable and type-clean.
- Dispatches are briefs in `dispatch/`; the matching handoff lands
  alongside (`dispatch/<name>-handoff.md`).
- **Owner reviews + commits. No agent self-commit or self-merge** —
  code quality and IP clarity both.
- Strict TypeScript. Conventional commits preferred, not enforced.

---

## Testing expectations

- **Unit tests for the go-able filter** (the pure function above) —
  non-negotiable; cover midnight wrap, split periods, override
  precedence + clamp, opening-soon inclusion, closing-soon exclusion,
  hours-unknown, and timezone.
- Unit tests for other pure utilities (formatters, distance, time).
- **Firestore rules tests** (emulator-based) once rules exist — one
  test per row of the PRD §6 access table.
- Component / integration tests deferred; use each dispatch's manual
  acceptance checklist meanwhile.

---

## Linting

- Markdown: `npx markdownlint-cli2 "**/*.md"` must exit clean. Config at
  `.markdownlint.jsonc`. Code blocks, tables, and ASCII diagrams are
  exempt from the line-length rule; don't use inline disable comments —
  add a config rule with a reason if genuinely needed.
- Code: ESLint (set up with the app-scaffold dispatch).
- All gates pass before a handoff is written (WORKING-MODEL.md §5).

---

## If unsure, ask

Pause and ask the owner before:

- Adding a new top-level dependency.
- Introducing any backend not in ARCHITECTURE.md.
- Changing the data model / Firestore schema.
- Touching the security rules.
- Picking a third-party service or SDK not already chosen.
- Resolving any open question in **PRD §11.2** — these are not to be
  guessed at.
- Anything relying on Google Maps Platform behavior that hasn't been
  verified — spawn a fact-finder first (the 2026-06-26 pass covered
  hours + cost; see PRD §11.2 Q1–Q2).

The cost of pausing is low; a reverted PR is higher.

---

## Project identity

panda is a **private, personal, non-commercial** hobby app for a small
family circle. The repo is private; the code is dedicated to the public
domain under CC0 1.0 (see LICENSE), so there is no "all rights reserved"
restriction on it. The circle's data lives in Firestore, not the repo.
If unclear, ask.

---

## When you create a new artifact

Every top-level markdown deliverable (PRD, ARCHITECTURE, README, AGENTS,
design docs) opens with two lines under the title:

1. `_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._`
2. The AI-first preamble blockquote (the one that opens this file).

Apply automatically — the owner won't remember to ask.

---

## Working model

panda follows the **cuttlefish/nautilus** working model. The kit docs
live in the sibling kit folder at `../route7/paralarva/` (relative to
this repo on the owner's machine):

- `CUTTLEFISH-NAUTILUS.md` — the conceptual frame
- `WORKING-MODEL.md` — the operational playbook (lifecycle, pre-read,
  fact-finder, antipatterns, stall recovery, post-ship fix)
- `HANDOFF-TEMPLATE.md` — handoff doc structure
- `BRIEF-TEMPLATE.md` — dispatch brief structure

Required reading before contributing to any dispatch brief or handoff.
_If this repo is ever cloned somewhere without the kit adjacent, vendor
these four docs into `dispatch/`._

### Agent dispatch configuration

Cuttlefish dispatched via the Agent tool edit files **directly in the
project's working tree** — not an isolated temporary git worktree.
Enabled by `worktree.bgIsolation: "none"` in
`.claude/settings.local.json` (per-machine, gitignored). Claude Code
reads it at **session start** — if you just created or changed it, open
a fresh session. One-time sanity check before the first code dispatch:
ask an agent to create `dispatch/agent-probe.txt` containing `ok` and
confirm it lands here, not under `~/.claude/worktrees/`. Remove the
probe after.
