export type IconName =
  | "upload" | "plus" | "page" | "home" | "more" | "trash" | "copy" | "external" | "globe" | "check"
  | "check-circle" | "alert" | "info" | "undo" | "redo" | "desktop" | "mobile" | "eye" | "eye-off"
  | "pencil" | "image" | "link" | "unlink" | "bold" | "italic" | "align-left" | "align-center"
  | "align-right" | "align-justify" | "chevron-right" | "chevron-left" | "chevron-down" | "arrow-up"
  | "arrow-down" | "duplicate" | "parent" | "folder" | "logout" | "settings" | "clock" | "send" | "x"
  | "refresh" | "text-color" | "fill" | "spacing" | "type" | "sparkle" | "lock" | "drag" | "zip";

const SVG_NS = "http://www.w3.org/2000/svg";

export function icon(name: IconName, extraClass = ""): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", `icon ${extraClass}`.trim());
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `/static/img/icons.svg#i-${name}`);
  svg.append(use);
  return svg;
}

type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
  hidden?: boolean;
}

/** Builds an element. Text always goes through text nodes, never markup. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.hidden) el.hidden = true;
  for (const [k, v] of Object.entries(props.attrs ?? {})) el.setAttribute(k, v);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

export function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

export function toast(message: string, kind: "info" | "error" = "info", ms = 3600): void {
  const host = document.getElementById("toasts");
  if (!host) return;
  const el = h("div", { class: kind === "error" ? "toast is-error" : "toast" },
    icon(kind === "error" ? "alert" : "check-circle", "icon-sm"),
    h("span", { text: message }));
  host.append(el);
  window.setTimeout(() => {
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 220);
  }, ms);
}

export interface ConfirmOptions {
  title: string;
  text: string;
  ok: string;
  danger?: boolean;
}

/** Asks for confirmation with the shared `[data-dialog="confirm"]` dialog. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-dialog="confirm"]');
  if (!dialog) return Promise.resolve(window.confirm(`${options.title}\n\n${options.text}`));
  must<HTMLElement>(dialog, "[data-dialog-title]").textContent = options.title;
  must<HTMLElement>(dialog, "[data-dialog-text]").textContent = options.text;
  const ok = must<HTMLButtonElement>(dialog, "[data-dialog-ok]");
  ok.textContent = options.ok;
  ok.className = options.danger ? "btn btn-danger" : "btn btn-primary";
  dialog.returnValue = "cancel";
  dialog.showModal();
  ok.focus();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h("textarea", { attrs: { readonly: "", "aria-hidden": "true" } });
    area.value = text;
    area.className = "visually-hidden";
    document.body.append(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  }
}

/** "Published 3 minutes ago" style wording for an ISO date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
