import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const ExerciseContext = createContext(false);

/**
 * Exercise with a collapsible solution.
 *
 *   <Exercise title="…">
 *     Problem statement…
 *     <Solution>Worked answer…</Solution>
 *   </Exercise>
 */
export function Exercise({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <div className="my-6 rounded-lg border border-sky-200 bg-sky-50/50 p-4 font-sans text-base dark:border-sky-900 dark:bg-sky-950/30">
      <p className="mb-1 text-xs font-semibold tracking-widest text-sky-700 uppercase dark:text-sky-400">
        {t("exercise.label")}
        {title ? ` — ${title}` : ""}
      </p>
      <ExerciseContext.Provider value={open}>
        <div className="font-serif">{children}</div>
      </ExerciseContext.Provider>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-2 rounded-md border border-sky-300 px-3 py-1 text-sm text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/40"
      >
        {t(open ? "exercise.hideSolution" : "exercise.showSolution")}
      </button>
    </div>
  );
}

export function Solution({ children }: { children: ReactNode }) {
  const open = useContext(ExerciseContext);
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="mt-3 rounded-md border-l-4 border-emerald-400 bg-emerald-50/60 py-2 pr-3 pl-3 dark:border-emerald-600 dark:bg-emerald-950/30">
      <p className="mb-1 font-sans text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
        {t("exercise.solution")}
      </p>
      {children}
    </div>
  );
}
