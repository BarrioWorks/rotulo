import type { Formats, Rect, SelectionInfo } from "../protocol.js";
import type { Bootstrap, Domain, Dns, History, Page, Project, Release } from "./api.js";

export type Mode = "edit" | "preview";
export type Device = "desktop" | "mobile";

export interface Selection {
  element: string;
  can: string;
  tag: string;
  hasParent: boolean;
  rect: Rect;
  info: SelectionInfo;
}

export type Focus =
  | { kind: "none" }
  | { kind: "selected"; selection: Selection }
  | { kind: "blocked"; rect: Rect };

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
  mode: Mode;
  device: Device;
  /** Draft changes queued or in flight. */
  pending: number;
  saveError: string | null;
  focus: Focus;
  editing: { active: boolean; formats: Formats };
  canvasLoading: boolean;
  scrollY: number;
  pageMeta: { title: string; description: string };
  releases: Release[] | null;
  domains: Domain[] | null;
  dns: Dns | null;
}

export type Action =
  | { type: "bootstrapped"; data: Bootstrap }
  | { type: "mode"; mode: Mode }
  | { type: "device"; device: Device }
  | { type: "open_page"; path: string }
  | { type: "page_ready"; path: string; title: string; description: string }
  | { type: "canvas_loading" }
  | { type: "selected"; selection: Selection }
  | { type: "blocked"; rect: Rect }
  | { type: "deselected" }
  | { type: "viewport"; scrollY: number; rect: Rect | null }
  | { type: "editing"; active: boolean; formats: Formats }
  | { type: "save_queued" }
  | { type: "save_ok"; revision: number; history: History; draftChanged: boolean }
  | { type: "save_failed"; message: string }
  | { type: "save_settled" }
  | { type: "pages"; pages: Page[] }
  | { type: "project"; project: Project }
  | { type: "page_meta"; title: string; description: string }
  | { type: "releases"; releases: Release[] }
  | { type: "published"; release: Release }
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
    mode: "edit",
    device: "desktop",
    pending: 0,
    saveError: null,
    focus: { kind: "none" },
    editing: { active: false, formats: { bold: false, italic: false, link: false } },
    canvasLoading: true,
    scrollY: 0,
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
        path: action.data.pages.some((p) => p.path === state.path) ? state.path : "index.html",
      };
    case "mode":
      return { ...state, mode: action.mode, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
    case "device":
      return { ...state, device: action.device };
    case "open_page":
      return { ...state, path: action.path, focus: { kind: "none" }, canvasLoading: true, scrollY: 0 };
    case "canvas_loading":
      return { ...state, canvasLoading: true, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
    case "page_ready":
      return {
        ...state,
        path: action.path,
        canvasLoading: false,
        pageMeta: { title: action.title, description: action.description },
      };
    case "selected":
      return { ...state, focus: { kind: "selected", selection: action.selection } };
    case "blocked":
      return { ...state, focus: { kind: "blocked", rect: action.rect }, editing: { ...state.editing, active: false } };
    case "deselected":
      return { ...state, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
    case "viewport": {
      const { focus } = state;
      const next =
        action.rect === null || focus.kind === "none"
          ? focus
          : focus.kind === "blocked"
            ? { kind: "blocked" as const, rect: action.rect }
            : { kind: "selected" as const, selection: { ...focus.selection, rect: action.rect } };
      return { ...state, scrollY: action.scrollY, focus: next };
    }
    case "editing":
      return { ...state, editing: { active: action.active, formats: action.formats } };
    case "save_queued":
      return { ...state, pending: state.pending + 1 };
    case "save_ok":
      return {
        ...state,
        pending: Math.max(0, state.pending - 1),
        saveError: null,
        project: { ...state.project, revision: action.revision },
        history: action.history,
        draftChanged: action.draftChanged,
      };
    case "save_failed":
      return { ...state, pending: Math.max(0, state.pending - 1), saveError: action.message };
    case "save_settled":
      return { ...state, pending: Math.max(0, state.pending - 1) };
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
        project: { ...state.project, live_release: { number: action.release.number, created_at: action.release.created_at } },
      };
    }
    case "domains":
      return { ...state, domains: action.domains, dns: action.dns ?? state.dns };
  }
}

/** `previous` is null on the first call, so a listener renders everything once. */
export type Listener = (state: State, previous: State | null) => void;

export function changed<K extends keyof State>(state: State, previous: State | null, ...keys: K[]): boolean {
  return previous === null || keys.some((k) => state[k] !== previous[k]);
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
