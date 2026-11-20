import { useMemo } from "react";
import katex from "katex";
import type { ParamSpec, Preset, ReadoutSpec } from "./types";
import { useHighlight } from "./highlight";

/** KaTeX-rendered symbol (matches the equations in the prose). */
function MathSymbol({ tex }: { tex: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false }),
    [tex],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

interface Props {
  specs: readonly ParamSpec[];
  readoutSpecs: readonly ReadoutSpec[];
  presets: readonly Preset[];
  values: Record<string, number>;
  readout: Record<string, number>;
  onChange: (spec: ParamSpec, value: number) => void;
  onPreset: (params: Record<string, number>) => void;
  format: (value: number, unit: string, digits?: number) => string;
  t: (key: string) => string;
  onHoverParam?: (key: string | null) => void;
}

/** Schema-driven sliders + numeric readouts. Zero sim-specific code. */
export function ControlPanel({
  specs,
  readoutSpecs,
  presets,
  values,
  readout,
  onChange,
  onPreset,
  format,
  t,
  onHoverParam,
}: Props) {
  const hoverVar = useHighlight((s) => s.hoverVar);
  return (
    <div className="border-t border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-zinc-400 uppercase tracking-wide">
            {t("widget.presets")}
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onPreset(p.params)}
              className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs hover:border-sky-400 hover:text-sky-700 dark:border-zinc-700 dark:hover:border-sky-600 dark:hover:text-sky-400"
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {specs.map((spec) => (
          <label
            key={spec.key}
            className={
              "flex items-center gap-2 rounded px-1 text-sm transition-colors " +
              (hoverVar === spec.key ? "bg-amber-100 dark:bg-amber-500/20" : "")
            }
            onMouseEnter={() => onHoverParam?.(spec.key)}
            onMouseLeave={() => onHoverParam?.(null)}
          >
            <span className="w-24 shrink-0 truncate" title={t(spec.labelKey)}>
              <MathSymbol tex={spec.symbol} />
            </span>
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={values[spec.key] ?? spec.default}
              onChange={(e) => onChange(spec, Number(e.target.value))}
              className="min-w-0 flex-1 accent-sky-600"
              aria-label={t(spec.labelKey)}
            />
            <span className="w-24 shrink-0 truncate text-right font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
              {format(values[spec.key] ?? spec.default, spec.unit, spec.digits ?? 1)}
            </span>
          </label>
        ))}
      </div>

      {readoutSpecs.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-200 pt-2 text-sm sm:grid-cols-3 dark:border-zinc-800">
          {readoutSpecs.map((r) => (
            <div key={r.key} className="flex min-w-0 items-baseline justify-between gap-1.5">
              <dt className="truncate text-xs text-zinc-500">{t(r.labelKey)}</dt>
              <dd className="shrink-0 font-mono text-xs font-medium tabular-nums">
                {format(readout[r.key] ?? 0, r.unit, r.digits ?? 2)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
