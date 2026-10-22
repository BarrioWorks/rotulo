# Launch redesign: final verification

This record checks the redesigned Rótulo against brief section 16, `PLAN.md` and `decisions.md`. The baseline is `audit/README.md` (commit `9f1c48d`). The build under test is `main` at `66e03d1`, served by `rotulo-dev` at `http://127.0.0.1:5150` on 2026-10-20.

No participants took part. One agent walked every journey once per width in Chromium (the T3 preview, incognito profile). Repeated measurements ran in `chrome-headless-shell` 154 over CDP. Every claim carries a label:

- **Measured.** A number or string read from the page, the DOM, the server or `curl`.
- **Observed.** Seen on screen or in a screenshot.
- **Read.** Taken from code, with a path.
- **Inferred.** A conclusion drawn from the above.

The accounts were `launch-verify-1020a` (1280 walk), `-b` (834), `-c` (390, Landwind, refusal at 1280), `-d` (keyboard walk), `-e` (empty dashboard at 1280), all `@example.com`. Scripts and raw data are outside the repository, in `/tmp/verify/` (`bench.mjs`, `bench.jsonl`, `drift.js`, `contrast.js`).

## 1. Landing to the first live site

The baseline rule applies. Each click, typed string, key chord and file choice counts as one action.

| Step | Baseline (audit) | Final | Change |
|---|---|---|---|
| Landing to sign up | Create your account (1) | Import your website (1) | same |
| Sign up | name, email, password, Create account (4) | name, email, password, Create account (4) | same |
| Reach the drop zone | New website (1) | none. Sign up lands on Import a website | **-1** |
| Choose the ZIP | 1 | 1 | same |
| Reach the editor | Open editor (1) | none. A clean import opens the editor | **-1** |
| First edit | click heading, Edit text, type, Enter (4) | click heading, click again, type, Enter (4) | same |
| Publish | Publish, Publish (2) | Publish, Publish (2) | same |
| **Total** | **14** | **12** | **-2** |

Measured by count on the 1280 walk. The live home page then served `<h1>Ten bags from Los Naranjos, verified</h1>` (measured with `curl` against `furnace-hill-coffee-16.sites.localhost:5150`).

One caveat on the edit. The second click puts the caret where the pointer lands, and typing inserts there (observed, my first key produced "NaranjTos"). To replace the whole heading I pressed Ctrl+A first, so my real walk was 13 actions. The baseline count did not record a select-all either, so the rule's 12 against 14 is the fair comparison (inferred).

## 2. The twelve journeys

### At 1280 x 800, Furnace Hill

| # | Journey | Before | After | Did it land | Friction and hidden interactions |
|---|---|---|---|---|---|
| 1 | Understands the purpose | 0 | 0 | Observed. The first viewport names who it is for ("your AI-made website"), what it does (import the ZIP, click, change, publish), the requirement (HTML files, one ZIP up to 25 MB), the price (free to try) and the refusal case (Lovable, Bolt, v0 source). Baseline said "Your website. Yours to edit." with no "AI" and no requirement | No 5-second reader test was run in this session. That check belongs to the definition of done and is not covered here |
| 2 | Registers | 5 | 5 | Measured. `POST /register` 303 to `/projects/new` | Short password gives "Use at least 10 characters." inline, keeps the other fields, sets `aria-invalid` and focuses the field (measured) |
| 3 | Imports the ZIP | 2 (+1 Open editor) | 1 | Measured. 7 pages imported, editor URL loaded | The import and success screens are skipped for a clean ZIP. The editor opens with the tip "Click any highlighted text, then type to change it." (observed) |
| 4 | The site appears correctly | 0 | 0 | Observed (`editor-resting-1280`, `live-site-1280`) | The tip floats over the excerpt at 1280 (observed, `editor-first-edit-tip-1280`) |
| 5 | Edits text | 4 | 4 | Measured, curl above | The second click focuses Edit text and a typed key starts the edit (observed). The caret sits at the click point, not around the whole text (observed) |
| 6 | Replaces an image | 3 | 3 | Measured. Live `images/uploads/7ad69a48fae46f9a.jpg` has SHA-256 `7ad69a48…c50a`, identical to `fixtures/images/replacement-coffee-cherry.jpg` | The Image panel focuses the description field with the old text and says "Check the description still matches the new photo." Nothing requires a new one (observed) |
| 7 | Changes a link | 4 (+1 to close the Image panel) | 4 (+1) | Measured. Live `<a class="read-more" href="about.html">` | The Image panel covers the link, so Escape is needed first. Escape returns focus to Replace image (measured). The caption now names the destination, "Link: About page" (measured). This fixes Studio problem 9 |
| 8 | Saves | 0 | 0 | Observed. Caption reads "Heading · Saved". The draft survived sign out and sign in (journey 12) | none |
| 9 | Previews mobile | 1 | 1 | Measured. Phone frame 317 x 686 at Fit 81% | none |
| 10 | Publishes | 2 | 2 (keyboard 2) | Measured. Version 2 live with 3 changes | The review lists "link change", "image description", "image change". Rows for image changes are buttons that open the part. The "link change" row is a plain `li`, not a button (measured), so decision 14 landed for two of three change kinds |
| 11 | Opens the live site | 1 | 1 | Measured. "View website" is `target=_blank rel=noopener noreferrer` to the live host | The new "is live" sheet replaces the toast and takes focus (measured) |
| 12 | Returns and edits again | 4 (scope not stated) | 11 from the homepage: Sign in, email, password, Sign in, Edit, 4 to edit, 2 to publish. 7 from the dashboard | Measured. Live excerpt ends "exactly what it cost. Updated on return." | Sign out lands on `/`. A signed-in visitor who opens `/` is sent to `/projects` (observed). The dashboard Edit button sits at y 777 to 821 on an 800 px screen, half below the fold (measured). The dashboard thumbnail still shows the old cherries photo (observed, see problem 1) |

Version history now shows the whole list with a part selected (observed, `editor-version-history-1280`). The audit's 331 px inner scroll is gone. The settings sheet explains that the website name is only for the owner ("Only you see this name, in Rótulo", observed), which answers Studio problem 6. The "Keyboard shortcuts" button no longer collides with the domain field (observed, `editor-settings-domains-1280`).

### At 834 x 1112 and 390 x 844, journeys 3 to 10

| # | 834 actions | 390 actions | Landed (834, 390) | Drift at 834 / 390 |
|---|---|---|---|---|
| 3 | 1 (drop zone is the empty dashboard) | 1 | Yes, yes (measured, editor URL) | baseline set after load |
| 4 | 0 | 0 | Observed both | 0 / 0 |
| 5 | 4 | 4 | Live `<h1>Ten bags from Los Naranjos, tablet` and `…, phone` (measured) | 0 px on 15 rects / 0 px on 12 rects |
| 6 | 3 (Replace image in the bottom bar) | 3 | Same SHA-256 `7ad69a48…c50a` on both live sites (measured) | 0 / 0 |
| 7 | 4 (+1 Escape) | 4 (+1 Escape), plus scrolling the canvas to reach the link | `href="about.html"` on both (measured) | 0 / 0 |
| 8 | 0 | 0 | Observed | 0 / 0 |
| 9 | 1, Phone screen, Fit 100% | **2**, View then Phone screen | Measured | 0 / 0 |
| 10 | 2 | 2 | Versions live at `furnace-hill-coffee-17` and `-18` (measured) | 0 / 0 |

At 834 I did not rewrite the image description. The live page then shipped `alt="Coffee cherries ripening on a branch, some still green and some turning red"` on the new photo of a hand (measured). This is problem 1.

At 390 the preview tool could not scroll the cross-origin canvas, so I reached the link with ArrowDown from the photo (5 key presses, one overshoot). A touch owner would swipe instead (inferred). On the way the keyboard selected the "·" separator between the date and read time as its own part (measured, the announcer said "Text selected: ·.").

The two "More" buttons the Studio record found at 390 are gone. The bottom bar holds Undo, Redo, Edit, Preview, View, then the selection's actions (measured).

### The AI-tool-style export: Landwind (`fixtures/zips/landwind.zip`)

- Import took 1 action and stopped on a success screen: "Landwind 1 page imported and ready to edit. We left out 4 files your website doesn't need." with "Open the editor" (observed, `import-success-landwind-1280`). That is +1 action against Furnace Hill, because the report has skipped files to show (inferred).
- Heading, hero image and the "View on GitHub" link all changed and published (measured on `landwind-15.sites.localhost:5150`: "Building better landing pages.", `href="https://example.com/verified"`, `images/uploads/7e5e3e2a2bec2777.jpg`).
- The image hash differs from the fixture on purpose. The served file is 1533 x 1200, the old frame's shape, and a centre crop of the fixture matches it at RMSE 0.57% (measured with ImageMagick). The panel says "The new picture is trimmed to the shape of the old one" (observed).
- The tip covers the hero's intro paragraph (observed, `editor-landwind-tip-1280`). The switcher shows "Landwind" then a wide gap before "/ Home" (observed).

### The source-only ZIP: `fixtures/zips/vite-source-only.zip`

Refused before upload at 834, 390 and 1280 (measured, no `fetch` or `XMLHttpRequest` fired after the file was chosen). The page shows "This ZIP needs a finished website" and the exact server text, "This ZIP contains source code rather than a finished website. Export the built static website files and try again." (measured, matching `src/import/mod.rs:78` and `frontend/import.ts:82`). Focus moves to "Try another file" (measured). That button resets the form and focuses the chooser but does not open the picker, so retrying costs one more action (read, `frontend/import.ts:465`).

## 3. Zero drift of the global controls

Method. `drift.js` records the rect of the top band, the bottom bar and every button and link inside them, keyed by DOM order, and compares them after each step. A move above 0.5 px counts (measured).

| Width | Checkpoints | Rects | Result |
|---|---|---|---|
| 1280 | selected, second click, editing, after Enter, publish review, is-live sheet, image selected, Image panel, link selected, link saved, phone screen, second review, second publish, version history (twice), settings, settings closed | 15 | **0 px** at all 17 |
| 834 | 8 checkpoints from heading selected to live | 15 | **0 px** |
| 390 | 8 checkpoints from heading selected to live | 12 | **0 px** |

Text inside a control may change ("Publish" to "Publish · 3", "Not published yet" to "Published at 08:40 PM"). The rects did not.

## 4. Keyboard only

Walked at 1280 on account `-d`. Focus was checked after every key with computed styles, and by screenshot where the ring is drawn by a pseudo-element (measured).

- **Sign up.** The name field is autofocused. Tab moves through name, email, password. Enter submits. Every field shows a 2 px white plus ultramarine ring (measured `box-shadow`). An error keeps focus on the failing field (measured).
- **Import.** Focus starts on `BODY`. Skip to content, then Tab three times (Your websites, Check compatible exports, Name this website) reaches the chooser. The real file input is transparent over the drop zone, and the drop zone draws a 2 px ultramarine outline while it has focus (measured, screenshot). Enter opens the picker.
- **First edit.** The editor opens with focus on `BODY`. Tab, Enter on Skip to content, then Tab reaches the canvas, whose name is "Your page: Home, editing. Use the arrow keys…" (measured). ArrowDown first selects the site's own "Skip to the content" link (measured). The fastest path was Ctrl+K, "main heading", Enter, then Enter to edit, Ctrl+A, type, then Escape or Enter to finish. The announcer said "Heading selected: Ten bags, edited by keyboard." (measured).
- **Publish.** Ctrl+Shift+P opens the review with focus on Publish. Enter publishes, and focus moves to the is-live sheet. Tab reaches Close, drawn with a double white ring on ultramarine (observed, measured). Live `<h1>Ten bags, edited by keyboard` (measured on `furnace-hill-coffee-19`).
- **Homepage demo.** The tablist uses roving tabindex (0, -1, -1, -1, -1). ArrowDown, ArrowUp, Home and End move and select, wrapping at both ends. Tab leaves to the visible panel (measured). Focus draws a double white ring through `::after` (observed).

Escape, layer by layer (measured):

| Layer open | Escape result | Focus goes to |
|---|---|---|
| Text editing | Ends the edit, keeps the selection | the canvas |
| Image panel | Closes the panel | Replace image |
| Settings sheet | Closes the sheet | Settings |
| Is-live sheet | Closes the sheet | Publish |
| Publish review opened by Ctrl+Shift+P | Closes the review | the status pill "Not published yet. Publish", not Publish |
| Version history inside the review | Closes history **and** the review in one press | the canvas, not Publish |

Two of six layers return focus somewhere other than their opener. Neither strands focus on `BODY` (inferred).

## 5. Accessibility spot checks

### Contrast

Method. A script walks every visible text node, reads its computed colour, composites any translucent backgrounds up the tree, and counts the ultramarine field painted by `.mk-field::before` only where the text sits inside it. It applies WCAG 2.x ratios at 4.5:1, or 3:1 for large text (measured). Text over photographs is not covered. One case the script got wrong was checked by pixel. The homepage figcaption sits on `#fafafb`, not on the field.

| Pair | Ratio | Where |
|---|---|---|
| `#ffffff` on `#3730bd` | **9.05** (recomputed independently) | marketing fields, auth aside, buttons, the is-live sheet |
| `#ffffff` on `#2e28a3` | 10.78 | import drop zone |
| `#dad9f8` on `#3730bd` | 6.58 | secondary text on every field, the lowest on blue |
| `#5f5f6b` on `#fafafb` | 6.04 | password hint, account email, the lowest overall |
| `#a01c24` on `#e8e8ec` | 6.40 | "Refused" label |
| `#774000` on `#e8e8ec` | 6.83 | "Imports, edits only part" label |
| `#0f5e35` on `#e3f1e8` | 6.74 | "Published" badge |
| `#4a4a55` on `#fafafb` | 8.38 | body copy |
| `#3730bd` on `#fafafb` | 8.68 | links |
| `#17171c` on `#fafafb` | 17.12 | headings |

**No failures** on `/`, `/compatible-exports`, `/visual-html-editor`, `/static-website-hosting`, `/register`, `/login`, `/projects/new` and `/projects` (empty and with a site) (measured).

### Structure

| Page | h1 | Heading order | Landmarks | Images without `alt` |
|---|---|---|---|---|
| `/` | 1 | 1, 2, 2, 2, 2, 3… no skips | header, 2 nav, main, footer | 0 of 8 |
| `/compatible-exports` | 1 | no skips | header, 3 nav, main, footer | 0 of 0 |
| `/visual-html-editor` | 1 | no skips | header, 3 nav, main, footer | 0 of 2 |
| `/static-website-hosting` | 1 | no skips | header, 3 nav, main, footer | 0 of 2 |
| `/register`, `/login` | 1 | **h2 before h1**. The aside's "Your website. Your next change." comes first in source | header, nav, main, aside, footer | 0 of 1 |
| `/projects` | 1 | 1, 2 | header, 2 nav, main, footer | 0. The thumbnail uses `alt=""` beside the site name |

All measured. `lang="en"` on every page.

### Reduced motion

Emulated with CDP `Emulation.setEmulatedMedia` in headless Chromium (measured). On the homepage, the ring draw `mk-ring-draw` (640 ms) became `mk-fade` (120 ms). The caption fade and the demo panel's `mk-step-in` both became 120 ms fades. Read in CSS. `app.css:655` limits transitions to opacity at 120 ms. `screens.css:470` removes all motion on auth and dashboard. `editor.css:444` turns panels into a 140 ms fade. `agent.ts:85` drops the hover and pulse in the canvas. The editor's own behaviour under emulation was read, not walked.

### Touch targets at 390

Measured with `getBoundingClientRect`:

- Editor top band and bottom bar. Every control is 44 px tall or more (Back 44 x 44, Images 51 x 44, Settings 57 x 44, Publish 104 x 44, Undo and Redo 44 x 44, View 83 x 44, selection actions 76 to 130 x 44, View menu items 210 x 44).
- Publish review. Rows 334 x 56, Cancel 76 x 44, Publish 79 x 44, Version history 86 x 44.
- Dashboard. Edit and More are now 44 px (the audit measured 30 px). The site name link is 194 x 28.
- Marketing header and hero. All 44 px or more. Demo tabs 72 x 64. The inline "Check your export" link is 131 x 19.
- **Is-live sheet. Close 68 x 36, View website 117 x 36, Copy address 120 x 36.** The coarse-pointer rule that lifts buttons to 44 px covers `.studio-pop`, `.ed-settings` and `.ed-publish-pop`, not `.live-sheet` (read, `assets/static/css/editor.css:448`). So the sheet stays at 36 px on a phone (inferred).
- Compatible exports "On this page" links are 358 x 32.

## 6. Editor measurements

### Layout, layout shift and DOM nodes

Method. `bench.mjs` starts a fresh `chrome-headless-shell` 154 profile, signs in, disables and clears the cache before every load, loads the editor, waits until the canvas reports ready plus 1.5 s, and runs `scripts/studio/measure.js` unchanged. 3 cold loads per size. Machine load average 3.2 to 4.2 on 8 cores during the run, with the T3 browser open (measured with `uptime`).

| Viewport | canvasShare (3 runs) | Canvas rect | Persistent panels | Layout shift (3 runs) | DOM nodes | DCL ms, median (range) |
|---|---|---|---|---|---|---|
| 1280 x 800 | 0.935, 0.935, 0.935 | 0, 52, 1280 x 748 | 0 | 0, 0, 0 | 376 | 233 (215 to 249) |
| 834 x 1112 | 0.844, 0.844, 0.844 | 0, 60, 834 x 939 | 0 | 0, 0, 0 | 376 | 246 (224 to 377) |
| 390 x 844 | 0.795, 0.795, 0.795 | 0, 60, 390 x 671 | 0 | 0, 0, 0 | 376 | 222 (215 to 228) |

What limits these numbers. Canvas share is bounded only by the chrome. At 1280 the 52 px band leaves 748 of 800 px, so 0.935 is the ceiling while the band exists. At 834 the 60 px band and the 113 px bottom bar leave 939 of 1112 px. At 390 they leave 671 of 844 px. All three equal the Studio record's after values. DOM nodes went from 364 in the Studio record to 376, plus 12. I did not trace which 12 elements were added. The tip and the is-live sheet are the likely sources (inferred). Load times match the Studio record within its spread, and I claim no load-time change. Heap reads 9.5 MB in every run because `performance.memory` is bucketed, so it tells nothing.

### Selection latency at 1280

The method is the Studio record's. A `message` listener timestamps the agent's `select`, and the clock starts in the same task as the action. Path A clicks the hidden "Start here" heading and picture buttons, with Escape twice and 400 ms idle first. Path B dispatches ArrowDown on the canvas surface from the current selection. 3 runs of 11 samples per path. The first sample of each run is dropped. No sample timed out, and the `select` kind matched the path every time (heading or image for A; text, link, section or heading for B) (measured).

| Path | Measure | Median (range) | Samples | Studio record, after |
|---|---|---|---|---|
| A | `select` message | 8.7 ms (6.1 to 32.0) | 30 | 7.0 ms (3.4 to 13.5) |
| A | caption visible | 29.4 ms (23.1 to 91.2) | 30 | 8.0 ms (4.1 to 24.0) |
| A | visible + 2 frames | 57.5 ms (55.5 to 118.5) | 30 | 30.6 ms (26.7 to 46.7) |
| B | `select` message | 8.3 ms (5.9 to 24.4) | 30 | 9.5 ms (7.5 to 12.4) |

Verdict on `select`: no measurable difference. The gaps are about 1 ms inside a range of about 25 ms.

The caption is slower on path A, about 22 ms after `select` (median of 30). I traced one sample in the T3 tab. The order was `select` at 5.0 ms, then the agent's `viewport` message at 17.3 ms, then the caption visible at 43.8 ms at opacity 0.33 (measured). On path A the caption waits for the frame after the canvas reports its viewport, then fades in. On path B, where the caption was already visible or moved within the same frame, it showed 0.5 to 1 ms after `select` (measured, 3 samples with no caption before). So the extra time comes from the Start-here route and the fade, not from selection. A direct click inside the cross-origin canvas cannot be timed from the parent, as in the Studio record (inferred). These numbers come from one machine under moderate load. Compare only within this section.

## 7. Remaining problems, ranked by user impact

1. **A replaced photo keeps its old description, social image and dashboard thumbnail.** At 834, the live page shipped the old `alt` on the new photo (measured). The page's `og:image` still points to `images/cherries-on-the-tree.jpg` after the replacement (measured in the live HTML), so a shared link would preview the old photo (inferred). The dashboard card shows that old photo too (observed, `dashboard-sites-1280`), because the thumbnail reads the draft's representative images (read, `src/controllers/pages.rs:207`). Owners swap photos often on a blog (inferred).
2. **The publish review covers the selected heading and its caption at 1280.** The popover spans x 892 to 1272, y 60 to 499. The selected heading spans x 748 to 1178 (measured, `editor-publish-popover-1280`). The is-live sheet covers the same area. This is unchanged from the Studio record.
3. **The second click does not "type over".** Typing inserts at the click point, so an owner who expects to replace the heading gets mixed text ("NaranjTos", observed). The homepage's step 1 says "choose Edit text and type over it" (measured text). Ctrl+A or a triple click is the hidden extra step (inferred).
4. **The first-edit tip covers page content.** It sits over the excerpt at 1280, the "Tuesday is roast day" row at 834, the photo at 390, and Landwind's intro at 1280 (observed). It clears on the first selection, but a click on the covered text hits the tip (inferred). At 834 and 390 the bottom bar also says "Select text or a picture to edit", so two hints show at once (observed).
5. **The is-live sheet's buttons are 36 px tall on a phone** (measured at 390, section 5).
6. **Escape from version history closes the whole review and drops focus on the canvas** (measured). Escape from a shortcut-opened review lands on the status pill.
7. **The link change row in the publish review cannot be clicked**, unlike the image rows (measured DOM).
8. **Generated addresses still carry counters**, such as `furnace-hill-coffee-16` to `-19` and `landwind-15` (observed). The audit raised this.
9. **The page switcher truncates the site name** to "Furnace Hill C… / H…" at 834 and 390 (observed). Studio problem 1 is reduced at 1280 ("Furnace Hill Coffee / Home" fits, observed) but not gone.
10. **The dashboard's Edit button is half below the fold at 1280 x 800** (measured, y 777 to 821).
11. **Keyboard traversal is noisy.** ArrowDown first selects the site's own skip link, and later the "·" separator span (measured).
12. **Small defects.** The app footer's "How it works" links to `/#how`, which does not exist on the homepage. The homepage section is `#demo` (read, `assets/views/partials/app_footer.html:3`, and `curl`). Sign up and sign in put an h2 before the h1 (measured). "Try another file" does not reopen the picker (read). "Version history" appears twice in the review, once as a link and once as a heading (observed). Compatible-exports contents links are 32 px tall at 390 (measured).

What improved and holds (measured unless marked): 12 actions to a live site instead of 14. The source-only refusal happens before upload with the exact text. The requirement and the Lovable, Bolt and v0 caveat appear above the fold before sign up (observed). There are no contrast failures on nine pages. Zero drift at all three widths, zero layout shift, canvas share unchanged. Dashboard targets are 44 px. The full version list shows with a selection. The link caption names its destination. Reduced motion is honoured across marketing, auth and the editor.

## 8. Limits

- No participants. One walk per journey and width. No 5-second comprehension test.
- The 834 and 390 walks used desktop pointer emulation in the T3 preview, not touch. The coarse-pointer CSS was read, not exercised.
- The preview tool could not scroll the cross-origin canvas, so the 390 link journey used the keyboard to reach the link.
- The import progress state was not captured. Imports finished in under a second (observed).
- Selection latency has no before run on this machine. The Studio record's numbers are a reference, not an interleaved comparison.
- Text over images was excluded from the contrast scan.

## 9. Before and after index

Baseline paths are in `docs/launch/audit/screens/`. Final paths are in `docs/launch/final/screens/`. A dash means no counterpart was taken.

| Screen | Baseline | Final |
|---|---|---|
| Home, first viewport | `landing-fold-1280`, `landing-fold-834`, `landing-fold-390` | `landing-fold-1280`, `landing-fold-834`, `landing-fold-390` |
| Home, full page | `landing-1280`, `landing-834`, `landing-390` | `landing-1280` (full), `landing-1280-01` to `-05` (sections) |
| Compatible exports | - | `compatible-exports-1280`, `-834`, `-390` |
| Visual HTML editor | - | `visual-html-editor-1280`, `-834`, `-390` |
| Static website hosting | - | `static-website-hosting-1280`, `-834`, `-390` |
| Sign up | `signup-1280`, `-834`, `-390` | `signup-1280`, `-834`, `-390` |
| Sign in | `signin-1280`, `-834`, `-390` | `signin-1280`, `-834`, `-390` |
| Dashboard, empty | `dashboard-empty-1280`, `-834`, `-390` | `dashboard-empty-1280`, `-834`, `-390` |
| Import, idle | `import-idle-1280`, `-834`, `-390` | `import-idle-1280`, `-834`, `-390` |
| Import, refused | `import-refused-1280`, `-834`, `-390` | `import-refused-1280`, `-834`, `-390` |
| Import, success | `import-success-1280`, `-834`, `-390`, `import-success-landwind-834` | `import-success-landwind-1280`. Furnace Hill skips this screen |
| Dashboard with a site | `dashboard-sites-1280`, `-834`, `-390` | `dashboard-sites-1280`, `-834`, `-390` |
| Editor at rest | `editor-resting-1280`, `-834`, `-390` | `editor-resting-1280`, `-834`, `-390` |
| Editor with the first-edit tip | - | `editor-first-edit-tip-1280`, `-834`, `-390`, `editor-landwind-tip-1280` |
| Heading selected | `editor-heading-selected-1280`, `-834`, `-390`, `editor-landwind-heading-selected-1280` | `editor-heading-selected-1280`, `-834`, `-390`, `editor-landwind-heading-selected-1280` |
| While editing | - | `editor-editing-1280`, `-834`, `-390` |
| Image replaced | - | `editor-image-replaced-1280`, `-390` |
| Link popover | - | `editor-link-popover-834`, `-390` |
| Phone preview | - | `editor-phone-preview-1280` |
| Publish review | `editor-publish-popover-1280`, `-834`, `-390` | `editor-publish-popover-1280`, `-834`, `-390`, `editor-publish-review-1280` (three changes) |
| Published confirmation | `editor-published-toast-1280`, `editor-publish-status-1280` | `editor-is-live-sheet-1280`, `-834`, `-390` |
| Version history | `editor-version-history-1280`, `-834`, `-390`, `editor-version-history-scrolled-1280`, `editor-version-history-v1-1280` | `editor-version-history-1280`, `-834`, `-390` |
| Settings, general | `editor-settings-general-1280` | `editor-settings-general-1280` |
| Domains | `editor-settings-domains-1280`, `-834`, `-390`, `editor-settings-domain-records-1280` | `editor-settings-domains-1280`, `-834`, `-390` |
| Live site | `live-site-1280`, `-834`, `-390` | `live-site-1280`, `-834`, `-390` |

Capture notes. Shots at 834 are 1280 x 1707 and shots at 390 are 780 px wide at 2x, as in the baseline. The 1280 full page was stitched from 10 viewport captures with `docs/launch/home/stitch.sh` and cut into 1600 px sections. The homepage hero ring animates for 640 ms after load, so a capture taken sooner shows a partly drawn ring (observed once at 390, then retaken).
