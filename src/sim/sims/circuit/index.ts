import type { SimModule } from "../../framework/types";
import { circuitModel, type CircuitParams, type CircuitState } from "./model";
import { circuitView } from "./view";

const circuit: SimModule<CircuitParams, CircuitState> = {
  id: "circuit",
  titleKey: "circuit.title",
  model: circuitModel,
  view: circuitView,
};

export default circuit;
