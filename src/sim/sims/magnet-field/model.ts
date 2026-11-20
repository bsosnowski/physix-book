import type { SimModel } from "../../framework/types";

export interface MagnetParams extends Record<string, number> {
  mode: number; // 0 = bar magnet, 1 = straight wire (out of screen)
  strength: number; // magnet strength / current, arbitrary units 1..10
  flip: number; // 0/1 reverse polarity / current direction
}

export interface MagnetState {
  t: number;
  mode: number;
  strength: number;
  flip: number;
  mx: number; // magnet center
  my: number;
  dragging: boolean;
}

export const ARENA = { halfW: 8, halfH: 5 };
export const MAG_LEN = 3; // magnet length, world units

/**
 * Bar magnet ≈ two magnetic monopoles ±q at the ends (a physical
 * approximation for the external field). Wire: circular field B ∝ I/r.
 */
export function fieldAt(x: number, y: number, s: MagnetState): { bx: number; by: number } {
  const sign = s.flip >= 0.5 ? -1 : 1;
  if (s.mode >= 0.5) {
    // wire at magnet position, current out of screen (+) → CCW field
    const dx = x - s.mx;
    const dy = y - s.my;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.09) return { bx: 0, by: 0 };
    const b = (sign * s.strength) / r2;
    return { bx: -b * dy, by: b * dx };
  }
  // dipole as two poles: N at +len/2 (field source), S at −len/2 (sink)
  const poles = [
    { x: s.mx + (sign * MAG_LEN) / 2, y: s.my, q: 1 },
    { x: s.mx - (sign * MAG_LEN) / 2, y: s.my, q: -1 },
  ];
  let bx = 0;
  let by = 0;
  for (const p of poles) {
    const dx = x - p.x;
    const dy = y - p.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.06) continue;
    const r = Math.sqrt(r2);
    const b = (s.strength * p.q) / r2;
    bx += (b * dx) / r;
    by += (b * dy) / r;
  }
  return { bx, by };
}

export const magnetModel: SimModel<MagnetParams, MagnetState> = {
  params: [
    { key: "mode", symbol: "\\text{mode}", labelKey: "magnet.param.mode", unit: "", min: 0, max: 1, step: 1, default: 0, apply: "live", digits: 0 },
    { key: "strength", symbol: "I", labelKey: "magnet.param.strength", unit: "", min: 1, max: 10, step: 0.5, default: 5, apply: "live" },
    { key: "flip", symbol: "\\pm", labelKey: "magnet.param.flip", unit: "", min: 0, max: 1, step: 1, default: 0, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "bProbe", labelKey: "magnet.readout.bProbe", unit: "B₀", digits: 2 },
    { key: "angleProbe", labelKey: "magnet.readout.angleProbe", unit: "°", digits: 0 },
  ],
  presets: [
    { id: "bar", labelKey: "magnet.preset.bar", params: { mode: 0, strength: 5, flip: 0 } },
    { id: "reversed", labelKey: "magnet.preset.reversed", params: { mode: 0, strength: 5, flip: 1 } },
    { id: "wire", labelKey: "magnet.preset.wire", params: { mode: 1, strength: 6, flip: 0 } },
    { id: "wireRev", labelKey: "magnet.preset.wireRev", params: { mode: 1, strength: 6, flip: 1 } },
  ],

  init(p: MagnetParams): MagnetState {
    return { t: 0, mode: p.mode, strength: p.strength, flip: p.flip, mx: 0, my: 0, dragging: false };
  },

  step(s: MagnetState, p: MagnetParams, dt: number) {
    return { state: { ...s, t: s.t + dt, mode: p.mode, strength: p.strength, flip: p.flip }, done: false };
  },

  readout(s: MagnetState): Record<string, number> {
    const { bx, by } = fieldAt(0, 3.2, s);
    return {
      bProbe: Math.hypot(bx, by),
      angleProbe: (Math.atan2(by, bx) * 180) / Math.PI,
    };
  },

  pointer(s: MagnetState, x: number, y: number, phase): MagnetState {
    if (phase === "down") {
      const near = Math.hypot(x - s.mx, y - s.my) < MAG_LEN;
      return { ...s, dragging: near };
    }
    if (phase === "up") return { ...s, dragging: false };
    if (!s.dragging) return s;
    return {
      ...s,
      mx: Math.max(-ARENA.halfW + 2, Math.min(ARENA.halfW - 2, x)),
      my: Math.max(-ARENA.halfH + 1, Math.min(ARENA.halfH - 1, y)),
    };
  },
};
