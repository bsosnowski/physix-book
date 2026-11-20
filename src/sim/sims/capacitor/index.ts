import type { SimModule } from "../../framework/types";
import { capacitorModel, type CapacitorParams, type CapacitorState } from "./model";
import { capacitorView } from "./view";

const capacitor: SimModule<CapacitorParams, CapacitorState> = {
  id: "capacitor",
  titleKey: "capacitor.title",
  model: capacitorModel,
  view: capacitorView,
};

export default capacitor;
