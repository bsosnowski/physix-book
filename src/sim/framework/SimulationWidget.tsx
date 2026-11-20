import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { loadSim } from "../registry";
import {
  defaultParams,
  type AnySimModule,
  type HistorySample,
  type ParamSpec,
} from "./types";
import { ControlPanel } from "./ControlPanel";
import { Plot } from "./Plots";
import { useHighlight } from "./highlight";
import { decodeSimParams, decodeSpeed, encodeSimParams } from "./urlState";
import { formatQuantity } from "../core/units";
import { useAppStore } from "@/app/store";

const PHYSICS_DT = 1 / 120; // fixed timestep, seconds
const MAX_STEPS_PER_FRAME = 30; // avoid spiral of death after tab sleep
const READOUT_INTERVAL_MS = 100;
const HISTORY_INTERVAL = 1 / 30; // seconds of sim time between samples
const HISTORY_CAP = 3600; // 2 minutes at 30 Hz
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
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const setHoverVar = useHighlight((s) => s.setHoverVar);
  const [, setSearchParams] = useSearchParams();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<unknown>(null);
  const paramsRef = useRef(params);
  const playingRef = useRef(false);
  const doneRef = useRef(false);
  const speedRef = useRef(1);
  const visibleRef = useRef(false);
  const explicitPlayRef = useRef(false);
  const moduleRef = useRef<AnySimModule | null>(null);
  const langRef = useRef({ t, locale: i18n.language, dark });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1, fullscreen: false });
  sizeRef.current.fullscreen = fullscreen;
  const historyRef = useRef<HistorySample[]>([]);
  const lastSampleTRef = useRef(-Infinity);

  const sample = useCallback((force = false) => {
    const m = moduleRef.current;
    const st = stateRef.current as { t?: number } | null;
    if (!m || !st) return;
    const t = typeof st.t === "number" ? st.t : 0;
    if (!force && t - lastSampleTRef.current < HISTORY_INTERVAL) return;
    lastSampleTRef.current = t;
    historyRef.current.push({ t, values: m.model.readout(stateRef.current, paramsRef.current) });
    if (historyRef.current.length > HISTORY_CAP) {
      historyRef.current.splice(0, historyRef.current.length - HISTORY_CAP);
    }
  }, []);

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
        const initial = {
          ...defaultParams(m.model),
          ...paramOverrides,
          ...decodeSimParams(window.location.search)[id],
        };
        const urlSpeed = decodeSpeed(window.location.search);
        if (urlSpeed) setSpeed(urlSpeed);
        setModule(m);
        setParams(initial);
        stateRef.current = m.model.init(initial);
        historyRef.current = [];
        lastSampleTRef.current = -Infinity;
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
    historyRef.current = [];
    lastSampleTRef.current = -Infinity;
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
      explicitPlayRef.current = true;
      setPlaying(true);
    },
    [reset],
  );

  const restart = useCallback(() => {
    reset();
    explicitPlayRef.current = true;
    setPlaying(true);
  }, [reset]);

  /** Advance one physics tick while paused (frame-by-frame inspection). */
  const stepOnce = useCallback(() => {
    const m = moduleRef.current;
    if (!m || doneRef.current) return;
    setPlaying(false);
    const res = m.model.step(stateRef.current, paramsRef.current, PHYSICS_DT);
    stateRef.current = res.state;
    sample(true);
    setReadout(m.model.readout(stateRef.current, paramsRef.current));
    if (res.done) {
      doneRef.current = true;
      setDone(true);
    }
  }, [sample]);

  // --- canvas sizing (HiDPI + resize) ---------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = sizeRef.current.fullscreen
        ? Math.max(240, rect.height)
        : Math.max(240, Math.min(420, width * 0.55));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      sizeRef.current = { width, height, dpr, fullscreen: sizeRef.current.fullscreen };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [module, fullscreen]);

  // --- visibility: pause off-screen / hidden tab, optional autoplay ---------
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !module) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && autoplay && !reduced && !doneRef.current) {
          explicitPlayRef.current = false;
          setPlaying(true);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
    // `module` dep is essential: on first render the container div does not
    // exist yet (skeleton is shown), so the observer must attach after load.
  }, [autoplay, module]);

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

      // Explicit Play always runs (user intent beats off-screen pausing);
      // visibility gating applies to autoplay so off-screen sims stay idle.
      const active =
        playingRef.current &&
        !doneRef.current &&
        !document.hidden &&
        (explicitPlayRef.current || visibleRef.current);

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
        if (steps > 0) sample(finished);
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
  }, [module, sample]);

  /** Copy a deep link reproducing this widget's parameters and speed. */
  const share = useCallback(() => {
    const all = decodeSimParams(window.location.search);
    all[id] = paramsRef.current;
    const sp = new URLSearchParams(window.location.search);
    sp.set("sim", encodeSimParams(all));
    if (speedRef.current !== 1) sp.set("spd", String(speedRef.current));
    else sp.delete("spd");
    const url = `${window.location.origin}${window.location.pathname}?${sp.toString()}`;
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
    // also reflect in the address bar so a plain copy of the URL works
    setSearchParams(sp, { replace: true });
  }, [id, setSearchParams]);

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
    <figure
      className={
        fullscreen
          ? "fixed inset-2 z-[60] my-0 flex flex-col overflow-auto rounded-xl border border-zinc-300 bg-white font-sans shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
          : "my-8 overflow-hidden rounded-xl border border-zinc-200 font-sans shadow-sm dark:border-zinc-800"
      }
    >
      <figcaption className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Title on its own row: long localized titles must never squeeze
            the toolbar into re-wrapping when button labels change. */}
        <div className="mb-1.5 truncate text-sm font-semibold">
          {t(module.titleKey)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            if (done) return restart();
            explicitPlayRef.current = !playing;
            setPlaying(!playing);
          }}
          className="inline-flex w-32 items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500"
        >
          <span aria-hidden className="w-4 text-center">{done ? "⟲" : playing ? "⏸" : "▶"}</span>
          <span className="truncate">{done ? t("toolbar.reset") : playing ? t("toolbar.pause") : t("toolbar.play")}</span>
        </button>
        <button
          onClick={() => {
            reset();
            setPlaying(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <span aria-hidden className="w-4 text-center">⟲</span>
          {t("toolbar.reset")}
        </button>
        <button
          onClick={stepOnce}
          disabled={playing || done}
          title={t("toolbar.step")}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <span aria-hidden className="w-4 text-center">⏭</span>
          {t("toolbar.step")}
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
        <button
          onClick={share}
          title={t("toolbar.share")}
          className="inline-flex w-9 items-center justify-center rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {copied ? "✓" : "🔗"}
        </button>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          title={t(fullscreen ? "toolbar.exitFullscreen" : "toolbar.fullscreen")}
          className="inline-flex w-9 items-center justify-center rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {fullscreen ? "🗗" : "🗖"}
        </button>
        </div>
      </figcaption>

      <div
        ref={containerRef}
        className={fullscreen ? "min-h-0 flex-1 bg-white dark:bg-zinc-950" : "bg-white dark:bg-zinc-950"}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t(module.titleKey)}
          style={module.model.pointer ? { touchAction: "none", cursor: "grab" } : undefined}
          onPointerDown={(e) => {
            const m = moduleRef.current;
            if (!m?.model.pointer || !m.view.toWorld) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const { x, y } = m.view.toWorld(sizeRef.current, e.clientX - rect.left, e.clientY - rect.top);
            stateRef.current = m.model.pointer(stateRef.current, x, y, "down");
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const m = moduleRef.current;
            if (!m?.model.pointer || !m.view.toWorld || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const { x, y } = m.view.toWorld(sizeRef.current, e.clientX - rect.left, e.clientY - rect.top);
            stateRef.current = m.model.pointer(stateRef.current, x, y, "move");
          }}
          onPointerUp={(e) => {
            const m = moduleRef.current;
            if (!m?.model.pointer || !m.view.toWorld) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const { x, y } = m.view.toWorld(sizeRef.current, e.clientX - rect.left, e.clientY - rect.top);
            stateRef.current = m.model.pointer(stateRef.current, x, y, "up");
          }}
        />
      </div>

      {module.model.plots && module.model.plots.length > 0 && (
        <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-800">
          {module.model.plots.map((p, i) => (
            <div key={i} className="bg-white dark:bg-zinc-950">
              <Plot spec={p} historyRef={historyRef} dark={dark} t={t} />
            </div>
          ))}
        </div>
      )}

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
        onHoverParam={setHoverVar}
      />
      {reducedMotion && (
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">
          {t("widget.reducedMotion")}
        </p>
      )}
    </figure>
  );
}
