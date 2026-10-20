# Independent design critique (Phase G)

Method: Assessment A (design review) run in this agent by a full live walk of the running app. Assessment B (deterministic detector plus browser measurements) run by an isolated subagent. B's results arrived after the editor walk was finished, so they did not shape the design judgments below.

Subagent E, independent critic. Nothing in the app was edited. The running app at `http://127.0.0.1:5150` was walked on 2026-10-19 as "Rosa Marquez", a bakery owner preparing for a demo, with a fresh account (`rosa.critic.e1019@example.com`). Every claim below comes from that walk or from a measurement in the browser, unless it is marked as inferred. Screenshots are in `shots/`. Files with a `B-` prefix come from Assessment B.

Methods used: Impeccable `critique.md` (Nielsen scoring, cognitive load, personas), `audit.md` (accessibility, performance, theming, responsive, integrity), `craft-floor.md` as the quality bar, and `impeccable detect`. The journey: landing, register, empty dashboard, the wrong ZIP (`vite-source-only.zip`), imports of `startbootstrap-agency.zip` and `landwind.zip`, heading edit, image and hero photo replacement, link change, style panels, the Section menu, add and switch pages, phone view, undo and redo, first and second publish, the live site, rollback, website settings, deleting a website, sign out and sign in. Then keyboard-only selection, focus visibility, 390 px, a 640 px viewport standing in for 200 % zoom, reduced-motion CSS, contrast samples and accessible names.

## 1. Verdict in one paragraph

The redesign is real and mostly coherent. Proof's ink-on-stock palette, Schibsted labels, Newsreader titles, crop-mark selection and ink-ruled dashboard captions are all on screen. The imported site dominates the editor (79 % fit at 1280, no hue in the chrome). Auth, import, the section menu, rollback and website settings are well done. What still reads as unfinished is the moment-to-moment editing. The floating toolbar covers the words next to what you clicked. Edits never say "Saved". The words for "online" change four times. Two inputs silently damage the owner's site. A first-time owner opens the editor to a blank sidebar with no hint of what to do. Those are the five corrections below.

## 2. Heuristic scores per surface

Scores are Nielsen 0 to 4, as defined in Impeccable `critique.md`. Bands: 90 % and up Excellent, 70 % Good, 50 % Acceptable, 30 % Poor.

| Heuristic | Landing | Auth | Dashboard | Import | Editor | Publish, versions, settings |
|---|---|---|---|---|---|---|
| 1 System status | 3 | 3 | 2 | 3 | 2 | 3 |
| 2 Real-world match | 4 | 4 | 3 | 3 | 2 | 3 |
| 3 Control and freedom | 3 | 3 | 3 | 3 | 3 | 4 |
| 4 Consistency | 3 | 4 | 2 | 3 | 2 | 2 |
| 5 Error prevention | 3 | 3 | 4 | 3 | 1 | 2 |
| 6 Recognition | 3 | 3 | 3 | 4 | 2 | 3 |
| 7 Flexibility | n/a | 2 | 2 | 2 | 3 | 2 |
| 8 Minimalist design | 3 | 4 | 3 | 3 | 3 | 3 |
| 9 Error recovery | 3 | 4 | 3 | 4 | 2 | 3 |
| 10 Help | n/a | 3 | 3 | 4 | 2 | 3 |
| **Total** | **25/32 (78 %, Good)** | **33/40 (Good)** | **28/40 (Good)** | **32/40 (Good)** | **22/40 (Acceptable)** | **28/40 (Good)** |

Landing scores 7 and 10 as n/a because it is a Persuade surface.

### Evidence per surface

**Landing** (`01-landing-1280.png`, `02-landing-below-fold.png`, `B-landing-390.png`). One clear primary action, an honest product claim and a live-looking editor illustration. Weaknesses: the page ends on a footer with no closing call to action. "Your website stays yours" sits alone in a 490 px-wide empty left column. The illustration shows a toolbar to the right of the heading with "Edit text / Style", while the real toolbar sits above it with an uppercase "HEADING" crumb (`10-editor-heading-selected.png`). The demo promises an interface the product does not have.

**Auth** (`03-register.png`, `51-login-error.png`). This is the strongest surface. Errors are inline and tied to fields through `aria-describedby`, focus goes to the first invalid field, a password show toggle is present, and the "can't reset passwords yet" note is honest.

**Dashboard** (`04-dashboard-empty.png`, `08-dashboard-two-sites.png`, `45-dashboard-390.png`, `46-dashboard-card-menu.png`, `47-delete-confirm.png`, `48-deleted-toast.png`). Type-to-confirm delete with inline mismatch error and a toast is excellent. Weaknesses:
- The status words differ from the editor's (section 5, weakness 2).
- Thumbnails are the first image in the ZIP, not the page. Agency shows a watch close-up from the portfolio, and it still showed that after the hero photo was replaced and published.
- With one or two sites, the page is one small card in the top-left of a 1280 px canvas, which reads empty rather than calm.

**Import** (`05-import.png`, `06-import-wrong-file.png`, `07-import-success.png`). The wrong-ZIP state is clear and opens the "How do I get a ZIP" help automatically. Success leads with a thumbnail and "Open editor". Weaknesses:
- The copy "contains source code rather than a finished website. Export the built static website files" is developer language for this audience.
- The 420 px name field sits above a 712 px drop zone on a different measure.
- The drop zone's icon in a bordered square tile is the one decorative-icon pattern left.

**Editor**. Section 5 and section 7 cover it. The site dominates. Phone view, the section menu, the hidden-section veil, the orphan-page warning and toasts with Undo all work. The keyboard canvas model works. Its score is pulled down by status, vocabulary, error prevention and first-run guidance.

**Publish, versions, settings** (`29`, `30`, `31`, `35` to `41`, `43`, `44`). Rollback copy ("Your editor keeps your newer changes") and the confirm dialog are the best writing in the product. The settings dialog turns "Rosa's Bakery" into `rosa-s-bakery` instead of rejecting it. The under-900 px manage mode is a sensible fallback. Weaknesses:
- The first publish shows no list of what will go live. Only later publishes do (`29` vs `35`).
- After publishing, a disabled grey "Everything is live" button stays in the primary slot.
- The site address is auto-assigned as `agency-6`.

## 3. Audit scores (Impeccable `audit.md`)

| Dimension | Score | Key finding |
|---|---|---|
| Accessibility | 3 | Labels, focus rings and keyboard selection are good. Editing is unavailable at 200 % zoom on a 1280 px laptop, and screen-reader status messages go stale. |
| Performance | 3 | Imports, publishes and saves are near-instant. Undo reloads the whole canvas and jumps scroll (`23-…png`). |
| Theming | 3 | Tokens are used throughout. Assessment B counted 4 font sizes in the editor and 11 on the landing. No hard-coded colours were found on screen. Light theme only, which the brief does not require. |
| Responsive | 3 | No horizontal overflow at 390 px on any page (Assessment B). Below 900 px the editor becomes manage mode. |
| Implementation integrity | 3 | The detector raised 2 findings, both false positives. Drift is limited to icon alignment in menus and rounded cards outside Proof's flat rule. |
| **Total** | **15/20 (Good)** | |

## 4. Against the brief's character, its "avoid" list, and the Proof contract

**Desired character.** It is bold but not loud, and precise without feeling technical in its chrome. It is *not* yet "minimal but not empty". The editor sidebar is 248 px of white with one row ("Pages / Home") until something is selected (`09-editor-first-open.png`). The one-site dashboard is similar (`48-deleted-toast.png`). It is also less "creative but predictable" than it should be, because the right panel keeps whichever mode was last opened. Selecting an image after using Background shows "Background and spacing · Image · ..." (`19-…png`), while selecting a link resets it to Pages (`21-…png`).

**Avoid list.**

| Avoid item | Status |
|---|---|
| Purple gradients, glassmorphism, AI illustrations | None present. |
| Excessive shadows | Only floating layers lift. |
| Low-contrast grey text | None. Every sampled text pair is 5.1:1 or better. |
| Oversized hero inside the product | None. |
| Arbitrary rounded cards | Partly present. The import result card, the wrong-ZIP card and both manage-mode cards are 8 px rounded white boxes with hairlines (`06`, `07`, `44`). Proof says flat sheets on hairlines with no card box, and the dashboard follows that while these screens do not. |
| Decorative icons in headings | Mostly avoided. The drop-zone icon tile (`05`) is the remaining case. |
| Identical dashboard cards | Acceptable. The structure repeats but thumbnails differ. |

**Proof contract.**
- The crop-mark selection with a named slug is implemented and is the most recognisable Pagehaven element. On full-bleed elements (the hero header, the site nav) the crop marks fall outside the canvas clip and the selection is a plain rectangle (`15-…png`, `42-…png`). Full-bleed sections are where owners click most.
- A 1 px cyan rule over a pale photo (the replacement hero, `34-…png`) is hard to see. The Proof table measured cyan against white and a dark photo, not against light cyan sky.
- The comp's sidebar carried publishing state, versions and an Images count. The build moved those into popovers, as the editor spec asked, but left the sidebar with nothing in it.

**Recognisable beyond the logo?** Yes on the dashboard, auth and landing, through ink rules, Newsreader titles and crop marks. In the editor, recognition rests almost entirely on the crop marks and the ink Publish button. When those are clipped or washed out, the editor looks like a generic light tool.

**Is the next action obvious to a nontechnical owner?**
- After import: yes. "Open editor" is the primary button.
- On entering the editor: no. Nothing says "Click any text or picture on your page to change it". The landing page says it, the editor does not.
- When changing the hero photo: no. The owner has to know that "Background" on a heading changes the heading's own background, and that the photo belongs to a parent called "Header" in a crumb menu that also lists "Box" (`13`, `14`).

## 5. The five most important remaining weaknesses (ranked)

### 1. The floating toolbar covers the content around the selection

- **Evidence.** It happened on every text selection in the walk.
  - The toolbar hides "Welcome To Our Studio!" when the hero heading is selected (`10-editor-heading-selected.png`, `11-editor-inline-editing.png`).
  - It covers the cart icon above "E-Commerce" (`18-toolbar-covers-icon.png`).
  - It covers the paragraph under "E-Commerce" when placed below (`23-after-undo-scroll-jump-toolbar-covers-text.png`).
  - On Landwind it covers the first line of the paragraph and the descenders of the heading, and the "Link" slug overlaps "Library and" (`52-landwind-toolbar-covers-text.png`).
- **Why it matters.** The owner edits a headline in context. Hiding the line above it is how they lose their place, and it breaks the spec's own rule that the toolbar "never sits on the thing it edits" (editor spec §1, §5.3). In a demo, it is the first thing an investor sees after the first click.
- **Correction.** Make placement collision-aware against content, not just the selection box.
  1. In `frontend/agent/agent.ts`, send the rects of the nearest text, image and icon nodes above and below the selection with the `select` message (the iframe already computes geometry).
  2. In `frontend/editor/toolbar.ts`, score four candidates (above-start, below-start, above-end, outside the canvas in the 12 px gutter) by overlap area with those rects plus the slug. Pick the minimum.
  3. When every candidate overlaps more than about 20 % of a text line, dock the toolbar in a fixed contextual strip at the top edge of the canvas frame (`editor.css`, new `.ftb[data-placement="docked"]`) with a thin cyan connector to the selection.
  4. Move the kind slug inside the selection's bottom-left corner when the space below holds text.

### 2. State is not shown honestly: no "Saved", four words for "online", and a dead button in the primary slot

- **Evidence.**
  - After a text edit, a size change and a link change, the top bar never shows "Saved" or "Saving". It stays on "Not online yet" (polled every 150 ms for 2 s after an edit, `12-style-panel.png`). `statusPill()` in `frontend/editor/state.ts:321-341` has no saved state.
  - The same site is called "Not online yet", "1 change not live", "Live · up to date", "Visitors see version 1" and "Everything is live" in the editor (`30`, `34`, `39`). On the dashboard it is "Not published yet" and "Changes not published" (`45`, `48`). The button says "Publish" and the toast says "Your changes are online".
  - The pill is the smallest text in the editor (12 px, 600). It carries the product's most important state.
  - After publishing, the primary slot holds a disabled, grey "Everything is live" button (`30-published-everything-is-live.png`). It looks broken and offers no next step. "View website" lives only in a toast and in the pill's popover.
- **Why it matters.** Product principle 4 is "Show state honestly: saved or not, published or not". A nontechnical owner who sees no "Saved" after typing will hunt for a Save button. Three verbs for one concept make the owner wonder whether "live", "online" and "published" are different things.
- **Correction.**
  1. Add `{ kind: "saved", at }` to the pill derivation in `frontend/editor/state.ts`. Show "Saved" with a success dot for 2 s after each acknowledged save, then fall back to the publish state, as editor spec §4.4 specifies. Do not announce it.
  2. Pick one verb, "published", and use it everywhere: "Not published yet", "1 change not published", "Published · up to date", "Visitors see version 1". Apply it in `statusPill()`, the publish popover headings, the toasts, the dashboard pills (`assets/views/projects/*.html`, the `pill-{{ p.status }}` labels) and the manage-mode headings.
  3. Raise `.ed-status` to the `label` role (14 px).
  4. When the site is up to date, replace the disabled button with a secondary "View website ↗" (editor spec §4.5).

### 3. Two edits silently damage the owner's site, and the first publish has no review

- **Evidence.**
  - Choosing "Goes to: A phone number", typing `abc` and pressing "Save link" saves the link and announces "Link saved". The site's Contact link becomes `href="tel:"` (`22-invalid-phone-saved-empty-tel.png`, read from the canvas accessibility tree).
  - Replacing a 4:3 portfolio image with a 16:9 photo changes the slot to 356 × 200. That card becomes shorter than its neighbours and the grid row goes ragged (`20-image-replaced-card-shrinks.png`).
  - The first publish ("Put your website online?") lists nothing about what is going live: the new heading, two photos, a hidden section and a new page (`29-publish-popover-first.png`). The second publish does list changes (`35-publish-review-second.png`).
- **Why it matters.** PRODUCT.md's success test is that the owner "trusts that nothing on the site changed except what they touched". A broken phone link on a bakery site costs real calls. A ragged portfolio grid is a visible change the owner did not ask for. The first publish is the highest-stakes moment and the one with the least information.
- **Correction.**
  1. In the link panel (`linkFields()` and `linkPanel()` under `frontend/editor/`), validate before enabling "Save link". A phone number needs at least 3 digits after stripping spaces, dashes and parentheses, and is saved normalised. An email needs a single `@` and a dot in the domain. A web address must parse as a URL, and `https://` is added if missing. Show the error with `.field-error` and `aria-invalid`, worded as a fix: "Enter a phone number with digits, like 555 0134".
  2. In `replaceImage()`, keep the rendered box. Write the slot's current rendered size as the CSS `aspect-ratio` plus `object-fit: cover` through the existing style edit. Offer "Fill the frame" (default) or "Show the whole picture" in the image panel.
  3. Render the same change list in the first-publish popover as in later ones. Group it by page ("Home: text, picture, background photo, hidden section · New page: Our Menu").

### 4. The editor gives no first-run guidance and hides site-level actions

- **Evidence.**
  - On first open, the editor shows the site, an empty sidebar with "Pages / Home", and no instruction anywhere (`09-editor-first-open.png`; the visible text on the page is "Agency, Home, Edit, Preview, Not online yet, Publish, Pages, Fit 79%").
  - Website settings, version history and keyboard shortcuts open only from the site name "Agency", which has no chevron, unlike "Home ▾" beside it (`40-site-menu-icon-misalignment.png`).
  - Page settings is inside a page row's "⋯" menu.
  - The image library from editor spec §4.2 is not in the sidebar.
- **Why it matters.** Recognition beats recall for occasional users (direction README rule 3, PRODUCT "short and occasional" sessions). The brief asks that "the editor should make the next available action obvious". A 248 px panel that is permanently on screen and empty is the cheapest place to do that.
- **Correction.** When nothing is selected, the rail (`frontend/editor/` sidebar or rail module, `editor.css`) should show a "Start here" block under Pages.
  1. One sentence: "Click any text or picture on your page to change it."
  2. Three shortcut rows that perform the action: "Change the main headline" (selects the page's first `h1` or largest heading), "Replace a picture" (selects the first visible image), and "Change your web address" (opens Website settings).
  3. Below that, persistent rows for "Website settings", "Version history" and "Images". Add a chevron to the site-name button so its menu is discoverable.
  4. Collapse the block to one line after the first successful edit. Store that per user in `localStorage` and keep it as a client concern.

### 5. Selection and panel language still leaks the DOM

- **Evidence.**
  - The parent menu for a heading reads "Heading · E-Commerce, Box · E-Commerce, Box · E-Commerce, Box · Services, Section · Services" (shot `23` context, read via the menu items). For the hero it reads "Heading, Box, Header" (`14-crumb-menu-box-header.png`).
  - Crumbs are uppercase ("HEADING", "LINK", "IMAGE", "EDITING TEXT").
  - "Background" is offered on a heading and opens "Background and spacing" for the text element, while the photo the owner means lives on "Header".
  - A transparent background shows as a solid black `#000000` swatch (`13-background-panel-heading.png`, `15`).
  - "Space inside" shows "Original" where its siblings show px values (`15`).
  - Screen readers hear "Image selected: ." and "Link selected." for site images and links without text.
- **Why it matters.** "Box" means nothing to a bakery owner. A black swatch for "no background" invites them to "fix" it. This is the part of the editor where the owner decides what to touch, so ambiguity here becomes mistakes on the live site.
- **Correction.**
  1. In the kind table in `frontend/agent/agent.ts` (editor spec §3.4), drop wrapper elements with no visual box of their own (no background, border or image) from the breadcrumb. Name the rest by role and content: "Banner" for a full-width element with a background image, "Card · E-Commerce", "Section · Services".
  2. On a text selection, rename the toolbar's "Background" to "Highlight", or remove it. Add "Change banner photo" to text inside an element that has a background image. It should select the ancestor and open the photo panel in one step.
  3. Render a transparent value as a checkerboard swatch labelled "None" in the colour control.
  4. Render crumbs in sentence case.
  5. Announce elements without alt or text as "Picture (no description yet)" and "Link to Contact section", using the destination already computed for the toolbar ("Link · Contact Us section").
  6. When the selection's kind changes, reset the rail to that kind's default panel.

## 6. Accessibility findings (WCAG 2.2)

| # | Criterion | Finding | Evidence | Severity |
|---|---|---|---|---|
| A1 | 1.4.4 Resize Text, 1.4.10 Reflow | At a 640 px CSS viewport (200 % zoom on a 1280 px laptop) the editor is replaced by manage mode, so text and picture editing is unavailable. Reflow allows an exception for 2D content, but older owners who zoom lose the core task. Editor spec §7 already calls for a sidebar drawer below 1100 px, and that drawer would keep editing available down to about 640 px. | `43-editor-200pct-zoom-manage-mode.png` | P1 |
| A2 | 4.1.3 Status Messages | The visually hidden status region goes stale. It kept "Heading selected: It's Nice To Meet You" after the text changed, kept "Text style panel open" after the Background panel opened, and kept "Section hidden on your website" after switching pages. | Status text read from the page during steps `11`, `13`, `27` | P2 |
| A3 | 1.1.1, 4.1.2 | Selection announcements for unnamed site content are empty ("Image selected: .", "Link selected."). See weakness 5. | Keyboard walk, section 7 | P2 |
| A4 | 2.1.1, 2.4.3 | Arrow-key selection works and scrolls the canvas. After a pointer click, focus can land on the toolbar's "Edit text", and arrows then stop moving the selection until Escape (`17-…png`). Reaching a portfolio image takes about 25 ArrowDown presses, with no section-jump key. | `17`, `19` | P2 |
| A5 | 3.3.1, 3.3.3 | The link editor accepts an invalid phone number with no error. See weakness 3. | `22` | P1 |
| A6 | 2.4.7, 2.4.11, 2.4.13 Focus | Pass. The ring is a 2 px white plus 2 px `#0A86D6` halo with a transparent outline for forced colours. Cyan on white is 3.89:1. | Computed style on the page switcher | Pass |
| A7 | 1.4.3, 1.4.11 Contrast | Pass on all samples. Pill text 5.11:1, zoom label 7.23:1, crumbs 8.87:1. The one failure Assessment B found, the `/` separator at 1.68:1, is `aria-hidden` and decorative. | Computed in page | Pass |
| A8 | 2.5.8 Target Size | Pass for controls (30 × 30 icon buttons, 28 px swatches). The block-level site-address links in manage mode are 22 px tall at 390 px (Assessment B). | `44` | P3 |
| A9 | 2.3.3, reduced motion | `app.css:173` zeroes the motion tokens, but `app.css:571` also forces every animation to 1 ms and one iteration. That freezes `.spinner` mid-turn. `agent.ts:84` handles the canvas overlay correctly. Keep the token approach and give loading a non-motion indicator rather than a global kill. | CSS read | P3 |
| A10 | 1.3.1, 2.4.4 | Accessible names carry a stray comma and space: "Pagehaven , your websites" and "Agency , open in the editor". | Accessibility tree | P3 |
| A11 | 3.3.1, 3.3.3 | Pass. Register, sign-in, wrong ZIP and delete-confirm errors are specific, inline and tied to fields. | `03`, `06`, `47`, `51` | Pass |

## 7. Broken or confusing behaviour

1. **Invalid phone saved as an empty `tel:` link**, with a "Link saved" confirmation. Weakness 3 covers it (`22`).
2. **Image replacement changes the slot's aspect ratio** and makes the grid ragged (`20`).
3. **Undo reloads the whole canvas and loses scroll position.** The canvas jumped from the portfolio (scrollY about 1313) to scrollY about 1000. The next click landed on a different element than the one under the pointer before undo (`23`).
4. **The publish popover is not dismissed by clicking the canvas.** It stayed open over the site while editing. Ctrl+A then selected the whole app chrome. Enter, meant to start editing the selected heading, activated the focused address link in the popover and opened the live site in a new tab (`33-popover-stays-open-ctrl-a-selects-chrome.png`). The extra tab appeared in the browser's tab list.
5. **The right panel keeps the last mode across selection kinds.** "Background and spacing" stayed open for a heading, then an image ("Image · ..."), then reset to Pages for a link (`19`, `21`).
6. **Hiding a section removes its anchor from the published markup.** The site nav's "Services" link now points to nothing, and nothing warns the owner. Verified on the live site: `#services` is absent.
7. **Dashboard thumbnail is not the site.** The Agency card shows a portfolio watch photo before and after the hero was replaced and published (`45`, `48`).
8. **The address is auto-assigned with a counter (`agency-6`)** on first publish. It is changeable afterwards, but the owner never chose it (`29`).
9. **Session clash risk, environment only.** Two agents shared one incognito cookie jar, and Assessment B registered and logged out mid-walk. My session survived. This is noted only so the integrator knows the walk was not disturbed.

## 8. Secondary issues

- **Menu icon alignment.** In menus where some items have icons and some do not, labels start at two x positions. "Version history" and "Keyboard shortcuts" sit at 57 px while "Website settings" and "View website" sit at 81 px (`40`). The account menu does the same with "Your websites" and "Sign out" (`49`). Either give every item an icon or reserve the icon column. `app.css` `.menu` item grid.
- **The selection outline is too thin on light photos.** On the pale replacement hero the 1 px cyan rule nearly disappears (`34`). Add a 1 px white outer keyline, or use the dark ink keyline on light backgrounds as the direction README rule 2 allows.
- **Crop marks are clipped on full-bleed selections** (`15`, `42`). Draw them inset (inside the corners) when the element touches the canvas edge.
- **The first publish shows two filled ink "Publish" buttons at once**, one in the top bar and one in the popover (`29`). Turn the top-bar button into its pressed or expanded state while the popover is open.
- **Import copy.** Replace "source code rather than a finished website. Export the built static website files" with "This ZIP holds the files used to make your website, not the website itself. Ask the tool for the finished website, then try again." (`06`).
- **Import layout.** Put the 420 px name field and the 712 px drop zone on one measure. Drop the bordered icon tile in the drop zone (`05`).
- **Rounded cards outside Proof.** The import result, the wrong-ZIP card and the manage-mode cards (`06`, `07`, `44`) should become hairline-ruled sheets like the dashboard captions.
- **Manage mode repeats the address twice** in the first two blocks (`44`).
- **Landing ends without a closing call to action**, and the "stays yours" heading leaves a 490 px empty column (`02`). Align the landing illustration's toolbar with the real one (`01` vs `10`).
- **The one-site dashboard feels empty** (`48`). At one or two sites, let the card span two columns, or place the "How do I get a ZIP" help and a ghost "Import another website" tile beside it.
- **Versions are timestamps only** (`36`). Show the change summary already computed for the publish popover ("Text change on Home") under each version so the owner can tell which one to roll back to.
- **"Space inside: Original"** displays a word where siblings show px (`15`).
- **Toast and tooltip collide** after a background-photo replace. The "Upload a new photo for the background" tooltip lingers over the toast (`16`).
- **Signing out lands on the landing page without a confirmation line** (`50`).
- **Selection crumbs and editing labels in uppercase** ("EDITING TEXT", "HEADING") are the only uppercase UI text in the product. Use sentence case to match Schibsted's label role.

## 9. What works and must survive

- **The site dominates.** The canvas renders the true 1280 px layout at fit-to-window (79 %). Tailwind's `lg` breakpoint now shows desktop (`52`, compare editor spec shot 10), and the chrome has no hue.
- **Undo is everywhere and friendly.** Toasts carry "Undo", undo labels are capitalised ("Undo: Background photo change"), and rollback is reversible and explained (`16`, `25`, `37`).
- **Section actions.** The menu is plain and safe: Duplicate, Hide on your website, and Remove section in red behind a separator. The hidden veil and its label are clear (`24`, `25`).
- **Phone view** has a device frame and the note "Phone view. Changes made here also apply on computers." (`28`).
- **The orphan-page warning** ("Visitors can't reach Our Menu yet…", `27`) is exactly the kind of plain guidance the rest of the editor needs.
- **Auth and delete-confirm** are at the craft floor or above.

## 10. Assessment B (deterministic detector and browser evidence)

- **CLI.** `impeccable detect --json assets/views assets/static/css` exited 2 with 2 findings, both verified false positives.
  - `marquee` at `screens.css:190-191` is the indeterminate import progress bar. It has a static reduced-motion fallback at `screens.css:360`.
  - `repeating-stripes-gradient` at `app.css:86` is the `--overlay-veil` token. B found no use of it under `assets/`, so it is dead in the app stylesheet. The hidden-section hatch on the canvas is drawn by the agent inside the iframe (inferred from `25`).
- **Overlay.** Injecting `detect.js` was blocked by the app's CSP (`script-src 'self'`, `connect-src 'self'`). No overlay is visible. The live server was started and stopped.
- **Fallback measurements** (B, 1280 px).
  - Distinct font sizes: landing 11, register 6, login 6, dashboard 7, editor 4.
  - Text below 4.5:1: none, apart from the decorative `aria-hidden` slash.
  - Unnamed controls: none.
  - Horizontal overflow at 390 px: none on any page.
- **Where the detector and this review agree.** Both found no anti-pattern costume (no gradients, glass or hero metrics). The detector cannot see the problems above, because they are interaction and copy problems, which is why the live walk carries this critique.

## 11. Questions to consider

- What if the editor's empty rail were the onboarding, the publish review and the version list at once, instead of popovers stacked over the site?
- Should "Background" on text exist at all, when owners almost always mean the banner photo behind it?
- Does the first publish deserve its own moment, with the change list, the address to choose, and a "this is what visitors will see" preview, rather than a 320 px popover?

Questions skipped: this critique is a delegated report to the integrator, and the owner is not in this thread.
