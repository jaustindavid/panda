# panda

_© 2026 Austin David. Released under CC0 1.0 (public domain) — see LICENSE._

> panda is built with Claude (Anthropic) as a continuous collaborator.
> The PRD, ARCHITECTURE doc, and most code are produced via human-AI
> pairing — the planning docs are written dense and self-contained so a
> fresh Claude session can cold-read and contribute immediately.

A phone-first installable PWA that answers one question fast — _"where
can we eat right now?"_ — for a small fixed circle. See [PRD.md](PRD.md)
for the full spec and [AGENTS.md](AGENTS.md) before contributing code.

## Stack

React 19 · Vite · TypeScript (strict) · Tailwind v4 · PWA
(`vite-plugin-pwa`). Firebase (Auth / Firestore / Hosting) and Google
Maps Platform land with M1; the scaffold runs with **no backend**.

## Develop

```sh
npm install      # once
npm run dev      # dev server at http://localhost:5173 (SW enabled)
```

## Gates (all must pass before a handoff — AGENTS.md)

```sh
npm run typecheck   # tsc -b, strict
npm run lint        # eslint (flat config; no-explicit-any = error)
npm run test:run    # vitest (go-able filter tests land in M2)
npm run build       # tsc -b && vite build → dist/ (+ generated SW/manifest)
npm run preview     # serve the production build locally
```

Markdown gate: `npx markdownlint-cli2 "**/*.md"`.

## Structure

```text
index.html            entry; SVG favicon + theme-color
public/               icon.svg, icon-maskable.svg, favicon.svg
src/
  main.tsx            React root
  App.tsx             placeholder home (discovery flow replaces it in M2)
  index.css           Tailwind import + dark-first / safe-area base
  components/
    AppShell.tsx      mobile-first chrome every flow mounts into
  smoke.test.ts       proves the Vitest toolchain (delete in M2)
vite.config.ts        react + tailwind + PWA + vitest config
```
