import { describe, expect, it } from "vitest";
import { C_WATER, T_START, heatingModel, type HeatingParams, type HeatingState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<HeatingParams> = {}): HeatingParams {
  return { ...defaultParams(heatingModel), ...over } as HeatingParams;
}

function run(p: HeatingParams, simSeconds: number): HeatingState {
  let s = heatingModel.init(p);
  for (let i = 0; i < Math.round(simSeconds / DT); i++) {
    s = heatingModel.step(s, p, DT).state;
  }
  return s;
}

describe("heatingModel", () => {
  it("power is V²/R", () => {
    const s = heatingModel.init(params({ V: 120, R: 30 }));
    expect(s.power).toBeCloseTo(480, 8);
  });

  it("doubling voltage quadruples power", () => {
    const a = heatingModel.init(params({ V: 60 }));
    const b = heatingModel.init(params({ V: 120 }));
    expect(b.power / a.power).toBeCloseTo(4, 8);
  });

  it("insulated heating matches Q = mcΔT", () => {
    const p = params({ V: 100, R: 50, water: 1, loss: 0 });
    const s = run(p, 2); // 2 sim-s = 120 real-s
    const expected = T_START + (s.power * 120) / (1 * C_WATER);
    expect(s.temp).toBeCloseTo(Math.min(expected, 100), 1);
    expect(s.energy).toBeCloseTo(s.power * 120, 0);
  });

  it("temperature clamps at boiling", () => {
    const p = params({ V: 240, R: 5, water: 0.2, loss: 0 });
    const s = run(p, 10);
    expect(s.temp).toBe(100);
    expect(s.boiling).toBe(true);
  });

  it("with losses, temperature approaches steady state P/κ + T0", () => {
    const p = params({ V: 60, R: 60, water: 0.5, loss: 2 }); // P=60W → ΔT=30K
    const s = run(p, 40); // 2400 real-s, τ = mc/κ ≈ 1047 s
    const steady = T_START + 60 / 2;
    expect(s.temp).toBeGreaterThan(steady - 5);
    expect(s.temp).toBeLessThan(steady + 0.1);
  });

  it("kWh conversion and cost readout are consistent", () => {
    const p = params({ V: 100, R: 50, loss: 0 });
    const s = run(p, 5); // 300 real-s at 200 W = 60 kJ
    const r = heatingModel.readout(s, p);
    expect(r.kwh).toBeCloseTo(60000 / 3.6e6, 6);
    expect(r.cost).toBeCloseTo(r.kwh * 0.8, 8);
  });
});
