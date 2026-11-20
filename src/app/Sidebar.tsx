import { NavLink, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import manifest from "virtual:chapters";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { useAppStore } from "./store";
import clsx from "@/util/clsx";

/** Localized TOC with per-chapter fallback to the source locale. */
export function Sidebar() {
  const { locale = DEFAULT_LOCALE, slug } = useParams();
  const { t } = useTranslation();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  const chain = FALLBACK_CHAIN[locale as Locale] ?? [DEFAULT_LOCALE];
  const sourceChapters = manifest[DEFAULT_LOCALE] ?? [];
  const chapters = sourceChapters.map((ch) => {
    for (const loc of chain) {
      const localized = manifest[loc]?.find((c) => c.slug === ch.slug);
      if (localized) return { ...localized, untranslated: loc !== locale };
    }
    return { ...ch, untranslated: true };
  });

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          "fixed top-14 bottom-0 left-0 z-40 w-72 overflow-y-auto border-r border-zinc-200 bg-white p-4 transition-transform dark:border-zinc-800 dark:bg-zinc-950",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label={t("nav.chapters")}
      >
        <h2 className="mb-3 px-2 font-sans text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          {t("nav.chapters")}
        </h2>
        <nav>
          <ol className="space-y-0.5">
            {chapters.map((ch) => (
              <li key={ch.slug}>
                <NavLink
                  to={`/${locale}/chapter/${ch.slug}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "block rounded-md px-2 py-1.5 text-sm",
                      isActive || slug === ch.slug
                        ? "bg-sky-50 font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                    )
                  }
                >
                  <span className="mr-1.5 text-zinc-400">{ch.order}.</span>
                  {ch.title}
                  {ch.untranslated && (
                    <span
                      className="ml-1.5 text-xs text-amber-500"
                      title="EN"
                      aria-label="English version"
                    >
                      ⚠
                    </span>
                  )}
                </NavLink>
                {(slug === ch.slug) && ch.sections.length > 0 && (
                  <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                    {ch.sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block rounded px-1.5 py-1 text-xs text-zinc-500 hover:text-sky-700 dark:hover:text-sky-400"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
