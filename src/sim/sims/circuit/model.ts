import type { SimModel } from "../../framework/types";

export interface CircuitParams extends Record<string, number> {
  V: number; // battery voltage, V
  R1: number; // Ω
  R2: number; // Ω
  R3: number; // Ω
  parallel: number; // 0 = series, 1 = parallel (all three across battery)
}

export interface CircuitState {
  t: number;
  /** Topology flag mirrored from params (for the view). */
  isParallel: boolean;
  /** Carrier animation phase 0..1 along the main loop. */
  phase: number;
  /** Per-resistor operating point. */
  i1: number; i2: number; i3: number;
  v1: number; v2: number; v3: number;
  itotal: number;
  rtotal: number;
  ptotal: number;
}

export function solveCircuit(p: CircuitParams) {
  const rs = [Math.max(p.R1, 0.01), Math.max(p.R2, 0.01), Math.max(p.R3, 0.01)];
  if (p.parallel >= 0.5) {
    const is = rs.map((r) => p.V / r);
    const itotal = is.reduce((a, b) => a + b, 0);
    return {
      i1: is[0], i2: is[1], i3: is[2],
      v1: p.V, v2: p.V, v3: p.V,
      itotal,
      rtotal: 1 / rs.reduce((a, r) => a + 1 / r, 0),
      ptotal: p.V * itotal,
    };
  }
  const rtotal = rs[0] + rs[1] + rs[2];
  const i = p.V / rtotal;
  return {
    i1: i, i2: i, i3: i,
    v1: i * rs[0], v2: i * rs[1], v3: i * rs[2],
    itotal: i,
    rtotal,
    ptotal: p.V * i,
  };
}

export const circuitModel: SimModel<CircuitParams, CircuitState> = {
  params: [
    { key: "V", symbol: "V", labelKey: "circuit.param.V", unit: "V", min: 0, max: 24, step: 0.5, default: 12, apply: "live" },
    { key: "R1", symbol: "R_1", labelKey: "circuit.param.R1", unit: "Ω", min: 1, max: 100, step: 1, default: 10, apply: "live", digits: 0 },
    { key: "R2", symbol: "R_2", labelKey: "circuit.param.R2", unit: "Ω", min: 1, max: 100, step: 1, default: 20, apply: "live", digits: 0 },
    { key: "R3", symbol: "R_3", labelKey: "circuit.param.R3", unit: "Ω", min: 1, max: 100, step: 1, default: 30, apply: "live", digits: 0 },
    { key: "parallel", symbol: "\\parallel", labelKey: "circuit.param.parallel", unit: "", min: 0, max: 1, step: 1, default: 0, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "itotal", labelKey: "circuit.readout.itotal", unit: "A" },
    { key: "rtotal", labelKey: "circuit.readout.rtotal", unit: "Ω" },
    { key: "v1", labelKey: "circuit.readout.v1", unit: "V" },
    { key: "v2", labelKey: "circuit.readout.v2", unit: "V" },
    { key: "v3", labelKey: "circuit.readout.v3", unit: "V" },
    { key: "ptotal", labelKey: "circuit.readout.ptotal", unit: "W" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "circuit.plot.vi",
      series: [
        { key: "itotal", labelKey: "circuit.readout.itotal" },
        { key: "vBattery", labelKey: "circuit.param.V", color: "#d97706" },
      ],
    },
  ],
  presets: [
    { id: "series", labelKey: "circuit.preset.series", params: { V: 12, R1: 10, R2: 20, R3: 30, parallel: 0 } },
    { id: "parallel", labelKey: "circuit.preset.parallel", params: { V: 12, R1: 10, R2: 20, R3: 30, parallel: 1 } },
    { id: "equal", labelKey: "circuit.preset.equal", params: { V: 12, R1: 20, R2: 20, R3: 20, parallel: 1 } },
    { id: "shortish", labelKey: "circuit.preset.shortish", params: { V: 24, R1: 1, R2: 1, R3: 1, parallel: 0 } },
  ],

  init(p: CircuitParams): CircuitState {
    return { t: 0, phase: 0, isParallel: p.parallel >= 0.5, ...solveCircuit(p) };
  },

  step(s: CircuitState, p: CircuitParams, dt: number) {
    const el = solveCircuit(p);
    // Carrier drift speed proportional to total current (visual only).
    const phase = (s.phase + dt * Math.min(el.itotal, 30) * 0.04) % 1;
    return { state: { t: s.t + dt, phase, isParallel: p.parallel >= 0.5, ...el }, done: false };
  },

  readout(s: CircuitState, p: CircuitParams): Record<string, number> {
    return {
      itotal: s.itotal,
      rtotal: s.rtotal,
      v1: s.v1,
      v2: s.v2,
      v3: s.v3,
      ptotal: s.ptotal,
      vBattery: p.V,
    };
  },
};
