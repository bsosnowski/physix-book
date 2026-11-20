import type { SimModule } from "../../framework/types";
import { motorModel, type MotorParams, type MotorState } from "./model";
import { motorView } from "./view";

const motor: SimModule<MotorParams, MotorState> = {
  id: "motor",
  titleKey: "motor.title",
  model: motorModel,
  view: motorView,
};

export default motor;
