import type { SimModule } from "../../framework/types";
import { mirrorModel, type MirrorParams, type MirrorState } from "./model";
import { mirrorView } from "./view";

const mirror: SimModule<MirrorParams, MirrorState> = {
  id: "mirror",
  titleKey: "mirror.title",
  model: mirrorModel,
  view: mirrorView,
};

export default mirror;
