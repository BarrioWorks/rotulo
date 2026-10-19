import { confirmDialog, copyText, formatBytes, h, icon, must, plural, timeAgo, toast } from "../ui.js";
import { api } from "./api.js";
import { changed } from "./state.js";
function displayUrl(url) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
export function createPublishing({ store, change, afterRestore }) {
    const pid = () => store.get().project.pid;
    const publishButtons = [...document.querySelectorAll('[data-action="publish"]')];
    const state = must(document, "[data-publish-state]");
    const stateText = must(document, "[data-publish-state-text]");
    const liveBox = must(document, "[data-live-address]");
    const liveLink = must(document, "[data-live-link]");
    const liveOpen = must(document, "[data-live-open]");
    const viewLive = must(document, "[data-view-live]");
    const releaseList = must(document, "[data-release-list]");
    const releaseEmpty = must(document, "[data-release-empty]");
    const domainSection = must(document, "[data-domain-section]");
    const domainList = must(document, "[data-domain-list]");
    const domainForm = must(document, "[data-domain-form]");
    const domainInput = must(document, "[data-domain-input]");
    const publishLabels = publishButtons.map((b) => b.querySelector("[data-publish-label]")?.textContent ?? "Publish");
    let publishing = false;
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
    function setPublishing(on) {
        publishing = on;
        publishButtons.forEach((b, i) => {
            b.disabled = on;
            const label = b.querySelector("[data-publish-label]");
            if (label)
                label.textContent = on ? "Publishing…" : (publishLabels[i] ?? "Publish");
        });
    }
    async function publish() {
        if (publishing)
            return;
        setPublishing(true);
        const result = await change((base) => api.publish(pid(), base));
        setPublishing(false);
        if (!result)
            return;
        store.dispatch({ type: "published", release: result.release });
        store.dispatch({ type: "project", project: { ...store.get().project, site_url: result.site_url } });
        toast(`Your website is live at ${displayUrl(result.site_url)}`, "info", 5000);
    }
    for (const b of publishButtons)
        b.addEventListener("click", () => void publish());
    async function makeLive(release) {
        const ok = await confirmDialog({
            title: `Make version ${release.number} live?`,
            text: `Visitors will see version ${release.number} right away. The page you are editing does not change.`,
            ok: "Make live",
        });
        if (!ok)
            return;
        const live = await change(async () => {
            const { release: activated } = await api.activate(pid(), release.number);
            const fresh = await api.bootstrap(pid());
            store.dispatch({ type: "bootstrapped", data: fresh });
            return activated;
        });
        if (!live)
            return;
        await loadReleases();
        toast(`Version ${live.number} is live`);
    }
    async function editVersion(release) {
        const ok = await confirmDialog({
            title: `Edit version ${release.number}?`,
            text: `Your current changes are replaced by version ${release.number}. You can get them back with Undo.`,
            ok: "Edit this version",
        });
        if (!ok)
            return;
        const result = await change((base) => api.restore(pid(), base, release.number));
        if (!result)
            return;
        await afterRestore(result.pages);
        toast(`Version ${release.number} is now in the editor`);
    }
    function renderStatus(s) {
        const live = s.project.live_release;
        const kind = !live ? "draft" : s.draftChanged ? "changes" : "live";
        state.dataset["state"] = kind;
        stateText.textContent = !live
            ? "Not published yet"
            : s.draftChanged
                ? "Unpublished changes"
                : `Published ${timeAgo(live.created_at)}`;
        liveBox.hidden = !live;
        viewLive.hidden = !live;
        for (const a of [liveLink, liveOpen, viewLive])
            a.href = s.project.site_url;
        liveLink.textContent = displayUrl(s.project.site_url);
    }
    function renderReleases(s) {
        const releases = s.releases ?? [];
        releaseEmpty.hidden = releases.length > 0;
        const liveNumber = s.project.live_release?.number ?? null;
        releaseList.replaceChildren(...releases.slice(0, 20).map((r) => {
            const isLive = r.number === liveNumber;
            const actions = h("div", { class: "release-actions" });
            if (!isLive) {
                const live = h("button", { class: "btn btn-secondary", text: "Make live", attrs: { type: "button" } });
                live.addEventListener("click", () => void makeLive(r));
                actions.append(live);
            }
            const edit = h("button", { class: "btn btn-ghost", text: "Edit this version", attrs: { type: "button" } });
            edit.addEventListener("click", () => void editVersion(r));
            actions.append(edit);
            return h("li", { class: "release" }, h("div", { class: "release-head" }, h("span", { text: `Version ${r.number}` }), isLive ? h("span", { class: "pill pill-published", text: "Live" }) : null), h("div", { class: "release-meta", text: `${timeAgo(r.created_at)} · ${plural(r.file_count, "file", "files")} · ${formatBytes(r.bytes)}` }), actions);
        }));
    }
    function copyButton(value, label) {
        const b = h("button", { class: "copy-btn", text: "Copy", attrs: { type: "button", "aria-label": `Copy ${label}` } });
        b.addEventListener("click", async () => {
            if (await copyText(value)) {
                b.textContent = "Copied";
                b.classList.add("is-done");
                window.setTimeout(() => {
                    b.textContent = "Copy";
                    b.classList.remove("is-done");
                }, 1600);
            }
        });
        return b;
    }
    function record(type, name, value, note) {
        return h("div", { class: "dns-record" }, h("div", { class: "dns-record-type", text: type }), h("dl", { class: "dns-kv" }, h("dt", { text: "Name" }), h("dd", { text: name }), copyButton(name, `${type} name`), h("dt", { text: "Value" }), h("dd", { text: value }), copyButton(value, `${type} value`)), note ? h("p", { class: "tiny subtle", text: note }) : null);
    }
    function domainCard(domain, dns) {
        const verified = domain.status === "verified";
        const remove = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": `Remove ${domain.hostname}`, title: "Remove" } }, icon("x", "icon-sm"));
        remove.addEventListener("click", async () => {
            const ok = await confirmDialog({ title: `Remove ${domain.hostname}?`, text: "Your website will stop showing at this address.", ok: "Remove", danger: true });
            if (!ok)
                return;
            try {
                await api.deleteDomain(pid(), domain.id);
                await loadDomains();
            }
            catch (e) {
                toast(e instanceof Error ? e.message : "Something went wrong.", "error");
            }
        });
        const card = h("div", { class: "domain" }, h("div", { class: "domain-head" }, h("strong", { text: domain.hostname }), h("span", { class: `pill ${verified ? "pill-published" : "pill-pending"}`, text: verified ? "Connected" : "Waiting" }), remove));
        if (verified) {
            card.append(h("a", { class: "small", text: `Open ${domain.hostname}`, attrs: { href: domain.url, target: "_blank", rel: "noopener noreferrer" } }));
            return card;
        }
        const apex = domain.hostname.split(".").length === 2;
        card.append(h("p", { class: "small muted", text: "Add these records where you bought your domain, then press Check. It can take a few minutes." }), h("div", { class: "dns-records" }, record("TXT", domain.txt_name, domain.txt_value, "Proves that you own this domain."), dns
            ? apex
                ? record("A", domain.hostname, dns.a_record, "Points your domain to Pagehaven.")
                : record("CNAME", domain.hostname, dns.cname_target, "Points your domain to Pagehaven. Some providers only want the first part of the name, like www.")
            : null));
        if (domain.last_error)
            card.append(h("div", { class: "alert alert-warn" }, icon("alert", "icon-sm"), h("span", { text: domain.last_error })));
        const check = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button" } }, icon("refresh", "icon-sm"), h("span", { text: "Check" }));
        check.addEventListener("click", async () => {
            check.disabled = true;
            check.replaceChildren(h("span", { class: "spinner" }), h("span", { text: "Checking…" }));
            try {
                const { domain: updated } = await api.checkDomain(pid(), domain.id);
                const domains = (store.get().domains ?? []).map((d) => (d.id === updated.id ? updated : d));
                store.dispatch({ type: "domains", domains, dns: store.get().dns });
                if (updated.status === "verified")
                    toast(`${updated.hostname} is connected`);
            }
            catch (e) {
                toast(e instanceof Error ? e.message : "Something went wrong.", "error");
                check.disabled = false;
                check.replaceChildren(icon("refresh", "icon-sm"), h("span", { text: "Check" }));
            }
        });
        card.append(h("div", { class: "row" }, check));
        return card;
    }
    domainForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const hostname = domainInput.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!hostname)
            return;
        try {
            const { domain } = await api.addDomain(pid(), hostname);
            store.dispatch({ type: "domains", domains: [...(store.get().domains ?? []), domain], dns: store.get().dns });
            domainInput.value = "";
        }
        catch (e) {
            toast(e instanceof Error ? e.message : "Something went wrong.", "error", 6000);
        }
    });
    store.subscribe((s, prev) => {
        if (changed(s, prev, "project", "draftChanged"))
            renderStatus(s);
        if (changed(s, prev, "releases", "project"))
            renderReleases(s);
        if (changed(s, prev, "customDomains"))
            domainSection.hidden = !s.customDomains;
        if (changed(s, prev, "domains", "dns")) {
            domainList.replaceChildren(...(s.domains ?? []).map((d) => domainCard(d, s.dns)));
        }
    });
    window.setInterval(() => {
        const s = store.get();
        renderStatus(s);
        renderReleases(s);
    }, 30000);
    void loadReleases();
    if (store.get().customDomains)
        void loadDomains();
}
