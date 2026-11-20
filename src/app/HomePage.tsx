import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import manifest from "virtual:chapters";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export function HomePage() {
  const { locale = DEFAULT_LOCALE } = useParams();
  const { t } = useTranslation();
  const chain = FALLBACK_CHAIN[locale as Locale] ?? [DEFAULT_LOCALE];

  const chapters = (manifest[DEFAULT_LOCALE] ?? []).map((ch) => {
    for (const loc of chain) {
      const localized = manifest[loc]?.find((c) => c.slug === ch.slug);
      if (localized) return localized;
    }
    return ch;
  });
  const first = chapters[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-sans text-4xl font-bold tracking-tight">
        {t("home.welcome")}
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t("home.intro")}
      </p>
      {first && (
        <Link
          to={`/${locale}/chapter/${first.slug}`}
          className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-2.5 font-sans font-medium text-white hover:bg-sky-500"
        >
          {t("home.startReading")} →
        </Link>
      )}
      <h2 className="mt-12 mb-4 font-sans text-xl font-semibold">
        {t("home.chapterList")}
      </h2>
      <ol className="space-y-2">
        {chapters.map((ch) => (
          <li key={ch.slug}>
            <Link
              to={`/${locale}/chapter/${ch.slug}`}
              className="block rounded-lg border border-zinc-200 p-4 hover:border-sky-300 hover:bg-sky-50/50 dark:border-zinc-800 dark:hover:border-sky-800 dark:hover:bg-sky-950/30"
            >
              <span className="mr-2 text-zinc-400">{ch.order}.</span>
              <span className="font-medium">{ch.title}</span>
              {ch.description && (
                <p className="mt-1 text-sm text-zinc-500">{ch.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
