# Studio evaluation: Phases G and H

This is the "after" record for the Studio redesign. It repeats the methods in `../baseline/README.md` on `main` at commit `0c6a3aa`, against the dev server at `http://127.0.0.1:5150`, on 2026-10-20. The ranked problems are in `five-worst.md`. Screenshots are in `../final/screens/`.

No participants took part. Every task result below is an expert walkthrough by one agent in an automated browser. Discoverability notes are judgments and hypotheses, not user data.

Labels. **Measured** means a script or tool produced the number. **Observed** means I saw it happen in the browser. **Read** means I found it in the code. **Inferred** means a conclusion drawn from the other three.

Test data. A fresh account (`studio-eval-h1@example.com`) imported `startbootstrap-agency.zip` (1 page), `northwind-studio.zip` (2 pages, Home and The studio) and `landwind.zip` (1 page, the light site). `vite-source-only.zip` from `fixtures/zips` was the refused source-only import.

## 1. The eight tasks

Counting rule from the baseline: each click, each typed string, each key chord and each file choice is one action. Closing a surface after the change is done is listed separately. Runs were on Agency at 1280 x 800 unless the row says otherwise. Task 4 used Northwind. Task 5 used Northwind with the pointer and Agency with the keyboard.

| # | Task | Baseline (pointer) | Now (pointer) | Now (keyboard) | Discoverable without the palette | Did it land | Errors, dead ends, friction |
|---|---|---|---|---|---|---|---|
| 1 | Edit the homepage heading | 4 | **4**: click heading, click again, type, Enter (observed) | 8 by the baseline's convention: Enter on the page switcher, Shift+Tab three times to "Change the main heading", Enter, Enter, type, Enter. Baseline 4 (observed) | Yes. A second click on the selection starts editing (decision 5). Edit text is also the caption's first action (observed) | Yes. The draft kept it across a reload. The published site served "Hello from the evaluator" after task 7 (measured with curl) | The caption stays put while typing (decision 3). When the heading wrapped to two lines the caption covered the start of the second line (observed, `editor-editing-1280.png`). The caption reads "Saved" while the typed text is not yet saved (observed). The screen-reader announcer still named the old text after the save (observed) |
| 2 | Replace the hero image | 3 | **3**: click the banner, Change background photo, choose file (observed). Via the heading, Change banner photo is also 3 | Not walked | Yes. The banner caption offers "Change background photo" and the heading caption offers "Change banner photo" (observed). The banner photo is now in the Images list, which fixes a baseline gap (observed) | Yes. The published file `images/uploads/6597171bbefff132.jpg` has the same SHA-256 as the uploaded file (measured) | A light photo made the white heading unreadable, and nothing warned (observed, same as baseline). The two captions name the same action two ways. A tooltip stayed on screen after the click (observed) |
| 3 | Change a button's destination | 4 | **6, and the pointer path dead-ends**: click button, Link, scroll inside the popover, choose Contact Us, then Tab, Tab, Enter because Save link is off screen (observed) | 7: as pointer, with Tab, Tab, Enter to save | Partly. Link is a labelled caption action (observed). The caption no longer shows the destination in words, which the baseline did. It is only in the tooltip "Link: Services section" (observed) | Yes. The published button has `href="#contact"` (measured) | **Dead end.** The Link popover opened at y 725 of 800 with `max-height: 120px`. Save link sat at y 803 to 833, below the viewport even after scrolling the popover to its end (measured). Focus moved to off-screen fields (WCAG 2.4.11). At 834 the same popover is a sheet and works (measured) |
| 4 | Switch page (Northwind) | 2 via capsule | **2**: page switcher, The studio (observed) | 3: Ctrl+K, type "studio", Enter (observed). Same as baseline | Yes. The switcher is a labelled button with search (observed). At 1280 it truncates to "Northwind… / H…" and after renaming to "Northwi… / The …" (observed) | Yes. The canvas loaded `about.html` and the switcher read "The studio" (observed) | After the palette closed, focus fell to the page body (observed) |
| 5 | Change website settings (rename) | 3 (+1 close) | **3** (+1 close): Settings, type the name, Save (observed) | 7: F6, Tab three times, Enter, type, Enter (observed). Baseline 4 | Yes. "Settings" is a labelled island button (observed) | Yes. Toast "Website settings saved". The switcher showed the new name (observed) | The web address pattern now compiles under the `v` flag and rejects bad input, which fixes a baseline error (measured). Settings changes are still not undoable (observed). "Keyboard shortcuts" sits under the General heading as if it were a setting (observed) |
| 6 | Preview the mobile version | 1 | **1**: Phone screen (observed) | Not walked | Yes. Icon with a tooltip and the name "Phone screen" (observed) | Yes. Phone frame at 81 %, hint "Phone view. Changes made here also apply on computers." (observed) | The selection survives the switch, which fixes a baseline defect (observed) |
| 7 | Publish a change | 2 | **2**: Publish, Publish (observed) | 5: F6, F6, Tab, Enter, Enter (observed). Baseline 2 with Ctrl+Shift+P, which no longer exists (read in `main.ts`) | Yes. One ultramarine button that counts changes, "Publish · 3" (observed) | Yes. Versions 1, 2 and 3 went live. curl of the live host returned each new heading (measured) | After a reload the change count disappears from Publish until the next edit (observed). The review does not list changes on a first publish (observed) |
| 8 | Restore a previous version | 3 (+1 close) | **4**: Publish, Version history, Publish again, Publish version 1 (observed) | Not walked | Partly. History now lives in the publish surface (decision 15). Each version offers "Restore" and "Publish again". "Restore" only opens the version in the editor. "Publish again" is the rollback (observed). The confirm text explains the difference (observed) | Yes. The live host served version 1 again (measured) | After the rollback the pill still read "Published at 12:00 PM" and the canvas still showed the newer draft. A reload showed "Visitors see version 1" (observed) |

Repeats at 834 x 1112 (fine pointer in the T3 preview, touch layout because width is under 900 px):

| # | Task | Now (834) | Did it land | Notes |
|---|---|---|---|---|
| 1 | Edit the heading | 4: click, click again, type, Enter (observed) | Yes, "Undo: text change" (observed) | The caption's actions move into the bottom bar's second row. Only "Heading · Saved" stays by the selection (observed) |
| 2 | Replace the hero image | 3: heading, Change banner photo in the bottom bar, choose file (observed) | Yes, toast "Banner photo changed" (observed) | The toast says "Banner photo" and Undo says "background photo change" (observed) |
| 4 | Switch page (Northwind) | 2: page switcher sheet, The studio (observed). The baseline needed the drawer at this width | Yes, `about.html` loaded (observed) | **Drift.** The left island grew from 276 to 320 px and Images and Settings moved 44 px right (measured) |
| 6 | Preview mobile | 1: Phone screen (observed) | Yes, phone frame at 100 % (observed) | None |

Touch, measured in Chromium 154 headless with touch emulation at 834 x 1112 (`/tmp/eval/cdp.mjs`): `(pointer: coarse)` and `(hover: none)` matched. A real `touchStart`/`touchEnd` tap on the heading selected it. A second tap started text editing. This clears the baseline's open question about `touchend` being cancelled (measured).

Phone, observed at 390 x 844 in the T3 preview: the editor now loads (the baseline showed only a Manage view). The canvas opens on the desktop layout at 30 %. The tools row is 482 px wide in 374 px and hides Zoom and Focus past the right edge. With a heading selected, the action row is 582 px wide in 374 px and hides Background and More. The Back link is `display: none` (measured).

## 2. Measurements, before and after

Method. Same as the baseline. A fresh navigation to the Agency editor, then `scripts/studio/measure.js` run unchanged inside a wrapper that waits for `[data-canvas-frame]` to lose `is-loading`, plus resource timing for `bootstrapEnd` and `iframeDocEnd`. The wrapper also lists each layout-shift entry with its source and the area of canvas that floating chrome covers. Times are milliseconds from navigation start. The baseline numbers are copied from `../baseline/README.md` section 2.

| Viewport | canvasShare before → after | Persistent panels before → after | Layout shift before → after | DCL after | bootstrapEnd after | iframeDocEnd after | DOM nodes before → after |
|---|---|---|---|---|---|---|---|
| 1280 x 800 | 0.677 → **0.935** | `aside.ed-rail` 248 x 744 → none | 0.289 → **0** (5 cold loads, all 0.0000) | 194 (181 to 198, n=5) | 224 (217 to 229) | 386 (364 to 416) | 412 → 375 |
| 1024 x 768 | 0.627 → **0.932** | rail 248 x 712 → none | 0.264 → **0** (n=1) | 200 | 239 | 427 | 412 → 375 |
| 834 x 1112 | 0.873 → **0.842** | none → none | 0.403 → **0** (n=2) | 183, 242 | 213, 309 | 391, 662 | 412 → 375 |
| 390 x 844 | 0 (no canvas) → **0.791** | none → none | 0.258 → **0.0001** (n=1) | 188 | 226 | 436 | 314 → 375 |

All values measured. What explains them:

- At 1280 and 1024 the canvas runs from y 52 to the bottom edge at full width. The islands float inside the 52 px band, so no chrome covers the canvas at rest (measured, 0 px covered). 1280 x 748 / 1280 x 800 = 0.935, so the band is the whole limit. This meets the plan's 85 % target.
- At 834 the share fell by 3 points. The baseline hid its rail in a drawer and kept a 68 px top bar. The new layout keeps a 60 px band and a 116 px bottom bar (measured). At rest the bar's second row is empty, because it holds the caption's actions only when something is selected (observed). The bar sits outside the canvas, so it costs share but covers nothing.
- Layout shift. The baseline's 0.28 came from sizing the frame after the bootstrap response. Commit `6dfc77c` reserves the canvas box in CSS (read). Each load still logs one entry under 0.0001 from a `SPAN` (measured). Like the baseline, the API cannot see shifts inside the cross-origin preview frame.
- Load times. One machine with a load average of 1.26 on 8 cores at the start. The single runs at 1024 and the second run at 834 (DCL 242) differ from the 1280 median by less than the run-to-run spread seen elsewhere. I claim no change in load time.

Selection latency. Method as the baseline. A `message` listener timestamps the agent's `select`, the clock starts in the same task as the action, the toolbar wait polls per frame, and Escape plus 400 ms idle comes before each sample. Paths A and B were interleaved. One warm-up per path was dropped. Frames ran at 60 Hz (measured, 16.5 to 17.3 ms).

| Path | Measure | Before: median (range), n=5 | After: median (range), n=22 |
|---|---|---|---|
| A, Start here | `select` message | 13.2 (10.1 to 15.3) | **13.8 (8.5 to 20.4)** |
| A, Start here | caption visible | 19.3 (10.2 to 23.6) | 20.1 (8.7 to 28.9) |
| A, Start here | visible + 2 frames | 43.1 (31.9 to 47.1) | 48.5 (38.4 to 73.9) |
| B, ArrowDown | `select` message | 13.2 (12.3 to 15.1) | **11.6 (8.8 to 16.9)** |
| B, ArrowDown | caption visible | 15.6 (12.7 to 18.1) | 17.9 (9.0 to 25.7) |

Verdict: no measurable difference (measured). Every after-median sits inside the before-range, and the gaps are smaller than the spread. The work happened in every sample, because the `select` kind matched the path each time (heading and image for A, menu for B). No profile was taken, so the limiter is not named. The visible numbers are quantised to frames. The same limits as the baseline apply. A click inside the cross-origin frame cannot be timed from the parent.

Heap. `performance.memory` returned exactly 9.5 MB on every load at every size, before and after (measured). Without `--enable-precise-memory-info` Chromium buckets and caches that value, so it cannot tell the two builds apart, and the baseline's 9.5 MB says nothing either. A precise reading through CDP `Performance.getMetrics` after a forced GC gave a JS heap of **4.0 MB (3.99 to 4.01, 5 cold loads at 1280)** for the after build (measured, `/tmp/eval/heap.mjs`). There is no precise before number to compare it with.

DOM nodes in the app document: 375 at every size (measured), against 412 at desktop and 314 for the phone Manage view before. The preview frame is not counted, as in the baseline.

## 3. Zero drift

Method. A script logs the bounding rect of the three islands and of every button and link inside them (17 rects) before and after each task, keyed by position. All values measured.

| Width | Tasks | Result |
|---|---|---|
| 1280 | 1, 2, 3, 4, 5, 6, 7, 8 | **0 px** on all 17 rects in every task. Label changes ("Undo: text change", "Publish · 3", the renamed site) did not move anything, because the 1280 islands have fixed widths |
| 834 | 1, 2, 6 | 0 px |
| 834 | 4 (Home to The studio on Northwind) | **Fails.** Left island 276 → 320 px wide. Page button 64 → 108 px. Images x 134 → 178. Settings x 206 → 250 |

Cause (read). Below 900 px `assets/static/css/editor.css` line 397 sets `.ed-top-left { width: auto }`, so the island sizes to the page name. Decision 2 asks for zero drift.

Not checked: tasks 3, 5, 7 and 8 at 834, any task at 1024 or 390, and the caption's own position (decision 3 lets it flip).

## 4. Accessibility, WCAG 2.2 AA

Keyboard walk at 1280 of tasks 1, 4, 5 and 7 (observed unless marked):

- Tab order runs skip link, Back, page switcher, Images, Settings, Undo, Edit, Preview, then the rest of the center island, the pill and Publish. It is logical.
- Focus is visible on every stop I logged. The ring is a 2 px white plus 4 px ultramarine box-shadow, with a transparent 2 px outline kept for forced colours (measured from computed style).
- F6 cycles center island, right island, canvas, left island. Shift+F6 goes back (observed).
- Escape layers worked in the order I tried them. Escape in a text session keeps the text, which is decision 5 ("Undo: text change", observed). The next Escape closed the pages popover, and the one after that deselected. Escape on settings returned focus to its opener (observed).
- Ctrl+K opened the palette outside a text session, and Escape closed it (observed). After a command ran, focus went to the page body instead of a control (observed).
- **Caption focus order does not match visual order (2.4.3).** With a heading selected, Tab into the caption landed on "Background", the fourth item visually. ArrowRight went to More, then wrapped to "Edit text" at the far left (observed). `toolbar.ts` line 365 orders kept buttons with CSS `order`, and focus follows DOM order (read).
- **Focus can land off screen (2.4.11).** In task 3 the Link popover moved focus to fields at y 866 and Save link at y 803 to 833 in an 800 px viewport (measured).
- Keyboard paths got longer. Start here now lives inside the page switcher popover. Ctrl+Shift+P (publish) and Ctrl+Shift+H (history) from the baseline inventory are gone (read, `main.ts` `wireKeys`). Arrow-key selection walks every descendant in document order. From the menu, ArrowDown went to a link, then the logo, then each list item. ArrowLeft then reached "Area selected", and ArrowDown from there dived back into the list (observed).

Target sizes. At 834 with emulated touch (`pointer: coarse` true), all 17 visible controls in the islands, bottom bar and caption measured at least 44 x 44 px with no neighbour closer than 8 px (measured). This meets decision 8 and 2.5.8. In the T3 preview at 834 with a fine pointer, the bottom-bar controls also measured 44 px high (measured). At 1280 with a fine pointer, island buttons are 30 to 34 px high and the Start here buttons 24 px. Both pass 2.5.8's 24 px minimum (measured). The "Version history" link in the publish popover is 22 px high and passes only through the spacing exception (measured).

Contrast. I composited each text colour over the Level 2 tint `rgba(250, 250, 252, 0.8)` and also sampled backdrop pixels from screenshots (`/tmp/eval/contrast.py`). All values measured.

| Text | Over black (worst case) | Over pure blue / red | Sampled, Agency dark hero | Sampled, Landwind light hero |
|---|---|---|---|---|
| ink `#17171c` (caption label "Heading · Saved", 11 px; island labels, 13 px) | 10.69:1 | 11.17 / 12.09:1 | 11.15:1 caption, 14.62:1 band | 16.95:1 |
| ink-2 `#4a4a55` (Focus, Fit, pill, 11 to 13 px) | 5.23:1 | 5.47 / 5.92:1 | 5.46:1 caption, 7.15:1 band | 8.30:1 |
| White on Publish `#3730bd` | 9.05:1 | | | |

All pass 1.4.3 at 4.5:1. The selection ring is 2 px ultramarine with a 1 px white halo outside it. Ultramarine alone against the dark hero measures 1.47:1, but the white halo carries 1.4.11 (measured from pixels). The corner ticks have no halo, and I treat them as decorative. A caveat: the caption label and Fit text are 11 px, which is legal but small.

Reduced motion, reduced transparency, more contrast and forced colours. The T3 preview emulates only `prefers-color-scheme`, so I drove Chromium 154 headless over CDP with `Emulation.setEmulatedMedia` (measured, `/tmp/eval/cdp.mjs`, screenshots `/tmp/eval/media-*-1280.png`):

- `prefers-reduced-motion: reduce`. Islands, caption, pill and Publish go to `transition: opacity 0.12s`. Popovers swap `studio-pop-in` for `studio-fade-in 0.12s`. This meets decision 13.
- `prefers-reduced-transparency: reduce`. Islands, caption and popovers become opaque `rgb(250, 250, 251)` with `backdrop-filter: none`.
- `prefers-contrast: more`. Same opaque surfaces, and island text darkens from ink-2 to ink.
- `forced-colors: active`. Surfaces resolve to system colours and island buttons get system borders. The canvas and caption stay readable (observed in the screenshot). Popovers get a 1 px border. The islands themselves get none, so their edges rely on the button borders.

Names and live regions:

- Every visible button, link and field has an accessible name. The only empty one is the hidden off-screen pill, which is filled at runtime (measured).
- The canvas is `role="application"` with the name "Your page: Home, editing. Use the arrow keys…", and the iframe has a title (measured).
- Toasts use their own `role="status"` region, so save, publish and rollback messages are announced (measured).
- **The selection announcer goes stale (4.1.3).** After a heading edit it still said "Heading selected: It's Nice To Meet You…" while the page showed the new text. It did this at 1280 and at 834, and by keyboard (observed). It is keyed by element id in `main.ts` lines 218 to 229, so finishing a text edit announces nothing (read). Text saves raise no toast either, so a screen-reader user gets no confirmation of the edit (inferred).

## 5. Design review (impeccable critique and audit method)

Scores are my judgment on the editor, Operate mode. Single context. The impeccable detector was not run, because the brief excluded its launcher. By the critique method's own rules that makes this a degraded run with no deterministic scan.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | "Saved" while typing, stale pill after rollback, stale announcer |
| 2 | Match with the real world | 3 | "Restore" vs "Publish again", "banner photo" vs "background photo" |
| 3 | User control and freedom | 3 | Undo everywhere except settings. Escape keeps text |
| 4 | Consistency and standards | 3 | Same action named two ways. Link destination moved into a tooltip |
| 5 | Error prevention | 2 | No warning when a light photo hides white text |
| 6 | Recognition rather than recall | 3 | Labelled routes for Pages, Images, Settings and Publish. Start here hidden in the switcher |
| 7 | Flexibility and efficiency | 2 | Palette added, publish and history shortcuts removed |
| 8 | Aesthetic and minimalist design | 4 | 93.5 % canvas, three quiet islands |
| 9 | Error recovery | 2 | Off-screen Save link in task 3 has no way out by pointer |
| 10 | Help and documentation | 3 | Shortcut sheet, Start here, clear rollback confirm |
| | **Total** | **27/40** | Good, with weak spots in status and efficiency |

Audit health (impeccable audit dimensions): Accessibility 2 (focus order, stale announcer, off-screen focus), Performance 3 (no shift, latency unchanged), Theming 3 (tokens and opaque fallbacks work), Responsive 2 (phone overflow, 834 drift), Implementation integrity 3. Total 13/20, Acceptable.

What works (observed). The canvas went from 68 % to 94 % with no layout shift. Every global control stayed put through all eight tasks at 1280. Decision 5 editing works with mouse, touch and keyboard. Phones can now edit. Seven of the baseline's owed fixes landed: layout shift, slug pattern, selection kept on phone view, banner photo in Images, tap-to-select, the page switcher at 834, and Escape keeping text. One owed fix did not land: a banner's caption still docks over the site's own logo and nav (observed, task 2).

## 6. Method limits

- No participants. Every count and discoverability call is one evaluator's walkthrough. Treat each as a hypothesis.
- One machine, local server, automated Chromium. The T3 preview could not emulate a coarse pointer or media features, so those checks ran in a separate headless Chromium 154 over CDP. Headless layout can differ slightly (a canvas scrollbar showed there and not in the preview).
- Load timings are single runs except 1280 (5 loads). Selection latency excludes pointer dispatch and the agent's hit test, as in the baseline.
- Heap before and after cannot be compared. `performance.memory` is bucketed. Only an after-only precise number exists.
- Drift was logged at 1280 for all eight tasks and at 834 for four. It was not logged at 1024 or 390.
- Keyboard walks covered tasks 1, 4, 5 and 7 at 1280 only. No screen reader was run. Live-region findings come from reading the region's text after each step.
- The console log in the preview was truncated, so console errors after import were not audited.
- The site name was changed during task 5. Later screenshots show "Northwind Evaluated" and "Agency by keyboard".
