import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { ARENA_HALF, type CollisionState } from "./model";

export const collisionView: SimView<CollisionState> = {
  draw(dc: DrawContext, s: CollisionState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", floor: "#3f3f46", wall: "#52525b", b1: "#38bdf8", b2: "#f87171", text: "#a1a1aa", trail1: "#0c4a6e", trail2: "#7f1d1d" }
      : { bg: "#ffffff", floor: "#e4e4e7", wall: "#a1a1aa", b1: "#0284c7", b2: "#dc2626", text: "#71717a", trail1: "#bae6fd", trail2: "#fecaca" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const margin = 24;
    const sx = (width - margin * 2) / (ARENA_HALF * 2);
    const X = (x: number) => margin + (x + ARENA_HALF) * sx;
    const floorY = height * 0.62;

    // floor + walls
    ctx.fillStyle = c.floor;
    ctx.fillRect(margin, floorY, width - margin * 2, 4);
    ctx.fillStyle = c.wall;
    ctx.fillRect(margin - 6, floorY - 90, 6, 94);
    ctx.fillRect(width - margin, floorY - 90, 6, 94);

    // position trails (fading ticks under each ball)
    const drawTrail = (trail: number[], color: string, yOff: number) => {
      ctx.fillStyle = color;
      trail.forEach((x, i) => {
        if (i % 4 !== 0) return;
        ctx.globalAlpha = (i / trail.length) * 0.8 + 0.1;
        ctx.fillRect(X(x) - 1, floorY + 10 + yOff, 2, 5);
      });
      ctx.globalAlpha = 1;
    };
    drawTrail(s.trail1, c.trail1, 0);
    drawTrail(s.trail2, c.trail2, 8);

    // balls (radius ∝ ∛m, so area roughly ∝ mass on screen)
    const drawBall = (x: number, r: number, v: number, color: string, label: string) => {
      const pr = Math.max(10, r * sx);
      const px = X(x);
      const py = floorY - pr;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = dark ? "#09090b" : "#ffffff";
      ctx.font = `bold ${Math.max(10, pr * 0.55)}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(label, px, py + pr * 0.2);
      // velocity arrow
      if (Math.abs(v) > 0.05) {
        const len = Math.max(-80, Math.min(80, v * 10));
        const y = py - pr - 14;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + len, y);
        ctx.stroke();
        const dir = Math.sign(len);
        ctx.beginPath();
        ctx.moveTo(px + len, y);
        ctx.lineTo(px + len - dir * 7, y - 4);
        ctx.lineTo(px + len - dir * 7, y + 4);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = "11px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = c.text;
        ctx.fillText(formatQuantity(v, "m/s", locale, 1), px + len / 2, y - 8);
      }
    };
    drawBall(s.b1.x, s.r1, s.b1.v, c.b1, "1");
    drawBall(s.b2.x, s.r2, s.b2.v, c.b2, "2");

    // caption
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("collision.view.walls"), margin, height - 10);
  },
};
