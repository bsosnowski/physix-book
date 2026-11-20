import { describe, expect, it } from "vitest";
import { circuitModel, solveCircuit, type CircuitParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<CircuitParams> = {}): CircuitParams {
  return { ...defaultParams(circuitModel), ...over } as CircuitParams;
}

describe("circuitModel — series", () => {
  it("resistances add; current is V/ΣR", () => {
    const s = solveCircuit(params({ V: 12, R1: 10, R2: 20, R3: 30, parallel: 0 }));
    expect(s.rtotal).toBe(60);
    expect(s.itotal).toBeCloseTo(0.2, 10);
    expect(s.i1).toBeCloseTo(s.i2, 10);
    expect(s.i2).toBeCloseTo(s.i3, 10);
  });

  it("voltage drops sum to the battery voltage (KVL)", () => {
    const p = params({ V: 9, R1: 5, R2: 15, R3: 25, parallel: 0 });
    const s = solveCircuit(p);
    expect(s.v1 + s.v2 + s.v3).toBeCloseTo(p.V, 10);
    expect(s.v2 / s.v1).toBeCloseTo(3, 10); // drops ∝ R
  });

  it("power balances: ΣI²R = VI", () => {
    const p = params({ V: 15, parallel: 0 });
    const s = solveCircuit(p);
    const dissipated = s.i1 ** 2 * p.R1 + s.i2 ** 2 * p.R2 + s.i3 ** 2 * p.R3;
    expect(dissipated).toBeCloseTo(s.ptotal, 8);
  });
});

describe("circuitModel — parallel", () => {
  it("each branch sees full voltage; currents add (KCL)", () => {
    const p = params({ V: 12, R1: 10, R2: 20, R3: 30, parallel: 1 });
    const s = solveCircuit(p);
    expect(s.v1).toBe(12);
    expect(s.i1).toBeCloseTo(1.2, 10);
    expect(s.i2).toBeCloseTo(0.6, 10);
    expect(s.i3).toBeCloseTo(0.4, 10);
    expect(s.itotal).toBeCloseTo(2.2, 10);
  });

  it("1/R adds; three equal R give R/3", () => {
    const s = solveCircuit(params({ R1: 20, R2: 20, R3: 20, parallel: 1 }));
    expect(s.rtotal).toBeCloseTo(20 / 3, 10);
  });

  it("parallel total R is smaller than the smallest branch", () => {
    const p = params({ R1: 10, R2: 50, R3: 100, parallel: 1 });
    expect(solveCircuit(p).rtotal).toBeLessThan(10);
  });

  it("zero voltage → zero current and power", () => {
    const s = solveCircuit(params({ V: 0 }));
    expect(s.itotal).toBe(0);
    expect(s.ptotal).toBe(0);
  });

  it("live parameter change updates the operating point on next step", () => {
    const p = params();
    let s = circuitModel.init(p);
    s = circuitModel.step(s, { ...p, V: 24 }, 1 / 120).state;
    expect(s.itotal).toBeCloseTo(24 / 60, 10);
  });
});
