import { arr, bool, int, lit, obj, opt, str } from "../schema.js";
const parseHistory = obj({
    can_undo: bool,
    can_redo: bool,
    undo_label: opt(str(200)),
    redo_label: opt(str(200)),
});
const parseProject = obj({
    pid: str(64),
    name: str(200),
    slug: str(64),
    revision: int(),
    site_url: str(2048),
    live_release: opt(obj({ number: int(), created_at: str(64) })),
});
const pageTitle = (v) => (v === null || v === undefined ? "" : str(500)(v));
const parsePage = obj({ path: str(1024), title: pageTitle });
const parseBootstrap = obj({
    project: parseProject,
    pages: arr(parsePage),
    preview_origin: str(2048, /^https?:\/\/[^/]+$/),
    history: parseHistory,
    draft_changed_since_publish: bool,
    limits: obj({ image_bytes: int() }),
    features: opt(obj({ custom_domains: bool })),
});
const parseEditResult = obj({ revision: int(), history: parseHistory, draft_changed_since_publish: bool });
const parseUndoResult = obj({
    revision: int(),
    history: parseHistory,
    pages: arr(str(1024)),
    draft_changed_since_publish: bool,
});
const parsePagesResult = obj({
    revision: int(),
    history: parseHistory,
    draft_changed_since_publish: bool,
    pages: arr(parsePage),
});
const parseUpload = obj({ upload: str(128), url: str(2048) });
const parseAsset = obj({
    path: str(1024),
    bytes: int(),
    kind: lit("image", "font", "style", "script", "page", "other"),
    url: str(2048),
});
const parseRelease = obj({ number: int(), created_at: str(64), live: bool, file_count: int(), bytes: int() });
const domainId = (v) => typeof v === "number" && Number.isSafeInteger(v) ? String(v) : typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : undefined;
const parseDomain = obj({
    id: domainId,
    hostname: str(253),
    status: lit("pending", "verified"),
    txt_name: str(300),
    txt_value: str(300),
    last_error: opt(str(500)),
    url: str(2048),
});
const parseDns = obj({ cname_target: str(300), a_record: str(64) });
const parseErrorBody = obj({ error: str(64), message: str(1000), revision: opt(int()) });
export class ApiError extends Error {
    status;
    code;
    revision;
    constructor(status, code, message, revision = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.revision = revision;
    }
}
let conflictHandler = () => { };
/** Called for every 409, before the request's own error handling. */
export function onConflict(handler) {
    conflictHandler = handler;
}
async function request(method, path, body, parse) {
    const headers = { Accept: "application/json" };
    let payload;
    if (body instanceof FormData)
        payload = body;
    else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    let response;
    try {
        response = await fetch(path, { method, headers, body: payload ?? null, credentials: "same-origin", cache: "no-store" });
    }
    catch {
        throw new ApiError(0, "network", "You seem to be offline. Check your connection and try again.");
    }
    if (response.status === 401) {
        window.location.assign("/login");
        throw new ApiError(401, "signed_out", "Please sign in again.");
    }
    const text = await response.text();
    let json = undefined;
    try {
        json = text ? JSON.parse(text) : undefined;
    }
    catch {
        json = undefined;
    }
    if (!response.ok) {
        const err = parseErrorBody(json);
        const error = new ApiError(response.status, err?.error ?? "failed", err?.message ?? "Something went wrong. Please try again.", err?.revision ?? null);
        if (response.status === 409)
            conflictHandler(error);
        throw error;
    }
    if (parse === null)
        return undefined;
    const parsed = parse(json);
    if (parsed === undefined)
        throw new ApiError(response.status, "bad_response", "Pagehaven sent an unexpected answer. Please reload the page.");
    return parsed;
}
const base = (pid) => `/api/projects/${encodeURIComponent(pid)}`;
export const api = {
    bootstrap: (pid) => request("GET", `${base(pid)}/editor`, undefined, parseBootstrap),
    edit: (pid, baseRevision, page, edit) => request("POST", `${base(pid)}/edits`, { base_revision: baseRevision, page, edit }, parseEditResult),
    undo: (pid, baseRevision) => request("POST", `${base(pid)}/undo`, { base_revision: baseRevision }, parseUndoResult),
    redo: (pid, baseRevision) => request("POST", `${base(pid)}/redo`, { base_revision: baseRevision }, parseUndoResult),
    uploadImage: (pid, file) => {
        const form = new FormData();
        form.append("file", file, file.name);
        return request("POST", `${base(pid)}/images`, form, parseUpload);
    },
    addPage: (pid, baseRevision, from, path, title) => request("POST", `${base(pid)}/pages`, { base_revision: baseRevision, from, path, title }, parsePagesResult),
    renamePage: (pid, baseRevision, from, to) => request("POST", `${base(pid)}/pages/rename`, { base_revision: baseRevision, from, to }, parsePagesResult),
    deletePage: (pid, baseRevision, path) => request("POST", `${base(pid)}/pages/delete`, { base_revision: baseRevision, path }, parsePagesResult),
    assets: (pid) => request("GET", `${base(pid)}/assets`, undefined, obj({ assets: arr(parseAsset) })),
    settings: (pid, name, slug) => request("POST", `${base(pid)}/settings`, { name, slug }, obj({ project: parseProject })),
    publish: (pid, baseRevision) => request("POST", `${base(pid)}/publish`, { base_revision: baseRevision }, obj({ release: parseRelease, site_url: str(2048) })),
    releases: (pid) => request("GET", `${base(pid)}/releases`, undefined, obj({ releases: arr(parseRelease), site_url: str(2048) })),
    activate: (pid, number) => request("POST", `${base(pid)}/releases/${number}/activate`, {}, obj({ release: parseRelease })),
    restore: (pid, baseRevision, number) => request("POST", `${base(pid)}/releases/${number}/restore`, { base_revision: baseRevision }, parseUndoResult),
    domains: (pid) => request("GET", `${base(pid)}/domains`, undefined, obj({ domains: arr(parseDomain), dns: parseDns })),
    addDomain: (pid, hostname) => request("POST", `${base(pid)}/domains`, { hostname }, obj({ domain: parseDomain })),
    checkDomain: (pid, id) => request("POST", `${base(pid)}/domains/${encodeURIComponent(id)}/check`, {}, obj({ domain: parseDomain })),
    deleteDomain: (pid, id) => request("POST", `${base(pid)}/domains/${encodeURIComponent(id)}/delete`, {}, null),
};
