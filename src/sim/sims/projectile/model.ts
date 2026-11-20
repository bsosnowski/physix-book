import { rk4, type MotionState } from "../../core/integrators";
import { length, type Vec2 } from "../../core/vec2";
import type { SimModel } from "../../framework/types";

export interface ProjectileParams extends Record<string, number> {
  v0: number; // initial speed, m/s
  angle: number; // launch angle, degrees
  g: number; // gravitational acceleration, m/s²
  drag: number; // quadratic drag coefficient k/m, 1/m (0 = vacuum)
}

export interface ProjectileState {
  t: number;
  /** Current motion (position m, velocity m/s; y up). */
  motion: MotionState;
  /** Full trajectory of the flight so far, for the trail. */
  trail: Vec2[];
  /** Apex height reached, m. */
  maxY: number;
  /** Horizontal distance at landing, m (0 until landed). */
  range: number;
  landed: boolean;
}

const DEG = Math.PI / 180;
const TRAIL_EVERY = 4; // record a trail point every N steps (~30 Hz)
const MAX_TRAIL = 4000;

export const projectileModel: SimModel<ProjectileParams, ProjectileState> = {
  params: [
    { key: "v0", symbol: "v_0", labelKey: "projectile.param.v0", unit: "m/s", min: 5, max: 50, step: 0.5, default: 20, apply: "reset" },
    { key: "angle", symbol: "\\theta", labelKey: "projectile.param.angle", unit: "°", min: 5, max: 85, step: 1, default: 45, apply: "reset", digits: 0 },
    { key: "g", symbol: "g", labelKey: "projectile.param.g", unit: "m/s²", min: 1, max: 25, step: 0.01, default: 9.81, apply: "live" },
    { key: "drag", symbol: "k", labelKey: "projectile.param.drag", unit: "1/m", min: 0, max: 0.05, step: 0.001, default: 0, apply: "live", digits: 3 },
  ],
  readouts: [
    { key: "t", labelKey: "projectile.readout.t", unit: "s" },
    { key: "x", labelKey: "projectile.readout.x", unit: "m" },
    { key: "y", labelKey: "projectile.readout.y", unit: "m" },
    { key: "speed", labelKey: "projectile.readout.speed", unit: "m/s" },
    { key: "range", labelKey: "projectile.readout.range", unit: "m" },
    { key: "maxY", labelKey: "projectile.readout.maxY", unit: "m" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "projectile.plot.pos",
      series: [
        { key: "x", labelKey: "projectile.readout.x" },
        { key: "y", labelKey: "projectile.readout.y" },
      ],
    },
    {
      kind: "time",
      titleKey: "projectile.plot.vel",
      series: [{ key: "vy", labelKey: "projectile.readout.vy", color: "#059669" }],
    },
  ],
  presets: [
    { id: "earth", labelKey: "projectile.preset.earth", params: { g: 9.81, drag: 0 } },
    { id: "moon", labelKey: "projectile.preset.moon", params: { g: 1.62, drag: 0 } },
    { id: "mars", labelKey: "projectile.preset.mars", params: { g: 3.71, drag: 0 } },
    { id: "air", labelKey: "projectile.preset.air", params: { g: 9.81, drag: 0.01 } },
  ],

  init(p: ProjectileParams): ProjectileState {
    const a = p.angle * DEG;
    const start = { x: 0, y: 0 };
    return {
      t: 0,
      motion: {
        pos: { ...start },
        vel: { x: p.v0 * Math.cos(a), y: p.v0 * Math.sin(a) },
      },
      trail: [{ ...start }],
      maxY: 0,
      range: 0,
      landed: false,
    };
  },

  step(s: ProjectileState, p: ProjectileParams, dt: number) {
    if (s.landed) return { state: s, done: true };

    // a = g (down) + quadratic drag: -k·|v|·v
    const accel = (_pos: Vec2, vel: Vec2): Vec2 => {
      const speed = length(vel);
      return {
        x: -p.drag * speed * vel.x,
        y: -p.g - p.drag * speed * vel.y,
      };
    };
    const next = rk4(s.motion, accel, s.t, dt);
    const t = s.t + dt;
    let landed = false;
    let range = s.range;

    if (next.pos.y <= 0 && next.vel.y < 0) {
      // Interpolate the exact ground crossing within this step.
      const prevY = s.motion.pos.y;
      const frac = prevY / (prevY - next.pos.y || 1);
      next.pos = {
        x: s.motion.pos.x + (next.pos.x - s.motion.pos.x) * frac,
        y: 0,
      };
      next.vel = { x: 0, y: 0 };
      landed = true;
      range = next.pos.x;
    }

    const trail =
      s.trail.length < MAX_TRAIL &&
      (landed || Math.round(t / dt) % TRAIL_EVERY === 0)
        ? [...s.trail, { ...next.pos }]
        : s.trail;

    return {
      state: {
        t,
        motion: next,
        trail,
        maxY: Math.max(s.maxY, next.pos.y),
        range,
        landed,
      },
      done: landed,
    };
  },

  readout(s: ProjectileState): Record<string, number> {
    return {
      t: s.t,
      x: s.motion.pos.x,
      y: s.motion.pos.y,
      speed: length(s.motion.vel),
      vy: s.motion.vel.y,
      range: s.range,
      maxY: s.maxY,
    };
  },
};

/** Analytic vacuum solution — used by tests and the ghost trajectory. */
export function analyticRange(v0: number, angleDeg: number, g: number): number {
  return (v0 * v0 * Math.sin(2 * angleDeg * DEG)) / g;
}

export function analyticApex(v0: number, angleDeg: number, g: number): number {
  const vy = v0 * Math.sin(angleDeg * DEG);
  return (vy * vy) / (2 * g);
}
