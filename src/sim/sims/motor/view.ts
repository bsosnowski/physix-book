import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { MotorState } from "./model";

/** Front view: N/S magnet blocks left/right, rotating coil in the gap. */
export const motorView: SimView<MotorState> = {
  draw(dc: DrawContext, s: MotorState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", n: "#dc2626", s: "#2563eb", coil: "#fbbf24", axis: "#52525b", text: "#a1a1aa", current: "#34d399", spark: "#fde68a" }
      : { bg: "#ffffff", n: "#dc2626", s: "#2563eb", coil: "#d97706", axis: "#a1a1aa", text: "#71717a", current: "#059669", spark: "#f59e0b" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.28;

    // magnet blocks
    ctx.fillStyle = c.n;
    ctx.fillRect(cx - R * 1.9, cy - R * 1.1, R * 0.55, R * 2.2);
    ctx.fillStyle = c.s;
    ctx.fillRect(cx + R * 1.35, cy - R * 1.1, R * 0.55, R * 2.2);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(R * 0.4)}px ui-sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("N", cx - R * 1.62, cy + R * 0.14);
    ctx.fillText("S", cx + R * 1.62, cy + R * 0.14);

    // field arrows N→S
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1;
    for (const fy of [-0.7, 0, 0.7]) {
      const y = cy + fy * R;
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.3, y);
      ctx.lineTo(cx + R * 1.3, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + R * 1.3, y);
      ctx.lineTo(cx + R * 1.2, y - 4);
      ctx.lineTo(cx + R * 1.2, y + 4);
      ctx.closePath();
      ctx.fillStyle = c.axis;
      ctx.fill();
    }

    // rotating coil: two conductor cross-sections at ±R on the coil axis
    const a = s.theta;
    const x1 = cx + R * Math.cos(a);
    const y1 = cy + R * Math.sin(a);
    const x2 = cx - R * Math.cos(a);
    const y2 = cy - R * Math.sin(a);
    // coil loop (ellipse hint)
    ctx.strokeStyle = c.coil;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const conductor = (x: number, y: number, out: boolean) => {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = c.coil;
      ctx.fill();
      ctx.strokeStyle = dark ? "#09090b" : "#fff";
      ctx.lineWidth = 2;
      if (out) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "#09090b" : "#fff";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      }
    };
    // current direction flips every half turn with the commutator
    const dirFlip = Math.floor(Math.abs(a) / Math.PI) % 2 === 1;
    conductor(x1, y1, !dirFlip);
    conductor(x2, y2, dirFlip);

    // force arrows F = BIL (perpendicular to B, on each conductor)
    if (Math.abs(s.current) > 0.05) {
      const fdir = Math.sign(s.torque || 1) * (dirFlip ? -1 : 1);
      const arrow = (x: number, y: number, dy: number) => {
        ctx.strokeStyle = c.current;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + dy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + dy);
        ctx.lineTo(x - 5, y + dy - Math.sign(dy) * 8);
        ctx.lineTo(x + 5, y + dy - Math.sign(dy) * 8);
        ctx.closePath();
        ctx.fillStyle = c.current;
        ctx.fill();
      };
      const len = Math.min(50, 12 + Math.abs(s.torque) * 1500);
      arrow(x1, y1, -fdir * len);
      arrow(x2, y2, fdir * len);
    }

    // axle + commutator hint
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = c.axis;
    ctx.fill();
    // commutator spark at switching
    const frac = Math.abs(a) / Math.PI;
    if (Math.abs(frac - Math.round(frac)) < 0.03 && Math.abs(s.omega) > 1) {
      ctx.fillStyle = c.spark;
      ctx.beginPath();
      ctx.arc(cx, cy + 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${formatQuantity((s.omega * 60) / (2 * Math.PI), "rpm", locale, 0)}`, 10, 20);
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(t("motor.view.legend"), 10, height - 10);
  },
};
