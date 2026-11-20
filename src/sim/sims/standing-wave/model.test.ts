import { describe, expect, it } from "vitest";
import {
  STRING_LEN,
  displacement,
  standingWaveModel,
  traveling,
  type WaveParams,
} from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<WaveParams> = {}): WaveParams {
  return { ...defaultParams(standingWaveModel), ...over } as WaveParams;
}

describe("standingWaveModel", () => {
  it("standing wave equals the sum of the two traveling waves", () => {
    const p = params({ n: 3, A: 1.2, v: 7 });
    for (let x = 0; x <= STRING_LEN; x += 0.37) {
      for (const t of [0, 0.13, 0.71, 2.4]) {
        const [y1, y2] = traveling(x, t, p);
        expect(y1 + y2).toBeCloseTo(displacement(x, t, p), 10);
      }
    }
  });

  it("nodes stay at rest for all time: x = jL/n", () => {
    const p = params({ n: 4 });
    for (let j = 0; j <= 4; j++) {
      const x = (j * STRING_LEN) / 4;
      for (const t of [0, 0.05, 0.5, 1.7, 10]) {
        expect(Math.abs(displacement(x, t, p))).toBeLessThan(1e-12);
      }
    }
  });

  it("ends are fixed for any mode", () => {
    for (const n of [1, 2, 5, 6]) {
      const p = params({ n });
      expect(displacement(0, 0.3, p)).toBeCloseTo(0, 12);
      expect(displacement(STRING_LEN, 0.3, p)).toBeCloseTo(0, 12);
    }
  });

  it("antinode oscillates with full amplitude A", () => {
    const p = params({ n: 2, A: 1.1 });
    const x = STRING_LEN / 4; // first antinode
    const f = p.v / ((2 * STRING_LEN) / p.n);
    // at t=0 antinode is at +A; at t=T/2 at −A
    expect(displacement(x, 0, p)).toBeCloseTo(p.A, 10);
    expect(displacement(x, 1 / (2 * f), p)).toBeCloseTo(-p.A, 10);
  });

  it("readouts: λ=2L/n and f=nv/2L", () => {
    const p = params({ n: 3, v: 9 });
    const r = standingWaveModel.readout(standingWaveModel.init(p), p);
    expect(r.lambda).toBeCloseTo((2 * STRING_LEN) / 3, 10);
    expect(r.f).toBeCloseTo((3 * 9) / (2 * STRING_LEN), 10);
    expect(r.period * r.f).toBeCloseTo(1, 10);
  });

  it("higher tension (wave speed) raises frequency proportionally", () => {
    const slow = standingWaveModel.readout(standingWaveModel.init(params({ v: 5 })), params({ v: 5 }));
    const fast = standingWaveModel.readout(standingWaveModel.init(params({ v: 15 })), params({ v: 15 }));
    expect(fast.f / slow.f).toBeCloseTo(3, 10);
  });
});
