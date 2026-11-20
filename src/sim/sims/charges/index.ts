import type { SimModule } from "../../framework/types";
import { chargesModel, type ChargesParams, type ChargesState } from "./model";
import { chargesView } from "./view";

const charges: SimModule<ChargesParams, ChargesState> = {
  id: "charges",
  titleKey: "charges.title",
  model: chargesModel,
  view: chargesView,
};

export default charges;
