import { describe, expect, it } from "vitest";
import { exactPeriod, pendulumModel, type PendulumParams, type PendulumState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;
const DEG = Math.PI / 180;

function params(over: Partial<PendulumParams> = {}): PendulumParams {
  return { ...defaultParams(pendulumModel), ...over } as PendulumParams;
}

function run(p: PendulumParams, seconds: number): PendulumState[] {
  const out: PendulumState[] = [];
  let s = pendulumModel.init(p);
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    s = pendulumModel.step(s, p, DT).state;
    out.push(s);
  }
  return out;
}

/** Measured period from upward zero crossings of θ. */
function measuredPeriod(states: PendulumState[]): number {
  const crossings: number[] = [];
  for (let i = 1; i < states.length; i++) {
    const a = states[i - 1];
    const b = states[i];
    if (a.theta < 0 && b.theta >= 0) {
      const frac = -a.theta / (b.theta - a.theta);
      crossings.push(a.t + frac * DT);
    }
  }
  expect(crossings.length).toBeGreaterThan(2);
  return (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
}

describe("pendulumModel", () => {
  it("small-angle period matches 2π√(L/g)", () => {
    const p = params({ theta0: 5, damping: 0 });
    const T = measuredPeriod(run(p, 20));
    expect(T).toBeCloseTo(2 * Math.PI * Math.sqrt(p.L / p.g), 2);
  });

  it("large-angle period matches the exact AGM result (θ0=120°)", () => {
    const p = params({ theta0: 120, damping: 0 });
    const T = measuredPeriod(run(p, 30));
    expect(T).toBeCloseTo(exactPeriod(p.L, p.g, 120 * DEG), 2);
  });

  it("large-angle period is longer than the small-angle formula", () => {
    const p = params({ theta0: 120 });
    const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g);
    expect(exactPeriod(p.L, p.g, 120 * DEG)).toBeGreaterThan(T0 * 1.3);
  });

  it("conserves energy without damping", () => {
    const p = params({ theta0: 90, damping: 0 });
    const states = run(p, 15);
    const e0 = states[0].energy;
    for (const s of states) expect(s.energy).toBeCloseTo(e0, 5);
  });

  it("damping dissipates energy monotonically (on average)", () => {
    const p = params({ theta0: 60, damping: 0.3 });
    const states = run(p, 10);
    expect(states[states.length - 1].energy).toBeLessThan(states[0].energy * 0.2);
  });

  it("small-angle reference agrees with exact motion at θ0=5°", () => {
    const p = params({ theta0: 5, damping: 0 });
    const states = run(p, 10);
    for (const s of states) {
      expect(Math.abs(s.theta - s.thetaRef)).toBeLessThan(0.002);
    }
  });

  it("small-angle reference diverges at θ0=120° (teaching point)", () => {
    const p = params({ theta0: 120, damping: 0 });
    const states = run(p, 10);
    const maxErr = Math.max(...states.map((s) => Math.abs(s.theta - s.thetaRef)));
    expect(maxErr).toBeGreaterThan(0.5);
  });
});
