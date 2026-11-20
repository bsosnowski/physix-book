import { useEffect, useRef } from "react";
import type { HistorySample, PlotSpec } from "./types";
import { formatNumber } from "@/i18n";

const HEIGHT = 150;
const PAD = { left: 40, right: 10, top: 18, bottom: 20 };
const DEFAULT_COLORS = ["#0284c7", "#dc2626", "#059669", "#d97706"];

interface Props {
  spec: PlotSpec;
  historyRef: React.RefObject<HistorySample[]>;
  dark: boolean;
  t: (key: string) => string;
}

/**
 * Live graph fed by the widget's history buffer (a ref — no React
 * re-renders per frame). Redraws on its own throttled rAF loop.
 */
export function Plot({ spec, historyRef, dark, t }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ spec, dark, t });
  propsRef.current = { spec, dark, t };

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    let raf = 0;
    let lastDraw = 0;
    let width = 0;
    let dpr = 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = box.getBoundingClientRect().width;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 100 || document.hidden) return;
      lastDraw = now;
      const ctx = canvas.getContext("2d");
      if (!ctx || width === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPlot(ctx, width, historyRef.current ?? [], propsRef.current);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [historyRef]);

  return (
    <div ref={boxRef} className="min-w-0">
      <canvas ref={canvasRef} role="img" aria-label={t(spec.titleKey)} />
    </div>
  );
}

function drawPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  history: HistorySample[],
  { spec, dark, t }: { spec: PlotSpec; dark: boolean; t: (k: string) => string },
) {
  const c = dark
    ? { bg: "#09090b", grid: "#27272a", text: "#a1a1aa" }
    : { bg: "#ffffff", grid: "#f4f4f5", text: "#71717a" };
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, width, HEIGHT);
  ctx.font = "10px ui-sans-serif, system-ui";

  const pw = width - PAD.left - PAD.right;
  const ph = HEIGHT - PAD.top - PAD.bottom;

  // Title
  ctx.fillStyle = c.text;
  ctx.textAlign = "left";
  ctx.fillText(t(spec.titleKey), PAD.left, 12);

  if (history.length < 2) return;

  let xMin: number, xMax: number, yMin: number, yMax: number;
  let series: { get: (s: HistorySample) => number; color: string; label: string }[];

  if (spec.kind === "time") {
    xMin = history[0].t;
    xMax = Math.max(history[history.length - 1].t, xMin + 1e-6);
    series = spec.series.map((s, i) => ({
      get: (h) => h.values[s.key] ?? 0,
      color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      label: t(s.labelKey),
    }));
  } else {
    xMin = Infinity; xMax = -Infinity;
    series = [{
      get: () => 0,
      color: DEFAULT_COLORS[0],
      label: "",
    }];
    for (const h of history) {
      const x = h.values[spec.xKey] ?? 0;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
    }
  }

  yMin = Infinity;
  yMax = -Infinity;
  if (spec.kind === "time") {
    for (const h of history)
      for (const s of series) {
        const v = s.get(h);
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
  } else {
    for (const h of history) {
      const v = h.values[spec.yKey] ?? 0;
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }
  if (!isFinite(yMin)) return;
  if (yMax - yMin < 1e-9) { yMin -= 1; yMax += 1; }
  if (spec.kind === "phase" && xMax - xMin < 1e-9) { xMin -= 1; xMax += 1; }
  const yPad = (yMax - yMin) * 0.1;
  yMin -= yPad;
  yMax += yPad;

  const X = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;
  const Y = (y: number) => PAD.top + ph - ((y - yMin) / (yMax - yMin)) * ph;

  // Grid: zero line + bounds labels
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = yMin + ((yMax - yMin) * i) / 2;
    ctx.beginPath();
    ctx.moveTo(PAD.left, Y(y));
    ctx.lineTo(width - PAD.right, Y(y));
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(y, 1), PAD.left - 4, Y(y) + 3);
  }
  if (yMin < 0 && yMax > 0) {
    ctx.strokeStyle = dark ? "#3f3f46" : "#d4d4d8";
    ctx.beginPath();
    ctx.moveTo(PAD.left, Y(0));
    ctx.lineTo(width - PAD.right, Y(0));
    ctx.stroke();
  }
  // x bounds
  ctx.fillStyle = c.text;
  ctx.textAlign = "left";
  ctx.fillText(formatNumber(xMin, 1), PAD.left, HEIGHT - 6);
  ctx.textAlign = "right";
  ctx.fillText(
    formatNumber(xMax, 1) + (spec.kind === "time" ? " s" : ""),
    width - PAD.right,
    HEIGHT - 6,
  );

  // Series
  if (spec.kind === "time") {
    let legendX = PAD.left + ctx.measureText(t(spec.titleKey)).width + 14;
    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      history.forEach((h, i) => {
        const px = X(h.t);
        const py = Y(s.get(h));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      // legend
      ctx.fillStyle = s.color;
      ctx.textAlign = "left";
      ctx.fillText("— " + s.label, legendX, 12);
      legendX += ctx.measureText("— " + s.label).width + 12;
    });
  } else {
    ctx.strokeStyle = series[0].color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((h, i) => {
      const px = X(h.values[spec.xKey] ?? 0);
      const py = Y(h.values[spec.yKey] ?? 0);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    // current point
    const last = history[history.length - 1];
    ctx.beginPath();
    ctx.arc(X(last.values[spec.xKey] ?? 0), Y(last.values[spec.yKey] ?? 0), 3, 0, Math.PI * 2);
    ctx.fillStyle = series[0].color;
    ctx.fill();
    // axis labels
    ctx.fillStyle = c.text;
    ctx.textAlign = "center";
    ctx.fillText(t(spec.xLabelKey), PAD.left + pw / 2, HEIGHT - 6);
    ctx.save();
    ctx.translate(10, PAD.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t(spec.yLabelKey), 0, 0);
    ctx.restore();
  }
}
