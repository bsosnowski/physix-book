/**
 * Shared thin-element optics (paraxial): lenses, mirrors and the eye.
 * Sign conventions:
 *  - object distance u > 0 (object left of the element / in front of mirror)
 *  - lens: f > 0 converging, f < 0 diverging; image v > 0 → right (real)
 *  - mirror: f > 0 concave, f < 0 convex; image v > 0 → in front (real)
 */

export interface ImageResult {
  /** Image distance in the element's convention (see above). */
  v: number;
  /** Transverse magnification (negative = inverted). */
  m: number;
  /** True when rays actually converge there (catchable on a screen). */
  real: boolean;
  /** Object at the focal point: image at infinity. */
  atInfinity: boolean;
}

export function thinElement(u: number, f: number, kind: "lens" | "mirror"): ImageResult {
  const denom = 1 / f - 1 / u;
  if (Math.abs(denom) < 1e-9) {
    return { v: Infinity, m: Infinity, real: false, atInfinity: true };
  }
  const v = 1 / denom;
  const m = kind === "lens" ? -v / u : -v / u;
  // lens: real when v>0 (opposite side); mirror: real when v>0 (same side)
  return { v, m, real: v > 0, atInfinity: false };
}

/** Lens power in diopters from focal length in metres. */
export const diopters = (fMeters: number): number => 1 / fMeters;

/**
 * Two thin lenses in contact (eye + glasses): powers add.
 * Returns the combined focal length.
 */
export function combinedF(f1: number, f2: number): number {
  const p = 1 / f1 + 1 / f2;
  return Math.abs(p) < 1e-9 ? Infinity : 1 / p;
}
