import { describe, expect, it } from "vitest";
import {
  interferenceModel,
  intensity,
  pathDifference,
  type InterferenceParams,
} from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<InterferenceParams> = {}): InterferenceParams {
  return { ...defaultParams(interferenceModel), ...over } as InterferenceParams;
}

describe("interferenceModel", () => {
  it("perpendicular bisector is always constructive (Δr = 0)", () => {
    const p = params();
    for (const y of [-5, -1, 0.5, 3, 5.9]) {
      expect(pathDifference(0, y, p.d)).toBeCloseTo(0, 10);
      expect(intensity(0, y, p)).toBeCloseTo(1, 10);
    }
  });

  it("Δr = mλ → constructive; Δr = (m+½)λ → destructive", () => {
    const lambda = 1.4;
    const p = params({ lambda, d: 6 });
    // Far along the +x axis, Δr → d. Choose d = mλ exactly.
    const m = 3;
    const pd = params({ lambda, d: m * lambda });
    expect(intensity(9.9, 0, pd)).toBeGreaterThan(0.99); // ~constructive on axis
    // half-integer: d = (m+½)λ
    const ph = params({ lambda, d: (m + 0.5) * lambda });
    expect(intensity(9.9, 0, ph)).toBeLessThan(0.02); // ~destructive on axis
    void p;
  });

  it("path difference never exceeds source separation", () => {
    const d = 4.2;
    for (let x = -10; x <= 10; x += 1.3) {
      for (let y = -6; y <= 6; y += 1.1) {
        expect(pathDifference(x, y, d)).toBeLessThanOrEqual(d + 1e-9);
      }
    }
  });

  it("intensity is symmetric under x → −x and y → −y", () => {
    const p = params({ lambda: 1.1, d: 4.7 });
    for (const [x, y] of [[2.3, 1.7], [5.1, -3.2], [-7.7, 0.4]]) {
      expect(intensity(x, y, p)).toBeCloseTo(intensity(-x, y, p), 10);
      expect(intensity(x, y, p)).toBeCloseTo(intensity(x, -y, p), 10);
    }
  });

  it("maxOrder readout is floor(d/λ)", () => {
    const p = params({ lambda: 1.5, d: 5 });
    const r = interferenceModel.readout(interferenceModel.init(p), p);
    expect(r.maxOrder).toBe(3);
    expect(r.ratio).toBeCloseTo(5 / 1.5, 10);
  });

  it("on the source axis beyond both sources, Δr = d exactly", () => {
    expect(pathDifference(9, 0, 5)).toBeCloseTo(5, 10);
    expect(pathDifference(-9, 0, 5)).toBeCloseTo(5, 10);
  });
});
