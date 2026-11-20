import type { SimModule } from "../../framework/types";
import { projectileModel, type ProjectileParams, type ProjectileState } from "./model";
import { projectileView } from "./view";

const projectile: SimModule<ProjectileParams, ProjectileState> = {
  id: "projectile",
  titleKey: "projectile.title",
  model: projectileModel,
  view: projectileView,
};

export default projectile;
