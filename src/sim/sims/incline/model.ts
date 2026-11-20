import type { SimModel } from "../../framework/types";

export interface InclineParams extends Record<string, number> {
  angle: number; // degrees
  mu: number; // friction coefficient (static = kinetic here)
  m: number; // kg
  g: number; // m/s²
}

export interface InclineState {
  t: number;
  /** Current ramp angle (mirrors the live param, for the view). */
  angleDeg: number;
  /** Distance travelled down the slope from the start, m. */
  s: number;
  /** Velocity down the slope, m/s. */
  v: number;
  a: number;
  /** True while static friction holds the block. */
  stuck: boolean;
  /** Distance available before the block reaches the bottom, m. */
  trackLen: number;
  reachedEnd: boolean;
}

const DEG = Math.PI / 180;
export const TRACK_LEN = 8; // m of slope

export const inclineModel: SimModel<InclineParams, InclineState> = {
  params: [
    { key: "angle", symbol: "\\alpha", labelKey: "incline.param.angle", unit: "°", min: 0, max: 60, step: 1, default: 30, apply: "live", digits: 0 },
    { key: "mu", symbol: "\\mu", labelKey: "incline.param.mu", unit: "", min: 0, max: 1.2, step: 0.01, default: 0.3, apply: "live" },
    { key: "m", symbol: "m", labelKey: "incline.param.m", unit: "kg", min: 0.5, max: 10, step: 0.1, default: 2, apply: "live" },
    { key: "g", symbol: "g", labelKey: "incline.param.g", unit: "m/s²", min: 1, max: 25, step: 0.01, default: 9.81, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "incline.readout.t", unit: "s" },
    { key: "a", labelKey: "incline.readout.a", unit: "m/s²" },
    { key: "v", labelKey: "incline.readout.v", unit: "m/s" },
    { key: "s", labelKey: "incline.readout.s", unit: "m" },
    { key: "criticalAngle", labelKey: "incline.readout.criticalAngle", unit: "°", digits: 1 },
    { key: "friction", labelKey: "incline.readout.friction", unit: "N" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "incline.plot.v",
      series: [{ key: "v", labelKey: "incline.readout.v" }],
    },
    {
      kind: "time",
      titleKey: "incline.plot.s",
      series: [{ key: "s", labelKey: "incline.readout.s", color: "#d97706" }],
    },
  ],
  presets: [
    { id: "frictionless", labelKey: "incline.preset.frictionless", params: { mu: 0, angle: 30 } },
    { id: "sticky", labelKey: "incline.preset.sticky", params: { mu: 0.8, angle: 30 } },
    { id: "verge", labelKey: "incline.preset.verge", params: { mu: 0.58, angle: 30 } },
    { id: "ice", labelKey: "incline.preset.ice", params: { mu: 0.05, angle: 15 } },
  ],

  init(p: InclineParams): InclineState {
    const a = accel(p, 0);
    return {
      t: 0,
      angleDeg: p.angle,
      s: 0,
      v: 0,
      a,
      stuck: a === 0,
      trackLen: TRACK_LEN,
      reachedEnd: false,
    };
  },

  step(st: InclineState, p: InclineParams, dt: number) {
    if (st.reachedEnd) return { state: st, done: true };
    const a = accel(p, st.v);
    // Exact constant-acceleration kinematics within the step.
    let v = st.v + a * dt;
    let s = st.s + st.v * dt + 0.5 * a * dt * dt;
    if (st.v > 0 && v < 0) {
      // Friction brings the block to rest mid-step; it cannot reverse.
      const tStop = -st.v / a;
      s = st.s + st.v * tStop + 0.5 * a * tStop * tStop;
      v = 0;
    }
    let reachedEnd = false;
    if (s >= st.trackLen) {
      s = st.trackLen;
      v = 0;
      reachedEnd = true;
    }
    return {
      state: {
        t: st.t + dt,
        angleDeg: p.angle,
        s,
        v,
        a: reachedEnd ? 0 : a,
        // At rest, "stuck" means static friction can hold at this angle.
        stuck: !reachedEnd && v === 0 && accel(p, 0) === 0,
        trackLen: st.trackLen,
        reachedEnd,
      },
      done: reachedEnd,
    };
  },

  readout(st: InclineState, p: InclineParams): Record<string, number> {
    const alpha = p.angle * DEG;
    const N = p.m * p.g * Math.cos(alpha);
    return {
      t: st.t,
      a: st.a,
      v: st.v,
      s: st.s,
      criticalAngle: Math.atan(p.mu) / DEG,
      friction: st.stuck ? p.m * p.g * Math.sin(alpha) : p.mu * N,
    };
  },
};

/** Acceleration down the slope with static/kinetic friction. */
function accel(p: InclineParams, v: number): number {
  const alpha = p.angle * DEG;
  const drive = p.g * Math.sin(alpha);
  const maxFriction = p.mu * p.g * Math.cos(alpha);
  if (v <= 1e-9) {
    // At rest: static friction can hold if drive ≤ μN.
    return drive > maxFriction ? drive - maxFriction : 0;
  }
  return drive - maxFriction;
}

/** Analytic acceleration while sliding (for tests). */
export function slidingAccel(p: InclineParams): number {
  const alpha = p.angle * DEG;
  return p.g * (Math.sin(alpha) - p.mu * Math.cos(alpha));
}
