import type { SimModel } from "../../framework/types";

export interface SpectrumParams extends Record<string, number> {
  /** log10 of frequency in Hz: 3 (kHz) … 22 (10²² Hz gamma). */
  logf: number;
}

export interface SpectrumState {
  t: number;
  logf: number;
  dragging: boolean;
}

const C = 3e8; // m/s
const H = 6.626e-34; // J·s
const EV = 1.602e-19; // J

export interface Band {
  id: string;
  minLog: number;
  maxLog: number;
}

export const BANDS: Band[] = [
  { id: "radio", minLog: 3, maxLog: 9 },
  { id: "micro", minLog: 9, maxLog: 11.5 },
  { id: "ir", minLog: 11.5, maxLog: 14.38 },
  { id: "visible", minLog: 14.38, maxLog: 14.68 },
  { id: "uv", minLog: 14.68, maxLog: 16.5 },
  { id: "xray", minLog: 16.5, maxLog: 19 },
  { id: "gamma", minLog: 19, maxLog: 22 },
];

export const LOG_MIN = 3;
export const LOG_MAX = 22;

export function bandAt(logf: number): Band {
  return BANDS.find((b) => logf >= b.minLog && logf < b.maxLog) ?? BANDS[BANDS.length - 1];
}

/** Wavelength (m) from log10 frequency. */
export const wavelength = (logf: number): number => C / 10 ** logf;
/** Photon energy in eV. */
export const photonEnergy = (logf: number): number => (H * 10 ** logf) / EV;

/** Visible color (approx.) for the visible band; null outside. */
export function visibleColor(logf: number): string | null {
  if (logf < 14.38 || logf > 14.68) return null;
  const f = (logf - 14.38) / (14.68 - 14.38); // 0 red → 1 violet
  return `hsl(${Math.round(280 * f)}, 90%, 55%)`;
}

export const spectrumModel: SimModel<SpectrumParams, SpectrumState> = {
  params: [
    { key: "logf", symbol: "\\log f", labelKey: "spectrum.param.logf", unit: "log Hz", min: LOG_MIN, max: LOG_MAX, step: 0.05, default: 14.48, apply: "live" },
  ],
  readouts: [
    { key: "freq", labelKey: "spectrum.readout.freq", unit: "Hz", digits: 0 },
    { key: "lambda", labelKey: "spectrum.readout.lambda", unit: "m", digits: 3 },
    { key: "energy", labelKey: "spectrum.readout.energy", unit: "eV", digits: 3 },
    { key: "ionizing", labelKey: "spectrum.readout.ionizing", unit: "", digits: 0 },
  ],
  presets: [
    { id: "fm", labelKey: "spectrum.preset.fm", params: { logf: 8 } },
    { id: "wifi", labelKey: "spectrum.preset.wifi", params: { logf: 9.38 } },
    { id: "green", labelKey: "spectrum.preset.green", params: { logf: 14.48 } },
    { id: "uvb", labelKey: "spectrum.preset.uvb", params: { logf: 15.1 } },
    { id: "xray", labelKey: "spectrum.preset.xray", params: { logf: 18 } },
  ],

  init(p: SpectrumParams): SpectrumState {
    return { t: 0, logf: p.logf, dragging: false };
  },

  step(s: SpectrumState, p: SpectrumParams, dt: number) {
    return {
      state: { t: s.t + dt, logf: s.dragging ? s.logf : p.logf, dragging: s.dragging },
      done: false,
    };
  },

  readout(s: SpectrumState): Record<string, number> {
    const e = photonEnergy(s.logf);
    return {
      freq: 10 ** s.logf,
      lambda: wavelength(s.logf),
      energy: e,
      ionizing: e > 10 ? 1 : 0, // rough UV-C+ threshold
    };
  },

  /** Drag the marker along the spectrum bar (bottom strip of the canvas). */
  pointer(s: SpectrumState, x: number, y: number, phase): SpectrumState {
    // world coords: x ∈ [0,1] across the bar, y<0 means bar region
    if (phase === "down" && y > -0.5) return s;
    if (phase === "up") return { ...s, dragging: false };
    const f = Math.min(1, Math.max(0, x));
    return { ...s, dragging: true, logf: LOG_MIN + f * (LOG_MAX - LOG_MIN) };
  },
};
