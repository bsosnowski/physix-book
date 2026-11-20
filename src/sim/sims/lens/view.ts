import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { BENCH, type LensState } from "./model";

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * BENCH.halfW), height / (2 * BENCH.halfH));
  return {
    scale,
    X: (x: number) => width / 2 + x * scale,
    Y: (y: number) => height / 2 - y * scale,
  };
}

export const lensToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width / 2) / scale, y: (vp.height / 2 - py) / scale };
};

export const lensView: SimView<LensState> = {
  toWorld: lensToWorld,
  draw(dc: DrawContext, s: LensState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const { X, Y } = geom(width, height);
    const c = dark
      ? { bg: "#09090b", axis: "#3f3f46", lens: "#38bdf8", obj: "#fbbf24", img: "#34d399", virtual: "#71717a", ray: "#f87171", ray2: "#a78bfa", ray3: "#34d399", text: "#a1a1aa", fmark: "#52525b" }
      : { bg: "#ffffff", axis: "#e4e4e7", lens: "#0284c7", obj: "#d97706", img: "#059669", virtual: "#a1a1aa", ray: "#dc2626", ray2: "#7c3aed", ray3: "#059669", text: "#71717a", fmark: "#a1a1aa" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    // principal axis
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // focal marks
    ctx.fillStyle = c.fmark;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    for (const fx of [-Math.abs(s.f), Math.abs(s.f)]) {
      ctx.beginPath();
      ctx.arc(X(fx), Y(0), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("F", X(fx), Y(0) + 16);
    }

    // lens symbol (vertical line with arrowheads: out=converging, in=diverging)
    const lh = BENCH.halfH * 0.8;
    ctx.strokeStyle = c.lens;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(-lh));
    ctx.lineTo(X(0), Y(lh));
    ctx.stroke();
    const conv = s.f > 0;
    for (const top of [true, false]) {
      const y = Y(top ? lh : -lh);
      const dir = top ? 1 : -1;
      const spread = conv ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(X(0) - 7 * spread, y + 8 * dir * spread);
      ctx.lineTo(X(0), y);
      ctx.lineTo(X(0) + 7 * spread, y + 8 * dir * spread);
      ctx.stroke();
    }

    const ox = -s.u;
    const oh = s.h;
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

    // object
    arrowV(ox, oh, c.obj, false);

    if (!s.atInfinity) {
      const ix = s.v; // lens: image on +x when real
      const ih = s.m * oh;
      const clampX = Math.max(-BENCH.halfW + 2, Math.min(BENCH.halfW - 2, ix));
      const visible = Math.abs(ix) < BENCH.halfW * 3 && Math.abs(ih) < BENCH.halfH * 3;

      // three principal rays from object tip
      const ray = (pts: [number, number][], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pts.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(X(x), Y(y));
          else ctx.lineTo(X(x), Y(y));
        });
        ctx.stroke();
      };
      const edge = BENCH.halfW;
      // 1) parallel → refracted through the focal point (f<0 → virtual focus)
      const slope1 = -oh / s.f;
      ray([[ox, oh], [0, oh], [edge, oh + slope1 * edge]], c.ray);
      // 2) through center — undeviated
      const slope2 = -oh / s.u;
      ray([[ox, oh], [edge, oh + slope2 * (edge - ox)]], c.ray2);
      // 3) through near focus → parallel after lens (converging only)
      if (Math.abs(s.u - s.f) > 0.5 && s.f > 0) {
        const yl3 = oh + ((0 - ox) * (0 - oh)) / (-s.f - ox);
        ray([[ox, oh], [0, yl3], [edge, yl3]], c.ray3);
      }

      // image arrow (dashed if virtual)
      if (visible) arrowV(clampX, ih, s.real ? c.img : c.virtual, !s.real);

      // virtual-ray back-extensions (dashed) for virtual images
      if (!s.real && visible) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = c.virtual;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(oh));
        ctx.lineTo(X(ix), Y(ih));
        ctx.moveTo(X(0), Y(0));
        ctx.lineTo(X(ix), Y(ih));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // labels
    ctx.fillStyle = c.text;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      s.atInfinity
        ? t("lens.view.atInfinity")
        : `${t("lens.readout.v")}: ${formatQuantity(s.v, "cm", locale, 1)} · ${s.real ? t("lens.view.real") : t("lens.view.virtual")}`,
      10,
      20,
    );
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(t("lens.view.dragHint"), 10, height - 10);
    ctx.textAlign = "right";
    ctx.fillText(
      `${s.f > 0 ? t("lens.view.converging") : t("lens.view.diverging")} · f = ${formatQuantity(s.f, "cm", locale, 0)}`,
      width - 10,
      20,
    );
  },
};
