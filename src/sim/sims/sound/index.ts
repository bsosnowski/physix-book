import type { SimModule } from "../../framework/types";
import { soundModel, type SoundParams, type SoundState } from "./model";
import { soundView } from "./view";

const sound: SimModule<SoundParams, SoundState> = {
  id: "sound",
  titleKey: "sound.title",
  model: soundModel,
  view: soundView,
};

export default sound;
