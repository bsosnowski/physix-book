import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { ARENA, fieldAt, type ChargesState } from "./model";

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * ARENA.halfW), height / (2 * ARENA.halfH));
  return {
    scale,
    X: (x: number) => width / 2 + x * scale,
    Y: (y: number) => height / 2 - y * scale,
  };
}

export const chargesToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width / 2) / scale, y: (vp.height / 2 - py) / scale };
};

/** Field-line cache: recompute only when charge layout changes. */
let lineCache: { key: string; lines: { x: number; y: number }[][] } | null = null;

function fieldLines(s: ChargesState): { x: number; y: number }[][] {
  const key = s.charges.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.q}`).join(";");
  if (lineCache?.key === key) return lineCache.lines;
  const lines: { x: number; y: number }[][] = [];
  for (const c of s.charges) {
    if (c.q === 0) continue;
    const n = Math.min(12, Math.abs(c.q) * 4);
    const dir = c.q > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      let x = c.x + 0.3 * Math.cos(a);
      let y = c.y + 0.3 * Math.sin(a);
      const pts = [{ x, y }];
      for (let step = 0; step < 400; step++) {
        const { ex, ey } = fieldAt(x, y, s.charges);
        const m = Math.hypot(ex, ey);
        if (m < 1e-6) break;
        x += (dir * ex * 0.08) / m;
        y += (dir * ey * 0.08) / m;
        if (Math.abs(x) > ARENA.halfW || Math.abs(y) > ARENA.halfH) break;
        if (s.charges.some((o) => o.q * dir < 0 && Math.hypot(x - o.x, y - o.y) < 0.3)) break;
        pts.push({ x, y });
      }
      lines.push(pts);
    }
  }
  lineCache = { key, lines };
  return lines;
}

export const chargesView: SimView<ChargesState> = {
  toWorld: chargesToWorld,
  draw(dc: DrawContext, s: ChargesState) {
    const { ctx, width, height, dark, t } = dc;
    const { X, Y, scale } = geom(width, height);
    const c = dark
      ? { bg: "#09090b", line: "#334155", arrow: "#64748b", pos: "#f87171", neg: "#60a5fa", test: "#fbbf24", trail: "#78350f", text: "#a1a1aa" }
      : { bg: "#ffffff", line: "#cbd5e1", arrow: "#94a3b8", pos: "#dc2626", neg: "#2563eb", test: "#d97706", trail: "#fde68a", text: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // vector grid (small arrows)
    ctx.strokeStyle = c.arrow;
    ctx.lineWidth = 1;
    for (let gx = -ARENA.halfW + 0.8; gx < ARENA.halfW; gx += 1.6) {
      for (let gy = -ARENA.halfH + 0.7; gy < ARENA.halfH; gy += 1.4) {
        const { ex, ey } = fieldAt(gx, gy, s.charges);
        const m = Math.hypot(ex, ey);
        if (m < 1e-4) continue;
        const len = Math.min(0.5, 0.18 + Math.log10(1 + m) * 0.22);
        const ux = ex / m;
        const uy = ey / m;
        ctx.globalAlpha = Math.min(0.8, 0.25 + m * 0.08);
        ctx.beginPath();
        ctx.moveTo(X(gx - ux * len * 0.5), Y(gy - uy * len * 0.5));
        ctx.lineTo(X(gx + ux * len * 0.5), Y(gy + uy * len * 0.5));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // field lines
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1.5;
    for (const line of fieldLines(s)) {
      ctx.beginPath();
      line.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      });
      ctx.stroke();
    }

    // test-charge trail + body
    if (s.test.active) {
      ctx.strokeStyle = c.trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      });
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X(s.test.x), Y(s.test.y), 6, 0, Math.PI * 2);
      ctx.fillStyle = c.test;
      ctx.fill();
      ctx.fillStyle = dark ? "#09090b" : "#ffffff";
      ctx.font = "bold 9px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+", X(s.test.x), Y(s.test.y) + 3);
    }

    // source charges
    for (const ch of s.charges) {
      if (ch.q === 0) continue;
      const r = Math.max(10, (0.28 + Math.abs(ch.q) * 0.05) * scale);
      ctx.beginPath();
      ctx.arc(X(ch.x), Y(ch.y), r, 0, Math.PI * 2);
      ctx.fillStyle = ch.q > 0 ? c.pos : c.neg;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(r)}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(ch.q > 0 ? "+" : "−", X(ch.x), Y(ch.y) + r * 0.35);
    }

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("charges.view.dragHint"), 10, height - 10);
  },
};
