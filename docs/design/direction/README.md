# Pagehaven visual direction

Creative direction for the Pagehaven redesign (brief: `docs/design/brief.md`). Three candidate worlds, each with an editor comp and a dashboard comp, and one recommendation with a full token proposal.

Everything in this folder is a throwaway instrument for a decision. The comps load fonts from Google Fonts for evaluation only. The app must not, and no font is added to the app without the owner's dependency approval.

| Direction | Comps | Screenshots |
|---|---|---|
| Proof (recommended) | `proof/editor.html`, `proof/dashboard.html` | `proof/*.png` |
| Spot Ink | `spot-ink/editor.html`, `spot-ink/dashboard.html` | `spot-ink/*.png` |
| Shopfront | `shopfront/editor.html`, `shopfront/dashboard.html` | `shopfront/*.png` |

Each folder has `editor-1280.png`, `editor-390.png`, `dashboard-1280.png` and `dashboard-390.png`. Under 900 px the editor shows the "needs a bigger screen" message, as the product does today (PRODUCT.md, Users), so `editor-390.png` shows that state in each world.

`build_comps.py` regenerates all six comps from one shared structure and three token sets (`python3 build_comps.py`). `contrast.py` computes the WCAG ratios quoted below (`echo "#0A86D6 #FFFFFF label" | python3 contrast.py`).

The canvas image is the Start Bootstrap Agency fixture as it renders in the editor today (`assets/agency-desktop.png`, cropped from `docs/screenshots/design/after-editor.png` with the old selection outline painted out). Dashboard thumbnails are cropped from `after-dashboard.png`. Harbor Bakery deliberately has no thumbnail, to show the placeholder state.

## 1. What the reference products get right

Principles, not layouts. Nothing below asks Pagehaven to copy a screen, a logo or an asset.

**Linear: hue is rationed, alignment is felt.** Linear's 2024 redesign cut how much of its brand blue fed into the neutral palette to get a "more neutral and timeless appearance", moved theme generation to LCH so different hues at one lightness look equally light, and reduced each theme to three inputs (base, accent, contrast), with contrast exposed for accessibility. Designers spent their time aligning labels, icons and buttons in the sidebar, work users "feel after a few minutes". ([Linear, How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui))
For Pagehaven: neutrals carry almost no brand hue, the palette is generated from a few role inputs, and the icon-to-label grid is part of the system rather than a polish step.

**Figma UI3: the work is the hero, and muscle memory is a feature.** Figma explored a UI that "only revealed itself on hover", then settled on collapsible panels and a slim toolbar so "your work takes center stage". It made labels optional next to icons, and reverted a condensed auto-layout control "to preserve muscle memory". ([Figma, Inside the redesigned Figma](https://www.figma.com/blog/behind-our-redesign-ui3/))
For Pagehaven: chrome should frame the site, not compete with it. Hiding everything until hover was tried and rejected by Figma. Pagehaven's owners are occasional users, so labels stay on by default.

**Craft: a stationery page, not a dashboard.** Craft's surfaces read as paper with one confident type voice, and formatting lives in a contextual toolbar next to the block being edited. ([Craft app styles](https://support.craft.do/en/write-and-edit/styling/app-styles))
For Pagehaven: the toolbar appears next to the thing clicked, and editing feels like marking up a page rather than operating a control panel.

**Raycast: fast, simple, delightful, and shortcuts are taught in place.** Raycast's refresh enlarged the primary input, redrew icons as one outline family with a bolder stroke and consistent corner radii, and put a bottom action bar that shows each action with its shortcut. ([Raycast, A fresh look and feel](https://www.raycast.com/blog/a-fresh-look-and-feel))
For Pagehaven: one icon family with one stroke and one corner rule, and keyboard shortcuts shown next to the action (in tooltips and menus) so owners discover them without a help page.

**Framer: the canvas is the real page.** Framer edits the page that publishes, not a model of it. ([Framer design pages](https://www.framer.com/solutions/design-tool/))
For Pagehaven, which edits the HTML the site actually ships, selection must be drawn in a way that reads on any site (dark photo hero, white Tailwind landing, saturated brand color) without tinting it.

Five rules follow for every direction:

1. The owner's site is the only colorful thing on screen. Pagehaven's chrome gets hue only for state (saved, unpublished, error), the primary action and selection.
2. Selection must stay visible on any site. One mark has to read on white and on a dark photograph, so it either clears 3:1 on both by itself or carries a keyline.
3. Labels beat icons for occasional users. Icon-only is reserved for universally known actions (undo, redo, back, more, device size) and always has a tooltip and an accessible name.
4. One stroke, one corner rule, one type family for the interface. A second family only when it does a job the first cannot (addresses and DNS records in mono).
5. State is always written down. "Saved", "3 changes not published", "Version 3 is live" are sentences, not only dots.

## 2. How the directions were chosen (Impeccable)

Impeccable's `new-work` flow for a replacement world, Operate mode. The world may lend only type, palette, density and one signature move. Layout, navigation and controls stay standard.

- Mechanism. Pagehaven edits the real HTML a small business already ships, by clicking it, and keeps every publish as a version you can go back to.
- Scene. A bakery or studio owner at a laptop in a back office, in daylight, for a short session every few weeks, nervous about breaking something that already works.
- Rut. The category always ships a white SaaS shell with rounded white cards and one bright blue (the incumbent). Its predictable opposite is a dark pro tool like Figma or Framer.
- Seven worlds from the owner's life, ordered by resonance: (1) the printer's proof an owner signs before a print run, (2) the picture-framing shop's mat board, (3) letterpress business stationery printed in one spot ink, (4) a painted shopfront with gold-leaf signwriting, (5) the post office (publishing as posting, versions as postmarks), (6) the harbour, the literal reading of the name, (7) the hardware store's paint-chip fan deck.
- `impeccable concept-seed --scope direction --mode operate` assigned candidate 3 (seed reference `seed:1a97755948638ee9`). That is **Spot Ink**. My own top candidate, the printer's proof, is shown as the pick (**Proof**). **Shopfront** (candidate 4) completes the set as the dark-shell alternative, so the three differ in ground (light neutral, tinted light, dark), accent strategy and type.

The decision page (`serve-question`) was not started. This agent is a delegate, and the user decision belongs to the main agent, which can present this README and the screenshots.

Challenger verdicts from the roll. Each challenger was fused with Pagehaven's facts and judged on audience identification and product clarity.

| Challenger | Verdict | Discipline kept |
|---|---|---|
| Lexicon page, colour quarantined in plates | Declined | **Color quarantine.** All color belongs to the owner's site. Chrome is ink and hairline. Rule 1 above. |
| Design annual plate section, registration crosshairs | Competitive (identification) | **Registration marks at the corners of a plate.** Became Proof's crop-mark selection. |
| Jet-age ticket wallet | Declined | **Nothing disappears, it cancels.** Old versions stay listed with "Make live". Nothing is deleted silently. |
| Midnight transit diagram | Declined | **The chosen line burns brightest.** Only the current page and the current selection carry full accent strength. |
| Crouwel grid specimen | Declined | **Reflow by whole cells.** A strict 4 px grid and fixed component heights (34, 44). |
| Darkroom exposure record | Declined | **Conflict without color.** Every state has a word or a shape as well as a color. Rule 5 above. |

## 3. The three directions

### A. Proof (recommended)

**Point of view.** A printer's proof is the last thing a business owner checks before their words go out into the world: black ink on plain stock, hairline rules, crop marks at the corners, and nothing else. Pagehaven's chrome becomes that proof sheet. It is flat, ruled, ink on near-white, with no hue of its own, so the owner's site is the only color on screen. The one bright thing is Proof Cyan, the color of a press check, and it means exactly one thing: what you are touching right now. Selection is drawn as a cyan rule with crop marks outside the corners and an ink slug that names the part ("Heading"). The primary action is a solid ink button. Bold through contrast and precision, never through color or size.

- **Palette.**

| Role | Value | Contrast |
|---|---|---|
| Ground (app background) | `#F4F3EF` | |
| Surface (top bar, sidebar, menus) | `#FFFFFF` | |
| Sunken (canvas backdrop) | `#E9E8E3` | |
| Ink (primary text, primary button) | `#16161A` | 16.25 on ground, 18.04 on white |
| Ink 2 (secondary text) | `#4B4A46` | 7.99 on ground, 8.87 on white |
| Ink 3 (meta, placeholders) | `#64635E` | 5.42 on ground, 6.02 on white, 4.91 on sunken |
| Rule (decorative hairline) | `#DEDDD7` | decorative only |
| Control border | `#8C8B85` | 3.42 on white (non-text 3:1) |
| Proof Cyan (selection, focus) | `#0A86D6` | **3.89 on white, 3.64 on a dark photo (#2B2B2B), 4.63 on ink** |
| Cyan strong (slug fill) | `#0070B8` | white text on it 5.24 |
| Link | `#005F96` | 6.82 on white |
| Success | `#1B7343` on `#E6F2EA` | 5.87 on white, 5.10 on soft |
| Warning | `#9A5300` on `#FBEFD9` | 5.82 on white, 5.11 on soft |
| Error | `#BA2F25` on `#FBE8E6` | 5.96 on white, 5.05 on soft |

- **Type.** Schibsted Grotesk for everything (UI, titles, wordmark). It is a newspaper grotesk drawn for a media group's digital products, so it holds up at 13 to 15 px and has enough snap in the 600 weight for titles without going heavy. Geist Mono only for addresses, DNS records, paths and the selection slug's kind tag.
- **Surfaces and elevation.** Flat. Regions separate with 1 px hairlines, never with shadows. Only floating things lift: the toolbar, menus and dialogs get a 1 px ink border and one soft offset shadow (`0 8px 20px -6px rgba(22,22,26,.28)`). The canvas sits on the sunken backdrop with a 1 px keyline and a 2 px radius, like a sheet on a light table.
- **Radius and spacing.** 0 to 2 px for the canvas and thumbnails, 3 px for pills and chips, 4 px for controls, 6 px for floating panels, 8 px for dialogs. 4 px spacing grid.
- **Selection accent.** Proof Cyan rule 1.5 px plus four crop marks 4 px outside the corners, and a cyan-strong slug under the bottom-left corner naming the part. Hover is a dashed white 1 px outline 3 px outside the element, so hover and selection never look alike.
- **Motion stance.** Mechanical and short. Selection glides between elements in 140 ms, the toolbar appears in 140 ms with a 4 px rise, nothing bounces. Reduced motion removes movement and keeps instant state changes.
- **Icon geometry.** 24 px grid drawn at 18 px (16 px in dense rows), 1.5 px stroke, square caps and mitred joins, to echo the crop marks. The current sprite redrawn to that rule.
- **Signature move.** Crop-mark selection with a named slug. Dashboard thumbnails are bare proofs on a 2 px ink rule with the caption under them, no card box.
- **Risk.** It is the most familiar of the three: a quiet light tool with an ink primary button sits near Linear's light theme. Its distinctiveness rests on the crop marks, the ink rules and the typeface, and it fails if implementation softens them into rounded cards.

### B. Spot Ink

**Point of view.** Small businesses print their identity on letterpress stationery in one spot ink. Spot Ink prints Pagehaven's shell in deep pine and keeps everything else on pale cotton stock, with one fluorescent second ink, a lime, reserved for what is live or being touched. The top band is solid pine, the wordmark and page titles are set in Literata, and the interface text is Atkinson Hyperlegible Next, a face designed by the Braille Institute for low-vision readers. Pressed states are debossed (a 1 px inset shadow) rather than filled. It is the warmest and most readable of the three.

- **Palette.**

| Role | Value | Contrast |
|---|---|---|
| Ground | `#F2F3EE` | |
| Surface | `#FBFBF8` | |
| Sunken | `#E6E8E1` | |
| Ink | `#1B2421` | 14.26 on ground |
| Ink 2 | `#4A534F` | 7.13 on ground |
| Ink 3 | `#5F6964` | 5.10 on ground, 5.49 on surface |
| Pine (shell band, primary) | `#1E5A45` | 7.23 on ground; cotton text on pine 7.13 |
| Pine soft (current page) | `#E1EBE4` | pine text on it 6.61 |
| Fluoro lime (selection, Publish) | `#C4F03A` | **1.32 on white, 10.70 on a dark photo**; ink on lime 12.02 |
| Control border | `#7F8984` | about 3:1 on surface |
| Warning | `#9A5300` | 5.61 on surface |
| Error | `#B3261E` | 6.30 on surface |
| Success | pine | 7.78 on surface |

- **Type.** Atkinson Hyperlegible Next (UI, 16 px base) and Literata (titles, site name, wordmark).
- **Surfaces and elevation.** Paper with deboss. Inputs and pressed controls are inset, floating panels are cards with a soft long shadow, the canvas floats with a 10 px radius.
- **Radius and spacing.** 6, 8, 10, 12 px; pills 999 px. 4 px grid, slightly roomier (36 px controls, 56 px top band).
- **Selection accent.** 3 px lime rule with a 1 px ink keyline inside and out, plus a lime tag at the top right.
- **Motion stance.** Soft. 160 to 200 ms ease-out, a 2 px press-in on buttons.
- **Icon geometry.** 1.75 px stroke, round caps and joins, 18 px.
- **Signature move.** The pine band and the fluoro Publish button: the only lime in the chrome is the action that makes changes live.
- **Seen in the comps.** Atkinson Hyperlegible Next draws a slashed zero by default, so "10:42" and "3 of 10" read as "1Ø". That is right for DNS records and wrong for times and counts, and needs the font's alternate zero turned on. The lime hover outline on the Agency button sits close to the lime selection, so hover needs a different shape (dashed) to stay distinct.
- **Risk.** Lime alone is invisible on white sites (1.32:1) and depends entirely on its ink keyline. The pine band is a large field of brand color directly above the owner's site, which competes with sites that use green. Two families plus mono is the heaviest font budget.

### C. Shopfront

**Point of view.** A painted shopfront in deep navy with gold-leaf lettering frames the window display, which is the owner's site. All chrome is dark lacquer, so the site reads as the lit window. Selection is gold leaf: a gold rule over a navy keyline with a gold name plate. Titles are set in Funnel Display and the interface in Funnel Sans, a matched pair with a slightly mechanical, signwriter's rhythm. This is the boldest of the three and the closest to the pro-tool convention of dark chrome.

- **Palette.**

| Role | Value | Contrast |
|---|---|---|
| Chrome (ground) | `#14203A` | |
| Raised (cards, toolbar) | `#1C2A48` | |
| Sunken (canvas backdrop) | `#0E1830` | |
| Text | `#F3EEE2` | 13.98 on chrome, 12.30 on raised |
| Text 2 | `#B8C0D0` | 8.85 on chrome, 7.79 on raised |
| Text 3 | `#9AA4B8` | 6.46 on chrome, 5.68 on raised |
| Control border | `#6E80A6` | 4.09 on chrome, 3.60 on raised |
| Gold leaf (selection, primary) | `#E8B84A` | **1.84 on white, 7.68 on a dark photo**; navy on gold 8.78; **1.19 against the Agency site's own yellow button** |
| Success | `#78D6A0` | 9.19 on chrome |
| Warning | `#F59A4C` | 7.41 on chrome |
| Error | `#FF8A7E` | 7.08 on chrome |

- **Type.** Funnel Display (titles, wordmark), Funnel Sans (UI).
- **Surfaces and elevation.** Dark lacquer layers: sunken, chrome, raised. Depth comes from value steps and one deep shadow on floating panels.
- **Radius and spacing.** 8 px controls, 12 px cards and floating panels. 4 px grid.
- **Selection accent.** 2 px gold rule, 2 px outside offset, navy keyline, gold name plate at top left.
- **Motion stance.** Confident. 180 ms ease-out, the toolbar slides 6 px.
- **Icon geometry.** 1.5 px stroke, round caps and joins, 18 px.
- **Signature move.** Gold-leaf selection and gold Publish on navy.
- **Risk.** Dark chrome reads as a pro tool, which works against owners who need to feel this is safe and simple. Gold collides with yellow and amber site colors (1.19:1 against Agency's button) and with the warning hue. A dark dashboard and dark auth pages are a large commitment for a daytime, occasional-use product.

## 4. Side by side

| | Proof | Spot Ink | Shopfront |
|---|---|---|---|
| Ground | near-white `#F4F3EF` | pale cotton `#F2F3EE` + pine band | navy `#14203A` |
| Chrome hue | none | pine | navy |
| Primary action | ink `#16161A` | fluoro lime `#C4F03A` | gold `#E8B84A` |
| Selection | cyan `#0A86D6` + crop marks | lime + ink keyline | gold + navy keyline |
| Selection alone on white / dark photo | 3.89 / 3.64 | 1.32 / 10.70 | 1.84 / 7.68 |
| UI type | Schibsted Grotesk | Atkinson Hyperlegible Next | Funnel Sans |
| Title type | same | Literata | Funnel Display |
| Elevation | flat, hairlines | deboss + soft card | dark value steps |
| Radius (control / float) | 4 / 6 | 8 / 12 | 8 / 12 |
| Icon stroke | 1.5 square | 1.75 round | 1.5 round |
| Font budget, latin woff2 | about 110 KB (4 static + 1 mono) or 47 KB variable + 10 KB mono | about 103 KB (4 + 2 + 1 mono) | about 76 KB (4 + 3 + 1 mono) |

## 5. Recommendation: Proof

1. **The site stays visually dominant.** Proof is the only direction whose chrome has no hue. Spot Ink puts a pine band directly above every site and Shopfront wraps it in navy, and both colors interact with the site's own palette. Proof's ink and hairlines read as neutral next to any brand.
2. **Selection works on every imported site.** Proof Cyan is the only accent measured at 3:1 or better against both a white page (3.89) and a dark photographic hero (3.64), so the selection stays legible even before the keyline. Lime (1.32 on white) and gold (1.84 on white, 1.19 next to Agency's yellow button) depend on a keyline to be seen at all. Owners import sites from Lovable, Bolt, Bootstrap and Tailwind templates, and white landing pages are the common case.
3. **Confidence comes from precision, not decoration.** Crop marks and a slug that names the part ("Heading", "Button", "Image") tell a nontechnical owner exactly what they clicked and what will change. That matches PRODUCT.md's success test: they trust that nothing changed except what they touched.
4. **The light, daylight scene fits.** Owners work in short daytime sessions. A dark shell (Shopfront) reads as a professional tool and raises the stakes for exactly the people who need it to feel safe.
5. **It is the lightest to ship.** One family plus one small mono, flat surfaces (fewer shadow tokens), and a sharp radius rule that is easy to hold consistent.

Borrow one thing from Spot Ink if the typography subagent agrees. Atkinson Hyperlegible Next is a serious candidate for Proof's UI face, because PRODUCT.md assumes some owners are older and less confident. It is OFL, about 12 KB per weight, and works with the Proof palette unchanged. Schibsted Grotesk has more character for titles. Subagent C should decide between them on rendered evidence.

## 6. Token proposal (Proof)

CSS custom properties as they would sit at the top of `assets/static/css/app.css`. Names describe roles, not values. Font families list self-hosted faces first (pending approval) and fall back to the current system stack, so the tokens work before and after fonts are approved.

```css
:root {
  /* Families */
  --font-ui: "Schibsted Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Neutrals */
  --ground: #F4F3EF;          /* app background */
  --surface: #FFFFFF;         /* top bar, sidebar, menus, dialogs, toolbar */
  --surface-hover: #F7F6F3;
  --surface-pressed: #EEEDE8;
  --sunken: #E9E8E3;          /* canvas backdrop, input addons, tracks */
  --ink: #16161A;             /* 18.04 on surface, 16.25 on ground */
  --ink-2: #4B4A46;           /* 8.87 on surface, 7.99 on ground */
  --ink-3: #64635E;           /* 6.02 on surface, 5.42 on ground, 4.91 on sunken */
  --ink-disabled: #9A9993;    /* disabled text only, never meaning-bearing */
  --rule: #DEDDD7;            /* decorative hairline */
  --rule-strong: #C9C8C1;     /* section dividers, card edges */
  --control-border: #8C8B85;  /* inputs, secondary buttons: 3.42 on surface */
  --hover: rgba(22, 22, 26, 0.05);
  --pressed: rgba(22, 22, 26, 0.09);

  /* Action */
  --primary: #16161A;
  --primary-hover: #2C2C31;
  --primary-pressed: #000000;
  --on-primary: #FFFFFF;
  --link: #005F96;            /* 6.82 on surface */
  --link-hover: #004A75;

  /* Selection and focus (Proof Cyan) */
  --select: #0A86D6;          /* 3.89 on white, 3.64 on #2B2B2B, 3.51 on ground */
  --select-strong: #0070B8;   /* slug fill: white text 5.24 */
  --select-soft: #E3F2FB;     /* current row tint, drop target */
  --select-text-bg: rgba(10, 134, 214, 0.20); /* ::selection */
  --hover-outline: rgba(255, 255, 255, 0.85); /* canvas hover, drawn with a dark 1px twin */
  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--select);

  /* State */
  --success: #1B7343;  --success-soft: #E6F2EA;   /* 5.87 / 5.10 */
  --warning: #9A5300;  --warning-soft: #FBEFD9;   /* 5.82 / 5.11 */
  --error:   #BA2F25;  --error-soft:   #FBE8E6;   /* 5.96 / 5.05 */
  --error-hover: #9E271F;
  --neutral-soft: #ECEBE6;                        /* draft pill */
  --toast: #16161A;    --on-toast: #F4F3EF;

  /* Type scale: size / line height / weight / tracking */
  --text-mono: 12.5px;  --lh-mono: 18px;                                   /* addresses, DNS, paths */
  --text-xs: 12px;      --lh-xs: 16px;  --fw-xs: 600; --ls-xs: 0.04em;      /* sidebar section labels, uppercase */
  --text-sm: 13px;      --lh-sm: 18px;  --fw-sm: 400; --ls-sm: 0;           /* meta, hints, timestamps, pills */
  --text-ui: 14px;      --lh-ui: 20px;  --fw-ui: 500; --ls-ui: 0;           /* buttons, nav, toolbar, rows */
  --text-body: 15px;    --lh-body: 22px; --fw-body: 400; --ls-body: 0;      /* sentences, inputs */
  --text-lg: 18px;      --lh-lg: 24px;  --fw-lg: 600; --ls-lg: -0.01em;     /* card and dialog titles */
  --text-xl: 22px;      --lh-xl: 28px;  --fw-xl: 600; --ls-xl: -0.015em;    /* section titles, empty states */
  --text-2xl: 30px;     --lh-2xl: 34px; --fw-2xl: 600; --ls-2xl: -0.02em;   /* page titles */
  --text-display: clamp(36px, 5.6vw, 60px); --lh-display: 1.04; --fw-display: 650; --ls-display: -0.03em; /* landing only */
  --measure: 66ch;

  /* Spacing (4 px grid) */
  --s-0: 2px; --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
  --s-6: 24px; --s-7: 32px; --s-8: 40px; --s-9: 48px; --s-10: 64px; --s-11: 80px;

  /* Control sizes */
  --ctl-sm: 28px; --ctl: 34px; --ctl-lg: 44px;   /* 44 on touch layouts */
  --icon: 18px; --icon-sm: 16px; --icon-stroke: 1.5;

  /* Radii */
  --r-0: 0;      /* thumbnails */
  --r-canvas: 2px;
  --r-chip: 3px; /* pills, slug, swatches */
  --r-ctl: 4px;  /* buttons, inputs, list rows */
  --r-float: 6px;/* toolbar, menus, popovers, toasts */
  --r-dialog: 8px;

  /* Elevation: flat by default; only floating things lift */
  --e-0: none;
  --e-keyline: 0 0 0 1px rgba(22, 22, 26, 0.14);            /* canvas */
  --e-float: 0 1px 0 rgba(22, 22, 26, 0.04), 0 8px 20px -6px rgba(22, 22, 26, 0.28); /* + 1px ink border */
  --e-dialog: 0 2px 0 rgba(22, 22, 26, 0.04), 0 24px 48px -12px rgba(22, 22, 26, 0.35);
  --scrim: rgba(22, 22, 26, 0.38);

  /* Motion */
  --dur-press: 90ms;     /* hover, press */
  --dur-pop: 140ms;      /* toolbar, menus, selection glide */
  --dur-panel: 220ms;    /* drawers, dialogs */
  --dur-device: 280ms;   /* computer/phone width change */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout */
  --top-h: 52px;
  --side-w: 264px;        /* leaves the site 1000px at a 1280 window, past Bootstrap's 992 */
  --panel-w: 320px;       /* properties drawer, version history drawer */
  --ftb-max-w: 560px;     /* floating toolbar with an open panel */
  --dialog-w: 440px;
  --page-max: 1160px;
  --import-max: 720px;
  --auth-w: 380px;
  --gutter: 32px;         /* 16px under --bp-sm */

  color-scheme: light;
}

/* Breakpoints (media queries cannot read custom properties; keep these in sync) */
/* --bp-sm 520px   phone: single column, 16px gutters                     */
/* --bp-md 760px   dashboard grid 3 -> 1, page heads stack                 */
/* --bp-editor 900px  editor minimum; below shows "needs a bigger screen"  */
/* --bp-lg 1100px  editor top bar collapses Edit/Preview labels to icons   */
/* --bp-xl 1440px  wider canvas, sidebar stays 264px                       */

@media (prefers-reduced-motion: reduce) {
  :root { --dur-press: 0ms; --dur-pop: 0ms; --dur-panel: 0ms; --dur-device: 0ms; }
}
```

Usage rules that keep the world intact:

- Hue appears only in `--select*`, `--link`, and the state colors. A view has one `--primary` button.
- Panels never get a shadow. Only the floating toolbar, menus, popovers, toasts and dialogs use `--e-float` or `--e-dialog`.
- Selection is `--select` 1.5 px plus crop marks and the slug. Focus is `--focus-ring`. Hover in the canvas is a dashed `--hover-outline`. The three never share a look.
- Status is written. "Saved", "3 changes not published", "Version 3 is live" carry a dot or icon, but the sentence carries the meaning.
- `::selection`, `caret-color`, `accent-color` and scrollbars take `--select` and `--rule-strong`.

## 7. Fonts

Sizes are the Latin subset woff2 files from Fontsource's CDN (`cdn.jsdelivr.net/fontsource/fonts/<id>@latest/latin-<weight>-normal.woff2`), measured with `curl` on 2026-10-19. Licenses are from the Fontsource API. Every face here is SIL Open Font License 1.1, which allows self-hosting, bundling and subsetting, with the condition that the font is not sold by itself and a modified version is not published under the reserved name. Self-hosting means copying the woff2 files into `assets/static/fonts/` and serving them from the app's own origin, which also keeps the CSP unchanged (no third-party font host).

| Typeface | Role | License | Weights needed | woff2 per weight (latin) | Total | Variable (latin, wght) | Self-host |
|---|---|---|---|---|---|---|---|
| Schibsted Grotesk | Proof UI and titles | OFL 1.1 | 400, 500, 600, 700 | 24.3, 25.2, 25.2, 25.1 KB | 99.9 KB | 46.8 KB | Yes |
| Geist Mono | mono in all three | OFL 1.1 | 400 (500 optional) | 9.9 KB (10.1 KB) | 9.9 KB | not measured | Yes |
| Atkinson Hyperlegible Next | Spot Ink UI; Proof UI alternative | OFL 1.1 | 400, 500, 600, 700 | 12.1, 12.6, 12.7, 12.7 KB | 50.1 KB | 34.0 KB | Yes |
| Literata | Spot Ink titles | OFL 1.1 | 500, 600 | 21.7, 21.9 KB | 43.6 KB | 52.5 KB | Yes |
| Funnel Sans | Shopfront UI | OFL 1.1 | 400, 500, 600, 700 | 10.6, 10.7, 10.8, 10.6 KB | 42.7 KB | 17.4 KB | Yes |
| Funnel Display | Shopfront titles | OFL 1.1 | 500, 600, 700 | 10.7, 10.8, 10.6 KB | 32.1 KB | 17.7 KB | Yes |
| Inter (reference) | not proposed | OFL 1.1 | 400, 500, 600, 700 | 23.7, 24.3, 24.5, 24.4 KB | 96.8 KB | 48.3 KB | Yes |
| Geist (reference) | not proposed | OFL 1.1 | 400, 500, 600 | 13.0, 13.3, 13.4 KB | 39.7 KB | not measured | Yes |

For Proof the cheapest correct delivery is the Schibsted Grotesk variable file (46.8 KB, every weight) plus Geist Mono 400 (9.9 KB): about 57 KB, preloaded once and cached. Use `font-display: swap` with a size-adjusted local fallback (`size-adjust` and `ascent-override` tuned against the system sans) so text never disappears and the layout does not jump.

Why not the brief's listed candidates. Inter is the category default and would make Pagehaven look like every other tool. Geist is well made but signals developer tooling (Vercel), which is the wrong register for bakery owners. Manrope, Plus Jakarta Sans and DM Sans were read as the generic startup voice the brief asks to avoid.

## 8. Verification

- Screenshots were taken in the T3 preview browser at 1280x800 and 390x844 from the comps served locally. All fonts loaded from Google Fonts (network log shows 200 for every woff2).
- `impeccable detect --json` over the three comp folders returned 123 findings. 110 are `design-system-*` advisories (colors, sizes, fonts, radii outside the incumbent DESIGN.md), which is expected for a replacement world. The rest:
  - `overused-font` on Geist Mono, 4 times. It is used only for addresses and paths. JetBrains Mono (OFL, 21.2 KB at 400) is the alternative if the flag matters.
  - `icon-tile-stack`, 3 times. A false positive: it is the 34 px back button beside the site name in the top bar, not a tile above a heading.
  - `cramped-padding` on the segmented controls, 3 times. Intentional: a segmented control's options sit 2 px inside its track.
  - `nested-cards`, 3 times. The floating toolbar inside the canvas frame. The frame is the site's viewport, not a card. No change.

## 9. Open decisions for the main agent

- Font adoption needs the owner's dependency approval. Without it, Proof still works on the system stack. The palette, rules, crop-mark selection and ink button carry most of the identity.
- The logo is a blue gradient tile today. Proof needs it redrawn in ink (the comps use a flat ink version of the same page-and-arch shape). That is a brand-asset change for the owner to approve.
- Typography subagent: Schibsted Grotesk or Atkinson Hyperlegible Next for Proof's UI face.
- Icon subagent: redraw the sprite to 1.5 px, square caps and mitred joins, or keep round caps if the square version reads as harsh at 16 px.
