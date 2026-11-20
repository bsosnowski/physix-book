import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, detectLocale } from "./config";

import enUi from "../../locales/en/ui.json";
import enSims from "../../locales/en/sims.json";
import plUi from "../../locales/pl/ui.json";
import plSims from "../../locales/pl/sims.json";

void i18n.use(initReactI18next).init({
  resources: {
    en: { ui: enUi, sims: enSims },
    pl: { ui: plUi, sims: plSims },
  },
  lng: detectLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  ns: ["ui", "sims"],
  defaultNS: "ui",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Locale-aware number formatting (PL decimal comma, etc.). */
export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export default i18n;
