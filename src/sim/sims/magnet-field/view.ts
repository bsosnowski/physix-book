import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { ARENA, MAG_LEN, fieldAt, type MagnetState } from "./model";

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * ARENA.halfW), height / (2 * ARENA.halfH));
  return { scale, X: (x: number) => width / 2 + x * scale, Y: (y: number) => height / 2 - y * scale };
}

export const magnetToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width / 2) / scale, y: (vp.height / 2 - py) / scale };
};

export const magnetView: SimView<MagnetState> = {
  toWorld: magnetToWorld,
  draw(dc: DrawContext, s: MagnetState) {
    const { ctx, width, height, dark, t } = dc;
    const { X, Y, scale } = geom(width, height);
    const c = dark
      ? { bg: "#09090b", needleN: "#f87171", needleS: "#e4e4e7", pivot: "#52525b", nPole: "#dc2626", sPole: "#2563eb", wire: "#fbbf24", text: "#a1a1aa" }
      : { bg: "#ffffff", needleN: "#dc2626", needleS: "#71717a", pivot: "#a1a1aa", nPole: "#dc2626", sPole: "#2563eb", wire: "#d97706", text: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // compass needle grid
    const step = 1.1;
    for (let gx = -ARENA.halfW + 0.6; gx < ARENA.halfW; gx += step) {
      for (let gy = -ARENA.halfH + 0.55; gy < ARENA.halfH; gy += step) {
        // skip needles overlapping the magnet body
        if (s.mode < 0.5 && Math.abs(gx - s.mx) < MAG_LEN / 2 + 0.4 && Math.abs(gy - s.my) < 0.7) continue;
        if (s.mode >= 0.5 && Math.hypot(gx - s.mx, gy - s.my) < 0.6) continue;
        const { bx, by } = fieldAt(gx, gy, s);
        const m = Math.hypot(bx, by);
        if (m < 1e-6) continue;
        const ux = bx / m;
        const uy = by / m;
        const len = 0.32;
        const alpha = Math.min(1, 0.3 + m * 0.25);
        // N half (red) points along B
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = c.needleN;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(X(gx), Y(gy));
        ctx.lineTo(X(gx + ux * len), Y(gy + uy * len));
        ctx.stroke();
        ctx.strokeStyle = c.needleS;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(gx), Y(gy));
        ctx.lineTo(X(gx - ux * len * 0.7), Y(gy - uy * len * 0.7));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.pivot;
        ctx.beginPath();
        ctx.arc(X(gx), Y(gy), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (s.mode < 0.5) {
      // bar magnet: N red / S blue halves
      const sign = s.flip >= 0.5 ? -1 : 1;
      const half = MAG_LEN / 2;
      const h = 0.5;
      const x0 = s.mx - half;
      ctx.fillStyle = sign > 0 ? c.sPole : c.nPole;
      ctx.fillRect(X(x0), Y(s.my + h), half * scale, 2 * h * scale);
      ctx.fillStyle = sign > 0 ? c.nPole : c.sPole;
      ctx.fillRect(X(s.mx), Y(s.my + h), half * scale, 2 * h * scale);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(0.4 * scale)}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sign > 0 ? "S" : "N", X(s.mx - half / 2), Y(s.my) + 0.14 * scale);
      ctx.fillText(sign > 0 ? "N" : "S", X(s.mx + half / 2), Y(s.my) + 0.14 * scale);
    } else {
      // wire cross-section: dot = current out, cross = current in
      const r = 0.35 * scale;
      ctx.beginPath();
      ctx.arc(X(s.mx), Y(s.my), r, 0, Math.PI * 2);
      ctx.fillStyle = c.wire;
      ctx.fill();
      ctx.strokeStyle = dark ? "#09090b" : "#ffffff";
      ctx.lineWidth = 3;
      if (s.flip < 0.5) {
        ctx.beginPath();
        ctx.arc(X(s.mx), Y(s.my), 3, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "#09090b" : "#ffffff";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(X(s.mx) - r * 0.5, Y(s.my) - r * 0.5);
        ctx.lineTo(X(s.mx) + r * 0.5, Y(s.my) + r * 0.5);
        ctx.moveTo(X(s.mx) + r * 0.5, Y(s.my) - r * 0.5);
        ctx.lineTo(X(s.mx) - r * 0.5, Y(s.my) + r * 0.5);
        ctx.stroke();
      }
    }

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("magnet.view.legend"), 10, height - 10);
    ctx.textAlign = "right";
    ctx.fillText(
      s.mode < 0.5 ? t("magnet.view.barHint") : t("magnet.view.wireHint"),
      width - 10,
      18,
    );
  },
};
