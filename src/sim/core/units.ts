/** Formatting for readouts: value + unit, locale-aware decimal separator. */
export function formatQuantity(
  value: number,
  unit: string,
  locale: string,
  digits = 2,
): string {
  const n = new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  return unit ? `${n}\u00a0${unit}` : n;
}

/**
 * Fixed-precision formatting for live-updating values: always exactly
 * `digits` decimals (67 → "67,00"), so the text width never changes as
 * numbers tick. Prevents layout jitter in readouts and slider values.
 */
export function formatQuantityFixed(
  value: number,
  unit: string,
  locale: string,
  digits = 2,
): string {
  const n = new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
  return unit ? `${n}\u00a0${unit}` : n;
}
