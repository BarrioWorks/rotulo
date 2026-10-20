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
      return page ? `${pageLabel(page, s.project.name, s.pages)} page` : "A page";
    }
    case "web":
      try {
        return new URL(href, "https://site.invalid/").host.replace(/^www\./, "") || href;
      } catch {
        return href;
      }
  }
}


/** The result of checking what the owner typed for a link: the link to save, or how to fix it. */
export type LinkCheck = { ok: true; href: string } | { ok: false; message: string };

/** Digits, spaces, a leading +, dashes and brackets, with at least 3 digits. Saved as `tel:+4420…`. */
export function checkPhone(raw: string): LinkCheck {
  const value = raw.trim().replace(/^tel:/i, "");
  if (!value) return { ok: false, message: "Type a phone number, like +44 20 1234 5678." };
  if (!/^\+?[\d\s()-]+$/.test(value)) return { ok: false, message: "A phone number can only have digits, spaces, a + at the start, dashes and brackets." };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3) return { ok: false, message: "A phone number needs at least 3 digits." };
  return { ok: true, href: `tel:${value.startsWith("+") ? "+" : ""}${digits}` };
}

export function checkEmail(raw: string): LinkCheck {
  const value = raw.trim().replace(/^mailto:/i, "");
  if (!value) return { ok: false, message: "Type an email address, like name@example.com." };
  if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>".]{2,}$/.test(value)) return { ok: false, message: "That doesn't look like an email address. Check it looks like name@example.com." };
  return { ok: true, href: `mailto:${value}` };
}

/** A web address with or without `https://`. `example.com/menu` becomes `https://example.com/menu`. */
export function checkWeb(raw: string): LinkCheck {
  const value = raw.trim();
  const wrong: LinkCheck = { ok: false, message: "Type a web address, like example.com or https://example.com." };
  if (!value || /\s/.test(value) || value.includes("@")) return value ? wrong : { ok: false, message: "Type a web address, like example.com." };
  const href = /^https?:\/\//i.test(value) ? value : /^[a-z][a-z0-9+.-]*:/i.test(value) ? null : `https://${value.replace(/^\/\//, "")}`;
  if (!href) return wrong;
  try {
    const url = new URL(href);
    const host = url.hostname;
    if (!/^https?:$/.test(url.protocol) || !(host === "localhost" || /^[^.]+(\.[^.]+)+$/.test(host)) || /\.$|^\./.test(host)) return wrong;
  } catch {
    return wrong;
  }
  return { ok: true, href };
}
