# Direction A. Floating Studio

A throwaway browser prototype. It is a way to compare the directions, not code to ship.

## Run it

```sh
mkdir -p /tmp/dir-a/fonts
cp docs/studio/direction/a/{index.html,a.css,a.js} /tmp/dir-a/
cp /tmp/studio-fonts/gf/onest-latin.woff2 /tmp/dir-a/fonts/
python3 -m http.server 8701 --bind 127.0.0.1 --directory /tmp/dir-a
```

Open `http://127.0.0.1:8701/index.html`. The canvas is a real iframe of `http://agency-15.sites.localhost:5150/`. The site is cross-origin, so the selection overlay is drawn at rects measured once at 1280, 1024, 834 and 390. Three parts can be selected: the hero heading, the "Tell Me More" button and the first portfolio picture.

URL switches for screenshots: `?sel=heading|button|image`, `&saved=1`, `?edit=1`, `?open=pages|settings|publish|replace|palette`, `?device=phone`, `?focus=1`, `?top=over` (no band, islands float over the site).

## Concept

The imported site fills the window from edge to edge, and Pagehaven appears as three small glass islands plus one dock. The "Agency / Home" capsule at top left holds the website and page, the tools capsule at top centre holds undo, redo, Edit/Preview, Computer/Phone, zoom and focus mode, and the publish capsule at top right states the publishing situation in words next to the Publish button. A slim 52 px band of workspace grey sits behind the islands, so the canvas starts below it and the site's own navigation is never covered at rest. When something is selected, a dock with that kind's three labelled actions plus More appears next to it, below by default and flipped above only at the canvas edge, and the selection label above the ring carries the save state. Everything else (page switcher, publish and versions, property popovers, the palette) opens on demand from the island or dock that owns it, and focus mode removes even the islands.

## Answers to the open questions in decisions.md

**How the canvas is framed.** A reserved slim band with floating islands. The band is 52 px (40 px capsule plus 6 px margin above and below) in the workspace grey. The canvas starts under it. I tried the alternative with islands floating over the site with no band (`?top=over`, also in the palette under "Prototype"). That reaches a canvasShare of 1.0, but at rest the islands sit on the Agency site's own menu (SERVICES to CONTACT at y 28 to 67), which repeats the baseline defect "the toolbar docks over the site's own navigation". The band costs 6.5 percent of the viewport and fixes that defect for every site. Focus mode drops the band to 0 for a full-bleed view.

**Where the contextual commands live.** Next to the selection. The dock prefers to sit below the ring and flips above only when there is no room below in the canvas. It is centred on the selection and clamped to the window. While a text session is open it does not move (decision 3). When the selection scrolls out of view, the dock parks at the bottom of the canvas with a "Heading is above" pill that scrolls back to it. Popovers opened from the dock (Style, Link, Replace) go on the dock's far side from the selection or beside it. A script checks that they never overlap the ring.

**Page switcher, settings sheet, publish surface.**
- The page switcher is a popover under the nav capsule. It has a search field, one row per page with path and summary, a check on the current page, a `...` menu per row (Rename, Duplicate, Page settings, Delete) and "Add a page..." at the foot. Arrow keys and Enter work in it.
- Settings is a Level 3 modal sheet with vertical tabs (General, Pages, Assets, Domains, Publishing, Versions). It opens from the gear and from the site name. On phones the tabs become a horizontal strip and the sheet goes full height.
- Publish is a popover under the publish capsule. It lists the unpublished changes, gives the address, has one "Publish 2 changes" button and then a Versions list with "Make live" on each older version. "Make live" opens the only alert dialog in the flow. "All versions" opens the Versions tab of settings.

**Tablet and phone.** At 900 px and below (the 834 portrait iPad and phones) the tools island moves to a bottom bar within thumb reach, with 44 px targets. The nav and publish capsules stay at the top. Zoom and focus fold into the tools `...` menu. The dock pins just above the bottom bar instead of floating next to the selection, so it never lands under a finger or the keyboard. Popovers become bottom sheets. On a 390 phone the "Agency /" crumb, the status words and the device switch drop out, and Publish keeps its count. At 1024 landscape the desktop arrangement stays, the status text shortens to "2 changes" and focus mode moves into `...`.

## Baseline fixes owed

| Fix | State in this prototype |
|---|---|
| Layout shift at load | measure.js reports `layoutShift: 0`. The frame height is set before load from the measured document height. A real build needs the height from the import record. |
| Web address `pattern` invalid under `v` | `[a-z0-9\-]{3,32}` compiles with the `v` flag (checked in Node). |
| Phone view loses the selection | `setDevice` keeps `state.sel` and scrolls it into view. |
| Toolbar over the site's navigation | The band answers it. |
| `touchend` cancelled in `agent.ts` | Not reachable from a cross-origin prototype. Untested. |
| Banner photo missing from the image list | The heading and button More menus have "Replace banner photo". The prototype only shows a toast for it. |

## Measurement

`scripts/studio/measure.js`, run in the page at 1280x800, resting state:

| Field | Value |
|---|---|
| canvasShare | **0.935** (canvas 1280x748 from y 52) |
| canvasShare with `?top=over` | 1.0 (same script logic, run inline) |
| persistentPanels | one, the nav capsule (222x40). It matched only because it is a `nav` element. It floats in the band and takes no canvas space. |
| layoutShift | 0 |
| domNodes | 224 |
| heapMB | 9.5 |

## Interaction check

A script (`/tmp/dir-a-tools/check.js`, outside the repo) drives the 1280 page and reports these results, all passing:

- The page switcher opens 14 px under the nav capsule. Its search filters "port" to 1 row. The row `...` menu opens, the first Escape closes only that menu, and the second closes the switcher.
- Publish opens 14 px under its capsule and shows 3 versions. "Make live" opens the confirm. A pointerdown inside the confirm leaves the popover open (the outside-click fix). Cancel returns to the popover. Publish ends with "Live · version 4 · just now", and an outside click closes it.
- Settings opens with all six sections, and each tab renders its panel.
- Clicking the heading selects it. The dock reads "Edit text, Style, Link, More" and does not overlap the ring. A second click enters editing with "B I Link Done". Ctrl+B toggles bold. Enter commits, and the label goes "Heading · Saved". The Style popover does not overlap the ring.
- The arrow keys reach the picture. Replace opens with 6 thumbnails, does not overlap the ring, and closes on Escape.
- Ctrl+K opens the palette (24 commands). Typing "domains" and pressing Enter opens Settings on Domains.
- Ctrl+. hides the islands and shows "Back to editing". Escape brings them back, and so does a click on the pill.

At 390 the switcher, publish and replace become bottom sheets, and settings becomes a full-height sheet. Real key presses (ArrowDown, Enter, Enter, Ctrl+K, Escape) select, edit, save, open the palette and close it.

This round found and fixed one bug. Pressing Enter on the canvas started editing, then the same keydown bubbled to the document handler, which ended editing at once. Keyboard users could not edit. The canvas handler now stops propagation.

## Self-assessment

Action counts are predictions from walking the prototype at 1280. No participants were involved. A deliberate action is one click, tap or key chord. Typing the new content is not counted.

| Task (brief section 15) | Path | Actions |
|---|---|---|
| 1. Edit the homepage heading | click heading, click again, type, Enter | 3 |
| 2. Replace the hero image | the banner is a CSS background. Select heading, More, Replace banner photo, Upload | 4 (3 for a normal picture: select, Replace, Upload) |
| 3. Change a button's destination | select button, Link (shows "Contact Us section" in the dock), Goes to, choose | 4 |
| 4. Switch page | Home capsule, Services | 2 (Ctrl+K, type, Enter is 3) |
| 5. Change website settings | gear, edit the field, Save | 3 (4 if the field is not in General) |
| 6. Preview the mobile version | Phone icon, then Preview | 1 to 2 |
| 7. Publish a change | Publish, "Publish 2 changes" | 2 |
| 8. Restore a previous version | Publish capsule, Make live, confirm | 3 |

| Criterion | Rating | Evidence and weaknesses |
|---|---|---|
| Canvas visibility | Strong | canvasShare 0.935 at rest and 1.0 in focus mode. No side panel at any width. The weakness is that popovers and the dock still cover parts of the site. At 1024 the dock below the heading touches the top edge of "Tell Me More" (screens/1024-heading-selected.png). It never covers the selection's own text, but it covers neighbours. |
| Discoverability | Medium | Every global route has a labelled control in a fixed place (decisions 1 and 2), and the dock spells out its actions in words. The weaknesses are that "Agency" opening settings is a guess users may not make, the gear is an icon only, and Versions sits inside Publish, so task 8 needs the user to look there. The idle hint "Click any text or picture to change it" carries first use. |
| Editing speed | Strong | 2 to 4 actions per task. The dock is next to the pointer, so travel is short on desktop. On touch it pins above the bottom bar, which costs travel from the selection to the dock. |
| Accessibility | Medium | All of the above works by keyboard. Focus returns to the opener. Escape unwinds one layer at a time. Dialogs use `<dialog>`. F6 cycles the islands, the canvas and the dock. There are 44 px targets under 900 px, and opaque fallbacks for reduced transparency, more contrast and forced colours. The weaknesses are that the canvas is one `role=application` with arrow-key movement between parts, which a real build must back with a proper part list. The dock moves with the selection, which screen magnifier users can lose. Glass over a busy photo is the riskiest contrast case, though the band keeps the islands off the photo at rest. |
| Visual distinctiveness | Strong | It is the least framed of the three ideas. Pagehaven reads as three glass objects resting on the site, with ultramarine only on selection, focus and Publish. With the band, the top edge looks more like a slim toolbar than true floating. That is the price of not covering the site's menu. |
| Implementation complexity | Medium | The existing code already has a floating toolbar and a pure placement module, so the dock is a change, not a rewrite. The files that change are `frontend/editor/topbar.ts` (split into three islands), `rail.ts` (removed; pages go to a switcher popover, the rest to the settings sheet), `toolbar.ts` and `placement.ts` (one preferred side, flip only at the canvas edge, frozen while typing, an off-screen pill, a bottom pin on touch), `panels.ts` (popovers anchored to the dock instead of a side panel), `publish.ts` (versions and the restore confirm inside the publish popover), `canvas.ts` (frame under the band, height set before load), `menu.ts` (one surface open at a time, exempt dialogs from outside-click close), `saves.ts` and `state.ts` (save state on the selection label, one `surface` field), `main.ts` (focus mode, F6 order, width layouts) and `assets/static/css/editor.css`. A new palette module is needed. `canvas-policy.ts` and `frontend/protocol.ts` are untouched (decision 14). The riskiest part is dock placement against real, changing element rects inside the sandboxed frame, which this prototype fakes with fixed rects. |
| Responsiveness | Medium | 1280 and 1024 keep the same arrangement. 834 and 390 move the tools to a bottom bar and the sheets to bottom sheets. The weaknesses are that on touch the dock leaves the selection's side, so the "next to the selection" idea only holds on desktop. On a 390 phone the bottom bar, the dock and the idle hint stack three layers over the lower third of the site (screens/390-resting.png shows the hint over the site's text). On phones the capsule loses "Agency /", so which website you are in is only in Settings. |

## Screens

All are in `screens/`:

- `1280-resting.png`, `1280-heading-selected.png`, `1280-editing.png`, `1280-page-switcher.png`, `1280-settings.png` and `1280-publish.png`
- `1024-heading-selected.png` and `1024-settings.png`
- `834-resting.png` and `834-heading-selected.png`
- `390-resting.png`

The 1024, 834 and 390 PNGs are at device pixel ratio 1.25 to 2, so their pixel sizes are larger than the CSS viewport.
