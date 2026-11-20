import type { DrawContext, SimView } from "../../framework/types";
import {
  ARENA,
  PROBE,
  WAVE_SPEED,
  intensity,
  type InterferenceState,
} from "./model";

/** Cached intensity bitmap — recomputed only when λ, d or theme change. */
interface FieldCache {
  key: string;
  canvas: HTMLCanvasElement;
}
let cache: FieldCache | null = null;

const FIELD_W = 300;
const FIELD_H = 180;

function fieldImage(lambda: number, d: number, dark: boolean): HTMLCanvasElement {
  const key = `${lambda}|${d}|${dark}`;
  if (cache?.key === key) return cache.canvas;
  const cv = document.createElement("canvas");
  cv.width = FIELD_W;
  cv.height = FIELD_H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(FIELD_W, FIELD_H);
  const p = { lambda, d };
  // dark: black → cyan; light: white → deep blue
  for (let j = 0; j < FIELD_H; j++) {
    const y = ARENA.halfH - (j / (FIELD_H - 1)) * 2 * ARENA.halfH;
    for (let i = 0; i < FIELD_W; i++) {
      const x = -ARENA.halfW + (i / (FIELD_W - 1)) * 2 * ARENA.halfW;
      const I = intensity(x, y, p);
      const idx = (j * FIELD_W + i) * 4;
      if (dark) {
        img.data[idx] = Math.round(8 + I * 30);
        img.data[idx + 1] = Math.round(10 + I * 160);
        img.data[idx + 2] = Math.round(14 + I * 220);
      } else {
        img.data[idx] = Math.round(255 - I * 225);
        img.data[idx + 1] = Math.round(255 - I * 130);
        img.data[idx + 2] = Math.round(255 - I * 30);
      }
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cache = { key, canvas: cv };
  return cv;
}

export const interferenceView: SimView<InterferenceState> = {
  draw(dc: DrawContext, s: InterferenceState) {
    const { ctx, width, height, dark, t } = dc;
    const p = { lambda: s.lambda, d: s.d };

    // intensity field (cached)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fieldImage(s.lambda, s.d, dark), 0, 0, width, height);

    const sx = width / (2 * ARENA.halfW);
    const sy = height / (2 * ARENA.halfH);
    const X = (x: number) => (x + ARENA.halfW) * sx;
    const Y = (y: number) => (ARENA.halfH - y) * sy;

    // expanding wavefront rings from each source (radius = vt mod nλ)
    const ringColor = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1;
    const maxR = Math.hypot(2 * ARENA.halfW, 2 * ARENA.halfH);
    const phase = (WAVE_SPEED * s.t) % s.lambda;
    for (const srcX of [-s.d / 2, s.d / 2]) {
      for (let r = phase; r < maxR; r += s.lambda) {
        if (r <= 0.01) continue;
        ctx.beginPath();
        ctx.ellipse(X(srcX), Y(0), r * sx, r * sy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // sources
    for (const srcX of [-s.d / 2, s.d / 2]) {
      ctx.beginPath();
      ctx.arc(X(srcX), Y(0), 6, 0, Math.PI * 2);
      ctx.fillStyle = dark ? "#fbbf24" : "#b45309";
      ctx.fill();
      ctx.strokeStyle = dark ? "#09090b" : "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // probe point
    const I = intensity(PROBE.x, PROBE.y, p);
    ctx.beginPath();
    ctx.arc(X(PROBE.x), Y(PROBE.y), 7, 0, Math.PI * 2);
    ctx.strokeStyle = dark ? "#ffffff" : "#111111";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillStyle = dark ? "#ffffff" : "#111111";
    ctx.fillText(
      `${t("interference.view.probe")}: I = ${I.toFixed(2)}`,
      X(PROBE.x) + 12,
      Y(PROBE.y) + 4,
    );

    // legend
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillStyle = dark ? "#e4e4e7" : "#27272a";
    ctx.fillText(t("interference.view.legend"), 10, height - 10);
  },
};
