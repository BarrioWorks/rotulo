# Frontend contract

The backend (Rust) and the frontend (Tera templates, CSS, TypeScript) meet here. Change this file in the same commit as any change to either side.

## Hosts in development

- App: `http://127.0.0.1:5150`. Signed-in pages and `/api/*`.
- Preview of a draft: `http://<token>.preview.localhost:5150`. Serves the draft. HTML pages get `<script type="module" src="/__pagehaven/agent/agent.js" data-pagehaven="agent">` as the first child of `<head>`, and every editable element has `data-ph-id` and `data-ph-can`. The preview serves the compiled `assets/static/js/` tree (`.js` files only) under `/__pagehaven/`, so the agent's relative imports work: `import ... from "../protocol.js"` loads `/__pagehaven/protocol.js`.
- Published site: `http://<slug>.sites.localhost:5150`.

`data-ph-can` lists what the server accepts for that element, one letter each: `t` text, `i` image, `l` link, `s` style, `b` background image, `x` section (hide, remove), `u` can move up, `d` can move down, `c` can duplicate. Elements with no `data-ph-id` (created by the site's JavaScript) are not editable. `data-ph-hidden="true"` marks a hidden section. It is shown dimmed in the editor and left out when publishing.

## Pages (Tera, `assets/views/`)

All pages extend `layouts/base.html`. Static files are under `/static/` (`assets/static/`). The app CSP is `script-src 'self'`, so there are no inline scripts or `on*` attributes. Pass data to scripts with `data-*` attributes or a `<script type="application/json" id="...">` block. Forms post with a normal `<form method="post">`. The server checks `Origin`. There is no CSRF token field.

| Template | Route | Context |
|---|---|---|
| `home.html` | `GET /` signed out | `sites_domain: string` (configured hostname, without the public port) |
| `auth/register.html` | `GET/POST /register` | `error: string?`, `name`, `email` (refill on error) |
| `auth/login.html` | `GET/POST /login` | `error: string?`, `email` |
| `projects/index.html` | `GET /projects` | `user {name, email}`, `projects: [Project]`, `can_create: bool`, `limit: int` |
| `projects/new.html` | `GET /projects/new` | `user`, `limits {upload_mb, content_mb, file_count}` |
| `projects/editor.html` | `GET /projects/{pid}` | `user`, `project {pid, name}` |
| `errors/not_found.html` | 404 on the app host | `{}` |
| `errors/site_not_found.html` | unknown site host or no live release | `{}` (no app styles, it is served on the user-content host) |

`Project` in the dashboard: `{pid, name, slug, status: "draft"|"published"|"changes"|"offline", updated_at (ISO 8601), updated_human ("5 minutes ago"), site_url (string, always the managed address, even before publishing), live: bool, domains: [hostname], thumbnail_url: string?, page_count}`. `thumbnail_url` is an image on the preview host. Use it in `<img>` only.

`status` is `draft` before the first release, `published` when the draft matches the live release, `changes` when it differs from the live release, or `offline` when suspended or taken offline after having a release. `live` is false while suspended. Status uses database metadata comparisons, without reading file bodies. There is no project-list JSON endpoint.

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

`draft_changed_since_publish` already reports whether the draft differs from the live release, including after undo or rollback. It is true before the first publish and when there is no live release. The editor can use this boolean to enable publishing.

When `features.custom_domains` is false the editor hides the custom domain section. `preview_origin` expires after 12 hours. Fetch the bootstrap again to get a new one. Load a page in the canvas at `preview_origin + "/" + path`.

`POST /api/projects/{pid}/edits` `{"base_revision", "page": "index.html", "edit": Edit}`
`200 {"revision", "history", "draft_changed_since_publish"}`. `422 {"error":"not_allowed"|"invalid"|"not_found", "message"}`.

`Edit` is one of (`element` is a `data-ph-id`):

```
{"op":"set_text","element","html"}            inner HTML of the element after inline editing
{"op":"set_image","element","upload","alt"}   upload = "sha256" returned by the image upload
{"op":"set_background_image","element","upload"}   uses the same upload token as set_image
{"op":"set_background_image","element","remove":true}   removes only the inline background-image override
{"op":"set_alt","element","alt"}
{"op":"set_link","element","href","new_tab"}
{"op":"set_style","element","styles":{"color":"#112233","font-size":null,...}}   null removes the property
{"op":"hide_section","element","hidden"}
{"op":"duplicate_section","element"}
{"op":"move_section","element","direction":"up"|"down"}
{"op":"remove_section","element"}
{"op":"set_page_meta","title","description"}
```

`set_background_image` accepts an upload token or `remove: true`, never a URL or asset path. The server validates raster content and stores it at `images/uploads/<sha16>.<ext>`. It sets an inline `background-image: url("<page-relative path>")`, preserves other inline declarations, and defaults missing inline `background-size` and `background-position` to `cover` and `center`. Capability `b` is available on non-void, non-sealed elements that accept styles, including headers, sections, divs, footers and links. Script, style and SVG internals never receive it. The existing selection message carries the capability; no message fields are added.

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

### Delete a website

`DELETE /api/projects/{pid}` with `{"confirm_name":"<current project name>"}` returns `204`. Owner only (others receive `404`), with the usual unsafe-method CSRF protection and publish rate limit. Exact name mismatch returns `422 {"error":"invalid","message":"Type the website's current name to delete it."}`. Deletion removes drafts, history, imports, releases and domains and immediately stops serving the site. Project release files and kept archives are cleaned up after commit, best effort. The address stays reserved to its original account.

### Publishing

- `POST /api/projects/{pid}/publish` `{"base_revision"}` gives `201 {"release": Release, "site_url"}`. `422 {"error":"invalid","message"}` when the draft can't be published (for example a missing stylesheet). When a live release exists and the draft matches it, returns `422 {"error":"nothing_to_publish","message":"Everything is already live."}` without creating a release. A stale revision still returns `409 conflict`. Publishing after the site is taken offline remains allowed.
- `GET /api/projects/{pid}/releases` gives `{"releases":[Release], "site_url"}`, newest first.
- `POST /api/projects/{pid}/releases/{number}/activate` makes that release live (rollback). Gives `{"release": Release}`. The editor then refetches `GET /api/projects/{pid}/editor` through its save queue to refresh `draft_changed_since_publish` against the newly live release.
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

Page loads are double-buffered: the editor loads the next page in a second, hidden iframe with exactly the same `sandbox` and `referrerpolicy` attributes, and swaps it in when its agent sends `ready`. While a page loads, the editor accepts messages only from that loading frame's window (and only `ready` is honoured); afterwards only from the active canvas iframe. The site always lays out at least 1280 CSS px wide on "Computer" and 390 by 844 on "Phone"; the editor scales the iframe with a CSS transform and maps agent rectangles to app pixels itself, so nothing about the scale crosses the boundary.

Both sides must:

- Accept a message only when `event.origin` equals the exact expected origin and `event.source` is the expected window (the active canvas iframe's `contentWindow` on the editor side, or the loading one until it is ready; `window.parent` in the agent).
- Post with an explicit target origin, never `"*"`.
- Validate every message against a schema: known `type`, every field of the right type, ids matching `^[0-9a-z]{1,10}$`, strings length-capped, numbers finite. Drop anything else silently.
- Never put strings from a message into `innerHTML` on the editor side. The editor only sends `set_text` HTML to the server, which sanitizes it.

The agent learns the app origin from a constant the server prepends to `agent/agent.js` only: `const PAGEHAVEN_APP_ORIGIN = "http://127.0.0.1:5150";`.

The site's own JavaScript runs in the same window and origin as the agent and can forge agent messages. The parent accepts text only for the element and page of a session it started with `start_text`, and shortcuts only during that session. A forged editing report cannot start a session. Ready messages must match the URL the parent opened and are accepted once per navigation. In preview mode, the agent requests in-canvas link navigation with `navigate`; the parent resolves it against the known draft pages and chooses the iframe URL. Messages never publish, delete or navigate the app. The server validates every edit.

Message types live in `frontend/protocol.ts`, which both sides import, and carry `"channel": "pagehaven"`.

Agent to editor:

| Type | Fields | Notes |
|---|---|---|
| `ready` | `path`, `title`, `description`, `scrollY` | Must match the page the parent is opening; accepted once per load. |
| `select` | `element`, `can`, `tag`, `kind`, `name`, `ancestors`, `rect`, `info` | `kind` is one of `image button link heading menu header footer section list-item text box`. `name` is at most 60 characters (a section's first heading, an image's alt, a link's text). `ancestors` is at most 8 `{element, kind, name}`, nearest first, editable ancestors only. `info` adds `bgImage` (the computed background is a `url()` photo) and `image` (`{naturalWidth, naturalHeight, width, height}`, numbers 0 to 100000, or null). |
| `blocked` | `rect`, `around` | A click on something without `data-ph-id`. `around` is the nearest editable ancestor's id or null. |
| `deselect` | | |
| `viewport` | `scrollY`, `rect`, `obstructions` | `obstructions` is at most 4 rects of the site's own fixed or sticky bars, so the toolbar avoids them. |
| `palette` | `colors` | At most 10 colours used on the page, each `^#[0-9a-f]{6}$`, for the style swatches. Applied with `style.background`, never markup. |
| `anchors` | `items` | At most 50 `{id, name}` link targets on the page. `id` matches `^[A-Za-z][\w-]{0,63}$`, `name` is at most 60 characters and rendered as text. |
| `editing`, `text` | `element`, ... | Honoured only for the element of a text session the parent started (see below). |
| `navigate` | `href` | Preview mode only; the parent resolves it against the known draft pages. |
| `shortcut` | `action`: `undo` or `redo` | Honoured only during a parent-started text session. |

Editor to agent: `init`, `mode`, `select_relative` (`direction`: `parent`, `child`, `next` or `prev`; replaces `select_parent`), `select_element` (`element`; the agent re-checks the id and its capabilities), `reveal` (`element`, `pulse`: scroll it into view below the site's sticky bars and optionally pulse the selection once), `deselect`, `start_text` (with the selected element id), `finish_text`, `format`, and `preview_style`, `preview_image`, `preview_alt`, `preview_link`, `preview_hidden`, `preview_background` (`element`, `src`; the agent applies only URLs on the preview origin) so a change shows at once while the server applies it.

A forged `palette`, `anchors`, `viewport` or `blocked` message from the site's own script can only change which swatches, link targets or toolbar position the owner sees. Keyboard selection runs in the app: arrow keys pressed on the canvas region (a focusable element in the app document) become `select_relative` messages, and Enter runs the selected part's first action in the app, so pressing Enter starts a text session only through the parent's own `start_text`.

Editing behaviour the agent implements: hover outline, click to select (links and images win over text, text wins over boxes; a click on a decorative layer with no words, picture or photo, such as a portfolio hover tint or an icon, selects the picture underneath, found with `document.elementsFromPoint`), the selection mark (a cyan rule with a white halo, crop marks and a slug naming the kind), inline `contenteditable` started through the app’s Edit text button or Enter on the canvas, with Enter to commit, Shift+Enter for a line break, Escape to cancel, paste as plain text, formatting through `document.execCommand` for bold, italic and links. In edit mode the agent catches pointer, click, key and submit events on `window` in the capture phase and stops them before any site handler runs, so the site's own scripts (modals, carousels, links) stay still. In preview mode clicks pass through to the site. The overlay lives in a closed shadow root whose host resets every property inline with `!important`, sits in the browser top layer when available, and re-attaches itself if a script removes it. The agent reports the selected element's rectangle on scroll and resize so the editor can place its toolbar. Undo and redo use the app toolbar or keyboard shortcuts while the app has focus. Idle iframe shortcut messages are ignored; native text undo remains inside an active text editor.
