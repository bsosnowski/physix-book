import type { SimModel } from "../../framework/types";

export interface EyeParams extends Record<string, number> {
  u: number; // object distance, cm (25 = near point, 500 ≈ far)
  power: number; // eye lens power, D (50..64; relaxed ≈ 50 for 2cm eyeball… see below)
  glasses: number; // corrective lens power, D (−6..+6)
  axial: number; // eyeball length, cm (1.8..2.6; 2.0 = normal)
}

export interface EyeState {
  t: number;
  u: number;
  power: number;
  glasses: number;
  axial: number;
  /** Image distance behind the lens, cm. */
  v: number;
  /** Focus error: v − axial (cm). 0 = sharp on retina. */
  error: number;
  /** Blur circle diameter on the retina (mm, visual). */
  blur: number;
}

/**
 * Simplified reduced eye: single thin lens, retina at `axial` cm.
 * For a sharp image of an object at u: P_needed = 100/u + 100/axial (D).
 */
export function neededPower(u: number, axial: number): number {
  return 100 / u + 100 / axial;
}

export const eyeModel: SimModel<EyeParams, EyeState> = {
  params: [
    { key: "u", symbol: "u", labelKey: "eye.param.u", unit: "cm", min: 10, max: 500, step: 5, default: 100, apply: "live", digits: 0 },
    { key: "power", symbol: "P", labelKey: "eye.param.power", unit: "D", min: 48, max: 64, step: 0.25, default: 51, apply: "live" },
    { key: "glasses", symbol: "P_g", labelKey: "eye.param.glasses", unit: "D", min: -8, max: 8, step: 0.25, default: 0, apply: "live" },
    { key: "axial", symbol: "L", labelKey: "eye.param.axial", unit: "cm", min: 1.8, max: 2.6, step: 0.05, default: 2.0, apply: "live" },
  ],
  readouts: [
    { key: "v", labelKey: "eye.readout.v", unit: "cm", digits: 2 },
    { key: "error", labelKey: "eye.readout.error", unit: "mm", digits: 1 },
    { key: "needed", labelKey: "eye.readout.needed", unit: "D", digits: 2 },
    { key: "sharp", labelKey: "eye.readout.sharp", unit: "", digits: 0 },
  ],
  presets: [
    { id: "normal", labelKey: "eye.preset.normal", params: { u: 100, power: 51, glasses: 0, axial: 2.0 } },
    { id: "reading", labelKey: "eye.preset.reading", params: { u: 25, power: 54, glasses: 0, axial: 2.0 } },
    { id: "myopia", labelKey: "eye.preset.myopia", params: { u: 300, power: 51, glasses: 0, axial: 2.3 } },
    { id: "myopiaFix", labelKey: "eye.preset.myopiaFix", params: { u: 300, power: 51, glasses: -7.5, axial: 2.3 } },
    { id: "hyperopia", labelKey: "eye.preset.hyperopia", params: { u: 25, power: 54, glasses: 0, axial: 1.85 } },
    { id: "hyperopiaFix", labelKey: "eye.preset.hyperopiaFix", params: { u: 25, power: 54, glasses: 2.75, axial: 1.85 } },
    { id: "presbyopia", labelKey: "eye.preset.presbyopia", params: { u: 25, power: 51, glasses: 0, axial: 2.0 } },
  ],

  init(p: EyeParams): EyeState {
    return compute({ t: 0, ...p } as EyeState);
  },

  step(s: EyeState, p: EyeParams, dt: number) {
    return { state: compute({ ...s, t: s.t + dt, u: p.u, power: p.power, glasses: p.glasses, axial: p.axial }), done: false };
  },

  readout(s: EyeState): Record<string, number> {
    return {
      v: s.v,
      error: s.error * 10,
      needed: neededPower(s.u, s.axial) - s.glasses,
      sharp: Math.abs(s.error) < 0.03 ? 1 : 0,
    };
  },
};

function compute(s: EyeState): EyeState {
  const P = s.power + s.glasses; // thin lenses in contact: powers add
  const denom = P / 100 - 1 / s.u; // 1/v in cm⁻¹
  const v = denom > 1e-6 ? 1 / denom : Infinity;
  const error = Number.isFinite(v) ? v - s.axial : 10;
  // blur circle: pupil 4 mm, blur ≈ pupil·|error|/v
  const blur = Number.isFinite(v) && v > 0 ? (4 * Math.abs(error)) / v : 4;
  return { ...s, v, error, blur };
}
