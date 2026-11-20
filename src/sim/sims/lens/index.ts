import type { SimModule } from "../../framework/types";
import { lensModel, type LensParams, type LensState } from "./model";
import { lensView } from "./view";

const lens: SimModule<LensParams, LensState> = {
  id: "lens",
  titleKey: "lens.title",
  model: lensModel,
  view: lensView,
};

export default lens;
