import { isSafeHref, isStyleValue } from "../protocol.js";
import { announce, h, icon, toast } from "../ui.js";
import { api } from "./api.js";
import { pageLabel } from "./pages.js";
import { selection } from "./state.js";
import { classifyHref, relativeHref } from "./links.js";
export const PANEL_TITLES = {
    style: "Text style",
    background: "Background and spacing",
    link: "Link",
    "text-link": "Link the selected words",
    image: "Image",
    page: "Page settings",
};
export const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px", "72px", "96px"];
export const SPACES = ["0", "4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px", "128px"];
const WEIGHTS = [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["800", "Heavy"]];
/** Plain names for swatches, so a screen reader says "dark navy" rather than a hex code. */
const COLOR_NAMES = [
    ["black", 0, 0, 0], ["white", 255, 255, 255], ["dark grey", 34, 37, 41], ["dark grey", 64, 64, 64], ["grey", 128, 128, 128], ["light grey", 211, 211, 211],
    ["off-white", 245, 243, 238], ["dark navy", 20, 30, 70], ["navy", 0, 0, 128], ["blue", 40, 100, 220], ["light blue", 160, 200, 240],
    ["teal", 0, 128, 128], ["green", 40, 150, 70], ["dark green", 20, 80, 40], ["olive", 128, 128, 0], ["yellow", 250, 210, 40],
    ["orange", 240, 140, 30], ["brown", 120, 70, 30], ["red", 210, 40, 40], ["dark red", 120, 20, 20], ["pink", 240, 150, 180],
    ["purple", 120, 60, 170], ["beige", 230, 215, 185],
];
export function colorName(hex) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m)
        return hex;
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x ?? "0", 16));
    let best = COLOR_NAMES[0];
    let bestDistance = Infinity;
    for (const entry of COLOR_NAMES) {
        const d = (entry[1] - r) ** 2 + (entry[2] - g) ** 2 + (entry[3] - b) ** 2;
        if (d < bestDistance) {
            bestDistance = d;
            best = entry;
        }
    }
    return best[0];
}
/** Steps a value to the next larger or smaller step of a scale. */
export function step(scale, current, direction) {
    const px = (v) => (v === "0" ? 0 : parseFloat(v));
    const value = current ? parseFloat(current) || 0 : 0;
    const next = direction > 0 ? scale.find((v) => px(v) > value + 0.5) : [...scale].reverse().find((v) => px(v) < value - 0.5);
    return next ?? (direction > 0 ? scale[scale.length - 1] : scale[0]) ?? "0";
}
function field(label, control, hint) {
    return h("div", { class: "field" }, h("span", { class: "label", text: label }), control, hint ? h("span", { class: "hint", text: hint }) : null);
}
function group(title, ...children) {
    return h("section", { class: "rail-group", attrs: { "aria-label": title } }, h("h3", { class: "rail-group-title", text: title }), ...children);
}
function swatches(ctx, keyPrefix, current, onPick) {
    const site = ctx.store.get().palette;
    const colors = [...new Set([...site, "#ffffff", "#000000"])].slice(0, 12);
    const row = h("div", { class: "swatches", attrs: { role: "group", "aria-label": "Colours" } });
    colors.forEach((color, i) => {
        const name = site.includes(color) ? `Site colour ${i + 1}, ${colorName(color)}` : colorName(color);
        const s = h("button", { class: "swatch", attrs: { type: "button", "data-key": `${keyPrefix}:${color}`, "aria-label": name, "data-tip": name, "aria-pressed": String(current?.toLowerCase() === color) } });
        s.style.background = color;
        s.addEventListener("click", () => onPick(color));
        row.append(s);
    });
    const custom = h("input", { class: "color-input", attrs: { type: "color", "data-key": `${keyPrefix}:custom`, "aria-label": "Pick any colour", "data-tip": "Pick any colour" } });
    custom.value = current && /^#[0-9a-f]{6}$/i.test(current) ? current : "#000000";
    custom.addEventListener("change", () => onPick(custom.value));
    const reset = h("button", { class: "btn btn-ghost btn-sm", text: "Original", attrs: { type: "button", "data-key": `${keyPrefix}:reset`, "data-tip": "Back to the website's own colour" } });
    reset.addEventListener("click", () => onPick(null));
    row.append(custom, reset);
    return row;
}
function stepper(key, label, value, onStep, onReset, words = ["Less", "More"]) {
    const less = h("button", { class: "btn btn-secondary btn-sm", text: words[0], attrs: { type: "button", "data-key": `${key}:less`, "aria-label": `${words[0]} ${label.toLowerCase()}` } });
    const more = h("button", { class: "btn btn-secondary btn-sm", text: words[1], attrs: { type: "button", "data-key": `${key}:more`, "aria-label": `${words[1]} ${label.toLowerCase()}` } });
    const reset = h("button", { class: "link-btn rail-reset", text: "Original", attrs: { type: "button", "data-key": `${key}:reset`, "aria-label": `${label}: back to the original` } });
    less.addEventListener("click", () => onStep(-1));
    more.addEventListener("click", () => onStep(1));
    reset.addEventListener("click", onReset);
    return h("div", { class: "field" }, h("div", { class: "label-row" }, h("span", { class: "label", text: label }), reset), h("div", { class: "stepper" }, less, h("output", { class: "stepper-value tnum", text: value, attrs: { "aria-live": "polite" } }), more));
}
function px(value) {
    if (!value)
        return "Original";
    const n = parseFloat(value);
    return Number.isFinite(n) ? `${Math.round(n)} px` : value;
}
/* Text style */
function stylePanel(ctx, sel) {
    const st = sel.info.styles;
    const set = (styles) => void ctx.edits.setStyle(sel, styles);
    const pick = (key) => (value) => {
        if (value !== null && !isStyleValue(key, value))
            return;
        set({ [key]: value });
    };
    const weight = h("select", { class: "select input-sm", attrs: { id: "rail-weight", "data-key": "weight" } }, h("option", { text: "Original", attrs: { value: "" } }), ...WEIGHTS.map(([value, text]) => h("option", { text, attrs: { value } })));
    weight.value = WEIGHTS.some(([v]) => v === st["font-weight"]) ? st["font-weight"] : "";
    weight.addEventListener("change", () => pick("font-weight")(weight.value || null));
    const align = h("div", { class: "seg seg-icon", attrs: { role: "group", "aria-label": "Alignment" } }, ...["left", "center", "right"].map((a) => {
        const pressed = st["text-align"] === a || (a === "left" && (st["text-align"] === "start" || st["text-align"] === "justify"));
        const b = h("button", { attrs: { type: "button", "data-key": `align:${a}`, "aria-label": `Align ${a}`, "data-tip": `Align ${a}`, "aria-pressed": String(pressed) } }, icon(`align-${a}`, "icon-sm"));
        b.addEventListener("click", () => set({ "text-align": a }));
        return b;
    }));
    const reset = h("button", { class: "btn btn-ghost btn-sm", text: "Reset text style", attrs: { type: "button", "data-key": "reset-text" } });
    reset.addEventListener("click", () => set({ color: null, "font-size": null, "font-weight": null, "text-align": null }));
    return h("div", { class: "rail-panel-body" }, group("Colour", swatches(ctx, "color", st.color, pick("color"))), group("Size and weight", stepper("size", "Size", px(st["font-size"]), (d) => set({ "font-size": step(SIZES, st["font-size"], d) }), () => set({ "font-size": null }), ["Smaller", "Larger"]), h("label", { class: "field", attrs: { for: "rail-weight" } }, h("span", { class: "label", text: "Weight" }), weight)), group("Alignment", align), h("div", { class: "rail-actions" }, reset));
}
/* Background and spacing */
function backgroundPanel(ctx, sel) {
    const st = sel.info.styles;
    const set = (styles) => void ctx.edits.setStyle(sel, styles);
    const norm = (v) => (v === "0px" ? "0" : v);
    const body = h("div", { class: "rail-panel-body" });
    if (sel.can.includes("s")) {
        body.append(group("Background colour", swatches(ctx, "bg", st["background-color"], (v) => set({ "background-color": v }))));
    }
    if (sel.can.includes("b")) {
        const replace = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button", "data-key": "bg-photo" } }, icon("replace-image", "icon-sm"), h("span", { text: sel.info.bgImage ? "Replace photo" : "Add a photo" }));
        replace.addEventListener("click", async () => {
            const file = await ctx.edits.chooseImage();
            if (!file)
                return;
            replace.setAttribute("aria-busy", "true");
            await ctx.edits.replaceBackground(sel, file, () => { });
            replace.removeAttribute("aria-busy");
        });
        body.append(group("Background photo", h("p", { class: "hint", text: sel.info.bgImage ? "This part shows a photo behind its content." : "Show a photo behind this part." }), h("div", { class: "rail-actions" }, replace)));
    }
    if (sel.can.includes("s")) {
        const padding = st["padding-top"] === st["padding-bottom"] ? st["padding-top"] : undefined;
        body.append(group("Spacing", stepper("space-above", "Space above", px(norm(st["margin-top"])), (d) => set({ "margin-top": step(SPACES, st["margin-top"], d) }), () => set({ "margin-top": null })), stepper("space-below", "Space below", px(norm(st["margin-bottom"])), (d) => set({ "margin-bottom": step(SPACES, st["margin-bottom"], d) }), () => set({ "margin-bottom": null })), stepper("space-inside", "Space inside", px(norm(padding)), (d) => {
            const v = step(SPACES, padding, d);
            set({ "padding-top": v, "padding-bottom": v, "padding-left": v, "padding-right": v });
        }, () => set({ "padding-top": null, "padding-bottom": null, "padding-left": null, "padding-right": null }))));
    }
    return body;
}
const DESTINATIONS = [
    ["page", "A page on this website"],
    ["anchor", "A part of this page"],
    ["web", "A web address"],
    ["email", "An email address"],
    ["phone", "A phone number"],
];
function linkForm(ctx, initialHref, opts) {
    const s = ctx.store.get();
    const pages = s.pages.map((p) => p.path);
    const initial = classifyHref(initialHref, s.path, pages);
    const anchors = s.anchors;
    let kind = initial.kind === "empty" ? (pages.length > 1 ? "page" : "web") : initial.kind;
    if (kind === "anchor" && anchors.length === 0 && initial.kind !== "anchor")
        kind = "web";
    const typeSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-type", "data-key": "link-type", "data-autofocus": "" } }, ...DESTINATIONS.filter(([d]) => d !== "anchor" || anchors.length > 0 || initial.kind === "anchor").map(([value, text]) => h("option", { text, attrs: { value } })));
    typeSelect.value = kind;
    const pageSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-page", "data-key": "link-page" } }, ...s.pages.map((p) => h("option", { text: pageLabel(p, s.project.name), attrs: { value: p.path } })));
    if (initial.kind === "page")
        pageSelect.value = initial.path;
    const anchorSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-anchor", "data-key": "link-anchor" } }, h("option", { text: "Top of the page", attrs: { value: "" } }), ...anchors.map((a) => h("option", { text: a.name, attrs: { value: a.id } })));
    if (initial.kind === "anchor") {
        if (initial.id && !anchors.some((a) => a.id === initial.id))
            anchorSelect.append(h("option", { text: `#${initial.id}`, attrs: { value: initial.id } }));
        anchorSelect.value = initial.id;
    }
    const input = (id, type, placeholder, value) => {
        const el = h("input", { class: "input input-sm", attrs: { id, type, placeholder, spellcheck: "false", autocomplete: "off", "data-key": id, "aria-describedby": "rail-link-error" } });
        el.value = value;
        return el;
    };
    const web = input("rail-link-web", "text", "https://example.com", initial.kind === "web" ? initialHref : "");
    web.setAttribute("inputmode", "url");
    const email = input("rail-link-email", "email", "name@example.com", initial.kind === "email" ? initialHref.replace(/^mailto:/i, "") : "");
    const phone = input("rail-link-phone", "tel", "+44 20 1234 5678", initial.kind === "phone" ? initialHref.replace(/^tel:/i, "") : "");
    const newTab = h("input", { attrs: { type: "checkbox", "data-key": "link-new-tab" } });
    newTab.checked = opts.newTab ?? false;
    const newTabRow = opts.newTab === null ? null : h("label", { class: "switch" }, newTab, h("span", { class: "switch-track", attrs: { "aria-hidden": "true" } }), h("span", { text: "Open in a new tab" }));
    const error = h("p", { class: "field-error", attrs: { id: "rail-link-error", role: "alert" }, hidden: true });
    const goTo = h("button", { class: "link-btn", text: "Open this page in the editor", attrs: { type: "button", "data-key": "link-go" } });
    goTo.addEventListener("click", () => ctx.canvas.open(pageSelect.value));
    const rows = {
        page: h("div", { class: "stack" }, h("label", { class: "field", attrs: { for: "rail-link-page" } }, h("span", { class: "label", text: "Page" }), pageSelect), goTo),
        anchor: h("label", { class: "field", attrs: { for: "rail-link-anchor" } }, h("span", { class: "label", text: "Part of this page" }), anchorSelect),
        web: h("div", { class: "stack" }, h("label", { class: "field", attrs: { for: "rail-link-web" } }, h("span", { class: "label", text: "Web address" }), web), newTabRow),
        email: h("label", { class: "field", attrs: { for: "rail-link-email" } }, h("span", { class: "label", text: "Email address" }), email),
        phone: h("label", { class: "field", attrs: { for: "rail-link-phone" } }, h("span", { class: "label", text: "Phone number" }), phone),
    };
    function sync() {
        kind = typeSelect.value;
        for (const [d, row] of Object.entries(rows))
            row.hidden = d !== kind;
        goTo.hidden = pageSelect.value === s.path;
        error.hidden = true;
        for (const el of [web, email, phone])
            el.removeAttribute("aria-invalid");
    }
    typeSelect.addEventListener("change", sync);
    pageSelect.addEventListener("change", sync);
    sync();
    function href() {
        switch (kind) {
            case "page": {
                const hash = initial.kind === "page" && initial.path === pageSelect.value ? initial.hash : "";
                return relativeHref(s.path, pageSelect.value) + hash;
            }
            case "anchor":
                return `#${anchorSelect.value}`;
            case "email":
                return email.value.trim() ? `mailto:${email.value.trim()}` : "";
            case "phone":
                return phone.value.trim() ? `tel:${phone.value.trim().replace(/[^\d+]/g, "")}` : "";
            case "web": {
                const value = web.value.trim();
                return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(value) && !value.includes("@") ? `https://${value}` : value;
            }
        }
    }
    function showError(message) {
        error.textContent = message;
        error.hidden = false;
        const fieldEl = kind === "web" ? web : kind === "email" ? email : kind === "phone" ? phone : null;
        fieldEl?.setAttribute("aria-invalid", "true");
        fieldEl?.focus();
    }
    const submit = h("button", { class: "btn btn-secondary btn-sm", text: opts.submitLabel, attrs: { type: "submit", "data-key": "link-save" } });
    const form = h("form", { class: "rail-panel-body", attrs: { novalidate: "" } }, h("label", { class: "field", attrs: { for: "rail-link-type" } }, h("span", { class: "label", text: "Goes to" }), typeSelect), ...Object.values(rows), error, h("div", { class: "rail-actions" }, submit));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = href();
        if (!value || !isSafeHref(value)) {
            showError(kind === "email" ? "Type an email address, like name@example.com." : kind === "phone" ? "Type a phone number." : "That link can't be used. Use a web address starting with https://, an email address, a phone number or a page of this website.");
            return;
        }
        opts.onSubmit(value, newTab.checked, showError);
    });
    return form;
}
function linkPanel(ctx, sel) {
    return linkForm(ctx, sel.info.href ?? "", {
        newTab: sel.info.newTab,
        submitLabel: "Save link",
        onSubmit(href, newTab, showError) {
            const { store, canvas, change } = ctx;
            const page = store.get().path;
            canvas.send({ type: "preview_link", element: sel.element, href, newTab: kindIsWeb(href) && newTab });
            void change((base) => api.edit(store.get().project.pid, base, page, { op: "set_link", element: sel.element, href, new_tab: kindIsWeb(href) && newTab }), {
                page,
                toastRejection: false,
                onRejected: (error) => {
                    showError(error.message);
                    canvas.reload(sel.element);
                },
            }).then((ok) => {
                if (!ok)
                    return;
                announce("Link saved");
                toast("Link saved");
                ctx.close();
            });
        },
    });
}
function kindIsWeb(href) {
    return /^https?:/i.test(href);
}
function textLinkPanel(ctx) {
    return linkForm(ctx, "", {
        newTab: null,
        submitLabel: "Add link",
        onSubmit(href) {
            ctx.canvas.frame().focus();
            ctx.canvas.send({ type: "format", command: "link", href });
            ctx.store.dispatch({ type: "close_panel" });
        },
    });
}
/* Images */
/** Shows a thumbnail only for pictures served by the preview itself. */
function previewImage(src, origin) {
    if (!src)
        return null;
    try {
        const url = new URL(src);
        return url.origin === origin ? url.href : null;
    }
    catch {
        return null;
    }
}
function imagePanel(ctx, sel) {
    const body = h("div", { class: "rail-panel-body" });
    if (ctx.replaced) {
        const undo = h("button", { class: "link-btn", text: "Undo", attrs: { type: "button", "data-key": "undo-replace" } });
        undo.addEventListener("click", () => ctx.edits.undo());
        body.append(h("div", { class: "alert alert-success", attrs: { tabindex: "-1", "data-replaced": "", "data-key": "replaced", role: "status" } }, icon("success", "icon-sm"), h("span", { class: "grow", text: "Picture replaced." }), undo));
    }
    const image = sel.info.image;
    const src = previewImage(sel.info.src, ctx.store.get().previewOrigin);
    if (src) {
        const thumb = h("img", { class: "rail-thumb", attrs: { src, alt: "", referrerpolicy: "no-referrer" } });
        body.append(h("figure", { class: "rail-figure" }, thumb, image ? h("figcaption", { class: "hint", text: `Shown at ${image.width} × ${image.height}. The file is ${image.naturalWidth} × ${image.naturalHeight}.` }) : null));
        if (image && image.width > 0 && image.height > 0 && image.naturalWidth > 0 && image.naturalHeight > 0) {
            const shown = image.width / image.height;
            const file = image.naturalWidth / image.naturalHeight;
            if (Math.abs(shown - file) / file > 0.2)
                body.append(h("p", { class: "hint", text: "This picture is a different shape from its space, so the website may crop or stretch it." }));
        }
    }
    const replace = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button", "data-key": "replace" } }, icon("replace-image", "icon-sm"), h("span", { text: "Choose a picture" }));
    const status = h("span", { class: "hint", attrs: { "aria-live": "polite" } });
    async function useFile(file) {
        replace.setAttribute("aria-busy", "true");
        const ok = await ctx.edits.replaceImage(sel, file, (f) => {
            status.textContent = `Uploading ${Math.round(f * 100)}%`;
        });
        replace.removeAttribute("aria-busy");
        status.textContent = "";
        if (ok)
            ctx.store.dispatch({ type: "open_panel", panel: "image", replaced: true });
    }
    replace.addEventListener("click", async () => {
        const file = await ctx.edits.chooseImage();
        if (file)
            await useFile(file);
    });
    const drop = h("div", { class: "rail-drop" }, replace, h("span", { class: "hint", text: "or drop a picture here. PNG, JPEG, GIF, WebP or AVIF." }), status);
    drop.addEventListener("dragover", (event) => {
        event.preventDefault();
        drop.classList.add("is-over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
    drop.addEventListener("drop", (event) => {
        event.preventDefault();
        drop.classList.remove("is-over");
        const file = event.dataTransfer?.files[0];
        if (file && ctx.edits.checkImage(file))
            void useFile(file);
    });
    body.append(group("Replace", drop));
    const area = h("textarea", { class: "textarea", attrs: { id: "rail-alt", rows: "3", maxlength: "1000", "data-key": "alt", placeholder: "For example: Fresh sourdough loaves on a wooden table", ...(ctx.replaced ? {} : { "data-autofocus": "" }) } });
    const original = sel.info.alt ?? "";
    area.value = original;
    const save = h("button", { class: "btn btn-secondary btn-sm", text: "Save description", attrs: { type: "submit", "data-key": "alt-save" } });
    const form = h("form", { class: "stack" }, h("div", { class: "label-row" }, h("label", { class: "label", text: ctx.replaced ? "Describe the new picture" : "Describe this picture", attrs: { for: "rail-alt" } }), original.trim() ? null : h("span", { class: "pill pill-changes pill-plain", text: "Recommended" })), area, h("span", { class: "hint", text: "Helps people who can't see the picture, and search engines." }), h("div", { class: "rail-actions" }, save));
    let saved = original;
    const submit = () => {
        const alt = area.value.trim();
        if (alt === saved.trim())
            return;
        saved = alt;
        ctx.canvas.send({ type: "preview_alt", element: sel.element, alt });
        void ctx.edits.save({ op: "set_alt", element: sel.element, alt }).then((ok) => {
            if (ok) {
                announce("Description saved");
                toast("Description saved");
            }
        });
    };
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        submit();
    });
    area.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
        }
    });
    area.addEventListener("blur", submit);
    body.append(group("Description", form));
    return body;
}
/* Page settings */
function pagePanel(ctx) {
    const s = ctx.store.get();
    const title = h("input", { class: "input input-sm", attrs: { id: "rail-meta-title", type: "text", maxlength: "200", "data-key": "meta-title", "data-autofocus": "" } });
    title.value = s.pageMeta.title;
    const description = h("textarea", { class: "textarea", attrs: { id: "rail-meta-description", rows: "4", maxlength: "500", "data-key": "meta-description" } });
    description.value = s.pageMeta.description;
    const form = h("form", { class: "rail-panel-body" }, h("p", { class: "hint", text: "Shown in search results and in the browser tab." }), h("label", { class: "field", attrs: { for: "rail-meta-title" } }, h("span", { class: "label", text: "Page title" }), title), h("label", { class: "field", attrs: { for: "rail-meta-description" } }, h("span", { class: "label", text: "Description" }), description), h("div", { class: "rail-actions" }, h("button", { class: "btn btn-secondary btn-sm", text: "Save page settings", attrs: { type: "submit", "data-key": "meta-save" } })));
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const titleValue = title.value.trim();
        const descriptionValue = description.value.trim();
        const page = ctx.store.get().path;
        const result = await ctx.change((base) => api.edit(ctx.store.get().project.pid, base, page, { op: "set_page_meta", title: titleValue, description: descriptionValue }), { page });
        if (result) {
            ctx.store.dispatch({ type: "page_meta", title: titleValue, description: descriptionValue });
            announce("Page settings saved");
            toast("Page settings saved");
        }
    });
    return form;
}
export function renderPanel(panel, ctx) {
    const sel = selection(ctx.store.get());
    if (panel === "page")
        return pagePanel(ctx);
    if (panel === "text-link")
        return textLinkPanel(ctx);
    if (!sel)
        return h("div", { class: "rail-panel-body" }, field("Nothing selected", h("p", { class: "hint", text: "Click a part of the page." })));
    switch (panel) {
        case "style": return stylePanel(ctx, sel);
        case "background": return backgroundPanel(ctx, sel);
        case "link": return linkPanel(ctx, sel);
        case "image": return imagePanel(ctx, sel);
    }
}
