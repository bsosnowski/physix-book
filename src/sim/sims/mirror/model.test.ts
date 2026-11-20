import { describe, expect, it } from "vitest";
import { effectiveF, mirrorModel, type MirrorParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<MirrorParams> = {}): MirrorParams {
  return { ...defaultParams(mirrorModel), ...over } as MirrorParams;
}

describe("mirrorModel", () => {
  it("plane mirror: virtual upright same-size image behind the mirror", () => {
    const p = params({ type: 0, u: 20 });
    const s = mirrorModel.init(p);
    expect(s.v).toBe(-20);
    expect(s.m).toBe(1);
    expect(s.real).toBe(false);
  });

  it("concave, object beyond C: real inverted diminished", () => {
    const s = mirrorModel.init(params({ type: 1, f: 15, u: 45 }));
    expect(s.real).toBe(true);
    expect(s.v).toBeCloseTo(22.5, 6);
    expect(s.m).toBeCloseTo(-0.5, 6);
  });

  it("concave, object inside f: virtual magnified (shaving mirror)", () => {
    const s = mirrorModel.init(params({ type: 1, f: 20, u: 10 }));
    expect(s.real).toBe(false);
    expect(s.m).toBeCloseTo(2, 6);
  });

  it("convex always virtual upright diminished", () => {
    for (const u of [5, 20, 50]) {
      const s = mirrorModel.init(params({ type: 2, f: 15, u }));
      expect(s.real).toBe(false);
      expect(s.m).toBeGreaterThan(0);
      expect(s.m).toBeLessThan(1);
    }
  });

  it("R = 2f readout", () => {
    const p = params({ type: 1, f: 15 });
    expect(mirrorModel.readout(mirrorModel.init(p), p).R).toBe(30);
  });

  it("effectiveF signs: plane ∞, concave +, convex −", () => {
    expect(effectiveF(0, 15)).toBe(Infinity);
    expect(effectiveF(1, 15)).toBe(15);
    expect(effectiveF(2, 15)).toBe(-15);
  });

  it("dragging the object updates the image live", () => {
    let s = mirrorModel.init(params({ type: 1, f: 15, u: 30 }));
    s = mirrorModel.pointer!(s, -10, 4, "down");
    expect(s.u).toBe(10);
    expect(s.real).toBe(false); // inside f now
    expect(s.m).toBeCloseTo(3, 6);
  });
});
