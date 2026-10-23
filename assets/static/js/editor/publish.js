import { announce, confirmDialog, copyText, dateTime, h, icon, must, timeAgo, toast } from "../ui.js";
import { ApiError, api } from "./api.js";
import { intersect } from "./placement.js";
import { pageLabel } from "./pages.js";
import { changed, siteState } from "./state.js";
/** Changes the review lists before "Show all". */
const REVIEW_ROWS = 8;
export function displayUrl(url) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
function plainList(n, one, many) {
    return n === 1 ? `1 ${one}` : `${n} ${many}`;
}
/** Groups the session's change log by page for the review: "Home: Edit text, Replace image". */
export function changeSummary(s, limit = 8) {
    const out = [];
    for (const c of s.changes.slice(-limit).reverse()) {
        const page = s.pages.find((p) => p.path === c.page);
        const name = page ? pageLabel(page, s.project.name, s.pages) : c.page;
        const row = out.find((r) => r.page === name);
        const label = c.label.charAt(0).toUpperCase() + c.label.slice(1);
        if (row)
            row.labels.push(label);
        else
            out.push({ page: name, labels: [label] });
    }
    return out;
}
export function createPublishing({ store, canvas, saver, afterRestore }) {
    const change = saver.change;
    const pid = () => store.get().project.pid;
    const pop = must(document, "[data-publish-pop]");
    const historySheet = must(document, '[data-dialog="history"]');
    const historyList = must(historySheet, "[data-release-list]");
    const settings = must(document, '[data-dialog="settings"]');
    const manageReview = document.querySelector("[data-manage-review]");
    const manageHistory = document.querySelector("[data-manage-history]");
    const manageAddress = document.querySelector("[data-manage-address]");
    const liveSheet = h("section", { class: "live-sheet", attrs: { role: "dialog", "aria-labelledby": "live-sheet-title", tabindex: "-1" } });
    liveSheet.hidden = true;
    document.body.append(liveSheet);
    function closeLive() {
        if (liveSheet.hidden)
            return;
        liveSheet.hidden = true;
        document.querySelector('[data-action="publish"]')?.focus({ preventScroll: true });
    }
    function placeLive() {
        const island = document.querySelector(".ed-top-right")?.getBoundingClientRect();
        const bounds = canvas.visibleBox();
        const top = Math.max(bounds.y + 8, (island?.bottom ?? 52) + 8);
        liveSheet.style.top = `${top}px`;
        liveSheet.style.right = `${Math.max(8, window.innerWidth - (island?.right ?? window.innerWidth - 8))}px`;
        liveSheet.style.maxHeight = `${Math.max(0, bounds.y + bounds.height - top - 8)}px`;
    }
    function showLive(count) {
        const s = store.get();
        const close = h("button", { class: "btn live-close", text: "Close", attrs: { type: "button", "aria-label": "Close live confirmation" } });
        close.addEventListener("click", closeLive);
        const copy = h("button", { class: "btn live-action", text: "Copy address", attrs: { type: "button" } });
        copy.addEventListener("click", async () => {
            if (await copyText(s.project.site_url)) {
                copy.textContent = "Address copied";
                announce("Address copied");
            }
        });
        liveSheet.replaceChildren(close, h("h2", { text: `${s.project.name} is live.`, attrs: { id: "live-sheet-title" } }), h("p", { text: count ? `${plainList(count, "change", "changes")} published. Visitors see ${count === 1 ? "it" : "them"} now.` : "Your website is published. Visitors see it now." }), h("code", { class: "live-address", text: s.project.site_url }), h("div", { class: "live-actions" }, h("a", { class: "btn live-action", text: "View website", attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } }), copy));
        liveSheet.hidden = false;
        placeLive();
        liveSheet.focus({ preventScroll: true });
        announce(`${s.project.name} is live. ${count ? plainList(count, "change", "changes") + " published. " : ""}Visitors see it now.`);
    }
    document.addEventListener("keydown", (event) => {
        if (!liveSheet.hidden && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeLive();
        }
    });
    document.addEventListener("click", (event) => {
        if (!liveSheet.hidden && event.target instanceof Node && !liveSheet.contains(event.target))
            closeLive();
    }, true);
    // Pointer events inside the cross-origin canvas arrive through the existing selection state.
    store.subscribe((s, prev) => { if (prev && s.focus !== prev.focus)
        closeLive(); });
    window.addEventListener("blur", () => { if (document.activeElement instanceof HTMLIFrameElement)
        closeLive(); });
    let publishing = false;
    let publishError = null;
    let popTrigger = null;
    /** The review lists the latest changes first; the owner can open the rest before publishing. */
    let showAllChanges = false;
    async function loadReleases() {
        try {
            const { releases } = await api.releases(pid());
            store.dispatch({ type: "releases", releases });
        }
        catch {
            store.dispatch({ type: "releases", releases: [] });
        }
    }
    async function loadDomains() {
        try {
            const { domains, dns } = await api.domains(pid());
            store.dispatch({ type: "domains", domains, dns });
        }
        catch {
            store.dispatch({ type: "domains", domains: [], dns: null });
        }
    }
    function viewWebsite() {
        window.open(store.get().project.site_url, "_blank", "noopener,noreferrer");
    }
    function publicationFeedback(text) {
        const status = document.querySelector("[data-status-text]");
        if (status) {
            status.textContent = text;
            status.dataset["publicationFeedback"] = text;
        }
        announce(text);
    }
    async function publish() {
        if (publishing)
            return;
        publishing = true;
        if (!await canvas.finishText()) {
            publishing = false;
            return;
        }
        publishError = null;
        publicationFeedback("Publishing…");
        renderAll();
        let rejection = null;
        let publishedCount = 0;
        const result = await change((base) => {
            publishedCount = store.get().changes.length;
            return api.publish(pid(), base);
        }, {
            toastRejection: false,
            onRejected: (e) => {
                rejection = e;
            },
        });
        publishing = false;
        if (!result) {
            const failure = rejection;
            if (failure?.code === "nothing_to_publish") {
                store.dispatch({ type: "nothing_to_publish" });
                void loadReleases();
            }
            else if (failure) {
                publishError = failure.message;
            }
            publicationFeedback(publishError ?? "Couldn’t publish. Try again.");
            renderAll();
            return;
        }
        store.dispatch({ type: "published", release: result.release });
        store.dispatch({ type: "project", project: { ...store.get().project, site_url: result.site_url } });
        closeReview();
        publicationFeedback(`Published at ${new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`);
        showLive(publishedCount);
    }
    /* Review: what changes, where it is published, and the one button that does it */
    function review(s, where) {
        const site = siteState(s);
        const live = s.project.live_release;
        const address = displayUrl(s.project.site_url);
        const out = [];
        const problem = s.saves.problem;
        if (problem?.kind === "offline") {
            const retry = h("button", { class: "link-btn", text: "Try now", attrs: { type: "button" } });
            retry.addEventListener("click", () => saver.retryNow());
            out.push(h("div", { class: "alert alert-warn", attrs: { role: "status" } }, icon("alert", "icon-sm"), h("span", { class: "grow", text: `You're offline. ${plainList(s.saves.pending, "change is", "changes are")} waiting and will be saved when you're back. ` }), retry));
        }
        else if (problem?.kind === "error") {
            out.push(h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { text: `Your last change was not saved. ${problem.message}` })));
        }
        else if (problem?.kind === "conflict") {
            const reload = h("button", { class: "link-btn", text: "Reload", attrs: { type: "button" } });
            reload.addEventListener("click", () => window.location.reload());
            out.push(h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { class: "grow", text: "This tab could not confirm its last save. Reload to check your changes. " }), reload));
        }
        const title = (text) => h("h2", { class: "pub-title", text, attrs: where === "popover" ? { id: "ed-publish-title", tabindex: "-1" } : {} });
        const liveLine = live ? h("p", { class: "pub-meta", text: `Visitors see version ${live.number}, published ${dateTime(live.created_at).replace(/^Today/, "today").replace(/^Yesterday/, "yesterday")}.` }) : null;
        const addressRow = h("p", { class: "pub-address" }, icon("domain", "icon-sm"), h("a", { text: address, attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } }));
        const listed = showAllChanges ? s.changes : s.changes.slice(-REVIEW_ROWS);
        const changesList = s.changes.length > 0
            ? h("ul", { class: "pub-changes", attrs: { "aria-label": "Changes that are not published" } }, ...listed.slice().reverse().map((change, index) => {
                const page = s.pages.find((p) => p.path === change.page);
                const content = [h("span", { class: "pub-page", text: page ? pageLabel(page, s.project.name, s.pages) : change.page }), h("span", { class: "pub-labels", text: change.label })];
                const item = { "data-change": String(index), tabindex: "-1" };
                if (!change.element)
                    return h("li", { attrs: item }, ...content);
                const element = change.element;
                const row = h("button", { class: "pub-change", attrs: { type: "button", "aria-label": `${change.label} on ${page ? pageLabel(page, s.project.name, s.pages) : change.page}` } }, ...content);
                row.addEventListener("click", () => {
                    closeReview(false);
                    store.dispatch({ type: "mode", mode: "edit" });
                    if (store.get().path !== change.page || store.get().canvasLoading)
                        canvas.open(change.page, element);
                    else {
                        canvas.send({ type: "select_element", element });
                        canvas.send({ type: "reveal", element, pulse: true });
                    }
                    canvas.surface.focus({ preventScroll: true });
                });
                return h("li", { attrs: item }, row);
            }))
            : null;
        let more = null;
        if (listed.length < s.changes.length) {
            more = h("button", { class: "link-btn", text: `Show all ${s.changes.length} changes`, attrs: { type: "button" } });
            more.addEventListener("click", () => {
                showAllChanges = true;
                renderAll();
                const first = pop.querySelector(`[data-change="${REVIEW_ROWS}"]`);
                (first?.querySelector("button") ?? first)?.focus();
            });
        }
        const pageCount = s.pages.length;
        const wholeSite = h("p", { class: "pub-text", text: pageCount === 1
                ? "This publishes your website's one page, exactly as it shows in the editor."
                : `This publishes all ${pageCount} pages of your website, exactly as they show in the editor.` });
        const publishButton = (label) => {
            const b = h("button", { class: "btn btn-primary", text: label, attrs: { type: "button", "data-publish-confirm": "" } });
            if (publishing)
                b.setAttribute("aria-busy", "true");
            b.addEventListener("click", () => void publish());
            return b;
        };
        const cancel = where === "popover" ? Object.assign(h("button", { class: "btn btn-ghost", text: "Cancel", attrs: { type: "button" } }), { onclick: () => closeReview() }) : null;
        const errorBox = publishError ? h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { text: publishError })) : null;
        const actions = (label) => h("div", { class: "pub-actions" }, cancel, publishButton(label));
        const parts = [];
        switch (site.kind) {
            case "never":
                parts.push(title("Publish your website?"), errorBox, wholeSite, changesList, more, h("p", { class: "pub-text", text: "Visitors will find it at this address. You can change the address in Website settings." }), addressRow, actions("Publish"));
                break;
            case "changes":
                parts.push(title("Publish your changes?"), errorBox, changesList ?? h("p", { class: "pub-text", text: "You have changes from an earlier visit that are not published yet." }), more, liveLine, addressRow, actions("Publish"));
                break;
            case "older":
                parts.push(title(`Visitors see version ${site.live}`), errorBox, h("p", { class: "pub-text", text: site.draftChanged ? `Your editor has newer changes than version ${site.live}. Publish to show them to visitors.` : `Your editor shows the same website as version ${site.live}.` }), changesList, addressRow, site.draftChanged ? actions("Publish my latest changes") : null);
                break;
            case "current": {
                const view = h("a", { class: "btn btn-secondary btn-sm", attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } }, h("span", { text: "View website" }), icon("view-live", "icon-sm"));
                parts.push(title("Everything is published."), liveLine, addressRow, h("div", { class: "pub-actions pub-actions-start" }, view));
                break;
            }
        }
        out.push(...parts.filter((el) => el !== null));
        if (where === "popover") {
            const history = h("button", { class: "link-btn", text: "Version history", attrs: { type: "button" } });
            history.addEventListener("click", () => {
                openHistory(popTrigger);
            });
            out.push(h("div", { class: "pub-foot" }, history));
        }
        return out;
    }
    function renderReview() {
        const s = store.get();
        if (!pop.hidden) {
            const focused = document.activeElement;
            const inHistory = focused instanceof HTMLElement && historySheet.contains(focused);
            const inReview = focused instanceof HTMLElement && pop.contains(focused);
            const focusedConfirm = focused instanceof HTMLElement && focused.hasAttribute("data-publish-confirm");
            const hadHistory = !historySheet.hidden && historySheet.parentElement === pop;
            pop.replaceChildren(...review(s, "popover"));
            if (hadHistory)
                pop.append(historySheet);
            if (inHistory && focused instanceof HTMLElement)
                focused.focus({ preventScroll: true });
            else if (focusedConfirm)
                pop.querySelector("[data-publish-confirm]")?.focus({ preventScroll: true });
            else if (inReview)
                pop.querySelector("a, button")?.focus({ preventScroll: true });
        }
        if (!pop.hidden)
            placeReview();
        if (manageReview)
            manageReview.replaceChildren(...review(s, "manage"));
    }
    function placeReview() {
        const island = document.querySelector(".ed-top-right");
        if (!island)
            return;
        const r = island.getBoundingClientRect();
        const bounds = canvas.visibleBox();
        const top = Math.max(bounds.y + 8, r.bottom + 8);
        const right = Math.max(8, window.innerWidth - r.right);
        const x = window.innerWidth - right - pop.offsetWidth;
        let height = bounds.y + bounds.height - top - 8;
        const s = store.get();
        if (historySheet.hidden && s.focus.kind === "selected") {
            const selected = canvas.toApp(s.focus.selection.rect);
            const caption = document.querySelector("[data-toolbar].is-visible:not(.is-offscreen)");
            const avoid = [selected, ...(caption ? [caption.getBoundingClientRect()] : [])];
            // Step aside only when the whole review still fits; otherwise cover the selection, never the review.
            for (const box of avoid) {
                if (intersect({ x, y: top, width: pop.offsetWidth, height }, box) && box.y - top - 8 >= pop.scrollHeight)
                    height = Math.min(height, box.y - top - 8);
            }
        }
        pop.style.top = `${Math.round(top)}px`;
        pop.style.right = `${Math.round(right)}px`;
        pop.style.maxHeight = `${Math.max(0, Math.floor(height))}px`;
    }
    function onOutside(event) {
        if (event.target instanceof Element && event.target.closest("dialog"))
            return;
        if (event.target instanceof Node && (pop.contains(event.target) || popTrigger?.contains(event.target)))
            return;
        closeReview(false);
    }
    function openReview(trigger = null) {
        if (!pop.hidden) {
            closeReview();
            return;
        }
        popTrigger = trigger;
        publishError = null;
        showAllChanges = false;
        store.dispatch({ type: "open_surface", surface: "publish" });
        pop.hidden = false;
        trigger?.setAttribute("aria-expanded", "true");
        document.body.toggleAttribute("data-review-open", true);
        renderReview();
        placeReview();
        document.addEventListener("pointerdown", onOutside, true);
        const target = pop.querySelector("[data-publish-confirm]") ?? pop.querySelector("a, button");
        target?.focus({ preventScroll: true });
        pop.scrollTop = 0;
        if (store.get().releases === null)
            void loadReleases();
    }
    function closeReview(restore = true) {
        if (pop.hidden)
            return false;
        pop.hidden = true;
        historySheet.hidden = true;
        document.body.append(historySheet);
        pop.replaceChildren();
        if (store.get().surface.kind === "publish")
            store.dispatch({ type: "close_panel" });
        document.body.toggleAttribute("data-review-open", false);
        document.removeEventListener("pointerdown", onOutside, true);
        popTrigger?.setAttribute("aria-expanded", "false");
        if (restore) {
            if (store.get().focus.kind === "selected") {
                canvas.surface.focus({ preventScroll: true });
                return true;
            }
            const fallback = document.querySelector("[data-status-pill]");
            const target = popTrigger && !popTrigger.disabled ? popTrigger : fallback;
            target?.focus();
        }
        return true;
    }
    pop.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeReview();
        }
    });
    window.addEventListener("resize", () => {
        if (!pop.hidden)
            placeReview();
        if (!liveSheet.hidden)
            placeLive();
    });
    /* Version history */
    async function publishAgain(release) {
        const ok = await confirmDialog({
            title: `Make version ${release.number} live?`,
            text: `Visitors will see version ${release.number} right away. Your editor keeps your newer changes, so you can publish them again later.`,
            ok: `Make version ${release.number} live`,
        });
        if (!ok)
            return;
        const live = await change(async () => {
            const { release: activated } = await api.activate(pid(), release.number);
            const fresh = await api.bootstrap(pid());
            store.dispatch({ type: "bootstrapped", data: fresh });
            return activated;
        }, { log: "none" });
        if (!live)
            return;
        await loadReleases();
        focusCurrentVersion();
        announce(`Version ${live.number} is now what visitors see`);
        toast(`Visitors now see version ${live.number}.`, { action: { label: "View website", run: viewWebsite } });
    }
    async function openVersion(release) {
        const ok = await confirmDialog({
            title: `Edit from version ${release.number}?`,
            text: `Your editor will show version ${release.number}. Visitors see no change until you publish, and Undo brings your current changes back.`,
            ok: `Edit from version ${release.number}`,
        });
        if (!ok)
            return;
        const result = await change((base) => api.restore(pid(), base, release.number));
        if (!result)
            return;
        closeReview(false);
        await afterRestore(result.pages);
        toast(`Version ${release.number} is now in the editor.`);
    }
    function releaseRows(s, compact) {
        const releases = s.releases ?? [];
        if (releases.length === 0) {
            return [h("li", { class: "release-empty" }, h("p", { class: "hint", text: s.releases === null ? "Loading versions…" : "Each time you publish, a version is saved here so you can go back to it." }))];
        }
        const liveNumber = s.project.live_release?.number ?? null;
        return releases.slice(0, 30).map((r) => {
            const isLive = r.number === liveNumber;
            const actions = h("div", { class: "release-actions" });
            if (!isLive) {
                const live = h("button", { class: "btn btn-secondary btn-sm", text: "Make this version live", attrs: { type: "button", "aria-label": `Make version ${r.number} live` } });
                live.addEventListener("click", () => void publishAgain(r));
                actions.append(live);
            }
            if (!compact) {
                const open = h("button", { class: "btn btn-ghost btn-sm", text: "Edit from this version", attrs: { type: "button", "aria-label": `Edit from version ${r.number}` } });
                open.addEventListener("click", () => void openVersion(r));
                actions.append(open);
            }
            return h("li", { class: `release${isLive ? " is-live" : ""}`, attrs: { tabindex: "-1" } }, h("div", { class: "release-head" }, h("span", { class: "release-number", text: `Version ${r.number}` }), isLive ? h("span", { class: "pill pill-published", text: "Published" }) : null), h("p", { class: "release-meta" }, h("time", { text: dateTime(r.created_at), attrs: { datetime: r.created_at } }), h("span", { text: ` · ${timeAgo(r.created_at)}` })), actions);
        });
    }
    function focusCurrentVersion() {
        const target = historyList.querySelector(".is-live") ?? pop.querySelector("#ed-publish-title");
        target?.focus({ preventScroll: true });
    }
    function renderHistory() {
        const s = store.get();
        if (!historySheet.hidden) {
            const restoreFocus = historyList.contains(document.activeElement);
            historyList.replaceChildren(...releaseRows(s, false));
            if (restoreFocus)
                focusCurrentVersion();
        }
        if (manageHistory)
            manageHistory.replaceChildren(...releaseRows(s, true));
    }
    must(historySheet, "[data-close]").addEventListener("click", () => {
        if (store.get().surface.kind === "settings")
            settingsSection("general");
        else
            closeReview();
    });
    function openHistory(trigger = null) {
        if (store.get().surface.kind !== "publish")
            openReview(trigger);
        historySheet.hidden = false;
        pop.append(historySheet);
        renderHistory();
        placeReview();
        historySheet.querySelector("button")?.focus();
        void loadReleases();
    }
    /* Website settings: name, address and own domain */
    const settingsForm = must(settings, "[data-settings-form]");
    const siteName = must(settings, "[data-settings-name]");
    const siteSlug = must(settings, "[data-settings-slug]");
    const suffix = must(settings, "[data-settings-suffix]");
    const settingsError = must(settings, "[data-settings-error]");
    const domainSection = must(settings, "[data-domain-section]");
    const domainList = must(settings, "[data-domain-list]");
    const domainForm = must(settings, "[data-domain-form]");
    const domainInput = must(settings, "[data-domain-input]");
    const domainError = must(settings, "[data-domain-error]");
    must(settings, "[data-close]").addEventListener("click", () => closeSettings());
    siteSlug.addEventListener("input", () => {
        const cleaned = siteSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        if (cleaned !== siteSlug.value)
            siteSlug.value = cleaned;
    });
    settingsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        settingsError.hidden = true;
        const submit = settingsForm.querySelector("[type=submit]");
        submit?.setAttribute("aria-busy", "true");
        try {
            const { project } = await api.settings(pid(), siteName.value.trim(), siteSlug.value.trim());
            store.dispatch({ type: "project", project: { ...project, revision: store.get().project.revision } });
            toast("Website settings saved");
        }
        catch (e) {
            settingsError.hidden = false;
            settingsError.textContent = e instanceof Error ? e.message : "Something went wrong.";
        }
        finally {
            submit?.removeAttribute("aria-busy");
        }
    });
    function copyButton(value, label) {
        const b = h("button", { class: "btn btn-secondary btn-sm copy-btn", attrs: { type: "button", "aria-label": `Copy ${label}` } }, h("span", { text: "Copy" }));
        b.addEventListener("click", async () => {
            if (await copyText(value)) {
                b.replaceChildren(icon("check", "icon-sm"), h("span", { text: "Copied" }));
                announce("Copied");
                window.setTimeout(() => b.replaceChildren(h("span", { text: "Copy" })), 1600);
            }
        });
        return b;
    }
    function dnsTable(domain, dns) {
        const apex = domain.hostname.split(".").length === 2;
        const rows = [["TXT", domain.txt_name, domain.txt_value, "Proves that you own this domain."]];
        if (dns)
            rows.push(apex ? ["A", domain.hostname, dns.a_record, "Points your domain to Rótulo."] : ["CNAME", domain.hostname, dns.cname_target, "Points your domain to Rótulo. Some providers want only the first part of the name, like www."]);
        return h("table", { class: "table dns-table" }, h("thead", {}, h("tr", {}, h("th", { text: "Type", attrs: { scope: "col" } }), h("th", { text: "Name", attrs: { scope: "col" } }), h("th", { text: "Value", attrs: { scope: "col" } }))), h("tbody", {}, ...rows.map(([type, name, value, why]) => h("tr", {}, h("td", { class: "dns-type", attrs: { "data-label": "Type" } }, h("span", { text: type }), h("span", { class: "hint dns-why", text: why })), h("td", { attrs: { "data-label": "Name" } }, h("code", { class: "dns-value", text: name }), copyButton(name, `${type} name`)), h("td", { attrs: { "data-label": "Value" } }, h("code", { class: "dns-value", text: value }), copyButton(value, `${type} value`))))));
    }
    function domainCard(domain, dns) {
        const verified = domain.status === "verified";
        const remove = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": `Remove ${domain.hostname}`, "data-tip": "Remove this domain" } }, icon("close", "icon-sm"));
        remove.addEventListener("click", async () => {
            const ok = await confirmDialog({ title: `Remove ${domain.hostname}?`, text: "Your website will stop showing at this address.", ok: "Remove", danger: true });
            if (!ok)
                return;
            try {
                await api.deleteDomain(pid(), domain.id);
                await loadDomains();
            }
            catch (e) {
                toast(e instanceof Error ? e.message : "Something went wrong.", { kind: "error" });
            }
        });
        const card = h("div", { class: "domain" }, h("div", { class: "domain-head" }, h("strong", { class: "domain-name", text: domain.hostname }), h("span", { class: `pill ${verified ? "pill-published" : "pill-pending"}`, text: verified ? "Connected" : "Waiting for your domain settings" }), remove));
        if (verified) {
            card.append(h("a", { class: "small", text: `Open ${domain.hostname}`, attrs: { href: domain.url, target: "_blank", rel: "noopener noreferrer" } }));
            return card;
        }
        card.append(h("p", { class: "hint", text: "Add these records where you bought your domain, then press Check now. It can take a few minutes." }), dnsTable(domain, dns));
        if (domain.last_error)
            card.append(h("div", { class: "alert alert-warn", attrs: { role: "status" } }, icon("alert", "icon-sm"), h("span", { text: domain.last_error })));
        const check = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button" } }, icon("refresh", "icon-sm"), h("span", { text: "Check now" }));
        check.addEventListener("click", async () => {
            check.setAttribute("aria-busy", "true");
            try {
                const { domain: updated } = await api.checkDomain(pid(), domain.id);
                const domains = (store.get().domains ?? []).map((d) => (d.id === updated.id ? updated : d));
                store.dispatch({ type: "domains", domains, dns: store.get().dns });
                announce(updated.status === "verified" ? `${updated.hostname} is connected` : "Not connected yet");
                if (updated.status === "verified")
                    toast(`${updated.hostname} is connected`);
            }
            catch (e) {
                toast(e instanceof Error ? e.message : "Something went wrong.", { kind: "error" });
            }
            finally {
                check.removeAttribute("aria-busy");
            }
        });
        card.append(h("div", { class: "row" }, check));
        return card;
    }
    domainForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        domainError.hidden = true;
        domainInput.removeAttribute("aria-invalid");
        const hostname = domainInput.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!hostname || !store.get().customDomains)
            return;
        try {
            const { domain } = await api.addDomain(pid(), hostname);
            store.dispatch({ type: "domains", domains: [...(store.get().domains ?? []), domain], dns: store.get().dns });
            domainInput.value = "";
        }
        catch (e) {
            domainError.hidden = false;
            domainError.textContent = e instanceof Error ? e.message : "Something went wrong.";
            domainInput.setAttribute("aria-invalid", "true");
        }
    });
    let settingsTrigger = null;
    function closeSettings() {
        store.dispatch({ type: "close_panel" });
        settingsTrigger?.focus({ preventScroll: true });
    }
    function settingsSection(section) {
        for (const content of settings.querySelectorAll("[data-settings-content]"))
            content.hidden = content.dataset["settingsContent"] !== section;
        for (const b of settings.querySelectorAll("[data-settings-section]"))
            b.setAttribute("aria-pressed", String(b.dataset["settingsSection"] === section));
        if (section === "versions") {
            const host = must(settings, "[data-settings-versions]");
            host.append(historySheet);
            historySheet.hidden = false;
            renderHistory();
        }
    }
    function openSettings(trigger = null) {
        settingsTrigger = trigger;
        const s = store.get();
        siteName.value = s.project.name;
        siteSlug.value = s.project.slug;
        settingsError.hidden = true;
        store.dispatch({ type: "open_surface", surface: "settings" });
        settingsSection("general");
        siteName.focus();
        if (s.customDomains)
            void loadDomains();
    }
    for (const button of settings.querySelectorAll("[data-settings-section]"))
        button.addEventListener("click", () => settingsSection(button.dataset["settingsSection"] ?? "general"));
    settings.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeSettings();
        }
    });
    must(settings, "[data-settings-shortcuts]").addEventListener("click", () => must(document, '[data-dialog="shortcuts"]').showModal());
    must(settings, "[data-settings-pages]").addEventListener("click", () => must(document, "[data-page-switcher]").click());
    must(settings, "[data-settings-images]").addEventListener("click", () => must(document, "[data-open-images]").click());
    must(settings, "[data-page-meta]").addEventListener("click", () => store.dispatch({ type: "open_panel", panel: "page" }));
    must(settings, "[data-settings-publish]").addEventListener("click", () => openReview(document.querySelector('[data-action="publish"]')));
    function renderAll() {
        renderReview();
        renderHistory();
    }
    store.subscribe((s, prev) => {
        settings.hidden = s.surface.kind !== "settings";
        if (s.surface.kind !== "publish" && !pop.hidden)
            closeReview(false);
        if (changed(s, prev, "project", "draftChanged", "changes", "releases", "saves", "pages"))
            renderAll();
        domainForm.hidden = !s.customDomains;
        must(domainSection, "[data-domains-intro]").hidden = !s.customDomains;
        must(domainSection, "[data-domains-disabled]").hidden = s.customDomains;
        domainList.hidden = !s.customDomains;
        if (changed(s, prev, "domains", "dns"))
            domainList.replaceChildren(...(s.domains ?? []).map((d) => domainCard(d, s.dns)));
        if (changed(s, prev, "project")) {
            try {
                const host = new URL(s.project.site_url).host;
                suffix.textContent = host.startsWith(`${s.project.slug}.`) ? host.slice(s.project.slug.length) : `.${host.split(".").slice(1).join(".")}`;
            }
            catch {
                suffix.textContent = "";
            }
            if (manageAddress) {
                const link = h("a", { text: displayUrl(s.project.site_url), attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } });
                manageAddress.replaceChildren(icon("domain", "icon-sm"), link, copyButton(s.project.site_url, "the address"));
            }
        }
    });
    window.setInterval(renderHistory, 60000);
    void loadReleases();
    return { openReview, openHistory, openSettings, closeReview };
}
