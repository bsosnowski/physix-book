import { useEffect, useState } from "react";

/**
 * Scroll-spy: returns the id of the section heading currently being read.
 * A heading is "current" while it is the last one whose top passed the
 * activation line (~100px below the viewport top, under the fixed header).
 * Re-evaluated on scroll (rAF-throttled), resize, and content changes.
 */
export function useScrollSpy(ids: string[], enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setActive(null);
      return;
    }
    let raf = 0;
    const compute = () => {
      raf = 0;
      const LINE = 100;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= LINE) current = id;
      }
      // Before the first heading: nothing active (chapter intro).
      // At the very bottom, the last heading may never cross the line on
      // short final sections — activate it when we hit the page end.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && current === null && ids.length > 0) {
        current = ids[ids.length - 1];
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // content growth (lazy sims, KaTeX) shifts positions without scrolling
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // ids arrive as a fresh array each render; compare by content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ids.join("|")]);

  return active;
}
