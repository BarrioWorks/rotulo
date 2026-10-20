# Verification

What was checked, how, and what is still open. Dates are 2026-10-19 and 2026-10-20 (UTC). Nothing here was measured on the production VPS; Pagehaven is not deployed.

## Automated tests

`scripts/check.sh` runs rustfmt, clippy with warnings as errors, the Rust unit and request tests, the TypeScript compiler, the frontend tests, a check that the committed JavaScript matches the TypeScript, the icon sprite check (every referenced icon exists, every icon-only button has an accessible name) and the colour contrast check (every listed text and UI colour pair meets WCAG AA).

| Suite | Count | Covers |
|---|---|---|
| Rust unit tests | 80 | ZIP reader and hostile archives, file policy, reference resolution, the page editing model and its sanitizer, link and style validation, nesting depth, rate limiter bounds |
| Rust request tests | 32 | Sign-up and sessions, CSRF, cross-user access, imports and limits, editing and stale tabs, preview isolation headers, publishing, rollback, operator takedown and reinstatement, custom domains and the TLS ask endpoint, deletion, 404 pages |
| Frontend tests | 85 | Preview message parsing and caps, parent-side message gating, toolbar placement, canvas fit maths, status wording, save queue retries, dashboard and import logic, overlay colours matching the app's tokens |

`scripts/smoke.sh` drives the whole journey over HTTP against a running server: register, import, preview, edit, stale-tab refusal, publish, live site, no editor markup on the live site, stylesheet MIME type, undo, republish, rollback. It passes for `startbootstrap-agency.zip`, `landwind.zip` and `harbor-bakery.zip`.

## Performance

`scripts/perf.sh 7 <zips>`: release build, its own server on port 5151, 7 runs per ZIP, full HTTP round trips measured by curl. Machine: 8 cores, load average 1.4 to 2.7 during the run. Nothing was profiled, so these numbers bound the request, not any one stage.

| ZIP | Import median (range) | Publish median (range) |
|---|---|---|
| startbootstrap-agency (2 MB, 86 entries, 25 site files) | 31 ms (28 to 38) | 11 ms (9 to 14) |
| landwind (18 site files) | 28 ms (22 to 31) | 12 ms (11 to 15) |
| harbor-bakery (21 files) | 25 ms (24 to 29) | 13 ms (11 to 17), n=6 |

Server memory was 22 MB at idle and 41 MB at its peak. The one failed request in that run was the 21st import from one account, refused with 429 by the import rate limit of 20 per hour, as designed. An earlier run with a generated 201-file, 15 MB site measured a 177 ms import and a 64 ms publish.

Deeply nested HTML was the one quadratic path the security review found. After the fix, marking up a 500-level page takes 5.2 ms instead of 65.2 ms, and a 100,000-level page is refused at import in 48 ms (single debug runs).

## Security review

Two independent reviews ran against a snapshot of the code, one on the content boundary (importer, editing model, preview isolation) and one on the account and hosting boundary. A Codex security review was refused by OpenAI's account policy and did not run. Every confirmed finding has a regression test that failed before its fix.

| Finding | Severity | Status |
|---|---|---|
| Sign-in rate-limit keys held each typed email in memory for 15 minutes; a stream of huge emails could exhaust memory | High, reproduced | Fixed. Keys stored as digests, hard cap on counters, per-address sign-in limit, password hashing moved off the async runtime |
| Deeply nested HTML made import and preview quadratic | Medium, reproduced | Fixed. Nesting over 512 levels refused; capability marking is linear; preview rendering runs off the async runtime |
| Imported site JavaScript could forge editor messages and save text | Low, reproduced | Fixed. The app starts every text session; agent messages only count inside it; the app chooses which page loads |
| Session cookie could be planted from a sibling user-content domain | Low to Medium, deployment dependent | Fixed. `__Host-` cookie over HTTPS; the server refuses a configuration where app and user content share a registrable domain unless that domain is declared to be on the Public Suffix List |
| `custom_domains: false` only hid the UI | Low | Fixed. Routes, serving and the TLS ask endpoint all refuse custom domains when off |
| An owner could republish a site an operator took offline | Low | Fixed. Suspension flag; `reinstate` operator task |
| Two users racing for one web address could split the claim | Low | Fixed. Claim and update in one transaction with an ownership check |
| Look-alike file names differing only in Unicode case | Info | Fixed for case. Unicode normalization (NFC) is not performed; documented |
| Copy fallback while publishing could overwrite a shared file | Info | Fixed. Copy only across devices, never over an existing file |
| Preview URLs are bearer links readable by scripts inside the draft | Low | Accepted and documented: 12-hour expiry, no-referrer |
| Uploaded image blobs can be referenced by hash across accounts | Info | Open. Requires knowing the exact file; yes/no oracle only |
| `/internal/tls/allowed` reveals which addresses are live | Info | Open. `docs/deployment.md` blocks it at the edge |

## Browser checks

All in Chromium through the T3 Code preview browser. Reports: `docs/demo-qa.md` (final run), `docs/design/critique/README.md` (independent design critique), `docs/design/ux/README.md` and `docs/design/editor/README.md` (pre-redesign studies).

- All 13 investor demo steps pass end to end on the real Agency template. On the live site the edited headline, the replaced banner photo (byte-identical to the uploaded file), the re-pointed button and the edited paragraph were present, and rollback restored version 1.
- A replaced portfolio photo keeps the card's original 4:3 frame after publishing.
- The source-only ZIP shows the exact required message.
- Keyboard-only editing, visible focus, the 640 px layout (1280 px at 200% zoom), the dashboard delete flow and the console were checked. Reduced motion was checked by reading the CSS only.
- Final-QA problems still being fixed at the time of writing are listed in `docs/demo-qa.md`.

## Not verified

- Safari, Firefox, real phones and high-density screens.
- Screen readers beyond accessible names and live-region announcements read from the DOM.
- Real 200% browser zoom (a 640 px viewport stood in for it).
- Drag-and-drop of the ZIP (the file picker was used).
- Hostile CSS inside an imported site against the editor overlay (the overlay uses a closed shadow root and an `all: initial` reset, tested only with real templates).
- Deployment, TLS, real DNS verification and backups. See `docs/deployment.md`.
