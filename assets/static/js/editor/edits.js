import { announce, toast } from "../ui.js";
import { api } from "./api.js";
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/;
export function createEdits({ store, canvas, change, undo }) {
    const fileInput = document.querySelector("[data-image-input]");
    /** Saves one edit. `reload` reloads the canvas after it lands, keeping the selection when asked. */
    function save(edit, after = {}) {
        const page = after.page ?? store.get().path;
        const element = "element" in edit ? edit.element : null;
        return change((base) => api.edit(store.get().project.pid, base, page, edit), {
            page,
            toastRejection: after.toastRejection ?? true,
            onRejected: (error) => {
                after.onRejected?.(error.message);
                if (store.get().path === page)
                    canvas.reload(element);
            },
        }).then((result) => {
            if (result && after.reload && store.get().path === page)
                canvas.reload(after.select ? element : null, after.pulse ?? false);
            return result !== null;
        });
    }
    function setStyle(sel, styles) {
        canvas.send({ type: "preview_style", element: sel.element, styles });
        return save({ op: "set_style", element: sel.element, styles });
    }
    function undoToast(message) {
        announce(message);
        return toast(message, { action: { label: "Undo", run: () => {
                    undo();
                    canvas.surface.focus({ preventScroll: true });
                } } });
    }
    /** Asks for a picture. Resolves with null when the owner cancels or the file is refused. */
    function chooseImage() {
        return new Promise((resolve) => {
            if (!fileInput)
                return resolve(null);
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
    function checkImage(file) {
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
    async function upload(file, onProgress) {
        store.dispatch({ type: "save_queued" });
        try {
            const uploaded = await api.uploadImage(store.get().project.pid, file, onProgress);
            store.dispatch({ type: "save_settled" });
            return uploaded;
        }
        catch (error) {
            store.dispatch({ type: "save_settled" });
            toast(error instanceof Error ? error.message : "The picture could not be uploaded.", { kind: "error" });
            return null;
        }
    }
    /** Replaces an image. Resolves true once the new picture shows on the canvas. */
    async function replaceImage(sel, file, onProgress) {
        const page = store.get().path;
        const uploaded = await upload(file, onProgress);
        if (!uploaded)
            return false;
        const alt = sel.info.alt ?? "";
        const ok = await save({ op: "set_image", element: sel.element, upload: uploaded.upload, alt }, { page });
        if (ok && store.get().path === page) {
            canvas.send({ type: "preview_image", element: sel.element, src: uploaded.url, alt });
            announce("Picture replaced");
        }
        return ok;
    }
    async function replaceBackground(sel, file, onProgress) {
        const page = store.get().path;
        const uploaded = await upload(file, onProgress);
        if (!uploaded)
            return false;
        const ok = await save({ op: "set_background_image", element: sel.element, upload: uploaded.upload }, { page });
        if (ok && store.get().path === page) {
            canvas.send({ type: "preview_background", element: sel.element, src: uploaded.url });
            undoToast("Background photo replaced");
        }
        return ok;
    }
    /** Section actions in flight, by element, so a double click does not move or copy twice. */
    const sectionBusy = new Set();
    async function once(sel, run) {
        if (sectionBusy.has(sel.element))
            return;
        sectionBusy.add(sel.element);
        try {
            await run();
        }
        finally {
            sectionBusy.delete(sel.element);
        }
    }
    function moveSection(sel, direction) {
        return once(sel, async () => {
            if (await save({ op: "move_section", element: sel.element, direction }, { reload: true, select: true, pulse: true })) {
                undoToast(direction === "up" ? "Section moved up" : "Section moved down");
            }
        });
    }
    function duplicateSection(sel) {
        return once(sel, async () => {
            if (await save({ op: "duplicate_section", element: sel.element }, { reload: true, select: true, pulse: true })) {
                undoToast("Section duplicated. The copy is right below it.");
            }
        });
    }
    function setHidden(sel, hidden) {
        return once(sel, async () => {
            canvas.send({ type: "preview_hidden", element: sel.element, hidden });
            if (await save({ op: "hide_section", element: sel.element, hidden })) {
                undoToast(hidden ? "Section hidden on your website" : "Section shown on your website");
            }
        });
    }
    function removeSection(sel) {
        return once(sel, async () => {
            if (await save({ op: "remove_section", element: sel.element }, { reload: true })) {
                undoToast("Section removed")?.focus();
            }
        });
    }
    return { undo, save, setStyle, chooseImage, checkImage, replaceImage, replaceBackground, moveSection, duplicateSection, setHidden, removeSection, undoToast };
}
