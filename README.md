# ⚛️ Physix Book

An interactive, multilingual physics textbook: chapters with prose and
equations on the page, live animated simulations with parameter controls
embedded in the narrative. See [PLAN.md](./PLAN.md) for the full roadmap.

**Status: curriculum complete** — 17 chapters (EN + PL), 18 interactive
simulations spanning mechanics, waves, E&M, DC circuits, magnetism,
optics and vision — with live graphs, presets, draggable objects,
shareable setups (🔗), audible beats, exercises with hidden solutions,
full-text search. 176 unit tests + 41 Playwright E2E tests.
See [PLAN.md](./PLAN.md) and [CONTENT-ROADMAP.md](./CONTENT-ROADMAP.md).

Authoring guides: [write a chapter](./HOW-TO-WRITE-A-CHAPTER.md) ·
[add a simulation](./HOW-TO-ADD-A-SIMULATION.md)

## License

[MIT](./LICENSE) © 2025 Bartosz Sosnowski — covers all code and content in
this repository. Fork it, translate it, teach with it; just keep the
license notice.

## Deploying

Push to GitHub and enable **Settings → Pages → Source: GitHub Actions**;
`.github/workflows/deploy.yml` builds with the repo base path and adds an
SPA fallback. CI (`.github/workflows/ci.yml`) runs the i18n check, unit
tests and the full Playwright suite on every push/PR.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + static build to dist/
npm test           # vitest (physics models + manifest)
npm run test:e2e   # Playwright against the production build
npm run i18n:status          # translation report
npm run i18n:status -- --check   # CI mode (fails on missing keys)
```

## Layout

```
content/{en,pl}/chapters/*.mdx   # book content, mirrored per locale
locales/{en,pl}/{ui,sims}.json   # UI + simulation strings (i18next)
vite/chapter-manifest.ts         # virtual:chapters + virtual:chapter-loader
src/app/                         # shell: sidebar, reader, routing, theme
src/i18n/                        # locale config, detection, Intl formatting
scripts/i18n-status.ts           # missing/stale translation report
```

## Writing a chapter

Create `content/en/chapters/03-energy.mdx`:

```mdx
---
slug: energy
order: 3
title: Energy
description: Work, kinetic and potential energy.
sections:
  - id: work
    title: Work
---

# Energy

Prose with math: $E_k = \tfrac{1}{2}mv^2$.
```

The sidebar, routes (`/en/chapter/energy`) and prev/next links update
automatically. `slug` is the canonical, locale-neutral ID.

## Translating a chapter

1. Copy the English file to `content/<locale>/chapters/` (same filename).
2. Translate frontmatter `title`, `description`, `sections[].title` and prose.
   **Do not touch** math (`$…$`), JSX tags, or the `slug`.
3. Run `npm run i18n:status`, copy the reported hash into the frontmatter as
   `sourceHash: <hash>`. This marks which English version you translated;
   the script warns when the source changes afterwards.

Missing chapters fall back to English with a banner — partial translations
are always shippable. UI/sim strings live in `locales/<locale>/*.json`;
missing keys there are CI errors.
