# The five worst problems

Ranked by user impact. Evidence and labels follow `README.md`: measured, observed, read, inferred. Each fix is the smallest change I can point to. None of them has been tried.

## 1. The Link popover runs off screen, and Save link cannot be reached by pointer

- **Who and how bad.** Any owner on a 900 px or wider screen who links an element in the lower part of the view. Task 3 dead-ends for a mouse user. A keyboard user saves blind (inferred).
- **Reproduce.** 1280 x 800, Agency. Click "Tell me more" (y about 634). Click Link in the caption. The popover opens at y 725 with `max-height: 120px`. Scroll it to the end. Save link is still at y 803 to 833 (measured). Focus starts on a select at y 866 (measured). Tab, Tab, Enter is the only way to save (observed).
- **Breaks.** WCAG 2.4.11 Focus Not Obscured (Minimum). Decision 4 (properties in live popovers anchored to the element or the dock). Task 3 completion.
- **Smallest fix.** `frontend/editor/surfaces.ts` `placePanel()`, lines 430 to 437. It floors `maxHeight` at 120 px and always places the panel on the caption's far side. Measure the room on both sides first. When the far side has less room than the panel's natural height, place the panel on the near side, above the caption. Then clamp `top` so that `top + height <= innerHeight - 8`. The pure helper `placePanel` in `frontend/editor/placement.ts` lines 76 to 83 can take the room as an input, so `placement.test` can cover it.

## 2. The caption covers the text being typed

- **Who and how bad.** Every owner who edits a heading or button so that it wraps or grows. They cannot see the words they are typing (observed).
- **Reproduce.** 1280 x 800, Agency. Click the heading, click again, type "Hello from the evaluator". The heading wraps to two lines. The caption stays at its original y and covers the start of the second line (observed, `../final/screens/editor-editing-1280.png`). The same caption reads "Saved" while nothing has been saved (observed).
- **Breaks.** Decision 3 as intended ("never moved while typing" was meant to keep it stable, not to put it over the text). Decision 6, because the label claims a save that has not happened. WCAG 2.4.11 when the caret sits under the caption (inferred).
- **Smallest fix.** `frontend/editor/toolbar.ts` `position()`, line 375, returns early for the whole text session. Keep it frozen, but when the session starts, place the caption above the element if there is room, since text grows downward. Or let it flip once if the element's rect starts to intersect it. For the label, line 345: show "Editing" while `s.editing.active`.

## 3. On a phone the canvas opens at 30 % and half the tools sit off screen

- **Who and how bad.** Every phone owner. Decision 8 promised that phones can edit. They can, but the site is drawn at 30 % (body text about 4 px), and key controls are invisible (measured).
- **Reproduce.** 390 x 844, Agency. The zoom reads "Fit 30%" with `device: desktop`. The tools row is 482 px wide in 374 px and hides Zoom and Focus. Select the heading. The action row is 582 px wide in 374 px and hides Background and More, which holds every section action. Nothing shows that the rows scroll. The Back link is `display: none` (measured, `../final/screens/editor-heading-selected-390.png`).
- **Breaks.** Decision 8. Decision 1 (each route keeps a visible control). WCAG 1.4.10 Reflow for the toolbar content (inferred).
- **Smallest fix.** `frontend/editor/state.ts` line 149: start with `device: "mobile"` when `matchMedia("(max-width: 599px)")` matches. In `assets/static/css/editor.css` lines 406 and 409, let `.studio-bottom .ed-top-center` and `.ftb-row` wrap at phone width, or move Zoom and Focus into the palette there. Keep the Back link visible in the left island.

## 4. Caption keyboard focus does not follow the visual order

- **Who and how bad.** Keyboard and screen-reader owners on every selection. Tab into the caption lands on the fourth visible action, and the arrow keys jump around the row (observed).
- **Reproduce.** 1280, Agency. Select the heading with the keyboard. Edit and finish it, then Tab from the canvas. Focus lands on "Background", and ArrowRight goes to More and then to "Edit text" at the far left (observed). The DOM order was "Background, More, Edit text, Style, Change banner photo" while the screen showed "Edit text, Style, Change banner photo, Background, More" (measured).
- **Breaks.** WCAG 2.4.3 Focus Order. WCAG 1.3.2 Meaningful Sequence.
- **Smallest fix.** `frontend/editor/toolbar.ts` line 365. Kept buttons get `style.order` while `buttons()` and the roving tabindex follow DOM order. Replace `kept.style.order = String(order)` with `actionHost.append(kept)` inside the same loop. Appending moves the node, so DOM order then matches the visual order and focus stays on the same element.

## 5. Keyboard routes got longer, and two inventory shortcuts were removed

- **Who and how bad.** Keyboard owners. Publish went from 2 keys to 5 and the heading edit from 4 to 8 (observed). Version history lost its shortcut.
- **Reproduce.** Press Ctrl+Shift+P or Ctrl+Shift+H in the editor. Nothing happens. `wireKeys` in `frontend/editor/main.ts` handles F6, Ctrl+S, Ctrl+., Ctrl+K, Ctrl+Z/Y, ? and Escape only (read). The shortcut sheet no longer lists them (read, `assets/views/projects/editor.html`). Start here moved into the page switcher popover, so reaching "Change the main heading" takes Enter and three Shift+Tab presses (observed).
- **Breaks.** The feature inventory the redesign had to keep (`../baseline/README.md` section 5.9 lists `Ctrl+Shift+P` and `Ctrl+Shift+H`). Decision 11 adds the palette as a route, not a replacement. WCAG 2.1.1 is still met, so this is efficiency, not access.
- **Smallest fix.** In `frontend/editor/main.ts` `wireKeys`, before the `isTyping` check, add `mod && event.shiftKey && key === "p"` to call `publishing.openReview(...)` and `key === "h"` to call `publishing.openHistory(...)`. Restore both lines to the shortcut sheet in `editor.html`. Add palette commands "Change the main heading" and "Replace a picture" in `frontend/editor/topbar.ts` `commands()`.

## Lesser problems

- **Stale selection announcer (WCAG 4.1.3).** After a text edit the live region still names the old text, and a text save raises no toast. `frontend/editor/main.ts` lines 218 to 229 key the announcement by element id (read). Announce when `s.editing` turns inactive (observed at 1280 and 834).
- **Island drift at 834 (decision 2).** Switching from Home to The studio widened the left island by 44 px and moved Images and Settings (measured). Give `.ed-page` a fixed width in `assets/static/css/editor.css` lines 396 to 402.
- **No warning when a new photo hides the text over it.** The white Agency heading vanished on a light photo (observed). This was already in the baseline.
- **Truncated page switcher at 1024 and 1280.** "Age… / H…" at 1024, "Northwi… / The …" at 1280 after a page switch (observed). `.ed-site-name` is capped at 90 px and 48 px (read, `editor.css` lines 334 and 387).
- **Pill goes stale after a rollback.** It kept "Published at 12:00 PM" until a reload showed "Visitors see version 1" (observed). The pill keeps `publicationFeedback` (read, `topbar.ts`).
- **"Restore" and "Publish again" sit side by side.** "Restore" only changes the draft. The confirm text explains it, but the first click is likely the wrong one (inferred).
- **The banner caption docks over the site's logo and nav** (observed, task 2). **The heading caption covers the paragraph below on Landwind** (observed, `editor-landwind-heading-selected-1280.png`).
- **The link destination is no longer shown in words on the caption.** It now appears only in the tooltip (observed).
- **The pages popover stays open over the canvas** after Start here selects the heading, through the whole text edit (observed).
- **After the palette runs a command, focus goes to the page body** (observed).
- **The same action has two names.** "Change banner photo" and "Change background photo", with toasts "Banner photo changed" and "Background photo changed" (observed).
- **A tooltip lingered after a click** ("Choose a new photo for the background", observed). This was already in the baseline.
- **The unpublished change count vanishes on reload.** Publish reads "Publish" until the next edit (observed).
- **"Keyboard shortcuts" sits under the General settings heading** as if it were a setting (observed).
- **The page label keeps the old site name after a rename.** "The studio · Northwind Studio" (observed). `pageLabel` strips only the current name (read, `frontend/editor/pages.ts`).
- **"Area selected" is the spoken name for an unnamed container** (observed).
- **The import success thumbnail shows a portfolio image, not the hero** (observed, `import-success-1280.png`).
- **On the landing page at 390, the mock island overlaps the mock site's own title** (observed, `landing-idle-390.png`).
