import { obj, str } from "./schema.js";
import { must, toast } from "./ui.js";

/** What happened to a delete request, from the status and body of `DELETE /api/projects/{pid}`. */
export type DeleteOutcome =
  | { kind: "deleted" }
  | { kind: "refused"; message: string }
  | { kind: "signed_out" }
  | { kind: "failed"; message: string };

const parseError = obj({ error: str(64), message: str(1000) });

export function deleteRequest(confirmName: string): RequestInit {
  return {
    method: "DELETE",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_name: confirmName }),
    credentials: "same-origin",
    cache: "no-store",
  };
}

export function deleteOutcome(status: number, body: unknown): DeleteOutcome {
  if (status === 204) return { kind: "deleted" };
  if (status === 401) return { kind: "signed_out" };
  const error = parseError(body);
  if (status === 422) return { kind: "refused", message: error?.message ?? "Type the website's current name to delete it." };
  if (status === 404) return { kind: "failed", message: "This website no longer exists. Reload the page to see your websites." };
  return { kind: "failed", message: error?.message ?? "We couldn't delete the website. Please try again in a moment." };
}

/** The typed name must match exactly, as the server checks it. */
export function confirmsName(typed: string, name: string): boolean {
  return typed === name;
}

/** The inline message for a field the browser considers invalid, or null when it is fine.
 *  Length is checked from the value because browsers report tooShort only after the user types. */
export function fieldMessage(validity: Pick<ValidityState, "valueMissing" | "typeMismatch">, field: { type: string; value: string; minLength: number; label: string }): string | null {
  if (validity.valueMissing) return `Enter your ${field.label.toLowerCase().replace(/^your /, "")}.`;
  if (validity.typeMismatch && field.type === "email") return "Enter an email address like name@example.com.";
  if (field.minLength > 0 && field.value.length < field.minLength) return `Use at least ${field.minLength} characters.`;
  return null;
}

const FLASH_KEY = "ph.flash";

function wireMenus(): void {
  const openMenus = () => document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]");
  document.addEventListener("click", (event) => {
    const inside = event.target instanceof Element ? event.target.closest("details[data-menu]") : null;
    for (const menu of openMenus()) if (menu !== inside) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const menu of openMenus()) {
      const hadFocus = menu.contains(document.activeElement);
      menu.open = false;
      if (hadFocus) menu.querySelector("summary")?.focus();
    }
  });
  document.addEventListener("focusin", (event) => {
    const inside = event.target instanceof Element ? event.target.closest("details[data-menu]") : null;
    for (const menu of openMenus()) if (menu !== inside) menu.open = false;
  });
}

function wireForms(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>("form[data-submit-once]")) {
    form.noValidate = true;
    const fields = [...form.querySelectorAll<HTMLInputElement>("input[data-validate]")];
    const check = (input: HTMLInputElement): boolean => {
      const label = form.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)?.textContent?.trim() ?? "value";
      const message = fieldMessage(input.validity, { type: input.type, value: input.value, minLength: input.minLength, label });
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${input.id}"]`);
      if (slot) {
        slot.textContent = message ?? "";
        slot.hidden = message === null;
      }
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      return message === null;
    };
    for (const input of fields) {
      input.addEventListener("blur", () => {
        if (input.value !== "") check(input);
      });
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") check(input);
      });
    }
    form.addEventListener("submit", (event) => {
      const invalid = fields.filter((input) => !check(input));
      if (invalid.length > 0) {
        event.preventDefault();
        invalid[0]?.focus();
        return;
      }
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (button) window.setTimeout(() => button.setAttribute("aria-busy", "true"), 0);
    });
  }

  for (const toggle of document.querySelectorAll<HTMLButtonElement>("button[data-show-password]")) {
    const input = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    if (!(input instanceof HTMLInputElement)) continue;
    const word = must<HTMLElement>(toggle, "[data-show-word]");
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!showing));
      word.textContent = showing ? "Show" : "Hide";
    });
  }
}

function wireThumbnails(): void {
  document.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-thumb")) return;
    const placeholder = img.parentElement?.querySelector<HTMLElement>(".placeholder-thumb");
    img.remove();
    if (placeholder) placeholder.hidden = false;
  }, true);
}

export function renameRequest(name: string, slug: string): RequestInit {
  return {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), slug }),
    credentials: "same-origin",
    cache: "no-store",
  };
}

function wireRename(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-rename-dialog]");
  if (!dialog) return;
  const form = must<HTMLFormElement>(dialog, "[data-rename-form]");
  const input = must<HTMLInputElement>(dialog, "[data-rename-input]");
  const error = must<HTMLElement>(dialog, "[data-rename-error]");
  const submit = must<HTMLButtonElement>(dialog, "[data-rename-submit]");
  let target: { pid: string; slug: string; trigger: HTMLElement } | null = null;
  const showError = (message: string | null) => {
    error.textContent = message ?? "";
    error.hidden = message === null;
    input.setAttribute("aria-invalid", String(message !== null));
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-rename]")) {
    const site = button.closest<HTMLElement>("[data-site]");
    if (!site) continue;
    button.addEventListener("click", () => {
      const menu = site.querySelector<HTMLDetailsElement>("details[data-menu]");
      menu?.removeAttribute("open");
      target = { pid: site.dataset["pid"] ?? "", slug: site.dataset["slug"] ?? "", trigger: menu?.querySelector("summary") ?? button };
      input.value = site.dataset["name"] ?? "";
      showError(null);
      dialog.showModal();
      input.focus();
      input.select();
    });
  }
  must<HTMLButtonElement>(dialog, "[data-rename-cancel]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => target?.trigger.focus());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!target || submit.getAttribute("aria-busy") === "true") return;
    if (!input.value.trim()) {
      showError("Enter a name for your website.");
      input.focus();
      return;
    }
    submit.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(target.pid)}/settings`, renameRequest(input.value, target.slug));
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (response.ok) {
        sessionStorage.setItem(FLASH_KEY, "Website renamed.");
        window.location.reload();
        return;
      }
      const body: unknown = await response.json();
      showError(parseError(body)?.message ?? "We couldn’t save the name. Please try again.");
    } catch {
      showError("We couldn’t reach Rótulo. Check your connection and try again.");
    } finally {
      submit.removeAttribute("aria-busy");
    }
    input.focus();
  });
}

export function publicationTime(value: string): string | null {
  const date = /^-?\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatPublicationTimes(): void {
  for (const time of document.querySelectorAll<HTMLTimeElement>("[data-published-time]")) {
    const formatted = publicationTime(time.dateTime);
    if (formatted !== null) time.textContent = formatted;
  }
}

function wireDelete(): void {
  const dialog = document.querySelector<HTMLDialogElement>("dialog[data-delete-dialog]");
  if (!dialog) return;
  const form = must<HTMLFormElement>(dialog, "[data-delete-form]");
  const input = must<HTMLInputElement>(dialog, "[data-delete-input]");
  const error = must<HTMLElement>(dialog, "[data-delete-error]");
  const submit = must<HTMLButtonElement>(dialog, "[data-delete-submit]");
  let target: { pid: string; name: string; trigger: HTMLElement } | null = null;

  const showError = (message: string | null) => {
    error.textContent = message ?? "";
    error.hidden = message === null;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  for (const el of document.querySelectorAll<HTMLElement>("[data-delete-only]")) el.hidden = false;

  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-delete]")) {
    const site = button.closest<HTMLElement>("[data-site]");
    if (!site) continue;
    button.addEventListener("click", () => {
      const name = site.dataset["name"] ?? "";
      const summary = site.querySelector<HTMLElement>("details[data-menu] > summary");
      site.querySelector<HTMLDetailsElement>("details[data-menu]")?.removeAttribute("open");
      target = { pid: site.dataset["pid"] ?? "", name, trigger: summary ?? button };
      for (const el of dialog.querySelectorAll<HTMLElement>("[data-delete-name]")) el.textContent = name;
      const live = site.dataset["live"] === "true";
      must<HTMLElement>(dialog, "[data-delete-live]").hidden = !live;
      must<HTMLElement>(dialog, "[data-delete-address]").textContent = site.dataset["address"] ?? "";
      input.value = "";
      showError(null);
      submit.removeAttribute("aria-busy");
      dialog.showModal();
      input.focus();
    });
  }

  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true" && target && confirmsName(input.value, target.name)) showError(null);
  });

  must<HTMLButtonElement>(dialog, "[data-delete-cancel]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => target?.trigger.focus());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!target || submit.getAttribute("aria-busy") === "true") return;
    if (!confirmsName(input.value, target.name)) {
      showError(`That doesn't match. Type ${target.name} exactly as it's written.`);
      input.focus();
      return;
    }
    submit.setAttribute("aria-busy", "true");
    let result: DeleteOutcome;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(target.pid)}`, deleteRequest(input.value));
      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      result = deleteOutcome(response.status, body);
    } catch {
      result = { kind: "failed", message: "We couldn't reach Rótulo. Check your internet connection and try again." };
    }
    submit.removeAttribute("aria-busy");
    switch (result.kind) {
      case "deleted":
        sessionStorage.setItem(FLASH_KEY, `${target.name} was deleted.`);
        window.location.reload();
        break;
      case "signed_out":
        window.location.assign("/login");
        break;
      case "refused":
      case "failed":
        showError(result.message);
        input.focus();
        break;
    }
  });
}

function showFlash(): void {
  const message = sessionStorage.getItem(FLASH_KEY);
  if (!message) return;
  sessionStorage.removeItem(FLASH_KEY);
  toast(message);
}

if (typeof document !== "undefined") {
  if (document.querySelector("#import")) void import("./import.js");
  wireMenus();
  wireForms();
  wireThumbnails();
  wireDelete();
  wireRename();
  formatPublicationTimes();
  showFlash();
}
