import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { loadSim } from "../registry";
import { defaultParams, type AnySimModule, type ParamSpec } from "./types";
import { ControlPanel } from "./ControlPanel";
import { formatQuantity } from "../core/units";
import { useAppStore } from "@/app/store";

const PHYSICS_DT = 1 / 120; // fixed timestep, seconds
const MAX_STEPS_PER_FRAME = 30; // avoid spiral of death after tab sleep
const READOUT_INTERVAL_MS = 100;
const SPEEDS = [0.25, 0.5, 1, 2];

interface Props {
  id: string;
  /** Overrides for default parameter values, from MDX. */
  params?: Record<string, number>;
  /** Start playing automatically when scrolled into view. */
  autoplay?: boolean;
}

export function Sim({ id, params: paramOverrides, autoplay = false }: Props) {
  const { t, i18n } = useTranslation("sims");
  const dark = useAppStore((s) => s.dark);

  const [module, setModule] = useState<AnySimModule | null>(null);
  const [error, setError] = useState(false);
  const [params, setParams] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [readout, setReadout] = useState<Record<string, number>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<unknown>(null);
  const paramsRef = useRef(params);
  const playingRef = useRef(false);
  const doneRef = useRef(false);
  const speedRef = useRef(1);
  const visibleRef = useRef(false);
  const moduleRef = useRef<AnySimModule | null>(null);
  const langRef = useRef({ t, locale: i18n.language, dark });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  paramsRef.current = params;
  playingRef.current = playing;
  doneRef.current = done;
  speedRef.current = speed;
  moduleRef.current = module;
  langRef.current = { t, locale: i18n.language, dark };

  // --- load module ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void loadSim(id)
      .then((m) => {
        if (cancelled) return;
        const initial = { ...defaultParams(m.model), ...paramOverrides };
        setModule(m);
        setParams(initial);
        stateRef.current = m.model.init(initial);
        setReadout(m.model.readout(stateRef.current, initial));
        setDone(false);
        setPlaying(false);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- reset ---------------------------------------------------------------
  const reset = useCallback((nextParams?: Record<string, number>) => {
    const m = moduleRef.current;
    if (!m) return;
    const p = nextParams ?? paramsRef.current;
    stateRef.current = m.model.init(p);
    setReadout(m.model.readout(stateRef.current, p));
    setDone(false);
    doneRef.current = false;
  }, []);

  const onParamChange = useCallback(
    (spec: ParamSpec, value: number) => {
      setParams((prev) => {
        const next = { ...prev, [spec.key]: value };
        paramsRef.current = next;
        if (spec.apply === "reset") {
          reset(next);
        } else {
          // live param: readouts refresh on next tick
          const m = moduleRef.current;
          if (m) setReadout(m.model.readout(stateRef.current, next));
        }
        return next;
      });
    },
    [reset],
  );

  const applyPreset = useCallback(
    (presetParams: Record<string, number>) => {
      const m = moduleRef.current;
      if (!m) return;
      const next = { ...defaultParams(m.model), ...presetParams };
      setParams(next);
      paramsRef.current = next;
      reset(next);
      setPlaying(true);
    },
    [reset],
  );

  const restart = useCallback(() => {
    reset();
    setPlaying(true);
  }, [reset]);

  // --- canvas sizing (HiDPI + resize) ---------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = Math.max(240, Math.min(420, width * 0.55));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      sizeRef.current = { width, height, dpr };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [module]);

  // --- visibility: pause off-screen / hidden tab, optional autoplay ---------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && autoplay && !reduced && !doneRef.current) {
          setPlaying(true);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay]);

  // --- main loop: fixed-timestep physics, rAF rendering ----------------------
  useEffect(() => {
    if (!module) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastReadout = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const m = moduleRef.current;
      const canvas = canvasRef.current;
      if (!m || !canvas) return;
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;

      const active =
        playingRef.current &&
        !doneRef.current &&
        visibleRef.current &&
        !document.hidden;

      if (active) {
        acc += elapsed * speedRef.current;
        let steps = 0;
        let finished = false;
        while (acc >= PHYSICS_DT && steps < MAX_STEPS_PER_FRAME) {
          const res = m.model.step(stateRef.current, paramsRef.current, PHYSICS_DT);
          stateRef.current = res.state;
          acc -= PHYSICS_DT;
          steps++;
          if (res.done) {
            finished = true;
            break;
          }
        }
        if (steps >= MAX_STEPS_PER_FRAME) acc = 0;
        if (finished) {
          doneRef.current = true;
          setDone(true);
          setPlaying(false);
        }
        if (now - lastReadout > READOUT_INTERVAL_MS || finished) {
          lastReadout = now;
          setReadout(m.model.readout(stateRef.current, paramsRef.current));
        }
      } else {
        acc = 0;
      }

      // Render every frame (cheap; keeps language/theme switches instant).
      const { width, height, dpr } = sizeRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || width === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { t: tr, locale, dark: isDark } = langRef.current;
      m.view.draw(
        { ctx, width, height, dark: isDark, t: tr, locale },
        stateRef.current,
      );
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [module]);

  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  if (error) {
    return (
      <div className="my-6 rounded-lg border border-red-300 bg-red-50 p-4 font-sans text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {t("widget.loadError", { id })}
      </div>
    );
  }
  if (!module) {
    return (
      <div
        className="my-6 h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
        aria-busy
      />
    );
  }

  return (
    <figure className="my-8 overflow-hidden rounded-xl border border-zinc-200 font-sans shadow-sm dark:border-zinc-800">
      <figcaption className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="mr-auto text-sm font-semibold">
          {t(module.titleKey)}
        </span>
        <button
          onClick={() => (done ? restart() : setPlaying(!playing))}
          className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500"
        >
          {done ? `⟲ ${t("toolbar.reset")}` : playing ? `⏸ ${t("toolbar.pause")}` : `▶ ${t("toolbar.play")}`}
        </button>
        <button
          onClick={() => {
            reset();
            setPlaying(false);
          }}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ⟲ {t("toolbar.reset")}
        </button>
        <label className="flex items-center gap-1 text-sm text-zinc-500">
          {t("toolbar.speed")}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-transparent px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </figcaption>

      <div ref={containerRef} className="bg-white dark:bg-zinc-950">
        <canvas ref={canvasRef} role="img" aria-label={t(module.titleKey)} />
      </div>

      <ControlPanel
        specs={module.model.params}
        readoutSpecs={module.model.readouts}
        presets={module.model.presets ?? []}
        values={params}
        readout={readout}
        onChange={onParamChange}
        onPreset={applyPreset}
        format={(v, unit, digits) => formatQuantity(v, unit, i18n.language, digits)}
        t={t}
      />
      {reducedMotion && (
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">
          {t("widget.reducedMotion")}
        </p>
      )}
    </figure>
  );
}
