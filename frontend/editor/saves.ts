import { toast } from "../ui.js";
import { ApiError } from "./api.js";
import type { History } from "./api.js";
import type { Store } from "./state.js";

interface Saved {
  revision: number;
  history: History;
  draft_changed_since_publish: boolean;
}

export interface ChangeOptions {
  /** Runs when the server refuses the change (422), after the message is shown. */
  onRejected?: (error: ApiError) => void;
  /** Show refusals in a toast. Off when the caller shows the message itself. */
  toastRejection?: boolean;
}

export type Change = <T>(run: (baseRevision: number) => Promise<T>, options?: ChangeOptions) => Promise<T | null>;

function isSaved(value: unknown): value is Saved {
  return typeof value === "object" && value !== null && "revision" in value && "history" in value && "draft_changed_since_publish" in value;
}

/**
 * Serializes every draft change: one request in flight, the rest queued, each sent with the
 * revision the previous one produced. Anything that must see the latest revision (publishing,
 * refreshing the page list) goes through the same queue. After a conflict the queue stops and
 * the conflict dialog asks the user to reload.
 */
export function createSaver(store: Store): Change {
  let tail: Promise<unknown> = Promise.resolve();
  let halted = false;

  return function change<T>(run: (baseRevision: number) => Promise<T>, options: ChangeOptions = {}): Promise<T | null> {
    store.dispatch({ type: "save_queued" });
    const job = tail.then(async (): Promise<T | null> => {
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
        } else {
          store.dispatch({ type: "save_settled" });
        }
        return result;
      } catch (error) {
        const failure = error instanceof ApiError ? error : new ApiError(0, "failed", "Something went wrong. Please try again.");
        if (failure.status === 409) {
          halted = true;
          store.dispatch({ type: "save_failed", message: "Not saved" });
        } else if (failure.status === 422 || failure.status === 413 || failure.status === 403) {
          store.dispatch({ type: "save_settled" });
          if (options.toastRejection !== false) toast(failure.message, "error", 6000);
          options.onRejected?.(failure);
        } else {
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
