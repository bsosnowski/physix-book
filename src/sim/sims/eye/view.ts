import type { DrawContext, SimView } from "../../framework/types";
import { formatQuantity } from "../../core/units";
import type { EyeState } from "./model";

/** Side view: object left, glasses+lens at x=0, eyeball to the right. */
export const eyeView: SimView<EyeState> = {
  draw(dc: DrawContext, s: EyeState) {
    const { ctx, width, height, dark, t, locale } = dc;
    const c = dark
      ? { bg: "#09090b", eye: "#1e293b", outline: "#64748b", retina: "#f87171", lens: "#38bdf8", glasses: "#a78bfa", obj: "#fbbf24", ray: "#34d399", text: "#a1a1aa", blur: "#fbbf24" }
      : { bg: "#ffffff", eye: "#f1f5f9", outline: "#94a3b8", retina: "#dc2626", lens: "#0284c7", glasses: "#7c3aed", obj: "#d97706", ray: "#059669", text: "#71717a", blur: "#d97706" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const lensX = width * 0.38;
    const cy = height / 2;
    // scale: eyeball ~2 cm → radius R px; world cm → px
    const scale = Math.min(width, height) * 0.16; // px per cm
    const R = s.axial * scale * 0.62;

    // eyeball
    ctx.beginPath();
    ctx.arc(lensX + R * 0.8, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = c.eye;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2;
    ctx.stroke();

    // retina (back arc)
    const retinaX = lensX + s.axial * scale;
    ctx.strokeStyle = c.retina;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(lensX + R * 0.8, cy, R - 3, -0.9, 0.9);
    ctx.stroke();

    // eye lens
    ctx.strokeStyle = c.lens;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(lensX, cy, 6 + (s.power - 48) * 0.8, R * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    // glasses (if any)
    if (Math.abs(s.glasses) > 0.01) {
      ctx.strokeStyle = c.glasses;
      ctx.lineWidth = 2.5;
      const gx = lensX - 0.5 * scale;
      ctx.beginPath();
      if (s.glasses > 0) {
        ctx.ellipse(gx, cy, 5, R * 0.6, 0, 0, Math.PI * 2);
      } else {
        // diverging: hourglass-ish (two arcs)
        ctx.moveTo(gx - 5, cy - R * 0.6);
        ctx.quadraticCurveTo(gx + 6, cy, gx - 5, cy + R * 0.6);
        ctx.moveTo(gx + 5, cy - R * 0.6);
        ctx.quadraticCurveTo(gx - 6, cy, gx + 5, cy + R * 0.6);
      }
      ctx.stroke();
      ctx.fillStyle = c.glasses;
      ctx.font = "11px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${formatQuantity(s.glasses, "D", locale, 2)}`, gx, cy - R * 0.75);
    }

    // object arrow (distance compressed logarithmically for display)
    const objX = lensX - Math.min(lensX - 30, (Math.log10(s.u) / Math.log10(500)) * (lensX - 40));
    const oh = height * 0.16;
    ctx.strokeStyle = c.obj;
    ctx.fillStyle = c.obj;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(objX, cy);
    ctx.lineTo(objX, cy - oh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(objX, cy - oh);
    ctx.lineTo(objX - 5, cy - oh + 9);
    ctx.lineTo(objX + 5, cy - oh + 9);
    ctx.closePath();
    ctx.fill();
    ctx.font = "11px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = c.text;
    ctx.fillText(formatQuantity(s.u, "cm", locale, 0), objX, cy + 16);

    // rays: from tip through lens edges, converging at v (or diverging)
    const focusX = lensX + Math.min(s.v, 6) * scale;
    const imgH = Number.isFinite(s.v) ? (-oh * s.v) / s.u : 0;
    const lensHalf = R * 0.5;
    ctx.strokeStyle = c.ray;
    ctx.lineWidth = 1.5;
    for (const ly of [-lensHalf, 0, lensHalf]) {
      ctx.beginPath();
      ctx.moveTo(objX, cy - oh);
      ctx.lineTo(lensX, cy + ly);
      // after lens: toward focus point
      const dx = focusX - lensX;
      const dy = cy + imgH - (cy + ly);
      const extend = (width - lensX) / Math.max(dx, 1);
      ctx.lineTo(lensX + dx * extend, cy + ly + dy * extend);
      ctx.stroke();
    }

    // focus marker + blur circle on retina
    if (Number.isFinite(s.v) && s.v < 6) {
      ctx.beginPath();
      ctx.arc(focusX, cy + imgH, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.ray;
      ctx.fill();
    }
    const blurR = Math.max(1.5, s.blur * 3);
    ctx.beginPath();
    ctx.arc(retinaX - 4, cy + imgH * 0.4, blurR, 0, Math.PI * 2);
    ctx.fillStyle = c.blur;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;

    // status
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    const sharp = Math.abs(s.error) < 0.03;
    ctx.fillStyle = sharp ? c.ray : c.retina;
    ctx.fillText(
      sharp
        ? t("eye.view.sharp")
        : s.error < 0
          ? t("eye.view.myopic")
          : t("eye.view.hyperopic"),
      10,
      20,
    );
    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText(
      `${t("eye.readout.error")}: ${formatQuantity(s.error * 10, "mm", locale, 1)}`,
      10,
      height - 10,
    );
  },
};
