# Launch redesign security review

Scope is `git diff 243c543..HEAD -- src migration frontend assets/views config scripts` at `c94aec9`. The review treated the code as adversarial and the imported site's JavaScript as hostile. No code was changed.

Checks were run against an isolated local instance on `http://127.0.0.1:5191`. It used the HEAD binary with its own database in `/tmp/phrev`, so the demo database behind `:5150` was not touched. `:5150` was read only for `robots.txt` and headers. `cargo test` passed (84 + 37 tests). `node --test frontend/tests/*.test.mjs` passed 134 of 134, run against the existing build output without rebuilding.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Every failed import writes an event row, rate-limited requests included, so one account can make the app write without limit | Medium | Confirmed by curl |
| 2 | A site script can start a text session through `request_text` after any click in the site, then save any text it likes. This reopens the earlier "forge editor messages and save text" finding | Low (a regression of a fixed finding) | Inferred from code |
| 3 | The ZIP preflight regexes backtrack catastrophically. A small hostile `index.html` freezes the importing tab | Low | Confirmed in Node (V8) |
| 4 | The `editor_url` pattern lets `/<TAB>/host` through, and that resolves to another origin | Info | Confirmed in Node; the value is server-controlled |
| 5 | Events have no retention limit and outlive project deletion | Info | Inferred |
| 6 | The site can fake the `show_editable` tint and the publish-review reveal | Info | Inferred; inherent to a shared frame |

## Findings

### 1. Rate-limited and failed imports write without limit (Medium)

The handler is `src/controllers/api.rs:125-152`. Any import that does not succeed records `import_failed`. That includes `ApiError::RateLimited`, which `state.limit(state::IMPORT, ..)` at line 163 returns before any work is done. The rate limiter therefore stops the import but does not stop the write.

Exploit scenario. Register one free account. Then loop `POST /api/imports` with a 5-byte multipart file and the app's `Origin` header. Each request costs the server one SQLite insert on the single writer. In practice the limit is the attacker's request rate, and the table grows for as long as the loop runs. Writes on SQLite are serialized, so a fast loop also slows saves and publishes for everyone else.

Evidence. 60 requests gave 20 responses with status 422 and 40 with status 429. The `events` table then held `('import_failed','invalid_zip',20)` and `('import_failed','rate_limited',40)`.

Smallest fix. Do not record `rate_limited` at all, and record failures only after `state.limit` has passed. A failure that passed the limiter is then bounded by `IMPORT.max` (20 per hour per user). The other event writers are already bounded. `signup`, `signin` and `publish` sit behind their own rate limits. `first_edit` uses a unique index. `returned` is deduplicated by the per-day cache and by a unique index.

### 2. A site script can start a text session and save text (Low, regression)

The code is the `activated` gate in `frontend/editor/canvas.ts:338`, the `request_text` case at `frontend/editor/canvas.ts:356-359`, and the policy at `frontend/editor/canvas-policy.ts:21-22`.

The gate has three parts. The parent's `navigator.userActivation.isActive` must be true. There must be no `pointerdown` or `keydown` in the app's chrome in the last 5 s. The current selection must equal `message.element`, and its `can` must include `t`. A click inside a cross-origin child frame also activates the ancestor frames (the HTML user activation model), so in practice the gate means "the owner clicked somewhere in the site in the last 5 seconds". Every other input comes from the frame, and the site's script shares that frame.

Exploit scenario. The owner clicks anything in the canvas. A hostile site script uses the same `event.source` and origin as the agent. Within 5 seconds it posts three messages:

1. `select` for any element id, with `can: "t"`. The default branch of the policy accepts it.
2. `request_text` for the same id. The editor answers `start_text` and sets `textSession`.
3. `text` with chosen HTML. `handlers.onText` saves it as a draft edit.

The server sanitizer still applies, and the change shows in the publish review. The earlier review fixed this class by having the app start every text session (`docs/verification.md`, the "forge editor messages" row). `request_text` hands that start back to the frame.

Status. Inferred from code. The unit tests confirm that `activated` is the only gate the policy checks. No browser run was made.

Smallest fix. Let `request_text` change only what the app shows, never start a session. On `request_text`, move focus to the app's own "Edit text" control, or show a hint such as "Press Enter to edit". Then start the session from that parent-side press. If the team keeps the one-click flow on purpose, update the earlier finding in `docs/verification.md` from Fixed to Accepted, with this exact residual.

### 3. The ZIP preflight can freeze the tab (Low)

The regexes are at `frontend/import.ts:159`, `:160` and `:163`. `indexText` caps `index.html` at 1 MB, and the regexes then run on the main thread.

- `/<!--[\s\S]*?-->/g` is quadratic. 64 KB of repeated `<!--` took 696 ms, so 1 MB would take roughly 3 minutes.
- The `<script ... src=...\.ts>` regex is quadratic. 64 KB of repeated `<script ` took 546 ms.
- The `<div ... id=root ...>` regex is worse than quadratic. Repeated `<div id=root ` took 26 ms at 2 KB, 143 ms at 4 KB and 1264 ms at 8 KB. At 64 KB it did not finish within 5 minutes. This regex only runs after a `<script type=module>` match, and adding one is trivial.

Exploit scenario. An attacker gives an owner a "theme" ZIP whose `index.html` contains `<script type=module>` followed by about 16 KB of repeated `<div id=root `. Choosing the file freezes the import tab, and the owner has to kill it. The impact is a denial of service in that tab only. The server is not affected.

Smallest fix. Parse the text with `new DOMParser().parseFromString(html, "text/html")`. It runs in linear time and does not run scripts. Then test `script[type=module]`, `#root:empty, #app:empty, #__next:empty` and `script[src$=".ts" i]` with selectors. If the regexes stay, cut the input to a few KB first.

The rest of the preflight is sound. Entry count is capped by the 16-bit field and `65535` is refused. Each loop step checks its bounds against the end-of-central-directory record. Compressed input and inflated output are both capped at 1 MB. `DecompressionStream` output is counted chunk by chunk and the stream is cancelled. The whole file was already capped by `precheck` against the upload limit. The server stays the authority. `ready` only uploads, so the server's checks still run. `refused` only blocks the browser, and anyone can bypass it.

### 4. `editor_url` pattern allows a tab-prefixed protocol-relative URL (Info)

The pattern is at `frontend/import.ts:17`, and the URL is used at `:175` and in the `window.location.assign` call in `upload`. `/^\/[^/\\]/` accepts `"/\t/evil.example/x"`. The URL parser strips the tab, so the value resolves to `http://evil.example/x` (confirmed in Node). The value comes only from the server's 201 response, so nobody can exploit it today. It is defense in depth for the new automatic redirect. Smallest fix: also reject ASCII control characters (`/^\/[^/\\\x00-\x1f]/`), or check `new URL(url, location.href).origin === location.origin`.

### 5. Event retention (Info)

The table is defined in `migration/src/m20261020_000002_events.rs`. Rows keep `user_id` and `project_id` with no foreign key, and nothing deletes them. They outlive project deletion (`DELETE FROM projects` at `src/controllers/api.rs:878`). No personal data is stored. Rows hold ids, a fixed kind, and a fixed category from `import_reason`, and a CHECK limits the category to 40 characters. Still, `returned` builds a per-user daily activity log that is pseudonymous and linkable to `users`. Smallest fix: delete events older than N days in the funnel task, or document the retention in the privacy notes.

### 6. The site can fake discovery and reveal visuals (Info)

`show_editable` takes no parameters and has a fixed 4 s timer (`frontend/protocol.ts`, `frontend/agent/agent.ts:802-808`). The publish-review row sends `select_element` and `reveal` with an element id taken from the app's own change list (`frontend/editor/publish.ts`). Both are bounded and parsed strictly. A hostile site can ignore them or draw its own highlights, because it owns the frame's pixels. It gains nothing it could not already do by changing its own rendering. No fix is needed.

## Checked and sound

- **Protocol parsing.** `request_text` and `show_editable` go through `obj`/`lit`/`elementId`. Unknown keys, an empty id, an 11-character id and an injection-shaped id are all refused (`frontend/tests/agent.test.mjs:65-66`). The source and origin checks in `canvas.ts:337` are unchanged. `request_text` is refused while loading, in preview, and during an open text session. Chrome presses are tracked on the parent document only, and keys on the canvas surface are excluded on purpose.
- **Event privacy.** `import_reason` maps every `ImportError` to a fixed string and never stores a path, file name or content (unit test in `src/events.rs`). The migration's CHECK constraints limit `kind` to fixed values and `detail` to 40 characters.
- **Event failure.** `events::record` logs and swallows every database error. `returned` releases its mutex before the insert. No request can fail because of an event.
- **SQL.** `events::record` and the funnel queries in `src/tasks.rs` bind every value. `since` is parsed as a date before use. The `key=value` rewrite in `src/bin/main.rs` re-runs the binary with an argument vector and no shell.
- **robots.txt and sitemap.xml.** Both are reachable only on the app host. `route_by_host` sends site and custom hosts to `sites::serve`, which returned 404 for `/robots.txt` on a site host. They list only generic route prefixes and the two public pages.
- **Canonical URLs and JSON-LD.** Both come only from `settings.app_origin`. That value is now checked as an HTTP(S) origin with no credentials, path, query or fragment, and HTTPS is required in production. A spoofed `Host` gets a 404. `X-Forwarded-Host` is ignored, and the canonical stayed on the configured origin. The JSON-LD is built from constants, serialized by serde, and has `<` escaped. Its `| safe` is the only one in the templates.
- **Preview X-Robots-Tag.** `preview::serve` adds it to every response, including an expired or invalid token (404 checked) and editor scripts. `preview::read_only` adds it to the 405 for POST (checked). App-host errors, redirects and API responses get `noindex, nofollow` (checked on `/projects` 303 and `/api/imports` 405).
- **XSS.** New template variables (`project.name`, `p.name`, `p.site_host`, `p.published_at`, `limits.*`, `sites_domain`, `app_origin`) go through Tera autoescape. The new frontend DOM writes use `textContent` or `h(..., {text})`. No new `innerHTML` was added.
- **Redirects.** Registration redirects to the fixed `/projects/new`, and login to the fixed `/projects`. No `next` parameter exists. `?welcome=1` only turns on the discovery tint.
- **CSRF, session, tenant.** The same-origin check for unsafe methods is unchanged. The rename dialog posts to the existing `update_settings`, which calls `projects::owned`. The dashboard's `published_at` reads only the user's own projects. The session cookie and the token lookup are unchanged.
- **Preview isolation.** The iframe is still `sandbox="allow-scripts allow-same-origin"` on the separate preview origin. The preview CSP, `frame-ancestors`, `no-referrer` and the cookie stripping are unchanged.
- **Server ZIP validation.** `src/import` was not changed in this diff.

## Non-security observation

The dashboard shows a raw Unix timestamp for "Published". `published_at` is an integer number of seconds (`src/controllers/pages.rs`), and `new Date("1760961600")` is `NaN` in V8 (checked). So `formatPublicationTimes` in `frontend/app.ts` skips the element and leaves the number on screen. Send an RFC 3339 string, as `updated_at` already does.
