# Phase C critique: directions A, B and C

Agent E, independent critic. Written on 2026-10-20.

## Method

This is a single-context expert review. Impeccable's critique method calls for two isolated assessments plus its detector. The brief excluded the launcher, so the detector did not run and this review is one assessment. No real participants took part. Every task finding is an expert-review hypothesis, as brief section 15 requires.

Labels used on every claim:

- **Measured** means a number read in the browser or computed by a script I ran.
- **Observed** means something I saw in the browser or a screenshot.
- **Read** means I read it in source code.
- **Inferred** means my reasoning from the evidence. Treat it as a hypothesis.

What I did:

- I drove all three live prototypes (ports 8701, 8702, 8703) in the T3 preview browser at 1280x800 and at 834x1112. For B at 834 I added `?touch=1`.
- I ran `scripts/studio/measure.js` in each page and inventoried every visible control's rect with a script.
- I tested Tab order, Ctrl+K, Escape and F6.
- I computed glass contrast by compositing the shared tint over worst-case backdrops (`/tmp/critic-e/contrast.py`).
- I read `frontend/editor/canvas.ts`, `placement.ts`, `toolbar.ts`, `frontend/protocol.ts` and `frontend/agent/agent.ts`.
- I grepped the fixture zips for fixed headers and `vh` units.

The selection overlays are faked in all three prototypes. I ignored ring misalignment and judged the interaction model.

Counting rule (same as `baseline/README.md` section 4). Each click, each typed string, each key chord and each file choice counts as one action. Closing a dialog afterwards is not counted.

## 1. Scores

Scores run from 1 to 5. A higher score is better. For implementation risk, 5 means lowest risk.

| Criterion | A Floating Studio | B Spatial Workspace | C Editorial Canvas |
|---|---|---|---|
| Accessibility | **3**. Measured: focus ring present, Ctrl+K works, Escape unwinds one layer at a time. Measured: bottom-bar Edit, Preview, Computer and Phone are 40 px tall at 834, under the 44 px the README claims. | **4**. Measured: 36 px desktop and 44 px touch targets, and a dock rect that does not move (406,748,468,44 idle and while editing). Measured: the settings sheet is `aria-modal`, despite the README arguing it is not modal. | **3**. Measured: chrome comes first in Tab order and Ctrl+K works. Measured: Publish is 73x32 and Computer and Phone are 36 px wide in the 834 touch layout. Read: no `@supports` fallback when `backdrop-filter` is missing. |
| Discoverability for a first-time owner | **3**. Observed: labelled islands at fixed places. Measured: no visible Images control anywhere at rest, which breaks settled decision 1. Settings is an icon-only gear. Observed: "Replace banner photo" is hidden under More on the heading. | **3**. Observed: the idle dock is the clearest of the three (Pages, Images, Settings, Preview in words). Measured: all four disappear the moment anything is selected. Preview then needs Escape first. | **3**. Observed: every global control is a visible word at 1280, which beats A and B. Measured: control words and the non-interactive "2 changes not published" share the same colour (#4A4A55) and the same 13 px size, so a novice cannot tell which words are buttons. Measured: Images, Focus and zoom drop out of the line at 834. |
| Editing speed | **4**. Measured: the dock sits about 20 px below the selection. Task 1 and task 3 take 3 actions each. | **3**. Text editing needs no dock trip. Measured: the heading is about 300 px from the dock. B's own Fitts estimate puts the penalty at +0.24 to +0.58 s per trip (inferred, not timed). Measured: the Link popover covers the selected button. | **4**. Observed: the caption sits directly under the element, with the shortest pointer travel of the three. Read: Link, Style and the restore confirm are toast stubs, so the speed is partly unproven. |
| Visual quality and distinctiveness | **4**. Observed: polished glass capsules, and the 52 px band keeps them off the site. Inferred: it reads as a well-made macOS toolbar, more familiar than ownable. | **3**. Observed: a clean, calm workspace that is close to Keynote and Freeform. Inferred: the most generic of the three. | **4**. Observed: the most distinctive. The type-only line, small-caps caption and table-of-contents switcher look like nothing else in the category. |
| Responsiveness (tablet first) | **3**. Observed at 834: the tools bar and the pinned dock stack as two glass bars over the site's text, about 480 px from the selected heading. | **4**. Measured at 834 with touch: an opaque full-width bar, every target 44 px or more, and the bar reserves its own band (frame 52 to 1048). Measured: phone view is preview-only, with zero editing hotspots. | **3**. Observed: at 834 the site shows its own tablet layout at 1:1, and the caption stays under the element. Measured: some touch targets are under 44 px. The README reports 77.5 % scale and about 12 px body text at 1024. |
| Implementation risk against the real code | **4**. Read: `placement.ts` already has candidates, obstacle coverage and a sticky previous placement. A's "one side, flip at edge" rule is a reduction of it. Measured: the prototype sizes the frame to page height (6268 px). That detail must be dropped, but the concept does not need it. | **5**. Read: `placement.ts` mostly goes away and the frame stays viewport-high, which matches today's `frameLayout`. Measured: the site's fixed navbar keeps working when scrolled. | **1**. The concept needs a page-height frame and window scrolling. Read: `agent.ts` uses `innerHeight` and `window.scrollY` as the visible window in at least five places (lines 165, 194, 221 to 223, 281, 632 to 636). The protocol has no height message. Details are in section 3. |
| Canvas visibility | **4**. Measured: canvasShare 0.935 at 1280 (frame 1280x748 from y 52). Measured at 834 the script reports 0.953, but the bottom bar covers the lower 56 px. | **3**. Measured: canvasShare 0.881 at 1280. The dock covers the bottom 22 px. Measured: 0.896 at 834 with touch, none of it obscured. | **4**. Measured: canvasShare 0.921 at 1280 and 0.926 at 834, with nothing floating over the site at rest. |
| **Total (of 35)** | **25** | **25** | **22** |

Glass legibility is shared. All three use the same tokens: an 80 % tint of #FAFAFC on Level 2 and 94 % on Level 3.

- Measured: `--ink-2` (#4A4A55) on Level 2 over pure black composites to 5.23:1. That passes.
- Measured: `--ink-3` (#5F5F6B) on Level 2 over black is 3.77:1, which fails 4.5:1 for small text.
- Read: A uses `--ink-3` for shortcut keys in its glass-2 menus. B's tokens forbid `--ink-3` on glass-2. C's pages table of contents is glass-2.
- Observed: over Agency's dark contact section, B's dock text stays clearly readable.
- Observed: A's islands never touch the site at rest, because they sit in the band. C's chrome sits on the opaque desk. So at rest only B puts glass over the owner's site.

Reduced motion. Read: all three keep short fades under `prefers-reduced-motion`. A limits its change to named elements. B and C apply a global rule that forces every animation to a 120 ms fade, which Impeccable's audit flags as a blunt instrument. All three handle reduced transparency, more contrast and forced colours.

## 2. Action counts for the eight tasks

Baseline counts come from `baseline/README.md` section 4. "Claim" is the author's own number. ⚠ marks where my count disagrees with the claim. The paths are listed below the table.

| # | Task | Baseline | A mine | A claim | B mine | B claim | C mine | C claim |
|---|---|---|---|---|---|---|---|---|
| 1 | Edit the homepage heading | 4 | **3** (measured) | 3 | **3** (measured) | 3 | **3** (measured) | 2 to 3 ⚠ |
| 2 | Replace the hero image | 3 | **5** (3 measured, then a stub) | 4 ⚠ | **5** (3 measured, then a stub) | 4 ⚠ | **blocked** in the prototype. 4 with the baseline fix (inferred) | 3 ⚠ |
| 3 | Change a button's destination | 4 (5 for a web address) | **3**. 4 for another page (measured up to the popover) | 4 ⚠ | **3**. 4 for another page (measured) | 3 | **3**. 4 for another page (inferred, popover is a stub) | 3 |
| 4 | Switch page | 1 rail, 2 capsule | **2** (measured: switcher opens with rows) | 2 | **2** (observed control) | 2 | **2** (observed control) | 2 |
| 5 | Change website settings | 3 (+1 close) | **3** (+1 close, measured) | 3 | **3** (+1 close, measured) | 3 | **3** (+1 close, inferred from the Save button in `settings-1280.png`) | 2 to 3 ⚠ |
| 6 | Preview the mobile version | 1 | **1** (observed control) | 1 to 2 | **2**, and 3 with a selection (measured) | 2 to 3 | **1** (observed control) | 1 |
| 7 | Publish a change | 2 | **2** (measured: focus lands on "Publish 2 changes") | 2 | **2** (measured) | 2 | **2** (inferred) | 2 |
| 8 | Restore a previous version | 3 (+1 close) | **3** (measured: confirm opens with focus on Cancel) | 3 | **3** (observed button, confirm not exercised) | 3 | **3** (read: the confirm is a toast stub, `editorial.js` line 366) | 3 |

Paths and why I disagree:

- **Task 1.** All three: double-click, type, Enter. C's "2" leaves out the Enter that commits. A's README path "click, click again, type, Enter" would be 4 under the baseline rule because typing counts, but double-click works, so 3 holds.
- **Task 2, A.** Clicking the hero photo does nothing. Measured: a toast says only three parts can be selected. The path is heading, More, "Replace banner photo" (a toast stub), Upload, file choice. That is 5. A's 4 leaves out the file choice.
- **Task 2, B.** Clicking the hero selects "Banner section". Measured: its dock reads Move, Duplicate, Hide, More. The path is More, "Background…" (a toast stub), then inferred Replace photo and a file choice. That is 5. B's 4 was walked on a portfolio picture, not the hero.
- **Task 2, C.** The hero cannot be selected. "Images" opens "Replace picture" with portfolio/1 already selected, and the hero is missing from the list (observed). C's 3 assumes the background fix and leaves out the file choice.
- **Task 2, all three.** The task regresses against today's editor. Read: the real `toolbar.ts` already puts "Change banner photo" among the primary actions on a heading inside a banner, and puts `bg-photo` first on a banner section. All three prototypes pushed it under More, or dropped it, to fit the three-plus-More dock.
- **Task 3.** The Link popovers in A and B open on "Part of this page" and apply at once. A part of this page takes select, Link, pick, which is 3. Another page adds the "Goes to" change, which is 4. A's claim of 4 counts the longer case. B's claim of 3 counts the shorter case.
- **Task 6, B.** B ties the device to Preview, so phone view is preview-only. Measured: 0 editing hotspots in phone view. Today's editor can edit in phone view, so this is a capability loss as well as an extra action.

Net, under one counting rule: task 1 and task 3 improve by one action in all three. Task 2 gets worse by one to two actions in all three. Every other task is flat (measured where marked, inferred otherwise). No direction earns its keep on raw action counts. The case has to rest on travel, feedback, tablet support and canvas area.

## 3. The three most serious problems in each direction

### A Floating Studio

1. **Images has no visible control, and the banner photo is buried.** This breaks settled decision 1.
   - Reproduce: load `http://127.0.0.1:8701/index.html` at 1280x800 and list the visible buttons. Measured: 14 controls, none named Images.
   - Then select the heading. Observed: "Replace banner photo" appears only after More.
   - A first-time owner looking for "pictures" has no word to click (inferred).
2. **The contextual surfaces collide with the site and with each other.**
   - Reproduce: click "Tell Me More", then "Link · Contact Us section". Measured: the popover (x 774 to 1078) overlaps the dock (x 465 to 817) by 43 px. That is glass on glass, against decision 9, and it hides the dock's right end.
   - Select the heading. Measured: the dock's bottom edge (y 528) touches the top of the site's button (y 528). The `1024-heading-selected.png` screenshot shows the same.
   - Opening More puts a 234 px menu over the button.
3. **The 834 layout splits commands from the selection and stacks glass over the content.**
   - Reproduce: resize to 834x1112 and load `?sel=heading`. Observed: the dock pins about 480 px below the heading, directly above a floating tools bar. Both are glass and both sit over the site's "Services" text.
   - Measured: Edit, Preview, Computer and Phone are 40 px tall, under 44.
   - The README's main idea, "next to the selection", does not hold on the tablet the brief prioritises.

### B Spatial Workspace

1. **The adaptive dock removes global controls on every selection.** This breaks settled decisions 1 and 2.
   - Reproduce: load `http://127.0.0.1:8702/` and list the dock buttons. Measured at rest: Undo, Redo, Pages, Images, Settings, Preview, Focus.
   - Click the heading. Measured: Undo, Redo, Edit, Style, Link, More, Focus.
   - Pages, Images, Settings and Preview vanish, and the device switch is only reachable through Preview. The dock rect never moves, but the controls inside it do. Spatial memory works for slots, not frames (HCI 9 and 10, inferred).
2. **Popovers that rise from the dock cover the thing being edited.**
   - Reproduce: click "Tell Me More", then "Link · Services". Measured: the popover at y 516 to 738 covers the button (y 528 to 597) completely. Observed in the screenshot: only its yellow shows through the glass.
   - The owner changes a destination without seeing the element (inferred). Any element in the lower half of the canvas will meet the same thing.
3. **Phone view cannot be edited, and the dock sits on the page's last content.**
   - Reproduce: from rest, click Preview, then Phone. Measured: 0 editing hotspots.
   - Scroll the site to `#contact`. Observed: the dock and the hint chip cover the "Send Message" button.
   - Inferred: at the end of a page the owner cannot scroll content out from under the dock, unless the frame gets bottom padding that changes the site's layout.

### C Editorial Canvas

1. **Document scrolling needs a page-height frame, which breaks the agent and changes how sites render.**
   - Measured: the frame is 1248x6111 at 1280, so the window, not the site, scrolls.
   - Read: `canvas.ts` `frameLayout` sizes the frame to the viewport. `agent.ts` treats `innerHeight` and `window.scrollY` as the visible window in its off-screen check (line 165), toolbar room (194), fixed-bar detection (221 to 223, which skips bars taller than `innerHeight / 2`), the `viewport` message (281) and `reveal` (632 to 636). With `innerHeight` set to the page height, every one of these silently returns wrong answers (inferred).
   - Read: `protocol.ts` has no height message. C needs a new agent-to-editor `size` message and an editor-to-agent "visible window" message. Both cross the security boundary that decision 14 protects.
   - Read in the fixtures: Agency's `#mainNav` is `position: fixed` and a scroll handler adds `navbar-shrink`. Harbor Bakery has a sticky `.site-header`. Landwind has a `fixed` header. In a page-high frame none of these follow the scroll, and the scroll handler never fires. Three of the four HTML fixtures would look different from the live site (inferred), which undercuts the trust goal.
   - Inferred: a `min-height: 100vh` hero in a frame that is resized to its document height grows the document, which resizes the frame again. That is an unbounded loop unless the editor caps the height or rewrites `vh` units. Agency ships `.vh-100` and `.min-vh-100` utilities.
   - Inferred: the late-height problem would reopen the baseline's 0.26 to 0.40 layout shift.
2. **Controls look the same as plain text.**
   - Reproduce: read the computed styles of the top line. Measured: Images, Settings, Focus, Preview and the status "2 changes not published" are all #4A4A55 at 13 px, with no border, fill or underline.
   - Observed: only hover reveals which words act. The author concedes this.
   - Measured: at 834 the line drops Images, Focus and zoom, so the image library has no visible route on a tablet.
3. **"Images" acts on a picture the owner never chose.**
   - Reproduce: from rest, click Images. Observed: "Replace picture" opens with portfolio/1 already selected, and "Upload from your computer" would replace it.
   - That invites an accidental replace (inferred), and it is not the "contextual asset browser" brief section 3 asks for.
   - Read: Link, Style and the restore confirm are toast stubs (`editorial.js` lines 343 and 366), so tasks 3 and 8 are not demonstrated.

Persona red flags, from Impeccable's critique method:

- **Jordan, a first-time owner.** In A Jordan finds no "Images" or "Settings" word. In B the "Pages" Jordan just used disappears after one click on the page. In C Jordan cannot tell the buttons from the status line.
- **Sam, a keyboard and screen-reader user.** In A and B the second Tab goes into the site frame (measured), and F6 does nothing once focus is inside it (measured in A). This is a prototype artifact. Read: the real `editor.html` already sets the iframe to `tabindex="-1"` and puts the canvas surface in the Tab order. It is not a reason to pick one direction over another, but whichever is built must keep that line.

## 4. Recommendation

**Build A, the Floating Studio. Keep the real editor's in-frame scrolling, and graft B's tablet layout and C's caption onto it.**

Why A:

- It is the only direction that matches settled decision 3 as written ("one preferred placement, flipped only at the canvas edge").
- It keeps every global control in a fixed island through every selection (observed).
- It has the second-best canvas share (0.935, measured).
- It is the cheapest change to `placement.ts` and `toolbar.ts` (read).

Its defects are about where surfaces go and what they are called, not about the architecture. C's main defect is architectural. B's adaptive dock contradicts decisions 1 and 2.

Graft these:

1. **B's touch layout below 900 px or under `(pointer: coarse)`.** One opaque, full-width bottom bar with icon-over-label 44 px targets, Undo and Redo at its left edge, and popovers as sheets directly above it. This replaces A's floating tools bar and the separately pinned glass dock (measured: B meets 44 px everywhere at 834, A does not).
2. **C's caption as A's dock on desktop.** Merge A's label chip and its dock into one start-aligned caption under the selection ("HEADING · Saved  Edit  Style  Link  More"), placed on the side of the selection that has the most room (HCI 9). That is one floating object instead of two, and the save state sits next to the verbs (decision 6).
3. **B's right-edge settings sheet** in place of A's centred modal. Decision 4 says settings opens in a sheet. Make it non-modal, so the canvas stays live, and fix the `aria-modal` mismatch.
4. **C's words for the global controls.** Add a labelled "Images" to A's navigation island, and replace the icon-only gear with the word "Settings". Keep visible borders or fills on the capsules so words read as buttons, which C lacks.
5. **B's zero-drift check.** Run B's rect logging in CI against A's islands across all eight tasks.
6. **The real editor's banner-photo rule.** "Replace photo" stays a primary slot on any element inside a banner and on the banner section itself. All three directions regressed task 2 by demoting it.
7. **A's popover anchoring, with one fix.** Popovers open on the far side of the caption from the selection and never overlap the caption or the ring, which `placement.ts` coverage can enforce. That avoids both A's 43 px dock overlap and B's popover covering the selected element.

Drop these:

- C's document scrolling and A's prototype page-height frame. The frame stays viewport-high, as `frameLayout` has it today.
- B's adaptive global dock, and B's preview-only phone view.
- A's floating tools bar on tablet.
- C's borderless word controls as the only affordance.
- C's "Images" shortcut that preselects a picture.

What would change my mind:

- **For B.** Run a placement script over 30 elements on Agency, Northwind and Harbor Bakery. If the near-selection caption covers neighbouring content or the site's own controls in more than about a quarter of selections, B's fixed dock wins on desktop too. Timed pointer trials that show B's dock trip costs under 0.2 s with equal first-click success would do the same. Either way, B's dock would also need to keep Pages, Images and Settings visible during a selection.
- **For C.** Build an agent spike that reports document height and the visible window, caps or rewrites `vh` units, and renders Agency, Harbor Bakery and Landwind identical to the live sites. That means fixed and sticky headers following the scroll, scroll handlers firing, no growth loop, and layout shift under 0.1. If that works, C's document scroll becomes a live option and its visual identity deserves a second look.
- **For dropping A.** A real iPad session where the caption under a selection is regularly hidden by the hand or the on-screen keyboard would push even desktop toward B's bottom dock.
