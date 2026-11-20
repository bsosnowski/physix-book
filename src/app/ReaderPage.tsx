import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MDXProvider } from "@mdx-js/react";
import { loadChapter } from "virtual:chapter-loader";
import manifest from "virtual:chapters";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { mdxComponents } from "@/components/mdx";

type Status = "loading" | "ready" | "notfound";

export function ReaderPage() {
  const { locale = DEFAULT_LOCALE, slug = "" } = useParams();
  const { hash } = useLocation();
  const { t } = useTranslation();
  const [Chapter, setChapter] = useState<ComponentType | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [fellBack, setFellBack] = useState(false);
  const [resolvedLocale, setResolvedLocale] = useState<string>(locale);

  /**
   * Scroll to the section in the URL hash. Headings render asynchronously
   * (lazy MDX chunk), so retry briefly until the element exists. The fixed
   * header is compensated by the headings' scroll-mt classes.
   */
  const scrollToHash = useCallback((rawHash: string) => {
    if (!rawHash) return false;
    let id = rawHash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep raw */
    }
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ block: "start" });
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setChapter(null);

    const chain = FALLBACK_CHAIN[locale as Locale] ?? [DEFAULT_LOCALE];
    void (async () => {
      try {
        for (const loc of chain) {
          const mod = await loadChapter(loc, slug);
          if (cancelled) return;
          if (mod) {
            setChapter(() => mod);
            setFellBack(loc !== locale);
            setResolvedLocale(loc);
            setStatus("ready");
            // Deep link: honour #section if present, else start at the top.
            if (!scrollToHash(window.location.hash)) window.scrollTo(0, 0);
            return;
          }
        }
        if (!cancelled) setStatus("notfound");
      } catch (err) {
        // A failed chunk fetch must not leave the reader stuck on "loading".
        console.error("Failed to load chapter", slug, err);
        if (!cancelled) setStatus("notfound");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, slug, scrollToHash]);

  // Same-chapter anchor navigation (sidebar subsection links): the chapter
  // effect above does not re-run, so handle hash changes here. Retry a few
  // frames in case the heading is still mounting.
  useEffect(() => {
    if (status !== "ready" || !hash) return;
    if (scrollToHash(hash)) return;
    let tries = 0;
    let raf = 0;
    const retry = () => {
      if (scrollToHash(hash) || ++tries > 30) return;
      raf = requestAnimationFrame(retry);
    };
    raf = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(raf);
  }, [hash, status, scrollToHash]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-zinc-400" aria-busy>
        …
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-lg">{t("reader.chapterNotFound")}</p>
        <Link to={`/${locale}/`} className="mt-4 inline-block text-sky-600 underline">
          {t("reader.backHome")}
        </Link>
      </div>
    );
  }

  // Prev/next from the resolved locale's manifest (falls back to source).
  const chapters = manifest[resolvedLocale] ?? manifest[DEFAULT_LOCALE] ?? [];
  const idx = chapters.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {fellBack && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {t("reader.untranslated")}
        </div>
      )}
      <article className="prose-book" lang={resolvedLocale}>
        <MDXProvider components={mdxComponents}>
          {Chapter && <Chapter />}
        </MDXProvider>
      </article>
      <nav className="mt-12 flex justify-between gap-4 border-t border-zinc-200 pt-6 font-sans text-sm dark:border-zinc-800">
        {prev ? (
          <Link
            to={`/${locale}/chapter/${prev.slug}`}
            className="max-w-[45%] text-sky-700 hover:underline dark:text-sky-400"
          >
            ← {t("nav.prev")}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={`/${locale}/chapter/${next.slug}`}
            className="max-w-[45%] text-right text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("nav.next")}: {next.title} →
          </Link>
        )}
      </nav>
    </div>
  );
}
