import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { BENCH, type MirrorState } from "./model";

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * BENCH.halfW), height / (2 * BENCH.halfH));
  return {
    scale,
    X: (x: number) => width * 0.82 + x * scale, // mirror at right side
    Y: (y: number) => height / 2 - y * scale,
  };
}

export const mirrorToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width * 0.82) / scale, y: (vp.height / 2 - py) / scale };
};

export const mirrorView: SimView<MirrorState> = {
  toWorld: mirrorToWorld,
  draw(dc: DrawContext, s: MirrorState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const { X, Y, scale } = geom(width, height);
    const c = dark
      ? { bg: "#09090b", axis: "#3f3f46", mirror: "#38bdf8", obj: "#fbbf24", img: "#34d399", virtual: "#71717a", ray: "#f87171", ray2: "#a78bfa", text: "#a1a1aa" }
      : { bg: "#ffffff", axis: "#e4e4e7", mirror: "#0284c7", obj: "#d97706", img: "#059669", virtual: "#a1a1aa", ray: "#dc2626", ray2: "#7c3aed", text: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // principal axis
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // mirror: plane line / curved arc
    const mh = BENCH.halfH * 0.85;
    ctx.strokeStyle = c.mirror;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (s.type < 0.5) {
      ctx.moveTo(X(0), Y(-mh));
      ctx.lineTo(X(0), Y(mh));
    } else {
      // arc bulging away from (concave) or toward (convex) the object
      const R = 2 * Math.abs(s.f);
      const dir = s.type < 1.5 ? -1 : 1; // concave center at −R
      const cxw = dir * R;
      const rPix = R * scale;
      const aMax = Math.asin(Math.min(0.95, mh / R));
      // arc around center (cxw, 0), passing through origin
      const start = dir < 0 ? -aMax : Math.PI - aMax;
      const end = dir < 0 ? aMax : Math.PI + aMax;
      ctx.arc(X(cxw), Y(0), rPix, start, end, dir > 0);
    }
    ctx.stroke();
    // hatching behind mirror
    ctx.lineWidth = 1;
    for (let y = -mh; y <= mh; y += 3) {
      ctx.beginPath();
      ctx.moveTo(X(0) + 3, Y(y));
      ctx.lineTo(X(0) + 9, Y(y) - 5);
      ctx.stroke();
    }

    // F and C marks (curved mirrors)
    if (Number.isFinite(s.f)) {
      ctx.fillStyle = c.text;
      ctx.font = "11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      for (const [x, label] of [[-Math.abs(s.f), "F"], [-2 * Math.abs(s.f), "C"]] as const) {
        ctx.beginPath();
        ctx.arc(X(x), Y(0), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(label, X(x), Y(0) + 16);
      }
    }

    const arrowV = (x: number, h: number, color: string, dashed: boolean) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash(dashed ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(X(x), Y(0));
      ctx.lineTo(X(x), Y(h));
      ctx.stroke();
      ctx.setLineDash([]);
      const dir = Math.sign(h) || 1;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(h));
      ctx.lineTo(X(x) - 5, Y(h) + 9 * dir);
      ctx.lineTo(X(x) + 5, Y(h) + 9 * dir);
      ctx.closePath();
      ctx.fill();
    };

    const ox = -s.u;
    const oh = s.h;
    arrowV(ox, oh, c.obj, false);

    // image: mirror convention v>0 → in front (x=−v); v<0 → behind (x=−v>0)
    const ix = -s.v;
    const ih = s.m * oh;
    const visible = Math.abs(ix) < BENCH.halfW * 1.6 && Math.abs(ih) < BENCH.halfH * 3;
    if (visible) arrowV(ix, ih, s.real ? c.img : c.virtual, !s.real);

    // two principal rays from the object tip
    const ray = (pts: [number, number][], color: string, dashed = false) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(X(x), Y(y));
        else ctx.lineTo(X(x), Y(y));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const left = -BENCH.halfW * 1.4;
    if (Number.isFinite(s.f) && Math.abs(s.u - Math.abs(s.f)) > 0.5) {
      // 1) parallel to axis → reflects through F (concave) / from F (convex)
      const fSigned = s.f;
      const slope = (0 - oh) / (0 - -fSigned); // line mirror-hit(0,oh) → (−f,0)
      ray([[ox, oh], [0, oh], [left, oh + slope * (left - 0)]], c.ray);
      if (!s.real && visible) ray([[0, oh], [ix, ih]], c.ray, true);
      // 2) toward C → back on itself (approx: through center of curvature)
      const cx = -2 * Math.abs(s.f) * (s.type < 1.5 ? 1 : -1);
      const slope2 = (0 - oh) / (cx - ox);
      const yHit = oh + slope2 * (0 - ox);
      ray([[ox, oh], [0, yHit], [left, yHit + slope2 * (left - 0)]], c.ray2);
    } else {
      // plane mirror: parallel ray reflects straight back; oblique ray
      // reflects symmetrically about the normal (horizontal axis)
      ray([[ox, oh], [0, oh], [left, oh]], c.ray);
      const yHit2 = oh * 0.4;
      const slope2 = (yHit2 - oh) / (0 - ox);
      ray([[ox, oh], [0, yHit2], [left, yHit2 - slope2 * (left - 0)]], c.ray2);
      if (visible) {
        ray([[0, oh], [ix, ih]], c.ray, true);
        ray([[0, yHit2], [ix, ih]], c.ray2, true);
      }
    }

    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    const kindLabel = s.type < 0.5 ? t("mirror.view.plane") : s.type < 1.5 ? t("mirror.view.concave") : t("mirror.view.convex");
    ctx.fillText(
      `${kindLabel} · ${t("mirror.readout.v")}: ${formatQuantity(s.v, "cm", locale, 1)} · ${s.real ? t("mirror.view.real") : t("mirror.view.virtual")}`,
      10,
      20,
    );
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(t("mirror.view.dragHint"), 10, height - 10);
  },
};
