# Physix Book — Interactive Physics Textbook

An interactive, browser-based physics book for teaching: chapters on the left,
rich text + equations in the middle, and **live animated simulations with
parameter controls** embedded directly in the narrative.

---

## 1. Goals & Non-Goals

### Goals
- Read like a book: linear chapters, sections, figures, equations, exercises.
- Every key phenomenon has an **interactive widget**: play/pause, reset,
  sliders/knobs for physical parameters, real-time animation.
- Equations rendered beautifully (LaTeX), ideally *linked* to the simulation
  (e.g. highlight the variable a slider controls).
- Content authored separately from code — a physicist/teacher can write a
  chapter in Markdown without touching simulation internals.
- **Multilingual from day one** — Polish and English at launch, structured
  so adding a language = adding a folder of translations, no code changes.
- Fast, offline-capable, deployable as a static site (no backend required).
- Extensible: adding a new simulation = one module + one line in a registry.

### Non-Goals (v1)
- User accounts, progress tracking, LMS features.
- 3D (start 2D; architecture leaves room for three.js later).
- Server-side rendering / SEO optimization (can migrate to Astro/Next later).
- Machine translation / translation-management SaaS integration (v1 is
  plain files in git; translators work with MDX + JSON directly).

---

## 2. Tech Stack

| Concern            | Choice                          | Why                                                        |
|--------------------|---------------------------------|------------------------------------------------------------|
| Build / dev        | **Vite + TypeScript**           | Fast HMR, static output, zero backend                       |
| UI                 | **React 19**                    | Component model fits "widget inside prose" perfectly        |
| Content            | **MDX** (`@mdx-js/rollup`)      | Markdown prose with embedded React components               |
| Math               | **KaTeX** (`remark-math` + `rehype-katex`) | Fast LaTeX rendering, `$...$` / `$$...$$` in MDX |
| Animation          | **HTML Canvas 2D + custom rAF loop** | Full control over physics & rendering; no framework lock-in |
| Physics engines    | Hand-rolled integrators first; **matter-js** optional for rigid-body chapters | Most teaching sims are 1–2 bodies or fields; custom code is clearer & exact |
| State (per widget) | React state + refs              | Params in React state; sim state in refs (no re-render per frame) |
| Global state       | **Zustand** (light)             | Chapter nav, theme, global "reduce motion" / units prefs    |
| Routing            | **react-router** (hash or history) | `/chapter/:slug` deep links, section anchors             |
| Styling            | CSS Modules or **Tailwind**     | Book-like typography, responsive sidebar                    |
| i18n (UI)          | **i18next + react-i18next**     | De-facto standard, lazy-loaded JSON catalogs, interpolation   |
| i18n (content)     | **Per-locale MDX files**        | Full translation freedom per chapter; fallback to English     |
| Testing            | **Vitest** (physics cores), Playwright (smoke) | Physics math must be unit-tested independently of UI |
| Deploy             | Static: GitHub Pages / Netlify  | Single `dist/` folder                                       |

**Key principle: separate the physics from the pixels.**
Each simulation is a pure TypeScript "model" (state + step function) with a
thin canvas "view" and a React "controls" wrapper. Models are testable and
reusable; views are swappable (canvas today, WebGL/three.js later).

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ App shell                                                    │
│ ┌────────────┐ ┌───────────────────────────────────────────┐ │
│ │ Sidebar    │ │ Reader                                    │ │
│ │ - TOC tree │ │  MDX chapter → prose + KaTeX + <Sim/>     │ │
│ │ - progress │ │  ┌─────────────────────────────────────┐  │ │
│ │ - search   │ │  │ SimulationWidget                    │  │ │
│ │            │ │  │  ┌───────────┐  ┌────────────────┐  │  │ │
│ │            │ │  │  │ CanvasView│  │ ControlPanel   │  │  │ │
│ │            │ │  │  │ (rAF draw)│  │ (sliders,btns) │  │  │ │
│ │            │ │  │  └─────┬─────┘  └───────┬────────┘  │  │ │
│ │            │ │  │        └── PhysicsModel ┘           │  │ │
│ │            │ │  │            (pure TS, step(dt))      │  │ │
│ │            │ │  └─────────────────────────────────────┘  │ │
│ └────────────┘ └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Layers

1. **Content layer** — `content/<locale>/chapters/*.mdx`
   - One directory per locale (`en/`, `pl/`), **mirrored structure**, same
     chapter slugs/filenames across locales — slug is the language-neutral ID.
   - Frontmatter: `title`, `order`, `sections`, `prerequisites` (translated).
   - Prose in Markdown, math in `$…$`, sims via `<Sim id="projectile" params={{...}} />`.
     **Sim ids, param names, and math are locale-neutral** — only prose and
     frontmatter differ between locales, so translations can't break sims.
   - Chapters are lazy-loaded (code-split per chapter **and** locale).
   - Missing chapter/section in a locale → fallback to `en` with a subtle
     "not yet translated" banner (fallback chain configurable per locale).

2. **Book shell** — `src/app/`
   - Sidebar TOC generated from a manifest built at compile time
     (Vite plugin scans frontmatter → `chapters.<locale>.json`).
   - Router, prev/next chapter navigation, keyboard shortcuts,
     responsive collapse (drawer on mobile), dark/light theme.
   - **Language switcher** in the header: switches locale while keeping the
     current chapter/section (slugs are shared). Choice persisted in
     localStorage; initial guess from `navigator.language`.

3. **Widget framework** — `src/sim/framework/`
   - `SimulationWidget`: generic host that resolves a sim `id` from the
     **registry**, wires model ↔ view ↔ controls, provides toolbar
     (▶/⏸, ⟲ reset, speed 0.25×–2×, step-once, fullscreen).
   - `useAnimationLoop`: fixed-timestep accumulator (physics at e.g. 120 Hz,
     render at display rate), pauses when off-screen (IntersectionObserver)
     and when tab hidden. Respects `prefers-reduced-motion`.
   - `ControlPanel`: schema-driven — each sim declares its parameters
     (`key`, symbol, unit, min, max, step, default) and gets sliders/inputs
     auto-generated. Symbols rendered with KaTeX to match the prose.
     **Labels are i18n keys** (`sim.projectile.param.angle`), never hardcoded
     strings — sim modules ship zero user-facing text.
   - Param changes apply **live** where physical (e.g. gravity mid-flight)
     or **on reset** where structural (e.g. number of bodies) — declared
     per-parameter.

4. **Simulation modules** — `src/sim/sims/<name>/`
   ```
   projectile/
     model.ts      # pure physics: state, params schema, step(dt), reset()
     model.test.ts # Vitest: range formula, energy conservation, etc.
     view.ts       # draw(ctx, state, opts): trails, vectors, grid, labels
     index.ts      # register({ id, title, model, view, presets })
   ```
   - Registry (`src/sim/registry.ts`) maps `id → module`, lazy-imported so
     a chapter only downloads the sims it uses.

5. **Physics core** — `src/sim/core/`
   - Shared math: vectors, RK4 / semi-implicit Euler / Verlet integrators,
     ODE helpers, collision utils, unit formatting, plotting helpers
     (live graphs of x(t), v(t), E(t) beside the animation — crucial for
     teaching).

6. **i18n layer** — `src/i18n/` + `locales/`
   - `i18next` initialized with locale from URL → localStorage → browser.
   - UI catalogs: `locales/<locale>/ui.json` (sidebar, toolbar, buttons,
     banners) and `locales/<locale>/sims.json` (sim titles, param labels,
     preset names, readout labels, canvas annotations like "apex", "trail").
   - Namespace-split + lazy-loaded per locale; TypeScript key typing
     (generated from `en` catalogs) so missing keys are compile errors.
   - Locale-aware formatting via `Intl`: decimal separator (PL uses `,`),
     units, numbers in readouts and slider values.
   - Canvas text (axis labels, annotations) pulled from `sims.json` at draw
     time — switching language redraws without resetting the simulation.

### 3.2 Data flow inside a widget

```
ControlPanel ──params──▶ model.params (mutable ref)
rAF loop ──fixed dt──▶ model.step(dt) ──▶ model.state (ref)
rAF loop ─────────────▶ view.draw(ctx, state)
model.state ──throttled (10 Hz)──▶ readouts (numbers, live graphs)
```
React never re-renders at 60 fps; only controls/readouts do, throttled.

### 3.3 Localization strategy

**Routes:** `/:locale/chapter/:slug` — slugs are canonical (English) across
locales, e.g. `/pl/chapter/kinematics` and `/en/chapter/kinematics`. Locale
prefix always explicit; `/` redirects to detected/preferred locale. This
keeps deep links and teacher-shared sim URLs unambiguous.

**What is translated where:**

| Artifact                        | Mechanism                                   |
|---------------------------------|---------------------------------------------|
| Chapter prose, titles, exercises| Per-locale MDX files (`content/pl/…`)        |
| UI chrome (nav, toolbar, hints) | `locales/<locale>/ui.json` (i18next)         |
| Sim labels, presets, annotations| `locales/<locale>/sims.json` (i18next)       |
| Math, sim ids, param keys       | **Not translated** — universal by design     |
| Number/decimal formatting       | `Intl.NumberFormat(locale)`                  |

**Translation workflow (must stay easy):**
1. English is the source of truth; author writes/edits `content/en/…`.
2. `npm run i18n:status` — script diffs locales: lists missing chapters,
   missing/extra JSON keys, and chapters whose `en` source hash changed
   since last translation (frontmatter `sourceHash`), i.e. **stale** ones.
3. Translator copies the `en` file to `content/pl/…`, translates prose,
   keeps all JSX/`<Sim>` tags and math untouched; updates `sourceHash`.
4. CI runs `i18n:status --check` (fails on missing UI/sim keys; warns on
   stale/missing chapters) + a lint that MDX component tags & math blocks
   match between locales (structural diff, ignores prose).
5. Fallback chain (`pl → en`) means partial translations are always
   shippable — never a broken page.

### 3.4 Parameter ↔ equation link (differentiator)
- Params carry a `symbol` (e.g. `v_0`, `\theta`).
- Prose math can use `<M v="v_0">` wrappers; hovering a slider highlights
  the symbol in nearby equations and vice versa. Cheap to build via a
  small context + CSS class; huge pedagogical payoff.

---

## 4. Directory Layout

```
physix-book/
├── PLAN.md
├── index.html
├── vite.config.ts            # MDX + katex plugins, chapter-manifest plugin
├── content/
│   ├── en/
│   │   └── chapters/
│   │       ├── 01-kinematics.mdx
│   │       ├── 02-newton-laws.mdx
│   │       └── ...
│   └── pl/                   # mirrored structure, same slugs
│       └── chapters/
│           ├── 01-kinematics.mdx
│           └── ...
├── locales/
│   ├── en/                   # source of truth for UI/sim strings
│   │   ├── ui.json
│   │   └── sims.json
│   └── pl/
│       ├── ui.json
│       └── sims.json
├── scripts/
│   └── i18n-status.ts        # missing/stale translation report (also CI)
├── src/
│   ├── app/                  # shell: Sidebar, Reader, routes, theme, LangSwitcher
│   ├── i18n/                 # i18next init, locale detection, Intl helpers
│   ├── components/           # M (math span), Figure, Callout, Exercise
│   ├── sim/
│   │   ├── core/             # vec2, integrators, plot, units
│   │   ├── framework/        # SimulationWidget, loop, ControlPanel, toolbar
│   │   ├── registry.ts
│   │   └── sims/
│   │       ├── projectile/
│   │       ├── pendulum/
│   │       ├── spring-mass/
│   │       └── ...
│   └── styles/
└── tests/                    # Playwright smoke tests
```

---

## 5. Initial Curriculum & Simulations (v1 scope)

| # | Chapter              | Simulations (interactive)                                        |
|---|----------------------|------------------------------------------------------------------|
| 1 | Kinematics           | Projectile motion (v₀, θ, g, drag toggle) + live x(t), y(t) plots |
| 2 | Newton's Laws        | Inclined plane w/ friction (μ, angle, mass); Atwood machine       |
| 3 | Energy & Momentum    | Elastic/inelastic 1D collisions (m₁, m₂, e); energy bar charts    |
| 4 | Oscillations         | Pendulum (L, g, θ₀, damping — large-angle vs small-angle overlay); spring-mass (k, m, c) + phase portrait |
| 5 | Waves                | Wave on a string / superposition & standing waves (f, A, tension); two-source interference |
| 6 | Gravitation          | Orbital mechanics (2-body, initial v, mass) with trace + energy   |
| 7 | E&M (stretch)        | Point-charge field lines & test particle (charges draggable)      |

Each chapter: intro prose → derivation with KaTeX → embedded sim(s) with
suggested experiments ("Set θ=45°, verify range is maximal") → exercises.

---

## 6. Milestones

### M0 — Skeleton (day 1) ✅ DONE
- [x] Vite + React + TS + Tailwind scaffold, router, dark theme.
- [x] MDX pipeline with KaTeX; two EN chapters + one PL translation render.
- [x] Sidebar from chapter manifest (`virtual:chapters`); prev/next nav;
      responsive drawer; section deep-links.
- [x] **i18n plumbing**: `/:locale/…` routes, i18next + `en`/`pl` UI catalogs,
      language switcher (keeps current chapter), locale-aware manifest,
      per-locale content dirs with `pl → en` fallback + "untranslated" banner.
- [x] Bonus (pulled from M1): `i18n:status` script with sourceHash staleness
      tracking; Vitest set up with manifest tests.

### M1 — Widget framework (days 2–4) ✅ DONE
- [x] `core/`: vec2, fixed-timestep integrators (semi-implicit Euler, RK4),
      locale-aware quantity formatting.
- [x] `SimulationWidget` + lazy registry + schema-driven ControlPanel
      (KaTeX slider symbols) + toolbar (play/pause/reset/speed 0.25–2×).
- [x] Off-screen pause (IntersectionObserver), hidden-tab pause,
      reduced-motion, HiDPI canvas, ResizeObserver, spiral-of-death guard.
- [x] **First sim: projectile** — end-to-end, all labels via i18n keys
      (EN + PL), presets (Earth/Moon/Mars/air drag), live g & drag vs
      reset-on-change v₀/θ, ghost vacuum parabola, apex/range annotations,
      velocity vector, 6 numeric readouts.
- [x] Vitest: 11 projectile tests (analytic range/apex/flight time,
      energy conservation to 1e-6, drag dissipation, 45° optimality).
- [x] `i18n:status` script (done in M0).
- [x] Guided experiments in EN + PL kinematics chapters.
- [x] `HOW-TO-ADD-A-SIMULATION.md` authoring guide.
- [x] Bundle hygiene: katex/vendor split; sim = own 5 kB lazy chunk.

### M2 — Mechanics chapters (week 2) ✅ DONE
- [x] Live graph component: schema-declared time-series + phase portraits,
      history buffer in a ref (30 Hz sampling, 2 min cap), throttled canvas
      redraw — no React re-renders per frame.
- [x] Step-once button (1/120 s ticks) + fullscreen mode in the toolbar.
- [x] Sims: inclined plane (static/kinetic friction, exact kinematics,
      live angle), 1D collisions (restitution, exact contact-time solve,
      momentum/KE readouts), pendulum (exact ODE + small-angle ghost,
      AGM-exact period readout), spring-mass (ζ presets, phase spiral).
- [x] Chapters 1–4 with derivations + guided experiments, EN **and** PL,
      all `sourceHash`-stamped; `i18n:status` fully green.
- [x] Param↔equation highlighting: `<M v="…">` in prose ↔ slider hover
      (bidirectional, zustand highlight store).
- [x] 43 model tests total (analytic solutions, conservation laws,
      friction thresholds, restitution definition, damping regimes).

### M3 — Waves & gravitation (week 3) ✅ DONE
- [x] Standing wave sim: analytic solution (zero integration error),
      traveling components + envelope ghosts, node markers, λ/f readouts,
      antinode time plot.
- [x] Two-source interference: analytic cos²(πΔr/λ) intensity field
      (cached bitmap, recomputed only on param/theme change), expanding
      wavefront rings, probe readout, max-order = ⌊d/λ⌋.
- [x] Orbit sim: velocity Verlet ×8 substeps, energy + angular-momentum
      drift readouts & plot, crash/escape detection, auto-zoom, presets
      (circular/elliptical/comet/escape/plunge), v_circ & v_esc readouts.
- [x] Chapters 5–6 EN + PL with derivations + guided experiments,
      sourceHash-stamped, i18n fully green (164 sim keys).
- [x] 63 unit tests (superposition identity, nodes, Kepler III T²∝a³,
      vis-viva periapsis, <0.01% energy drift, h drift ~0, interference
      symmetry & constructive/destructive conditions).
- [x] 27 Playwright E2E tests, all green against production build.
- [ ] Deferred to M4: show/hide exercise solutions component.

### M4 — Polish & ship (week 4) ✅ DONE (deploy pending remote)
- [x] Presets per sim (done alongside each sim: 33 presets total).
- [x] Exercise component with show/hide solutions (EN+PL UI), exercises
      added to kinematics & gravitation in both locales.
- [x] Shareable sim state via URL (`?sim=id:k.v,…&spd=2`), 🔗 share button
      (clipboard + address bar), restored on load; pure codec unit-tested.
- [x] Search: client-side, per-locale, searches titles/sections/body text
      (plain-text index built into the chapter manifest).
- [x] Keyboard nav & a11y: skip-to-content link, :focus-visible outlines,
      prefers-reduced-motion CSS, aria labels/expansion states, html lang.
- [x] 68 unit tests + 31 Playwright E2E tests, all green.
- [x] `HOW-TO-WRITE-A-CHAPTER.md` authoring guide.
- [x] CI workflow: i18n check → unit → E2E (traces on failure).
- [x] GitHub Pages deploy workflow (repo base path + 404 SPA fallback).
- [ ] **User action:** push to GitHub, enable Pages (Settings → Pages →
      Source: GitHub Actions) — deploy runs automatically.

### Backlog / v2 ideas
- 3D chapter support via three.js view adapters.
- draggable initial conditions directly on canvas (set v₀ by dragging arrow).
- Quiz components with instant feedback; progress tracking (localStorage).
- More languages (de, uk, …) — folder + catalogs only, zero code changes.
- Print/PDF export (static figures fallback); teacher "presentation mode".
- Optional: side-by-side translation editor view for contributors.

---

## 7. Key Design Decisions & Risks

| Decision | Rationale / Risk mitigation |
|---|---|
| MDX over CMS/database | Content lives in git, versioned with the sims it references; no backend. |
| Custom canvas over p5.js/Phaser | Teaching sims need exact, inspectable physics; engines add opacity & weight. Framework is ~300 LOC. |
| Fixed-timestep physics | Determinism + stability (orbits, stiff springs); decouples sim speed from frame rate; enables slow-mo. |
| Models as pure TS | Unit-testable against analytic solutions — correctness is the product. |
| Lazy registry imports | Book stays fast even with 30+ sims; per-chapter code splitting. |
| Risk: numeric blowups (orbits, stiff springs) | Verlet/RK4 + energy monitoring; clamp & auto-pause with a friendly "reset" hint. |
| Risk: scope creep in content | Framework done at M1 with ONE sim; content grows incrementally after. |
| i18n from day one, not retrofitted | Retrofitting i18n means touching every component twice; plumbing costs ~half a day at M0. |
| Content duplication per locale | Mirrored files are the simplest mental model for translators (whole chapter in one file); `sourceHash` + structural diff tooling prevents drift. |
| Risk: translations drift from source | `i18n:status` in CI: hard-fail on missing UI keys, warn on stale chapters; fallback chain keeps site shippable. |

---

## 8. Definition of Done (v1) — ✅ MET (pending public deploy)
- [x] 6 chapters, **8** interactive sims (target ≥10 deferred to v2: E&M
      chapter + a second waves/mechanics sim), all models unit-tested.
- [x] Every sim: play/pause/reset/step/speed/fullscreen/share, ≥2 live
      parameters (most 3–5), units + readouts + graphs.
- [x] Full PL + EN parity; language switch preserves position; adding a
      locale touches no code.
- [x] Static build: app 12 kB gz + vendor 116 kB gz + katex 78 kB gz,
      chapters/sims lazy; works on tablet (E2E mobile drawer test).
- [x] Authoring guides: new chapter + sim in < 1 hour; translation =
      copy one MDX file + translate prose.
