import type { SimModel } from "../../framework/types";

export interface MotorParams extends Record<string, number> {
  V: number; // supply voltage, V
  B: number; // field strength, T (0.1..1)
  N: number; // turns
  commutator: number; // 0/1 — disable to see the coil stall
  load: number; // friction torque, N·m (0..0.5)
}

export interface MotorState {
  t: number;
  theta: number; // coil angle, rad
  omega: number; // rad/s
  current: number; // A
  torque: number; // N·m
  backEmf: number; // V
  spins: number; // completed half-turns (commutations)
}

const R_COIL = 2; // Ω
const AREA = 0.01; // m² per turn
const INERTIA = 2e-3; // kg·m² (small armature; keeps ω·dt within stability)
const K_E = 1; // back-EMF constant folding
const VISCOUS = 2e-4; // N·m·s — bearing/air drag

/** Instantaneous torque on the coil (with commutator rectification). */
export function coilTorque(p: MotorParams, theta: number, current: number): number {
  const raw = p.N * p.B * AREA * current * Math.sin(theta);
  // Commutator flips current every half-turn → torque keeps one sign.
  return p.commutator >= 0.5 ? Math.abs(raw) : raw;
}

export const motorModel: SimModel<MotorParams, MotorState> = {
  params: [
    { key: "V", symbol: "V", labelKey: "motor.param.V", unit: "V", min: -12, max: 12, step: 0.5, default: 6, apply: "live" },
    { key: "B", symbol: "B", labelKey: "motor.param.B", unit: "T", min: 0.1, max: 1, step: 0.05, default: 0.5, apply: "live" },
    { key: "N", symbol: "N", labelKey: "motor.param.N", unit: "", min: 1, max: 50, step: 1, default: 20, apply: "live", digits: 0 },
    { key: "commutator", symbol: "\\circlearrowright", labelKey: "motor.param.commutator", unit: "", min: 0, max: 1, step: 1, default: 1, apply: "live", digits: 0 },
    { key: "load", symbol: "\\tau_L", labelKey: "motor.param.load", unit: "N·m", min: 0, max: 0.05, step: 0.001, default: 0.002, apply: "live", digits: 3 },
  ],
  readouts: [
    { key: "rpm", labelKey: "motor.readout.rpm", unit: "rpm", digits: 0 },
    { key: "current", labelKey: "motor.readout.current", unit: "A", digits: 2 },
    { key: "torque", labelKey: "motor.readout.torque", unit: "mN·m", digits: 2 },
    { key: "backEmf", labelKey: "motor.readout.backEmf", unit: "V", digits: 2 },
    { key: "spins", labelKey: "motor.readout.spins", unit: "", digits: 0 },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "motor.plot.omega",
      series: [
        { key: "rpm", labelKey: "motor.readout.rpm" },
        { key: "current", labelKey: "motor.readout.current", color: "#d97706" },
      ],
    },
  ],
  presets: [
    { id: "run", labelKey: "motor.preset.run", params: { V: 6, B: 0.5, N: 20, commutator: 1, load: 0.002 } },
    { id: "noCommutator", labelKey: "motor.preset.noCommutator", params: { V: 6, B: 0.5, N: 20, commutator: 0, load: 0.002 } },
    { id: "reverse", labelKey: "motor.preset.reverse", params: { V: -6, B: 0.5, N: 20, commutator: 1, load: 0.002 } },
    { id: "heavyLoad", labelKey: "motor.preset.heavyLoad", params: { V: 6, B: 0.5, N: 20, commutator: 1, load: 0.02 } },
    { id: "manyTurns", labelKey: "motor.preset.manyTurns", params: { V: 6, B: 0.5, N: 50, commutator: 1, load: 0.002 } },
  ],

  init(p: MotorParams): MotorState {
    return { t: 0, theta: 0.35, omega: 0, current: p.V / R_COIL, torque: 0, backEmf: 0, spins: 0 };
  },

  step(s: MotorState, p: MotorParams, dt: number) {
    // Back-EMF: generator EMF ∝ ω·sinθ, rectified by the commutator
    // (|sinθ|) so it always opposes the supply. Without a commutator the
    // raw signed EMF applies — which is what stalls/oscillates the coil.
    const k = p.N * p.B * AREA * K_E;
    const rect = p.commutator >= 0.5 ? Math.abs(Math.sin(s.theta)) : Math.sin(s.theta);
    // EMF sign follows rotation (Lenz: always opposes the motion).
    const backEmf = k * s.omega * rect;
    const current = (p.V - backEmf) / R_COIL;
    let torque = coilTorque(p, s.theta, current);
    if (p.commutator >= 0.5) {
      // rectified torque follows the current's sign (supply vs generator)
      torque = Math.abs(torque) * (current < 0 ? -1 : 1);
    }
    // friction: small viscous drag + load torque opposing motion;
    // at rest, static load can hold the coil if torque is smaller.
    let friction: number;
    if (Math.abs(s.omega) > 1e-3) {
      friction = VISCOUS * s.omega + Math.sign(s.omega) * p.load;
    } else {
      friction = Math.abs(torque) <= p.load ? torque : Math.sign(torque) * p.load;
    }
    const alpha = (torque - friction) / INERTIA;
    const omega = s.omega + alpha * dt;
    const theta = s.theta + omega * dt;
    const spins = Math.floor(Math.abs(theta) / Math.PI);
    return {
      state: {
        t: s.t + dt,
        theta,
        omega,
        current,
        torque,
        backEmf: Math.abs(k * s.omega * Math.abs(Math.sin(s.theta))),
        spins,
      },
      done: false,
    };
  },

  readout(s: MotorState): Record<string, number> {
    return {
      rpm: (s.omega * 60) / (2 * Math.PI),
      current: s.current,
      torque: s.torque * 1000,
      backEmf: s.backEmf,
      spins: s.spins,
    };
  },
};
