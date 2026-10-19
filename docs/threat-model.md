# Pagehaven threat model

Assets: user accounts and sessions, private drafts, published sites, the shared VPS and its other applications, and Pagehaven's reputation as a host.

Actors: an anonymous visitor, a signed-in user attacking another user, a user uploading a hostile archive, third-party JavaScript inside an imported site (an AI tool may have added it), and a visitor of a published site.

| Threat | Mitigation | Evidence |
|---|---|---|
| Path traversal, absolute paths, drive letters | The importer builds paths from validated segments only. `..`, `.`, empty segments, `\`, `:`, control characters rejected | `tests/import_archives.rs` |
| Symlinks, devices, FIFOs | Unix mode in the central directory must be a regular file or directory | same |
| Duplicate or case-colliding paths | Case-folded set of normalized paths | same |
| ZIP bombs, lying sizes, overlapping entries | Declared and actual byte counters per entry and in total, compression-ratio cap, overlap check between entries, CRC-32 | same |
| Malformed, encrypted, ZIP64, multi-disk, prefixed archives | Strict EOCD and central-directory parsing, rejected with a message | same |
| Nested archives | Never extracted. Skipped with a warning | same |
| Server-side code or config (`.php`, `.htaccess`, `web.config`, `.env`) | Policy table. Skipped with a warning. Nothing on the user-content hosts runs on the server | same |
| Secrets in the ZIP (`.env`, keys, `.git/`) | Skipped and named in the import report | same |
| Wrong content behind an extension | Magic bytes for images and fonts, UTF-8 for text. Pagehaven sets the MIME type and `nosniff` | same |
| Disk exhaustion | Upload, content and file-count limits, per-user project limit, upload and import rate limits, staging removed on failure | same, `tests/limits.rs` |
| CPU or memory exhaustion | Global semaphore on imports and publishes, blocking work off the async runtime, streamed inflate | measured in `docs/verification.md` |
| Imported JavaScript reading app cookies or storage | Draft previews and published sites live on a different site from the app. No cookies are ever set on those hosts | `tests/preview.rs` |
| Imported JavaScript driving the editor | The toolbar is in the app page. Messages are checked for origin, window and schema. Message-driven edits go through the same server validation and only reach this project's draft. Publishing cannot be triggered by a message | `frontend` tests, `tests/editing.rs` |
| Preview URL leak | HMAC token in the hostname, expires after 12 hours, `Referrer-Policy: no-referrer` on preview responses | `tests/preview.rs` |
| Preview framed by another site | `frame-ancestors` names only the app origin | `tests/preview.rs` |
| Local network access from a preview | Preview CSP allows `'self'` and `https:` only, so plain-HTTP intranet services are blocked. Browsers also enforce Private Network Access | `tests/preview.rs` |
| Stored XSS in the app | Tera auto-escaping, editor uses `textContent`, app CSP without inline scripts | review |
| `javascript:` and other dangerous URLs | Link and text edits accept `http`, `https`, `mailto`, `tel`, relative paths and fragments only | `tests/editing.rs` |
| SVG with script | SVG runs only on user-content hosts, never on the app host. Replacement uploads accept raster images only | `tests/editing.rs` |
| CSRF | SameSite=Lax session cookie, Origin and `Sec-Fetch-Site` check on every unsafe method, JSON API requires `application/json` | `tests/auth.rs` |
| Account takeover | Argon2 hashes (Loco), random session tokens stored as SHA-256, rotation on sign-in, revocation on sign-out, sign-in rate limit | `tests/auth.rs` |
| Cross-user access | Every project route resolves the project through one function that requires the signed-in owner. Other users get 404 | `tests/authorization.rs` |
| Unauthorized publishing or rollback | Same owner check. Rollback only to a release of the same project | `tests/publishing.rs` |
| Stale saves between tabs | Every draft change carries the base revision. A mismatch returns 409 | `tests/editing.rs` |
| Publication race | Per-project lock, release built in a temporary directory, renamed, then activated in one transaction | `tests/publishing.rs` |
| Subdomain reassignment | A slug stays claimed by the user who first used it. Reserved names (`www`, `app`, `admin`, `preview`, ...) are refused | `tests/domains.rs` |
| Custom domain takeover | Only verified hostnames route. A hostname is verified by one project at a time. Verification requires the project's own random token in DNS | `tests/domains.rs` |
| Certificates for unowned domains | TLS ask endpoint returns 200 only for verified hostnames and managed subdomains with a live release | `tests/domains.rs` |
| ACME challenge abuse | `.well-known/` is never imported or published | `tests/import_archives.rs` |
| Phishing or malware on published sites | Separate user-content domain, a report address on every 404, operator can unpublish a project. Pagehaven cannot prove arbitrary JavaScript is harmless | limitation |
| Other applications on the VPS | Unprivileged user, one port on loopback, memory and CPU limits from systemd, no Docker socket, no changes to the shared proxy beyond adding routes | `docs/deployment.md` |

Not covered in this prototype: email verification and password reset, malware scanning of uploads, abuse reporting workflow beyond operator unpublish, storage quotas per user beyond the project count.
