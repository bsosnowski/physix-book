import { add, scale, type Vec2 } from "./vec2";

/**
 * Generic state for 2nd-order ODEs: position + velocity.
 * `accel` may depend on position, velocity and time.
 */
export interface MotionState {
  pos: Vec2;
  vel: Vec2;
}

export type Accel = (pos: Vec2, vel: Vec2, t: number) => Vec2;

/** Semi-implicit (symplectic) Euler — stable for oscillatory systems. */
export function semiImplicitEuler(
  s: MotionState,
  accel: Accel,
  t: number,
  dt: number,
): MotionState {
  const a = accel(s.pos, s.vel, t);
  const vel = add(s.vel, scale(a, dt));
  const pos = add(s.pos, scale(vel, dt));
  return { pos, vel };
}

/** Classical Runge–Kutta 4 for the system (pos' = vel, vel' = accel). */
export function rk4(
  s: MotionState,
  accel: Accel,
  t: number,
  dt: number,
): MotionState {
  const f = (st: MotionState, tt: number) => ({
    dPos: st.vel,
    dVel: accel(st.pos, st.vel, tt),
  });
  const adv = (st: MotionState, d: { dPos: Vec2; dVel: Vec2 }, h: number): MotionState => ({
    pos: add(st.pos, scale(d.dPos, h)),
    vel: add(st.vel, scale(d.dVel, h)),
  });

  const k1 = f(s, t);
  const k2 = f(adv(s, k1, dt / 2), t + dt / 2);
  const k3 = f(adv(s, k2, dt / 2), t + dt / 2);
  const k4 = f(adv(s, k3, dt), t + dt);

  const w = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 =>
    scale(add(add(a, scale(b, 2)), add(scale(c, 2), d)), dt / 6);

  return {
    pos: add(s.pos, w(k1.dPos, k2.dPos, k3.dPos, k4.dPos)),
    vel: add(s.vel, w(k1.dVel, k2.dVel, k3.dVel, k4.dVel)),
  };
}
