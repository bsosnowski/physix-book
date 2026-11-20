import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Plugin } from "vite";

export const VIRTUAL_ID = "virtual:chapters";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export interface ChapterMeta {
  slug: string;
  order: number;
  title: string;
  description?: string;
  sections: { id: string; title: string }[];
}

export type ChapterManifest = Record<string, ChapterMeta[]>;

/** Scan content/<locale>/chapters/*.mdx frontmatter for every locale. */
export function buildManifest(contentDir: string): ChapterManifest {
  const manifest: ChapterManifest = {};
  if (!fs.existsSync(contentDir)) return manifest;
  for (const locale of fs.readdirSync(contentDir)) {
    const chaptersDir = path.join(contentDir, locale, "chapters");
    if (!fs.existsSync(chaptersDir)) continue;
    const chapters: ChapterMeta[] = [];
    for (const file of fs.readdirSync(chaptersDir)) {
      if (!file.endsWith(".mdx")) continue;
      const { data } = matter.read(path.join(chaptersDir, file));
      chapters.push({
        slug: data.slug ?? file.replace(/^\d+-/, "").replace(/\.mdx$/, ""),
        order: data.order ?? 999,
        title: data.title ?? file,
        description: data.description,
        sections: data.sections ?? [],
      });
    }
    manifest[locale] = chapters.sort((a, b) => a.order - b.order);
  }
  return manifest;
}

/**
 * Exposes the manifest as `virtual:chapters` and triggers full reload
 * when chapter frontmatter files change.
 */
export function chapterManifest(contentDir: string): Plugin {
  return {
    name: "physix:chapter-manifest",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export default ${JSON.stringify(buildManifest(contentDir))};`;
      }
    },
    configureServer(server) {
      const onChange = (file: string) => {
        if (file.startsWith(contentDir) && file.endsWith(".mdx")) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("add", onChange);
      server.watcher.on("change", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

/**
 * Per-locale chapter loader exposed as `virtual:chapter-loader`.
 * `loadChapter(locale, slug)` lazy-imports the MDX; returns null if the
 * chapter does not exist in that locale (caller applies fallback chain).
 */
export const LOADER_VIRTUAL_ID = "virtual:chapter-loader";
const RESOLVED_LOADER_ID = "\0" + LOADER_VIRTUAL_ID;

export function chapterLoader(contentDir: string): Plugin {
  return {
    name: "physix:chapter-loader",
    resolveId(id) {
      if (id === LOADER_VIRTUAL_ID) return RESOLVED_LOADER_ID;
    },
    load(id) {
      if (id !== RESOLVED_LOADER_ID) return;
      const manifest = buildManifest(contentDir);
      const entries: string[] = [];
      for (const [locale, chapters] of Object.entries(manifest)) {
        for (const ch of chapters) {
          const files = fs.readdirSync(path.join(contentDir, locale, "chapters"));
          const file = files.find(
            (f) =>
              f.endsWith(".mdx") &&
              f.replace(/^\d+-/, "").replace(/\.mdx$/, "") === ch.slug,
          );
          if (!file) continue;
          const p = path.join(contentDir, locale, "chapters", file);
          entries.push(
            `  ${JSON.stringify(`${locale}/${ch.slug}`)}: () => import(${JSON.stringify(p)}),`,
          );
        }
      }
      return [
        `const loaders = {\n${entries.join("\n")}\n};`,
        `export function hasChapter(locale, slug) { return (locale + "/" + slug) in loaders; }`,
        `export async function loadChapter(locale, slug) {`,
        `  const loader = loaders[locale + "/" + slug];`,
        `  return loader ? (await loader()).default : null;`,
        `}`,
      ].join("\n");
    },
  };
}
