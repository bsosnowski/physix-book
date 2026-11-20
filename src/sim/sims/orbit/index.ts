import type { SimModule } from "../../framework/types";
import { orbitModel, type OrbitParams, type OrbitState } from "./model";
import { orbitView } from "./view";

const orbit: SimModule<OrbitParams, OrbitState> = {
  id: "orbit",
  titleKey: "orbit.title",
  model: orbitModel,
  view: orbitView,
};

export default orbit;
