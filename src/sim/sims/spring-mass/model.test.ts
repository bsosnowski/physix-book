import { describe, expect, it } from "vitest";
import { springModel, type SpringParams, type SpringState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<SpringParams> = {}): SpringParams {
  return { ...defaultParams(springModel), ...over } as SpringParams;
}

function run(p: SpringParams, seconds: number): SpringState[] {
  const out: SpringState[] = [];
  let s = springModel.init(p);
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    s = springModel.step(s, p, DT).state;
    out.push(s);
  }
  return out;
}

describe("springModel", () => {
  it("undamped motion matches x0·cos(ωt)", () => {
    const p = params({ m: 1.3, k: 17, c: 0, x0: 0.6 });
    const w = Math.sqrt(p.k / p.m);
    for (const s of run(p, 12)) {
      expect(s.x).toBeCloseTo(p.x0 * Math.cos(w * s.t), 4);
    }
  });

  it("period matches 2π√(m/k) via zero crossings", () => {
    const p = params({ m: 2, k: 30, c: 0 });
    const states = run(p, 15);
    const crossings: number[] = [];
    for (let i = 1; i < states.length; i++) {
      if (states[i - 1].x < 0 && states[i].x >= 0) {
        const a = states[i - 1], b = states[i];
        crossings.push(a.t + (DT * -a.x) / (b.x - a.x));
      }
    }
    const T = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
    expect(T).toBeCloseTo(2 * Math.PI * Math.sqrt(p.m / p.k), 3);
  });

  it("conserves energy when undamped", () => {
    const p = params({ c: 0 });
    const states = run(p, 10);
    for (const s of states) expect(s.energy).toBeCloseTo(states[0].energy, 6);
  });

  it("critical damping (ζ=1) returns without overshoot", () => {
    const p = params({ m: 1, k: 20, c: 2 * Math.sqrt(20), x0: 0.5 });
    const states = run(p, 6);
    for (const s of states) expect(s.x).toBeGreaterThan(-1e-6);
    expect(states[states.length - 1].x).toBeLessThan(0.01);
  });

  it("overdamped settles slower than critically damped", () => {
    const crit = run(params({ c: 2 * Math.sqrt(20) }), 4);
    const over = run(params({ c: 14 }), 4);
    expect(Math.abs(over[over.length - 1].x)).toBeGreaterThan(
      Math.abs(crit[crit.length - 1].x),
    );
  });

  it("underdamped envelope decays as e^(−ct/2m)", () => {
    const p = params({ m: 1, k: 20, c: 1.5, x0: 0.5 });
    const states = run(p, 8);
    // peaks should shrink; check energy decays roughly exponentially
    const e0 = states[0].energy;
    const eEnd = states[states.length - 1].energy;
    expect(eEnd).toBeLessThan(e0 * Math.exp((-p.c / p.m) * 8) * 3);
    expect(eEnd).toBeGreaterThan(0);
  });
});
