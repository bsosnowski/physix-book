import type { DrawContext, SimView } from "../../framework/types";
import { STRING_LEN, displacement, traveling, type WaveState } from "./model";

export const standingWaveView: SimView<WaveState> = {
  draw(dc: DrawContext, s: WaveState) {
    const { ctx, width, height, dark, t, locale } = dc;
    void locale;
    const c = dark
      ? { bg: "#09090b", axis: "#3f3f46", wave: "#38bdf8", ghost: "#7f1d1d", ghost2: "#14532d", node: "#fbbf24", text: "#a1a1aa", wall: "#71717a" }
      : { bg: "#ffffff", axis: "#e4e4e7", wave: "#0284c7", ghost: "#fca5a5", ghost2: "#86efac", node: "#f59e0b", text: "#71717a", wall: "#a1a1aa" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const margin = 36;
    const midY = height / 2;
    const sx = (width - margin * 2) / STRING_LEN;
    const sy = (height * 0.36) / 1.5; // max A = 1.5 m fits
    const X = (x: number) => margin + x * sx;
    const Y = (y: number) => midY - y * sy;
    const p = { n: s.n, A: s.A, v: s.v };

    // rest axis
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, midY);
    ctx.lineTo(width - margin, midY);
    ctx.stroke();

    // fixed ends (walls)
    ctx.fillStyle = c.wall;
    ctx.fillRect(margin - 8, midY - 40, 8, 80);
    ctx.fillRect(width - margin, midY - 40, 8, 80);

    // component traveling waves (ghosts)
    const drawCurve = (fn: (x: number) => number, color: string, lw: number, dash: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const x = (STRING_LEN * i) / 240;
        const px = X(x);
        const py = Y(fn(x));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawCurve((x) => traveling(x, s.t, p)[0], c.ghost, 1.25, [5, 4]);
    drawCurve((x) => traveling(x, s.t, p)[1], c.ghost2, 1.25, [5, 4]);

    // envelope ±A·sin(kx)
    drawCurve((x) => s.A * Math.sin((s.n * Math.PI * x) / STRING_LEN), c.axis, 1, [2, 3]);
    drawCurve((x) => -s.A * Math.sin((s.n * Math.PI * x) / STRING_LEN), c.axis, 1, [2, 3]);

    // the standing wave
    drawCurve((x) => displacement(x, s.t, p), c.wave, 2.5, []);

    // nodes
    ctx.fillStyle = c.node;
    for (let j = 0; j <= s.n; j++) {
      const x = (j * STRING_LEN) / s.n;
      ctx.beginPath();
      ctx.arc(X(x), midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // legend
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.fillText("— " + t("wave.view.resultant"), margin, height - 24);
    ctx.fillText("--- " + t("wave.view.components"), margin, height - 10);
    ctx.textAlign = "right";
    ctx.fillText("● " + t("wave.view.nodes"), width - margin, height - 10);
  },
};
