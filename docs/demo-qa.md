# Investor demo QA

Final verification after the UI/UX redesign (Phase H of `docs/design/brief.md`).

- **Date.** 2026-10-20, 04:22 to 04:55 UTC.
- **Build.** `main` at `e78e233`. No source code was changed for this run.
- **Server.** The running dev server at http://127.0.0.1:5150, data in `/tmp/pagehaven-demo`. It was not restarted.
- **Browser.** T3 Code preview (Chromium), incognito profile, 1280x800 unless stated. Narrow views at 390x844. The "200% zoom" check used a 640x400 viewport.
- **Account.** Dana Reyes, `dana.final.qa@example.com`. Demo project: Agency, published at http://agency-10.sites.localhost:5150 (`0f9ef8b4-f3c4-45e8-812c-0ff775f59c67`).
- **Method.** Every demo step was driven through the UI with clicks, typing and key presses. The JSON API was not called. `curl` was used only to read published files: the hero image hash, the cropped portfolio image size, and the deleted site's response. Page state was read with `preview_evaluate` (DOM queries), never changed with it.

Screenshots are in [`docs/design/screens/final/`](design/screens/final/).

## Demo script steps

| # | Step | Result | What I saw | Screenshot |
|---|---|---|---|---|
| 1 | Open Pagehaven | Pass | Landing page "Your AI-built website. Yours to edit." No console messages. | [01](design/screens/final/01-landing-1280.png) |
| 2 | Sign up | Pass | Name, email, password form. "Create account" went to the empty dashboard "Your first website goes here". | [02](design/screens/final/02-register-1280.png), [03b](design/screens/final/03b-dashboard-empty-1280.png) |
| 3 | Import a website, `startbootstrap-agency.zip` | Pass | Result "Agency. 1 page imported and ready to edit." The thumbnail shows a portfolio picture (the watch), not the hero (problem 10). | [04](design/screens/final/04-import-empty-1280.png), [05](design/screens/final/05-import-result-1280.png) |
| 4 | Open editor | Pass | The real Agency page in the canvas at "Fit 79%". Start here block in the rail. Top bar "Not published yet". | [06](design/screens/final/06-editor-idle-start-here-1280.png) |
| 5 | Headline: Edit text, type, Enter | Pass, with a caveat | Clicking the heading docks the toolbar along the top of the canvas. "Edit text" does not select the old words: I pressed Ctrl+A before typing (problem 5). After Enter the heading reads "Brand design for growing teams" and the top bar shows "Saved" for 2 seconds, then "Not published yet" (problem 6). | [07](design/screens/final/07-editor-heading-selected-1280.png), [08](design/screens/final/08-editor-headline-saved-1280.png) |
| 6 | Subheading, Change banner photo, `replacement-hero.jpg` | Pass, with a caveat | Toast "Banner photo changed · Undo". The new photo is very bright, so the white headline is hard to read on it (problem 4). | [09](design/screens/final/09-editor-banner-replaced-1280.png) |
| 7 | Tell me more, Link, Part of this page, Contact, save | Pass, with a glitch | Link panel opens in the rail with "A part of this page" preselected. After choosing "Contact Us" and Save link: toast "Link saved", toolbar reads "Link · Contact Us section". The button's toolbar runs past the right edge of the window and "Background" is cut off (problem 2). | [09b](design/screens/final/09b-editor-link-saved-1280.png), [clipped](design/screens/final/problem-toolbar-clipped.png) |
| 8 | Phone icon, then computer icon | **Fail (visible glitch)** | The canvas switches to a phone frame. Tell me more is still selected from step 7, and its toolbar spills out of the phone frame: "section", "Style", "Change banner photo" and "Backg…" are drawn over the grey backdrop with no background (problem 1). After Esc the phone view is clean. Back to computer works. | [overflow](design/screens/final/problem-phone-toolbar-overflow.png), [13](design/screens/final/13-editor-phone-view-1280.png) |
| 9 | Publish, review, Publish | Pass | Review lists "Home: Link change, Background photo change, Text change" and the address. After Publish: toast "Published. Visitors now see version 1.", top bar "Published", **View website**, disabled **Publish**. | [11](design/screens/final/11-editor-publish-review-1280.png), [12](design/screens/final/12-editor-published-1280.png) |
| 10 | View website | Pass | Opened a new tab at http://agency-10.sites.localhost:5150/. `.masthead-heading` = "Brand design for growing teams". The masthead `style` is `background-image: url("images/uploads/b82e0e8e45bd0c4c.jpg")` and that file's SHA-256 equals `fixtures/images/replacement-hero.jpg`. Tell me more `href="#contact"`. No editor markup in the page. | [15](design/screens/final/15-live-site-v1-1280.png) |
| 11 | Back to the editor tab | Pass | Editor unchanged. | n/a |
| 12 | Replace a Services "Lorem ipsum" paragraph, Publish, refresh | Pass | E-Commerce paragraph changed to "We build online shops that load fast and are easy to run." Top bar "1 change not published". Review "Publish your changes? Home: Text change". After Publish and a refresh the live page shows the new paragraph; the other two are still Lorem ipsum. | [14](design/screens/final/14-editor-services-paragraph-1280.png) |
| 13 | Version history, version 1, confirm, refresh | Pass, script wording differs | The script says **Make live**. The UI says **Publish again**, then a dialog "Publish version 1 again?" with **Publish version 1** (problem 3). After confirming: toast "Visitors now see version 1.", top bar "Visitors see version 1" with Publish enabled. Live page after refresh: all three Services paragraphs are Lorem ipsum again; headline, banner photo and link from version 1 are present. | [16](design/screens/final/16-editor-version-history-1280.png), [17](design/screens/final/17-editor-rollback-confirm-1280.png), [18](design/screens/final/18-live-site-after-rollback-1280.png) |
| If asked | Import `landwind.zip` | Pass | Imported as "Landwind", opens in the editor and renders the Tailwind page. | [22](design/screens/final/22-editor-landwind-1280.png) |
| If asked | Custom domain `www.example-studio.com` in Website settings | Pass | Status "Waiting for your domain settings". Records shown: TXT `_pagehaven.www.example-studio.com` = `pagehaven-verify=08d7…554d`, CNAME `www.example-studio.com` to `agency-10.sites.localhost`, each with Copy. It stays pending. | [19](design/screens/final/19-editor-website-settings-1280.png), [20](design/screens/final/20-editor-custom-domain-pending-1280.png) |

After the run the Agency site was republished as version 3 (portfolio check below), so the live site no longer matches version 1.

## Specific checks

| | Check | Result | Evidence |
|---|---|---|---|
| a | Portfolio image with a different aspect ratio keeps its frame, in the editor and published | Pass | Replaced portfolio 1.jpg (600x450) with the 1600x900 hero. The editor kept the 356x267 frame; the panel says "The new picture is trimmed to the shape of the old one" and "The file is 1200 × 900". The crop is server-side and persists: the published HTML has `<img class="img-fluid" src="images/uploads/919a964da4a6972c.jpg" alt="...">`, that file is 1200x900 (4:3), and it renders at 356x267 like its neighbours. [editor](design/screens/final/check-a-portfolio-replaced-editor.png), [live](design/screens/final/check-a-portfolio-replaced-live.png) |
| b | Undo/redo does not reload the canvas or jump the scroll | Partial | No visible jump: scroll position (Portfolio) and selection were kept after Undo and after Redo. But the canvas does reload: the `<iframe>` element was replaced (the reference I held was no longer in the DOM and the page sent a fresh `ready`). The reload is double-buffered, so the user does not see a flash. Code: `frontend/editor/main.ts:182` calls `canvas.reload` after every undo/redo, `frontend/editor/canvas.ts:215` swaps frames. After Undo the rail panel kept stale facts, "The file is 1200 × 900", for the restored 600x450 picture (problem 9). [after undo](design/screens/final/check-b-after-undo.png) |
| c | Hiding a section the site's menu links to shows a warning | Pass | Hid Services via Section ▾, "Hide on your website". Toast: "Section hidden on your website. A link on this page jumps to it, for example in your menu, and won't go anywhere until you show it again." The section shows a hatched "Hidden on your website" state. [c](design/screens/final/check-c-hide-services-warning.png) |
| d | No ghost or doubled text over an edited heading | Pass | After editing the headline (step 5) and after reloading the editor with it selected, no faint duplicate text is drawn. [08](design/screens/final/08-editor-headline-saved-1280.png), [10](design/screens/final/10-editor-style-panel-1280.png) |
| e | Toolbar does not cover the words next to the selection | Pass for the headline | With the headline selected the toolbar docks at the top of the canvas and "Welcome To Our Studio!" stays visible. Elsewhere it does cover content: after "Change the main heading" from a scrolled canvas, the toolbar sits on top of Tell me more; a docked toolbar for an off-screen section covers the "PORTFOLIO" heading. [07](design/screens/final/07-editor-heading-selected-1280.png) |
| f | Top bar wording | Pass | "Saved" appears after each edit (for 2 s, problem 6), then "Not published yet", "Changes not published", "1 change not published", "Published" or "Visitors see version 1". No "online" or "live" text or labels in the editor DOM (scanned text, `aria-label`, `title`, `data-tip`). After publishing: View website next to a disabled Publish. [12](design/screens/final/12-editor-published-1280.png) |
| g | Link panel refuses `abc` phone and `javascript:` | Pass | Phone "abc": inline red "A phone number can only have digits, spaces, a + at the start, dashes and brackets." `javascript:alert(document.cookie)`: field `aria-invalid="true"`, inline "Type a web address, like example.com or https://example.com." Nothing was saved in either case. [phone](design/screens/final/check-g-phone-refused.png), [js](design/screens/final/check-g-javascript-refused.png) |
| h | Sentence-case role labels; crisp marks at Fit | Pass | Canvas labels seen: "Heading", "Text", "Button", "Image", "Card", "Section", "Banner", "Menu", "Link", "Editing". The kind menu shows "Card" and "Section · Portfolio". Canvas labels show the role only; the "Card · name" form appears only in that menu. Marks and labels looked sharp at Fit 79% in 1x screenshots; HiDPI was not checked. [card](design/screens/final/check-h-card-label-menu.png), [banner](design/screens/final/check-h-banner-label.png) |
| i | Start here block and the rail rows | Pass, one unreproduced failure | "Change the main heading" selected and scrolled to the heading from a fresh load and from a scrolled canvas. "Change your web address" and Website settings open the settings dialog. Version history opens the history panel. Images lists 18 pictures and selecting one selects it in the canvas. Once, right after a rollback, "Change the main heading" did nothing while a paragraph's selection marks were still drawn (problem 8). [06](design/screens/final/06-editor-idle-start-here-1280.png), [21](design/screens/final/21-editor-images-list-1280.png) |
| j | Click outside closes the publish review; Enter on the canvas never opens the site | Pass | The review closed on a click in the rail and on a click in the canvas. Enter on the canvas with nothing selected selected the first element; with a nav link selected it started Edit text; with Tell me more clicked it started Edit text. No new tab opened in any case (checked the tab list). |
| k | 640 px viewport (200% zoom at 1280) | Pass, with problem 2 | The editor stays in edit mode: compact top bar with icon buttons, canvas at Fit 48%, toolbar and selection work. The toolbar is cut off at the right edge here too. [k](design/screens/final/check-k-editor-640-viewport.png) |
| l | Keyboard only | Pass | Tab order: skip link, back, site menu, page menu, undo, Edit, Preview, Computer, Phone, status, View website, Start here links, Add page, Home, More for Home, Website settings, Version history, Images, canvas. Every stop matched `:focus-visible` with a white plus blue ring. In the canvas, ArrowDown walked Menu, the logo Image, then nav links; Enter started Edit text; Esc cancelled editing, then cleared the selection. Esc closed Version history and Website settings and returned focus to their rail rows. Dashboard: Tab to "More for Harbor Bakery", Enter opens the menu, Tab to "Delete website…", Enter opens the dialog with focus in the confirm field, Esc closes it and returns focus to the More button, typing the name and Enter deletes. ArrowDown does not move into the card menu (Tab does). [arrow keys](design/screens/final/check-l-arrow-key-selection.png), [dashboard focus](design/screens/final/check-l-dashboard-focus.png) |
| m | Reduced motion | Pass by inspection, not emulated | The preview tool cannot emulate `prefers-reduced-motion`. `app.css` sets `--dur-*` to 0ms and forces `animation-duration` and `transition-duration` to 1ms with `!important` under `(prefers-reduced-motion: reduce)`; `screens.css:308` has a matching block; the canvas agent disables glide, hover fade and pulse and switches scrolling to `instant` (`frontend/agent/agent.ts:94`, `:567`, `:619`); the device switch skips its delay (`frontend/editor/canvas.ts:371`). |
| n | Dashboard | Pass | Three equal cards, each 349x381 px. Pills "Published" and "Not published yet", the same words as the editor. Deleting Harbor Bakery (typed confirmation) showed "Harbor Bakery was deleted." and its address now returns 404 with the page "No website here yet". [3 sites](design/screens/final/03-dashboard-3-sites-1280.png), [dialog](design/screens/final/check-n-delete-dialog-keyboard.png), [after](design/screens/final/check-n-after-delete.png), [offline](design/screens/final/check-n-deleted-site-offline.png) |
| o | `vite-source-only.zip` message | Pass | Heading "This ZIP isn't a website Pagehaven can use", body exactly "This ZIP contains source code rather than a finished website. Export the built static website files and try again." [o](design/screens/final/check-o-source-zip-rejected.png) |
| p | Console | Pass, one warning | Landing, register, sign in, dashboard, import (empty state): no entries. Editor (Agency and Landwind): one warning, "An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing." The Agency site itself logs its Start Bootstrap Forms banner. No errors from Pagehaven. The only error seen was a 404 for a URL I typed. Console output for the import page after an upload was not captured separately. |

## Problems found

Ordered by how much they would hurt the investor demo.

1. **Phone view shows a broken toolbar on the demo path (step 8).** The script leaves Tell me more selected after step 7, so the first thing the audience sees in phone view is toolbar text spilling out of the phone frame onto the grey backdrop.
   Reproduce: select Tell me more, click the phone icon.
   Root cause: when no spot fits, the toolbar docks as a strip exactly as wide as the canvas (`frontend/editor/placement.ts:115-120`, `width: canvas.width`), and docked mode removes the max width (`assets/static/css/editor.css:175`). The row is a non-wrapping flex row with visible overflow (`editor.css:177`), so buttons wider than the 308 px phone canvas draw outside the strip's background.
   Workaround for the presenter: press Esc before clicking the phone icon.

2. **Toolbar cut off at the window edge for buttons and links (step 7, and at 640 px).** With Tell me more selected, the toolbar is 640 px wide but its content is 696 px; "Background" ends at x=1321 in a 1280 px window.
   Reproduce: click Tell me more at 1280x800.
   Root cause: `.ftb` has `max-width: min(640px, calc(100vw - 16px))` (`assets/static/css/editor.css:163`) while the row neither wraps nor scrolls (`editor.css:177`). Placement measures the capped `offsetWidth` (`frontend/editor/toolbar.ts:396`), so it believes the toolbar fits. The long "Link · Contact Us section" label pushes the content past the cap.

3. **Demo script says "Make live", the product says "Publish again".** A presenter reading step 13 will look for a button that does not exist. Version history shows **Publish again** and the dialog shows **Publish version 1**.
   Fix belongs in `docs/demo-script.md` step 13 (and the "Every version is kept" wording already matches the product).

4. **The replacement hero makes the headline unreadable.** `replacement-hero.jpg` has a bright sky behind the title; white "BRAND DESIGN FOR GROWING TEAMS" washes out, in the editor and on the live site. This is the fixture, not the product, but it is what investors see in steps 6 to 10. A darker photo would fix it. [15](design/screens/final/15-live-site-v1-1280.png)

5. **"Edit text" does not select the existing words.** Step 5 says "choose Edit text, type a new one". After Edit text the caret is in the heading with nothing selected, so typing adds to the old headline. I had to press Ctrl+A first. The presenter needs to know this, or the script should say "select the words and type".

6. **"Saved" is visible for only 2 seconds.** Step 5 tells the presenter to point at **Saved**. It shows for `SAVED_VISIBLE_MS = 2000` (`frontend/editor/topbar.ts:25`) and then becomes "Not published yet", which can read as the opposite of saved.

7. **Undo and redo reload the canvas.** No flash or scroll jump (double-buffered), but the site's page is reloaded each time (`frontend/editor/main.ts:182`, `canvas.ts:215`), so in-page state such as a scrolled navbar or an open site menu resets, and there is a short delay before the change appears.

8. **"Change the main heading" did nothing once (not reproduced).** Sequence: paragraph selected, publish version 2, Version history, Publish again on version 1, confirm, Esc. The rail showed Start here (meaning nothing selected) while the paragraph's selection marks were still drawn in the canvas, and "Change the main heading" had no effect. After a reload it worked, and a second attempt at the same sequence (with version 2) worked too.

9. **Image panel facts go stale after Undo.** After undoing a picture replacement the canvas shows the original 600x450 picture but the panel still says "The file is 1200 × 900". [after undo](design/screens/final/check-b-after-undo.png)

10. **Small visual issues.**
    - Import result thumbnail for Agency is a portfolio picture (the watch), because the hero is a CSS background. [05](design/screens/final/05-import-result-1280.png)
    - The Start here block disappears when something is selected, so the rail rows jump up about 205 px under the pointer.
    - The section toolbar reads "Section" twice (role label and the "Section ▾" menu).
    - The warning toast for hiding a linked section uses the same check-mark icon as success toasts.
    - Images list shows duplicate names ("1.jpg" three times, from different folders) and does not include the CSS banner photo.
    - Editor console warning about `allow-scripts` plus `allow-same-origin` on the canvas iframe. The canvas runs on a separate preview origin, so this is expected, but it shows in DevTools.

## Not checked

- Automated test suites (`npm test`, `cargo test`, `scripts/smoke.sh`) were not run in this pass.
- Reduced motion was checked by reading CSS and code only; it was not emulated.
- Selection mark sharpness on a HiDPI (2x) display.
- Real browser zoom at 200%: approximated with a 640x400 viewport.
- Screen reader output.
- Browsers other than the Chromium-based preview.
- Drag and drop of the ZIP onto the drop zone: files were given to the file picker or the file input.
- Custom domain verification against real DNS (pending is the expected outcome locally).
- Console output for the import page after an upload, and for the published site in its own tab.
- Multiple tabs editing the same site ("Changed in another tab").

## Fixed after this run

Each was reproduced in the browser, fixed, and checked again (screenshots `docs/design/screens/final/fix-*.png`):

- The toolbar fits inside the phone frame and the canvas: actions that don't fit move into More instead of spilling or clipping.
- Edit text selects the existing words of headings, buttons and short text, so typing replaces them.
- The status line keeps "Saved" next to the publication state ("Saved · Not published yet").
- The image panel shows the restored picture's size after Undo.
- "Change the main heading" failed after a rollback when the preview address rotated in between; each canvas frame now keeps the address it was loaded from.
- The section toolbar no longer says "Section" twice, warning toasts use the warning icon, the Images list shows folders, and the sidebar no longer jumps when Start here closes.
- After a text edit, a pointer resting on the canvas caused 60 viewport messages a second and a toolbar flipping between two places; the page now reports only changes (measured: 60 a second before, none after).
- The demo uses a real CC0 studio photo for the banner, and the script uses the product's rollback wording.

Still open: undo reloads the page behind the scenes (no flash; scroll and selection kept); Esc on Version history also clears the selection; on a section selected from the bottom of the hero, the toolbar partly covers its label.
