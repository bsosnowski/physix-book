import type { DrawContext, SimView } from "../../framework/types";
import { N, STRING_L, type PulseState } from "./model";

export const pulseView: SimView<PulseState> = {
  draw(dc: DrawContext, s: PulseState) {
    const { ctx, width, height, dark, t } = dc;
    const c = dark
      ? { bg: "#09090b", axis: "#27272a", wave: "#38bdf8", wall: "#71717a", ring: "#fbbf24", text: "#a1a1aa" }
      : { bg: "#ffffff", axis: "#e4e4e7", wave: "#0284c7", wall: "#a1a1aa", ring: "#d97706", text: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const margin = 30;
    const midY = height / 2;
    const sx = (width - margin * 2) / STRING_L;
    const sy = height * 0.3;
    const X = (x: number) => margin + x * sx;
    const Y = (y: number) => midY - y * sy;

    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, midY);
    ctx.lineTo(width - margin, midY);
    ctx.stroke();

    // left wall (fixed)
    ctx.fillStyle = c.wall;
    ctx.fillRect(margin - 8, midY - 40, 8, 80);

    // right end: wall (fixed) or ring on a pole (free)
    if (s.end < 0.5) {
      ctx.fillRect(width - margin, midY - 40, 8, 80);
    } else {
      ctx.strokeStyle = c.wall;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width - margin + 4, midY - 50);
      ctx.lineTo(width - margin + 4, midY + 50);
      ctx.stroke();
      // sliding ring at the string's end height
      ctx.beginPath();
      ctx.arc(width - margin + 4, Y(s.y[N - 1]), 6, 0, Math.PI * 2);
      ctx.strokeStyle = c.ring;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // the string
    ctx.strokeStyle = c.wave;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = X((i * STRING_L) / (N - 1));
      const py = Y(s.y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      s.end < 0.5 ? t("pulse.view.fixed") : t("pulse.view.free"),
      margin,
      height - 10,
    );
    if (s.reflected) {
      ctx.textAlign = "right";
      ctx.fillText(t("pulse.view.reflected"), width - margin, 20);
    }
  },
};
