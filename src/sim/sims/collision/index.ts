import type { SimModule } from "../../framework/types";
import { collisionModel, type CollisionParams, type CollisionState } from "./model";
import { collisionView } from "./view";

const collision: SimModule<CollisionParams, CollisionState> = {
  id: "collision",
  titleKey: "collision.title",
  model: collisionModel,
  view: collisionView,
};

export default collision;
