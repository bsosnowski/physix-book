import type { SimModule } from "../../framework/types";
import { inclineModel, type InclineParams, type InclineState } from "./model";
import { inclineView } from "./view";

const incline: SimModule<InclineParams, InclineState> = {
  id: "incline",
  titleKey: "incline.title",
  model: inclineModel,
  view: inclineView,
};

export default incline;
