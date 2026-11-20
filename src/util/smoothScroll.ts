/**
 * Cancellable, fixed-duration smooth scrolling.
 *
 * Deliberately NOT CSS scroll-behavior or native behavior:"smooth":
 * those hijack programmatic scrolls, have browser-controlled durations
 * and cannot be cancelled cleanly. This animator is a module-level
 * singleton — starting a new scroll cancels the previous one
 * (last-click-wins), and user input (wheel/touch/keys) aborts it.
 *
 * Set SCROLL_ANIM_MS = 0 to globally revert to instant jumps.
 */

export const SCROLL_ANIM_MS: number = 280;
const MIN_MS = 160;
const MAX_MS = 350;
/** Fixed header (h-14 = 56px) + breathing room; headings also carry scroll-mt. */
const HEADER_OFFSET = 72;

let cancelActive: (() => void) | null = null;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function durationFor(distance: number): number {
  if (SCROLL_ANIM_MS === 0) return 0;
  const d = Math.abs(distance);
  if (d < 200) return MIN_MS;
  if (d > 4000) return MAX_MS;
  return SCROLL_ANIM_MS;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animate window scroll to `targetY`. Returns a cancel function. */
export function scrollToY(targetY: number, onDone?: () => void): () => void {
  cancelActive?.();

  const startY = window.scrollY;
  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (y: number) => Math.min(Math.max(0, y), maxScroll());
  const target = clamp(targetY);
  const ms = durationFor(target - startY);

  if (ms === 0 || prefersReducedMotion() || Math.abs(target - startY) < 2) {
    window.scrollTo(0, target);
    onDone?.();
    return () => {};
  }

  let raf = 0;
  let finished = false;
  const start = performance.now();

  const cleanup = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    for (const [ev, fn] of abortEvents) window.removeEventListener(ev, fn);
    if (cancelActive === cleanup) cancelActive = null;
  };
  const abort = () => cleanup();
  const abortEvents: [string, EventListener][] = [
    ["wheel", abort],
    ["touchstart", abort],
    ["keydown", abort],
  ];
  for (const [ev, fn] of abortEvents)
    window.addEventListener(ev, fn, { passive: true });
  cancelActive = cleanup;

  const frame = (now: number) => {
    if (finished) return;
    const t = Math.min(1, (now - start) / ms);
    // Retarget if the document grew/shrank mid-flight (lazy MDX/KaTeX,
    // scroll anchoring) — keeps the landing accurate.
    const y = startY + (clamp(targetY) - startY) * easeOutCubic(t);
    window.scrollTo(0, y);
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      cleanup();
      onDone?.();
    }
  };
  raf = requestAnimationFrame(frame);
  return cleanup;
}

/** Scroll an element to just below the fixed header. */
export function scrollToElement(el: HTMLElement, onDone?: () => void): () => void {
  const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  return scrollToY(y, onDone);
}

/** Test helper / route-change hook: stop any in-flight animation. */
export function cancelScroll(): void {
  cancelActive?.();
}

export { easeOutCubic };
