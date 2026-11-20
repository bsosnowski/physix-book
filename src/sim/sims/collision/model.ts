import type { SimModel } from "../../framework/types";

export interface CollisionParams extends Record<string, number> {
  m1: number; // kg
  m2: number; // kg
  v1: number; // initial velocity of body 1, m/s
  v2: number; // initial velocity of body 2, m/s
  e: number; // coefficient of restitution 0..1
}

export interface Body {
  x: number; // center position, m
  v: number; // m/s
}

export interface CollisionState {
  t: number;
  b1: Body;
  b2: Body;
  r1: number; // radius (visual + contact), m — from mass
  r2: number;
  collisions: number;
  /** Momentum and KE, for readouts and conservation checks. */
  momentum: number;
  kinetic: number;
  /** Positions history for the trails view. */
  trail1: number[];
  trail2: number[];
}

const WORLD = 20; // m wide arena, walls at ±WORLD/2 (elastic)
const TRAIL_CAP = 240;

const radius = (m: number) => 0.35 * Math.cbrt(m);

function totals(s: { b1: Body; b2: Body }, p: CollisionParams) {
  return {
    momentum: p.m1 * s.b1.v + p.m2 * s.b2.v,
    kinetic: 0.5 * p.m1 * s.b1.v ** 2 + 0.5 * p.m2 * s.b2.v ** 2,
  };
}

export const collisionModel: SimModel<CollisionParams, CollisionState> = {
  params: [
    { key: "m1", symbol: "m_1", labelKey: "collision.param.m1", unit: "kg", min: 0.5, max: 10, step: 0.1, default: 2, apply: "reset" },
    { key: "m2", symbol: "m_2", labelKey: "collision.param.m2", unit: "kg", min: 0.5, max: 10, step: 0.1, default: 2, apply: "reset" },
    { key: "v1", symbol: "v_1", labelKey: "collision.param.v1", unit: "m/s", min: -8, max: 8, step: 0.1, default: 3, apply: "reset" },
    { key: "v2", symbol: "v_2", labelKey: "collision.param.v2", unit: "m/s", min: -8, max: 8, step: 0.1, default: -1, apply: "reset" },
    { key: "e", symbol: "e", labelKey: "collision.param.e", unit: "", min: 0, max: 1, step: 0.05, default: 1, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "collision.readout.t", unit: "s" },
    { key: "v1", labelKey: "collision.readout.v1", unit: "m/s" },
    { key: "v2", labelKey: "collision.readout.v2", unit: "m/s" },
    { key: "momentum", labelKey: "collision.readout.momentum", unit: "kg·m/s" },
    { key: "kinetic", labelKey: "collision.readout.kinetic", unit: "J" },
    { key: "collisions", labelKey: "collision.readout.collisions", unit: "", digits: 0 },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "collision.plot.v",
      series: [
        { key: "v1", labelKey: "collision.readout.v1" },
        { key: "v2", labelKey: "collision.readout.v2", color: "#dc2626" },
      ],
    },
    {
      kind: "time",
      titleKey: "collision.plot.energy",
      series: [
        { key: "kinetic", labelKey: "collision.readout.kinetic", color: "#059669" },
        { key: "momentum", labelKey: "collision.readout.momentum", color: "#d97706" },
      ],
    },
  ],
  presets: [
    { id: "elasticEqual", labelKey: "collision.preset.elasticEqual", params: { m1: 2, m2: 2, v1: 3, v2: -1, e: 1 } },
    { id: "inelastic", labelKey: "collision.preset.inelastic", params: { m1: 2, m2: 2, v1: 3, v2: -1, e: 0 } },
    { id: "heavyLight", labelKey: "collision.preset.heavyLight", params: { m1: 8, m2: 1, v1: 2, v2: 0, e: 1 } },
    { id: "lightHeavy", labelKey: "collision.preset.lightHeavy", params: { m1: 1, m2: 8, v1: 4, v2: 0, e: 1 } },
  ],

  init(p: CollisionParams): CollisionState {
    const b1 = { x: -4, v: p.v1 };
    const b2 = { x: 4, v: p.v2 };
    return {
      t: 0,
      b1,
      b2,
      r1: radius(p.m1),
      r2: radius(p.m2),
      collisions: 0,
      ...totals({ b1, b2 }, p),
      trail1: [b1.x],
      trail2: [b2.x],
    };
  },

  step(s: CollisionState, p: CollisionParams, dt: number) {
    let { x: x1, v: v1 } = s.b1;
    let { x: x2, v: v2 } = s.b2;
    let collisions = s.collisions;

    // Advance; resolve ball-ball contact exactly within the step.
    const gap = x2 - x1 - (s.r1 + s.r2);
    const closing = v1 - v2;
    if (gap > 0 && closing > 0 && gap / closing <= dt) {
      const tc = gap / closing;
      x1 += v1 * tc;
      x2 += v2 * tc;
      // Restitution collision (momentum always conserved).
      const M = p.m1 + p.m2;
      const nv1 = (p.m1 * v1 + p.m2 * v2 + p.m2 * p.e * (v2 - v1)) / M;
      const nv2 = (p.m1 * v1 + p.m2 * v2 + p.m1 * p.e * (v1 - v2)) / M;
      v1 = nv1;
      v2 = nv2;
      collisions++;
      const rest = dt - tc;
      x1 += v1 * rest;
      x2 += v2 * rest;
    } else {
      x1 += v1 * dt;
      x2 += v2 * dt;
    }

    // Elastic walls (external impulse — momentum readout will change; that
    // is physically honest and a teaching point).
    const half = WORLD / 2;
    if (x1 - s.r1 < -half) { x1 = -half + s.r1; v1 = Math.abs(v1); }
    if (x1 + s.r1 > half) { x1 = half - s.r1; v1 = -Math.abs(v1); }
    if (x2 - s.r2 < -half) { x2 = -half + s.r2; v2 = Math.abs(v2); }
    if (x2 + s.r2 > half) { x2 = half - s.r2; v2 = -Math.abs(v2); }

    // Never interpenetrate (e.g. after e changed live mid-contact).
    if (x2 - x1 < s.r1 + s.r2) {
      const mid = (x1 + x2) / 2;
      x1 = mid - (s.r1 + s.r2) / 2;
      x2 = mid + (s.r1 + s.r2) / 2;
    }

    const b1 = { x: x1, v: v1 };
    const b2 = { x: x2, v: v2 };
    const trail1 = [...s.trail1, x1].slice(-TRAIL_CAP);
    const trail2 = [...s.trail2, x2].slice(-TRAIL_CAP);

    return {
      state: {
        ...s,
        t: s.t + dt,
        b1,
        b2,
        collisions,
        ...totals({ b1, b2 }, p),
        trail1,
        trail2,
      },
      done: false,
    };
  },

  readout(s: CollisionState): Record<string, number> {
    return {
      t: s.t,
      v1: s.b1.v,
      v2: s.b2.v,
      momentum: s.momentum,
      kinetic: s.kinetic,
      collisions: s.collisions,
    };
  },
};

export const ARENA_HALF = WORLD / 2;

/** Post-collision velocities, analytic (for tests). */
export function collide1d(
  m1: number, m2: number, v1: number, v2: number, e: number,
): [number, number] {
  const M = m1 + m2;
  return [
    (m1 * v1 + m2 * v2 + m2 * e * (v2 - v1)) / M,
    (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / M,
  ];
}
