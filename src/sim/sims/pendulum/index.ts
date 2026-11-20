import type { SimModule } from "../../framework/types";
import { pendulumModel, type PendulumParams, type PendulumState } from "./model";
import { pendulumView } from "./view";

const pendulum: SimModule<PendulumParams, PendulumState> = {
  id: "pendulum",
  titleKey: "pendulum.title",
  model: pendulumModel,
  view: pendulumView,
};

export default pendulum;
