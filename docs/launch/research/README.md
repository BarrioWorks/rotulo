# Launch research: principles, competitors, directions and interactions

Phase A and B research for the launch redesign (`../brief.md`, `../PLAN.md`). It covers the parts that are new this round: the marketing homepage, onboarding and activation, the first edit, and trust and pricing. The editor research from the Studio round stands. This file builds on `../../studio/research/hci.md` (cited as HCI n), `../../studio/research/apple.md`, `../../studio/decisions.md` (cited as decision n) and `../../studio/identity/README.md`.

## How to read this

- **Evidence** means a study with participants, a measurement, or a normative standard such as WCAG.
- **Opinion** means expert guidance, a platform convention, or a call this document makes.
- **Observed** means seen on a page fetched this session. **Inferred** means concluded from what was seen.
- Every link below was opened this session. Pages that would not load are listed under Gaps. No participants took part in anything here.

## Contents

1. Published principles for the new surfaces
2. Competitor and reference patterns
3. Three visual directions (`directions/a`, `b`, `c`)
4. Interaction ideas, scored
5. Recommendation
6. Gaps and deviations

## 1. Published principles for the new surfaces

Fifteen findings. A delegate read them, and I re-opened the NN/g login-walls article to confirm its claim. The editor principles (direct manipulation, undo, spatial stability, touch targets, translucency) are in HCI 1 to 18 and are not repeated.

| # | Principle | Source | What it changes for Pagehaven | Label |
|---|---|---|---|---|
| 1 | People decide within seconds whether to stay. The risk of leaving is highest at first and flattens after about 30 seconds. Say what the product does within 10 seconds. | [NN/g, How long do users stay](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) | The hero headline plus one subline must name the action: import an exported site, edit it on the page, publish. PLAN done-line 1's 5-second test is the right check. | Evidence (NN/g reanalysis of Liu, White and Dumais, SIGIR 2010) |
| 2 | A homepage is an elevator pitch: say what the company does, show the real product, use specific link labels, and avoid autoplay and popups on arrival. | [NN/g, Homepage design principles](https://www.nngroup.com/articles/homepage-design-principles/) | A real editor screenshot replaces the current hand-built mock. The CTA reads "Import your website", not "Get started". No popups on arrival. | Opinion (expert critique). Only its load-time claims cite research |
| 3 | People scan in an F shape. They read the top lines, then the left edge. Lead headings with the informative words. | [NN/g, F-shaped pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) | Section headings start with the verb or noun ("Click a heading and type"), not a slogan. The three steps are a numbered list. | Evidence (eyetracking, 45 and 47 participants) |
| 4 | Trust rests on design quality, upfront disclosure of costs, complete current content and outside validation. Missing prices cost trust. Show sample prices for common cases when pricing is complex. | [NN/g, Trustworthy design](https://www.nngroup.com/articles/trustworthy-design/), [NN/g, Show prices for common scenarios](https://www.nngroup.com/articles/show-prices-for-common-scenarios/) | Once the owner sets prices, show them on the homepage or one click away, with what hosting includes. Until then, say plainly that pricing is not set (PLAN owner call). | Evidence, qualitative, no sample size given |
| 5 | People judge security by how a page looks. In a survey of 1,026 US adults, 19% had abandoned a checkout because they did not trust the site with card details. A homemade badge beat most real seals. | [Baymard, Perceived security](https://baymard.com/blog/perceived-security-of-payment-form) | Polish matters most on the publish and future payment screens. No badges. A plain sentence on what Pagehaven checks and refuses earns more trust than a seal. | Evidence (survey plus testing). Transfers only to a future payment step |
| 6 | Social proof can backfire. Small numbers signal that few people approve, and widgets clutter the page and pull attention from CTAs. | [NN/g, Social proof in UX](https://www.nngroup.com/articles/social-proof-ux/) | No user counts or testimonials until they are real and large. A real product demonstration is the trust signal for now. | Opinion (no study reported) |
| 7 | A login wall before people see value costs more than they believe the product is worth. Guest use first, account later. Separately, 18% of US shoppers abandoned because a site required account creation. | [NN/g, Login walls](https://www.nngroup.com/articles/login-walls/), [Baymard, Cart abandonment](https://baymard.com/lists/cart-abandonment-rate) | Supports costing an import preview before sign-up, which needs owner approval (PLAN owner call). If sign-up stays first, keep it to email and password and go straight to import. | Evidence, weak: NN/g tests give no counts, and Baymard's figure is for checkout, not sign-up |
| 8 | Tutorials in a deck of cards did not improve task performance. Teach in context and at the moment of need. Apple: "Teach through interactivity", postpone nonessential setup, and let people experience the app before asking for purchases. | [NN/g, Mobile app onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/), Apple HIG Onboarding (read through [the JSON endpoint](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json)) | One dismissible hint on the canvas after the first import, no tour (brief section 6). Any upgrade prompt comes after the first publish. | Evidence that tutorials did not help (NN/g research). Opinion for contextual tips and Apple's convention |
| 9 | Empty states should state status, teach in context and give a direct path to the key task. Do not show "No records" while still loading. | [NN/g, Empty states](https://www.nngroup.com/articles/empty-state-interface-design/) | A new account's dashboard is the import drop area itself, with what is supported. That makes PLAN done-line 3 a layout fact, not a link. | Opinion |
| 10 | A drop zone highlights only while a file it accepts is over it, shows when a file is not allowed, shows the task has started, and offers another way to do the same thing. | Apple HIG Drag and drop (read through [the JSON endpoint](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/drag-and-drop.json)), [NN/g, Drag and drop](https://www.nngroup.com/articles/drag-drop/) | `frontend/import.ts` already toggles `is-over` on dragenter. Add the "not a ZIP" state while dragging, and keep "Choose a ZIP file" as a real button. | Opinion (platform convention and expert analysis) |
| 11 | WCAG 2.2 SC 2.5.7 (AA): anything done by dragging can also be done with a single pointer without dragging. | [W3C, Dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | The ZIP area keeps its focusable file button. Applying 2.5.7 to an OS file drop is my inference, because the page does not cover file drops. The marketing before and after in direction C uses a range input, which works by click and by keyboard. | Evidence (normative standard) |
| 12 | Use a determinate progress indicator when the duration is known, avoid vague words like "loading", and allow cancelling. Error messages name the problem, give a remedy and keep the input. | Apple HIG Progress indicators ([JSON endpoint](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/progress-indicators.json)), [NN/g, Error messages](https://www.nngroup.com/articles/error-message-guidelines/) | Import names its stages ("Uploading 2.1 MB", "Checking files"). `import.ts` already has `uploading` with a percent and a `checking` step. The source-only refusal keeps its exact text (PLAN done-line 3) and adds the fix. | Opinion (convention and expert guidance) |
| 13 | WCAG 2.2 SC 3.3.8 (AA) bars cognitive tests at sign-in, including puzzle CAPTCHAs and blocked paste. SC 3.3.7 (A) bars asking twice for the same data in one process. | [W3C, Accessible authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), [W3C, Redundant entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) | Sign-up allows paste and autofill with correct `autocomplete`. Any abuse control on a future anonymous import must not be a puzzle CAPTCHA. | Evidence (normative standard) |
| 14 | SC 2.2.2 (A): motion that starts by itself and runs over five seconds needs pause, stop or hide. SC 2.4.11 (AA): a sticky bar must not entirely hide the focused element. | [W3C, Pause stop hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [W3C, Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | A homepage demo starts on a click or has a visible pause control. A sticky nav needs `scroll-padding-top`, which all three boards set. | Evidence (normative standard) |
| 15 | Targets: LCP of 2.5 s or less, CLS of 0.1 or less, INP of 200 ms or less at the 75th percentile. Never lazy-load the LCP image. Give it `fetchpriority="high"`, size every image, and control font swap shift. | web.dev [LCP](https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/blog/optimize-lcp/index.md), [CLS](https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/blog/optimize-cls/index.md), [INP](https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/metrics/inp/index.md), [fonts](https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/fast/font-best-practices/index.md). The live web.dev pages returned 403, so these are the archived sources from 2022 and 2023. | The hero screenshot is the LCP element. It ships at its real size with `fetchpriority="high"`, and every lower screenshot is lazy. The boards do this. A 1280 px PNG screenshot is 300 to 600 KB (measured file sizes in `docs/studio/final/screens/`), so production needs AVIF or WebP at two widths. | Opinion with a measured basis. The thresholds are Google's published standard |

### What these change, in one list

1. The headline names the action, and the hero shows the real editor (1, 2, 3).
2. No invented proof. The demonstration is the proof (5, 6).
3. Import is the first screen of a new account, and the empty dashboard is the drop zone (7, 9, 10).
4. One contextual hint, no tour (8).
5. Import names its stages and its refusals give the fix (12).
6. Accessibility rules for drag, sign-up and moving demos (11, 13, 14).
7. A performance budget for a screenshot-heavy hero (15).

## 2. Competitor and reference patterns

Two delegates fetched the pages. I re-opened the pages behind the claims that drive positioning: Tiiny.host's visual editor, htmlpub, Framer's free canvas edits and NN/g's login walls. Activation paths come from public help pages, because no account was created on any service. Each is marked observed or inferred.

### Website builders

| Product | Hero and proof | First 60 seconds | One interaction worth learning | Imports an existing site? |
|---|---|---|---|---|
| [Framer](https://www.framer.com/) | "Framer is the design agent for every step from idea to launch". CTAs "Get started for free" and "Download app". Proof is customer stories, a 99.99% uptime figure and Core Web Vitals numbers (observed). | Blank project, then an "Ask Framer…" agent panel ([help](https://www.framer.com/help/articles/how-to-build-a-website-from-scratch-with-framer-agents/), observed). | Edits made directly on the canvas cost no Agent credits ([lesson](https://www.framer.com/academy/lessons/build-your-first-site), observed and re-checked). | No ZIP or HTML import. A Chrome extension copies elements from a live page ([html-to-framer](https://www.framer.com/html-to-framer), observed). |
| [Webflow](https://webflow.com/) | "Build for what's next". CTAs "Get started" and "Talk to Sales". Logos, "300,000+ brands" and metric tiles (observed). | Describe, then review the page structure, then pick a theme ([AI site builder](https://webflow.com/ai-site-builder), observed). | Reviewing the structure before generating. | Figma sync only ([integration](https://webflow.com/integrations/figma-to-webflow), observed). The help centre returned 403, so the absence of HTML import is unverified. |
| [Squarespace](https://www.squarespace.com/) | "A website makes it real". "Trusted by 14 million entrepreneurs worldwide" (observed). | A questionnaire in the AI builder ([page](https://www.squarespace.com/websites/ai-website-builder), observed). | Four numbered steps from describe to publish set expectations up front. | Blog content only. Its help page says "It's not possible to import your last site's layout, design, fonts" ([help](https://support.squarespace.com/hc/en-us/articles/205814028-Importing-and-exporting-content), observed). |
| [Carrd](https://carrd.com/) | "Build one-page sites for pretty much anything". A strip of live demo sites. No social proof (observed). | Template grid with filters and a Blank Page tile ([build](https://carrd.com/build), observed). | Each template tile links to a live demo. | No. "The downloaded version of a site cannot be uploaded back" ([docs](https://carrd.com/docs/sites/downloading), observed). Carrd Pro exports are possible Pagehaven input (inferred). |
| [Readymag](https://readymag.com/) | The page renders only with JavaScript. The title is "the design tool for outstanding websites" (observed). Nothing else was visible. | Not observed. | Figma copy and paste ([forum post](https://forum.readymag.com/t/import-figma-to-readymag/4714), observed). | Figma only, as far as could be seen. The help centre returned 403. |
| [Durable](https://durable.com/) | "The complete AI business builder". "Get online in 30 seconds". "4.8 Stars on Trustpilot", "Trusted by 3 million businesses" (observed). | Idea to live site in under 30 seconds ([launch post](https://durable.com/blog/launch), observed). | Add a page by describing it. | No import mentioned (observed absence on two pages). |

**Pricing presentation (observed).** Framer has four site plans with Free and a yearly billing label ([pricing](https://www.framer.com/pricing)). Webflow has a monthly or yearly toggle with "Save up to 40%" ([pricing](https://webflow.com/pricing)). Squarespace has no free plan, a 14-day trial and Core marked "Recommended" ([pricing](https://www.squarespace.com/pricing)). Carrd is yearly only from $9 to $999 across 16 tiers ([pro](https://carrd.com/pro)). Durable has three plans, one marked "Most Popular", with a monthly or yearly toggle ([pricing](https://durable.com/pricing)).

### Tools that host or edit an existing static or AI-made site

| Product | Hero and proof | First 60 seconds | Visual editing | One interaction worth learning |
|---|---|---|---|---|
| Netlify Drop | The page is JavaScript only. Its meta description says "Drag and drop a folder, zip file, or single HTML file to publish a website instantly, no account required" (observed in raw HTML). | Drop a folder and get a preview URL with no account ([docs](https://docs.netlify.com/site-deploys/create-deploys/), observed). | None. Updating means rebuilding locally and dropping again (observed). | Netlify's docs describe an anonymous CLI deploy that can be claimed within one hour (observed). That is a working model for a guest import that becomes an account at the moment of keeping it (inferred). |
| Tiiny.host | The homepage is JavaScript only. The [Lovable page](https://tiiny.host/use-case/host-lovable-export) reads "Host a Lovable Export" with "2,000,000+ happy users" and named company logos as text (observed). | Run `npm run build`, zip `dist`, drop it, name the site (observed). | Yes. "Upload a Zip or single HTML file you want to edit", then "Click "Edit site", edit text or images and click Publish" ([page](https://tiiny.host/use-case/visual-html-editor), observed and re-checked). A "Code View" sits next to it. | The maker says they "deliberately not flooded the editor with 1 billion features" ([launch listing](https://www.hunted.space/product/tiiny-host/launches/tiiny-web-editor), observed). |
| [Static.app](https://static.app) | "One-click hosting solution for your static* website." Four named testimonials (observed). | Drop an archive. The Lovable page also asks the user to build first ([page](https://static.app/lovable-hosting), observed). | A code editor only (observed). | Per-tool landing pages with exact build steps and named failure causes (observed). Pagehaven can explain its source-only refusal the same way. |
| [Pinegrow](https://pinegrow.com) | "Visual editing for real HTML & CSS". "chosen by 10,000+ web professionals". The hero is a real app screenshot (observed). | Download, or a browser editor (observed). Publishes to other hosts and does not host itself. | Yes, a professional editor with code side by side. | Content Workspace splits styled text so "you can change the words while the line breaks, spans and icons around them stay intact" ([docs](https://pinegrow.com/docs/master-pinegrow/content-workspace/), observed). |
| [htmlpub](https://htmlpub.com) | "Build from your AI." / "Publish it instantly." Claims "300K+" users (observed and re-checked). | Paste HTML or drop a file. No ZIP is mentioned (observed). | "Click-to-edit text, images and layout on live pages - no code", plus custom domains (observed and re-checked). | Single-page loop, live in 60 seconds. |
| [HTML Design](https://html.design/ai-website-editor/) | "Upload any HTML template, edit text & images visually, and download" (observed). | Its page says "ZIP uploads are temporarily disabled" (observed). | Yes, click to edit, with no hosting. | Device preview at three sizes. |

### Craft references

- **[Craft](https://www.craft.do).** "Your space for notes, tasks, and big ideas". A real product screenshot sits inside an editorial frame (observed from file names; the framing itself is inferred). Lesson: show the real thing, framed with care.
- **[Linear](https://linear.app).** "The product development system for teams and agents". The hero is a real UI screenshot staged mid-workflow, with an issue moving to In Progress (observed). Lesson: show the product mid-task. All three boards show a heading selected or being edited, not an empty editor.
- **[Raycast](https://www.raycast.com).** "Your shortcut to everything." Shortcuts are printed inline in the selling copy (observed). Lesson: the marketing page can teach the real shortcuts the editor shows in its tooltips (decision 11).
- **[Arc](https://arc.net).** The page now promotes its successor Dia and states that Arc gets only Chromium updates (observed). The page shows no interaction worth taking. Arc's navigation ideas need a different source, which this round did not find.

### Patterns across all of them

- Every builder hero sells creation, mostly with AI. None of the six offers to adopt a site the visitor already has (observed).
- No builder imports a ZIP or a whole HTML site. Migration stories are Figma, WordPress or blog content (observed).
- Proof is scale numbers and logos. Pagehaven has none yet. Finding 6 says small numbers backfire, so the demonstration has to carry the proof.
- Activation is a prompt, a questionnaire or a template grid. Pagehaven's equivalent is one drop zone that ends in an editable page.
- Free entry is the norm (Squarespace is the exception). Custom domains are what every vendor charges for (observed on the pricing pages above).

### Who already does "upload a ZIP, edit visually, host it"

**Tiiny.host does, in its own words** (observed). It is the direct competitor. Its editor is one feature of a broad hosting product, with a code view beside it, and its Lovable flow asks the user to run `npm run build` (observed). htmlpub has click-to-edit and hosting for pasted or dropped single pages (observed). HTML Design has the gestures without hosting, and its ZIP upload is switched off (observed). Pinegrow is the strongest editor and does not host. Static.app and Netlify Drop host without visual editing.

**Honest positioning.** Pagehaven must not claim to be the only product that does this. It can lead on three things the code supports:

1. **Editing is the product.** Text, images, links and supported styles change on the page, and the owner never sees code (`frontend/editor/`). Competitors put code in view (Tiiny's Code View, Pinegrow, Static.app; observed).
2. **Draft and publish are separate, with version history.** Edits save as a draft and nothing goes live until Publish. Earlier versions can be restored (`frontend/editor/publish.ts`). None of the Tiiny, htmlpub or HTML Design pages fetched mentions a draft or version history. That is an absence on those pages, not proof the feature is missing.
3. **Honest import.** Static-only checks with a plain refusal and a fix for unbuilt React or Vite source (`src/import/policy.rs`, `frontend/import.ts`).

Framer already lets people edit on its canvas without spending AI credits (observed). So "no more AI credits" is true against the visitor's original AI tool, not against Framer. The copy should say "without asking your AI tool again", not "without credits".

## 3. Three visual directions

Each board is a self-contained HTML file. Each shows a homepage hero with a real Furnace Hill screenshot, a how-it-works strip and a slice of editor chrome. The boards reference `docs/studio/final/screens/`, `assets/static/fonts/onest-variable-latin.woff2` and `assets/static/img/icons.svg` by relative path. No font, icon or image was added. Screenshots are at 1280 and 390 px wide, full page, in `directions/shots/`.

The Onest file in the repo carries the full weight axis. In Chromium, canvas `measureText` gives a monotonic width from weight 100 to 900 (549 to 583 px for one string at 100 px, measured). So the display weights 650 and 720 the boards use need no new file. `app.css` declares `font-weight: 400 700` today, so using weights above 700 means widening that declaration.

| | A. The Ring | B. Blue Hour | C. Gallery Wall |
|---|---|---|---|
| Board | `directions/a/index.html` | `directions/b/index.html` | `directions/c/index.html` |
| Screens | `shots/a-1280.png`, `shots/a-390.png` | `shots/b-1280.png`, `shots/b-390.png` | `shots/c-1280.png`, `shots/c-390.png` |
| Thesis | The selection ring and caption the owner sees in the editor become the brand mark. The headline is drawn as a selected heading. | The marketing surface is drenched in Haven Ultramarine. Inside the app, blue appears once, when the site goes live, so blue comes to mean published. | Pagehaven steps back like a gallery wall. The owner's site is the only colour, and chrome becomes small opaque ink capsules. |
| Type | Onest, display 650, -0.04em | Onest, display 720 | Onest, display 500, larger |
| Colour strategy | Committed. Ultramarine owns one full-width stage under the product. Light cool ground elsewhere. | Drenched on marketing. Restrained in the app. | Restrained to monochrome. Ink CTA. Ultramarine only for selection and focus. |
| Glass | Shipped levels 2 and 3, unchanged | Shipped levels, unchanged | Level 2 replaced by opaque ink (`#1C1C22`) |
| Headline tested | "Your AI-built website. Yours to edit." | "Change your AI-made site without asking the AI again." | "Built with AI. Edited by you." |
| Signature moment | The ring draws once around "Yours to edit." (520 ms, a fade only under reduced motion) | A cascade of three real screens in the order the owner meets them, then a blue "is live" sheet | A before and after slider built from two real screenshots of one heading edit, operated by a range input |
| Needs owner approval | Nothing | A brand-level colour change: ultramarine as the page ground, a new deep token `#1F1A78`, and the blue live sheet | Two identity changes: opaque ink capsules instead of glass, and ink instead of ultramarine for the primary button |
| New font or icon | None | None | None |

**Contrast of new pairs (measured with the WCAG formula):** white on `#3730BD` is 9.05. B's secondary text `#DAD9F8` on `#3730BD` is 6.58, and its tertiary text `#B9B6F0` is 4.75. C's capsule text `#F4F4F7` on `#1C1C22` is 15.45, and its capsule meta `#B4B4C0` is 8.26. Every pair passes 4.5:1.

**Fonts and icons considered.** No direction proposes a new face or icon set. The Studio round compared seven OFL faces (Onest, Inter, Geist, Schibsted Grotesk, Manrope, DM Sans and Figtree) with links to each licence (`../../studio/identity/README.md`). The owner approved Onest on 2026-10-20 (decision 10). Lucide (ISC, with Feather MIT) stayed because no reason to leave it turned up. The brief's other candidates are Phosphor, Lucide and Tabler. Nothing in these boards needs a glyph the 43-symbol sprite lacks, so an icon change would add migration cost with no visible gain (opinion). If the owner wants a distinct display voice later, it needs approval and a licence check. No such proposal is made here.

**Brief section 4's Avoid list, checked against each board:** no purple-to-blue gradient, no decorative blobs, no stock illustration, and no repeated rounded cards. The steps are a ruled strip (A), a timeline (B) or a numbered list (C). Each board has one soft shadow per product image. No board puts a decorative icon beside a text label. Motion is one moment per board, with a reduced-motion path. The `::selection` colour, focus ring and underline offset are themed in every board.

### Risks per direction

- **A.** Its familiarity is a risk. It is the shipped look, louder. The ring device needs a little restraint on the real homepage, or every heading starts to wear a ring (opinion).
- **B.** Drenched colour is memorable, but white text on blue is harder to scan in long sections. The app and the marketing site then have different grounds, so the move from homepage to dashboard is a visible jump (opinion). The blue live sheet adds one more surface type to `publish.ts`.
- **C.** Opaque ink capsules are heavier over light sites and drop the floating material the brief asks for (brief section 7). Floating the chrome directly on the site, as the board does, brings back the covering problem the Studio round removed with its 52 px band (decisions, baseline fixes). The gallery restraint fights the brief's "bold, confident" ask on marketing (opinion).

## 4. Interaction ideas, scored

Scores run from 1 (poor) to 5 (strong). For cost, 5 means cheapest. Feasibility was read from `frontend/editor/` and `frontend/agent/`. The preview is a cross-origin sandboxed frame that talks to the editor only through the validated messages in `frontend/protocol.ts`, and the in-frame agent draws all marks in its own overlay layer. Every score is my judgment from reading the code (opinion). The feasibility notes name the code they rest on.

| # | Idea | Disc. | Benefit | Feasible | A11y | Perf | Cost | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | **Show what can be edited, once.** After the first import, the canvas briefly tints every editable part, and the brief's hint "Click any highlighted text to edit it" appears. The tint clears on the first selection or after a few seconds, and a "Show what I can edit" item in the hint and the palette repeats it. | 5 | 5 | 4 | 4 | 4 | 4 | 26 |
| 2 | **Each change in the publish review shows itself.** Each row in "Publish your website?" is a button. Pressing it opens that page and pulses the changed part on the canvas, so the owner sees exactly what will become public. | 4 | 4 | 4 | 4 | 5 | 4 | 25 |
| 3 | **The empty dashboard is the drop zone, and a ZIP can be dropped anywhere on it.** A new account lands on the import area itself. Dragging a file anywhere over the window shows one full-window target, with "That isn't a ZIP" shown while dragging the wrong file type. Named stages follow the drop. | 4 | 4 | 5 | 4 | 5 | 5 | 27 |
| 4 | **Before and after on the homepage.** Two real screenshots of one edit, compared with a range input (direction C's board, working). | 4 | 3 | 5 | 4 | 4 | 5 | 25 |
| 5 | **Instant check for unbuilt source before upload.** Read the ZIP's file list in the browser and refuse a source-only project before a 25 MB upload, with the server keeping the authoritative check. | 5 | 3 | 3 | 5 | 4 | 3 | 23 |
| 6 | **Find text on this page.** A palette entry searches the visible page's words and selects the element that contains them. | 2 | 3 | 4 | 4 | 4 | 4 | 21 |
| 7 | **Drop a photo onto a photo on the canvas to replace it.** | 3 | 4 | 2 | 4 | 4 | 2 | 19 |
| 8 | **Magnetic selection indicator.** | 2 | 1 | 3 | 2 | 3 | 3 | 14 |

### Feasibility notes

1. The agent already lists every editable part in `stops()` (`frontend/agent/agent.ts:591`) and draws hover and selection boxes in a shadow-root overlay. This needs one new editor-to-agent message, such as `show_editable`, added to `editorMessages` in `protocol.ts`. The agent draws boxes for visible stops only, capped at a fixed count, and redraws on scroll in an animation frame. This direction needs no change to `canvas-policy.ts`, because the policy filters agent-to-editor messages. Reduced motion shows the tint with no fade. The hint goes to the existing live region. The canvas hint in `canvas.ts:410` to `:428` already shows timed phone and preview hints. The tint uses the existing hover style, so it does not depend on hover input (HCI 17).
2. `LoggedChange` holds only `{label, page}` (`state.ts:59`). It needs the element id, which `edits.ts` knows at edit time. Ids are stable because `src/document.rs` stores `data-ph-id` in the document. The `reveal` message with `pulse` already exists (`protocol.ts:214`, `agent.ts:596`). Limit: the change list is empty after a reload (Studio README, known limits), so rows only reveal changes from this session.
3. `import.ts` already runs dragenter, dragover and drop on the drop zone, and has the `uploading` and `checking` steps. This moves the listeners to the window on the import and empty-dashboard pages and adds a wrong-type state while dragging, by reading `dataTransfer.items[0].type`. Browsers do not always report a ZIP's type during a drag, so the check is advisory until the drop (inferred).
4. The working version is in `directions/c/index.html`. It needs two matched screenshots and no autoplay, which avoids SC 2.2.2 (finding 14).
5. The server already classifies `package.json` and other tooling as `Source` (`src/import/policy.rs:51`, `:267`). A client copy would need a hand-written ZIP central-directory reader or a dependency, and its refusal text must match the server's word for word (PLAN done-line 3). The gain is time saved on large uploads only.
6. The agent can search its own document. Other pages would need the server. This is low on discoverability because it lives in the palette (HCI 16).
7. Drag events over a cross-origin frame go to the frame, not the editor. The agent cannot upload, because it has no credentials and runs in the sandbox. Passing a `File` through `postMessage` would widen the protocol to binary input that the imported site's own scripts could also send. That is a security cost. The Replace image button already covers the task.
8. Rejected. It needs hover and motion, does nothing on touch, and has no shown benefit (HCI 17 and the HCI warning on idea B). Decision 12 already settled it.

### Rejected as decoration

- **Magnetic selection** (8). No demonstrable benefit, as above.
- **An autoplaying hero video.** NN/g advises against motion on arrival (finding 2), and SC 2.2.2 would require a pause control (finding 14). The real screenshot plus a click-to-play recording does the same job.
- **Confetti or a celebration on publish.** Delight should be proportional to effort (Impeccable `delight.md`). Publishing already gets a toast with View website (`publish.ts:120`). Direction B's live sheet is the most this moment should get.
- **Parallax or scroll-revealed sections on the homepage.** No information is carried, and it costs INP and CLS risk (finding 15).

### Top three

1. **Show what can be edited, once** (idea 1). It targets the brief's success criterion, "complete their first edit without instructions", directly, and it is the hint the brief itself proposes. Evidence: finding 8 for teaching in context (NN/g research found tutorials did not help). The specific design is opinion.
2. **The empty dashboard is the drop zone** (idea 3). It makes PLAN done-line 3 true by layout and costs the least. Evidence: finding 9 (opinion-grade) and finding 10 (convention).
3. **Each change in the publish review shows itself** (idea 2). It answers brief section 8, "Before publishing, show what will become public", with the owner's own changes on their own page. It reuses `reveal`. The benefit is opinion. No study here measures it.

## 5. Recommendation

**Direction A, The Ring, raised with two grafts.**

1. **From C, the before and after slider** as the homepage's product demonstration below the hero. It is real, operable, needs no autoplay and is cheap (idea 4). C's ink chrome and ink CTA are not taken.
2. **From B, "blue means live"** as an option for the owner. The publish success sheet in ultramarine is one surface and needs no change to the editing chrome. Default it off until the owner approves (PLAN owner calls).

**Why A.** It needs no approval, so phase C can start at once (fact: no new asset or token). The page's most recognisable mark is the actual object the visitor will meet in the editor, so the homepage teaches the product while selling it (opinion, grounded in finding 2's "show the real product"). It keeps decisions 9, 10 and 13 intact, so the editor work from the Studio round stays coherent (fact). B is the more memorable page, but it splits the marketing site from the app and spends brand equity on a colour change the owner has not asked for (opinion). C is the calmest, but it reopens the chrome and glass decisions the Studio round measured and settled (fact: decision 9 and the identity measurements).

**Positioning angle.** "Your AI-built website. Yours to edit." stays as the headline. The subline names the mechanism: "Import the ZIP your AI tool exported. Click any heading, photo or link to change it, then publish to your own address." Lead the homepage with the independent creator or nontechnical founder who already has an exported site. Keep a freelancer handover line lower on the page. The handover need is real for that segment (Pinegrow's CMS mode exists for it, observed), but Pagehaven has no client roles to show today, so the claim would outrun the product (fact: no roles in the code). Segment choice is opinion, and the auditor's segment findings should override it.

**"AI built it. Now you own it."** I recommend against this as the headline. It does not say what the product does, which fails finding 1's ten-second test. "Own" also reads as a claim about rights to code and assets, which the brief warns against (brief section 5). Both points are opinion.

**Against competitors.** The honest angle is "editing first, hosting included", not "the only one". Tiiny.host already makes the upload, edit and host claim (observed). Pagehaven's truthful differences are on-page editing without code in view, draft separate from publish with version history, and an import that refuses what it cannot run and says why.

### Expected trade-offs

| Trade-off | Evidence or opinion |
|---|---|
| A is the least surprising of the three. Its boldness lives in scale and one colour field, not in a new world. A visitor who knows the current page will see an evolution, not a rebrand. | Opinion |
| The ultramarine stage puts a large saturated area right under the product screenshot. The screenshot's own warm palette sits against it, and that pairing has not been tested over other imported sites. | Observed for Furnace Hill only. Inferred for others |
| A display weight of 650 at up to 112 px needs the `@font-face` range widened from `400 700` to `100 900`. The bytes do not change, because it is the same file. | Measured axis. The file size is unchanged |
| A 1280 PNG hero is 572 KB (the measured size of `editor-heading-selected-1280.png`). Production must encode AVIF or WebP at two widths, or the LCP target is at risk. | Measured file size. The LCP effect is inferred |
| The before and after graft needs two screenshots captured in the same state. They must be regenerated whenever the editor chrome changes, or the demo goes stale. | Inferred |
| Leading with one segment leaves agencies with a secondary line until client roles exist. | Opinion |

## 6. Gaps and deviations

- **Pages that would not load.** These are the live web.dev LCP, CLS, INP, font and responsive-image pages (403, so archived GitHub sources were used), [nngroup.com/articles/pricing-pages/](https://www.nngroup.com/articles/pricing-pages/) (404), NN/g's forms top-10 article (404), and the Webflow and Readymag help centres (403). Also the Netlify Drop, Tiiny.host homepage and Tiiny pricing pages (JavaScript-only shells), Readymag's homepage and pricing (JavaScript-only), and Pinegrow `/pricing` and `/buy` (404). No claim rests on any of them.
- **Activation paths** for competitors are read from public help pages. No account was created, so the first 60 seconds are partly inferred, as marked.
- **The Impeccable launcher was not run,** as instructed. Its new-work flow requires `concept-seed` before directions. That did not run either, so the three directions were derived by hand from the brief, `DESIGN.md` and the identity research, and no seed reference exists.
- **The board server ran from the repo root, not `docs/launch/research`.** The boards reach `docs/studio/final/screens/` and `assets/static/` by relative path, and a server rooted at `docs/launch/research` cannot serve paths above it. The port, bind address and run-in-background setup were as specified. The server was stopped after capture.
- **Browser coverage.** All captures were taken in Chromium through the T3 preview. No Safari, Firefox or real device was tested.
- **Not measured.** The boards were not run against an LCP or CLS budget. Their contrast was computed (section 3), not composited over photos. The glass in A and B is the shipped material, which the Studio round already measured.
