import { flash, recall, remember } from "./app.js";
import { lit, obj, str } from "./schema.js";
import { must, toast } from "./ui.js";

export type Status = "published" | "changes" | "offline" | "draft";
export type Sort = "recent" | "name" | "status";
export type View = "grid" | "list";

/** One website card as the dashboard reads it from the server-rendered markup. */
export interface Site {
  pid: string;
  name: string;
  /** The Rótulo address and every verified domain, without a scheme. */
  addresses: string[];
  status: Status;
  /** Last edit, in milliseconds since the epoch. */
  edited: number;
}

export interface Query {
  text: string;
  sort: Sort;
}

/** Must match the key in dashboard-view.ts, which applies the view before the page paints. */
export const VIEW_KEY = "ph.dashboard.view";
const FOCUS_KEY = "ph.dashboard.focus";

const parseView = lit("grid", "list");
const parseStatus = lit("published", "changes", "offline", "draft");
const parseSort = lit("recent", "name", "status");
const parseError = obj({ message: str(1000) });
const parseCreated = obj({ pid: str(64), name: str(200) });

/** Changes waiting to be published come first: they are what an owner most often came back to finish. */
const STATUS_ORDER: Record<Status, number> = { changes: 0, published: 1, offline: 2, draft: 3 };
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function fold(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Every word typed must appear in the name or one of the addresses. */
export function matches(site: Site, text: string): boolean {
  const words = fold(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold([site.name, ...site.addresses].join(" "));
  return words.every((word) => haystack.includes(word.replace(/^https?:\/\//, "").replace(/\/+$/, "")));
}

function byRecent(a: Site, b: Site): number {
  return b.edited - a.edited || collator.compare(a.name, b.name);
}

const ORDER: Record<Sort, (a: Site, b: Site) => number> = {
  recent: byRecent,
  name: (a, b) => collator.compare(a.name, b.name) || byRecent(a, b),
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byRecent(a, b),
};

/** The websites to show, in order. */
export function arrange(sites: readonly Site[], query: Query): Site[] {
  return sites.filter((site) => matches(site, query.text)).sort(ORDER[query.sort]);
}

/** The most recently edited website gets the wide card, but only while the list is in its natural order. */
export function featured(shown: readonly Site[], total: number, query: Query, view: View): string | null {
  if (view !== "grid" || query.sort !== "recent" || query.text.trim() !== "" || total < 2) return null;
  return shown[0]?.pid ?? null;
}

export function resultLine(shown: number, total: number, text: string): string {
  if (text.trim() === "") return `${total} ${total === 1 ? "website" : "websites"}`;
  return `${shown} of ${total} ${total === 1 ? "website" : "websites"}`;
}

/** Storage can be missing, full or blocked; the view then falls back to the grid without failing. */
export function readView(storage: Pick<Storage, "getItem"> | null): View {
  try {
    return parseView(storage?.getItem(VIEW_KEY)) ?? "grid";
  } catch {
    return "grid";
  }
}

export function writeView(storage: Pick<Storage, "setItem"> | null, view: View): void {
  try {
    storage?.setItem(VIEW_KEY, view);
  } catch {
    // The choice still applies for this visit.
  }
}

export function projectRequest(body: { name?: string }): RequestInit {
  return {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body.name === undefined ? {} : { name: body.name.trim() }),
    credentials: "same-origin",
    cache: "no-store",
  };
}

/** What happened to `POST /api/projects` or `POST /api/projects/{pid}/duplicate`. */
export type CreateOutcome =
  | { kind: "created"; pid: string; name: string }
  | { kind: "signed_out" }
  | { kind: "failed"; message: string };

export function createOutcome(status: number, body: unknown, failure: string): CreateOutcome {
  if (status === 201) {
    const created = parseCreated(body);
    if (created) return { kind: "created", ...created };
    return { kind: "failed", message: "The website was made but we couldn't open it. Reload the page to find it." };
  }
  if (status === 401) return { kind: "signed_out" };
  if (status === 404) return { kind: "failed", message: "This website no longer exists. Reload the page to see your websites." };
  return { kind: "failed", message: parseError(body)?.message ?? failure };
}

async function send(url: string, body: { name?: string }, failure: string): Promise<CreateOutcome> {
  try {
    const response = await fetch(url, projectRequest(body));
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return createOutcome(response.status, parsed, failure);
  } catch {
    return { kind: "failed", message: "We couldn't reach Rótulo. Check your internet connection and try again." };
  }
}

function readSite(el: HTMLElement): Site {
  const edited = Date.parse(el.dataset["edited"] ?? "");
  return {
    pid: el.dataset["pid"] ?? "",
    name: el.dataset["name"] ?? "",
    addresses: (el.dataset["addresses"] ?? "").split(" ").filter(Boolean),
    status: parseStatus(el.dataset["status"]) ?? "draft",
    edited: Number.isNaN(edited) ? 0 : edited,
  };
}

function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function wireList(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>("[data-site-list]");
  const tools = root.querySelector<HTMLElement>("[data-dash-tools]");
  if (!list || !tools) return;
  const cards = new Map<string, HTMLElement>();
  const sites: Site[] = [];
  for (const el of list.querySelectorAll<HTMLElement>(":scope > [data-site]")) {
    const site = readSite(el);
    cards.set(site.pid, el);
    sites.push(site);
  }
  const search = must<HTMLInputElement>(tools, "[data-dash-search]");
  const sort = must<HTMLSelectElement>(tools, "[data-dash-sort]");
  const count = must<HTMLElement>(tools, "[data-dash-count]");
  const viewButtons = [...tools.querySelectorAll<HTMLButtonElement>("[data-view-option]")];
  const empty = must<HTMLElement>(root, "[data-no-results]");
  const emptyText = must<HTMLElement>(empty, "[data-no-results-text]");
  const query: Query = { text: "", sort: "recent" };
  let view = readView(localStore());
  let announced = "";
  let announceTimer = 0;

  const render = () => {
    const shown = arrange(sites, query);
    const visible = new Set(shown.map((site) => site.pid));
    const lead = featured(shown, sites.length, query, view);
    for (const site of shown) {
      const el = cards.get(site.pid);
      if (el) list.append(el);
    }
    for (const [pid, el] of cards) {
      el.hidden = !visible.has(pid);
      el.classList.toggle("is-latest", pid === lead);
    }
    document.documentElement.dataset["dashView"] = view;
    for (const button of viewButtons) button.setAttribute("aria-pressed", String(button.dataset["viewOption"] === view));
    list.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    emptyText.textContent = `No websites match “${query.text.trim()}”. Check the spelling, or search by part of the name or address.`;
    const line = resultLine(shown.length, sites.length, query.text);
    count.textContent = line;
    window.clearTimeout(announceTimer);
    if (line !== announced && query.text.trim() !== "") {
      announceTimer = window.setTimeout(() => {
        announced = line;
        must<HTMLElement>(tools, "[data-dash-announce]").textContent = line;
      }, 400);
    }
  };

  const clear = () => {
    search.value = "";
    query.text = "";
    render();
    search.focus();
  };

  search.addEventListener("input", () => {
    query.text = search.value;
    render();
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && search.value !== "") {
      event.preventDefault();
      clear();
    }
  });
  sort.addEventListener("change", () => {
    query.sort = parseSort(sort.value) ?? "recent";
    render();
  });
  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      view = parseView(button.dataset["viewOption"]) ?? "grid";
      writeView(localStore(), view);
      render();
    });
  }
  must<HTMLButtonElement>(empty, "[data-clear-search]").addEventListener("click", clear);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));
    if (event.key !== "/" || typing || event.metaKey || event.ctrlKey || event.altKey || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    search.focus();
  });

  sort.value = query.sort;
  tools.hidden = false;
  render();
}

function wireCreate(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>("dialog[data-create-dialog]");
  if (!dialog) return;
  const form = must<HTMLFormElement>(dialog, "[data-create-form]");
  const input = must<HTMLInputElement>(dialog, "[data-create-input]");
  const error = must<HTMLElement>(dialog, "[data-create-error]");
  const submit = must<HTMLButtonElement>(dialog, "[data-create-submit]");
  let pending = false;
  const cancel = must<HTMLButtonElement>(dialog, "[data-create-cancel]");
  const setPending = (value: boolean) => {
    pending = value;
    submit.disabled = value;
    input.disabled = value;
    cancel.disabled = value;
    if (value) submit.setAttribute("aria-busy", "true");
    else submit.removeAttribute("aria-busy");
  };
  let trigger: HTMLElement | null = null;
  const showError = (message: string | null) => {
    error.textContent = message ?? "";
    error.hidden = message === null;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-create]")) {
    button.addEventListener("click", () => {
      if (pending) return;
      trigger = button;
      input.value = "";
      showError(null);
      setPending(false);
      dialog.showModal();
      input.focus();
    });
  }
  cancel.addEventListener("click", () => { if (!pending) dialog.close(); });
  dialog.addEventListener("cancel", (event) => { if (pending) event.preventDefault(); });
  dialog.addEventListener("close", () => trigger?.focus());
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true" && input.value.trim()) showError(null);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!input.value.trim()) {
      showError("Enter a name for your website.");
      input.focus();
      return;
    }
    setPending(true);
    const result = await send("/api/projects", { name: input.value }, "We couldn't create the website. Please try again in a moment.");
    switch (result.kind) {
      case "created":
        window.location.assign(`/projects/${encodeURIComponent(result.pid)}`);
        return;
      case "signed_out":
        window.location.assign("/login");
        return;
      case "failed":
        setPending(false);
        showError(result.message);
        input.focus();
    }
  });
}

function wireDuplicate(root: HTMLElement): void {
  let busy = false;
  for (const button of root.querySelectorAll<HTMLButtonElement>("button[data-duplicate]")) {
    const site = button.closest<HTMLElement>("[data-site]");
    if (!site) continue;
    button.addEventListener("click", async () => {
      if (busy || button.disabled) return;
      busy = true;
      const menu = site.querySelector<HTMLDetailsElement>("details[data-menu]");
      menu?.removeAttribute("open");
      const name = site.dataset["name"] ?? "";
      site.setAttribute("aria-busy", "true");
      toast(`Duplicating ${name}…`, { ms: 20000 });
      const result = await send(`/api/projects/${encodeURIComponent(site.dataset["pid"] ?? "")}/duplicate`, {}, `We couldn't duplicate ${name}. Please try again in a moment.`);
      switch (result.kind) {
        case "created":
          flash(`${result.name} is ready. It's a copy of ${name}.`);
          remember(FOCUS_KEY, result.pid);
          window.location.assign("/projects");
          return;
        case "signed_out":
          window.location.assign("/login");
          return;
        case "failed":
          busy = false;
          site.removeAttribute("aria-busy");
          document.querySelector("#toasts")?.replaceChildren();
          toast(result.message, "error");
          menu?.querySelector<HTMLElement>("summary")?.focus();
      }
    });
  }
}

/** After a duplicate, the new card is brought into view with its name focused. */
function focusNew(root: HTMLElement): void {
  const pid = recall(FOCUS_KEY);
  if (!pid) return;
  const link = root.querySelector<HTMLElement>(`[data-site][data-pid="${CSS.escape(pid)}"] .site-link`);
  link?.focus({ preventScroll: true });
  link?.closest("[data-site]")?.scrollIntoView({ block: "center" });
}

if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>("[data-dashboard]");
  if (root) {
    for (const el of root.querySelectorAll<HTMLElement>("[data-needs-script]")) el.hidden = false;
    wireList(root);
    wireCreate(root);
    wireDuplicate(root);
    focusNew(root);
  }
}
