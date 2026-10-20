import { h, must } from "../ui.js";
import type { Canvas } from "./canvas.js";
import { openMenu, type MenuItem } from "./menu.js";
import type { Publishing } from "./publish.js";
import { pageLabel } from "./pages.js";
import type { Rail } from "./rail.js";
import { icon } from "../ui.js";
import { changed, siteState, statusLine, type Device, type Mode, type Store } from "./state.js";

export interface TopBarDeps {
  store: Store;
  canvas: Canvas | null;
  rail: Rail | null;
  publishing: Publishing;
  undo(): void;
  redo(): void;
}

export interface TopBar {
  openPages(): void;
}

const SAVING_DELAY_MS = 400;

function sentence(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function createTopBar({ store, canvas, rail, publishing, undo, redo }: TopBarDeps): TopBar {
  const undoBtn = must<HTMLButtonElement>(document, '[data-action="undo"]');
  const redoBtn = must<HTMLButtonElement>(document, '[data-action="redo"]');
  const pill = must<HTMLButtonElement>(document, "[data-status-pill]");
  const pillText = must<HTMLElement>(pill, "[data-status-text]");
  const pillMark = must<HTMLElement>(pill, "[data-status-mark]");
  const publishBtn = must<HTMLButtonElement>(document, '[data-action="publish"]');
  const viewLink = must<HTMLAnchorElement>(document, "[data-view-site]");
  const siteButton = must<HTMLButtonElement>(document, "[data-site-menu]");
  const siteName = must<HTMLElement>(document, "[data-site-name]");
  const pageButton = must<HTMLButtonElement>(document, "[data-page-switcher]");
  const pageName = must<HTMLElement>(document, "[data-page-name]");
  const modeButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-mode]")];
  const deviceButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-device]")];
  let savingVisible = false;
  let savingTimer = 0;

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  for (const b of modeButtons) b.addEventListener("click", () => store.dispatch({ type: "mode", mode: b.dataset["mode"] as Mode }));
  for (const b of deviceButtons) b.addEventListener("click", () => store.dispatch({ type: "device", device: b.dataset["device"] as Device }));
  pill.addEventListener("click", () => publishing.openReview(pill));
  publishBtn.addEventListener("click", () => publishing.openReview(publishBtn));

  siteButton.addEventListener("click", () => {
    const s = store.get();
    const items: MenuItem[] = [
      { label: "Website settings", icon: "domain", run: () => publishing.openSettings(siteButton) },
      { label: "Version history", run: () => publishing.openHistory(siteButton) },
    ];
    if (s.project.live_release) items.push({ label: "View website", icon: "view-live", run: () => window.open(s.project.site_url, "_blank", "noopener,noreferrer") });
    items.push("separator", { label: "Keyboard shortcuts", detail: "?", run: () => document.querySelector<HTMLDialogElement>('dialog[data-dialog="shortcuts"]')?.showModal() });
    openMenu(siteButton, items, { label: "Website" });
  });

  function openPages(): void {
    const s = store.get();
    if (!canvas) return;
    openMenu(pageButton, [
      ...s.pages.map((p): MenuItem => ({
        label: pageLabel(p, s.project.name),
        detail: `/${p.path}`,
        checked: p.path === s.path,
        run: () => {
          if (store.get().path !== p.path) canvas.open(p.path);
        },
      })),
      "separator",
      { label: "Add page…", icon: "add-page", run: () => rail?.openAddPage() },
    ], { label: "Pages" });
  }
  pageButton.addEventListener("click", openPages);

  let renderedMark: string | null = null;
  function renderPill(): void {
    const s = store.get();
    const view = statusLine(s, savingVisible);
    pill.dataset["tone"] = view.tone;
    pill.setAttribute("aria-busy", String(view.mark === "saving"));
    pillText.replaceChildren(h("span", { class: "ed-status-save", text: view.save }),
      ...(view.publish ? [h("span", { class: "ed-status-sep", text: "·", attrs: { "aria-hidden": "true" } }), h("span", { class: "ed-status-publish", text: view.publish })] : []));
    if (view.mark !== renderedMark) {
      renderedMark = view.mark;
      pillMark.replaceChildren(view.mark === "saved" ? icon("check", "icon-sm") : view.mark === "problem" ? icon("alert", "icon-sm") : "");
      pillMark.dataset["mark"] = view.mark ?? "";
    }
    const saved = s.saves.savedAt ? `Last saved ${new Date(s.saves.savedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}. ` : "Changes save automatically. ";
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
      } else if (!pending) {
        window.clearTimeout(savingTimer);
        savingTimer = 0;
        savingVisible = false;
      }
    }
    if (changed(s, prev, "saves", "project", "draftChanged", "changes", "releases")) {
      renderPill();
      const site = siteState(s);
      publishBtn.disabled = !s.draftChanged;
      publishBtn.dataset["tip"] = s.draftChanged
        ? site.kind === "never" ? "Review and publish your website" : "Review your changes and publish them"
        : "Nothing new to publish. Visitors see your latest changes.";
      viewLink.hidden = s.project.live_release === null || s.draftChanged;
      viewLink.href = s.project.site_url;
      viewLink.setAttribute("aria-label", "View website (opens in a new tab)");
    }
    if (changed(s, prev, "mode")) for (const b of modeButtons) b.setAttribute("aria-pressed", String(b.dataset["mode"] === s.mode));
    if (changed(s, prev, "device")) for (const b of deviceButtons) b.setAttribute("aria-pressed", String(b.dataset["device"] === s.device));
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
    if (saves.pending > 0 || saves.problem) event.preventDefault();
  });

  return { openPages };
}
