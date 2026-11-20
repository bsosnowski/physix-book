# PLAN — Smooth & fast section navigation

Status: **proposal only, not implemented.**
Goal: clicking a chapter or subsection glides to the target quickly and
predictably, without the failure modes that made us disable smooth
scrolling in the first place (E2E scroll-anchoring fights, stale
IntersectionObserver, "sometimes doesn't work" bug).

## 1. Current state & constraints

- All jumps are instant: `el.scrollIntoView({ block: "start" })` in
  `ReaderPage.scrollToHash` (deep links, hash effect with rAF retry) and
  the Sidebar same-hash re-click path; `window.scrollTo(0, 0)` on chapter
  load. CSS `scroll-behavior: smooth` was deliberately removed.
- Hard-won constraints we must not regress:
  1. **Deterministic completion** — Playwright asserts heading-near-top
     within timeouts; an animation must have a bounded, known duration.
  2. **Interruptibility** — rapid subsection switching must cancel the
     previous animation, last click wins (existing E2E covers this).
  3. **No CSS-global smooth** — it hijacks programmatic scrolls and
     browser scroll anchoring; keep scrolling behavior fully in JS.
  4. **Sim visibility** — IntersectionObserver pauses off-screen sims;
     a fast pass-through must not start/stop sims spuriously (IO already
     debounces by frame; keep animation ≤ ~350 ms so at most a few sims
     briefly activate — acceptable, they pause again on settle).
  5. **Reduced motion** — `prefers-reduced-motion` users get instant jumps.
  6. Fixed header offset stays handled by `scroll-mt-20` on headings.

## 2. Proposed design

### 2.1 New utility: `src/util/smoothScroll.ts`
A single cancellable animator used everywhere (no CSS smooth, no native
`behavior: "smooth"` — its duration is browser-controlled and long for
big distances):

```
scrollToElement(el, opts?): CancelFn
scrollToY(y, opts?): CancelFn
```

- rAF loop, **fixed duration ~280 ms** (fast) regardless of distance,
  capped: distance < 200 px → 160 ms; > 4000 px → 350 ms max.
- Easing: `easeOutCubic` (fast start, gentle landing — feels responsive).
- **Module-level singleton**: starting a new scroll cancels the active
  one (last-click-wins, constraint 2).
- Honors `matchMedia("(prefers-reduced-motion: reduce)")` → instant.
- Cancels on user wheel/touchstart/keydown (user intent beats animation).
- Target Y computed **once at start** from `el.getBoundingClientRect().top
  + scrollY − headerOffset`; recompute per-frame only if document height
  changed (lazy MDX/KaTeX still settling) — cheap guard, avoids landing
  short when content above grows mid-flight.
- Optional `onDone` callback (used by tests/focus management).

### 2.2 Wire-up (3 call sites, no behavior changes otherwise)
- `ReaderPage.scrollToHash` → `scrollToElement(el)`; the rAF-retry loop
  stays (element may not exist yet), but once found we animate.
- Chapter load (new slug): keep **instant** `scrollTo(0,0)` — new content
  appearing + scrolling simultaneously is disorienting; instead add a
  subtle 150 ms fade-in on the article (`opacity` transition only, no
  layout shift, reduced-motion respected).
- Sidebar same-hash re-click → `scrollToElement`.
- Prev/next chapter buttons: unchanged (instant top + fade).

### 2.3 Focus & a11y polish (small, included)
- After scroll completes, move focus to the heading
  (`tabindex="-1"`, `focus({ preventScroll: true })`) so screen-reader
  and keyboard users land at the section, not at the old position.
- Keep `aria-current` on the active subsection link (new, tiny).

## 3. What we deliberately do NOT do

- No CSS `scroll-behavior: smooth` (global hijack — the original bug).
- No native `scrollIntoView({behavior:"smooth"})` (unbounded duration,
  inconsistent across browsers, can't cancel cleanly).
- No scroll libraries (framer-motion etc.) — ~60 LOC utility suffices.
- No view-transition API for chapter swaps yet (browser support + MDX
  async loading make it fiddly; the fade covers 90% of the feel).

## 4. Test plan

Unit (vitest, jsdom-lite or pure math):
- easing bounds (t=0→0, t=1→1, monotonic), duration caps, reduced-motion
  → instant path.

E2E (extend existing navigation tests, keep all current assertions):
1. Subsection click: heading near top **within 1 s** (280 ms anim + slack)
   — existing `toBeLessThan(120)` position assertions unchanged.
2. Mid-animation interrupt: click section A, then B after ~80 ms →
   settles at B, never at A (poll final position, assert stability over
   300 ms).
3. Re-click same subsection after manual scroll-away → animates back.
4. Deep link with `#hash` → animated arrival, position assertion passes.
5. Reduced-motion emulation (`page.emulateMedia({ reducedMotion:
   'reduce' })`) → position correct **immediately** (< 100 ms).
6. Wheel during animation cancels it (dispatch wheel, assert scroll
   stops near user position, no snap-back).
7. Sim widgets: after navigation settles, off-screen sims stay paused
   (existing console-error + IO tests must remain green).

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scroll anchoring shifts target mid-flight (we saw 680 px shifts in toolbar tests) | recompute target Y per frame while doc height changes; anchor only via `overflow-anchor: none` on the article if needed |
| E2E flakiness from timing | fixed 280 ms duration + generous poll timeouts; assertions on *final* position, never mid-flight |
| Long chapters: 4000 px in 350 ms feels teleport-y | acceptable — fast was the requirement; easeOutCubic keeps it readable; can tune constants in one place |
| Lazy content grows above target after landing | per-frame retarget during flight + one corrective re-scroll on `onDone` if delta > 4 px |

## 6. Effort & rollout

- ~60 LOC utility + 3 call-site edits + focus polish: **half a day**
  including the 7 E2E cases.
- Single commit, feature-flaggable via one constant
  (`SCROLL_ANIM_MS = 280`; set 0 to revert to instant globally).
