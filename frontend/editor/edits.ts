import type { StyleChanges } from "../protocol.js";
import { announce, toast } from "../ui.js";
import { api, type Edit } from "./api.js";
import type { Canvas } from "./canvas.js";
import type { Change } from "./saves.js";
import type { Selection, Store } from "./state.js";

export interface EditDeps {
  store: Store;
  canvas: Canvas;
  change: Change;
  undo(): void;
}

const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/;

/** The draft changes the toolbar and the rail make, with their live preview and feedback. */
export type Edits = ReturnType<typeof createEdits>;

export function createEdits({ store, canvas, change, undo }: EditDeps) {
  const fileInput = document.querySelector<HTMLInputElement>("[data-image-input]");

  /** Saves one edit. `reload` reloads the canvas after it lands, keeping the selection when asked. */
  function save(edit: Edit, after: { reload?: boolean; select?: boolean; pulse?: boolean; onRejected?: (message: string) => void; toastRejection?: boolean } = {}): Promise<boolean> {
    const page = store.get().path;
    const element = "element" in edit ? edit.element : null;
    return change((base) => api.edit(store.get().project.pid, base, page, edit), {
      toastRejection: after.toastRejection ?? true,
      onRejected: (error) => {
        after.onRejected?.(error.message);
        if (store.get().path === page) canvas.reload(element);
      },
    }).then((result) => {
      if (result && after.reload && store.get().path === page) canvas.reload(after.select ? element : null, after.pulse ?? false);
      return result !== null;
    });
  }

  function setStyle(sel: Selection, styles: StyleChanges): Promise<boolean> {
    canvas.send({ type: "preview_style", element: sel.element, styles });
    return save({ op: "set_style", element: sel.element, styles });
  }

  function undoToast(message: string): HTMLButtonElement | null {
    announce(message);
    return toast(message, { action: { label: "Undo", run: undo } });
  }

  /** Asks for a picture. Resolves with null when the owner cancels or the file is refused. */
  function chooseImage(): Promise<File | null> {
    return new Promise((resolve) => {
      if (!fileInput) return resolve(null);
      fileInput.value = "";
      const finish = () => {
        fileInput.removeEventListener("change", finish);
        fileInput.removeEventListener("cancel", finish);
        const file = fileInput.files?.[0] ?? null;
        resolve(file && checkImage(file) ? file : null);
      };
      fileInput.addEventListener("change", finish);
      fileInput.addEventListener("cancel", finish);
      fileInput.click();
    });
  }

  function checkImage(file: File): boolean {
    const limit = store.get().imageBytes;
    if (!IMAGE_TYPES.test(file.type)) {
      toast("Choose a PNG, JPEG, GIF, WebP or AVIF picture.", { kind: "error" });
      return false;
    }
    if (file.size > limit) {
      toast(`This picture is too big. The limit is ${Math.round(limit / (1024 * 1024))} MB.`, { kind: "error" });
      return false;
    }
    return true;
  }

  async function upload(file: File, onProgress: (fraction: number) => void): Promise<{ upload: string; url: string } | null> {
    store.dispatch({ type: "save_queued" });
    try {
      const uploaded = await api.uploadImage(store.get().project.pid, file, onProgress);
      store.dispatch({ type: "save_settled" });
      return uploaded;
    } catch (error) {
      store.dispatch({ type: "save_settled" });
      toast(error instanceof Error ? error.message : "The picture could not be uploaded.", { kind: "error" });
      return null;
    }
  }

  /** Replaces an image. Resolves true once the new picture shows on the canvas. */
  async function replaceImage(sel: Selection, file: File, onProgress: (fraction: number) => void): Promise<boolean> {
    const page = store.get().path;
    const uploaded = await upload(file, onProgress);
    if (!uploaded) return false;
    const alt = sel.info.alt ?? "";
    const ok = await save({ op: "set_image", element: sel.element, upload: uploaded.upload, alt });
    if (ok && store.get().path === page) {
      canvas.send({ type: "preview_image", element: sel.element, src: uploaded.url, alt });
      announce("Picture replaced");
    }
    return ok;
  }

  async function replaceBackground(sel: Selection, file: File, onProgress: (fraction: number) => void): Promise<boolean> {
    const page = store.get().path;
    const uploaded = await upload(file, onProgress);
    if (!uploaded) return false;
    const ok = await save({ op: "set_background_image", element: sel.element, upload: uploaded.upload });
    if (ok && store.get().path === page) {
      canvas.send({ type: "preview_background", element: sel.element, src: uploaded.url });
      undoToast("Background photo replaced");
    }
    return ok;
  }

  async function moveSection(sel: Selection, direction: "up" | "down"): Promise<void> {
    if (await save({ op: "move_section", element: sel.element, direction }, { reload: true, select: true, pulse: true })) {
      undoToast(direction === "up" ? "Section moved up" : "Section moved down");
    }
  }

  async function duplicateSection(sel: Selection): Promise<void> {
    if (await save({ op: "duplicate_section", element: sel.element }, { reload: true, select: true, pulse: true })) {
      undoToast("Section duplicated. The copy is right below it.");
    }
  }

  async function setHidden(sel: Selection, hidden: boolean): Promise<void> {
    canvas.send({ type: "preview_hidden", element: sel.element, hidden });
    if (await save({ op: "hide_section", element: sel.element, hidden })) {
      undoToast(hidden ? "Section hidden on your website" : "Section shown on your website");
    }
  }

  async function removeSection(sel: Selection): Promise<void> {
    if (await save({ op: "remove_section", element: sel.element }, { reload: true })) {
      undoToast("Section removed")?.focus();
    }
  }

  return { undo, save, setStyle, chooseImage, checkImage, replaceImage, replaceBackground, moveSection, duplicateSection, setHidden, removeSection, undoToast };
}
