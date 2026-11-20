import { describe, expect, it } from "vitest";
import { motorModel, type MotorParams, type MotorState } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<MotorParams> = {}): MotorParams {
  return { ...defaultParams(motorModel), ...over } as MotorParams;
}

function run(p: MotorParams, seconds: number): MotorState {
  let s = motorModel.init(p);
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    s = motorModel.step(s, p, 1 / 120).state;
  }
  return s;
}

describe("motorModel", () => {
  it("with commutator the motor spins up to steady rpm", () => {
    const s = run(params(), 5);
    expect(s.omega).toBeGreaterThan(5);
    expect(s.spins).toBeGreaterThan(3);
  });

  it("back-EMF grows with speed and reduces current", () => {
    const p = params();
    const start = motorModel.init(p);
    const s = run(p, 5);
    expect(s.backEmf).toBeGreaterThan(0);
    expect(s.current).toBeLessThan(start.current);
  });

  it("reversing voltage reverses rotation", () => {
    const s = run(params({ V: -6 }), 5);
    expect(s.omega).toBeLessThan(-5);
  });

  it("without commutator the coil only oscillates — no net spin", () => {
    const s = run(params({ commutator: 0 }), 8);
    expect(Math.abs(s.omega)).toBeLessThan(15);
    expect(s.spins).toBeLessThan(4); // never keeps rotating
  });

  it("more turns → more starting torque", () => {
    const few = motorModel.step(motorModel.init(params({ N: 5 })), params({ N: 5 }), 1 / 120).state;
    const many = motorModel.step(motorModel.init(params({ N: 50 })), params({ N: 50 }), 1 / 120).state;
    expect(Math.abs(many.torque)).toBeGreaterThan(Math.abs(few.torque) * 5);
  });

  it("heavy load slows the motor and raises average current", () => {
    const avg = (load: number) => {
      const p = params({ load });
      let s = run(p, 4); // settle
      let sum = 0;
      const n = 240; // two full seconds — covers many commutations
      for (let i = 0; i < n; i++) {
        s = motorModel.step(s, p, 1 / 120).state;
        sum += Math.abs(s.current);
      }
      return { omega: Math.abs(s.omega), iAvg: sum / n };
    };
    const light = avg(0.001);
    const heavy = avg(0.02);
    expect(heavy.omega).toBeLessThan(light.omega);
    expect(heavy.iAvg).toBeGreaterThan(light.iAvg);
  });

  it("zero voltage: motor coasts to a stop", () => {
    const p = params();
    let s = run(p, 3);
    expect(Math.abs(s.omega)).toBeGreaterThan(1);
    const off = { ...p, V: 0 };
    for (let i = 0; i < 120 * 20; i++) s = motorModel.step(s, off, 1 / 120).state;
    expect(Math.abs(s.omega)).toBeLessThan(0.5);
  });
});
