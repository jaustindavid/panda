# panda — App scaffold handoff

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

Authored directly by the nautilus (no sub-agent dispatch — per project
memory the scaffold is small and self-contained). Stands up the repo's
code structure, build/lint/test toolchain, and the installable PWA shell
the discovery UI mounts into. **No backend** — runs entirely client-side.

## What landed

- **Stack:** React 19 + Vite 8 + TypeScript 6 (strict, project refs:
  `tsconfig.app.json` / `tsconfig.node.json`) + Tailwind v4 + PWA.
- **PWA:** `vite-plugin-pwa` (`registerType: 'autoUpdate'`, `devOptions`
  on so installability is verifiable in `npm run dev`). Generates
  `sw.js` + `manifest.webmanifest` at build. Manifest: dark theme
  (`#0f172a`), `standalone`, portrait, SVG icons.
- **App shell:** `src/components/AppShell.tsx` — mobile-first, centred
  `max-w-md` column, safe-area-aware full-height layout, header. `App.tsx`
  is a placeholder home; the M2 discovery flow replaces its body.
- **Styling:** Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config`,
  no PostCSS). `src/index.css` = `@import 'tailwindcss'` + dark-first +
  safe-area base.
- **Tooling:** ESLint v10 flat config (`no-explicit-any` held as
  **error** per AGENTS.md); Vitest (node env) with one smoke test.
- **Icons:** hand-authored SVG panda (`icon.svg`, `icon-maskable.svg`
  with safe-zone scaling, `favicon.svg`).
- **Docs/config:** `README.md`, `.claude/launch.json` (preview),
  `.gitignore` extended (`dev-dist/`, `*.tsbuildinfo`).

## Gates — all green

`npm run typecheck` ✓ · `npm run lint` ✓ · `npm run test:run` ✓ (1) ·
`npm run build` ✓ (PWA generated) · dev server boots, serves 200, no
console warnings/errors, shell renders (visually verified).

## Decisions made (lean defaults within the PRD-named stack)

- **`vite-plugin-pwa`** over a hand-rolled SW — conventional, Workbox
  precache, fewer rakes. The only dependency not explicitly named in the
  BACKLOG stack line; flagged here for visibility.
- **SVG manifest icons** over PNG — avoids an asset-generator dependency
  and binary files; Chrome installability accepts SVG. _Tripwire:_ iOS
  `apple-touch-icon` prefers PNG; if home-screen install on iOS looks
  wrong, add 180/192/512 PNGs (e.g. `@vite-pwa/assets-generator`) later.
- **Vitest** as the test runner now (not deferred) so M2's go-able filter
  tests — the non-negotiable suite (AGENTS.md) — have a home immediately.
- **Dark-first** (`color-scheme: dark`) — discovery is a street-corner,
  often-at-night flow (PRD §9 allows light/dark; not yet a design pass).

## Rakes hit

- **`eslint-plugin-react-hooks` v7 + ESLint 10:** the `recommended-latest`
  preset still ships `plugins` as a legacy **array** of strings, which
  ESLint 10 flat config rejects. Fix in `eslint.config.js`: register the
  plugin by hand (`plugins: { 'react-hooks': reactHooks }`) and spread
  only `...reactHooks.configs['recommended-latest'].rules`. Watch for
  this recurring in other paralarva repos on the same versions.

## Deferred (→ BACKLOG / future milestones)

- PNG/maskable raster icons + Lighthouse PWA pass (only if iOS install
  needs it).
- `src/lib/` go-able filter + its unit tests — **M2**.
- Bottom-nav / flow routing between discovery / visits / roulette — when
  there's more than one flow (M3+).
- Firebase init, auth/allowlist gate, Firestore rules — M1 + its code
  companion (M1-infra.md §3).

## Owner action

Review + commit (no agent self-commit, AGENTS.md). Suggested message:
`feat: app scaffold — Vite/React/TS/Tailwind v4 + PWA shell`.
`npm install` is needed before the gates run on a fresh checkout.
