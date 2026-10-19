import { toast } from "../ui.js";
import { ApiError } from "./api.js";
function isSaved(value) {
    return typeof value === "object" && value !== null && "revision" in value && "history" in value && "draft_changed_since_publish" in value;
}
const RETRY_MS = [1000, 3000, 10000];
/**
 * Serializes every draft change: one request in flight, the rest queued, each sent with the
 * revision the previous one produced. Anything that must see the latest revision (publishing,
 * refreshing the page list) goes through the same queue. A change that fails because the
 * network is down stays first in the queue and is retried (1 s, 3 s, then every 10 s, and at
 * once when the browser comes back online). After a conflict the queue stops and the conflict
 * dialog asks the user to reload.
 */
export function createSaver(store) {
    let tail = Promise.resolve();
    let halted = false;
    let wake = null;
    function waitForRetry(attempt) {
        return new Promise((resolve) => {
            const done = () => {
                window.clearTimeout(timer);
                window.removeEventListener("online", done);
                wake = null;
                resolve();
            };
            const timer = window.setTimeout(done, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
            window.addEventListener("online", done);
            wake = done;
        });
    }
    function change(run, options = {}) {
        store.dispatch({ type: "save_queued" });
        const job = tail.then(async () => {
            for (let attempt = 0;; attempt++) {
                if (halted) {
                    store.dispatch({ type: "save_conflict" });
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
                            log: options.log ?? "edit",
                            at: Date.now(),
                        });
                    }
                    else {
                        store.dispatch({ type: "save_settled" });
                    }
                    return result;
                }
                catch (error) {
                    const failure = error instanceof ApiError ? error : new ApiError(0, "failed", "Something went wrong. Please try again.");
                    if (failure.status === 0) {
                        store.dispatch({ type: "save_offline" });
                        await waitForRetry(attempt);
                        continue;
                    }
                    if (failure.status === 409) {
                        halted = true;
                        store.dispatch({ type: "save_conflict" });
                    }
                    else if (failure.status === 422 || failure.status === 413 || failure.status === 403) {
                        store.dispatch({ type: "save_settled" });
                        if (options.toastRejection !== false)
                            toast(failure.message, { kind: "error" });
                        options.onRejected?.(failure);
                    }
                    else {
                        store.dispatch({ type: "save_failed", message: failure.message });
                        toast(failure.message, { kind: "error" });
                        options.onRejected?.(failure);
                    }
                    return null;
                }
            }
        });
        tail = job;
        return job;
    }
    return { change, retryNow: () => wake?.() };
}
