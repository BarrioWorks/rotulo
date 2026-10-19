# Pagehaven threat model

Assets: user accounts and sessions, private drafts, published sites, the shared VPS and its other applications, and Pagehaven's reputation as a host.

Actors: an anonymous visitor, a signed-in user attacking another user, a user uploading a hostile archive, third-party JavaScript inside an imported site (an AI tool may have added it), and a visitor of a published site.

| Threat | Mitigation | Evidence |
|---|---|---|
| Path traversal, absolute paths, drive letters | The importer builds paths from validated segments only. `..`, `.`, empty segments, `\`, `:`, control characters rejected | `src/import/tests.rs`, `tests/requests/imports.rs` |
| Symlinks, devices, FIFOs | Unix mode in the central directory must be a regular file or directory | `src/import/tests.rs` |
| Duplicate or case-colliding paths | Unicode lowercase comparison at archive import and page add/rename. Unicode NFC normalization is not performed, so canonically equivalent spellings can still differ | `src/import/tests.rs` |
| ZIP bombs, lying sizes, overlapping entries | Declared and actual byte counters per entry and in total, compression-ratio cap, overlap check between entries, CRC-32 | `src/import/tests.rs` |
| Malformed, encrypted, ZIP64, multi-disk, prefixed archives | Strict EOCD and central-directory parsing, rejected with a message | `src/import/tests.rs` |
| Nested archives | Never extracted. Skipped with a warning | `src/import/tests.rs` |
| Server-side code or config (`.php`, `.htaccess`, `web.config`, `.env`) | Policy table. Skipped with a warning. Nothing on the user-content hosts runs on the server | `src/import/tests.rs` |
| Secrets in the ZIP (`.env`, keys, `.git/`) | Skipped and named in the import report | `src/import/tests.rs` |
| Wrong content behind an extension | Magic bytes for images and fonts, UTF-8 for text. Pagehaven sets the MIME type and `nosniff` | `src/import/tests.rs` |
| Disk exhaustion | Upload, content and file-count limits, per-user project limit, upload and import rate limits, staging removed on failure | `tests/requests/imports.rs` |
| CPU or memory exhaustion | Global semaphore on imports and publishes, blocking work off the async runtime, streamed inflate | `scripts/perf.sh`, `docs/verification.md` |
| Imported JavaScript reading app cookies or storage | Draft previews and published sites live on a different site from the app. No cookies are ever set on those hosts | `tests/requests/preview.rs` |
| Imported JavaScript driving the editor | Site JS shares the preview origin and window with the agent and can forge messages. Origin, source and schema checks remain required. Parent-side gating limits text saves and shortcuts to the text session the owner started in the app, and text saves to its element and parent-chosen page. Ready messages must match the parent-chosen page. Keyboard selection and Enter to edit run in the app document, so no agent message starts a text session. Page reloads load a second iframe with the same sandbox and accept messages only from the loading or active frame's window. The server still validates every edit; messages cannot publish | `frontend/tests/protocol.test.mjs`, `frontend/tests/canvas-policy.test.mjs`, `tests/requests/editing.rs` |
| Preview token reused for a newer project | Project and release ids are `AUTOINCREMENT`, so an id is never reused after a deletion | `migration/src/m20261019_000001_initial.rs` |
| Preview URL leak | HMAC token in the hostname, expires after 12 hours, `Referrer-Policy: no-referrer` on preview responses | `tests/requests/preview.rs` |
| Preview framed by another site | `frame-ancestors` names only the app origin | `tests/requests/preview.rs` |
| Local network access from a preview | Preview CSP allows `'self'` and `https:` only, so plain-HTTP intranet services are blocked. Browsers also enforce Private Network Access | `tests/requests/preview.rs` |
| Stored XSS in the app | Tera auto-escaping, editor uses `textContent`, app CSP without inline scripts | review |
| `javascript:` and other dangerous URLs | Link and text edits accept `http`, `https`, `mailto`, `tel`, relative paths and fragments only | `tests/requests/editing.rs`, `src/document.rs` |
| SVG with script | SVG runs only on user-content hosts, never on the app host. Replacement uploads accept raster images only | `tests/requests/editing.rs`, `src/document.rs` |
| CSRF | SameSite=Lax session cookie, Origin and `Sec-Fetch-Site` check on every unsafe method, JSON API requires `application/json` | `tests/requests/auth.rs` |
| Account takeover | Argon2 hashes (Loco), random session tokens stored as SHA-256, rotation on sign-in, revocation on sign-out, sign-in rate limit | `tests/requests/auth.rs` |
| Cross-user access | Every project route resolves the project through one function that requires the signed-in owner. Other users get 404 | `tests/requests/authorization.rs` |
| Unauthorized publishing or rollback | Same owner check. Rollback only to a release of the same project | `tests/requests/publishing.rs` |
| Stale saves between tabs | Every draft change carries the base revision. A mismatch returns 409 | `tests/requests/editing.rs`, `src/document.rs` |
| Publication race | Per-project lock, release built in a temporary directory, renamed, then activated in one transaction | `tests/requests/publishing.rs` |
| Subdomain reassignment | A slug stays claimed by the user who first used it. Reserved names (`www`, `app`, `admin`, `preview`, ...) are refused | `tests/requests/domains.rs` |
| Custom domain takeover | Only verified hostnames route. A hostname is verified by one project at a time. Verification requires the project's own random token in DNS | `tests/requests/domains.rs` |
| Certificates for unowned domains | TLS ask endpoint returns 200 only for verified hostnames and managed subdomains with a live release | `tests/requests/domains.rs` |
| ACME challenge abuse | `.well-known/` is never imported or published | `src/import/tests.rs`, `tests/requests/imports.rs` |
| Phishing or malware on published sites | Separate user-content domain, a report address on every 404, operator `unpublish` task. Pagehaven cannot prove arbitrary JavaScript is harmless | `tests/requests/publishing.rs`; limitation |
| Other applications on the VPS | Unprivileged user, one port on loopback, memory and CPU limits from the container runtime, no Docker socket, no changes to the shared proxy beyond adding routes | `docs/deployment.md` |

Not covered in this prototype: email verification and password reset, malware scanning of uploads, abuse reporting workflow beyond operator unpublish, storage quotas per user beyond the project count.
