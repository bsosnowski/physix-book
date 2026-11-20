import type { SimModel } from "../../framework/types";
import { thinElement } from "../../core/optics";

export interface MirrorParams extends Record<string, number> {
  type: number; // 0 plane, 1 concave, 2 convex
  f: number; // |focal length| cm (ignored for plane)
  u: number; // object distance, cm
  h: number; // object height, cm
}

export interface MirrorState {
  t: number;
  type: number;
  f: number; // signed effective f (plane → Infinity)
  u: number;
  h: number;
  dragging: boolean;
  v: number;
  m: number;
  real: boolean;
}

export const BENCH = { halfW: 55, halfH: 22 };

export function effectiveF(type: number, f: number): number {
  if (type < 0.5) return Infinity; // plane
  const mag = Math.max(3, Math.abs(f));
  return type < 1.5 ? mag : -mag; // concave +, convex −
}

export const mirrorModel: SimModel<MirrorParams, MirrorState> = {
  params: [
    { key: "type", symbol: "\\text{type}", labelKey: "mirror.param.type", unit: "", min: 0, max: 2, step: 1, default: 1, apply: "live", digits: 0 },
    { key: "f", symbol: "|f|", labelKey: "mirror.param.f", unit: "cm", min: 5, max: 40, step: 1, default: 15, apply: "live", digits: 0 },
    { key: "u", symbol: "u", labelKey: "mirror.param.u", unit: "cm", min: 5, max: 50, step: 1, default: 30, apply: "live", digits: 0 },
    { key: "h", symbol: "h", labelKey: "mirror.param.h", unit: "cm", min: 2, max: 12, step: 1, default: 8, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "v", labelKey: "mirror.readout.v", unit: "cm", digits: 1 },
    { key: "m", labelKey: "mirror.readout.m", unit: "×", digits: 2 },
    { key: "R", labelKey: "mirror.readout.R", unit: "cm", digits: 0 },
    { key: "kind", labelKey: "mirror.readout.kind", unit: "", digits: 0 },
  ],
  presets: [
    { id: "plane", labelKey: "mirror.preset.plane", params: { type: 0, u: 20, h: 8 } },
    { id: "shaving", labelKey: "mirror.preset.shaving", params: { type: 1, f: 20, u: 10, h: 6 } },
    { id: "concaveFar", labelKey: "mirror.preset.concaveFar", params: { type: 1, f: 15, u: 45, h: 8 } },
    { id: "car", labelKey: "mirror.preset.car", params: { type: 2, f: 15, u: 30, h: 8 } },
  ],

  init(p: MirrorParams): MirrorState {
    const f = effectiveF(p.type, p.f);
    const r = Number.isFinite(f)
      ? thinElement(p.u, f, "mirror")
      : { v: -p.u, m: 1, real: false, atInfinity: false };
    return { t: 0, type: p.type, f, u: p.u, h: p.h, dragging: false, v: r.v, m: r.m, real: r.real };
  },

  step(s: MirrorState, p: MirrorParams, dt: number) {
    const f = effectiveF(p.type, p.f);
    const u = s.dragging ? s.u : p.u;
    const r = Number.isFinite(f)
      ? thinElement(u, f, "mirror")
      : { v: -u, m: 1, real: false, atInfinity: false };
    return {
      state: { t: s.t + dt, type: p.type, f, u, h: p.h, dragging: s.dragging, v: r.v, m: r.m, real: r.real },
      done: false,
    };
  },

  readout(s: MirrorState): Record<string, number> {
    return {
      v: s.v,
      m: s.m,
      R: Number.isFinite(s.f) ? 2 * Math.abs(s.f) : NaN,
      kind: s.real ? 1 : 0,
    };
  },

  pointer(s: MirrorState, x: number, _y: number, phase): MirrorState {
    if (phase === "up") return { ...s, dragging: false };
    if (phase === "down" && x > -2) return s;
    const u = Math.min(50, Math.max(5, -x));
    const r = Number.isFinite(s.f)
      ? thinElement(u, s.f, "mirror")
      : { v: -u, m: 1, real: false, atInfinity: false };
    return { ...s, dragging: true, u, v: r.v, m: r.m, real: r.real };
  },
};
