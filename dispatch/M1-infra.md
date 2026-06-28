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
brief-vs-reality deviation as you go (§7) — M1's handoff "Deviations"
section earns its keep more than any other dispatch's.

---

## 1. What's different for panda (deltas from flog's runbook)

panda needs Google Maps Platform; flog did not. Three consequences.

### Δ1 — Billing IS required (and it's the shared account)

flog stayed on Spark (no billing attached). **panda cannot** — Maps
Platform requires a Cloud Billing account on the project.

- **Requirement:** panda's GCP project is linked to route7's
  **existing (shared)** Cloud Billing account. Decision: PRD §8, §13;
  route7's Enterprise Places usage is ~0, so combined stays under the
  1,000 free Enterprise calls/mo.
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

- **Project ID:** a globally-unique id — suggest `panda-ad` or
  `panda-<word>`. **Manually edit the ID field** (GCP auto-suffixes
  otherwise; IDs are immutable). [OWNER PICKS]
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
- **Allowlist gate** — a Firestore allowlist (a doc or small
  collection) seeded with the circle's emails; security rules require
  the requester's email ∈ allowlist for any circle data; the client
  routes non-allowlisted users to a "not on the list" screen. Reuse
  flog's `../flog/dispatch/M2-auth-allowlist.md`. This is M1's
  auth+allowlist portion per PRD §10 — fine as its own small code
  dispatch right after the app scaffold.
- `firestore.rules` — start from the PRD §6 access table (User,
  Membership, Note, Visit, PlaceOverride; NoGo is a later chamber).
  Deny-all baseline + per-entity allows; emulator rules tests, one per
  table row (AGENTS.md).
- `.firebaserc` + `firebase.json` hand-authored; an `npm run deploy`
  script that chains build → `firebase use` → `firebase deploy
  --only hosting`.

---

## 4. Owner inputs (decide at execution)

- [ ] **Project ID** (globally unique; suggest `panda-ad`).
- [ ] **Firestore region** (default `nam5`).
- [ ] **Circle allowlist** — the family's Google-account emails.
- [ ] **Confirm:** link panda to route7's shared billing account.
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

## 7. When you're done

- Capture every brief-vs-reality deviation (UI drift, new rakes) in the
  handoff `dispatch/M1-infra-handoff.md` — and fold panda-specific
  rakes back into this doc (and flog's runbook if broadly reusable).
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
