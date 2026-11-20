# How to add a simulation

A simulation is three small pieces with strict boundaries:

| Piece     | File        | Rule                                        |
|-----------|-------------|---------------------------------------------|
| **Model** | `model.ts`  | Pure physics. No DOM, no React, **no strings** — only i18n keys. |
| **View**  | `view.ts`   | Canvas drawing only. Reads state, never mutates it. All text via `dc.t(key)`. |
| **Module**| `index.ts`  | Glue: id, titleKey, model, view.            |

## 1. Create `src/sim/sims/<id>/model.ts`

Implement `SimModel<Params, State>` (see `src/sim/framework/types.ts`):

- `params`: slider schema — `key`, LaTeX `symbol`, `labelKey` (i18n),
  `unit`, `min/max/step/default`, and `apply`:
  - `"live"` — changes take effect mid-flight (e.g. gravity),
  - `"reset"` — structural; the widget auto-resets on change (e.g. v₀).
- `init(params)` — build the initial state.
- `step(state, params, dt)` — advance by fixed `dt` (1/120 s). Return
  `{ state, done }`; `done: true` auto-pauses the widget (e.g. landing).
  Use integrators from `src/sim/core/integrators.ts` (RK4, symplectic Euler).
- `readout(state, params)` — numbers for the panel (throttled to 10 Hz).
- Optional `presets` — named parameter sets (`{ id, labelKey, params }`).

## 2. Write `model.test.ts` **before** the view

Test against analytic solutions: closed-form results, conservation laws,
limiting cases. Correctness is the product. See `projectile/model.test.ts`.

## 3. Create `view.ts`

Implement `SimView<State>.draw(dc, state)`. `dc` gives you a HiDPI-ready
2D context in CSS pixels, `width/height`, `dark` flag, `t()` for canvas
annotations, and `locale` for `formatQuantity` (core/units.ts).
Draw every frame; keep it cheap. Never store React state here.

## 4. Register

- `index.ts`: `export default { id, titleKey, model, view } satisfies SimModule`.
- `src/sim/registry.ts`: add `"<id>": () => import("./sims/<id>")` (lazy!).

## 5. Add strings to BOTH catalogs

`locales/en/sims.json` and `locales/pl/sims.json`: title, every
`param.*` / `readout.*` / `preset.*` labelKey, canvas annotations.
`npm run i18n:status -- --check` must pass (missing keys = CI error).

## 6. Embed in a chapter

```mdx
<Sim id="<id>" />
<Sim id="<id>" params={{ g: 1.62 }} autoplay />
```

Add guided experiments in the prose. Update the PL chapter too (or let it
fall back to EN and mark the translation stale via `npm run i18n:status`).

## Checklist

- [ ] Model unit tests pass (`npm test`)
- [ ] No hardcoded user-facing strings anywhere in the sim
- [ ] EN + PL catalogs in sync (`npm run i18n:status`)
- [ ] Play/pause/reset/speed work; sliders behave live vs on-reset as declared
- [ ] Looks right in dark mode; numbers use locale formatting
