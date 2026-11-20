import { useEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { Sidebar } from "./Sidebar";
import { LangSwitcher } from "./LangSwitcher";

export function AppShell() {
  const { locale } = useParams();
  const { t } = useTranslation();
  const { dark, toggleDark, sidebarOpen, setSidebarOpen } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-sky-600 focus:px-3 focus:py-1.5 focus:text-white"
      >
        {t("nav.skipToContent")}
      </a>
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          className="rounded-md p-1.5 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-900"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={t(sidebarOpen ? "nav.closeMenu" : "nav.openMenu")}
        >
          <span aria-hidden>☰</span>
        </button>
        <Link
          to={`/${locale}/`}
          className="flex items-baseline gap-2 font-sans font-bold tracking-tight"
        >
          <span aria-hidden>⚛️</span>
          <span>{t("app.title")}</span>
          <span className="hidden text-xs font-normal text-zinc-400 sm:inline">
            {t("app.tagline")}
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitcher />
          <button
            className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            onClick={toggleDark}
            aria-label={t("theme.toggle")}
          >
            <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </header>

      <Sidebar />

      <main id="main-content" className="pt-14 lg:pl-72">
        <Outlet />
      </main>
    </div>
  );
}
