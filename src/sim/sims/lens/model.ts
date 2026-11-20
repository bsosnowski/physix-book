import type { SimModel } from "../../framework/types";
import { thinElement } from "../../core/optics";

export interface LensParams extends Record<string, number> {
  f: number; // focal length, cm (+ converging, − diverging)
  u: number; // object distance, cm
  h: number; // object height, cm
}

export interface LensState {
  t: number;
  f: number;
  u: number;
  h: number;
  dragging: boolean;
  v: number;
  m: number;
  real: boolean;
  atInfinity: boolean;
}

export const BENCH = { halfW: 55, halfH: 22 }; // cm

export const lensModel: SimModel<LensParams, LensState> = {
  params: [
    { key: "f", symbol: "f", labelKey: "lens.param.f", unit: "cm", min: -40, max: 40, step: 1, default: 15, apply: "live", digits: 0 },
    { key: "u", symbol: "u", labelKey: "lens.param.u", unit: "cm", min: 5, max: 50, step: 1, default: 30, apply: "live", digits: 0 },
    { key: "h", symbol: "h", labelKey: "lens.param.h", unit: "cm", min: 2, max: 12, step: 1, default: 8, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "v", labelKey: "lens.readout.v", unit: "cm", digits: 1 },
    { key: "m", labelKey: "lens.readout.m", unit: "×", digits: 2 },
    { key: "power", labelKey: "lens.readout.power", unit: "D", digits: 2 },
    { key: "kind", labelKey: "lens.readout.kind", unit: "", digits: 0 },
  ],
  presets: [
    { id: "camera", labelKey: "lens.preset.camera", params: { f: 15, u: 45, h: 8 } },
    { id: "projector", labelKey: "lens.preset.projector", params: { f: 15, u: 20, h: 5 } },
    { id: "magnifier", labelKey: "lens.preset.magnifier", params: { f: 15, u: 8, h: 6 } },
    { id: "diverging", labelKey: "lens.preset.diverging", params: { f: -15, u: 25, h: 8 } },
  ],

  init(p: LensParams): LensState {
    const r = thinElement(p.u, p.f, "lens");
    return { t: 0, f: p.f, u: p.u, h: p.h, dragging: false, ...r };
  },

  step(s: LensState, p: LensParams, dt: number) {
    const f = Math.abs(s.f) < 1 ? (s.f < 0 ? -1 : 1) : s.f; // avoid f=0 singularity
    const u = s.dragging ? s.u : p.u;
    const r = thinElement(u, s.dragging ? f : Math.abs(p.f) < 1 ? (p.f < 0 ? -1 : 1) : p.f, "lens");
    return {
      state: {
        ...s,
        t: s.t + dt,
        f: s.dragging ? f : Math.abs(p.f) < 1 ? (p.f < 0 ? -1 : 1) : p.f,
        u,
        h: p.h,
        ...r,
      },
      done: false,
    };
  },

  readout(s: LensState): Record<string, number> {
    return {
      v: s.atInfinity ? NaN : s.v,
      m: s.atInfinity ? NaN : s.m,
      power: 100 / s.f, // f in cm → diopters
      kind: s.atInfinity ? 2 : s.real ? 1 : 0,
    };
  },

  /** Drag the object arrow along the bench. */
  pointer(s: LensState, x: number, _y: number, phase): LensState {
    if (phase === "up") return { ...s, dragging: false };
    if (phase === "down" && x > -2) return s; // must grab left of the lens
    const u = Math.min(50, Math.max(5, -x));
    return { ...s, dragging: true, u, ...thinElement(u, s.f, "lens") };
  },
};
