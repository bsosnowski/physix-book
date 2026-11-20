import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { PendulumState } from "./model";

export const pendulumView: SimView<PendulumState> = {
  draw(dc: DrawContext, s: PendulumState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", rod: "#a1a1aa", bob: "#fbbf24", ghost: "#52525b", pivot: "#71717a", text: "#a1a1aa", arc: "#38bdf8" }
      : { bg: "#ffffff", rod: "#52525b", bob: "#f59e0b", ghost: "#d4d4d8", pivot: "#71717a", text: "#71717a", arc: "#0284c7" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // Fixed world scale: longest rod (3 m) always fits.
    const pivotX = width / 2;
    const pivotY = height * 0.14;
    const scale = (height * 0.76) / 3.05;
    const rodLen = scale * s.L;

    const bx = pivotX + rodLen * Math.sin(s.theta);
    const by = pivotY + rodLen * Math.cos(s.theta);
    const gx = pivotX + rodLen * Math.sin(s.thetaRef);
    const gy = pivotY + rodLen * Math.cos(s.thetaRef);

    // ceiling
    ctx.strokeStyle = c.pivot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX - 40, pivotY);
    ctx.lineTo(pivotX + 40, pivotY);
    ctx.stroke();

    // angle arc from vertical
    ctx.strokeStyle = c.arc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const start = Math.PI / 2;
    ctx.arc(pivotX, pivotY, 34, start - Math.max(s.theta, 0), start - Math.min(s.theta, 0));
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      `θ = ${formatQuantity(s.theta / (Math.PI / 180), "°", locale, 1)}`,
      pivotX + 42,
      pivotY + 14,
    );

    // ghost: small-angle reference
    ctx.strokeStyle = c.ghost;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(gx, gy, 10, 0, Math.PI * 2);
    ctx.stroke();

    // real pendulum
    ctx.strokeStyle = c.rod;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fillStyle = c.bob;
    ctx.fill();

    // pivot
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = c.pivot;
    ctx.fill();

    // legend
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText("— " + t("pendulum.view.exact"), 12, height - 24);
    ctx.fillText("--- " + t("pendulum.view.smallAngle"), 12, height - 10);
  },
};
