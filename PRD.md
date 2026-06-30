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
circle of friends/family. It surfaces restaurants that are **go-able** (a
🟢/🟡/🔴 traffic light: will the kitchen still cook for us when we'd arrive?),
filterable by genre, with a **roulette** mode for when nobody can decide. On
top of the live Maps data it layers the circle's shared **notes** and **visit
history**, plus a one-tap **"here now"** to log a pop-in. Place data comes
from Google Maps; the notes/visits layer is the circle's own.

### 1.1 Goals

- Sub-10-second path from opening the app to a usable "here's where you can
  eat now (or soon)" list.
- "Open" means _actually go-able_: the kitchen will still serve us when we'd
  arrive (🟢), or it's cutting it close (🟡) — not just open this instant.
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
- **No custom tags or named lists.** Genre = Maps types only. (A single
  flat saved set is now in — see next line — but **named/tagged lists**
  stay out.)
- **Explicit favorites/saved system** — _was a non-goal; **reversed by
  owner FR 2026-06-28.**_ A basic **add-restaurant-by-name** saved set
  (far favorites that join discovery + roulette) is now a committed chamber
  (§1.3, §5, §7 F8). Still out: named/tagged or per-user lists — the saved
  set is one flat, circle-shared list keyed on Place ID.
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
- **Add restaurants by name (saved favorites)** _(owner FR 2026-06-28)_ —
  a circle-shared, **per-place** saved set: search a place **by name**
  (Places **Text Search**, a new surface) → store its **Place ID** → it
  joins discovery + roulette **regardless of proximity** (up to the 100 km
  distance cap, §7 F1), so "not close" favorites stay in the rotation. The
  symmetric twin of the no-go list
  (NoGo = always-hide; SavedPlace = always-include). Per ToS, store only
  the Place ID; re-hydrate name/hours via Place Details each load (mind the
  `GetPlaceRequest` 50/day cap × N favorites). Schema sketched in §5; pairs
  naturally with **M5 roulette**.

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
- **Go-able (traffic light)** — is a Place a real dinner option for when we'd
  arrive? Anchored on the **kitchen close** (when they stop serving), not the
  posted door-close, in three bands: 🟢 **green** = we'd arrive **before
  kitchen close** (they'll cook); 🟡 **yellow** = arrive **after kitchen close
  but at/before posted close** (kitchen shut, door open — cutting it close);
  🔴 **red** = arrive **after posted close** (or before they open) — hidden
  from discovery + roulette, still reachable by name search. Evaluated
  per-Place in its local time against `arrival = now + chip + drive(place)`;
  separate lunch/dinner periods are never merged. _Supersedes the old binary
  "open at arrival AND still open at finish": being **seated** before the
  kitchen closes is enough — once seated they let us stay, so we no longer
  require the meal to finish before the door closes (that wrongly killed e.g.
  Baroni's at 7:30). Owner design pass 2026-06-29._
- **Arrival offset (_n_)** — how far out we plan to arrive; user-chosen via
  **Now / +15 / +30 / +60** chips (default **+15**). The chip is a **departure
  buffer**; true arrival is per-place — `arrival(place) = now + n +
  travel(place)` (Routes drive time, **shipped** 2026-06-29, §11.2 Q9) — so a
  place 30 min away is tested 30 min later than a next-door one.
- **Kitchen close** — the threshold the light turns on, by precedence: the
  circle's **override** (`closeBufferMin` = minutes before posted close they
  really stop seating; Baroni's 0 = "at close", Matt's 15) → Google **KITCHEN**
  secondary hours if present → else **posted close − 45 min** (the unknown
  default, `DEFAULT_KITCHEN_BUFFER_MIN`). Saved places get precise local
  knowledge; unknowns go green→yellow in their last 45 min. Richer per-place
  kitchen-close (absolute times; per-night for late bar hours — Home Team) is a
  future iteration.
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
- **Membership / allowlist** — **v1: the circle's emails are hardcoded
  directly in `firestore.rules`** (no Firestore collection); every rule
  gates on `request.auth.token.email` being in that set. Adding/removing a
  member = edit the rules + redeploy. Leanest for a tiny fixed circle
  (settled 2026-06-28, §11.2 Q4). A Firestore Membership _entity_ (read:
  members; write: owner) is deferred unless invite-link onboarding lands.
- **Note** — `placeId`, `authorUid`, `authorName`, `text`, `createdAt`,
  `updatedAt`. (`authorName` is a denormalized display snapshot — the
  circle's own data, not Maps content — so attribution needs no User-doc
  lookup; M3.) Multiple per place. Read: members. Write: author
  (create/update/delete own).
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
- **SavedPlace (planned — later chamber; owner FR 2026-06-28)** — doc id =
  `placeId`, `addedByUid`, `addedAt`, plus a **snapshot** `name`, `hours`,
  `snapshotAt`. One per Place. Read: members; write: any member
  (add/remove). Hard-**includes** the Place in discovery + roulette
  regardless of proximity (the inverse of NoGo). Added via name search
  (Places Text Search → Place ID). The `name`/`hours` snapshot is copied
  from Maps on favorite — the **accepted bounded step over the caching ToS
  letter** (§11.2 Q3c): it renders the favorite with no per-load API call,
  and is **re-polled live on a short interval** (freshness + drift
  detection; a live name ≠ snapshot name flags a possible ownership change).
  Place ID is the identity anchor — circle content never follows a successor
  business (new business ⇒ new ID). Reversible to ID-only if quota allows
  (§13.3).
- **Place (not stored)** — referenced by `placeId`; name / hours / genre /
  location / rating hydrated from Maps at display time. _Open question
  (§11.2): whether a minimal `{placeId, name}` snapshot may be persisted for
  visit-history display, given Places caching ToS._

---

## 6. Access control

Single circle; all members are peers. Per entity:

- **User:** read = members; write = self.
- **Membership:** v1 = emails hardcoded in `firestore.rules` (no doc);
  changing the circle = edit + redeploy rules. (Firestore-entity version
  with owner-only write is deferred — §11.2 Q4.)
- **Note:** read = members; create = any member; update/delete = author.
- **Visit:** read = members; create = any member (for self); delete =
  creator.
- **PlaceOverride:** read = members; create / update / delete = any member
  (collective circle knowledge, not author-locked).
- **NoGo** _(later chamber)_: read = members; create / delete = any member.
- **SavedPlace** _(later chamber)_: read = members; create / delete = any
  member.

Nothing is readable by non-members. Rules mirror this table one-to-one.

---

## 7. User flows

- **F1 — Discovery (home).** Goal: see go-able places for when we want to
  go. Steps: open → grant location → choose **when** via
  **[Now] [+15] [+30] [+60]** chips (default **+15**, a travel-time proxy;
  the active chip shows the resolved arrival time, e.g. "+15 · 7:25") →
  list + map of **go-able** places, each with a **🟢/🟡** badge → filter by
  genre → tap a place. AC: each place is banded by the §3 traffic light
  (🟢 arrive before kitchen close · 🟡 after kitchen close but ≤ posted close ·
  🔴 after posted close / before open → hidden) against `now + chip + drive`,
  evaluated in the **place's** local time; kitchen close = override > KITCHEN
  secondary hours > posted − 45; places with no Maps hours show as
  **hours-unknown** (non-actionable badge; not auto-excluded); each result
  shows circle notes count + last visit if any. Candidates beyond a **100 km
  straight-line distance cap** from the user are dropped however go-able — a
  place that far isn't a "right now" answer; this also caps far-flung
  favorites (e.g. home favorites while travelling). _Owner FR 2026-06-29
  (`MAX_DISTANCE_M`)._ **Chip re-filtering runs client-side over the single
  fetched result set — no new billed Maps call per tap (see §8).**
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
  in F1 or F2; any member can block or un-block. **Block and favorite are
  mutually exclusive** — blocking clears any save and vice versa, enforced
  atomically (a place is "always include" XOR "always exclude"); this prevents
  the accidental/prank both-state where no-go would silently win (owner FR,
  2026-06-29). _Ships post-core (§1.3)._
- **F8 — Add by name (later chamber; owner FR 2026-06-28).** Goal: keep a
  "not close" favorite in the rotation. Steps: search a restaurant **by
  name** (Places Text Search) → pick it → it's saved (Place ID) for the
  whole circle and joins discovery + roulette regardless of distance (up to
  the 100 km cap, §7 F1). AC: saved places appear in F1/F2 even when far
  (subject to the go-able test on their own hours AND the 100 km distance
  cap); any member can add or remove; stores only the Place ID, name/hours
  re-hydrated on display. _Ships post-core (§1.3)._

Google Maps Platform is the only metered dependency, and **opening-hours
fields force the Enterprise SKU** — so the constrained resource is the
**1,000 free Enterprise calls/month** (per billing account).

**Verified current pricing (fact-finder 2026-06-29, cited).** Post-March-2025
model = **per-SKU monthly free allotments** (the old $200 credit is gone),
per billing account, reset on the 1st (Pacific). Free caps by category:
**Essentials 10,000/mo · Pro 5,000/mo · Enterprise 1,000/mo**. A call bills
at the **highest SKU any requested field touches**. panda's calls:

- **Nearby Search + `regularOpeningHours` → Nearby Search Enterprise**:
  1,000 free/mo, then **$35/1,000 ($0.035/call)**. _hours is the only field
  that pushes it to Enterprise — but it's intrinsic: the go-able filter
  needs hours for all 20 results, so dropping it would force a Place-Details
  fan-out (worse). Keep hours in the one Nearby call._
- **Place Details `id,displayName`** (visit-name re-hydration) → **Pro**
  (not free — `displayName` is Pro): 5,000 free/mo, $17/1,000. `id`-only is
  unlimited/free but nameless. **Text Search** (add-by-name) → Pro (5,000
  free/mo) without hours.
- **⚠️ Daily-cap vs monthly-free:** GCP quotas are per-day; the free tier is
  per-month — so a daily cap is only a proxy. Daily Nearby cap is **100**
  (owner bumped from 50 on 2026-06-29 to keep testing; watching usage).
  100 × 30 = 3,000/mo worst case ≫ the 1,000/mo Enterprise free cap, so the
  **$5 budget alert is the real guard during testing**. Steady-state: **~33/
  day (≈990/mo) guarantees $0**; realistic 4-person use (≈one search per
  app-open) sits well under 1,000/mo regardless. _Revisit the cap after
  testing settles._

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
  go-able filter (🟢/🟡/🔴 by kitchen close; chips Now/+15/+30/+60 default +15;
  place-local time; kitchen close = override > KITCHEN > posted−45), genre
  filter, installable manifest + service
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
- **Places caching ToS** — settled (§11.2 Q3): only Place IDs (indefinite)
  plus lat/lng (≤30 days) may be stored; name/hours/types/ratings re-hydrate
  on demand. The override sidesteps it for go-ability. _Consequence: caching is
  **not** an available cost lever — the §8 quota discipline (one search/
  screen-load, client re-filter, daily cap) is the only one._
- **Maps "closed community" clause (low confidence, low practical risk)** —
  Google's terms discourage running a Maps Implementation **only** behind a
  firewall / on an internal network / in a closed community without written
  permission. panda is a **public-URL PWA** (Maps runs in any member's
  browser; only the *data* is allowlisted), so it likely isn't
  "internal-network-only" — but the "closed community" wording wasn't
  verbatim-verified (§11.2 Q3 caveat). Aware, not acting; revisit if the app
  ever goes truly private/intranet.
- **Geolocation friction** — permission denial or poor accuracy degrades the
  core flow; need a graceful manual-location fallback.

### 11.2 Open questions (non-blocking)

1. **"Go-able" semantic — ✅ SETTLED 2026-06-26; REWORKED to a traffic light
   2026-06-29 (owner design pass).** Go-able = a real dinner option, a
   **🟢/🟡/🔴 band** keyed on **kitchen close** (when they stop serving), not
   the posted door-close: 🟢 arrive before kitchen close · 🟡 arrive after
   kitchen close but ≤ posted close (cutting it close) · 🔴 arrive after posted
   close or before open (hidden, search-reachable). **Kitchen close** by
   precedence: per-place circle **override** (`closeBufferMin` = min before
   posted; Baroni's 0, Matt's 15) > Google **KITCHEN** secondary hours > else
   **posted − 45** (`DEFAULT_KITCHEN_BUFFER_MIN`, the unknown default). Arrival
   `n` via **Now / +15 / +30 / +60** chips (default **+15**) **plus per-place
   drive time** (Routes, §11.2 Q9). Evaluated in the place's local time;
   defensive past-midnight wrap; never merge lunch/dinner periods; hours-
   unknown places shown (non-actionable badge), not excluded. **Dropped from
   the original:** the "meal must finish before close" requirement — being
   seated before kitchen close suffices (Baroni's at 7:30 was wrongly excluded
   by it). Folded into §3 / §5 / §6 / §7 / §8.
2. **Places API surface — ✅ largely RESOLVED 2026-06-26 (fact-finder,
   high confidence, cited).** Use **Places API (New) v1**;
   `regularOpeningHours.periods[]` (Point: day 0–6, hour, minute; 24h omits
   `close`) carries the data; KITCHEN exists in `secondaryHoursType` but is
   **sparse** (best-effort, never the foundation). `currentOpeningHours`
   (holiday-aware, ~7 days) was a v1 deferral, **shipped post-v1 2026-06-29**:
   the mapper now prefers it over `regularOpeningHours` (fallback when
   absent/empty). Same **Enterprise** SKU as `regular*` (re-verified against
   the data-fields doc, 2026-06-29) — no cost change. Remaining: only live
   cost-ceiling validation, now handled by the §8 quota cap.
   Citations: `developers.google.com/maps/.../rest/v1/places`,
   `.../data-fields`, `.../billing-and-pricing/pricing`.
3. **Caching ToS — ✅ SETTLED 2026-06-28 (fact-finder, cited).** Maps
   Platform Terms §3.2.3 "No Caching": you may **not** pre-fetch, cache, or
   store Maps **Content** outside the live Service, with two exceptions —
   **Place IDs** (store **indefinitely**; refresh ~12 mo, free via Place
   Details `fields=id`) and **lat/lng** (cache **≤30 days**, then delete).
   Everything else panda shows — **`displayName`, `regularOpeningHours`,
   `types`, `rating` — must NOT be cached/stored; re-hydrate on demand.**
   So: **(a)** the `{placeId, name}` snapshot — store the **ID only**;
   re-hydrate the name via Place Details (`fields=id,displayName`) when
   rendering history. **(b)** the **aggressive list-caching idea is not
   viable** — caching the result with hours and re-polling monthly is
   exactly what's forbidden; the legit savings are storing **Place IDs**
   (skip repeat *searches* for the circle's known set) + tight field masks
   on Details, **not** content caching. **Private/family use grants NO
   carve-out** — §3.2.3 applies flat (and Google's terms separately
   discourage firewall-/intranet-/closed-community-only deployments without
   written permission — see §11.1; panda is a public-URL PWA so likely not
   "internal-network-only," but the wording is worth a glance). Session-
   scoped in-memory caching is fine. Cites: Maps Platform Service Specific
   Terms §3.2.3 (`cloud.google.com/maps-platform/terms/maps-service-terms`),
   `developers.google.com/maps/optimize-web-services`, `.../places/web-service/policies`,
   `.../places/web-service/place-id` (all as-of 2026-06-26). _Caveat: the
   verbatim §3.2.3 wording came via a mirror (Google's page truncates under
   fetch) — eyeball it directly before any formal reliance; an EEA variant
   may govern EEA users._
   **(c) Favorites snapshot — owner posture, accepted 2026-06-28 (eyes-open
   step over the letter, inside the spirit).** Strict ToS would have even a
   favorite store ID-only + re-hydrate. The owner accepts a **bounded
   exception**: a place the user **explicitly favorites** stores a
   `{placeId, name, hours, snapshotAt}` snapshot copied from Maps, so
   "favorite" is one tap (no retyping). Guardrails that keep it inside the
   spirit (Google's concern = don't hoard data to avoid calling them / build
   a rival dataset — neither applies here): **favorites only** (never the
   discovery list, no bulk preload, no scraping); the snapshot is a
   **fallback + drift-detection baseline**, not the freshness source —
   **re-poll live on a short interval** ("open now" is always live); minimal
   fields, stamped `snapshotAt`. Place ID is the identity anchor: a
   successor business gets a **new** Place ID, so circle content never
   follows new ownership; a live name ≠ snapshot name flags drift.
   **Reversible** — back out to ID-only + live re-hydration if Maps quota
   proves a non-issue (§13.3). Encoded in AGENTS.md guardrails + §5
   (SavedPlace). Discovery/history caching is unchanged ((a)/(b) above).
4. **Circle bootstrap — ✅ SETTLED 2026-06-28.** v1 **hardcodes the
   circle's emails directly in `firestore.rules`** (leanest for a tiny
   fixed circle); there is **no** Firestore Membership collection. Adding/
   removing a member = edit the rules + redeploy. Supersedes the
   Membership-as-data sketch in §5/§6 for v1. Invite-link onboarding (and
   a Firestore Membership entity) remain a **later chamber**.
5. **Roulette UX:** plain random pick vs. animated spin; any weighting by
   notes/visits? _(proposed: plain random, no weighting, v1)_
6. **Offline scope:** what must work without network — app shell only, or
   cached recent visits / notes too?
7. **Override granularity — DESIGN REFINED 2026-06-30 (owner).** Replace the
   single `closeBufferMin` delta with **"the latest we can walk in," one
   absolute clock time per day-of-week** (Mon–Sun, each optional) — that time
   is the kitchen-close / 🟢→🟡 line. Per-day, **not** per-meal (one daily
   cutoff is what dinner discovery needs); absolute, not a delta (matches local
   knowledge, sidesteps a wrong posted close). Captures Home Team (late Fri/Sat
   bar), early-close Sundays. v1 still ships the single delta; this is the
   planned follow-on (fleshed out in BACKLOG). _(Was: single delta vs
   per-day/per-meal — answered.)_
8. **Unknown-place kitchen buffer:** keep the single 45-min default
   (posted − 45 ⇒ the 🟢→🟡 line), or vary by cuisine (fast ~30 / slow ~60)?
   _(v1: fixed 45 — no reliable fast/slow signal yet. For **known** places the
   `closeBufferMin` override already records the real kitchen close.)_
9. **Departure buffer + per-place travel time (future request,
   2026-06-26):** reinterpret the when-chip as "when do we want to *leave*"
   and add per-place travel time, so arrival is computed per place —
   `arrival(place) = now + departure_buffer + travel_time(place)` — then
   band it by the §3 traffic light. Worked example: 7:00 now, leave in 15, a
   place 30 min away → arrival 7:45; 🟢 if 7:45 is before its kitchen close,
   🟡 if after but still before posted close. **Travel estimate options:**
   (a) _lean_ — derive from the straight-line distance already returned by
   Nearby Search ÷ an assumed
   speed; no extra API call; rough but captures far-vs-near; (b) _accurate_
   — Routes / Distance Matrix per place (real walk/drive time, traffic) but
   a separate billed SKU × up to 20 places. UX shift: the home chip relabels
   to "leave in…", and each card shows its own arrival.
   **Refinement (owner, 2026-06-28 — lives near a river):** straight-line
   distance can be **actively misleading**, not just imprecise — a place
   1.8 km crow-flies may be 20 min away because you must detour to a bridge.
   That **defeats lean option (a)** (it's derived from the same crow-flies
   number), so for users near a geographic barrier (river/highway/water)
   only **(b) real routing** delivers the value. Two separable scopes: (b1)
   _display_ travel time alongside distance ("1.8 km · ~20 min" — both true,
   the owner's words) without changing go-ability; (b2) _feed_ travel time
   into the per-place arrival calc above. (b1) is the smaller, shippable
   first step; both carry the Routes/Distance-Matrix per-place cost (weigh
   vs the §8 quota — batch ≤20, cache per session). **SHIPPED 2026-06-29**
   (owner chose **b1+b2**, **Essentials** tier): Compute Route Matrix (DRIVE,
   TRAFFIC_UNAWARE — no live traffic), one call per ≤25-place batch, cached
   per session by placeId, from the user's GPS; chip relabelled "leave in…",
   cards show "~N min", filter uses per-place arrival. Cost ~free (Compute
   Route Matrix Essentials $5/1k elements, **10k free/mo**). Degrades to
   chip-only until the Routes API is enabled. `src/lib/travel.ts`.
10. **Beyond the nearest 20 — expand radius / "search this area" (owner,
    2026-06-28):** M2 does **one** Nearby Search (≤20, nearest-first, fixed
    radius) and the genre filter is **client-side over that set** — so a
    sparse genre (one pizza place in the nearest 20) shows only what was
    fetched, not "all pizza open nearby." Options, all **user-triggered** to
    respect §8 (one billed call per explicit action, never auto-fanout):
    (a) a **"wider"** control → re-search at a larger radius; (b) Maps-style
    **"search this area"** → re-center on the panned map (depends on the map
    fast-follow); (c) **genre-scoped search** → tapping an under-covered
    genre fires a fresh Nearby Search `includedTypes:[that type]`. Note:
    Places API (New) `searchNearby` has **no page token** (hard cap 20) —
    more results means a new call (bigger radius / recenter) or switching
    that query to **Text Search** (paged, supports a type). Keep it
    explicit and quota-aware (50/day). _Later chamber._
11. **Eatery type coverage — which place types count (owner, 2026-06-29).**
    Discovery's Nearby Search filtered on `includedTypes: ['restaurant']`,
    which **misses food places Google doesn't tag `restaurant`** — bagel
    shops, coffee shops, bakeries. Decision: search **`restaurant` + `cafe` +
    `bakery`** (Table A searchable types). Guiding examples (owner's
    "should-be-a-hit" set — `primaryType` · how it's caught): **Ireland's Own
    / Jägerhaus Pub** `bar_and_grill` · already in via `restaurant`; **Cafe
    Charlotte** `cafe` · already in via `restaurant`; **Kudu Coffee**
    `coffee_shop` · needs `cafe`; **Ruby's NY Bagels** `bagel_shop` · needs
    `bakery`. Verified live: adding `cafe` + `bakery` pulls Kudu, a pâtisserie,
    and a café into the nearest-20 downtown. **No `bar`** — food-serving pubs
    already carry `restaurant` (Ireland's Own proves it); a bare `bar` would
    only add pure bars that don't serve food. **No `meal_takeaway`** — no
    example needs it. **Living set:** when a should-be-hit is missed, look up
    its types and extend here. **Ripple — Text Search (add-by-name +
    genre-scope):** `searchText`'s `includedType` is **singular**, so the
    multi-type set can't ride in the request; honor the same set by dropping
    `includedType` / `strictTypeFiltering` and **client-side-filtering** to
    results whose `types` intersect the set (also a sturdier fix for the
    "Amalfi returned non-restaurants" leak). Encode the set as one shared
    constant so both surfaces + this list stay in sync. **SHIPPED 2026-06-29:**
    `EATERY_TYPES` in `places.ts` drives Nearby `includedTypes` + the Text
    Search client-side filter. Verified live: Kudu / a pâtisserie / a café
    enter the nearest-20 downtown; "Ruby's" is now addable by name (6 hits,
    was 0); a hotel query returns 0.

---

## 12. Implementation guidance for coding agents

- Read **§5 (data model)** and **§6 (access control)** before writing any
  data-access or rules code; the access table maps 1:1 to Firestore rules.
- The **go-able filter** is settled (§3 / §11.2 Q1): a 🟢/🟡/🔴 band keyed on
  **kitchen close** = `closeBufferMin` override > KITCHEN secondary hours >
  posted − 45 (`DEFAULT_KITCHEN_BUFFER_MIN`); 🟢 arrive before kitchen close,
  🟡 between kitchen and posted close, 🔴 after posted / before open (dropped).
  Arrival = `now + chip + drive`; place-local time; defensive past-midnight
  wrap; never merge lunch/dinner periods; `evaluateGoable` is pure. Keep chip
  re-filtering client-side (§8).
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
- **Maps quota proves a non-issue** (comfortably under the daily cap with
  favorites live-re-hydrated) → **back out the favorites snapshot**
  (§11.2 Q3c) to strictly ToS-clean ID-only + live re-hydration. The
  snapshot exists to keep a free app free; if calls are cheap, drop it.
  _Keep half an eye on consumption to know._
- The "circle" outgrows "small / fixed" (open signups or multiple groups) →
  revisit auth, scale, and this whole posture.

---

End of v1 draft. Open questions (§11.2) settle via
design-conversation-or-fact-finder → update-PRD as they come up.
