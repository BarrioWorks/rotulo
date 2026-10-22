⚠️ DEGRADED: single-context expert review. This is independent critic B within the requested two-critic review. No nested assessments or Impeccable launcher or detector were run.

# Phase G critique B

Reviewed 20 October 2026. Repository HEAD: `c94aec9`. No participants took part. These are expert judgments and conversion hypotheses, not measured customer outcomes. I did not read `a.md`. No application files were changed. No commit was made.

Method: Impeccable critique and audit, CRO, copywriting with the AI-tells reference, and marketing psychology. The user's requested scope and report format take precedence over skill orchestration and persistence instructions. Questions skipped because this is a delegated, read-only review with a specified deliverable.

I read brief sections 4 to 9 and its definition of done, decisions, PLAN, and the baseline audit. I inspected the requested views, marketing.css, app.css, editor.css, import.ts, publish.ts and canvas.ts. I also checked export help, screens.css, the canvas agent, and publishing code where needed.

The T3 browser was available after opening a fresh incognito tab. I inspected surfaces at 1280×800 and 390×844. This was viewport emulation with a desktop pointer, not a physical phone or synthesized touch test. No screen reader, reduced-motion emulation or full contrast scan was run. Accessibility scores are provisional. Coarse-pointer CSS enlarges many controls, so the 36 px live-sheet controls seen in the narrow desktop viewport are not evidence of a physical-phone failure.

## 1. The five-second test

From the hero alone:

- **What:** Rótulo imports an existing website ZIP, lets you change its visible content, and publishes it.
- **Who:** Someone with an AI-made website delivered as HTML files who wants to stop asking the AI for small changes.
- **Next:** Press **Import your website**. The destination is account creation, followed by import.

**Verdict: pass for basic comprehension at both sizes. Partial pass for qualification.** The HTML requirement is visible. The important exclusion is not: a built JavaScript app may publish but have almost nothing editable. On mobile, the compatibility navigation disappears. This is an expert reconstruction, not an uncontaminated five-second participant test. I had already read the brief.

The comparison slider responded to arrow keys at both viewport sizes. On desktop its value changed from 70 to 71 and updated the split style. At 390 it changed from 70 to 69. Touch dragging remains untested.

The blue field, large Onest type and selection caption make the homepage recognisable. The real coffee site makes the product tangible. The desktop fold spends most of its space on the promise. The edited heading in the screenshot is still below it.

## 2. Scores per surface

Scale: 1 = obstructive, 2 = weak, 3 = adequate, 4 = strong, 5 = exceptional. Each cell gives its reason. These scores do not certify accessibility.

| Surface | Hierarchy | Typography | Colour and material | Copy | Conversion clarity | Trust and honesty | Accessibility | Responsiveness |
|---|---|---|---|---|---|---|---|---|
| Homepage | **4:** CTA stands out; proof starts late. | **4:** Strong display/body contrast. | **5:** Blue field and real editor form a coherent identity. | **4:** Concrete actions; a few broad assurances. | **3:** Fit restrictions arrive after the pitch. | **3:** Honest price and sample labels; no operator contact. | **4:** Named range, alt text and visible focus. | **4:** Both folds retain CTA; mobile loses compatibility navigation. |
| Compatible exports | **4:** Clear sections and useful file tree. | **4:** Readable body; compact navigation. | **4:** Restrained document surface follows the brand. | **4:** Specific rules; template advice overgeneralises. | **2:** Import CTA is at the end of a long document. | **4:** Retention and conditional domains are disclosed. | **3:** Semantic sections; tree needs horizontal scrolling. | **4:** No page overflow; mobile contents delays the answer. |
| Sign up | **4:** One form and one action. | **4:** Legible fields; desktop title wraps heavily. | **4:** Opaque form suits sensitive input. | **4:** Explains next step and password limitation. | **4:** Submission lands straight on import. | **3:** No privacy or operator explanation near email collection. | **4:** Labels, autocomplete and password visibility control. | **4:** Form fits both sizes. |
| Sign in | **4:** Familiar, focused arrangement. | **4:** Clear labels and readable input. | **4:** Consistent neutral material. | **4:** Honest about missing reset. | **4:** Successful return reaches saved sites. | **3:** No help route for a locked-out owner. | **4:** Labels and current-password autocomplete. | **4:** Narrow layout remains usable. |
| Import and refusal | **4:** Drop area is clear after the requirements. | **4:** Readable prose and filenames. | **4:** Calm surface; error has distinct treatment. | **3:** Accurate refusal; recovery still requires technical interpretation. | **4:** Clean import opens editor directly. | **3:** Private-file wording omits retained original ZIP. | **4:** File label, status and focused retry control. | **4:** Narrow refusal and drop area stay contained. |
| Dashboard | **4:** Site, status and next action are clear. | **4:** Names and metadata have separate roles. | **4:** Actual site image carries the colour. | **4:** Plain status and address wording. | **4:** Whole site card opens editing; import remains visible. | **4:** Published state and date match the journey. | **4:** Named actions and enlarged narrow-screen buttons. | **4:** Single-column site card works at 390. |
| Editor and welcome | **4:** Canvas leads; local actions follow selection. | **4:** Compact chrome remains readable on desktop. | **5:** Neutral glass keeps the imported site dominant. | **3:** Highlight hint outlasts its visual referent. | **4:** Selecting and editing are discoverable. | **4:** Saved and unpublished states stay separate. | **3:** Keyboard canvas instructions exist; transient visual guidance needs work. | **3:** Narrow layout works; a persisted computer canvas can be tiny. |
| Publish, live sheet and history | **4:** Confirmation action is prominent. | **4:** Status, URL and version are distinguishable. | **5:** Blue live sheet marks a meaningful outcome. | **3:** First publish understates whole-site scope after an edit. | **4:** Review, publish, view and copy form a clear sequence. | **3:** Review hides changes beyond eight. | **3:** Focus and announcements exist; full keyboard flow unverified. | **4:** Review and one-version history fit both sizes. |

**Observed journey.** Sign-up reached `/projects/new`. `vite-source-only.zip` was refused before upload with the required sentence. Help opened and Retry received focus. Furnace Hill imported seven pages and opened the editor directly. The welcome hint appeared. I selected its heading, entered Edit text, changed it and pressed Enter. Publish showed one text change. Publication opened the live sheet. Copy address changed to Address copied. The live homepage served “Ten bags ready for delivery”. Version history showed version 1. Sign-out and sign-in returned to the published site. A second import let me exercise editing at the narrow viewport and publication at desktop width. These were connected checks across both sizes, not two independently timed journeys.

**Keep:** direct sign-up-to-import routing, exact refusal wording, clean-import navigation, draft safety language, local editing controls, change-row reveal, the blue live confirmation and distinct version actions.

**Cognitive load:** moderate for import recovery. It fails the plain-language and working-memory checks. The owner must connect source, built output and editable HTML across separate explanations. The routine edit path is lighter. More than four visible editor actions exist, but they are grouped by task. That alone is not a reason to remove useful controls.

**Emotional journey:** the homepage gives confidence. Export recovery is the low point. A visible first edit restores control. The live sheet supplies a useful ending. This applies activation energy, regret aversion and the peak-end rule as hypotheses. No conversion lift is claimed.

## 3. Ten problems, ranked by effect on first publication

### 1. Compatibility is explained too late in the homepage journey

**Observed · P1.** Open the homepage at 390×844. Read the hero and follow Import your website. It says HTML files, but never explains the JavaScript-content exclusion. Compatible exports is hidden from the mobile header. At desktop width the detailed fit section starts around y=4254.

**Rule broken:** CRO qualification before commitment. Decisions 3 requires both exclusions before sign-up. The target owner may reasonably think their built AI app qualifies.

**Smallest fix:** add one short qualification line and a visible compatibility link beside the hero requirement. Say that project source needs a build, and JavaScript-generated content cannot be edited. Keep the primary CTA.

**Location:** `assets/views/home.html:21`; `assets/static/css/marketing.css:244`.

### 2. Source-project recovery still asks the owner to solve a technical problem

**Observed · P1.** Choose `vite-source-only.zip`. Read the automatically opened help. It says to ask for the built folder. It does not explain that a normal React build can still leave the intended content uneditable.

**Rule broken:** actionable error recovery and the curse of knowledge. A correct refusal is not yet a successful recovery path.

**Smallest fix:** keep the refusal unchanged. Add a separate recovery instruction asking for static HTML containing the visible text. State that a build alone may not provide this. Offer wording the owner can copy to the person or tool supplying the export. Do not promise a conversion service.

**Location:** `assets/views/partials/export_help.html:17`; `assets/views/marketing/compatible.html:68`; `frontend/import.ts:377`.

### 3. First-publish review loses its whole-site warning once there is an edit

**Observed · P1.** Import Furnace Hill. Edit one heading. Open Publish. The review lists Home and text change. The site has seven pages, all about to become public. The explicit whole-website explanation is absent.

**Rule broken:** error prevention and clear scope at a consequential action. A change list should not stand in for publication scope.

**Smallest fix:** always show “This publishes all 7 pages of your website” on first publication. Keep the change list underneath it. Use the actual page count.

**Location:** `frontend/editor/publish.ts:230`. The null-coalescing branch at line 231 suppresses the whole-site sentence when changes exist.

### 4. Private-file reassurance does not disclose that the original upload is retained

**Observed · P1.** Read the homepage private-files FAQ, then import requirements. Both say private files are left out. Only the compatibility document explains that Rótulo keeps the original ZIP.

**Rule broken:** trust through precise disclosure. “Left out” can sound like deletion. The owner should know this before handing over an archive.

**Smallest fix:** say “Excluded from the hosted site. Rótulo keeps the original ZIP, so remove secrets before uploading.” Link the fuller explanation. Make no malware-scanning claim.

**Location:** `assets/views/home.html:189`; `assets/views/partials/import_area.html:4`. Existing accurate disclosure: `assets/views/marketing/compatible.html:98`. Retention is documented in audit section 4.

### 5. The compatibility page has no early conversion action

**Observed · P2.** Open `/compatible-exports`. At desktop width, the first Import your website button is around y=4210. At 390 it is around y=5866. The header offers Sign in. A visitor who has already recognised a compatible ZIP must keep searching.

**Rule broken:** CRO next-action availability. A reference document still needs an exit into the promised task.

**Smallest fix:** repeat Import your website after the accepted ZIP example or in the contents area. Keep its destination and label consistent with the closing CTA.

**Location:** `assets/views/marketing/compatible.html:57` and `:124`; `assets/views/marketing/header.html:6`.

### 6. The welcome hint outlasts the highlights and cannot be dismissed directly

**Observed · P2.** Press Show what I can edit. Wait longer than four seconds without selecting. The tint clears. “Click any highlighted text to edit it” remains. There is no dismiss control. Clicking text selects it first, then Edit text starts typing.

**Rule broken:** visibility of current state, recognition and the brief's dismissible-hint requirement. The instruction points to something no longer visible.

**Smallest fix:** while the hint is active, retain highlights until selection or dismissal. Add Dismiss. Use “Choose highlighted text, then Edit text” if single-click selection remains the normal interaction. Preserve the repeat action.

**Location:** `frontend/editor/canvas.ts:138` and `:437`; `frontend/agent/agent.ts:806`; `assets/views/projects/editor.html:117`.

### 7. Publish review has no way to inspect changes beyond the latest eight

**Read · P2.** Make at least nine changes before publishing. The implementation renders the last eight and plain “and N more” text. The remainder cannot be expanded there. This edge case was not exercised in the browser.

**Rule broken:** informed confirmation and decisions 14. Every reviewable change needs a route to its location.

**Smallest fix:** add Show all changes in the review. Keep the initial eight-row limit for scanning. Retain the existing page-and-element reveal behavior.

**Location:** `frontend/editor/publish.ts:196` and `:215`.

### 8. The desktop hero hides the useful part of its product proof below the fold

**Observed · P2.** Open the homepage at 1280×800. The screenshot starts at y=618. Its selected heading is below the viewport. The visible fragment mainly shows editor chrome and the site's masthead.

**Rule broken:** evidence should support the primary benefit at the decision point. The text claims direct editing before the picture demonstrates it.

**Smallest fix:** crop or position the real screenshot so the selected heading is visible in the first viewport. Trim the gap or display scale enough to support that. Preserve the chosen blue identity and real-image requirement.

**Location:** `assets/static/css/marketing.css:30`, `:72`; `assets/static/css/app.css:197`; `assets/views/home.html:23`.

### 9. There is no identifiable operator or contact route near the commitment

**Observed · P2.** Read the footer and create-account page. Neither identifies who runs the service or supplies a contact route. The owner is being asked to entrust a website and an account that cannot be recovered by password reset.

**Rule broken:** ethical authority and regret reduction. Product screenshots prove the editor exists. They do not answer who is responsible for it.

**Smallest fix:** add a real operator name and a working contact link. Provide an accurate account/upload handling notice near registration. Use owner-supplied facts. Do not invent privacy guarantees or support response times.

**Location:** `assets/views/marketing/footer.html:3`; `assets/views/auth/register.html:23`.

### 10. The import screenshot teaches an obsolete extra step

**Observed · P3.** Read How it works on the homepage. Step 1 shows an Open editor result. Import the same clean sample. It opens the editor automatically.

**Rule broken:** consistency between sales evidence and the actual activation path. The old image makes a successful streamlined behavior look unexpected.

**Smallest fix:** recapture the real import state or show the actual editor arrival. Update the alt text with it. Keep a result-screen example only if it is explicitly identified as an import with items to review.

**Location:** `assets/views/home.html:51`; `frontend/import.ts:172` and `:423`.

## 4. Claims that lack a sufficient trace

Most capability claims trace to audit section 4. This includes editing kinds, automatic saving, persistent Undo, versions, import limits, account limits and conditional custom domains. The no-billing statement follows the recorded owner decision. I found no invented customer counts, testimonials, certifications or unconditional custom-domain promise.

| Claim | Location | Trace gap | Smallest honest wording |
|---|---|---|---|
| “One heading, a minute apart” | `assets/views/home.html:74` | No capture timestamps or timing evidence in audit section 4 or code. Decisions prohibit speed claims. Two images prove a change, not elapsed time. | “One heading, before and after”. |
| “An HTML template. Download the template’s ZIP. It already holds finished pages.” | `assets/views/marketing/compatible.html:55` | Product code validates individual archives. It cannot establish the contents of all template downloads. Some require tooling. | “Use a template download containing finished HTML pages.” |
| “Type over any text written in your pages” | `assets/views/home.html:134` | Audit section 4 excludes form controls, scripts, styles, frames and other content. “Any” exceeds that scope. | “Edit supported text and headings written in the HTML.” |
| “The rest of each page is published as you imported it” | `assets/views/home.html:177` | `src/publish.rs:109` parses, strips editor markup and serializes every HTML page. Audit section 4 explicitly excludes hidden sections. There is no literal unchanged-file guarantee. | “Your existing design stays in place. Undo an edit or restore a published version.” |
| “Every small change still goes back through the AI” and “hundreds of lines” | `assets/views/home.html:36` and `:40` | These are audience assumptions. The audit offers no interviews or source-size evidence establishing them for every visitor. | Qualify the situation: “When a small change sends you back to the AI”. Cut the arbitrary code-size assertion. |

Further qualifications matter even where an audit trace exists. “A built React or Vite site publishes and works” repeats the audited warning, but it should not read as a guarantee for every app or integration. “Private files are left out” describes a filename/type policy, not detection of every secret embedded in allowed files. The compatibility limits are defaults, not values read from the current host configuration. These are scope caveats, not evidence that the exercised fixture failed.

## 5. Generic, decorative or AI-sounding choices

The copy has a real voice: prices, opening times, photos, ZIPs, drafts and versions. Keep that specificity. There is little stock SaaS vocabulary. These observations identify formulaic effects, not authorship.

- “Your site is already built. Import it and make the first change” is a tidy closing formula. “Import your HTML ZIP” would use fewer words and reinforce the constraint.
- “How it works” is generic but useful navigation. Keep it. Generic labels are not automatically bad copy.
- “Every small change” and “hundreds of lines” perform certainty without evidence. Concrete examples already carry the argument.
- “Building sites for clients?” first promises a client workflow, then says there are no client logins. Clarify that the client uses their own ordinary account. The current sequence briefly sounds contradictory.
- The selection ring is specific to Rótulo. It earns its place around the hero words. Keep it as a recognisable editing cue, rather than repeating it on unrelated elements.
- Blue alone is not a differentiator. The imported coffee site and selection behavior supply the distinctive evidence. Move that evidence closer to the opening claim.
- Repeated screenshot panels extend the page. The comparison and editing crop explain the strongest benefit. The obsolete import crop supplies less value.
- The live sheet is purposeful, not celebratory decoration. It names the result and offers the two useful next actions. Keep it.

Persona checks: the first-time owner needs the compatibility caveat earlier. The source-project owner needs an achievable recovery request. The keyboard-dependent owner gets useful canvas instructions, but this review does not prove the full keyboard journey. The mobile owner sees working layouts, but real touch gestures remain untested.

Evidence screenshots are in [screens-b](screens-b/). Key captures: [desktop hero](screens-b/home-1280.png), [mobile hero](screens-b/home-390.png), [mobile compatibility](screens-b/compatible-390.png), [source refusal](screens-b/source-refused-390.png), [first-publish review](screens-b/publish-review-1280.png), [mobile review](screens-b/publish-review-390.png), [desktop live confirmation](screens-b/published-1280.png) and [mobile live confirmation](screens-b/published-390.png). Screenshot pixels may be doubled on the narrow viewport. Viewport dimensions above are CSS pixels.

## 12-line summary

1. No participants took part; this is an independent expert review.
2. The hero explains the product, audience and next action at both sizes.
3. Top problem 1: move compatibility exclusions beside the hero CTA.
4. Top problem 2: make source-project recovery ask for editable static HTML.
5. Top problem 3: state that first publish exposes the whole website.
6. Top problem 4: disclose retained ZIPs beside private-file reassurance.
7. Top problem 5: offer an early import CTA on the compatibility page.
8. Synchronise the welcome hint with its highlights and add dismissal.
9. Let owners inspect all changes before publishing.
10. Bring visible editing proof into the desktop fold and refresh import imagery.
11. Add real operator details and remove unsupported timing or universal claims.
12. Import, editing, publishing, live verification, history and return sign-in passed.
