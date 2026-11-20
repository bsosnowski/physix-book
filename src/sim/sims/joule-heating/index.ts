import type { SimModule } from "../../framework/types";
import { heatingModel, type HeatingParams, type HeatingState } from "./model";
import { heatingView } from "./view";

const heating: SimModule<HeatingParams, HeatingState> = {
  id: "joule-heating",
  titleKey: "heating.title",
  model: heatingModel,
  view: heatingView,
};

export default heating;
