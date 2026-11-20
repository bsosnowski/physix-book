import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isLocale, detectLocale } from "@/i18n/config";

/** Validates the :locale param, syncs i18next + <html lang>, persists choice. */
export function LocaleLayout() {
  const { locale } = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isLocale(locale)) return;
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    localStorage.setItem("physix.locale", locale);
    document.documentElement.lang = locale;
  }, [locale, i18n]);

  if (!isLocale(locale)) {
    return <Navigate to={`/${detectLocale()}/`} replace />;
  }
  return <Outlet />;
}
