# Phase A audit: the journey from first visit to publication

This is the baseline for the launch redesign. It covers the running app at `http://127.0.0.1:5150` on 2026-10-20, and the code at commit `9f1c48d`.

No participants took part. One agent walked the journey once in Chromium (the T3 preview, incognito profile), with a fresh account `launch-audit-1020@example.com`. Every finding carries a label:

- **Observed.** Seen on screen, in a screenshot or in a network or DOM reading during the walk.
- **Measured.** A number read from the page, the server or the code.
- **Read.** Taken from code, with a `file:line` reference.
- **Assumption.** A conclusion about people or the market that this session cannot check.

Method notes. The CRO framework (`cro`, `references/form.md`), the Impeccable critique heuristics, personas and cognitive-load checklist, and the `marketing-psychology` models were applied in one context. Impeccable's launcher and detector were not run, as instructed, so there is no deterministic scan. The code inventory in sections 4 to 6 was drafted by a Codex research delegate and spot-checked against the code by the auditor (limits, rate limits, the refusal text, the `import finished` line, the preview CSP and the preview's handling of suspended projects).

## Contents

1. Baseline screenshots
2. The journey, stage by stage, and the ten highest-impact problems
3. Two customer segments
4. What the product truly does today (claims inventory)
5. Funnel data
6. Anonymous import before registration

---

## 1. Baseline screenshots

All files are in `screens/`, named `<screen>-<width>.png`. The capture tool scales each image to fit 1280 px, so 834 shots are 1280 x 1706 and 390 shots are 780 px wide at 2x. The viewport was the stated width in every case. Landing pages were captured twice: the first viewport (`landing-fold-*`) and the full scroll (`landing-*`, one image per width).

| Screen | 1280 x 800 | 834 x 1112 | 390 x 844 |
|---|---|---|---|
| Landing, first viewport | `landing-fold-1280` | `landing-fold-834` | `landing-fold-390` |
| Landing, full scroll | `landing-1280` | `landing-834` | `landing-390` |
| Sign up | `signup-1280` | `signup-834` | `signup-390` |
| Sign in | `signin-1280` | `signin-834` | `signin-390` |
| Dashboard, empty | `dashboard-empty-1280` | `dashboard-empty-834` | `dashboard-empty-390` |
| Dashboard with sites | `dashboard-sites-1280` | `dashboard-sites-834` | `dashboard-sites-390` |
| Import, idle | `import-idle-1280` | `import-idle-834` | `import-idle-390` |
| Import, in progress | `import-progress-1280` | `import-progress-834` | not taken |
| Import, success | `import-success-1280` | `import-success-834`, `import-success-landwind-834` | `import-success-390` |
| Import, refused (Vite source) | `import-refused-1280` | `import-refused-834` | `import-refused-390` |
| Editor at rest | `editor-resting-1280` | `editor-resting-834` | `editor-resting-390` |
| Editor, heading selected | `editor-heading-selected-1280`, `editor-landwind-heading-selected-1280` | `editor-heading-selected-834` | `editor-heading-selected-390` |
| Publish popover | `editor-publish-popover-1280` (review before publishing), `editor-publish-status-1280`, `editor-published-toast-1280` | `editor-publish-popover-834` | `editor-publish-popover-390` |
| Version history | `editor-version-history-1280`, `editor-version-history-scrolled-1280`, `editor-version-history-v1-1280` | `editor-version-history-834` | `editor-version-history-390` |
| Settings sheet, Domains | `editor-settings-domains-1280`, `editor-settings-domain-records-1280`, `editor-settings-general-1280` | `editor-settings-domains-834` | `editor-settings-domains-390` |
| Published live site | `live-site-1280` | `live-site-834` | `live-site-390` |

How the in-progress state was caught. The server answered in 353 ms for Furnace Hill (2.5 MB) and 273 ms for Landwind (measured, `XMLHttpRequest` send to load). That is too fast to screenshot. The browser's load callback was delayed by 8 s from the console, so the real "Checking your files…" state stayed on screen. The UI is the product's own. Only its duration was stretched.

---

## 2. The journey

### Walk summary

From the landing page to a live site with one heading edit took **14 actions** (measured by count, the Studio counting rule): Create your account (1), name, email, password, Create account (4), New website (1), choose the ZIP (1), Open editor (1), click heading, Edit text, type, Enter (4), Publish, Publish (2). The live home page then served the new heading, the new photo with its new description and the new link target (measured with `curl` against `furnace-hill-coffee-9.sites.localhost:5150`). A second session after sign out and sign in published version 2, and `curl` returned the new excerpt (measured).

### Stage by stage

**First impression** (`landing-fold-1280`, `landing-fold-390`)

- Observed. The headline is "Your website. Yours to edit." The brief's tagline is "Your AI-built website. Yours to edit." The word "AI" appears nowhere on the page.
- Observed. The first viewport is calm and well set: one headline, one sentence, one primary button. At 390 the button is full width at y 310 to 354, well above the fold (measured).
- Observed. A product picture sits under the hero. Its caption says "Click the headline, choose Edit text and type." The picture is `aria-hidden` and has no interactive element. Clicking the headline does nothing (measured: 0 focusable elements in the figure, focus stayed on `BODY`).
- Assumption. A cold visitor from an AI-builder community will not recognise themselves in "Your website", because nothing names where the site came from.

**Comprehension** (`landing-1280`)

- Observed. The page has three sections: hero with demo picture, "How it works" (Import, Edit, Publish) and "Your website stays yours". That is the whole page at 1771 px tall.
- Observed. What you need is stated once, in the third row of the last section ("Bring your HTML pages, pictures and fonts together in a ZIP") and in the footer ("For finished static websites and HTML templates."). The page never says that a project's source code, or a site built in the browser by JavaScript, will not work.
- Observed. Nothing says what it costs, whether it is free, or what happens after sign up.

**Trust** (`signup-1280`, `signin-390`, `landing-1280`)

- Observed. The sign up form says "Pagehaven can't reset it yet." The sign in page says "Pagehaven can't reset passwords yet. If you can't sign in, create a new account with another email address."
- Observed. The footer has no privacy policy, terms, contact, company name or abuse address.
- Observed. There are no testimonials, counts or logos. That is correct, because none exist (`PRODUCT.md`). The page has nothing in their place, such as a named maker or a plain statement of limits.
- Observed, positive. "Only what you touch changes" and "Every version is kept" are true and well chosen (read: `src/publish.rs:71`, `src/publish.rs:297`).

**Perceived quality** (`landing-1280`, `dashboard-sites-1280`, `editor-resting-1280`)

- Observed. Type, spacing and materials are consistent across landing, auth, dashboard, import and editor. The editor gives the site most of the screen.
- Observed. The landing page is quiet to the point of being generic. A tool's homepage is a Persuade surface. It reads like an app screen.
- Observed. Generated addresses carry numeric suffixes: `furnace-hill-coffee-9`, `landwind-13`. They look like a collision counter, not a chosen address.
- Observed. Small defects: the "Keyboard shortcuts" button sits jammed under the domain field (`editor-settings-domains-1280`). DNS values wrap mid-word in narrow columns (`editor-settings-domain-records-1280`). On the dashboard at 390, Edit and More are 30 x 30 px, under the 44 px touch target (measured).

**Ease of starting** (`signup-1280`, `dashboard-empty-1280`)

- Observed. Sign up asks for three fields: name, email, password. Inline error on a short password, input kept (observed). Good form practice.
- Observed. After sign up the user lands on an empty dashboard and must press New website to reach the drop zone. The import page is one avoidable click away.
- Observed, positive. The empty dashboard says "Nothing goes live until you publish." That lowers the perceived risk of trying.

**Import completion** (`import-idle-1280`, `import-progress-1280`, `import-success-1280`, `import-refused-1280`, `import-success-landwind-834`)

- Observed. The drop zone states "A ZIP of your finished website · up to 25 MB · up to 2,000 files". The static-only rule sits in a closed disclosure, "How do I get a ZIP of my website?", below the drop zone.
- Observed. That disclosure says, under "Lovable, Bolt or v0": "These tools often download the project's code, which Pagehaven can't use on its own. Ask the tool, or whoever built your site, for the built website folder, then ZIP that folder."
- Observed. The refusal for `vite-source-only.zip` reads "This ZIP isn't a website Pagehaven can use. This ZIP contains source code rather than a finished website. Export the built static website files and try again." It opens the help automatically and focuses "Try another file". The text is clear. It leaves a nontechnical owner with no path they can follow.
- Read. Even a correctly built React or Vite export imports with a warning and cannot be edited: "This website builds its pages in the browser with JavaScript. It will publish and work, but Pagehaven can only edit text and images that are written in its HTML files." (`src/import/mod.rs:186`).
- Observed. Success says "Furnace Hill Coffee. 7 pages imported and ready to edit." with a thumbnail and Open editor. Landwind adds "We left out 4 files your website doesn't need." with a details list (`.gitignore`, `LICENSE`, `package-lock.json`, `package.json`). It does not say what to edit first.
- Observed. The progress state says "Checking your files… Pagehaven is checking every file. Server code and private files are left out." The bar shows almost no fill while checking.

**First edit** (`editor-resting-1280`, `editor-heading-selected-1280`, `editor-resting-834`)

- Observed. At 1280 the editor opens with no hint. Hovering shows a tinted section outline. At 834 and 390 the bottom bar reads "Select text or a picture to edit". The desktop layout, where most first sessions happen (assumption), has no equivalent.
- Observed. Click selects and shows "Heading · Saved" with Edit text, Style, Background, More. Edit text, typing and Enter saved, and Publish showed "Publish · 1". Replacing the photo opened a description panel with "Check the description still matches the new photo." and an Undo. The link popover offered every page by title. All four changes landed live (measured).
- Observed. An earlier run showed the old photo on the canvas after a replacement. A clean retest showed the new photo at once. The first run had set the hidden file input directly from the console, so that result was an artefact of the test and is not reported as a defect.

**First publication** (`editor-publish-popover-1280`, `editor-published-toast-1280`, `live-site-1280`)

- Observed, positive. The review says "Publish your website?", lists "Home: Link change, Image description, Image change, Text change", and shows the address. After publishing a toast says "Published. Visitors now see version 1." with View website.
- Observed. The popover covers the selected heading at 1280 and at 834 (`editor-publish-popover-834`). This matches the Studio record.
- Observed. After everything is published, Publish stays a solid primary button with no count. Pressing it opens "Everything is published."

**Return editing** (`dashboard-sites-1280`, `editor-version-history-1280`, `editor-version-history-390`)

- Observed. After sign in the dashboard shows "Published", the publish time and the address, and Edit opens the editor. A second edit and publish took 4 actions and made version 2 live (measured).
- Measured. With a part selected at 1280, the publish popover is capped at 331 px tall with 621 px of content, so the version list sits below an inner scroll (`editor-version-history-1280` against `editor-version-history-scrolled-1280`). Without a selection, at 390, the full list shows (`editor-version-history-390`).
- Observed. Version history uses "Make this version live" and "Edit from this version". The Studio record's ambiguity between "Publish again" and "Restore" is fixed.
- Observed. Settings also has a Versions tab, so history lives in two places.

### Journey heuristics (Nielsen, 0 to 4, single context, no detector)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Saved, count on Publish, live version and toast are clear. The checking bar barely fills |
| 2 | Match with the real world | 2 | "ZIP", "static", "built website folder", TXT and CNAME records. The owner of an AI-built site does not speak this |
| 3 | User control and freedom | 3 | Undo everywhere, versions and rollback. No password reset is the one trap with no exit |
| 4 | Consistency and standards | 3 | One visual system. Versions live in two places. A first-edit hint exists at 834 and 390 only |
| 5 | Error prevention | 2 | Incompatibility is discovered after sign up and upload, not before |
| 6 | Recognition rather than recall | 3 | Worded actions next to the selection |
| 7 | Flexibility and efficiency | 3 | Keyboard paths, command palette, focus mode (Studio record) |
| 8 | Aesthetic and minimalist design | 3 | Calm and consistent. The landing page under-explains rather than clutters |
| 9 | Error recovery | 2 | The refusal names the problem but gives no step a nontechnical owner can take |
| 10 | Help and documentation | 2 | One disclosure on import. Nothing on the landing page |
| | **Total** | **26/40** | Acceptable (65%) |

Cognitive load on the landing and import screens passes 7 of 8 checks. The failure is working memory: the requirement learned in the landing footer must be recalled at import. Personas: Jordan (first-timer) stops at the refusal or at the "built website folder" help text. Casey (mobile) completes the journey but meets 30 px dashboard targets. Riley (stress tester) finds that a source ZIP without `index.html` gets a different message ("We couldn't find a website in this ZIP…") from one with it (read, `src/import/detect.rs:146`).

### The ten highest-impact problems, ranked

Ranked by effect on reaching a published site, not on clicks.

1. **The most common AI builders produce ZIPs that Pagehaven refuses or cannot edit.** Lovable, Bolt and v0 downloads are described by the app itself as "the project's code" (observed). Built React or Vite exports import but are not editable (read, `src/import/mod.rs:186`). The share of the target audience with such exports is an assumption. It is probably large for segment (a), because these are the tools named in `PRODUCT.md`. This caps import completion and first edit for the brief's headline audience.
2. **The requirement is discovered after sign up.** The landing page never says "HTML pages" before the CTA, never names compatible sources, never names incompatible ones (observed). An owner learns it at the drop zone help or from a refusal, after giving an email (observed). Error prevention 2 of 4.
3. **No account recovery, and the app says so.** Sign in tells a locked-out owner to "create a new account with another email address" (observed). Their published site stays in the old account (read: no transfer exists). This hurts trust at sign up and return editing, and it blocks handing a site to a client.
4. **The landing page does not argue the case.** One CTA, three short sections, no objection handling (price, compatibility, ownership, what happens to my site), no repeat CTA, no closing section (observed). CRO dimensions 6 and 3.
5. **The landing page promises custom domains that production keeps off.** "Publish… at a Pagehaven address or on your own domain" (observed). `PAGEHAVEN_CUSTOM_DOMAINS` defaults to `false` in production, which blocks adding, verifying and serving custom hosts (read, `config/production.yaml:48`, `src/app.rs:135`). A claim the product cannot keep at launch.
6. **The demo invites an action it cannot perform.** "Click the headline, choose Edit text and type" sits under a static picture (observed). The best moment to show time to value is spent on a picture.
7. **No price and no "free" anywhere** (observed). Billing does not exist (read). Visitors cannot tell whether trying costs money. Zero-price and regret aversion both point the same way: an honest "free while in early access" (if the owner confirms it) removes a question that otherwise stops sign up (assumption).
8. **Two avoidable hops between sign up and first edit.** Sign up lands on an empty dashboard, not the drop zone, and import success needs Open editor before the site appears (observed). The success screen does not name a first edit (observed).
9. **No first-edit guidance on desktop.** 834 and 390 say "Select text or a picture to edit". 1280 says nothing (observed). The brief asks for one dismissible hint.
10. **The funnel cannot be measured.** No visitor records, failed imports leave no row, return visits leave no row, and the `import finished` log line has no user or failure reason (read, section 5). Every change in later phases will be judged blind unless this is fixed first.

Also observed, lower impact: the publish popover covers the selection at 1280 and 834; version history is clipped behind a 331 px inner scroll when a part is selected; the footer has no legal or contact links; generated addresses carry counters (`-9`, `-13`); 30 px dashboard targets at 390; the domain sheet's jammed "Keyboard shortcuts" button and mid-word DNS wrapping; at 390 the selection actions stay in the bottom bar while the settings sheet covers the page.

What works and should be kept: the plain voice, "Nothing goes live until you publish", the refusal's clarity and focus handling, the import report's skipped-files list, the photo description reminder, the publish review list, the "Published. Visitors now see version 1." toast, and the version wording.

---

## 3. Two customer segments

This section is reasoning from the brief, `PRODUCT.md`, the code and general behavioural models. It is not data. No customer was interviewed, and no traffic or usage numbers exist.

### (a) Independent creators and nontechnical founders with an AI-built site

- **Jobs to be done.** Change a headline, price, photo or phone number today, without writing a prompt, spending credits or asking a developer. Put the site at an address they can share. Keep it working.
- **Objections.** "Will my site work here?" "Is this another tool I have to learn?" "Will it break what the AI made?" "What does it cost?" "Can I get my site back out?"
- **Perceived risks.** Breaking a site they cannot rebuild (loss aversion; regret aversion). Losing access (made concrete by the no-reset message). Being locked in. Publishing a mistake in public.
- **Switching costs.** Low in money, high in effort and know-how: they must turn a builder project into a static ZIP, which the app's own help says the main tools do not give by default. The status quo is cheap: prompt the AI again and pay credits. Sunk cost and the IKEA effect make them attached to the site they generated, which works for Pagehaven only if the site arrives intact.
- **Models that apply.** Activation energy (the export step is the real barrier), status-quo bias (re-prompting is familiar), mental accounting (credits feel like a running cost, a subscription feels like a new one), zero-price effect, pratfall effect (stating the static-only limit openly can raise trust).

### (b) Freelancers and small agencies handing sites to clients

- **Jobs to be done.** Hand a finished site to a client who can change words and photos without calling them, and without breaking layout. Host it without running a server. Keep a way back when the client errs.
- **Objections.** "Can I manage several client sites?" "Can the client log in without seeing my other sites?" "Can I hand over or transfer ownership?" "Can I bill the client for it, or white-label it?" "What if the client locks themselves out?"
- **Perceived risks.** Client breaks the site and blames them. Support calls they cannot bill. A tool that disappears and strands client sites.
- **Switching costs.** Lower know-how cost: they can run a build, use HTML templates, or use static generators whose output is real HTML and fully editable. Higher workflow cost: today Pagehaven has no teams, no client seats, no transfer and no password reset (read, section 4), so a freelancer must create the client's account and hand over a password that cannot be recovered.
- **Models that apply.** Authority and liking (they recommend tools to clients, so the tool reflects on them), loss aversion on reputation, the default effect (whatever they set up, the client keeps).

### Recommendation

**Primary homepage segment: (a), defined by what they hold, not by which AI they used.** Speak to the owner who has a finished website as HTML files and wants to change it without code or credits. Name the sources that produce such files (an AI chat that writes an HTML page, an HTML template, a static export from whoever built the site) and name the ones that do not (a builder project's code, a site that builds its pages in the browser).

Reasons. The product's whole interface (plain words, worded actions, undo, versions) is designed for this owner (observed). The brief's positioning targets them. Segment (b) lacks the features its job needs (client seats, transfer, recovery), so a homepage led by (b) would promise more than the product does today (read).

How (b) is still served. One section on the homepage, "Building sites for clients?", says what is true today: export static HTML, import it into the client's own account, and the client edits only what they click, with every version kept. Freelancers are also the channel that turns (a)'s builder projects into compatible ZIPs, so this section helps (a) too (assumption).

Risk to this recommendation. If most of (a) arrives with Lovable, Bolt or v0 projects, problem 1 makes the primary segment the one least able to succeed (assumption). The cheapest way to find out is to measure refusals and script-built warnings once section 5's events exist. If refusals dominate, either the product adds a path for those exports, or the homepage leads with (b).

---

## 4. What the product truly does today

The copywriter may make claims only from this list. Paths are relative to the repository root.

### Import

- Accepts one ZIP upload. The browser checks the `.zip` name. The server checks the archive structure (`frontend/import.ts:60`, `src/import/zip.rs:95`).
- Limits: 25 MiB compressed, 2,000 entries (directories included), 100 MiB uncompressed, 20 MiB per file, 15 folder levels (`config/production.yaml:50`).
- Rejects absolute paths, `..`, backslashes, control characters, case-insensitive duplicates, symlinks and special files (`src/import/zip.rs:78`, `:193`, `:245`).
- Rejects encrypted ZIPs, compression other than stored or deflate, ZIP64 and multi-disk archives. Files over 1 MiB may not expand more than 200 times. Actual sizes and CRCs are checked during extraction (`src/import/zip.rs:118`, `:169`, `:222`, `:256`, `:310`).
- Keeps HTML, CSS, JS, JSON, source maps, manifests, text, Markdown, CSV, XML, SVG, raster images, icons, fonts, MP4 and WebM video, MP3, Ogg and WAV audio, PDF and WASM. Text must be UTF-8. Binary files get signature checks (`src/import/policy.rs:288`, `:144`).
- Leaves out, and lists with a reason: server code and configuration, secrets and credential files, keys and databases, version control, nested archives, OS and editor junk, `node_modules`, package manifests and source or tooling files. `.well-known` and `__pagehaven` are reserved. There is no blanket dotfile rule (`src/import/policy.rs:37`, `:201`, `:318`). Secrets and server code also raise a warning (`src/controllers/api.rs:229`).
- Finds the site at the top, inside one wrapper folder, or in `dist` or `build`. Offers a folder choice when several roots are valid (`src/import/detect.rs:17`, `:75`, `:132`).
- Refuses source projects with exactly: "This ZIP contains source code rather than a finished website. Export the built static website files and try again." (`src/import/mod.rs:78`). A source ZIP with no `index.html` anywhere gets: "We couldn't find a website in this ZIP. It needs an index.html file at the top level or in a dist or build folder." (`src/import/detect.rs:146`).
- Fails the import if a local script or stylesheet is missing. Warns about other missing files (`src/import/mod.rs:248`).
- Warns, and imports, a site that builds its pages in the browser. Only text and images written in the HTML can then be edited (`src/import/mod.rs:186`).
- Keeps the original ZIP on the server (`src/controllers/api.rs:244`).

### Editing

- Edit kinds: text, image, background image, image description, link, style, hide section, duplicate section, move section, remove section, page title and description (`src/document.rs:154`).
- Style is a fixed list: text and background colour, font size and weight, alignment, four paddings, top and bottom margin. Not free CSS (`src/document.rs:63`).
- Pages: add (copies an existing page), rename (rewrites links), delete. The home page cannot be renamed or deleted (`src/controllers/api.rs:584`, `:671`, `:718`).
- Website settings: name and address (`src/projects.rs:314`).
- Undo and redo across sessions. Changes save on their own, in order, with retries. Two tabs on one site: a stale change is refused (`src/drafts.rs:170`, `:247`, `frontend/editor/saves.ts:49`).
- Not editable: content created by the site's own JavaScript, script and style contents, form controls, iframes, embeds, canvas and math. Sections that contain scripts cannot be duplicated (`src/document.rs:375`, `:833`, `:896`).
- Replacement images: PNG, JPEG, GIF, WebP or AVIF, up to 8 MiB (`config/production.yaml:57`).

### Publishing and versions

- Publish creates a numbered version, removes editor markup and hidden sections, and stores files that never change afterwards. It does not run a build (`src/publish.rs:71`, `:97`, `:238`).
- "Make this version live" points visitors at an earlier version and keeps the current draft. It does not create a new version (`src/publish.rs:297`).
- "Edit from this version" copies that version into the draft as one undoable change. Visitors see nothing until the next publish (`src/publish.rs:336`).
- Live address: `<name>.<sites domain>`. Drafts are previewed on a separate origin (`src/settings.rs:155`, `src/sites.rs:15`).

### Custom domains

- Up to five hostnames per website. The owner gets a TXT record to prove ownership and an A or CNAME record to point the name (`src/domains.rs:13`, `:89`).
- Verification checks only the TXT record, by DNS over HTTPS. It does not check the A or CNAME record (`src/domains.rs:159`).
- There is no certificate status. TLS is expected from an external proxy (`src/app.rs:164`).
- **Off by default in production** (`PAGEHAVEN_CUSTOM_DOMAINS=false`, `config/production.yaml:48`). Do not claim custom domains until the owner switches it on.

### Limits

- Sign in: 10 tries per address and email per 15 minutes, 50 per address across accounts. Sign up: 10 per address per hour. Import: 20 per user per hour. Publish: 60 per user per hour (shared with rollback and website deletion). Image uploads 120, edits 3,000, DNS checks 30 per user per hour (`src/state.rs:68` onwards).
- These counters live in memory in one process and reset on restart (`src/state.rs:19`).
- 25 websites per account. Sessions last 30 days. Two imports or publishes run at once (`config/production.yaml:58`, `src/auth.rs:30`, `src/state.rs:110`).
- No storage quota per user beyond the import limits (`src/settings.rs:7`).

### Not supported

- No email verification, no password reset, no teams or shared access, no transfer of a website between accounts, no malware scanning, no analytics (`src/controllers/pages.rs:88`, `migration/src/m20261019_000001_initial.rs:12`).
- No source builds. No editing of JavaScript-built content.

### Pricing, billing, plans

None exist. A case-insensitive search of `src`, `assets/views`, `frontend`, `migration` and `config` for price, pricing, plan, billing, stripe, subscription, paid, trial and quota finds only a reserved `billing` address slug (`src/projects.rs:161`), the word "plan" in the HTML text algorithm (`src/document.rs:1352`) and "paid" in a layout comment (`frontend/editor/placement.ts:155`). The site must show no prices until the owner sets them.

---

## 5. Funnel data

The schema is one migration, `migration/src/m20261019_000001_initial.rs`. There is no `src/models` folder. The app queries SQLite directly through `src/db.rs`. Timestamps are Unix seconds.

| Stage | Source | Measurable today |
|---|---|---|
| Visitor | Nothing. No visit, page-view or referrer table, and the home handler records nothing (`src/controllers/pages.rs:30`) | **No** |
| Signup | `users.created_at` | Yes |
| Successful import | `imports.created_at`, joined to `projects.user_id`. The row is written only after a successful import (`src/controllers/api.rs:232`) | Yes for successes |
| Import attempts and failures | No row. Only the log line below, without user or reason | **No** |
| First edit | `edits.created_at` and `edits.user_id`. Every saved edit is a row; undone rows stay (`src/drafts.rs:191`) | Yes. Settings changes are not in `edits` |
| First publish | `releases.created_at` and `releases.user_id` | Yes. Rollbacks leave no event |
| Return session | `sessions.created_at` records sign in only. A returning visit on a live cookie leaves nothing, and sign out and sign in delete older rows (`src/auth.rs:161`, `:187`) | **Partly**, undercounted |
| Paid | No billing tables | **No** |

Deleting a website cascades to its imports, edits and releases, so history undercounts (`migration/src/m20261019_000001_initial.rs:44`).

Sketch query for first milestones per account:

```sql
SELECT u.id,
  u.created_at AS signup_at,
  (SELECT MIN(i.created_at) FROM imports i JOIN projects p ON p.id = i.project_id WHERE p.user_id = u.id) AS first_import_at,
  (SELECT MIN(e.created_at) FROM edits e WHERE e.user_id = u.id) AS first_edit_at,
  (SELECT MIN(r.created_at) FROM releases r WHERE r.user_id = u.id) AS first_publish_at
FROM users u;
```

Existing logging (JSON at `info` in production, `config/production.yaml:1`):

- `"import finished"` with `elapsed_ms` and `ok` (`src/controllers/api.rs:202`). It has no user, project or failure reason. Rate-limit, size, sign-in and project-limit rejections happen before it and never log it. A folder choice counts as `ok=false`.
- `"published"` with `elapsed_ms` and `files` (`src/controllers/api.rs:856`). No user or project.
- `"request failed"` for internal errors only (`src/error.rs:84`).
- Cleanup warnings: `"staging cleanup failed"`, `"deleted project file cleanup failed"`, `"invalid project cleanup identifiers"` (`src/store.rs:167`, `:194`, `:231`).

What cannot be measured, and why:

- **Visitors**, because nothing records a visit.
- **Import success rate**, because failed attempts leave no row and the log line lacks a user and a reason.
- **Return editing sessions**, because sessions are not touched on use and older rows are deleted.
- **Paid conversion**, because billing does not exist.

The smallest first-party fix is one `events` table (user, kind, project, reason, time) written at sign up, import attempt and outcome with reason, first edit, publish, rollback and once per day of editor use, plus a cookie-less daily count of landing page views. This is a suggestion for Phase D, not a measured requirement.

---

## 6. Anonymous import before registration

### How it could work

A visitor drops a ZIP without an account. The server runs the same import into temporary storage and returns a short-lived preview. Editing and publishing require an account. On sign up or sign in, the temporary import is claimed and becomes a normal website.

### What stands in the way today

- Both the import page and `POST /api/imports` require a signed-in user (`src/controllers/pages.rs:287`, `src/controllers/api.rs:117`).
- Sessions must belong to a user row, so there is no anonymous owner (`migration/src/m20261019_000001_initial.rs:20`).
- Import writes straight into permanent storage: the original ZIP under `archives/`, content in shared `blobs/`. Project deletion never removes blobs, and no scheduled cleanup exists (`src/store.rs:64`, `:158`).
- Preview links are bearer tokens valid for about 12 hours, with no revocation. The preview CSP allows any HTTPS script and HTTPS connections, and sends no `noindex`. Preview serving ignores the operator's suspension flag, which applies only to live sites (`src/preview.rs:17`, `:94`, `:160`, `src/sites.rs:19`).
- Rate limits are per signed-in user, in memory, per process (`src/state.rs:19`).

### Abuse risks

- **Storage.** Each anonymous import could keep up to 25 MiB of ZIP and 100 MiB of content with no account to limit it and no cleanup to remove it.
- **CPU.** Uploads finish before the two-job limit applies. Import decompresses, parses every HTML file, checks references and hashes files. There is no time limit per job.
- **Phishing.** Anyone could host a fake login page on a Pagehaven preview origin and send the link around for 12 hours. Forms are blocked, but scripts can still send typed data to any HTTPS server.
- **Identity churn.** Sign up has no email check, so per-account limits are already cheap to reset. An anonymous cookie would be cheaper still.

### What would need to change, with a rough cost

These are estimates in engineer-days, not measurements.

| Part | Work | Days |
|---|---|---|
| Anonymous ownership | Expiring temporary-import records, hashed capability cookie, separate temporary storage | 2 to 3 |
| Route and limits | Anonymous import route reusing `src/import`, per-address and global byte limits checked before upload, job deadline | 2 to 3 |
| Claim on sign up or sign in | Atomic, retry-safe transfer into a real website, respecting the 25-site limit | 1 to 2 |
| Cleanup | Scheduled expiry, races between claim and cleanup, crash recovery | 2 to 3 |
| Restricted preview | Short expiry, `noindex`, visible "temporary preview" mark, response-level sandbox, scripts restricted or off, revocation, no publish | 2 to 3 |
| UI, events, tests | Claim flow, funnel events, end-to-end tests for isolation and cleanup | 2 to 3 |
| **Total** | | **11 to 17** |

### Verdict: against, for now

Do not build anonymous upload in this round. It costs two to three engineer-weeks, adds a phishing surface on Pagehaven's own domains, and adds storage with no owner. The question it answers ("will my site work?") can be answered more cheaply:

1. **A compatibility check that runs only in the visitor's browser.** The page reads the ZIP locally, looks for `index.html`, `package.json`, `src/` components and an empty app root, and says "This will work", "This is source code" or "This will publish but only some text will be editable" before sign up. Nothing is uploaded, so there is no storage, CPU or phishing risk. It cannot repeat every server check (UTF-8, signatures, missing files), so the server stays the authority. Rough cost: 3 to 5 days if the detection rules are ported to TypeScript and kept in step with `src/import/detect.rs` by shared test fixtures (guess).
2. **A real, editable demo on the landing page**, using a fixture site and no upload, so the "Click the headline" caption becomes true. Cost depends on the design chosen in Phase B and is not estimated here.

Revisit anonymous import once section 5's events show how many visitors abandon between landing and sign up, and how many imports are refused.
