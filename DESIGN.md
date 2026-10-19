---
name: Pagehaven
description: Your AI-built website. Yours to edit. A calm, warm-white editor and host for nontechnical website owners.
colors:
  paper: "#f8f7f4"
  paper-sunken: "#f1efea"
  surface: "#ffffff"
  surface-hover: "#f6f5f1"
  surface-active: "#efede8"
  ink: "#1c1b18"
  ink-2: "#57534b"
  ink-3: "#8a857b"
  line: "rgba(40, 34, 24, 0.09)"
  line-strong: "rgba(40, 34, 24, 0.16)"
  haven-blue: "#2f5ce0"
  haven-blue-hover: "#2650cc"
  haven-blue-press: "#2045b3"
  haven-blue-soft: "#edf1fd"
  haven-blue-text: "#2448b8"
  on-accent: "#ffffff"
  live-green: "#1d7f55"
  live-green-soft: "#e6f4ec"
  pending-amber: "#a5660d"
  pending-amber-soft: "#fbf1df"
  alert-red: "#c63d32"
  alert-red-hover: "#ad3329"
  alert-red-soft: "#fcebe8"
  toast-ink: "#22201c"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(38px, 6.4vw, 68px)"
    fontWeight: 750
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SF Mono, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "8px"
  default: "10px"
  md: "12px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s7: "32px"
  s8: "40px"
  s9: "56px"
  s10: "80px"
components:
  button-primary:
    backgroundColor: "{colors.haven-blue}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.default}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.haven-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.default}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.default}"
    padding: "0 14px"
    height: "36px"
  button-large:
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.default}"
    padding: "0 12px"
    height: "38px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  pill-published:
    backgroundColor: "{colors.live-green-soft}"
    textColor: "{colors.live-green}"
    rounded: "{rounded.pill}"
    height: "22px"
  toolbar-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    height: "30px"
  toast:
    backgroundColor: "{colors.toast-ink}"
    textColor: "#f7f5f0"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Pagehaven

## Overview

**Creative North Star: "The Picture Mat"**

Pagehaven is the warm mat around someone else's picture. The owner's website is the artwork: loud, branded, made by an AI tool or a template, never Pagehaven's to restyle. Everything Pagehaven draws is the quiet frame around it: warm paper whites, soft ambient shadows, gently rounded controls and one calm blue that marks what to do next. The frame should feel like a well-made notebook app (the Craft.do lineage in the original brief) without copying one.

Density is moderate. Marketing and account pages breathe, with centred columns and generous vertical space. The editor is a working tool: a 56 px top bar, a sidebar of collapsible sections, the site in a rounded canvas that floats on a sunken paper background, and a small floating toolbar that appears next to whatever the owner clicks. The interface uses one system sans family for everything; hierarchy comes from size and weight, not from typefaces.

Motion is short and functional: 120 to 180 ms ease-out on hovers, menus, dialogs and the toolbar; a 260 ms width change when switching between computer and phone view. Nothing loops except loading indicators.

**Key Characteristics:**
- Warm off-white paper (`paper`) behind white surfaces; never pure gray, never dark mode.
- Soft, low-opacity, warm-tinted shadows with real offset and blur; borders at 9 to 16 percent warm ink.
- Rounded but not bubbly: 8 to 14 px on controls and cards, 20 px on large panels, pills for status.
- One accent, Haven Blue, for the primary action, the current selection and focus.
- Plain-language labels; icons always come from the one stroked icon sprite.

## Colors

A warm neutral world with a single confident blue and three quiet status colors.

### Primary
- **Haven Blue** (`haven-blue`): the one primary action per view (Sign up, Import website, Publish), the selection outline in the canvas, focus rings (at 28 percent opacity), switches when on, and the hero emphasis on the landing page.
- **Haven Blue Text** (`haven-blue-text`): links and blue text on light surfaces, where the brighter blue would be too thin.
- **Haven Blue Mist** (`haven-blue-soft`): the background of the current page in the page list, pressed toolbar buttons, info alerts and the import drop target while dragging.

### Neutral
- **Paper** (`paper`): the page background of every app screen.
- **Sunken Paper** (`paper-sunken`): the editor's canvas backdrop, input addons, code chips, progress tracks.
- **Surface** (`surface`): cards, sidebar, top bar, menus, dialogs, toolbar.
- **Ink** (`ink`), **Ink 2** (`ink-2`), **Ink 3** (`ink-3`): primary text, secondary text, and quiet meta text (hints, timestamps, placeholders).
- **Line** and **Line Strong**: hairlines between sections and the borders of inputs and secondary buttons. Both are warm ink at low opacity, so they sit naturally on paper and on white.

### Status
- **Live Green** (`live-green` on `live-green-soft`): Published, Saved, verified domain, Imported.
- **Pending Amber** (`pending-amber` on `pending-amber-soft`): Saving, unpublished changes, domain waiting for DNS, warnings.
- **Alert Red** (`alert-red` on `alert-red-soft`): errors, destructive actions.

### Named Rules
**The One Blue Rule.** Haven Blue marks the next step, the current thing, or focus. It is never decoration, and a view has one filled blue button.

**The Owner's Colors Rule.** Pagehaven never tints, filters or overlays the owner's site beyond the selection outline. The canvas is pure white so the site's own colors read true.

## Typography

**Display Font:** the platform sans (SF Pro Display on Apple devices, Segoe UI on Windows, system-ui elsewhere)
**Body Font:** the same family's text cut
**Label/Mono Font:** ui-monospace, only for DNS records, file paths and code chips

**Character:** neutral and native, so the owner's own fonts are the only expressive type on screen. No web fonts are loaded.

### Hierarchy
- **Display** (750, clamp 38 to 68 px, 1.04, -0.035em): the landing page headline only.
- **Headline** (700, 24 to 30 px, 1.15, -0.02em): page titles (Your websites, Import a website, auth cards, empty states).
- **Title** (650, 16 to 22 px): card titles, dialog titles, dropzone and result headings.
- **Body** (400, 15 px, 1.5; 14 to 14.5 px in cards and dialogs): sentences. Paragraphs cap at about 30 to 36 rem.
- **Label** (600 to 650, 12 to 13 px): field labels, sidebar section summaries, toolbar labels, pills.

### Named Rules
**The Weight-Not-Font Rule.** Hierarchy is size and weight within one family. Never add a second typeface to Pagehaven's own interface.

## Layout

App pages center in a 1160 px column with 24 px gutters (16 px under 520 px). The import page narrows to 760 px. Auth pages center a 400 px card vertically. The landing page centers a 920 px hero and a three-column step row that stacks under 760 px.

The editor is a CSS grid: a 284 px sidebar and the canvas, under a 56 px top bar split into the same 284 px left cell, a centered tool cluster and a right cluster with save status and Publish. The canvas sits 16 px inside a sunken backdrop. Under 900 px the editor is replaced by a "needs a bigger screen" message; under 1100 px the Edit and Preview labels collapse to icons.

Spacing follows the 4 px based scale `s1` to `s10`. Groups are tight (6 to 8 px between label and input, 12 px between fields in the sidebar), sections separate at 24 to 32 px.

## Elevation & Depth

Depth is ambient and warm. Shadows are layered, low opacity and tinted with the warm ink (`rgba(28, 24, 16, …)`), always with a vertical offset and soft blur. Resting cards use the small shadow plus a hairline border; hover lifts to the medium shadow; floating things (menus, dialogs, toolbar, toasts, the landing mock window) use the large shadow.

### Shadow Vocabulary
- **Hairline lift** (`0 1px 2px rgba(28,24,16,.05)`): secondary buttons.
- **Resting card** (`0 1px 2px rgba(28,24,16,.05), 0 2px 6px rgba(28,24,16,.04)`): cards, selected segmented control.
- **Raised** (`0 1px 2px rgba(28,24,16,.05), 0 6px 18px rgba(28,24,16,.07)`): card hover, the editor canvas.
- **Floating** (`0 2px 4px rgba(28,24,16,.04), 0 12px 32px rgba(28,24,16,.1), 0 24px 64px rgba(28,24,16,.06)`): menus, dialogs, the floating toolbar, toasts.
- **Focus ring** (`0 0 0 3px rgba(47,92,224,.28)`): every focusable control.

### Named Rules
**The Paper-Not-Glass Rule.** Surfaces are opaque paper. The only blur is the sticky app header, so content scrolling under it stays legible.

## Shapes

Gently rounded rectangles throughout: 8 px for small controls and list rows, 10 px for buttons and inputs, 12 px for large buttons, menus, toasts and the canvas, 14 px for cards and dialogs, 20 px for the dropzone and the landing mock window. Status uses full pills with a 6 px dot. The phone preview is a 38 px rounded device with a dark bezel. Borders are 1 px hairlines; the dropzone alone uses a 1.5 px dashed border.

## Components

### Buttons
- **Shape:** gently rounded (10 px; 12 px large, 8 px small).
- **Primary:** Haven Blue fill, white 550 weight text, 36 px tall (44 px large, 30 px small), a faint inner highlight and blue-tinted drop shadow.
- **Secondary:** white with a strong hairline and the hairline lift.
- **Ghost:** transparent, Ink 2 text, warm 5 percent wash on hover; `aria-pressed` shows a 7 percent wash.
- **Danger / Danger ghost:** Alert Red fill, or red text that gains a red mist on hover.
- **Hover / Focus:** 120 ms color change; 0.5 px press; focus is the blue ring.

### Pills
- **Style:** 22 px pill, 12 px semibold, colored dot. Draft is warm gray, Published is green, Pending is amber.

### Cards / Containers
- **Corner Style:** 14 px.
- **Background:** Surface on Paper.
- **Shadow Strategy:** Resting card, Raised on hover for clickable cards.
- **Border:** Line hairline.
- **Internal Padding:** 24 px (20 px in dense cards).

### Inputs / Fields
- **Style:** white, 1 px Line Strong, 10 px radius, 38 px tall (32 px small).
- **Focus:** border turns Haven Blue plus the focus ring.
- **Error:** red border and an alert below the form.

### Navigation
- App header: sticky, translucent paper with blur, brand left, avatar menu right. The menu is a white floating card with 34 px rows.
- Editor sidebar: collapsible sections with 46 px summaries and a rotating chevron. The current page row uses Haven Blue Mist.

### Floating toolbar (signature)
The editor's contextual toolbar: a white floating card with the large shadow, a small semibold label naming the selected thing, 30 px icon and text buttons, hairline separators, and panels (text style, box style, link, image) that unfold below a hairline inside the same card. Swatches are 24 px rounded squares; the selected swatch gets a white gap and a blue ring.

### Toasts
Dark warm ink pills at the bottom center, 13.5 px text, rising in over 180 ms. Errors use a deep red.

## Do's and Don'ts

### Do:
- **Do** keep the owner's site the most colorful thing on screen.
- **Do** use the shared tokens (`--bg`, `--surface`, `--text-*`, `--line*`, `--accent*`, `--shadow-*`, `--r*`) instead of literal values.
- **Do** give every control hover, focus, pressed and disabled states, using the focus ring.
- **Do** take icons from `/static/img/icons.svg` at 1.7 px stroke.
- **Do** write labels in plain words: website, page, address, version, publish.

### Don't:
- **Don't** add a second accent hue or decorate with Haven Blue.
- **Don't** use dark mode, glass panels or pure gray neutrals; the world is warm paper.
- **Don't** load web fonts or add a second typeface.
- **Don't** show developer terms (slug, deploy, build, DOM, release) in the interface.
- **Don't** put more than one filled blue button in a view.
