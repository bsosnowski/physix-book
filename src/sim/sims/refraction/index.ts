import type { SimModule } from "../../framework/types";
import { refractionModel, type RefractionParams, type RefractionState } from "./model";
import { refractionView } from "./view";

const refraction: SimModule<RefractionParams, RefractionState> = {
  id: "refraction",
  titleKey: "refraction.title",
  model: refractionModel,
  view: refractionView,
};

export default refraction;
