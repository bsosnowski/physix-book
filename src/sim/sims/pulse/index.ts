import type { SimModule } from "../../framework/types";
import { pulseModel, type PulseParams, type PulseState } from "./model";
import { pulseView } from "./view";

const pulse: SimModule<PulseParams, PulseState> = {
  id: "pulse",
  titleKey: "pulse.title",
  model: pulseModel,
  view: pulseView,
};

export default pulse;
