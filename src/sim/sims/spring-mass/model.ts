import { rk4 } from "../../core/integrators";
import type { SimModel } from "../../framework/types";

export interface SpringParams extends Record<string, number> {
  m: number; // mass, kg
  k: number; // spring constant, N/m
  c: number; // damping, N·s/m
  x0: number; // initial displacement from equilibrium, m
}

export interface SpringState {
  t: number;
  x: number; // displacement from equilibrium, m (+ = stretched/down)
  v: number; // m/s
  energy: number; // ½mv² + ½kx², J
}

export const springModel: SimModel<SpringParams, SpringState> = {
  params: [
    { key: "m", symbol: "m", labelKey: "spring.param.m", unit: "kg", min: 0.2, max: 5, step: 0.1, default: 1, apply: "live" },
    { key: "k", symbol: "k", labelKey: "spring.param.k", unit: "N/m", min: 2, max: 100, step: 1, default: 20, apply: "live", digits: 0 },
    { key: "c", symbol: "c", labelKey: "spring.param.c", unit: "N·s/m", min: 0, max: 15, step: 0.1, default: 0, apply: "live" },
    { key: "x0", symbol: "x_0", labelKey: "spring.param.x0", unit: "m", min: -0.8, max: 0.8, step: 0.05, default: 0.5, apply: "reset" },
  ],
  readouts: [
    { key: "t", labelKey: "spring.readout.t", unit: "s" },
    { key: "x", labelKey: "spring.readout.x", unit: "m" },
    { key: "v", labelKey: "spring.readout.v", unit: "m/s" },
    { key: "energy", labelKey: "spring.readout.energy", unit: "J" },
    { key: "period", labelKey: "spring.readout.period", unit: "s" },
    { key: "zeta", labelKey: "spring.readout.zeta", unit: "", digits: 2 },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "spring.plot.x",
      series: [{ key: "x", labelKey: "spring.readout.x" }],
    },
    {
      kind: "phase",
      titleKey: "spring.plot.phase",
      xKey: "x",
      yKey: "v",
      xLabelKey: "spring.readout.x",
      yLabelKey: "spring.readout.v",
    },
  ],
  presets: [
    { id: "free", labelKey: "spring.preset.free", params: { c: 0, x0: 0.5 } },
    { id: "under", labelKey: "spring.preset.under", params: { c: 1.5, x0: 0.5 } },
    { id: "critical", labelKey: "spring.preset.critical", params: { m: 1, k: 20, c: 8.94, x0: 0.5 } },
    { id: "over", labelKey: "spring.preset.over", params: { c: 14, x0: 0.5 } },
  ],

  init(p: SpringParams): SpringState {
    return { t: 0, x: p.x0, v: 0, energy: 0.5 * p.k * p.x0 * p.x0 };
  },

  step(s: SpringState, p: SpringParams, dt: number) {
    // m·x'' = −k·x − c·x'  →  use MotionState with y unused.
    const next = rk4(
      { pos: { x: s.x, y: 0 }, vel: { x: s.v, y: 0 } },
      (pos, vel) => ({ x: (-p.k * pos.x - p.c * vel.x) / p.m, y: 0 }),
      s.t,
      dt,
    );
    const x = next.pos.x;
    const v = next.vel.x;
    return {
      state: { t: s.t + dt, x, v, energy: 0.5 * p.m * v * v + 0.5 * p.k * x * x },
      done: false,
    };
  },

  readout(s: SpringState, p: SpringParams): Record<string, number> {
    return {
      t: s.t,
      x: s.x,
      v: s.v,
      energy: s.energy,
      period: 2 * Math.PI * Math.sqrt(p.m / p.k),
      zeta: p.c / (2 * Math.sqrt(p.k * p.m)),
    };
  },
};
