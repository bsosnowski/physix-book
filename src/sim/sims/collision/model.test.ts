import { describe, expect, it } from "vitest";
import { collisionModel, type CollisionParams, type CollisionState } from "./model";
import { defaultParams } from "../../framework/types";

const DT = 1 / 120;

function params(over: Partial<CollisionParams> = {}): CollisionParams {
  return { ...defaultParams(collisionModel), ...over } as CollisionParams;
}

/** Run until the first ball-ball collision happens, then a few more steps. */
function runPastCollision(p: CollisionParams): CollisionState {
  let s = collisionModel.init(p);
  for (let i = 0; i < 120 * 30; i++) {
    s = collisionModel.step(s, p, DT).state;
    if (s.collisions > 0) {
      for (let j = 0; j < 5; j++) s = collisionModel.step(s, p, DT).state;
      return s;
    }
  }
  throw new Error("no collision");
}

describe("collisionModel", () => {
  it("equal masses, elastic: velocities exchange", () => {
    const s = runPastCollision(params({ m1: 2, m2: 2, v1: 3, v2: -1, e: 1 }));
    expect(s.b1.v).toBeCloseTo(-1, 6);
    expect(s.b2.v).toBeCloseTo(3, 6);
  });

  it("perfectly inelastic: bodies move together at CM velocity", () => {
    const p = params({ m1: 2, m2: 4, v1: 4, v2: -2, e: 0 });
    const s = runPastCollision(p);
    const vcm = (p.m1 * p.v1 + p.m2 * p.v2) / (p.m1 + p.m2);
    expect(s.b1.v).toBeCloseTo(vcm, 6);
    expect(s.b2.v).toBeCloseTo(vcm, 6);
  });

  it("momentum conserved through collision for any e", () => {
    for (const e of [0, 0.3, 0.7, 1]) {
      const p = params({ m1: 1.5, m2: 4, v1: 5, v2: -2, e });
      const s = runPastCollision(p);
      expect(s.momentum).toBeCloseTo(p.m1 * p.v1 + p.m2 * p.v2, 6);
    }
  });

  it("elastic collision conserves kinetic energy", () => {
    const p = params({ m1: 1, m2: 3, v1: 6, v2: -1, e: 1 });
    const s = runPastCollision(p);
    const ke0 = 0.5 * p.m1 * p.v1 ** 2 + 0.5 * p.m2 * p.v2 ** 2;
    expect(s.kinetic).toBeCloseTo(ke0, 6);
  });

  it("inelastic collision loses the maximal KE (CM frame)", () => {
    const p = params({ m1: 2, m2: 2, v1: 3, v2: -1, e: 0 });
    const s = runPastCollision(p);
    const M = p.m1 + p.m2;
    const vcm = (p.m1 * p.v1 + p.m2 * p.v2) / M;
    expect(s.kinetic).toBeCloseTo(0.5 * M * vcm * vcm, 6);
  });

  it("heavy hits light at rest: light leaves at ~2v (elastic)", () => {
    const s = runPastCollision(params({ m1: 100, m2: 1, v1: 2, v2: 0, e: 1 }));
    expect(s.b2.v).toBeCloseTo(4, 1);
  });

  it("light hits heavy at rest: light bounces back (elastic)", () => {
    const s = runPastCollision(params({ m1: 1, m2: 100, v1: 4, v2: 0, e: 1 }));
    // exact: v1' = (m1−m2)/(m1+m2)·v1 = −4·99/101
    expect(s.b1.v).toBeCloseTo((-4 * 99) / 101, 6);
  });

  it("restitution definition: separation speed = e × approach speed", () => {
    const p = params({ m1: 2.5, m2: 1.2, v1: 5, v2: -3, e: 0.6 });
    const s = runPastCollision(p);
    expect(s.b2.v - s.b1.v).toBeCloseTo(0.6 * (p.v1 - p.v2), 6);
  });
});
