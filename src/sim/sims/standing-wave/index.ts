import type { SimModule } from "../../framework/types";
import { standingWaveModel, type WaveParams, type WaveState } from "./model";
import { standingWaveView } from "./view";

const standingWave: SimModule<WaveParams, WaveState> = {
  id: "standing-wave",
  titleKey: "wave.title",
  model: standingWaveModel,
  view: standingWaveView,
};

export default standingWave;
