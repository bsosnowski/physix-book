import type { SimModel } from "../../framework/types";

export interface SoundParams extends Record<string, number> {
  f1: number; // source 1 frequency (display Hz; animation slowed ×0.01)
  f2: number; // source 2 frequency (0 = off)
  A: number; // amplitude 0..1
  doppler: number; // source speed as fraction of wave speed, 0..0.8
}

export interface SoundState {
  t: number;
  f1: number;
  f2: number;
  A: number;
  doppler: number;
  /** Source x position (Doppler mode), wraps across the arena. */
  srcX: number;
}

export const ARENA = { halfW: 10, halfH: 4 };
export const WAVE_SPEED = 6; // world m/s (visual)
const TIME_SCALE = 0.06; // slow the oscillation so the eye can follow

/** Longitudinal displacement field at (x, y) from source 1 (+ optional 2). */
export function displacementAt(x: number, y: number, s: SoundState): number {
  // visual wavenumber from display frequency: λ = v / (f·TIME_SCALE)
  let d = 0;
  const src = [
    { x: s.doppler > 0 ? s.srcX : -ARENA.halfW + 0.6, f: s.f1 },
  ];
  if (s.f2 > 0 && s.doppler === 0) src.push({ x: -ARENA.halfW + 0.6, f: s.f2 });
  for (const o of src) {
    const r = Math.max(0.3, Math.hypot(x - o.x, y));
    const lambda = WAVE_SPEED / (o.f * TIME_SCALE);
    const k = (2 * Math.PI) / lambda;
    const w = 2 * Math.PI * o.f * TIME_SCALE;
    d += (s.A / Math.sqrt(r)) * Math.sin(k * r - w * s.t);
  }
  return d;
}

/** Beat envelope frequency (display Hz). */
export const beatFrequency = (f1: number, f2: number): number =>
  f2 > 0 ? Math.abs(f1 - f2) : 0;

export const soundModel: SimModel<SoundParams, SoundState> = {
  params: [
    { key: "f1", symbol: "f_1", labelKey: "sound.param.f1", unit: "Hz", min: 100, max: 800, step: 10, default: 300, apply: "live", digits: 0 },
    { key: "f2", symbol: "f_2", labelKey: "sound.param.f2", unit: "Hz", min: 0, max: 800, step: 10, default: 0, apply: "live", digits: 0 },
    { key: "A", symbol: "A", labelKey: "sound.param.A", unit: "", min: 0.1, max: 1, step: 0.05, default: 0.7, apply: "live" },
    { key: "doppler", symbol: "\\beta", labelKey: "sound.param.doppler", unit: "v/c", min: 0, max: 0.8, step: 0.05, default: 0, apply: "live" },
  ],
  readouts: [
    { key: "lambda1", labelKey: "sound.readout.lambda1", unit: "m", digits: 2 },
    { key: "beat", labelKey: "sound.readout.beat", unit: "Hz", digits: 0 },
    { key: "fAhead", labelKey: "sound.readout.fAhead", unit: "Hz", digits: 0 },
    { key: "fBehind", labelKey: "sound.readout.fBehind", unit: "Hz", digits: 0 },
    { key: "spl", labelKey: "sound.readout.spl", unit: "dB", digits: 0 },
  ],
  plots: [
    {
      kind: "time",
      titleKey: "sound.plot.probe",
      series: [{ key: "probe", labelKey: "sound.plot.probe" }],
    },
  ],
  presets: [
    { id: "pure", labelKey: "sound.preset.pure", params: { f1: 300, f2: 0, A: 0.7, doppler: 0 } },
    { id: "beats", labelKey: "sound.preset.beats", params: { f1: 300, f2: 340, A: 0.6, doppler: 0 } },
    { id: "octave", labelKey: "sound.preset.octave", params: { f1: 200, f2: 400, A: 0.6, doppler: 0 } },
    { id: "siren", labelKey: "sound.preset.siren", params: { f1: 400, f2: 0, A: 0.7, doppler: 0.5 } },
  ],

  init(p: SoundParams): SoundState {
    return { t: 0, f1: p.f1, f2: p.f2, A: p.A, doppler: p.doppler, srcX: -ARENA.halfW + 1 };
  },

  step(s: SoundState, p: SoundParams, dt: number) {
    let srcX = s.srcX;
    if (p.doppler > 0) {
      srcX += p.doppler * WAVE_SPEED * dt * TIME_SCALE * 8;
      if (srcX > ARENA.halfW - 1) srcX = -ARENA.halfW + 1;
    }
    return {
      state: { t: s.t + dt, f1: p.f1, f2: p.f2, A: p.A, doppler: p.doppler, srcX },
      done: false,
    };
  },

  readout(s: SoundState): Record<string, number> {
    const lambda1 = 343 / s.f1; // real air: v=343 m/s
    const beta = s.doppler;
    return {
      lambda1,
      beat: beatFrequency(s.f1, s.f2),
      fAhead: beta > 0 ? s.f1 / (1 - beta) : NaN,
      fBehind: beta > 0 ? s.f1 / (1 + beta) : NaN,
      spl: Math.round(60 + 20 * Math.log10(s.A / 0.7)),
      probe: displacementAt(2, 0, s),
    };
  },
};
