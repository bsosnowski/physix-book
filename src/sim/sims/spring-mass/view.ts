import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { SpringState } from "./model";

/** Vertical spring hanging from a ceiling; +x is downward. */
export const springView: SimView<SpringState> = {
  draw(dc: DrawContext, s: SpringState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", spring: "#a1a1aa", mass: "#fbbf24", eq: "#52525b", text: "#a1a1aa", ceil: "#71717a" }
      : { bg: "#ffffff", spring: "#52525b", mass: "#f59e0b", eq: "#d4d4d8", text: "#71717a", ceil: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const ceilY = 24;
    const eqY = height * 0.52; // equilibrium position on screen
    const scale = (height * 0.32) / 0.85; // max |x0| = 0.8 m fits
    const massY = eqY + s.x * scale;
    const massSize = 34;

    // ceiling
    ctx.strokeStyle = c.ceil;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 50, ceilY);
    ctx.lineTo(cx + 50, ceilY);
    ctx.stroke();
    // hatching
    ctx.lineWidth = 1;
    for (let i = -45; i <= 45; i += 10) {
      ctx.beginPath();
      ctx.moveTo(cx + i, ceilY);
      ctx.lineTo(cx + i - 6, ceilY - 8);
      ctx.stroke();
    }

    // equilibrium dashed line
    ctx.strokeStyle = c.eq;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx - 110, eqY);
    ctx.lineTo(cx + 110, eqY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("spring.view.equilibrium"), cx + 116, eqY + 4);

    // spring (zigzag)
    const topY = ceilY;
    const botY = massY - massSize / 2;
    const coils = 12;
    const amp = 16;
    ctx.strokeStyle = c.spring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    const usable = botY - topY - 16;
    ctx.lineTo(cx, topY + 8);
    for (let i = 0; i <= coils; i++) {
      const y = topY + 8 + (usable * i) / coils;
      const x = cx + (i === 0 || i === coils ? 0 : i % 2 === 0 ? amp : -amp);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx, botY);
    ctx.stroke();

    // mass
    ctx.fillStyle = c.mass;
    ctx.beginPath();
    ctx.roundRect(cx - massSize / 2, massY - massSize / 2, massSize, massSize, 6);
    ctx.fill();

    // displacement readout arrow
    if (Math.abs(s.x) > 0.01) {
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 70, eqY);
      ctx.lineTo(cx - 70, massY);
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.textAlign = "right";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText(
        `x = ${formatQuantity(s.x, "m", locale, 2)}`,
        cx - 78,
        (eqY + massY) / 2 + 4,
      );
    }
  },
};
