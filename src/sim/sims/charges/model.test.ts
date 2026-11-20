import { describe, expect, it } from "vitest";
import { chargesModel, fieldAt, potentialAt, type ChargesParams, type Charge } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<ChargesParams> = {}): ChargesParams {
  return { ...defaultParams(chargesModel), ...over } as ChargesParams;
}

const dipole: Charge[] = [
  { x: -3, y: 0, q: 2 },
  { x: 3, y: 0, q: -2 },
];

describe("electrostatic field", () => {
  it("single positive charge: field points radially outward, ∝ 1/r²", () => {
    const c: Charge[] = [{ x: 0, y: 0, q: 1 }];
    const e1 = fieldAt(1, 0, c);
    const e2 = fieldAt(2, 0, c);
    expect(e1.ex).toBeGreaterThan(0);
    expect(e1.ey).toBeCloseTo(0, 10);
    expect(Math.hypot(e1.ex, e1.ey) / Math.hypot(e2.ex, e2.ey)).toBeCloseTo(4, 6);
  });

  it("dipole midpoint: field points from + to −, twice each contribution", () => {
    const e = fieldAt(0, 0, dipole);
    expect(e.ex).toBeGreaterThan(0); // toward the negative charge
    expect(e.ey).toBeCloseTo(0, 10);
  });

  it("like charges: field cancels at the midpoint", () => {
    const like: Charge[] = [
      { x: -3, y: 0, q: 3 },
      { x: 3, y: 0, q: 3 },
    ];
    const e = fieldAt(0, 0, like);
    expect(Math.hypot(e.ex, e.ey)).toBeCloseTo(0, 10);
  });

  it("potential is a scalar sum; dipole bisector is at V=0", () => {
    expect(potentialAt(0, 2, dipole)).toBeCloseTo(0, 10);
    expect(potentialAt(-4, 0, dipole)).toBeGreaterThan(0);
  });

  it("superposition: field of two equals sum of individual fields", () => {
    const e = fieldAt(1.7, 2.3, dipole);
    const e1 = fieldAt(1.7, 2.3, [dipole[0]]);
    const e2 = fieldAt(1.7, 2.3, [dipole[1]]);
    expect(e.ex).toBeCloseTo(e1.ex + e2.ex, 10);
    expect(e.ey).toBeCloseTo(e1.ey + e2.ey, 10);
  });
});

describe("chargesModel interaction & test charge", () => {
  it("dragging picks the nearest charge and moves it", () => {
    let s = chargesModel.init(params());
    s = chargesModel.pointer!(s, -2.8, 0.2, "down");
    expect(s.dragIndex).toBe(0);
    s = chargesModel.pointer!(s, -1, 2, "move");
    expect(s.charges[0].x).toBeCloseTo(-1, 6);
    expect(s.charges[0].y).toBeCloseTo(2, 6);
    s = chargesModel.pointer!(s, -1, 2, "up");
    expect(s.dragIndex).toBe(-1);
  });

  it("test charge accelerates along the field (gains speed from rest)", () => {
    const p = params({ q1: 3, q2: 0, showTest: 1 });
    let s = chargesModel.init(p);
    for (let i = 0; i < 60; i++) s = chargesModel.step(s, p, 1 / 120).state;
    expect(Math.hypot(s.test.vx, s.test.vy)).toBeGreaterThan(0.1);
  });

  it("energy conservation: KE gain equals potential drop (no walls hit)", () => {
    const p = params({ q1: 3, q2: 0, showTest: 1 });
    let s = chargesModel.init(p);
    const v0 = potentialAt(s.test.x, s.test.y, s.charges);
    for (let i = 0; i < 30; i++) s = chargesModel.step(s, p, 1 / 120).state;
    const v1 = potentialAt(s.test.x, s.test.y, s.charges);
    const ke = 0.5 * (s.test.vx ** 2 + s.test.vy ** 2);
    expect(ke).toBeCloseTo(v0 - v1, 1);
  });

  it("showTest=0 keeps the test charge parked", () => {
    const p = params({ showTest: 0 });
    let s = chargesModel.init(p);
    for (let i = 0; i < 60; i++) s = chargesModel.step(s, p, 1 / 120).state;
    expect(s.test.active).toBe(false);
    expect(s.test.vx).toBe(0);
  });
});
