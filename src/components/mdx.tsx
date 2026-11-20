import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";
import { Sim } from "@/sim/framework/SimulationWidget";
import { M } from "./M";

/** Auto-assign ids to h2/h3 so frontmatter `sections` can deep-link. */
function heading(Tag: "h2" | "h3") {
  return function Heading({ children, ...rest }: ComponentPropsWithoutRef<"h2">) {
    const text = typeof children === "string" ? children : undefined;
    const id =
      rest.id ??
      text
        ?.toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "");
    return (
      <Tag id={id} {...rest}>
        {children}
      </Tag>
    );
  };
}

/** Component overrides available inside every MDX chapter. */
export const mdxComponents: MDXComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  Sim,
  M,
};
