import { describe, expect, it } from "vitest";
import { inclineModel, slidingAccel, TRACK_LEN, type InclineParams, type InclineState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<InclineParams> = {}): InclineParams {
  return { ...defaultParams(inclineModel), ...over } as InclineParams;
}

function run(p: InclineParams, seconds: number): InclineState {
  let s = inclineModel.init(p);
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const r = inclineModel.step(s, p, DT);
    s = r.state;
    if (r.done) break;
  }
  return s;
}

describe("inclineModel", () => {
  it("holds still when tanα ≤ μ (static friction)", () => {
    const p = params({ angle: 30, mu: 0.8 }); // tan30° ≈ 0.577 < 0.8
    const s = run(p, 5);
    expect(s.stuck).toBe(true);
    expect(s.s).toBe(0);
    expect(s.v).toBe(0);
  });

  it("slides when tanα > μ", () => {
    const p = params({ angle: 45, mu: 0.3 });
    const s = inclineModel.init(p);
    expect(s.stuck).toBe(false);
    expect(s.a).toBeCloseTo(slidingAccel(p), 6);
  });

  it("critical angle is atan(μ)", () => {
    const mu = 0.5;
    const below = inclineModel.init(params({ angle: (Math.atan(mu) * 180) / Math.PI - 0.5, mu }));
    const above = inclineModel.init(params({ angle: (Math.atan(mu) * 180) / Math.PI + 0.5, mu }));
    expect(below.stuck).toBe(true);
    expect(above.stuck).toBe(false);
  });

  it("frictionless acceleration is g·sinα, independent of mass", () => {
    for (const m of [0.5, 2, 10]) {
      const p = params({ angle: 30, mu: 0, m });
      expect(inclineModel.init(p).a).toBeCloseTo(p.g * 0.5, 6);
    }
  });

  it("s(t) = ½at² while sliding (before track end)", () => {
    const p = params({ angle: 20, mu: 0.1 });
    const a = slidingAccel(p);
    const s = run(p, 1);
    expect(s.s).toBeCloseTo(0.5 * a * s.t * s.t, 2);
    expect(s.v).toBeCloseTo(a * s.t, 2);
  });

  it("sliding block decelerates to rest on shallow slope, never reverses", () => {
    // Start moving via steep angle, then flatten live.
    const steep = params({ angle: 50, mu: 0.2 });
    let s = inclineModel.init(steep);
    for (let i = 0; i < 60; i++) s = inclineModel.step(s, steep, DT).state;
    expect(s.v).toBeGreaterThan(0);
    const flat = params({ angle: 5, mu: 0.2 });
    for (let i = 0; i < 120 * 20 && s.v > 0; i++) {
      s = inclineModel.step(s, flat, DT).state;
    }
    expect(s.v).toBe(0);
    expect(s.stuck).toBe(true);
  });

  it("stops at the end of the track", () => {
    const p = params({ angle: 60, mu: 0 });
    const s = run(p, 60);
    expect(s.reachedEnd).toBe(true);
    expect(s.s).toBe(TRACK_LEN);
  });
});
