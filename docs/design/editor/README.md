# Visual editor spec

Owner: Subagent D (visual editor design). Status: proposal for the integrator. No app file is changed by this document.

This spec covers the editor surface at `/projects/{pid}`: the canvas, the overlay the agent draws inside the imported site, the floating toolbar and its panels, the top bar, the sidebar, responsive editing, motion and accessibility. Every visual value is a token role (for example `--overlay-accent`). Subagent A binds the roles to the palette and fonts. Section 12 lists the roles.

Method: the installed Impeccable skill, Operate mode, with `operate.md`, `layout.md`, `animate.md`, `adapt.md`, `polish.md` and `craft-floor.md` applied to the evidence below. The baseline detector run (`impeccable detect` on `editor.html`, `app.css`, `toolbar.ts`, `agent.ts`) returned 67 advisory findings and nothing blocking. The relevant ones for this surface are the literal colours in `agent.ts` lines 54 to 60, which sit outside the token system.

## 0. Evidence

Studied live on the dev server at a 1280 by 800 window, on fresh imports of `fixtures/zips/startbootstrap-agency.zip` (Bootstrap) and `fixtures/zips/landwind.zip` (Tailwind). Screenshots are in `shots/`.

| Shot | What it shows |
|---|---|
| `01-agency-hover-heading.png` | Hover outline on a white heading over a dark photo. The 1.5 px line at 60 percent accent is barely visible. |
| `02-agency-select-heading.png` | The selected heading is labelled "Text", because its tag is a `div`. The toolbar covers the line above, "Welcome To Our Studio!". |
| `03-agency-style-panel.png` | The style panel grows upward over the content above the selection and reaches the site's nav. The swatches are Rótulo's palette (Haven Blue, purple), not the site's colours. |
| `04-agency-link-panel.png` | A `#services` link appears under "Web address" while its badge says "Goes to a part of this page". The panel covers the whole headline. |
| `05-agency-paragraph-toolbar-offset.png` | The toolbar is clamped to the browser window, not the canvas. It hangs right of the selection and covers the next column's heading. |
| `06-agency-section-selected-offscreen.png` | A section reached after four "Select parent" clicks ("Box", "Box", "Box", then "Section"). Its top is scrolled behind the site's sticky nav. The only visible trace is a 2 px line at the bottom edge. A stale hover outline stays on the paragraph. |
| `07-agency-hidden-veil-over-nav.png` | The hidden-section veil paints over the site's fixed nav. Its "Hidden on your website" badge sits at the section top, which is off screen. |
| `08-agency-phone-toolbar-over-nav.png` | Phone view. The toolbar sits on the site's own nav bar. Scroll position (850 px) carried over from desktop and lands on different content. |
| `09-agency-960-window-desktop-shows-tablet.png` | At a 960 px window, "Computer screen" is pressed but the site gets 688 px and renders its tablet nav ("MENU"). |
| `10-landwind-1008-shows-hamburger-edge-outline.png` | Landwind at the default 1008 px canvas renders its hamburger, because Tailwind `lg` is 1024 px. The hover outline on the full-width header is clipped by the frame edges. |
| `11-landwind-blocked-widget.png` | A script-built GitHub widget. Dashed grey box and an explanatory note with no next step. |
| `12-landwind-image-description-panel.png` | Image toolbar (Replace image, Description, Background, Select parent) and the description panel. Focus moves into the textarea correctly. |
| `13-landwind-inline-editing.png` | Inline editing. The editing outline is nearly identical to the selected one. A stale hover box doubles the top edge. Bold shows as pressed for the whole heading. The toolbar covers the site logo. |
| `14-landwind-after-publish.png` | After publishing. The top-bar "Publish" turns white but stays enabled. The sidebar "Publish changes" also stays enabled with nothing to publish. "View website" appears and shifts the centre cluster 7 px. |

Measured in the browser through `preview_evaluate`:

- A section hide saves in about 100 ms and then reloads the whole canvas. The loading veil shows for about 190 ms.
- Switching pages takes about 225 ms. Adding a page takes about 300 ms. Both show the veil.
- Publishing completed in under 150 ms.
- Clicking any toolbar button that toggles a panel re-renders the toolbar and leaves `document.activeElement` on `<body>`.
- Nothing in the canvas can be selected with the keyboard. The agent has no keyboard selection path (`agent.ts` handles pointer events only).

## 1. Spatial thesis

The owner's page is the artwork, and everything Rótulo draws is the mat and the hand that points at it.

- **Primary.** The site at a true desktop or phone layout, as large as the window allows.
- **Secondary.** One floating toolbar next to the current thing. It never sits on the thing it edits.
- **Tertiary.** The top bar (where am I, is it saved, is it live) and the sidebar (pages and website settings).
- **Density.** Quiet chrome, short labels, one filled accent button per view. Advanced controls live one click away in an overflow menu or a panel, never permanently on screen.
- **Never.** Tint, filter or restyle the owner's site, except the selection overlay and the explicit preview of a change the owner is making.

## 2. Canvas framing

### 2.1 Chrome around the site

- The canvas area is `--canvas-backdrop` with no texture. The frame is a plain rectangle with `--radius-canvas` and `--shadow-canvas`. A 12 px gutter (`--space-3`) remains on all sides at desktop.
- The frame's top-left shows nothing. The page identity lives in the top bar (section 4.2), not on the site.
- The loading veil (`canvas-loading`) appears only after 300 ms of loading. Below that the old frame stays visible (section 2.5).
- The Preview-mode hint moves off the site into the top bar (section 4.1). Today `.mode-hint` is a 400 px dark pill over the bottom of the site, and in phone view it overlaps the device frame.

### 2.2 Desktop frame and zoom to fit

The problem: the site's layout width is whatever the window leaves after the sidebar. At 1280 px that is 1008 px. That passes Bootstrap's 992 px breakpoint but fails Tailwind's 1024 px (shot 10). At 960 px it fails both (shot 09). "Computer screen" then shows a tablet layout.

The rule: on "Computer screen" the site always lays out at a nominal desktop width and is scaled down to fit.

- `layoutWidth = max(availableWidth, 1280)`. `scale = availableWidth / layoutWidth`, so it is at most 1.
- The iframe gets `width: layoutWidth px; height: availableHeight / scale px; transform: scale(scale); transform-origin: 0 0`. The frame keeps the visible size.
- A quiet zoom chip sits in the canvas corner (bottom right, inside the backdrop gutter, not on the site): "Fit 79%". Its menu offers "Fit to window" (the default) and "Actual size (100%)". At 100% the canvas scrolls horizontally.
- Below a 0.6 scale the chip shows a warning dot and the tooltip "Text is small at this size. Widen the window or hide the sidebar."
- Pointer events into a transformed iframe are mapped by the browser, so the agent needs no change. The editor converts agent rects (iframe CSS px) to app px with `appX = frameLeft + rect.x * scale`. This affects `toolbar.ts` `position()` and the section rail (section 3.6).

Security: none. The sandbox, `src` and origin checks are unchanged, and a transform does not cross the boundary.

### 2.3 Phone frame

- The phone viewport is always 390 by 844 CSS px. Today `max-height: 844px` silently shrinks it to the available height (696 px at 800 px tall), which changes every `100vh` hero.
- When the frame does not fit, scale it uniformly (same mechanism as 2.2) so the whole device is visible. The zoom chip shows the scale.
- The bezel uses `--device-bezel` (10 px) and `--device-bezel-edge` (1 px), with a 44 px outer radius and a 34 px screen radius. No notch, no status bar, no fake hardware. The site's top edge must stay readable.
- On switching device, keep the selection and scroll it into view in the new layout (new message `reveal`, section 9). Do not carry `scrollY` across devices; a pixel offset means different content at another width.

### 2.4 Device switch transition

Today `.canvas-frame` animates `width` over 260 ms. The site reflows and refires media queries on every frame, and the toolbar position goes stale mid-flight. Replace it with fade out (90 ms), set the size, wait for the agent's next `viewport`, then fade in (160 ms). Reduced motion swaps at once.

### 2.5 Reloads without flashing

Move, duplicate, undo, redo, page switch and page add all reload the iframe and show the white veil (`rgba(255,255,255,.86)`). Two changes:

1. **No reload for hide and show.** `preview_hidden` already shows the change. `toolbar.ts` calls `save(..., "reload-select")` for `hide_section`; switch it to `"none"`. Reload only on a 422 rejection, as today.
2. **Double-buffered frame.** For the remaining reloads, load the new document in a second iframe with identical attributes (`sandbox="allow-scripts allow-same-origin"`, `referrerpolicy="no-referrer"`) behind the visible one. Swap on the agent's `ready` and remove the old frame. `canvas.ts` must then accept messages only from the active iframe's `contentWindow`, and only from the expected origin, which is the existing check pointed at a variable rather than the constant `iframe`. The veil appears only if `ready` takes longer than 300 ms.

Security: the second iframe is the same preview origin with the same sandbox. The contract's rule ("`event.source` is the expected window") still holds. Update `docs/frontend-contract.md` to say "the active canvas iframe".

## 3. The overlay inside the site

### 3.1 What `agent.ts` does today

- It creates a custom element `<rotulo-overlay>` and appends it to `<html>`, outside `<body>`.
- It attaches a closed shadow root styled by a constructed `CSSStyleSheet` (`adoptedStyleSheets`) with `:host { all: initial; }`.
- It sets 13 inline `!important` properties on the host (`position: fixed`, `inset: 0`, `z-index: 2147483647`, `pointer-events: none`, `transform: none`, `filter: none`, `opacity: 1` and others).
- It draws three boxes (hover, select, blocked) and a veil layer for hidden sections. Boxes are `position: fixed` rects at element rect ±2 px, with `transition: top/left/width/height 60ms linear`.
- Colours are literals: `ACCENT = "#2f5ce0"`, `#8a857b`, `#b5afa4`, `#22201c`.
- For preview mode it adds one document-level adopted sheet, `[data-ph-hidden="true"] { display: none !important; }`, disabled in edit mode. This is the only style the agent applies to the site itself.

That is a sound base. These gaps were confirmed in source or in the browser.

| Gap | Effect |
|---|---|
| The host resets only 13 properties. Outer author rules that target the host beat `:host { all: initial }`. | A site rule such as `html > * { scale: 0 }`, `* { mix-blend-mode: difference }`, `clip-path`, `mask`, `zoom`, `rotate` or `content-visibility` can distort or hide the overlay. |
| The host is a child of `<html>`. A `transform`, `filter`, `perspective`, `contain` or `will-change` on `<html>` makes it the containing block for fixed elements. | The overlay is offset from the elements it marks. |
| The site's `<dialog>.showModal()` and popovers render in the top layer above any z-index. | The overlay draws under site modals, and the selection can be invisible. |
| The chip font stack is `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui`. `@font-face` names are document-wide. | A site that declares `@font-face { font-family: "Segoe UI" }` changes the overlay's text. |
| Box transitions run on every scroll redraw. | The outline trails the content by 60 ms while scrolling. |
| Hover is never cleared when the selection changes or the pointer leaves for the app. | Stale hover outlines (shots 06 and 13). |
| Single-colour accent lines. | Invisible on dark or blue sites (shot 01). |
| The blocked box fills 8 percent grey. | It tints the owner's site (DESIGN.md, "The Owner's Colors Rule"). |
| The veil is painted at max z-index over everything. The badge sits at the section's top edge. | It covers the site's sticky nav, and the badge is off screen for tall sections (shot 07). |
| Literal colours. | They cannot follow Subagent A's tokens. |

### 3.2 Robustness rules (change in `agent.ts`, top-level host setup)

1. **Reset everything on the host.** Call `host.style.setProperty("all", "initial", "important")` first. Then set `display: block`, `position: fixed`, `inset: 0`, `z-index: 2147483647`, `pointer-events: none`, `visibility: visible`, `opacity: 1`, `contain: layout style` and `isolation: isolate`, all `!important`. Inline `!important` beats every author rule, and `all` covers properties nobody listed.
2. **Compensate for a containing block on `<html>`.** In `redraw()`, read `host.getBoundingClientRect()` once per frame and subtract its `left` and `top` from every placed rect. The value is 0 on normal pages, and the read costs one rect per frame.
3. **Top layer.** Feature-detect `HTMLElement.prototype.showPopover`. If present, give the host `popover="manual"` and call `showPopover()` in `start()`. Re-call it (hide, then show) when a site `dialog` or `[popover]` opens, detected through the existing `MutationObserver` on the `open` attribute and the `toggle` event. That keeps the overlay above site modals. The inline `all: initial !important` already neutralises the UA popover styles. Verify in Chromium and WebKit before shipping. Fallback: today's z-index.
4. **Re-attach if removed.** If the site's script removes the host, append it again in the existing `MutationObserver` (`if (!host.isConnected) document.documentElement.append(host)`). This is idempotent. The threat model already accepts that the site's JS can interfere. Re-attaching only keeps honest pages working when a framework re-renders `<html>`.
5. **Generic fonts only.** Overlay text uses `font: 600 11px/16px system-ui, sans-serif`. Generic family keywords cannot be redefined by `@font-face`.
6. **No fills on the site.** The overlay draws lines, chips and the hidden-section veil, and nothing else. The blocked box loses its grey fill.
7. **Own reduced-motion rule.** Add `@media (prefers-reduced-motion: reduce) { .box, .chip { transition: none } }` to the shadow sheet. The app's global rule in `app.css` does not reach the iframe.
8. **One token source.** Move the overlay colours into a new shared module, `frontend/overlay-theme.ts`, exporting role values that both the agent and a test import. Add a test that parses `assets/static/css/app.css` and asserts that the `--overlay-*` custom properties equal the module's values, so the two cannot drift. This avoids a protocol change for theming.

Nothing here weakens isolation. The app's CSS never enters the iframe. The overlay stays inside a closed shadow root. The only document-level sheet remains the preview-mode hidden-section rule.

### 3.3 States and how they are drawn

All rings are drawn outside the element. When the element touches the viewport edge (within 3 px), that side is drawn inside instead, so a full-width header still shows four sides (shot 10).

Every line is two-tone: an accent stroke with a 1 px `--overlay-halo` (near-white at 90 percent) on its outer side. That reads on white, black, photos and brand-blue sites without tinting the site.

| State | Stroke | Offset | Extra | Chip |
|---|---|---|---|---|
| Hover (editable) | 1.5 px `--overlay-hover` | 2 px out | 1 px halo | Only for containers (section, header, footer, menu), after 300 ms of dwell, top-left outside. |
| Hover (not editable, script-built) | 1.5 px dashed `--overlay-muted` | 2 px out | 1 px halo, no fill | None. |
| Selected | 2 px `--overlay-accent` | 3 px out | 1 px halo outside and 1 px halo inside | None. The toolbar carries the label. |
| Editing text | 2 px `--overlay-accent` | 3 px out | 4 px `--overlay-accent-soft` glow outside the halo | None. Distinct from Selected because the glow is wide and the toolbar changes. |
| Selected, but its toolbar is docked away (section 5.3) | as Selected | | | Kind chip, top-left outside: "Heading". |
| Hidden section | 1 px dashed `--overlay-muted` | 0 | Diagonal veil in `--overlay-veil`, clipped below the site's sticky header rects (3.5) | Badge "Hidden on your website", pinned 8 px below the top of the section's visible part. |
| Move target (keyboard move) | 2 px `--overlay-accent` insertion line between sections | | | None. |
| Just moved, duplicated or undone | Selected, plus one 400 ms `--overlay-accent-soft` pulse | | | None. Reduced motion skips the pulse. |

- Corners: rings use a 2 px radius, not the element's. Never mimic site radii.
- Large elements: when the selected element is taller than the viewport, draw only its visible edges. The section rail (3.6) shows the full extent.
- Hover clears when the selection changes, when the pointer leaves the document, and when focus moves to the app (the iframe gets `blur`).
- Hover never draws on the selected element. That rule exists today; keep it.

### 3.4 Kind detection (one table, shared)

Today `labelFor()` in `toolbar.ts` maps tags and falls back to "Text" or "Box", which produced "Text" for a heading `div` and "Box" three times in a row. Move kind detection into the agent, which can see computed styles, and send it in the `select` message as an enum.

| Kind | Rule, first match wins |
|---|---|
| `image` | `img` or `picture`, or `can` includes `i`. |
| `button` | `button`, or an `a` whose computed style looks like a button: `display` not `inline`, a non-transparent background or a border, and padding of 6 px or more on both axes. Also any element with role `button`. |
| `link` | `a` (not a button). |
| `heading` | `h1` to `h6`, or role `heading`, or a text element whose font size is at least 1.5 times the body size and whose weight is 600 or more. The last rule catches the Bootstrap `div.masthead-heading`. |
| `menu` | `nav`, or `can` includes `x` and the element contains a `nav`. |
| `header`, `footer` | Those tags with `x`. |
| `section` | `can` includes `x`. |
| `list-item` | `li`. |
| `text` | `can` includes `t`. |
| `box` | Everything else. |

Labels in plain words: Image, Button, Link, Heading, Menu, Header, Footer, Section, List item, Text, Box.

The `select` message also gains these fields:

- `name`: a short human name, at most 60 characters. For a section, its first heading's text ("Services"). For an image, its alt text. For a link, its text. The editor renders it with `textContent` only.
- `ancestors`: up to 8 `{element, kind, name}` entries, nearest first, editable ancestors only. This powers the breadcrumb (5.2) and replaces the "Select parent" climb.
- `section`: the nearest ancestor-or-self with `x`, as `{element, rect, name, can}` or `null`. This powers the section rail.

### 3.5 Obstructions: the site's own sticky chrome

The toolbar and the veil must avoid the site's fixed and sticky headers and footers (shots 07 and 08). In `redraw()`, the agent finds up to 4 elements with computed `position: fixed` or `sticky` that touch the viewport's top or bottom 25 percent and are wider than half the viewport. It adds their rects to the `viewport` message as `obstructions`. Cache the candidate list and refresh it on `resize` and on a `MutationObserver` batch, not per frame.

### 3.6 Section rail (handles for reorder)

All interactive controls stay in the app document. The overlay remains `pointer-events: none`. That keeps every action under the app's origin checks, and site JS cannot click Rótulo buttons.

- When anything inside a section is selected, the app shows a vertical rail of 28 px buttons outside the site, in the canvas gutter to the left of the frame. It is aligned to the section's visible top, below any obstruction. Contents: a grip (`i-drag`, also the "select this section" button), Move up, Move down.
- When the gutter is narrower than 36 px (fit-to-window at small widths), the rail overlaps the frame's left edge inside the site, with `--toolbar-surface` and `--shadow-float`.
- Keyboard: with the grip focused, ArrowUp and ArrowDown move the section (one `move_section` edit per press) and keep focus on the grip. The overlay draws the insertion line after the server confirms. A live region says "Section moved up. 3 of 7."
- Drag to reorder is phase 2. The API moves one step per edit, so a drag of N positions becomes N undo entries. Ship drag only if the server gains `move_section` with a target index.

## 4. Top bar and sidebar

### 4.1 Top bar (permanent)

The top bar has three zones in a grid. The left and right zones have fixed minimum widths so the centre never shifts when content changes. Today "View website" shifts it 7 px.

| Zone | Content | Notes |
|---|---|---|
| Left | Back (chevron, label "Your websites" in the tooltip). Then the site name and the page switcher: "Agency / Home". | The page switcher is a button that opens a menu (4.3). |
| Centre | Undo and Redo, a divider, a segmented "Edit / Preview" with text labels, and a segmented device toggle (desktop, phone icons with tooltips). | "Edit" and "Preview" keep their text down to 1100 px. Icons alone are ambiguous (brief section 5). |
| Right | The save indicator (4.4), then the publish control (4.5). | "View website" moves into the publish control's menu once a version is live. |

In Preview mode the centre zone shows a quiet `--surface-sunken` pill reading "Previewing. Links work like on your website." followed by a "Back to editing" button (shortcut Esc). The bottom pill over the site is removed.

### 4.2 Sidebar

The sidebar is 248 px (`--sidebar-width`), docked at 1100 px and wider, and a drawer below that (section 7). Sections, in order:

1. **Pages.** Always open. Rows are 36 px high, the current page uses `--selection-soft`, and a "More" menu on each row (Rename, Duplicate, Delete) exists today.
2. **Images.** The asset grid, lazy as today. It becomes the second source in the image replacement flow (6.3).
3. **Page settings.** Title and description for the current page, as today.
4. **Website settings.** Name and address, as today.

"Publishing" leaves the sidebar. Its parts (state, address, version history, own domain) move into the publish popover (4.5). Today the sidebar repeats the publish button and the state from the top bar, which gives two Publish buttons in one view.

A sidebar toggle in the top-bar left zone (shortcut Ctrl or Cmd plus `\`) hides it. That gives the site the full width.

### 4.3 Page switcher

- The top-bar control shows "Site name / Page name ▾". The menu lists pages in the same order and with the same labels as the sidebar (`pageLabel()`), and adds "Add page" at the bottom. With more than 8 pages it gets a filter field.
- The current page carries a check mark and `aria-current="page"`.
- Switching keeps the device, mode and zoom, and clears the selection. During the switch the old page stays visible (2.5). The page name in the top bar updates on `ready`, not on click, so it never names a page that is not shown.
- Keyboard: Ctrl or Cmd plus `K` opens the page menu. Arrow keys move, Enter opens, Esc closes and returns focus to the trigger.

### 4.4 Save indicator semantics

Today `State` has `pending: number` and `saveError: string | null`, and `wireTopBar()` derives three labels. Replace them with one discriminated union in `state.ts` and render from it.

```ts
type SaveState =
  | { kind: "saved"; at: number }
  | { kind: "saving"; since: number }
  | { kind: "offline"; queued: number }
  | { kind: "error"; message: string }
  | { kind: "conflict" };
```

| State | Shown | Announced (`aria-live`) | Action |
|---|---|---|---|
| saved | A dot in `--status-ok` and "Saved". The tooltip says "Saved 2 minutes ago". | Not announced. Announcing "Saved" after every edit is noise. | None. |
| saving | "Saving…" with a static `--status-pending` dot. It appears only if the save takes longer than 400 ms. Saves measured about 100 ms, so most edits never flash it. | Not announced. | None. |
| offline | "Offline. 2 changes waiting." in `--status-warn`. | Announced once, politely. | Retry automatically on the `online` event with backoff (1 s, 3 s, 10 s). Also a "Try now" button. |
| error | "Not saved" in `--status-error`, as a button that opens a popover with `message` and "Try again". | Announced assertively. | Retry re-sends the failed edit. If the server rejected it with a 422, the canvas reloads to the server state, as today. |
| conflict | "Changed in another tab" in `--status-error`. The existing conflict dialog opens. | Announced assertively. | "Reload". The queue stays halted, as today. |

`saves.ts` changes so that a network failure (status 0) keeps the job queued for retry instead of dropping it. Today a failed edit is lost, while the canvas still shows the previewed change. A 422 still drops the job and reloads.

`beforeunload` warns when the state is saving, offline or error. Today it warns only while `pending > 0`.

### 4.5 Draft versus published, and the publish action

Model it as one derived value, not three flags:

```ts
type PublishState =
  | { kind: "never" }
  | { kind: "live-current"; release: number; at: string }
  | { kind: "live-behind"; release: number; at: string }
  | { kind: "publishing" }
  | { kind: "failed"; message: string };
```

| State | Top-bar control | Popover headline |
|---|---|---|
| never | Filled accent button "Publish". | "Not published yet." |
| live-behind | Filled accent button "Publish changes", with a `--status-warn` dot for "Unpublished changes". | "Your website shows version 3. You have changes that are not live yet." |
| live-current | A quiet split control: "Live ✓" status and a "View website ↗" link. No filled button, and nothing to publish. Today "Publish" stays enabled and would create an identical version (shot 14). | "Your website is up to date." |
| publishing | The button is disabled and reads "Publishing…". | |
| failed | The button stays enabled. A popover opens with the server `message` (for example a missing stylesheet). | |

- The caret beside the control opens the publish popover: the live address (copyable), version history with "Make live" and "Edit this version", and the own-domain section. These are today's sidebar parts, unchanged in behaviour.
- The first publish confirms in the popover: "Your website will be live at harbor.sites.example. You can make an earlier version live at any time." followed by a Publish button. Later publishes are one click.
- After publishing, a toast reads "Version 4 is live." with actions "View" and "Undo". "Undo" calls `releases/{previous}/activate`, the existing rollback.
- Exactly one filled accent button per view. When nothing needs publishing, there is none.

### 4.6 Undo and redo

- These are icon buttons. Their tooltips and accessible names come from the server label with the first letter capitalised: "Undo: Section visibility (Ctrl+Z)". Today the label is lowercase ("section visibility").
- After undo or redo, the agent selects the affected element if the editor knows it (the last edit's `element`). The selection pulses once (3.3). This needs no server change for edits made in this session.
- The keyboard shortcuts stay as today: Ctrl or Cmd plus Z, Shift plus Ctrl or Cmd plus Z, and Ctrl plus Y. They work from the app and, forwarded through `shortcut`, from the canvas.

## 5. Contextual floating toolbar

### 5.1 Actions per kind

Primary actions show text labels. Secondary actions sit in a "More" (`i-more`) overflow menu. Destructive actions come last in the overflow, separated by a divider. The label at the left is the breadcrumb trigger (5.2).

| Kind | Primary (visible) | Overflow |
|---|---|---|
| Heading, Text, List item | Edit text. Text style. | Background and spacing. |
| Editing text | Bold. Italic. Link. Then a divider and Done (accent text). | Cancel, which is the same as Esc. |
| Link | Edit text. Change link, which shows the destination: "→ Services section". | Text style. Background and spacing. |
| Button | Edit text. Change link. | Text style. Background and spacing. |
| Image | Replace image. Description, with a `--status-warn` dot when alt is empty. | Change link (when the image sits inside a link; this selects the link). Background and spacing is hidden for `img`, because it only shows behind transparent pixels. |
| Section, Header, Footer, Menu | Hide or Show. Background and spacing. | Duplicate. Move up and Move down, also on the rail. Then a divider and Remove (danger, with the confirm dialog it has today). |
| Hidden section | Show. | Duplicate. Remove. |
| Box | Background and spacing. | None. If a Box has no actions, clicking it selects its nearest section instead. |
| Blocked (script-built) | The note "This part is made by the website's own code, so it can't be changed here." and a button "Select the part around it" when an editable ancestor exists. | None. |

The toolbar's accessible name is "Heading tools" (kind plus "tools"). Today it is "Edit the selected part" for every kind.

### 5.2 Breadcrumb instead of "Select parent"

The toolbar's left label is a menu button: "Heading ▾". Its menu lists the `ancestors` from 3.4, nearest first, as "Section · Services", "Box", "Box". Choosing one sends `select_element`. The ambiguous "Select parent" icon (`i-parent`, a curved arrow) is removed. Alt plus ArrowUp still selects the parent (5.4).

### 5.3 Placement and collisions

Replace `position()` in `toolbar.ts` with a candidate search. Inputs, all in app px after zoom scaling:

- `T`: the target's visible rect, meaning the element rect intersected with the canvas viewport.
- `C`: the canvas frame's visible rect. The toolbar is clamped to this, not to the window. Today it clamps to the window (shot 05).
- `O`: the site's obstruction rects (3.5), mapped to app px.
- The toolbar's measured width and height.

Candidates, in order. Take the first that fits inside `C` and intersects neither `T` nor any rect in `O`:

1. Above `T`, left-aligned with `T`, 8 px gap.
2. Below `T`, left-aligned.
3. Above `T`, right-aligned.
4. Below `T`, right-aligned.
5. Pinned inside `C` at the top, just below the lowest obstruction, horizontally aligned with `T`. Use this for targets taller than the viewport. The overlay chip appears on the element, because the toolbar is now far from it.
6. Docked: centred at the bottom of `C`, 12 px above its edge. The chip appears.

Further rules:

- **Hysteresis.** While scrolling, keep the current candidate as long as it remains valid. Re-run the search only when it becomes invalid or the selection changes. That stops the toolbar flipping.
- **Offscreen target.** When `T` is empty, hide the toolbar and show a small pill at the matching canvas edge: "Heading is above ↑". It is a button that sends `reveal`. Today the toolbar just goes `visibility: hidden` and nothing says where the selection went.
- **Panels.** A panel opens from the toolbar on the side away from `T`. If the toolbar is above `T`, the panel opens upward, with the toolbar row staying next to `T`. If the panel would then leave `C` or cover an obstruction, it opens beside `T` (right, then left), top-aligned with the toolbar. If neither fits, it docks as a 320 px sheet at the right edge of `C`. A panel never covers `T`. Covering other site content is acceptable.
- **Phone view.** `C` is the phone screen. Candidates 1 to 4 rarely fit at 390 px with a panel open, so panels dock as a bottom sheet inside the backdrop, beside the phone, when there is room (the canvas is much wider than the phone). Otherwise they dock at the bottom of the phone screen.
- The site nav is an obstruction, so the toolbar is never placed on it when any other candidate is valid (shots 02, 08 and 13).

### 5.4 Keyboard access and focus

The app document order is: top bar, sidebar, canvas (`main`), toolbar, section rail. The toolbar follows the canvas in the DOM, which it already does.

| Key | Where | Effect |
|---|---|---|
| Tab out of the canvas when something is selected | Agent | The agent intercepts Tab while in Edit mode with a selection and posts `focus_toolbar`. The editor focuses the toolbar's first primary button. |
| Arrow Left and Right, Home, End | Toolbar | Roving `tabindex`. The toolbar is one tab stop (`role="toolbar"`, `aria-orientation="horizontal"`). |
| Enter or Space on a panel trigger | Toolbar | Opens the panel (`aria-expanded`, `aria-controls`) and focuses its first field. |
| Esc | Panel | Closes the panel and returns focus to its trigger. |
| Esc | Toolbar | Returns focus to the canvas (`iframe.focus()`, then the agent focuses the selected element or the body). The selection is kept. |
| Esc | Canvas | Deselects, as today. |
| Enter | Canvas, with text selected | Starts editing, as today. |
| Alt plus ArrowUp, Down, Left, Right | Canvas or toolbar | Select the parent, first editable child, previous sibling or next sibling. New `select_relative` message. Today there is no keyboard way to select anything. |
| Alt plus Shift plus ArrowUp or Down | Section selected | Move the section up or down. |
| Ctrl or Cmd plus Z, Shift plus Ctrl or Cmd plus Z, Ctrl plus Y | Anywhere outside text fields | Undo and redo, as today. |
| Ctrl or Cmd plus K | Anywhere | Opens the page switcher. |
| Ctrl or Cmd plus `\` | Anywhere | Toggles the sidebar. |
| `?` | Outside text fields | Opens a shortcut sheet: a dialog listing this table. |

Focus preservation: `render()` in `toolbar.ts` calls `replaceChildren()` and drops focus (measured: focus lands on `<body>`). Give every control a stable `data-key` ("edit-text", "panel:text-style", "swatch:#ffffff"). Before re-rendering, record the focused key. After, focus the element with the same key, or the panel trigger if the panel closed. `shouldRenderToolbar` already avoids re-rendering while a field is focused; keep that.

Focus visibility: every toolbar, rail and panel control uses the shared `--focus-ring` (a 2 px gap in the surface colour plus a 2 px accent band). Focus inside the site is drawn by the overlay as the Selected ring, never by changing site styles.

### 5.5 Panel transitions

- Panels open inside the toolbar card. The height animates through `grid-template-rows: 0fr` to `1fr` over 180 ms with `--ease-out`, and the content fades in over 120 ms.
- Closing is 120 ms. Switching from one panel to another crossfades the content (120 ms) and animates the height between the two sizes.
- Reduced motion: no height animation. The content fades over 100 ms, which keeps the cause and effect legible.
- The toolbar enters with opacity 0 to 1 and a 4 px rise over 140 ms. It exits over 90 ms. When the selection changes and the toolbar stays visible, it glides to the new position over 160 ms using `transform`. It never animates during scroll.

## 6. Properties and editing flows

### 6.1 Text style panel (`textStylePanel()`)

- **Colour.** Show the site's own colours first. The agent collects up to 10 distinct text and background colours from the page's computed styles (body, headings, links, buttons, and section backgrounds), sorted by area, and sends them once per page load in a new `palette` message. The app renders them as swatches, setting `element.style.background` through the CSSOM. Then "Original", then "Pick any colour". Today the swatches are Rótulo's own palette, including Haven Blue and a purple (shot 03), which invites owners to paint Rótulo's brand onto their site.
- **Contrast guard.** When the chosen text colour has a contrast ratio under 4.5:1 against the element's effective background, show an inline warning: "This may be hard to read on this background." The agent adds `effectiveBackground` (the nearest non-transparent ancestor background, as hex) to `SelectionInfo`.
- **Size.** A stepper with "Smaller" and "Larger" buttons cycling through `SIZES`. The current value shows in px. "Original" resets it.
- **Weight.** A select with Light, Regular, Medium, Semibold, Bold and Heavy. Keep it.
- **Alignment.** Left, centre and right. Drop "Justify". It produces rivers in narrow columns, and the owner audience will not miss it.
- At the bottom of the panel, "Reset text style" removes every inline style key the panel can set, in one `set_style` with `null` values.

### 6.2 Background and spacing panel (`boxStylePanel()`)

- Background swatches use the site palette first, then white and black, "Original" and "Pick any colour".
- "Space above", "Space below" and "Space inside" become steppers over `SPACES`, showing the value.
- While a spacing control has focus, the overlay draws the margin or padding area in `--overlay-accent-soft` hatching. This is part of the overlay, not a tint on the site, and it disappears on blur.

### 6.3 Image replacement (`replaceImage()`)

1. Replace image opens a small popover with two sources: "Upload from your computer" (the file picker, as today) and "Use an image from your website" (the existing `/assets` image list). The second source needs a server change: `set_image` must accept an existing asset path. Until then only the first source ships.
2. The type and size checks stay as today, with their plain-language messages.
3. While uploading, the button reads "Uploading 42%". This needs `api.uploadImage()` to report progress, which `fetch` cannot do, so it moves to `XMLHttpRequest` with `upload.onprogress`. The overlay draws a thin progress line along the bottom of the image.
4. On success, `preview_image` swaps the image, as today. The Description panel opens with the old text selected and the hint "Update the description for the new image.", as today.
5. If the new image's aspect ratio differs by more than 20 percent from the space it fills, add a note: "This picture is a different shape, so the website may crop or stretch it." The agent adds `naturalWidth`, `naturalHeight` and the rendered size to `SelectionInfo`.
6. A toast reads "Image replaced." with an "Undo" action.

Drag and drop of a file onto the canvas is not proposed. Drops over the iframe are delivered to the foreign document, where the site's own JS could read the file. Uploads must stay in the app origin.

### 6.4 Link editing (`linkFields()`, `linkPanel()`, `textLinkPanel()`)

The destination type is a list, not a two-option segment.

| Type | Field | Stored |
|---|---|---|
| A page on this website | Page select | Relative path, as `relativeHref()` builds today. |
| A part of this page | A list of in-page targets the agent sends: elements with an `id` and a human name, up to 50. The `#services` case lands here instead of under "Web address" (shot 04). | `#id` |
| A web address | URL field. A bare domain gets `https://` added, as today. | URL |
| An email address | Email field | `mailto:` |
| A phone number | Phone field | `tel:` |

- The initial type comes from `classifyHref()`, which already returns `anchor`, `email` and `phone`. The panel just needs to honour them.
- The toolbar's "Change link" button shows the current destination in words: "→ Contact page", "→ Services section", "→ themesberg.com".
- "Open in a new tab" stays a switch, shown only for web addresses.
- Validation stays on `isSafeHref()` with today's error sentence. Enter submits. Esc cancels and returns focus.
- "Remove link" sits in the panel for text links (it exists for editing mode today).

The new `anchors` data is a list of `{id, name}`. `id` must match `^[A-Za-z][\w-]{0,63}$`. `name` is capped at 60 characters and is rendered with `textContent`.

### 6.5 Inline text editing

- Bold state: report `bold: true` only when the caret is inside `b` or `strong`, or inside an inline element whose computed weight exceeds the editing element's own weight. Today `queryCommandState("bold")` reports every heading as bold (shot 13). The change is in `formats()` in `agent.ts`.
- "Done" is the primary action (accent text). Enter commits and Esc cancels, as today.
- While editing, the toolbar stays on the candidate it had when editing began. Typing does not move it.

## 7. Responsive editing

| App window | Layout |
|---|---|
| 1360 px and wider | Sidebar docked (248 px). Desktop canvas at fit-to-window, which is about 100 percent at 1440 and wider. |
| 1100 to 1359 px | Sidebar docked by default. Desktop canvas scales (1280 gives 1008 / 1280, which is 79 percent). The owner can hide the sidebar to reach 100 percent. |
| 900 to 1099 px | Sidebar becomes a drawer over the canvas, opened from the top-bar toggle. Top-bar text labels collapse to icons with tooltips, except "Publish". Toolbar secondary labels collapse to icons. Primary actions keep their text. |
| Below 900 px | Today's "needs a bigger screen" message, unchanged. |

- Coarse pointer (`@media (pointer: coarse)`, for touch laptops and landscape tablets): toolbar, rail and swatch targets grow to 44 px. Hover chips are disabled, and a tap selects.
- Page zoom: at 200 percent browser zoom on a 1280 window the CSS width is 640 px, which falls into the "bigger screen" message. That is acceptable for WCAG 1.4.10 because the editor is a two-dimensional tool, which the reflow criterion exempts. The message must keep a "Back to your websites" link and offer "View website" when a version is live.

## 8. Motion and reduced motion

Motion thesis: one authored moment, the selection ring gliding from the old element to the new one, because it explains "this is now the thing you are editing". Everything else is feedback that exists to be fast.

| Motion | Duration and easing | Reduced motion |
|---|---|---|
| Selection ring moves to a new element | 140 ms, `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`), on the 4 box properties of one fixed element | Jumps. |
| Overlay follows scroll and resize | None, ever. It is redrawn each frame. Today the 60 ms linear transition makes it trail. | Same. |
| Hover ring appears | Opacity over 80 ms. No positional glide. | Instant. |
| Toolbar enters and exits | 140 ms in, 90 ms out, opacity plus a 4 px rise | Opacity only, 100 ms. |
| Toolbar moves between selections | 160 ms `transform` | Jumps. |
| Panel open, close and switch | 180 ms, 120 ms, 120 ms crossfade | Opacity 100 ms, no height. |
| Device switch | 90 ms fade out, resize, 160 ms fade in | Instant. |
| Just-moved pulse | One 400 ms soft glow | None; the selection alone. |
| Save "Saving…" | Static dot, shown after a 400 ms delay. Remove the infinite `pulse` keyframe. | Same. |
| Loading veil | Appears only after 300 ms, then a 180 ms fade | Fade 100 ms. |

The app's global reduced-motion rule in `app.css` stays. The agent needs its own rule inside the shadow sheet (3.2 rule 7).

## 9. Accessibility

- **Hit targets.** Toolbar buttons are 32 px tall with 4 px gaps; 30 px today already passes WCAG 2.5.8 at 24 px. Swatches go from 24 to 28 px with 8 px gaps. Rail buttons are 28 px. Coarse pointers get 44 px everywhere (section 7).
- **Focus.** Every control uses `--focus-ring`. The overlay's Selected ring is the focus indicator inside the canvas. When the canvas iframe itself has focus and nothing is selected, the frame shows `--focus-ring` around the canvas.
- **Names.**
  - The iframe `title` becomes "Your page: Home, editing" (and ", preview" in Preview mode). It updates on `ready` and on mode change. Today it is "Your page".
  - The toolbar is named by kind ("Heading tools").
  - Panel triggers carry `aria-expanded` and `aria-controls`. Panels are `role="group"` with `aria-labelledby` pointing at the panel title.
  - Swatches get a colour name, not a hex: "Site colour 3, dark navy" or "White". Map hex to the nearest of about 20 plain names in a lookup table.
  - Icon-only buttons have `aria-label` and a tooltip. Tooltips appear on hover after 500 ms and on keyboard focus immediately.
- **Announcements.** One polite live region in the app (`#editor-announcer`, visually hidden) announces:
  - "Heading selected. Press Tab for tools.", throttled to one announcement per 500 ms.
  - "Editing text. Enter to finish, Escape to cancel."
  - "Section moved up."
  - Offline, error and conflict save states, through the save indicator (4.4).
  - The selection is never announced on hover.
- **Contrast.** Overlay strokes need 3:1 against adjacent colours (WCAG 1.4.11). The two-tone line (accent plus halo) guarantees one side passes on any background. The blocked dashed line (`--overlay-muted`) also gets the halo.
- **Reduced motion.** As section 8.
- **Errors.** Panel errors appear inline, are associated with the field (`aria-describedby`) and announced. Toasts are never the only place an error appears.

## 10. Implementation map

| Item | Today (file and function) | Change | Protocol or security impact |
|---|---|---|---|
| Zoom to fit | `canvas.ts` `store.subscribe` sets `data-device`. `app.css` `.canvas-frame` and `.canvas-area[data-device=mobile]`. | Compute `scale` from the frame size (a `ResizeObserver` on `[data-canvas-area]`). Set the iframe width, height and transform. Expose `scale` in the store (`State.canvas: {device, scale, mode: "fit" or "actual"}`). Add the zoom chip to `editor.html`. | None. Same sandbox and origin. |
| Phone frame fixed at 844 | `app.css` line 584, `max-height: 844px`. | Fixed 390 by 844 viewport, scaled. Use the bezel tokens. | None. |
| Device switch | `app.css` `transition: width 260ms`. | Fade sequence (2.4). Send `reveal` after the switch. | Adds the editor message `reveal {element: id or null}`. |
| No reload for hide | `toolbar.ts` `rowFor()`, the hide button calls `save(..., "reload-select")`. | Use `"none"`. | None. |
| Double-buffered reload | `canvas.ts` `navigate()`, the `message` listener, the `load` listener. | Two-iframe swap. Accept messages only from the active frame's window. | Contract wording: "the active canvas iframe". The sandbox attributes must be identical. |
| Host hardening | `agent.ts` host setup (lines 49 to 70) and `start()`. | `all: initial !important`, containment, the popover top layer, re-attach, generic fonts. | None. Strengthens isolation. |
| Containing-block offset | `agent.ts` `place()`, `redraw()`. | Subtract the host rect. | None. |
| Two-tone rings and states | `agent.ts` sheet (lines 52 to 62), `makeBox()`. | New box styles per 3.3, colours from `frontend/overlay-theme.ts`, reduced-motion rule, no scroll transitions. | None. |
| Edge-aware rings | `agent.ts` `place()`. | Inset sides that touch the viewport edge. | None. |
| Stale hover | `agent.ts` `select()`, the `mouseout` listener. | Clear hover on select, on `blur` and on the pointer leaving. | None. |
| Hidden veil | `agent.ts` `drawHiddenSections()`. | Clip below the obstructions. Pin the badge to the visible top. | None. |
| Kind, name, ancestors, section | `agent.ts` `info()`, `select()`. `toolbar.ts` `labelFor()`, `TAG_NAMES`. `protocol.ts` `agentMessages.select`. | The agent computes them. Delete `labelFor` and `TAG_NAMES` from the toolbar once the agent sends `kind`. Migrate and delete in one change. | Additive fields on `select`: `kind` (literal enum), `name` (str 60), `ancestors` (at most 8 of `{element, kind, name}`), `section` (`{element, rect, name, can}` or null). All validated in `parseAgentMessage`. |
| Obstructions | `agent.ts` `redraw()`. `protocol.ts` `viewport`. | Add `obstructions` (at most 4 rects). | Additive. Numbers finite and clamped as in `rectOf()`. |
| Palette | `agent.ts` `start()`. `toolbar.ts` `TEXT_COLORS`, `BACKGROUNDS`, `swatches()`. | New agent message `palette {colors: string[] at most 10}`. Delete the hard-coded Rótulo palettes. | New message. Each colour must match `^#[0-9a-f]{6}$`. The editor applies them through `style.background`, never `innerHTML`. |
| Anchors for links | `agent.ts`. `toolbar.ts` `linkFields()`, `classifyHref()`. | New agent message `anchors {items: {id, name}[] at most 50}`, sent on `ready` and refreshed on mutation. | New message. `id` regex as in 6.4, `name` capped at 60. |
| Image metrics, effective background | `agent.ts` `info()`. `protocol.ts` `parseSelectionInfo`. | Add `naturalWidth`, `naturalHeight`, `renderedWidth`, `renderedHeight` (finite numbers or null) and `effectiveBackground` (hex or null). | Additive and validated. |
| Keyboard selection | `agent.ts` `keydown` handler. `main.ts` `keydown`. | New editor messages `select_relative {direction: "parent", "child", "prev" or "next"}` and `select_element {element}`. New agent message `focus_toolbar`. | New messages. The agent re-checks that the target has a valid id and `data-ph-can` before selecting. `select_parent` is removed once `select_relative` lands. |
| Bold state | `agent.ts` `formats()`. | Relative-weight check (6.5). | None. |
| Toolbar placement | `toolbar.ts` `position()`. | Candidate search (5.3) using `scale`, the canvas rect and `obstructions`. The offscreen pill. | None. |
| Toolbar actions per kind | `toolbar.ts` `rowFor()`. | Table-driven: a `Record<Kind, {primary, overflow}>` registry instead of `can.includes` branches. The overflow menu. The breadcrumb. | None. |
| Focus return | `toolbar.ts` `render()`, `toggle()`, the Esc handler. | `data-key` focus restore, roving tabindex, the Esc ladder (5.4). | None. |
| Panels | `toolbar.ts` `textStylePanel()`, `boxStylePanel()`, `linkFields()`, `altPanel()`. | Per section 6. | Covered above. |
| Image upload progress | `api.ts` `uploadImage()`, `toolbar.ts` `replaceImage()`. | XHR with progress. Aspect note. Undo toast. | None. Same endpoint and cookie. |
| Section rail | New: the app-layer element in `editor.html` and a new `frontend/editor/rail.ts`. | Positioned from `select.section` and `viewport`. | None. App-side only. |
| Save state | `state.ts` `pending`, `saveError`, `reduce()`. `saves.ts` `createSaver()`. `main.ts` `wireTopBar()`. | `SaveState` union (4.4), retry on offline, quiet announcements. | None. |
| Publish state | `publish.ts` `renderStatus()`, `publish()`, `setPublishing()`. `app.css` `.editor:has(...)` rules (lines 646 to 647). `editor.html` sidebar publishing block. | `PublishState` union. The publish popover replaces the sidebar block. One primary button. The undo-publish toast. | None. Same endpoints. |
| Page switcher | `sidebar.ts` `renderPages()`. `editor.html` top-left. | Top-bar menu sharing `pageLabel()`. Ctrl or Cmd plus K. | None. |
| Preview hint | `canvas.ts` `modeHint`. `editor.html` `.mode-hint`. | Move into the top-bar centre. | None. |
| iframe title | `editor.html` `title="Your page"`. | Dynamic per 9. | None. |
| Contract | `docs/frontend-contract.md`, the "Messages" section. | List every new message and field in the same commit. | Required by the contract's own rule. |

## 11. Protocol additions, summarised

Agent to editor:

- `select` gains `kind`, `name`, `ancestors` and `section`.
- `viewport` gains `obstructions`.
- `SelectionInfo` gains image metrics and `effectiveBackground`.
- New messages: `palette`, `anchors` and `focus_toolbar`.

Editor to agent:

- New messages: `select_element`, `select_relative` and `reveal`.
- Removed: `select_parent`, replaced by `select_relative {direction: "parent"}`.

While this spec was written, the code gained an agent message `navigate` (Preview-mode link clicks open another draft page) and an element id on `start_text`. Nothing here conflicts with them. Page changes caused by `navigate` should use the double-buffered reload (2.5) and update the page switcher on `ready`, like any other page switch.

Every addition follows the existing rules. Each message has a known `type`, carries `channel: "rotulo"`, is posted with an explicit target origin and is accepted only from the exact origin and source window. Arrays are length-capped, strings are capped, numbers are finite and clamped, and ids match `^[0-9a-z]{1,10}$`. Nothing from a message is inserted with `innerHTML`.

None of these messages can publish, delete a page or navigate the app. A forged `palette` or `anchors` message from the site's JS can only change which swatches or link targets the owner sees, on their own site. The worst case of a forged `focus_toolbar` is a focus move.

## 12. Token roles for Subagent A

These bind to A's palette and type. The suggested default describes intent, not a value.

| Role | Intent |
|---|---|
| `--canvas-backdrop` | The surface around the frame. Calm, distinct from the sidebar surface, never pure grey. |
| `--shadow-canvas` | The frame's lift off the backdrop. Low and soft. |
| `--radius-canvas` | The frame corner, matching the card radius family. |
| `--device-bezel`, `--device-bezel-edge` | The phone bezel and its 1 px edge highlight. |
| `--overlay-accent` | The selection colour inside the site. It is A's signature selection accent and must stay distinguishable from common brand blues (Bootstrap `#0d6efd`, Tailwind `blue-600`). |
| `--overlay-accent-soft` | The accent at about 20 percent, for the editing glow, the pulse and spacing hatching. |
| `--overlay-hover` | The accent at about 70 percent, for hover rings. |
| `--overlay-halo` | Near-white at about 90 percent, for the outer side of every ring. |
| `--overlay-muted` | Warm grey for blocked and hidden states. At least 3:1 against white with the halo. |
| `--overlay-veil` | The diagonal stripe pair for hidden sections. |
| `--overlay-chip-bg`, `--overlay-chip-ink` | The kind chip. Same family as the toast. |
| `--toolbar-surface`, `--shadow-float` | The floating toolbar, panels, rail and offscreen pill. |
| `--selection-soft` | The current-page row and pressed toolbar buttons in the app. |
| `--focus-ring` | The app focus ring. |
| `--status-ok`, `--status-pending`, `--status-warn`, `--status-error` | Save and publish states. |
| `--ease-out`, `--dur-fast` (90 to 140 ms), `--dur-mid` (160 to 180 ms) | Motion. |
| `--sidebar-width` | 248 px today. Load-bearing only before zoom to fit. Afterwards A may change it. |

The overlay roles are mirrored into `frontend/overlay-theme.ts` for the agent (3.2 rule 8), because the iframe cannot read the app's custom properties.

## 13. Invariants that must not change

- The iframe sandbox stays `allow-scripts allow-same-origin` on a separate site. Never add `allow-top-navigation`, `allow-popups`, `allow-forms` or `allow-modals`.
- The preview CSP keeps `frame-ancestors {app}`. The app CSP keeps `script-src 'self'`, `frame-ancestors 'none'` and a `frame-src` limited to the preview source.
- Origin and source checks on both sides, with an explicit `targetOrigin`.
- The app's CSS never enters the iframe. The overlay's CSS lives only in its closed shadow root. The only document-level rule the agent adds is the preview-mode hidden-section rule.
- The editor never publishes, deletes or navigates because of a message.
- Uploads go only from the app origin.

## 14. Open decisions for the integrator

1. **Zoom-to-fit nominal width.** I recommend 1280 px, which clears the Bootstrap `lg` (992) and Tailwind `lg` (1024) breakpoints and matches common laptops. 1440 px would also clear Tailwind `xl` (1280) but scales to 70 percent at a 1280 window. Decide by checking `fixtures/zips/harbor-bakery.zip` at both widths.
2. **Popover top layer for the overlay.** A progressive enhancement. It needs a WebKit check. If it misbehaves, keep the z-index approach and accept that site modals cover the overlay.
3. **Drag to reorder.** Phase 2, gated on a server `move_section` with a target index.
4. **Reuse an existing image.** Gated on `set_image` accepting an asset path.
5. **Tablet device.** Not proposed. The brief asks for desktop and phone, and a third toggle adds a choice most owners do not need.
