import { describe, expect, it } from "vitest";
import { formatQuantity, formatQuantityFixed } from "./units";

describe("formatQuantityFixed", () => {
  it("pads to the declared precision (67 → 67.00)", () => {
    expect(formatQuantityFixed(67, "s", "en", 2)).toBe("67.00\u00a0s");
    expect(formatQuantityFixed(66.89, "s", "en", 2)).toBe("66.89\u00a0s");
  });

  it("uses the locale decimal separator (Polish comma)", () => {
    expect(formatQuantityFixed(67, "s", "pl", 2)).toBe("67,00\u00a0s");
    expect(formatQuantityFixed(9.81, "m/s²", "pl", 2)).toBe("9,81\u00a0m/s²");
  });

  it("zero decimals stays integer (angles, counts)", () => {
    expect(formatQuantityFixed(45, "°", "en", 0)).toBe("45\u00a0°");
  });

  it("width is stable across a tick for same-magnitude values", () => {
    const a = formatQuantityFixed(66.89, "s", "pl", 2);
    const b = formatQuantityFixed(67.0, "s", "pl", 2);
    expect(a.length).toBe(b.length);
  });

  it("plain formatQuantity still trims trailing zeros (static prose)", () => {
    expect(formatQuantity(67, "s", "en", 2)).toBe("67\u00a0s");
  });
});
