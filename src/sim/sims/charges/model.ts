import type { SimModel } from "../../framework/types";

export interface Charge {
  x: number;
  y: number;
  q: number; // in units of q0 (sign matters)
}

export interface ChargesParams extends Record<string, number> {
  q1: number; // −5..+5
  q2: number;
  showTest: number; // 0/1 release a test charge
}

export interface ChargesState {
  t: number;
  charges: Charge[];
  dragIndex: number; // −1 none
  test: { x: number; y: number; vx: number; vy: number; active: boolean };
  trail: { x: number; y: number }[];
}

export const ARENA = { halfW: 8, halfH: 5 };
/** Field scale: E = Σ q·r̂/r² in these units (k·q0 folded in). */
const K = 6;

export function fieldAt(x: number, y: number, charges: Charge[]): { ex: number; ey: number } {
  let ex = 0;
  let ey = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.04) continue; // soften the singularity
    const r = Math.sqrt(r2);
    const e = (K * c.q) / r2;
    ex += (e * dx) / r;
    ey += (e * dy) / r;
  }
  return { ex, ey };
}

export function potentialAt(x: number, y: number, charges: Charge[]): number {
  let v = 0;
  for (const c of charges) {
    const r = Math.max(0.2, Math.hypot(x - c.x, y - c.y));
    v += (K * c.q) / r;
  }
  return v;
}

const TEST_START = { x: 0, y: 3.6 };

export const chargesModel: SimModel<ChargesParams, ChargesState> = {
  params: [
    { key: "q1", symbol: "q_1", labelKey: "charges.param.q1", unit: "q₀", min: -5, max: 5, step: 1, default: 2, apply: "live", digits: 0 },
    { key: "q2", symbol: "q_2", labelKey: "charges.param.q2", unit: "q₀", min: -5, max: 5, step: 1, default: -2, apply: "live", digits: 0 },
    { key: "showTest", symbol: "+q", labelKey: "charges.param.showTest", unit: "", min: 0, max: 1, step: 1, default: 0, apply: "live", digits: 0 },
  ],
  readouts: [
    { key: "eProbe", labelKey: "charges.readout.eProbe", unit: "E₀", digits: 2 },
    { key: "vProbe", labelKey: "charges.readout.vProbe", unit: "V₀", digits: 2 },
    { key: "testSpeed", labelKey: "charges.readout.testSpeed", unit: "m/s", digits: 2 },
    { key: "testKE", labelKey: "charges.readout.testKE", unit: "J₀", digits: 2 },
  ],
  presets: [
    { id: "dipole", labelKey: "charges.preset.dipole", params: { q1: 2, q2: -2, showTest: 0 } },
    { id: "like", labelKey: "charges.preset.like", params: { q1: 3, q2: 3, showTest: 0 } },
    { id: "unequal", labelKey: "charges.preset.unequal", params: { q1: 4, q2: -1, showTest: 0 } },
    { id: "single", labelKey: "charges.preset.single", params: { q1: 3, q2: 0, showTest: 1 } },
  ],

  init(p: ChargesParams): ChargesState {
    return {
      t: 0,
      charges: [
        { x: -3, y: 0, q: p.q1 },
        { x: 3, y: 0, q: p.q2 },
      ],
      dragIndex: -1,
      test: { ...TEST_START, vx: 0, vy: 0, active: p.showTest >= 0.5 },
      trail: [],
    };
  },

  step(s: ChargesState, p: ChargesParams, dt: number) {
    const charges = s.charges.map((c, i) => ({
      ...c,
      q: i === 0 ? p.q1 : p.q2,
    }));
    let test = s.test;
    let trail = s.trail;
    const active = p.showTest >= 0.5;
    if (active) {
      if (!test.active) {
        test = { ...TEST_START, vx: 0, vy: 0, active: true };
        trail = [];
      }
      // Positive test charge, unit mass; semi-implicit Euler with substeps.
      let { x, y, vx, vy } = test;
      const SUB = 4;
      const h = dt / SUB;
      for (let i = 0; i < SUB; i++) {
        const { ex, ey } = fieldAt(x, y, charges);
        vx += ex * h;
        vy += ey * h;
        x += vx * h;
        y += vy * h;
      }
      // absorb on contact with a negative charge, bounce off arena walls
      let absorbed = false;
      for (const c of charges) {
        if (c.q < 0 && Math.hypot(x - c.x, y - c.y) < 0.35) absorbed = true;
      }
      if (
        absorbed ||
        Math.abs(x) > ARENA.halfW + 2 ||
        Math.abs(y) > ARENA.halfH + 2
      ) {
        test = { ...TEST_START, vx: 0, vy: 0, active: true };
        trail = [];
      } else {
        if (x < -ARENA.halfW) { x = -ARENA.halfW; vx = Math.abs(vx); }
        if (x > ARENA.halfW) { x = ARENA.halfW; vx = -Math.abs(vx); }
        if (y < -ARENA.halfH) { y = -ARENA.halfH; vy = Math.abs(vy); }
        if (y > ARENA.halfH) { y = ARENA.halfH; vy = -Math.abs(vy); }
        test = { x, y, vx, vy, active: true };
        const tick = Math.round((s.t + dt) / dt);
        if (tick % 3 === 0 && trail.length < 1200) trail = [...trail, { x, y }];
      }
    } else if (test.active) {
      test = { ...TEST_START, vx: 0, vy: 0, active: false };
      trail = [];
    }
    return { state: { ...s, t: s.t + dt, charges, test, trail }, done: false };
  },

  readout(s: ChargesState): Record<string, number> {
    const { ex, ey } = fieldAt(0, 2.5, s.charges);
    const speed = Math.hypot(s.test.vx, s.test.vy);
    return {
      eProbe: Math.hypot(ex, ey),
      vProbe: potentialAt(0, 2.5, s.charges),
      testSpeed: s.test.active ? speed : 0,
      testKE: s.test.active ? 0.5 * speed * speed : 0,
    };
  },

  pointer(s: ChargesState, x: number, y: number, phase): ChargesState {
    if (phase === "down") {
      let best = -1;
      let bestD = 0.8;
      s.charges.forEach((c, i) => {
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return { ...s, dragIndex: best };
    }
    if (phase === "up") return { ...s, dragIndex: -1 };
    if (s.dragIndex < 0) return s;
    const charges = s.charges.map((c, i) =>
      i === s.dragIndex
        ? {
            ...c,
            x: Math.max(-ARENA.halfW + 0.5, Math.min(ARENA.halfW - 0.5, x)),
            y: Math.max(-ARENA.halfH + 0.5, Math.min(ARENA.halfH - 0.5, y)),
          }
        : c,
    );
    return { ...s, charges };
  },
};
