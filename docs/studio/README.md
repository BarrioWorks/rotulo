# Studio redesign

Rótulo's editor and screens, redesigned as a canvas-first creative app. The brief is `brief.md`, the plan and progress are in `PLAN.md`, and the settled decisions are in `decisions.md`.

No participants took part in any test. Every task count and finding comes from agents walking the app in a browser, labelled measured, observed, read or inferred where it appears.

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Research brief with links | `research/hci.md` (18 findings, 12 ranked recommendations), `research/apple.md` (materials, toolbars, popovers, motion) |
| 2 | Design exploration | `direction/` (three working prototypes A, B and C with screenshots, two critiques on different models, the pick in `direction/README.md`) |
| 3 | Design system | `identity/` (type, colour and material studies), `DESIGN.md`, tokens and materials in `assets/static/css/app.css` |
| 4 | Working redesign | `frontend/editor/`, `assets/views/`, `assets/static/css/` on `main` |
| 5 | Before and after screenshots | `before-after.md` (editor, tablet, phone, publishing, versions, dashboard, import) |
| 6 | UX evaluation | `evaluation/blog.md` (current record on a realistic blog), `evaluation/README.md` and `five-worst.md` (earlier rounds), `evaluation/fixes3.md` (last fix round), `baseline/README.md` (the old editor) |
| 7 | Accessibility and performance | `evaluation/blog.md` sections 2 to 4, `evaluation/README.md` section on accessibility |
| 8 | Implementation summary | Below |

## What changed for an owner

- **More room for the site.** The permanent sidebar is gone. Three floating groups sit in a 52 px band above the site: "Site / Page ▾", Images and Settings on the left; Undo, Redo, Edit/Preview, Computer/Phone, zoom and Focus in the middle; the publication state and Publish on the right. The site gets 93.5% of a 1280 x 800 window, up from 67.7% (measured on Furnace Hill).
- **Commands next to the work.** Selecting a part shows one caption: the kind, the save state ("Heading · Saved", "Editing", "Not saved"), then 3 to 5 worded actions and More. It sits below the part, or above when below would cover the text under it, and it never moves while typing. Property panels open beside it.
- **Editing in place.** A second click or Enter starts editing. Escape and Done keep the text, and Undo reverts it.
- **Pages, images and settings are one click away, version history two.** Page switcher with search, an image browser, a settings sheet from the right edge, and version history inside the publish popover. Cmd or Ctrl+K opens a command palette as an extra route.
- **Tablets and phones.** Below 900 px or on touch, tools and caption actions share one opaque 113 px bottom bar with 44 px targets. Phones can now edit; the old editor showed only a Manage screen. Target sizes were measured in the layout; real touch devices were not tested.
- **Steadier screen.** Layout shift at load fell from about 0.30 to 0 at every size, and no global control moves during any of the eight tasks (measured).
- **Every other screen** (dashboard, import, sign in and up, errors, landing) uses the same type, colour and materials.

## What the next engineer inherits

- **One surface state.** `state.ts` holds a `Surface` union (none, pages, images, panel, settings, publish), so only one floating surface is open at a time. `surfaces.ts` replaced the old `rail.ts`.
- **Placement is pure and tested.** `placement.ts` chooses the caption side once per selection by content coverage, keeps panels inside the canvas, and never covers the caption or the selection. `frontend/tests/placement.test.mjs` covers it.
- **The bottom bar has a fixed CSS height,** so nothing measures it at runtime. That removed two drift and layout-shift regressions.
- **The preview boundary is unchanged in shape, with one new message.** The site still renders in a sandboxed frame on its own origin. `request_text` lets a second click in the frame ask to edit. The editor accepts it only for the current text-capable selection, only with a fresh browser user activation, and only when the owner has not pressed anything in the editor's own controls within the 5 second activation window (`canvas.ts`, `canvas-policy.ts`). A script in the imported site can still piggyback on the owner's own clicks inside the frame. That is the same exposure the Edit text button already had, but it is weaker than before this round, when only the editor's chrome could start editing. A press in the chrome followed within 5 seconds by a second click on the site selects without editing; Edit text and Enter still work.
- **Backend changes are small.** The dashboard shows the last publication time, and the site 404 page links back to the app. Both have request tests.
- **Fixtures.** `fixtures/sites/furnace-hill/` is a realistic seven-page blog with public-domain and CC0 photos, credited in its `CREDITS.md`. `scripts/smoke.sh` passes on it and on the other three sites.
- **Checks.** `scripts/check.sh` exits 0 with 118 frontend tests, the Rust tests, the JS build check, the icon check and the glass contrast check.

## Known limits

- After a reload, Publish no longer shows how many changes are waiting, because the server does not report the count. The pill still says "Changes not published".
- Editing a heading by keyboard takes 6 key presses against 4 in the old editor.
- The publish popover may still overlap a selection at 1024 and 834, where clamping it further would leave too little room.
- The eight tasks take 23 pointer actions against 21 before: switching page and restoring a version each take one more (`evaluation/blog.md`). At 834 px the site gets 84.4% of the screen against 87.3% before, because the old editor hid its tools in a drawer.
- A replaced photo keeps its old description until the owner changes it. The editor now opens the description with a reminder, but it does not require a new one.
- The caption is placed to cover as little of the page as it can, not nothing. It can still cover part of a photo, and it hides while growing text would run under it.
- Version history sits inside the publish popover, so it is two clicks away, not one.
- Some after screenshots predate the third fix round; `before-after.md` and `evaluation/fixes3.md` say which.
- Tested in Chromium only. Safari, Firefox, real touch devices and screen readers beyond accessible names and live regions were not tested.
