import type { SimModule } from "../../framework/types";
import { magnetModel, type MagnetParams, type MagnetState } from "./model";
import { magnetView } from "./view";

const magnet: SimModule<MagnetParams, MagnetState> = {
  id: "magnet-field",
  titleKey: "magnet.title",
  model: magnetModel,
  view: magnetView,
};

export default magnet;
