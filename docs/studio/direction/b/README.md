# Direction B: Spatial Workspace

A throwaway, browser-rendered prototype. It exists to decide between three editor directions, not to ship.

## Run it

```sh
mkdir -p /tmp/dir-b
cp -r docs/studio/direction/b/. /tmp/dir-b/
cp /tmp/studio-fonts/gf/onest-latin.woff2 /tmp/dir-b/
python3 -m http.server 8702 --bind 127.0.0.1 --directory /tmp/dir-b
```

Open `http://127.0.0.1:8702/`. Add `?touch=1` to force the touch layout on a wide window (the 834 portrait screenshots use it, since an iPad has a coarse pointer). The canvas is a real iframe of `http://agency-15.sites.localhost:5150/`. It is cross-origin, so the hotspots, ring and label are drawn in an overlay at rects measured once per frame width (`GEO` in `studio-b.js`), and canvas scrolling is simulated with fragment navigation.

## The concept in five sentences

The website sits as one large, softly elevated surface on a calm neutral workspace, with 12 px margins instead of a frame of chrome. Only two capsules sit above it: the navigation capsule top left ("Agency / Home") and the publish capsule top right. Every contextual command lives in one command dock fixed at the bottom centre, whose rect never changes; only its contents change with the selected element kind, and it turns into the formatting bar while you type. Popovers rise from the dock, settings slides in as a layered sheet from the right edge, and the selection on the canvas is only a ring, a halo and a small label that also carries the save state. The bet is spatial memory: a person learns one place to look for "what can I do with this", at the price of a longer pointer trip from the selection.

## Screenshots

| Width | State | File |
|---|---|---|
| 1280x800 | Resting editor | `screens/1280-resting.png` |
| 1280x800 | Heading selected, dock shows Edit, Style, Link, More | `screens/1280-heading-selected.png` |
| 1280x800 | Editing, dock becomes Bold, Italic, Link, Done | `screens/1280-editing.png` |
| 1280x800 | Page switcher open | `screens/1280-page-switcher.png` |
| 1280x800 | Website settings sheet | `screens/1280-settings.png` |
| 1280x800 | Publish surface with version history | `screens/1280-publish.png` |
| 1024x768 | Heading selected | `screens/1024-heading-selected.png` |
| 1024x768 | Website settings sheet | `screens/1024-settings.png` |
| 834x1112 | Resting, touch layout | `screens/834-resting.png` |
| 834x1112 | Heading selected, touch layout | `screens/834-heading-selected.png` |
| 390x844 | Resting, phone | `screens/390-resting.png` |

The 1024, 834 and 390 captures came out of the preview browser at a higher device pixel ratio (1280 px or 780 px wide files). The CSS layout is the stated viewport.

## Measured

`scripts/studio/measure.js` in the page at 1280x800, resting state:

- canvasShare **0.881** (frame 1256x718 at 12,52). No persistent panels. Layout shift 0. 72 DOM nodes.
- The frame runs under the dock's lower 22 px, so the unobscured share is about 0.87 (the dock covers 468x22 px of it).
- At 1024x768 the frame is 1000x686, a share of 0.872 (from the frame rect).
- At 390x844 the unobscured canvas, from the top band to the bottom bar, is 0.863 of the window (measured with `getBoundingClientRect`).
- The dock rect stays at 406,748,468,44 when idle, with text selected, with a picture selected and while editing. Both capsules keep their rects too. Drift is 0, as decision 2 asks.

## Interactions that work

Checked in the browser on port 8702 with real clicks and real key presses.

- Page switcher from "Home ▾" or the dock's Pages: search field, Home, Services, Portfolio, Add a page, and a page's **...** menu (Rename, Duplicate, Page settings, Delete page).
- Website settings from the dock's Settings or the "Agency" crumb: General, Pages, Assets, Domains, Publishing, Versions.
- Select the heading (click, or arrow keys over the canvas). The dock shows Edit, Style, Link, More. A second click, Enter or typing starts editing; the label reads "Editing · Saving…" then "Saved". Enter, Done or Escape ends it.
- Picture selected: Replace, Alt text (with a dot while alt text is missing), Link, More. Replace opens a popover rising from the dock with Upload and the pictures on this page.
- Button selected: the dock's Link shows its destination ("Link · Services") and changes it.
- Publish capsule: change list, Publish, the site address, version history with "Make this version live" (confirmation dialog), and a route to all versions.
- Focus mode on Ctrl+. or the dock's corner button. Everything but a "Back to editing · Esc" pill hides. Escape or the pill brings it back.
- Command palette on Ctrl+K (Cmd+K on a Mac), with arrow keys and Enter.
- Escape ladder: menu, focus mode, open surface, editing, selection, preview. Focus goes back to the opener.
- Preview from the idle dock: Computer and Phone, then "Back to editing".

Fixed while finishing this round: the phone sheet was 340 px wide instead of full width (an inline width won over the bar rule), the phone crumb showed "A" instead of "Agency", the hint chip wrapped on the phone, and a hover ring showed on touch layouts.

## How it answers the open questions in decisions.md

**How the canvas is framed.** Controls float over a thin workspace margin. The site is one elevated surface with 12 px gutters and a 52 px top band that holds only the two capsules. The dock floats over the bottom 22 px of the canvas. On touch, the margins drop to 0 and the dock becomes a bottom bar that reserves its own band.

**Where the contextual commands live.** In a fixed dock at the bottom centre. Its contents follow decision 3 exactly (three or four labelled actions plus More, chosen by element kind) and its position never changes, so the "flip at the canvas edge" rule never triggers and it can never cover the selected element or the site's own navigation, one of the baseline fixes.

**The form of the page switcher, the settings sheet and the publish surface.**
- The page switcher is a popover that drops from the "Home ▾" crumb, or rises from the dock's Pages. A search field sits on top, then the rows, then Add a page.
- Settings is a right-edge sheet, full window height, with a section list and a pane. I chose the side sheet over a centred sheet for three reasons. A long form with six sections needs the full height. The left two thirds of the canvas stay visible, so the person keeps their place. And a centred sheet reads as modal, which decision 4 reserves for publish review, rollback and delete. On phones it becomes a bottom sheet rising to 40 px below the top.
- The publish surface is a popover from the publish capsule, with version history inside it (decision 15). "All versions and publishing settings" opens the settings sheet at Versions.

**The tablet and phone arrangement.** A fine pointer keeps the floating dock down to 600 px wide. A coarse pointer, or any width under 600 px, turns the dock into a full-width bottom bar of 44 px targets with icon over label. Every popover then becomes a sheet rising directly above the bar, so commands and their properties stay in one thumb zone. Undo and Redo stay at the bar's left edge at every width (decision 7).

## Pointer travel: Fitts's law estimate

The direction's main risk is the trip from a selection down to the dock. Rects were measured at 1280x800.

Fitts's law in the Shannon form is ID = log2(D / W + 1). I take throughput as 4.9 bits/s, the mean for a mouse in ISO 9241-9 studies (Soukoreff and MacKenzie 2004), so time is ID / 4.9 plus a constant that cancels out when two designs are compared. W is the target size along the approach, 36 px, the dock button's height, because the trips are mostly vertical.

| Trip | D (px) | ID (bits) | Time | Floating toolbar 8 px above the element | Extra cost of the dock |
|---|---|---|---|---|---|
| Heading centre (640,428) to Edit (585,770) | 346 | 3.41 | 0.70 s | D 64, 1.47 bits, 0.30 s | +0.40 s |
| Portfolio photo centre (260,500) to Replace (573,770) | 413 | 3.64 | 0.74 s | D 160, 2.44 bits, 0.50 s | +0.24 s |
| Element near the top, y about 100, to the dock | about 670 | 4.29 | 0.88 s | about 0.30 s | +0.58 s |

All values are estimates from a model, not observations. The reading is that each trip to the dock costs about a quarter to half a second more than a toolbar beside the selection. Most of the cost goes away for the commonest job: editing text needs no dock trip at all (second click, Enter or typing). Once a popover has risen from the dock, the next targets sit next to the pointer. The cost is real for chains of property changes on elements high on the page, and on large monitors, where D doubles but ID grows by only about one bit. A hidden cost the model does not capture is that the eye has to leave the selection to read the dock. I rate the travel noticeable but not decisive. The spatial stability buys a single, learnable place, and it never covers the content.

## Self-assessment

Predicted action counts for the eight tasks in brief section 15, with a mouse at 1280. They are expert-review estimates, not participant results. Typing a value counts as one action.

| # | Task | Path | Actions |
|---|---|---|---|
| 1 | Edit the homepage heading | Click heading, click again (or type), type, Enter | 3 |
| 2 | Replace the hero image | Click the picture, dock Replace, Upload, choose file | 4 (3 when picking a picture already on the site) |
| 3 | Change a button's destination | Click button, dock "Link · Services", choose a page | 3 |
| 4 | Switch to another page | "Home ▾", Services | 2 |
| 5 | Change website settings | Dock Settings (or the "Agency" crumb), edit a field, Save | 3 |
| 6 | Preview the mobile version | Dock Preview, Phone | 2 (3 with a selection, which first needs Escape) |
| 7 | Publish a change | Publish · 2, Publish 2 changes | 2 |
| 8 | Restore a previous version | Publish capsule, Make this version live, confirm | 3 |

| Criterion | Rating | Evidence and honest weaknesses |
|---|---|---|
| Canvas visibility | Strong | canvasShare 0.881 at 1280 (about 0.87 unobscured), 0.872 at 1024, about 0.86 on a phone. Only a 52 px band and a 44 px dock. The dock covers a band at the bottom of the site; content scrolled to there must be scrolled up. |
| Discoverability | Medium | Pages, Images, Settings and Preview are labelled in the dock, and Settings has a second home in the crumb. The weakness of an adaptive dock is that those idle commands vanish as soon as something is selected, so Preview and Images need Escape first (the palette covers them). The heading-to-dock link is spatial, not visual: nothing at the selection says "commands are below", only a one-time hint chip and the label. |
| Editing speed | Medium | Text editing is fast (3 actions, no dock trip). Property changes pay +0.24 to +0.58 s per dock trip (Fitts estimate above). |
| Accessibility | Good | Toolbars with labels, `aria-live` dock contents, `aria-pressed` hotspots, arrow keys move the selection, Enter edits, a full Escape ladder that restores focus, 44 px targets on touch, and DOM order nav, publish, canvas, dock. Missing: no shortcut to jump focus into the dock (F6-style), and the prototype's hotspots are overlay buttons, not the site's DOM through the agent. |
| Visual distinctiveness | Medium to strong | The elevated page on a quiet ground with a creative-app dock reads clearly as a workspace, close to Keynote or Freeform. It is also the most familiar of the shapes, so it is less ownable. |
| Implementation complexity | Medium | See below. It removes more than it adds. |
| Responsiveness | Strong | One model at every width: floating dock becomes the bottom bar, popovers become sheets above it. Checked at 1280, 1024, 834 (touch) and 390. On an 834 window with a mouse, the floating dock stays, which is right but means two layouts to test at that width. |

### Files in `frontend/editor/` that would change

- `toolbar.ts` becomes the dock. `ACTION_ORDER` and `actionsFor` already map element kind to actions and stay; the rendering moves from a floating bar to the fixed dock, plus the idle and editing sets.
- `placement.ts` shrinks to popover placement above the dock. The candidate search that keeps the floating toolbar off the selection is no longer needed.
- `rail.ts` is removed. Its Pages, Images and Settings entries move to the idle dock and the navigation capsule.
- `topbar.ts` splits into the navigation capsule and the publish capsule. Undo and Redo move into the dock.
- `panels.ts` renders its panels inside popovers anchored to the dock, and inside the settings sheet.
- `publish.ts` gains the version history list inside the publish surface.
- `canvas.ts` `frameLayout` drops the reserved toolbar band in favour of thin margins and a frame that runs under the dock, and sizes the frame before load (the layout-shift fix).
- `menu.ts` hosts the page row **...** menu. `state.ts` gains focus mode and the dock kind. `main.ts` rewires the above.
- Outside the folder: `assets/static/css/editor.css` and `assets/views/projects/editor.html`.
- `canvas-policy.ts` and `frontend/protocol.ts` stay as they are (decision 14).

## Known gaps in the prototype

- Overlay rects are measured once per frame width; scrolling the real frame by hand desynchronises them. A real build gets rects from the agent.
- The hero banner photo is a CSS background, so task 2 is demonstrated on a portfolio photo.
- Style, More, Move, Duplicate and Hide open their popovers or record a change with a toast, but the cross-origin site itself never changes.
