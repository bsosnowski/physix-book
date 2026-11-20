import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import rehypeKatex from "rehype-katex";
import { chapterManifest, chapterLoader } from "./vite/chapter-manifest.ts";

const contentDir = path.resolve(import.meta.dirname, "content");

export default defineConfig({
  plugins: [
    chapterManifest(contentDir),
    chapterLoader(contentDir),
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMath],
        rehypePlugins: [rehypeKatex],
        providerImportSource: "@mdx-js/react",
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "katex", test: /node_modules[\\/]katex/ },
            { name: "vendor", test: /node_modules[\\/](react|react-dom|react-router|i18next|react-i18next|zustand)/ },
          ],
        },
      },
    },
  },
});
