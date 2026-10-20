import { toast } from "../ui.js";
import { ApiError } from "./api.js";
/** The result of a draft edit, rebuilt from the server's state. */
export function editRecovery(fresh) {
    return { revision: fresh.project.revision, history: fresh.history, draft_changed_since_publish: fresh.draft_changed_since_publish };
}
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
export function createSaver(store, fetchState) {
    let tail = Promise.resolve();
    let halted = false;
    let wake = null;
    let retryFailed = null;
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
            /** The revision the last attempt was sent with, when that attempt may have reached the server. */
            let uncertainBase = null;
            for (let attempt = 0;; attempt++) {
                if (halted) {
                    store.dispatch({ type: "save_conflict" });
                    return null;
                }
                const base = store.get().project.revision;
                try {
                    const result = await run(base);
                    retryFailed = null;
                    if (isSaved(result)) {
                        store.dispatch({
                            type: "save_ok",
                            revision: result.revision,
                            history: result.history,
                            draftChanged: result.draft_changed_since_publish,
                            log: options.log ?? "edit",
                            page: options.page ?? store.get().path,
                            element: options.element ?? null,
                            at: Date.now(),
                        });
                    }
                    else {
                        store.dispatch({ type: "save_settled" });
                    }
                    return result;
                }
                catch (error) {
                    if (!(error instanceof ApiError)) {
                        // A bug, not the network: report it once instead of retrying forever.
                        store.dispatch({ type: "save_failed", message: "Something went wrong. Please try again." });
                        toast("Something went wrong. Please try again.", { kind: "error" });
                        return null;
                    }
                    const failure = error;
                    if (failure.status === 0) {
                        uncertainBase = base;
                        store.dispatch({ type: "save_offline" });
                        await waitForRetry(attempt);
                        continue;
                    }
                    // A retry refused as stale right after a lost answer: if the server is exactly one
                    // revision on, the lost attempt is what moved it, so the change landed.
                    if (failure.status === 409 && options.recover && uncertainBase !== null && failure.revision === uncertainBase + 1) {
                        try {
                            const fresh = await fetchState();
                            if (fresh.project.revision === uncertainBase + 1) {
                                store.dispatch({
                                    type: "save_ok",
                                    revision: fresh.project.revision,
                                    history: fresh.history,
                                    draftChanged: fresh.draft_changed_since_publish,
                                    log: options.log ?? "edit",
                                    page: options.page ?? store.get().path,
                                    element: options.element ?? null,
                                    at: Date.now(),
                                });
                                return options.recover(fresh);
                            }
                        }
                        catch {
                            // Fall through to the conflict below.
                        }
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
                        retryFailed = () => change(run, options).then((result) => result !== null);
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
    return {
        change,
        async retryNow() {
            if (wake) {
                wake();
                return false;
            }
            const retry = retryFailed;
            retryFailed = null;
            return retry ? retry() : false;
        },
    };
}
