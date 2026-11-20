import { useMemo } from "react";
import katex from "katex";
import { useHighlight } from "@/sim/framework/highlight";

/**
 * Inline math linked to a simulation parameter:
 *   <M v="angle">\theta</M>
 * Hovering it highlights the matching slider, and hovering the slider
 * highlights every occurrence in the prose.
 */
export function M({ v, children }: { v?: string; children: string }) {
  const hoverVar = useHighlight((s) => s.hoverVar);
  const setHoverVar = useHighlight((s) => s.setHoverVar);
  const html = useMemo(
    () => katex.renderToString(children, { throwOnError: false }),
    [children],
  );
  const active = v != null && hoverVar === v;
  return (
    <span
      className={
        "rounded px-0.5 transition-colors " +
        (active ? "bg-amber-200 dark:bg-amber-500/40" : "") +
        (v ? " cursor-help" : "")
      }
      onMouseEnter={v ? () => setHoverVar(v) : undefined}
      onMouseLeave={v ? () => setHoverVar(null) : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
