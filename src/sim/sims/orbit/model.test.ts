import { describe, expect, it } from "vitest";
import { orbitModel, specificEnergy, type OrbitParams, type OrbitState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<OrbitParams> = {}): OrbitParams {
  return { ...defaultParams(orbitModel), ...over } as OrbitParams;
}

function run(p: OrbitParams, seconds: number): OrbitState {
  let s = orbitModel.init(p);
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const r = orbitModel.step(s, p, DT);
    s = r.state;
    if (r.done) break;
  }
  return s;
}

describe("orbitModel", () => {
  it("circular orbit: r stays constant at r0", () => {
    const p = params({ mu: 200, r0: 12, vt: Math.sqrt(200 / 12) });
    const s = run(p, 60);
    expect(s.crashed).toBe(false);
    expect(s.escaped).toBe(false);
    expect(s.rMax - s.rMin).toBeLessThan(0.02);
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(12, 2);
  });

  it("circular orbit period matches 2π√(r³/μ)", () => {
    const mu = 200, r0 = 12;
    const p = params({ mu, r0, vt: Math.sqrt(mu / r0) });
    const T = 2 * Math.PI * Math.sqrt(r0 ** 3 / mu);
    const s = run(p, T);
    // after one period the body returns near its start
    expect(Math.hypot(s.x - r0, s.y)).toBeLessThan(0.05);
  });

  it("energy drift stays below 0.01% over many elliptical orbits", () => {
    const p = params({ mu: 200, r0: 12, vt: 3.0 });
    const s = run(p, 120);
    const drift = Math.abs((s.energy - s.e0) / s.e0) * 100;
    expect(drift).toBeLessThan(0.01);
  });

  it("angular momentum drift stays below 1e-6 % (Verlet conserves h exactly)", () => {
    const p = params({ mu: 200, r0: 12, vt: 3.0 });
    const s = run(p, 60);
    expect(Math.abs((s.h - s.h0) / s.h0) * 100).toBeLessThan(1e-6);
  });

  it("Kepler III: T² ∝ a³ for two ellipses", () => {
    // Measure period via successive +x-axis crossings (start at apoapsis).
    const period = (vt: number): number => {
      const p = params({ mu: 200, r0: 12, vt });
      let s = orbitModel.init(p);
      const crossings: number[] = [];
      for (let i = 0; i < 120 * 200 && crossings.length < 3; i++) {
        const prev = s;
        s = orbitModel.step(s, p, DT).state;
        if (prev.y < 0 && s.y >= 0 && s.x > 0) {
          crossings.push(prev.t + (DT * -prev.y) / (s.y - prev.y));
        }
      }
      return crossings[crossings.length - 1] - crossings[0];
    };
    const semiMajor = (vt: number) => {
      const e = specificEnergy(12, vt, 200);
      return -200 / (2 * e);
    };
    const T1 = period(3.0), a1 = semiMajor(3.0);
    const T2 = period(3.6), a2 = semiMajor(3.6);
    expect((T1 / T2) ** 2).toBeCloseTo((a1 / a2) ** 3, 2);
  });

  it("vt ≥ √(2μ/r0) escapes", () => {
    const p = params({ mu: 200, r0: 12, vt: Math.sqrt((2 * 200) / 12) + 0.1 });
    const s = run(p, 300);
    expect(s.escaped).toBe(true);
    expect(s.energy).toBeGreaterThan(0);
  });

  it("tiny tangential velocity plunges into the star", () => {
    const p = params({ mu: 200, r0: 12, vt: 0.5 });
    const s = run(p, 60);
    expect(s.crashed).toBe(true);
  });

  it("elliptical orbit: start at apoapsis, rMin matches vis-viva prediction", () => {
    const mu = 200, r0 = 12, vt = 3.0;
    const p = params({ mu, r0, vt });
    const s = run(p, 60);
    const e = specificEnergy(r0, vt, mu);
    const a = -mu / (2 * e);
    const h = r0 * vt;
    const ecc = Math.sqrt(1 + (2 * e * h * h) / (mu * mu));
    const rPeri = a * (1 - ecc);
    expect(s.rMin).toBeCloseTo(rPeri, 1);
    expect(s.rMax).toBeCloseTo(r0, 1);
  });
});
