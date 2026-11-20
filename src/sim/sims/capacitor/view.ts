import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { CapacitorState } from "./model";

/** World: plates horizontal at y=±1, gap between; x ∈ [−3,3]. */
const W = { halfW: 3, halfH: 2 };

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * W.halfW), height / (2 * W.halfH));
  return { scale, X: (x: number) => width / 2 + x * scale, Y: (y: number) => height / 2 - y * scale };
}

export const capacitorToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width / 2) / scale, y: (vp.height / 2 - py) / scale };
};

export const capacitorView: SimView<CapacitorState> = {
  toWorld: capacitorToWorld,
  draw(dc: DrawContext, s: CapacitorState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const { X, Y } = geom(width, height);
    const c = dark
      ? { bg: "#09090b", pos: "#f87171", neg: "#60a5fa", field: "#475569", probe: "#fbbf24", text: "#a1a1aa", diel: "#1e293b", wire: "#71717a" }
      : { bg: "#ffffff", pos: "#dc2626", neg: "#2563eb", field: "#cbd5e1", probe: "#d97706", text: "#71717a", diel: "#e2e8f0", wire: "#a1a1aa" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const plateHalf = 2.2;
    const gapVis = 0.4 + (s.d / 20) * 1.4; // visual gap scales with d
    const yTop = gapVis / 2;
    const yBot = -gapVis / 2;

    // dielectric fill
    if (s.er > 1.01) {
      ctx.fillStyle = c.diel;
      ctx.fillRect(X(-plateHalf), Y(yTop), (2 * plateHalf) * (width / (2 * W.halfW) > height / (2 * W.halfH) ? height / (2 * W.halfH) : width / (2 * W.halfW)), Y(yBot) - Y(yTop));
    }

    // field arrows (density ∝ E)
    const E = s.V / (s.d * 1e-3);
    const n = Math.max(2, Math.min(12, Math.round(E / 2000)));
    ctx.strokeStyle = c.field;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const x = -plateHalf + ((2 * plateHalf) * (i + 0.5)) / n;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(yTop - 0.05));
      ctx.lineTo(X(x), Y(yBot + 0.05));
      ctx.stroke();
      const ay = Y((yTop + yBot) / 2);
      ctx.beginPath();
      ctx.moveTo(X(x), ay + 5);
      ctx.lineTo(X(x) - 4, ay - 3);
      ctx.lineTo(X(x) + 4, ay - 3);
      ctx.closePath();
      ctx.fillStyle = c.field;
      ctx.fill();
    }

    // plates with charge symbols
    const drawPlate = (y: number, color: string, sign: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(X(-plateHalf), Y(y));
      ctx.lineTo(X(plateHalf), Y(y));
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 12px ui-sans-serif";
      ctx.textAlign = "center";
      const nq = Math.max(1, Math.min(10, Math.round(s.V / 12)));
      for (let i = 0; i < nq; i++) {
        const x = -plateHalf + ((2 * plateHalf) * (i + 0.5)) / nq;
        ctx.fillText(sign, X(x), Y(y) + (sign === "+" ? -8 : 16));
      }
    };
    drawPlate(yTop, c.pos, "+");
    drawPlate(yBot, c.neg, "−");

    // battery wires
    ctx.strokeStyle = c.wire;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(-plateHalf), Y(yTop));
    ctx.lineTo(X(-plateHalf - 0.5), Y(yTop));
    ctx.lineTo(X(-plateHalf - 0.5), Y(0.15));
    ctx.moveTo(X(-plateHalf), Y(yBot));
    ctx.lineTo(X(-plateHalf - 0.5), Y(yBot));
    ctx.lineTo(X(-plateHalf - 0.5), Y(-0.15));
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(-plateHalf - 0.65), Y(0.15));
    ctx.lineTo(X(-plateHalf - 0.35), Y(0.15));
    ctx.moveTo(X(-plateHalf - 0.57), Y(-0.15));
    ctx.lineTo(X(-plateHalf - 0.43), Y(-0.15));
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    ctx.fillText(formatQuantity(s.V, "V", locale, 0), X(-plateHalf - 0.75), Y(0) + 4);

    // probe charge
    if (s.probe.released) {
      const py = yTop - s.probe.f * (yTop - yBot);
      ctx.beginPath();
      ctx.arc(X(0.8), Y(py), 6, 0, Math.PI * 2);
      ctx.fillStyle = c.probe;
      ctx.fill();
      ctx.fillStyle = dark ? "#09090b" : "#fff";
      ctx.font = "bold 9px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+", X(0.8), Y(py) + 3);
    }

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("capacitor.view.hint"), 10, height - 10);
    ctx.textAlign = "right";
    ctx.fillText(`d = ${formatQuantity(s.d, "mm", locale, 1)}${s.er > 1.01 ? ` · εᵣ = ${formatQuantity(s.er, "", locale, 1)}` : ""}`, width - 10, 18);
  },
};
