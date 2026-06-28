# panda — M1: infrastructure (ops dispatch)

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Ops dispatch (no app code). Stands up panda's cloud infrastructure: a
new Firebase / GCP project under the **shared** billing account, Google
Auth, Firestore (deny-all), Hosting, and the Google Maps Platform key
(Places API New) behind a **hard daily quota cap**. High-friction by
nature (kit M1 — budget 2–4× a normal dispatch); console-driven by the
owner. **Run past the route7 nautilus first** (cross-consult).

---

## 0. Before you start — leverage the canonical runbook

The common Firebase steps (project create, OAuth consent, Google
sign-in, the **three** authorized-domains lists, Firestore, Hosting,
web-app config capture) are fully documented and rake-cataloged in
flog's runbook — route7/flog already stepped on every rake:

`../flog/dispatch/runbooks/gcp-firebase-env-setup.md` (sibling repo on
the owner's machine)

**Follow it for those steps.** THIS doc covers only panda's **deltas**
from that runbook plus panda's specific values. The hardest rakes are
inlined in §6 so you won't be blind if you don't open it — but open it.

This dispatch goes to the **route7 nautilus for review before
execution** (kit README "Cross-nautilus consultation"). Document every
brief-vs-reality deviation as you go (§8) — M1's handoff "Deviations"
section earns its keep more than any other dispatch's.

---

## 1. What's different for panda (deltas from flog's runbook)

panda needs Google Maps Platform; flog did not. Three consequences.

### Δ1 — Billing IS required (and it's the shared account)

flog stayed on Spark (no billing attached). **panda cannot** — Maps
Platform requires a Cloud Billing account on the project.

- **Requirement:** panda's GCP project is linked to the owner's
  **personal** Cloud Billing account — the **same** account route7 uses
  ("shared" in §8 terms). Decision: PRD §8, §13; route7's Enterprise
  Places usage is ~0, so combined stays under the 1,000 free Enterprise
  calls/mo. _Linked 2026-06-28._
- Attaching billing puts Firebase on the **Blaze** (pay-as-you-go)
  plan. Expected and fine — Firestore / Auth / Hosting free-tier
  allotments still apply; you only pay past them.
- ⚠️ This **inverts** flog's "never accept a billing prompt; Spark
  suffices" rake. For panda you DO attach billing — but to the shared
  account, and you cap spend with quotas (Δ3), not by withholding
  billing.
- **Current path** (verify): `console.cloud.google.com` → Billing →
  link panda's project to the existing billing account.

### Δ2 — Enable Maps Platform + a referrer-restricted key

- **Requirement:** "Places API (New)" is enabled on panda's project,
  and a **browser API key** exists, restricted by HTTP referrer to
  panda's domains and scoped to only the Places API (New) (plus Maps
  JavaScript API if the map view uses it). An unrestricted key is a
  cost-abuse hole on a shared card.
- Key restrictions (load-bearing):
  - **Application restriction:** HTTP referrers = `http://localhost:5173/*`,
    `https://<project-id>.web.app/*`, `https://<project-id>.firebaseapp.com/*`
    (add the custom domain later if/when one exists).
  - **API restriction:** Places API (New) [+ Maps JavaScript API if the
    map uses it]. Nothing else.
- Store the key in the env file (`VITE_GOOGLE_MAPS_API_KEY=…`),
  gitignored.
- **Current path** (verify): APIs & Services → Library → "Places API
  (New)" → Enable; then APIs & Services → Credentials → Create
  credentials → API key → Restrict key.

### Δ3 — Hard daily quota cap on Places (the real cost ceiling)

- **Requirement:** panda's project has a **per-day request cap** on the
  Places API (New) so a runaway client cannot blow past the free
  Enterprise allotment and bill the shared card. The quota is the hard
  stop (calls 429 at the cap, not billed); a project-scoped budget is
  only the email alert.
- Set a conservative daily cap (start ~50/day ≈ ~1,500/mo headroom for
  a small circle; tune later). 429 at the cap is acceptable for a
  family app.
- **Current path** (verify): APIs & Services → Places API (New) →
  Quotas & System Limits → set "Requests per day". Also Billing →
  Budgets & alerts → a project-scoped budget alert.
- Rationale: PRD §8, §13.3. Quotas are per-project; budgets are
  per-billing-account but scopable to one project.

---

## 2. Standard Firebase steps — panda values

Do flog runbook Phase 1 steps 1–8 with these panda specifics, heeding
the inlined rakes (§6):

- **Project ID:** decided — **`panda-bamboo-lane`**. **Manually edit the
  ID field** to this exact value (GCP auto-suffixes otherwise; IDs are
  immutable).
- **Analytics:** OFF (PRD §1.4).
- **OAuth consent:** External, **Testing** mode, **no logo**, support
  email = a Google-managed mailbox (no forwarding alias), test users =
  the circle's Gmails. [OWNER SUPPLIES emails]
- **Google sign-in:** enabled (Security → Authentication).
- **Three authorized-domains lists** (Firebase Auth · OAuth Consent
  Branding · OAuth Client) — all required; missing one breaks sign-in
  silently. Redirect URIs MUST carry the `/__/auth/handler` suffix.
- **Firestore:** production mode, deny-all default rules, location =
  `nam5` (US multi-region). [OWNER CONFIRMS region]
- **Hosting:** initialize; do NOT run the suggested CLI; hand-author
  config files.
- **Register a Web app;** capture `firebaseConfig` + the OAuth Web
  Client ID into a gitignored `dispatch/M1-g-outputs.md`.
- ⚠️ **authDomain rake:** set `VITE_FIREBASE_AUTH_DOMAIN` to
  `<project-id>.web.app` (NOT `firebaseapp.com`) — Chrome storage
  partitioning breaks the `firebaseapp.com` default silently.

---

## 3. Code-side wiring (companion — lands with code, not pure ops)

This part is code; it rides with the app-scaffold / auth dispatch, not
the console work. Reuse flog's patterns:

- Firebase init module reading `VITE_FIREBASE_*` (omit `measurementId`;
  no analytics).
- `GoogleAuthProvider` with
  `setCustomParameters({ prompt: 'select_account' })`; `console.error`
  any `getRedirectResult` rejection (flog M2 rakes, §6).
- **Allowlist gate** — **v1 hardcodes the circle's emails in
  `firestore.rules`** (settled 2026-06-28, PRD §11.2 Q4); no Firestore
  allowlist collection. A rules helper (e.g. `isMember()` checking
  `request.auth.token.email in [<emails>]`) gates every circle read/
  write; the client routes non-allowlisted users to a "not on the list"
  screen (probe-read failure or a mirrored client-side list). This is
  M1's auth portion per PRD §10 — its own small code dispatch right after
  the app scaffold.
- `firestore.rules` — per the PRD §6 access table (User, Note, Visit,
  PlaceOverride; **no Membership collection in v1** — allowlist is the
  hardcoded `isMember()` helper above; NoGo is a later chamber).
  Deny-all baseline + per-entity allows; emulator rules tests, one per
  table row (AGENTS.md).
- `.firebaserc` + `firebase.json` hand-authored; an `npm run deploy`
  script that chains build → `firebase use` → `firebase deploy
  --only hosting`.

---

## 4. Owner inputs (decide at execution)

- [x] **Project ID** — `panda-bamboo-lane`.
- [ ] **Firestore region** (default `nam5`).
- [ ] **Circle allowlist** — the family's Google-account emails.
- [x] **Billing:** linked to the owner's personal Cloud Billing account
  (the account route7 uses; "shared" per §8). _2026-06-28._
- **Custom domain:** NOT in M1. Default `<project-id>.web.app` for v1;
  a custom domain is a later chamber (flog flags it as multi-rake —
  Cloudflare DNS, cert, re-doing all three domain lists + redirect
  URIs).

---

## 5. Verification — M1 is done when

- panda's project exists under the **shared** billing account; no
  unexpected Blaze nags.
- **Places API (New)** enabled; key is referrer- + API-restricted;
  **daily quota cap** set; budget alert set.
- **Auth:** Google enabled; all three domain lists populated; redirect
  URIs carry `/__/auth/handler`.
- **Firestore:** production, deny-all, correct region.
- **Hosting:** `<project-id>.web.app` resolves (even a placeholder).
- `firebaseConfig` + Maps key captured into the gitignored env file +
  `dispatch/M1-g-outputs.md`.
- (End-to-end sign-in verifies once the auth code lands — §3.)

---

## 6. Rakes — the ones that bite hardest (inlined from flog)

- **GCP auto-suffix on Project ID** — manually edit the ID field;
  IDs are immutable.
- **Billing inversion (panda-specific)** — you DO attach billing, to
  the shared account; cap spend via quotas, not by withholding it.
- **GCP project-count ceiling (hit 2026-06-28)** — accounts cap active
  projects (owner hit a default of ~5). Creating a new project needed a
  quota-increase request **and** deleting a defunct project first. Has
  lead time; not instant. _Limit since raised to 15 (2026-06-28)._
- **Unrestricted Maps key = cost hole** — referrer + API restrictions
  are mandatory, especially on a shared card.
- **Three authorized-domains lists** — all required; missing one
  breaks sign-in silently.
- **`/__/auth/handler` suffix** on every OAuth redirect URI — silent
  killer if omitted.
- **OAuth Consent Authorized Domains reject apex + `localhost`** —
  use project-prefixed FQDNs only.
- **Logo upload triggers brand verification** — none in Testing mode.
- **`authDomain` must be `<project-id>.web.app`** — the
  `firebaseapp.com` default breaks silently on Chrome.
- **`prompt: 'select_account'`** on the Google provider — else users
  can't switch accounts and rejection-recovery loops.
- **Don't swallow `getRedirectResult` rejections** — `console.error`
  them in prod.
- **`measurementId` emitted but omitted** from app code (no analytics).
- **UI drift is constant** — follow requirements, not dated paths.

---

## 7. Step-by-step execution checklist (where to go, what to do)

The ordered end-to-end path. The work hops between **two** consoles — the
**GCP Cloud Console** (`console.cloud.google.com`) and the **Firebase
Console** (`console.firebase.google.com`) — so each step is tagged with
which one. Paths come from flog's runbook (dated 2026-05-25, §0) plus
panda's Maps/billing deltas (§1). **UIs drift — if a label has moved,
trust the requirement, not the breadcrumb.** Throughout, `<id>` is the
Project ID **`panda-bamboo-lane`** (so `<id>.web.app` =
`panda-bamboo-lane.web.app`). Tick each box as you go.

### 7.0 · Pre-flight

- [x] `firebase` CLI present (15.18.0) + Node ≥ 20 (v26). ⚠️ Still do
  `firebase login` with the **right** Google account before deploy.
- [x] panda repo open locally; create a gitignored
  `dispatch/M1-g-outputs.md` to paste captured values into. ✅
- [x] §4 decisions in hand: Project ID (`panda-bamboo-lane`), Firestore
  region (`nam5`), the circle's Gmails, confirm the **shared** billing
  account. Project ID is decided: **`panda-bamboo-lane`**.

### 7.1 · GCP — project + shared billing  (Δ1)

- [x] **[GCP]** `console.cloud.google.com/projectcreate`. Name = `Panda`
  (display only). **Click Edit on the Project ID and type it manually**
  as **`panda-bamboo-lane`**; it must read "✓ Available". Org: none
  (personal). Create. ✅ Done — ID confirmed (no auto-suffix).
  ⚠️ Don't skip the manual edit — GCP appends a permanent 6-digit
  suffix and IDs are immutable.
  ⚠️ **Project-count ceiling (hit 2026-06-28):** GCP caps active
  projects per account (owner hit a default of ~5). Creating panda
  needed a quota-increase request **and** deleting a defunct old
  project first — not instant; budget the lead time. _Resolved: limit
  raised to **15** (approved 2026-06-28) — headroom for a while._
- [x] **[GCP]** Billing → **Link a billing account** → the owner's
  **personal** Cloud Billing account (the same one route7 bills to — the
  "shared" account in §8 terms). This moves Firebase to **Blaze**
  (expected; Maps requires it — free-tier allotments still apply).
  ✅ Done.
  ⚠️ This inverts flog's "never attach billing" rake: here you DO
  attach it and cap spend via quotas (7.4).

### 7.2 · Firebase + Auth — consent, sign-in, the THREE domain lists

- [x] **[Firebase]** `console.firebase.google.com` → Add project → **Add
  Firebase to a Google Cloud project** → pick `panda-bamboo-lane`.
  **Analytics: OFF** (PRD §1.4). Add Firebase. ✅ Done 2026-06-28.
  ℹ️ Because billing is already linked (7.1), Firebase offers **only**
  the **Blaze / Pay-as-you-go** plan — no Spark choice to make. Expected
  (Δ1); free-tier allotments still apply, cost is capped at 7.4.
- [x] **[GCP]** APIs & Services → **OAuth Consent Screen**. ✅ Done
  2026-06-28. Current flow (drifted from flog's 2026-05-25 runbook):
  - **Get started** wizard collects only **User type = External** + the
    **support email** (a real Google mailbox; no forwarding alias).
  - **Branding** sub-screen: **publishing status `Testing`** and **no
    logo** are both the **defaults** — just verify, don't change. (A
    logo upload would trigger brand verification; that's why we leave it.)
  - **Audience** sub-screen: add every circle Gmail as a **test user**
    (≤100). Leave scopes default.
- [x] **[Firebase]** Security → Authentication → Get started → Sign-in
  method → **Google → Enable** (support email matches above). This
  auto-creates the OAuth Web client used just below. ✅ Done 2026-06-28.
- [x] ⚠️ **Three authorized-domains lists — all required; a missing one
  breaks sign-in silently:** ✅ all three done 2026-06-28.
  - [x] **[Firebase]** Authentication → Settings → **Authorized
    domains**: `localhost`, `<id>.firebaseapp.com`, `<id>.web.app`
    (pre-filled correctly — verified all three).
  - [x] **[GCP]** OAuth Consent → **Branding** → **Authorized domains**:
    `<id>.web.app`, `<id>.firebaseapp.com` (added the two FQDNs)
    (⚠️ apex domains + `localhost` are rejected — FQDNs only).
  - [x] **[GCP]** OAuth Consent → **Clients** → open the auto-created Web
    client:
    - JS origins: `http://localhost:5173`, `https://<id>.web.app`,
      `https://<id>.firebaseapp.com`
    - Redirect URIs — ⚠️ **`/__/auth/handler` suffix on every one**:
      `http://localhost:5173/__/auth/handler`,
      `https://<id>.web.app/__/auth/handler`,
      `https://<id>.firebaseapp.com/__/auth/handler`

### 7.3 · Firebase — Firestore, Hosting, Web app

- [x] **[Firebase]** Databases → Firestore → Create database → location
  `nam5` → **production mode** (not test mode) → leave the deny-all
  default rules. ✅ Done 2026-06-28. (Order: the wizard asks **location
  before** mode.)
- [x] **[Firebase]** Hosting & Serverless → Hosting → Get started → click
  through. ⚠️ **Do NOT run the suggested CLI** (`firebase init/deploy`)
  — config is hand-authored later. Continue to console; verify
  `<id>.web.app` + `<id>.firebaseapp.com` are listed. ✅ Done 2026-06-28
  — both domains listed.
- [x] **[Firebase]** gear → Project settings → General → Your apps → Web
  (`</>`). Nickname `panda`; **do NOT** tick "also set up Firebase
  Hosting" (re-enters the CLI flow). Register, then copy the whole
  `firebaseConfig` into `dispatch/M1-g-outputs.md`. ✅ Done 2026-06-28
  (config captured; `measurementId` correctly absent — Analytics off).
- [x] **[GCP]** Also copy the **OAuth Web Client ID** (OAuth Consent →
  Clients) into the same file. ✅ Done. ⚠️ When wiring the env (§7.5),
  set `VITE_FIREBASE_AUTH_DOMAIN=<id>.web.app` — the captured config's
  default `.firebaseapp.com` is the Chrome storage-partitioning rake.

### 7.4 · GCP — Maps API, restricted key, cost controls  (Δ2, Δ3)

- [x] **[GCP]** APIs & Services → Library → **"Places API (New)"** →
  Enable. (Also enable **Maps JavaScript API** only if the map view
  uses it.) ✅ Done 2026-06-28.
- [x] **[GCP]** APIs & Services → Credentials → Create credentials → API
  key, then **Restrict key** (mandatory on a shared card): ✅ Done
  2026-06-28 — key captured in gitignored `dispatch/M1-g-outputs.md`.
  - Application restriction → **HTTP referrers**: `http://localhost:5173/*`,
    `https://<id>.web.app/*`, `https://<id>.firebaseapp.com/*`
  - API restriction → **Places API (New)** [+ Maps JS API if used].
    Nothing else.
- [x] **[GCP]** APIs & Services → Places API (New) → Quotas & System
  Limits. ✅ Done 2026-06-28 — capped the two panda uses to 50/day;
  unused-method hardening **deferred** until the app is verified working
  (BACKLOG). ⚠️ The New API exposes **per-method** daily quotas (one row
  per RPC), **not** a single global "Requests per day". Cap the methods
  panda actually uses to ~**50/day**:
  - **`SearchNearbyRequest` per day → 50** ⭐ — this is Nearby Search,
    the one-per-screen-load core call (§8). The one that matters.
    (default was 75,000.)
  - **`GetPlaceRequest` per day → 50** — Place Details, single
    saved-place re-hydration only (§8). (default was 125,000.)
  - _Optional hardening on the shared card:_ the key is API-restricted to
    Places (New) but **not method-restricted**, so a leaked key could
    still hit other RPCs. Set the per-day quotas panda never calls
    (`SearchTextRequest`, `GetPhotoMediaRequest`) low/0 to shrink the
    blast radius. (`SearchMediaRequest` / `SearchReviewPostsRequest` show
    "Unlimited" — can't take a number; skip.)
  This is the hard ceiling — calls 429 at the cap rather than billing.
- [x] **[GCP]** Billing → Budgets & alerts. ✅ Satisfied 2026-06-28 by an
  existing **account-wide $5 budget** (covers every project on the shared
  billing account, panda included — has never fired). No separate
  project-scoped budget created. Note: it's a *combined*-spend tripwire,
  so the per-method **50/day quotas** above are panda's real per-project
  stop.

### 7.5 · Code-side wiring (rides with the app — see §3, not pure ops)

✅ **Authored 2026-06-28** (nautilus, commit `281cef7`); gates green
(typecheck/lint/unit/build + 20 emulator rules tests). Remaining boxes are
the owner's deploy + live check.

- [x] `.env.local` from the captured config — `VITE_FIREBASE_AUTH_DOMAIN`
  = `<id>.web.app` (the rake), `VITE_GOOGLE_MAPS_API_KEY` added,
  `measurementId` omitted. Committed `.env.example` as the template.
- [x] `.firebaserc` + `firebase.json` (hosting SPA rewrite + firestore +
  emulator) hand-authored; `npm run deploy` (build → deploy
  hosting,firestore:rules) + `npm run test:rules`.
- [x] `src/lib/firebase.ts` (provider `prompt: 'select_account'`,
  `measurementId` omitted), the auth gate (`AuthProvider` + screens),
  the **hardcoded allowlist** (`src/lib/allowlist.ts` mirrors
  `isMember()`), `firestore.rules` per §6 + 20 emulator rules tests.
- [x] Circle allowlist finalized — 4 emails in **both**
  `src/lib/allowlist.ts` and `firestore.rules` `isMember()` (2026-06-28).
- [ ] **[OWNER]** `firebase login` (CLI present) → `npm run deploy`.
- [ ] **[OWNER]** §5 live check: visit `<id>.web.app`, sign in with an
  allowlisted Gmail, confirm you land in (and a non-listed account hits
  "not on the list").

Then close out per §8 (handoff + ARCHITECTURE draft + BACKLOG M1 → Done).

---

## 8. When you're done

- Capture every brief-vs-reality deviation (UI drift, new rakes) in the
  handoff `dispatch/M1-infra-handoff.md` — and fold them **back into this
  doc**. flog is done and no longer maintained; **this doc is now the
  living GCP/Firebase setup reference the next project reads** (don't
  edit flog's runbook).
- Draft `ARCHITECTURE.md` from what actually landed.
- Owner reviews + commits. **No agent commits.**
- Move M1 → Done in `dispatch/BACKLOG.md` with a summary line.

---

## Final note

Two failure shapes dominate M1: (1) silent auth breakage from a missing
domain-list entry or the `authDomain` default — work the §6 rakes
deliberately; and (2) an unrestricted or uncapped Maps key quietly
spending the shared card — Δ2 + Δ3 are not optional. Everything else is
forgiving; these two are not. When the console UI doesn't match a dated
breadcrumb, trust the **requirement**, not the path.
