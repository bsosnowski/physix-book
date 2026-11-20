import type { SimModel } from "../../framework/types";

export interface HeatingParams extends Record<string, number> {
  V: number; // voltage, V
  R: number; // heater resistance, Ω
  water: number; // water mass, kg
  loss: number; // heat loss coefficient, W/K
}

export interface HeatingState {
  t: number;
  temp: number; // °C
  energy: number; // J delivered
  power: number; // W
  boiling: boolean;
}

const C_WATER = 4186; // J/(kg·K)
const T_START = 20;
const T_BOIL = 100;

export const heatingModel: SimModel<HeatingParams, HeatingState> = {
  params: [
    { key: "V", symbol: "V", labelKey: "heating.param.V", unit: "V", min: 0, max: 240, step: 5, default: 120, apply: "live", digits: 0 },
    { key: "R", symbol: "R", labelKey: "heating.param.R", unit: "Ω", min: 5, max: 200, step: 5, default: 30, apply: "live", digits: 0 },
    { key: "water", symbol: "m_w", labelKey: "heating.param.water", unit: "kg", min: 0.2, max: 2, step: 0.1, default: 0.5, apply: "live" },
    { key: "loss", symbol: "\\kappa", labelKey: "heating.param.loss", unit: "W/K", min: 0, max: 5, step: 0.1, default: 0.5, apply: "live" },
  ],
  readouts: [
    { key: "t", labelKey: "heating.readout.t", unit: "s", digits: 0 },
    { key: "temp", labelKey: "heating.readout.temp", unit: "°C", digits: 1 },
    { key: "power", labelKey: "heating.readout.power", unit: "W", digits: 0 },
    { key: "energyKJ", labelKey: "heating.readout.energyKJ", unit: "kJ", digits: 1 },
    { key: "kwh", labelKey: "heating.readout.kwh", unit: "kWh", digits: 4 },
    { key: "cost", labelKey: "heating.readout.cost", unit: "", digits: 2 },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "heating.plot.temp",
      series: [{ key: "temp", labelKey: "heating.readout.temp", color: "#dc2626" }],
    },
  ],
  presets: [
    { id: "kettle", labelKey: "heating.preset.kettle", params: { V: 230, R: 26, water: 1, loss: 0.5 } },
    { id: "lowVoltage", labelKey: "heating.preset.lowVoltage", params: { V: 12, R: 30, water: 0.5, loss: 0.2 } },
    { id: "insulated", labelKey: "heating.preset.insulated", params: { V: 120, R: 30, water: 0.5, loss: 0 } },
    { id: "leaky", labelKey: "heating.preset.leaky", params: { V: 60, R: 60, water: 1, loss: 2 } },
  ],

  init(p: HeatingParams): HeatingState {
    return { t: 0, temp: T_START, energy: 0, power: (p.V * p.V) / p.R, boiling: false };
  },

  step(s: HeatingState, p: HeatingParams, dt: number) {
    const power = (p.V * p.V) / p.R;
    // Time compression: 1 sim-second = 1 real minute of heating keeps the
    // demo watchable; documented in the chapter. Physics uses SI throughout.
    const SIM_SCALE = 60;
    const dtReal = dt * SIM_SCALE;
    const net = power - p.loss * (s.temp - T_START);
    let temp = s.temp + (net * dtReal) / (p.water * C_WATER);
    let boiling = s.boiling;
    if (temp >= T_BOIL) {
      temp = T_BOIL;
      boiling = true;
    }
    if (temp < T_START) temp = T_START;
    return {
      state: {
        t: s.t + dt,
        temp,
        energy: s.energy + power * dtReal,
        power,
        boiling,
      },
      done: false,
    };
  },

  readout(s: HeatingState): Record<string, number> {
    const kwh = s.energy / 3.6e6;
    return {
      t: s.t,
      temp: s.temp,
      power: s.power,
      energyKJ: s.energy / 1000,
      kwh,
      cost: kwh * 0.8, // PLN/kWh ≈ 0.8; locale-neutral illustrative price
    };
  },
};

export { C_WATER, T_START, T_BOIL };
