# How to write a chapter

Chapters are MDX files in `content/<locale>/chapters/`. English is the
source of truth; every other locale mirrors the same filenames/slugs.

## 1. Create the English file

`content/en/chapters/07-thermodynamics.mdx`:

```mdx
---
slug: thermodynamics        # canonical ID, shared by all locales, ASCII
order: 7
title: Thermodynamics
description: Heat, work and the laws that forbid free lunches.
sections:                   # sidebar deep-links; ids must match heading slugs
  - id: the-first-law
    title: The first law
---

# Thermodynamics

Prose in Markdown. Inline math $U = Q - W$, display math:

$$
\Delta U = Q - W
$$

## The first law

…
```

Heading ids are auto-generated: lowercase, diacritics stripped, non
letters/digits → `-` (e.g. "Rzut ukośny" → `rzut-ukosny`). Keep
frontmatter `sections[].id` in sync.

## 2. Available components

| Component | Purpose |
|---|---|
| `<Sim id="projectile" />` | Embed a simulation (see registry for ids). Optional: `params={{ g: 1.62 }}`, `autoplay`. |
| `<M v="angle">\theta</M>` | Inline math linked to a sim parameter — hover highlights the slider and vice versa. `v` = param key. |
| `<Exercise title="…">…<Solution>…</Solution></Exercise>` | Problem with a show/hide worked solution. |

Rules:
- One idea per section; derive, then simulate, then experiment.
- Every `<Sim>` gets 3–5 **guided experiments** ("set X, predict Y, verify").
- Prefer `<M>` for symbols the reader can actually control.
- Exercises: at least one per chapter, with a full `<Solution>`.

## 3. Translate

1. Copy the file to `content/pl/chapters/` (same filename).
2. Translate frontmatter `title`/`description`/`sections[].title` + prose.
   **Never touch**: `slug`, math, JSX tags/attributes, `<M>` contents.
3. `npm run i18n:status` → copy the reported hash into the translation's
   frontmatter: `sourceHash: <hash>`.
4. Untranslated chapters fall back to English with a banner — partial
   translations always ship.

## 4. Verify

```bash
npm run i18n:status -- --check   # keys + staleness
npm test                         # physics + manifest
npm run dev                      # eyeball both locales
npm run test:e2e                 # full UI suite
```

Sidebar, routes, prev/next, and search index update automatically from
frontmatter — no code changes needed for new chapters.
