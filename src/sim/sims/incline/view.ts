import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { TRACK_LEN, type InclineState } from "./model";

/**
 * The ramp angle is a live param, so the view reads it from the state's
 * geometry each frame. We pass it via the model readouts instead: the view
 * re-derives angle from `a` is fragile — so the state carries `angleDeg`.
 */
export const inclineView: SimView<InclineState & { angleDeg?: number }> = {
  draw(dc: DrawContext, s: InclineState & { angleDeg?: number }) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", ramp: "#3f3f46", rampEdge: "#71717a", block: "#fbbf24", text: "#a1a1aa", force: "#34d399", fric: "#f87171", arc: "#38bdf8" }
      : { bg: "#ffffff", ramp: "#e4e4e7", rampEdge: "#a1a1aa", block: "#f59e0b", text: "#71717a", force: "#059669", fric: "#dc2626", arc: "#0284c7" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const angle = ((s.angleDeg ?? 30) * Math.PI) / 180;
    const margin = 30;
    // Ramp: right angle at bottom-right; slope descends left→right? Use
    // classic: high end left, block slides down towards bottom-right.
    const baseW = width - margin * 2;
    const rampH = Math.min(height - margin * 2, baseW * Math.tan(angle));
    const baseY = height - margin;
    const topX = margin;
    const topY = baseY - rampH;
    const botX = margin + (rampH > 0 ? rampH / Math.tan(angle || 1e-9) : baseW);
    const effBotX = Math.min(botX, width - margin);

    // triangle
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(effBotX, baseY);
    ctx.lineTo(topX, baseY);
    ctx.closePath();
    ctx.fillStyle = c.ramp;
    ctx.fill();
    ctx.strokeStyle = c.rampEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(effBotX, baseY);
    ctx.stroke();

    // angle arc at bottom vertex
    ctx.strokeStyle = c.arc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effBotX, baseY, 30, Math.PI, Math.PI + angle, false);
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    ctx.fillText(
      `α = ${formatQuantity(s.angleDeg ?? 30, "°", locale, 0)}`,
      effBotX - 36,
      baseY - 8,
    );

    // block position along slope
    const slopeLen = Math.hypot(effBotX - topX, baseY - topY);
    const frac = Math.min(s.s / TRACK_LEN, 1);
    const px = topX + (effBotX - topX) * frac;
    const py = topY + (baseY - topY) * frac;
    const ux = (effBotX - topX) / slopeLen; // unit downhill
    const uy = (baseY - topY) / slopeLen;
    const nx = uy; // outward normal (up-left of slope)
    const ny = -ux;
    const size = 26;

    ctx.save();
    ctx.translate(px + nx * size * 0.5, py + ny * size * 0.5);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.fillStyle = c.block;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 4);
    ctx.fill();
    ctx.restore();

    // velocity arrow (downhill, green) and friction (uphill, red)
    const arrow = (dx: number, dy: number, len: number, color: string, label: string) => {
      if (len < 4) return;
      const sx = px + nx * size;
      const sy = py + ny * size;
      const ex = sx + dx * len;
      const ey = sy + dy * len;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const a = Math.atan2(ey - sy, ex - sx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 7 * Math.cos(a - 0.4), ey - 7 * Math.sin(a - 0.4));
      ctx.lineTo(ex - 7 * Math.cos(a + 0.4), ey - 7 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.font = "11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, ex + dx * 14, ey + dy * 14 + 4);
    };
    arrow(ux, uy, Math.min(70, s.v * 12), c.force, "v");
    if (s.stuck || s.v > 0) {
      const fr = Math.min(50, 18 + (s.stuck ? 10 : 0));
      arrow(-ux, -uy, fr, c.fric, t("incline.view.friction"));
    }

    // status
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      s.stuck ? t("incline.view.stuck") : s.reachedEnd ? t("incline.view.finished") : t("incline.view.sliding"),
      margin,
      margin - 8,
    );
  },
};
