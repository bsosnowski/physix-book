import type { SimModel } from "../../framework/types";

export interface CapacitorParams extends Record<string, number> {
  V: number; // battery voltage, V
  d: number; // plate separation, mm
  area: number; // plate area, cm²
  dielectric: number; // relative permittivity εr (1 = air)
}

export interface CapacitorState {
  t: number;
  V: number;
  d: number;
  area: number;
  er: number;
  /** Test charge released between plates (fraction 0..1 across gap). */
  probe: { f: number; v: number; released: boolean };
}

const EPS0 = 8.854e-12; // F/m

export function capacitance(p: { area: number; d: number; er: number }): number {
  // area cm² → m², d mm → m
  return (p.er * EPS0 * (p.area * 1e-4)) / (p.d * 1e-3);
}

export const capacitorModel: SimModel<CapacitorParams, CapacitorState> = {
  params: [
    { key: "V", symbol: "V", labelKey: "capacitor.param.V", unit: "V", min: 0, max: 100, step: 1, default: 50, apply: "live", digits: 0 },
    { key: "d", symbol: "d", labelKey: "capacitor.param.d", unit: "mm", min: 1, max: 20, step: 0.5, default: 5, apply: "live" },
    { key: "area", symbol: "A", labelKey: "capacitor.param.area", unit: "cm²", min: 10, max: 200, step: 5, default: 100, apply: "live", digits: 0 },
    { key: "dielectric", symbol: "\\varepsilon_r", labelKey: "capacitor.param.dielectric", unit: "", min: 1, max: 8, step: 0.5, default: 1, apply: "live" },
  ],
  readouts: [
    { key: "E", labelKey: "capacitor.readout.E", unit: "kV/m", digits: 1 },
    { key: "C", labelKey: "capacitor.readout.C", unit: "pF", digits: 1 },
    { key: "Q", labelKey: "capacitor.readout.Q", unit: "nC", digits: 2 },
    { key: "U", labelKey: "capacitor.readout.U", unit: "nJ", digits: 2 },
    { key: "probeW", labelKey: "capacitor.readout.probeW", unit: "eV", digits: 1 },
  ],
  presets: [
    { id: "air", labelKey: "capacitor.preset.air", params: { V: 50, d: 5, area: 100, dielectric: 1 } },
    { id: "ceramic", labelKey: "capacitor.preset.ceramic", params: { V: 50, d: 5, area: 100, dielectric: 6 } },
    { id: "tight", labelKey: "capacitor.preset.tight", params: { V: 50, d: 1, area: 100, dielectric: 1 } },
    { id: "highV", labelKey: "capacitor.preset.highV", params: { V: 100, d: 5, area: 100, dielectric: 1 } },
  ],

  init(p: CapacitorParams): CapacitorState {
    return {
      t: 0, V: p.V, d: p.d, area: p.area, er: p.dielectric,
      probe: { f: 0.05, v: 0, released: false },
    };
  },

  step(s: CapacitorState, p: CapacitorParams, dt: number) {
    let probe = s.probe;
    if (probe.released) {
      // Uniform field E = V/d; positive probe accelerates toward − plate.
      // Visual dynamics: a ∝ E (scaled); f spans 0..1 across the gap.
      const E = p.V / (p.d * 1e-3); // V/m
      const a = (E / 10000) * 0.8; // fraction/s²
      let v = probe.v + a * dt;
      let f = probe.f + v * dt;
      if (f >= 0.95) {
        f = 0.05;
        v = 0; // absorbed & respawn (battery keeps V constant)
      }
      probe = { f, v, released: true };
    }
    return {
      state: { t: s.t + dt, V: p.V, d: p.d, area: p.area, er: p.dielectric, probe },
      done: false,
    };
  },

  readout(s: CapacitorState): Record<string, number> {
    const E = s.V / (s.d * 1e-3);
    const C = capacitance({ area: s.area, d: s.d, er: s.er });
    const Q = C * s.V;
    return {
      E: E / 1000,
      C: C * 1e12,
      Q: Q * 1e9,
      U: 0.5 * C * s.V * s.V * 1e9,
      probeW: s.probe.released ? s.V * s.probe.f : 0, // energy gained, eV per unit e
    };
  },

  pointer(s: CapacitorState, _x: number, y: number, phase): CapacitorState {
    // click between the plates releases the probe
    if (phase === "down" && Math.abs(y) < 1) {
      return { ...s, probe: { f: 0.05, v: 0, released: true } };
    }
    return s;
  },
};
