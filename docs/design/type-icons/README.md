# Typography and iconography

Subagent C of the redesign brief (`docs/design/brief.md`, sections 4 and 5). This is an independent recommendation. It was written without reading `docs/design/direction/`.

Method. The installed `impeccable` skill ran its `context` setup (PRODUCT.md and DESIGN.md loaded, platform web, mode Operate for app surfaces). The work then followed `reference/typeset.md` (two isolated assessments, then set the system), the Verify and Refuse lists in `reference/craft-floor.md`, and the scoring frame of `reference/audit.md` restricted to type and icons. The mechanical half is `impeccable detect --json --scope type assets/views assets/static/css`. The design half used computed styles read from the running app at `127.0.0.1:5150` in Chrome 154 on Linux, plus screenshots.

Nothing in the app was edited. Every number below was measured in this session unless it is marked as a judgment.

## Contents

- [1. Typography audit](#1-typography-audit)
- [2. Typeface evaluation](#2-typeface-evaluation)
- [3. Type recommendation](#3-type-recommendation)
- [4. Icon audit](#4-icon-audit)
- [5. Icon system recommendation](#5-icon-system-recommendation)
- [6. Files and how to rerun](#6-files-and-how-to-rerun)

Approval needed. Both recommendations add third-party assets (two OFL font files, Lucide glyph geometry under ISC and MIT). Per brief section 13 they need the owner's dependency approval before anyone puts them in `assets/`. Neither adds an npm runtime dependency, a CDN, or a CSP change.

---

## 1. Typography audit

### 1.1 What the stylesheet declares

Extracted from `assets/static/css/app.css` by `tools/audit_css.py`, a short regex pass over rule blocks.

| Property | Distinct values | Values (count of rules) |
|---|---|---|
| font-family | 3 tokens | `--font` (system text stack), `--font-display` (system display stack), `--mono` |
| font-size | 21 | 13px (17), 12px (13), 13.5px (11), 14px (8), 12.5px (7), 14.5px (4), 15px, 30px, 18px, 24px, 22px (2 each), 10.5px, 16px, 16.5px, 20px, 21px, 26px, 28px, 0.92em, clamp(38px, 6.4vw, 68px), clamp(16px, 2vw, 19px) |
| font-weight | 7 | 650 (13), 550 (8), 600 (8), 700 (7), 750 (2), 520 (1), 450 (1), plus the 400 default |
| line-height | 9 | 1.45, 1.5, 1.3, 1.15, 1, 1.04, 1.55, 1.1, inherited 1.5 |
| letter-spacing | 7 | 0, -0.01em, -0.015em, -0.02em, -0.03em, -0.035em, 0.04em |
| font-variant-numeric | 1 | `tabular-nums` on `.progress-label` and `.release-meta` only |

The detector (`--scope type`) reports 22 advisories, all `design-system-font-size` (sizes off the DESIGN.md ramp, for example 14px, 16.5px, 26px). It reports no tiny-text or low-contrast errors on source. The detector cannot see the next finding, which is the important one.

### 1.2 What actually renders on Linux

`system-ui` and the whole `--font` stack resolve to DejaVu Sans on this machine. Measured with canvas `measureText` at 13px: the app stack, `system-ui` and `"DejaVu Sans"` all give 202.4 px for "Select the part around this one", against 177.1 px for Arial metrics.

DejaVu Sans ships only Book (400) and Bold (700). CSS weight matching sends every requested weight above 500 to the next heavier face. So 520, 550, 600, 650, 700 and 750 all render as the same Bold. Seven declared weights collapse into two. Every button, label, section title, toolbar label, page row, version row and heading in the editor is the same bold. See `shots/current-editor.png` and `shots/current-editor-topbar-2x.png`. In the floating toolbar the context label "Heading" (12px/650) and the buttons "Edit text", "Style", "Background" (13px/550) are indistinguishable except for colour (`shots/current-editor-style-panel-2x.png`).

DejaVu Bold is also wide. "Heading Edit text Link Style Background" measures 297 px at 13px in DejaVu Bold, against 243 to 249 px for every candidate face at 500. The toolbar and the 248 px sidebar are sized around that width.

On macOS the same CSS resolves to SF Pro, which has real 500, 600 and 700 cuts, so the bug is invisible on the demo Mac. That is why it survived the previous review.

### 1.3 Role map (computed styles from the running app)

Read with a `getComputedStyle` walk over every visible text node on `/projects` and the editor. Contrast is measured against the nearest opaque background.

| Role | Where | Size / line-height | Weight declared, rendered on Linux | Tracking | Colour, contrast |
|---|---|---|---|---|---|
| Brand | header wordmark "Rótulo" | 16.5 / 24.75 | 650, Bold | -0.015em | ink 16.1:1 |
| Display | landing h1 | clamp 38 to 68 / 1.04 | 750, Bold | -0.035em | ink |
| Page title | "Your websites", "Import a website" | 30 / 34.5 (26 under 760 px) | 700, Bold | -0.02em | ink 16.1:1 |
| Auth title | sign in, register | 24 | 700, Bold | -0.02em | ink |
| Dialog title | `.modal-body h2` | 18 | 650, Bold | -0.01em | ink |
| Dropzone / empty / result titles | `.dropzone h2`, `.empty h2`, `.result-hero h2`, `.error-card h2` | 21, 24, 22, 20 | 650 or 700, Bold | mixed | ink |
| Card title | `.site-title` | 16 / 24 | 650, Bold | -0.01em | ink 17.2:1 |
| Editor site name | `.ed-site-name` (h1) | 14.5 / 18.85 | 650, Bold | 0 | ink |
| Sidebar section | `summary` "Pages", "Publishing" | 13 / 19.5 | 650, Bold | 0 | ink |
| Sidebar group title | `.ed-section-title` "Version history" | 12.5 / 16.25 | 650, Bold | 0 | ink-2 7.65:1 |
| Navigation rows | `.page-open` "Home", "About us" | 14 / 21 | 520, Bold | 0 | ink, current page accent-text 6.9:1 |
| Body | `body`, `.page-head p` | 15 / 22.5 | 400 | 0 | ink-2 7.1:1 |
| Card and modal body | `.step p`, `.modal-body p`, `.auth-card .lead` | 14.5 | 400 | 0 | ink-2 |
| Form label | `.label` | 13 / 19.5 | 600, Bold | 0 | ink |
| Inputs | `.input` | 14 (13 small) | 400 | 0 | ink |
| Buttons | `.btn` | 14 (15 large, 13 small, 12.5 version actions) / 1.0 | 550, Bold | 0 | varies |
| Segmented | "Edit", "Preview" | 13 | 550, Bold | 0 | ink, ink-2 |
| Editing controls | `.tb-btn`, toolbar | 13 | 550, Bold | 0 | ink-2 |
| Toolbar context label | `.ftb-label` "Heading" | 12 | 650, Bold | 0 | ink-3 |
| Captions and meta | `.site-meta`, `.release-meta`, `.hint`, `.dropzone-limits` | 12 to 13 | 400 | 0 | ink-3 5.37:1 on white |
| Status pills | `.pill` | 12 / 18 | 600, Bold | 0 | green 5.15:1, ink-2 7.65:1 |
| Save state | "Saved" | 13 | 400 | 0 | ink-2 7.65:1 |
| Tooltips | native `title` attributes only | browser default | browser default | none | none |
| Toasts | `.toast` | 13.5 | 400 | 0 | light on dark |
| Numeric values | `.release-meta` "10 minutes ago · 18 files · 764 KB", `.progress-label` | 12, 13.5 | 400 | 0 | tabular-nums only on these two |
| Image file names | `.asset-tile span` | 10.5 | 400 | 0 | ink-3 |
| DNS records | `.dns-kv dd`, `.dns-record-type` | 12 mono, 12/700 with 0.04em | | | |

### 1.4 Findings

**[P1] Hierarchy collapses on Linux and Windows without SF.** Seven weights render as two (section 1.2). Weight is the main hierarchy tool in the current CSS, so on any machine without SF Pro the editor reads as a wall of bold. This is the overuse of weight the brief warns about, made worse by the fallback. The fix is a self-hosted variable face with real 500 and 600, and a rule of three weights.

**[P1] Inputs are 14 px on phones.** Sign in, register and import work on phones (PRODUCT.md). There is no rule raising `.input` to 16 px under 520 px, so iOS Safari zooms the page on focus. Inference from the CSS; not reproduced on a device.

**[P2] 21 sizes doing about 8 jobs.** Half-pixel neighbours (12, 12.5, 13, 13.5, 14, 14.5) carry different roles that no reader can tell apart. Examples: card body 14.5, modal body 14.5, alerts 13.5, toasts 13.5, buttons 14, inputs 14, hints 12.5, version meta 12.

**[P2] Text below the floor.** `.asset-tile span` is 10.5 px (image names in the Images panel). Twelve rules sit at 12 px, including the toolbar context label and the spacing labels in the Background panel. For an audience PRODUCT.md describes as older and less confident, 12 px should be reserved for pills and keyboard hints.

**[P2] Tabular figures only in two places.** Version numbers, file counts, sizes, upload limits and website counts change width as they update. Only `.release-meta` and `.progress-label` set `tabular-nums`.

**[P3] Tracking tuned to SF, not to what renders.** Negative tracking (-0.02 to -0.035em) on headings was written for SF Pro Display. On DejaVu it tightens an already heavy face. Every role at 12 to 15 px sets tracking 0, which is right for SF Text and for DejaVu, but not for Inter-class faces, which want slight negative tracking above 13 px.

**[P3] Tooltips are native `title` strings.** They take the OS font, size and delay, so they belong to no type role. This is an interaction-design call for Subagent B or D; it is noted here because it is a text style the system does not own.

Contrast passes. Quiet text (`--text-3`, `#6f6a61`) measures 5.37:1 on white, 5.01 on paper, 4.67 on sunken paper, 4.59 on the active surface and 4.76 on the blue mist. That holds AA everywhere it sits, with little margin on sunken surfaces. Disabled controls use opacity, which drops a ghost button label to 2.13:1 and the primary button label to 2.01:1 against its own fill. WCAG exempts disabled controls, but at 2:1 a disabled Publish reads as broken, not as waiting.

### 1.5 Audit health, type and icon scope

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Contrast passes. 10.5 px image names, 14 px inputs on phones, opacity-disabled labels near 2:1 |
| 2 | Performance | 4 | No web fonts today. The recommendation costs 33 KB in the editor |
| 3 | Theming | 2 | Family tokens exist, but 21 literal sizes and 7 literal weights bypass any scale |
| 4 | Responsive | 3 | Only page-title and display scale. Input size is not adjusted for touch |
| 5 | Implementation integrity | 2 | The type system depends on one OS font. Icon strokes render at three different weights |
| | **Total** | **14/20** | **Good, with systemic gaps in type delivery** |

---

## 2. Typeface evaluation

### 2.1 Candidates and measurements

Downloads went to `/tmp/type-eval/` only. Fontsource files are the Google Fonts builds (Latin subset, variable `wght`). Upstream files came from the projects' own releases or `google/fonts`. Metrics were read with fontTools from the font tables. Every family's `name` table licence URL points to the SIL Open Font License.

| Family | Licence | Source repository | Latin variable wght (Fontsource) | Latin-ext variable add-on | Static 400+500+600 Latin | Own subset 400 to 600, Latin-1 + Latin Ext-A | Tabular figures | x-height / cap | Axes |
|---|---|---|---|---|---|---|---|---|---|
| Inter 4.1 | SIL OFL 1.1 | github.com/rsms/inter | 48,256 B | 85,068 B | 72,388 B | **33,216 B** (opsz pinned to text) | yes | 0.546 / 0.728 | wght 100 to 900, opsz 14 to 32 |
| Geist 1.8 | SIL OFL 1.1 | github.com/vercel/geist-font | 29,400 B | 16,512 B | 39,624 B | 21,060 B | yes | 0.530 / 0.710 | wght 100 to 900 |
| Manrope 4.504 | SIL OFL 1.1 | github.com/sharanda/manrope | 24,836 B | 15,120 B | 42,324 B | not built | yes, loose "1" | 0.540 / 0.720 | wght 200 to 800 |
| Plus Jakarta Sans 2.071 | SIL OFL 1.1 | github.com/tokotype/PlusJakartaSans | 27,348 B | 21,728 B | 36,316 B | not built | yes | 0.536 / 0.745 | wght 200 to 800 |
| DM Sans 4.004 | SIL OFL 1.1 | github.com/googlefonts/dm-fonts | 36,932 B | 18,228 B | 42,648 B | not built | **no `tnum` in the distributed build** | 0.504 / 0.700 | wght 100 to 1000 (opsz upstream) |
| Instrument Sans 1.0 | SIL OFL 1.1 | github.com/Instrument/instrument-sans | 30,092 B | 11,144 B | 51,500 B | 32,216 B | yes | 0.510 / 0.720 | wght 400 to 700, wdth 75 to 100 |
| Newsreader 1.003 (serif) | SIL OFL 1.1 | github.com/productiontype/Newsreader | 58,084 B | 36,244 B | 69,980 B | **29,072 B** (one static instance, wght 450, opsz 36) | yes | 0.426 / 0.670 | wght 200 to 800, opsz 6 to 72 |

Width economy, measured with canvas at 13 px, weight 500. Smaller is better for the toolbar and sidebar.

| Family | "Select the part around this one" | Toolbar row "Heading Edit text Link Style Background" | "Publish changes" | Version meta row |
|---|---|---|---|---|
| Inter | 188 | 244 | 102 | 274 |
| Geist | 187 | 244 | 102 | 268 |
| Manrope | 191 | 244 | 101 | 265 |
| Plus Jakarta Sans | 191 | 249 | 103 | 267 |
| DM Sans | 192 | 243 | 101 | 264 |
| Instrument Sans | 186 | 244 | 99 | 260 |
| DejaVu Sans 400 (today, regular text) | 202 | 262 | 105 | 305 |
| DejaVu Sans 700 (today, every 550 to 750 label) | 230 | 297 | 119 | 343 |

The candidates are within 5 percent of each other. All of them are about 18 percent narrower than what Linux users see today.

### 2.2 Character at UI and display sizes

Judgments from the specimens rendered in Chrome on Linux (grayscale antialiasing, no system hinting for web fonts). Look at `specimens/compare-editor-ui.png`, `specimens/compare-small-sizes.png` and `specimens/compare-display.png`.

**Inter.** The most legible at 11 to 13 px of the set. Its large x-height (0.546) keeps "Edited 10 minutes ago · 2 pages" readable at 12 px. The upstream build carries `cv05` (l with a tail) and `cv08` (serifed capital I), which fix the Il1 ambiguity in addresses such as `harbor-bakery.rotulo.site` and in DNS values. The Google build strips those. Display at 52 px is competent and plain. Its risk is familiarity. Inter is the default face of a decade of SaaS, so it cannot carry identity alone.

**Geist.** Crisp and compact, and the smallest file (21 KB subset). Holds up at 11 to 12 px. Its squared terminals and tight apertures read as developer tooling, and the face is strongly tied to Vercel. The brief asks for "precise without feeling technical". Geist is the most technical-feeling candidate.

**Manrope.** Wide, geometric-grotesque hybrid. Comfortable at 14 to 15 px. At display sizes the flat-sided rounds and wide "e" read as fintech or crypto. Its tabular "1" sits in a wide cell with large gaps ("Version 1 1" in the specimen), which looks broken in version rows.

**Plus Jakarta Sans.** Friendly and high-cap. Default word spacing is tight. At 12 and 13 px the specimen reads "Edited10 minutes ago". It is common in template marketplaces, which makes it feel like a template.

**DM Sans.** Low-contrast geometric with a smaller x-height (0.504). The distributed build has no `tnum`, so version sizes and counts cannot align (visible in `compare-small-sizes.png`, where the tabular and proportional columns are identical). That rules it out for an app that shows versions, sizes and counts.

**Instrument Sans.** The most distinctive sans here. Slightly condensed and warm, with editorial character at 20 px and above, and the narrowest toolbar width. At 12 and 13 px its default spacing is tight ("3 minutes ago· 18 files· 1,018 KB" in `instrument-sans-newsreader.png`). It would need positive tracking at small sizes, which works against its character. Its weight axis starts at 400, so no lighter caption cut exists if one were ever wanted.

**Newsreader (serif companion).** Production Type's optical-size text serif. At opsz 36 and weight 450 it gives page titles, empty states and the drop zone a calm editorial voice (Craft's reference quality) without decoration. Small x-height (0.426) makes it a poor UI face, so it must never go below 20 px.

### 2.3 Rendered specimens

Each page sets the same Rótulo strings: the editor top bar ("Harbor Bakery", undo, redo, Edit, Preview, Computer and Phone, "Saved", "View website", "Publish"), the floating toolbar with its Style panel, a tooltip, the image toolbar, the pages list with "Add page", the Publishing section with "Publish changes" and four version-history rows, dashboard cards, the import drop zone, the landing headline, an empty state, an 11 to 15 px waterfall and a tabular-versus-proportional numeral table. Icons in the specimens come from the proposed Lucide sprite.

| Specimen | HTML | Screenshot |
|---|---|---|
| Today, system stack (DejaVu Sans on Linux) | `specimens/system-current.html` | `specimens/system-current.png` |
| Inter | `specimens/inter.html` | `specimens/inter.png` |
| Geist | `specimens/geist.html` | `specimens/geist.png` |
| Manrope | `specimens/manrope.html` | `specimens/manrope.png` |
| Plus Jakarta Sans | `specimens/plus-jakarta-sans.html` | `specimens/plus-jakarta-sans.png` |
| DM Sans | `specimens/dm-sans.html` | `specimens/dm-sans.png` |
| Instrument Sans | `specimens/instrument-sans.html` | `specimens/instrument-sans.png` |
| Instrument Sans + Newsreader | `specimens/instrument-sans-newsreader.html` | `specimens/instrument-sans-newsreader.png` |
| **Inter + Newsreader (recommended)** | `specimens/inter-newsreader.html` | `specimens/inter-newsreader.png` |
| Side by side | | `specimens/compare-editor-ui.png`, `specimens/compare-small-sizes.png`, `specimens/compare-display.png` |

The specimen HTML loads fonts from the Fontsource CDN on jsDelivr for evaluation only. In `system-current` the labels use weight 500, which DejaVu renders as Book. The app requests 550 to 750, which renders as Bold, so the app looks heavier than that specimen. Compare with `shots/current-editor.png`.

---

## 3. Type recommendation

### 3.1 Choice

**Inter for every interface role, plus Newsreader for a small set of display roles outside the editor.** Two families, three Inter weights (400, 500, 600) and one Newsreader weight (450).

Why this pairing fits Rótulo specifically.

- The owner's site is the loudest thing on screen (product principle 3). Inside the editor Rótulo's type has to disappear behind someone else's fonts. Inter is the most legible and least opinionated face at the 12 to 15 px sizes the editor uses, and the only candidate that combines tabular figures with disambiguated Il1 for addresses.
- Outside the editor (dashboard, import, sign in, landing, empty states) Rótulo is the host, not the frame. That is where identity is allowed. A restrained serif in page titles is the editorial signal the brief asks for (Craft as reference, "editorial typography" in section 9). It costs nothing in the editor, because the browser downloads a face only when text uses it and no editor text will.
- Inter alone is the generic choice. Newsreader is what makes the system recognisable. Instrument Sans was the alternative route to identity, but its tight small-size spacing fails the older-owner readability bar in PRODUCT.md.
- The serif never appears in editor chrome. Many owner sites use serif headings, and a Rótulo serif next to the canvas would blur whose type is whose.

If the owner rejects a second family, use Inter alone with its opsz axis kept for display sizes (50,024 B subset). Hierarchy then comes from size and the 600 weight, and identity has to come from colour and layout.

This supersedes DESIGN.md's "Weight-Not-Font Rule" and "Don't load web fonts". DESIGN.md should be rewritten by whoever owns the direction once the owner approves.

### 3.2 Type scale

Sizes in px at a 16 px root. Ship them as rem so browser zoom and user font settings scale them. Tracking for Inter follows its dynamic-metrics formula (`-0.0223 + 0.185·e^(-0.1745·size)` em), rounded.

| Token | Family | Size / line-height | Weight | Tracking | Colour | Roles |
|---|---|---|---|---|---|---|
| `display` | Newsreader | clamp(40, 5.5vw, 64) / 1.04 | 450 | -0.015em | ink | Landing headline only. `text-wrap: balance` |
| `title-1` | Newsreader | 30 / 1.15 (26 under 760 px) | 450 | -0.01em | ink | Page titles: Your websites, Import a website, sign in and register (26), editor small-screen message |
| `title-2` | Newsreader | 22 / 1.25 | 450 | -0.005em | ink | Drop zone heading, empty state, import result name, import error card, "Which folder is your website?" |
| `brand` | Newsreader | 20 / 1 | 450 | -0.01em | ink | The "Rótulo" wordmark beside the logo mark |
| `heading` | Inter | 17 / 1.3 | 600 | -0.013em | ink | Dialog titles (editor included), landing step titles |
| `title-3` | Inter | 15 / 1.35 | 600 | -0.009em | ink | Dashboard card titles, editor site name (h1), sidebar section summaries |
| `body-lg` | Inter | 16 / 1.55 | 400 | -0.011em | ink-2 | Lead lines under page titles, empty-state text, auth lead. Measure 34 to 40 rem |
| `body` | Inter | 15 / 1.5 | 400 | -0.009em | ink | Default text, dialog text, alerts, toasts |
| `control` | Inter | 14 / 1.4 | 400 | -0.006em | ink | Inputs, selects, menu items, page rows |
| `action` | Inter | 14 / 1 (13 in small buttons and the toolbar) | 500 | -0.006em | per button | Buttons, segmented control, toolbar buttons, current page row |
| `label` | Inter | 13 / 1.35 | 500 | -0.003em | ink | Field labels, sidebar group titles (ink-2), toolbar context label (ink-3), version row titles (14) |
| `meta` | Inter | 13 / 1.45 | 400, `tabular-nums` | -0.003em | ink-3 | Timestamps, file counts, sizes, hints, upload limits, website count, save state (ink-2) |
| `micro` | Inter | 12 / 1.3 | 500 | 0 | status colour | Pills, keyboard hints in tooltips, image tile names (raised from 10.5). Nothing else |
| `tooltip` | Inter | 13 / 1.35 | 400 | -0.003em | `#f7f5f0` on toast ink | Custom tooltips if B or D replace native `title` |
| `mono` | ui-monospace | 13 / 1.45 | 400 | 0 | ink | DNS names and values, skipped file paths |

Rules.

- Three Inter weights only. 400 for reading, 500 for anything you can click or that labels a field, 600 for titles. No 520, 550, 650, 700 or 750.
- Twelve pixels is the floor, and only `micro` may use it.
- `tabular-nums` on every number that updates or stacks: version numbers, sizes, counts, progress, limits.
- `font-feature-settings: "cv05", "cv08"` on addresses, domains and DNS values, so l, I and 1 never collide. Add `"zero"` on DNS values.
- `font-feature-settings: "case"` on DNS record types (CNAME, TXT), and drop their 0.04em tracking.
- Inputs at 16 px under `(pointer: coarse)` to stop iOS focus zoom.
- UI roles keep fixed sizes across breakpoints (Operate mode). Only `display` and `title-1` respond to width.
- Text colour carries hierarchy before weight does. Use ink, ink-2 and ink-3 only. Never use opacity for text. Disabled controls keep an ink-3 label and lose their fill or border instead of fading to 2:1.

### 3.3 Self-hosting plan

Files, built by `tools/subset_fonts.sh` from upstream sources and measured in this session.

| File | Source | Content | Bytes |
|---|---|---|---|
| `assets/static/fonts/inter-text-400-600.woff2` | Inter 4.1 release, `InterVariable.ttf` | wght 400 to 600 variable, opsz pinned at 14. Latin-1, Latin Extended-A, General Punctuation, arrows, euro, trademark, minus. Features kern, liga, calt, ccmp, locl, mark, mkmk, tnum, case, cv05, cv08, zero | 33,216 |
| `assets/static/fonts/newsreader-display-450.woff2` | `google/fonts` `ofl/newsreader/Newsreader[opsz,wght].ttf` | Static instance wght 450, opsz 36, same character set | 29,072 |
| `assets/static/fonts/OFL-Inter.txt`, `OFL-Newsreader.txt` | upstream | Licence texts, which the OFL requires to travel with the fonts | |

Byte cost. The editor downloads 33 KB once (cacheable). Dashboard, import, sign in and landing download 62 KB. Today the app downloads no fonts.

CSS.

```css
@font-face {
  font-family: "Inter PH";
  src: url("/static/fonts/inter-text-400-600.woff2") format("woff2");
  font-weight: 400 600;
  font-display: swap;
}
@font-face {
  font-family: "Inter PH Fallback";
  src: local("Arial"), local("Helvetica Neue"), local("Liberation Sans");
  size-adjust: 105.6%;
  ascent-override: 91.7%;
  descent-override: 22.8%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "Newsreader PH";
  src: url("/static/fonts/newsreader-display-450.woff2") format("woff2");
  font-weight: 450;
  font-display: swap;
}
@font-face {
  font-family: "Newsreader PH Fallback";
  src: local("Times New Roman"), local("Liberation Serif");
  size-adjust: 106.2%;
  ascent-override: 69.2%;
  descent-override: 25%;
  line-gap-override: 0%;
}
:root {
  --font: "Inter PH", "Inter PH Fallback", system-ui, sans-serif;
  --font-display: "Newsreader PH", "Newsreader PH Fallback", Georgia, serif;
}
```

The fallback overrides come from measurement. Inter at 400 is 105.6 percent the width of Arial metrics over a set of Rótulo strings, and Newsreader at 450 is 106.2 percent of Times New Roman. Ascent and descent are the fonts' own hhea values divided by that factor. With these, the swap from fallback to web font should shift layout by about a pixel per line (inference, not measured on a slow connection).

Loading. Preload only Inter, in `layouts/base.html`, with `<link rel="preload" href="/static/fonts/inter-text-400-600.woff2" as="font" type="font/woff2" crossorigin>`. Do not preload Newsreader. It is used only off the editor and is small. Both use `font-display: swap`. The app's CSP already says `font-src 'self'`, so self-hosting needs no header change. A CDN would be blocked by that CSP, and should stay that way.

Isolation. Imported sites render in a sandboxed iframe on a separate preview origin, so neither face can leak into an owner's page, and the owner's fonts cannot reach Rótulo.

---

## 4. Icon audit

### 4.1 Inventory

One sprite, `assets/static/img/icons.svg`, 53 symbols, all `viewBox="0 0 24 24"`, stroked with `currentColor` by `.icon` in `app.css` (`stroke-width: 1.7`, round caps and joins). Templates reference it with `<use href="/static/img/icons.svg#i-…">`. TypeScript goes through `icon()` in `frontend/ui.ts`, typed by `IconName`. Two other icon drawings live outside the sprite: `select-chevron.svg` (a CSS background, stroke 1.6 on a 16 grid, colour hard-coded `#57534b`) and the logo and favicon (brand marks, out of scope).

Usage counts come from a grep over `assets/views` and `frontend` (excluding the preview agent). `align-*` is referenced through a template literal in `toolbar.ts`.

| Symbol | Metaphor | Where it is used | Rendered size | Notes |
|---|---|---|---|---|
| `upload` | arrow out of tray | Import website button, empty state, drop zone | 18, 24 | Fine |
| `plus` | plus | Add page | 15 | Fine |
| `page` | document | Page rows, link-kind badge | 15 | Fine |
| `home` | house | Home page row | 15 | Fine |
| `more` | three filled dots | Page row menu | 15 | Filled dots, r 1.3, lighter than the strokes |
| `trash` | bin | Remove section, delete page | 15 | Fine |
| `copy` | two sheets | none | | Unused. DNS "Copy" is text |
| `external` | box with arrow | View website, open address, dashboard | 15 | Fine |
| `globe` | globe | Live address, dashboard address, account menu, link badge | 15 | Also used in the account menu for "Your websites", where a globe means nothing |
| `check` | tick | Done (finish text) | 15 | Fine |
| `check-circle` | ticked circle | Imported badge, success toast | 15 | Fine |
| `alert` | triangle with filled dot | Errors on sign in, register, import, domain, editor load | 15, 24 | Dot is a filled circle with stroke on top |
| `info` | circle i with filled dot | Website limit, toolbar note, import warnings | 15 | Repeated on every import warning line |
| `undo`, `redo` | hooked arrows | Top bar | 18 | Fine |
| `desktop`, `mobile` | monitor, phone | Screen size control | 15 | Icon-only, labelled by aria-label and title |
| `eye` | eye | Preview mode, Show section, preview hint | 15 | Also means Show |
| `eye-off` | crossed eye | Hide section | 15 | Icon-only |
| `pencil` | pencil | Edit mode, Edit text, Rename page, dashboard Edit | 15 | One glyph, four meanings |
| `image` | picture | Replace image | 15 | Says "image", not "replace" |
| `link`, `unlink` | chain | Link, Remove link | 15 | Fine |
| `bold`, `italic` | B, I | Text editing | 15 | Fine, conventional |
| `align-left/center/right/justify` | lines | Style panel | 15 | Fine |
| `chevron-right/left/down` | chevrons | Disclosure, back, menus | 15, 18 | Fine |
| `arrow-up`, `arrow-down` | arrows | Move section | 15 | Icon-only |
| `duplicate` | overlapping squares | Duplicate section, duplicate page | 15 | Close to the unused `copy` glyph |
| `parent` | hooked arrow up-left | Select parent | 15 | Looks like Undo (see `shots/current-editor-selected.png`) |
| `folder` | folder | Import folder choice | 18, 24 | Repeated per row |
| `logout` | door arrow | Sign out | 15 | Fine |
| `settings` | rays around a circle | none | | Unused. Reads as brightness (a sun), not settings |
| `clock` | clock | none | | Unused |
| `send` | arrow up to a bar | Publish (top bar and sidebar) | 15 | Nearly the same drawing as `upload` (Import) |
| `x` | cross | Remove domain | 15 | Fine |
| `refresh` | circular arrows | Check DNS | 15 | Fine |
| `text-color` | A over a bar | Style | 15 | Bar overrides stroke to 2.6 |
| `fill` | paint bucket | Background | 15 | Fine |
| `spacing` | box between rules | none | | Unused |
| `type` | T | Image Description (alt text) | 15 | Wrong. T means text, not a description of a picture |
| `sparkle` | four-point star | Empty dashboard | 24 | Wrong. Sparkles signal AI, and v1 has no AI prompting |
| `lock` | padlock | none | | Unused |
| `drag` | six dots | none | | Unused. Overrides stroke to 2.6 |
| `zip` | document with zipper | Upload progress | 18 | Fine |

### 4.2 Findings

**[P1] Three stroke weights from one token.** `.icon` sets `stroke-width: 1.7` in 24-unit space, and the sprite is drawn at 15, 18 and 24 px. Rendered strokes are 1.06 px (`.icon-sm`), 1.28 px (`.icon`) and 1.7 px (`.icon-lg`). The top bar puts 18 px undo and redo next to 15 px Edit, Preview, Computer and Phone, so neighbours differ by 20 percent in weight. At 1.06 px the small icons look faint beside Bold DejaVu labels, whose `l` stem measures 2.27 px at 13 px.

**[P2] Half-pixel blur.** 15 px icons centred in 30 px toolbar buttons and 32 px icon buttons land on 7.5 px offsets, so their strokes straddle pixels. An even icon size removes this.

**[P2] Wrong or overloaded metaphors.** Pencil means four things. The Select-parent glyph reads as Undo. Publish (`send`) and Import (`upload`) are the same arrow, so the two most important actions in the product share a glyph. `type` (T) labels the image description. `sparkle` on the empty dashboard promises AI. The `globe` stands for "Your websites" in the account menu and for the live address elsewhere.

**[P2] Six icon-only section controls in a row.** Move up, Move down, Duplicate, Hide, Remove and Select parent are icon-only (`toolbar.ts` lines 434 to 447). The earlier review fixed Style and Background for the same reason. A nontechnical owner cannot tell Duplicate from Hide from Select parent without hovering, and hover tooltips are native `title` text with an OS delay.

**[P3] Mixed construction inside one family.** `text-color` and `drag` override the stroke to 2.6. `more`, `alert` and `info` mix filled dots with strokes. `select-chevron.svg` is a separate drawing with a hard-coded colour that cannot follow hover, focus or disabled states.

**[P3] Decorative repetition.** An info icon on every import warning line. A folder icon on every folder row. An external-link icon button beside the live address, which is itself a link to the same place. A pencil on the dashboard "Edit" button and an arrow on "Publish", where the words already say it.

**[P3] Dead weight.** Six symbols are unused (`copy`, `settings`, `clock`, `drag`, `lock`, `spacing`).

What works. One sprite, one viewBox, `currentColor` throughout, `aria-hidden` on every decorative use, and an `aria-label` on every icon-only button. Keep all of that.

---

## 5. Icon system recommendation

### 5.1 Options compared

Packages were inspected with `npm pack` into `/tmp/type-eval/icons/` (nothing installed). The full side-by-side for all 48 Rótulo actions is `specimens/icons-compare.html`, with a screenshot in `specimens/icons-compare.png`.

| Option | Licence | Version checked | Construction | Fit |
|---|---|---|---|---|
| **Lucide** | ISC, plus MIT (Cole Bemis) for glyphs derived from Feather | `lucide-static` 1.59.0, 2,159 glyphs, github.com/lucide-icons/lucide | Stroked paths, 24 grid, round caps and joins | Same construction as the current sprite, so `.icon` CSS keeps working. Every needed action has a clear glyph, including `text-cursor`, `image-up`, `baseline`, `paint-bucket`, `corner-left-up`, `file-plus`, `history`, `rotate-ccw` |
| Tabler | MIT | `@tabler/icons` 3.49.0, 5,184 outline glyphs, github.com/tabler/tabler-icons | Stroked, 24 grid, round caps | Compatible, but busier at 16 px. `typography` has serifs and `text-color` shrinks the A. `bucket` (Background) is an empty bucket with no pour, which loses the meaning |
| Phosphor | MIT | `@phosphor-icons/core` 2.1.1, github.com/phosphor-icons/phosphor-core | Filled outline paths on a 256 grid, one drawing per weight | Weight cannot follow a CSS stroke token. `.icon` would switch to `fill`, and the stroke-based logo and chevrons would no longer match |
| Hand-maintained sprite | Rótulo's own | today | Stroked, 24 grid | Coherent enough, but each new glyph has to be drawn, and the current drawings carry the defects in section 4.2. Nobody maintains its geometry |

**Recommendation: Lucide, vendored into the existing sprite.** It keeps the property the codebase cares about (one static SVG, no runtime dependency, no framework), replaces hand drawing with a maintained source, and is the closest in construction to the incumbent sprite, so the visual change is a refinement rather than a new language. Phosphor's duotone and weight range are better for illustration, which Rótulo should not be doing. Tabler is a credible second choice if Lucide's licence split is a concern.

Licence obligations. ISC and MIT both require the copyright and permission notice to ship with copies. `tools/build_sprite.py` writes a header comment naming both. Ship the full text of `lucide-static/LICENSE` as `assets/static/img/icons.LICENSE.txt` beside the sprite.

### 5.2 How to vendor

1. In an empty temp dir, run `npm pack lucide-static` and untar it. This installs nothing and runs no scripts.
2. Run `python3 -I docs/design/type-icons/tools/build_sprite.py <untarred>/package/icons assets/static/img/icons.svg`. The glyph list lives in `tools/glyphs.py`. The output already exists for review at `docs/design/type-icons/proposed-icons.svg` (48 symbols, 9,117 bytes, 2,404 bytes gzipped, against 7,310 and 1,866 today).
3. Copy `package/LICENSE` to `assets/static/img/icons.LICENSE.txt`.
4. Update `IconName` in `frontend/ui.ts` and the `#i-…` references to the new ids. Ids now name the action (`i-edit-text`, `i-replace-image`, `i-select-parent`), not the drawing, so a later glyph swap touches only `glyphs.py`.
5. Delete `select-chevron.svg` and draw the select arrow with the sprite's `chevron-down` (or a CSS mask of it) so it follows `currentColor`.

To add a glyph later, add one row to `glyphs.py` and rerun step 2. Never hand-edit the sprite.

### 5.3 Glyph map

| Rótulo action | Sprite id | Lucide glyph | Icon shown? |
|---|---|---|---|
| Edit text | `i-edit-text` | `text-cursor` | With label "Edit text" |
| Replace image | `i-replace-image` | `image-up` | With label "Replace image" |
| Link, Remove link | `i-link`, `i-unlink` | `link`, `unlink` | With label in selection toolbar. Icon-only only while typing, next to Bold and Italic |
| Style (text colour, size, alignment) | `i-text-style` | `baseline` | With label "Style" |
| Background and spacing | `i-background` | `paint-bucket` | With label "Background" |
| Image description (alt text) | none | none | Label only, "Description". No icon conveys alt text |
| Hide section, Show section | `i-hide`, `i-preview` | `eye-off`, `eye` | Move into a labelled "Section" menu (see 5.5) |
| Duplicate section or page | `i-duplicate` | `copy-plus` | Labelled, in menus |
| Move section up, down | `i-move-up`, `i-move-down` | `arrow-up`, `arrow-down` | May stay icon-only as a pair, with visible tooltips |
| Remove section, delete page | `i-remove` | `trash-2` | Labelled, in menus, red |
| Select the part around this one | `i-select-parent` | `corner-left-up` | Icon-only with tooltip, or better a clickable breadcrumb in the toolbar label |
| Pages list, page | `i-page` | `file` | Row icon |
| Home page | `i-home-page` | `house` | Row icon |
| Add page | `i-add-page` | `file-plus` | With label "Add page" |
| Undo, Redo | `i-undo`, `i-redo` | `undo-2`, `redo-2` | Icon-only, conventional. Tooltip shows the shortcut |
| Computer screen, Phone screen | `i-desktop`, `i-phone` | `monitor`, `smartphone` | Icon-only pair with tooltips |
| Edit mode, Preview mode | `i-edit-mode`, `i-preview` | `pencil`, `eye` | With labels. Icons may drop under 1000 px as today |
| Publish | none | none | Label only. Publish must not share Import's arrow |
| View website (new tab) | `i-view-live` | `square-arrow-out-up-right` | Trailing, after the label |
| Version history | `i-history` | `history` | Only if a compact trigger is needed. Not in section headings |
| Make live (rollback) | `i-rollback` | `rotate-ccw` | In a version-row menu, with label |
| Own domain, live address | `i-domain` | `globe` | Leading the address. Remove it from the account menu |
| Website settings | `i-settings` | `settings` | If settings become a trigger |
| Close, remove domain | `i-close` | `x` | Icon-only with aria-label |
| More | `i-more` | `ellipsis` | Icon-only with aria-label "More for <page>" |
| Import website, drop zone | `i-upload` | `upload` | With label |
| ZIP file, folder | `i-zip`, `i-folder` | `file-archive`, `folder` | Once per card, not per row |
| Done, success, error, info | `i-check`, `i-success`, `i-alert`, `i-info` | `check`, `circle-check`, `triangle-alert`, `info` | Status only |
| Check DNS again, copy | `i-refresh`, `i-copy` | `refresh-cw`, `copy` | With label |
| Bold, italic, alignment | `i-bold`, `i-italic`, `i-align-*` | `bold`, `italic`, `text-align-start/center/end/justify` | Icon-only, conventional, with tooltips |
| Back, disclosure | `i-chevron-left/right/down` | `chevron-*` | Structural |
| Sign out | `i-sign-out` | `log-out` | With label |
| Drag handle (future) | `i-drag` | `grip-vertical` | For section reordering if B or D add it |

Remove `sparkle` (empty state) and the per-row info and folder icons. Drop the icon from the dashboard "Edit" button and from both Publish buttons. Drop the external-link icon button that duplicates the live address link.

### 5.4 Sizes, stroke and alignment

| Token | Box | `stroke-width` in 24-unit space | Rendered stroke | Use |
|---|---|---|---|---|
| `.icon-sm` | 16 px | 2 | 1.33 px | Inline with 13 to 15 px text: buttons, menus, toolbar, page rows, pills |
| `.icon` | 20 px | 1.8 | 1.5 px | Standalone icon buttons: back, undo, redo, more, close |
| `.icon-lg` | 24 px | 1.5 | 1.5 px | Drop zone, empty and error states only |

Why these numbers. Inter's lowercase stem measures 1.14 px at 13 px weight 400 and 1.40 to 1.50 px at 13 to 14 px weight 500 (read from the font outlines). Rendered icon strokes of 1.33 to 1.5 px match the 500-weight labels they sit beside, so an icon and its word read as one unit. Even box sizes keep icons on whole pixels inside 32 px and 36 px controls.

Alignment rules.

- Icons sit in the same flex row as their label with `align-items: center` and a 6 px gap (8 px in 36 px buttons).
- Leading icon for the thing (Add page, Import website). Trailing icon only for direction or destination (View website, Open editor).
- Icon-only buttons are square. 32 px in the top bar and toolbar, 28 px minimum anywhere, always at least the 24 px WCAG 2.5.8 target.
- Optical adjustments come from Lucide's geometry. Do not nudge individual icons with margins. If a glyph looks off-centre, swap the glyph.

### 5.5 States and labels

| State | Treatment |
|---|---|
| Rest | `currentColor` from the control. ink-2 for ghost buttons, ink-3 for row icons |
| Hover | Control background takes the warm 5 percent wash. Icon colour moves to ink. No icon-only colour change, no scale |
| Pressed or active (`aria-pressed`, `aria-expanded`, current page) | Blue mist background, accent-text colour for icon and label together |
| Focus visible | The existing ring (2 px surface gap plus 2 px accent) on the control, never on the icon |
| Disabled | Icon and label at ink-3, background and border removed, `cursor: default`. Do not use opacity |
| Destructive | Red text and icon. Red mist on hover |

Label conventions.

- A visible label is the default. Icon-only is allowed only for undo and redo, bold and italic, alignment, screen size, move up and down, close, and more. Each of those keeps `aria-label`, and the tooltip names the action and its shortcut.
- Replace the four icon-only section actions (Duplicate, Hide, Remove, Select parent) with a labelled "Section" menu button in the floating toolbar, keeping only Move up and Move down as icons. This is an interaction change for Subagent D to confirm. It is the single biggest recognition fix in the icon set.
- Labels are plain verbs in sentence case ("Replace image", "Add page", "Make live"), matching PRODUCT.md's voice.
- Menu items are text-only, except a destructive item may lead with `trash-2` in red.

---

## 6. Files and how to rerun

Deliverables, all under `docs/design/type-icons/`.

- `README.md` is this report.
- `proposed-icons.svg` is the generated Lucide sprite, ready to replace `assets/static/img/icons.svg` after approval.
- `specimens/*.html` and `specimens/*.png` are the type specimens and the icon comparison.
- `shots/current-*.png` are baseline captures of the current app (editor, selection toolbar, style panel, import page, with 2x crops).
- `tools/glyphs.py` is the action-to-glyph table for Lucide, Tabler and Phosphor.
- `tools/build_sprite.py` builds the sprite from an untarred `lucide-static`.
- `tools/icon_compare.py` renders `specimens/icons-compare.html`.
- `tools/type_specimen.py` renders every type specimen.
- `tools/subset_fonts.sh` builds the two production font files from upstream sources.
- `tools/svgparts.py` is shared SVG parsing for the two icon scripts.
- `tools/audit_css.py` lists every typographic declaration in a stylesheet with value counts.
- `tools/font_metrics.py` prints x-height, cap height, axes, `tnum` support and licence fields for font files.

Rerun commands (fonttools lives in a throwaway venv, not in the app).

```sh
python3 -I docs/design/type-icons/tools/type_specimen.py
python3 -I docs/design/type-icons/tools/build_sprite.py <lucide-static>/package/icons docs/design/type-icons/proposed-icons.svg
python3 -I docs/design/type-icons/tools/icon_compare.py <dir with the three untarred packages> assets/static/img/icons.svg docs/design/type-icons/specimens/icons-compare.html
PATH=<venv>/bin:$PATH docs/design/type-icons/tools/subset_fonts.sh InterVariable.ttf 'Newsreader[opsz,wght].ttf' <out dir>
```

Open questions for the integrator.

- Owner approval for Inter and Newsreader (SIL OFL 1.1) and for Lucide glyphs (ISC and MIT).
- Whether the "Section" menu (5.5) fits Subagent D's toolbar design.
- Whether native `title` tooltips get replaced. If they do, use the `tooltip` role in 3.2.
