import { describe, expect, it } from "vitest";
import { capacitance, capacitorModel, type CapacitorParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<CapacitorParams> = {}): CapacitorParams {
  return { ...defaultParams(capacitorModel), ...over } as CapacitorParams;
}

describe("capacitorModel", () => {
  it("C = ε₀εᵣA/d with unit conversions (100cm², 5mm, air ≈ 17.7 pF)", () => {
    expect(capacitance({ area: 100, d: 5, er: 1 }) * 1e12).toBeCloseTo(17.71, 1);
  });

  it("E = V/d; doubling d halves E at fixed V", () => {
    const p = params({ V: 50, d: 5 });
    const e1 = capacitorModel.readout(capacitorModel.init(p), p).E;
    const p2 = params({ V: 50, d: 10 });
    const e2 = capacitorModel.readout(capacitorModel.init(p2), p2).E;
    expect(e1).toBeCloseTo(10, 6); // 10 kV/m
    expect(e2).toBeCloseTo(5, 6);
  });

  it("dielectric multiplies C but not E (V fixed by battery)", () => {
    const air = params({ dielectric: 1 });
    const cer = params({ dielectric: 6 });
    const ra = capacitorModel.readout(capacitorModel.init(air), air);
    const rc = capacitorModel.readout(capacitorModel.init(cer), cer);
    expect(rc.C / ra.C).toBeCloseTo(6, 6);
    expect(rc.E).toBeCloseTo(ra.E, 6);
  });

  it("U = ½CV² — doubling V quadruples stored energy", () => {
    const p1 = params({ V: 25 });
    const p2 = params({ V: 50 });
    const u1 = capacitorModel.readout(capacitorModel.init(p1), p1).U;
    const u2 = capacitorModel.readout(capacitorModel.init(p2), p2).U;
    expect(u2 / u1).toBeCloseTo(4, 6);
  });

  it("Q = CV consistency", () => {
    const p = params();
    const r = capacitorModel.readout(capacitorModel.init(p), p);
    expect(r.Q).toBeCloseTo(r.C * p.V * 1e-3, 6); // pF·V → nC factor
  });

  it("released probe accelerates and respawns at the far plate", () => {
    const p = params({ V: 100, d: 1 });
    let s = capacitorModel.init(p);
    s = capacitorModel.pointer!(s, 0, 0, "down");
    expect(s.probe.released).toBe(true);
    const v0 = s.probe.v;
    for (let i = 0; i < 30; i++) s = capacitorModel.step(s, p, 1 / 120).state;
    expect(s.probe.v).toBeGreaterThan(v0);
    for (let i = 0; i < 120 * 10; i++) s = capacitorModel.step(s, p, 1 / 120).state;
    expect(s.probe.f).toBeGreaterThanOrEqual(0.05);
    expect(s.probe.f).toBeLessThan(0.95);
  });
});
