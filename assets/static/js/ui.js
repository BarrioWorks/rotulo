const SVG_NS = "http://www.w3.org/2000/svg";
export function icon(name, extraClass = "") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", `icon ${extraClass}`.trim());
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `/static/img/icons.svg#i-${name}`);
    svg.append(use);
    return svg;
}
/** Builds an element. Text always goes through text nodes, never markup. */
export function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    if (props.class)
        el.className = props.class;
    if (props.text !== undefined)
        el.textContent = props.text;
    if (props.hidden)
        el.hidden = true;
    for (const [k, v] of Object.entries(props.attrs ?? {}))
        el.setAttribute(k, v);
    for (const child of children) {
        if (child === null || child === undefined || child === false)
            continue;
        el.append(child);
    }
    return el;
}
export function must(root, selector) {
    const el = root.querySelector(selector);
    if (!el)
        throw new Error(`Missing element ${selector}`);
    return el;
}
const MAX_TOASTS = 2;
/**
 * Shows a toast. Toasts pause while hovered or focused, and at most two show at once.
 * Returns the action button, so a caller can move focus to it.
 */
export function toast(message, options = {}, ms) {
    const opts = typeof options === "string" ? { kind: options, ...(ms === undefined ? {} : { ms }) } : options;
    const host = document.getElementById("toasts");
    if (!host)
        return null;
    const kind = opts.kind ?? "info";
    const action = opts.action
        ? Object.assign(h("button", { class: "toast-action", text: opts.action.label, attrs: { type: "button" } }), { onclick: () => {
                opts.action?.run();
                leave();
            } })
        : null;
    const el = h("div", { class: kind === "info" ? "toast" : `toast is-${kind}`, attrs: kind === "info" ? {} : { role: "alert" } }, icon(kind === "info" ? "success" : "alert", "icon-sm"), h("span", { text: message }), action);
    host.append(el);
    while (host.children.length > MAX_TOASTS)
        host.firstElementChild?.remove();
    let remaining = opts.ms ?? (action ? 8000 : kind === "info" ? 3600 : 6000);
    let started = Date.now();
    let timer = window.setTimeout(leave, remaining);
    function pause() {
        window.clearTimeout(timer);
        remaining -= Date.now() - started;
    }
    function resume() {
        if (el.matches(":hover, :focus-within"))
            return;
        started = Date.now();
        timer = window.setTimeout(leave, Math.max(1200, remaining));
    }
    function leave() {
        window.clearTimeout(timer);
        el.classList.add("is-leaving");
        window.setTimeout(() => el.remove(), 220);
    }
    el.addEventListener("mouseenter", pause);
    el.addEventListener("focusin", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("focusout", resume);
    return action;
}
let announceTimer = 0;
/** Says something through the page's polite live region (`#editor-announcer`). */
export function announce(message) {
    const region = document.getElementById("editor-announcer");
    if (!region)
        return;
    window.clearTimeout(announceTimer);
    region.textContent = "";
    announceTimer = window.setTimeout(() => {
        region.textContent = message;
    }, 60);
}
/**
 * Tooltips for elements with `data-tip`: after 500 ms on hover, at once on keyboard focus.
 * An optional `data-kbd` adds the shortcut.
 */
export function installTooltips(root = document.body) {
    const tip = h("div", { class: "tooltip", attrs: { role: "tooltip", id: "ed-tooltip" }, hidden: true });
    document.body.append(tip);
    let timer = 0;
    let owner = null;
    const show = (el) => {
        const text = el.dataset["tip"];
        if (!text || !el.isConnected)
            return;
        owner = el;
        const kbd = el.dataset["kbd"];
        tip.replaceChildren(h("span", { text }), ...(kbd ? [h("span", { class: "kbd", text: kbd })] : []));
        tip.hidden = false;
        const r = el.getBoundingClientRect();
        const w = tip.offsetWidth;
        const hgt = tip.offsetHeight;
        let top = r.bottom + 6;
        if (top + hgt > window.innerHeight - 4)
            top = r.top - hgt - 6;
        const left = Math.min(Math.max(4, r.left + r.width / 2 - w / 2), window.innerWidth - w - 4);
        tip.style.left = `${Math.round(left)}px`;
        tip.style.top = `${Math.round(top)}px`;
    };
    const hide = () => {
        window.clearTimeout(timer);
        tip.hidden = true;
        owner = null;
    };
    root.addEventListener("pointerover", (event) => {
        const el = event.target instanceof Element ? event.target.closest("[data-tip]") : null;
        if (el === owner)
            return;
        hide();
        if (el)
            timer = window.setTimeout(() => show(el), 500);
    });
    root.addEventListener("pointerout", (event) => {
        const to = event.relatedTarget instanceof Element ? event.relatedTarget.closest("[data-tip]") : null;
        if (to !== owner)
            hide();
    });
    root.addEventListener("focusin", (event) => {
        const el = event.target instanceof HTMLElement ? event.target.closest("[data-tip]") : null;
        hide();
        if (el && el.matches(":focus-visible"))
            show(el);
    });
    root.addEventListener("focusout", hide);
    root.addEventListener("pointerdown", hide);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !tip.hidden)
            hide();
    });
    window.addEventListener("scroll", hide, true);
}
/** Asks for confirmation with the shared `[data-dialog="confirm"]` dialog. */
export function confirmDialog(options) {
    const dialog = document.querySelector('dialog[data-dialog="confirm"]');
    if (!dialog)
        return Promise.resolve(window.confirm(`${options.title}\n\n${options.text}`));
    must(dialog, "[data-dialog-title]").textContent = options.title;
    must(dialog, "[data-dialog-text]").textContent = options.text;
    const ok = must(dialog, "[data-dialog-ok]");
    ok.textContent = options.ok;
    ok.className = options.danger ? "btn btn-danger" : "btn btn-primary";
    dialog.returnValue = "cancel";
    dialog.showModal();
    (options.danger ? must(dialog, "[data-dialog-cancel]") : ok).focus();
    return new Promise((resolve) => {
        dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    });
}
export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
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
export function timeAgo(iso, now = Date.now()) {
    const then = Date.parse(iso);
    if (!Number.isFinite(then))
        return "";
    const seconds = Math.max(0, Math.round((now - then) / 1000));
    if (seconds < 45)
        return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60)
        return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    const days = Math.round(hours / 24);
    if (days < 30)
        return days === 1 ? "yesterday" : `${days} days ago`;
    return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
export function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} bytes`;
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}
export function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
}
/** "Today, 14:20", "Yesterday, 16:05" or "12 Oct 2026, 09:18" for an ISO date. */
export function dateTime(iso, now = Date.now()) {
    const then = new Date(Date.parse(iso));
    if (Number.isNaN(then.getTime()))
        return "";
    const time = then.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / 86400000);
    if (days === 0)
        return `Today, ${time}`;
    if (days === 1)
        return `Yesterday, ${time}`;
    const date = then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `${date}, ${time}`;
}
