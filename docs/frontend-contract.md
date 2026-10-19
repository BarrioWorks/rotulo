# Frontend contract

The backend (Rust) and the frontend (Tera templates, CSS, TypeScript) meet here. Change this file in the same commit as any change to either side.

## Hosts in development

- App: `http://127.0.0.1:5150`. Signed-in pages and `/api/*`.
- Preview of a draft: `http://<token>.preview.localhost:5150`. Serves the draft. HTML pages get `<script type="module" src="/__pagehaven/agent/agent.js" data-pagehaven="agent">` as the first child of `<head>`, and every editable element has `data-ph-id` and `data-ph-can`. The preview serves the compiled `assets/static/js/` tree (`.js` files only) under `/__pagehaven/`, so the agent's relative imports work: `import ... from "../protocol.js"` loads `/__pagehaven/protocol.js`.
- Published site: `http://<slug>.sites.localhost:5150`.

`data-ph-can` lists what the server accepts for that element, one letter each: `t` text, `i` image, `l` link, `s` style, `x` section (hide, remove), `u` can move up, `d` can move down, `c` can duplicate. Elements with no `data-ph-id` (created by the site's JavaScript) are not editable. `data-ph-hidden="true"` marks a hidden section. It is shown dimmed in the editor and left out when publishing.

## Pages (Tera, `assets/views/`)

All pages extend `layouts/base.html`. Static files are under `/static/` (`assets/static/`). The app CSP is `script-src 'self'`, so there are no inline scripts or `on*` attributes. Pass data to scripts with `data-*` attributes or a `<script type="application/json" id="...">` block. Forms post with a normal `<form method="post">`. The server checks `Origin`. There is no CSRF token field.

| Template | Route | Context |
|---|---|---|
| `home.html` | `GET /` signed out | `{}` |
| `auth/register.html` | `GET/POST /register` | `error: string?`, `name`, `email` (refill on error) |
| `auth/login.html` | `GET/POST /login` | `error: string?`, `email` |
| `projects/index.html` | `GET /projects` | `user {name, email}`, `projects: [Project]`, `can_create: bool`, `limit: int` |
| `projects/new.html` | `GET /projects/new` | `user`, `limits {upload_mb, content_mb, file_count}` |
| `projects/editor.html` | `GET /projects/{pid}` | `user`, `project {pid, name}` |
| `errors/not_found.html` | 404 on the app host | `{}` |
| `errors/site_not_found.html` | unknown site host or no live release | `{}` (no app styles, it is served on the user-content host) |

`Project` in the dashboard: `{pid, name, slug, status: "draft"|"published", updated_at (ISO 8601), updated_human ("5 minutes ago"), site_url (string, always the managed address, even before publishing), live: bool, domains: [hostname], thumbnail_url: string?, page_count}`. `thumbnail_url` is an image on the preview host. Use it in `<img>` only.

Sign out is `POST /logout`.

## JSON API

All under the app host, with the session cookie. Requests with a body send `Content-Type: application/json`, except the two uploads, which are `multipart/form-data`. Errors are `{"error": "<code>", "message": "<sentence for the user>"}`. A `message` is safe to show as text. Insert it with `textContent`.

Draft changes carry `base_revision`. When it is stale the answer is `409 {"error":"conflict","message":...,"revision":<current>}`. The editor tells the user that the website changed in another tab and offers to reload.

### Import

`POST /api/imports` multipart: `file` (the ZIP), `name` (optional), `root` (optional, a folder name from `choose_folder`).

- `201 {"project": {"pid", "name"}, "editor_url", "report": Report, "thumbnail_url": string?}`
- `422 {"error":"choose_folder","message","folders":["dist","build"]}`. Re-send the same file with `root`.
- `422 {"error":"invalid_archive","message"}`, `413 {"error":"too_large",...}`, `429 {"error":"rate_limited",...}`, `503 {"error":"busy",...}`, `403 {"error":"project_limit",...}`

`Report = {"pages": [path], "skipped": [{"path","reason"}], "missing": [{"page","url"}], "warnings": [sentence]}`. `reason` is one of `server_code secret archive system_junk reserved source unsupported`.

### Editor

`GET /api/projects/{pid}/editor`

```json
{
  "project": {"pid": "...", "name": "...", "slug": "...", "revision": 12, "site_url": "http://harbor.sites.localhost:5150", "live_release": {"number": 3, "created_at": "..."} },
  "pages": [{"path": "index.html", "title": "Harbor Bakery"}],
  "preview_origin": "http://<token>.preview.localhost:5150",
  "history": {"can_undo": true, "can_redo": false, "undo_label": "Edit text", "redo_label": null},
  "draft_changed_since_publish": true,
  "limits": {"image_bytes": 8388608},
  "features": {"custom_domains": true}
}
```

When `features.custom_domains` is false the editor hides the custom domain section. `preview_origin` expires after 12 hours. Fetch the bootstrap again to get a new one. Load a page in the canvas at `preview_origin + "/" + path`.

`POST /api/projects/{pid}/edits` `{"base_revision", "page": "index.html", "edit": Edit}`
`200 {"revision", "history", "draft_changed_since_publish"}`. `422 {"error":"not_allowed"|"invalid"|"not_found", "message"}`.

`Edit` is one of (`element` is a `data-ph-id`):

```
{"op":"set_text","element","html"}            inner HTML of the element after inline editing
{"op":"set_image","element","upload","alt"}   upload = "sha256" returned by the image upload
{"op":"set_alt","element","alt"}
{"op":"set_link","element","href","new_tab"}
{"op":"set_style","element","styles":{"color":"#112233","font-size":null,...}}   null removes the property
{"op":"hide_section","element","hidden"}
{"op":"duplicate_section","element"}
{"op":"move_section","element","direction":"up"|"down"}
{"op":"remove_section","element"}
{"op":"set_page_meta","title","description"}
```

Style keys: `color background-color font-size font-weight text-align padding-top padding-bottom padding-left padding-right margin-top margin-bottom`. Colors are `#rgb`/`#rrggbb`. Sizes are `12px`, `1.5rem`, `2em`, `10%`. Weights are `100`…`900`. Alignment is `left center right justify`.

`set_text` HTML may contain the original child elements (keep their `data-ph-id`) plus `b strong i em u s br a span sub sup small mark code`. Anything else is removed by the server.

`POST /api/projects/{pid}/undo` and `/redo` `{"base_revision"}` give `200 {"revision","history","pages":[changed page paths],"draft_changed_since_publish"}`. Reload the canvas if the current page is listed.

`POST /api/projects/{pid}/images` multipart `file` gives `201 {"upload": "<sha256>", "url": "<preview url of the image>", "width": null}`. Raster images only (PNG, JPEG, GIF, WebP, AVIF), up to `limits.image_bytes`.

Pages:

- `POST /api/projects/{pid}/pages` `{"base_revision","from":"index.html","path":"offers.html","title":"Offers"}` duplicates a page. `path` is a lowercase `name.html` or `folder/name.html`.
- `POST /api/projects/{pid}/pages/rename` `{"base_revision","from","to"}`. Links in other pages are updated. `index.html` cannot be renamed.
- `POST /api/projects/{pid}/pages/delete` `{"base_revision","path"}`. `index.html` cannot be deleted.

All three answer like `/edits`, plus `"pages"` (the new page list).

`GET /api/projects/{pid}/assets` gives `{"assets":[{"path","bytes","kind":"image"|"font"|"style"|"script"|"page"|"other","url"}]}`. `url` is on the preview host.

`POST /api/projects/{pid}/settings` `{"name","slug"}` gives `200 {"project": {...as in editor...}}` or `422`. Slugs are 3 to 32 of `a-z 0-9 -`.

### Publishing

- `POST /api/projects/{pid}/publish` `{"base_revision"}` gives `201 {"release": Release, "site_url"}`. `422 {"error":"invalid","message"}` when the draft can't be published (for example a missing stylesheet).
- `GET /api/projects/{pid}/releases` gives `{"releases":[Release], "site_url"}`, newest first.
- `POST /api/projects/{pid}/releases/{number}/activate` makes that release live (rollback). Gives `{"release": Release}`.
- `POST /api/projects/{pid}/releases/{number}/restore` `{"base_revision"}` copies that release into the draft as one undoable edit. Answers like `/undo`, plus `"page_list"` (the new page list with titles).

`Release = {"number", "created_at", "live": bool, "file_count", "bytes"}`.

### Custom domains

- `GET /api/projects/{pid}/domains` gives `{"domains":[Domain], "dns": {"cname_target": "harbor.sites.example", "a_record": "203.0.113.10"}}`
- `POST /api/projects/{pid}/domains` `{"hostname"}` gives `201 {"domain": Domain}`.
- `POST /api/projects/{pid}/domains/{id}/check` gives `{"domain": Domain}` after a DNS lookup.
- `POST /api/projects/{pid}/domains/{id}/delete` gives `204`.

`Domain = {"id","hostname","status":"pending"|"verified","txt_name":"_pagehaven.www.example.com","txt_value":"pagehaven-verify=...","last_error":string?,"url"}`.

## Messages between the editor and the preview

The editor page (app origin) embeds the canvas:

```html
<iframe sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" src="{preview_origin}/{path}"></iframe>
```

`allow-same-origin` is acceptable here only because the preview origin is a different site from the app. Never add `allow-top-navigation`, `allow-popups`, `allow-forms` or `allow-modals`.

Both sides must:

- Accept a message only when `event.origin` equals the exact expected origin and `event.source` is the expected window (`iframe.contentWindow` on the editor side, `window.parent` in the agent).
- Post with an explicit target origin, never `"*"`.
- Validate every message against a schema: known `type`, every field of the right type, ids matching `^[0-9a-z]{1,10}$`, strings length-capped, numbers finite. Drop anything else silently.
- Never put strings from a message into `innerHTML` on the editor side. The editor only sends `set_text` HTML to the server, which sanitizes it.

The agent learns the app origin from a constant the server prepends to `agent/agent.js` only: `const PAGEHAVEN_APP_ORIGIN = "http://127.0.0.1:5150";`.

The site's own JavaScript runs in the same window as the agent and can forge agent messages. That is acceptable: such messages can only produce edits to this project's draft, which the server validates. The editor never publishes, deletes or navigates the app because of a message.

Message types live in `frontend/protocol.ts`, which both sides import, and carry `"channel": "pagehaven"`. The agent sends `ready`, `select`, `blocked` (a click on an element without `data-ph-id`), `deselect`, `viewport` (scroll position and the selection's rectangle), `editing`, `text` (the inner HTML to send as `set_text`) and `shortcut`. The editor sends `init`, `mode`, `select_parent`, `deselect`, `start_text`, `finish_text`, `format`, and `preview_style`, `preview_image`, `preview_alt`, `preview_link`, `preview_hidden` so a change shows at once while the server applies it.

Editing behaviour the agent implements: hover outline, click to select (links and images win over text, text wins over boxes, a "select parent" action climbs), selection outline, inline `contenteditable` on text elements with Enter to commit, Shift+Enter for a line break, Escape to cancel, paste as plain text, formatting through `document.execCommand` for bold, italic and links. In preview mode clicks pass through to the site. The agent reports the selected element's rectangle on scroll and resize so the editor can place its toolbar. Undo and redo keyboard shortcuts inside the canvas are forwarded to the editor when no text is being edited.
