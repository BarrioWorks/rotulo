import { arr, lit, obj, opt, str, type Parsed } from "./schema.js";
import { formatBytes, h, icon, must, plural } from "./ui.js";

const skipReason = lit("server_code", "secret", "archive", "system_junk", "reserved", "source", "unsupported");
type SkipReason = Parsed<typeof skipReason>;

const parseReport = obj({
  pages: arr(str(1024)),
  skipped: arr(obj({ path: str(1024), reason: skipReason })),
  missing: arr(obj({ page: str(1024), url: str(2048) })),
  warnings: arr(str(1000)),
});
export type Report = Parsed<typeof parseReport>;

const parseSuccess = obj({
  project: obj({ pid: str(64), name: str(200) }),
  editor_url: str(2048, /^\/[^/\\]/),
  report: parseReport,
  thumbnail_url: opt(str(2048)),
});
type Success = Parsed<typeof parseSuccess>;

const parseError = obj({ error: str(64), message: str(1000), folders: opt(arr(str(255), 50)) });

/** What the page shows after the server answers an upload. */
export type Outcome =
  | { kind: "done"; result: Success }
  | { kind: "folders"; folders: string[]; message: string }
  | { kind: "error"; title: string; message: string; help: boolean }
  | { kind: "signed_out" };

type Step =
  | { kind: "choose"; error: string | null }
  | { kind: "review"; file: File; message: string; continueLabel: string }
  | { kind: "uploading"; file: File; percent: number }
  | { kind: "checking"; file: File }
  | { kind: "folders"; file: File; folders: string[]; message: string }
  | { kind: "error"; title: string; message: string; help: boolean }
  | { kind: "done"; result: Success };

const SKIP_WORDS: Record<SkipReason, string> = {
  server_code: "Server code, which a website on Pagehaven can't run",
  secret: "Private files such as passwords or keys, left out to keep them safe",
  archive: "ZIP files inside your ZIP",
  system_junk: "Hidden files your computer adds, like .DS_Store",
  reserved: "Files with names Pagehaven needs for itself",
  source: "Files only needed to build the website",
  unsupported: "File types a website can't use",
};

const ERROR_TITLES: Record<string, string> = {
  invalid_archive: "This ZIP isn't a website Pagehaven can use",
  too_large: "This website is too big",
  rate_limited: "Too many imports in a short time",
  busy: "Pagehaven is busy right now",
  project_limit: "You've reached your website limit",
};

const MB = 1024 * 1024;

/** A problem we can see before uploading, or null when the file looks like a ZIP Pagehaven can take. */
export function precheck(file: { name: string; size: number }, limitBytes: number): string | null {
  if (!/\.zip$/i.test(file.name)) return "That isn't a ZIP file. Choose the .zip file you downloaded for your website.";
  if (file.size === 0) return "This file is empty. Try downloading your website again.";
  if (file.size > limitBytes) {
    return `This file is ${(file.size / MB).toFixed(1)} MB. The most Pagehaven can import is ${limitBytes / MB} MB.`;
  }
  return null;
}

export const SOURCE_ONLY = "This ZIP contains source code rather than a finished website. Export the built static website files and try again.";
const SCRIPT_BUILT = "This website builds its pages in the browser with JavaScript. It will publish and work, but Pagehaven can only edit text and images that are written in its HTML files.";
const UNSURE = "We couldn't finish the quick check. You can upload anyway and let Pagehaven check the files.";

type ZipEntry = { name: string; method: number; flags: number; size: number; compressedSize: number; offset: number };
export type ZipCheck = { kind: "ready" } | { kind: "refused" | "warning" | "unsure"; message: string };

/** Read standard ZIP central headers. Unsupported or inconsistent archives go to the server. */
export function zipDirectory(buffer: ArrayBuffer): ZipEntry[] | null {
  const view = new DataView(buffer);
  const length = view.byteLength;
  for (let end = length - 22; end >= Math.max(0, length - 65557); end--) {
    if (view.getUint32(end, true) !== 0x06054b50 || end + 22 + view.getUint16(end + 20, true) !== length) continue;
    const count = view.getUint16(end + 10, true);
    const size = view.getUint32(end + 12, true);
    const start = view.getUint32(end + 16, true);
    if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 ||
        view.getUint16(end + 8, true) !== count || count === 65535 || start + size !== end) return null;
    const entries: ZipEntry[] = [];
    let cursor = start;
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) return null;
      const nameLength = view.getUint16(cursor + 28, true);
      const next = cursor + 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
      if (next > end || view.getUint16(cursor + 34, true) !== 0) return null;
      const entry = {
        name: new TextDecoder().decode(buffer.slice(cursor + 46, cursor + 46 + nameLength)),
        method: view.getUint16(cursor + 10, true), flags: view.getUint16(cursor + 8, true),
        size: view.getUint32(cursor + 24, true), compressedSize: view.getUint32(cursor + 20, true),
        offset: view.getUint32(cursor + 42, true),
      };
      if (entry.name.includes("\uFFFD") || entry.size === 0xffffffff || entry.compressedSize === 0xffffffff || entry.offset + 30 > start ||
          (entry.flags & 1) !== 0 || ![0, 8].includes(entry.method)) return null;
      const local = entry.offset;
      if (view.getUint32(local, true) !== 0x04034b50) return null;
      const data = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (data + entry.compressedSize > start) return null;
      entries.push(entry);
      cursor = next;
    }
    return cursor === end ? entries : null;
  }
  return null;
}

async function indexText(buffer: ArrayBuffer, entry: ZipEntry): Promise<string | null> {
  // Bound both compressed input and streamed output; a dishonest ZIP cannot expand without limit.
  if (entry.size > MB || entry.compressedSize > MB) return null;
  const view = new DataView(buffer);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const bytes = buffer.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return entry.size === bytes.byteLength ? new TextDecoder().decode(bytes) : null;
  if (typeof DecompressionStream === "undefined") return null;
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > MB) return null;
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  if (length !== entry.size) return null;
  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
  return new TextDecoder().decode(output);
}

/** Advisory only: the server validates paths, content, sizes and CRCs after upload. */
export async function inspectZip(buffer: ArrayBuffer): Promise<ZipCheck> {
  try {
    const entries = zipDirectory(buffer);
    if (!entries) return { kind: "unsure", message: UNSURE };
    const source = entries.some(({ name }) => /(^|\/)(package\.json|vite\.config\.[^/]+)$|(^|\/)src\/.*\.(jsx|tsx|vue|svelte)$/i.test(name));
    const indexes = entries.filter(({ name }) => /(^|\/)index\.html$/i.test(name));
    if (indexes.length === 0) return source ? { kind: "refused", message: SOURCE_ONLY } :
      { kind: "unsure", message: "We couldn't find index.html. Put it at the top of the ZIP or in dist/ or build/. You can still upload for a full check." };
    // Prefer a distribution over a source index, and read at most one HTML file.
    const index = indexes.find(({ name }) => /(^|\/)(dist|build)\/index\.html$/i.test(name)) ?? indexes[0];
    if (!index) return { kind: "unsure", message: UNSURE };
    const html = await indexText(buffer, index);
    if (html === null) return { kind: "unsure", message: UNSURE };
    const clean = html.replace(/<!--[\s\S]*?-->/g, "");
    if (source && indexes.length === 1 && /<script\b[^>]*\bsrc\s*=\s*["']?[^"'\s>]*\.(?:ts|jsx|tsx|vue|svelte)(?=[?#"'\s>])/i.test(clean)) {
      return { kind: "refused", message: SOURCE_ONLY };
    }
    if (/<script\b[^>]*\btype\s*=\s*(?:"module"|'module'|module(?=[\s>]))/i.test(clean) && /<(?:div|main)\b[^>]*\bid\s*=\s*(?:"(?:root|app|__next)"|'(?:root|app|__next)'|(?:root|app|__next)(?=[\s>]))[^>]*>\s*<\/(?:div|main)>/i.test(clean)) {
      return { kind: "warning", message: SCRIPT_BUILT };
    }
    return { kind: "ready" };
  } catch {
    return { kind: "unsure", message: UNSURE };
  }
}

export function editorDestination(result: Success): string | null {
  const report = result.report;
  if (report.warnings.length || report.skipped.length || report.missing.length) return null;
  return welcomeUrl(result.editor_url);
}

function welcomeUrl(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}welcome=1`;
}

/** Maps the server's answer to what the page shows. The server's message is shown as it is. */
export function outcome(status: number, body: unknown): Outcome {
  if (status === 201) {
    const result = parseSuccess(body);
    if (result) return { kind: "done", result };
  }
  if (status === 401) return { kind: "signed_out" };
  const error = parseError(body);
  if (error?.error === "choose_folder" && error.folders && error.folders.length > 0) {
    return { kind: "folders", folders: error.folders, message: error.message };
  }
  if (error?.error === "project_limit") {
    return {
      kind: "error",
      title: ERROR_TITLES["project_limit"] ?? "",
      message: `${error.message} On your websites page, open a website's More menu and choose Delete website.`,
      help: false,
    };
  }
  return {
    kind: "error",
    title: (error && ERROR_TITLES[error.error]) ?? "We couldn't import this file",
    message: error?.message ?? "Something went wrong on our side. Please try again in a moment.",
    help: error?.error === "invalid_archive",
  };
}

/** One reassuring sentence for the result screen: what is ready, and what was left out. */
export function summary(report: Report): string {
  const ready = `${plural(report.pages.length, "page", "pages")} imported and ready to edit.`;
  if (report.skipped.length === 0) return ready;
  return `${ready} We left out ${plural(report.skipped.length, "file", "files")} your website doesn't need.`;
}

function listWithMore(items: string[], limit = 5): HTMLElement[] {
  const shown = items.slice(0, limit).map((item) => h("code", { text: item }));
  const rest = items.length - shown.length;
  return rest > 0 ? [...shown, h("span", { class: "subtle", text: `and ${rest} more` })] : shown;
}

function reportDetails(report: Report): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  if (report.warnings.length > 0) {
    blocks.push(h("div", { class: "report-block" },
      h("h3", { text: "Worth knowing" }),
      h("ul", { class: "result-list" }, ...report.warnings.map((w) =>
        h("li", {}, icon("info", "icon-sm subtle"), h("span", { text: w }))))));
  }
  if (report.missing.length > 0) {
    blocks.push(h("div", { class: "report-block" },
      h("h3", { text: `${plural(report.missing.length, "file is", "files are")} missing from the ZIP` }),
      h("p", { class: "small muted", text: "Your pages mention these pictures or fonts, but the ZIP doesn't include them. They won't show until you add them. Everything else works." }),
      h("ul", { class: "result-list" }, ...report.missing.slice(0, 8).map((m) =>
        h("li", {}, h("code", { text: m.url }), h("span", { class: "subtle", text: `on ${m.page}` }))),
        report.missing.length > 8 ? h("li", { class: "subtle", text: `and ${report.missing.length - 8} more` }) : null)));
  }
  if (report.skipped.length > 0) {
    const byReason = new Map<SkipReason, string[]>();
    for (const s of report.skipped) byReason.set(s.reason, [...(byReason.get(s.reason) ?? []), s.path]);
    blocks.push(h("details", { class: "disclosure report-skipped" },
      h("summary", {}, icon("chevron-right", "icon-sm"), h("span", { text: "Show details" })),
      h("p", { class: "small muted", text: `${plural(report.skipped.length, "file was", "files were")} left out:` }),
      h("ul", { class: "result-list" }, ...[...byReason].map(([reason, paths]) =>
        h("li", { class: "stack" },
          h("span", { text: `${SKIP_WORDS[reason]} (${paths.length})` }),
          h("span", { class: "row wrap" }, ...listWithMore(paths)))))));
  }
  return blocks;
}

function boot(root: HTMLElement): void {
  const uploadLimit = Number(root.dataset["uploadMb"] ?? "25") * MB;
  const fileInput = must<HTMLInputElement>(root, "[data-file-input]");
  const nameInput = must<HTMLInputElement>(root, "[data-name-input]");
  const dropzone = must<HTMLElement>(root, "[data-dropzone]");
  const helpSlot = must<HTMLElement>(root, "[data-help-slot]");
  const help = must<HTMLDetailsElement>(root, "[data-export-help]");
  const sections = {
    choose: must<HTMLElement>(root, '[data-step="choose"]'),
    review: must<HTMLElement>(root, '[data-step="review"]'),
    progress: must<HTMLElement>(root, '[data-step="progress"]'),
    folders: must<HTMLElement>(root, '[data-step="folders"]'),
    error: must<HTMLElement>(root, '[data-step="error"]'),
    done: must<HTMLElement>(root, '[data-step="done"]'),
  };
  let current: XMLHttpRequest | null = null;
  let selection = 0;
  let pending: File | null = null;
  let busy = false;

  function show(step: Step): void {
    busy = step.kind === "uploading" || step.kind === "checking";
    const visible: keyof typeof sections =
      step.kind === "uploading" || step.kind === "checking" ? "progress" : step.kind;
    for (const [key, el] of Object.entries(sections)) el.hidden = key !== visible;
    helpSlot.hidden = step.kind !== "choose" && step.kind !== "error";

    switch (step.kind) {
      case "choose": {
        must<HTMLElement>(root, "[data-choose-error]").hidden = step.error === null;
        must<HTMLElement>(root, "[data-choose-error-text]").textContent = step.error ?? "";
        dropzone.classList.toggle("has-error", step.error !== null);
        fileInput.setAttribute("aria-invalid", String(step.error !== null));
        break;
      }
      case "review":
        pending = step.file;
        must<HTMLElement>(root, "[data-review-message]").textContent = step.message;
        must<HTMLButtonElement>(root, "[data-continue]").textContent = step.continueLabel;
        must<HTMLButtonElement>(root, "[data-continue]").disabled = false;
        must<HTMLElement>(root, "#review-title").focus();
        break;
      case "uploading":
      case "checking": {
        const bar = must<HTMLElement>(root, "[data-progress-bar]");
        const track = must<HTMLElement>(root, "[data-progress]");
        const label = must<HTMLElement>(root, "[data-progress-label]");
        must<HTMLElement>(root, "[data-progress-file]").textContent = step.file.name;
        must<HTMLElement>(root, "[data-progress-size]").textContent = formatBytes(step.file.size);
        const checking = step.kind === "checking";
        track.classList.toggle("is-indeterminate", checking);
        must<HTMLButtonElement>(root, "[data-cancel]").hidden = checking;
        must<HTMLElement>(root, "[data-progress-note]").hidden = !checking;
        if (checking) {
          bar.style.width = "";
          track.removeAttribute("aria-valuenow");
          label.textContent = "Checking files…";
        } else {
          bar.style.width = `${step.percent}%`;
          track.setAttribute("aria-valuenow", String(step.percent));
          label.textContent = `Uploading… ${step.percent}%`;
        }
        break;
      }
      case "folders": {
        must<HTMLElement>(root, "[data-folders-message]").textContent =
          "Your ZIP has more than one folder with a website in it. Choose the one visitors should see.";
        const list = must<HTMLElement>(root, "[data-folder-list]");
        list.replaceChildren(...step.folders.map((folder) => {
          const button = h("button", { class: "folder-option", attrs: { type: "button" } },
            icon("folder"), h("span", { class: "grow truncate", text: folder }), icon("chevron-right", "icon-sm subtle"));
          button.addEventListener("click", () => upload(step.file, folder));
          return button;
        }));
        list.querySelector("button")?.focus();
        break;
      }
      case "error":
        must<HTMLElement>(root, "[data-error-title]").textContent = step.title;
        must<HTMLElement>(root, "[data-error-message]").textContent = step.message;
        help.open = step.help;
        must<HTMLButtonElement>(sections.error, "[data-retry]").focus();
        break;
      case "done":
        renderResult(step.result);
        break;
    }
  }

  function renderResult(result: Success): void {
    const { report } = result;
    must<HTMLElement>(root, "[data-result-name]").textContent = result.project.name;
    must<HTMLElement>(root, "[data-result-summary]").textContent = summary(report);
    const open = must<HTMLAnchorElement>(root, "[data-open-editor]");
    open.href = welcomeUrl(result.editor_url);
    open.focus();

    const thumb = must<HTMLElement>(root, "[data-result-thumb]");
    const placeholder = h("div", { class: "placeholder-thumb" },
      h("span", { text: (result.project.name.trim()[0] ?? "W").toUpperCase() }));
    if (result.thumbnail_url) {
      const img = h("img", { attrs: { src: result.thumbnail_url, alt: "", referrerpolicy: "no-referrer" } });
      img.addEventListener("error", () => thumb.replaceChildren(placeholder), { once: true });
      thumb.replaceChildren(img);
    } else {
      thumb.replaceChildren(placeholder);
    }

    const details = must<HTMLElement>(root, "[data-result-details]");
    details.replaceChildren(...reportDetails(report));
    details.hidden = details.childElementCount === 0;
  }

  async function choose(file: File | undefined): Promise<void> {
    if (!file || busy) return;
    const token = ++selection;
    const problem = precheck(file, uploadLimit);
    if (problem) { show({ kind: "choose", error: problem }); return; }
    show({ kind: "review", file, message: "Checking the ZIP before upload…", continueLabel: "Upload anyway" });
    must<HTMLButtonElement>(root, "[data-continue]").disabled = true;
    let check: ZipCheck;
    try { check = await inspectZip(await file.arrayBuffer()); }
    catch { check = { kind: "unsure", message: UNSURE }; }
    if (token !== selection) return;
    if (check.kind === "ready") upload(file, null);
    else if (check.kind === "refused") {
      pending = null;
      show({ kind: "error", title: "This ZIP needs a finished website", message: check.message, help: true });
    } else show({ kind: "review", file, message: check.message, continueLabel: check.kind === "warning" ? "Continue with this website" : "Upload anyway" });
  }

  function upload(file: File, folder: string | null): void {
    if (current) return;
    ++selection;
    pending = null;
    const form = new FormData();
    form.append("file", file, file.name);
    const name = nameInput.value.trim();
    if (name) form.append("name", name);
    if (folder !== null) form.append("root", folder);

    const xhr = new XMLHttpRequest();
    current = xhr;
    xhr.open("POST", "/api/imports");
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept", "application/json");
    show({ kind: "uploading", file, percent: 0 });

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || current !== xhr) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      if (percent >= 100) show({ kind: "checking", file });
      else show({ kind: "uploading", file, percent });
    });
    xhr.upload.addEventListener("load", () => {
      if (current === xhr) show({ kind: "checking", file });
    });
    xhr.addEventListener("load", () => {
      if (current !== xhr) return;
      current = null;
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      const next = outcome(xhr.status, body);
      if (next.kind === "signed_out") window.location.assign("/login");
      else if (next.kind === "folders") show({ ...next, file });
      else if (next.kind === "done") {
        show(next);
        const destination = editorDestination(next.result);
        if (destination) window.location.assign(destination);
      } else show(next);
    });
    xhr.addEventListener("error", () => {
      if (current !== xhr) return;
      current = null;
      show({ kind: "error", title: "The upload didn't finish", message: "We couldn't reach Pagehaven. Check your internet connection and try again.", help: false });
    });
    xhr.send(form);
  }

  function reset(): void {
    ++selection;
    pending = null;
    current?.abort();
    current = null;
    fileInput.value = "";
    show({ kind: "choose", error: null });
    fileInput.focus();
  }

  fileInput.addEventListener("change", () => choose(fileInput.files?.[0]));
  must<HTMLButtonElement>(root, "[data-cancel]").addEventListener("click", reset);
  for (const retry of root.querySelectorAll<HTMLButtonElement>("[data-retry]")) retry.addEventListener("click", reset);

  must<HTMLButtonElement>(root, "[data-continue]").addEventListener("click", () => {
    if (pending) upload(pending, null);
  });
  const overlay = must<HTMLElement>(root, "[data-window-drop]");
  const dragLabel = must<HTMLElement>(root, "[data-drag-label]");
  let depth = 0;
  const clearDrag = () => { depth = 0; overlay.hidden = true; };
  window.addEventListener("dragenter", (event) => {
    if (!event.dataTransfer?.types.includes("Files") || busy) return;
    event.preventDefault();
    depth++;
    overlay.hidden = false;
    const types = [...event.dataTransfer.items].filter((item) => item.kind === "file").map((item) => item.type);
    const wrong = types.length > 0 && types.every((type) => type !== "" && !["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(type));
    dragLabel.textContent = wrong ? "That isn't a ZIP" : "Drop your website ZIP anywhere";
  });
  window.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = busy ? "none" : "copy";
  });
  window.addEventListener("dragleave", () => { if (--depth <= 0) clearDrag(); });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    clearDrag();
    void choose(event.dataTransfer?.files[0]);
  });
  window.addEventListener("blur", clearDrag);
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") clearDrag(); });

  show({ kind: "choose", error: null });
}

const root = typeof document === "undefined" ? null : document.querySelector<HTMLElement>("#import");
if (root) boot(root);
