import { arr, lit, obj, opt, str } from "./schema.js";
import { formatBytes, h, icon, must, plural } from "./ui.js";
const skipReason = lit("server_code", "secret", "archive", "system_junk", "reserved", "source", "unsupported");
const parseReport = obj({
    pages: arr(str(1024)),
    skipped: arr(obj({ path: str(1024), reason: skipReason })),
    missing: arr(obj({ page: str(1024), url: str(2048) })),
    warnings: arr(str(1000)),
});
const parseSuccess = obj({
    project: obj({ pid: str(64), name: str(200) }),
    editor_url: str(2048, /^\/[^/\\]/),
    report: parseReport,
    thumbnail_url: opt(str(2048)),
});
const parseError = obj({ error: str(64), message: str(1000), folders: opt(arr(str(255), 50)) });
const SKIP_WORDS = {
    server_code: "Server code, which a website on Pagehaven can't run",
    secret: "Private files such as passwords or keys, left out to keep them safe",
    archive: "ZIP files inside your ZIP",
    system_junk: "Hidden files your computer adds, like .DS_Store",
    reserved: "Files with names Pagehaven needs for itself",
    source: "Files only needed to build the website",
    unsupported: "File types a website can't use",
};
const ERROR_TITLES = {
    invalid_archive: "This ZIP isn't a website Pagehaven can use",
    too_large: "This website is too big",
    rate_limited: "Too many imports in a short time",
    busy: "Pagehaven is busy right now",
    project_limit: "You've reached your website limit",
};
const MB = 1024 * 1024;
/** A problem we can see before uploading, or null when the file looks like a ZIP Pagehaven can take. */
export function precheck(file, limitBytes) {
    if (!/\.zip$/i.test(file.name))
        return "That isn't a ZIP file. Choose the .zip file you downloaded for your website.";
    if (file.size === 0)
        return "This file is empty. Try downloading your website again.";
    if (file.size > limitBytes) {
        return `This file is ${(file.size / MB).toFixed(1)} MB. The most Pagehaven can import is ${limitBytes / MB} MB.`;
    }
    return null;
}
/** Maps the server's answer to what the page shows. The server's message is shown as it is. */
export function outcome(status, body) {
    if (status === 201) {
        const result = parseSuccess(body);
        if (result)
            return { kind: "done", result };
    }
    if (status === 401)
        return { kind: "signed_out" };
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
export function summary(report) {
    const ready = `${plural(report.pages.length, "page", "pages")} imported.`;
    if (report.skipped.length === 0)
        return ready;
    return `${ready} We left out ${plural(report.skipped.length, "file", "files")} your website doesn't need.`;
}
function listWithMore(items, limit = 5) {
    const shown = items.slice(0, limit).map((item) => h("code", { text: item }));
    const rest = items.length - shown.length;
    return rest > 0 ? [...shown, h("span", { class: "subtle", text: `and ${rest} more` })] : shown;
}
function reportDetails(report) {
    const blocks = [];
    if (report.warnings.length > 0) {
        blocks.push(h("div", { class: "report-block" }, h("h3", { text: "Worth knowing" }), h("ul", { class: "result-list" }, ...report.warnings.map((w) => h("li", {}, icon("info", "icon-sm subtle"), h("span", { text: w }))))));
    }
    if (report.missing.length > 0) {
        blocks.push(h("div", { class: "report-block" }, h("h3", { text: `${plural(report.missing.length, "file is", "files are")} missing from the ZIP` }), h("p", { class: "small muted", text: "Your pages mention these pictures or fonts, but the ZIP doesn't include them. They won't show until you add them. Everything else works." }), h("ul", { class: "result-list" }, ...report.missing.slice(0, 8).map((m) => h("li", {}, h("code", { text: m.url }), h("span", { class: "subtle", text: `on ${m.page}` }))), report.missing.length > 8 ? h("li", { class: "subtle", text: `and ${report.missing.length - 8} more` }) : null)));
    }
    if (report.skipped.length > 0) {
        const byReason = new Map();
        for (const s of report.skipped)
            byReason.set(s.reason, [...(byReason.get(s.reason) ?? []), s.path]);
        blocks.push(h("details", { class: "disclosure report-skipped" }, h("summary", {}, icon("chevron-right", "icon-sm"), h("span", { text: "Show details" })), h("p", { class: "small muted", text: `${plural(report.skipped.length, "file was", "files were")} left out:` }), h("ul", { class: "result-list" }, ...[...byReason].map(([reason, paths]) => h("li", { class: "stack" }, h("span", { text: `${SKIP_WORDS[reason]} (${paths.length})` }), h("span", { class: "row wrap" }, ...listWithMore(paths)))))));
    }
    return blocks;
}
function boot(root) {
    const uploadLimit = Number(root.dataset["uploadMb"] ?? "25") * MB;
    const fileInput = must(root, "[data-file-input]");
    const nameInput = must(root, "[data-name-input]");
    const dropzone = must(root, "[data-dropzone]");
    const helpSlot = must(root, "[data-help-slot]");
    const help = must(root, "[data-export-help]");
    const sections = {
        choose: must(root, '[data-step="choose"]'),
        progress: must(root, '[data-step="progress"]'),
        folders: must(root, '[data-step="folders"]'),
        error: must(root, '[data-step="error"]'),
        done: must(root, '[data-step="done"]'),
    };
    let current = null;
    function show(step) {
        const visible = step.kind === "uploading" || step.kind === "checking" ? "progress" : step.kind;
        for (const [key, el] of Object.entries(sections))
            el.hidden = key !== visible;
        helpSlot.hidden = step.kind !== "choose" && step.kind !== "error";
        switch (step.kind) {
            case "choose": {
                must(root, "[data-choose-error]").hidden = step.error === null;
                must(root, "[data-choose-error-text]").textContent = step.error ?? "";
                dropzone.classList.toggle("has-error", step.error !== null);
                break;
            }
            case "uploading":
            case "checking": {
                const bar = must(root, "[data-progress-bar]");
                const track = must(root, "[data-progress]");
                const label = must(root, "[data-progress-label]");
                must(root, "[data-progress-file]").textContent = step.file.name;
                must(root, "[data-progress-size]").textContent = formatBytes(step.file.size);
                const checking = step.kind === "checking";
                track.classList.toggle("is-indeterminate", checking);
                must(root, "[data-cancel]").hidden = checking;
                must(root, "[data-progress-note]").hidden = !checking;
                if (checking) {
                    bar.style.width = "";
                    track.removeAttribute("aria-valuenow");
                    label.textContent = "Checking your files…";
                }
                else {
                    bar.style.width = `${step.percent}%`;
                    track.setAttribute("aria-valuenow", String(step.percent));
                    label.textContent = `Uploading… ${step.percent}%`;
                }
                break;
            }
            case "folders": {
                must(root, "[data-folders-message]").textContent =
                    "Your ZIP has more than one folder with a website in it. Choose the one visitors should see.";
                const list = must(root, "[data-folder-list]");
                list.replaceChildren(...step.folders.map((folder) => {
                    const button = h("button", { class: "folder-option", attrs: { type: "button" } }, icon("folder"), h("span", { class: "grow truncate", text: folder }), icon("chevron-right", "icon-sm subtle"));
                    button.addEventListener("click", () => upload(step.file, folder));
                    return button;
                }));
                list.querySelector("button")?.focus();
                break;
            }
            case "error":
                must(root, "[data-error-title]").textContent = step.title;
                must(root, "[data-error-message]").textContent = step.message;
                help.open = step.help;
                must(sections.error, "[data-retry]").focus();
                break;
            case "done":
                renderResult(step.result);
                break;
        }
    }
    function renderResult(result) {
        const { report } = result;
        must(root, "[data-result-name]").textContent = result.project.name;
        must(root, "[data-result-summary]").textContent = summary(report);
        const open = must(root, "[data-open-editor]");
        open.href = result.editor_url;
        open.focus();
        const thumb = must(root, "[data-result-thumb]");
        const placeholder = h("div", { class: "placeholder-thumb" }, h("span", { text: (result.project.name.trim()[0] ?? "W").toUpperCase() }));
        if (result.thumbnail_url) {
            const img = h("img", { attrs: { src: result.thumbnail_url, alt: "", referrerpolicy: "no-referrer" } });
            img.addEventListener("error", () => thumb.replaceChildren(placeholder), { once: true });
            thumb.replaceChildren(img);
        }
        else {
            thumb.replaceChildren(placeholder);
        }
        const details = must(root, "[data-result-details]");
        details.replaceChildren(...reportDetails(report));
        details.hidden = details.childElementCount === 0;
    }
    function choose(file) {
        if (!file)
            return;
        const problem = precheck(file, uploadLimit);
        if (problem) {
            show({ kind: "choose", error: problem });
            return;
        }
        upload(file, null);
    }
    function upload(file, folder) {
        const form = new FormData();
        form.append("file", file, file.name);
        const name = nameInput.value.trim();
        if (name)
            form.append("name", name);
        if (folder !== null)
            form.append("root", folder);
        const xhr = new XMLHttpRequest();
        current = xhr;
        xhr.open("POST", "/api/imports");
        xhr.responseType = "text";
        xhr.setRequestHeader("Accept", "application/json");
        show({ kind: "uploading", file, percent: 0 });
        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable || current !== xhr)
                return;
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
            if (percent >= 100)
                show({ kind: "checking", file });
            else
                show({ kind: "uploading", file, percent });
        });
        xhr.upload.addEventListener("load", () => {
            if (current === xhr)
                show({ kind: "checking", file });
        });
        xhr.addEventListener("load", () => {
            if (current !== xhr)
                return;
            current = null;
            let body = null;
            try {
                body = JSON.parse(xhr.responseText);
            }
            catch {
                body = null;
            }
            const next = outcome(xhr.status, body);
            if (next.kind === "signed_out")
                window.location.assign("/login");
            else if (next.kind === "folders")
                show({ ...next, file });
            else
                show(next);
        });
        xhr.addEventListener("error", () => {
            if (current !== xhr)
                return;
            current = null;
            show({ kind: "error", title: "The upload didn't finish", message: "We couldn't reach Pagehaven. Check your internet connection and try again.", help: false });
        });
        xhr.send(form);
    }
    function reset() {
        current?.abort();
        current = null;
        fileInput.value = "";
        show({ kind: "choose", error: null });
        fileInput.focus();
    }
    fileInput.addEventListener("change", () => choose(fileInput.files?.[0]));
    must(root, "[data-cancel]").addEventListener("click", reset);
    for (const retry of root.querySelectorAll("[data-retry]"))
        retry.addEventListener("click", reset);
    let depth = 0;
    dropzone.addEventListener("dragenter", (event) => {
        event.preventDefault();
        depth += 1;
        dropzone.classList.add("is-over");
    });
    dropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer)
            event.dataTransfer.dropEffect = "copy";
    });
    dropzone.addEventListener("dragleave", () => {
        depth = Math.max(0, depth - 1);
        if (depth === 0)
            dropzone.classList.remove("is-over");
    });
    dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        depth = 0;
        dropzone.classList.remove("is-over");
        choose(event.dataTransfer?.files[0]);
    });
    window.addEventListener("dragover", (event) => event.preventDefault());
    window.addEventListener("drop", (event) => event.preventDefault());
    show({ kind: "choose", error: null });
}
const root = typeof document === "undefined" ? null : document.querySelector("#import");
if (root)
    boot(root);
