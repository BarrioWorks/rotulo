# Investor demo QA

Run on 2026-10-19 against the dev server at http://127.0.0.1:5150 with a fresh database (`/tmp/ph-qa`). Browser: T3 Code preview (Chromium), 1280x800. Every step was driven through the UI with clicks and typing. The JSON API was not called. Two read-only `curl` requests were used to confirm the live hero image bytes and to check `favicon.ico`.

Test account: Maya Harbor, maya@harborbakery.com. Project: Harbor Bakery (`54cead7f-fd95-44d2-b8bb-02847064fc1a`), live at http://harbor-bakery.sites.localhost:5150.

## Steps

| # | Step | Result | What I saw | Screenshot |
|---|---|---|---|---|
| 1 | Open Pagehaven | Pass | Landing page "Your AI-built website. Yours to edit." No console messages. | [01](screenshots/01-home.png) |
| 2 | Sign up | Pass | Name, email and password form. "Create account" went to an empty dashboard titled "Bring in your first website". | [02](screenshots/02-signup.png), [03](screenshots/03-empty-dashboard.png) |
| 3 | Import website, drop `harbor-bakery.zip` | Pass | Upload progress, then "Imported. Harbor Bakery. 4 pages ready to edit." with a thumbnail. | [04](screenshots/04-import-page.png), [05](screenshots/05-import-success.png) |
| 4 | Open editor | Pass | The real bakery site rendered in the canvas. Pages: Home, Our story, Visit us, Menu. Status "Saved". | [06](screenshots/06-editor-opened.png) |
| 5 | Headline: Edit text, select, type, Enter | Pass | The headline became "Fresh sourdough, every single morning.". Status "Saved". Undo became enabled. | [07](screenshots/07-headline-editing.png), [08](screenshots/08-headline-saved.png) |
| 6 | Hero photo: Replace image, `replacement-hero.jpg` | Pass, with a caveat | The photo was replaced in place with the same frame and layout. The image's description (alt text) still describes the old bread photo. See problem 5. | [09](screenshots/09-image-selected.png), [10](screenshots/10-hero-image-replaced.png) |
| 7 | "See today's menu": Link, Visit us, Save link | **Fail (visible glitch)** | The link saved. The toast said "Link saved" and the status said "Saved". **The link popover stayed open.** Escape and the Link button did not close it. A `javascript:` address was refused with a clear message. See problem 1. | [11](screenshots/11-link-popover.png), [12](screenshots/12-link-saved-popover-still-open.png) |
| 8 | Phone icon, then computer icon | Pass, with a caveat | The canvas switched to a 390 px wide phone frame with a hamburger menu and stacked layout. On the first try the stale link popover from step 7 followed the selection into phone view. | [13](screenshots/13-mobile-stale-link-toolbar.png), [14](screenshots/14-mobile-layout.png) |
| 9 | Publish | Pass | Toast "Your website is live at harbor-bakery.sites.localhost:5150". "Version 1, Live, 22 files, 1.5 MB" appeared in the history. | [15](screenshots/15-published-v1.png) |
| 10 | Click live address in Publishing panel | Pass | The link has `target="_blank"` and opened a new tab at http://harbor-bakery.sites.localhost:5150/. Checked on that tab: the H1 is the new headline. The hero `src` is `images/uploads/b82e0e8e45bd0c4c.jpg`, and its SHA-256 matches `fixtures/images/replacement-hero.jpg` byte for byte. "See today's menu" links to `contact.html` (Visit us). No editor code is present on the live page. | [16](screenshots/16-live-site-v1.png) |
| 11 | Back to editor tab | Pass | The editor was unchanged. | n/a |
| 12 | Change a paragraph, Publish again, refresh live tab | Pass | The hero paragraph became "Version two: now open on Mondays too, from 8am." Publish created Version 2 (Live). After a refresh, the live tab showed the new paragraph. | [17](screenshots/17-published-v2.png), [18](screenshots/18-live-site-v2.png) |
| 13 | Version history: Make live on version 1, confirm, refresh live tab | Pass, with a caveat | The confirm dialog said "Make version 1 live?". The toast said "Version 1 is live". After a refresh, the live tab shows version 1: the original paragraph is back, and the version 1 headline, image and link are still present. Afterwards the Publishing status read "Published 1 minute ago" even though the draft no longer matched the live site. See problem 3. | [19](screenshots/19-make-live-confirm.png), [20](screenshots/20-version1-live.png), [21](screenshots/21-live-site-after-rollback.png) |
| If asked | Custom domain `www.harborbakery.com`, Add | Pass | It showed "Waiting" with TXT `_pagehaven.www.harborbakery.com` = `pagehaven-verify=…` and CNAME `www.harborbakery.com` → `harbor-bakery.sites.localhost`. Pressing Check showed "We couldn't find the TXT record yet. DNS changes can take up to an hour to appear." The domain stayed pending. | [22](screenshots/22-custom-domain-pending.png) |

### Extra checks

| Check | Result | What I saw | Screenshot |
|---|---|---|---|
| (a) Import `vite-source-only.zip` | Pass | "We couldn't import this file" followed by the exact text "This ZIP contains source code rather than a finished website. Export the built static website files and try again." (the server answered 422). | [24](screenshots/24-source-zip-rejected.png) |
| (b) Mobile toggle | Pass | The canvas iframe measured 390x696 CSS px. The site switched to its mobile layout with a hamburger menu. | [14](screenshots/14-mobile-layout.png) |
| (c) Reload editor keeps edits | Pass | After a full reload, the headline, image, link and paragraph edits were all present. The status read "Unpublished changes". | [20](screenshots/20-version1-live.png) shows the pre-reload state. The post-reload state was checked by reading the page; no screenshot was kept. |
| (d) Second tab goes stale | Pass | Tab 1 edited the paragraph to "Edited in tab one.". Tab 2, opened earlier, then edited the headline. Tab 2 showed a modal "This website changed somewhere else" with a Reload button, and its status changed to "Not saved". Reload kept tab 1's edit and dropped tab 2's. | [23](screenshots/23-stale-tab-message.png) |
| Dangerous link refused | Pass | `javascript:alert(document.cookie)` was refused with "That link can't be used. Use a web address starting with https://, …". | n/a |
| Console | Pass, warnings only | The editor logged no errors. It logged two warnings on every load (see problem 6). The import page logged the expected 422 for the source ZIP. | n/a |

## Problems found

Ordered by severity.

### 1. After a successful save, the link and description popovers stay open (confirmed, reproducible)

The earlier suspicion is confirmed. After "Save link", the link saves. The status says "Saved" and a "Link saved" toast appears. **The popover stays on screen.** Escape does not close it. Clicking the Link button again does not close it. Clicking another element in the page leaves the old toolbar and popover on screen, attached to the new selection. Switching to the phone view carries the stale popover along ([13](screenshots/13-mobile-stale-link-toolbar.png)). The image "Description" panel has the same bug, and there it happens every time ([25](screenshots/25-description-saved-panel-still-open.png)). During the demo this happens at step 7, while the presenter says "Buttons go wherever you want".

Reproduction:
1. In the editor, click "See today's menu", then Link.
2. Click the Page dropdown and choose "Visit us". Focus is now on the dropdown.
3. Click "Save link". Result: the toast says "Link saved", and `[data-toolbar] .ftb-panel` is still in the DOM with focus still on the `<select>`.
4. Press Escape, or click the Link button twice. The panel stays.
5. The same happens with Web address: type `https://example.com/menu` and press Enter.
6. Description: select the hero image, click Description, type, click Save. The toast says "Description saved" and the panel stays open with the textarea focused.

Root cause, from `frontend/editor/toolbar.ts`:
- `toolbar.ts:79-82`. A `mousedown` on any toolbar control other than an input calls `preventDefault()`. Clicking "Save link" or "Save" therefore leaves focus in the panel's `<select>`, `<input>` or `<textarea>`. The Description textarea is also auto-focused at `toolbar.ts:304`.
- `toolbar.ts:271-274` (link) and `toolbar.ts:301-302` (description). These correctly set `panel = null` and call `render(true)`.
- `toolbar.ts:445-449`. `render()` returns early whenever the focused element is an `input, textarea, select` inside the toolbar (`keepFocus`), and `force` does not bypass this. The DOM is never rebuilt, so the closed panel stays visible.
- `toolbar.ts:434`. `renderedKey = key` is assigned *before* that early return. The toolbar then records the new state as already rendered, so later non-forced renders with the same key also skip the rebuild.
- `toolbar.ts:495`. The Escape handler only acts when `panel !== null`. After the save `panel` is already `null`, so Escape does nothing.

The `keepFocus` guard is there to avoid rebuilding the toolbar while the user is typing in it. It should not block an explicit close. Not fixed, as instructed.

### 2. The stale toolbar keeps acting on the previous element (consequence of 1)

While the stale popover is up, clicking a different element (for example the headline) moves the blue selection outline. The toolbar keeps showing the previous element's controls ("Link · Edit text · Link"). Its buttons are closures over the old `sel`. A user can therefore see the headline selected while the toolbar edits the button. I observed the mismatch (toolbar row text "Link\nEdit text\nLink" while the headline was outlined). I did not click those stale buttons to see what they would change. Same root cause and lines as problem 1.

### 3. After "Make live" on an older version, the status says "Published" although the draft differs

After version 1 was made live, the Publishing status read "Published 1 minute ago" ([20](screenshots/20-version1-live.png)). The draft still contained the version 2 paragraph, so the draft and the live site differed. After a page reload the same panel correctly read "Unpublished changes". An investor who sees "Published" next to a different page in the canvas could be confused.

Root cause: `frontend/editor/publish.ts:83`. `makeLive` dispatches only a `project` update with the new `live_release`. It never refreshes `draftChanged`, which stays `false` from the previous publish. The status text is computed at `publish.ts:106-112`.

### 4. Stale-tab dialog copy differs from the demo script

The script's Recovery section (`docs/demo-script.md:41`) says the tab shows "This website was changed in another tab". The app shows "This website changed somewhere else" (`assets/views/projects/editor.html:212`). The dialog also does not say that the edit made in this tab will be discarded on Reload, and it was discarded.

### 5. Replacing an image keeps the old description

After step 6, the live site's hero `<img>` still has `alt="A crusty round loaf and a baguette beside a steaming cup of coffee in warm morning light"`, while the picture now shows sailboats in a harbour. Screen readers and search engines get the wrong description, and nothing prompts the user to update it.

### 6. Console warnings on every editor load

- "An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing." The source is `assets/views/projects/editor.html:162` (`sandbox="allow-scripts allow-same-origin"`). The canvas loads from a separate `*.preview.localhost` origin, so this is likely not a real escape. A technical investor opening DevTools would still see a "can escape its sandboxing" warning next to a security pitch.
- "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'." The source is `src/preview.rs:115`.

### 7. Visual polish

- The floating toolbar sits directly over neighbouring content. In [06](screenshots/06-editor-opened.png) and [08](screenshots/08-headline-saved.png) it covers the "Open today" pill, and in [25](screenshots/25-description-saved-panel-still-open.png) it covers the site's main navigation.
- The selection outline of the hero image runs through the "Fresh batch at 11am" card text, which looks like a strikethrough ([09](screenshots/09-image-selected.png)).
- The live address in the Publishing panel is cut off to "harbor-bakery.si…" ([15](screenshots/15-published-v1.png)). This is the link the presenter is told to click.
- The custom domain name wraps mid-word ("www.harbor / bakery.com"), and the DNS values wrap character by character in the narrow sidebar ([22](screenshots/22-custom-domain-pending.png)).
- After the stale-tab Reload, a faint "Opening your page…" placeholder was visible behind the hero image for a moment.

### 8. Things an investor may read as fake or dev-only

- The CNAME target shown to the user is `harbor-bakery.sites.localhost` ([22](screenshots/22-custom-domain-pending.png)), and the live address contains `localhost:5150`. This is expected on a dev server, but it shows on screen during the custom domain answer.
- The landing page mockup shows the address `harbor-bakery.pagehaven.site`, which the product does not use in this setup ([01](screenshots/01-home.png)).
- "Version 1" in the history already contains the demo edits. Rolling back to it does not return to the imported original, which the step 13 line "Made a mistake?" may lead viewers to expect.

### 9. Minor

- `favicon.ico` returns 404 on both the app and the published site. Chromium logged nothing for it.
- In the import drop zone, the "Choose a file" label does not take a click through Playwright's text locator (it timed out). Clicking at the same position works and opens the file picker. This is probably a pointer-events or overlay detail with no effect on real users. Inferred, not verified with a mouse.

## Not checked

- Drag-and-drop of the ZIP. I used the file picker. The script says "drop".
- Changing a button colour in step 12. I changed a paragraph instead, which the script allows.
- Whether clicking the stale toolbar's buttons (problem 2) edits the previous element or the visible one.
- A real Chrome window outside the T3 preview, other browsers, and real phone devices.
- The other pages (Our story, Visit us, Menu): their editing, Add page, Page settings, Website settings and the Images panel.
- Undo and Redo beyond seeing Undo become enabled.
- Preview mode.
- `scripts/smoke.sh` and the "Before the meeting" setup. The server was already running.
- Real DNS verification. It cannot succeed in this environment.
- Log out and log in again.
