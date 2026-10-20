# Phase G critique A: design and conversion

Critic A. One agent walked the running app at `http://127.0.0.1:5150` on 2026-10-20, at commit `c94aec9` on `main`. The browser was Chromium through the T3 preview, in an incognito profile. The test account was `critic-a-1020@example.com`.

No participants took part. Every judgment about people is the critic's own. Each finding is labelled:

- **Observed.** Seen on screen or read from the DOM during the walk.
- **Read.** Taken from code, with a file reference.
- **Inferred.** A conclusion about people or behaviour that this session cannot check.

Method. Impeccable's critique heuristics, audit and polish checklists, the `cro` framework, the `copywriting` rules and AI-tells list, and the `marketing-psychology` models were applied in one context. Impeccable's launcher and detector were not run, as instructed, so there is no deterministic scan. This is a single-context run, not Impeccable's dual-agent method. The second critic's file was not read.

Screenshots are in `screens-a/`. All were taken at the stated viewport.

The walk, in order. Homepage at 1280, 834 and 390, scrolled in full. Before and after slider driven by keyboard (ArrowLeft, Home) and by value. `/compatible-exports` at 1280 and 390. Sign up from the closing CTA, which landed on the import page. `vite-source-only.zip` chosen through the file input, then `furnace-hill.zip`. The editor opened directly with the first-edit hint. One heading edit. The publish review, one review row clicked, Publish, the "is live" sheet, version history. Editor at 834 and 390. Sign out, sign in, back on the dashboard.

One tooling note. Clicking "Choose a ZIP file" timed out in the automation because it opens a native picker. The files were then set on the `input[type=file]` directly. Drag and drop was not exercised.

---

## 1. The five-second test

Source: `screens-a/home-hero-1280.png` alone.

- **What it is.** A tool that lets you change a website an AI made for you by clicking on the page, instead of prompting the AI again. You import a ZIP, click a heading, photo or link, and publish.
- **Who it is for.** People who already have a finished website that an AI produced.
- **What to do next.** Press "Import your website". A quieter "See how it works" sits under it.

**Verdict at 1280. Pass.** The headline names the outcome and the audience in one line. The lead says how it works in three short sentences. There is one white button on the blue field. The product screenshot begins at the fold, so a visitor sees the real editor at once. The requirement ("For websites delivered as HTML files, in one ZIP up to 25 MB") is present but small: 15 px, at reduced opacity. Its contrast is 6.6:1, so it passes. It is the least visible line in the hero.

**Verdict at 834. Fail on reading order** (observed, `screens-a/home-hero-834.png`). The ring wraps only "without asking the AI again". At this width the line reads "Change your AI-made / without asking / website the AI again." The word "website" lands beside the ring's second line. A cold reader has to rebuild the sentence. See problem 2.

**Verdict at 390. Pass** (observed, `screens-a/home-hero-390.png`). The headline stacks cleanly. The full-width CTA spans y 456 to 508 of an 844 px viewport.

**The pass hides a targeting risk** (inferred). "AI-made website" will draw people whose site came from Lovable, Bolt or v0. The app's own import help says these tools "often download the project's code, which Pagehaven can't use on its own". Nothing on the homepage tells these visitors that. See problem 1.

---

## 2. Scores

Scale: 1 is poor, 3 is acceptable, 5 is excellent. Each score has a one-line reason.

### Homepage (`/`)

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | One headline, one lead and one CTA on the blue field. Below the hero, five sections repeat the same layout of a heading on the left and body on the right. |
| Typography | 4 | Onest display at 88 px, weight 680, tracking -3.09 px, sets well at 1280 and 390. The headline breaks wrongly at 834. |
| Colour and material | 4 | Ultramarine is used only for the hero and the closing CTA, as decided. Below the hero the page goes grey on grey and loses the brand. |
| Copy | 4 | The copy is concrete, uses the owner's own words and handles objections in a real FAQ. Two headings overreach: "Check your site before you sign up" and "One heading, a minute apart". |
| Conversion clarity | 3 | There is a CTA in the hero and one at the end of a 7,130 px page. The header has none. The slider's default state garbles the demo. |
| Trust and honesty | 4 | Limits, price and the lack of password reset are stated plainly. One overbroad FAQ answer, one timing claim and no operator or contact in the footer. |
| Accessibility and responsiveness | 3 | The slider has a label, `aria-valuetext` and a visible focus ring. The headline order breaks at 834, and the 22 px "See what works" link falls short of the 44 px target size. |

### Compatibility page (`/compatible-exports`)

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | A clear "On this page" index and an example ZIP tree first. Good order: accepted, refused, partial, left out, limits. |
| Typography | 4 | Readable measure. The code tree's comments are dim against the dark panel. |
| Colour and material | 3 | Same blue header field as home. The body is a plain document with no brand moment. |
| Copy | 4 | It quotes the real refusal texts word for word. "Where to get one" is useful. "Download the template's ZIP. It already holds finished pages." is too general. |
| Conversion clarity | 2 | The first CTA is at y 5866 of 6168 at 390. The header has only "Sign in". |
| Trust and honesty | 5 | Every limit traces to `config/production.yaml`. Custom domains are worded as the decisions require. |
| Accessibility and responsiveness | 3 | No horizontal page scroll at 390. The ZIP tree scrolls sideways (447 px of content in a 358 px box), and the box has `tabIndex -1`. |

### Sign up and sign in (`/register`, `/login`)

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | One card and one button. "Next, import a ZIP of your finished website" sets what comes next. |
| Typography | 3 | The 52 px "Create your account" wraps to two lines in a 400 px card and outweighs the form. "Sign in" appears three times on the sign-in card. |
| Colour and material | 2 | The ultramarine field and white button of the marketing pages give way to a grey page and a black button. The visitor clicked a blue promise and lands somewhere that looks different. |
| Copy | 4 | Honest password note. "Use 10 to 200 characters" sits before the field, where it helps. |
| Conversion clarity | 4 | Three fields, and sign up goes straight to import (observed). |
| Trust and honesty | 3 | "Pagehaven cannot reset passwords yet" is honest. Nothing on the card says who runs the service or how to reach them. |
| Accessibility and responsiveness | 4 | Labelled fields, a Show toggle, autofocus on name and a visible focus ring. |

### Import (`/projects/new`)

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 2 | Three paragraphs of rules come before the drop zone. The only action, "Choose a ZIP file", is an outlined secondary button. |
| Typography | 4 | Consistent with the app. Code names are set in monospace. |
| Colour and material | 3 | The dashed drop zone is clear. The progress bar barely fills while checking (`screens-a/import-progress-1280.png`). |
| Copy | 4 | It states what to upload and what is refused before upload, as DoD 3 requires. "Drop your website ZIP anywhere" makes no sense on a phone. |
| Conversion clarity | 3 | The path is right: sign up, import, then straight into the editor. The action is visually weak and sits at y 764 of 844 at 390. |
| Trust and honesty | 4 | The browser check refuses the Vite source ZIP with the exact server text, and focus moves to "Try another file". |
| Accessibility and responsiveness | 4 | Status and alert regions announce progress and refusal. The drop target is large. |

### Editor and first edit

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | The canvas gets most of the screen. The selection caption and contextual actions sit next to the heading. |
| Typography | 4 | Compact, consistent control labels. At 834 the site name truncates to "Furnace Hill C... / H...". |
| Colour and material | 3 | The glass islands read well. The "Show what I can edit" tint washes every element in violet, the owner's photos included. |
| Copy | 4 | "Heading · Editing", "Done" and "Publish · 1" are clear. "Heading · Saved" shows on a heading that nobody has changed. |
| Conversion clarity | 3 | Edit text, typing and Enter saved, in four actions. The hint is a 13 px chip in the bottom-left corner, far from the content. |
| Trust and honesty | 4 | Saved and published are kept apart. "Not published yet" is always in view at 1280. |
| Accessibility and responsiveness | 3 | Keyboard paths exist. At 390 the canvas shows the desktop layout scaled down, so body text renders at about 7 px. A leftover hint chip covers the site's content at every width. |

### Publish review, "is live" sheet and version history

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 2 | With a part selected, the review is cut to 151 px and scrolled to its bottom. The title and the change list are hidden. |
| Typography | 4 | Clear, though the address wraps mid-word in a narrow box. |
| Colour and material | 5 | The ultramarine "is live" sheet is the one memorable moment of the journey, and it is used only for that moment. |
| Copy | 3 | The review row reads "Home / text change", lower case and with no detail. Version history repeats its own name as a link and as a heading. |
| Conversion clarity | 3 | Publishing works in two clicks. Clicking a review row closes the review, so the owner has to open it again. |
| Trust and honesty | 4 | "1 change published. Visitors see it now." gives the address, View website and Copy address. |
| Accessibility and responsiveness | 3 | The inner scroll hides the content. Three date formats appear: "07:53 PM", "today, 07:53 PM" and "Oct 20, 2026, 7:53 PM". |

### Dashboard (return visit)

| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | The site card shows Published, the time, the address, Edit and View website. |
| Typography | 4 | Consistent with the app. |
| Colour and material | 3 | Black primary button, a pale card on grey. Neutral, as decided, with no brand character. |
| Copy | 4 | "1 of 25 websites. Open one to change it." |
| Conversion clarity | 4 | Sign in returns here, and Edit opens the editor (observed). |
| Trust and honesty | 4 | The real live address is shown. |
| Accessibility and responsiveness | 3 | At 390, the site title link is 28 px tall and the address link 24 px, both under 44 px. |

---

## 3. The ten most important problems

Ranked by effect on reaching a first published site.

### 1. The headline invites the AI-builder audience that the product most often refuses, and no page names those builders before sign up

- **Label.** Observed (copy), read (code) and inferred (share of visitors).
- **Reproduction.** Read the hero: "Change your AI-made website without asking the AI again." Scroll the homepage and `/compatible-exports`. Neither page names Lovable, Bolt or v0. Sign up and import `fixtures/zips/vite-source-only.zip`. Only now does the opened help say "Lovable, Bolt or v0. These tools often download the project's code, which Pagehaven can't use on its own." The advice that follows, "Ask the tool, or whoever built your site, for the built website folder", gives a nontechnical owner no step they can take.
- **Screenshots.** `screens-a/home-hero-1280.png`, `screens-a/home-fit-834.png`, `screens-a/import-refused-vite-1280.png`.
- **Rule broken.** Nielsen 5, error prevention. CRO message match and "Will this work for my situation?" objection handling. Brief section 6, "Do not claim universal compatibility". Decision 3 forbids naming these tools as compatible. It does not forbid naming them as usually refused.
- **Smallest fix.** Add one sentence to the "Refused" card in the fit section of `assets/views/home.html`, and to "Project code that still needs a build step" in `assets/views/marketing/compatible.html`. For example: "Downloads from Lovable, Bolt and v0 are usually this kind of project." Then end the import help in `assets/views/projects/new.html` with an honest stop, such as "If you can't get the built folder, Pagehaven can't edit this site yet." That costs some signups and saves failed imports. The owner should decide. The pratfall effect says stating the limit can raise trust (inferred).

### 2. At 834 the hero headline reads in the wrong order

- **Label.** Observed and read.
- **Reproduction.** Open `/` at 834 x 1112. The headline shows "Change your AI-made" on line 1, the ringed "without asking" on line 2, and "website" beside the ringed "the AI again." on line 3.
- **Screenshot.** `screens-a/home-hero-834.png`.
- **Rule broken.** DoD 1 requires the hero to work at 834. Impeccable's typography check that line breaks must not change meaning.
- **Smallest fix.** In `assets/static/css/marketing.css:35`, make `.mk-ring` a block (`display: block; width: fit-content;`) so it always starts its own line. Or add a `<br>` before the ring in `assets/views/home.html:13`.

### 3. With a part selected, the publish review shrinks to 151 px and scrolls to its bottom

- **Label.** Observed and read.
- **Reproduction.** At 1280 x 800, select the Furnace Hill heading, edit it and press Publish. The popover shows only the address, Cancel, Publish and Version history. "Publish your website?" and the "Home / text change" row sit above an inner scroll at `scrollTop` 222. In the DOM, `.ed-publish-pop` has `max-height: 151px` and `scrollHeight` 383. The "Everything is published" popover after publishing is cut the same way.
- **Screenshots.** `screens-a/publish-review-clipped-1280.png` and `screens-a/publish-pop-clipped-after-publish-1280.png`. The same popover with the cap removed is in `screens-a/publish-review-unclipped-1280.png`.
- **Rule broken.** Brief section 8, "Before publishing: show what will become public". Decision 14, clickable review rows. Nielsen 1. The audit recorded a 331 px cap. This build makes it worse.
- **Smallest fix.** In `frontend/editor/publish.ts:293`, shrink the popover only when the whole review still fits. Compare `box.y - top - 8` with `pop.scrollHeight`, not with 120. Otherwise let it overlap the selection. Also open the review scrolled to the top: `pop.scrollTop = 0` after focusing confirm with `preventScroll`.

### 4. The first-edit hint is easy to miss, its tint does not tell text apart, and part of it stays over the owner's site

- **Label.** Observed and read.
- **Reproduction.** Import Furnace Hill. The editor opens with two 13 px chips in the bottom-left corner: "Click any highlighted text to edit it." and "Show what I can edit". They sit over the site's "Recent posts" heading. Press "Show what I can edit". Every block turns violet, including the header, the nav links, the photo and whole sections, so "highlighted text" picks out nothing. Select the heading. The text chip goes, but "Show what I can edit" stays over "Tuesday is roast day" at 1280, 834 and 390. There is no close control.
- **Screenshots.** `screens-a/editor-first-open-1280.png`, `screens-a/editor-tint-1280.png`, `screens-a/editor-selected-1280.png`, `screens-a/editor-834.png`, `screens-a/editor-390.png`.
- **Rule broken.** Brief section 6 asks for "a subtle, dismissible hint" that guides "one meaningful action". Decision 11. Brief section 7, canvas first: no chrome over the owner's site. Impeccable's onboard guidance to put help next to the decision.
- **Smallest fix.** In `frontend/editor/canvas.ts`, hide `[data-show-editable]` after the first selection, and leave the repeat in the command palette as decision 11 allows. In `assets/static/css/editor.css:345-346` and `:489-490`, give the hint chip a border and shadow, place it centred under the top islands, and add a close button. Limit the tint to text and image targets, not whole sections. That last part needs the agent's tint selector in `frontend/agent/agent.ts`.

### 5. The import page's only action looks secondary and sits low

- **Label.** Observed.
- **Reproduction.** Sign up. At 1280 the drop zone starts at y 490 under a title, a lead and three paragraphs of rules. "Choose a ZIP file" is an outlined grey button. At 390 it sits at y 764 of 844, and the zone says "Drop your website ZIP anywhere" on a phone.
- **Screenshots.** `screens-a/import-idle-1280.png`, `screens-a/import-idle-390.png`.
- **Rule broken.** CRO "one clear primary action" and CTA hierarchy. Impeccable's hierarchy check that the main task is obvious. Hick's law and activation energy, on the step the brief calls the main activation moment.
- **Smallest fix.** In `assets/static/css/screens.css`, style the choose button as the primary ultramarine button. In `assets/views/projects/new.html`, cut the three paragraphs to one line plus the existing "Check compatible exports" link, and keep the "what is refused" sentence for DoD 3. Use "Choose your website ZIP" as the drop-zone title under the touch breakpoint.

### 6. Long marketing pages have no CTA between the hero and the end

- **Label.** Observed.
- **Reproduction.** The homepage is 7,130 px tall at 1280 and 8,719 px at 390. "Import your website" appears in the hero and in the closing section only. The header is static and offers only "How it works", "Compatible exports" and "Sign in". On `/compatible-exports` at 390, the first CTA is at y 5866 of 6168.
- **Screenshots.** `screens-a/compat-fold-1280.png`, `screens-a/compat-fold-390.png`, `screens-a/home-fit-834.png`.
- **Rule broken.** CRO "CTAs repeated at key decision points". DoD 2, "One primary action on every marketing page".
- **Smallest fix.** Add an "Import your website" link styled as a small button to `assets/views/marketing/header.html`. Add a CTA line under the fit section and after the compatibility page's "A ZIP that imports" example.

### 7. The before and after slider's default position splices two headings into nonsense

- **Label.** Observed and read.
- **Reproduction.** Scroll to "One heading, a minute apart". The default `value="70"` puts the divider through the middle of the edited heading. It reads "Ten ba|gs from / Finca L|ranjos, and / ...ey cost". At 50 the divider runs through the photo, which is the same in both shots, so nothing changes. Keyboard works: ArrowLeft and Home move it, `aria-valuetext` reads "0% before, 100% after", and focus shows a 2 px ring.
- **Screenshots.** `screens-a/home-slider-default-70-1280.png`, `screens-a/home-slider-default-390.png`, `screens-a/home-slider-50-1280.png`, `screens-a/home-slider-focus-1280.png`.
- **Rule broken.** Brief section 5, "a short, genuine product demonstration". Decision 16. Impeccable's specificity check that a demo shows the change.
- **Smallest fix.** In `assets/views/home.html:93`, set the default to about `55`, so the "after" heading shows whole and dragging right reveals the "before" heading. A better fix crops both images to the heading area, so the divider always crosses the change.

### 8. "Check your site before you sign up" promises a check that exists only after sign up

- **Label.** Observed and read.
- **Reproduction.** The fit section heading says "Check your site before you sign up". The section holds three static cards. The browser check that reads a ZIP (`frontend/import.ts:62` onward) runs only on `/projects/new`, which needs an account.
- **Screenshot.** `screens-a/home-fit-834.png`.
- **Rule broken.** Decision 4, every claim must match the product. The copywriting rule that claims must be supportable.
- **Smallest fix.** Rename the heading in `assets/views/home.html` to a claim the section keeps, for example "What imports, what imports with limits, what is refused". Wiring the existing browser check onto the public page is the bigger fix the audit costed at section 6. It is a product call.

### 9. Moving from the marketing pages to the app loses the brand at the moment of commitment

- **Label.** Observed. The effect on conversion is inferred.
- **Reproduction.** Press the white "Import your website" button on the ultramarine field. `/register` is a grey page with a black "Create account" button and a black logo. The import page and dashboard keep black primaries.
- **Screenshots.** `screens-a/home-hero-1280.png` against `screens-a/signup-1280.png`.
- **Rule broken.** CRO message match from CTA to destination. Impeccable's consistency check. Decision 7 keeps app chrome neutral. The auth pages are the hand-off, not the app.
- **Smallest fix.** In `assets/static/css/screens.css`, give the auth pages the ultramarine field from `marketing.css`, or at least an ultramarine primary button. Keep the app itself neutral as decided.

### 10. The footer gives no operator, contact, privacy or terms

- **Label.** Observed and read.
- **Reproduction.** Read `assets/views/marketing/footer.html`. It holds one sentence and the links Compatible exports, Create an account and Sign in.
- **Screenshot.** None; the footer's full content is quoted above.
- **Rule broken.** CRO trust signals near the commitment point. Marketing-psychology authority and regret aversion. A service that hosts a person's site, holds a password it cannot reset and keeps their uploaded ZIP should say who runs it (inferred).
- **Smallest fix.** Add the operator's name and a contact address to `assets/views/marketing/footer.html`. Privacy and terms pages are an owner task. Until they exist, a contact line is the honest minimum.

### Also seen, lower impact

- At 390 the editor canvas shows the desktop layout at about half scale, so the site's body text is unreadable for editing (observed, `screens-a/editor-390.png`).
- Clicking a publish review row closes the review instead of keeping it open beside the pulse (observed).
- "Heading · Saved" appears on a heading the owner has not changed (observed, `screens-a/editor-selected-1280.png`).
- Generated addresses still carry counters, as in `furnace-hill-coffee-13` (observed). The homepage example `furnace-hill.<domain>` is not what the product generates.
- The "is live" sheet makes "Close" the largest control, with View website and Copy address as equal outlined buttons (observed, `screens-a/live-sheet-1280.png`).
- Sign out returns to the homepage with no confirmation (observed).

---

## 4. Claims I could not trace

Each claim is checked against `docs/launch/audit/README.md` section 4 and the code.

| Page | Claim | Why it does not trace |
|---|---|---|
| Home | "One heading, a minute apart" | No timing was measured, and the screenshots carry no timestamps. It reads as a speed claim, which decision 4 bans. |
| Home | "If it is a folder of HTML pages, yes." (FAQ, "Will my website work in Pagehaven?") | Too broad. Audit section 4 lists failures for a folder of HTML pages: a missing linked stylesheet or script stops the import, text must be UTF-8, size and count limits apply, and JavaScript-built pages import with only part of them editable. The brief bans claiming universal compatibility. |
| Home | "publish to your Pagehaven address, such as furnace-hill.{sites_domain}" | Real addresses come from the site name with a counter. This import got `furnace-hill-coffee-13`. The example is not an address the product makes. |
| Home | "The rest of each page is published as you imported it." | Partly traced. `src/publish.rs` serializes each published document again (`document.serialize()`), so the bytes may differ from the import even where content does not (read). The audit's "Only what you touch changes" covers content, not bytes. |
| Home, compatibility | "Free to try" | Traces to decisions.md item 5, an owner default. It does not trace to code or audit section 4. "Try" suggests a later charge that does not exist. Owner call. |
| Compatibility | "An HTML template. Download the template's ZIP. It already holds finished pages." | Not guaranteed. Many template downloads ship source files. The Landwind fixture contains `package.json` and imports only because it also has `index.html`. |
| Home | "Check your site before you sign up" | No check runs before sign up. See problem 8. |

Every other claim on both pages traced to audit section 4 or to the code. That includes the limits table, the refusal texts, the left-out file list, the editable kinds, "Undo still works when you come back tomorrow", "Pagehaven keeps a copy of the ZIP you uploaded", the custom domains wording, the 25-website limit and the 20 imports and 60 publishes an hour.

---

## 5. Generic, decorative or AI-sounding

Most of the copy reads as written by a person who knows the product. It is specific, it uses the owner's words, and it states limits plainly. The weak spots follow.

**Design**

- Below the hero, the page uses one layout five times: a heading at 457 px on the left, body at 639 px on the right, alternating grey grounds. This is Impeccable's "perfect balance" pattern, and it could belong to any SaaS. The ring, the brand's one distinctive device, appears only in the hero. Decision 8 allows it "around the headline word that matters" elsewhere too.
- "How it works" with 1, 2 and 3 beside alternating screenshots is the stock SaaS steps section. The screenshots are real, which saves it, but the composition is the category default.
- The FAQ is a two-column grid of equal blocks. Equal weight hides the two questions that matter most for this audience: "Will my website work?" and "What if I forget my password?"
- The "Show what I can edit" tint washes the owner's own photos in violet. That is decoration over the owner's content, which the canvas-first principle forbids.

**Copy, per the AI-tells list**

- "One heading, a minute apart" is performed cleverness (capped) and is also untraced.
- "And the finished site still needs somewhere to live, at an address you can send to people." opens with "And" and trails into a comma clause, a trailing pile-on.
- "How it works", "What it costs" and "Questions before you import" are label headings (capped). The other section headings make claims, which is better.
- "Publish when it looks right" appears in the hero lead and again as step 3's title. The repetition reads as a template.
- "Pagehaven" is the subject of most sentences in the fit, FAQ and compatibility sections ("Pagehaven finds", "Pagehaven refuses", "Pagehaven leaves out", "Pagehaven warns"). These are abstract subjects. Making the owner the subject reads warmer: "You'll see a warning when you import it."
- No banned patterns were found. There are no contrast reveals, negation lists, colon reveals, em dashes in short copy, or hype words.

**Distinctive and worth keeping**

- The hero ring and "Heading · Saved" caption around the headline.
- The ultramarine "is live" sheet.
- The compatibility page quoting the refusal text word for word.
- The FAQ answer that says plainly "Pagehaven can't reset passwords yet."
