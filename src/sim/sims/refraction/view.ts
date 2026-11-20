import type { DrawContext, ScreenToWorld, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import { WORLD, refractAngle, reflectance, type RefractionState } from "./model";

const DEG = Math.PI / 180;

function geom(width: number, height: number) {
  const scale = Math.min(width / (2 * WORLD.halfW), height / (2 * WORLD.halfH));
  return {
    scale,
    X: (x: number) => width / 2 + x * scale,
    Y: (y: number) => height / 2 - y * scale,
  };
}

export const refractionToWorld: ScreenToWorld = (vp, px, py) => {
  const { scale } = geom(vp.width, vp.height);
  return { x: (px - vp.width / 2) / scale, y: (vp.height / 2 - py) / scale };
};

export const refractionView: SimView<RefractionState> = {
  toWorld: refractionToWorld,
  draw(dc: DrawContext, s: RefractionState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const { X, Y, scale } = geom(width, height);
    const c = dark
      ? { top: "#09090b", bottom: "#0c1a2e", normal: "#3f3f46", incident: "#fbbf24", refracted: "#38bdf8", reflected: "#a1a1aa", text: "#a1a1aa", iface: "#52525b" }
      : { top: "#ffffff", bottom: "#dbeafe", normal: "#d4d4d8", incident: "#d97706", refracted: "#0284c7", reflected: "#a1a1aa", text: "#71717a", iface: "#71717a" };

    // media
    ctx.fillStyle = c.top;
    ctx.fillRect(0, 0, width, height / 2);
    ctx.fillStyle = c.bottom;
    ctx.fillRect(0, height / 2, width, height / 2);

    // interface + normal
    ctx.strokeStyle = c.iface;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.strokeStyle = c.normal;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 10);
    ctx.lineTo(width / 2, height - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    const th1 = s.thetaDeg * DEG;
    const t2 = refractAngle(s.n1, s.n2, th1);
    const R = reflectance(s.n1, s.n2, th1);
    const rayLen = 3.6; // world units
    // incident ray comes from top-left toward origin
    const ix = -Math.sin(th1) * rayLen;
    const iy = Math.cos(th1) * rayLen;

    const arrow = (x0: number, y0: number, x1: number, y1: number, color: string, alpha: number) => {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(y0));
      ctx.lineTo(X(x1), Y(y1));
      ctx.stroke();
      const a = Math.atan2(Y(y1) - Y(y0), X(x1) - X(x0));
      const mx = X((x0 + x1) / 2);
      const my = Y((y0 + y1) / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx + 8 * Math.cos(a), my + 8 * Math.sin(a));
      ctx.lineTo(mx - 5 * Math.cos(a - 0.5), my - 5 * Math.sin(a - 0.5));
      ctx.lineTo(mx - 5 * Math.cos(a + 0.5), my - 5 * Math.sin(a + 0.5));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    arrow(ix, iy, 0, 0, c.incident, 1);
    // reflected ray (always present, intensity ∝ R)
    arrow(0, 0, Math.sin(th1) * rayLen, Math.cos(th1) * rayLen, c.reflected, 0.25 + R * 0.75);
    // refracted ray
    if (t2 !== null) {
      arrow(0, 0, Math.sin(t2) * rayLen, -Math.cos(t2) * rayLen, c.refracted, 0.3 + (1 - R) * 0.7);
    }

    // travelling photon dot along incident→(refracted|reflected)
    const ph = s.phase;
    let px: number, py: number;
    if (ph < 0.5) {
      const f = ph / 0.5;
      px = ix * (1 - f);
      py = iy * (1 - f);
    } else {
      const f = (ph - 0.5) / 0.5;
      if (t2 !== null) {
        px = Math.sin(t2) * rayLen * f;
        py = -Math.cos(t2) * rayLen * f;
      } else {
        px = Math.sin(th1) * rayLen * f;
        py = Math.cos(th1) * rayLen * f;
      }
    }
    ctx.beginPath();
    ctx.arc(X(px), Y(py), 4, 0, Math.PI * 2);
    ctx.fillStyle = c.incident;
    ctx.fill();

    // angle labels
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillStyle = c.text;
    ctx.textAlign = "right";
    ctx.fillText(`θ₁ = ${formatQuantity(s.thetaDeg, "°", locale, 0)}`, width / 2 - 12, height / 2 - 46);
    ctx.textAlign = "left";
    if (t2 !== null) {
      ctx.fillText(`θ₂ = ${formatQuantity(t2 / DEG, "°", locale, 1)}`, width / 2 + 12, height / 2 + 56);
    } else {
      ctx.fillStyle = dark ? "#f87171" : "#dc2626";
      ctx.fillText(t("refraction.view.tir"), width / 2 + 12, height / 2 + 56);
    }

    // media labels + hint
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`n₁ = ${formatQuantity(s.n1, "", locale, 2)}`, 10, 18);
    ctx.fillText(`n₂ = ${formatQuantity(s.n2, "", locale, 2)}`, 10, height - 10);
    ctx.textAlign = "right";
    ctx.fillText(t("refraction.view.dragHint"), width - 10, 18);
    void scale;
  },
};
