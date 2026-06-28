# panda — Product Requirements Document (v1)

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.
>
> **Status: v1 draft, 2026-06-26.** Items tagged _(inferred — confirm)_ are
> the nautilus's proposals awaiting owner ratification; open questions live
> in §11.2. The **go-able semantic**, the **Places/cost facts**, and the
> **billing posture** are folded in from the 2026-06-26 fact-finder + design
> pass (high-confidence, cited; see §11.2 Q1–Q3).

---

## 1. Overview

**Purpose**: panda is a phone-first installable web app (PWA) that answers
one question fast — _"where can we eat right now?"_ — for a small fixed
circle of friends/family. It surfaces restaurants that are **go-able** (open
when we'd arrive _and_ still open when we'd finish eating), filterable by
genre, with a **roulette** mode for when nobody can decide. On top of the
live Maps data it layers the circle's shared **notes** and **visit
history**, plus a one-tap **"here now"** to log a pop-in. Place data comes
from Google Maps; the notes/visits layer is the circle's own.

### 1.1 Goals

- Sub-10-second path from opening the app to a usable "here's where you can
  eat now (or soon)" list.
- "Open" means _actually go-able_: open when we arrive AND still open when
  we'd finish — not just open this instant.
- Shared circle memory: notes and visits visible to everyone in the circle,
  attributed.
- Kill decision paralysis: roulette picks from the current go-able +
  filtered set.
- One-tap "here now" visit logging — zero friction when you just pop in.

### 1.2 Non-goals _(inferred — confirm)_

- **No live presence / notifications.** "Here now" logs a visit; it does
  not broadcast or alert. (Possible later chamber.)
- **No multiple independent groups.** One circle. Multi-group is a later
  chamber.
- **No custom tags or named lists.** Genre = Maps types only.
- **No explicit favorites/saved system.** A place is "yours" implicitly via
  a note or visit.
- **No public/anonymous use.** Membership is allowlisted; nothing is
  world-readable.
- **Not a reviews platform.** Notes are private to the circle, not public
  reviews.
- **Not reservations/ordering/delivery.** panda finds; it doesn't book or
  transact.
- **No behavioral tracking or ads.**

### 1.3 Future-phase / deferred

Tracked in BACKLOG.md once the kit scaffolding lands.

**Committed (post-core chamber):**

- **No-go list** — a circle-shared, **per-place** block (one-tap "never
  show"; the explicit inverse of favoriting) that hard-excludes a Place from
  discovery and roulette. Per-place only in v1 scope — no brand-name or
  category rules (there's no chain/brand ID in the Places API, and "hotel
  restaurant" isn't a Maps type). Schema sketched in §5; ships after the
  M1–M5 core.

**Speculative candidate chambers:** live "here now" presence; invite-link
onboarding; custom tags; multi-circle; saved lists; per-day/per-meal
override granularity; holiday-aware hours (`currentOpeningHours`); per-place
meal-duration; brand/category-level blocking (if per-place proves tedious).

### 1.4 Philosophical commitments

- **The circle's data is the circle's.** Nothing public; export/delete are
  first-class affordances.
- **Location is used, not tracked.** Geolocation powers "near me"
  transiently; panda does not store a location trail.
- **No behavioral telemetry.**
- **Lean by default.** The simplest version that works; new surface earns
  its place.

---

## 2. Target user

- **Primary:** Austin + a small fixed circle (friends/family) who eat out
  together or trade recommendations, deciding in-the-moment on a phone.
- **Secondary:** none in v1.
- **Non-users:** the general public; strangers in arbitrary cities;
  restaurant owners. Widening to public is explicitly out of v1 scope.

---

## 3. Glossary

- **Circle** — the single fixed group of allowlisted members who share all
  panda data.
- **Place** — a restaurant, identified by its Google **Place ID**. Not
  stored beyond the ID (see §5).
- **Note** — free text a member attaches to a Place; shared + attributed.
- **Visit** — a record that a member was at a Place at a time; created by
  "here now"; shared.
- **Here now** — one-tap action that creates a Visit for the current place.
- **Open (go-able)** — a Place that will be open when we **arrive**
  (now + arrival offset _n_) AND still open when we'd **finish** eating
  (now + _n_ + meal duration _m_), within the **same** continuous open
  interval. Includes opening-soon places; excludes places open now that
  close before we'd finish.
- **Arrival offset (_n_)** — how far out we plan to arrive; user-chosen via
  **Now / +15 / +30 / +60** chips. Default **+15**. _v1 treats this as a
  flat offset applied uniformly to every place._ **Future model (§11.2
  Q9):** the chip is really a **departure buffer**, and true arrival is
  per-place — `arrival(place) = now + departure_buffer + travel_time(place)`
  — so a place 30 min away is tested for open-on-arrival 30 min later than a
  next-door one.
- **Meal duration (_m_)** — assumed time at table, used to test
  still-open-at-finish. Fixed at **75 min** in v1; not user-facing.
- **Good-time-to-go override** — a circle-shared, per-Place correction to
  Maps hours: `closeBufferMin`, the minutes before posted close that the
  place actually stops seating (0 = serves to the door; 120 = kitchen
  closes ~2h early). Authoritative over both Maps posted hours and KITCHEN
  secondary hours.
- **No-go / block** — a circle-shared, per-Place flag that hard-excludes a
  Place from discovery and roulette; the explicit inverse of favoriting.
  Per-place only (no brand or category rules). _Planned — later chamber._
- **Roulette** — random pick from the current go-able + genre-filtered
  result set.

---

## 4. Architecture (high-level)

- **Client:** React + Vite + TypeScript + Tailwind, single-page **PWA**
  (installable, geolocation, offline shell). Mobile-first.
- **Auth:** Firebase Auth (Google sign-in) gated by an allowlist (reuses
  route7's admin-allowlist-gate pattern). Only allowlisted accounts reach
  app data.
- **Data store:** Firestore for circle data (notes, visits, overrides,
  membership). Direct client↔Firestore under security rules; **no Cloud
  Functions** (kit default).
- **Place data:** Google Maps Platform — **Places API (New) v1** — called
  client-side for nearby search, hours, genre, details. Place content is
  **not persisted** beyond Place IDs (ToS — see §5 / §11).
- **Hosting / deploy:** Firebase Hosting.
- ARCHITECTURE.md will expand this once M1 settles.

---

## 5. Data model

Place data is **not** an entity we own — we store Place IDs and re-hydrate
display details from Maps on demand.

- **User** — `uid`, `displayName`, `email`, `photoURL`. Lifecycle: created
  on first allowlisted sign-in. Read: circle members. Write: self (profile
  only).
- **Membership / allowlist** — the set of `email`/`uid` permitted into the
  circle. Seeded by the owner _(mechanism is an open question, §11.2)_.
  Read: members. Write: owner only.
- **Note** — `placeId`, `authorUid`, `text`, `createdAt`, `updatedAt`.
  Multiple per place. Read: members. Write: author (create/update/delete
  own).
- **Visit** — `placeId`, `byUid`, `at` (timestamp). Created by "here now."
  Read: members. Write: creator (create/delete own; edits rare).
- **PlaceOverride (good-time-to-go)** — doc id = `placeId`;
  `closeBufferMin` (number, minutes subtracted from posted venue close;
  absent ⇒ no correction), `note` (string, optional), `updatedByUid`,
  `updatedAt`. One per Place. Read: members. Write: **any** member
  (create/update/delete) — collective circle knowledge, not author-locked.
  This is panda's **own** correction data, not cached Maps content, so it's
  unaffected by the Places caching ToS and absorbs repeat go-ability checks
  without re-calling Maps.
- **NoGo (planned — later chamber)** — doc id = `placeId`, `blockedByUid`,
  `blockedAt`. One per Place. Read: members; write: any member.
  Hard-excludes the Place from discovery + roulette via a client-side
  filter. panda's own data (a Place-ID flag), unaffected by the Places
  caching ToS.
- **Place (not stored)** — referenced by `placeId`; name / hours / genre /
  location / rating hydrated from Maps at display time. _Open question
  (§11.2): whether a minimal `{placeId, name}` snapshot may be persisted for
  visit-history display, given Places caching ToS._

---

## 6. Access control

Single circle; all members are peers. Per entity:

- **User:** read = members; write = self.
- **Membership:** read = members; write = owner.
- **Note:** read = members; create = any member; update/delete = author.
- **Visit:** read = members; create = any member (for self); delete =
  creator.
- **PlaceOverride:** read = members; create / update / delete = any member
  (collective circle knowledge, not author-locked).
- **NoGo** _(later chamber)_: read = members; create / delete = any member.

Nothing is readable by non-members. Rules mirror this table one-to-one.

---

## 7. User flows

- **F1 — Discovery (home).** Goal: see go-able places for when we want to
  go. Steps: open → grant location → choose **when** via
  **[Now] [+15] [+30] [+60]** chips (default **+15**, a travel-time proxy;
  the active chip shows the resolved arrival time, e.g. "+15 · 7:25") →
  list + map of **go-able**
  places (open at arrival _and_ still open at arrival + 75 min) → filter by
  genre → tap a place. AC: results satisfy the §3 go-able test against the
  selected offset and the fixed 75-min meal duration, evaluated in the
  **place's** local time; opening-soon places included, places that close
  before we'd finish excluded; a per-place good-time-to-go override (if set)
  supersedes Maps hours, and KITCHEN secondary hours tighten the close only
  when present and no override exists; places with no Maps hours show as
  **hours-unknown** (non-actionable badge; not auto-excluded); each result
  shows circle notes count + last visit if any. **Chip re-filtering runs
  client-side over the single fetched result set — no new billed Maps call
  per tap (see §8).**
- **F2 — Roulette.** Goal: pick for me. Steps: from filtered set → spin →
  one result → accept or respin. AC: pick is always within the current
  go-able + filtered set.
- **F3 — Here now.** Goal: log a pop-in. Steps: on a place → tap "here now"
  → Visit recorded, visible to circle. AC: one tap; appears in recent
  visits immediately.
- **F4 — Note.** Goal: leave/read a tip. Steps: on a place → add/edit note →
  shared + attributed. AC: members see it on that place; author can
  edit/delete.
- **F4b — Good-time-to-go.** Goal: correct a place whose kitchen closes
  before the door. Steps: on a place → set/adjust `closeBufferMin` (preset
  −30 / −60 / −120 or a stepper) + optional note → shared with circle. AC:
  any member can set/edit/clear it; the value immediately re-tunes
  go-ability for everyone; an override that would make the place never
  go-able is **flagged**, not silently applied.
- **F5 — Recent visits.** Goal: see where the circle's been. Steps: open
  visits view → chronological list with who + place + when. AC: reflects all
  members' visits.
- **F6 — Onboarding.** Goal: get into the circle. Steps: Google sign-in →
  allowlist check → in, or a "not on the list" state. AC: non-allowlisted
  accounts can't read circle data.
- **F7 — Block (later chamber).** Goal: never see a place again. Steps: on
  any result/detail → tap "never show" → the Place is hard-excluded from
  discovery + roulette for the whole circle. AC: blocked Places never appear
  in F1 or F2; any member can block or un-block. _Ships post-core (§1.3)._

---

## 8. Cost control

Google Maps Platform is the only metered dependency, and **opening-hours
fields force the Enterprise SKU** — so the constrained resource is the
**1,000 free Enterprise calls/month** (per billing account). Verified call
economics (fact-finder, 2026-06-26, cited in §11.2): Nearby Search
Enterprise ≈ $0.035, Place Details Enterprise ≈ $0.020; a call bills at the
highest SKU any requested field touches.

Design rules that keep us in the free tier:

- **One Nearby Search per screen-load**, `maxResultCount: 20`, with
  `regularOpeningHours` in the field mask → up to 20 places' hours for a
  single Enterprise call. **Never fan out** to per-place Place Details for
  the list (20 × $0.020 = $0.40 vs one $0.035 call).
- **Chip re-filtering (Now / +15 / +30 / +60) is client-side** over the
  already fetched payload — a chip tap must **not** trigger a new billed
  search.
- **Place Details Enterprise** only for single saved-place re-hydration.
- The per-place **good-time-to-go override** is panda's own Firestore data,
  so repeat go-ability checks cost nothing at Maps.
- **Debounce** location/refresh; no background polling.

**Billing setup (settled 2026-06-26):** panda shares route7's billing
account — route7's Enterprise usage is ~0, so combined stays well under the
1,000 free/mo. The hard ceiling is a **per-API daily quota cap** on panda's
project (rejects calls at the cap rather than billing); a **project-scoped
budget** is the email alert. The split-billing trigger is in §13.3.

---

## 9. UI requirements

- **Mobile-first**, one-handed, installable PWA; large tap targets.
- The **when** control is a chip row (Now / +15 / +30 / +60), not a slider —
  fewer taps, bigger targets, instant legibility on a street corner.
  Defaults to **+15** (travel-time proxy).
- List ⇄ map toggle on the discovery home.
- Fast first paint; usable on a street corner on cellular.
- Light/dark acceptable; visual system TBD in a design pass.
- Accessibility: aim WCAG AA for the core flows.

---

## 10. v1 Milestones

- **M1 — Infrastructure** _(highest friction; route7 cross-nautilus
  consult)_. Firebase project, Auth + allowlist gate, Firestore + rules,
  Hosting + deploy, Maps API key + restrictions, **shared billing account +
  per-API daily quota cap** (§8). AC: allowlisted Google sign-in works on
  the deployed URL; a probe read/write under rules succeeds.
- **M2 — Discovery core + PWA shell.** Geolocation → one Nearby Search →
  go-able filter (chips Now/+15/+30/+60 default +15, m=75, place-local time,
  override > KITCHEN > posted), genre filter, installable manifest + service
  worker.
  Depends on M1. **Fact-finder facts already gathered (§11.2 Q1–Q2).**
- **M3 — Place detail + notes.** Place detail view; shared notes read/write.
  Depends on M2.
- **M4 — Here-now + visits + overrides.** One-tap visit logging;
  recent-visits view; the good-time-to-go override (F4b); notes/visits
  annotations on discovery results. Depends on M3.
- **M5 — Roulette.** Spin over the filtered go-able set. Depends on M2.

---

## 11. Risks & open questions

### 11.1 Risks

- **Maps cost / quota** at unexpected refresh rates — mitigated by §8 (one
  search per screen-load, client-side chip re-filter, daily quota cap), but
  unvalidated until real use.
- **Hours-data quality** — go-ability is only as good as Maps' posted hours;
  KITCHEN secondary hours are **sparse**, which is exactly why the per-place
  override is load-bearing, not optional.
- **Timezone / DST** — go-ability is evaluated in the place's local time via
  Maps' `utcOffsetMinutes`, which is correct for same-evening planning
  (_n_ ≤ 60, no DST crossing tonight) but **not** robust across a DST
  boundary; a true IANA-zone lookup (Time Zone API, extra cost) is deferred.
- **Places caching ToS** — constrains what we can persist for
  history/offline (§5); the override sidesteps it for go-ability.
- **Geolocation friction** — permission denial or poor accuracy degrades the
  core flow; need a graceful manual-location fallback.

### 11.2 Open questions (non-blocking)

1. **"Go-able" semantic — ✅ SETTLED 2026-06-26 (fact-finder + design
   pass).** "Open" = go-able for a meal: open at arrival (now + _n_) AND
   still open at finish (now + _n_ + _m_), same continuous interval.
   Controls: **Now / +15 / +30 / +60** chips for _n_ (default **+15**, a
   travel-time proxy); _m_ fixed at **75 min**, not user-facing. Override: a
   single per-place
   `closeBufferMin` delta (minutes before posted close), circle-shared,
   precedence **override > KITCHEN secondary hours > posted hours**.
   Evaluated in the place's local time; defensive past-midnight wrap; never
   merge lunch/dinner periods; an override that would make a place never
   go-able is **clamped + flagged**, not silently applied; hours-unknown
   places are shown (non-actionable badge), not excluded. Folded into
   §3 / §5 / §6 / §7 / §8.
2. **Places API surface — ✅ largely RESOLVED 2026-06-26 (fact-finder,
   high confidence, cited).** Use **Places API (New) v1**;
   `regularOpeningHours.periods[]` (Point: day 0–6, hour, minute; 24h omits
   `close`) carries the data; KITCHEN exists in `secondaryHoursType` but is
   **sparse** (best-effort, never the foundation). `currentOpeningHours`
   (holiday-aware, ~7 days) is a **v1 deferral** — `regularOpeningHours`
   alone satisfies the semantic. Remaining: only live cost-ceiling
   validation, now handled by the §8 quota cap.
   Citations: `developers.google.com/maps/.../rest/v1/places`,
   `.../data-fields`, `.../billing-and-pricing/pricing`.
3. **Caching ToS:** verified we may **not** persist Maps hours beyond the
   Place ID — the override sidesteps this (it's our own data). Still open:
   may we persist a minimal `{placeId, name}` snapshot for visit-history
   display? **→ confirm before the M3/M4 brief.**
4. **Circle bootstrap:** how is the allowlist seeded and how do new members
   join — manual allowlist edit _(proposed for v1)_ vs invite link (later)?
5. **Roulette UX:** plain random pick vs. animated spin; any weighting by
   notes/visits? _(proposed: plain random, no weighting, v1)_
6. **Offline scope:** what must work without network — app shell only, or
   cached recent visits / notes too?
7. **Override granularity:** does any real circle place need **per-day /
   per-meal** override (early-close weekends, to-the-door brunch), or does
   the single delta + free-text note suffice? _(v1: single delta; revisit
   only if usage shows day-varying gaps.)_
8. **Meal duration _m_:** keep fixed at 75 min, or expose a per-place _m_ on
   the override later? _(v1: fixed.)_
9. **Departure buffer + per-place travel time (future request,
   2026-06-26):** reinterpret the when-chip as "when do we want to *leave*"
   and add per-place travel time, so arrival is computed per place —
   `arrival(place) = now + departure_buffer + travel_time(place)` — then
   test open-at-arrival AND open-at-arrival+_m_. Worked example: 7:00 now,
   leave in 15, a place 30 min away → arrival 7:45; must be open at 7:45 and
   still open ~9:00. **Travel estimate options:** (a) _lean_ — derive from
   the straight-line distance already returned by Nearby Search ÷ an assumed
   speed; no extra API call; rough but captures far-vs-near; (b) _accurate_
   — Routes / Distance Matrix per place (real walk/drive time, traffic) but
   a separate billed SKU × up to 20 places. UX shift: the home chip relabels
   to "leave in…", and each card shows its own arrival. _Later chamber;
   (a) is the likely first cut._

---

## 12. Implementation guidance for coding agents

- Read **§5 (data model)** and **§6 (access control)** before writing any
  data-access or rules code; the access table maps 1:1 to Firestore rules.
- The **go-able filter** is settled (§3 / §11.2 Q1): precedence
  override > KITCHEN > posted; same continuous interval covers
  [arrival, finish]; place-local time; defensive past-midnight wrap; never
  merge lunch/dinner periods; clamp `closeBufferMin` to the interval start
  and flag overrides that zero out a place. Keep chip re-filtering
  client-side (§8).
- **Do not guess open questions (§11.2)** — they get a design conversation
  or a fact-finder pass, not an implementer's improvisation.
- Any further brief touching Google Maps Platform gets a **fact-finder
  cuttlefish first** (the kit's canonical quirky-API case); the 2026-06-26
  pass already covered hours + cost.
- AGENTS.md (once the kit scaffolding lands) carries the codebase
  guardrails.

---

## 13. Sustainability philosophy

### 13.1 Cost posture

Small circle, no tracking, no ads. Operating cost is essentially Firebase
free-tier + Maps spend kept inside the **1,000 free Enterprise calls/month**
— held down by one Nearby Search per screen-load (≤20 results, hours in the
field mask), client-side chip re-filtering, no Place Details fan-out, and no
background polling (§8). panda shares route7's billing account; a per-API
daily quota cap is the hard ceiling.

### 13.2 Revenue posture

None. Personal / free for the circle. No monetization planned; the privacy
commitments in §1.4 would constrain ad-based models anyway.

### 13.3 Triggers to revisit

- **route7 + panda combined approach ~1,000 Enterprise calls/month** → give
  panda its own billing account (its own free tier). Cheap to do; the only
  reason to split.
- Monthly Maps spend exceeds ~$50 → revisit fetch/quota strategy.
- The "circle" outgrows "small / fixed" (open signups or multiple groups) →
  revisit auth, scale, and this whole posture.

---

End of v1 draft. Open questions (§11.2) settle via
design-conversation-or-fact-finder → update-PRD as they come up.
