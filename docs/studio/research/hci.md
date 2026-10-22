# HCI research for the Studio redesign

Agent A, phase B. This file turns published HCI research into interaction changes for the Rótulo editor. Each change comes with a test to run on the live app.

## How to read this

Each finding gives the principle, the source, why it matters for Rótulo, one change, and a test. Each finding also carries a label:

- **Established research.** A peer-reviewed paper or book.
- **Practitioner guidance.** Standards, platform guidelines and expert-review writing (WCAG, Apple HIG, Nielsen Norman Group).
- **Subjective preference.** A call this document makes that the research does not settle.

Every source was opened this session. The ACM Digital Library refused every request, so for some papers only an abstract, a catalogue record or a search summary was available. Each such entry says so. The Impeccable lenses used are Operate mode (in a task surface, familiarity and consistency outrank expression), critique's heuristics and cognitive-load checklist, distill (cut what does not earn its place, never necessary function) and clarify (labels say what will happen, and undo beats confirmation).

## The editor today

This summary comes from `docs/design/screens/final/fix-04-status-saved-1280.png` and `frontend/editor/`. A permanent sidebar (Pages, Website settings, Version history, Images) takes 248 of 1280 px. The top bar holds the site and page switchers, undo and redo, Edit and Preview, computer and phone, the status line and Publish. A selection shows a cyan outline, a label chip and a floating toolbar ("Text, Edit text, Style, Change banner photo, Background"). Text editing starts from "Edit text". `placement.ts` picks among eight toolbar positions plus a docked strip. Undo works by reloading the page behind the scenes. Cmd/Ctrl+K opens Pages.

## Findings

### 1. Direct manipulation

- **Principle.** Direct manipulation has three properties: a continuous representation of the objects of interest, physical actions or labelled presses instead of syntax, and rapid, incremental, reversible operations with an immediately visible effect.
- **Source.** Shneiderman, "Direct Manipulation: A Step Beyond Programming Languages", IEEE Computer 16(8), 1983, [doi:10.1109/MC.1983.1654471](https://doi.org/10.1109/MC.1983.1654471). The IEEE page did not render, so this paper is cited from its DOI record. The three properties are taken from Shneiderman, IUI 1997, [author PDF](https://www.cs.umd.edu/users/ben/papers/Shneiderman1997Direct2.pdf), which was read.
- **Relevance.** Rótulo already edits on the canvas. The remaining gap is the "Edit text" step between selecting a heading and changing its words.
- **Change.** A click on text that is already selected places the caret where the owner clicked. Typing while text is selected starts editing with that character. "Edit text" stays in the dock as the labelled route.
- **Evaluate.** Script task 1 in Playwright and count actions. The baseline is click, then "Edit text", then type. The target is click, click, type, with no trip to the toolbar. Also log pointer travel in px.
- **Label.** Established research.

### 2. The gulfs of execution and evaluation

- **Principle.** Directness has two parts. Semantic distance is the gap between what the user intends and what the system offers. Articulatory distance is the gap between the form of input or output and its meaning. Both appear in the gulf of execution and the gulf of evaluation.
- **Source.** Hutchins, Hollan and Norman, "Direct Manipulation Interfaces", Human-Computer Interaction 1(4), 1985, pp. 311 to 338, [PDF](https://vis.csail.mit.edu/classes/6.859/readings/pdfs/Hutchins-DirectManipulationInterfaces.pdf), read.
- **Relevance.** On execution, "Change banner photo" matches the owner's intent and "Background" next to it does not. On evaluation, the only proof of a save is the global status line, far from the edit.
- **Change.** Show save state on the selection chip: the part's name while idle, "Saving" during a write, a check for one second on success, and "Not saved, retry" on failure. The global line keeps only the publish story ("2 changes not published").
- **Evaluate.** Throttle the save request to 2 s, commit an edit, and capture the chip at 0.1, 1 and 2.5 s. Then block the request and confirm the chip shows the error with a retry and that the live region announces it.
- **Label.** Established research.

### 3. Instrumental interaction

- **Principle.** An instrument's degree of indirection has two parts. Spatial offset is how far the instrument is from the object. Temporal offset is the delay before the effect shows. Beaudouin-Lafon rates handles best and dialog boxes worst, because dialog boxes "have a high degree of spatial and temporal indirection". Contextual menus have a small spatial offset.
- **Source.** Beaudouin-Lafon, "Instrumental Interaction", CHI 2000, pp. 446 to 453, [doi:10.1145/332040.332473](https://doi.org/10.1145/332040.332473), [author PDF](https://www.lri.fr/~mbl/papers/CHI2000/paper.pdf), read.
- **Relevance.** Removing the sidebar sends its settings somewhere. A modal raises both offsets. A live popover anchored to the element keeps both near zero.
- **Change.** Link destination, alt text and style open in a popover anchored to the selection. Changes apply live on the canvas. Modals are kept for publish review, rollback and site deletion.
- **Evaluate.** For tasks 2, 3 and 5, log the px distance from the selection to the control used and the time from input to canvas repaint. Across all eight tasks, count modals. The target is two: publish review and rollback.
- **Label.** Established research. The modal budget is a subjective preference.

### 4. Progressive disclosure

- **Principle.** Show the few most important options first and put the rest one level down. More than two levels disorients people. The trigger's label must say what it opens. In Carroll's training wheels study, blocking common error states for new users gave faster learning and better comprehension.
- **Source.** Nielsen, ["Progressive Disclosure"](https://www.nngroup.com/articles/progressive-disclosure/). Carroll and Carrithers, "Training Wheels in a User Interface", Communications of the ACM 27(8), 1984, pp. 800 to 806. Only a search summary was available, because the [IBM record](https://researcher.watson.ibm.com/publications/training-wheels-in-a-user-interface) now redirects to a 404.
- **Relevance.** The brief asks for less permanent chrome without hiding essentials. Training wheels backs Rótulo's existing choice to block unsafe actions rather than offer them and fail.
- **Change.** Each selection type gets three to five primary actions plus one labelled overflow ("More for this image"), with no third level. An action the HTML cannot support safely is left out, with one line saying why, rather than shown disabled.
- **Evaluate.** Select one element of each type on the three fixtures. Record the visible actions and the overflow depth. Pass is three to five actions and a depth of at most two. Then run an expert walkthrough of the eight tasks without instructions. Record whether each needed action was visible at the first decision point, and report the results as hypotheses.
- **Label.** Practitioner guidance (Nielsen). Established research (Carroll). The three-to-five range is a subjective preference.

### 5. Recognition over recall

- **Principle.** Make actions and options visible so people do not have to remember them from elsewhere in the interface.
- **Source.** Nielsen, ["10 Usability Heuristics"](https://www.nngroup.com/articles/ten-usability-heuristics/), heuristic 6.
- **Relevance.** Removing the sidebar is the redesign's largest recall risk. Cmd/Ctrl+K and `?` cannot be the only routes.
- **Change.** A fixed floating bar has labelled entries for Pages, Settings, Images and History. Each menu item and tooltip shows its shortcut, so the visible route teaches the fast one.
- **Evaluate.** List every command reachable by palette or shortcut. Assert that each has a visible control in the default state at 1280, 1024 and 390. A palette-only command fails the check. This makes PLAN.md done-line 2 checkable.
- **Label.** Practitioner guidance.

### 6. System status and response time

- **Principle.** A response under 0.1 s feels instant. Up to 1 s keeps the flow of thought, but past that the feeling of direct manipulation is lost. Past 10 s attention leaves, so show progress and allow cancelling. The Model Human Processor puts the perceptual cycle at about 100 ms (range 50 to 200).
- **Source.** Miller, "Response time in man-computer conversational transactions", AFIPS Fall Joint Computer Conference 1968, [doi:10.1145/1476589.1476628](https://doi.org/10.1145/1476589.1476628). Only the Crossref record was read. Card, Moran and Newell, *The Psychology of Human-Computer Interaction*, 1983, [Routledge](https://www.routledge.com/products/9780203736166). The cycle times come from search summaries. Nielsen, ["Response Times: The 3 Important Limits"](https://www.nngroup.com/articles/response-times-3-important-limits/).
- **Relevance.** Selection crosses a sandboxed frame and a message protocol, and glass blur adds paint cost.
- **Change.** Set three budgets. The selection outline appears within 100 ms of pointerdown at 4x CPU throttle. "Saving" appears only if a save passes 1 s. Publish names its stages ("Uploading 12 files", "Checking", "Live") with a count once it may pass 10 s.
- **Evaluate.** Put `performance.mark` calls at pointerdown in the frame and at outline paint in the app. Report p50 and p95 over 50 scripted clicks per fixture. Repeat with reduced-transparency emulation to isolate the cost of glass. This feeds PLAN.md done-line 6.
- **Label.** Established research (Miller; Card, Moran and Newell). Practitioner guidance (Nielsen).

### 7. Undo as the user's intention

- **Principle.** People act by mistake and need a clearly marked exit (heuristic 3). Abowd and Dix treat undo "not as a system command to be implemented, but as a user intention to be supported by the system".
- **Source.** [Nielsen heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). Abowd and Dix, "Giving undo attention", Interacting with Computers 4(3), 1992, [doi:10.1016/0953-5438(92)90021-7](https://doi.org/10.1016/0953-5438(92)90021-7). Only the [abstract](https://alandix.com/academic/papers/undo92/undo92.html) was read.
- **Relevance.** What the owner counts as one change (a rewrite, a photo swap) must undo in one step. Undo has to stay visible as the chrome shrinks. Clarify's rule applies: when recovery is safe, undo beats a confirm.
- **Change.** One text-editing session is one undo step. The tooltip names the step ("Undo: banner photo changed"). Undo and redo appear at every width. Hiding a section and replacing an image run without a confirm, and a toast offers Undo. Version restore is presented as the undo for published changes.
- **Evaluate.** Script one edit of each type (text, image, link, style, hide), each followed by Cmd/Ctrl+Z. Assert that the DOM matches the pre-edit snapshot, that selection and scroll are kept, and that the tooltip named the right step. Count the confirms on reversible actions. The target is zero.
- **Label.** Practitioner guidance (Nielsen). Established research (Abowd and Dix, the intention framing only).

### 8. Error prevention: editing is not following

- **Principle.** Prevent errors with constraints rather than relying on recovery (heuristic 5).
- **Source.** [Nielsen heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). Carroll and Carrithers 1984, above.
- **Relevance.** The brief forbids following a link by accident while editing.
- **Change.** In Edit mode, a click on a link or button always selects it. Following it is an explicit "Open link" action. Links work normally in Preview.
- **Evaluate.** Click every link on the three fixtures in Edit mode, including during text editing and inside the site's own menus, and count navigations. The target is zero. In Preview, every click should navigate.
- **Label.** Practitioner guidance.

### 9. Spatial memory needs stable positions

- **Principle.** People learn where controls are, then find them with little effort. Interfaces should support that learning. In a menu, novices search item by item at first. Once they know the locations, the choice takes Hick-Hyman decision time.
- **Source.** Scarr, Cockburn and Gutwin, "Supporting and Exploiting Spatial Memory in User Interfaces", Foundations and Trends in HCI 6(1), 2012, [doi:10.1561/1100000046](https://doi.org/10.1561/1100000046). Only a summary was read. Cockburn, Gutwin and Greenberg, "A Predictive Model of Menu Performance", CHI 2007, [author PDF](https://grouplab.cpsc.ucalgary.ca/grouplab/uploads/Publications/Publications/2007-PredictiveModelMenus.CHI.pdf), read. Kaptelinin (1993) could not be found and is not cited.
- **Relevance.** Floating chrome that moves with the selection works against spatial memory. Today's toolbar has nine possible positions. An action whose slot changes between element types cannot be learned.
- **Change.** Global controls (Pages, Settings, Images, History, undo, mode, device, status, Publish) stay fixed through every selection, scroll and state. In the dock, shared actions keep one slot order: type label, primary verb, Link, Style, More. The dock sits above the selection, start-aligned, and flips below only at the canvas edge. It never moves during typing.
- **Evaluate.** Script the eight tasks and log each global control's bounding box on every state change at 1280, 1024 and 834. Pass is zero px drift. Select 30 elements, then report the share of non-default dock placements and the number of dock moves during typing. The target for moves is zero.
- **Label.** Established research. The slot order is a subjective preference.

### 10. Adaptable beats adaptive; copy, do not move

- **Principle.** In a 27-person study, static menus were significantly faster than adaptive ones. Adaptable menus were faster than adaptive ones and no different from static, and most people preferred them. Gajos and colleagues found that a moving adaptation gave no gain despite its theoretical benefit. A split interface that copied frequent commands into a separate area, leaving the familiar layout alone, improved both performance and satisfaction. They put its low cost down to spatial stability, and they found that predictive accuracy mattered.
- **Source.** Findlater and McGrenere, "A Comparison of Static, Adaptive, and Adaptable Menus", CHI 2004, [author PDF](https://www.cs.ubc.ca/labs/edapt/papers/findlater2004.pdf), read. Gajos, Czerwinski, Tan and Weld, "Exploring the Design Space for Adaptive Graphical User Interfaces", AVI 2006, [doi:10.1145/1133265.1133306](https://doi.org/10.1145/1133265.1133306), [author PDF](https://www.eecs.harvard.edu/~kgajos/papers/2006/kgajos-avi06.pdf), read.
- **Relevance.** A dock that changes with the selection (brief idea A) is fine, because the owner caused the change. Reordering by frequency is not.
- **Change.** Dock contents depend only on element type, never on history. Any "recent" row (pages, images) is a separate labelled strip that copies items and leaves the main order fixed.
- **Evaluate.** Select the same element type after ten different action histories and assert that the dock order is identical. Visit pages in random order and assert that the navigator's main list does not change.
- **Label.** Established research.

### 11. Fitts's law, and browser edges

- **Principle.** Movement time grows with log2(A/W + 1), where A is distance and W is width along the approach. Shrinking a target costs more than an equal increase in distance. Screen-edge targets are faster to hit, by up to 44% in Appert and colleagues' second study, because the edge stops the cursor.
- **Source.** Fitts, Journal of Experimental Psychology 47(6), 1954, [PubMed 13174710](https://pubmed.ncbi.nlm.nih.gov/13174710), cited from a search summary because the page did not render. MacKenzie, "Fitts' law as a research and design tool in human-computer interaction", Human-Computer Interaction 7, 1992, [author page](https://www.yorku.ca/mack/hci1992.html), read. Appert, Chapuis and Beaudouin-Lafon, "Evaluation of Pointing Performance on Screen Edges", AVI 2008, [abstract](https://research.ibm.com/publications/evaluation-of-pointing-performance-on-screen-edges).
- **Relevance.** A dock near the selection cuts A. In a browser, though, the cursor stops at the viewport edge only when the window is maximised or fullscreen. Edge-pinned bars may get the edge benefit and inset floating bars never do.
- **Change.** A control's whole visual box is its hit area, never just the icon. Controls are at least 32 px tall on fine pointers. The primary verb takes the dock slot nearest the selection.
- **Evaluate.** For each control, compare the clickable box with the visual box, and fail any control whose hit area is smaller. For tasks 1 to 3, sum pointer travel and compare it with the baseline.
- **Label.** Established research. The 32 px floor is a subjective preference.

### 12. Touch targets and FFitts

- **Principle.** WCAG 2.2 SC 2.5.8 (AA) needs targets of 24 by 24 CSS px, or enough spacing. Apple gives iOS and iPadOS a default control size of 44 by 44 pt (minimum 28) and macOS 28 by 28 (minimum 20). It suggests about 12 pt of padding around bezeled controls and 24 pt around unbezeled ones. Parhi and colleagues found 9.2 to 9.6 mm targets enough for one-handed thumb use. Bi, Li and Zhai showed that a finger has an absolute imprecision that care does not remove, so small touch targets stay error-prone.
- **Source.** [WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Apple HIG, [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), read through Apple's JSON endpoint. Parhi, Karlson and Bederson, MobileHCI 2006, [doi:10.1145/1152215.1152260](https://doi.org/10.1145/1152215.1152260), [Microsoft Research page](https://www.microsoft.com/en-us/research/?p=155150). Bi, Li and Zhai, CHI 2013, [Google Research](https://research.google/pubs/pub41645/), cited from a search summary because the page returned 403. NN/g, ["Touch Targets on Touchscreens"](https://www.nngroup.com/articles/touch-target-size/).
- **Relevance.** On iPad, which the brief prioritises, the handles, dock buttons and label chip are all touch targets.
- **Change.** Under `(pointer: coarse)`, controls are at least 44 by 44 CSS px with 8 px gaps. Handles and the chip get a 44 px invisible hit area. On fine pointers, the floor is WCAG's 24 px, and dock buttons stay at 32 px.
- **Evaluate.** With touch emulation at 1024x768, 834x1194 and 390x844, measure every interactive element. Fail any under 44 px when coarse, or under 24 px without spacing anywhere. Also fail any overlapping hit areas.
- **Label.** Practitioner guidance (WCAG, Apple, NN/g). Established research (Parhi; Bi).

### 13. Hick-Hyman and its limits

- **Principle.** Choice time rises with the log of the number of equally likely options (Hick) and linearly with the information transmitted (Hyman). In menus this holds only once people know where items are. Novices search roughly linearly (Cockburn et al. 2007). Seow notes that the law never gained the traction in HCI that Fitts's did.
- **Source.** Hick, Quarterly Journal of Experimental Psychology 4(1), 1952, [doi:10.1080/17470215208416600](https://doi.org/10.1080/17470215208416600). Hyman, Journal of Experimental Psychology 45(3), 1953, [doi:10.1037/h0056940](https://doi.org/10.1037/h0056940). Seow, Human-Computer Interaction 20(3), 2005. All three are cited from search summaries.
- **Relevance.** Owners are occasional users who will stay novices. Their choices are governed by visual search, which rewards fewer, labelled, grouped items. Hiding an action adds a step plus a search, which costs a novice more than one more visible label. The research matches the brief's warning against using Hick's law to hide functionality.
- **Change.** Keep text labels on dock actions. Group global controls into three clusters separated by space: site and page, editing state, publishing.
- **Evaluate.** In the walkthrough, record first-click success for each task. Count items per cluster. Read each label against clarify's "say what happens" test.
- **Label.** Established research.

### 14. Cognitive load

- **Principle.** Problem solving uses working memory that is then unavailable for learning. Experts differ from novices mainly in stored schemas. Impeccable's checklist turns this into eight checks, plus a rule of about four items per decision point.
- **Source.** Sweller, "Cognitive Load During Problem Solving", Cognitive Science 12(2), 1988, [doi:10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4), cited from a search summary. Impeccable `reference/critique.md`.
- **Relevance.** The owner holds a goal in mind while learning the tool. Duplicate status lines, competing buttons and bare icons all draw on the same capacity.
- **Change.** Keep one status string, one Publish and one page switcher. During text editing, the global bar dims and the dock shows only the formats this element supports.
- **Evaluate.** Score the default, selected and editing states on the checklist before and after. The target is at most one failure per state. Count the visible controls in each state.
- **Label.** Established research (Sweller). Practitioner guidance (the Impeccable rule, not traced to a primary source here).

### 15. Interrupt only at task boundaries

- **Principle.** In a study of 50 participants, interruptions during a task, rather than between tasks, cost 3% to 27% more time, twice the errors, 31% to 106% more annoyance and twice the rise in anxiety. A few seconds of deferral recovered much of that.
- **Source.** Bailey and Konstan, Computers in Human Behavior 22(4), 2006, pp. 685 to 708, [PDF](https://interruptions.net/literature/Bailey-CHB06_1.pdf), [UMN record](https://experts.umn.edu/en/publications/on-the-need-for-attention-aware-systems-measuring-effects-of-inte/).
- **Relevance.** Toasts, tooltips and publish nudges that fire mid-typing carry exactly this cost.
- **Change.** During text editing, hold toasts and nudges until the owner commits or presses Escape. Never move focus for a background event. Choose an anchored popover over a modal, since Impeccable's Operate mode lists "modal as first thought" as a constraint.
- **Evaluate.** Type into a heading for 5 s while forcing a background save and a publish nudge. Assert that focus stays in the element and that no toast renders before the commit.
- **Label.** Established research.

### 16. Novice to expert

- **Principle.** With marking menus, people moved from the visible menu to marks as they gained skill. Marks were about 3.5 times faster, and experts went back to the menu after breaks. A later survey notes that users often fail to adopt faster methods.
- **Source.** Kurtenbach and Buxton, CHI 1994, [Buxton's page](https://billbuxton.com/MMUserLearn.html), read. Cockburn, Gutwin, Scarr and Malacria, ACM Computing Surveys 47(2), 2014, [doi:10.1145/2659796](https://doi.org/10.1145/2659796), cited from a search summary. Scarr et al., "Dips and Ceilings", CHI 2011, [doi:10.1145/1978942.1979348](https://doi.org/10.1145/1978942.1979348), citation only.
- **Relevance.** The palette is a secondary feature. It earns its place only if novices meet it naturally and it uses the same words as the visible controls.
- **Change.** Cmd/Ctrl+K opens a palette, not Pages. Each entry uses the visible control's exact label and says where that control lives. A "Search actions, Cmd K" entry sits in the global bar.
- **Evaluate.** Assert that every palette entry matches a visible control's accessible name. Time tasks 4, 5 and 8 by palette and by pointer with a keystroke-level estimate.
- **Label.** Established research. The palette design is a subjective preference.

### 17. No core function behind hover

- **Principle.** Content shown on hover or focus must be dismissible, hoverable and persistent (WCAG SC 1.4.13). The `hover` and `any-hover` media features report whether the primary input, or any input, can hover.
- **Source.** [WCAG 2.2 SC 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html). MDN, [any-hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-hover).
- **Relevance.** Canvas hover outlines, icon tooltips and magnetic emphasis (idea B) do not exist on an iPad without a trackpad.
- **Change.** Hover is a preview layer only. Tap selects, and chip and tooltip text are reachable by tap and focus. Magnetic emphasis is gated on `(hover: hover) and (prefers-reduced-motion: no-preference)`.
- **Evaluate.** Run the eight tasks with touch emulation and no mouse events, then keyboard-only. Count blocked tasks. The target is zero.
- **Label.** Practitioner guidance.

### 18. Translucency and legibility

- **Principle.** Anything laid over other content is harder to see. NN/g's review of iOS 26 reports low-contrast translucent controls over busy backgrounds, motion without benefit, crowded targets, and controls that appear and collapse in ways that defeat habit.
- **Source.** Budiu, ["Liquid Glass Is Cracked, and Usability Suffers in iOS 26"](https://www.nngroup.com/articles/liquid-glass/). It is an expert review, not a user study.
- **Relevance.** Rótulo's glass will sit over white pages, black pages and full-bleed photos.
- **Change.** Tint glass densely enough that text contrast holds against the tint alone. Text never sits over unblurred content. Opaque fallbacks apply under reduced transparency, increased contrast and forced colors.
- **Evaluate.** Render each surface over white, over black and over the Agency hero photo. Measure the worst-case contrast with the `scripts/design/contrast.py` method. Pass is 4.5:1 for text and 3:1 for icons and edges (PLAN.md done-line 5).
- **Label.** Practitioner guidance.

## The 12 recommendations most likely to change the design

1. Global controls get fixed positions, checked by a zero-drift script (9, 5).
2. The dock's contents depend only on element type, with one shared slot order (10, 9).
3. The dock has one preferred placement, flips only at the canvas edge and never moves during typing (9, 10).
4. Pages, Settings, Images and History keep visible labelled controls; the palette is an addition (5, 16).
5. Properties are edited in anchored, live popovers; modals only for publish, rollback and delete (3, 15).
6. A second click on selected text, or typing, starts editing in place (1).
7. Save state shows on the selection chip; the global line carries only publishing (2, 6).
8. Undo stays visible at every width, maps to the owner's intent, names its step and replaces confirms (7).
9. Touch mode uses 44 px controls with 8 px gaps and 44 px handle hit areas, and nothing core depends on hover (12, 17).
10. The outline appears within 100 ms of a click, measured with glass on and off (6).
11. Toasts and hints wait for the end of an edit and never take focus (15).
12. Dock actions keep text labels, three to five per type, with one labelled overflow (4, 13).

## Research-backed warnings about the brief

- **Adaptive positioning and changing commands (ideas F and A).** Moving controls cost speed and satisfaction in Findlater and McGrenere and in Gajos et al. Placement near the selection is fine if it is predictable. Reordering by use is not (10).
- **Removing the sidebar.** It trades recognition for area. Without visible replacements, navigation becomes recall (5, 9).
- **Glass.** The owner's site is the busy background. Contrast must hold over the worst case, not the average (18).
- **Magnetic selection (idea B).** It needs hover and motion, does nothing on touch, and no source here shows a benefit. Prototype it, and keep it out of the core loop (17).
- **Hick-Hyman as a reason to hide.** The log law covers choices people already know. For occasional users, hiding adds a search and a step (13).
- **Inset floating bars.** A bar inset from the viewport edge gets no edge-pointing gain, so it needs larger targets instead (11).
- **Palette as primary.** People adopt shortcuts slowly and fall back to visible menus after breaks (16).
- **Self-animating controls.** NN/g flags motion without benefit, and Operate mode limits motion to state changes of 150 to 250 ms (18).

## Gaps

- The full texts of Parhi, Scarr 2011, Cockburn 2014, Bi, Sweller, Hick and Hyman were not read. Their claims here come from abstracts or summaries.
- Kaptelinin (1993) and Frohlich (1993) could not be read past a catalogue record ([Frohlich, doi:10.1080/01449299308924396](https://doi.org/10.1080/01449299308924396)), so neither supports any claim.
- Apple guidance on materials, popovers, toolbars and pointer interactions belongs to Agent B.
- No real participants were involved. Walkthrough results are hypotheses, and the scripted measures can be rerun.
