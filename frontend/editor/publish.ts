import { announce, confirmDialog, copyText, dateTime, h, icon, must, timeAgo, toast } from "../ui.js";
import { ApiError, api, type Dns, type Domain, type Release } from "./api.js";
import { pageLabel } from "./pages.js";
import type { Change, Saver } from "./saves.js";
import { changed, siteState, type State, type Store } from "./state.js";

export interface PublishDeps {
  store: Store;
  saver: Saver;
  /** Reloads pages and history after the draft was replaced, then the canvas. */
  afterRestore(changedPages: string[]): Promise<void>;
}

export interface Publishing {
  openReview(trigger?: HTMLElement | null): void;
  openHistory(trigger?: HTMLElement | null): void;
  openSettings(trigger?: HTMLElement | null): void;
  /** Closes the review popover, returning focus to its trigger unless told not to. Returns true if it was open. */
  closeReview(restoreFocus?: boolean): boolean;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function plainList(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

/** Groups the session's change log by page for the review: "Home: Edit text, Replace image". */
export function changeSummary(s: Pick<State, "changes" | "pages" | "project">, limit = 8): { page: string; labels: string[] }[] {
  const out: { page: string; labels: string[] }[] = [];
  for (const c of s.changes.slice(-limit).reverse()) {
    const page = s.pages.find((p) => p.path === c.page);
    const name = page ? pageLabel(page, s.project.name) : c.page;
    const row = out.find((r) => r.page === name);
    const label = c.label.charAt(0).toUpperCase() + c.label.slice(1);
    if (row) row.labels.push(label);
    else out.push({ page: name, labels: [label] });
  }
  return out;
}

export function createPublishing({ store, saver, afterRestore }: PublishDeps): Publishing {
  const change: Change = saver.change;
  const pid = () => store.get().project.pid;
  const pop = must<HTMLElement>(document, "[data-publish-pop]");
  const historySheet = must<HTMLDialogElement>(document, 'dialog[data-dialog="history"]');
  const historyList = must<HTMLUListElement>(historySheet, "[data-release-list]");
  const settings = must<HTMLDialogElement>(document, 'dialog[data-dialog="settings"]');
  const manageReview = document.querySelector<HTMLElement>("[data-manage-review]");
  const manageHistory = document.querySelector<HTMLUListElement>("[data-manage-history]");
  const manageAddress = document.querySelector<HTMLElement>("[data-manage-address]");
  let publishing = false;
  let publishError: string | null = null;
  let popTrigger: HTMLElement | null = null;

  async function loadReleases(): Promise<void> {
    try {
      const { releases } = await api.releases(pid());
      store.dispatch({ type: "releases", releases });
    } catch {
      store.dispatch({ type: "releases", releases: [] });
    }
  }

  async function loadDomains(): Promise<void> {
    try {
      const { domains, dns } = await api.domains(pid());
      store.dispatch({ type: "domains", domains, dns });
    } catch {
      store.dispatch({ type: "domains", domains: [], dns: null });
    }
  }

  function viewWebsite(): void {
    window.open(store.get().project.site_url, "_blank", "noopener,noreferrer");
  }

  async function publish(): Promise<void> {
    if (publishing) return;
    publishing = true;
    publishError = null;
    renderAll();
    let rejection: ApiError | null = null;
    const result = await change((base) => api.publish(pid(), base), {
      toastRejection: false,
      onRejected: (e) => {
        rejection = e;
      },
    });
    publishing = false;
    if (!result) {
      const failure = rejection as ApiError | null;
      if (failure?.code === "nothing_to_publish") {
        store.dispatch({ type: "nothing_to_publish" });
        void loadReleases();
      } else if (failure) {
        publishError = failure.message;
      }
      renderAll();
      return;
    }
    store.dispatch({ type: "published", release: result.release });
    store.dispatch({ type: "project", project: { ...store.get().project, site_url: result.site_url } });
    closeReview();
    announce(`Published. Visitors now see version ${result.release.number}.`);
    toast(`Published. Visitors now see version ${result.release.number}.`, { action: { label: "View website", run: viewWebsite } });
  }

  /* Review: what changes, where it is published, and the one button that does it */

  function review(s: State, where: "popover" | "manage"): HTMLElement[] {
    const site = siteState(s);
    const live = s.project.live_release;
    const address = displayUrl(s.project.site_url);
    const out: HTMLElement[] = [];
    const problem = s.saves.problem;
    if (problem?.kind === "offline") {
      const retry = h("button", { class: "link-btn", text: "Try now", attrs: { type: "button" } });
      retry.addEventListener("click", () => saver.retryNow());
      out.push(h("div", { class: "alert alert-warn", attrs: { role: "status" } }, icon("alert", "icon-sm"),
        h("span", { class: "grow", text: `You're offline. ${plainList(s.saves.pending, "change is", "changes are")} waiting and will be saved when you're back. ` }), retry));
    } else if (problem?.kind === "error") {
      out.push(h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { text: `Your last change was not saved. ${problem.message}` })));
    } else if (problem?.kind === "conflict") {
      const reload = h("button", { class: "link-btn", text: "Reload", attrs: { type: "button" } });
      reload.addEventListener("click", () => window.location.reload());
      out.push(h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { class: "grow", text: "This website was changed in another tab. Reload to see the latest version. " }), reload));
    }

    const title = (text: string) => h("h2", { class: "pub-title", text, attrs: where === "popover" ? { id: "ed-publish-title" } : {} });
    const liveLine = live ? h("p", { class: "pub-meta", text: `Visitors see version ${live.number}, published ${dateTime(live.created_at).replace(/^Today/, "today").replace(/^Yesterday/, "yesterday")}.` }) : null;
    const addressRow = h("p", { class: "pub-address" }, icon("domain", "icon-sm"),
      h("a", { text: address, attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } }));

    const summary = changeSummary(s);
    const changesList = summary.length > 0
      ? h("ul", { class: "pub-changes", attrs: { "aria-label": "Changes that are not published" } }, ...summary.map((row) =>
        h("li", {}, h("span", { class: "pub-page", text: row.page }), h("span", { class: "pub-labels", text: row.labels.join(", ") }))))
      : null;
    const more = s.changes.length > 8 ? h("p", { class: "pub-meta", text: `and ${s.changes.length - 8} more` }) : null;

    const publishButton = (label: string) => {
      const b = h("button", { class: "btn btn-primary", text: label, attrs: { type: "button", "data-publish-confirm": "" } });
      if (publishing) b.setAttribute("aria-busy", "true");
      b.addEventListener("click", () => void publish());
      return b;
    };
    const cancel = where === "popover" ? Object.assign(h("button", { class: "btn btn-ghost", text: "Cancel", attrs: { type: "button" } }), { onclick: () => closeReview() }) : null;
    const errorBox = publishError ? h("div", { class: "alert alert-error", attrs: { role: "alert" } }, icon("alert", "icon-sm"), h("span", { text: publishError })) : null;

    const actions = (label: string) => h("div", { class: "pub-actions" }, cancel, publishButton(label));
    const parts: (HTMLElement | null)[] = [];
    switch (site.kind) {
      case "never":
        parts.push(title("Publish your website?"), errorBox,
          changesList ?? h("p", { class: "pub-text", text: "Your whole website will be published, exactly as it shows in the editor." }), more,
          h("p", { class: "pub-text", text: "Visitors will find it at this address. You can change the address in Website settings." }), addressRow, actions("Publish"));
        break;
      case "changes":
        parts.push(title("Publish your changes?"), errorBox,
          changesList ?? h("p", { class: "pub-text", text: "You have changes from an earlier visit that are not published yet." }), more, liveLine, addressRow, actions("Publish"));
        break;
      case "older":
        parts.push(title(`Visitors see version ${site.live}`), errorBox,
          h("p", { class: "pub-text", text: site.draftChanged ? `Your editor has newer changes than version ${site.live}. Publish to show them to visitors.` : `Your editor shows the same website as version ${site.live}.` }),
          changesList, addressRow, site.draftChanged ? actions("Publish my latest changes") : null);
        break;
      case "current": {
        const view = h("a", { class: "btn btn-secondary btn-sm", attrs: { href: s.project.site_url, target: "_blank", rel: "noopener noreferrer" } }, h("span", { text: "View website" }), icon("view-live", "icon-sm"));
        parts.push(title("Everything is published."), liveLine, addressRow, h("div", { class: "pub-actions pub-actions-start" }, view));
        break;
      }
    }
    out.push(...parts.filter((el): el is HTMLElement => el !== null));
    if (where === "popover") {
      const history = h("button", { class: "link-btn", text: "Version history", attrs: { type: "button" } });
      history.addEventListener("click", () => {
        closeReview();
        openHistory(popTrigger);
      });
      out.push(h("div", { class: "pub-foot" }, history));
    }
    return out;
  }

  function renderReview(): void {
    const s = store.get();
    if (!pop.hidden) {
      const focusedConfirm = document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("data-publish-confirm");
      pop.replaceChildren(...review(s, "popover"));
      if (focusedConfirm) pop.querySelector<HTMLElement>("[data-publish-confirm]")?.focus();
    }
    if (manageReview) manageReview.replaceChildren(...review(s, "manage"));
  }

  function placeReview(): void {
    const anchor = popTrigger ?? document.querySelector<HTMLElement>('[data-action="publish"]');
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    pop.style.top = `${Math.round(r.bottom + 8)}px`;
    pop.style.right = `${Math.round(Math.max(8, window.innerWidth - r.right))}px`;
  }

  function onOutside(event: Event): void {
    if (event.target instanceof Node && (pop.contains(event.target) || popTrigger?.contains(event.target))) return;
    closeReview(false);
  }

  function openReview(trigger: HTMLElement | null = null): void {
    if (!pop.hidden) {
      closeReview();
      return;
    }
    popTrigger = trigger;
    publishError = null;
    pop.hidden = false;
    trigger?.setAttribute("aria-expanded", "true");
    document.body.toggleAttribute("data-review-open", true);
    renderReview();
    placeReview();
    document.addEventListener("pointerdown", onOutside, true);
    const target = pop.querySelector<HTMLElement>("[data-publish-confirm]") ?? pop.querySelector<HTMLElement>("a, button");
    target?.focus();
    if (store.get().releases === null) void loadReleases();
  }

  function closeReview(restore = true): boolean {
    if (pop.hidden) return false;
    pop.hidden = true;
    pop.replaceChildren();
    document.body.toggleAttribute("data-review-open", false);
    document.removeEventListener("pointerdown", onOutside, true);
    popTrigger?.setAttribute("aria-expanded", "false");
    if (restore) {
      const fallback = document.querySelector<HTMLElement>("[data-status-pill]");
      const target = popTrigger && !(popTrigger as HTMLButtonElement).disabled ? popTrigger : fallback;
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
    if (!pop.hidden) placeReview();
  });

  /* Version history */

  async function publishAgain(release: Release): Promise<void> {
    const ok = await confirmDialog({
      title: `Publish version ${release.number} again?`,
      text: `Visitors will see version ${release.number} right away. Your editor keeps your newer changes, so you can publish them again later.`,
      ok: `Publish version ${release.number}`,
    });
    if (!ok) return;
    const live = await change(async () => {
      const { release: activated } = await api.activate(pid(), release.number);
      const fresh = await api.bootstrap(pid());
      store.dispatch({ type: "bootstrapped", data: fresh });
      return activated;
    }, { log: "none" });
    if (!live) return;
    await loadReleases();
    announce(`Version ${live.number} is now what visitors see`);
    toast(`Visitors now see version ${live.number}.`, { action: { label: "View website", run: viewWebsite } });
  }

  async function openVersion(release: Release): Promise<void> {
    const ok = await confirmDialog({
      title: `Open version ${release.number} in the editor?`,
      text: `Your editor will show version ${release.number}. Visitors see no change until you publish, and Undo brings your current changes back.`,
      ok: `Open version ${release.number}`,
    });
    if (!ok) return;
    const result = await change((base) => api.restore(pid(), base, release.number));
    if (!result) return;
    if (historySheet.open) historySheet.close();
    await afterRestore(result.pages);
    toast(`Version ${release.number} is now in the editor.`);
  }

  function releaseRows(s: State, compact: boolean): HTMLElement[] {
    const releases = s.releases ?? [];
    if (releases.length === 0) {
      return [h("li", { class: "release-empty" }, h("p", { class: "hint", text: s.releases === null ? "Loading versions…" : "Each time you publish, a version is saved here so you can go back to it." }))];
    }
    const liveNumber = s.project.live_release?.number ?? null;
    return releases.slice(0, 30).map((r) => {
      const isLive = r.number === liveNumber;
      const actions = h("div", { class: "release-actions" });
      if (!isLive) {
        const live = h("button", { class: "btn btn-secondary btn-sm", text: "Publish again", attrs: { type: "button", "aria-label": `Publish version ${r.number} again` } });
        live.addEventListener("click", () => void publishAgain(r));
        actions.append(live);
      }
      if (!compact) {
        const open = h("button", { class: "btn btn-ghost btn-sm", text: "Open in editor", attrs: { type: "button", "aria-label": `Open version ${r.number} in the editor` } });
        open.addEventListener("click", () => void openVersion(r));
        actions.append(open);
      }
      return h("li", { class: `release${isLive ? " is-live" : ""}` },
        h("div", { class: "release-head" },
          h("span", { class: "release-number", text: `Version ${r.number}` }),
          isLive ? h("span", { class: "pill pill-published", text: "Published" }) : null),
        h("p", { class: "release-meta" }, h("time", { text: dateTime(r.created_at), attrs: { datetime: r.created_at } }), h("span", { text: ` · ${timeAgo(r.created_at)}` })),
        actions);
    });
  }

  function renderHistory(): void {
    const s = store.get();
    if (historySheet.open) historyList.replaceChildren(...releaseRows(s, false));
    if (manageHistory) manageHistory.replaceChildren(...releaseRows(s, true));
  }

  must<HTMLButtonElement>(historySheet, "[data-close]").addEventListener("click", () => historySheet.close());

  function openHistory(_trigger: HTMLElement | null = null): void {
    historyList.replaceChildren(...releaseRows(store.get(), false));
    historySheet.showModal();
    historySheet.querySelector<HTMLElement>(".release button, [data-close]")?.focus();
    void loadReleases();
  }

  /* Website settings: name, address and own domain */

  const settingsForm = must<HTMLFormElement>(settings, "[data-settings-form]");
  const siteName = must<HTMLInputElement>(settings, "[data-settings-name]");
  const siteSlug = must<HTMLInputElement>(settings, "[data-settings-slug]");
  const suffix = must<HTMLElement>(settings, "[data-settings-suffix]");
  const settingsError = must<HTMLElement>(settings, "[data-settings-error]");
  const domainSection = must<HTMLElement>(settings, "[data-domain-section]");
  const domainList = must<HTMLElement>(settings, "[data-domain-list]");
  const domainForm = must<HTMLFormElement>(settings, "[data-domain-form]");
  const domainInput = must<HTMLInputElement>(settings, "[data-domain-input]");
  const domainError = must<HTMLElement>(settings, "[data-domain-error]");
  must<HTMLButtonElement>(settings, "[data-close]").addEventListener("click", () => settings.close());

  siteSlug.addEventListener("input", () => {
    const cleaned = siteSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (cleaned !== siteSlug.value) siteSlug.value = cleaned;
  });
  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    settingsError.hidden = true;
    const submit = settingsForm.querySelector<HTMLButtonElement>("[type=submit]");
    submit?.setAttribute("aria-busy", "true");
    try {
      const { project } = await api.settings(pid(), siteName.value.trim(), siteSlug.value.trim());
      store.dispatch({ type: "project", project: { ...project, revision: store.get().project.revision } });
      toast("Website settings saved");
    } catch (e) {
      settingsError.hidden = false;
      settingsError.textContent = e instanceof Error ? e.message : "Something went wrong.";
    } finally {
      submit?.removeAttribute("aria-busy");
    }
  });

  function copyButton(value: string, label: string): HTMLButtonElement {
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

  function dnsTable(domain: Domain, dns: Dns | null): HTMLElement {
    const apex = domain.hostname.split(".").length === 2;
    const rows: [string, string, string, string][] = [["TXT", domain.txt_name, domain.txt_value, "Proves that you own this domain."]];
    if (dns) rows.push(apex ? ["A", domain.hostname, dns.a_record, "Points your domain to Pagehaven."] : ["CNAME", domain.hostname, dns.cname_target, "Points your domain to Pagehaven. Some providers want only the first part of the name, like www."]);
    return h("table", { class: "table dns-table" },
      h("thead", {}, h("tr", {}, h("th", { text: "Type", attrs: { scope: "col" } }), h("th", { text: "Name", attrs: { scope: "col" } }), h("th", { text: "Value", attrs: { scope: "col" } }))),
      h("tbody", {}, ...rows.map(([type, name, value, why]) => h("tr", {},
        h("td", { class: "dns-type", attrs: { "data-label": "Type" } }, h("span", { text: type }), h("span", { class: "hint dns-why", text: why })),
        h("td", { attrs: { "data-label": "Name" } }, h("code", { class: "dns-value", text: name }), copyButton(name, `${type} name`)),
        h("td", { attrs: { "data-label": "Value" } }, h("code", { class: "dns-value", text: value }), copyButton(value, `${type} value`))))));
  }

  function domainCard(domain: Domain, dns: Dns | null): HTMLElement {
    const verified = domain.status === "verified";
    const remove = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": `Remove ${domain.hostname}`, "data-tip": "Remove this domain" } }, icon("close", "icon-sm"));
    remove.addEventListener("click", async () => {
      const ok = await confirmDialog({ title: `Remove ${domain.hostname}?`, text: "Your website will stop showing at this address.", ok: "Remove", danger: true });
      if (!ok) return;
      try {
        await api.deleteDomain(pid(), domain.id);
        await loadDomains();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong.", { kind: "error" });
      }
    });
    const card = h("div", { class: "domain" },
      h("div", { class: "domain-head" },
        h("strong", { class: "domain-name", text: domain.hostname }),
        h("span", { class: `pill ${verified ? "pill-published" : "pill-pending"}`, text: verified ? "Connected" : "Waiting for your domain settings" }),
        remove));
    if (verified) {
      card.append(h("a", { class: "small", text: `Open ${domain.hostname}`, attrs: { href: domain.url, target: "_blank", rel: "noopener noreferrer" } }));
      return card;
    }
    card.append(h("p", { class: "hint", text: "Add these records where you bought your domain, then press Check now. It can take a few minutes." }), dnsTable(domain, dns));
    if (domain.last_error) card.append(h("div", { class: "alert alert-warn", attrs: { role: "status" } }, icon("alert", "icon-sm"), h("span", { text: domain.last_error })));
    const check = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button" } }, icon("refresh", "icon-sm"), h("span", { text: "Check now" }));
    check.addEventListener("click", async () => {
      check.setAttribute("aria-busy", "true");
      try {
        const { domain: updated } = await api.checkDomain(pid(), domain.id);
        const domains = (store.get().domains ?? []).map((d) => (d.id === updated.id ? updated : d));
        store.dispatch({ type: "domains", domains, dns: store.get().dns });
        announce(updated.status === "verified" ? `${updated.hostname} is connected` : "Not connected yet");
        if (updated.status === "verified") toast(`${updated.hostname} is connected`);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong.", { kind: "error" });
      } finally {
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
    if (!hostname) return;
    try {
      const { domain } = await api.addDomain(pid(), hostname);
      store.dispatch({ type: "domains", domains: [...(store.get().domains ?? []), domain], dns: store.get().dns });
      domainInput.value = "";
    } catch (e) {
      domainError.hidden = false;
      domainError.textContent = e instanceof Error ? e.message : "Something went wrong.";
      domainInput.setAttribute("aria-invalid", "true");
    }
  });

  function openSettings(_trigger: HTMLElement | null = null): void {
    const s = store.get();
    siteName.value = s.project.name;
    siteSlug.value = s.project.slug;
    settingsError.hidden = true;
    settings.showModal();
    siteName.focus();
    if (s.customDomains) void loadDomains();
  }

  function renderAll(): void {
    renderReview();
    renderHistory();
  }

  store.subscribe((s, prev) => {
    if (changed(s, prev, "project", "draftChanged", "changes", "releases", "saves", "pages")) renderAll();
    if (changed(s, prev, "customDomains")) domainSection.hidden = !s.customDomains;
    if (changed(s, prev, "domains", "dns")) domainList.replaceChildren(...(s.domains ?? []).map((d) => domainCard(d, s.dns)));
    if (changed(s, prev, "project")) {
      try {
        const host = new URL(s.project.site_url).host;
        suffix.textContent = host.startsWith(`${s.project.slug}.`) ? host.slice(s.project.slug.length) : `.${host.split(".").slice(1).join(".")}`;
      } catch {
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
