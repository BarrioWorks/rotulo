# Apple platform guidance, translated for the Pagehaven Studio editor

Agent B research for the Studio redesign (`../brief.md` sections 3 to 8 and 12). Written 2026-10-20.

**Labels.** **[Official]** means Apple says it, on a page opened this session. **[Adaptation]** means a web-native translation of Apple's intent. **[Subjective]** means a preference with no Apple or measured basis, so Agent E should challenge these first.

**Sources.** HIG pages render client side, so their text was read from Apple's documentation JSON for each page (`developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`). Links point to the readable page. Apple has no standalone Inspectors page (`/inspectors` returned 404). Inspector guidance lives in Panels, Split views and Toolbars. WWDC25 quotes were checked word for word against the transcript HTML.

**Two Pagehaven facts this spec depends on** (read from code):

- The imported site runs in a sandboxed cross-origin iframe. The parent page cannot read its pixels, so Apple-style glass that adapts to what is behind it is impossible (1.3).
- During a text session, keystrokes reach the iframe document, not the parent. `frontend/editor/main.ts` listens on the parent and `frontend/agent/agent.ts` handles Enter and Escape inside the frame. Section 5 relies on this.

---

## 1. Materials and Liquid Glass

### What Apple says

- [Official] Liquid Glass is "a distinct functional layer for controls and navigation elements" above content. "Don't use Liquid Glass in the content layer." "Use Liquid Glass effects sparingly." ([Materials](https://developer.apple.com/design/human-interface-guidelines/materials))
- [Official] "Always avoid glass on glass." For elements placed on glass, "use fills, transparency, and vibrancy." ([WWDC25 Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/))
- [Official] Use the regular variant for "components [that] have a significant amount of text, such as alerts, sidebars, or popovers." The clear variant is for media, needs a dimming layer ("35% opacity" over bright content), and applies only when the content on top "is bold and bright." (Materials, WWDC25 219)
- [Official] "Reduced Transparency, makes Liquid Glass frostier." "Increased contrast, makes elements predominantly black or white and highlights them with a contrasting border." Reduced Motion "disables any elastic properties." (WWDC25 219)
- [Official] Larger glass is more opaque, "to preserve legibility over complex backgrounds." Tint goes on primary actions, applied "to the background rather than to symbols or text." ([Color](https://developer.apple.com/design/human-interface-guidelines/color))
- [Official] Apply the material "directly to the control, not its inner views." Concentric shapes "calculate their radius by subtracting padding from the parent's." ([WWDC25 Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/))

### Adopt, and do not copy

- [Adaptation] Adopt the three layers, the regular variant only (Pagehaven chrome carries text), concentric radii, a single tinted primary action, and the three accessibility modifiers. Those map to `prefers-reduced-transparency`, `prefers-contrast: more` and `prefers-reduced-motion`. MDN marks `prefers-reduced-transparency` "Limited availability", so it cannot be the only path ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)).
- [Adaptation] Do not copy lensing and refraction. That needs SVG displacement inside `backdrop-filter`, which only some engines accept, and it repaints every scroll frame.
- [Adaptation] Do not copy adaptive light and dark flipping. Pagehaven cannot sample the cross-origin canvas, so the tint is fixed at a value proven safe for any backdrop.
- [Adaptation] Do not copy specular highlights, elastic stretching or morphing. These are continuous effects the brief rules out.

### Spec: three levels

**Level 1. Canvas.** [Official basis] The imported site renders untouched, with no filter, tint, radius or shadow inside the iframe. The workspace behind it is a flat neutral. Selection overlays are solid strokes (section 4).

**Level 2. Floating controls.** This covers toolbars, the contextual bar, menus, popovers, the page switcher and toasts.

```css
:root {
  --glass-tint: rgb(250 250 248 / 0.80);
  --glass-tint-solid: rgb(250 250 248);
  --glass-blur: 20px;
  --glass-saturate: 150%;
  --glass-edge: rgb(0 0 0 / 0.10);
  --glass-highlight: rgb(255 255 255 / 0.55);
  --glass-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.12);
  --glass-fill-hover: rgb(0 0 0 / 0.06);
  --glass-fill-press: rgb(0 0 0 / 0.10);
  --ink: #161616;
  --ink-2: #4a4a4a;
}
.mat-float {
  background: var(--glass-tint-solid);
  border: 1px solid var(--glass-edge);
  box-shadow: inset 0 0 0 1px var(--glass-highlight), var(--glass-shadow);
  color: var(--ink);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mat-float {
    background: var(--glass-tint);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  }
}
```

Buttons inside a Level 2 surface use the hover and press fills, never a second `backdrop-filter`. That is Apple's "fills, transparency, and vibrancy" rule. [Official basis]

**Level 3. Modal surfaces.** This covers settings, version history, the asset library, import and confirmations.

```css
.mat-modal {
  background: rgb(250 250 248 / 0.96);
  -webkit-backdrop-filter: blur(32px) saturate(120%);
  backdrop-filter: blur(32px) saturate(120%);
  border: 1px solid rgb(0 0 0 / 0.12);
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.24), 0 2px 6px rgb(0 0 0 / 0.08);
}
dialog.mat-modal::backdrop { background: rgb(16 16 18 / 0.28); }
```

The scrim is a flat dim with no blur. A full-viewport blur is the most expensive filter a page can run. [Subjective]

**Fallbacks.** Forced colors comes last so it wins.

```css
@media (prefers-reduced-transparency: reduce) {
  .mat-float, .mat-modal { background: var(--glass-tint-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  .mat-float, .mat-modal {
    background: var(--glass-tint-solid); backdrop-filter: none; -webkit-backdrop-filter: none;
    border: 1.5px solid var(--ink); box-shadow: none;
  }
  :root { --ink-2: var(--ink); --glass-fill-hover: rgb(0 0 0 / 0.14); }
}
@media (forced-colors: active) {
  .mat-float, .mat-modal { background: Canvas; color: CanvasText; border: 1px solid CanvasText; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .mat-float [aria-pressed="true"], .mat-float [aria-current] { background: Highlight; color: HighlightText; }
}
```

- [Adaptation] Increased contrast follows Apple's described behavior: black or white with a contrasting border.
- [Adaptation] Reduced transparency goes fully opaque. Apple says "frostier", but Pagehaven cannot verify how frosty is enough over an unknown site.
- [Adaptation] Without `backdrop-filter`, the solid default declared before `@supports` applies.
- [Adaptation] Dark chrome, if it ships, uses `rgb(28 28 30 / 0.80)` with `#f5f5f5` and `#c4c4c4` inks.

**Legibility over any website.** [Adaptation, measured]

A light tint at opacity `a` over a backdrop composites to `a × tint + (1 − a) × backdrop`. Blur averages pixels and saturation shifts hue, and neither can make a pixel darker than black. So the darkest surface a label can ever sit on is the tint over pure black, whether the site shows white, black, a photo or sharp text. A label that passes over black passes everywhere. For dark chrome the worst case is pure white.

Light tint `rgb(250 250 248)` over pure black, WCAG 2.x contrast, computed with a throwaway script:

| Tint opacity | `--ink` #161616 | `--ink-2` #4a4a4a | #5e5e5e |
|---|---|---|---|
| 0.70 | 8.24 | 4.04 (fails) | 2.95 |
| 0.76 | 9.72 | 4.76 | 3.48 |
| **0.80** | **10.80** | **5.29** | 3.87 |
| 0.90 | 13.82 | 6.77 | 4.95 |

Rules that follow:

1. The Level 2 tint floor is 0.80 opacity.
2. No text lighter than `--ink-2` on glass. Hints use `--ink-2` at a smaller size, not a lighter grey.
3. Blur is at least 16 px, so the site's own text under a label shows as tone, not as readable glyphs. Contrast ratio does not capture that. [Subjective threshold, check in phase C]
4. White on the opaque Publish fill `#0066cc` is 5.57:1, whatever the backdrop.

**What to measure.** These checks feed PLAN.md definition-of-done item 5.

- Static check. Compute every ink against the tint over black (and over white for dark chrome) in `scripts/design/contrast.py`. Fail below 4.5:1 for text and 3:1 for icons and focus rings.
- Rendered check. Load the three fixtures and park the toolbar over a white region, the darkest region and the most saturated photo. Set the labels to `color: transparent`, screenshot, take the darkest pixel in each label box, and compute contrast with the real ink. Repeat with reduced transparency, increased contrast and forced colors emulated.
- Cost check. Trace 5 s of canvas scrolling under the toolbar at 4x CPU throttle, with and without `backdrop-filter`. Report dropped frames and paint time.

**Budgets and overuse.** [Official basis, Subjective numbers]

- At most three backdrop-filtered surfaces at once.
- Never animate blur. Apple's Reduce Motion guidance also says to avoid "animating into and out of blurs" ([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- No glass in the canvas: not on selection chips, handles or hover tint.
- No glass on glass. A menu must not overlap the bar it came from.
- Dashboard cards, the import drop zone and settings rows are content, so they stay solid.

---

## 2. Toolbars, placement and resizing

### What Apple says

- [Official] Leading items (back, title) "aren't customizable" so they stay available. Center items "collapse into the system-managed overflow menu when the window shrinks." Trailing items, including the one primary action, "remain visible at all window sizes." ([Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars))
- [Official] "Aim for a maximum of three" groups. "Keep actions with text labels separate" from symbols. "Reduce the use of toolbar backgrounds and tinted controls." When hiding toolbars, "offer ways to reliably restore" them. (Toolbars)
- [Official] "Keep functionality the same as size classes change." Lay out by available space, "not device type or orientation." ([Layout](https://developer.apple.com/design/human-interface-guidelines/layout))
- [Official] On Mac, avoid critical actions in a bottom bar, because windows get dragged partly off screen ([Windows](https://developer.apple.com/design/human-interface-guidelines/windows)). A sidebar "requires a large amount of vertical and horizontal space" ([Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)).

### Adopt, and do not copy

- [Adaptation] Adopt leading, center and trailing as three floating islands, and keep every action at every width.
- [Adaptation] Do not copy the menu-bar rule. A web page has none. The command palette is the secondary index, and every action stays visible without it.
- [Adaptation] Do not copy toolbar customization. Apple recommends it for apps used "for long periods of time." Pagehaven owners edit occasionally.

### Spec

Layout keys off the workspace's container width. Target size keys off `any-pointer: coarse`, because an iPad with a trackpad reports `pointer: fine` but still has a touchscreen. [Adaptation]

| Width | Top leading | Top center | Top trailing | Bottom |
|---|---|---|---|---|
| 1280 | `‹` sites, `Agency / Home ▾` | Undo, Redo · Edit/Preview · Computer/Phone | status text, Settings, **Publish** | none; contextual bar floats by the selection |
| 1024 | same | icon-only, with tooltips and accessible names | "Saved" plus a dot, Settings, **Publish** | as 1280, but with `any-pointer: coarse` the contextual bar docks at the bottom |
| 834 | `‹`, `Home ▾` | none | Settings, **Publish** | one bar: Undo, Redo, Edit/Preview, Computer/Phone, More. A selection swaps the middle for contextual actions |
| 390 | `Home ▾` (sites link in its menu) | none | **Publish** | as 834; Settings moves into More |

**Geometry.** [Official concentric rule, Subjective values]

- Edge inset is 12 px plus `env(safe-area-inset-*)`.
- Fine pointer: bar 44 px, buttons 32 px, padding 6 px, radii 22 and 16 (22 − 6 = 16).
- Coarse pointer: bar 52 px, buttons 44 px (Apple's default iPadOS control size, Accessibility), padding 4 px, radii 26 and 22.
- Adjacent buttons have contiguous hit regions. Apple warns that gaps make the pointer flicker ([Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices)). On the web the same gap blinks the hover fill.

**Top band.** [Adaptation] Apple runs content under glass. An editor differs, because the site's header is often what the owner wants to edit. At rest the canvas starts below a 64 px band (12 + 44 + 8). Once the owner scrolls, content passes under the islands, which is where translucency earns its place. With no sidebar that leaves 92% of a 1280x800 viewport for canvas (computed from the layout, not measured), above PLAN.md's 85%.

**Bottom bar.** [Adaptation] Apple's bottom-bar warning concerns Mac windows dragged off screen. A tablet or phone tab does not move that way, and the bottom is within thumb reach. The bar appears only below 900 px of container width, or with a coarse pointer and no hover.

**Stability.** [Adaptation]

1. The top islands never move, resize or reorder while editing. Widths reserve space for the longest status ("Saved · 12 changes not published"), so Publish never shifts.
2. The bottom bar is one surface. Undo and Redo stay pinned at its leading end, and only the middle segment crossfades. That is Apple's "singular floating plane that the controls live on" (WWDC25 219) without the morph.
3. On fine pointers the contextual bar is placed at selection, then frozen for the whole text session. It moves only on a new selection, on scroll (rigidly, no easing lag), or when the element leaves view, where it docks bottom-center.
4. Focus mode hides chrome with `⌥⌘T` (Apple's standard "Show or hide a toolbar", [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)) or a button. A "Show controls" pill stays top-trailing, and Esc restores the chrome. [Official basis]
5. During a live window resize, layouts snap instead of animating, and no action disappears. [Adaptation]

---

## 3. Popover, sheet or dialog

### What Apple says

- [Official] A popover exposes "a small amount of information or functionality." "Show one popover at a time ... Never show a cascade." "Always save work when automatically closing a nonmodal popover." "Avoid using a popover to show a warning." Let people switch popovers "with a single click or tap." "Avoid displaying popovers in compact views," and use a sheet there. ([Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers))
- [Official] "Display only one sheet at a time." Resizable sheets use medium and large detents with a grabber that "works with VoiceOver." Pair Done with Cancel. ([Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets))
- [Official] "Present content modally only when there's a clear benefit." An alert may sit above another modal. ([Modality](https://developer.apple.com/design/human-interface-guidelines/modality))
- [Official] Surfaces now spring "from the action itself, which serves as the source." (WWDC25 356)

### Web mapping

- [Adaptation] Popover uses `popover="auto"`. It brings light dismiss, Esc, top-layer rendering and automatic closing of other auto popovers, which is Apple's one-at-a-time rule for free. Position with CSS anchor positioning and a JS fallback. Use `popover="manual"` where dismissal must validate first.
- [Adaptation] A compact sheet is a `<dialog>` opened with `showModal()` and styled as a bottom sheet with two detents. The grabber is a real `<button>` that cycles detents.
- [Adaptation] A wide dialog is a centered `<dialog>` with `showModal()`. Focus returns to the opener on close.
- [Adaptation] Do not copy detachable macOS popovers or sheets that leave other windows usable.

### Spec

| Surface | 1024 and up | 834 and below | Dismiss and save |
|---|---|---|---|
| Page switcher | popover from `Home ▾`: search (only at 6+ pages), rows with thumbnails, Add page, a `…` menu per row for Rename and page actions | sheet, medium detent | light dismiss; choosing a page closes it; Rename saves on blur |
| Website settings | modal dialog, 640 px, section nav: General, Pages, Assets, Domains, Publishing, Versions | full-height sheet | fields autosave, so Close only (no Done without Cancel) |
| Image replace | popover from Replace, at most 480x560: Upload first, then site images; picking one replaces and closes | sheet, medium to large | pick commits; Esc or outside click leaves the image as it was |
| Asset library | Settings › Assets | same | alt text autosaves |
| Publish | popover from Publish: change list, one "Publish now", a Version history link | sheet, medium | outside click cancels, nothing lost |
| Version history | modal dialog, opened only after the Publish popover closes | full-height sheet | Close; Restore opens an alert |
| Restore confirm | `<dialog role="alertdialog">` above history, the only allowed stack | same | Cancel, Restore |
| Link editing | `popover="manual"` anchored to the link's canvas rectangle: URL, Open link ↗, Remove link | sheet, medium | outside click saves a valid URL. An invalid one keeps the old link, closes, and toasts "Link not changed: that address isn't valid" with Reopen |

Basis: settings is a dialog because typed multi-section forms exceed Apple's "small amount" popover rule [Official basis]. Publish is a popover because it is a short, single-task review [Official basis]. Link saving on outside click is Apple's "always save work" rule, and the invalid-URL path is an Adaptation. Warnings are never popovers: unpublished-change and failed-save states use inline status and alerts [Official]. Every dialog and sheet carries a title naming its task [Official, Modality].

### Context menus

- [Official] Keep them relevant and short, with about three groups and one submenu level. Destructive items go last. "Hide unavailable menu items, don't dim them." "Always make context menu items available in the main interface, too." ([Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus))
- [Adaptation] Secondary click on a selected canvas element shows the contextual bar's items plus Select parent. The agent catches `contextmenu` in the iframe and posts it to the parent, which renders the menu in the top layer. The chrome keeps the browser's native menu.
- [Adaptation] Long press on touch does not open it, because iOS Safari owns long press for text selection and Apple says not to fight system gestures ([Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)). Touch users get the same items from the contextual bar's More button.

### Apple's creative apps

- [Official] In Keynote, Replace sits in the Format sidebar's Image tab, placeholders carry a Replace Image button in the corner, and "The new image retains the dimensions of the original." ([Keynote for Mac](https://support.apple.com/guide/keynote/tan77aea6844/mac), [Keynote for iPad](https://support.apple.com/guide/keynote-ipad/tan77aea6844/ipados))
- [Official] Pages' Format sidebar "Shows formatting options for whatever is selected," and shows document controls when nothing is selected ([Pages sidebars](https://support.apple.com/guide/pages/tan0870f78aa/mac)). On iPad the same controls open from a Format button and adapt to the selection type ([Pages for iPad](https://support.apple.com/guide/pages-ipad/tana29e86157/ipados)). Freeform: "Select the text box, then use the formatting tools" ([Freeform](https://support.apple.com/guide/freeform/frfm8d145c1b/mac)).
- [Adaptation] Pagehaven takes three things from these apps. A replaced image keeps its frame, which Pagehaven already does. Controls follow the selection. A Replace button sits on the selected image's corner as well as in the contextual bar.
- [Adaptation] Pagehaven does not take a persistent inspector. Apple's inspector is a trailing pane ([Panels](https://developer.apple.com/design/human-interface-guidelines/panels)). The brief removes permanent panels, and Apple suggests popovers "when you want more room for content." Style opens as a popover from the contextual bar.

---

## 4. Selection and hover

### What Apple says

- [Official] Highlight is for small transparent controls and lift for small opaque ones. Hover is for "large elements," using "scale, tint, or shadow." "Reserve scaling for elements that can increase in size without crowding nearby elements." (Pointing devices)
- [Official] Magnetism is not applied to hover elements: "adding magnetism could be jarring and might make people feel that they've lost control of the pointer." (Pointing devices)
- [Official] "Avoid creating gratuitous pointer and content effects." The pointing hand means "a URL link." (Pointing devices)

### Adopt, and do not copy

- [Official basis] Imported elements are large content, so they get tint only: no scale, shadow or magnetism. Apple's own rule rejects brief idea 8B ("magnetic selection feedback") for the canvas. Scaling would also misstate the site's real layout.
- [Adaptation] Toolbar buttons get a web highlight: a rounded fill behind the icon, concentric with the bar. They get no pointer pull, because a page cannot move the system pointer and a faked pointer breaks assistive pointers.

### Spec

The agent draws every state in an overlay layer: positioned boxes with `pointer-events: none`, sized from `getBoundingClientRect()`. It never writes to the imported element, so the element gets no outline, border, padding, transform or filter. A check script can assert the element's computed box is identical before and after hover and selection. [Adaptation]

| State | Visual | Cursor |
|---|---|---|
| Idle | nothing | site default, but links show the arrow, because they do not navigate in Edit [Adaptation] |
| Hovered (`hover: hover` only) | 1 px accent hairline and a 6% accent tint [Official basis] | arrow |
| Selected | 2 px accent with 1 px white halo, corner marks, role chip "Heading" [Adaptation of current Proof] | arrow; I-beam over editable text |
| Editing | stroke thins to 1 px; chip "Editing · Esc to cancel" [Subjective] | I-beam |
| Saving | chip shows a ring for at least 300 ms, then a check [Subjective] | unchanged |
| Error | 2 px error stroke; chip "Not saved" with Retry [Subjective] | unchanged |
| Unsupported | dashed 1 px ink; chip "Can't edit this part" with Why? [Official basis, "Indicate when a gesture isn't available"] | `not-allowed` while hovering |

Visibility: the 2 px accent with halo keeps 3:1 on white and on dark photos (3.89 and 3.64 in `../../design/README.md`). Under forced colors, strokes use `Highlight` and chips use `Canvas` with a `CanvasText` border. [Adaptation]

**Touch.** [Adaptation]

- With `hover: none` there is no hover state.
- The first tap selects and shows the contextual bar. A tap on already-selected text, or the Edit button, starts editing. Apple notes "people expect tap to activate or select" (Gestures).
- The selection chip doubles as a parent picker ("Card › Heading"), so a 20 px element is reachable after tapping its container.
- The canvas does not take over pinch or two-finger pan. Browser zoom and scroll stay intact (section 5).

---

## 5. Keyboard shortcuts

### What Apple says, and what browsers already use

- [Official] "Don't repurpose standard keyboard shortcuts." Define custom ones "for only the most frequently used app-specific commands." Avoid Control as a modifier. Don't add a modifier to an existing shortcut for an unrelated command. Standard ones include ⌘Z, ⇧⌘Z, ⌘B, ⌘I, ⌘, (settings), ⌘. (cancel) and ⌥⌘T (show or hide toolbar). (Keyboards)
- [Official] Pages uses Command-K to "Turn text or an object into a link" and Command-Return to "End editing an object" ([Pages shortcuts](https://support.apple.com/guide/pages/tanc0ffef022/mac)).
- [Official, Chrome] Ctrl+K and Ctrl+E "Search from anywhere on the page." F6 is "Switch focus to unfocused dialogue (if showing) and all toolbars." ([Chrome shortcuts](https://support.google.com/chrome/answer/157179))
- [Adaptation] Never intercept ⌘/Ctrl with `+`, `-` or `0`, which is browser zoom that low-vision owners rely on. Never bind ⌘/Ctrl with T, W, N, L, Q or Tab. Canvas zoom uses the Fit chip and trackpad pinch over the canvas only (browsers deliver pinch as `wheel` with `ctrlKey`).

### Resolving ⌘K

Decision [Adaptation]: ⌘K / Ctrl+K inserts or edits a link during a text session, and opens the command palette outside one.

1. Inside text, ⌘K means link in Pages and in most rich text editors. A palette there would repurpose a standard shortcut, which Apple forbids.
2. Outside text nothing needs a link shortcut. A selected button's destination opens from the contextual bar's Link action.
3. The text session is visible (I-beam, "Editing" chip, caret), so the owner can see which meaning applies.
4. The architecture already splits them. During a session keystrokes land in the iframe, where the agent handles ⌘K as link and does not forward it. The parent only sees ⌘K outside a session.
5. Inside a session, Esc then ⌘K opens the palette. A palette button in More keeps it from being the only path to anything.

Change needed: today `main.ts` binds ⌘K to "open pages" ahead of the `isTyping` guard. Once the palette ships, ⌘K opens it and Pages is its first entry. On Windows and Linux this gives up Chrome's Ctrl+K search inside the editor, a trade many web apps make (inferred, not measured).

### Spec

Mac uses ⌘ and the other platforms use Ctrl. Single-key shortcuts fire only while the canvas has focus and no text session is active, which meets the WCAG 2.1.4 exception for keys active only while their component has focus.

| Action | macOS | Windows, Linux | Scope | Label |
|---|---|---|---|---|
| Undo, Redo | ⌘Z, ⇧⌘Z | Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y | global; native text undo first in a session | Official |
| Bold, Italic | ⌘B, ⌘I | Ctrl+B, Ctrl+I | text session, where formatting is allowed | Official |
| Link | ⌘K | Ctrl+K | text session (in the iframe) | Official (Pages) |
| Command palette | ⌘K | Ctrl+K | outside a session | Adaptation |
| Commit text | Return single line, ⌘Return multi-line | Enter, Ctrl+Enter | text session | Official (Pages) |
| Cancel, close, deselect | Esc or ⌘. | Esc | layered: menu, popover, edit, selection | Official |
| Website settings | ⌘, | Ctrl+, | global | Official; drop where a browser does not pass it to the page |
| Focus mode | ⌥⌘T | none (button and palette) | global | Official on Mac. Ctrl+Alt+T opens a terminal on common Linux desktops, and Ctrl+Alt acts as AltGr on Windows |
| Next region | F6, ⇧F6 | F6, Shift+F6 | global | existing; Chrome also uses F6, so verify delivery |
| Select next, previous, parent, child | arrows | arrows | canvas | existing |
| Move section | ⌥⇧↑ ↓ | Alt+Shift+↑ ↓ | canvas, when allowed | existing |
| Shortcut list | ? | ? | canvas | existing |
| Save | ⌘S shows "Everything saves automatically" | Ctrl+S | global | existing; keeps the Save Page dialog away |

Recommended removals [Adaptation]:

- Remove ⇧⌘P for publish review. Publishing is infrequent and consequential. Firefox likely reserves Ctrl+Shift+P for a private window (unverified).
- Remove ⇧⌘H for history. It adds a modifier to ⌘H (Hide) for an unrelated command, which Apple advises against, and it is likely a browser Home shortcut on macOS (unverified).

Both actions stay one click away and in the palette. Shortcuts are listed in the palette and the `?` sheet, not in context menus, because Apple says to show them "in your app's main menus, not in context menus." [Official]

---

## 6. Motion

### What Apple says

- [Official] "Add motion purposefully." "Aim for brevity and precision in feedback animations." "Avoid adding motion to UI interactions that occur frequently." "Let people cancel motion." ([Motion](https://developer.apple.com/design/human-interface-guidelines/motion))
- [Official] Under Reduce Motion, reduce "zooming, scaling, and peripheral motion," replace axis transitions "with fades," keep tracking "directly with people's gestures," and avoid "animating into and out of blurs." Prefer "dismissing views with an explicit action" over timers. (Accessibility)

### Adopt, and do not copy

- [Adaptation] Adopt source-anchored entrances, short feedback, interruptibility, and the reduced-motion substitutions. Do not copy elastic glass. Apple disables it under Reduce Motion anyway, and the brief asks for "soft but deliberate."

### Spec

[Subjective values, inside Impeccable's Operate range of 150 to 250 ms for routine changes]

```css
:root {
  --dur-press: 90ms; --dur-quick: 140ms; --dur-base: 200ms; --dur-surface: 280ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

Exits run at about 0.7x their entrance on `--ease-in`.

| Transition | Motion | Duration | Reduced motion |
|---|---|---|---|
| Button press | fill darkens, no scale | 90 ms | same |
| Toolbar hover fill | opacity | 140 ms | same |
| Canvas hover, selection | instant stroke; chip fades in. Moving to a new element is instant, with no tween | 0 and 140 ms | same |
| Popover | from the anchor edge, scale 0.96 to 1 plus opacity | 200 ms in, 140 ms out | opacity, 140 ms |
| Popover resize | height via `interpolate-size` or FLIP | 200 ms | instant |
| Bottom sheet | slides to its detent; tracks the finger while dragging | 280 ms; release keeps finger velocity | opacity 160 ms; drag still tracks |
| Dialog | scale 0.98 to 1 plus opacity; scrim fades | 280 ms | opacity 160 ms |
| Contextual bar swap | crossfade in a fixed footprint | 140 ms | same |
| Save status | text crossfade "Saving…" to "Saved" | 140 ms | same |
| Publish | label goes "Publishing…" with a ring, then "Published ✓" with the live URL in the status. No confetti | 200 ms | static icon instead of a spinning ring |
| Toast | rise 8 px with fade; with an action (Undo) it stays until dismissed | 200 ms | opacity |
| Focus mode | chrome fades out, "Show controls" pill fades in | 200 ms | instant |

Implementation [Adaptation]:

- Use `@starting-style` with `transition-behavior: allow-discrete` on `display` and `overlay` for top-layer popovers and dialogs. Without support, surfaces just appear.
- Animate only `opacity` and `transform`, never blur, `backdrop-filter` or layout properties. Interruptions reverse from the current value, and input is never blocked on an animation.
- Change the current rule in `app.css` that zeroes every duration under reduced motion. Keep the opacity transitions, because they carry state, and remove only movement and scale. Impeccable's animate reference says reduced motion means "fewer and gentler animations, not disabling all motion."

---

## 7. Decisions for the lead

1. Materials. Level 2 tint is at least 0.80 opacity with 20 px blur, proven against pure black. Level 3 is 0.96. Opaque fallbacks cover no support, reduced transparency, increased contrast and forced colors. No glass in the canvas, and none on glass.
2. Placement. Three top islands that never move, with Publish as the one tinted trailing action. Below 900 px or on touch, a bottom bar with pinned Undo and Redo and a swapping middle.
3. Surfaces. Popovers for the page switcher, image replace, publish and links. Dialogs or sheets for settings and history. Sheets replace popovers on compact widths. One popover or one modal at a time, plus an alert.
4. Selection. Overlay-only tint and stroke, with no scale, shadow or magnetism, per Apple's guidance for large elements. Brief idea 8B is rejected for the canvas.
5. Keys. ⌘K is Link in a text session and Palette outside one. Drop ⇧⌘P and ⇧⌘H. Never touch browser zoom keys.
6. Motion. 90 to 280 ms, out-eased, from the source. Reduced motion keeps opacity and drops movement.

To verify in a real browser (phase C or H): whether ⌘, and F6 reach the page in Safari, Chrome and Firefox; Firefox's handling of Ctrl+Shift+P; the visual blur threshold over the three fixtures; `backdrop-filter` frame cost during canvas scroll.
