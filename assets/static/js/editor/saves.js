import { toast } from "../ui.js";
import { ApiError } from "./api.js";
function isSaved(value) {
    return typeof value === "object" && value !== null && "revision" in value && "history" in value && "draft_changed_since_publish" in value;
}
/**
 * Serializes every draft change: one request in flight, the rest queued, each sent with the
 * revision the previous one produced. Anything that must see the latest revision (publishing,
 * refreshing the page list) goes through the same queue. After a conflict the queue stops and
 * the conflict dialog asks the user to reload.
 */
export function createSaver(store) {
    let tail = Promise.resolve();
    let halted = false;
    return function change(run, options = {}) {
        store.dispatch({ type: "save_queued" });
        const job = tail.then(async () => {
            if (halted) {
                store.dispatch({ type: "save_failed", message: "Not saved" });
                return null;
            }
            try {
                const result = await run(store.get().project.revision);
                if (isSaved(result)) {
                    store.dispatch({
                        type: "save_ok",
                        revision: result.revision,
                        history: result.history,
                        draftChanged: result.draft_changed_since_publish,
                    });
                }
                else {
                    store.dispatch({ type: "save_settled" });
                }
                return result;
            }
            catch (error) {
                const failure = error instanceof ApiError ? error : new ApiError(0, "failed", "Something went wrong. Please try again.");
                if (failure.status === 409) {
                    halted = true;
                    store.dispatch({ type: "save_failed", message: "Not saved" });
                }
                else if (failure.status === 422 || failure.status === 413 || failure.status === 403) {
                    store.dispatch({ type: "save_settled" });
                    if (options.toastRejection !== false)
                        toast(failure.message, "error", 6000);
                    options.onRejected?.(failure);
                }
                else {
                    store.dispatch({ type: "save_failed", message: failure.status === 0 ? "Offline, not saved" : "Not saved" });
                    toast(failure.message, "error", 6000);
                    options.onRejected?.(failure);
                }
                return null;
            }
        });
        tail = job;
        return job;
    };
}
