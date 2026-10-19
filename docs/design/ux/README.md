# Pagehaven UX and interaction redesign

Subagent B (UX and interaction design). Owner of `docs/design/ux/` only. No app file was edited.

This document covers the full owner journey as it behaves today, scored with the Impeccable `critique` method. It ranks the problems a nontechnical owner hits, proposes an information architecture, and specifies the interactions in enough detail to build them. It does not choose colours, fonts or icon families. Subagent A owns those.

## 0. Method and provenance

Method: Assessment A was the design review, run in this context as a live journey walk. Assessment B was the detector and browser evidence, run by an isolated sub-agent. A finished before B's output was read.

- Context came from the Impeccable launcher (`impeccable context`), which loaded PRODUCT.md and DESIGN.md. Mode is **Operate** for every app surface.
- References applied: `critique.md` (Nielsen scoring, cognitive load, personas, P0 to P3), `onboard.md` (empty and first-run states), `clarify.md` (copy and errors), `distill.md` (what to remove or hide), `adapt.md` (390 px), `operate.md` (product UI rules).
- Browser: T3 Code preview (Chromium), 1280x800 and 390x844, dev server `http://127.0.0.1:5150`, fresh account "Dana Reyes" in the incognito profile.
- Walked: register (bad and good password), empty dashboard, wrong ZIP (`vite-source-only.zip`), `startbootstrap-agency.zip`, `landwind.zip`, editor (headline text, image replace with `replacement-hero.jpg`, link change, colour change, duplicate, move, hide, undo and redo by keyboard, add page, page menu, page switch, phone view), publish, open the live site, publish with no changes, edit and republish, roll back to version 1, add custom domain, keyboard-only tab order, 390 px editor and dashboard, sign out, wrong-password sign-in, sign in.
- Screenshots are in `docs/design/ux/shots/`. Files `01` to `34` are mine. Files `B-*` come from Assessment B.

## 1. Heuristic scores per surface

Scores use the critique guide: 0 to 4 per heuristic, and 4 means genuinely excellent.

### 1.1 Auth (sign up, sign in): 28/40, Good

Evidence: `shots/01-register.png`, `shots/02-register-validation.png`, `shots/34-login-error.png`.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | A wrong password shows a clear alert and keeps the email. Password length is checked only by the browser's native tooltip. |
| 2 | Real world | 4 | Plain words. |
| 3 | Control and freedom | 2 | There is no route for a forgotten password, and the screen does not say what to do instead. |
| 4 | Consistency | 3 | |
| 5 | Error prevention | 3 | The "At least 10 characters" hint is visible before typing. There is no show-password control. |
| 6 | Recognition | 3 | |
| 7 | Efficiency | 2 | No show-password toggle. Enter works. |
| 8 | Minimalist | 3 | |
| 9 | Error recovery | 3 | Focus moves to the password field after an error. |
| 10 | Help | 2 | |

### 1.2 Dashboard: 22/40, Acceptable

Evidence: `shots/03-empty-dashboard.png`, `shots/08-dashboard-two-sites.png`, `shots/33-390-dashboard.png`.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 2 | The "Published" pill stays green after a rollback, and it also stays green while there are unpublished changes. |
| 2 | Real world | 3 | |
| 3 | Control and freedom | 1 | Websites cannot be renamed, duplicated or deleted from here. The limit message says "Delete one to import another", but no delete exists anywhere (no route in `src/controllers/api.rs`). |
| 4 | Consistency | 3 | |
| 5 | Error prevention | 3 | |
| 6 | Recognition | 2 | The thumbnail is the first image in the ZIP, a portfolio watch photo, not the hero the owner recognises. |
| 7 | Efficiency | 1 | No card menu and no keyboard path beyond tabbing links. |
| 8 | Minimalist | 3 | |
| 9 | Error recovery | 2 | |
| 10 | Help | 2 | The empty state explains the next step well. |

### 1.3 Import: 26/40, Acceptable

Evidence: `shots/04-import-page.png`, `shots/05-import-source-zip-error.png`, `shots/06-import-agency-success.png`, `shots/07-import-landwind-skipped-files.png`.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | Progress, a result card with a thumbnail, and an "Imported" badge. |
| 2 | Real world | 3 | "Source code" and "built static website files" are developer words. |
| 3 | Control and freedom | 3 | Cancel and "Try another file" exist. |
| 4 | Consistency | 3 | |
| 5 | Error prevention | 2 | No help before upload on how to export from Lovable, Bolt or v0, which is the step owners get wrong. |
| 6 | Recognition | 3 | |
| 7 | Efficiency | 2 | |
| 8 | Minimalist | 3 | The optional name card sits above the dropzone and competes with the one action. |
| 9 | Error recovery | 2 | The wrong-file error names the problem but not the steps for the owner's tool. |
| 10 | Help | 2 | "4 files were left out" with code chips reads as data loss. |

### 1.4 Editor: 21/40, Acceptable, the weakest core surface

Evidence: `shots/09` to `shots/25`, `shots/28`.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 2 | A green "Saved" sits next to "Unpublished changes", two states in two places. Undo, move and duplicate give no visible feedback on the page. |
| 2 | Real world | 3 | Labels are plain ("Header", "Link", "Replace image"). The "Select parent" icon has no meaning for owners. |
| 3 | Control and freedom | 3 | Undo and redo are solid. Clicking a portfolio card in edit mode opened the site's own modal, and Escape did not close it (`shots/14`). |
| 4 | Consistency | 2 | There are two Publish buttons. The toolbar flips above or below and lands on content. Double-click edits text, but the toolbar also has "Edit text". |
| 5 | Error prevention | 2 | "Remove section" is an unlabelled trash icon next to Hide. Colour swatches are Pagehaven's palette, not the site's. A phone-view edit silently changes the computer view too. |
| 6 | Recognition | 2 | Section actions are icon-only (`shots/20`). Shortcuts are invisible. The hero background photo and the portfolio grid photos look editable but are not. |
| 7 | Efficiency | 2 | Ctrl+Z and Ctrl+Shift+Z work. There is no keyboard way to select anything on the page. |
| 8 | Minimalist | 2 | The sidebar holds pages, publish, versions, DNS records, page settings, website settings and images at once. The toolbar and its panels cover the content being edited (`shots/10`, `shots/15`, `shots/17`). |
| 9 | Error recovery | 2 | The blocked message says "created by the website's own code" for a static hover overlay, which is false and leaves no path forward. |
| 10 | Help | 1 | No hints, no shortcut sheet, no first-run cue. |

### 1.5 Publishing, versions and domains: 20/40, Acceptable, the highest-risk surface

Evidence: `shots/26`, `shots/27`, `shots/29`, `shots/30`, `shots/31`.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 2 | After "Make live" on version 1, the canvas still shows the newer draft. The only cue is "Unpublished changes". |
| 2 | Real world | 2 | "27 files · 1.3 MB", TXT, CNAME and "Edit this version" mean little to an owner. |
| 3 | Control and freedom | 3 | Rollback asks for confirmation and restore can be undone. |
| 4 | Consistency | 2 | Publish has no confirmation, but rollback does. Publishing with no changes still creates a new identical version (version 2 equals version 1). |
| 5 | Error prevention | 1 | One click puts everything live with no review. After a rollback the blue Publish button invites the owner to undo the rollback by accident. |
| 6 | Recognition | 1 | Versions cannot be told apart. Every row reads "just now · 27 files · 1.3 MB". |
| 7 | Efficiency | 2 | |
| 8 | Minimalist | 2 | DNS records wrap character by character in a 215 px column, and the sidebar grows to about 1,400 px. |
| 9 | Error recovery | 3 | The DNS check message is specific (docs/demo-qa.md). |
| 10 | Help | 2 | |

### 1.6 Cognitive load (editor)

Four of the eight checklist items fail, which the guide rates as high load. These need a critical fix.

- **Single focus.** Fails. The sidebar's Publishing section competes with editing at all times.
- **Minimal choices.** Fails. With nothing selected, the sidebar's open Publishing section shows 9 or more actions (Publish changes, Make live and Edit this version per version, the domain field, Add). The section toolbar shows 7 controls, 5 of them icon-only.
- **Progressive disclosure.** Fails. DNS records, version metadata and the domain form are shown before the owner has ever published.
- **One thing at a time.** Fails. After an image upload, the description panel opens on top of the new image, so the owner must decide on alt text before seeing the result.

### 1.7 Persona red flags

**Jordan (first-timer) and the project persona "bakery owner".**
- Double-click to edit text is undiscoverable. The first click shows a toolbar whose first chip ("Text") is a label, not a button.
- They cannot tell whether visitors can see an edit yet. "Saved" is green either way.
- They replace a hero image and cannot find it. In the Agency template the hero is a CSS background and offers only a colour picker.
- They add a page and cannot find it on the site. Nothing links to it.

**Sam (keyboard and screen reader).**
- No element on the page can be selected by keyboard (`frontend/agent/agent.ts`, the keydown handler acts only on an existing selection).
- The canvas is reached after about 30 Tab stops, with no skip link.
- After "Save link", focus falls to `BODY`.

**Casey (phone).**
- The dashboard "Edit" button leads to a dead end at 390 px (`shots/32`). The owner cannot even publish or roll back from a phone.
- Card buttons are 30 px tall, below the 44 px touch target.

**Riley (stress tester).**
- Publishing with no changes creates duplicate versions.
- A site modal opened from edit mode traps the canvas.
- Clicking "Publish" right after "Make live" silently reverts the rollback.

### 1.8 What works and must survive the redesign

- Real inline editing on the real page, with Enter to commit, Escape to cancel, and paste as plain text.
- An undo stack with named entries ("Undo: section move"), that survives reload and covers page and version operations.
- Hidden sections shown hatched with a label. This is a good draft-only affordance. It just needs to stop being clipped.
- Confirmation copy on "Make live" ("Visitors will see version 1 right away. The page you are editing does not change.") is exactly the right register.

## 2. Problems ranked by impact

Severity follows critique.md: P0 blocks the task, P1 causes serious confusion, P2 is an annoyance with a workaround, P3 is polish. Each problem names the frontend modules involved and flags any backend need.

### P0-1. The owner cannot tell what visitors see, and Publish puts everything live blind

**Observed.**
- The top bar shows "Saved" (green dot) while the sidebar shows "Unpublished changes" (`shots/28`).
- Publish sends everything live in one click, with no summary of what will change (`shots/26`).
- Publishing with nothing changed creates a new identical version.
- After "Make live" on version 1, the editor still shows version 3's text. The top Publish button turns blue and invites a click that would overwrite the rollback (`shots/30`).
- The dashboard says "Published" in every one of these states (`shots/33`).

**Why it hurts.** PRODUCT.md principle 4 is "Show state honestly". Today the owner must reconcile three indicators in three places. The most consequential action, changing the public site, has the least friction.

**Redesigned interaction.**
- One **site state** model drives one pill in the top bar. The pill has four states:
  - "Not online yet"
  - "Live · up to date"
  - "3 changes not live"
  - "Visitors see an older version"
- Save state shrinks to a quiet secondary signal inside the pill ("Saving…", or a check that fades). It is no longer a separate green dot.
- Publish opens a **review popover**. It lists the changes that are not live yet, by page, using the undo labels. It shows the address. One button, "Put these changes online", does the publish.
- When the draft matches the live site, Publish is disabled and reads "Up to date".
- After a rollback, the pill reads "Visitors see version 1". The popover offers "Put my latest changes back online" and "Load version 1 into the editor". The bare blue button never appears in this state.

**Touches.** `frontend/editor/state.ts` (new derived `SiteState`), `frontend/editor/main.ts` (`wireTopBar`), `frontend/editor/publish.ts` (`renderStatus`, publish flow), `assets/views/projects/editor.html` (top bar), `assets/views/projects/index.html` (card pill).

**Backend.** The list of changes since publish is not in the API. The frontend fallback is a client-side session log of `history.undo_label` values captured on each `save_ok`. It is exact within a session and degrades after a reload to "Changes since <time>". Recommended small API addition, flagged: `GET /api/projects/{pid}/editor` adds `changes_since_publish: [{label, page}]`. The dashboard also needs `draft_changed` per project for an honest pill. That is a template context addition in `src/controllers/pages.rs`, and it is flagged.

### P0-2. Parts of the page look editable but cannot be edited, and edit mode lets the site's own scripts run

**Observed.**
- In the Agency template, every portfolio photo sits under a hover overlay. Clicking one did two things at once. It showed "This part is created by the website's own code, so it can't be edited here", and it opened the site's Bootstrap modal inside edit mode (`shots/14`).
- Escape deselected the element but left the modal open.
- The hero photo is a CSS background, so selecting the header offers only a colour, "Background" (`shots/20`).
- The demo site's two most visible images (the hero and the grid) therefore cannot be replaced by clicking them.

**Why it hurts.** The Agency site is the planned investor demo. "Click the photo, Replace image" is the core promise, and on this site it fails on the photos people try first. The blocked message is also false for these cases. The overlay is static HTML, not script output.

**Redesigned interaction.**
- **Pick through decorative layers.** On click, the agent walks `document.elementsFromPoint(x, y)` and selects the topmost element that has a `data-ph-id` and is not purely decorative. A decorative element has no text, no `img`, and only a background colour. When the click lands on an overlay above an `img`, the image is selected and the overlay is ignored.
- **Silence site behaviour in edit mode.** Register the agent's `click`, `pointerdown`, `mousedown` and `keydown` guards on `window` in the capture phase. Call `stopImmediatePropagation` so that delegated site handlers (Bootstrap `data-bs-toggle`) never fire. Preview mode keeps today's pass-through. Why the current document-level guard did not stop the modal was not traced. That is a guess to verify while building.
- **Background images become replaceable images.** When a selected section has a computed `background-image` with a URL, the toolbar shows "Replace background photo" next to "Background colour".
- **Honest blocked message.** Two variants, chosen by what the agent can see:
  - "This part is added by the website's code while the page runs. Edit it in the tool that made your site."
  - "This is a decoration on top of a picture. Click again to select the picture underneath."

**Touches.** `frontend/agent/agent.ts` (`pick`, event guards, blocked reason), `frontend/protocol.ts` (`blocked` gains `reason: "script" | "overlay"`, and `select` info gains `bgImage: boolean`), `frontend/editor/toolbar.ts`.

**Backend.** Replacing a background image needs a new edit op, or a `set_style` key `background-image` restricted to `url(<uploaded sha>)`. This is flagged as essential for the demo site. Everything else is frontend-only.

### P1-3. The toolbar and its panels cover the content being edited

**Observed.**
- With the headline selected, the toolbar sits on top of the "Welcome To Our Studio!" subheading (`shots/10`).
- The style panel covers the subheading (`shots/18`), and the link panel covers the headline (`shots/17`).
- After an image upload, the description panel covers the new image (`shots/15`).
- For full-width sections the selection outline sits on the canvas edge and is invisible (`shots/20`). The toolbar then covers the site logo and clips the "Hidden on your website" label (`shots/22`).

**Why it hurts.** The owner cannot see the result of the change they are making. "The site is the hero" (PRODUCT.md principle 3) is broken at the moment of editing.

**Redesigned interaction.**
- **The toolbar holds verbs only.** It is one row, at most 5 visible actions, and the rest go under "More".
- **Every panel opens in the left rail, not over the canvas.** When the owner opens Style, Link, Image details or Section settings, the 248 px rail swaps from the page list to an inspector for the selected element. A back arrow and Escape return to the page list. This keeps the canvas at 1008 px at 1280 wide. DESIGN.md calls that width load-bearing because it clears Bootstrap's 992 px desktop breakpoint, so a right-hand drawer is ruled out.
- **Placement rule.** The toolbar never intersects the selection rectangle or a 16 px margin around it. Candidates are tried in order: above, below, inside the top edge for selections taller than the viewport, then pinned to the canvas top edge. The rule is a pure function of `{selectionRect, canvasRect, toolbarSize}`, so it can be tested.
- **Full-bleed selections** get an inset outline (2 px inside the canvas) plus a name tab at the top-left corner ("Header"). The name tab doubles as the drag handle in a later phase.

**Touches.** `frontend/editor/toolbar.ts` (split verbs from panels, placement function), `frontend/editor/sidebar.ts` (rail modes), `assets/views/projects/editor.html` (rail container), `frontend/agent/agent.ts` (outline inset for full-bleed).

**Backend.** None.

### P1-4. The sidebar is a junk drawer, with publishing and DNS mixed into navigation

**Observed.** The rail stacks Pages, Publishing (status, address, a second publish button, version history, domain form), Page settings, Website settings and Images. Adding a domain renders four DNS values in a 215 px column (`shots/31`). Before the first publish the owner already sees an empty version history and a domain form (`shots/09`).

**Why it hurts.** It fails the cognitive-load checks for single focus and progressive disclosure. The owner's question in the editor is "what page am I on and how do I change this", not "what is my CNAME".

**Redesigned interaction.** See the information architecture in section 3. The rail holds pages only, or the inspector. Publishing lives behind the top-bar pill and popover. History becomes a sheet. Address, domain and name move into a wide "Website settings" dialog with room for DNS records laid out as a table with copy buttons. The Images list becomes the "Choose from your website" tab of the image picker.

**Touches.** `assets/views/projects/editor.html`, `frontend/editor/sidebar.ts`, `frontend/editor/publish.ts`.

**Backend.** None.

### P1-5. Section actions are cryptic icons with no feedback, and Remove sits beside Hide

**Observed.** A selected section shows "Header · Background · ↑ ↓ ⧉ eye trash", and every icon is unlabelled (`shots/20`). Duplicate and move gave no visible change on the page. Two identical headers appeared and the view jumped (`shots/21`). Remove is one click from Hide.

**Why it hurts.** Owners cannot predict what the icons do, and a mis-click destroys a section. Undo saves them, but only if they notice.

**Redesigned interaction.**
- Section actions get text labels: "Move up", "Move down", "Duplicate", "Hide". "Remove" moves under "More".
- After any section operation, the affected section scrolls into view and its outline pulses once (200 ms, no motion under reduced motion). A toast names the result and offers Undo, for example "Section duplicated · Undo".
- A hidden section keeps its label outside the toolbar's collision zone.

**Touches.** `frontend/editor/toolbar.ts`, `frontend/ui.ts` (toast with action), `frontend/agent/agent.ts` (scroll into view and pulse via a new `reveal` message in `frontend/protocol.ts`).

**Backend.** None.

### P1-6. Image replacement hides the result and offers no library

**Observed.** "Replace image" opens the OS file picker immediately. After the upload, the description panel auto-opens on top of the new image (`shots/15`). The site's existing images (the Images sidebar section) cannot be reused. Nothing says the picture keeps the old frame or crop.

**Why it hurts.** The owner cannot check that the photo looks right before being asked to describe it. Owners often want a different photo that is already on their site.

**Redesigned interaction.** "Replace image" opens the inspector in the rail with:
- a drop target and "Choose a file";
- "From your website", a grid of existing site images taken from `GET /assets`;
- the current picture with its size, for example "Shown at 584 × 438".

After a choice the canvas updates in place through `preview_image`. The rail shows "Picture replaced · Undo" and an inline "Describe the new picture" field, prefilled with nothing and marked "Recommended". The field saves on blur or Enter and never covers the canvas.

**Touches.** `frontend/editor/toolbar.ts`, `frontend/editor/sidebar.ts` (asset grid reuse), `frontend/editor/api.ts`.

**Backend.** Reusing an existing site image needs `set_image` to accept an existing asset path as well as an upload hash. This is flagged. A frontend-only fallback re-uploads the asset bytes fetched from the preview URL, which works but stores a duplicate.

### P1-7. Adding a page creates an orphan the visitor cannot reach

**Observed.** "About us" was created as an exact copy of Home. The site menu does not link to it, and the editor says nothing about that (`shots/24`).

**Why it hurts.** The owner publishes, looks for the page, and concludes it failed.

**Redesigned interaction.**
- The add-page dialog keeps "Start from a copy of".
- On success the canvas opens the new page, and the rail shows a one-time note: "Visitors can't reach About us yet. Link to it from a button or your menu." It offers the action "Pick a button to link". That action enters a pick mode in which the next canvas click selects a link and opens its Link panel with "About us" preselected.
- The page list marks pages with no incoming links with a small "Not linked" tag.

**Touches.** `frontend/editor/sidebar.ts`, `frontend/editor/toolbar.ts` (link panel preset), `frontend/editor/state.ts` (pick mode).

**Backend.** "Not linked" detection needs an incoming-link count per page. A frontend fallback can compute it by scanning each page in a hidden fetch of the preview HTML. A cheap backend addition to the bootstrap `pages` payload (`linked: bool`) is preferred and flagged.

### P1-8. A rollback leaves the owner unsure what happened, and versions cannot be identified

**Observed.**
- Versions read "Version 2 · just now · 27 files · 1.3 MB". Each has "Make live" and "Edit this version" (`shots/29`).
- After "Make live", the canvas still shows the newer draft (`shots/30`).
- "Edit this version" on the live row means "load into editor", which owners will read as "edit the live site".

**Why it hurts.** Rollback exists to calm a panicked owner. Today it raises a second question: did it work?

**Redesigned interaction.**
- **A History sheet.** It is a drawer from the right, 420 px, over the canvas, with a scrim. Opening it pauses editing.
- **Rows** read "Version 3 · Today 14:20 · Live", followed by the change summary from P0-1 (for example "Changed headline, replaced 1 picture"). The file count and byte size are removed.
- **Row actions:** "Show visitors this version" (was Make live) and "Open in editor" (was Edit this version). Both have confirmations that state the consequence.
- **After a rollback,** a persistent canvas banner reads "Visitors see version 1. You're editing newer changes." It offers "Put my latest changes online" and "Open version 1 in the editor". The top-bar pill matches (P0-1).

**Touches.** `frontend/editor/publish.ts`, `assets/views/projects/editor.html`, `frontend/editor/state.ts`.

**Backend.** The per-version change summary needs the release to store the change labels at publish time. This is flagged. Fallback: absolute time and the version number only, with file counts removed. "Preview this version" needs a per-release preview URL and is flagged as optional.

### P1-9. Keyboard users cannot edit the page at all

**Observed.**
- The tab order runs through about 30 controls (top bar, pages, publishing, versions, DNS copy buttons) before the canvas.
- Inside the canvas only the site's own links and buttons take focus, and focusing one does not select it.
- After "Save link", `document.activeElement` is `BODY`.
- There is no skip link and no shortcut sheet.

**Why it hurts.** It fails WCAG 2.1.1 (Keyboard) for the core task. The brief targets WCAG 2.2 AA.

**Redesigned interaction.** See spec S11.

**Touches.** `frontend/agent/agent.ts`, `frontend/protocol.ts`, `frontend/editor/main.ts`, `frontend/editor/toolbar.ts`.

**Backend.** None.

### P2-10. The phone is a dead end

**Observed.** At 390 px the editor shows "The editor needs a bigger screen" and nothing else (`shots/32`). The dashboard card still offers "Edit" (`shots/33`). Card buttons are 30 px tall.

**Why it hurts.** The owner sees a typo on their live site from their phone and cannot even roll back or open the history.

**Redesigned interaction.** Under 900 px the editor route becomes **Manage**. It shows the site state pill, "View website", the address with Copy, and Publish with review. It also shows the History list with "Show visitors this version", and a note "To change text and pictures, open Pagehaven on a computer". On the dashboard, under 900 px, "Edit" is relabelled "Manage", and every target is 44 px.

**Touches.** `assets/views/projects/editor.html`, `frontend/editor/main.ts` (a reduced boot that skips the canvas), `frontend/editor/publish.ts`, `assets/views/projects/index.html`.

**Backend.** None. The existing release APIs are enough.

### P2-11. The dashboard cannot manage websites

**Observed.** No rename, duplicate or delete. The limit message tells the owner to delete. The thumbnail is the first image in the ZIP. The pill does not reflect unpublished changes or a rollback.

**Redesigned interaction.**
- Each card gets a "More" menu (Rename, Website settings, Delete). Delete requires typing the website name and states "The address <x> stops working. Versions are deleted."
- The whole card is the link into the editor.
- Status uses the same four-state language as the editor pill.

**Touches.** `assets/views/projects/index.html`, `frontend/app.ts` (menu behaviour), `frontend/ui.ts`.

**Backend.** Delete project is **essential and missing**, and is flagged. The limit copy promises it. Rename can reuse `POST /settings`. A hero-based thumbnail is optional and flagged.

### P2-12. First publish picks the address for the owner

**Observed.** The first publish went live at `agency-5.sites…`, an auto-suffixed address the owner never chose. Changing it is buried in "Website settings" as "Web address" with a slug pattern hint.

**Redesigned interaction.** The first Publish review popover includes "Your address" with the editable name part and a live availability check on blur. Later publishes show the address read-only, with "Change" leading to Website settings.

**Touches.** `frontend/editor/publish.ts`.

**Backend.** Uses the existing `POST /settings`. An availability check endpoint is optional and flagged, because the fallback is to submit and show the 422 message inline.

### P2-13. Copy and error messages leak developer terms or alarm the owner

| Where | Today | Proposed |
|---|---|---|
| Wrong ZIP (`shots/05`) | "This ZIP contains source code rather than a finished website. Export the built static website files and try again." | "This ZIP has the project's code, not the finished website. In Lovable, Bolt or v0, use Download or Export site, then upload that ZIP." Add a disclosure "How do I export from my tool?" with one line per tool. |
| Skipped files (`shots/07`) | "4 files were left out" plus code chips | "Ready. We left out 4 files your website doesn't need." Code chips go behind "Show details". |
| Blocked click (`shots/14`) | "This part is created by the website's own code, so it can't be edited here." | The two variants in P0-2. |
| Version row | "just now · 27 files · 1.3 MB" | "Today 14:20 · Live", plus the change summary. |
| Publish toast | "Your website is live at agency-5.sites.localhost:5150" | "Your changes are online." Add an action "View website". The address stays in the pill and popover. |
| Sign in | No path for a forgotten password | "Forgot your password? Contact support at <address>." The text is placeholder until a reset flow exists. Do not invent a reset flow. |
| Conflict dialog | Fine. Keep it. | |

**Touches.** `assets/views/projects/new.html`, `frontend/import.ts`, `frontend/agent/agent.ts`, `frontend/editor/publish.ts`, `assets/views/auth/login.html`.

### P3-14. Smaller interaction defects found on the walk

- The toolbar's first chip ("Text", "Link", "Header") looks like a button but is a label. For links, the label "Link" and the button "Link" sit side by side.
- Double-click to edit is the fast path but is never taught. Spec S3 adds a hover hint.
- Style swatches are a fixed Pagehaven palette. Lead with "Colours on this page", sampled by the agent from computed colours of the selected element's siblings and section. Keep the fixed palette under "More colours".
- Phone view is a preview, but edits made there apply everywhere. Show a one-time note: "Changes made here also apply on computers."
- After an inline edit commits, a stale hover outline stays on the previous element (`shots/30`).

## 3. Information architecture

### 3.1 Editor

| Layer | Contents | Rule |
|---|---|---|
| **Always visible: top bar** | Back to websites. Site name. Page switcher ("Home ▾"). Undo and Redo. Computer/Phone toggle. Edit/Preview toggle. Site state pill (holds save state). Publish button. | One filled primary button, and only when there is something to publish. |
| **Always visible: left rail, Pages mode** | Page list with current page highlighted. "Not linked" tags. Add page. Each row's "More" menu (Rename, Duplicate, Page settings, Delete). | The rail is navigation only. Publishing never appears here. |
| **Always visible: canvas** | The site at true width. | Nothing Pagehaven draws covers the selection. |
| **On hover** | Outline plus a name tab ("Heading", "Picture", "Section"). After 600 ms of hover on a text element, a hint "Double-click to edit". It is shown at most three times per user, tracked in `localStorage`. | |
| **On selection: contextual toolbar** | At most 5 labelled verbs for the element type, then "More". Text: Edit text, Style, Link (if applicable), More. Picture: Replace, Description, More. Link or button: Edit text, Link, Style, More. Section: Move up, Move down, Duplicate, Hide, More (Remove, Background, Select inside). | Verbs only. Anything with fields opens in the rail. |
| **On panel open: left rail, Inspector mode** | Style (colour, size, weight, alignment, spacing). Link (page on this site, web address, email, phone, new tab). Picture (replace, from your website, description). Section (background colour or photo). | Back arrow and Escape return to Pages mode. Focus moves into the inspector, and returns to the toolbar verb on close. |
| **Behind disclosure: popovers and sheets** | Publish review popover (from the Publish button or pill). History sheet (from the pill's "History" link and the shortcut). Website settings dialog (name, address, own domain with DNS table), opened from the site-name menu in the top bar. Shortcut sheet (`?`). | Sheets cover the canvas with a scrim and pause selection. |

### 3.2 Dashboard

- **Always visible:** heading, the primary "Import website" button, and site cards. Each card has a thumbnail, name, four-state pill, the address once published, and "Edit" (or "Manage" under 900 px).
- **Behind each card's "More":** Rename, Website settings, View website, Delete.
- **Empty state:** keep the current copy pattern. Add "How do I get a ZIP?" as a disclosure with one line per tool. Keep a single primary action.

### 3.3 Import

Order: dropzone first (the one action), then the optional name as a small field under the dropzone ("Name, optional"), then a requirements line.

Result state:
- the thumbnail;
- "Ready to edit";
- the page count;
- "Open editor" as primary;
- skipped files collapsed behind "Show details".

The "Which folder is your website?" step stays and is good.

### 3.4 Publishing

Publishing has no permanent home in the rail. It lives in:

- the site state pill;
- the Publish review popover (first publish includes choosing the address);
- the History sheet;
- the post-rollback canvas banner;
- Website settings for the address and own domain.

The domain DNS records get a table at a readable width with copy buttons. Status words: "Waiting for your domain settings", "Connected".

### 3.5 Auth

Keep the single centred card. Add a show-password toggle (a labelled button, not an icon alone) and the forgotten-password line from P2-13. Show the password rule as the field description (`aria-describedby`, already present) and validate it inline on blur, so it does not rely only on the browser tooltip.

## 4. Interaction specs

Shared rules for all specs.

- **Motion.** 120 to 200 ms ease-out for appear and disappear, and 0 ms under `prefers-reduced-motion: reduce`. The global rule in `app.css` already zeroes transitions, so new motion must not rely on JavaScript timers for state. No motion delays input. A control is interactive the moment it is drawn.
- **Focus.** Every popover, sheet and dialog moves focus to its first meaningful control on open. Escape closes it, and focus returns to the control that opened it. Use `<dialog>` for sheets and dialogs. Use the `popover` attribute or a positioned element with roving focus for menus.
- **Announcements.** One polite live region (`role="status"`, already in `editor.html`) announces state changes. Examples: "Saved", "3 changes not live", "Section duplicated", "Version 1 is now what visitors see". Errors use `role="alert"`.
- **Protocol.** New editor and agent messages go into `frontend/protocol.ts` with schema validation, like the existing ones. None weakens origin checks.

### S1. Site state model and pill

Data shape, in `frontend/editor/state.ts`:

```ts
type SiteState =
  | { kind: "never_published" }
  | { kind: "up_to_date"; live: number }
  | { kind: "changes_not_live"; live: number; count: number }
  | { kind: "older_version_live"; live: number; latest: number; draftChanged: boolean };
type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved_recently"; at: number } | { kind: "failed"; message: string };
```

`SiteState` is derived from `project.live_release`, `releases`, `draftChanged` and the session change log. It is never stored. `older_version_live` applies when `live.number < max(releases.number)`.

Pill text and behaviour:

| SiteState | Pill | Publish button |
|---|---|---|
| never_published | "Not online yet" | Primary, "Publish" |
| up_to_date | "Live · up to date" | Secondary and disabled, "Up to date" |
| changes_not_live | "N changes not live" | Primary, "Publish" |
| older_version_live | "Visitors see version N" | Secondary, "Review" |

- SaveState renders inside the pill as a leading glyph: a spinner while saving, a check for 2 s after a save, then nothing. A failed save replaces the pill text with "Not saved · Retry" and announces it with `role=alert`.
- The pill is a button. It opens the Publish review popover (S2).
- **Keyboard:** reachable in the top-bar tab order. Ctrl/Cmd+Shift+P opens the review popover.
- **Touches:** `state.ts`, `main.ts` (`wireTopBar`), `publish.ts`, `editor.html`.

### S2. Publish review popover

- **Trigger:** the Publish button, the pill, or Ctrl/Cmd+Shift+P.
- **Placement:** anchored under the top-bar right cluster, 360 px wide.
- **Content when there are changes:**
  - the title "Put your changes online?";
  - the address (editable on first publish, see P2-12);
  - the change list grouped by page, up to 8 rows plus "and N more";
  - a primary "Publish" and a ghost "Cancel".
- **Content when up to date:** "Everything is online." plus "View website". There is no publish button, so empty versions cannot be created.
- **Content when an older version is live:** "Visitors see version 1. Your editor has newer changes." Offers a primary "Publish my latest changes" and a secondary "Open version 1 in the editor".
- **While publishing:** the primary button shows a spinner and the label "Publishing…". Inputs are disabled.
- **Success:** the popover closes and a toast reads "Your changes are online" with the action "View website". The pill reads "Live · up to date".
- **Failure (422):** the popover stays open and the server message shows inline under the title with `role=alert`.
- **Focus:** moves to the primary button on open (or the address field on first publish), and returns to the trigger on close.
- **Touches:** `publish.ts`, `ui.ts` (toast action), `editor.html`.

### S3. Selection, hover hint and contextual toolbar

- **Hover:** outline plus name tab. After 600 ms on an unselected text element, the hint "Double-click to edit" appears in the name tab, at most 3 times ever (`localStorage['ph.hint.dblclick']`).
- **Single click:** selects and shows the toolbar.
- **Double-click, or Enter on a selected text element:** starts inline editing. This matches today's behaviour.
- **Toolbar content:** see the table in 3.1. Verbs have text labels and icons are optional. "More" opens a menu (`role=menu`, arrow keys, Escape closes).
- **Placement:** the function `placeToolbar({sel, canvas, size}) → {x, y, side}` tries above, below, inside-top, then pinned. It must not intersect `sel` inflated by 16 px. It is re-run on `viewport` messages. It is a pure function with unit tests in `frontend/tests/editor.test.mjs`.
- **Full-bleed selection:** when `sel.width >= canvas.width - 4`, draw an inset outline and put the name tab inside the top-left corner.
- **Escape:** closes the open panel, otherwise exits text editing, otherwise selects the parent, otherwise deselects. Each press climbs one level. This replaces the separate "Select parent" icon, which moves under More as "Select the part around this".
- **Reduced motion:** the toolbar appears without the slide and keeps its opacity fade at 0 ms.
- **Touches:** `toolbar.ts`, `agent.ts`, `protocol.ts`, `main.ts` (Escape chain).

### S4. Rail as inspector

- **Modes:** `{ kind: "pages" } | { kind: "inspector"; panel: "style" | "link" | "picture" | "section"; element: string }`.
- **Entry:** a toolbar verb that has fields, or a keyboard shortcut (Ctrl/Cmd+K opens Link for a link or button).
- **Header:** a back arrow labelled "Pages", plus the element name ("Heading · Home").
- **Exit:** the back button, Escape (when focus is inside the rail), selecting another element (the panel re-targets if it applies, otherwise it closes), or deselecting.
- **Live preview:** controls apply through the existing `preview_*` messages. Commits use the existing edit ops. Text and number fields commit on blur or Enter. Swatches and toggles commit immediately. That is today's behaviour, moved into the rail.
- **Focus:** the first control on entry, and back to the triggering toolbar verb on exit.
- **Touches:** `sidebar.ts`, `toolbar.ts` (panel code moves), `state.ts` (the new `rail` field), `editor.html`.

### S5. Section actions and feedback

- **Section toolbar:** "Move up", "Move down", "Duplicate", "Hide" (or "Show" when hidden), then "More" (Remove, Background, Select inside). Each label is visible. Under 1000 px the labels collapse to icons with tooltips and `aria-label`.
- **After move or duplicate:** the agent receives `reveal {element}`. It scrolls the element into view (instantly under reduced motion, otherwise smooth) and pulses its outline once for 200 ms. A toast reads "Section moved down · Undo".
- **Remove:** no confirmation dialog. Apply it, then show the toast "Section removed · Undo" for 8 s. The Undo action calls the existing undo. clarify.md says to prefer undo over confirmation when recovery is safe, and it is safe here.
- **Shortcuts with a section selected:** Alt+↑ and Alt+↓ move. Ctrl/Cmd+D duplicates. Ctrl/Cmd+Shift+H hides or shows.
- **Touches:** `toolbar.ts`, `ui.ts` (`toast(message, {action})`), `agent.ts`, `protocol.ts`.

### S6. Picture replacement

- **Trigger:** the "Replace" verb, or a file dragged from the desktop onto a selected picture. The editor drop target sits over the canvas frame while dragging, and the agent already blocks site drops in edit mode.
- **Rail content:** a dropzone with "Choose a file". "From your website" is a 3-column grid from `GET /assets` filtered to images, lazy-loaded, each tile a button with the file name as its accessible name. The current picture's shown size appears as "Shown at W × H".
- **States:**
  - uploading: a progress bar on the tile or dropzone;
  - applied: the canvas shows the new picture via `preview_image`, the rail shows "Picture replaced · Undo", and a "Describe the new picture" field appears, marked Recommended;
  - error: an inline message from the server, for example the type or size limit, with "Choose another".
- **Description:** saves on blur or Enter through `set_alt`, and is announced as "Description saved". It never auto-focuses over the canvas. Focus stays on the "Picture replaced" status so the owner can look first.
- **Touches:** `toolbar.ts`, `sidebar.ts`, `api.ts`.
- **Backend:** reuse of an existing asset needs a flag (P1-6).

### S7. Link editor

- **Rail content:** a segmented control with "A page", "A web address", "Email", "Phone".
  - "A page" lists the site's pages. If the current link is an anchor on this page, it also lists the page's sections by heading text ("Services", "Portfolio"). Today the agent reads anchors as a raw "#services" value under "Web address" (`shots/17`).
  - "Open in a new tab" is a switch.
- **Validation:** inline, on blur. Unsafe schemes keep today's message.
- **Save:** Enter or the "Save link" button. After saving, focus returns to the toolbar's "Link" verb (today it falls to BODY), and the status announces "Link saved".
- **Follow link:** an internal link shows a secondary action "Go to page" that switches the canvas page. This is the edit-mode way to follow site navigation.
- **Touches:** `toolbar.ts` (`classifyHref` already distinguishes anchors), `agent.ts` (list section ids with headings), `protocol.ts`.

### S8. Page switching and adding pages

- **Top-bar page switcher:** a button "Home ▾" opens a menu listing pages, then a separator, then "Add page…". Type-ahead is supported. The current page is marked with `aria-current`.
- **Shortcut:** Ctrl/Cmd+P is avoided because it is the browser's print. Use Ctrl/Cmd+Shift+O to open the page switcher.
- **Rail:** the page list stays. A "Not linked" tag shows where applicable (P1-7).
- **Add page dialog:** keep today's dialog (`shots/23`). Rename "Page name" to "Name of the page". Keep the live "Its address will end in /about-us.html" hint. After creation, the follow-up note and "Pick a button to link" pick mode apply. In pick mode the canvas cursor is a crosshair, a banner reads "Click the button or menu item that should open About us", and Escape cancels.
- **Touches:** `main.ts`, `sidebar.ts`, `toolbar.ts`, `state.ts`, `editor.html`.

### S9. History sheet and rollback

- **Trigger:** "History" in the publish popover and in the pill menu, or Ctrl/Cmd+Shift+H while no section is selected.
- **Sheet:** a `<dialog>` 420 px wide on the right. Rows are newest first. The live row is marked "Live" in text, not by colour alone.
- **Row actions:** "Show visitors this version" and "Open in editor". Both open a confirm dialog that names the action on its button. Copy:
  - "Visitors will see version N right away. Your editor keeps your newer changes."
  - "Your editor will show version N. You can get your current changes back with Undo."
- **After "Show visitors this version":** the sheet stays open with the row updated, a toast reads "Version N is what visitors see", and the canvas banner appears (P1-8) after the sheet closes.
- **Focus:** the first row on open, and back to the trigger on close.
- **Touches:** `publish.ts`, `editor.html`.

### S10. Website settings dialog (name, address, own domain)

- **Trigger:** the site-name menu in the top bar ("Website settings"), or the dashboard card "More".
- **Layout:** a `<dialog>` 640 px wide with three groups.
  1. **Name.**
  2. **Address:** the slug field with suffix, availability errors inline.
  3. **Your own domain:** a hostname field and an "Add" button. Each domain shows a row with its status and a two-row DNS table (Type, Name, Value, Copy). Copy buttons announce "Copied". "Check now" shows the last result inline. Under 520 px the table stacks.
- **Visibility:** hidden when `features.custom_domains` is false, as today.
- **Touches:** `publish.ts` (domain code moves), `sidebar.ts` (settings code moves), `editor.html`.

### S11. Keyboard model and shortcuts

Regions and the skip link:
- The first Tab stop is a visible-on-focus "Skip to page" link.
- F6 and Shift+F6 cycle through top bar, rail, canvas and toolbar.

Canvas navigation:
- When the canvas iframe receives focus, the agent focuses a virtual cursor on the first element with `data-ph-id` in DOM order and selects it.
- Tab and Shift+Tab move to the next or previous editable element. They do not move between the site's own focusable controls while in edit mode.
- Enter edits text, or opens the primary verb for pictures and links.
- Escape follows the chain from S3. When nothing is selected, Escape moves focus to the toolbar region.
- The agent keeps the list of `[data-ph-id]` elements ordered by `compareDocumentPosition` and refreshes it on mutation.
- Selection by keyboard sends the same `select` message as a click, so the editor code does not change.

Toolbar:
- `role=toolbar` with roving tabindex. Left and Right arrows move between verbs. Tab leaves the toolbar.
- Ctrl/Cmd+. (period) moves focus from the canvas to the toolbar, and Escape returns to the canvas.

Shortcuts, all listed in a `?` sheet:

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Enter | Edit the selection |
| Escape | Go up one level |
| Tab / Shift+Tab | Next or previous element (canvas) |
| Alt+↑ / Alt+↓ | Move section |
| Ctrl/Cmd+D | Duplicate section |
| Ctrl/Cmd+K | Link |
| Ctrl/Cmd+Shift+O | Switch page |
| Ctrl/Cmd+Shift+P | Review and publish |
| Ctrl/Cmd+Shift+H | History (no section selected) |
| Ctrl/Cmd+S | Show "Everything saves automatically" |
| Ctrl/Cmd+\\ | Computer/Phone toggle |
| ? | Shortcut sheet |

Owners press Ctrl+S by habit, so it is intercepted and shown as reassurance, never as an error.

- **Forwarding:** the agent forwards these keys from inside the iframe through the existing `shortcut` message, widened from `"undo" | "redo"` to the action list above. Text editing keeps its own keys (Enter, Shift+Enter, Escape, Ctrl+B, Ctrl+I).
- **Focus return rule:** any panel, menu, popover or dialog returns focus to its trigger on close. After a commit that removes the trigger (for example Remove section), focus goes to the toast's Undo action.
- **Touches:** `agent.ts`, `protocol.ts`, `main.ts`, `toolbar.ts`, `editor.html`.

### S12. Toasts with actions

- **API:** `toast(message, { kind?: "info" | "error", action?: { label, run } , ms? })`.
- **Behaviour:** toasts with an action stay for 8 s and pause while hovered or focused. Ctrl/Cmd+Z works in the meantime. At most 2 toasts are shown at once, and the older one leaves first.
- **Accessibility:** the host is a polite live region and error toasts are assertive. The action is a real button that is reachable from the canvas via F6.
- **Touches:** `frontend/ui.ts`.

### S13. Import flow

- **States:** idle, dragging over, uploading (progress), checking ("Checking your files…", indeterminate), choose folder, error, done.
- **Copy:** see P2-13. The tool-specific export help is a `<details>` under the dropzone that is closed by default.
- **Done:** focus moves to "Open editor". Skipped files sit behind "Show details", which is a `<details>`.
- **Keyboard:** the dropzone label is focusable and Enter or Space opens the file picker. `docs/demo-qa.md` saw a text-locator click time out on "Choose a file", which is worth verifying while building.
- **Touches:** `assets/views/projects/new.html`, `frontend/import.ts`.

### S14. Dashboard card

- **Card:** the whole card is one link to the editor, with an accessible name of "Edit <name>". It contains the thumbnail, name, state pill, address link, and a "More" menu button. Interactive children are placed so they do not nest inside the link.
- **More menu:** `role=menu` with Rename (inline field), Website settings (opens S10 in a dialog on the dashboard), View website, and Delete (type the name to confirm, flagged backend).
- **Touch:** under 900 px, targets are 44 px and "Edit" reads "Manage".
- **Touches:** `assets/views/projects/index.html`, `frontend/app.ts`.

### S15. Manage mode under 900 px

- **Layout:** one column. It shows the site state pill, the address with Copy and View, the Publish review (S2) inline, and History (S9) inline with full-width rows. A note at the bottom reads "To change text and pictures, open Pagehaven on a computer."
- **Behaviour:** it boots without the canvas or agent (`main.ts` checks `matchMedia('(max-width: 899px)')`). If the viewport grows past 900 px it offers "Open the editor" rather than hot-swapping.
- **Touches:** `editor.html`, `main.ts`, `publish.ts`, `app.css` (layout).

## 5. Backend and API changes flagged

Everything else in this document is frontend-only.

| Need | Why | Essential? | Frontend fallback |
|---|---|---|---|
| Delete website (`POST /api/projects/{pid}/delete`) | The limit message promises it, and owners cannot clean up | **Yes** | None |
| Replace a section's background photo (new op or `set_style` `background-image: url(<upload>)`) | The Agency hero, the investor demo, cannot change its main photo | **Yes, for the demo** | None |
| `changes_since_publish` in the bootstrap | Honest publish review across reloads | Recommended | Session log of undo labels |
| Per-release change labels | Identify versions in History | Recommended | Absolute time only |
| `draft_changed` per project in the dashboard context | Honest dashboard pill | Recommended | None (the pill stays coarse) |
| `set_image` accepting an existing asset path | "From your website" image reuse | Optional | Re-upload fetched bytes |
| `linked: bool` per page | "Not linked" tag | Optional | Scan preview HTML client-side |
| Slug availability check | Address choice on first publish | Optional | Submit and show the 422 inline |
| Per-release preview URL | "Preview this version" | Optional | Leave out |
| Hero-based thumbnail | Recognisable dashboard cards | Optional | None |

## 6. Detector and browser evidence (Assessment B)

- `impeccable detect --json assets/views` found 12 findings: 8 `design-system-color`, 2 `design-system-font-size`, 1 `design-system-radius`, 1 `marquee`.
- **Likely false positives (inferred):**
  - The 8 colour findings report black text at line 0. The template scan runs without `app.css`.
  - `marquee` is the indeterminate progress bar (`app.css:427`), and it is already neutralised under reduced motion.
  - The `site_not_found.html` size and radius advisories come from a standalone page with its own inline style, so they may be intentional.
- **Rendered fallback findings** (`/`, `/login`, `/register`, `/projects`):
  - `cramped-padding` on the landing mock window (`home.html:28-29`), which is Subagent A's territory;
  - `icon-tile-stack` on the empty dashboard (`.empty-art`, `projects/index.html:80`). This agrees with my onboarding note: the sparkle tile adds nothing, and a "How do I get a ZIP?" disclosure would earn that space.
- **In-page overlay:** not available. The app's CSP (`script-src 'self'; connect-src 'self'`) blocked the injected detector and its WebAssembly. That is the correct security posture and should not be loosened for tooling. No user-visible overlay exists.
- **Screenshots:** `shots/B-projects-empty.png`, `shots/B-projects-new.png`.

## 7. Not tested

- Drag-and-drop of a ZIP. I used the file input.
- Landwind beyond import and the dashboard card.
- Page rename and delete. I only opened the page menu.
- Preview mode clicks, and the stale-tab conflict dialog (`docs/demo-qa.md` covers it).
- A real screen reader, 200% zoom, and browsers other than Chromium.
- Why the Bootstrap modal opened despite the agent's capture-phase click guard. The cause is a guess (see P0-2), and the symptom is observed (`shots/14`).

Questions skipped: this is a delegated sub-agent deliverable, and the parent owns the user decisions. The questions to put to the user are listed below.

- Is a backend change for background photos acceptable for the demo?
- Should Delete website ship in this redesign?
- Should the rail-as-inspector approach be prototyped against a right-hand drawer first? The drawer would cost the 992 px canvas width.
