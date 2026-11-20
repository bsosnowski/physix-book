import { describe, expect, it } from "vitest";
import { combinedF, diopters, thinElement } from "./optics";

describe("thinElement — lens", () => {
  it("1/f = 1/u + 1/v for a real image", () => {
    const r = thinElement(30, 10, "lens");
    expect(r.v).toBeCloseTo(15, 8);
    expect(r.m).toBeCloseTo(-0.5, 8);
    expect(r.real).toBe(true);
  });

  it("object at 2f → image at 2f, same size, inverted", () => {
    const r = thinElement(20, 10, "lens");
    expect(r.v).toBeCloseTo(20, 8);
    expect(r.m).toBeCloseTo(-1, 8);
  });

  it("object inside f → virtual, upright, magnified (magnifier)", () => {
    const r = thinElement(5, 10, "lens");
    expect(r.v).toBeLessThan(0);
    expect(r.m).toBeGreaterThan(1);
    expect(r.real).toBe(false);
  });

  it("object at f → image at infinity", () => {
    expect(thinElement(10, 10, "lens").atInfinity).toBe(true);
  });

  it("diverging lens always gives virtual, upright, diminished image", () => {
    for (const u of [5, 15, 50]) {
      const r = thinElement(u, -10, "lens");
      expect(r.real).toBe(false);
      expect(r.m).toBeGreaterThan(0);
      expect(r.m).toBeLessThan(1);
    }
  });
});

describe("thinElement — mirror", () => {
  it("concave: object beyond C gives real diminished image", () => {
    const r = thinElement(40, 10, "mirror"); // f=10 → C=20
    expect(r.real).toBe(true);
    expect(Math.abs(r.m)).toBeLessThan(1);
  });

  it("concave: object inside f gives virtual magnified (makeup mirror)", () => {
    const r = thinElement(5, 10, "mirror");
    expect(r.real).toBe(false);
    expect(r.m).toBeGreaterThan(1);
  });

  it("convex always virtual, upright, diminished", () => {
    for (const u of [5, 20, 100]) {
      const r = thinElement(u, -10, "mirror");
      expect(r.real).toBe(false);
      expect(r.m).toBeGreaterThan(0);
      expect(r.m).toBeLessThan(1);
    }
  });
});

describe("eye helpers", () => {
  it("diopters: f = 0.5 m → 2 D", () => {
    expect(diopters(0.5)).toBe(2);
  });

  it("contact lenses add powers", () => {
    // myopic eye too strong: f=1.8cm; −2D glasses weaken it
    const fEye = 0.018;
    const fGlasses = 1 / -2;
    const f = combinedF(fEye, fGlasses);
    expect(1 / f).toBeCloseTo(1 / fEye - 2, 8);
  });
});
