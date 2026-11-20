/// <reference types="vite/client" />

declare module "virtual:chapters" {
  export interface ChapterMeta {
    slug: string;
    order: number;
    title: string;
    description?: string;
    sections: { id: string; title: string }[];
    text: string;
  }
  const manifest: Record<string, ChapterMeta[]>;
  export default manifest;
}

declare module "virtual:chapter-loader" {
  import type { ComponentType } from "react";
  export function hasChapter(locale: string, slug: string): boolean;
  export function loadChapter(
    locale: string,
    slug: string,
  ): Promise<ComponentType | null>;
}

declare module "*.mdx" {
  import type { ComponentType } from "react";
  const Component: ComponentType;
  export default Component;
}
