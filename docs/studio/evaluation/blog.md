# Studio evaluation on a realistic blog: Furnace Hill Coffee

This is the current before and after record for the Studio redesign. It replaces the Agency template runs with a realistic blog, because the owner called the old demo "extremely unrealistic".

No participants took part. Every result comes from one agent walking the tasks in a browser. Each claim carries a label: **measured** (a number read from the page or the server), **observed** (seen on screen or in a screenshot), **read** (from code or a commit) or **inferred** (a conclusion from the others).

## Setup

- **Site.** Furnace Hill Coffee, `fixtures/zips/furnace-hill.zip`. Both apps imported it as 7 pages (measured). The home page has a featured post with a photo, a heading, an excerpt and a "Read the post" link. Article pages have a heading, an intro, a byline and large photos.
- **BEFORE.** Commit `243c543` in `/home/agent/code/OVH/rotulo-before`, run on port 5177 with its own data in `/tmp/rotulo-before`. Account `furnace-before@example.com`.
- **AFTER.** `main` on port 5150. The task walk used account `furnace-after2@example.com`. The 1280 heading edit, the 390 drift run and the dashboard and import screenshots came from an earlier session on `furnace-after@example.com`. The headless benchmark used `furnace-bench@example.com`.
- **Photo.** `fixtures/images/replacement-coffee-cherry.jpg`.
- **Browsers.** The T3 preview (Chromium) for the walks and screenshots. `chrome-headless-shell` 154 over CDP for the repeated cold loads and selection latency (`/tmp/eval/blog/bench.mjs`).
- **Counting rule.** The baseline's rule. Each click, typed string, key chord and file choice counts as one action. Closing a dialog after the change is done is listed as "+1".

## 1. The eight tasks

### At 1280 x 800

| # | Task on Furnace Hill | BEFORE, pointer | AFTER, pointer | AFTER, keyboard | Did it land |
|---|---|---|---|---|---|
| 1 | Edit the home page's featured post heading | **4**: click heading, Edit text, type, Enter | **4**: click heading, click again, type, Enter | **6**: Ctrl+K, type "main heading", Enter, Enter, type, Enter | Yes in both. curl of the live home page returned "Ten bags from Los Naranjos, before" and "…, after" (measured) |
| 2 | Replace the featured photo | **3**: click photo, Replace image, choose file | **3**: click photo, Replace image, choose file | Not walked | Yes in both. The live `images/uploads/7ad69a48fae46f9a.jpg` has SHA-256 `7ad69a48…c50a`, the same as the fixture, in both apps (measured) |
| 3 | Point "Read the post" at the About page | **4**: click link, Link, choose About, Save link | **4**: click link, Link, choose About, Save link | Not walked | Yes in both. Live `href="about.html"` (measured) |
| 4 | Switch to an article page | **1** with the rail row, 2 with the switcher | **2**: switcher, Tuesday is roast day | Not walked | Yes in both. The article loaded (observed) |
| 5 | Change the website name | **3** (+1): Website settings, type, Save | **3** (+1): Settings, type, Save | Not walked | Yes in both. Toast "Website settings saved". Tab title and switcher name changed (measured) |
| 6 | Preview the phone version | **1**: Phone screen | **1**: Phone screen | Not walked | Yes in both. Phone frame at Fit 79% before and Fit 81% after (observed) |
| 7 | Publish | **2**: Publish, Publish | **2**: Publish, Publish | **2**: Ctrl+Shift+P, Enter. Focus starts on the confirm button (measured) | Yes in both (curl above) |
| 8 | Restore the previous version | **3** (+1): Version history, Publish again, Publish version 1 | **4**: Publish, Version history, Publish again, Publish version 1 | Not walked | Yes in both. curl returned the version 1 heading again (measured) |

Totals by pointer: 21 actions before and 23 after (measured by count). The two extra actions are task 4, where the rail row is gone, and task 8, where version history sits inside the publish popover.

Discoverability, errors and dead ends (observed unless marked):

- **Task 1.** Before: Edit text is a labelled button. While typing, a stale "Italic Ctrl+I" tooltip sat over the heading text, and the "Editing" chip covered the first letters of the second line (`baseline/blog-screens/editor-editing-1280.png`). After Enter the screen-reader announcement still named the old heading (measured). After: the second click starts editing. The announcement named the new text (measured). By keyboard it takes 6 actions against 4 in the old editor.
- **Task 2.** Both apps keep the old description, "Coffee cherries ripening on a branch, some still green and some turning red", on the new photo of cherries held in a hand. The live HTML ships that stale `alt` in both apps (measured). Both panels ask for a new description, but nothing requires one.
- **Task 3.** Before: the toolbar docked as a full-width strip over the site's header and nav, and the link form opened in the rail, about 600 px from the link. After: the popover opened directly above the link, clear of the link and the caption (measured, y 212 to 560, link from 565). After no longer shows the destination in the caption. Before showed "Link · Ten bags from Finca… page" in the toolbar.
- **Task 4.** Before: every page is a row in the rail, but long post titles truncate ("Ten bags from Finca …", "The filter recipe we gi…"). After: the switcher lists full titles and has a search field. On the article page the switcher reads "/ Tuesday is roa…" with no site name (measured, see section 4).
- **Task 5.** Neither app lists the rename in the publish review, and it changes nothing on the live site. The published `<title>` stays "Furnace Hill Coffee · Journal" (measured). Before had a new bug after the rename: rail labels became "About · Furnace Hill C…" and "Tuesday is roast day ·…", because the old site name was no longer stripped from page titles. After kept clean labels (observed).
- **Task 7.** Both review lists read "Home: Link change, Image change, Text change" (observed).
- **Task 8.** Before and after both say "Publish again", not "Restore". After also offers a separate "Restore" button that opens a version in the editor, so two different actions sit side by side (observed, `final/screens/editor-publish-history-1280.png`). After the rollback, focus fell to `BODY` in the old editor and landed on the live version row in the new one (measured).

### AFTER at 834 x 1112

| # | Actions | Did it land | Drift |
|---|---|---|---|
| 1 | 4: click, click again, type, Enter | Yes. Live heading "…, tablet" in version 3 (measured) | 0 px on 18 rects, while selected, while typing and after (measured) |
| 2 | 3: click photo, Replace image in the bottom bar, choose file | Yes. The same file is stored under the same content hash, so the review listed no image change (measured) | 0 px |
| 3 | 4: click link, Link, Contact, Save link (not a required task at 834) | Yes. Live `href="contact.html"` (measured) | 0 px |
| 4 | 2: switcher, Tuesday is roast day | Yes (observed) | 0 px |
| 5 | 3 (+1) | Yes (measured from the switcher name) | 0 px |
| 6 | 1: Phone screen, Fit 100% | Yes (measured) | 0 px |
| 7 | 2 | Yes, version 3 live (measured) | 0 px |
| 8 | 4 | Yes, version 2 live again (measured) | 0 px |

The old editor at 834 hides the page switcher and puts pages in a drawer. Its selection toolbar docks over the open drawer (observed, `baseline/blog-screens/editor-page-switcher-834.png`). At 390 the old editor shows only the Manage view, so tasks 1 to 4 and 6 cannot be done on a phone (observed).

## 2. Measurements

Method. `bench.mjs` starts a fresh headless profile with the cache disabled. It signs in, loads the editor cold at each size, and runs `/tmp/eval/blog/m.js`, which is `scripts/studio/measure.js` cut down to these fields plus resource timings. It then takes 24 selections at 1280. Runs alternated: before, after, before, after, five times each. Values are the median and range of the 5 runs (measured). The T3 preview runs agree. Before at 1280 gave share 0.677 and layout shift 0.295. After gave layout shift 0 on 3 cold loads each at 1280, 834 and 390.

| Viewport | canvasShare before → after | Persistent panels before → after | Layout shift before → after (5 cold loads each) | DOM nodes before → after | DCL ms before → after | Editor data ms before → after |
|---|---|---|---|---|---|---|
| 1280 x 800 | 0.677 → **0.935** | rail 248 x 744 → none | 0.3023 (all 5) → **0** (all 5) | 384 fresh, 397 after the walk → 364 | 181 (178 to 237) → 197 (184 to 220) | 240 (223 to 294) → 255 (226 to 278) |
| 1024 x 768 | 0.627 → **0.932** | rail 248 x 712 → none | 0.2756 → **0** | 397 → 364 | 191 (172 to 210) → 196 (179 to 204) | 244 (216 to 256) → 239 (231 to 249) |
| 834 x 1112 | 0.873 → **0.844** | none → none | 0.4025 → **0** | 397 → 364 | 199 (198 to 220) → 198 (188 to 230) | 249 (245 to 269) → 242 (241 to 281) |
| 390 x 844 | 0 (no canvas) → **0.795** | none → none | 0.2607 → **0** | 314 → 364 | 199 (178 to 199) → 218 (201 to 229) | 247 (230 to 270) → 269 (243 to 282) |

What limits these numbers:

- After at 1280 and 1024, the 52 px band of islands is the only limit: 748 / 800 = 0.935 (measured). At 834 the 60 px band and the 113 px bottom bar leave 939 of 1112 px (0.844). At 390 they leave 671 of 844 px (0.795).
- Before at 834 looks higher than after (0.873 against 0.844). That is because the old editor hides its pages behind a drawer toggle and has no bottom bar. It pays for it with a 0.40 layout shift and no page switcher (observed).
- Before shifts once, about 250 ms after navigation. The entry's sources are `DIV.canvas-frame`, `DIV.canvas-loading`, `UL.rail-rows` and the top-bar segments (measured). That is when the bootstrap response sizes the canvas, which matches the baseline record. After has no shift entry at all (measured).
- DOM nodes count only the app document. The cross-origin site frame is not counted. Before rose from 384 to 397 after the walk. I did not trace the 13 extra nodes.
- Load times differ by less than their spread at every size. I claim no load-time difference. The machine also ran the T3 walk during the benchmark. Interleaving the two sides gave both the same noise (inferred).

Selection latency (1280, measured). The method is the baseline's. A `message` listener timestamps the agent's `select`, and the clock starts in the same task as the action. Path A clicks the hidden "Start here" heading and picture buttons, with Escape and 400 ms idle first. Path B sends ArrowDown on the canvas surface from the current selection. The first sample of each path in each run is dropped as warm-up.

| Path | Measure | Before: median (range) | After: median (range) | Samples per side |
|---|---|---|---|---|
| A | `select` message | 8.0 ms (4.9 to 14.8) | 7.0 ms (3.4 to 13.5) | 75 |
| A | caption visible | 9.5 ms (6.2 to 27.4) | 8.0 ms (4.1 to 24.0) | 75 |
| A | visible + 2 frames | 31.0 ms (29.3 to 48.0) | 30.6 ms (26.7 to 46.7) | 75 |
| B | `select` message | 10.3 ms (8.8 to 14.2) | 9.5 ms (7.5 to 12.4) | 35 |
| B | caption visible | 11.2 ms (9.5 to 22.8) | 10.6 ms (8.5 to 14.1) | 35 |

Verdict: no measurable difference. Every gap is about 1 ms, inside a range of about 10 ms. The work happened in every sample, because the `select` kind matched the path (heading or image for A, heading for B) and no sample timed out (measured). No profile was taken, so the limiter is not named. "+2 frames" is bounded by the 16.7 ms frame. These numbers come from headless Chromium on one machine and are lower than the T3 baseline's 13 ms. Compare only within this table. A click inside the cross-origin frame cannot be timed from the parent, as before.

Heap was not measured. `performance.memory` is bucketed and could not tell the builds apart in the earlier record.

## 3. Zero drift (AFTER)

Method: `/tmp/eval/blog/drift.js` logs the rect of every island, the bottom bar and each of their buttons at rest. It skips the caption's own actions. It then compares after each step. All values are measured.

| Width | Steps | Rects | Result |
|---|---|---|---|
| 1280 | Tasks 1 to 8, plus selected, editing and every panel along the way | 17 | **0 px** in every step |
| 834 | Tasks 1 to 8, plus selected, editing and every panel | 18 | **0 px** in every step. Bottom bar y 999, height 113 throughout |
| 390 | Home: select heading, edit, type, Enter, Escape | 15 | **0 px**. Bar 113 throughout (earlier session) |
| 390 | Article: select heading, open Style | 15 | **0 px**. Bar y 731, height 113 |

The old editor was not drift-logged. Two moves were seen in its screenshots (observed). The rail jumps when "Start here" collapses on the first selection: the Pages header moved from y 229 to 89, then to 80. The center group of the top bar slides when the status text changes length: Undo sat near x 428 at rest, x 419 with "1 change not published" and x 381 with "Visitors see version 1".

## 4. The last fix round (`b7890dd`), claim by claim

| Claim | Verdict | Evidence |
|---|---|---|
| Drift is 0 at 834 and 390 | **Holds** | Section 3: 0 px on 18 rects through all eight tasks at 834, and 0 px at 390 while selecting, typing, deselecting and with a panel open (measured) |
| Layout shift is 0 at 1280, 834 and 390 | **Holds** | 0 on 5 headless cold loads at each size and on 3 T3 cold loads each at 1280, 834 and 390. No layout-shift entry was recorded (measured) |
| The bottom bar stays at 113 px | **Holds** | 113 px at rest, selected, editing, with the Image panel, the Link popover and the publish popover at 834, and with the Style panel at 390 (measured) |
| Panels stay inside the canvas and never cover the islands, the caption or the selection | **Holds for the selection panels, fails for the publish popover** | Image panel at 834: x 464 to 784, y 68 to 991, inside the canvas (60 to 999) and clear of the photo (x 68 to 454). Link popover at 834: y 466 to 891, below the caption (420 to 458). Style panel at 390: y 313 to 723, inside the canvas (60 to 731). Style panel at 1280 x 640: x 8 to 328, y 67 to 632, below the islands. All measured. But the publish popover at 1280 runs from x 890 to 1270 and y 51 to 672. It covers the selected heading and the right half of its caption (x 751 to 1221, y 406 to 446). `elementFromPoint` on the caption returns the popover (measured, `final/screens/editor-publish-history-1280.png`) |
| Focus lands on the current version row after a rollback | **Holds** | `document.activeElement` was `li.release.is-live` ("Version 1 Published") at 1280 and "Version 2 Published" at 834 (measured). The old editor dropped focus to `BODY` (measured) |
| The switcher shows "Site / Page" | **Fails on a blog** | Home at 1280 reads "Furnace … / Home". The site name span is 68 px wide. At 1024 it reads "Fu… / Home". On an article page, the site name span is 0 px wide at 1280 (scroll width 118) and at 834 (scroll width 183). The switcher then reads "/ Tuesday is roa…" with a dangling slash. At 390 only "Tuesday is…" shows. All measured. The full name exists only in the button's accessible name and the switcher popover's header |
| The editing caption keeps an 8 px gap | **Holds** | 1280: the caption sits above the heading with an 8 px gap (measured from snapshot boxes). 834: the caption bottom is 266 px and its top is 274 px, so the gap is 8 px. The heading bottom is 60 + 317 × 0.65 (measured) |
| The canvas's spoken name is the page label | **Holds** | "Your page: Tuesday is roast day, editing. Use the arrow keys…" and "Your page: Home, editing. …" (measured). No site suffix |

## 5. New problems, ranked by impact on an owner

1. **The site name disappears on article pages.** On a blog, most pages are articles. There the switcher shows "/ Tuesday is roa…" at 1280 and 834, with no site name. On Home it shows "Furnace …" at 1280 and "Fu…" at 1024 (measured). An owner with two blogs cannot tell which one is open. This is the fix-round claim that fails.
2. **The selection caption hides the first line of the excerpt.** With the heading selected, the caption covers the excerpt's first line at 1280, 1024 and 834. While editing at 834 it does the same. The caption runs from y 274 to 312, and the excerpt starts at 276 (measured, `final/screens/editor-heading-selected-1024.png`, `editor-editing-834.png`). The owner loses sight of the text right under the heading they are changing.
3. **The publish popover covers the selection and its caption.** At 1280 the selected heading and the caption's Style, Background and More buttons sit under the popover (measured). The owner must close the review to keep editing.
4. **A replaced photo keeps the old description.** Both apps published `alt="Coffee cherries ripening on a branch…"` on a photo of a hand holding cherries (measured). This is not new, but a real blog will hit it on every photo swap. Screen readers and search engines get the wrong text.
5. **The publish button loses the count after a reload.** After the rollback and a reload, the draft still held "…version two" while visitors saw version 1. The button read "Publish" with no count, and the pill read "Visitors see version 1" (observed at 1024). The popover did say "Your editor has newer changes than version 1" (measured at 834). This was in the earlier record and is still open.
6. **The website name changes nothing visitors see, and the review never lists it.** This is the same in both apps (measured). An owner who renames the site and publishes will expect a visible change (inferred).
7. **Restoring takes one more step, and "Restore" means something else.** It takes 4 actions against 3. "Restore" opens a version in the editor, while "Publish again" is the real rollback (observed).
8. **Keyboard heading edit is 6 actions against the old editor's 4** (measured by count, unchanged since the earlier record).
9. **The link caption no longer says where the link goes.** The old toolbar showed "Link · Ten bags from Finca… page". The new caption shows "Link", and the destination shows only in the popover (observed).
10. **The loading text stays in the accessibility tree.** "Opening your page…" sits in `.canvas-loading`, which has opacity 0 and no `aria-hidden` after the page loads (measured). A screen reader can still reach it (inferred).
11. **Small layout issues at 390 and 834.** The bottom bar has two buttons named "More", one for the tools and one for the selection. The "Phone view…" hint covers page content at 390. The Style panel at 390 shows "Reset text style" over the size row, so the size steppers are not visible without scrolling (observed).

Improvements a real owner will notice (measured unless marked): the canvas gets 0.93 of the screen at 1280 instead of 0.68. Loads have no layout shift. The editor works on a phone. Panels open next to the thing being edited, not in a rail 600 px away. Page labels stay clean after a rename. The announcement names the new heading text. Focus stays in the history after a rollback.

## 6. Screenshots

- **AFTER**, in `../final/screens/`, Furnace Hill versions under the existing names:
  - At 1280: `editor-resting`, `editor-heading-selected`, `editor-editing`, `editor-page-switcher`, `editor-images`, `editor-settings`, `editor-publish-review`, `editor-publish-history`, `editor-palette`, `editor-focus`, `editor-link-popover` and `editor-phone-preview`.
  - At 1024 and 834: `editor-resting` and `editor-heading-selected`.
  - At 834 also: `editor-editing`, `editor-page-switcher`, `editor-images`, `editor-settings`, `editor-publish-history`, `editor-palette` and `editor-focus`.
  - At 390: `editor-resting` and `editor-heading-selected`.
  - New: `editor-article-1280`, `editor-article-390` and `editor-image-replaced-1280`.
  - Also Furnace Hill: `dashboard-sites-1280`, `dashboard-sites-390`, `import-success-1280` and `import-success-390`.
  - `editor-landwind-heading-selected-1280` was left as it was. The landing page shots were retaken separately and not touched.
- **BEFORE**, in `../baseline/blog-screens/`:
  - At 1280: `editor-resting`, `editor-heading-selected`, `editor-editing`, `editor-image-selected`, `editor-image-replaced`, `editor-images` (rail Images list), `editor-link-popover` (rail link panel), `editor-page-switcher`, `editor-settings` (modal), `editor-publish-review`, `editor-publish-history`, `editor-phone-view` and `editor-article`.
  - At 1024: `editor-resting` and `editor-heading-selected`.
  - At 834: `editor-resting`, `editor-heading-selected`, `editor-editing` and `editor-page-switcher` (the drawer, with the toolbar docked over it).
  - At 390: `editor-resting` (the Manage view).
  - Also `dashboard-sites-1280` and `import-success-1280`.
  - The old editor has no palette, no focus mode and no editor at 390, so those shots do not exist.

## 7. Limits

- No participants. One walkthrough per task and width.
- Keyboard walks covered tasks 1 and 7 at 1280 only. At 834 every task was walked by pointer.
- The headless benchmark is not the T3 browser, so its absolute times are not comparable with the baseline's. Only the before and after columns in this record compare with each other.
- The old editor's drift was not logged with the script. Its moves above come from screenshots.
- Scripts and raw data: `/tmp/eval/blog/bench.mjs`, `bench.jsonl`, `m.js`, `drift.js` and `notes.md`. They live outside the repository.
