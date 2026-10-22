# Rótulo redesign

The brief is `brief.md`. Decisions and who made them are in `decisions.md`. The design system itself is `../../DESIGN.md`, with the reasoning in `foundation.md`.

## 1. Design direction: Proof

Rótulo's interface is drawn like a printer's proof sheet: ink on a warm near-white ground, hairline rules instead of boxes and shadows, and no colour of its own. The imported website is the only colourful thing on screen, so it stays the subject. The one accent is a cyan reserved for selection, focus, links and the current page.

Three directions were built as working HTML comps before any app code changed (`direction/`). Proof won on a measurement, not taste. Its cyan selection is the only one of the three that keeps 3:1 contrast on its own on both a white page (3.89) and a dark photo (3.64). The lime of Spot Ink measured 1.32 on white, and the gold of Shopfront 1.19 against the Agency template's own yellow button.

What makes it recognisable without the logo:

- The selection: a cyan rule with a white halo, small crop marks at the corners, and a label chip naming the part ("Heading", "Banner", "Card · E-Commerce"). It stays the same size on screen at any zoom.
- Ink rules: a 2 px ink line above every card caption and section title, where other products use a shadow or a rounded box.
- One black ink primary button per view, and nearly square corners (2 to 4 px).
- A serif display voice (Newsreader) on the dashboard, import, sign-in and landing, never inside the editor.

## 2. Typography and icons

**Schibsted Grotesk** sets every interface role. It was drawn for a newspaper group, so it is built for dense, scannable text at small sizes, and its slightly squared shapes match the proof-sheet rules. A rendered head-to-head with Inter (`type-icons/specimens/`) showed it holding its character at 11 to 15 px, where Inter reads as the default SaaS face. One variable file, weights 400 to 700, 46.6 KB, self-hosted. Its tabular figures space commas oddly, so tabular numerals are used only on digit-only columns.

**Newsreader** sets a few display titles outside the editor: "Your websites", the import drop zone, sign-in titles, the landing headline. It gives the owner-facing pages an editorial voice. It never appears in the editor, so it can't be confused with the owner's own site fonts. 29.1 KB, loaded only on those pages.

**Lucide** icons, 43 symbols vendored into one SVG sprite by `scripts/design/build_icons.py` (2.3 KB gzipped). One family on a 24 grid with round joins, rendered at 16 and 20 px with a 1.5 px stroke, so icon weight matches the label beside it. Icons only stand alone where the meaning is unambiguous (undo, redo, computer and phone, close); everything else carries a text label. `scripts/design/check_icons.py` fails the build on a missing icon or an icon-only button without an accessible name.

All three are licensed for free self-hosting (SIL OFL 1.1 for both fonts; ISC, with MIT for Feather-derived glyphs, for Lucide) and were approved by the owner before installation.

## 3. Design system

Tokens live at the top of `assets/static/css/app.css`; `DESIGN.md` documents them.

- Colour roles: ground, surface and sunken surfaces; three ink weights; three rule weights; cyan for selection, focus and links; success, warning and error with soft fills; overlay roles for the editor's in-site selection.
- Type: 13 roles, each with size, line height, weight and letter-spacing.
- Spacing on a 4 px scale, three control heights, radii of 2 to 8 px, two shadows (floating toolbar, dialogs), four durations and two easings, all zero under reduced motion.
- Components: buttons (primary, secondary, ghost, danger, icon), inputs, select, textarea, switch, segmented control, status pills, menus, popovers, tooltips, cards, lists and tables, toasts, empty states, dialogs and sheets, skip link, focus ring.

The stylesheet is split by owner: `app.css` (foundation), `screens.css` (sign-in, dashboard, import, landing, errors) and `editor.css`. `scripts/design/contrast.py` checks every listed colour pair against WCAG AA on each build (38 pairs and more, all passing).

## 4. Screens

Final screenshots: `screens/final/`. Earlier stages: `screens/foundation/`, `screens/core/`, `screens/editor/`, `screens/polish/`. The state before the redesign: `../screenshots/design/`.

| Screen | Before | After |
|---|---|---|
| Editor | `../screenshots/design/after-editor.png` | `screens/final/fix-04-status-saved-1280.png` |
| Dashboard | `../screenshots/design/after-dashboard.png` | `screens/final/03-dashboard-3-sites-1280.png` |
| Landing | `../screenshots/design/after-home.png` | `screens/final/01-landing-1280.png` |
| Import, wrong file | `../screenshots/design/after-import-wrong-file.png` | `screens/final/check-o-source-zip-rejected.png` |
| Landing, phone | `../screenshots/design/after-home-phone.png` | `screens/final/30-landing-390.png` |
| Dashboard, phone | `../screenshots/design/before-dashboard-phone.png` | `screens/final/31-dashboard-390.png` |
| Editor, narrow window | `../screenshots/design/after-editor-phone.png` | `screens/final/33-editor-manage-view-390.png` |

## 5. UX problems solved

- The site showed its tablet layout in "Computer" view. It now lays out at 1280 px and scales to fit, with a zoom chip.
- The selection could vanish on dark photos or behind sticky headers. It now has a white halo and keeps a constant size; a pill points to a selection scrolled out of view.
- The toolbar covered the words next to the selection and spilled out of the phone frame. It now avoids nearby text and pictures, docks at the top when nothing is clear, and moves less used actions into More instead of clipping.
- "Select parent" took four clicks through three parts called "Box". A breadcrumb names each part by its role.
- Clicking a portfolio photo opened the site's own pop-up. Site click handlers are stopped in edit mode, and clicks reach the photo under hover layers.
- The main photo of a template set as a CSS background couldn't be changed. "Change banner photo" replaces it.
- Two Publish buttons, "Saved" in one place and "Unpublished changes" in another, and "online", "live" and "published" used for the same thing. One status line now reads "Saved · Not published yet" or "Saved · 2 changes not published", and one Publish opens a review listing what goes out.
- Version rows were indistinguishable. Each shows its number, date and time, with plain-language confirms for rollback.
- An invalid phone number saved as an empty link; a replaced photo changed its card's shape. Links are checked before saving, and a replaced photo keeps its original frame.
- No first-time guidance. A "Start here" block offers three working shortcuts, and the sidebar lists Website settings, Version history and Images.
- Websites couldn't be deleted although the limit message said to. Delete asks for the name to be typed.
- The import page took the website name after the upload had already started. The name comes first.
- After a text edit, a pointer resting over the canvas made the editor exchange 60 messages a second while the toolbar jumped between two places. The page now reports only changes.

## 6. Accessibility

- Contrast: every text and UI colour pair meets WCAG 2.2 AA, checked on each build. Before the work started, hint text measured 3.2 to 3.7:1 and the focus ring 1.5:1.
- Focus is visible everywhere (white gap plus ink band); toggles and the canvas show it too.
- Keyboard: arrow keys select parts of the page, Enter runs the first action, Tab reaches the toolbar, F6 moves between regions, Esc closes panels, `?` lists shortcuts. Focus returns to the control that opened a panel.
- Every icon-only control has an accessible name (enforced by the build); selections are announced; pictures without a description are announced by file name.
- Targets are at least 44 px on touch screens; editing stays available at 200% zoom on a laptop; motion collapses to nothing under reduced motion.
- Not verified: real screen readers, Safari and Firefox, real phones. See `../verification.md`.

## 7. Implementation summary

- No new runtime dependencies. Two fonts and one icon set were added as static files, with owner approval. Build-only tools (fonttools for subsetting) ran in throwaway environments and are not part of the app.
- Main files: `assets/static/css/{app,screens,editor}.css`, `assets/views/**`, `frontend/editor/**`, `frontend/agent/agent.ts` (the overlay inside the imported site), `frontend/protocol.ts`, `assets/static/fonts/`, `assets/static/img/icons.svg`, `scripts/design/`.
- Server changes made for the redesign: website deletion, background photo replacement, a dashboard status, refusing an empty publish, and designed 404 pages.
- Security was kept: the imported site still runs on a separate origin in a sandboxed frame, every message from it is parsed and capped, and only the app can start a text edit.
- Known limitations: undo reloads the page behind the scenes (no flash, scroll and selection kept); the toolbar can change position once when the editor re-renders with unchanged inputs; Esc on Version history also clears the selection; Unicode normalisation of file names is not done.
