import fs from "node:fs";
import path from "node:path";
import config from "../config/index.js";
import type { PizzazWidget } from "../types/index.js";

/**
 * Read widget HTML from assets directory
 */
export function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(config.assetsDir)) {
    throw new Error(
      `Widget assets not found. Expected directory ${config.assetsDir}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(config.assetsDir, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(config.assetsDir)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(config.assetsDir, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${config.assetsDir}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

/**
 * Widget descriptor metadata
 */
export function widgetDescriptorMeta(widget: PizzazWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  } as const;
}

/**
 * Widget invocation metadata
 */
export function widgetInvocationMeta(widget: PizzazWidget) {
  return {
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
  } as const;
}

/**
 * Define all available widgets
 */
export const widgets: PizzazWidget[] = [
  {
    id: "product-search",
    title: "Search Products",
    templateUri: "ui://widget/product-search.html",
    invoking: "Searching products",
    invoked: "Products found",
    html: readWidgetHtml("pizzaz-list"),
    responseText: "Product search results displayed!",
  },
];

export const widgetsById = new Map<string, PizzazWidget>();
export const widgetsByUri = new Map<string, PizzazWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

