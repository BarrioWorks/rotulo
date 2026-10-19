import { must } from "../ui.js";
import { openMenu } from "./menu.js";
import { pageLabel } from "./pages.js";
import { changed, siteState, statusPill } from "./state.js";
const SAVING_DELAY_MS = 400;
function sentence(label) {
    return label.charAt(0).toUpperCase() + label.slice(1);
}
export function createTopBar({ store, canvas, rail, publishing, undo, redo }) {
    const undoBtn = must(document, '[data-action="undo"]');
    const redoBtn = must(document, '[data-action="redo"]');
    const pill = must(document, "[data-status-pill]");
    const pillText = must(pill, "[data-status-text]");
    const publishBtn = must(document, '[data-action="publish"]');
    const siteButton = must(document, "[data-site-menu]");
    const siteName = must(document, "[data-site-name]");
    const pageButton = must(document, "[data-page-switcher]");
    const pageName = must(document, "[data-page-name]");
    const modeButtons = [...document.querySelectorAll("[data-mode]")];
    const deviceButtons = [...document.querySelectorAll("[data-device]")];
    let savingVisible = false;
    let savingTimer = 0;
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);
    for (const b of modeButtons)
        b.addEventListener("click", () => store.dispatch({ type: "mode", mode: b.dataset["mode"] }));
    for (const b of deviceButtons)
        b.addEventListener("click", () => store.dispatch({ type: "device", device: b.dataset["device"] }));
    pill.addEventListener("click", () => publishing.openReview(pill));
    publishBtn.addEventListener("click", () => publishing.openReview(publishBtn));
    siteButton.addEventListener("click", () => {
        const s = store.get();
        const items = [
            { label: "Website settings", icon: "domain", run: () => publishing.openSettings(siteButton) },
            { label: "Version history", run: () => publishing.openHistory(siteButton) },
        ];
        if (s.project.live_release)
            items.push({ label: "View website", icon: "view-live", run: () => window.open(s.project.site_url, "_blank", "noopener,noreferrer") });
        items.push("separator", { label: "Keyboard shortcuts", detail: "?", run: () => document.querySelector('dialog[data-dialog="shortcuts"]')?.showModal() });
        openMenu(siteButton, items, { label: "Website" });
    });
    function openPages() {
        const s = store.get();
        if (!canvas)
            return;
        openMenu(pageButton, [
            ...s.pages.map((p) => ({
                label: pageLabel(p, s.project.name),
                detail: `/${p.path}`,
                checked: p.path === s.path,
                run: () => {
                    if (store.get().path !== p.path)
                        canvas.open(p.path);
                },
            })),
            "separator",
            { label: "Add page…", icon: "add-page", run: () => rail?.openAddPage() },
        ], { label: "Pages" });
    }
    pageButton.addEventListener("click", openPages);
    function renderPill() {
        const s = store.get();
        const view = statusPill(s, savingVisible);
        pill.dataset["tone"] = view.tone;
        pill.setAttribute("aria-busy", String(view.busy));
        pillText.textContent = view.text;
        const saved = s.saves.savedAt ? `Saved ${new Date(s.saves.savedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}. ` : "Changes save automatically. ";
        pill.dataset["tip"] = `${saved}Click for publishing and versions.`;
        pill.setAttribute("aria-label", `${view.text}. Publishing and versions`);
    }
    store.subscribe((s, prev) => {
        if (changed(s, prev, "history")) {
            undoBtn.disabled = !s.history.can_undo;
            redoBtn.disabled = !s.history.can_redo;
            const undoLabel = s.history.undo_label ? `Undo: ${sentence(s.history.undo_label)}` : "Undo";
            const redoLabel = s.history.redo_label ? `Redo: ${sentence(s.history.redo_label)}` : "Redo";
            undoBtn.setAttribute("aria-label", undoLabel);
            redoBtn.setAttribute("aria-label", redoLabel);
            undoBtn.dataset["tip"] = undoLabel;
            redoBtn.dataset["tip"] = redoLabel;
        }
        if (changed(s, prev, "saves")) {
            const pending = s.saves.pending > 0;
            if (pending && !savingVisible && !savingTimer) {
                savingTimer = window.setTimeout(() => {
                    savingTimer = 0;
                    savingVisible = store.get().saves.pending > 0;
                    renderPill();
                }, SAVING_DELAY_MS);
            }
            else if (!pending) {
                window.clearTimeout(savingTimer);
                savingTimer = 0;
                savingVisible = false;
            }
        }
        if (changed(s, prev, "saves", "project", "draftChanged", "changes", "releases")) {
            renderPill();
            const site = siteState(s);
            publishBtn.disabled = !s.draftChanged;
            publishBtn.textContent = s.draftChanged ? "Publish" : "Everything is live";
            publishBtn.dataset["tip"] = s.draftChanged
                ? site.kind === "never" ? "Put your website online" : "Review your changes and put them online"
                : "Visitors already see your latest changes";
        }
        if (changed(s, prev, "mode"))
            for (const b of modeButtons)
                b.setAttribute("aria-pressed", String(b.dataset["mode"] === s.mode));
        if (changed(s, prev, "device"))
            for (const b of deviceButtons)
                b.setAttribute("aria-pressed", String(b.dataset["device"] === s.device));
        if (changed(s, prev, "project")) {
            siteName.textContent = s.project.name;
            document.title = `${s.project.name} · Pagehaven`;
        }
        if (prev === null || (changed(s, prev, "pages", "path", "project", "canvasLoading") && !s.canvasLoading)) {
            const page = s.pages.find((p) => p.path === s.path);
            const label = page ? pageLabel(page, s.project.name) : s.path;
            pageName.textContent = label;
            pageButton.setAttribute("aria-label", `Page: ${label}. Switch page`);
        }
    });
    window.addEventListener("beforeunload", (event) => {
        const { saves } = store.get();
        if (saves.pending > 0 || saves.problem)
            event.preventDefault();
    });
    return { openPages };
}
