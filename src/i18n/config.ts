export const SUPPORTED_LOCALES = ["en", "pl"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
/** Fallback chain per locale, ending in the source-of-truth locale. */
export const FALLBACK_CHAIN: Record<Locale, Locale[]> = {
  en: ["en"],
  pl: ["pl", "en"],
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectLocale(): Locale {
  const stored = localStorage.getItem("physix.locale");
  if (isLocale(stored ?? undefined)) return stored as Locale;
  for (const lang of navigator.languages ?? [navigator.language]) {
    const short = lang.slice(0, 2).toLowerCase();
    if (isLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}
