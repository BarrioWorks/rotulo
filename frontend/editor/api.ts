import { arr, bool, int, lit, obj, opt, str, type Parsed, type Parser } from "../schema.js";

const parseHistory = obj({
  can_undo: bool,
  can_redo: bool,
  undo_label: opt(str(200)),
  redo_label: opt(str(200)),
});
export type History = Parsed<typeof parseHistory>;

const parseProject = obj({
  pid: str(64),
  name: str(200),
  slug: str(64),
  revision: int(),
  site_url: str(2048),
  live_release: opt(obj({ number: int(), created_at: str(64) })),
});
export type Project = Parsed<typeof parseProject>;

const parsePage = obj({ path: str(1024), title: str(500) });
export type Page = Parsed<typeof parsePage>;

const parseBootstrap = obj({
  project: parseProject,
  pages: arr(parsePage),
  preview_origin: str(2048, /^https?:\/\/[^/]+$/),
  history: parseHistory,
  draft_changed_since_publish: bool,
  limits: obj({ image_bytes: int() }),
  features: opt(obj({ custom_domains: bool })),
});
export type Bootstrap = Parsed<typeof parseBootstrap>;

const parseEditResult = obj({ revision: int(), history: parseHistory, draft_changed_since_publish: bool });
export type EditResult = Parsed<typeof parseEditResult>;

const parseUndoResult = obj({
  revision: int(),
  history: parseHistory,
  pages: arr(str(1024)),
  draft_changed_since_publish: bool,
});
export type UndoResult = Parsed<typeof parseUndoResult>;

const parsePagesResult = obj({
  revision: int(),
  history: parseHistory,
  draft_changed_since_publish: bool,
  pages: arr(parsePage),
});
export type PagesResult = Parsed<typeof parsePagesResult>;

const parseUpload = obj({ upload: str(128), url: str(2048) });

const parseAsset = obj({
  path: str(1024),
  bytes: int(),
  kind: lit("image", "font", "style", "script", "page", "other"),
  url: str(2048),
});
export type Asset = Parsed<typeof parseAsset>;

const parseRelease = obj({ number: int(), created_at: str(64), live: bool, file_count: int(), bytes: int() });
export type Release = Parsed<typeof parseRelease>;

const domainId: Parser<string> = (v) =>
  typeof v === "number" && Number.isSafeInteger(v) ? String(v) : typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : undefined;

const parseDomain = obj({
  id: domainId,
  hostname: str(253),
  status: lit("pending", "verified"),
  txt_name: str(300),
  txt_value: str(300),
  last_error: opt(str(500)),
  url: str(2048),
});
export type Domain = Parsed<typeof parseDomain>;

const parseDns = obj({ cname_target: str(300), a_record: str(64) });
export type Dns = Parsed<typeof parseDns>;

const parseErrorBody = obj({ error: str(64), message: str(1000), revision: opt(int()) });

export type StyleProps = Partial<Record<string, string | null>>;

export type Edit =
  | { op: "set_text"; element: string; html: string }
  | { op: "set_image"; element: string; upload: string; alt: string }
  | { op: "set_alt"; element: string; alt: string }
  | { op: "set_link"; element: string; href: string; new_tab: boolean }
  | { op: "set_style"; element: string; styles: StyleProps }
  | { op: "hide_section"; element: string; hidden: boolean }
  | { op: "duplicate_section"; element: string }
  | { op: "move_section"; element: string; direction: "up" | "down" }
  | { op: "remove_section"; element: string }
  | { op: "set_page_meta"; title: string; description: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly revision: number | null = null,
  ) {
    super(message);
  }
}

let conflictHandler: (error: ApiError) => void = () => {};

/** Called for every 409, before the request's own error handling. */
export function onConflict(handler: (error: ApiError) => void): void {
  conflictHandler = handler;
}

type Body = FormData | Record<string, unknown> | undefined;

async function request<T>(method: "GET" | "POST", path: string, body: Body, parse: Parser<T> | null): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: payload ?? null, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "network", "You seem to be offline. Check your connection and try again.");
  }
  if (response.status === 401) {
    window.location.assign("/login");
    throw new ApiError(401, "signed_out", "Please sign in again.");
  }
  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!response.ok) {
    const err = parseErrorBody(json);
    const error = new ApiError(
      response.status,
      err?.error ?? "failed",
      err?.message ?? "Something went wrong. Please try again.",
      err?.revision ?? null,
    );
    if (response.status === 409) conflictHandler(error);
    throw error;
  }
  if (parse === null) return undefined as T;
  const parsed = parse(json);
  if (parsed === undefined) throw new ApiError(response.status, "bad_response", "Pagehaven sent an unexpected answer. Please reload the page.");
  return parsed;
}

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;

export const api = {
  bootstrap: (pid: string) => request("GET", `${base(pid)}/editor`, undefined, parseBootstrap),
  edit: (pid: string, baseRevision: number, page: string, edit: Edit) =>
    request("POST", `${base(pid)}/edits`, { base_revision: baseRevision, page, edit }, parseEditResult),
  undo: (pid: string, baseRevision: number) => request("POST", `${base(pid)}/undo`, { base_revision: baseRevision }, parseUndoResult),
  redo: (pid: string, baseRevision: number) => request("POST", `${base(pid)}/redo`, { base_revision: baseRevision }, parseUndoResult),
  uploadImage: (pid: string, file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return request("POST", `${base(pid)}/images`, form, parseUpload);
  },
  addPage: (pid: string, baseRevision: number, from: string, path: string, title: string) =>
    request("POST", `${base(pid)}/pages`, { base_revision: baseRevision, from, path, title }, parsePagesResult),
  renamePage: (pid: string, baseRevision: number, from: string, to: string) =>
    request("POST", `${base(pid)}/pages/rename`, { base_revision: baseRevision, from, to }, parsePagesResult),
  deletePage: (pid: string, baseRevision: number, path: string) =>
    request("POST", `${base(pid)}/pages/delete`, { base_revision: baseRevision, path }, parsePagesResult),
  assets: (pid: string) => request("GET", `${base(pid)}/assets`, undefined, obj({ assets: arr(parseAsset) })),
  settings: (pid: string, name: string, slug: string) =>
    request("POST", `${base(pid)}/settings`, { name, slug }, obj({ project: parseProject })),
  publish: (pid: string, baseRevision: number) =>
    request("POST", `${base(pid)}/publish`, { base_revision: baseRevision }, obj({ release: parseRelease, site_url: str(2048) })),
  releases: (pid: string) => request("GET", `${base(pid)}/releases`, undefined, obj({ releases: arr(parseRelease), site_url: str(2048) })),
  activate: (pid: string, number: number) =>
    request("POST", `${base(pid)}/releases/${number}/activate`, {}, obj({ release: parseRelease })),
  restore: (pid: string, baseRevision: number, number: number) =>
    request("POST", `${base(pid)}/releases/${number}/restore`, { base_revision: baseRevision }, parseUndoResult),
  domains: (pid: string) => request("GET", `${base(pid)}/domains`, undefined, obj({ domains: arr(parseDomain), dns: parseDns })),
  addDomain: (pid: string, hostname: string) => request("POST", `${base(pid)}/domains`, { hostname }, obj({ domain: parseDomain })),
  checkDomain: (pid: string, id: string) =>
    request("POST", `${base(pid)}/domains/${encodeURIComponent(id)}/check`, {}, obj({ domain: parseDomain })),
  deleteDomain: (pid: string, id: string) => request("POST", `${base(pid)}/domains/${encodeURIComponent(id)}/delete`, {}, null),
};
