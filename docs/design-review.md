# Design review, October 2026

A review of Rótulo's own interface with the `impeccable` design skill, ahead of the investor demo. It is a refinement of the existing warm, Craft-like look, not a redesign. Behaviour, API calls, the preview protocol, security headers and the sandbox are unchanged.

Surfaces covered: the landing page, sign in and register, Your websites, Import a website (with both error states), and the editor (top bar, sidebar panels, floating toolbar and its panels, publishing, version history, own domain, dialogs, toasts, loading, preview mode and phone view). Test data: `fixtures/zips/startbootstrap-agency.zip` (the demo site) and `fixtures/zips/landwind.zip`, at 1280×800, about 920 px and 390 px wide.

`PRODUCT.md` and `DESIGN.md` at the repository root record the product context and the visual system this review worked from. `PRODUCT.md` was written without an interview; its inferred facts are marked "(assumption)".

## How the review ran

The critique used two independent passes, as the skill prescribes. A design review looked at the live app. Separately, a detector pass ran `impeccable detect` and took measurements in the browser. The two passes did not see each other's results.

The detector overlay could not be injected into the app. The app's `script-src 'self'` policy blocked it, which is correct behaviour. URL scans failed because the machine has no Chromium. Signed-in pages were therefore scanned from saved HTML with `app.css` inlined.

## Detector findings

**Before**

- **Source scan** (`detect assets/views assets/static/css`) found 2 issues:
  - `low-contrast` in `errors/site_not_found.html`.
  - `marquee` on the indeterminate upload bar.
- **Rendered pages** (7 of them) produced 90 findings:

| Rule | Count | Verdict |
|---|---|---|
| low-contrast | 36 | Real. Almost all came from one token, `--text-3: #8a857b`, at 3.2 to 3.7:1. The Published and Waiting pills were at 4.39 and 4.16:1. |
| cramped-padding | 32 | False positive: image tiles, the canvas frame, closed dialogs and a mock window have flush children on purpose. |
| marquee | 7 | False positive: the indeterminate upload bar is real progress feedback. One finding per page because the CSS is shared. |
| icon-tile-stack | 6 | Valid on the landing steps. The dropzone and error tiles are intentional. |
| tiny-text | 4 | Real: DNS record text at 11 to 11.5 px. |
| skipped-heading | 3 | Real. The landing page jumps from h1 to h3, and the editor had no visible h1. |
| cream-palette | 2 | False positive: the warm sunken canvas backdrop is the design. |

**Browser measurements, before**

- The focus ring (`3px` blue at 28 percent) measured 1.5:1, below the 3:1 needed for a focus indicator.
- Pressed segmented buttons (Edit, Computer screen) showed no focus ring at all.
- The DNS copy buttons were 22 px tall.

**After**

- The source scan reports only the `marquee` false positive.
- Reduced motion now shows a static bar instead of a frozen sliver.
- Writing `DESIGN.md` enables 60 advisory notes: 26 colours, 20 font sizes and 14 radii that are literal values rather than documented scale steps. They are advisories, not defects; see "Deliberately left".

## Critique

### Design health (Nielsen heuristics, before)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Saved, Published and Live are clear. "Saved" was faint, and Publish looked equally urgent with or without changes. |
| 2 | Match with the real world | 3 | Copy is plain and warm. Some technical leftovers remained: "HTML, CSS, JavaScript" on the import page, pixel spacing values, DNS terms. |
| 3 | User control and freedom | 3 | Undo, redo, confirmations and versions are all present. |
| 4 | Consistency and standards | 3 | Two filled blue Publish buttons were on screen at once. The toolbar mixed labelled and unlabelled buttons. |
| 5 | Error prevention | 3 | Destructive confirmations opened with focus on the red button. |
| 6 | Recognition rather than recall | 2 | Text style, Box style and the section actions were icon-only. |
| 7 | Flexibility and efficiency | 2 | Keyboard shortcuts exist but are not shown. |
| 8 | Aesthetic and minimalist design | 3 | Clean, but the Publishing panel carries a lot in a narrow column. |
| 9 | Error recovery | 3 | Errors say what went wrong and what to do. |
| 10 | Help and documentation | 1 | There is no first-run hint in the editor and no help link. |
| | **Total** | **26/40** | **Acceptable** |

### Design-specificity verdict

The palette is specific and well judged: warm paper whites, warm-tinted soft shadows and gently rounded controls. The copy is the product's strongest asset. The structure is more generic. The landing page used an eyebrow pill, a centred hero, a wireframe mock and three equal icon cards.

There are no web fonts, so the type depends on the operating system. On the Linux test machine it rendered as DejaVu Sans, which looks heavier than the San Francisco or Segoe UI the stack was written for.

### Priority issues found

1. **[P1] The editor showed the demo site's tablet layout.** At 1280 px the canvas was 964 px wide, under Bootstrap's 992 px breakpoint. The Agency site therefore showed a "MENU" button instead of its navigation, and investors would see a site that does not match the live one.
2. **[P1] Contrast and focus failed AA.** The quiet gray text, the status pills and the focus ring were all below threshold.
3. **[P1] Publishing had two competing primary buttons.** Neither showed whether anything was waiting to be published.
4. **[P1] The style controls were icon-only.** A first-time owner cannot tell what "Text style" and "Box style" do from their icons.
5. **[P2] The import page asked for the website name after the drop area.** Choosing a file starts the upload immediately, so the name field could never be used.
6. **[P2] The landing page leaned on generic patterns.** These were the "New" eyebrow pill, Unicode glyphs standing in for toolbar icons, and same-size icon cards.

### Persona notes

- **First-time owner:** saw no hint to click the page, unlabelled style buttons, and "HTML, CSS, JavaScript" in the import area.
- **Bakery owner:** the Images panel lists file names, version rows show file counts, and the domain step speaks in DNS terms.
- **Investor watching:** saw the tablet layout in Computer view, dev addresses ending in `.localhost:5150`, and a top bar that shifted when "View website" appeared.

### Audit health (technical, before)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Contrast of quiet text and pills, focus ring at 1.5:1, no editor h1, 22 px copy buttons |
| 2 | Performance | 4 | No framework, one stylesheet, no web fonts, transform/opacity motion |
| 3 | Theming | 3 | Strong token set. Some literal colours and one-off font sizes remain |
| 4 | Responsive design | 3 | Phone layouts work. Editor canvas below the desktop breakpoint at 1280 px. Editor correctly refuses under 900 px |
| 5 | Implementation integrity | 3 | Coherent system. Minor drift (heading levels, a few unthemed browser surfaces) |
| | **Total** | **15/20** | **Good** |

## What changed

There were six commits after `9d5361d`, which added `PRODUCT.md` and `DESIGN.md`.

| Commit | Change | Why |
|---|---|---|
| `80781ad` | The Text style and Box style buttons now read **Style** and **Background**. A destructive confirmation opens with focus on **Cancel**. The live address wraps after a dot or colon. | Recognition over recall. Enter on a delete prompt should not delete. The address no longer breaks mid-word. |
| `f0eef1f` | `--text-3` changes from `#8a857b` to `#6f6a61`; green and amber are darker. The focus ring is a white gap plus a solid 2 px blue band, and pressed segmented buttons keep it. DNS text and copy buttons reach 12 px and 24 px. Selection, caret and native controls use the accent. Reduced motion keeps a static upload bar. The editor gets an h1 (the website name) and h2 sidebar headings. A page-scroll bug in the editor is fixed: the document scrolled 56 px when a sidebar field took focus. The 404 page for unknown sites gets the same contrast fix. | WCAG AA (1.4.3, 1.4.11, 2.4.7, 2.5.8). Browser surfaces now carry the design. |
| `a515e43` | The sidebar is 248 px and the canvas inset 12 px, so at 1280 px the site gets 1008 px. The top bar's right side has a fixed minimum width. Publish rests as a secondary button while the live version matches the draft. | The demo site now shows its real desktop navigation in Computer view. The centre tools no longer jump. Publish turns blue only when there is something to publish. |
| `0548d1b` | The sidebar Publish button is secondary, and the live address opens from an icon button. The pending domain pill no longer stretches. Toolbar panels grow with the toolbar, so the colour swatches fit one row. | One primary action per view. A readable address. A tidy toolbar card. |
| `758f778` | The import page puts the name field before the drop area and uses plain wording ("Use the finished website your tool exported, with its pages, pictures and fonts."). The drop area shows a red outline and a gap above its message when a non-ZIP file is chosen. | The name field was unreachable. No developer jargon. A visible error state. |
| `b837141` | On the landing page, the "New" eyebrow pill becomes a plain line under the buttons ("Works with sites made in Lovable, Bolt, v0 and Claude, and with HTML templates."). The mock toolbar uses the app's icons. The three steps are numbered h2 headings on a hairline instead of icon cards. | It removes three category-default patterns and keeps the same facts. |

No element id, class or `data-*` attribute that the TypeScript or tests use was removed or renamed. `[data-live-open]` and `[data-site-name]` keep their attributes; only their markup changed.

## Screenshots

All screenshots are in `docs/screenshots/design/`.

- **Before:** `before-home.png`, `before-login.png`, `before-dashboard.png`, `before-dashboard-phone.png`, `before-import.png`, `before-import-wrong-file.png`, `before-import-error.png`, `before-editor.png`, `before-editor-text-style.png`, `before-editor-phone.png`.
- **After:** `after-home.png`, `after-home-phone.png`, `after-dashboard.png`, `after-import-wrong-file.png`, `after-editor.png`, `after-editor-text-style.png`, `after-editor-phone.png`.

The before and after editor shots show the demo site's own navigation replacing the "MENU" button. The before shot is unpublished and the after shot is published, because the review published version 1 in between.

## Deliberately left

- **A scaled canvas.** Showing every site at a true 1280 px laptop width, scaled to fit, would also fix Tailwind sites; Landwind's `lg` breakpoint is 1024 px and still needs a window of at least 1296 px. It changes how toolbar coordinates map from the preview, so it is a behaviour change for its own task.
- **A typeface.** Adding one is ruled out (no new fonts or CDNs). On the Mac used for the demo the stack resolves to San Francisco, which is what the design assumes.
- **A publish moment.** A success toast with a "View website" button needs a new toast variant in `ui.ts`. Worth doing, but it is new behaviour.
- **A first-run hint on the canvas** ("Click any text or picture to change it"). This needs state for when to hide it.
- **Product decisions:**
  - Spacing offered as pixel values in the Background panel.
  - The Images panel listing file names.
  - Version rows showing file counts.
  - The `.html` suffix in the Add page hint.
  - An image inside a link selecting the link instead of the image (an editor-agent behaviour).
- **Dashboard thumbnails.** They use the first image in the ZIP, which is a server choice.
- **Type and radius consolidation.** About 60 literal values sit between scale steps (13.5 px, 12.5 px, 5 px radii). Collapsing them onto the documented ramp is a worthwhile follow-up but touches every component.
- **Help and "Forgot password".** These are features, not polish.
