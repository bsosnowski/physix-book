import { describe, expect, it } from "vitest";
import { eyeModel, neededPower, type EyeParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<EyeParams> = {}): EyeParams {
  return { ...defaultParams(eyeModel), ...over } as EyeParams;
}

describe("eyeModel", () => {
  it("normal eye focused at 1 m: image lands on the retina", () => {
    const p = params({ u: 100, power: 51, axial: 2.0, glasses: 0 });
    const s = eyeModel.init(p);
    expect(s.v).toBeCloseTo(2.0, 1);
    expect(Math.abs(s.error)).toBeLessThan(0.03);
  });

  it("neededPower: reading at 25 cm needs +4 D over distance vision", () => {
    expect(neededPower(25, 2) - neededPower(500, 2)).toBeCloseTo(4 - 0.2, 6);
  });

  it("myopia (long eyeball): distant image focuses in front of retina", () => {
    const s = eyeModel.init(params({ u: 500, power: 51, axial: 2.3, glasses: 0 }));
    expect(s.error).toBeLessThan(0); // v < axial
    expect(s.blur).toBeGreaterThan(0.2);
  });

  it("negative glasses fix myopia", () => {
    const bare = eyeModel.init(params({ u: 500, power: 51, axial: 2.3, glasses: 0 }));
    const fixed = eyeModel.init(params({ u: 500, power: 51, axial: 2.3, glasses: -7.5 }));
    expect(Math.abs(fixed.error)).toBeLessThan(Math.abs(bare.error) / 3);
  });

  it("hyperopia (short eyeball): near image would focus behind retina", () => {
    const s = eyeModel.init(params({ u: 25, power: 54, axial: 1.85, glasses: 0 }));
    expect(s.error).toBeGreaterThan(0);
  });

  it("positive glasses fix hyperopia", () => {
    const bare = eyeModel.init(params({ u: 25, power: 54, axial: 1.85, glasses: 0 }));
    const fixed = eyeModel.init(params({ u: 25, power: 54, axial: 1.85, glasses: 2.75 }));
    expect(Math.abs(fixed.error)).toBeLessThan(Math.abs(bare.error) / 3);
  });

  it("presbyopia: stiff lens (low power) cannot focus near — reading glasses help", () => {
    const stiff = eyeModel.init(params({ u: 25, power: 51, glasses: 0, axial: 2 }));
    expect(Math.abs(stiff.error)).toBeGreaterThan(0.1);
    const helped = eyeModel.init(params({ u: 25, power: 51, glasses: 3, axial: 2 }));
    expect(Math.abs(helped.error)).toBeLessThan(0.05);
  });

  it("powers add: glasses+eye equals a single stronger lens", () => {
    const a = eyeModel.init(params({ power: 51, glasses: 2 }));
    const b = eyeModel.init(params({ power: 53, glasses: 0 }));
    expect(a.v).toBeCloseTo(b.v, 8);
  });
});
