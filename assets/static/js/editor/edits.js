import { announce, toast } from "../ui.js";
import { api } from "./api.js";
import {} from "./saves.js";
import { unsupportedStyles } from "./state.js";
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/;
/** Shapes closer than this are treated as the same, and the file is uploaded untouched. */
const SAME_SHAPE = 0.02;
const MAX_SIDE = 3200;
/**
 * The pixel box to draw `source` into so the result has the frame's shape. "fill" crops the
 * middle of the picture; "whole" keeps all of it and pads the short side. Never upscales.
 */
export function fitBox(source, frame, fit) {
    if (source.width <= 0 || source.height <= 0 || frame.width <= 0 || frame.height <= 0)
        return null;
    const target = frame.width / frame.height;
    const ratio = source.width / source.height;
    if (Math.abs(ratio / target - 1) < SAME_SHAPE)
        return null;
    const full = { x: 0, y: 0, width: source.width, height: source.height };
    let canvas;
    let draw;
    let crop = full;
    if (fit === "fill") {
        crop = ratio > target
            ? { x: (source.width - source.height * target) / 2, y: 0, width: source.height * target, height: source.height }
            : { x: 0, y: (source.height - source.width / target) / 2, width: source.width, height: source.width / target };
        canvas = { width: crop.width, height: crop.height };
        draw = { x: 0, y: 0, width: crop.width, height: crop.height };
    }
    else {
        canvas = ratio > target ? { width: source.width, height: source.width / target } : { width: source.height * target, height: source.height };
        draw = { x: (canvas.width - source.width) / 2, y: (canvas.height - source.height) / 2, width: source.width, height: source.height };
    }
    const shrink = Math.min(1, MAX_SIDE / Math.max(canvas.width, canvas.height));
    const scale = (b) => ({ x: Math.round(b.x * shrink), y: Math.round(b.y * shrink), width: Math.round(b.width * shrink), height: Math.round(b.height * shrink) });
    return { canvas: { width: Math.round(canvas.width * shrink), height: Math.round(canvas.height * shrink) }, draw: scale(draw), crop };
}
function toBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
/** Redraws `file` in the frame's shape. Animated GIFs and anything the browser can't draw go up as they are. */
async function shapeToFrame(file, frame, fit, limit) {
    if (file.type === "image/gif")
        return file;
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    }
    catch {
        return file;
    }
    const box = fitBox({ width: bitmap.width, height: bitmap.height }, frame, fit);
    if (!box) {
        bitmap.close();
        return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = box.canvas.width;
    canvas.height = box.canvas.height;
    const context = canvas.getContext("2d");
    if (!context)
        return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, box.crop.x, box.crop.y, box.crop.width, box.crop.height, box.draw.x, box.draw.y, box.draw.width, box.draw.height);
    bitmap.close();
    // Bands around a whole picture must stay see-through, so those go up as WebP or PNG.
    const type = fit === "whole" ? "image/webp" : file.type === "image/png" ? "image/png" : file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    for (const quality of [0.92, 0.82, 0.7]) {
        const blob = await toBlob(canvas, type, quality);
        if (!blob)
            break;
        if (blob.size <= limit || quality === 0.7) {
            const ext = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
            return new File([blob], `${file.name.replace(/\.[a-z0-9]+$/i, "")}.${ext}`, { type: blob.type });
        }
    }
    return file;
}
export function createEdits({ store, canvas, change, undo }) {
    const fileInput = document.querySelector("[data-image-input]");
    /** Saves one edit. `reload` reloads the canvas after it lands, keeping the selection when asked. */
    function save(edit, after = {}) {
        const page = after.page ?? store.get().path;
        const element = "element" in edit ? edit.element : null;
        return change((base) => api.edit(store.get().project.pid, base, page, edit), {
            page,
            element,
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
        if (unsupportedStyles(store.get().editSupport, styles).length > 0) {
            const message = "This server can't make that change yet. Reload the editor to see what it supports.";
            announce(message);
            toast(message, { kind: "warning" });
            return Promise.resolve(false);
        }
        canvas.send({ type: "preview_style", element: sel.element, styles });
        return save({ op: "set_style", element: sel.element, styles });
    }
    function undoToast(message, kind = "info") {
        announce(message);
        return toast(message, { kind, action: { label: "Undo", run: () => {
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
    /** The last replacement per picture, so the owner can switch between filling the frame and showing the whole picture. */
    const replacements = new Map();
    async function putImage(sel, file, frame, fit, alt, onProgress) {
        const page = store.get().path;
        const shaped = frame ? await shapeToFrame(file, frame, fit, store.get().imageBytes) : file;
        const uploaded = await upload(shaped, onProgress);
        if (!uploaded)
            return false;
        const ok = await save({ op: "set_image", element: sel.element, upload: uploaded.upload, alt }, { page });
        if (ok)
            replacements.set(sel.element, { file, frame, fit, alt });
        if (ok && store.get().path === page)
            canvas.send({ type: "preview_image", element: sel.element, src: uploaded.url, alt });
        return ok;
    }
    /**
     * Replaces an image and keeps the old picture's frame: the new one is cropped to the shape the
     * old one was shown at, so a grid of cards stays even. Resolves true once it shows on the canvas.
     */
    async function replaceImage(sel, file, onProgress) {
        const shown = sel.info.image;
        const frame = shown && shown.width > 0 && shown.height > 0 ? { width: shown.width, height: shown.height } : null;
        const ok = await putImage(sel, file, frame, "fill", sel.info.alt ?? "", onProgress);
        if (ok)
            announce("Picture replaced");
        return ok;
    }
    /** Puts the last replacement back in with the other fit. */
    async function refit(sel, fit) {
        const last = replacements.get(sel.element);
        if (!last || last.fit === fit)
            return false;
        const ok = await putImage(sel, last.file, last.frame, fit, sel.info.alt ?? last.alt, () => { });
        if (ok)
            announce(fit === "whole" ? "Showing the whole picture" : "The picture fills its frame");
        return ok;
    }
    function replacementOf(element) {
        const last = replacements.get(element);
        return last ? { fit: last.fit, framed: last.frame !== null } : null;
    }
    /** Replaces the background photo of `element`: the selection itself, or the banner around it. */
    async function replaceBackground(element, file, onProgress, done = "Background photo changed") {
        const page = store.get().path;
        const uploaded = await upload(file, onProgress);
        if (!uploaded)
            return false;
        const ok = await save({ op: "set_background_image", element, upload: uploaded.upload }, { page });
        if (ok && store.get().path === page) {
            canvas.send({ type: "preview_background", element, src: uploaded.url });
            undoToast(done);
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
    function setHidden(sel, hidden) {
        return once(sel, async () => {
            canvas.send({ type: "preview_hidden", element: sel.element, hidden });
            if (await save({ op: "hide_section", element: sel.element, hidden })) {
                const linked = hidden ? sel.info.anchorLinks : 0;
                if (linked > 0)
                    undoToast(`Section hidden on your website. ${linked === 1 ? "A link on this page jumps" : `${linked} links on this page jump`} to it, for example in your menu, and won't go anywhere until you show it again.`, "warning");
                else
                    undoToast(hidden ? "Section hidden on your website" : "Section shown on your website");
            }
        });
    }
    return { undo, save, setStyle, chooseImage, checkImage, replaceImage, refit, replacementOf, replaceBackground, setHidden, undoToast };
}
