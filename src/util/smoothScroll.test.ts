import { describe, expect, it } from "vitest";
import { durationFor, easeOutCubic, SCROLL_ANIM_MS } from "./smoothScroll";

describe("easeOutCubic", () => {
  it("maps endpoints exactly", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("is monotonic and front-loaded (fast start)", () => {
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // most distance early
  });
});

describe("durationFor", () => {
  it("short hops are quicker, long jumps capped", () => {
    expect(durationFor(100)).toBe(160);
    expect(durationFor(1500)).toBe(SCROLL_ANIM_MS);
    expect(durationFor(9000)).toBe(350);
    expect(durationFor(-1500)).toBe(SCROLL_ANIM_MS); // symmetric
  });
});
