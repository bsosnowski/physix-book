/**
 * Contracts between the three pieces of every simulation:
 *   model (pure physics) ↔ view (canvas pixels) ↔ controls (React).
 * Models and views must contain NO user-facing strings — only i18n keys.
 */

export interface ParamSpec {
  key: string;
  /** LaTeX symbol shown on the slider, matching the prose equations. */
  symbol: string;
  /** i18n key in the `sims` namespace, e.g. "projectile.param.v0". */
  labelKey: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /**
   * "live": applied immediately, mid-flight (e.g. gravity).
   * "reset": structural — takes effect on Reset (widget auto-resets).
   */
  apply: "live" | "reset";
  /** Significant digits for the slider readout. */
  digits?: number;
}

export interface ReadoutSpec {
  key: string;
  labelKey: string;
  unit: string;
  digits?: number;
}

export interface Preset {
  id: string;
  labelKey: string;
  params: Record<string, number>;
}

export interface SimModel<P = Record<string, number>, S = unknown> {
  readonly params: readonly ParamSpec[];
  readonly readouts: readonly ReadoutSpec[];
  readonly presets?: readonly Preset[];
  /** Create initial state from parameters. */
  init(params: P): S;
  /**
   * Advance state by fixed dt. Returns the next state and whether the
   * simulation has naturally finished (widget auto-pauses).
   */
  step(state: S, params: P, dt: number): { state: S; done: boolean };
  /** Numeric readouts for the control panel (throttled by the widget). */
  readout(state: S, params: P): Record<string, number>;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  /** CSS-pixel dimensions (context transform already handles HiDPI). */
  width: number;
  height: number;
  dark: boolean;
  /** Translate an i18n key in the `sims` namespace (canvas annotations). */
  t: (key: string) => string;
  /** Locale for number formatting. */
  locale: string;
}

export interface SimView<S = unknown> {
  draw(dc: DrawContext, state: S): void;
}

export interface SimModule<P = Record<string, number>, S = unknown> {
  id: string;
  titleKey: string;
  model: SimModel<P, S>;
  view: SimView<S>;
}

export type AnySimModule = SimModule<any, any>;

export function defaultParams(model: SimModel): Record<string, number> {
  return Object.fromEntries(model.params.map((p) => [p.key, p.default]));
}
