import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import rehypeKatex from "rehype-katex";
import { chapterManifest, chapterLoader } from "./vite/chapter-manifest";

const contentDir = path.resolve(__dirname, "content");

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
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
