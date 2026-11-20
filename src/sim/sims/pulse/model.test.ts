import { describe, expect, it } from "vitest";
import { DX, N, pulseModel, type PulseParams, type PulseState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<PulseParams> = {}): PulseParams {
  return { ...defaultParams(pulseModel), ...over } as PulseParams;
}

function run(p: PulseParams, seconds: number): PulseState {
  let s = pulseModel.init(p);
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    s = pulseModel.step(s, p, DT).state;
  }
  return s;
}

function peak(s: PulseState): { x: number; y: number } {
  let bi = 0;
  let ba = 0;
  for (let i = 0; i < N; i++) {
    if (Math.abs(s.y[i]) > ba) {
      ba = Math.abs(s.y[i]);
      bi = i;
    }
  }
  return { x: bi * DX, y: s.y[bi] };
}

describe("pulseModel — traveling pulse", () => {
  it("pulse travels at the wave speed (d'Alembert)", () => {
    const p = params({ speed: 5 });
    const s = run(p, 0.8); // before reflection (start x=2, end at 10)
    expect(peak(s).x).toBeCloseTo(2 + 5 * 0.8, 0);
  });

  it("shape is preserved in transit (non-dispersive)", () => {
    const p = params();
    const s0 = pulseModel.init(p);
    const s = run(p, 0.6);
    expect(peak(s).y).toBeCloseTo(peak(s0).y, 1);
  });

  it("fixed end reflects INVERTED", () => {
    const p = params({ end: 0, speed: 5 });
    // reach end at t≈1.6s; check after reflection at t≈2.2s
    const s = run(p, 2.3);
    expect(peak(s).y).toBeLessThan(-0.4);
    expect(peak(s).x).toBeLessThan(8); // moving back left
  });

  it("free end reflects UPRIGHT", () => {
    const p = params({ end: 1, speed: 5 });
    const s = run(p, 2.3);
    expect(peak(s).y).toBeGreaterThan(0.4);
    expect(peak(s).x).toBeLessThan(8);
  });

  it("fixed end stays at zero displacement always", () => {
    const p = params({ end: 0 });
    let s = pulseModel.init(p);
    for (let i = 0; i < 300; i++) {
      s = pulseModel.step(s, p, DT).state;
      expect(s.y[N - 1]).toBe(0);
    }
  });

  it("CFL stability: fast narrow pulse stays bounded", () => {
    const p = params({ speed: 10, width: 0.3 });
    const s = run(p, 3);
    for (let i = 0; i < N; i++) expect(Math.abs(s.y[i])).toBeLessThan(2);
  });

  it("simulation stops after ~2.5 traversals", () => {
    const p = params({ speed: 5 });
    let s = pulseModel.init(p);
    let done = false;
    for (let i = 0; i < 120 * 10 && !done; i++) {
      const r = pulseModel.step(s, p, DT);
      s = r.state;
      done = r.done;
    }
    expect(done).toBe(true);
    expect(s.t).toBeGreaterThan(4.5);
    expect(s.t).toBeLessThan(5.5);
  });
});
