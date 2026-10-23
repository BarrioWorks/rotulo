# Correctness issues found during this run

| Issue | Evidence | Status |
| --- | --- | --- |
| A lost response followed by another tab's one-revision write can falsely acknowledge an unsaved edit. | `frontend/tests/saves.test.mjs`, reproduced by audit. | Fixed. Ambiguous retries stop as conflicts. |
| Next.js hydration replaces saved HTML and can remove editor IDs. | `import-compatibility.md`, two-page export experiment. | Known hydration exports now refused at import. Detection is conservative and does not recognize every framework. |
| A script in the head of an otherwise empty Vite output misses the server import warning. | `src/document.rs::is_built_by_script`, Vite export experiment. | Fixed. Detection includes head scripts, with an import regression test. |
| An 800 ms text completion timeout can resolve without acknowledgment. | `frontend/editor/canvas.ts::finishText`. | Fixed. A shared completion promise returns false on missing acknowledgment; page switching and publishing stop. Regression tests cover acknowledgment and timeout. |
| Copied HTML IDs can leave references pointing to the original subtree. | `src/document.rs::clone_subtree`. | Fixed. Both duplication paths use fresh IDs and remap local references. Unsupported embedded styles and CSS escapes are refused atomically. |
| Source maps and JavaScript server files may be exposed when packaging source and static output together. | `import-compatibility.md`, source inspection. | Recognizable server JavaScript packages are refused as source. Source maps produce a public-source warning. Unknown server filenames remain a reason to upload only finished output. |

## Independent P0 review findings

| Finding | Resolution | Verification |
| --- | --- | --- |
| An iframe could forge selection and persist a move. | Parent app owns trusted pointer capture and a single-use commit request bound to source, frame and page. Iframe messages alone cannot authorize a move. | Parent-handle browser drag persisted once; forged-message, token, replay and cancellation tests pass. Authorization confirmed by review rounds 2 and 3. |
| A delayed action could use the next page's matching element ID. | Capture the originating page before awaiting text completion, cancel if it changes, pass the page explicitly, and scope selection restoration to it. | `structure-session.test.mjs` and text-session regressions pass. |
| Direct body children were absent from root targeting. | Include the body in the hierarchy and use its real container capability for canvas targeting. | Drag tests now model an annotated body. |
| Duplicate SVG references missed whitespace and style text. | Remap supported URL tokens, preserve quoted literals/comments, and refuse embedded styles or unsupported syntax. | SVG-copy tests remove the original and verify surviving reference targets. |
| Organization names saved but did not display. | Element descriptions prefer `data-ph-name`. | Stored metadata verified by the HTTP journey; browser hierarchy displayed the stored Featured card name. |

Duplication can be offered and then refused when a subtree has embedded styles, unsupported references, or ID-dependent page styling. Local linked stylesheets are read from project storage with file/count/total byte limits. Missing or external stylesheets, imported CSS, and stylesheets on pages with a `base href` cause a safe refusal for copies containing IDs. Copies receive new HTML IDs, so existing scripts targeting original IDs do not automatically target copies. Moves retain IDs.

| Later review finding | Resolution | Verification |
| --- | --- | --- |
| Expired-preview refresh accepted old-frame messages against the next page. | Invalidate message ingress before awaiting refresh; bind readiness to the newly created frame; block structural commands during loading. | Delayed-refresh and loading-state frontend regressions. |
| Encoded SVG fragments and SMIL could retain references to the original. | Decode supported fragments; refuse animated SVG subtrees and unsupported page-address references into the copy. | Remove-original SVG reference and atomic refusal tests. |
| Renamed IDs lost ID-based CSS styling. | Tokenize inline 
## P1 and import review closure

- A create dialog could reopen while a request was pending and submit twice. Pending request state now outlives presentation changes; controls and Escape cancellation are disabled until it settles. Deferred-response tests cover refusal of a second request and deliberate retry after failure.
- Quota-rejected starter creation wrote an unused blob. The write now follows successful transactional project insertion. The concurrent quota regression checks newly stored blobs against persisted references.
- CSS decimal values such as `1.px` were accepted but ignored by browsers. Shared fixtures now reject malformed decimals in both validators.
- CSSOM preview resets altered imported shorthand contributions differently from persistence. A shared literal merge fixture now verifies Rust and TypeScript parity for border, margin, quoted values, comments and priorities.
- Excluding a server-named module could break an uninspected JavaScript import. The selected archive is now refused as source when recognized server JavaScript is present. The refusal cleans staging and does not depend on guessing dynamic module references.

Independent reviewers verified the closures. Browser-engine coverage and advanced features remain documented in `remaining.md`.
