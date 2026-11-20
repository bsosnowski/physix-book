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
