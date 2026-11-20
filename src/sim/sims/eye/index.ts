import type { SimModule } from "../../framework/types";
import { eyeModel, type EyeParams, type EyeState } from "./model";
import { eyeView } from "./view";

const eye: SimModule<EyeParams, EyeState> = {
  id: "eye",
  titleKey: "eye.title",
  model: eyeModel,
  view: eyeView,
};

export default eye;
