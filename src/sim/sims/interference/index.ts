import type { SimModule } from "../../framework/types";
import {
  interferenceModel,
  type InterferenceParams,
  type InterferenceState,
} from "./model";
import { interferenceView } from "./view";

const interference: SimModule<InterferenceParams, InterferenceState> = {
  id: "interference",
  titleKey: "interference.title",
  model: interferenceModel,
  view: interferenceView,
};

export default interference;
