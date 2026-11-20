import { describe, expect, it } from "vitest";
import sound from "./index";
import { soundModel, LISTENER_X, type SoundParams } from "./model";
import { defaultParams } from "../../framework/types";

function state(over: Partial<SoundParams> = {}) {
  const p = { ...defaultParams(soundModel), ...over } as SoundParams;
  return soundModel.init(p);
}

describe("sound sim audio layer", () => {
  it("declares an audio layer", () => {
    expect(sound.audio).toBeDefined();
  });

  it("pure tone: one voice at f1", () => {
    const v = sound.audio!.voices(state({ f1: 300, f2: 0 }));
    expect(v).toHaveLength(1);
    expect(v[0].freq).toBe(300);
  });

  it("beats: two voices at the real slider frequencies", () => {
    const v = sound.audio!.voices(state({ f1: 300, f2: 340 }));
    expect(v.map((x) => x.freq)).toEqual([300, 340]);
    // audible beat = difference
    expect(Math.abs(v[0].freq - v[1].freq)).toBe(40);
  });

  it("Doppler: listener hears f/(1−β) while approached, f/(1+β) after pass", () => {
    const s = state({ f1: 400, doppler: 0.5 });
    const before = sound.audio!.voices({ ...s, srcX: LISTENER_X - 2 });
    const after = sound.audio!.voices({ ...s, srcX: LISTENER_X + 2 });
    expect(before[0].freq).toBeCloseTo(800, 6);
    expect(after[0].freq).toBeCloseTo(400 / 1.5, 6);
  });

  it("gain follows amplitude and stays within 0..1", () => {
    for (const A of [0.1, 0.7, 1]) {
      const v = sound.audio!.voices(state({ A, f2: 340 }));
      for (const voice of v) {
        expect(voice.gain!).toBeGreaterThan(0);
        expect(voice.gain!).toBeLessThanOrEqual(1);
      }
    }
  });
});
