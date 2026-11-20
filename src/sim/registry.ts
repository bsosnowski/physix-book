import type { AnySimModule } from "./framework/types";

/**
 * Lazy registry: a chapter only downloads the simulations it embeds.
 * Adding a sim = one entry here + a module under sims/<id>/.
 */
const loaders: Record<string, () => Promise<{ default: AnySimModule }>> = {
  projectile: () => import("./sims/projectile"),
  pendulum: () => import("./sims/pendulum"),
  "spring-mass": () => import("./sims/spring-mass"),
  incline: () => import("./sims/incline"),
  collision: () => import("./sims/collision"),
};

const cache = new Map<string, Promise<AnySimModule>>();

export function loadSim(id: string): Promise<AnySimModule> {
  let p = cache.get(id);
  if (!p) {
    const loader = loaders[id];
    if (!loader) return Promise.reject(new Error(`Unknown simulation: ${id}`));
    p = loader().then((m) => m.default);
    cache.set(id, p);
  }
  return p;
}
