# Direction C: Editorial Canvas

## Concept

The website lies on the desk like a document: the whole site renders at its real layout, scaled to fit the width, and the window scrollbar moves through it. The only chrome is one line of type at the top: "Agency / Home ▾" on the left, view words in the middle, and "2 changes not published" with a Publish button on the right. Selecting part of the page attaches an editorial caption under it, a small label with the save state ("HEADING · Saved") and a short row of words ("Edit · Style · Link · More"), set like a margin note. Settings open as a calm, centred sheet that reads top to bottom with a table of contents beside it, and the page switcher is itself a table of contents with dotted leaders and paths. Glass appears only on the caption and the popovers, so the site is the only coloured thing on screen.

## Running it

Serve this folder with the Onest font beside it (the font stays out of the repo):

```
mkdir -p /tmp/dir-c/fonts && cp -r docs/studio/direction/c/* /tmp/dir-c/ \
  && cp /tmp/studio-fonts/gf/onest-latin.woff2 /tmp/dir-c/fonts/
python3 -m http.server 8703 --bind 127.0.0.1 --directory /tmp/dir-c
```

Open `http://127.0.0.1:8703/index.html`. The query parameters `?select=heading|button|photo`, `&edit` and `&open=pages|settings|publish|palette` jump straight to a state.

The canvas is a real iframe of `http://agency-15.sites.localhost:5150/`. It is cross-origin, so the selection is drawn at coordinates measured once from the frame's accessibility tree for three layout widths (1280, 810 and 390). At 834 the ring sits on the heading's real box (in-frame 57,340 to 753,484, text centred at x=405). The earlier "offset" was the word "IT'" fading in white against the white sky of the site's own hero, which makes the ring look shifted left.

## Verified interactions

Checked in the browser at 1280x800, by click and by key:

- Page switcher: opens from "Home ▾" with focus in the search field. It lists Home, Services and Portfolio, with "Add a page…". Arrow keys and Enter move through and choose rows. Each row's "..." opens a menu (Home has no Rename or Delete). Escape closes the menu first, then the switcher, and focus returns to "Home ▾".
- Settings: "Settings" or "Agency" opens the sheet with General, Pages, Assets, Domains, Publishing and Versions. The table of contents follows the scroll. Escape closes it.
- Selection: clicking the heading draws the ring and the caption "HEADING · Saved  Edit Style Link More".
- Editing: Edit, a second click, a double-click or Enter starts editing. The caption becomes "EDITING · Saved  B I Link Done", a caret appears, and typing flips the label to "Saving…" and back to "Saved". Enter or Done finishes, and the top line then reads "3 changes not published".
- Image replace: select a portfolio photo and choose Replace to get the popover beside the ring ("Images" in the top line goes there too).
- Publish: the popover lists the changes, a "Publish 2 changes" button and the version ledger with "Make this version live". Publishing bumps the version.
- Focus mode: "Focus" or Ctrl+. fades the line out (opacity 0.02) and leaves one "Back to editing" button. Escape or that button brings everything back.
- Command palette: Ctrl/Cmd+K opens it with focus in the input. Every entry names where its visible control lives.

## Measurements

`scripts/studio/measure.js` at 1280x800, resting: **canvasShare 0.921** (frame visible at 16,44, 1248x756). No persistent side panels, layout shift 0, 266 DOM nodes. In focus mode the share is 0.975. The 16px desk margins are the only loss.

## Screenshots

`screens/<state>-<width>.png`:

| Width | Files |
|---|---|
| 1280x800 | `resting-1280.png`, `heading-selected-1280.png`, `editing-1280.png`, `page-switcher-1280.png`, `settings-1280.png`, `publish-1280.png`, plus `image-replace-1280.png` |
| 1024x768 | `heading-selected-1024.png`, `settings-1024.png` |
| 834x1112 | `resting-834.png`, `heading-selected-834.png` |
| 390x844 | `resting-390.png` |

## How it answers the open questions in decisions.md

- **Canvas framing.** The whole page scrolls as a document. Nothing is reserved above the canvas except one 44px line of type (52px at touch widths), and nothing floats over the canvas until you select something.
- **Contextual commands.** They appear as a caption just under the element. The prototype always places it below. A build needs an above-the-element fallback near the fold. It is a label plus words, not icons. On a phone it docks to the bottom edge as a sheet-like strip, because a caption under a 156px heading would cover the next tap target.
- **Page switcher, settings, publish.** The page switcher is a table-of-contents popover anchored to the page name. Settings is one centred document-style sheet with sections down the page and a TOC beside it (under 900px the TOC turns into a horizontal strip across the top of the sheet). Publish is a popover anchored to the button: what changed, one button, then the version ledger. "Every version" links into the Settings sheet.
- **Tablet and phone.** At 1024 the site keeps its 1280 desktop layout scaled to 77.5%. At 834 the site renders its own 810 tablet layout at 1:1, and the line's words collapse to glyphs at 44px targets. At 390 the site renders at 390 full-bleed, the line keeps only "A / Home ▾", undo/redo, Settings and Publish, and the caption docks to the bottom.

## Self-assessment

The action counts are predictions from walking the prototype, not results from participants. Brief section 15 forbids inventing those.

| Criterion | Assessment |
|---|---|
| Canvas visibility | Best of the likely options. canvasShare 0.921 at rest and 0.975 in focus mode. The document scroll means the whole site is reachable with the ordinary scrollbar and trackpad, with no nested scroll area. |
| Discoverability | The weakest point, and the cost of the concept. Chrome is words in grey type with no borders. "Agency" being the way into settings is invisible. "Style" and "More" do not say what they hold. Section actions (duplicate, hide, move) live only under "More". Restoring a version sits inside Publish. Nothing on the resting canvas shows what is editable until you hover, so the first-run hint ("Click any words or picture on your page to change them.") does the onboarding work alone. A first-time owner will find heading editing and Publish quickly. I predict they will miss version restore, section actions, and the image list behind "Images". |
| Editing speed (predicted deliberate actions from rest, desktop) | 1. Edit the homepage heading: 2 (double-click, type, then Enter counts as 3). 2. Replace the hero image: 3 (Images, choose the hero, Upload), plus the file picker. The hero is a CSS background, so it needs the baseline fix that adds backgrounds to the image list. 3. Change a button's destination: 3 (click button, Link, choose page). 4. Switch page: 2 ("Home ▾", Services), or Ctrl+K, type, Enter. 5. Change website settings: 2 to 3 (Settings, TOC section, field). 6. Preview mobile: 1 (Phone), or 2 with Preview for no overlay. 7. Publish: 2 (Publish, "Publish 2 changes"). 8. Restore a previous version: 3 (Publish, "Make this version live", confirm). It is fast once known. Tasks 2 and 8 are where discoverability costs time. |
| Accessibility | All controls are real buttons with names. Surfaces are dialogs or menus. Escape closes the innermost layer and returns focus to the opener (verified). The palette uses aria-selected. Editing state and publish results go to a polite live region. The caption is `role="toolbar"`. Targets are 32px tall at desktop (above the WCAG 2.2 AA 24px minimum, below 44) and 44px at 834 and 390. Risks I did not measure: grey word contrast on the light ground, glass caption legibility over busy photos, and keyboard selection of page parts (the prototype tabs to three fixed spots, but the real agent needs its own in-frame keyboard model). |
| Visual distinctiveness | High. It reads as a typeset document with a single ultramarine Publish button, with no capsules, rails or icon bars. Its kinship is with Craft and iA Writer, not with site builders. Expressive type carries the hierarchy (small-caps caption label, TOC leaders). |
| Implementation complexity | Medium-high, with the biggest risk in the agent, not the chrome. `frontend/editor/canvas.ts`: `frameLayout` must size the frame to the page's full height instead of the viewport, and the window becomes the scroll host. A cross-origin frame cannot report its height itself to the parent, so **`frontend/agent/agent.ts` must post the document height** (ResizeObserver on `documentElement`, debounced) and stop treating its own `scrollY` as the visible region. Its `viewport` message then needs the editor to send back the visible window rect. Side effects of a frame as tall as the page: `100vh` sections balloon, `position: fixed` headers stop sticking (the Agency navbar no longer shrinks on scroll), scroll-triggered reveals and scrollspy never fire, and lazy images all load at once. Some sites will look different from how they look live, which contradicts the trust goal. `frontend/editor/placement.ts`: caption below/above rules replace the toolbar placement. `frontend/editor/toolbar.ts`: rewritten as the word caption with the label and save state. `frontend/editor/topbar.ts`: one line. `frontend/editor/rail.ts`: removed; images and pages move into popovers. `frontend/editor/pages.ts`, `frontend/editor/panels.ts` (settings as one scrolling sheet), `frontend/editor/publish.ts` (popover plus ledger), `frontend/editor/menu.ts` (More), `frontend/editor/state.ts` (focus flag), `frontend/editor/main.ts` (wiring), and `assets/static/css/editor.css`. `frontend/tests/placement.test.mjs` and `fit.test.mjs` change with them. |
| Responsiveness | Good at 1280, 834 and 390, where the site shows its true layout at a readable scale. At 1024 the desktop layout at 77.5% makes body text small (about 12px). An editor could prefer the site's own 1024 layout there, at the cost of not showing the desktop design. At 390 the docked caption works but loses the margin-note idea, and "Preview" and device switching drop out of the line (they stay in the palette). |

## Honest weaknesses

1. Discoverability for first-time owners is the price of the quiet chrome. Words without borders read as labels, not controls, until hovered.
2. Full-height framing changes how some sites render (vh, fixed headers, scroll effects). Agency's navbar sits static at the top of the document rather than following the scroll as it does live.
3. The overlay here is drawn at measured coordinates. A real build depends on the agent reporting height and rects promptly as the page reflows. The baseline's late frame sizing (layout shift 0.26 to 0.40) gets worse, not better, if the height arrives late, so the frame needs a reserved height before first paint.
4. The caption under a tall element (the 156px phone heading, a large photo) sits far from where the owner clicked, and the prototype has no above-the-element fallback yet.
