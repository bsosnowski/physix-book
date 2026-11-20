import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

/** Switches locale while keeping the current chapter/section. */
export function LangSwitcher() {
  const { locale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const path = location.pathname.replace(/^\/[^/]+/, `/${next}`);
    void navigate(path + location.search + location.hash);
  };

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="sr-only">{t("nav.language")}</span>
      <span aria-hidden className="text-zinc-400">🌐</span>
      <select
        value={locale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="cursor-pointer rounded-md border border-zinc-300 bg-transparent px-1.5 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        aria-label={t("nav.language")}
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
