import { arr, lit, obj, opt, str } from "./schema.js";
import { h, icon, must, plural } from "./ui.js";
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
    server_code: "Server code, which a static website can't run",
    secret: "Private files such as passwords or keys, left out to keep them safe",
    archive: "ZIP files inside your ZIP",
    system_junk: "Hidden files your computer adds, like .DS_Store",
    reserved: "Files with names Pagehaven needs for itself",
    source: "Source files only needed to build the website",
    unsupported: "File types a website can't use",
};
const ERROR_TITLES = {
    invalid_archive: "We couldn't import this file",
    too_large: "This website is too big",
    rate_limited: "Too many imports in a short time",
    busy: "Pagehaven is busy right now",
    project_limit: "You've reached your website limit",
};
const root = must(document, "#import");
const MB = 1024 * 1024;
const uploadLimit = Number(root.dataset["uploadMb"] ?? "25") * MB;
const fileInput = must(root, "[data-file-input]");
const nameInput = must(root, "[data-name-input]");
const dropzone = must(root, "[data-dropzone]");
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
    switch (step.kind) {
        case "choose": {
            const box = must(root, "[data-choose-error]");
            box.hidden = step.error === null;
            must(root, "[data-choose-error-text]").textContent = step.error ?? "";
            break;
        }
        case "uploading":
        case "checking": {
            const bar = must(root, "[data-progress-bar]");
            const track = must(root, "[data-progress]");
            const label = must(root, "[data-progress-label]");
            must(root, "[data-progress-file]").textContent = step.file.name;
            const checking = step.kind === "checking";
            track.classList.toggle("is-indeterminate", checking);
            must(root, "[data-cancel]").hidden = checking;
            if (checking) {
                bar.style.width = "";
                track.removeAttribute("aria-valuenow");
                label.textContent = "Checking your website…";
            }
            else {
                bar.style.width = `${step.percent}%`;
                track.setAttribute("aria-valuenow", String(step.percent));
                label.textContent = `Uploading… ${step.percent}%`;
            }
            break;
        }
        case "folders": {
            must(root, "[data-folders-message]").textContent = step.message;
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
    const pageCount = report.pages.length;
    must(root, "[data-result-summary]").textContent =
        `${plural(pageCount, "page", "pages")} ready to edit.`;
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
function listWithMore(items, limit = 5) {
    const shown = items.slice(0, limit).map((item) => h("code", { text: item }));
    const rest = items.length - shown.length;
    return rest > 0 ? [...shown, h("span", { class: "subtle", text: `and ${rest} more` })] : shown;
}
function reportDetails(report) {
    const blocks = [];
    if (report.warnings.length > 0) {
        blocks.push(h("div", {}, h("h3", { text: "Worth knowing" }), h("ul", { class: "result-list" }, ...report.warnings.map((w) => h("li", {}, icon("info", "icon-sm subtle"), h("span", { text: w }))))));
    }
    if (report.missing.length > 0) {
        blocks.push(h("div", {}, h("h3", { text: "Files your pages mention but the ZIP doesn't contain" }), h("p", { class: "small subtle", text: "These pictures or fonts won't show until you add them. Everything else works." }), h("ul", { class: "result-list" }, ...report.missing.slice(0, 8).map((m) => h("li", {}, h("code", { text: m.url }), h("span", { class: "subtle", text: `on ${m.page}` }))), report.missing.length > 8 ? h("li", { class: "subtle", text: `and ${report.missing.length - 8} more` }) : null)));
    }
    if (report.skipped.length > 0) {
        const byReason = new Map();
        for (const s of report.skipped)
            byReason.set(s.reason, [...(byReason.get(s.reason) ?? []), s.path]);
        blocks.push(h("div", {}, h("h3", { text: `${plural(report.skipped.length, "file was", "files were")} left out` }), h("ul", { class: "result-list" }, ...[...byReason].map(([reason, paths]) => h("li", { class: "stack" }, h("span", { text: `${SKIP_WORDS[reason]} (${paths.length})` }), h("span", { class: "row wrap" }, ...listWithMore(paths)))))));
    }
    return blocks;
}
function precheck(file) {
    if (!/\.zip$/i.test(file.name))
        return "That isn't a ZIP file. Choose the .zip file you downloaded for your website.";
    if (file.size === 0)
        return "This file is empty. Try downloading your website again.";
    if (file.size > uploadLimit) {
        return `This file is ${(file.size / MB).toFixed(1)} MB. The most Pagehaven can import is ${uploadLimit / MB} MB.`;
    }
    return null;
}
function choose(file) {
    if (!file)
        return;
    const problem = precheck(file);
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
        finish(xhr, file);
    });
    xhr.addEventListener("error", () => {
        if (current !== xhr)
            return;
        current = null;
        show({ kind: "error", title: "The upload didn't finish", message: "We couldn't reach Pagehaven. Check your internet connection and try again." });
    });
    xhr.send(form);
}
function finish(xhr, file) {
    let body = null;
    try {
        body = JSON.parse(xhr.responseText);
    }
    catch {
        body = null;
    }
    if (xhr.status === 201) {
        const result = parseSuccess(body);
        if (result) {
            show({ kind: "done", result });
            return;
        }
    }
    if (xhr.status === 401) {
        window.location.assign("/login");
        return;
    }
    const error = parseError(body);
    if (error?.error === "choose_folder" && error.folders && error.folders.length > 0) {
        show({ kind: "folders", file, folders: error.folders, message: error.message });
        return;
    }
    show({
        kind: "error",
        title: (error && ERROR_TITLES[error.error]) ?? "We couldn't import this file",
        message: error?.message ?? "Something went wrong on our side. Please try again in a moment.",
    });
}
function reset() {
    current?.abort();
    current = null;
    fileInput.value = "";
    show({ kind: "choose", error: null });
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
