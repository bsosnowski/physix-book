import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import {
  BANDS,
  LOG_MAX,
  LOG_MIN,
  bandAt,
  photonEnergy,
  visibleColor,
  wavelength,
  type SpectrumState,
} from "./model";

const BAND_COLORS: Record<string, string> = {
  radio: "#64748b",
  micro: "#0891b2",
  ir: "#b45309",
  visible: "#16a34a",
  uv: "#7c3aed",
  xray: "#2563eb",
  gamma: "#dc2626",
};

/** World coords: x ∈ [0,1] across the bar; bar occupies y ∈ [−1, −0.6]. */
export const spectrumToWorld: ScreenToWorld = (vp, px, py) => ({
  x: px / vp.width,
  y: -(py / vp.height) * 2 + 1, // top +1, bottom −1
});

function fmtEng(v: number, unit: string): string {
  const prefixes: [number, string][] = [
    [1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
    [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"],
  ];
  for (const [scale, p] of prefixes) {
    if (v >= scale) return `${(v / scale).toPrecision(3)} ${p}${unit}`;
  }
  return `${v.toExponential(2)} ${unit}`;
}

export const spectrumView: SimView<SpectrumState> = {
  toWorld: spectrumToWorld,
  draw(dc: DrawContext, s: SpectrumState) {
    const { ctx, width, height, dark, t } = dc;
    const c = dark
      ? { bg: "#09090b", text: "#a1a1aa", marker: "#fbbf24", wave: "#38bdf8", card: "#18181b" }
      : { bg: "#ffffff", text: "#71717a", marker: "#d97706", wave: "#0284c7", card: "#f4f4f5" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const fx = (LOG_MIN + (LOG_MAX - LOG_MIN) * 0) as number;
    void fx;
    const pos = (s.logf - LOG_MIN) / (LOG_MAX - LOG_MIN);

    // --- animated transverse wave (top half), drawn wavelength shrinks with f
    const midY = height * 0.3;
    const amp = height * 0.12;
    const cycles = 1.5 + pos * 18; // visual compression
    const color = visibleColor(s.logf) ?? c.wave;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = (width * i) / 300;
      const y = midY + amp * Math.sin((2 * Math.PI * cycles * i) / 300 - s.t * 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // readout card
    const band = bandAt(s.logf);
    ctx.fillStyle = c.card;
    ctx.fillRect(width * 0.02, height * 0.5, width * 0.96, height * 0.22);
    ctx.fillStyle = BAND_COLORS[band.id];
    ctx.font = "bold 14px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t(`spectrum.band.${band.id}`), width * 0.04, height * 0.56);
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(
      `f = ${fmtEng(10 ** s.logf, "Hz")}   λ = ${fmtEng(wavelength(s.logf), "m")}   E = ${photonEnergy(s.logf).toPrecision(3)} eV`,
      width * 0.04,
      height * 0.62,
    );
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(t(`spectrum.use.${band.id}`), width * 0.04, height * 0.68);

    // --- spectrum bar (bottom strip: world y −1..−0.6 → py 0.8h..h)
    const barTop = height * 0.8;
    const barH = height * 0.2;
    for (const b of BANDS) {
      const x0 = ((b.minLog - LOG_MIN) / (LOG_MAX - LOG_MIN)) * width;
      const x1 = ((b.maxLog - LOG_MIN) / (LOG_MAX - LOG_MIN)) * width;
      if (b.id === "visible") {
        const grad = ctx.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, "hsl(0,90%,55%)");
        grad.addColorStop(0.5, "hsl(120,90%,45%)");
        grad.addColorStop(1, "hsl(280,90%,55%)");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = BAND_COLORS[b.id];
      }
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, barTop, x1 - x0, barH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      if (x1 - x0 > 40) ctx.fillText(t(`spectrum.band.${b.id}`), (x0 + x1) / 2, barTop + barH / 2 + 3);
    }

    // marker
    const mx = pos * width;
    ctx.strokeStyle = c.marker;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, barTop - 8);
    ctx.lineTo(mx, barTop + barH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 7, barTop - 8);
    ctx.lineTo(mx + 7, barTop - 8);
    ctx.lineTo(mx, barTop + 2);
    ctx.closePath();
    ctx.fillStyle = c.marker;
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("spectrum.view.dragHint"), 10, height * 0.77);
  },
};
