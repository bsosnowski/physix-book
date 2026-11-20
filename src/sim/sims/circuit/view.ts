import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { CircuitState } from "./model";

/** Rectangular loop: battery on the left, three resistors on top. */
export const circuitView: SimView<CircuitState> = {
  draw(dc: DrawContext, s: CircuitState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", wire: "#a1a1aa", res: "#fbbf24", batt: "#34d399", carrier: "#38bdf8", text: "#a1a1aa", box: "#27272a" }
      : { bg: "#ffffff", wire: "#52525b", res: "#f59e0b", batt: "#059669", carrier: "#0284c7", text: "#71717a", box: "#f4f4f5" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const L = width * 0.12;
    const R = width * 0.88;
    const T = height * 0.28;
    const B = height * 0.78;

    const isParallel = s.isParallel;

    ctx.strokeStyle = c.wire;
    ctx.lineWidth = 2.5;

    const resistor = (x: number, y: number, w: number, label: string, v: number, i: number, vertical = false) => {
      ctx.save();
      ctx.translate(x, y);
      if (vertical) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = c.bg;
      ctx.fillRect(-w / 2, -9, w, 18);
      ctx.strokeStyle = c.res;
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -9, w, 18);
      ctx.restore();
      ctx.fillStyle = c.text;
      ctx.font = "11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      const ty = vertical ? y : y - 16;
      const tx = vertical ? x + 34 : x;
      ctx.fillText(label, tx, ty);
      ctx.fillText(
        `${formatQuantity(v, "V", locale, 1)} · ${formatQuantity(i, "A", locale, 2)}`,
        tx,
        ty + 13,
      );
    };

    // battery symbol on left edge
    const battY = (T + B) / 2;
    ctx.strokeStyle = c.wire;
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, battY - 12);
    ctx.moveTo(L, battY + 12);
    ctx.lineTo(L, B);
    ctx.stroke();
    ctx.strokeStyle = c.batt;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L - 16, battY - 12);
    ctx.lineTo(L + 16, battY - 12); // long plate +
    ctx.moveTo(L - 8, battY + 12);
    ctx.lineTo(L + 8, battY + 12); // short plate −
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    const vBatt = isParallel ? s.v1 : s.v1 + s.v2 + s.v3;
    ctx.fillText(formatQuantity(vBatt, "V", locale, 1), L - 22, battY + 4);
    ctx.textAlign = "left";
    ctx.fillText("+", L + 22, battY - 8);
    ctx.fillText("−", L + 22, battY + 18);

    const rx = [0.32, 0.55, 0.78].map((f) => width * f);
    const labels = ["R₁", "R₂", "R₃"];
    const vs = [s.v1, s.v2, s.v3];
    const is = [s.i1, s.i2, s.i3];

    if (!isParallel) {
      // single loop, resistors in the top wire
      ctx.strokeStyle = c.wire;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(L, T, R - L, B - T);
      rx.forEach((x, k) => resistor(x, T, 52, labels[k], vs[k], is[k]));
      // carriers around the loop
      const perim = 2 * (R - L) + 2 * (B - T);
      ctx.fillStyle = c.carrier;
      for (let k = 0; k < 26; k++) {
        let d = ((k / 26 + s.phase) % 1) * perim;
        let px = L, py = T;
        const wTop = R - L, hSide = B - T;
        if (d < wTop) { px = L + d; py = T; }
        else if ((d -= wTop) < hSide) { px = R; py = T + d; }
        else if ((d -= hSide) < wTop) { px = R - d; py = B; }
        else { d -= wTop; px = L; py = B - d; }
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // three vertical branches between top and bottom rails
      ctx.strokeStyle = c.wire;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(L, T); ctx.lineTo(R, T);
      ctx.moveTo(L, B); ctx.lineTo(R, B);
      ctx.stroke();
      rx.forEach((x, k) => {
        ctx.beginPath();
        ctx.moveTo(x, T);
        ctx.lineTo(x, B);
        ctx.stroke();
        resistor(x, (T + B) / 2, 52, labels[k], vs[k], is[k], true);
        // carriers per branch, speed ∝ branch current
        ctx.fillStyle = c.carrier;
        const n = 6;
        for (let j = 0; j < n; j++) {
          const f = (j / n + s.phase * Math.min(is[k], 8) * 0.5) % 1;
          ctx.beginPath();
          ctx.arc(x, T + f * (B - T), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      // main-loop carriers on rails
      ctx.fillStyle = c.carrier;
      for (let k = 0; k < 10; k++) {
        const f = (k / 10 + s.phase) % 1;
        ctx.beginPath();
        ctx.arc(L + f * (R - L), T, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(R - f * (R - L), B, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // caption
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      isParallel ? t("circuit.view.parallel") : t("circuit.view.series"),
      L,
      height - 10,
    );
    ctx.textAlign = "right";
    ctx.fillText(
      `${t("circuit.readout.itotal")}: ${formatQuantity(s.itotal, "A", locale, 2)}`,
      R,
      height - 10,
    );
  },
};
