# Verification record

## Baseline

Revision `e322a7b26f9c00c7d71b92e7fc0196a2df42cd26` passed 148 frontend tests, 84 Rust unit tests, and 40 request tests. The new `scripts/verify-structure.py` failed against the original server on the first `move_element`, with HTTP 422 and "That change isn't supported." This establishes the missing behavior.

## Implemented behavior checked so far

The local acceptance script on isolated port 5151 passed moving a hero button, reordering cards, moving an image, undo/redo, navigation/footer insertion, duplication, organization names, reload, and local publishing. A cycle was refused without changing persisted HTML. The script has since been strengthened to compare full HTML on undo and redo and inspect the published parent structure.

T3's collaborative Chromium browser performed a real pointer drag of the hero button from `hero-target` to `hero-copy`. Stored HTML confirmed the changed parent and preserved `class="cta"` and `href="#contact"`. The editor's Undo button restored `hero-target`; Redo returned it to `hero-copy`. A keyboard Alt+Shift+ArrowUp move reordered Card A before Card C. The revised parent-owned handle was subsequently checked as recorded below.

The rendered draft was inspected at 1280, 834 and 390 CSS pixels. Its grid computed three, two and one columns respectively. No horizontal overflow was observed. The moved image retained its new parent at every width. The app shell also rendered at 390 pixels with its bottom controls; this is viewport emulation, not a real touch-device test.

## Independent review

GPT-6-Astra requested changes for iframe-forged move authorization, page-switch binding, top-level section targeting, SVG duplicate references, and organization names. Those findings are tracked in `issues.md`; subsequent review rounds verified the fixes.

## Limits

Safari and Firefox have not been tested in this run. Pointer capture on a real touch device has not been tested. Native drag offsets are not exposed by the collaborative browser's drag tool, so the responsive grid's keyboard alternative and geometry tests supplement its browser checks. No production deployment or external publishing was performed.

## Rechecks after review fixes

The final HTTP script passed after strengthening its assertions. It compares the entire preview HTML after undo and redo for each move, checks actual `li > a` navigation insertion, and verifies published button/image parents, card order, classes and metadata removal.

The parent-owned handle was tested independently in the collaborative browser after the authorization change. A trusted drag moved the button to `hero-copy` once, advancing revision 19 to 20. Reading the stored draft confirmed the new parent and preserved class. The worker also tested an imported hostile script in its own browser tab; its forged move sequences did not advance revision. The parent independently inspected the code and passing authorization regression tests, but did not repeat that hostile-fixture browser experiment.

P0 automated results are 197 frontend tests, 103 Rust unit tests and 42 request tests. TypeScript, clippy, icon references, static references and token contrast checks passed. Rust formatting required a formatting-only correction to the new CSS-copy test. Final animation-refusal review passed with no remaining actionable P0 blockers.

P0 closure repeated the trusted handle drag after the final navigation ingress fix. Revision advanced 24 to 25 once. Browser Undo restored the persisted button parent to `hero-target`; Redo returned it to `hero-copy`, with its `cta` class intact. The complete HTTP journey passed against the updated local server. One full unit run failed because the shared disk filled; after clearing reproducible package build artifacts, all 103 unit tests passed. Animated SVG copies are refused atomically, including animation `to` and `values` references.

## P1 integration

The new project endpoints passed six focused request tests and existing import/project/authorization checks. Independent review confirmed ownership, CSRF, quota SQL, copy isolation and starter escaping. A low-priority quota rejection could leave a starter blob; moving the blob write after successful project insertion fixed it. The concurrent quota test now checks that newly stored blobs are referenced.

The dashboard worker checked search, sorting, grid/list persistence, no results, create and duplicate at 1280 and 390 px. The parent independently created Juniper Studio through the dashboard, resized its button to 300 px through Layout, and verified the computed width in a newly loaded preview. Browser Undo removed the stored inline width and Redo restored it. The tablet button selected an 834 by 1112 px canvas.

Independent P1 review found a pending create-dialog reentry bug and two CSS validation/preview edge cases. The create request now owns its pending state independently of the modal, disables cancellation while submitting, and permits retry after a failure. Its two deferred-response handler regressions pass. CSS decimal and shorthand-preview fixes passed the shared fixtures and independent review.

## Final evidence

The frontend suite passes 221 tests. The Rust unit suite passes 111 tests and the request suite passes 48 tests, including six new project-operation cases. TypeScript, Rust formatting, clippy with warnings denied, static references, all 45 icon symbols, contrast and whitespace checks were run. The Impeccable static scan found 24 advisory scale differences and no primary findings; these include incumbent styles and the deliberate recent-project hierarchy. A detector does not establish interaction quality.

`scripts/verify-structure.py http://127.0.0.1:5151` passes the complete import, nested button/grid/image moves, exact undo/redo, invalid-cycle refusal, navigation/footer insertion, duplication, naming, sizing validation, table insertion, reload and local publish journey. The final run reached revision 25. Its published HTML preserves parents, order, classes and sizing and contains no editor attributes.

P1 browser checks used the real app. A worker tested dashboard workflows at 1280 and 390 px. The parent independently created a starter and verified a 300 px width through a fresh preview and saved history. Tablet preview uses 834 by 1112 px. A temporary sign-in clash between local servers sharing 127.0.0.1 cookies was resolved by isolating browser profiles; it was not an application persistence failure. Safari, Firefox and physical touch remain unverified. No production push or deployment occurred.

The parent's final dashboard check repeated name search, the no-results state, list persistence after reload, project duplication and new-card focus. A 390 px list with a long published address exposed horizontal overflow. Bounding the address row and allowing action wrapping fixed it; both grid and list then measured no overflow at 390 px. Desktop grid was checked again at 1280 px. All changes remain uncommitted and no production deployment was performed.

The latest running binary also passed live upload checks for source-project refusal of a server-module dependency and explicit limited-editing metadata for an empty JavaScript app. The public refusal uses the existing `invalid_archive` category with a source-project explanation. The icon check now verifies generator membership as well as typed references; it caught the new grip/tablet rows missing from the generator, and passes after adding them.
