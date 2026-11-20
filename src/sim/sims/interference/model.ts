import type { SimModel } from "../../framework/types";

export interface InterferenceParams extends Record<string, number> {
  lambda: number; // wavelength, m
  d: number; // source separation, m
}

export interface InterferenceState {
  t: number;
  lambda: number;
  d: number;
}

/** Arena: x ∈ [-10, 10], y ∈ [-6, 6]; sources at (±d/2, 0). */
export const ARENA = { halfW: 10, halfH: 6 };
export const PROBE = { x: 0, y: 4.5 };
const WAVE_SPEED = 4; // m/s (visual propagation speed)

/** Path difference |r1 − r2| at a point. */
export function pathDifference(x: number, y: number, d: number): number {
  const r1 = Math.hypot(x + d / 2, y);
  const r2 = Math.hypot(x - d / 2, y);
  return Math.abs(r1 - r2);
}

/** Time-averaged intensity ∝ cos²(πΔr/λ), normalized 0..1. */
export function intensity(x: number, y: number, p: InterferenceParams): number {
  const dr = pathDifference(x, y, p.d);
  const c = Math.cos((Math.PI * dr) / p.lambda);
  return c * c;
}

export const interferenceModel: SimModel<InterferenceParams, InterferenceState> = {
  params: [
    { key: "lambda", symbol: "\\lambda", labelKey: "interference.param.lambda", unit: "m", min: 0.5, max: 3, step: 0.05, default: 1.5, apply: "live" },
    { key: "d", symbol: "d", labelKey: "interference.param.d", unit: "m", min: 1, max: 10, step: 0.1, default: 5, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "interference.readout.t", unit: "s" },
    { key: "ratio", labelKey: "interference.readout.ratio", unit: "", digits: 2 },
    { key: "maxOrder", labelKey: "interference.readout.maxOrder", unit: "", digits: 0 },
    { key: "probeDelta", labelKey: "interference.readout.probeDelta", unit: "m" },
    { key: "probeIntensity", labelKey: "interference.readout.probeIntensity", unit: "", digits: 2 },
  ],
  presets: [
    { id: "wide", labelKey: "interference.preset.wide", params: { lambda: 2.5, d: 3 } },
    { id: "classic", labelKey: "interference.preset.classic", params: { lambda: 1.5, d: 5 } },
    { id: "fine", labelKey: "interference.preset.fine", params: { lambda: 0.7, d: 8 } },
    { id: "singleLambda", labelKey: "interference.preset.singleLambda", params: { lambda: 2, d: 2 } },
  ],

  init(p: InterferenceParams): InterferenceState {
    return { t: 0, lambda: p.lambda, d: p.d };
  },

  step(s: InterferenceState, p: InterferenceParams, dt: number) {
    return { state: { t: s.t + dt, lambda: p.lambda, d: p.d }, done: false };
  },

  readout(s: InterferenceState, p: InterferenceParams): Record<string, number> {
    return {
      t: s.t,
      ratio: p.d / p.lambda,
      maxOrder: Math.floor(p.d / p.lambda),
      probeDelta: pathDifference(PROBE.x, PROBE.y, p.d),
      probeIntensity: intensity(PROBE.x, PROBE.y, p),
    };
  },
};

export { WAVE_SPEED };
