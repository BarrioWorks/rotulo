import type { Ancestor, Formats, Kind, Rect, SelectionInfo } from "../protocol.js";
import type { Bootstrap, Domain, Dns, History, Page, Project, Release } from "./api.js";

export type Mode = "edit" | "preview";
export type Device = "desktop" | "mobile";
export type Zoom = "fit" | "actual";

export interface Selection {
  element: string;
  can: string;
  tag: string;
  kind: Kind;
  name: string;
  ancestors: Ancestor[];
  rect: Rect;
  info: SelectionInfo;
}

export type Focus =
  | { kind: "none" }
  | { kind: "selected"; selection: Selection }
  | { kind: "blocked"; rect: Rect; around: string | null };

/** Panels with fields open in the left rail in place of the page list. */
export type Panel = "style" | "background" | "link" | "text-link" | "image" | "page";

/**
 * The left rail: the page list (with the first-time guidance when nothing is selected), the
 * page's pictures, or a panel. A panel remembers the kind of part it opened for, so selecting a
 * different kind of part returns to the pages instead of keeping an unrelated panel open.
 */
export type Rail =
  | { kind: "pages" }
  | { kind: "images" }
  | { kind: "panel"; panel: Panel; element: string | null; subject: Kind | null; replaced: boolean };

export interface OutlineImage {
  element: string;
  name: string;
  src: string;
}

/** The page's main heading and pictures, as the agent reported them. */
export interface Outline {
  heading: string | null;
  images: OutlineImage[];
}

/** Why the last save did not land. Saving and saved are read from `pending`. */
export type SaveProblem = { kind: "offline" } | { kind: "error"; message: string } | { kind: "conflict" };

export interface Saves {
  /** Draft changes queued or in flight. */
  pending: number;
  problem: SaveProblem | null;
  savedAt: number | null;
}

/** A change made in this session that is not live yet, named by its undo label. */
export interface LoggedChange {
  label: string;
  page: string;
}

export type SaveLog = "edit" | "undo" | "redo" | "none";

export interface State {
  project: Project;
  pages: Page[];
  path: string;
  previewOrigin: string;
  bootstrappedAt: number;
  imageBytes: number;
  customDomains: boolean;
  history: History;
  draftChanged: boolean;
  changes: LoggedChange[];
  mode: Mode;
  device: Device;
  zoom: Zoom;
  saves: Saves;
  focus: Focus;
  editing: { active: boolean; formats: Formats };
  canvasLoading: boolean;
  scrollY: number;
  obstructions: Rect[];
  /** Words and pictures around the selection, in the site's CSS pixels. */
  obstacles: Rect[];
  outline: Outline;
  palette: string[];
  anchors: { id: string; name: string }[];
  rail: Rail;
  pageMeta: { title: string; description: string };
  releases: Release[] | null;
  domains: Domain[] | null;
  dns: Dns | null;
}

export type Action =
  | { type: "bootstrapped"; data: Bootstrap }
  | { type: "mode"; mode: Mode }
  | { type: "device"; device: Device }
  | { type: "zoom"; zoom: Zoom }
  | { type: "open_page"; path: string }
  | { type: "page_ready"; path: string; title: string; description: string }
  | { type: "canvas_loading" }
  | { type: "selected"; selection: Selection; obstacles?: Rect[] }
  | { type: "blocked"; rect: Rect; around: string | null }
  | { type: "deselected" }
  | { type: "viewport"; scrollY: number; rect: Rect | null; obstructions: Rect[]; obstacles?: Rect[] }
  | { type: "outline"; outline: Outline }
  | { type: "open_images" }
  | { type: "palette"; colors: string[] }
  | { type: "anchors"; items: { id: string; name: string }[] }
  | { type: "editing"; active: boolean; formats: Formats }
  | { type: "open_panel"; panel: Panel; replaced?: boolean }
  | { type: "close_panel" }
  | { type: "save_queued" }
  | { type: "save_ok"; revision: number; history: History; draftChanged: boolean; log: SaveLog; page: string; at: number }
  | { type: "save_settled" }
  | { type: "save_offline" }
  | { type: "save_failed"; message: string }
  | { type: "save_conflict" }
  | { type: "pages"; pages: Page[] }
  | { type: "project"; project: Project }
  | { type: "page_meta"; title: string; description: string }
  | { type: "releases"; releases: Release[] }
  | { type: "published"; release: Release }
  | { type: "nothing_to_publish" }
  | { type: "domains"; domains: Domain[]; dns: Dns | null };

export function initialState(data: Bootstrap, now: number): State {
  return {
    project: data.project,
    pages: data.pages,
    path: data.pages.some((p) => p.path === "index.html") ? "index.html" : (data.pages[0]?.path ?? "index.html"),
    previewOrigin: data.preview_origin,
    bootstrappedAt: now,
    imageBytes: data.limits.image_bytes,
    customDomains: data.features?.custom_domains ?? true,
    history: data.history,
    draftChanged: data.draft_changed_since_publish,
    changes: [],
    mode: "edit",
    device: "desktop",
    zoom: "fit",
    saves: { pending: 0, problem: null, savedAt: null },
    focus: { kind: "none" },
    editing: { active: false, formats: { bold: false, italic: false, link: false } },
    canvasLoading: true,
    scrollY: 0,
    obstructions: [],
    obstacles: [],
    outline: { heading: null, images: [] },
    palette: [],
    anchors: [],
    rail: { kind: "pages" },
    pageMeta: { title: "", description: "" },
    releases: null,
    domains: null,
    dns: null,
  };
}

/** Turns `/menu.html`, `/`, `/blog/` into a draft page path. */
export function pagePath(pathname: string): string {
  let path = pathname.replace(/^\/+/, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the raw path */
  }
  if (path === "" || path.endsWith("/")) path += "index.html";
  return path;
}

/** Whether a rail panel makes sense for a selection. The page panel needs none. */
export function panelApplies(panel: Panel, selection: Selection | null, editing: boolean): boolean {
  if (panel === "page") return true;
  if (!selection) return false;
  const can = selection.can;
  switch (panel) {
    case "style": return can.includes("s") && can.includes("t");
    case "background": return can.includes("s") || can.includes("b");
    case "link": return can.includes("l");
    case "text-link": return editing;
    case "image": return can.includes("i");
  }
}

function selectionOf(focus: Focus): Selection | null {
  return focus.kind === "selected" ? focus.selection : null;
}

/** Keeps an open panel on a new selection of the same kind when it applies, otherwise returns to the pages. */
function retarget(rail: Rail, focus: Focus, editing: boolean): Rail {
  if (rail.kind !== "panel" || rail.panel === "page") return rail;
  const selection = selectionOf(focus);
  if (!selection || selection.kind !== rail.subject || !panelApplies(rail.panel, selection, editing)) return { kind: "pages" };
  return selection.element === rail.element ? rail : { ...rail, element: selection.element, replaced: false };
}

function logChange(changes: LoggedChange[], log: SaveLog, previous: History, next: History, page: string): LoggedChange[] {
  switch (log) {
    case "edit":
      return next.undo_label ? [...changes, { label: next.undo_label, page }] : changes;
    case "undo":
      return changes.slice(0, -1);
    case "redo":
      return previous.redo_label ? [...changes, { label: previous.redo_label, page }] : changes;
    case "none":
      return changes;
  }
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "bootstrapped":
      return {
        ...state,
        project: action.data.project,
        pages: action.data.pages,
        previewOrigin: action.data.preview_origin,
        bootstrappedAt: Date.now(),
        history: action.data.history,
        draftChanged: action.data.draft_changed_since_publish,
        changes: action.data.draft_changed_since_publish ? state.changes : [],
        path: action.data.pages.some((p) => p.path === state.path) ? state.path : "index.html",
      };
    case "mode":
      return { ...state, mode: action.mode, focus: { kind: "none" }, editing: { ...state.editing, active: false }, rail: retarget(state.rail, { kind: "none" }, false) };
    case "device":
      return { ...state, device: action.device };
    case "zoom":
      return { ...state, zoom: action.zoom };
    case "open_page":
      return { ...state, path: action.path, focus: { kind: "none" }, canvasLoading: true, scrollY: 0, outline: { heading: null, images: [] }, rail: retarget(state.rail, { kind: "none" }, false) };
    case "canvas_loading":
      return { ...state, canvasLoading: true, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
    case "page_ready":
      if (action.path !== state.path) return state;
      return { ...state, canvasLoading: false, pageMeta: { title: action.title, description: action.description } };
    case "selected": {
      const focus: Focus = { kind: "selected", selection: action.selection };
      return { ...state, focus, obstacles: action.obstacles ?? [], rail: retarget(state.rail, focus, state.editing.active) };
    }
    case "blocked":
      return { ...state, focus: { kind: "blocked", rect: action.rect, around: action.around }, editing: { ...state.editing, active: false }, rail: retarget(state.rail, { kind: "none" }, false) };
    case "deselected":
      return { ...state, focus: { kind: "none" }, editing: { ...state.editing, active: false }, rail: retarget(state.rail, { kind: "none" }, false) };
    case "viewport": {
      const { focus } = state;
      const next: Focus =
        action.rect === null || focus.kind === "none"
          ? focus
          : focus.kind === "blocked"
            ? { ...focus, rect: action.rect }
            : { kind: "selected", selection: { ...focus.selection, rect: action.rect } };
      return { ...state, scrollY: action.scrollY, focus: next, obstructions: action.obstructions, obstacles: action.obstacles ?? state.obstacles };
    }
    case "outline":
      return { ...state, outline: action.outline };
    case "open_images":
      return { ...state, rail: { kind: "images" } };
    case "palette":
      return { ...state, palette: action.colors };
    case "anchors":
      return { ...state, anchors: action.items };
    case "editing": {
      const rail: Rail = !action.active && state.rail.kind === "panel" && state.rail.panel === "text-link" ? { kind: "pages" } : state.rail;
      return { ...state, editing: { active: action.active, formats: action.formats }, rail };
    }
    case "open_panel": {
      const selection = selectionOf(state.focus);
      if (!panelApplies(action.panel, selection, state.editing.active)) return state;
      const page = action.panel === "page";
      return { ...state, rail: { kind: "panel", panel: action.panel, element: page ? null : (selection?.element ?? null), subject: page ? null : (selection?.kind ?? null), replaced: action.replaced ?? false } };
    }
    case "close_panel":
      return state.rail.kind === "pages" ? state : { ...state, rail: { kind: "pages" } };
    case "save_queued":
      return { ...state, saves: { ...state.saves, pending: state.saves.pending + 1 } };
    case "save_ok": {
      const draftChanged = action.draftChanged;
      const changes = draftChanged ? logChange(state.changes, action.log, state.history, action.history, action.page) : [];
      // Undo and redo make "Picture replaced" and its choices out of date.
      const stepped = action.log === "undo" || action.log === "redo";
      const rail: Rail = stepped && state.rail.kind === "panel" && state.rail.replaced ? { ...state.rail, replaced: false } : state.rail;
      return {
        ...state,
        rail,
        saves: { pending: Math.max(0, state.saves.pending - 1), problem: null, savedAt: action.at },
        project: { ...state.project, revision: action.revision },
        history: action.history,
        draftChanged,
        changes,
      };
    }
    case "save_settled":
      return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: state.saves.problem?.kind === "offline" ? null : state.saves.problem } };
    case "save_offline":
      return { ...state, saves: { ...state.saves, problem: { kind: "offline" } } };
    case "save_failed":
      return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: { kind: "error", message: action.message } } };
    case "save_conflict":
      return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: { kind: "conflict" } } };
    case "pages":
      return { ...state, pages: action.pages };
    case "project":
      return { ...state, project: action.project };
    case "page_meta":
      return {
        ...state,
        pageMeta: { title: action.title, description: action.description },
        pages: state.pages.map((p) => (p.path === state.path ? { ...p, title: action.title } : p)),
      };
    case "releases":
      return { ...state, releases: action.releases };
    case "published": {
      const releases = [action.release, ...(state.releases ?? []).map((r) => ({ ...r, live: false }))];
      return {
        ...state,
        releases,
        draftChanged: false,
        changes: [],
        project: { ...state.project, live_release: { number: action.release.number, created_at: action.release.created_at } },
      };
    }
    case "nothing_to_publish":
      return { ...state, draftChanged: false, changes: [] };
    case "domains":
      return { ...state, domains: action.domains, dns: action.dns ?? state.dns };
  }
}

/** What visitors see compared with the draft. Derived, never stored. */
export type SiteState =
  | { kind: "never" }
  | { kind: "current"; live: number }
  | { kind: "changes"; live: number; count: number }
  | { kind: "older"; live: number; latest: number; draftChanged: boolean };

export function siteState(s: Pick<State, "project" | "releases" | "draftChanged" | "changes">): SiteState {
  const live = s.project.live_release;
  if (!live) return { kind: "never" };
  const latest = Math.max(live.number, ...(s.releases ?? []).map((r) => r.number));
  if (latest > live.number) return { kind: "older", live: live.number, latest, draftChanged: s.draftChanged };
  if (!s.draftChanged) return { kind: "current", live: live.number };
  return { kind: "changes", live: live.number, count: s.changes.length };
}

export type Tone = "neutral" | "success" | "warning" | "error";

export interface StatusLine {
  tone: Tone;
  /** The whole line, for screen readers and tooltips: "Saved · Not published yet". */
  text: string;
  /** Whether the owner's changes are safe: "Saved", "Saving…", or the problem. */
  save: string;
  /** Whether visitors see them, shown beside the save state unless saving has a problem. */
  publish: string | null;
  /** What the mark before the words shows: a spinner, a check, an alert, or nothing. */
  mark: "saving" | "saved" | "problem" | null;
}

/** How many changes, in words: "1 change", "3 changes". */
function changesText(n: number): string {
  return n === 1 ? "1 change" : `${n} changes`;
}

/** The publication state in the editor's one vocabulary: published, not published. */
export function publishText(site: SiteState): string {
  switch (site.kind) {
    case "never": return "Not published yet";
    case "current": return "Published";
    case "changes": return site.count > 0 ? `${changesText(site.count)} not published` : "Changes not published";
    case "older": return `Visitors see version ${site.live}`;
  }
}

/**
 * The status in the top bar, as plain words in two parts that both stay on screen: whether the
 * changes are saved, and whether the website is published. A save problem replaces both, in
 * its warning or error colour. `savingVisible` is a timer the top bar owns (saves that land
 * quickly never flash "Saving…"), so this stays pure.
 */
export function statusLine(s: Pick<State, "project" | "releases" | "draftChanged" | "changes" | "saves">, savingVisible: boolean): StatusLine {
  const problem = s.saves.problem;
  const alone = (tone: Tone, save: string): StatusLine => ({ tone, text: save, save, publish: null, mark: "problem" });
  if (problem?.kind === "conflict") return alone("error", "Changed in another tab");
  if (problem?.kind === "error") return alone("error", "Couldn't save");
  if (problem?.kind === "offline") return alone("warning", "Offline: changes will be saved when you're back");
  const saving = s.saves.pending > 0 && savingVisible;
  const save = saving ? "Saving…" : "Saved";
  const publish = publishText(siteState(s));
  return { tone: "neutral", text: `${save} · ${publish}`, save, publish, mark: saving ? "saving" : "saved" };
}

/** Publishing makes sense only when the draft differs from what is live. */
export function canPublish(s: Pick<State, "draftChanged">): boolean {
  return s.draftChanged;
}

/** `previous` is null on the first call, so a listener renders everything once. */
export type Listener = (state: State, previous: State | null) => void;

export function changed<K extends keyof State>(state: State, previous: State | null, ...keys: K[]): boolean {
  return previous === null || keys.some((k) => state[k] !== previous[k]);
}

export function selection(state: State): Selection | null {
  return selectionOf(state.focus);
}

export interface Store {
  get(): State;
  dispatch(action: Action): void;
  subscribe(listener: Listener): void;
}

export function createStore(initial: State): Store {
  let state = initial;
  const listeners: Listener[] = [];
  return {
    get: () => state,
    dispatch(action) {
      const previous = state;
      state = reduce(state, action);
      if (state !== previous) for (const listener of listeners) listener(state, previous);
    },
    subscribe(listener) {
      listeners.push(listener);
      listener(state, null);
    },
  };
}
