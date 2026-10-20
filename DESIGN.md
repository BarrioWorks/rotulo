---
name: Pagehaven
description: Your AI-built website. Yours to edit. A printer's proof for the owner's own site, ink on near-white with one cyan for what you touch.
colors:
  ground: "#F4F3EF"
  surface: "#FFFFFF"
  surface-hover: "#F7F6F3"
  surface-pressed: "#EEEDE8"
  sunken: "#E9E8E3"
  ink: "#16161A"
  ink-2: "#4B4A46"
  ink-3: "#64635E"
  rule: "#DEDDD7"
  rule-strong: "#C9C8C1"
  control-border: "#8C8B85"
  hover: "rgba(22, 22, 26, 0.05)"
  pressed: "rgba(22, 22, 26, 0.09)"
  neutral-soft: "#ECEBE6"
  primary: "#16161A"
  primary-hover: "#2C2C31"
  primary-pressed: "#000000"
  on-primary: "#FFFFFF"
  link: "#005F96"
  link-hover: "#004A75"
  select: "#0A86D6"
  select-strong: "#0070B8"
  select-soft: "#E3F2FB"
  select-text: "rgba(10, 134, 214, 0.2)"
  success: "#1B7343"
  success-soft: "#E6F2EA"
  warning: "#9A5300"
  warning-soft: "#FBEFD9"
  error: "#BA2F25"
  error-soft: "#FBE8E6"
  error-hover: "#9E271F"
  toast: "#16161A"
  on-toast: "#F4F3EF"
  scrim: "rgba(22, 22, 26, 0.38)"
  overlay-accent-soft: "rgba(10, 134, 214, 0.2)"
  overlay-hover: "rgba(10, 134, 214, 0.7)"
  overlay-halo: "rgba(255, 255, 255, 0.9)"
  overlay-muted: "#8C8B85"
  overlay-chip-ink: "#FFFFFF"
  device-bezel: "#16161A"
  device-bezel-edge: "#3A3A40"
typography:
  display:
    fontFamily: "\"Newsreader\", \"Newsreader Fallback\", Georgia, serif"
    fontSize: "clamp(2.5rem, 1.6rem + 3.6vw, 4rem)"
    fontWeight: 450
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  title-1:
    fontFamily: "\"Newsreader\", \"Newsreader Fallback\", Georgia, serif"
    fontSize: "2rem"
    fontWeight: 450
    lineHeight: "2.25rem"
    letterSpacing: "-0.015em"
  title-2:
    fontFamily: "\"Newsreader\", \"Newsreader Fallback\", Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 450
    lineHeight: "1.875rem"
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.01em"
  title-3:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    letterSpacing: "-0.005em"
  lead:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    letterSpacing: "0"
  body:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.375rem"
    letterSpacing: "0"
  control:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "0"
  label:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.125rem"
    letterSpacing: "0"
  meta:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.125rem"
    letterSpacing: "0"
  micro:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.01em"
  brand:
    fontFamily: "\"Schibsted Grotesk\", \"Schibsted Grotesk Fallback\", system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "ui-monospace, \"SF Mono\", SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.78125rem"
    lineHeight: "1.125rem"
rounded:
  canvas: "2px"
  chip: "3px"
  control: "4px"
  float: "6px"
  dialog: "8px"
  round: "999px"
spacing:
  s0: "2px"
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s7: "32px"
  s8: "40px"
  s9: "48px"
  s10: "64px"
  s11: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  button-secondary-pressed:
    backgroundColor: "{colors.surface-pressed}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  button-ghost-pressed:
    backgroundColor: "{colors.pressed}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-danger-hover:
    backgroundColor: "{colors.error-hover}"
    textColor: "{colors.on-primary}"
  button-danger-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.error}"
  button-danger-ghost-hover:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
  button-disabled:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-3}"
  button-sm:
    padding: "0 12px"
    height: "30px"
  button-lg:
    typography: "{typography.body}"
    padding: "0 20px"
    height: "44px"
  button-icon:
    padding: "0"
    width: "36px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  input-disabled:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-3}"
  input-addon:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-2}"
    typography: "{typography.meta}"
    padding: "0 12px"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  segment-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
  switch-on:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.round}"
    width: "32px"
    height: "20px"
  pill-draft:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.ink-2}"
    typography: "{typography.micro}"
    rounded: "{rounded.chip}"
    padding: "0 8px"
    height: "22px"
  pill-published:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  pill-changes:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
  pill-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.canvas}"
    padding: "24px"
  menu:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.float}"
    padding: "4px"
  menu-item:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.chip}"
    padding: "0 10px"
    height: "34px"
  menu-item-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  tooltip:
    backgroundColor: "{colors.toast}"
    textColor: "{colors.on-toast}"
    typography: "{typography.meta}"
    rounded: "{rounded.chip}"
    padding: "5px 8px"
  toast:
    backgroundColor: "{colors.toast}"
    textColor: "{colors.on-toast}"
    typography: "{typography.control}"
    rounded: "{rounded.float}"
    padding: "10px 16px"
  toast-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
  toast-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.ink}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "24px"
    width: "440px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: "360px"
  toolbar-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    padding: "0 7px"
    height: "30px"
  toolbar-button-pressed:
    backgroundColor: "{colors.select-soft}"
    textColor: "{colors.link}"
  page-row-current:
    backgroundColor: "{colors.select-soft}"
    textColor: "{colors.link}"
    rounded: "{rounded.control}"
    height: "36px"
---

# Design System: Pagehaven

## Overview

**Creative North Star: "The Proof Sheet"**

Pagehaven's chrome is the printer's proof an owner checks before their words go out. It is black ink on plain near-white stock, cut with hairline rules, and nothing else. The interface has no hue of its own, so the owner's website is the only color on screen. Confidence comes from contrast and precision, not from color, size or decoration.

One bright thing exists: Proof Cyan, the color of a press check. It means what you are touching right now, where keyboard focus is, and where a link goes. Selection on the canvas is a cyan rule with crop marks outside the corners and a filled slug that names the part ("Heading", "Image"). The overlay tokens for that are defined now; the overlay itself lands in a later phase.

Density is calm and legible. Text starts at 15 px for sentences, controls are 36 px tall and grow to 44 px under touch. Motion is mechanical and short and never bounces. Surfaces are flat. Only things that float above the page lift, and they carry a 1 px ink edge so they read as a sheet laid on top.

**Key Characteristics:**
- Ink on warm near-white, no brand hue in the chrome.
- Proof Cyan only for selection, focus and links.
- One solid ink primary button per view.
- Hairline rules separate regions; shadows only on floating things.
- Small, sharp radii from 2 px to 8 px.
- Schibsted Grotesk for the interface; Newsreader 450 for display titles outside the editor.
- Lucide line icons at about 1.5 px rendered stroke.

## Colors

A neutral ink-and-stock palette with a single cyan reserved for attention, and four state colors that always come with a word or a shape.

### Primary
- **Proof Ink** (primary, ink): The primary button, primary text, the switch and segment when on, and rules that carry meaning (table header rule, step rule, thumbnail rule, the edge of every floating thing). Ink on surface is 18.04:1, on ground 16.25:1, on sunken 14.71:1.
- **Ink Lift** (primary-hover) and **Full Black** (primary-pressed): The primary button's hover and press. White on hover is 13.89:1.
- **Stock White** (on-primary): Text and icons on ink, error and the selection slug.

### Secondary
- **Proof Cyan** (select): Focus ring band, `accent-color`, `caret-color`, current page icon, drop target border. It is non-text only: 3.89:1 on surface, 3.51:1 on ground, 3.64:1 on a dark photo (#2B2B2B), 4.63:1 next to ink.
- **Slug Cyan** (select-strong): Fill of the selection slug that names the part. White on it is 5.24:1.
- **Cyan Wash** (select-soft): Current page row, pressed toolbar button, internal link tag, drag-over drop zone. Ink on it is 15.78:1, link on it 5.97:1.
- **Cyan Highlight** (select-text): The `::selection` background for selected text.
- **Press Blue** (link) and **Deep Press Blue** (link-hover): Underlined text links and link buttons. Link is 6.82:1 on surface and 6.15:1 on ground; hover is 9.39:1 on surface.

### Neutral
- **Stock** (ground): The app background on every screen, the app header, the live address and domain boxes.
- **Sheet White** (surface): Editor top bar, sidebar, cards, menus, dialogs, sheets and inputs.
- **Sheet Hover** (surface-hover) and **Sheet Pressed** (surface-pressed): Opaque hover and press for rows and secondary buttons. Ink 3 on hover is 5.57:1; ink 2 on pressed is 7.57:1.
- **Light Table** (sunken): Editor canvas backdrop, progress and thumbnail tracks, input addons, disabled fills. The overlay alias canvas-backdrop points here.
- **Ink 2** (ink-2): Secondary text and ghost button labels. 8.87:1 on surface, 7.99:1 on ground, 7.23:1 on sunken.
- **Ink 3** (ink-3): Meta, placeholders, disabled labels, row icons. 6.02:1 on surface, 5.42:1 on ground, 4.91:1 on sunken.
- **Hairline** (rule): Decorative 1 px dividers between rows, regions and card edges. Never relied on for contrast.
- **Strong Hairline** (rule-strong): Toolbar and top bar separators, scrollbars, disabled input edges, copy button edge.
- **Control Edge** (control-border): Inputs, secondary buttons, switch track, dashed drop zone. 3.42:1 on surface and 3.08:1 on ground, so the edge passes the 3:1 non-text rule.
- **Ink Hover** (hover) and **Ink Press** (pressed): Translucent ink washes for ghost buttons, menu items and toolbar buttons.
- **Neutral Note** (neutral-soft): Draft and offline pills, info alerts. Ink 2 on it is 7.43:1; ink 3 is 5.04:1.
- **Toast Ink** (toast) on **Toast Stock** (on-toast): Toasts, tooltips and the canvas mode hint. 16.25:1.
- **Scrim** (scrim): Backdrop behind dialogs and sheets.

### State
- **Published Green** (success) on **Green Wash** (success-soft): Published pill, saved dot. 5.87:1 on surface, 5.10:1 on its wash.
- **Pending Amber** (warning) on **Amber Wash** (warning-soft): Unpublished changes and pending domain pills, saving dot. 5.82:1 on surface, 5.11:1 on its wash.
- **Alert Red** (error), **Alert Red Hover** (error-hover) and **Red Wash** (error-soft): Field errors, error alerts and toasts, destructive buttons and menu items. 5.96:1 on surface, 5.05:1 on its wash; white on red is 5.96:1, on hover 7.60:1.

### Overlay (defined for the later overlay phase)
These tokens are mirrored into the preview agent because the iframe cannot read the app's custom properties. overlay-accent aliases Proof Cyan and overlay-chip-bg aliases Slug Cyan. overlay-accent-soft is the selected element's fill, overlay-hover the hover outline, overlay-halo the white halo that keeps the rule visible on dark photos, overlay-muted the outline for parts that cannot be edited, and overlay-chip-ink the slug text. The veil for locked areas is a 135 degree ink and white stripe at 6 px (`--overlay-veil`, carried in the sidecar). The phone preview frame uses device-bezel and device-bezel-edge, with the screen rounded at 34 px (`--device-radius`); that corner depicts a phone and sits outside the radius scale. While a page reloads, the old page sits under a veil of sheet white at 86 percent (`--veil`).

### Named Rules
**The No Hue Rule.** The chrome has no color of its own. Hue appears only in the select tokens, the link tokens and the state colors.

**The One Cyan Rule.** Proof Cyan means selection, focus or link. Never use it for decoration, headings, icons at rest or the primary button.

**The Word First Rule.** A state color always comes with a word or a shape. "Saved", "Published" and "Changes not published" carry the meaning; the dot only confirms it.

## Typography

**Display Font:** Newsreader 450 (with Newsreader Fallback, a metric-matched Times New Roman, then Georgia)
**Body Font:** Schibsted Grotesk 400 to 700 (with Schibsted Grotesk Fallback, a metric-matched Arial, then system-ui)
**Label/Mono Font:** system ui-monospace stack, no web font

**Character:** Schibsted Grotesk is a newspaper grotesk drawn for small digital text; it stays firm at 13 to 15 px and snaps at 600 for titles. Newsreader at its single 450 weight gives the large titles outside the editor a printed, editorial voice.

Both faces are self-hosted from assets/static/fonts/ with their OFL files, use `font-display: swap`, and fall back to local faces tuned by scripts/design/build_fonts.sh, so the swap does not move text. Sizes are in rem so the owner's font settings scale them.

### Hierarchy
- **Display** (Newsreader 450, clamp(2.5rem, 1.6rem + 3.6vw, 4rem), 1.04): The landing headline only.
- **Title 1** (Newsreader 450, 2rem, 2.25rem): Page titles and auth titles. Shrinks to 1.75rem on 2rem below 760 px.
- **Title 2** (Newsreader 450, 1.5rem, 1.875rem): Drop zone title, empty states, import result and error titles, the small-screen editor message, landing step numbers.
- **Heading** (Schibsted 600, 1.125rem, 1.5rem, -0.01em): Dialog, sheet and card titles, site names on the dashboard, landing step titles.
- **Title 3** (Schibsted 600, 0.9375rem, 1.25rem): The site name in the editor top bar.
- **Lead** (Schibsted 400, 1rem, 1.5rem): The sentence under a page title or the landing headline, in ink 2.
- **Body** (Schibsted 400, 0.9375rem, 1.375rem): Sentences and input text. The reading measure is 66ch (`--measure`).
- **Control** (Schibsted 500, 0.875rem, 1.25rem): Buttons, nav rows, menu items, alerts, toasts.
- **Label** (Schibsted 500, 0.8125rem, 1.125rem): Field labels and sidebar group titles.
- **Meta** (Schibsted 400, 0.8125rem, 1.125rem): Timestamps, hints, counts, tooltips, in ink 3 or ink 2.
- **Micro** (Schibsted 600, 0.75rem, 1rem, 0.01em): Pills, keyboard hints, DNS record types, and the selection slug (`--kind-label-size`). Table column heads use micro in uppercase at 0.04em.
- **Brand** (Schibsted 700, 1.0625rem, -0.02em): The Pagehaven wordmark beside the flat ink logo.
- **Mono** (ui-monospace, 0.78125rem, 1.125rem): DNS values and file paths only.

### Named Rules
**The Two Voices Rule.** Schibsted Grotesk sets every interface role. Newsreader 450 sets only display titles outside the editor: the landing headline, page and auth titles, the drop zone title, empty states, import result and error titles, and the small-screen editor message.

**The Quiet Editor Rule.** Never use Newsreader in editor chrome. The owner's site supplies the editor's personality.

**The Digit Column Rule.** Tabular numerals only on digit-only columns (`.tnum`, numeric table cells). Schibsted's tabular figures space commas and words oddly, so never set them on running text.

**The System Mono Rule.** There is no mono web font. The system ui-monospace stack shows DNS values and paths, nothing else.

## Layout

A 4 px spacing grid (s0 2 px through s11 80 px). Screens sit in a centered column of 1160 px (`--page-max`) with a 24 px gutter that drops to 16 px under 520 px; narrow pages use 760 px, auth cards 400 px. The app header is 60 px, sticky on the ground with a hairline under it. Pages open with 40 px above and 64 px below. The dashboard is three equal proofs per row (two under 1000 px, one under 760 px) with 48 px between rows and 32 px between columns. Each proof is a bare 16:10 thumbnail on a 2 px ink caption rule, then the name with its status pill, the edit time and page count, the addresses, and a foot row aligned across the row: Edit (secondary, small), View website (ghost, only when published) and More on the right. The name link covers the whole proof; the addresses and the foot row sit above it in focus order.

The editor is a fixed grid: a 56 px top bar across, a 248 px sidebar, and the canvas. The sidebar width leaves the site 1008 px at a 1280 window, past Bootstrap's 992 breakpoint. Toolbar panels and popovers are 320 px, dialogs 440 px (640 px for website settings, where the DNS table needs room: `--dialog-w-wide`), sheets 360 px.

Breakpoints are 520 px (phone, one column, 16 px gutters, sheets become bottom sheets), 760 px (dashboard to one column, page heads stack, title 1 shrinks), 900 px (the editor minimum; below it the "needs a bigger screen" message shows) and 1000 px (editor top bar drops the Edit and Preview labels to icons). Under `(pointer: coarse)` every button, input, select and menu item reaches 44 px and inputs use 16 px text to stop iOS zoom.

Layers stack canvas hints (5), sticky bars (20), menus and popovers (30), the floating toolbar (40), menus opened from the floating toolbar (41, `--z-menu-over-toolbar`) and toasts and tooltips (100). Dialogs use the browser top layer.

Motion is mechanical: 90 ms for hover, press and color; 140 ms for menus, the toolbar and the selection glide; 200 ms for dialogs, sheets and panels; 280 ms for the computer and phone width change. Easing is a fast-out curve with a standard in-out for loops. Reduced motion sets every duration to zero and keeps instant state changes.

## Elevation & Depth

Flat by default. Regions separate with 1 px hairlines, never with shadows. Cards are a surface on the ground with a hairline. Only things that float above the page lift: menus, popovers, the floating toolbar, toasts, dialogs and sheets. Each gets a 1 px ink edge and one soft offset shadow. The canvas sits on the sunken backdrop with a 1 px ink keyline at 14 percent and a 2 px radius, like a sheet on a light table.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 1px 0 rgba(22, 22, 26, 0.04), 0 8px 20px -6px rgba(22, 22, 26, 0.28)`): Menus, popovers, the floating toolbar and toasts, always with the 1 px ink border.
- **Dialog** (`box-shadow: 0 2px 0 rgba(22, 22, 26, 0.04), 0 24px 48px -12px rgba(22, 22, 26, 0.35)`): Dialogs and sheets, over the scrim.
- **Canvas keyline** (`box-shadow: 0 0 0 1px rgba(22, 22, 26, 0.14)`): The editor canvas frame only.
- **Focus ring** (`box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--select)`): Every focusable control, with a transparent 2 px outline kept for forced colors.

### Named Rules
**The Float Only Rule.** No decorative shadows. A shadow means the thing floats, and a floating thing always has a 1 px ink edge.

**The Hairline Rule.** Separate regions with a 1 px rule, not with shadow, tint or space alone.

## Shapes

Sharp, like a trimmed proof. The canvas and thumbnails are 2 px, pills, the slug, swatches and tooltips 3 px, cards and sheets on the ground 2 px like the canvas, buttons, inputs and rows 4 px, menus, popovers, the toolbar and toasts 6 px, dialogs 8 px. The import steps drop the box altogether and sit under a 2 px ink rule, like the sign-in column. Full rounding is only for status dots, the avatar, the switch and the progress track. Borders are 1 px; meaningful rules are ink, decorative ones are hairline. A 2 px ink rule marks a proof's caption: under each dashboard and import result thumbnail, above each landing and first-run step, and above the sign-in column and import steps. The drop zone is the only dashed edge (1.5 px). Crop marks (`.crop`) are 8 px arms set 4 px outside a sheet's corners: 1 px ink on screens (`--crop-weight`), and 1.5 px Proof Cyan on a selection (`.crop-select`).

Icons are Lucide line glyphs from one sprite, assets/static/img/icons.svg, built by scripts/design/build_icons.py. They render at 16, 20 and 24 px with stroke widths of 2.25, 1.8 and 1.5 grid units so the stroke lands near 1.5 px at every size, with round caps and joins in currentColor. The logo and favicon are flat ink; the favicon flips to stock on ink for dark browser UI.

### Named Rules
**The Small Radius Rule.** Radii stay on the 2, 3, 4, 6 and 8 px steps. Pill shapes are only for dots, the avatar, the switch and progress.

## Components

### Buttons
Solid, quiet and exact.
- **Shape:** Small rounding (4 px), 36 px tall with 16 px sides; small is 30 px with 12 px sides, large 44 px with 20 px sides and body text.
- **Primary:** Solid ink with white text. It hovers to a lifted ink and presses to black. When the site is live, the editor's Publish button drops to the secondary look.
- **Secondary:** White with the control edge; hover darkens the edge to ink 2 over sheet hover.
- **Ghost:** Transparent with ink 2 text; hover and press use the ink washes. Pressed or expanded ghosts keep the press wash and ink text.
- **Danger:** Solid alert red for confirming a destructive step, or a red ghost with a red wash on hover.
- **Hover / Focus:** Color changes take 90 ms. Press nudges down 0.5 px. Focus is the cyan ring. Busy hides the label behind a 16 px spinner; disabled is sunken with ink 3.
- **Icon-only:** Square at each size. It must carry an aria-label and a title or tooltip; scripts/design/check_icons.py fails the build without the label.
- **Link button:** Underlined link text, 1 px thick, 3 px offset.

### Chips
- **Style:** Status pills are 22 px, 3 px radius, micro type, a soft wash with the matching ink and a 6 px dot. Offline uses a hollow dot.
- **State:** Draft and offline are neutral, published is green, changes and pending are amber, error is red. Keyboard hints are outlined in currentColor.

### Cards / Containers
- **Corner Style:** 2 px, the canvas corner.
- **Background:** Sheet white on the ground.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** 1 px hairline. Dashboard proofs are not cards: the thumbnail takes a 2 px ink outline on hover and the focus ring when the name link has focus.
- **Internal Padding:** 24 px.

### Inputs / Fields
- **Style:** White, 1 px control edge, 4 px radius, 36 px tall, 12 px sides, body text. Labels sit 6 px above in label type; hints and errors sit below in meta type. Selects use a 16 px chevron image.
- **Focus:** The edge turns ink, and keyboard focus adds the cyan ring.
- **Error / Disabled:** Invalid fields take an alert red edge with a red message. Disabled fields are sunken with a strong hairline and ink 3 text.

### Switch and Segmented Control
- **Switch:** A 32 by 20 px track with a control edge; on fills with ink and the knob turns white.
- **Segmented:** A hairline track with 2 px inset; options are 28 px, and the pressed option is solid ink with white text.

### Navigation
- **App header:** Wordmark left, ghost buttons and the account menu right, on the ground with a hairline under it.
- **Editor sidebar:** Collapsible sections with label-type heads in 600. Page rows are 36 px; the current page is the cyan wash with link-colored text and a cyan icon.
- **Menus and popovers:** Sheet white, ink edge, float shadow, 6 px radius, 4 px inner padding. Items are 34 px with the ink hover wash; destructive items are red. When any item in a menu leads with an icon, items without one keep an empty 16 px icon column so every label starts at the same x.
- **Disclosure:** A `<details class="disclosure">` whose summary is a quiet control-type text button with a chevron that turns 90 degrees when open; it underlines on hover.

### Floating Toolbar
The editor's signature tool. A sheet white bar with an ink edge and the float shadow that rises 4 px into place in 90 ms. Buttons are 30 px ghosts; pressed or expanded ones take the cyan wash with link-colored text, because they describe what is selected. Panels open below a hairline at 320 px.
- **Fit:** The bar is never wider than 640 px or the visible canvas, whichever is narrower, including the phone view. When the actions do not fit, the least used ones move into More, starting from the end of the row; the link's destination is dropped before Link itself moves. Buttons never wrap and labels are never cut. Only a canvas narrower than the shortest row (crumb, section controls and More) lets the row wrap.
- **Lead:** The row starts with the part's kind. For a plain section the Section menu is the lead, so the word appears once.

### Feedback
- **Toasts:** Toast ink, 6 px radius, float shadow, centered at the bottom, with a check icon. Errors are solid alert red with the alert icon. A warning (the change worked, but has a side effect such as a menu link that now goes nowhere) is the amber wash with ink text, an amber alert icon and the 1 px ink edge. The action is an underlined text button.
- **Save status:** The editor top bar always says whether changes are saved and, after a dot, whether they are published: "Saved · Not published yet", "Saved · 3 changes not published", "Saving… · Published". "Saved" does not time out. A save problem replaces both with its own words in warning or error color; unpublished changes are not a problem and stay ink 2. Below 900 px only the save word shows; the whole line stays in the tooltip and the accessible name.
- **Tooltips:** Toast ink, 3 px radius, meta type, shown after 500 ms on hover and at once on keyboard focus.
- **Alerts:** Inline soft wash with the matching ink and an icon.
- **Empty states:** A Newsreader title 2, one sentence in ink 2, one action.

### Dialogs and Sheets
Native dialogs, so focus is trapped and Escape closes. Dialogs are 440 px with an 8 px radius, ink edge, the dialog shadow and 24 px padding; actions sit right. Sheets slide 24 px in from the right at 360 px with an ink left edge, and become bottom sheets with rounded top corners under 520 px.

## Do's and Don'ts

### Do:
- **Do** keep the chrome ink, stock and hairline. Let the owner's site be the only color.
- **Do** use exactly one ink primary button per view.
- **Do** save Proof Cyan for selection, focus and links.
- **Do** pair every state color with a word or a shape.
- **Do** separate regions with 1 px hairlines and use ink rules only where the rule carries meaning.
- **Do** give every floating thing a 1 px ink edge and the float or dialog shadow.
- **Do** set every interface role in Schibsted Grotesk.
- **Do** use Newsreader 450 only for display titles outside the editor.
- **Do** use tabular numerals only on digit-only columns.
- **Do** take icons from the Lucide sprite at 16, 20 or 24 px, and give every icon-only button an aria-label.
- **Do** keep every target at 44 px under touch.

### Don't:
- **Don't** add a brand hue, tint or gradient to the chrome.
- **Don't** use Proof Cyan for decoration, headings or the primary button.
- **Don't** put a shadow on a card, panel, sidebar or button.
- **Don't** use Newsreader in editor chrome.
- **Don't** load a mono web font.
- **Don't** set tabular numerals on text with commas or words.
- **Don't** draw an icon by hand or use a text glyph as an icon.
- **Don't** round past 8 px except for dots, the avatar, the switch and progress.
- **Don't** let color alone carry a status.
