import type { SimModel } from "../../framework/types";

export interface PulseParams extends Record<string, number> {
  end: number; // 0 = fixed end (inverted reflection), 1 = free end
  speed: number; // wave speed, m/s
  width: number; // pulse width, m
}

export interface PulseState {
  t: number;
  /** Displacement samples along the string (N points, L metres). */
  y: Float64Array;
  yPrev: Float64Array;
  end: number;
  speed: number;
  width: number;
  reflected: boolean;
}

export const STRING_L = 10;
const N = 400;
const DX = STRING_L / (N - 1);
/** CFL-stable substep: courant = c·dt/dx ≤ 1. */
function substeps(speed: number, dt: number): number {
  return Math.max(1, Math.ceil((speed * dt) / DX));
}

/** One FDTD step of y_tt = c² y_xx with the chosen right-end boundary. */
export function fdtdStep(
  y: Float64Array,
  yPrev: Float64Array,
  c: number,
  dt: number,
  freeEnd: boolean,
): void {
  const r2 = (c * dt / DX) ** 2;
  const next = new Float64Array(N);
  for (let i = 1; i < N - 1; i++) {
    next[i] = 2 * y[i] - yPrev[i] + r2 * (y[i + 1] - 2 * y[i] + y[i - 1]);
  }
  next[0] = 0; // left end always fixed (launch side absorbs via short run)
  next[N - 1] = freeEnd ? next[N - 2] : 0;
  yPrev.set(y);
  y.set(next);
}

export const pulseModel: SimModel<PulseParams, PulseState> = {
  params: [
    { key: "end", symbol: "\\text{end}", labelKey: "pulse.param.end", unit: "", min: 0, max: 1, step: 1, default: 0, apply: "reset", digits: 0 },
    { key: "speed", symbol: "v", labelKey: "pulse.param.speed", unit: "m/s", min: 2, max: 10, step: 0.5, default: 5, apply: "reset" },
    { key: "width", symbol: "w", labelKey: "pulse.param.width", unit: "m", min: 0.3, max: 1.5, step: 0.1, default: 0.7, apply: "reset" },
  ],
  readouts: [
    { key: "t", labelKey: "pulse.readout.t", unit: "s" },
    { key: "peakX", labelKey: "pulse.readout.peakX", unit: "m", digits: 1 },
    { key: "peakY", labelKey: "pulse.readout.peakY", unit: "m", digits: 2 },
  ],
  presets: [
    { id: "fixed", labelKey: "pulse.preset.fixed", params: { end: 0, speed: 5, width: 0.7 } },
    { id: "free", labelKey: "pulse.preset.free", params: { end: 1, speed: 5, width: 0.7 } },
    { id: "narrow", labelKey: "pulse.preset.narrow", params: { end: 0, speed: 5, width: 0.3 } },
    { id: "fast", labelKey: "pulse.preset.fast", params: { end: 0, speed: 9, width: 0.7 } },
  ],

  init(p: PulseParams): PulseState {
    const y = new Float64Array(N);
    const yPrev = new Float64Array(N);
    const x0 = 2;
    for (let i = 0; i < N; i++) {
      const x = i * DX;
      y[i] = 0.8 * Math.exp(-((x - x0) ** 2) / (2 * (p.width / 2.35) ** 2));
    }
    // seed rightward motion: yPrev(x) = y(x + c·dt) — the past shape sits
    // to the LEFT, so the pulse advances to the right.
    const dt = 1 / 120 / substeps(p.speed, 1 / 120);
    for (let i = 0; i < N; i++) {
      const x = i * DX + p.speed * dt;
      yPrev[i] = 0.8 * Math.exp(-((x - x0) ** 2) / (2 * (p.width / 2.35) ** 2));
    }
    return { t: 0, y, yPrev, end: p.end, speed: p.speed, width: p.width, reflected: false };
  },

  step(s: PulseState, _p: PulseParams, dt: number) {
    const y = s.y.slice();
    const yPrev = s.yPrev.slice();
    const n = substeps(s.speed, dt);
    const h = dt / n;
    for (let k = 0; k < n; k++) fdtdStep(y, yPrev, s.speed, h, s.end >= 0.5);
    // detect reflection: peak moving left of start after reaching the end
    let peakI = 0;
    let peakAbs = 0;
    for (let i = 0; i < N; i++) {
      if (Math.abs(y[i]) > peakAbs) {
        peakAbs = Math.abs(y[i]);
        peakI = i;
      }
    }
    const reflected = s.reflected || (peakI * DX > STRING_L - 1.5 && s.t > 0.5);
    return {
      state: { ...s, t: s.t + dt, y, yPrev, reflected },
      done: s.t > (2.5 * STRING_L) / s.speed, // stop after ~2.5 traversals
    };
  },

  readout(s: PulseState): Record<string, number> {
    let peakI = 0;
    let peakAbs = 0;
    for (let i = 0; i < N; i++) {
      if (Math.abs(s.y[i]) > peakAbs) {
        peakAbs = Math.abs(s.y[i]);
        peakI = i;
      }
    }
    return { t: s.t, peakX: peakI * DX, peakY: s.y[peakI] };
  },
};

export { N, DX };
