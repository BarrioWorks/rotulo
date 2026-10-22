# Rótulo architecture

Rótulo imports a finished static website from a ZIP, lets its owner edit it visually, and publishes immutable releases. One Loco process serves three kinds of host. The backend never runs uploaded code.

```
                 Browser                                    One Loco process (rotulo-cli start)
 ┌──────────────────────────────────────┐        ┌──────────────────────────────────────────────────┐
 │ App origin  https://APP              │ HTTPS  │ host router (src/hosts.rs)                        │
 │  dashboard, import, editor shell     ├───────►│  APP            → app routes, session cookie      │
 │  contextual toolbar (trusted UI)     │        │  *.PREVIEW      → draft preview (token in host)    │
 │   ▲  postMessage, origin+schema check│        │  *.SITES, custom→ published release files         │
 │ ┌─┴────────────────────────────────┐ │        │                                                    │
 │ │ iframe  https://<token>.PREVIEW  │ │        │ importer (src/import/)   strict ZIP reader, policy  │
 │ │  imported site + editor agent    │ │        │ document  (src/document.rs) element ops on HTML    │
 │ │  sandbox, own site, no cookies   │ │        │ drafts    (src/drafts.rs)   change sets, undo/redo │
 │ └──────────────────────────────────┘ │        │ publish   (src/publish.rs)  releases, rollback     │
 └──────────────────────────────────────┘        │ domains   (src/domains.rs)  TXT ownership via DoH  │
                                                 └──────────────┬───────────────────────────────────┘
                                                                │
                              SQLite (metadata)   data/ (files: archives, blobs, releases, tmp)
```

## Hosts and origins

| Host | Serves | Credentials |
|---|---|---|
| `APP` (dev `127.0.0.1:5150`) | Dashboard, import, editor, JSON API | `__Host-ph_session` cookie in production (`ph_session` on local HTTP), HttpOnly, SameSite=Lax, Secure in production |
| `<token>.PREVIEW` (dev `*.preview.localhost:5150`) | The current draft of one project, with the editor agent injected into HTML pages | None. The token in the hostname is an expiring HMAC capability |
| `<slug>.SITES` (dev `*.sites.localhost:5150`) and verified custom domains | The live release of one project | None |

APP and the user-content domains are different sites, so imported JavaScript never runs with the app's cookies or storage. In production APP and the user-content domain must be different registrable domains, and the user-content domain belongs on the Public Suffix List so one published site cannot set cookies for another. Each preview gets its own origin, so a site built with absolute paths (`/assets/x.js`, as Vite emits) works unchanged.

## Data model

SQLite holds metadata. Files live in `data/`.

```
users(id, pid, email UNIQUE NOCASE, name, password_hash, created_at)
sessions(token_hash PK, user_id → users, created_at, expires_at)
projects(id, pid UNIQUE, user_id → users, name, slug UNIQUE, revision, live_release_id → releases, created_at, updated_at)
slug_claims(slug PK, user_id → users)                   a slug once used stays with its user
imports(id, project_id → projects, archive_path, archive_sha256, archive_bytes, file_count, content_bytes, root_dir, report_json, created_at)
draft_files(project_id → projects, path, blob, bytes, PRIMARY KEY(project_id, path))
edits(id, project_id → projects, revision, kind, summary_json, state CHECK IN (applied, undone, discarded), user_id, created_at)
edit_files(edit_id → edits, path, before_blob NULL, after_blob NULL)  NULL means "absent"
releases(id, project_id → projects, number, draft_revision, file_count, content_bytes, created_at, UNIQUE(project_id, number))
release_files(release_id → releases, path, blob)
domains(id, project_id → projects, hostname, token, verified_at NULL, last_checked_at, last_error, created_at)
         UNIQUE(project_id, hostname); UNIQUE(hostname) WHERE verified_at IS NOT NULL
```

```
data/
  archives/<project pid>/<sha256>.zip   original upload, 0400, never served
  blobs/<aa>/<sha256>                   content-addressed file bodies, 0440, shared by drafts and releases
  releases/<project id>/<number>/...    hard links to blobs, one directory per release, never edited after creation
  tmp/<random>/                         0700 staging for one import or one release build, removed on any failure
```

A **draft** is the set of `draft_files` rows for a project: a path mapped to a blob. Each change to the draft is an **edit**: a change set of `(path, before, after)` rows applied in one transaction that also increments `projects.revision`. Text, image, link, style and section operations change one page. An image replacement also adds the new image file. Adding or renaming a page changes several files. Restoring a release into the draft changes many. Undo applies the latest applied edit backwards, redo applies the earliest undone edit forwards, and a new edit discards the undone ones. Every request that changes the draft names the revision it was based on. A stale revision gets `409 Conflict`, so a second tab can never silently overwrite newer work.

## Editing model

HTML pages in the draft carry a stable `data-ph-id` on every element of the body, assigned at import time (and on any element an edit creates). Edits are typed operations that name a page and an element id:

| Operation | Change |
|---|---|
| `set_text` | Replaces the content of a text element. Elements that already existed keep their original attributes. New markup is limited to `b strong i em u s br a span`. Links are scheme-checked |
| `set_image` | Sets `src`, clears `srcset`/`sizes`, sets `alt`. The image must be a draft file |
| `set_background_image` | Sets an uploaded raster image as a page-relative inline background, or removes the override. Preserves other inline styles |
| `set_link` | Sets `href` and the new-tab flag on an `a` element |
| `set_style` | Sets or clears allowed inline properties (colors, size, weight, alignment, spacing) with validated values |
| `hide_section`, `duplicate_section`, `move_section`, `remove_section` | Structural changes, allowed only on top-level sections in `body`, `main`, or their direct wrapper |
| `set_page_meta` | Page title and description |
| `add_page`, `rename_page`, `delete_page` | Page files. Renames rewrite internal links structurally |

The server parses the page, checks that the target exists and accepts that operation, applies it, and serializes the page. A change can only touch the element it names. Publishing removes every `data-ph-id`.

The editor agent (`frontend/agent/agent.ts`) runs inside the preview. It draws hover and selection outlines, runs `contenteditable` text editing, and reports what the user selected. The toolbar lives in the app page. Messages in both directions are checked for the exact origin, the exact window, and the message schema. The parent never inserts markup from a message into its own DOM.

**Compatibility boundary.** Rótulo edits the HTML that the server sends. Content that the site's JavaScript creates at runtime (a client-rendered single-page app, a carousel's clones) has no `data-ph-id` and is not editable. The editor says so when such an element is clicked. Rótulo never compiles source code.

## Import security model

See `docs/threat-model.md` for the threats. The importer (`src/import/`) treats the upload as hostile:

1. Streams the upload to a 0700 staging directory and stops at the size limit.
2. Reads the ZIP with Rótulo's own strict reader over `flate2`: one end-of-central-directory record, central directory exactly where it claims, no ZIP64, no multi-disk, no encryption, methods `stored` and `deflate` only, local headers that agree with the central directory, entries that do not overlap, CRC-32 checked.
3. Normalizes each path itself: no absolute paths, drive letters, backslashes, `.` or `..`, empty segments, control characters, or case-insensitive duplicates. Depth and length are limited. Unix symlinks and device entries are rejected.
4. Classifies every file by an explicit policy table: hosted (with Rótulo's own MIME type), skipped with a reason (server code, secrets, archives, OS junk, unknown types), and checks content against the claimed type (UTF-8 for text, magic bytes for images and fonts).
5. Inflates with running counters for per-file and total bytes, so lying size fields cannot exceed the limits.
6. Finds the site root (`.`, `dist`, `build`, `out`, `_site`, `public`, a single wrapper folder), rejects source projects that need a build, and asks the user when two roots are equally plausible.
7. Checks that local scripts and stylesheets referenced from every page exist. Missing images and fonts become warnings.
8. Moves blobs into the store and writes all rows in one transaction. Any failure removes the staging directory.

Limits live in config (`settings.limits`). A global semaphore bounds concurrent imports and publishes. Per-user rate limits bound sign-in attempts, imports, uploads and publishes.

## Publishing

1. Take a per-project lock and read the draft at one revision.
2. Validate: `index.html` exists, every page parses, referenced scripts and stylesheets exist.
3. Write HTML without editor ids to new blobs, then hard-link every file into `data/releases/<project>/<n>.tmp-<random>/`.
4. Verify every file exists with its expected size, then rename the directory to `<n>`.
5. In one transaction insert the release and its files and point `projects.live_release_id` at it. The site switches on commit.

Rollback points `live_release_id` at an earlier release. Releases are never modified. "Edit this version" restores a release into the draft as one undoable edit.

Published responses carry Rótulo's MIME type, `X-Content-Type-Options: nosniff`, and a referrer policy. There is no directory listing and nothing on the user-content hosts runs on the server.

## Custom domains

The owner adds a hostname. Rótulo shows a TXT record (`_rotulo.<host>` = `rotulo-verify=<token>`) and a CNAME or A record. "Check" resolves the TXT record over DNS-over-HTTPS. A verified hostname routes to that project only, and a hostname can be verified by one project at a time. A newer successful proof by another owner takes it over, because current DNS control is the proof of ownership. The reverse proxy asks `GET /internal/tls/allowed?domain=` before it issues a certificate, so certificates are only issued for verified hostnames.

## Frontend

The app pages are Tera templates with a small amount of TypeScript. The editor and the agent are plain TypeScript compiled by `tsc` to ES modules in `assets/static/js/`. There is no framework and no runtime npm dependency. GrapesJS was not used: it converts imported pages into its own component model and re-renders them, which loses markup the owner did not touch, and it brings a large bundle for features Rótulo does not offer.

## Project deletion and storage gap

Deleting a project removes its metadata and dependent rows in a transaction under the project lock. After commit, its release and archive directories are removed best effort, with cleanup failures logged. Cleanup does not follow symlinks and only uses project identifiers beneath the store directories. Slug claims remain reserved to the original user. Shared content-addressed blobs are retained: blob garbage collection is a known storage gap.
