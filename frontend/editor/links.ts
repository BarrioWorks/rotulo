import { pageLabel } from "./pages.js";
import type { State } from "./state.js";

/** A link from `fromPage` to `toPage`, both draft paths like `blog/post.html`. */
export function relativeHref(fromPage: string, toPage: string): string {
  const from = fromPage.split("/").slice(0, -1);
  const to = toPage.split("/");
  let common = 0;
  while (common < from.length && common < to.length - 1 && from[common] === to[common]) common++;
  return [...Array<string>(from.length - common).fill(".."), ...to.slice(common)].join("/");
}

export type LinkKind =
  | { kind: "page"; path: string; hash: string }
  | { kind: "anchor"; id: string }
  | { kind: "web" }
  | { kind: "email" }
  | { kind: "phone" }
  | { kind: "empty" };

export function classifyHref(href: string, currentPage: string, pages: string[]): LinkKind {
  const value = href.trim();
  if (!value) return { kind: "empty" };
  if (/^mailto:/i.test(value)) return { kind: "email" };
  if (/^tel:/i.test(value)) return { kind: "phone" };
  if (value.startsWith("#")) return { kind: "anchor", id: value.slice(1) };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return { kind: "web" };
  try {
    const resolved = new URL(value, `https://site.invalid/${currentPage}`);
    let path = decodeURIComponent(resolved.pathname.replace(/^\//, ""));
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (pages.includes(path)) {
      if (path === currentPage && resolved.hash.length > 1 && !value.split("#")[0]) return { kind: "anchor", id: resolved.hash.slice(1) };
      return { kind: "page", path, hash: resolved.hash };
    }
  } catch {
    return { kind: "web" };
  }
  return { kind: "web" };
}

/** "Services section", "About page", "themesberg.com": where a link goes, in words. */
export function describeHref(href: string, s: Pick<State, "path" | "pages" | "anchors" | "project">): string {
  const k = classifyHref(href, s.path, s.pages.map((p) => p.path));
  switch (k.kind) {
    case "empty": return "Nowhere yet";
    case "email": return href.replace(/^mailto:/i, "").split("?")[0] ?? "An email address";
    case "phone": return href.replace(/^tel:/i, "");
    case "anchor": {
      const anchor = s.anchors.find((a) => a.id === k.id);
      return anchor ? `${anchor.name} section` : k.id ? `Part of this page` : "Top of this page";
    }
    case "page": {
      const page = s.pages.find((p) => p.path === k.path);
      return page ? `${pageLabel(page, s.project.name)} page` : "A page";
    }
    case "web":
      try {
        return new URL(href, "https://site.invalid/").host.replace(/^www\./, "") || href;
      } catch {
        return href;
      }
  }
}

