import type { SimModel } from "../../framework/types";

export interface RefractionParams extends Record<string, number> {
  n1: number; // top medium index
  n2: number; // bottom medium index
  theta: number; // incidence angle from normal, degrees
}

export interface RefractionState {
  t: number;
  n1: number;
  n2: number;
  thetaDeg: number;
  /** Dragging the incident ray? */
  dragging: boolean;
  /** Animated photon phase along the ray path 0..1. */
  phase: number;
}

const DEG = Math.PI / 180;
export const INTERFACE_Y = 0; // world: interface at y=0, top medium y>0
export const WORLD = { halfW: 6, halfH: 4 };

/** Snell: returns refracted angle (rad) or null on total internal reflection. */
export function refractAngle(n1: number, n2: number, thetaRad: number): number | null {
  const s = (n1 / n2) * Math.sin(thetaRad);
  if (Math.abs(s) > 1) return null;
  return Math.asin(s);
}

export function criticalAngle(n1: number, n2: number): number | null {
  if (n1 <= n2) return null;
  return Math.asin(n2 / n1);
}

/** Fresnel (unpolarized average) reflectance 0..1. */
export function reflectance(n1: number, n2: number, thetaRad: number): number {
  const t2 = refractAngle(n1, n2, thetaRad);
  if (t2 === null) return 1;
  const ci = Math.cos(thetaRad);
  const ct = Math.cos(t2);
  const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2;
  const rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
  return (rs + rp) / 2;
}

export const refractionModel: SimModel<RefractionParams, RefractionState> = {
  params: [
    { key: "n1", symbol: "n_1", labelKey: "refraction.param.n1", unit: "", min: 1, max: 2.5, step: 0.01, default: 1, apply: "live" },
    { key: "n2", symbol: "n_2", labelKey: "refraction.param.n2", unit: "", min: 1, max: 2.5, step: 0.01, default: 1.33, apply: "live" },
    { key: "theta", symbol: "\\theta_1", labelKey: "refraction.param.theta", unit: "°", min: 0, max: 89, step: 1, default: 40, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "theta2", labelKey: "refraction.readout.theta2", unit: "°", digits: 1 },
    { key: "critical", labelKey: "refraction.readout.critical", unit: "°", digits: 1 },
    { key: "reflect", labelKey: "refraction.readout.reflect", unit: "%", digits: 1 },
    { key: "tir", labelKey: "refraction.readout.tir", unit: "", digits: 0 },
  ],
  presets: [
    { id: "airWater", labelKey: "refraction.preset.airWater", params: { n1: 1, n2: 1.33, theta: 40 } },
    { id: "waterAir", labelKey: "refraction.preset.waterAir", params: { n1: 1.33, n2: 1, theta: 40 } },
    { id: "tir", labelKey: "refraction.preset.tir", params: { n1: 1.33, n2: 1, theta: 60 } },
    { id: "diamond", labelKey: "refraction.preset.diamond", params: { n1: 2.42, n2: 1, theta: 20 } },
    { id: "glass", labelKey: "refraction.preset.glass", params: { n1: 1, n2: 1.5, theta: 50 } },
  ],

  init(p: RefractionParams): RefractionState {
    return { t: 0, n1: p.n1, n2: p.n2, thetaDeg: p.theta, dragging: false, phase: 0 };
  },

  step(s: RefractionState, p: RefractionParams, dt: number) {
    return {
      state: {
        ...s,
        t: s.t + dt,
        n1: s.dragging ? s.n1 : p.n1,
        n2: s.dragging ? s.n2 : p.n2,
        thetaDeg: s.dragging ? s.thetaDeg : p.theta,
        phase: (s.phase + dt * 0.4) % 1,
      },
      done: false,
    };
  },

  readout(s: RefractionState): Record<string, number> {
    const th = s.thetaDeg * DEG;
    const t2 = refractAngle(s.n1, s.n2, th);
    const crit = criticalAngle(s.n1, s.n2);
    return {
      theta2: t2 === null ? NaN : t2 / DEG,
      critical: crit === null ? NaN : crit / DEG,
      reflect: reflectance(s.n1, s.n2, th) * 100,
      tir: t2 === null ? 1 : 0,
    };
  },

  /** Drag anywhere in the top medium to aim the incident ray. */
  pointer(s: RefractionState, x: number, y: number, phase): RefractionState {
    if (phase === "up") return { ...s, dragging: false };
    if (phase === "down" && y <= 0.05) return s;
    const theta = Math.atan2(Math.abs(x), Math.max(y, 0.05)) / DEG;
    return {
      ...s,
      dragging: true,
      thetaDeg: Math.min(89, Math.max(0, theta)),
    };
  },
};
