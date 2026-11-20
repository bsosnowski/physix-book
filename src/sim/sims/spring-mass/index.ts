import type { SimModule } from "../../framework/types";
import { springModel, type SpringParams, type SpringState } from "./model";
import { springView } from "./view";

const spring: SimModule<SpringParams, SpringState> = {
  id: "spring-mass",
  titleKey: "spring.title",
  model: springModel,
  view: springView,
};

export default spring;
