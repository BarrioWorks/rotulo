# Design foundation (Phase C)

This page records why Rótulo's interface uses Schibsted Grotesk, Newsreader and Lucide, and what the screen and editor engineers inherit. The system itself is specified in `DESIGN.md`. The tokens and shared components live at the top of `assets/static/css/app.css`.

The direction is Proof (`docs/design/direction/README.md`, section 3A). A printer's proof is the last thing an owner checks before their words go out: black ink on plain stock, hairline rules and crop marks. The chrome copies that sheet. It has no hue of its own, so the owner's site is the only colourful thing on screen. Cyan appears only where the owner is touching something: selection, focus and links.

## Why Schibsted Grotesk carries the interface

Schibsted Grotesk is a newspaper grotesk drawn for the Schibsted media group's digital products. That origin is the reason it fits. A newspaper face has to stay readable in short labels at small sizes, and Rótulo's editor is mostly short labels at 13 to 15 px: "Edit text", "Replace image", "Saved", "Publish". The face also belongs to the print-production world that the Proof direction borrows from, so the type and the ink-and-hairline surfaces tell one story.

The measured reasons:

- **Real middle weights.** The shipped file is one variable font covering weights 400 to 700. Before this phase, Linux machines rendered the system stack as DejaVu Sans, which has only 400 and 700, so seven declared weights collapsed into two (`docs/design/type-icons/README.md`, section 1.2). With real 500 and 600 cuts, a button label (500) and a dialog title (600) look different on every platform.
- **Legible at UI sizes.** The x-height is 0.527 of the em (read from the shipped file's `OS/2` table). That keeps 13 px meta text such as "Edited 4 minutes ago · 1 page" readable for the older owners PRODUCT.md describes.
- **Small to ship.** All four weights cost 46,584 bytes as one woff2, subset to Latin-1 and Latin Extended-A with the `kern`, `liga`, `calt`, `tnum` and `case` features.
- **Not the category default.** Inter would make Rótulo look like every other SaaS tool, and Geist reads as developer tooling. Schibsted has more character in its 600 titles without going heavy.

One quirk sets a rule. Schibsted's tabular figures give commas and words awkward spacing, so `tabular-nums` applies only to cells that hold digits alone (`.tnum`, `td.num`). Running text such as "18 files · 764 KB" keeps proportional figures.

## Why Newsreader appears only in a few titles

Newsreader is Production Type's optical-size text serif. Rótulo ships one static instance at weight 450 and optical size 36, which costs 29,108 bytes.

It gives the pages where Rótulo is the host, not the frame, a calm editorial voice: the landing headline, page titles ("Your websites", "Import a website"), sign-in and register titles, the drop zone title, empty states, import result and error titles, and the "needs a bigger screen" message. That is where the brief asks for a recognisable identity.

It never appears in editor chrome, for two reasons. Many owner sites use serif headings, and a Rótulo serif next to the canvas would blur whose type is whose. Its x-height is also small (0.426), so it reads poorly below 20 px. The smallest Newsreader role, `title-2`, is 24 px.

The split costs the editor nothing. The browser downloads a face only when visible text uses it. In the running editor at 1280 px, `document.fonts` reports Newsreader as `unloaded` and only `schibsted-grotesk-400-700.woff2` appears in the resource list (measured this session).

## How the fonts load

- Both files live in `assets/static/fonts/` with their SIL OFL 1.1 licence texts (`OFL-SchibstedGrotesk.txt`, `OFL-Newsreader.txt`). They come from the app's own origin, so the CSP stays `font-src 'self'`.
- `body` sets `font-synthesis: none`. Only upright faces ship, so an `<em>` or a heavier weight renders upright at the shipped weight instead of a browser-faked slant or bold. To emphasise text, use weight within Schibsted's 400 to 700 range, or ask the owner to approve an italic file.
- `layouts/base.html` preloads only the Schibsted file. Newsreader is small and off the editor path, so it loads on demand.
- Both use `font-display: swap`. The fallback faces (`Schibsted Grotesk Fallback` on Arial or Liberation Sans, `Newsreader Fallback` on Times New Roman or Liberation Serif) carry `size-adjust` and ascent and descent overrides, so text keeps its width and line height when the web font arrives.
- `scripts/design/build_fonts.sh` rebuilds both files from the upstream variable fonts and prints the fallback overrides through `scripts/design/fallback_metrics.py`. fontTools runs from a throwaway virtualenv. It is a build tool, not an app dependency.

## Why Lucide is the one icon family

Lucide is a maintained set of stroked icons on a 24-unit grid. Rótulo already drew its icons that way: one SVG sprite, `currentColor` strokes, and a `<use href>` reference from templates and from `icon()` in `frontend/ui.ts`. Lucide therefore replaced hand-drawn glyphs without changing the delivery. There is no runtime package and no framework. The sprite is 7,938 bytes (2,268 gzipped) for 43 symbols.

- **Action-named ids.** Sprite ids name the action, not the drawing (`i-edit-text` is Lucide's `text-cursor`, `i-replace-image` is `image-up`). Swapping a glyph later touches one row in `scripts/design/build_icons.py`.
- **Clear metaphors for nontechnical owners.** The audit found one pencil meaning four things, Publish and Import sharing an arrow, and a sparkle that promised AI (`docs/design/type-icons/README.md`, section 4.2). Lucide has a distinct, conventional glyph for each Rótulo action.
- **One stroke weight on screen.** `.icon-sm` (16 px), `.icon` (20 px) and `.icon-lg` (24 px) set `stroke-width` to 2.25, 1.8 and 1.5 grid units, so every size renders at about 1.5 px. That matches the stem weight of the 500-weight labels beside them.
- **Licences travel with the sprite.** Lucide is ISC, with MIT for glyphs derived from Feather. `assets/static/img/ICONS-LICENSE.txt` ships next to `icons.svg`.

## For the screen and editor engineers

You own `screens.css` (screens engineer) and `editor.css` (editor engineer). `app.css` is shared. Change it only for a new token or component that both of you need, and say so in the commit message.

### Use these tokens

- **Colour roles.** Surfaces are `--ground`, `--surface`, `--sunken`, `--surface-hover` and `--surface-pressed`. Text is `--ink`, `--ink-2` and `--ink-3`. Never use opacity on text. Lines are `--rule` (decorative), `--rule-strong` (dividers) and `--control-border` (edges that must reach 3:1). Hover and press washes are `--hover` and `--pressed`.
- **Hue.** `--select`, `--select-strong`, `--select-soft` and `--link` are for selection, focus, current state and links. `--success`, `--warning` and `--error`, each with a `-soft` partner, are for state. Nothing else gets colour.
- **Type.** Each role has four tokens: `--fs-*`, `--lh-*`, `--fw-*` and `--ls-*`. The roles are `micro`, `meta`, `label`, `control`, `body`, `lead`, `title-3`, `heading`, `title-2`, `title-1`, `display`, `brand` and `mono`. For markup with no component, the `.t-*` classes apply a whole role. `title-2`, `title-1` and `display` are Newsreader roles and must stay outside the editor.
- **Space and size.** Spacing is `--s0` to `--s11` on a 4 px grid. Control heights are `--control-h-sm` (30), `--control-h` (36) and `--control-h-lg` (44). Layout widths are `--page-max`, `--page-narrow`, `--auth-w`, `--dialog-w`, `--dialog-w-wide` (website settings), `--sheet-w`, `--sidebar-w` and `--panel-w`. Bar heights are `--header-h` and `--topbar-h`.
- **Radii.** `--radius-canvas` (2), `--radius-chip` (3), `--radius-control` (4), `--radius-float` (6) and `--radius-dialog` (8). `--radius-round` is for dots, the avatar and the switch only.
- **Elevation.** Panels and cards are flat with a hairline. Only floating things lift, with `--border-float` plus `--shadow-float` (menus, popovers, toolbar, toasts) or `--shadow-dialog` (dialogs, sheets).
- **Motion.** Durations are `--dur-fast`, `--dur-pop`, `--dur-panel` and `--dur-device`, with `--ease-out` and `--ease-in-out`. Reduced motion sets every duration to 0. Write transitions with these tokens so they inherit that.
- **Layers.** `--z-canvas-ui` (5), `--z-bar` (20), `--z-menu` (30), `--z-toolbar` (40), `--z-menu-over-toolbar` (41, menus opened from the floating toolbar) and `--z-toast` (100). Dialogs use the browser top layer through `<dialog>`.
- **Editor overlay (editor engineer).** `--overlay-accent`, `--overlay-accent-soft`, `--overlay-hover`, `--overlay-halo`, `--overlay-muted`, `--overlay-veil`, `--overlay-chip-bg`, `--overlay-chip-ink`, `--select-stroke`, `--crop-mark`, `--crop-gap`, `--crop-weight`, `--kind-label-size`, `--canvas-backdrop`, `--shadow-canvas`, `--device-bezel`, `--device-bezel-edge`, `--device-radius` (the phone screen corner, a depicted device outside the radius scale) and `--veil` (sheet white at 86 percent over a reloading page). The preview iframe cannot read these properties. Mirror the values into the agent, as `docs/design/editor/README.md` section 3.2 describes. `frontend/agent/agent.ts` currently carries the accent and muted values as constants.

### Use these components

`app.css` provides buttons (`.btn` with `-primary`, `-secondary`, `-ghost`, `-danger`, `-danger-ghost`, sizes `-sm` and `-lg`, `-icon`, `-block`, and `aria-busy` and `disabled` states), `.link-btn`, `.spinner`, `.status` with `data-tone`, form parts (`.field`, `.label`, `.hint`, `.field-error`, `.input`, `.select`, `.textarea`, `.input-group`, `.input-addon`), `.alert` variants, `.switch`, `.seg`, `.pill` variants, `.kbd`, `.brand`, `.menu`, `.popover`, `.tooltip`, `.card`, `.crop` and `.crop-select` (crop marks), `.disclosure` (a quiet `<details>` toggle), `.nowrap`, `.inline-icon` (an icon inside a sentence), `.list`, `.table`, `.empty`, `dialog.modal`, `dialog.sheet`, `.toasts` with `.toast` and `.toast-action`, `.skip-link` and `.visually-hidden`.

- Dashboard statuses map one to one onto pills. Use `pill-{{ p.status }}` for `draft`, `published`, `changes` and `offline`. Domains add `pill-pending`.
- To restyle a button, set the three `--btn-bg`, `--btn-fg` and `--btn-border` properties. Do not override `background` or `color` directly. The editor's "Publish rests as secondary once live" rule in `editor.css` shows the pattern.
- Native `<dialog>` gives focus trapping and Escape for free. Keep using it for dialogs and sheets.

### Follow these naming conventions

- Tokens name a role, not a value: `--ink-2`, not `--gray-600`.
- Screen classes use a short screen prefix or a plain noun (`.site-card`, `.dropzone`). Editor classes keep the `ed-`, `ftb-` and `tb-` prefixes.
- Sprite ids name the action (`i-replace-image`). To add one, add a row to `GLYPHS` in `scripts/design/build_icons.py`, rerun it, and add the id to `IconName` in `frontend/ui.ts`.
- Keep every class, id and `data-*` attribute that `frontend/**/*.ts` or `frontend/tests` reads. Search before you rename.

### Do not do these

- Do not add a hex value, shadow, radius, font size or z-index outside the `:root` block. If a value repeats with one meaning, it becomes a token in `app.css`.
- Do not put Newsreader in the editor top bar, sidebar, toolbar or panels.
- Do not add a second primary button to a view, a coloured panel or a decorative shadow.
- Do not use cyan for anything except selection, focus, current state and links. Hover in the canvas must never look like selection.
- Do not make text lighter than `--ink-3`, and do not fade disabled controls with opacity. A disabled control drops its fill and border and keeps an `--ink-3` label.
- Do not ship an icon-only button without `aria-label`. `scripts/design/check_icons.py` fails the gate if a `.btn-icon` in a template or TypeScript file has none.
- Do not add an icon to every heading or list row. Icons go where they speed recognition. Labels stay on by default for occasional users.

### Run these checks before you commit

- `scripts/check.sh` runs the Rust and frontend tests, the icon and accessible-name check, and `scripts/design/contrast.py`. The contrast script reads hex tokens from `app.css` and fails if any listed pair drops below its minimum. If you add a colour pair, add it to `PAIRS` in that script.
- Run `<impeccable skill>/scripts/impeccable detect --json assets/views assets/static/css` and explain every finding that remains.
