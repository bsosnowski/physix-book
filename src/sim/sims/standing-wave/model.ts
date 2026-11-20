import type { SimModel } from "../../framework/types";

export interface WaveParams extends Record<string, number> {
  n: number; // harmonic number (mode)
  A: number; // standing-wave amplitude, m
  v: number; // wave speed on the string, m/s
}

export interface WaveState {
  t: number;
  n: number;
  A: number;
  v: number;
}

export const STRING_LEN = 10; // m, fixed at both ends

/** Standing wave displacement: y = A·sin(kx)·cos(ωt). */
export function displacement(x: number, t: number, p: WaveParams): number {
  const k = (p.n * Math.PI) / STRING_LEN;
  const w = k * p.v;
  return p.A * Math.sin(k * x) * Math.cos(w * t);
}

/** The two counter-propagating traveling waves whose sum is the standing wave. */
export function traveling(x: number, t: number, p: WaveParams): [number, number] {
  const k = (p.n * Math.PI) / STRING_LEN;
  const w = k * p.v;
  return [
    (p.A / 2) * Math.sin(k * x - w * t),
    (p.A / 2) * Math.sin(k * x + w * t),
  ];
}

export const standingWaveModel: SimModel<WaveParams, WaveState> = {
  params: [
    { key: "n", symbol: "n", labelKey: "wave.param.n", unit: "", min: 1, max: 6, step: 1, default: 2, apply: "reset", digits: 0 },
    { key: "A", symbol: "A", labelKey: "wave.param.A", unit: "m", min: 0.2, max: 1.5, step: 0.05, default: 0.8, apply: "live" },
    { key: "v", symbol: "v", labelKey: "wave.param.v", unit: "m/s", min: 2, max: 20, step: 0.5, default: 8, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "wave.readout.t", unit: "s" },
    { key: "lambda", labelKey: "wave.readout.lambda", unit: "m" },
    { key: "f", labelKey: "wave.readout.f", unit: "Hz" },
    { key: "period", labelKey: "wave.readout.period", unit: "s" },
    { key: "yProbe", labelKey: "wave.readout.yProbe", unit: "m" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "wave.plot.probe",
      series: [{ key: "yProbe", labelKey: "wave.readout.yProbe" }],
    },
  ],
  presets: [
    { id: "fundamental", labelKey: "wave.preset.fundamental", params: { n: 1, A: 1, v: 8 } },
    { id: "second", labelKey: "wave.preset.second", params: { n: 2, A: 0.8, v: 8 } },
    { id: "fifth", labelKey: "wave.preset.fifth", params: { n: 5, A: 0.5, v: 8 } },
    { id: "tight", labelKey: "wave.preset.tight", params: { n: 2, A: 0.8, v: 16 } },
  ],

  init(p: WaveParams): WaveState {
    return { t: 0, n: p.n, A: p.A, v: p.v };
  },

  step(s: WaveState, p: WaveParams, dt: number) {
    // Analytic solution — no integration error possible.
    return { state: { t: s.t + dt, n: p.n, A: p.A, v: p.v }, done: false };
  },

  readout(s: WaveState, p: WaveParams): Record<string, number> {
    const lambda = (2 * STRING_LEN) / p.n;
    const f = p.v / lambda;
    return {
      t: s.t,
      lambda,
      f,
      period: 1 / f,
      yProbe: displacement(STRING_LEN / (2 * p.n), s.t, p), // first antinode
    };
  },
};
