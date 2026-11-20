import { describe, expect, it } from "vitest";
import { decodeSimParams, decodeSpeed, encodeSimParams } from "./urlState";

describe("urlState", () => {
  it("round-trips multiple widgets with numeric params", () => {
    const state = {
      projectile: { v0: 25, angle: 60, g: 1.62, drag: 0.01 },
      pendulum: { theta0: 120, damping: 0.25 },
    };
    const decoded = decodeSimParams("?sim=" + encodeSimParams(state));
    expect(decoded).toEqual(state);
  });

  it("round-trips negative and fractional values", () => {
    const state = { "spring-mass": { x0: -0.8, c: 8.94 } };
    expect(decodeSimParams("?sim=" + encodeSimParams(state))).toEqual(state);
  });

  it("returns {} for missing or malformed input", () => {
    expect(decodeSimParams("")).toEqual({});
    expect(decodeSimParams("?other=1")).toEqual({});
    expect(decodeSimParams("?sim=garbage")).toEqual({});
    expect(decodeSimParams("?sim=id:")).toEqual({});
    expect(decodeSimParams("?sim=id:k.NaN")).toEqual({});
  });

  it("ignores unknown query params around sim", () => {
    expect(decodeSimParams("?a=1&sim=orbit:vt.6.2&b=2")).toEqual({
      orbit: { vt: 6.2 },
    });
  });

  it("speed only accepts the supported values", () => {
    expect(decodeSpeed("?spd=2")).toBe(2);
    expect(decodeSpeed("?spd=0.25")).toBe(0.25);
    expect(decodeSpeed("?spd=3")).toBeNull();
    expect(decodeSpeed("?spd=abc")).toBeNull();
    expect(decodeSpeed("")).toBeNull();
  });
});
