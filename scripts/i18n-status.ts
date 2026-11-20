/**
 * Translation status report.
 *   npm run i18n:status            — human-readable report
 *   npm run i18n:status -- --check — CI mode: exit 1 on missing UI/sim keys
 *
 * Reports: missing/extra JSON keys per locale, missing chapters, and
 * chapters whose English source changed since translation (sourceHash).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";

const ROOT = path.resolve(import.meta.dirname, "..");
const LOCALES_DIR = path.join(ROOT, "locales");
const CONTENT_DIR = path.join(ROOT, "content");
const SOURCE = "en";
const CHECK = process.argv.includes("--check");

let errors = 0;
let warnings = 0;

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// --- 1. UI / sim catalogs -------------------------------------------------
const locales = fs
  .readdirSync(LOCALES_DIR)
  .filter((l) => fs.statSync(path.join(LOCALES_DIR, l)).isDirectory());

for (const file of fs.readdirSync(path.join(LOCALES_DIR, SOURCE))) {
  if (!file.endsWith(".json")) continue;
  const sourceKeys = new Set(
    flatKeys(readJson(path.join(LOCALES_DIR, SOURCE, file))),
  );
  for (const locale of locales.filter((l) => l !== SOURCE)) {
    const target = path.join(LOCALES_DIR, locale, file);
    if (!fs.existsSync(target)) {
      console.error(`✗ ${locale}/${file}: file missing`);
      errors++;
      continue;
    }
    const keys = new Set(flatKeys(readJson(target)));
    const missing = [...sourceKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !sourceKeys.has(k));
    if (missing.length) {
      console.error(`✗ ${locale}/${file}: missing keys: ${missing.join(", ")}`);
      errors++;
    }
    if (extra.length) {
      console.warn(`⚠ ${locale}/${file}: extra keys: ${extra.join(", ")}`);
      warnings++;
    }
    if (!missing.length && !extra.length) {
      console.log(`✓ ${locale}/${file}: ${keys.size} keys in sync`);
    }
  }
}

// --- 2. Chapters ----------------------------------------------------------
function chapterFiles(locale: string): Map<string, string> {
  const dir = path.join(CONTENT_DIR, locale, "chapters");
  const map = new Map<string, string>();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    map.set(f.replace(/^\d+-/, "").replace(/\.mdx$/, ""), path.join(dir, f));
  }
  return map;
}

/** Hash of the translatable source: prose with frontmatter stripped. */
function sourceHash(file: string): string {
  const { content } = matter.read(file);
  return crypto.createHash("sha256").update(content.trim()).digest("hex").slice(0, 12);
}

const sourceChapters = chapterFiles(SOURCE);
for (const locale of locales.filter((l) => l !== SOURCE)) {
  const targetChapters = chapterFiles(locale);
  for (const [slug, file] of sourceChapters) {
    const translated = targetChapters.get(slug);
    if (!translated) {
      console.warn(`⚠ ${locale}: chapter "${slug}" not translated (falls back to ${SOURCE})`);
      warnings++;
      continue;
    }
    const { data } = matter.read(translated);
    const expected = sourceHash(file);
    if (data.sourceHash !== expected) {
      console.warn(
        `⚠ ${locale}: chapter "${slug}" is stale (sourceHash ${data.sourceHash ?? "none"} ≠ ${expected})`,
      );
      warnings++;
    } else {
      console.log(`✓ ${locale}: chapter "${slug}" up to date`);
    }
  }
  for (const slug of targetChapters.keys()) {
    if (!sourceChapters.has(slug)) {
      console.warn(`⚠ ${locale}: chapter "${slug}" has no ${SOURCE} source`);
      warnings++;
    }
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
if (CHECK && errors > 0) process.exit(1);
