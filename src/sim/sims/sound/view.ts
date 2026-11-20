import type { DrawContext, SimView } from "../../framework/types";
import { ARENA, displacementAt, type SoundState } from "./model";

/**
 * Longitudinal wave visualized as air-particle density: particles are
 * displaced ALONG the propagation direction (that's what makes sound
 * longitudinal), producing visible compressions and rarefactions.
 */
export const soundView: SimView<SoundState> = {
  draw(dc: DrawContext, s: SoundState) {
    const { ctx, width, height, dark, t } = dc;
    const c = dark
      ? { bg: "#09090b", particle: "#7dd3fc", speaker: "#fbbf24", text: "#a1a1aa" }
      : { bg: "#ffffff", particle: "#0369a1", speaker: "#d97706", text: "#71717a" };
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, width, height);

    const sx = width / (2 * ARENA.halfW);
    const sy = height / (2 * ARENA.halfH);
    const X = (x: number) => (x + ARENA.halfW) * sx;
    const Y = (y: number) => (ARENA.halfH - y) * sy;

    // particle lattice, displaced longitudinally
    const COLS = 90;
    const ROWS = 16;
    ctx.fillStyle = c.particle;
    for (let i = 0; i < COLS; i++) {
      const x0 = -ARENA.halfW + (2 * ARENA.halfW * (i + 0.5)) / COLS;
      for (let j = 0; j < ROWS; j++) {
        const y0 = -ARENA.halfH + (2 * ARENA.halfH * (j + 0.5)) / ROWS;
        const d = displacementAt(x0, y0, s) * 0.55; // world units
        // deterministic jitter so rows don't look like a grid of clones
        const jit = Math.sin(i * 12.9898 + j * 78.233) * 0.08;
        ctx.globalAlpha = 0.55 + Math.min(0.45, Math.abs(d) * 0.8);
        ctx.beginPath();
        ctx.arc(X(x0 + d), Y(y0 + jit), 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // speaker(s) / moving source
    const drawSpeaker = (x: number) => {
      ctx.fillStyle = c.speaker;
      ctx.beginPath();
      ctx.moveTo(X(x) - 10, Y(0) - 8);
      ctx.lineTo(X(x), Y(0) - 14);
      ctx.lineTo(X(x), Y(0) + 14);
      ctx.lineTo(X(x) - 10, Y(0) + 8);
      ctx.closePath();
      ctx.fill();
    };
    if (s.doppler > 0) {
      drawSpeaker(s.srcX);
      // motion arrow
      ctx.strokeStyle = c.speaker;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(s.srcX) + 8, Y(0) - 22);
      ctx.lineTo(X(s.srcX) + 30, Y(0) - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(s.srcX) + 30, Y(0) - 22);
      ctx.lineTo(X(s.srcX) + 24, Y(0) - 26);
      ctx.lineTo(X(s.srcX) + 24, Y(0) - 18);
      ctx.closePath();
      ctx.fillStyle = c.speaker;
      ctx.fill();
    } else {
      drawSpeaker(-ARENA.halfW + 0.6);
    }

    ctx.fillStyle = c.text;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(t("sound.view.legend"), 10, height - 10);
    if (s.doppler > 0) {
      ctx.textAlign = "right";
      ctx.fillText(t("sound.view.doppler"), width - 10, 18);
    }
  },
};
