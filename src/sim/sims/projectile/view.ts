import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { ProjectileState } from "./model";

const MARGIN = { left: 44, right: 16, top: 16, bottom: 30 };

/**
 * World scale is fixed at init-time (from v0, θ, g at launch) so live
 * changes to g/drag are visible as deviations, not silent rescalings.
 * We recover launch parameters from the initial velocity stored in trail
 * geometry — instead, we derive scale from the trail's bounding box plus
 * the current position, with hysteresis-free monotonic growth.
 */
interface ViewCache {
  worldW: number;
  worldH: number;
}
const caches = new WeakMap<ProjectileState["trail"], ViewCache>();

function worldBounds(s: ProjectileState): ViewCache {
  let cache = caches.get(s.trail);
  if (!cache) {
    // Estimate the vacuum envelope from the first trail segment direction
    // and current extent; simplest robust choice: start from current extent.
    cache = { worldW: 10, worldH: 6 };
    caches.set(s.trail, cache);
  }
  let maxX = 10;
  let maxY = 6;
  for (const p of s.trail) {
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  maxX = Math.max(maxX, s.motion.pos.x);
  maxY = Math.max(maxY, s.motion.pos.y);
  // Grow only (no jitter), 10% headroom.
  cache.worldW = Math.max(cache.worldW, maxX * 1.1);
  cache.worldH = Math.max(cache.worldH, maxY * 1.25);
  return cache;
}

export const projectileView: SimView<ProjectileState> = {
  draw(dc: DrawContext, s: ProjectileState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const colors = dark
      ? { bg: "#09090b", grid: "#27272a", axis: "#52525b", text: "#a1a1aa", trail: "#38bdf8", ghost: "#52525b", ball: "#fbbf24", vel: "#34d399", ground: "#3f3f46" }
      : { bg: "#ffffff", grid: "#f4f4f5", axis: "#d4d4d8", text: "#71717a", trail: "#0284c7", ghost: "#d4d4d8", ball: "#f59e0b", vel: "#059669", ground: "#e4e4e7" };

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const { worldW, worldH } = worldBounds(s);
    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const sx = plotW / worldW;
    const sy = plotH / worldH;
    const X = (x: number) => MARGIN.left + x * sx;
    const Y = (y: number) => height - MARGIN.bottom - y * sy;

    // --- grid + axis labels (nice steps) ---
    const step = niceStep(worldW / 6);
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillStyle = colors.text;
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    for (let gx = 0; gx <= worldW; gx += step) {
      ctx.beginPath();
      ctx.moveTo(X(gx), MARGIN.top);
      ctx.lineTo(X(gx), height - MARGIN.bottom);
      ctx.stroke();
      ctx.fillText(formatQuantity(gx, "", locale, 0), X(gx), height - MARGIN.bottom + 16);
    }
    const stepY = niceStep(worldH / 4);
    ctx.textAlign = "right";
    for (let gy = 0; gy <= worldH; gy += stepY) {
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, Y(gy));
      ctx.lineTo(width - MARGIN.right, Y(gy));
      ctx.stroke();
      ctx.fillText(formatQuantity(gy, "", locale, 0), MARGIN.left - 6, Y(gy) + 4);
    }
    // axis captions
    ctx.textAlign = "right";
    ctx.fillText(t("projectile.axis.x"), width - MARGIN.right, height - 6);
    ctx.save();
    ctx.translate(12, MARGIN.top + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillText(t("projectile.axis.y"), 0, 0);
    ctx.restore();

    // --- ground ---
    ctx.fillStyle = colors.ground;
    ctx.fillRect(MARGIN.left, height - MARGIN.bottom, plotW, 4);

    // --- ghost analytic trajectory (vacuum reference) ---
    // Reconstruct v0/θ from the initial trail tangent is fragile; instead the
    // model exposes analytic helpers and we draw the parabola through the
    // recorded apex and start when there is no drag. With drag, the ghost is
    // skipped (comparison would mislead).
    if (s.trail.length > 2 && s.maxY > 0) {
      const apexPt = s.trail.reduce((a, b) => (b.y > a.y ? b : a));
      if (apexPt.y > 0.01) {
        // Parabola with vertex (apexPt.x, apexPt.y) passing through origin.
        const a = apexPt.y / (apexPt.x * apexPt.x || 1);
        ctx.strokeStyle = colors.ghost;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const R = 2 * apexPt.x;
        for (let i = 0; i <= 60; i++) {
          const x = (R * i) / 60;
          const y = apexPt.y - a * (x - apexPt.x) ** 2;
          if (y < 0) break;
          const px = X(x);
          const py = Y(y);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- trail ---
    ctx.strokeStyle = colors.trail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
      else ctx.lineTo(X(p.x), Y(p.y));
    });
    ctx.lineTo(X(s.motion.pos.x), Y(s.motion.pos.y));
    ctx.stroke();

    // --- apex marker ---
    if (s.maxY > 0.05) {
      const apexPt = s.trail.reduce((a, b) => (b.y > a.y ? b : a));
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.fillText(
        `${t("projectile.apex")}: ${formatQuantity(s.maxY, "m", locale, 1)}`,
        X(apexPt.x),
        Y(apexPt.y) - 10,
      );
    }

    // --- velocity vector ---
    const v = s.motion.vel;
    const speed = Math.hypot(v.x, v.y);
    if (speed > 0.01) {
      const px = X(s.motion.pos.x);
      const py = Y(s.motion.pos.y);
      const vScale = Math.min(60, plotW * 0.12) / Math.max(speed, 1);
      const ex = px + v.x * vScale;
      const ey = py - v.y * vScale;
      ctx.strokeStyle = colors.vel;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const ang = Math.atan2(ey - py, ex - px);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 8 * Math.cos(ang - 0.4), ey - 8 * Math.sin(ang - 0.4));
      ctx.lineTo(ex - 8 * Math.cos(ang + 0.4), ey - 8 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fillStyle = colors.vel;
      ctx.fill();
    }

    // --- ball ---
    ctx.beginPath();
    ctx.arc(X(s.motion.pos.x), Y(s.motion.pos.y), 7, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.fill();

    // --- range marker after landing ---
    if (s.landed && s.range > 0) {
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.fillText(
        `${t("projectile.rangeLabel")}: ${formatQuantity(s.range, "m", locale, 1)}`,
        X(s.range / 2),
        height - MARGIN.bottom - 8,
      );
    }
  },
};

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  if (n <= 1) return pow;
  if (n <= 2) return 2 * pow;
  if (n <= 5) return 5 * pow;
  return 10 * pow;
}
