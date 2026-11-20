import type { SimModule } from "../../framework/types";
import { spectrumModel, type SpectrumParams, type SpectrumState } from "./model";
import { spectrumView } from "./view";

const spectrum: SimModule<SpectrumParams, SpectrumState> = {
  id: "spectrum",
  titleKey: "spectrum.title",
  model: spectrumModel,
  view: spectrumView,
};

export default spectrum;
