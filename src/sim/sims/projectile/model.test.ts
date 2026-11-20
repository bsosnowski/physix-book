import { describe, expect, it } from "vitest";
import {
  analyticApex,
  analyticRange,
  projectileModel,
  type ProjectileParams,
  type ProjectileState,
} from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<ProjectileParams> = {}): ProjectileParams {
  return { ...defaultParams(projectileModel), ...over } as ProjectileParams;
}

function flyToLanding(p: ProjectileParams): ProjectileState {
  let s = projectileModel.init(p);
  for (let i = 0; i < 120 * 120; i++) {
    const res = projectileModel.step(s, p, DT);
    s = res.state;
    if (res.done) return s;
  }
  throw new Error("never landed");
}

describe("projectileModel (vacuum)", () => {
  it.each([
    [20, 45, 9.81],
    [15, 30, 9.81],
    [35, 60, 1.62],
    [50, 85, 25],
  ])("range matches analytic formula: v0=%d θ=%d g=%d", (v0, angle, g) => {
    const p = params({ v0, angle, g, drag: 0 });
    const s = flyToLanding(p);
    expect(s.landed).toBe(true);
    expect(s.range).toBeCloseTo(analyticRange(v0, angle, g), 2);
  });

  it("apex matches analytic formula", () => {
    const p = params({ v0: 25, angle: 55, drag: 0 });
    const s = flyToLanding(p);
    expect(s.maxY).toBeCloseTo(analyticApex(25, 55, 9.81), 2);
  });

  it("45° maximizes range (vs 40° and 50°)", () => {
    const r = (angle: number) => flyToLanding(params({ angle })).range;
    expect(r(45)).toBeGreaterThan(r(40));
    expect(r(45)).toBeGreaterThan(r(50));
  });

  it("conserves mechanical energy throughout flight", () => {
    const p = params({ drag: 0 });
    let s = projectileModel.init(p);
    const E = (st: ProjectileState) =>
      0.5 * (st.motion.vel.x ** 2 + st.motion.vel.y ** 2) + p.g * st.motion.pos.y;
    const e0 = E(s);
    for (let i = 0; i < 120; i++) {
      s = projectileModel.step(s, p, DT).state;
      expect(E(s)).toBeCloseTo(e0, 6);
    }
  });

  it("flight time matches 2·v0·sinθ/g", () => {
    const p = params({ v0: 20, angle: 40, drag: 0 });
    const s = flyToLanding(p);
    const expected = (2 * 20 * Math.sin((40 * Math.PI) / 180)) / 9.81;
    expect(s.t).toBeCloseTo(expected, 2);
  });
});

describe("projectileModel (drag)", () => {
  it("drag reduces range and apex", () => {
    const vacuum = flyToLanding(params({ drag: 0 }));
    const air = flyToLanding(params({ drag: 0.01 }));
    expect(air.range).toBeLessThan(vacuum.range * 0.9);
    expect(air.maxY).toBeLessThan(vacuum.maxY);
  });

  it("drag dissipates energy", () => {
    const p = params({ drag: 0.02 });
    let s = projectileModel.init(p);
    const E = (st: ProjectileState) =>
      0.5 * (st.motion.vel.x ** 2 + st.motion.vel.y ** 2) + p.g * st.motion.pos.y;
    const e0 = E(s);
    for (let i = 0; i < 60; i++) s = projectileModel.step(s, p, DT).state;
    expect(E(s)).toBeLessThan(e0);
  });

  it("landing state is terminal (done stays true)", () => {
    const p = params();
    const s = flyToLanding(p);
    const res = projectileModel.step(s, p, DT);
    expect(res.done).toBe(true);
    expect(res.state).toBe(s);
  });
});
