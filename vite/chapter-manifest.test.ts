import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest } from "./chapter-manifest";

const contentDir = path.resolve(import.meta.dirname, "../content");

describe("buildManifest", () => {
  const manifest = buildManifest(contentDir);

  it("finds both locales", () => {
    expect(Object.keys(manifest).sort()).toEqual(["en", "pl"]);
  });

  it("sorts chapters by order", () => {
    const orders = manifest.en.map((c) => c.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("uses canonical slugs shared across locales", () => {
    expect(manifest.en.map((c) => c.slug)).toContain("kinematics");
    expect(manifest.pl.map((c) => c.slug)).toContain("kinematics");
  });

  it("extracts localized titles and sections", () => {
    const pl = manifest.pl.find((c) => c.slug === "kinematics")!;
    expect(pl.title).toBe("Kinematyka — geometria ruchu");
    expect(pl.sections.map((s) => s.id)).toContain("rzut-ukosny");
  });
});
