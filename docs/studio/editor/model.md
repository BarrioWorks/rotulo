# Editor interaction model (Phase B, Agent D)

This document proposes how the Studio editor works with no permanent sidebar. It covers where each control lives, what each state looks like, and how each edit flows, and it maps every part to the code it reuses or replaces. It does not choose colours, type or materials. Agent C owns those, and the Phase C directions decide the look.

Inputs: `../brief.md`, `../PLAN.md`, the baseline in `../baseline/README.md` (measurements, task counts, and the feature inventory in its section 5), and the current code in `frontend/editor/`, `frontend/agent/agent.ts`, `frontend/protocol.ts` and `src/document.rs`.

Ground rules this model keeps:

- `frontend/protocol.ts` and `frontend/editor/canvas-policy.ts` do not change. Everything below runs on the messages that exist today. The few places that would benefit from a new message are listed in section 16 as optional and separately reviewed.
- No backend work. The edits available are the eleven `PageEdit` variants in `src/document.rs` (`SetText`, `SetImage`, `SetBackgroundImage`, `SetAlt`, `SetLink`, `SetStyle`, `HideSection`, `DuplicateSection`, `MoveSection`, `RemoveSection`, `SetPageMeta`), plus the page, settings, publish, release and domain endpoints in `frontend/editor/api.ts`. No core task needs more. Gaps are listed in section 16.
- Every function in the baseline inventory stays reachable from a visible control. The command palette is a second route and never the only one (section 15).

## 1. Layout: four islands around a full canvas

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [‹] Agency / Home ▾        [↶ ↷ | Edit Preview | ▭ ▯ | Fit]   Saved · 2 ▸ [Publish] │  48 px band
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                     imported website (canvas)                            │
│                                                                          │
│                 ┌────────────── contextual dock ─────────────┐           │
│                 │ Heading ▾ │ Edit │ Style │ Link │ ⋯          │           │
│                 └────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Navigation capsule**, top left: back to websites, the site name, a slash, the page name with a chevron. Section 2.
- **Tools capsule**, top centre: undo and redo, Edit and Preview, Computer and Phone, the zoom chip. It holds view state only. Section 13 covers the save indicator.
- **Publish capsule**, top right: the publication state in words, and **Publish**. Section 7.
- **Contextual dock**: the existing selection toolbar, rebuilt as a dock that sits near the selection and falls back to the bottom edge. Sections 9 to 12.

The three top islands live in a reserved 48 px band of workspace above the canvas, not over the site. The baseline shows why: when the current toolbar docks over the canvas top it covers the site's own navigation (`editor-heading-selected-1024.png`). Floating chrome over the site's top bar is the most common way to hide important content on imported templates, because almost every template has a top bar.

Expected canvasShare at 1280 x 800, with 8 px side and bottom gutters and no footer strip: 1264 x 736 / (1280 x 800) = **0.908**, against the 0.677 baseline and the 0.85 target. This is arithmetic, not a measurement. The zoom chip moves from the footer into the tools capsule, and the hint line ("Previewing. Links and buttons work...") becomes a transient chip inside the canvas.

The band is transparent workspace in the same neutral as the canvas surround, so the site still reads as the main object. Focus mode (section 14) removes the band altogether.

Code mapping. `assets/views/projects/editor.html` loses `aside.ed-rail`, `.canvas-foot`, and the three-column `header.ed-top`. `canvas.ts` keeps `frameLayout()` unchanged. Only the space it measures (`area.clientWidth - 2 * GUTTER`) grows. `placement.ts` keeps working because it already places the dock inside `canvas.visibleBox()`.

## 2. The "Site / Page" capsule and page switcher

The capsule reads `Agency / Home ▾`. The two halves are separate buttons with separate jobs.

- **Site name** opens Website settings (section 4) at General. It replaces today's `[data-site-menu]` dropdown, whose two useful entries (Website settings, Version history) both get better homes. Keyboard shortcuts move to the palette and to a **?** entry inside settings.
- **Page name** opens the page switcher popover.

The page switcher scales with the site:

| Pages | What the popover shows |
|---|---|
| 1 | The page row ("Home, the only page"), **Add a page...**, **Page settings...**. No search box, no list chrome. |
| 2 to 7 | The list, current page checked, **Add a page...** at the bottom. |
| 8 or more | A search field on top (filters by label, path and description), then the list. Typing in the switcher filters at once. |

Each row shows the page label from `pages.ts` `pageLabel()`, its path (`/about.html`) and, on hover or focus, a **...** button with **Rename**, **Duplicate**, **Page settings** and **Delete page**. Home cannot be renamed or deleted, as today. On touch, the **...** button is always visible, because a hover-only control does not exist for a finger.

Thumbnails are not proposed for the first version. The bootstrap gives each page a `title` and `description` only, and live mini-iframes per row would load every page of the site to open a menu. Recognition comes from the label, the path and the description. Section 16 lists a cheap server-side thumbnail as an optional gap.

Actions:

- Switch: click a row, or arrow keys and Enter. Runs `canvas.open(path)`, as `rail.ts` and `topbar.ts` `openPages()` do today.
- Add: opens the existing page dialog (`dialog[data-dialog="page"]`, `rail.ts` `pageDialog("add")`) with "Start from a copy of" defaulting to the current page. After adding, today's rail note ("Visitors can't reach this page yet...") becomes a toast with an action **Link a button to it**, which enters a "pick a button" hint on the canvas.
- Rename, duplicate, delete: same calls as `rail.ts` today (`api.renamePage`, `pageDialog("add", page)`, `deletePage` with its confirm).
- Page settings: opens a popover from the capsule with the `panels.ts` `pagePanel()` form (title and description, `set_page_meta`).

Protocol support: none needed. Page switching is an editor-side navigation of the iframe. In Preview mode, in-site links still open draft pages through the `navigate` message and `canvas-policy.ts` `canvasNavigation()`.

Width rule: the capsule never hides the page name. At 834 px today the page crumb disappears (baseline task 4). In this model the site name truncates first, down to its first letter in a circle, and the page name keeps at least 8 characters.

## 3. Pages are also in settings

Website settings has a **Pages** section (section 4) with the same list and the same row actions, because some owners look for pages under "settings". One code path renders both. `rail.ts` `renderPages()` becomes a function that renders rows into either container.

## 4. Website settings surface

A Level 3 sheet (opaque, modal) opens from the site name in the capsule and from the palette. It has a section list on the left at 834 px and wider, and a segmented section picker at the top on phones.

| Section | Contents | Source today |
|---|---|---|
| General | Website name, web address (slug) with its suffix, **View website**, keyboard shortcuts list | `publish.ts` settings form, `dialog[data-dialog="shortcuts"]` |
| Pages | Page list and row actions (section 3) | `rail.ts` |
| Assets | Images used on the site, from `GET /api/projects/{pid}/assets` (`kind: "image"`), with size, file path and a thumbnail. Pictures on the current page carry **Select on page**. Fonts, styles and scripts appear as counts only. | `api.assets` exists in `api.ts` and is unused today; `rail.ts` `renderImages()` |
| Domains | Own domain: add, DNS records with copy buttons, **Check now**, remove | `publish.ts` `domainCard()`, `dnsTable()` |
| Publishing | Address, what visitors see (live version and date), **Publish** when there are changes | `publish.ts` `review(s, "manage")` |
| Versions | Full version list with **Make this version live** and **Open in editor** | `publish.ts` `releaseRows()` |

Behaviour:

- One field group saves at a time with its own **Save** button, as today. Settings changes are not draft edits and are not undoable (`api.settings` is outside the draft history). The sheet says so under the web address field: "Takes effect at once. Not part of Undo."
- Escape closes the sheet. Focus returns to the control that opened it.
- Fix while moving the form: the slug input's `pattern="[a-z0-9-]{3,32}"` is invalid under the `v` regex flag that browsers now use for `pattern` (baseline task 5 console error), so the browser silently skips it. Write it as `[a-z0-9\-]{3,32}`.

The Manage view below 600 px (`[data-manage]`) disappears as a separate screen. Its three parts become the Publishing and Versions sections of this sheet and the publish panel (section 7).

## 5. Contextual asset browser

The asset browser is a popover anchored to the dock's **Replace** button. It opens when the owner chooses **Replace** on an image or a background photo, and from **Assets** in settings.

```
┌ Replace image ─────────────────────────────┐
│ [ Upload from your computer ]  or drop here │
│ Fill the frame ◉   Show whole picture ○     │  (only after a replacement)
│ Recently uploaded                            │
│ [thumb] [thumb] [thumb]                      │
│ On this page                                 │
│ [thumb] portfolio/1.jpg   (selects it)       │
│ Description ______________________ [Save]    │
└─────────────────────────────────────────────┘
```

- **Upload** is first and largest. It runs `edits.ts` `chooseImage()` and `replaceImage()` (or `replaceBackground()` for a background photo), with the upload percentage in the button, as today.
- **Drop here** reuses the image panel's drop handling (`panels.ts` `imagePanel()` dragover and drop).
- **Fit** reuses `edits.ts` `refit()` and `fitBox()`. It appears only after a replacement in this session, exactly as the current panel does.
- **Recently uploaded** lists pictures uploaded in this tab. Each upload returns an `upload` id that `set_image` accepts again, so picking one reuses it without a second upload. The ids live in memory only.
- **On this page** lists `state.outline.images` with thumbnails (`panels.ts` `previewImage()`). Choosing one selects that picture on the canvas, which is what the Images list does today. It does not put that picture into the selected frame, because `set_image` accepts only uploads (gap B1 in section 16).
- **Description** is the alt text field from `imagePanel()`, saved on Enter or blur through `set_alt`. When the description is empty, the dock's **Description** button carries a dot, as today.

On touch screens narrower than 1024 px, the popover is a bottom sheet.

## 6. Version history lives in the publish panel

Version history leaves its own side sheet. It becomes the lower half of the publish panel (section 7), with the last five versions, and the full list stays in Settings, Versions.

Wording changes, based on baseline task 8:

- "Publish again" becomes **Make this version live**. The confirm keeps today's plain explanation from `publish.ts` `publishAgain()`.
- "Open in editor" stays, with the confirm from `openVersion()`. Its row note says "Your current changes stay in Undo."
- Each row shows the version number, the date, and "live" on the live one. A per-version change summary needs data the server does not keep (gap B4). For the newest version only, the panel can show the session's `changeSummary()` from before the publish.

After a rollback the canvas shows the newer draft while visitors see the older version. The publish capsule then reads "Visitors see version 1 · your editor is newer", and the publish panel leads with that sentence and **Publish my latest changes**. The words come from `state.ts` `publishText()`, kind `older`.

## 7. Publish panel and publication feedback

**Publish** opens a popover under the publish capsule. It reuses `publish.ts` `review()` for its four states (`never`, `changes`, `current`, `older`), the change list grouped by page from `changeSummary()`, the address row, and the error and offline alerts.

The publish capsule:

| State | Capsule text | Publish button |
|---|---|---|
| Never published | "Not published yet" | **Publish** (primary) |
| Changes waiting | "3 changes not published" | **Publish · 3** (primary) |
| Current | "Live" with the address as a link | **Published** (quiet, still opens the panel for history) |
| Older version live | "Visitors see version 1" | **Publish** (primary) |
| Publishing | "Publishing..." | spinner, `aria-busy`, not clickable |
| Just published | "Live · version 4 · just now" for 4 seconds, then "Live" | check mark, then **Published** |

Feedback sequence after the owner confirms:

1. The confirm button becomes "Publishing..." with a spinner. The panel stays open, so the owner sees the result where they acted.
2. On success, the panel content changes to "Published. Visitors now see version 4." with the live address and **View website**. The capsule changes as in the table. The screen reader hears the same sentence through `announce()`.
3. The panel closes on the next click outside or on Escape. No toast duplicates the panel. If the panel was closed before the request ended (the owner clicked away), the toast from today's `publish()` shows instead.
4. On failure, the panel shows the server message (`publishError`) and keeps the confirm button.

No confetti, no motion beyond the button's spinner and a 150 ms crossfade of the panel content. Publishing is routine, as the brief says.

Today the Publish button is disabled when there is nothing to publish (`topbar.ts`). In this model it stays enabled in the "Published" style, because it is also the way into version history. The panel then shows "Everything is published." with the versions below.

## 8. Selection states

The selection is one state machine instead of today's three separate sources (`state.focus`, `state.editing`, `state.saves`). The agent draws the outline inside the site. The app draws everything else. The protocol already carries what each state needs.

| State | Enters when | Inside the site (agent overlay) | In the app | Protocol |
|---|---|---|---|---|
| Idle | Nothing selected | Nothing | No dock. The canvas shows a one-time hint chip "Click any text or picture to change it" until the first selection | `deselect` |
| Hovered | Pointer over an editable part (mouse and trackpad only) | Thin outline, no label | Nothing | none, agent-only (`pointerover`) |
| Selected | Click, tap, arrow keys, breadcrumb, Images, palette | Outline, corner marks, kind label ("Heading", "Banner") | Dock with the part's actions | `select` |
| Editing | **Edit**, Enter, second click or double-click on selected text (section 9) | Outline in the editing colour, label "Editing", caret | Text dock (section 9) | `start_text`, `editing` |
| Saving | A change for this element is in the save queue for more than 400 ms | unchanged | Small spinner in the dock's lead chip ("Heading · saving") | none; derived from `saves.ts` |
| Error | The server refused the change, or saving failed | The agent reloads the element on rejection, as today | The dock's lead chip turns to the error colour with the message, and **Try again** when it was a network failure | none; `ApiError` in `saves.ts` |
| Unsupported | Click on something the site's script made | Outline around the script-made part in a neutral colour | Dock shows one sentence and **Select the part around it** | `blocked` |

What changes in code:

- `state.ts`: the `Focus` union keeps `none | selected | blocked`. `Saves` gains `pendingElements: Set<string>` and `lastError: { element: string | null; message: string } | null`, filled by `edits.ts` `save()`, which already knows the element. A pure `selectionView(state)` derives the row above, so the dock renders from one value instead of checking three. This is the same move the current `statusLine()` makes for the status pill.
- `agent.ts`: nothing for these states. Its hover, outline, label and blocked drawing already exist.

The selection outline must stay visible on light, dark and photographic sites. The current overlay keeps a white halo and constant on-screen size (`agent.ts` `setScale`), and `frontend/tests/overlay-theme.test.mjs` ties its colours to app tokens. Agent C's colour work changes the tokens, not the mechanism.

## 9. Text editing flow

Entering edit, three ways, all available at once:

1. **Edit** in the dock (labelled, first in the row for text kinds, as `toolbar.ts` `ACTION_ORDER` has it).
2. Enter on the canvas (today's `toolbar.activatePrimary()`).
3. A second click on text that is already selected, or a double-click. The agent swallows `dblclick` today, but each click still posts `select`. The editor treats a second `select` for the already-selected text element, within 500 ms or while the dock is showing, as an edit request and sends `start_text`. That needs no protocol change. Guard: `agent.ts` `commitText()` re-posts `select` for the same element after saving, so the editor ignores a repeat `select` that arrives within 300 ms after an `editing: false` report.

Direct editing on the first click is not proposed. A first click that enters editing would hide the part's other actions (Style, Link, Section) behind a text session, and turn every attempt to select a section into typing. Selected-then-edit keeps one click for "which part" and one for "change it".

Where typing starts is unchanged: short text starts fully selected so typing replaces it, and long paragraphs start with the caret at the end (`text-start.ts` `startSelection()`, tested in `editor.test.mjs`).

Text dock contents, nothing disabled and nothing unrelated:

| Control | When shown | Shortcut | Code |
|---|---|---|---|
| **B** Bold | always in editing | `Ctrl/Cmd+B` (native in `contenteditable`) | `format` `bold` |
| *I* Italic | always in editing | `Ctrl/Cmd+I` (native) | `format` `italic` |
| Link | when the caret is not in a link | see section 15 | `text-link` form, `format` `link` |
| Remove link | when the caret is in a link | none | `format` `unlink` |
| **Done** | always | Enter | `finish_text` `commit: true` |
| Undo typing | in the dock's **...** | none | `finish_text` `commit: false` |

The "Editing text" label goes away; the outline label inside the site already says "Editing".

Keys and clicks:

| Input | Today | Proposed | Why |
|---|---|---|---|
| Enter | commits | commits | One-line parts are the common case (headings, buttons). |
| Shift+Enter | line break | line break | unchanged |
| Escape | throws the typing away (`agent.ts` `cancelText()`) | keeps the typing and leaves editing; a second Escape deselects | Throwing away typing on the key people press to "get out" loses work. Keynote, Figma and Notion keep the text. Undo still reverts it as one step. This is an `agent.ts` change (A2 in section 16). |
| Click outside the text | commits (`focusout`) | commits | unchanged |
| Click a link inside the text | does not navigate | does not navigate | unchanged, `agent.ts` click handler |
| `Ctrl/Cmd+Z` | native undo inside the session | native undo inside the session | unchanged, guarded by `protocol.test.mjs` |
| Paste | plain text only | plain text only | unchanged |

Text style (colour, size, weight, alignment) opens from **Style** in the dock of a selected text part, not from the text dock. It is a popover anchored to the dock that renders `panels.ts` `stylePanel()`. The change previews live through `preview_style` and saves through `set_style`, as today.

## 10. Image replacement

Dock for an image (`can` includes `i`): **Replace**, **Description** (dot when empty), **Link** when the image sits inside a link or button (today's `parent-link`), and the lead chip with the breadcrumb.

Flow, matching "changing an image in a presentation app":

1. Select the picture.
2. **Replace** opens the asset browser (section 5) with **Upload** focused.
3. Choose or drop a file. The picture updates in place through `preview_image`. The browser stays open showing **Fill the frame** and **Show whole picture**, and **Undo**.

Dragging a file from the desktop straight onto a selected image on the canvas is not possible. The agent cancels `drop` in edit mode, and the protocol has no message to hand a file across origins. The drop zone in the asset browser covers the need.

Background photos (`can` includes `b` with `info.bgImage`), and a banner behind selected text (`toolbar.ts` `bannerOf()`): the dock shows **Replace photo**. It opens the same browser without the Fit control, because `replaceBackground()` uploads the file as is. Naming changes from "Change background photo" and "Change banner photo" to **Replace photo** everywhere, with the label chip saying what owns it ("Banner"). Baseline task 2 showed the owner hunting for "image" while the UI said "background photo".

The Images list as a permanent rail view goes away. Its job, "find a picture on this page", moves to **On this page** in the asset browser and to the palette ("Select picture: team/1.jpg").

## 11. Links and buttons

Dock for a link or button (`can` includes `l`): **Edit** (the visible text), **Link · Contact Us section** (the destination in words, from `links.ts` `describeHref()`), **Style**, and **Replace photo** when the button sits on a banner.

**Link** opens a popover anchored to the dock, so the form sits next to the button instead of in the rail 600 px away (baseline task 3). It renders `panels.ts` `linkForm()`:

- "Goes to": page, part of this page, web address, email, phone.
- For page and part-of-page, the second select applies the change at once with an **Undo** toast. Both choices are always valid, and the server check (`isSafeHref` and `document.rs` `safe_href`) still runs. Predicted saving: one action in task 3.
- For web, email and phone, the field checks as you type after the first error (`checkWeb`, `checkEmail`, `checkPhone`) and saves on Enter or **Save link**.
- "Open in a new tab" shows only for web addresses, as today.
- **Open this page in the editor** stays for page links.

Following a link never happens in Edit mode. The agent stops clicks in the capture phase. To follow links, the owner uses Preview, where same-site links open draft pages through `navigate`. The dock never shows a "visit" action in Edit mode, which keeps "edit the link" and "follow the link" in two modes with two looks.

## 12. Section controls

Sections are the direct children of `body` or `main`, or of a single wrapper around the page (`document.rs` `is_section`). The server reports per element what is safe: `x` (hide, remove), `u` and `d` (a sibling section exists above or below), and `c` (duplicate, refused when the section contains a script). The dock shows only what the capability string allows.

| Control | Shown when | Edit | Feedback |
|---|---|---|---|
| Move up, Move down | `u`, `d` | `move_section` | reload with pulse, toast with **Undo** |
| Duplicate | `c` | `duplicate_section` | copy appears below, selected, toast with **Undo** |
| Hide on website, Show | `x` | `hide_section` | hidden sections keep a striped marker in the editor; warning when menu links point at the section (`info.anchorLinks`) |
| Remove | `x` | `remove_section` | inside the section **...** menu, danger style, toast with **Undo** focused |
| Background | `s` or `b` | `set_style`, `set_background_image` | popover with `backgroundPanel()` |

No drag and drop. `move_section` swaps with the neighbouring section only, and imported scripts often depend on order, so a free drag would promise moves the server cannot make. Keyboard `Alt+Shift+Up` and `Alt+Shift+Down` stay.

Code: `toolbar.ts` `sectionItems()`, `sectionLead()` and `sectionGroup()` move into the dock unchanged. `edits.ts` section functions are unchanged.

## 13. Adaptive tool positioning

The dock reuses `placement.ts` (`placeToolbar`, `fitRow`, `collapseOrder`, 18 tests). It already avoids the selection, nearby words and pictures, and the site's sticky bars, and it remembers its side while scrolling. Two rules change:

1. **Fallback position is the bottom edge, not the top.** When no spot beside the selection is clear, the dock docks centred at the bottom of the visible canvas, 12 px above the edge. Today it docks in a strip along the top, under the site's bar, which the baseline caught covering the site's navigation at 1024 px. `placement.ts` already has a bottom-edge case ("a docked toolbar moves to the bottom edge when the selection is at the top"). The change makes the bottom edge the default dock.
2. **Coarse pointers always use the bottom dock.** On touch screens the dock is a full-width bar at the bottom of the canvas with 44 px targets. It does not chase the selection, so the thumb finds it in the same place every time.

Kept as is: off-screen pill ("Heading is above", `[data-offscreen]`), More menu for actions that do not fit, a glide of 180 ms when the dock moves to a new selection, and no glide under `prefers-reduced-motion`.

The dock never overlaps an open popover or sheet. When a popover opens from the dock, the dock stays put and the popover opens on the side away from the selection. At 834 px today the toolbar draws over the open drawer (`editor-image-selected-834-toolbar-over-drawer.png`). With no drawer, that collision goes away, and the dock gets a z-index below every Level 3 surface.

The save indicator sits at the left end of the tools capsule: nothing while saved, "Saving..." after 400 ms (`SAVING_DELAY_MS`), and the problem text in warning or error colour from `state.ts` `statusLine()`. Publication state moves to the publish capsule. The two halves of today's pill (`statusLine().save` and `statusLine().publish`) already exist as separate fields, so `editor.test.mjs` keeps testing the same words.

## 14. Focus mode

Focus mode hides every island and shows the site edge to edge, so the owner can look at their site.

- Enter: the **Focus** button in the tools capsule (icon with a label in its tooltip and accessible name), the palette, or `Ctrl/Cmd+.`.
- While in focus mode the canvas switches to Preview (`mode` message `preview`), so links work as a visitor would see them, and the selection clears as today.
- Leave: one small pill at the bottom centre, **Back to editing**, always visible, plus Escape and `Ctrl/Cmd+.`. Leaving restores the previous mode, device, scroll position and selection. The selection comes back through `init.select` on reload or `select_element`.
- The pill fades to 40 % opacity after 3 seconds without pointer movement and returns on any movement or Tab focus. It never disappears completely, so the way out is always visible.

Protocol support: `mode` and `select_element` exist.

## 15. Command palette and shortcuts

The palette is a Level 2 popover centred in the top third. It holds a search field and a grouped result list. Every entry repeats a visible control, and the visible control is named in the entry's right-hand detail ("Top left").

Groups: Pages (switch to each page, add page), Selection (actions for the selected part, "Select main heading", "Select picture: ..."), Website (settings sections), Publishing (publish, versions, view website), View (Edit, Preview, Computer, Phone, Fit, Focus), Help (keyboard shortcuts).

The shortcut conflict:

- `Ctrl/Cmd+K` opens the page switcher today (`main.ts`). In this model it opens the palette, with pages listed first when the query is empty. Switching page stays three keys: `Ctrl+K`, arrow, Enter.
- `Ctrl/Cmd+K` is also the common "insert link" shortcut in text editors. The two never compete for the same key press. During a text session the preview iframe has focus, and key events inside a cross-origin iframe never reach the app document. So while editing text, `Ctrl+K` cannot open the palette.
- Today that key falls through to the browser inside a text session. To make it insert a link, the agent must ask the editor to open the link form, and that needs a new agent message (P1 in section 16, reviewed separately). Until then, the text dock's Link button is the way to link words, and the palette is available as soon as editing ends.

Shortcut table (Cmd on macOS, Ctrl elsewhere):

| Keys | Action | Visible control |
|---|---|---|
| `Ctrl+K` | Palette | none needed; also the palette entry list |
| `Ctrl+K` in text editing | Link the selected words (after P1) | text dock Link |
| `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` | Undo, redo | tools capsule |
| Arrow keys on the canvas | Select next, previous, around, inside | canvas |
| Enter on the canvas | Run the part's first action (Edit for text) | dock |
| Escape | Close the top surface, then leave editing, then deselect | each surface's close button |
| `Alt+Shift+Up`, `Alt+Shift+Down` | Move section | dock arrows |
| `Ctrl+Shift+P` | Open the publish panel | **Publish** |
| `Ctrl+.` | Focus mode | **Focus** |
| `?` | Keyboard shortcuts | Settings, General |
| F6, Shift+F6 | Move between navigation capsule, tools capsule, publish capsule, canvas, dock | none |
| `Ctrl+S` | "Everything saves automatically." | save indicator |

`Ctrl+Shift+H` (version history today) is dropped, because history is now inside the publish panel. Browser-reserved risk, from knowledge and not tested here: Firefox binds `Ctrl+Shift+P` to a private window and does not let pages override it. The palette and the visible **Publish** button cover Firefox users.

Escape order is one rule over one value. The open surface is a single `Surface` value (section 17), so Escape closes it if there is one, otherwise it leaves text editing, otherwise it deselects. Today Escape walks menus, the review popover, editing, the rail panel and the selection in a hand-written order in `main.ts`.

Palette-only trap check. The table in section 18 lists every inventory function with its visible control. No row has only a palette entry.

## 16. Gaps and changes outside the editor shell

Backend gaps. None blocks a core task (section 15 of the brief).

| Id | Gap | Effect without it | Smallest fix |
|---|---|---|---|
| B1 | `set_image` and `set_background_image` accept only an `upload` blob, not an existing site file. The preview origin sends no CORS headers, so the client cannot fetch and re-upload a site image either | "Use a picture already on the site" is not possible. Uploads from this tab can be reused (section 5) | Accept `{ asset: "img/x.jpg" }` for raster files already in the draft |
| B2 | No per-page picture for thumbnails | Page switcher shows labels, paths and descriptions only | Add `Document::representative_images()` (it exists for the dashboard) to the bootstrap page list |
| B3 | Settings (name, slug) are not draft edits | Not undoable; the sheet says so | Keep. Treat this as a product rule, not a gap |
| B4 | Releases keep no change summary | Version rows show number and date only | Store the session's undo labels with the release |

Agent changes (no protocol change, but `agent.ts` runs inside the preview, so the plan's separate review applies):

| Id | Change | Why |
|---|---|---|
| A1 | Stop cancelling `touchend` in edit mode; cancel only `touchstart` default actions that scroll-jack, or select on `pointerup` | The Touch Events spec says a cancelled `touchend` suppresses the click, and selection runs on `click`. Tap-to-select likely fails on tablets today (baseline section 4, a hypothesis). Blocks tablet editing |
| A2 | Escape commits the text instead of reverting it | Section 9 |
| A3 | Optional: start editing with the caret at the click point on a second click | Saves a click when fixing one word in a long paragraph |

Protocol additions (optional, reviewed separately, never assumed by the rest of this model):

| Id | Message | Why |
|---|---|---|
| P1 | Agent to editor `{ type: "shortcut", name: "link" }`, a closed set of one | `Ctrl+K` inserts a link while editing text |

Bug fix found in the baseline: the slug `pattern` regex (section 4).

## 17. State and code map

One value describes which surface is open. It replaces `state.rail`, the publish popover's `hidden` flag, and several `dialog.open` checks.

```ts
type Surface =
	| { kind: "none" }
	| { kind: "pages" }
	| { kind: "page-settings" }
	| { kind: "settings"; section: "general" | "pages" | "assets" | "domains" | "publishing" | "versions" }
	| { kind: "publish" }
	| { kind: "assets"; element: string; target: "image" | "background" }
	| { kind: "panel"; panel: "style" | "background" | "link" | "text-link"; element: string; subject: Kind }
	| { kind: "palette" }
	| { kind: "focus" };
```

`state.ts` `retarget()` keeps its rule for `panel` (a panel follows a new selection of the same kind, otherwise it closes), and `panelApplies()` keeps deciding which panels make sense. One surface at a time means a popover, a sheet and the palette can never stack, which also keeps translucent layers from piling up over the site.

| Module | Fate |
|---|---|
| `protocol.ts`, `canvas-policy.ts` | unchanged |
| `canvas.ts` | unchanged logic; measures a larger area; device switch keeps the selection and resets scroll to the selected element (`reveal`) instead of carrying the desktop offset (baseline task 6) |
| `placement.ts` | reused; bottom-edge default dock, coarse-pointer bottom bar (section 13) |
| `toolbar.ts` | becomes the dock; `ACTIONS`, `ACTION_ORDER`, `actionsFor`, `describeSelection`, `bannerOf` reused; labels renamed (section 10) |
| `panels.ts` | reused as popover bodies; `PanelContext.close` closes the popover |
| `rail.ts` | split: page rows go to the page switcher and Settings, Pages; images go to the asset browser; the panel host becomes a popover host; Start here becomes the canvas hint chip and palette entries; the drawer code is deleted |
| `topbar.ts` | becomes the three capsules; site menu deleted; status rendering split into save indicator and publish capsule |
| `publish.ts` | `review()`, `releaseRows()`, settings and domain code reused inside the publish panel and the settings sheet; Manage view rendering deleted |
| `menu.ts` | reused for the **...** menus and the breadcrumb |
| `edits.ts`, `saves.ts`, `api.ts`, `links.ts`, `pages.ts` | unchanged, plus `pendingElements` and `lastError` bookkeeping in `save()` |
| `main.ts` | key handling reduced to the shortcut table; F6 regions updated; Manage view branch deleted |
| `agent.ts` | A1, A2, optional A3 |

Tests that keep guarding behaviour: all of `protocol.test.mjs`, `canvas-policy.test.mjs`, `placement.test.mjs` (with new cases for the bottom default), `fit.test.mjs`, `saves.test.mjs`, and most of `editor.test.mjs`. Two tests name the rail and need rewording to the new surface, not new behaviour: "a rail panel follows the selection when it applies and returns to the pages otherwise" and "the link panel for selected words closes when text editing ends".

## 18. Reachability: every function and its visible control

Grouped as in the baseline inventory (`../baseline/README.md` section 5). "Palette" means it is also in the palette.

| Function | Visible control in the new model | Palette | Shortcut |
|---|---|---|---|
| Back to websites | Navigation capsule chevron | yes | none |
| Switch page | Page name in the capsule | yes | `Ctrl+K` |
| Add, rename, duplicate, delete page | Page switcher; Settings, Pages | yes | none |
| Page title and description | Page switcher **Page settings** | yes | none |
| Edit / Preview | Tools capsule | yes | none |
| Computer / Phone | Tools capsule | yes | none |
| Zoom fit / actual | Tools capsule chip | yes | none |
| Focus mode | Tools capsule **Focus**, **Back to editing** pill | yes | `Ctrl+.` |
| Undo, redo | Tools capsule | yes | `Ctrl+Z`, `Ctrl+Shift+Z` |
| Save state, offline retry, conflict | Save indicator; conflict dialog | no | none |
| Select a part | Canvas click or tap; arrows | "Select main heading", "Select picture" | arrows |
| Select the part around | Dock lead chip menu | yes | Left arrow |
| Edit text | Dock **Edit**; second click; double-click | yes | Enter |
| Bold, italic, link words, remove link, done, undo typing | Text dock | no (text session has focus) | `Ctrl+B`, `Ctrl+I`, Enter |
| Text style | Dock **Style** | yes | none |
| Background colour, photo, spacing | Dock **Background**, **Replace photo** | yes | none |
| Replace image, fit, description | Dock **Replace**, **Description**; asset browser | yes | none |
| Link around an image | Dock **Link** | yes | none |
| Link or button destination | Dock **Link · destination** | yes | none |
| Move, duplicate, hide, show, remove section | Dock section controls and **...** | yes | `Alt+Shift+Up`, `Alt+Shift+Down` |
| Script-made part | Dock note and **Select the part around it** | no | none |
| Off-screen selection | Off-screen pill | no | none |
| Pictures on this page | Asset browser **On this page**; Settings, Assets | yes | none |
| Site assets | Settings, Assets | yes | none |
| Publish | Publish capsule | yes | `Ctrl+Shift+P` |
| Change list before publishing | Publish panel | no | none |
| View website | Publish capsule address, publish panel | yes | none |
| Make an earlier version live | Publish panel versions; Settings, Versions | yes | none |
| Open a version in the editor | Publish panel versions; Settings, Versions | yes | none |
| Website name and address | Site name, then Settings, General | yes | none |
| Own domain | Settings, Domains | yes | none |
| Keyboard shortcuts | Settings, General | yes | `?` |
| Move between regions | none | no | F6 |

## 19. Tablet and touch

| Width and input | Layout |
|---|---|
| 1280 and wider, fine pointer | Section 1 as drawn |
| 1024 landscape | Same islands. The tools capsule drops the zoom chip into its **...** menu if the band is too narrow |
| 834 portrait | Same islands with compressed labels (icons plus accessible names for Edit and Preview, as today). Popovers that hold forms become bottom sheets |
| 390 phone | The site at its phone layout, full width (the canvas is already 390 wide, so no scaling). Navigation capsule and a compact **Publish** in the band. Dock as a bottom bar. Settings, publish panel and asset browser as bottom sheets |
| Any coarse pointer | 44 px targets (`--control-h-lg`, already applied under `pointer: coarse`), bottom-bar dock, **...** buttons always visible, no hover-only affordance |

Touch gestures:

- Tap selects. This depends on agent change A1.
- A second tap on selected text edits, the same rule as the second click.
- One-finger pan scrolls the site. The editor does not take pinch or two-finger gestures. Zoom stays on the Fit chip, so the browser's own gestures behave as owners expect.
- Long-press does nothing special. The agent cancels `contextmenu` in edit mode, and the dock already offers every action.

A hardware keyboard on a tablet gets the same shortcut table.

Phone editing replaces the Manage view. The baseline shows the Manage view blocks tasks 1 to 4 and 6 on a phone. This is a product decision for the lead. The default here is to allow editing on phones, because the agent already works at 390 px (`frameLayout` "mobile" is a 390 x 844 viewport) and every surface above has a bottom-sheet form. What the lead could choose instead: keep the Manage view on phones and move its content into the new publish panel and settings sheet unchanged.

## 20. Predicted task counts and how to check them

Predictions, not measurements. Phase H re-runs the baseline method from `../baseline/README.md` section 4 and reports the real numbers.

| # | Task | Baseline | Predicted | Where the saving comes from |
|---|---|---|---|---|
| 1 | Edit the homepage heading | 4 | 3 | Double-click edits (double-click, type, Enter) |
| 2 | Replace the hero image | 3 | 3 | Same count. The gain is naming: **Replace photo** on the banner |
| 3 | Change a button's destination | 4 | 3 | Page and part-of-page choices apply at once; the form opens next to the button |
| 4 | Switch page (Northwind) | 1 rail, 2 capsule | 2 | The rail row goes away; the capsule is visible at every width |
| 5 | Change website settings | 3 (+1 close) | 3 (+1 close) | Same |
| 6 | Preview the mobile version | 1 | 1 | Same, with the selection and scroll kept |
| 7 | Publish a change | 2 | 2 | Same, with feedback in the panel |
| 8 | Restore a previous version | 3 (+1 close) | 3 | History is inside the publish panel, so nothing is left open |

Checks for Phase H, all on the running app:

- canvasShare at 1280 x 800 with `scripts/studio/measure.js`, target 0.85 or more.
- Selection latency with the same two paths as the baseline, so the medians compare (13.2 ms to the message, 19.3 ms to the dock).
- Layout shift on load, baseline 0.289 at 1280.
- Every row of section 18 opened from its visible control in the browser, then from the palette.
