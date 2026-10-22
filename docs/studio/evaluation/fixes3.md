# Studio fix round 3: Furnace Hill Coffee

2026-10-20. Baseline: `8599b9d`; implementation: branch `studio/fixes3`.
One agent used the T3 Chromium preview against this worktree on port 5178,
with a separate SQLite database and uploads under `/tmp/rotulo-fixes3`.
There were no participants. Numbers below are measured; causes come from code inspection.

## Before and after

The same imported Furnace Hill fixture and original featured heading were used for
these geometry comparisons. Later text-growth and upload walks changed the test data.
The article check used Tuesday is roast day before, and the longer
The filter recipe we give everyone who asks after.

| Viewport | Home site-name width, before → after | Article site-name width, before → after | Switcher width, before → after (same on Home and article) | Caption y, before → after |
|---|---|---|---|---|
| 1280 × 800 | 67.5 → 118 px | 0 → 118 px | 146 → 230 px | 376 → 201 px |
| 1024 × 768 | 25.5 → 96 px | 0 → 96 px | 104 → 170 px | 313 → 162 px |
| 834 × 1112 | 79.5 → 96 px | 0 → 96 px | 158 → 158 px | 274 → 142 px |
| 390 × 844 | 0 → 80.5 px | 0 → 80.5 px | 108.5 → 108.5 px | 582 → 454 px |

- Global control drift was **0 px before and after**, comparing visible island/button
  rects within each viewport during selection, entering/leaving text editing, Style,
  publish review, page changes and link selection. Resize itself is excluded.
- Cold-load layout shift was **0 before and after at all four sizes**, one navigation
  per size per comparison. Programmatic focus/scroll walks can create later layout-shift
  entries without trusted recent input; those are not cold-load measurements.
- The bottom bar was **113 px before and after** at 834 and 390, including selected,
  editing and panel states. Canvas heights remain 748, 716, 939 and 671 px respectively.
- The caption covered the excerpt before and clears it after at all four sizes.
  Total surrounding-content intersection area, including photos, was approximately
  **12059 → 0**, **11314 → 320**, **3794 → 0** and **3135 → 2485 px²** respectively.
  At 1024 a small photo edge is covered; at 390 the caption covers part of the photo
  above rather than the excerpt below. The rule minimizes coverage, not all overlap.
- At 1280 the review was x 890–1270, y 51–382 before, overlapping the heading and
  caption. After it is x 892–1272, y 60–193, clear of both. History uses the same clamp.
  Review height keeps at least 120 px of usable room when avoiding a selection;
  overlap remains accepted at constrained sizes such as 1024 and 834.
- Escape from the publish popover focused the selected canvas at all four sizes.
  A real rollback at 834 focused `li.release.is-live` for version 1 after activation.
- In the 390 Style panel, Reset occupied y 440–484 while Size occupied y 436–480
  before. After, the controls occupy separate flow positions; internal scrolling
  revealed Size and Reset individually inside the canvas without overlap.

## Causes and fixes

1. The switcher's site flex item could shrink to zero. Reserve its width, give the
   page the remaining space and fixed island geometry per breakpoint. On phones,
   put site and page on separate lines within the same fixed switcher. The full
   accessible name, tooltip and native title remain Site / Page.
2. Placement ignored the reported obstacles and recomputed the side. Compare
   coverage once, remember the side for the selection and freeze the caption box
   during typing. If text growth or scrolling reaches that box, hide it rather
   than cover the text or move it. Unit tests cover coverage, obstructions, side
   persistence, growth and canvas edges. Decision 3 records the refined rule.
3. Publish was anchored to whichever trigger opened it and had a viewport-only
   height limit. Anchor below the right island and clamp against selection and
   caption where usable room permits; closing returns focus to the selected canvas.
4. Replacement focused the success banner rather than the description. Focus and
   reveal the description, retain its old value, put it first in the replacement
   panel and show “Check the description still matches the new photo.” Panel
   measurement and rerendering now preserve internal scroll. Successful replacements
   were checked at all four widths, including a nonempty old description on Home.
   CSS background/banner photos have no alt-description field in the existing model;
   image descriptions are left unchanged until the owner edits them.
5. The history actions described neither distinct outcome. They now read “Edit from
   this version” and “Make this version live”; confirmations name the same actions.
6. Website name lacked an explanation of its internal scope. A linked field hint
   says only the owner sees it and points to Page settings for visitor-facing metadata.
7. The caption discarded its existing destination detail. Link now uses describeHref
   in its visible text, tooltip and full accessible name. The visible text truncates,
   including on phones, without dropping the whole Link action in the tested row.
8. Two unrelated controls shared More. The tools overflow is View with a computer
   icon; the caption retains More.
9. The loading veil used opacity only. Its aria-hidden state now follows loading
   and readiness, with error messages exposed again. Checked false while navigating
   and true after readiness; no agent or protocol change was needed.
10. The phone hint was permanent. It appears once per editor session for 3.5 seconds,
    then empties; it was observed empty after the timeout.
11. The sticky Reset action overlaid earlier Style controls. Keep actions in normal
    flow, prevent flex compression and preserve panel scroll during measurement.

The actual text-growth walk at 834 kept the caption transform fixed at x 489, y 142;
when browser scrolling brought the enlarged text into its box the caption hid.
Formatting actions remained in the fixed bottom row. Caption roving order remains
DOM order; the existing regression test passes. Ctrl+Shift+P focused the publish
confirmation, and Ctrl+Shift+H opened history.

## Verification and limits

- `npm run build`: exit 0; generated JavaScript is included.
- `npm test`: 118 tests passed, 0 failed.
- `bash scripts/check.sh`: exit 0, including formatting, Clippy, 80 Rust unit tests,
  32 integration tests, TypeScript, icons, contrast and frontend tests.
- `bash scripts/smoke.sh http://127.0.0.1:5178 fixtures/zips/furnace-hill.zip`:
  exit 0, including import, edit, stale revision rejection, publish, undo and rollback.
- The design detector reported only existing radius/font-size advisories.
- Backend Rust, frontend/protocol.ts, frontend/editor/canvas-policy.ts and
  frontend/agent/agent.ts are unchanged. No dependency was added.

Geometry was checked before and after at all four sizes. Actual publishing and
rollback were walked at 834; their labels and confirmation copy are shared across
sizes. No real screen reader or coarse-pointer emulation was used. This is a bounded
expert walkthrough, not a participant study or a repeated performance benchmark.
The accepted reload publish-count and keyboard heading action-count issues remain.
