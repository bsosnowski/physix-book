import { describe, expect, it } from "vitest";
import { fieldAt, magnetModel, type MagnetParams, type MagnetState } from "./model";
import { defaultParams } from "../../framework/types";

function state(over: Partial<MagnetState> = {}): MagnetState {
  const p = { ...defaultParams(magnetModel), ...over } as MagnetParams;
  return { ...magnetModel.init(p), ...over };
}

describe("bar magnet field", () => {
  it("on the axis beyond N, field points away from the magnet", () => {
    const s = state({ mode: 0 });
    const { bx, by } = fieldAt(6, 0, s);
    expect(bx).toBeGreaterThan(0);
    expect(Math.abs(by)).toBeLessThan(1e-9);
  });

  it("above the center, field points from N toward S (−x)", () => {
    const s = state({ mode: 0 });
    const { bx, by } = fieldAt(0, 2, s);
    expect(bx).toBeLessThan(0);
    expect(Math.abs(by)).toBeLessThan(1e-9);
  });

  it("flip reverses the field everywhere", () => {
    const a = fieldAt(2, 2, state({ flip: 0 }));
    const b = fieldAt(2, 2, state({ flip: 1 }));
    expect(b.bx).toBeCloseTo(-a.bx, 10);
    expect(b.by).toBeCloseTo(-a.by, 10);
  });

  it("field is symmetric above/below the axis", () => {
    const s = state();
    const up = fieldAt(1.5, 2.5, s);
    const dn = fieldAt(1.5, -2.5, s);
    expect(up.bx).toBeCloseTo(dn.bx, 10);
    expect(up.by).toBeCloseTo(-dn.by, 10);
  });
});

describe("wire field (Oersted)", () => {
  it("field is tangential: perpendicular to the radius", () => {
    const s = state({ mode: 1, mx: 0, my: 0 });
    for (const [x, y] of [[2, 0], [0, 3], [1.5, -2]]) {
      const { bx, by } = fieldAt(x, y, s);
      expect(bx * x + by * y).toBeCloseTo(0, 8); // B·r = 0
    }
  });

  it("B ∝ 1/r: doubling distance halves the field", () => {
    const s = state({ mode: 1 });
    const b1 = Math.hypot(...Object.values(fieldAt(1, 0, s)));
    const b2 = Math.hypot(...Object.values(fieldAt(2, 0, s)));
    expect(b1 / b2).toBeCloseTo(2, 6);
  });

  it("current out of screen → counterclockwise (right-hand rule)", () => {
    const s = state({ mode: 1, flip: 0 });
    const { by } = fieldAt(2, 0, s); // right of wire → field points up
    expect(by).toBeGreaterThan(0);
  });

  it("reversing current flips circulation", () => {
    const a = fieldAt(2, 0, state({ mode: 1, flip: 0 }));
    const b = fieldAt(2, 0, state({ mode: 1, flip: 1 }));
    expect(b.by).toBeCloseTo(-a.by, 10);
  });
});

describe("interaction", () => {
  it("dragging moves the magnet within bounds", () => {
    let s = state();
    s = magnetModel.pointer!(s, 0.5, 0.2, "down");
    expect(s.dragging).toBe(true);
    s = magnetModel.pointer!(s, 3, 2, "move");
    expect(s.mx).toBeCloseTo(3, 6);
    s = magnetModel.pointer!(s, 100, 0, "move");
    expect(s.mx).toBeLessThanOrEqual(6);
    s = magnetModel.pointer!(s, 3, 2, "up");
    expect(s.dragging).toBe(false);
  });
});
