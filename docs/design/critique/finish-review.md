disposition: fix

Inputs I didn't have, or didn't read: there is no `.impeccable/build/state.json`, `spec.json` or `comp-diff` report, so none of the fidelity verdicts below come from measurement. There is no QUALITY BAR card, so the ceiling section is judged against README §3A. There was no image tooling (PIL is missing), so the GROUND row was compared by eye. I sampled `editor.css`, `screens.css`, `app.css` tokens, `agent.ts` and `overlay-theme.ts`, but not `frontend/editor/**` or most templates. The editor captures `after-1280-selected`, `-style-panel` and `-version-history` show a test-modified Agency site: a gradient instead of the hero photo, a "?" added to "Welcome To Our Studio!", and a faint "New headline" drawn over the heading. The published site at agency.sites.localhost:5150 has none of these. Either recapture the editor on a clean fixture, or treat the overlapping text as an editor defect. Until then I can't fully judge whether the site stays visually dominant in the editor.

## persistence

fail.
- PASS: PRODUCT.md exists.
- PASS: The FORM seed reference is valid. `seed:1a97755948638ee9` matches `.impeccable/questions/seeds/1a97755948638ee9.json`, and `concept-seed --check-seed` printed SEED KNOWN (exit 0).
- FAIL: Nothing records a user decision for Proof. The roll assigned Spot Ink. Proof was the delegate's own pick, and the decision page was never started (direction README §2).
- FAIL: Nothing records approval of the second display family. `type-icons/README.md:495` asks the owner to approve Inter and Newsreader, and no approval is quoted anywhere.
- FAIL: There is no build state, measured spec or diff report, so fidelity was never gated.
- FAIL: DESIGN.md has been rewritten to Proof, but it writes the departures down as spec (Newsreader roles, `overlay-hover` cyan). It can't be used to decide disputes against the contract.

## fidelity

Element matrix against `proof/editor-1280.png` and `proof/dashboard-1280.png`:

- TYPE: contradicted. Proof is "Schibsted Grotesk for everything (UI, titles, wordmark)", rule 4 allows one interface family, and the comp sets "Your websites" in Schibsted 600. The build sets page titles, the lead card name, the landing display, empty and result titles and the mobile manage title in Newsreader 450 serif. The only cited reason is foundation.md's rationale, with no user approval.
- MATERIAL: match. The chrome is flat ink and hairline, and the canvas sits on the sunken backdrop with a 1 px keyline.
- GROUND: match by eye. The `#F4F3EF` ground and `#E9E8E3` sunken values are tokens equal to the contract.
- Dashboard grid: contradicted. The comp is three equal bare proofs. The build makes the first card span 2 columns with a 21:9 thumbnail (`screens.css:124-126`). With exactly three sites, row 2 holds one card and two empty columns.
- Caption actions: missing. The comp's "Edit" secondary button and "View website" link are not in the caption row. The whole card is the link and "View website" is inside ⋯.
- Name and status layout: adaptation, uncited. The comp puts the pill on the name row. The build moves it under the name.
- Caption ink rule (2 px) and bare thumbnail: match.
- Editor top bar (back, site / page, undo / redo, Edit / Preview, device, Publish): match.
- Written state: contradicted. The comp writes "✓ Saved · ● 3 changes not published" as plain text. The build shows a 12 px tinted pill ("Visitors see version 1", "Not online yet"), and "Saved" never appears.
- Sidebar Publishing block: adaptation, cited (editor README §4.2: avoids two Publish buttons).
- Sidebar Images / Page settings / Website settings rows: missing. Both the comp and README §4.2 list them. The build shows only Pages, which leaves about 640 px of empty white rail.
- Current page row: adaptation, cited (token proposal `--select-soft`).
- Selection rule, crop marks and slug: weaker than the comp. The values are right, but the overlay scales with the canvas ("Fit 79%"), so on screen the rule is about 1.2 px, the crop marks about 6 px and the slug about 9.5 px. They read much fainter than in the comp.
- Slug face: contradicted. It is set in `system-ui` (`agent.ts:75`, `:81`), a third face on screen. The contract says the Schibsted UI face, or mono for the kind tag.
- Canvas hover: contradicted. The contract says a dashed white 1 px outline with a dark twin, and "hover never looks like selection". The build draws a dashed cyan line at 70% (`overlay-theme.ts:12`, `agent.ts:64`).
- Floating toolbar: adaptation. The comp has Edit text / Style / Link / undo / ⋯. The build adds an uppercase "HEADING ▾" kind label (`editor.css:154,169`) that repeats the slug.
- Canvas fit scaling: adaptation, cited (editor README §2).
- Landing proof sheet with registration marks: added. It is consistent with the world.

## ceiling

These native devices of the world are unused:
- The crop marks and slug are not kept at a constant size on screen, so the signature move shrinks on every scaled canvas.
- The contract's mono kind tag on the slug is not used.
- Registration marks appear only on the landing page, never on dialogs, the import drop zone or the publish review.
- Tabular figures are not used in the version list times.
- The editor sidebar is a blank ruled sheet below Pages instead of a dense proof index.

## material_fixes

1. **Type, second family (contradicts TYPE).** Remove Newsreader from the product, or get the owner's written approval of a second family and record it. To remove it:
   - Point `--font-display` (`app.css:40`) at `var(--font-ui)`.
   - Set the title roles to Schibsted 600, following the token proposal: title-1 30/34 at -0.02em, display weight 650 at -0.03em.
   - Delete the Newsreader `@font-face` blocks (`app.css:13,29`) and `assets/static/fonts/newsreader-display-450.woff2`.
   - Update DESIGN.md's typography block.

   Regardless of that decision, remove the serif from the lead card name at `screens.css:126`. That rule gives one card a serif name while its siblings are sans at the same level. Also remove it from `.placeholder-thumb span` (`screens.css:99`, and drop the `transform: scale(1.5)` hack) and from `.manage-title` (`editor.css:264`).
2. **Dashboard topology (fidelity).**
   - Delete `screens.css:124-126` (the lead card span 2, the 21:9 thumbnail and the serif name) so the grid is three equal proofs, as in the comp.
   - In `assets/views/projects/index.html`, restore the comp's caption action row: an `Edit` button (`btn btn-secondary btn-sm`, pencil icon), a `View website` ghost link with the external icon, and ⋯ pushed to the right.
   - Move the status pill into `.site-head`, next to the name.
3. **Canvas hover is cyan (contract: selection accent).**
   - Change `OVERLAY.hover` in `frontend/overlay-theme.ts:12` and `--overlay-hover` in `app.css:83` to `rgba(255,255,255,.85)`.
   - Draw `.hover` (`agent.ts:64`) as a 1 px dashed white line placed 3 px outside the element, with a `0 0 0 1px rgba(22,22,26,.5)` twin.
   - Correct DESIGN.md `colors.overlay-hover`.
4. **The signature selection shrinks with the canvas (fidelity: signature geometry).**
   - Send the canvas scale to the agent and set a `--k: 1/scale` on the overlay host.
   - Multiply `stroke`, `cropMark`, `cropGap` and the slug size and padding by it, so the 1.5 px rule, the 8 px crop marks and the 12 px slug are exact on screen.
   - Replace `font: 600 12px/20px system-ui` in `.slug` and `.badge` (`agent.ts:75,81`) with Schibsted, loaded through a `FontFace` from `appOrigin + /static/fonts/schibsted-grotesk-400-700.woff2`, falling back to Arial.
5. **Editor sidebar rows are missing (fidelity, and README §4.2).** In `assets/views/projects/editor.html`, add Images (with a count), Page settings and Website settings under Pages as hairline-separated rows with a chevron, matching the comp's lower sidebar. This also fills the empty rail.
6. **Top bar state and primary actions (contract rules 5 and "one primary per view").**
   - Replace the tinted micro pill (`.ed-status`, `editor.css:47-51`) with plain `--fs-meta` text in `--ink-2`: a tone dot and the sentence, preceded by "✓ Saved", as in the comp.
   - While the publish review is open (`after-1280-publish-review`), the top-bar Publish must use the secondary `--btn-*` vars, for example `[aria-expanded="true"]`, so only the popover's Publish is filled.
7. **Floor: kickers and a hard offset shadow.**
   - Remove the "Ready to edit" eyebrow above the result title (`projects/new.html:84`, `.result-badge` at `screens.css:209`). Put it as a success pill after the title, or in the sentence below it.
   - Delete `.demo-eyebrow` (`home.html:50`) and move "Open today from 7am" into the demo's lead line under its heading.
   - Replace `.result-thumb { box-shadow: 0 2px 0 var(--ink) }` (`screens.css:207`) with the dashboard's caption rule, `border-bottom: 2px solid var(--ink)`. It is a zero-blur block shadow, and it is also a shadow declared outside `:root`.
8. **Rounded card boxes soften the proof (README §3A risk).**
   - `.card` (`app.css:488`) and `.manage-card` (`editor.css:269`) use `--radius-float`, the 6 px radius reserved for floating panels. Use `--radius-canvas` (2 px) for them, or drop the box on the mobile manage screen and separate sections with a 2 px ink top rule, as dashboard captions do.
   - Remove the 5 px cyan glow on `.select.editing` (`agent.ts:67`), a zero-offset halo. Mark editing by thickening the crop marks or changing the slug text to "Editing".

## keep

Keep the cyan 1.5 px rule with crop marks and the cyan-strong named slug, the bare thumbnails on a 2 px ink caption rule, the flat `#F4F3EF` ground with a single ink primary, and the landing proof sheet with registration marks. Don't round, tint or shadow any of these while fixing.
