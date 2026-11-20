import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { STAR_RADIUS, type OrbitState } from "./model";

/** World window grows monotonically to keep the whole orbit visible. */
let worldHalf = 16;
let lastTrail: OrbitState["trail"] | null = null;

export const orbitView: SimView<OrbitState> = {
  draw(dc: DrawContext, s: OrbitState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", grid: "#1c1c1f", star: "#fbbf24", glow: "#78350f", trail: "#38bdf8", body: "#e4e4e7", vel: "#34d399", text: "#a1a1aa", warn: "#f87171" }
      : { bg: "#ffffff", grid: "#f4f4f5", star: "#f59e0b", glow: "#fde68a", trail: "#0284c7", body: "#3f3f46", vel: "#059669", text: "#71717a", warn: "#dc2626" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // reset zoom on new run
    if (s.trail !== lastTrail) {
      lastTrail = s.trail;
      worldHalf = Math.max(16, Math.hypot(s.x, s.y) * 1.3);
    }
    const r = Math.hypot(s.x, s.y);
    worldHalf = Math.max(worldHalf, r * 1.15, s.rMax * 1.15);

    const scale = Math.min(width, height) / 2 / worldHalf;
    const cx = width / 2;
    const cy = height / 2;
    const X = (x: number) => cx + x * scale;
    const Y = (y: number) => cy - y * scale;

    // distance rings
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.fillStyle = c.text;
    ctx.textAlign = "left";
    const ringStep = worldHalf > 40 ? 20 : worldHalf > 20 ? 10 : 5;
    for (let rr = ringStep; rr < worldHalf * 1.5; rr += ringStep) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(formatQuantity(rr, "m", locale, 0), cx + rr * scale + 3, cy - 3);
    }

    // trail
    ctx.strokeStyle = c.trail;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    s.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
      else ctx.lineTo(X(p.x), Y(p.y));
    });
    ctx.lineTo(X(s.x), Y(s.y));
    ctx.stroke();

    // star with glow
    const sr = Math.max(6, STAR_RADIUS * scale);
    const grad = ctx.createRadialGradient(cx, cy, sr * 0.4, cx, cy, sr * 2.4);
    grad.addColorStop(0, c.glow);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, sr * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, sr, 0, Math.PI * 2);
    ctx.fillStyle = c.star;
    ctx.fill();

    // velocity vector
    const v = Math.hypot(s.vx, s.vy);
    if (v > 0.01 && !s.crashed) {
      const vScale = Math.min(50, Math.min(width, height) * 0.1) / Math.max(v, 1);
      const px = X(s.x);
      const py = Y(s.y);
      const ex = px + s.vx * vScale;
      const ey = py - s.vy * vScale;
      ctx.strokeStyle = c.vel;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const a = Math.atan2(ey - py, ex - px);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 7 * Math.cos(a - 0.4), ey - 7 * Math.sin(a - 0.4));
      ctx.lineTo(ex - 7 * Math.cos(a + 0.4), ey - 7 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fillStyle = c.vel;
      ctx.fill();
    }

    // body
    if (!s.crashed) {
      ctx.beginPath();
      ctx.arc(X(s.x), Y(s.y), 6, 0, Math.PI * 2);
      ctx.fillStyle = c.body;
      ctx.fill();
    }

    // status captions
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    if (s.crashed) {
      ctx.fillStyle = c.warn;
      ctx.fillText(t("orbit.view.crashed"), 12, 20);
    } else if (s.escaped) {
      ctx.fillStyle = c.warn;
      ctx.fillText(t("orbit.view.escaped"), 12, 20);
    } else {
      ctx.fillStyle = c.text;
      ctx.fillText(
        s.energy < 0 ? t("orbit.view.bound") : t("orbit.view.unbound"),
        12,
        20,
      );
    }
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(
      `${t("orbit.readout.r")}: ${formatQuantity(r, "m", locale, 1)}`,
      12,
      height - 10,
    );
  },
};
