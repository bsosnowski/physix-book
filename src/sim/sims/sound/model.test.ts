import { describe, expect, it } from "vitest";
import { beatFrequency, soundModel, type SoundParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<SoundParams> = {}): SoundParams {
  return { ...defaultParams(soundModel), ...over } as SoundParams;
}

describe("soundModel", () => {
  it("wavelength in air: λ = 343/f (300 Hz → 1.14 m)", () => {
    const p = params({ f1: 300 });
    expect(soundModel.readout(soundModel.init(p), p).lambda1).toBeCloseTo(343 / 300, 6);
  });

  it("beat frequency is |f1 − f2|", () => {
    expect(beatFrequency(300, 340)).toBe(40);
    expect(beatFrequency(340, 300)).toBe(40);
    expect(beatFrequency(300, 0)).toBe(0);
  });

  it("Doppler: ahead f/(1−β), behind f/(1+β)", () => {
    const p = params({ f1: 400, doppler: 0.5 });
    const r = soundModel.readout(soundModel.init(p), p);
    expect(r.fAhead).toBeCloseTo(800, 6);
    expect(r.fBehind).toBeCloseTo(400 / 1.5, 6);
  });

  it("no Doppler shift when stationary", () => {
    const p = params({ doppler: 0 });
    expect(Number.isNaN(soundModel.readout(soundModel.init(p), p).fAhead)).toBe(true);
  });

  it("amplitude ↔ loudness: halving A drops ~6 dB", () => {
    const a = soundModel.readout(soundModel.init(params({ A: 0.8 })), params({ A: 0.8 })).spl;
    const b = soundModel.readout(soundModel.init(params({ A: 0.4 })), params({ A: 0.4 })).spl;
    expect(a - b).toBeCloseTo(6, 0);
  });

  it("moving source advances and wraps", () => {
    const p = params({ doppler: 0.5 });
    let s = soundModel.init(p);
    const x0 = s.srcX;
    for (let i = 0; i < 120; i++) s = soundModel.step(s, p, 1 / 120).state;
    expect(s.srcX).not.toBe(x0);
    for (let i = 0; i < 120 * 200; i++) s = soundModel.step(s, p, 1 / 120).state;
    expect(s.srcX).toBeGreaterThanOrEqual(-10);
    expect(s.srcX).toBeLessThanOrEqual(10);
  });
});
