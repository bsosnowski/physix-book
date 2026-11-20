import { describe, expect, it } from "vitest";
import { lensModel, type LensParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<LensParams> = {}): LensParams {
  return { ...defaultParams(lensModel), ...over } as LensParams;
}

describe("lensModel", () => {
  it("camera preset: real, inverted, diminished image", () => {
    const s = lensModel.init(params({ f: 15, u: 45 }));
    expect(s.real).toBe(true);
    expect(s.v).toBeCloseTo(22.5, 6);
    expect(s.m).toBeCloseTo(-0.5, 6);
  });

  it("readout power in diopters (f=15cm → 6.67 D)", () => {
    const p = params({ f: 15 });
    expect(lensModel.readout(lensModel.init(p), p).power).toBeCloseTo(6.67, 1);
  });

  it("f=0 is clamped away from the singularity", () => {
    const p = params({ f: 0, u: 30 });
    const s = lensModel.step(lensModel.init(params()), p, 1 / 120).state;
    expect(Math.abs(s.f)).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(s.v)).toBe(true);
  });

  it("dragging the object updates u and the image live", () => {
    let s = lensModel.init(params({ f: 15, u: 30 }));
    s = lensModel.pointer!(s, -20, 5, "down");
    expect(s.u).toBe(20);
    expect(s.v).toBeCloseTo(60, 6); // 1/15 − 1/20 → v=60
    s = lensModel.pointer!(s, -60, 5, "move"); // clamps at 50
    expect(s.u).toBe(50);
    s = lensModel.pointer!(s, -60, 5, "up");
    expect(s.dragging).toBe(false);
  });

  it("kind readout: 0 virtual, 1 real, 2 infinity", () => {
    expect(lensModel.readout(lensModel.init(params({ f: 15, u: 8 })), params({ f: 15, u: 8 })).kind).toBe(0);
    expect(lensModel.readout(lensModel.init(params({ f: 15, u: 30 })), params({ f: 15, u: 30 })).kind).toBe(1);
    expect(lensModel.readout(lensModel.init(params({ f: 15, u: 15 })), params({ f: 15, u: 15 })).kind).toBe(2);
  });
});
