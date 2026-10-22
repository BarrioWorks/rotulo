# Studio baseline: the editor before the redesign

This is the Phase A record for the Studio redesign (`../brief.md`, `../PLAN.md`). It describes the "Proof" editor as it ran on 2026-10-20 against the dev server at `http://127.0.0.1:5150`, with no code changed. Every number below was measured in the T3 preview browser (Chromium, automation, one machine, local server). Nothing here comes from real participants. Task findings are expert-review observations and hypotheses, as brief section 15 asks.

Test data. A fresh account (`studio-baseline-d@example.com`) imported `fixtures/zips/startbootstrap-agency.zip` (1 page, 18 pictures) and `fixtures/zips/northwind-studio.zip`. Northwind imported as **2 pages** (Home, The studio), not the 4 the plan expected. Task 4 uses those 2 pages.

## 1. Screenshots

All files are in `screens/`. The sizes are CSS viewports. PNGs at 1024 and 834 are captured at a device scale above 1, so their pixel size is larger than the viewport.

| Screen | 1280 x 800 | 1024 x 768 | 834 x 1112 | 390 x 844 |
|---|---|---|---|---|
| Editor, Agency home | `editor-home-1280.png` | `editor-home-1024.png` | `editor-home-834.png` | `editor-manage-view-390.png` (no editor, Manage view) |
| Selected heading | `editor-heading-selected-1280.png` | `editor-heading-selected-1024.png` | `editor-heading-selected-834.png` | not available |
| Heading in text editing | `editor-heading-editing-1280.png` | | | |
| Selected image | `editor-image-selected-1280.png` | `editor-image-selected-1024.png` | `editor-image-selected-834-toolbar-over-drawer.png` | not available |
| Image panel (description) | `editor-image-panel-1280.png` | | | |
| Link panel (button) | `editor-link-panel-1280.png` | | | |
| Banner photo replaced | `editor-banner-photo-replaced-1280.png` | | | |
| Pages and settings drawer | (rail is permanent) | (rail is permanent) | `editor-drawer-834.png` | |
| Website menu | `editor-site-menu-1280.png` | | | |
| Settings | `editor-settings-1280.png` | `editor-settings-1024.png` | `editor-settings-834.png` | `editor-settings-390.png` |
| Version history | `editor-version-history-1280.png` | `editor-version-history-1024.png` | `editor-version-history-834.png` | inside `editor-manage-view-390.png` |
| Images list | `editor-images-list-1280.png` | `editor-images-list-1024.png` | `editor-images-list-834.png` | not available |
| Publish review | `editor-publish-review-1280.png` (first publish) | `editor-publish-review-older-1024.png` (visitors see an older version) | `editor-publish-review-834.png` | inside `editor-manage-view-390.png` |
| Published | `editor-published-1280.png` | | | |
| Roll back confirm | `editor-rollback-confirm-1280.png` | | | |
| Page switcher (Northwind) | `editor-page-switcher-northwind-1280.png` | | | |
| Phone preview in editor | `editor-phone-view-1280.png` | | | |
| Dashboard | `dashboard-1280.png`, `dashboard-empty-1280.png` | `dashboard-1024.png` | `dashboard-834.png` | `dashboard-390.png` |
| Import | `import-1280.png`, `import-done-1280.png` | `import-1024.png` | `import-834.png` | `import-390.png` |
| Sign-in | `signin-1280.png` | `signin-1024.png` | `signin-834.png` | `signin-390.png` |

## 2. Load, layout and memory (`scripts/studio/measure.js`)

Method. A fresh navigation to the Agency editor, then `measure.js` pasted into `preview_evaluate`, wrapped so it first waits until `[data-canvas-frame]` loses `is-loading`. Two extra fields come from resource timing: `bootstrapEnd` (the `GET /api/projects/{pid}/editor` response end) and `iframeDocEnd` (the preview document response end). Times are milliseconds from navigation start.

| Viewport | canvasShare | Canvas box (x, y, w, h) | Persistent panels | DCL | load | bootstrapEnd | iframeDocEnd | Layout shift | Heap MB | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1280 x 800 | **0.677** | 260, 68, 1008, 688 | `aside.ed-rail` 248 x 744 | 183 | 188 | 212 | 363 | 0.289 | 9.5 | 412 |
| 1280 x 800 (first run) | 0.677 | same | same | 186 | 186 | 213 | 567 | 0.286 | 9.5 | 399 |
| 1024 x 768 | 0.627 | 260, 68, 752, 656 | `aside.ed-rail` 248 x 712 | 189 | 189 | 219 | 562 | 0.264 | 9.5 | 412 |
| 834 x 1112 | 0.873 | 12, 68, 810, 1000 | none (rail is a drawer below 900 px) | 190 | 190 | 219 | 393 | 0.403 | 9.5 | 412 |
| 390 x 844 | 0 | no canvas | none | 189 | 189 | n/a | n/a | 0.258 | 9.5 | 314 |

What limits these numbers:

- canvasShare at 1280 is bounded by the 248 px rail, the 56 px top bar, the 12 px gutters around the canvas, and the 32 px footer strip that holds the zoom chip. The desktop site lays out at 1280 px and is scaled to 79 % to fit 1008 px.
- At 1024 the canvas shrinks to 59 % scale ("Fit 59 %" turns into a warning dot), because the rail still takes 248 px.
- At 834 the share looks high because the rail is hidden behind a toggle. The page switcher capsule also disappears at this width (section 4, task 4).
- At 390 the editor does not load the canvas at all. It shows the Manage view: publish, version history and settings, with "To change text and pictures, open Rótulo on a computer."
- Layout shift is high on every size (0.26 to 0.40, where 0.1 is the usual "good" line). The observer names the source: one shift of 0.283 at about 230 ms, with `DIV.canvas-frame`, `DIV.canvas-loading`, `UL.rail-rows` and `BUTTON.ed-status` as sources. That is the moment the bootstrap response lands and `canvas.ts` `applyLayout()` sizes the frame, while the rail fills in its rows. The rail also shifts again when "Start here" collapses on first selection (observed, not scored).
- Heap (9.5 MB) and DOM node counts (about 400) cover the app document only. The cross-origin preview iframe is not counted by `performance.memory` or `getElementsByTagName`.

## 3. Selection latency

Method. A script in the parent page installs a `message` listener that timestamps the agent's `select` message (`frontend/protocol.ts`, `agentMessages.select`) with `performance.now()`. It takes a timestamp immediately before a real UI action that starts a selection, in the same task, so no tool round trip sits between them. It then polls each animation frame until `[data-toolbar]` is visible with the expected label, and waits two more frames for a paint.

- Path A uses the **Start here** buttons ("Change the main heading" and "Replace a picture"), which call `canvas.send({type: "select_element"})`. Samples alternate between the heading and the first picture, with Escape and 400 ms of idle before each.
- Path B dispatches an `ArrowDown` keydown on the canvas surface (`[data-canvas-frame]`), which sends `select_relative`.

Six samples each; the first is a warm-up and is dropped. Values are milliseconds after the action.

| Path | Measure | Samples 2 to 6 | Median | Range |
|---|---|---|---|---|
| A, Start here | `select` message received | 15.3, 13.6, 13.2, 12.1, 10.1 | **13.2** | 10.1 to 15.3 |
| A, Start here | toolbar visible | 23.6, 20.3, 13.4, 19.3, 10.2 | 19.3 | 10.2 to 23.6 |
| A, Start here | toolbar visible + 2 frames | 43.1, 47.1, 32.3, 45.8, 31.9 | 43.1 | 31.9 to 47.1 |
| B, ArrowDown | `select` message received | 13.2, 14.2, 15.1, 12.6, 12.3 | 13.2 | 12.3 to 15.1 |
| B, ArrowDown | toolbar changed | 15.6, 17.8, 15.3, 12.7, 18.1 | 15.6 | 12.7 to 18.1 |

Limits of the method:

- It does not include pointer dispatch or the agent's hit test (`pickAt`, `elementsFromPoint`), because a click inside a cross-origin iframe cannot be timestamped from the parent. Both paths still run the agent's `select()`, which builds `info`, `ancestors` and `obstacleRects` and is the shared cost of a click.
- The message wait polls with `setTimeout(0)` (about 4 ms granularity once nested) and the toolbar wait polls per frame (16.7 ms at 60 Hz). The "toolbar" numbers are frame-quantised.
- "+2 frames" adds about 33 ms of frame waiting by design. It is an upper bound for "visible on screen", not a paint timestamp.
- No profile was taken, so the limiter is not named. The likely costs are the agent's style reads in `select()` and the toolbar's measure-then-fit pass in `toolbar.ts` `fitSelectionRow()`, which renders the row twice and reads layout. Treat that as a guess until a trace confirms it.
- One machine, automation Chromium, local server, a 1-page template. A heavier site or a slower device will be slower.

## 4. The eight tasks (brief section 15)

Counting rule: each click, each typed string, each key chord and each file choice counts as one deliberate action. Closing a dialog after the change is done is listed separately. All runs were on Agency at 1280 x 800 unless the row says otherwise.

| # | Task | Actions (pointer) | Path taken | Keyboard path | Discoverable without instructions | Context switches | Failures and friction seen | Feedback shown |
|---|---|---|---|---|---|---|---|---|
| 1 | Find and edit the homepage heading | **4** | Click heading, **Edit text**, type, Enter | Start here "Change the main heading" (or arrows), Enter, type, Enter: 4 | Yes. "Start here" says "Click any text or picture", and the toolbar labels **Edit text** with an Enter hint | None | Double-click does not start editing (`dblclick` is swallowed by the agent). The text toolbar sits between the heading and the site's button. After saving, the screen-reader announcement still named the old heading text | Undo tooltip becomes "Undo: Text change". The status pill stays "Saved · Not published yet", so there is no visible saving moment for a fast save (`SAVING_DELAY_MS` 400) |
| 2 | Replace the hero image | **3** | Click the hero background, **Change background photo**, choose file | Arrows to the banner, Tab to the toolbar, Enter, file dialog | Partly. The hero is a CSS background, so it is not in the **Images** list (18 pictures listed, the hero not among them). The words are "Banner" and "background photo", not "image". Clicking the heading also offers **Change banner photo** | OS file dialog | No fit choice for background photos (only `<img>` replacements get Fill or Show whole). The new light photo made the white heading hard to read, and nothing warns about it | Toast "Background photo changed" with Undo. Canvas updates in place |
| 3 | Change a button's destination | **4** (5 for a web address) | Click button, **Link**, pick "Contact Us" in **Part of this page**, **Save link** | Arrows, Tab, Enter, form fields | Yes. The toolbar shows "Link · Services section" | Panel opens in the left rail, about 600 px from the button | The pointer travels across the canvas to the rail and back. The rail panel replaces the page list | Toast "Link saved". The toolbar detail changes to "Contact Us section" |
| 4 | Switch to another page (Northwind) | **1** via rail row, **2** via the "Site / Page" capsule | Capsule, **The studio** | `Ctrl+K`, arrow, Enter: 3 | Yes at 1280 and 1024. At 834 the page capsule is hidden; pages are only in the drawer (2 actions) | None | No search, no thumbnails. At 1280 the capsule truncates to "Northwind ... / H..." | Page name in the capsule and `aria-current` in the rail update. Canvas shows a loading veil after 300 ms |
| 5 | Change website settings (rename the site) | **3** (+1 to close) | **Website settings** row, type the name, **Save** | Tab to the rail row, Enter, type, Enter | Yes (rail row, Website menu, Start here "Change your web address") | Modal dialog over the canvas | Settings changes are not undoable and are not listed as unpublished changes. Console error: `pattern="[a-z0-9-]{3,32}"` on the slug field is invalid under the `v` flag, so the browser skips that validation | Toast "Website settings saved". The capsule shows the new name |
| 6 | Preview the mobile version | **1** | **Phone screen** toggle | Tab to the toggle, Enter | Yes, icon with tooltip "Phone screen" | None | The selection disappears visually while the announcement still names it. The desktop scroll offset is carried into the phone layout, so it opens mid-page. Edit and Preview are a separate toggle (+1 to use links) | Canvas shows a phone frame and the hint "Phone view. Changes made here also apply on computers." |
| 7 | Publish a change | **2** | **Publish**, then **Publish** in the review popover | `Ctrl+Shift+P`, Enter: 2 | Yes, one black primary button | Popover | None | Toast "Published. Visitors now see version 1." with **View website**. Pill turns "Saved · Published". **View website** button appears. Publish becomes disabled |
| 8 | Restore a previous version | **3** (+1 to close) | **Version history**, **Publish again** on version 1, confirm **Publish version 1** | `Ctrl+Shift+H`, Tab, Enter, Enter | Partly. "Publish again" is the rollback; nothing is labelled "Restore" or "Roll back". The other option, **Open in editor**, restores the draft instead | Side sheet plus a confirm dialog | Versions show only a number and a time, with no summary of what changed. After rollback the canvas still shows the newer draft while the pill says "Visitors see version 1" | Toast "Visitors now see version 1." Pill "Saved · Visitors see version 1". **Published** tag moves to version 1 |

Touch and tablet (all tasks). Hypotheses from code, not tested on a device:

- `frontend/agent/agent.ts` cancels `touchstart` and `touchend` in edit mode (`preventDefault` when cancelable). By the Touch Events spec, cancelling `touchend` suppresses the click a tap would produce, and selection runs on `click`. Tap-to-select may fail on real touch screens. The emulator used here sends mouse events, so this was not reproduced.
- Below 600 px the editor never loads (Manage view). Tasks 1 to 4 and 6 cannot be done on a phone.
- Under `(pointer: coarse)` the CSS raises controls to 44 px (`app.css`, `editor.css` line 359). With a fine pointer the toolbar buttons measured 30 px tall.
- At 834 x 1112 the selection toolbar docks over the open drawer (`editor-image-selected-834-toolbar-over-drawer.png`), and the selected image sits half under the drawer.
- Nothing depends on hover except tooltips, which carry shortcut hints only.

Other observed problems (expert review):

- When the selection is near the top of the canvas, the toolbar docks in a full-width strip that covers the site's own navigation (`editor-heading-selected-1024.png`, `editor-version-history-1280.png`).
- Tooltips can stay on screen after the pointer has moved on (`/index.html` tip over **Website settings** in `editor-heading-selected-1024.png`).
- Escape order mixes concerns: with a panel open it closes the panel and keeps the selection; with a dialog open it closes the dialog.
- `Ctrl+K` opens the page switcher today (`main.ts`). Inside an inline text session the iframe has focus and `agent.ts` has no handler for it, so `Ctrl+K` falls through to the browser default (in Chromium on Linux and Windows, the address bar search) instead of inserting a link. There is no link shortcut in text editing. This is read from code, not exercised.

## 5. Feature inventory: every editor function and where it lives

This is the checklist the redesign must keep. "Rail" means `aside.ed-rail` in `assets/views/projects/editor.html`. "Toolbar" means the floating selection toolbar `[data-toolbar]` built by `frontend/editor/toolbar.ts`. Test names are quoted from `frontend/tests/*.mjs` and `tests/requests/*.rs`. Behaviour with no test is marked "none".

### 5.1 Navigation and pages

| Function | Where it lives today | Code | Guarding tests |
|---|---|---|---|
| Back to your websites | Top bar chevron | `editor.html` | none |
| Current site name, website menu | Top bar "Site" crumb `[data-site-menu]` | `topbar.ts` | none |
| Current page name, page switcher menu (list, check mark, path, Add page) | Top bar "Page" crumb `[data-page-switcher]`, hidden below 900 px | `topbar.ts` `openPages` | none |
| Page switcher shortcut | `Ctrl/Cmd+K` | `main.ts` `wireKeys` | none |
| Page list with current page, home icon | Rail **Pages** | `rail.ts` `renderPages`, `pages.ts` `pageLabel` | editor.test "page labels drop the website name" |
| Add page (copy of a chosen page, name, address preview) | Rail **+** button, page menu **Duplicate**, switcher **Add page...**, page dialog | `rail.ts` `pageDialog`, `api.addPage` | editor.test "page names become web-safe file names"; editing.rs `pages_can_be_added_renamed_and_deleted_but_the_home_page_is_protected`, `page_names_cannot_collide_under_unicode_lowercase` |
| Rename page (links updated) | Rail page **...** menu | `rail.ts`, `api.renamePage` | editing.rs same as above |
| Delete page (confirm, undoable) | Rail page **...** menu | `rail.ts` `deletePage` | editing.rs same as above |
| Page settings: title and description | Rail page **...** menu **Page settings**, rail panel `page` | `panels.ts` `pagePanel`, edit `set_page_meta` | document.rs `page_title_and_description_can_be_set` |
| "Visitors can't reach this page yet" note after adding | Rail note | `rail.ts` `showNewPageNote` | none |
| In-site links open other draft pages | Preview mode only | `agent.ts` `previewNavigation`, `canvas-policy.ts` `canvasNavigation` | canvas-policy.test "preview navigation resolves only known pages on the preview origin"; editor.test "preview paths map to draft pages" |
| Pages and settings drawer | Top bar toggle `[data-rail-toggle]`, below 900 px | `rail.ts` `setDrawer` | none |
| Manage view (publish, history, settings, address copy) | Whole screen below 600 px | `main.ts` `narrow`, `publish.ts` `review(..., "manage")` | none |

### 5.2 Canvas, modes and view

| Function | Where | Code | Tests |
|---|---|---|---|
| Edit / Preview mode | Top bar segmented control | `topbar.ts`, `agent.ts` `setMode` | canvas-policy.test "finishing an authorized session can save once while switching mode" |
| Computer / Phone screen | Top bar icon toggle | `canvas.ts` `frameLayout` | editor.test "the site lays out at 1280 px on a computer and is scaled to fit", "the phone is always 390 by 844 and shrinks as a whole when it does not fit" |
| Zoom: Fit n % / actual size | Canvas footer chip `[data-zoom]` | `canvas.ts` `applyLayout` | same as above |
| Loading veil, slow-load text, "can't be edited" fallback | Canvas | `canvas.ts` `navigate`, `watchLoads` | none |
| Preview hint line | Canvas footer `[data-canvas-hint]` | `canvas.ts` | none |
| Site scripts stilled in edit mode (clicks, submits, drag, context menu) | Agent | `agent.ts` capture listeners | document.rs `the_preview_marks_what_can_be_edited_and_loads_the_agent_first`; preview.rs `preview_hosts_isolate_drafts_and_only_serve_read_only_content_with_security_headers` |
| Reload after the preview origin expires | Canvas | `canvas.ts` `PREVIEW_MAX_AGE_MS` | editor.test "reloading the editor's state keeps the page on screen on the origin it was opened from" |
| Interface font sent into the site for the label chip | Agent | `canvas.ts` `loadUiFont`, `protocol.ts` `font` | protocol.test "the canvas scale and the interface font are bounded" |

### 5.3 Selection

| Function | Where | Code | Tests |
|---|---|---|---|
| Hover highlight | Agent overlay | `agent.ts` `pointerover` | overlay-theme.test "the agent's overlay colours match the app's tokens" |
| Click to select, links and images win over text, look through decorative layers | Agent | `agent.ts` `pick`, `pickAt` | protocol.test "the editor accepts a well-formed selection from the agent", "selection kind, name and ancestors are validated" |
| Selection outline, corner marks, kind label chip at constant size | Agent overlay | `agent.ts` `place`, `placeSlug`, `setScale` | overlay-theme.test |
| Script-made part: "can't be changed here" with **Select the part around it** | Toolbar blocked row | `toolbar.ts` `blockedRow`, `protocol.ts` `blocked` | protocol.test "blocked clicks may name the editable part around them" |
| Breadcrumb: select the part around (kind menu) | Toolbar lead button | `toolbar.ts` `crumb`, `sectionLead` | protocol.test "selection kind, name and ancestors are validated" |
| Arrow keys: next, previous, parent, child; Enter runs the first action | Canvas surface | `main.ts`, `agent.ts` `selectRelative` | protocol.test "keyboard selection messages are closed sets" |
| Escape: close menu, close review, cancel text, close panel, deselect | Global | `main.ts` | none |
| Off-screen pill "Heading is above" | Canvas `[data-offscreen]` | `toolbar.ts` `position` | placement.test "an offscreen selection reports which way it went, sideways included" |
| Toolbar placement that avoids words, pictures and sticky bars | Toolbar | `placement.ts` | placement.test (all 18 tests) |
| Toolbar collapses to More when narrow | Toolbar | `placement.ts` `fitRow`, `collapseOrder` | editor.test "the toolbar shows at most five labelled actions, then More"; placement.test "a button's toolbar wider than the 640 px cap...", "in the phone view the row gives up actions..." |
| Screen-reader announcement of the selection | `#editor-announcer` | `main.ts`, `toolbar.ts` `describeSelection` | editor.test "screen readers hear a real description, never an empty name" |
| Hidden sections drawn with a marker in the editor | Agent overlay | `agent.ts` `drawHiddenSections` | publishing.rs `hidden_sections_stay_in_preview_and_disappear_from_the_published_site` |
| Start here shortcuts (main heading, a picture, web address) | Rail top, collapses on selection | `rail.ts` `renderStart`, `protocol.ts` `outline` | protocol.test "the page outline names a heading and at most forty pictures" |

### 5.4 Text

| Function | Where | Code | Tests |
|---|---|---|---|
| Edit text (inline `contenteditable`) | Toolbar **Edit text**, Enter on the canvas | `toolbar.ts`, `agent.ts` `startText` | canvas-policy.test "text needs a parent-started session for that element", "an editing report cannot create a text session" |
| Short text selected on start, long text caret at end | Agent | `text-start.ts` `startSelection` | editor.test "Edit text starts with short text selected, so typing replaces it, and long paragraphs with the caret at the end" |
| Bold, italic (also `Ctrl+B`, `Ctrl+I` native) | Text toolbar | `toolbar.ts` `rowFor`, `agent.ts` `format` | none |
| Link the selected words; remove link | Text toolbar link button, rail panel `text-link` | `panels.ts` `textLinkPanel` | editor.test "the link panel for selected words closes when text editing ends" |
| Done (Enter), Cancel (Escape), Shift+Enter line break, outside click commits | Text toolbar, agent keys | `agent.ts` keydown, `focusout` | protocol.test "the page cannot ask for undo or redo; inside a text editor those keys stay native" |
| Paste as plain text | Agent | `agent.ts` `paste` | none |
| Links inside edited text do not navigate | Agent | `agent.ts` `click` | none |
| Server sanitising of text | Server | `document.rs` `apply` | document.rs `text_edits_cannot_inject_scripts_handlers_or_dangerous_links`, `editing_a_headline_keeps_its_styled_parts_and_attributes`, `a_button_with_an_icon_keeps_the_icon_when_its_label_changes`, `blocks_and_sealed_elements_are_not_text_editable`; editing.rs `text_edits_persist_undo_redo_and_reject_stale_tabs` |
| Text style: colour swatches from the site palette, custom colour, size steps, weight, alignment, reset | Toolbar **Style**, rail panel `style` | `panels.ts` `stylePanel`, edit `set_style` | editor.test "steppers move through the scale from the nearest step", "swatches get plain colour names"; protocol.test "style previews accept only the server's properties and values", "style values mirror the server's rules", "palette colours are six-digit lowercase hex, at most ten"; document.rs `style_edits_change_only_the_named_properties`; editing.rs `links_and_styles_accept_safe_values_and_reject_injections` |

### 5.5 Images and backgrounds

| Function | Where | Code | Tests |
|---|---|---|---|
| Replace image (file dialog, upload progress in the button) | Toolbar **Replace image**, image panel **Choose a picture** | `edits.ts` `replaceImage`, `api.uploadImage` | editing.rs `replacement_images_are_served_as_png_and_disguised_php_is_rejected`; document.rs `replacing_an_image_keeps_its_size_and_drops_alternate_sources` |
| Drop a picture onto the image panel | Image panel drop zone | `panels.ts` `imagePanel` | none |
| Keep the old frame: Fill the frame or Show whole picture | Image panel after a replacement | `edits.ts` `fitBox`, `refit` | fit.test (all 4 tests); editor.test "undo puts away the 'Picture replaced' note and its fit choices" |
| File type and size check before upload | Client | `edits.ts` `checkImage` | none (server: editing.rs above) |
| Description (alt text), "Recommended" when empty, Enter or blur saves | Toolbar **Description**, image panel | `panels.ts`, edit `set_alt` | none client-side |
| Thumbnail, shown size vs file size, shape warning | Image panel | `panels.ts` `imagePanel` | protocol.test "image metrics are finite numbers in range" |
| Link around an image | Toolbar **Link** (parent-link) | `toolbar.ts` `parent-link` | none |
| Change background photo of the selection | Toolbar **Change background photo**, background panel | `edits.ts` `replaceBackground`, edit `set_background_image` | editing.rs `background_photo_upload_is_published_and_can_be_removed`; document.rs `background_images_merge_styles_and_remove_only_the_override`, `background_images_reject_unsafe_paths_and_sealed_or_void_elements`; protocol.test "background image capability survives selection validation", "background previews carry an element and a capped URL" |
| Change banner photo from a heading on the banner | Toolbar **Change banner photo** | `toolbar.ts` `bannerOf` | editor.test "text on a banner offers to change the banner's photo, not its own background"; protocol.test "banner photos on ancestors must be flagged as booleans" |
| Background colour and spacing (above, below, inside) | Toolbar **Background**, rail panel `background` | `panels.ts` `backgroundPanel` | covered by the style tests above |
| Images list of the page with thumbnails; choosing one selects it | Rail **Images** row with count | `rail.ts` `renderImages` | none |
| Site asset list endpoint | `GET /api/projects/{pid}/assets` exists in `api.ts`, **no UI uses it** | `api.assets` | none |

### 5.6 Links and buttons

| Function | Where | Code | Tests |
|---|---|---|---|
| Link destination: page, part of this page, web address, email, phone; open in new tab | Toolbar **Link** (shows destination in words), rail panel `link` | `panels.ts` `linkForm`, `links.ts` | editor.test "links between pages are relative to the page being edited", "a link's destination is classified and described in words", "phone, email and web links are checked before they are saved"; protocol.test "links follow the server's scheme rules", "anchor ids are safe fragment names and names are capped"; document.rs `links_accept_web_mail_phone_and_site_paths_only` |
| Open the linked page in the editor | Link panel **Open this page in the editor** | `panels.ts` | none |
| Button text | Toolbar **Edit text** | same as text | same as text |

### 5.7 Sections

| Function | Where | Code | Tests |
|---|---|---|---|
| Move section up or down (`Alt+Shift+Up/Down`) | Toolbar arrow buttons | `edits.ts` `moveSection` | document.rs `sections_move_duplicate_hide_and_publish_without_editor_markup` |
| Duplicate section | Toolbar **Section** menu | `edits.ts` `duplicateSection` | same |
| Hide on your website, Show, warning when menu links point at it | Toolbar **Section** menu, **Show section** button | `edits.ts` `setHidden` | same; publishing.rs `hidden_sections_stay_in_preview_and_disappear_from_the_published_site` |
| Remove section (undoable) | Toolbar **Section** menu | `edits.ts` `removeSection` | same |
| Every section action toasts with **Undo** | Toast | `edits.ts` `undoToast` | none |

### 5.8 History, saving and status

| Function | Where | Code | Tests |
|---|---|---|---|
| Undo, redo with labels (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`) | Top bar | `main.ts` `history` | editing.rs `text_edits_persist_undo_redo_and_reject_stale_tabs` |
| Autosave queue, offline retry, recover a lost answer | Status pill | `saves.ts` | saves.test (all 4 tests); editor.test "an offline save waits in the queue and the pill says so" |
| Status line "Saved · n changes not published" | Top bar pill | `state.ts` `statusLine` | editor.test "saves are counted...", "the status keeps saying Saved...", "with a live website the status counts...", "the editor's status words never say online or live", "a conflict outranks every other state in the pill" |
| Conflict dialog "changed in another tab" | Dialog | `main.ts` | editing.rs `text_edits_persist_undo_redo_and_reject_stale_tabs` |
| `Ctrl+S` says "Everything saves automatically." | Toast | `main.ts` | none |
| Leave-page guard while saving | Browser | `topbar.ts` `beforeunload` | none |

### 5.9 Publishing, versions, settings, domains

| Function | Where | Code | Tests |
|---|---|---|---|
| Publish review: changes grouped by page, address, Publish, Cancel, Version history link | Top bar **Publish** or status pill, popover; `Ctrl+Shift+P` | `publish.ts` `review` | editor.test "unpublished changes are listed from the session's undo labels...", "a change is listed under the page it was made on...", "publishing clears the change list and marks the site current"; publishing.rs `unchanged_drafts_cannot_create_duplicate_live_releases` |
| Published toast with **View website**; **View website** button when current | Toast, top bar | `publish.ts`, `topbar.ts` | none |
| Version history: number, date, live tag | Rail row, Website menu, review link, `Ctrl+Shift+H`; side sheet | `publish.ts` `releaseRows` | editor.test "what visitors see is derived from the live release, the versions and the draft"; publishing.rs `releases_are_immutable_can_be_reactivated_and_can_be_restored_as_an_undoable_edit` |
| Publish an earlier version again (rollback) | History sheet, confirm | `publish.ts` `publishAgain`, `api.activate` | publishing.rs same |
| Open a version in the editor (undoable restore) | History sheet, confirm | `publish.ts` `openVersion`, `api.restore` | publishing.rs same; editing.rs `history_and_release_restore_reject_legacy_deep_pages` |
| Website name and web address (slug) | Settings modal | `publish.ts`, `api.settings` | projects.rs `settings_slug_collisions_are_readable_and_roll_back_the_claim`, `a_slug_claim_checks_ownership_after_a_stale_availability_check` |
| Own domain: add, DNS records with copy, Check now, remove | Settings modal | `publish.ts` `domainCard` | domains.rs `dns_proof_routes_custom_domains_and_new_ownership_takes_over_atomically`, `disabled_custom_domains_refuse_changes_routing_and_certificates` |
| Keyboard shortcuts sheet (`?`) | Website menu, dialog | `main.ts` | none |
| F6 between top bar, rail, canvas, toolbar | Global | `main.ts` `cycleRegions` | none |

### 5.10 Security boundary the redesign must not touch

| Guarantee | Code | Tests |
|---|---|---|
| Messages checked for origin and source, then parsed by closed schemas | `protocol.ts`, `canvas.ts`, `agent.ts` | protocol.test (all 24 tests) |
| Text sessions start only from the parent | `canvas-policy.ts` | canvas-policy.test (all 5 tests) |
| Another user cannot reach a project or retarget a preview token | server | authorization.rs `another_user_cannot_access_any_project_route_or_retarget_a_preview_token` |
| Static-only imports, hostile archives, limits | server | imports.rs (3 tests) |
| Sign-in and session rules | server | auth.rs (6 tests); screens.test (8 tests) |

## 6. What the baseline says about the redesign

- The canvas gets 67.7 % of a 1280 x 800 screen. The plan target is 85 %. Removing the 248 px rail alone gives about 0.84 by the same arithmetic (1256 x 688 / 1280 x 800), so the top bar and footer strip must also shrink or float.
- Selection is already fast (median 13 ms to the message, under 20 ms to the toolbar). The redesign must not make it slower. Re-run section 3 unchanged after Phase E.
- The worst layout shift comes from sizing the canvas after the bootstrap response. A canvas that reserves its box from the start would remove most of the 0.28.
- The tasks are short on a laptop (1 to 4 actions). The friction is elsewhere: distance to the rail panel (task 3), naming (tasks 2 and 8), missing feedback for saves (task 1), and the tablet and phone gaps.
