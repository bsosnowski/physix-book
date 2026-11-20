import type { SimModel } from "../../framework/types";

export interface PendulumParams extends Record<string, number> {
  L: number; // length, m
  g: number; // gravity, m/s²
  theta0: number; // release angle, degrees
  damping: number; // viscous damping γ, 1/s
}

export interface PendulumState {
  t: number;
  /** Current length (mirrors the live param, for the view). */
  L: number;
  theta: number; // rad, from vertical
  omega: number; // rad/s
  /** Small-angle harmonic reference started at the same angle. */
  thetaRef: number;
  /** Mechanical energy per unit mass, J/kg. */
  energy: number;
}

const DEG = Math.PI / 180;

/** Exact pendulum ODE: θ'' = -(g/L)·sinθ − γ·θ'. RK4 on (θ, ω). */
function deriv(theta: number, omega: number, p: PendulumParams): [number, number] {
  return [omega, -(p.g / p.L) * Math.sin(theta) - p.damping * omega];
}

export const pendulumModel: SimModel<PendulumParams, PendulumState> = {
  params: [
    { key: "L", symbol: "L", labelKey: "pendulum.param.L", unit: "m", min: 0.5, max: 3, step: 0.05, default: 1.5, apply: "live" },
    { key: "g", symbol: "g", labelKey: "pendulum.param.g", unit: "m/s²", min: 1, max: 25, step: 0.01, default: 9.81, apply: "live" },
    { key: "theta0", symbol: "\\theta_0", labelKey: "pendulum.param.theta0", unit: "°", min: 5, max: 170, step: 1, default: 30, apply: "reset", digits: 0 },
    { key: "damping", symbol: "\\gamma", labelKey: "pendulum.param.damping", unit: "1/s", min: 0, max: 1, step: 0.01, default: 0, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "pendulum.readout.t", unit: "s" },
    { key: "thetaDeg", labelKey: "pendulum.readout.theta", unit: "°", digits: 1 },
    { key: "omega", labelKey: "pendulum.readout.omega", unit: "rad/s" },
    { key: "energy", labelKey: "pendulum.readout.energy", unit: "J/kg" },
    { key: "periodSmall", labelKey: "pendulum.readout.periodSmall", unit: "s" },
    { key: "periodExact", labelKey: "pendulum.readout.periodExact", unit: "s" },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "pendulum.plot.angle",
      series: [
        { key: "thetaDeg", labelKey: "pendulum.readout.theta" },
        { key: "thetaRefDeg", labelKey: "pendulum.plot.smallAngle", color: "#9ca3af" },
      ],
    },
    {
      kind: "phase",
      titleKey: "pendulum.plot.phase",
      xKey: "thetaDeg",
      yKey: "omega",
      xLabelKey: "pendulum.readout.theta",
      yLabelKey: "pendulum.readout.omega",
    },
  ],
  presets: [
    { id: "small", labelKey: "pendulum.preset.small", params: { theta0: 15, damping: 0 } },
    { id: "large", labelKey: "pendulum.preset.large", params: { theta0: 120, damping: 0 } },
    { id: "damped", labelKey: "pendulum.preset.damped", params: { theta0: 60, damping: 0.25 } },
    { id: "moon", labelKey: "pendulum.preset.moon", params: { g: 1.62, theta0: 45, damping: 0 } },
  ],

  init(p: PendulumParams): PendulumState {
    const th = p.theta0 * DEG;
    return {
      t: 0,
      L: p.L,
      theta: th,
      omega: 0,
      thetaRef: th,
      energy: p.g * p.L * (1 - Math.cos(th)),
    };
  },

  step(s: PendulumState, p: PendulumParams, dt: number) {
    // RK4 for (theta, omega)
    const [k1t, k1w] = deriv(s.theta, s.omega, p);
    const [k2t, k2w] = deriv(s.theta + (dt / 2) * k1t, s.omega + (dt / 2) * k1w, p);
    const [k3t, k3w] = deriv(s.theta + (dt / 2) * k2t, s.omega + (dt / 2) * k2w, p);
    const [k4t, k4w] = deriv(s.theta + dt * k3t, s.omega + dt * k3w, p);
    const theta = s.theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
    const omega = s.omega + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);

    // Undamped small-angle reference: θ_ref(t) = θ0·cos(ω0·t)
    const w0 = Math.sqrt(p.g / p.L);
    const thetaRef = p.theta0 * DEG * Math.cos(w0 * (s.t + dt));

    const energy =
      0.5 * p.L * p.L * omega * omega + p.g * p.L * (1 - Math.cos(theta));

    return {
      state: { t: s.t + dt, L: p.L, theta, omega, thetaRef, energy },
      done: false,
    };
  },

  readout(s: PendulumState, p: PendulumParams): Record<string, number> {
    const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g);
    return {
      t: s.t,
      thetaDeg: s.theta / DEG,
      thetaRefDeg: s.thetaRef / DEG,
      omega: s.omega,
      energy: s.energy,
      periodSmall: T0,
      periodExact: exactPeriod(p.L, p.g, p.theta0 * DEG),
    };
  },
};

/**
 * Exact large-amplitude period via the AGM (arithmetic–geometric mean):
 * T = T0 / AGM(1, cos(θ0/2)). Fast and machine-accurate.
 */
export function exactPeriod(L: number, g: number, theta0Rad: number): number {
  const T0 = 2 * Math.PI * Math.sqrt(L / g);
  let a = 1;
  let b = Math.cos(theta0Rad / 2);
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15; i++) {
    const an = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = an;
  }
  return T0 / a;
}
