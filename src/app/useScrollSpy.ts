import { useEffect, useRef, useState } from "react";

/**
 * Scroll-spy with explicit-navigation support.
 *
 * Passive mode: the current section is the last heading whose top passed
 * the activation line (~100px under the fixed header). At the page bottom
 * the last section activates (short final sections may never cross the
 * line).
 *
 * Explicit mode: after a subsection click the target stays highlighted
 * until the user scrolls manually — sections that fit on one screen can
 * never cross the activation line, so position alone would snap the
 * highlight back to the top section.
 */
export function useScrollSpy(
  ids: string[],
  enabled: boolean,
  explicit: { id: string; nonce: number } | null,
): string | null {
  const [active, setActive] = useState<string | null>(null);
  const dueRef = useRef<string | null>(null);
  const lastYRef = useRef(0);

  // A new navigation intent (nonce changes even for same-id re-clicks).
  useEffect(() => {
    if (explicit) {
      dueRef.current = explicit.id;
      setActive(explicit.id);
    }
  }, [explicit?.nonce, explicit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setActive(null);
      dueRef.current = null;
      return;
    }
    let raf = 0;
    lastYRef.current = window.scrollY;

    const compute = () => {
      raf = 0;
      const LINE = 100;
      const y = window.scrollY;
      lastYRef.current = y;

      const atBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 4;

      // Explicit target: keep it until it arrives (crosses the line, or
      // page bottom for short final sections) or the user takes over
      // (wheel/touch clears dueRef via userTakeover).
      if (dueRef.current) {
        const el = document.getElementById(dueRef.current);
        const arrived =
          (el && el.getBoundingClientRect().top <= LINE + 24) || atBottom;
        if (!arrived) {
          setActive(dueRef.current);
          return;
        }
        dueRef.current = null; // arrived — position-based logic below
      }

      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= LINE) current = id;
      }
      if (atBottom) current = ids[ids.length - 1];
      setActive((prev) => (prev === current ? prev : current));
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    // User input cancels the explicit target immediately — manual scroll
    // means position-based highlighting from now on.
    const userTakeover = () => {
      dueRef.current = null;
      schedule();
    };

    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", userTakeover, { passive: true });
    window.addEventListener("touchstart", userTakeover, { passive: true });
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", userTakeover);
      window.removeEventListener("touchstart", userTakeover);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ids.join("|")]);

  return active;
}
