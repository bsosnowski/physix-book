import { describe, expect, it } from "vitest";
import { criticalAngle, refractAngle, reflectance, refractionModel, type RefractionParams } from "./model";
import { defaultParams } from "../../framework/types";

const DEG = Math.PI / 180;

function params(over: Partial<RefractionParams> = {}): RefractionParams {
  return { ...defaultParams(refractionModel), ...over } as RefractionParams;
}

describe("Snell's law", () => {
  it("n1 sinθ1 = n2 sinθ2", () => {
    for (const [n1, n2, th] of [[1, 1.33, 40], [1.5, 1, 20], [1.33, 1.5, 70]]) {
      const t2 = refractAngle(n1, n2, th * DEG)!;
      expect(n1 * Math.sin(th * DEG)).toBeCloseTo(n2 * Math.sin(t2), 10);
    }
  });

  it("normal incidence passes straight through", () => {
    expect(refractAngle(1, 2.4, 0)).toBeCloseTo(0, 12);
  });

  it("entering denser medium bends toward the normal", () => {
    expect(refractAngle(1, 1.5, 50 * DEG)!).toBeLessThan(50 * DEG);
  });

  it("water→air critical angle ≈ 48.75°", () => {
    expect(criticalAngle(1.33, 1)! / DEG).toBeCloseTo(48.75, 1);
  });

  it("diamond critical angle ≈ 24.4° (why it sparkles)", () => {
    expect(criticalAngle(2.42, 1)! / DEG).toBeCloseTo(24.4, 1);
  });

  it("no TIR when entering denser medium", () => {
    expect(criticalAngle(1, 1.5)).toBeNull();
    expect(refractAngle(1, 1.5, 89 * DEG)).not.toBeNull();
  });

  it("TIR beyond critical angle", () => {
    expect(refractAngle(1.33, 1, 60 * DEG)).toBeNull();
    expect(refractAngle(1.33, 1, 40 * DEG)).not.toBeNull();
  });
});

describe("Fresnel reflectance", () => {
  it("normal incidence air→glass ≈ 4%", () => {
    expect(reflectance(1, 1.5, 0) * 100).toBeCloseTo(4, 1);
  });

  it("TIR reflects 100%", () => {
    expect(reflectance(1.33, 1, 60 * DEG)).toBe(1);
  });

  it("grazing incidence reflects nearly everything", () => {
    expect(reflectance(1, 1.5, 89 * DEG)).toBeGreaterThan(0.8);
  });

  it("readouts flag TIR and report NaN angles cleanly", () => {
    const p = params({ n1: 1.33, n2: 1, theta: 60 });
    const r = refractionModel.readout(refractionModel.init(p), p);
    expect(r.tir).toBe(1);
    expect(Number.isNaN(r.theta2)).toBe(true);
    expect(r.critical).toBeCloseTo(48.75, 1);
  });
});

describe("pointer interaction", () => {
  it("dragging in the top medium aims the ray", () => {
    let s = refractionModel.init(params());
    s = refractionModel.pointer!(s, 3, 3, "down"); // 45°
    expect(s.thetaDeg).toBeCloseTo(45, 1);
    expect(s.dragging).toBe(true);
    s = refractionModel.pointer!(s, 0, 4, "move");
    expect(s.thetaDeg).toBeCloseTo(0, 1);
    s = refractionModel.pointer!(s, 0, 4, "up");
    expect(s.dragging).toBe(false);
  });

  it("ignores presses below the interface", () => {
    const s0 = refractionModel.init(params());
    const s1 = refractionModel.pointer!(s0, 2, -2, "down");
    expect(s1.thetaDeg).toBe(s0.thetaDeg);
  });
});
