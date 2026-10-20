# Evidence to design decisions

Sources: `research/hci.md` (Agent A), `research/apple.md` (Agent B), `identity/README.md` (Agent C), `baseline/README.md` and `editor/model.md` (Agent D). Numbers in brackets point to findings in those files. "Owner" marks a call the owner made.

## Settled for every direction

| # | Decision | Evidence | How it is checked |
|---|---|---|---|
| 1 | No permanent sidebar. Pages, Settings, Images and Version history each keep a visible, labelled control. The palette only adds a route. | HCI 5, 16 and the warning on removing the sidebar; baseline inventory | Reachability table in `editor/model.md` section 18, walked in the browser |
| 2 | Global controls keep fixed positions while editing. | HCI 9, 10 (Findlater and McGrenere 2004; Gajos et al. 2006); Apple toolbars | A script logs every global control's rect before and after each task; drift must be 0 |
| 3 | The contextual dock's contents depend only on the element kind, three to five labelled actions plus one labelled More. One preferred placement, flipped only at the canvas edge, never moved while typing. | HCI 2, 3, 12 | Placement unit tests; rect log during a text session |
| 4 | Properties open in live popovers anchored to the element or the dock. Modal dialogs only for publish review, rollback and delete. Settings open in a sheet. | HCI 3, 5 (Beaudouin-Lafon 2000); Apple section 3 | Count of modal surfaces per task |
| 5 | A second click on selected text, or typing, starts editing in place. Escape ends editing and keeps the text; Undo reverts it. | HCI 1 (Shneiderman 1983); Apple Pages behaviour; Agent D decision 1 | Task 1 action count; frontend test |
| 6 | Save state shows on the selection label. The global status carries publishing only. | HCI 2, 6, 7 | Visual check in each state |
| 7 | Undo and Redo are visible at every width. | HCI 8 (Abowd and Dix) | Screenshots at four widths |
| 8 | Touch targets of 44 px with 8 px gaps on coarse pointers. Nothing core depends on hover. Phones can edit. | HCI 12, 17 (WCAG 2.5.8, Parhi et al.); Agent D decision 3 | Measured rects under `pointer: coarse` emulation |
| 9 | Two glass levels over the site, never glass on glass. Level 2 is 80% tint, blur 24 px, saturate 1.6. Level 3 is 94%, blur 40 px. Fixed light tint. Opaque fallbacks for no `backdrop-filter`, reduced transparency, more contrast and forced colours. | Apple section 1; identity materials; HCI 18 | `identity/measure.py` composites every text colour over white, black and saturated colour |
| 10 | Onest is the single typeface. Haven Ultramarine `#3730BD` is the one accent, used for selection, focus, links and Publish. Lucide at 1.5 px stroke, with icon size set by control size. | Owner approved Onest on 2026-10-20; identity colour measurement (cyan's worst case 1.97:1 over photos, ultramarine ring plus halo at least 3.01:1) | Contrast gate in `scripts/check.sh` |
| 11 | Cmd or Ctrl+K opens the command palette outside a text session. Inside one, keys go to the site's frame, so there is no clash. Links use the dock's Link button. | Apple section 5; Agent D decision 2; HCI 16 | Keyboard walkthrough |
| 12 | No magnetic pull or scaling on site elements. Hover is a tint and outline in the overlay layer only. | Apple section 4; HCI warning on idea B | Overlay never changes the site's layout (layout shift 0 during hover) |
| 13 | Motion of 90 to 300 ms, from the anchor, no loops, no animated blur. Reduced motion keeps fades. | Apple section 6; identity motion | CSS review; reduced-motion emulation |
| 14 | `frontend/protocol.ts` and `frontend/editor/canvas-policy.ts` keep their checks. The preview stays on its own origin in a sandboxed frame. | Security boundary; baseline section 5.10 | Frontend tests unchanged; separate review of any agent change |
| 15 | Version history lives in the publish surface, not in the editing chrome. | Brief section 3; `editor/model.md` section 6 | Task 8 action count |

## Left open for the three directions

- How the canvas is framed: a reserved band above it, controls floating over it, or the whole page scrolling as a document.
- Where the contextual commands live: next to the selection, in a fixed dock, or as a caption under the element.
- The form of the page switcher, the settings sheet and the publish surface.
- The tablet and phone arrangement.

## Fixes found by the baseline, owed by any direction

- Layout shift of 0.26 to 0.40 at load, from sizing the frame late.
- The web address field's `pattern` is invalid under the browser's `v` flag, so its check is skipped.
- Switching to phone view loses the selection.
- The toolbar docks over the site's own navigation.
- `agent.ts` cancels `touchend`, which may stop taps from selecting (untested).
- A banner photo set as a CSS background is missing from the image list.
