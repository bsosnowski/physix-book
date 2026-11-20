# ⚛️ Physix Book

An interactive, multilingual physics textbook: chapters with prose and
equations on the page, live animated simulations with parameter controls
embedded in the narrative. See [PLAN.md](./PLAN.md) for the full roadmap.

**Status: M0 (skeleton)** — app shell, MDX + KaTeX pipeline, EN/PL i18n with
fallback, chapter navigation. Simulation framework arrives in M1.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + static build to dist/
npm test           # vitest
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
