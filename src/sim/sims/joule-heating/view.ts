import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { HeatingState } from "./model";

export const heatingView: SimView<HeatingState> = {
  draw(dc: DrawContext, s: HeatingState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", beaker: "#a1a1aa", water: "#0c4a6e", waterHot: "#7f1d1d", coil: "#fbbf24", text: "#a1a1aa", therm: "#f87171", bubble: "#e4e4e7" }
      : { bg: "#ffffff", beaker: "#71717a", water: "#bae6fd", waterHot: "#fecaca", coil: "#f59e0b", text: "#71717a", therm: "#dc2626", bubble: "#ffffff" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // beaker
    const bx = width * 0.3;
    const bw = width * 0.32;
    const bTop = height * 0.18;
    const bBot = height * 0.84;
    const waterTop = bTop + (bBot - bTop) * 0.2;

    // water color lerps cold→hot
    const f = Math.min(1, Math.max(0, (s.temp - 20) / 80));
    const lerp = (a: string, b: string) => {
      const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
      const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
      return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * f)).join(",")})`;
    };
    ctx.fillStyle = lerp(c.water, c.waterHot);
    ctx.fillRect(bx, waterTop, bw, bBot - waterTop);

    ctx.strokeStyle = c.beaker;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, bTop);
    ctx.lineTo(bx, bBot);
    ctx.lineTo(bx + bw, bBot);
    ctx.lineTo(bx + bw, bTop);
    ctx.stroke();

    // heating coil (glow ∝ power)
    const coilY = bBot - 24;
    const glow = Math.min(1, s.power / 2000);
    ctx.strokeStyle = c.coil;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.4 + glow * 0.6;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const x = bx + 14 + ((bw - 28) * i) / 24;
      const y = coilY + (i % 2 === 0 ? -6 : 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // wires out of the beaker
    ctx.strokeStyle = c.beaker;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 14, coilY);
    ctx.lineTo(bx - 20, coilY);
    ctx.lineTo(bx - 20, bTop - 10);
    ctx.moveTo(bx + bw - 14, coilY);
    ctx.lineTo(bx + bw + 20, coilY);
    ctx.lineTo(bx + bw + 20, bTop - 10);
    ctx.stroke();

    // bubbles while boiling (deterministic pseudo-random from t)
    if (s.boiling) {
      ctx.fillStyle = c.bubble;
      for (let i = 0; i < 14; i++) {
        const seed = Math.sin(i * 127.1) * 43758.5453;
        const fx = seed - Math.floor(seed);
        const rise = ((s.t * (0.5 + fx) + fx) % 1);
        const x = bx + 10 + fx * (bw - 20);
        const y = coilY - rise * (coilY - waterTop - 6);
        ctx.globalAlpha = 0.7 * (1 - rise * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, 2 + fx * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // thermometer
    const tx = width * 0.74;
    const tTop = height * 0.16;
    const tBot = height * 0.78;
    ctx.strokeStyle = c.beaker;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx - 7, tTop, 14, tBot - tTop);
    ctx.beginPath();
    ctx.arc(tx, tBot + 12, 12, 0, Math.PI * 2);
    ctx.stroke();
    const frac = Math.min(1, Math.max(0, (s.temp - 0) / 110));
    ctx.fillStyle = c.therm;
    ctx.beginPath();
    ctx.arc(tx, tBot + 12, 9, 0, Math.PI * 2);
    ctx.fill();
    const colH = (tBot - tTop - 8) * frac;
    ctx.fillRect(tx - 4, tBot - 4 - colH, 8, colH + 4);
    // scale marks
    ctx.fillStyle = c.text;
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    for (const mark of [0, 20, 50, 100]) {
      const y = tBot - 4 - (tBot - tTop - 8) * (mark / 110);
      ctx.fillRect(tx + 8, y, 5, 1);
      ctx.fillText(String(mark), tx + 16, y + 3);
    }
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.fillText(formatQuantity(s.temp, "°C", locale, 1), tx - 14, tTop - 8);

    // captions
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("heating.view.timeScale"), 10, height - 10);
    if (s.boiling) {
      ctx.fillStyle = c.therm;
      ctx.textAlign = "right";
      ctx.fillText(t("heating.view.boiling"), width - 10, 20);
    }
  },
};
