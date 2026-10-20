# Security re-review

Reviewed `git diff c94aec9..HEAD -- src frontend assets/views migration` on `main` at `3e2c0400c50ec71b84f57410c9d277fe262696b4`. Date: 2026-10-20 UTC. Read `docs/verification.md` and the earlier review. Imported JavaScript is hostile and shares the agent's frame. Origin checks cannot distinguish that script from the agent.

The earlier automatic text-session attack is fixed. No new High or Medium finding was identified. One Low residual needs attention. The earlier Info finding about event retention remains open. No application code or test file was changed.

## Findings

### 1. Frame messages can steer the owner's next input to another element

Severity: Low. Locations: `frontend/editor/canvas.ts:375`, `frontend/editor/canvas.ts:499`, `frontend/editor/main.ts:215`, and `frontend/editor/toolbar.ts:431`.

Scenario. The owner selects heading A. The site posts a valid `select` for B, using A's apparent position and descriptive fields. It posts `request_text` for B. The app focuses Edit text. The owner's next printable key starts a session for B. The frame can then send arbitrary sanitized text for B. The owner supplied app input, but may believe A is still selected.

The caption offers little identity evidence. `frontend/editor/toolbar.ts:372` renders the kind and save state, such as "Heading · Saved". It does not show the selected element's text or id. Its placement uses the frame's reported rectangle. The selection ring is drawn by `frontend/agent/agent.ts:68` inside the hostile frame. A site can remove the overlay host, draw a substitute ring, or leave the real ring on A while forging selection B. A closed shadow root protects ordinary styling, not the truth of the frame's pixels. The owner cannot reliably distinguish A from B through these cues.

Confirmed at the canvas boundary with an in-memory extension of `frontend/tests/text-session.test.mjs`. A forged A-to-B replacement and request saved nothing before `canvas.startText('N')`. After that simulated app input, text for A was rejected and text for B reached `onText`. The actual focus and keyboard path was traced through `main.ts:215`, `toolbar.ts:476`, and `toolbar.ts:427`. A full malicious-site browser interaction was not run. The visual deception is inferred from those rendering paths.

This is Low because it requires the owner to interact with their imported site. It changes that owner's draft, remains subject to server sanitization, and does not publish by itself. It does not bypass accounts or tenant checks. Once an owner authorizes a session, its text remains frame-controlled. The protocol cannot prove that the returned HTML matches their keystrokes.

Smallest fix for the new focus-steering path: make `request_text` announce a hint without moving focus. Require an explicit click or Enter on the app's Edit text control. Remove the printable-key start from that control until this explicit activation. Keep keyboard editing from the canvas as a deliberate app action. This removes the frame's ability to redirect a key intended for another app control.

For stronger target assurance, capture the selected element when the app control receives the owner's action. Cancel that pending action if the selection changes. Show a parent-owned description obtained from server data if accurate element identity is a requirement. A description copied from `select` is also forgeable.

The suggested last-click match and selection age of a few hundred milliseconds reduce accidental races. They are useful UX checks, but do not authenticate a click. Both the reported click and selection come from the hostile frame. A script can forge both, wait out the delay, and request focus again. A delay alone does not close this finding.

Resolution: `request_text` now only announces a hint without moving focus; printable keys start editing only on the canvas surface, Edit text requires explicit activation, and the unused click-caret protocol path is removed. Regression tests cover forged messages followed by typing on Edit text and preserve canvas typing and Enter.

### 2. Event storage still grows indefinitely

Severity: Info. Unchanged from the earlier review. Locations: `migration/src/m20261020_000002_events.rs:10`, `src/events.rs:50`, and `src/controllers/api.rs:878`.

Scenario. An account repeatedly makes allowed failed imports or successful sign-ins and publishes. These create permanent event rows. Deleting a project does not delete its events. Daily returns also accumulate. Fixed categories avoid storing imported content, but the ids still form a linkable activity history.

Inferred from the schema, event writers, deletion path, and absence of retention cleanup. The request suite confirms milestone inserts and deduplication. No long-duration storage test was run.

Smallest fix: choose a retention period and periodically delete older rows in bounded batches. Document the period. The new import fix closes the immediate unlimited-write loop, but rate limits do not impose a lifetime storage cap.

## Protocol checks that passed

- `request_text` is focus-only. Its handler never calls `send(start_text)` or creates `textSession`. `Canvas.startText` checks selection, text capability, loading, mode, and an existing session. Its production callers are app click and keyboard handlers.
- The parent checks both frame source and the expected preview origin before parsing at `frontend/editor/canvas.ts:354`. `ready` must match the page the parent requested. Messages cannot choose another draft page during editing.
- `text` and `editing` require a parent-created session for the same element. Text saves once and clears the session at `canvas.ts:428`. A different element, a replay, and forged editing reports do not grant permission. A session can finish during a mode transition by design.
- The existing forged `select`, `request_text`, `editing`, and `text` regression test passes even with transient browser activation set true. An additional test repeated that sequence 100 times. It produced 100 focus requests, zero starts, and zero saves.
- `show_editable` and `hide_editable` carry no caller-controlled element list. Their known fields are literal message types. `request_text` requires an element id matching `[0-9a-z]{1,10}`.
- `start_text.caret` is exactly `click` or `auto`. `input` is nullable or omitted, or a nonempty string of at most four UTF-16 code units. Control and format characters and line and paragraph separators are rejected. It is inserted with `execCommand("insertText")`, not parsed as HTML. The app's `typedCharacter` caller further limits input to one Unicode code point.
- The parser itself accepts `input: "abcd"`. Thus "one typed character" describes the caller, not the wire schema. This is bounded and does not create a security bypass. If exact agreement is desired, add the caller's code-point count check to the parser.
- Unknown keys are ignored and removed by `schema.ts:obj`. They are not rejected. This corrects the earlier review's description of strict parsing. Known fields still receive type, literal, length, and range checks. Unknown fields cannot change the parsed command.

## Rate-limit fix and remaining event writers

`src/controllers/api.rs:131` now applies `IMPORT` before entering the operation and its failure-recording branch. A refusal cannot insert `import_failed` or `import_ok`. The request regression sends 20 invalid archives, observes 20 failure rows, then sends 30 requests that return 429. The row count stays 20. It passed in this review.

The other writers remain bounded in normal operation. Sign-up has an IP limit of 10 per hour. Sign-in has an address limit of 50 per 15 minutes and a combined address/email limit of 10 per 15 minutes. Imports share 20 attempts per user per hour. Publish and release activation share 60 per user per hour. `first_edit` has a unique index per project. `returned` has a per-day cache and a database unique index per user and day. No new unbounded event writer was added.

There are two qualifications. Authentication calls `returned` before the import handler at `src/auth.rs:245`. A first authenticated request of the day can therefore record one daily return even if the import is refused. "No rows on refused imports" is accurate for import events, not all events. Also, the limiter is process-local. Restarts reset it, and saturation evicts old counters at `src/state.rs:30`. These rates are not durable global quotas. The retention finding also applies to allowed traffic and multiple accounts.

## Import preflight checks that passed

`frontend/import.ts:159` parses a detached document with `DOMParser`. It never inserts imported nodes into the app. Script text and event attributes do not execute in this path. The previous backtracking regexes are gone. The real browser checks passed for inert script content, comments, source extensions, empty roots, and each malformed 64 KB payload from the earlier review. This establishes those cases, not a general complexity proof.

Compressed input and inflated output for `index.html` remain capped at 1 MB. Stream output is counted and the reader is cancelled. The ZIP directory reader checks offsets and rejects unsupported features. Uncertain inputs can still go to the server. Preflight classification grants no server permission. The server still validates paths, sizes, CRCs, file policy, HTML depth, and required references. Server ZIP code and migrations have no changes in this diff.

`parseEditorUrl` at `frontend/import.ts:15` uses the browser URL parser, checks exact origin equality, and restricts the parsed pathname to `/projects/` plus one segment. The tab-prefixed external URL from the earlier review is rejected. Absolute same-origin URLs are allowed intentionally. Queries and fragments cannot change the checked origin. The destination comes from the server response.

## Marketing and isolation checks that passed

The new handlers at `src/controllers/marketing.rs:6` and `:10` render fixed templates with empty request contexts. They accept no user-selected template, raw HTML, redirect, or query value. Their text and links are static. `HOME_FAQ` at `src/controllers/seo.rs:84` is constant data shared by the visible FAQ and JSON-LD.

Every `| safe` under `assets/views` was checked. There is exactly one, at `assets/views/home.html:4`. It receives only `seo_pages.home_json_ld`. `seo.rs:35` uses JSON serialization and `seo.rs:49` replaces every literal `<` with `\u003c`. A `</script>` terminator therefore cannot occur in the HTML source. The configured origin is the only nonconstant input. No imported content enters this value. Other template variables use Tera's HTML autoescape, including quoted metadata attributes, project names, and `sites_domain`. No added template disables autoescape. New frontend render paths use text nodes or `textContent`.

The new public pages only extend `INDEXABLE_PATHS`. Host routing still sends preview and tenant hosts away from application routes. Preview responses still apply CSP, `frame-ancestors`, `no-referrer`, cookie stripping, and `X-Robots-Tag`, including errors. Unsafe preview methods still return a noindex 405. The iframe still has `sandbox="allow-scripts allow-same-origin"` and loads on the separate preview origin. Same-origin here refers to the preview, not the app.

CSRF checks, session cookie handling, owner lookups, preview tokens, and server ZIP validation are unchanged. Adding the marketing routes does not bypass the host middleware. Publish review now lets the owner expand all changes. Revealing a saved element still sends a bounded id through the existing protocol. Imported content cannot invoke Publish through these changes.

## Verification and limits

- `cargo test -q`: passed. 84 unit tests and 40 request tests. Zero failures. The empty binary and documentation test targets also passed.
- `npm test`: passed. It rebuilt the TypeScript and ran 146 frontend tests. Zero failures.
- In-memory text-session extension: eight tests passed, including the five existing tests and three additional adversarial checks. The added cases covered selection substitution, repeated forged requests, and parser bounds. Imports were rewritten to absolute file URLs in memory. No test file was saved.
- Additional direct protocol checks passed for parameterless commands, invalid request ids, unknown caret values, and discarded extension fields.
- Chromium through the T3 preview browser: `frontend/tests/import-browser.mjs` returned `{ checks: 55, passed: true }`. A temporary static server served the repository for this read-only check.

Canvas tests use the shipped controller with a fake DOM. They prove session gating and callback behavior, not browser focus timing or server persistence. The selection-deception assessment also uses source inspection. Deployment, production headers, DNS, and other browser engines were not tested.

## Ten-line summary

1. Reviewed the requested diff through `3e2c040` with hostile imported JavaScript.
2. Forged frame messages alone cannot start a text session or save text.
3. Focus steering can make the owner's next input authorize an attacker-chosen element.
4. That residual is Low severity and warrants removing automatic focus transfer.
5. Click reports and selection delays cannot authenticate a hostile frame.
6. Protocol fields are bounded, but unknown keys are discarded rather than rejected.
7. Refused imports add no import events, while lifetime event retention remains Info.
8. Import preflight, marketing escaping, and isolation checks found no new bypass.
9. Rust passed 84 unit and 40 request tests, and frontend passed 146 tests.
10. Eight session tests and 55 browser checks passed, with only this report committed.
