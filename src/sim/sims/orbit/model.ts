import type { SimModel } from "../../framework/types";

export interface OrbitParams extends Record<string, number> {
  mu: number; // gravitational parameter GM, m³/s² (scaled units)
  r0: number; // start distance, m
  vt: number; // initial tangential velocity, m/s
}

export interface OrbitState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  rMin: number;
  rMax: number;
  /** Initial specific energy & angular momentum, for drift readouts. */
  e0: number;
  h0: number;
  energy: number;
  h: number;
  crashed: boolean;
  escaped: boolean;
}

export const STAR_RADIUS = 1.2;
const ESCAPE_R = 300;
const SUBSTEPS = 8; // velocity Verlet substeps per 1/120 s tick
const TRAIL_EVERY = 3;
const TRAIL_CAP = 6000;

export function specificEnergy(r: number, v: number, mu: number): number {
  return 0.5 * v * v - mu / r;
}

export const orbitModel: SimModel<OrbitParams, OrbitState> = {
  params: [
    { key: "mu", symbol: "\\mu", labelKey: "orbit.param.mu", unit: "m³/s²", min: 50, max: 400, step: 5, default: 200, apply: "reset", digits: 0 },
    { key: "r0", symbol: "r_0", labelKey: "orbit.param.r0", unit: "m", min: 6, max: 25, step: 0.5, default: 12, apply: "reset" },
    { key: "vt", symbol: "v_t", labelKey: "orbit.param.vt", unit: "m/s", min: 0.5, max: 8, step: 0.05, default: 4.08, apply: "reset" },
  ],
  readouts: [
    { key: "t", labelKey: "orbit.readout.t", unit: "s" },
    { key: "r", labelKey: "orbit.readout.r", unit: "m" },
    { key: "speed", labelKey: "orbit.readout.speed", unit: "m/s" },
    { key: "energy", labelKey: "orbit.readout.energy", unit: "J/kg" },
    { key: "energyDrift", labelKey: "orbit.readout.energyDrift", unit: "%", digits: 4 },
    { key: "hDrift", labelKey: "orbit.readout.hDrift", unit: "%", digits: 4 },
    { key: "vCircular", labelKey: "orbit.readout.vCircular", unit: "m/s" },
    { key: "vEscape", labelKey: "orbit.readout.vEscape", unit: "m/s" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "orbit.plot.r",
      series: [{ key: "r", labelKey: "orbit.readout.r" }],
    },
    {
      kind: "time",
      titleKey: "orbit.plot.drift",
      series: [
        { key: "energyDrift", labelKey: "orbit.readout.energyDrift", color: "#dc2626" },
        { key: "hDrift", labelKey: "orbit.readout.hDrift", color: "#d97706" },
      ],
    },
  ],
  presets: [
    { id: "circular", labelKey: "orbit.preset.circular", params: { mu: 200, r0: 12, vt: 4.08 } },
    { id: "elliptical", labelKey: "orbit.preset.elliptical", params: { mu: 200, r0: 12, vt: 3.0 } },
    { id: "comet", labelKey: "orbit.preset.comet", params: { mu: 200, r0: 22, vt: 1.6 } },
    { id: "escape", labelKey: "orbit.preset.escape", params: { mu: 200, r0: 12, vt: 6.2 } },
    { id: "plunge", labelKey: "orbit.preset.plunge", params: { mu: 200, r0: 12, vt: 0.8 } },
  ],

  init(p: OrbitParams): OrbitState {
    const start = { x: p.r0, y: 0, vx: 0, vy: p.vt };
    const v = Math.hypot(start.vx, start.vy);
    const e = specificEnergy(p.r0, v, p.mu);
    const h = start.x * start.vy - start.y * start.vx;
    return {
      t: 0,
      ...start,
      trail: [{ x: start.x, y: start.y }],
      rMin: p.r0,
      rMax: p.r0,
      e0: e,
      h0: h,
      energy: e,
      h,
      crashed: false,
      escaped: false,
    };
  },

  step(s: OrbitState, p: OrbitParams, dt: number) {
    if (s.crashed || s.escaped) return { state: s, done: true };
    let { x, y, vx, vy } = s;
    let crashed = false;
    let escaped = false;
    const hdt = dt / SUBSTEPS;

    // Velocity Verlet: symplectic, excellent long-term energy behaviour.
    const acc = (px: number, py: number): [number, number] => {
      const r2 = px * px + py * py;
      const r = Math.sqrt(r2);
      const a = -p.mu / (r2 * r);
      return [a * px, a * py];
    };
    for (let i = 0; i < SUBSTEPS; i++) {
      const [ax, ay] = acc(x, y);
      const nx = x + vx * hdt + 0.5 * ax * hdt * hdt;
      const ny = y + vy * hdt + 0.5 * ay * hdt * hdt;
      const [nax, nay] = acc(nx, ny);
      vx += 0.5 * (ax + nax) * hdt;
      vy += 0.5 * (ay + nay) * hdt;
      x = nx;
      y = ny;
      const r = Math.hypot(x, y);
      if (r <= STAR_RADIUS) {
        crashed = true;
        break;
      }
      if (r >= ESCAPE_R) {
        escaped = true;
        break;
      }
    }

    const r = Math.hypot(x, y);
    const v = Math.hypot(vx, vy);
    const energy = specificEnergy(r, v, p.mu);
    const h = x * vy - y * vx;
    const tick = Math.round((s.t + dt) / dt);
    const trail =
      !crashed && tick % TRAIL_EVERY === 0 && s.trail.length < TRAIL_CAP
        ? [...s.trail, { x, y }]
        : s.trail;

    return {
      state: {
        ...s,
        t: s.t + dt,
        x,
        y,
        vx,
        vy,
        trail,
        rMin: Math.min(s.rMin, r),
        rMax: Math.max(s.rMax, r),
        energy,
        h,
        crashed,
        escaped,
      },
      done: crashed || escaped,
    };
  },

  readout(s: OrbitState, p: OrbitParams): Record<string, number> {
    const r = Math.hypot(s.x, s.y);
    return {
      t: s.t,
      r,
      speed: Math.hypot(s.vx, s.vy),
      energy: s.energy,
      energyDrift: Math.abs(s.e0) > 1e-9 ? ((s.energy - s.e0) / Math.abs(s.e0)) * 100 : 0,
      hDrift: Math.abs(s.h0) > 1e-9 ? ((s.h - s.h0) / Math.abs(s.h0)) * 100 : 0,
      vCircular: Math.sqrt(p.mu / p.r0),
      vEscape: Math.sqrt((2 * p.mu) / p.r0),
    };
  },
};
