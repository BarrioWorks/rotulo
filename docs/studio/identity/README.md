# Studio visual identity (Agent C)

This is the visual language proposal for the Studio redesign: type, icons, colour, materials, shape and motion for floating controls over arbitrary imported websites. It covers brief sections 6, 9 and 12. Nothing in `assets/` changed. The tokens below are a proposal for the phase D foundation agent.

Proof (`../../design/README.md`) is treated as evidence. Two things carry over. The Lucide family stays. The idea of a measured selection colour stays, but the measurement now shows that Proof's cyan fails over mid-tone photos, so the hue changes.

## Files

| Path | What it is |
|---|---|
| `tokens.css` | The tokens. The CSS block at the end of this README is a copy. |
| `studio.css` | Components used by the board and the specimens: glass levels and their fallbacks, capsules, segments, panels, sheets, selection ring. Uses only `tokens.css`. |
| `board.html` | The identity board. `?bg=dark` frames the published Agency template at its photo header, `?bg=light` at its white Services section. |
| `specimens/<face>.html`, `specimens/compare.html` | One page per typeface with the same toolbar, page switcher and settings sheet, plus all seven faces stacked. |
| `measure.py` | Every contrast number in this README. Exits 1 on a failing pair. |
| `build_specimens.py` | Writes the specimen pages from one template and injects the icon sprite into `board.html`. |
| `screens/` | Screenshots at 1280 px wide. |

To rerun the measurements, run `python3 -I docs/studio/identity/measure.py --check-readme` from the repo root. It also checks that the CSS block below matches `tokens.css`.

To rerender the pages, download the fonts into `/tmp/studio-fonts/gf` and Lucide's `icons/*.svg` into a temp folder (see the docstring in `build_specimens.py`), run the builder, then serve a temp folder where `identity/` links to this folder, `fonts/` links to the font folder and `img/` links to `fixtures/images`. The pages load fonts from `/fonts/`, so `file://` does not work. No font file is in the repo.

## Recommendation and approval request

Recommended UI face: **Onest**, SIL Open Font License 1.1 ([licence](https://github.com/simpals/onest/blob/main/OFL.txt)), one variable file of 33.8 KB for latin. It sets every role. No second display face. Newsreader is dropped.

Changing from Schibsted Grotesk needs the owner's approval. Text to send:

> Rótulo's new editor floats small glass controls over your website, so its own type has to read clearly at 11 to 15 px over any background and feel calm next to any site. We set the same toolbar, page list and settings panel in seven free typefaces and recommend switching the interface font from Schibsted Grotesk to Onest. Onest is open and friendly at small sizes, it is rarely seen in other apps, and the file is 13 KB smaller than the current one. It is free to self-host under the SIL Open Font License 1.1. We would also stop using the serif Newsreader, so the whole app uses one font. Do you approve switching to Onest? If you prefer to keep Schibsted Grotesk, everything else in the new design works with it unchanged.

If the owner says no, set `--font-ui` to the value of `--font-ui-fallback`. The shipped file `assets/static/fonts/schibsted-grotesk-400-700.woff2` and its metric fallback stay. Every size, weight and tracking token stays the same. Schibsted renders well at these sizes (see `screens/specimen-schibsted-grotesk-1280.png`). Its cost is the print character tied to Proof, which this round moves away from.

## Typography

### What was compared

Each face was downloaded from Google Fonts with `css2?family=<Name>:wght@400..700` and a Chrome user agent, keeping only the `latin` subset file. Google serves the full weight axis whatever range you ask for, so every file is a full variable font and the sizes compare like for like. The incumbent's own subset in the repo is 46.6 KB, within 0.2 KB of the Google file, so these sizes predict what ships. A 400 to 600 instance would be smaller for every face. That was not measured because subsetting needs fonttools, which is not installed.

The specimen pages measure each face in the browser with canvas `measureText` at 100 px. Licences were read from each official repository.

| Face | Licence | Latin woff2 | x-height | At 11 to 13 px in the capsules |
|---|---|---|---|---|
| Onest | OFL 1.1, [simpals/onest](https://github.com/simpals/onest/blob/main/OFL.txt) | 33.8 KB | 0.530 em | Open, even spacing, soft rounded joins. Capital I and lower-case l are both plain bars. |
| Inter | OFL 1.1, [rsms/inter](https://github.com/rsms/inter/blob/master/LICENSE.txt) | 48.3 KB | 0.550 em | The most legible at 11 px and the tallest x-height. It is also the default face of most SaaS dashboards, which the brief asks us to avoid. Largest file. |
| Geist | OFL 1.1, [vercel/geist-font](https://github.com/vercel/geist-font/blob/main/LICENSE.txt) | 29.4 KB | 0.540 em | Crisp and narrow. "rn" runs into "m" at 13 px in the ladder. Strongly tied to Vercel and developer tools, the feeling the brief wants to leave. |
| Schibsted Grotesk | OFL 1.1, [schibsted/schibsted-grotesk](https://github.com/schibsted/schibsted-grotesk/blob/main/OFL.txt) | 46.8 KB | 0.530 em | Good at every size. Squarer, newspaper character. |
| Manrope | OFL 1.1, [googlefonts/manrope](https://github.com/googlefonts/manrope/blob/master/OFL.txt) | 24.8 KB | 0.540 em | Tight spacing at 11 and 12 px. "rn m" merges. Reads as a display face pressed into UI work. |
| DM Sans | OFL 1.1, [googlefonts/dm-fonts](https://github.com/googlefonts/dm-fonts/blob/main/Sans/OFL.txt) | 36.9 KB | 0.510 em | Geometric and pleasant, lower x-height, so 11 px labels look smaller than the others. Common in AI-generated sites, which are exactly the sites Rótulo edits. |
| Figtree | OFL 1.1, [erikdkennedy/figtree](https://github.com/erikdkennedy/figtree/blob/master/OFL.txt) | 20.2 KB | 0.500 em | The smallest file and the narrowest set (188 px for the 13 px status line where the others take 198 to 201 px). The lowest x-height, so the 11 px chip loses legibility first. |

The two faces added to the brief's list are Onest and Figtree. Instrument Sans, IBM Plex Sans and DM Sans appear on Impeccable's list of overused defaults, so Instrument Sans and Plex were not added.

Screenshots: `screens/specimen-compare-1280.png` (all seven stacked) and `screens/specimen-<face>-1280.png` (toolbar over a photo, page switcher, settings sheet, toolbar over white, size ladder).

### Why Onest

- It holds up at 11, 12 and 13 px in a 36 px capsule. Its x-height (0.53 em) matches Schibsted's and sits 0.02 em under Inter's. Its spacing stays open where Manrope and Geist start to merge letters.
- It is distinctive without being loud. Its rounded joins sit well with capsule shapes and the iPadOS feel the owner asked for. Few products use it, so Rótulo does not look like a dashboard template, and it is not the face of the AI-built sites being edited.
- It is 33.8 KB, which is 13 KB less than the current Schibsted file.
- It covers Cyrillic too (not measured here), which keeps a later translation open.

The known weakness is that capital I, lower-case l and the digit 1 are close at 11 px. The rule that handles it is to set addresses, DNS records and file names in `--font-mono`, which the board shows. Interface words never depend on telling I from l.

### One family, no display face

Newsreader earned its place in Proof as a voice on the landing and dashboard. The Studio brief asks for one coherent product feel, and Impeccable lists Newsreader among the overused defaults. Onest at 600 with -0.03em tracking carries the dashboard and landing titles (`--fs-display`). One family is one file, one fallback and one set of metrics to maintain. Dropping Newsreader removes 29.1 KB from those pages.

### Type roles

Five working sizes: 11 (selection chip, kbd, counts), 12 (row meta, hints), 13 (every control label), 15 (inputs and sentences), 22 (sheet titles). Weights are 400, 500 and 600 only. Tracking opens slightly at 11 and 12 px and closes at 22 px. The tokens are in the CSS block.

## Icons

### Audit of the current references

There are 55 `icons.svg#` references in `assets/views` and `frontend`, plus 28 `icon()` calls and the `icon:` fields of the toolbar action table in TypeScript. Together they draw at least 35 of the 43 sprite symbols (a static grep, so names built at runtime may add more). The sprite is one family (Lucide 1.59), and `scripts/design/check_icons.py` already guards missing names and unnamed icon-only buttons.

Stroke weight is consistent. `.icon` (20 px, stroke-width 1.8), `.icon-sm` (16 px, 2.25) and `.icon-lg` (24 px, 1.5) all render a 1.5 px line (`assets/static/css/app.css:269-271`). Keep that rule.

Inconsistencies found:

1. **Size inside one bar.** Undo and redo use the 20 px icon in a 30 px button (`assets/views/projects/editor.html:53,56`). The mode and device segments next to them use 16 px (`editor.html:62-73`). The same bar mixes 20 and 16 px.
2. **Three active-state languages.** A pressed `.seg` button is an ink fill with white text (`app.css:434`). A pressed `.tb-btn` is a cyan wash with link-coloured text (`editor.css:208`). A pressed `.btn-ghost` is a grey wash (`app.css:322`). The landing mock uses the cyan wash (`screens.css:239`). Owners cannot learn one meaning for "on".
3. **One glyph, two meanings.** The eye (`preview`) means both Preview mode and Show section (`frontend/editor/toolbar.ts:38,285`). The pencil (`edit`) means Edit mode, Edit and Rename. The triangle (`alert`) is both warning and error (`frontend/editor/publish.ts:122,125`), so the two differ only by colour.
4. **One meaning, two glyphs.** A web address is a globe on the Rótulo address and a link icon on a custom domain (`assets/views/projects/index.html:49,55`). The off-screen pointer uses arrows for above and below but chevrons for left and right (`toolbar.ts:85-88`).
5. **Double disclosure.** The toolbar's More button carries an ellipsis plus a chevron caret (`toolbar.ts:225,342`, `editor.css:207`). Either one says "menu".
6. **Hand-tuned alignment.** `.alert .icon` and `.delete-warning .icon` are nudged with `margin-top: 2px` (`app.css:404`, `screens.css:87`) instead of aligning to the first line's box.
7. **Touch targets.** `.tb-btn` and `.btn-sm` are 30 px and the icon segments are 28 by 32 px (`app.css:425-435`). They meet WCAG 2.5.8 (24 px), and `(pointer: coarse)` raises them to 44 px. On a fine pointer, 30 px with a 16 px glyph is the smallest target in the app.
8. **Icons beside plain labels.** These add nothing to the word next to them: the pencil on **Edit** and the eye on **Preview** in the mode switch (`editor.html:62,65`), the pencil on the dashboard **Edit** button (`index.html:65`), the house and page icons on every page row (`editor.html:37`, `home.html:41-44`), the menu icons on **Duplicate**, **Hide** and **Remove section** (`toolbar.ts:282-287`), and the text-cursor and baseline icons on **Edit text** and **Style** (`toolbar.ts:29,34`). Keep icons that carry information the label does not: the external-link mark on **View website** (opens a new tab), the trash can on destructive items, status marks, and icon-only buttons.

### Rules for Studio

| Control height | Icon | stroke-width | Rendered stroke | Used for |
|---|---|---|---|---|
| 28 px | 16 px | 2.25 | 1.5 px | dense rows inside panels, chip actions |
| 32 px | 16 px | 2.25 | 1.5 px | segment buttons, search field |
| 36 px | 18 px | 2 | 1.5 px | toolbar and dock buttons on a desktop pointer |
| 44 px | 20 px | 1.8 | 1.5 px | every control under `(pointer: coarse)` |

- The glyph grows by at most one step when the target grows. A 44 px target keeps a 20 px glyph. Fitts's law concerns the target, not the drawing.
- Exclusive choices (Edit or Preview, computer or phone) show the chosen segment as a raised white thumb. Independent toggles (Bold, a panel that is open) show an accent wash with an accent glyph. The current item in a list shows an accent check and no fill. That gives three states with three meanings and no overlap.
- Disabled is 42% opacity of the idle colour, never a different hue.
- In the contextual dock, verbs are text only ("Edit text", "Style", "Link"). Icons appear only on icon-only buttons (undo, redo, devices, settings, more, close).
- Warning and error get different shapes: `triangle-alert` for warning, `circle-alert` for error.
- Stay within Lucide. No hard reason to leave it turned up.
- Lucide is drawn on a 24 px grid, so 16, 18 and 20 px all scale by non-integer factors and sit off the pixel grid on 1x screens. This is inferred from the geometry, not measured. At 2x it does not show. If 1x crispness matters, 24 px glyphs at 1.5 px are the only exact size, which is too large for these capsules.

## Colour

### Accent: Haven Ultramarine `#3730BD`

`oklch(0.425 0.210 275)`. It is used for selection, focus, the current item, links and the Publish fill. Nothing else in the chrome has hue.

The accent was chosen by a measurement. The selection is drawn as a 2 px accent ring with a 1.5 px white halo outside it, so it stays visible if either line reaches 3:1 against the pixel beneath. White covers every background darker than relative luminance 0.30. The accent has to cover everything lighter. That only works when the accent's own luminance is at most about 0.067, which means a deep, saturated colour. `measure.py` checks every grey from black to white and every pixel of four fixture photos:

| Ring | On white | On black | Worst over any grey | Uncovered pixels: banner | hero | Agency header | Agency portfolio 2 |
|---|---|---|---|---|---|---|---|
| Haven Ultramarine `#3730BD` | 9.05 | 2.32 | 3.01 | 0.0% | 0.0% | 0.0% | 0.0% |
| Proof cyan `#0A86D6` | 3.89 | 5.39 | 1.97 | 1.8% | 23.5% | 0.0% | 87.4% |

With Proof's cyan, 87% of the Agency portfolio photo is a background where neither ring nor halo reaches 3:1. With the ultramarine, no pixel in any fixture photo fails. On black the accent alone is 2.32, and the white halo carries it at 21:1.

The same colour also passes as text and as a fill: white on it is 9.05, it is 8.68 on `--surface`, and it is 5.42 on glass level 2 over pure black. As a hue it sits apart from the lighter blues that Figma, Framer and Apple use for selection and from Linear's lighter indigo. That is a judgment, not a measurement.

### Neutrals and workspace

The neutrals are cool and close to grey, with a trace of the accent hue (`--ws-ground #E8E8EC`, `--surface #FAFAFB`, `--ink #17171C`). The warm off-white of Proof is gone. A neutral ground adds no colour cast next to the owner's site.

The workspace stays light, with no dark workspace this round. The use scene is a shop owner at a laptop in daylight, making a few changes. In the canvas-first layout the ground shows on less than 15% of the viewport (the plan's target), so a dark theme would mostly recolour the floating chrome. The glass already stays legible over dark sites (measured below). A dark theme would double the token set and the contrast checks for little gain. Revisit it if owners ask for it or if a phone-preview mode leaves large areas of ground visible.

### Status

`--success #0F5E35`, `--warning #774000`, `--error #A01C24`. They are darker than Proof's because status words appear on glass level 2. Over pure black, that glass composites to luminance 0.578, and these are the lightest values that still reach 4.5:1 there (4.70, 4.99, 4.68). Each status also carries a word and a shape.

### Opaque pairs (from `measure.py`)

All pass. A selection: ink on surface 17.12, ink-2 8.38, ink-3 6.04, ink-3 on surface-sunk 5.53, accent on accent-soft 7.37, white on accent-hover 10.78, success on success-soft 6.74, warning on warning-soft 7.14, error on error-soft 6.47, on-tip on tip 15.45, control-edge on surface 3.50.

## Materials and elevation

| Level | Surfaces | Tint | Backdrop | Edges | Shadow | Radius |
|---|---|---|---|---|---|---|
| 1 Canvas | The imported site | none | none | none | none | 6 px when floating on the ground, 0 edge to edge |
| 2 Floating controls | Toolbar capsules, page switcher, contextual dock, menus | `rgba(250,250,252,.80)` | `blur(24px) saturate(1.6)` | inner 1 px white at 55% plus a 1 px top highlight; outer 1 px `rgba(17,17,28,.12)` | `0 1px 2px` at 8% plus `0 8px 24px -6px` at 22% | capsule 999 px, panel 14 px |
| 3 Modal surfaces | Settings, publish and import sheets, dialogs | `rgba(250,250,252,.94)` | `blur(40px) saturate(1.2)` | top highlight; outer 1 px at 14% | `0 2px 6px` at 8% plus `0 28px 64px -16px` at 36%, scrim at 30% | sheet 22 px |

Tooltips and toasts are solid `--tip` and never glass, so a dark chip reads against light glass. Glass never stacks on glass. A menu opened from a sheet becomes opaque `--surface`.

Text rules: level 2 carries only `--ink`, `--ink-2`, the accent and status words. Meta text in `--ink-3` and form edges appear only on level 3 or opaque surfaces.

### Fallbacks (in `studio.css`)

- No `backdrop-filter` support (`@supports not`): the tint becomes `--surface`, opaque.
- `prefers-reduced-transparency: reduce`: opaque `--surface`, no blur.
- `prefers-contrast: more`: opaque, a 1 px `--ink` edge, and secondary text becomes `--ink`.
- `forced-colors: active`: `Canvas` and `CanvasText` with a 1 px border, Publish and the selection use `Highlight`, and no shadows or blur.

The board's materials row renders the glass, the opaque fallback and the high-contrast variant side by side over a white, photo and black strip.

### Worst-case text contrast on glass

The method: take a backdrop sample, apply the CSS `saturate()` matrix in gamma-encoded sRGB, clamp it, then composite the tint over it with source-over alpha in gamma-encoded sRGB. Photos are downscaled to 320 px (one sample per 4 CSS px at 1280) and blurred with sigma equal to the blur radius divided by 4. The backdrops are white, black, eight saturated colours (the six primaries and secondaries, the Agency yellow `#FFC800` and the Landwind blue `#1A56DB`) and every pixel of four fixture photos.

The model was checked against Chromium. Glass level 2 over `#000`, `#F00`, `#1A56DB` and `#806040`, and level 3 over `#000`, rendered within one 8-bit level of the prediction (for example 200,200,202 rendered against 200,200,202 predicted, and 200,217,253 against 200,218,253).

| Text | Level 2 worst | Level 3 worst | Needs |
|---|---|---|---|
| `--ink` | 10.69 (over black) | 15.00 | 4.5 |
| `--ink-2` | 5.23 | 7.34 | 4.5 |
| `--ink-3` | not allowed (3.77) | 5.29 | 4.5 |
| `--accent` | 5.42 | 7.60 | 4.5 |
| `--success` | 4.70 | 6.60 | 4.5 |
| `--warning` | 4.99 | 7.01 | 4.5 |
| `--error` | 4.68 | 6.57 | 4.5 |
| `--control-edge` | not used | 3.07 | 3.0 |

Black is the worst backdrop for a light tint in every row. Saturated colours and photos land between white and black. Level 2 needs an alpha of at least 0.745 to keep `--ink-2` at 4.5:1 over black, and it ships at 0.80.

No adaptive light or dark flip based on the content underneath. The preview is a cross-origin sandboxed frame, so the shell cannot read its pixels. A flip driven by the in-frame agent would make the toolbar change colour while the owner scrolls, which costs spatial stability. A fixed tint that passes over black is simpler and predictable.

## Shapes

- Capsules (999 px) for every control and control group on glass. This is the recognisable silhouette.
- Panels at 14 px, with rows inside at 8 px. 8 is the panel radius minus its 6 px inset, so the corners stay concentric.
- Sheets and dialogs at 22 px.
- The selection chip at 5 px, nearly square, because it sits on the owner's content and should read as a label, not a control.
- The canvas at 6 px only when it floats on the ground (phone preview, zoomed out), 0 when edge to edge.

These are four distinct corner sizes for four jobs, so not everything gets the same rounded-card look.

## Motion

| Surface | Motion | Reduced motion |
|---|---|---|
| Button press | scale 0.97, 90 ms `--ease-out` | colour only |
| Hover, segment thumb | colour and thumb, 140 ms `--ease-out` | same |
| Popover, menu, page switcher | opacity plus scale 0.96 to 1 from the anchor, 200 ms `--ease-emph`; exit 130 ms `--ease-in` | opacity 120 ms |
| Sheet, dialog | rise 12 px with opacity, 300 ms `--ease-emph`; exit 200 ms; scrim fades | opacity 120 ms |
| Selection ring | slides to the next element, 160 ms `--ease-move` | jumps |
| Contextual dock | contents crossfade 140 ms; the dock keeps its position | same |
| Publish | label changes to "Publishing…", then a check draws once, 240 ms | the check appears |

There are no loops: no spinner, no shimmer, no moving reflection on glass. A pending state shows a static label. Nothing animates while the owner types. Backdrop blur is never animated, because animating a blur radius repaints every frame. Panels fade in with their final blur.

## Board

`board.html` at 1280 px wide, framing the published Agency template from `http://agency.sites.localhost:5150/`:

- `screens/board-dark-photo-1280.png` shows the Agency photo header with the hero heading selected, the button hovered, the page switcher open, the undo tooltip, the dock, the Fit capsule and a published toast.
- `screens/board-light-site-1280.png` shows the same chrome over the white Services section.

Below the canvas, the board shows colour, type, shape, icons, the three materials with fallbacks, the seven selection states over white and photo tiles, and motion with the easing curves.

Seen in the light screenshot: the undo tooltip sits close to the selection chip of a heading near the top of the page. The editor should keep tooltips clear of the selection chip, or show the chip below the element when it is near the toolbar. This is noted for the editor agent.

## Tokens

```css
/* Rótulo Studio identity tokens (proposal). measure.py reads this file; README.md carries a copy. */
:root {
  /* Families. One UI face. --font-ui-fallback is the answer if the owner keeps Schibsted Grotesk. */
  --font-ui: "Onest", "Onest Fallback", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-ui-fallback: "Schibsted Grotesk", "Schibsted Grotesk Fallback", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;

  /* Type roles: size / line height / weight / tracking. */
  --fs-caption: 0.6875rem;  --lh-caption: 0.875rem;  --fw-caption: 500;  --ls-caption: 0.01em;   /* 11: selection chip, kbd, counts */
  --fs-meta: 0.75rem;       --lh-meta: 1rem;         --fw-meta: 400;     --ls-meta: 0.005em;     /* 12: row meta, hints */
  --fs-control: 0.8125rem;  --lh-control: 1rem;      --fw-control: 500;  --ls-control: 0;        /* 13: capsule and menu labels */
  --fs-body: 0.9375rem;     --lh-body: 1.375rem;     --fw-body: 400;     --ls-body: 0;           /* 15: inputs, sentences in panels */
  --fs-title: 1.375rem;     --lh-title: 1.75rem;     --fw-title: 600;    --ls-title: -0.015em;   /* 22: sheet and dialog titles */
  --fs-display: clamp(2.25rem, 1.5rem + 3vw, 3.5rem); --lh-display: 1.05; --fw-display: 600; --ls-display: -0.03em; /* dashboard, landing */

  /* Neutrals. Cool and nearly grey, hue taken from the accent so the chrome reads as one family. */
  --ws-ground: #E8E8EC;        /* workspace behind the canvas */
  --ws-ground-edge: #D9D9DF;   /* canvas edge on the ground */
  --surface: #FAFAFB;          /* opaque panels, inputs, fallback for every glass level */
  --surface-sunk: #F0F0F3;     /* search fields and tracks inside panels */
  --ink: #17171C;              /* text and icons on any Rótulo surface */
  --ink-2: #4A4A55;            /* secondary text, idle icons */
  --ink-3: #5F5F6B;            /* meta on opaque and glass-3 surfaces; never on glass-2 */
  --rule: rgba(23, 23, 28, 0.10);
  --rule-strong: rgba(23, 23, 28, 0.18);
  --control-edge: #85858F;     /* input and switch edges: 3:1 on surface */
  --hover: rgba(23, 23, 28, 0.06);
  --pressed: rgba(23, 23, 28, 0.11);

  /* Accent: Haven Ultramarine. Selection, focus, the current item, links and Publish. */
  --accent: #3730BD;
  --accent-hover: #2E28A3;
  --accent-pressed: #25208A;
  --accent-soft: #E7E6FA;      /* current row, pressed segment on opaque */
  --accent-wash: rgba(55, 48, 189, 0.12); /* the same on glass */
  --on-accent: #FFFFFF;
  --select-ring: var(--accent);
  --select-halo: #FFFFFF;
  --select-width: 2px;
  --halo-width: 1.5px;
  --focus-ring: 0 0 0 2px var(--select-halo), 0 0 0 4px var(--accent);

  /* Status. Each also carries a word and a shape. */
  --success: #0F5E35;  --success-soft: #E3F1E8;
  --warning: #774000;  --warning-soft: #F8ECD8;
  --error: #A01C24;    --error-soft: #F9E5E5;
  --tip: #1C1C22;      --on-tip: #F4F4F7;  /* tooltips and toasts: solid, never glass */

  /* Materials. Level 1 is the imported site and gets nothing. */
  --glass-2-tint: rgba(250, 250, 252, 0.80);
  --glass-2-filter: blur(24px) saturate(1.6);
  --glass-2-edge-in: inset 0 0 0 1px rgba(255, 255, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.85);
  --glass-2-edge-out: 0 0 0 1px rgba(17, 17, 28, 0.12);
  --glass-2-shadow: 0 1px 2px rgba(17, 17, 28, 0.08), 0 8px 24px -6px rgba(17, 17, 28, 0.22);
  --glass-3-tint: rgba(250, 250, 252, 0.94);
  --glass-3-filter: blur(40px) saturate(1.2);
  --glass-3-edge-in: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --glass-3-edge-out: 0 0 0 1px rgba(17, 17, 28, 0.14);
  --glass-3-shadow: 0 2px 6px rgba(17, 17, 28, 0.08), 0 28px 64px -16px rgba(17, 17, 28, 0.36);
  --scrim: rgba(17, 17, 28, 0.30);

  /* Shapes. Capsules for controls, a soft panel corner, a larger sheet corner; never one radius for all. */
  --r-capsule: 999px;          /* toolbar groups, buttons on glass, segments, chips */
  --r-row: 8px;                /* rows and fields inside a panel: panel radius minus its 6px inset */
  --r-panel: 14px;             /* popovers, page switcher, contextual dock menus */
  --r-sheet: 22px;             /* settings and publish sheets, dialogs */
  --r-chip: 5px;               /* the selection label, which sits on the owner's site */
  --r-canvas: 6px;             /* the page when it floats on the ground; 0 edge to edge */

  /* Control sizes. 36 on desktop pointers, 44 under (pointer: coarse). */
  --h-28: 28px;  --h-32: 32px;  --h-36: 36px;  --h-44: 44px;
  --icon-16: 16px; --icon-18: 18px; --icon-20: 20px;
  --icon-stroke-px: 1.5;       /* rendered stroke; stroke-width = 1.5 * 24 / icon size */

  /* Motion. No loops. Exits run at about two thirds of the entrance. */
  --dur-press: 90ms;
  --dur-quick: 140ms;
  --dur-pop: 200ms;
  --dur-pop-out: 130ms;
  --dur-sheet: 300ms;
  --dur-sheet-out: 200ms;
  --dur-select: 160ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-emph: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-move: cubic-bezier(0.65, 0, 0.35, 1);
}
```
