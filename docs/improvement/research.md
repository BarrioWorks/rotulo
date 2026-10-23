# Visual editor improvement: research

This report collects outside evidence and an audit of the current editor, then ranks techniques Rótulo can use. It is read-only research. No app code changed. P0 items come first. They change the least code and protect the product promise in `PRODUCT.md` ("Never change what they did not touch, and always offer a way back").

Each claim carries one label:

- **Read.** I read it in this repository's code or docs, or in a source page.
- **Observed.** I saw it in a committed screenshot.
- **Search summary.** The official page refused a direct fetch (HTTP 403), so the claim comes from search-engine extracts of that page. Treat these as likely but unconfirmed.
- **Inferred.** My conclusion from the evidence. Not tested.

Sources were opened on 2026-10-21. Earlier research in `docs/studio/research/hci.md` and `docs/studio/research/apple.md` already covers direct manipulation, Fitts's law, progressive disclosure and Apple toolbar guidance. This report does not repeat that material.

## The editor today

The editor loads the owner's real page into a sandboxed iframe. An agent script inside the iframe (`frontend/agent/agent.ts`) draws selection and reports what was clicked. The editor shell (`frontend/editor/`) sends typed operations to the server. The server (`src/document.rs`) parses the page with `scraper` and `html5ever`, finds the element by its `data-ph-id`, applies the operation and serializes the page (read).

The operations are a closed list in `frontend/editor/api.ts` lines 89 to 101 (read): `set_text`, `set_image`, `set_background_image`, `set_alt`, `set_link`, `set_style`, `hide_section`, `duplicate_section`, `move_section`, `remove_section` and `set_page_meta`. The server computes what each element may do (`Capabilities` in `src/document.rs` line 252) and the agent only offers those actions (read). This is a sound base. Every change names one element, and the server refuses anything else.

Text editing sets `contenteditable` on the existing element and uses `document.execCommand` for typing, bold, italic and links (`agent.ts` lines 685 to 760, read). Paste inserts plain text only (`agent.ts` line 1101, read). IME composition is respected (`event.isComposing`, line 1081, read). The server rebuilds the edited children from a plan and keeps existing child elements by id (`set_text`, `src/document.rs` line 1331, read).

Undo and redo are server-side and linear. Each edit is a row in `edits` with state `applied`, `undone` or `discarded` (`src/drafts.rs`, read). The button tooltip names the change, for example "Undo: text change" (`topbar.ts` line 107, read).

### What the audit found

1. **The fidelity promise and the import behavior disagree.** `PRODUCT.md` says "Untouched markup stays exactly as it was." `README.md` line 48 says "HTML is re-serialized on import ... attribute quoting and void tags may be written differently from the original" (both read). The visible page is the same, but the bytes are not. No test I found proves that an edit changes only the named element's subtree. This matters because the whole positioning rests on it.
2. **Style edits ignore the device view.** `set_style` merges declarations into the element's inline `style` attribute (`merge_style`, `src/document.rs` line 1590, read). The style panel has no device input (`panels.ts`, read). An owner who enlarges a heading in the computer view also enlarges it on phones, because inline style beats the site's media queries (inferred from CSS cascade rules). The phone preview exists, so owners will check it, find the problem and have no tool to fix it.
3. **Some offered actions have no visible effect.** The heading selection offers "Background" (observed, `docs/launch/final/screens/editor-heading-selected-1280.png`). `can_background_image` is a deny-list of tags, so almost every element gets it (read, `src/document.rs` line 283). A background photo behind a heading is a valid edit, but for most text elements it is an unlikely and confusing first choice.
4. **Undo does not show its result.** `history()` in `frontend/editor/main.ts` line 170 reloads the canvas and keeps the current selection (read). It does not scroll to or highlight the element the undo changed, and it stays on the current page when the undone change was on another page (inferred from the code; the server result carries `pages` but no element id). The live region does announce "Undone: text change" (read).
5. **During text editing the element shows two outlines.** The selection ring and a second dark ring overlap (observed, `editor-editing-1280.png`). It is cosmetic, but it reads as two states at once.
6. **Escape commits text instead of cancelling.** Both Enter and Escape call `commitText()` (`agent.ts` line 1082, read). This matches Apple's rule to save work on implicit dismiss, and undo covers mistakes. It is a deliberate choice, so it stays, but the shortcut sheet should say so.
7. **Section order changes only by Move up and Move down.** There is no drag (read, `move_section`). This is keyboard accessible already. Drag is an addition, not a fix.
8. **`DESIGN.md` describes an editor that no longer exists.** It specifies "a 56 px top bar across, a 248 px sidebar" and a 900 px minimum (`DESIGN.md` Layout section, read). The current editor uses floating islands with no sidebar and opens a phone layout at 390 px (observed in `docs/launch/final/screens/`, and the fix record in `docs/studio/evaluation/five-worst.md`). Design work that follows `DESIGN.md` will target the old layout.
9. **Open items carried from the Studio evaluation** (read, `docs/studio/evaluation/five-worst.md`). "Restore" and "Publish again" still sit side by side. A text save raises no confirmation. The unpublished change count is lost on reload. One action has two names ("Change banner photo" and "Change background photo"). Unnamed containers are announced as "Area".

## Feature matrix

The matrix compares what each tool does for the job Rótulo has, which is editing an existing HTML page in place. "Model" means the tool converts the page into its own data structure and writes HTML back out of it.

| Capability | Rótulo today | Dreamweaver Live View | Webflow | GrapesJS | Craft.js, Puck | Tiptap, Lexical | dnd-kit, Moveable |
|---|---|---|---|---|---|---|---|
| Edits arbitrary existing HTML | Yes, by element id on the parsed page | Yes, edits the source file | No, pages are built in Webflow | Imports into a component model | No, React components only | Text only, schema-bound | Not editors |
| Untouched markup kept | Same DOM, reserialized bytes | Source file kept (search summary) | Not applicable | Rebuilt by `toHTML()` | Rebuilt from JSON | Unknown nodes stripped or hoisted | Not applicable |
| Text edited on the page | Yes, `contenteditable` | Yes, click to place caret | Yes, also in edit mode | Yes, built-in RTE | Through user components | Yes, core purpose | No |
| Element picker and parent path | Click, keyboard parent and child | Element Display above selection | Navigator panel | Layer manager | Layers package | No | No |
| Style scoped to screen size | No, inline style everywhere | Through CSS Designer (not checked) | Yes, per breakpoint with cascade | Yes, per device media query | App-defined | No | No |
| Shows inherited vs set values | No | Not checked | Yes, orange inherited, blue set | Not checked | App-defined | No | No |
| Section reorder | Move up, Move down | Drag with insertion guide (not checked) | Drag in Navigator | Drag | Drag connectors | No | Drag with keyboard sensor and announcements (dnd-kit) |
| Resize and snap | Spacing values in a panel | Not checked | Handles in Designer | Resize handles | App-defined | No | Drag, resize, snap to guidelines (Moveable) |
| Undo | Server, linear, labelled | Yes | Yes | `UndoManager` with `skip()` | Built in (not checked) | Yes | No |
| Content-only role | Owner is the only role | No | Edit mode locks design | Configurable | Permissions API (Puck) | Not applicable | Not applicable |
| Script-built content | Shown, not editable, says so | Live View edits may be lost (search summary) | Not applicable | Not handled | Not applicable | Not applicable | Not applicable |
| Versions and rollback | Yes, every publish | Through files or Git | Backups and publish | Storage manager | Not built in | Not built in | Not applicable |

The matrix points one way. Every library that edits structure (GrapesJS, Craft.js, Puck, Tiptap, Lexical) gets its power by converting the page into its own model. That conversion is exactly what Rótulo promises not to do. Dreamweaver is the closest precedent, because it edits the real source in a live rendering. Webflow is the best precedent for responsive styling, but it owns the markup from the start. The libraries are useful as sources of techniques, not as dependencies. `PRODUCT.md` also rules out runtime npm dependencies, and the CSP is `script-src 'self'`.

## Sources

Each entry gives the authors, the date, the technique, how it applies to Rótulo, the benefit, the risks and a test.

### Required papers

**Peridot.** Brad A. Myers. Built 1987 during his PhD at the University of Toronto. Book *Creating User Interfaces by Demonstration*, Academic Press, 1988. Journal version "Creating user interfaces using programming by example, visual programming, and constraints", ACM TOPLAS, 1990.
- Technique. The designer draws and demonstrates. About 60 condition-action rules infer constraints (nesting, equal size, offsets) and iterations over lists. Peridot asks the designer to confirm each inference, shows the result at once and allows undo (read, Myers' chapter in *Watch What I Do*).
- Application. Repeated content such as cards, menu items and list items. When an owner duplicates one card, Rótulo can infer "this is one of a repeating set" from its siblings and offer "Add another card" with the right placement.
- Benefit. Owners add items without knowing the structure.
- Risks. Graphical inferences were right on the first try about 80% of the time in a small informal study of 10 people (read). A wrong guess on a live site breaks layout. Peridot needed two examples for iteration.
- Test. On the three fixture ZIPs, list every element whose parent has three or more siblings with the same tag and class. Count how many the rule labels as a repeating set, and have a person judge each. Ship only if the rule is right on all fixture cases and always asks before it acts.
- Sources. [Myers, Peridot chapter](https://mail.acypher.com/wwid/Chapters/06Peridot.html), [GI+CHI 1987 record](https://graphicsinterface.org/?p=5008), [TOPLAS 1990 version](https://www.academia.edu/986790/Creating_user_interfaces_using_programming_by_example_visual_programming_and_constraints).

**ORC Layout.** Yue Jiang, Ruofei Du, Christof Lutteroth, Wolfgang Stuerzlinger. CHI 2019 (DOI 10.1145/3290605.3300643). arXiv 1912.07827, 17 December 2019.
- Technique. OR-constraints inside a linear constraint system. One specification unifies grid and flow layout and adapts to different aspect ratios (read, abstract).
- Application. Rótulo does not author layout, so ORC itself does not apply. Its lesson does. One layout specification must hold at every width, and an edit that is fine at one width can break another. That backs the responsive check in P0-4 and the device-scoped styles in P1-1.
- Benefit. A clear argument for checking edits at more than one width.
- Risks. Adopting a constraint solver would mean owning layout, which conflicts with editing the site's own CSS.
- Test. See P0-4.
- Source. [arXiv 1912.07827](https://arxiv.org/abs/1912.07827).

**Sketch-n-Sketch, live synchronization.** Ravi Chugh, Brian Hempel, Mitchell Spradlin, Jacob Albers. "Programmatic and Direct Manipulation, Together at Last". PLDI 2016. arXiv 1507.02988, July 2015, revised April 2016.
- Technique. The user edits the output (an SVG) directly. The system infers which constant in the source program to change, using the program's execution trace to narrow the search and heuristics for ambiguity (read, abstract).
- Application. A style value on the canvas usually comes from a rule in the site's CSS file, not from the element. Tracing the computed value back to its rule lets Rótulo ask "Change it here only, or everywhere this style is used?". Today it always writes inline style on one element.
- Benefit. One change can fix every button on the site, and the site's CSS stays the single source of truth.
- Risks. A rule shared by many elements changes things the owner did not touch, which cuts against product principle 1. The paper notes ambiguity needs heuristics, and a wrong pick surprises the user.
- Test. Pick a button color that comes from a class rule. Apply "everywhere". Assert that every element matching the rule changes, nothing else changes, and one undo restores all of them.
- Source. [arXiv 1507.02988](https://arxiv.org/abs/1507.02988).

**Semi-automated SVG programming via direct manipulation.** Brian Hempel, Ravi Chugh. UIST 2016. arXiv 1608.02829, 9 August 2016.
- Technique. Tools for drawing, relating and grouping shapes. Each tool rewrites the program on the user's behalf, so direct manipulation builds reusable structure (read, abstract).
- Application. Each Rótulo operation is already a tool that rewrites the page for the owner. The lesson is to keep each tool's rewrite small and named, which `PageEdit` does. It supports "Duplicate section" and the repeat inference in P2-1 as tools that produce clean markup, not loose copies.
- Benefit. The resulting HTML stays readable for the next developer who opens the ZIP.
- Risks. The abstract reports no user study, so the benefit for nontechnical people is unproven.
- Test. After each operation on each fixture, run an HTML validator on the published output and diff the DOM against the previous version. Only the target subtree may differ.
- Source. [arXiv 1608.02829](https://arxiv.org/abs/1608.02829).

### Five additional publications and projects

**Mavo.** Lea Verou, Amy X. Zhang, David R. Karger. UIST 2016, pp. 483 to 496 (DOI 10.1145/2984511.2984551).
- Technique. Authors add a `property` attribute to ordinary HTML and the element becomes editable. "The editing UI is generated based on the type of element", so an `img` gets a different editor from a link or a span (read, Verou's Smashing Magazine article, 16 May 2017). In the study, 20 users marked up static designs, and people with no programming experience built working apps (search summary of the paper record).
- Application. Rótulo already picks a toolbar by element kind. Mavo argues for going further down to element semantics. A `<time datetime>` gets a date picker that updates both the text and the attribute. A `tel:` link gets a phone field. A `mailto:` link gets an email field.
- Benefit. Fewer ways to make an inconsistent edit, such as changing a displayed phone number but not its `tel:` link.
- Risks. Each new widget is a new operation the server must validate.
- Test. On a fixture with `<a href="tel:...">0114 ...</a>`, change the number in the phone field. Assert that both the text and the `href` change in one undo step.
- Sources. [paper PDF](https://people.csail.mit.edu/karger/Papers/mavo.pdf) (could not extract text in this session), [MIT DSpace record](https://dspace.mit.edu/handle/1721.1/108980), [Introducing Mavo](https://www.smashingmagazine.com/2017/05/introducing-mavo/).

**Ply.** Sarah Lim, Joshua Hibschman, Haoqi Zhang, Eleanor O'Rourke. UIST 2018 (DOI 10.1145/3242587.3242660).
- Technique. Visual relevance testing. Toggle each CSS property and compare the rendering. Hide properties with no visible effect, and explain dependencies such as "`z-index` does not apply if `position` is static". Novices replicated web features 50% faster than with Chrome DevTools. Firefox 70 shipped the idea as "Inactive CSS" (search summary of the paper and the project README).
- Application. Offer only actions and style controls that change what the owner sees. This addresses audit finding 3.
- Benefit. Shorter toolbars and fewer dead-end actions. Owners stop trying controls that do nothing.
- Risks. A control hidden because it has no effect now may be what the owner wants next, such as a background color on a transparent section. Hide by default only where the effect is truly nil, and keep the rest in More.
- Test. For each fixture and each element kind, apply each offered style action in the preview and take a pixel diff. Any offered action with a zero diff is a defect.
- Sources. [paper, NSF repository](https://par.nsf.gov/servlets/purl/10109034), [project README](https://github.com/sarahlim/ply).

**Peritext.** Geoffrey Litt, Sarah Lim, Martin Kleppmann, Peter van Hardenberg. Ink & Switch, November 2021.
- Technique. Formatting marks have boundary rules. Bold and italic grow when text is typed at their end. Links and comments do not grow (read).
- Application. Rótulo's text editing relies on the browser's `execCommand` behavior at mark boundaries. The Peritext rules are the right target. Typing after a link must not extend the link. Typing after bold text continues bold.
- Benefit. Fewer accidental links. A link that swallows the next sentence is a common and hard-to-spot error.
- Risks. Browsers differ at boundaries, and fixing it means intercepting `beforeinput`, which adds code to the agent.
- Test. In Chromium, Firefox and WebKit through Playwright, place the caret at the end of a link inside a paragraph and type " more". Assert that " more" is outside the `<a>`. Repeat for bold and assert it is inside the `<strong>` or `<b>`.
- Source. [Peritext](https://www.inkandswitch.com/peritext/).

**EditContext API.** W3C Editing Working Group draft.
- Technique. An `EditContext` object takes text input from the operating system directly, so an editor no longer depends on `contenteditable` DOM. The spec notes that content for assistive technology must still be rendered to the DOM (read). MDN marks it "Experimental" and "not Baseline" (read).
- Application. Watch only. It is the future replacement for `execCommand` in the agent, but it works only in Chromium today.
- Benefit. Predictable text input once it is cross-browser.
- Risks. No Firefox or Safari support, so it would need a full fallback, which doubles the text path.
- Test. None now. Recheck MDN's compatibility table each quarter.
- Sources. [EditContext draft](https://w3c.github.io/edit-context/), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API).

**Past, present, and future of user interface software tools.** Brad Myers, Scott E. Hudson, Randy Pausch. ACM TOCHI 7(1), March 2000, pp. 3 to 28 (DOI 10.1145/344949.344959).
- Technique. Judge tools by threshold (how hard to learn), ceiling (how much they can do) and predictability. Tools succeed when they make the right thing the path of least resistance (search summary).
- Application. Rótulo chooses a low threshold and a deliberately low ceiling. That is correct for its owners. The paper's warning about predictability argues against features that guess, which is why P2-1 must always ask first.
- Benefit. A test for each proposed feature. Does it lower the threshold without making results less predictable?
- Risks. None for adoption. It is a framing source.
- Test. Not applicable.
- Source. [CMU KiltHub record](https://kilthub.cmu.edu/articles/journal_contribution/Past_Present_and_Future_of_User_Interface_Software_Tools/6470303/1).

### Official product documentation

**Adobe Dreamweaver, "Edit in Live View".** Adobe Help Center. The page returned HTTP 403, so these points are search summaries.
- Element Display appears above the selected element and holds its classes and id. The Quick Property Inspector handles image attributes and text formatting. Clicking a text element starts editing, with the caret where the click landed. An orange border marks edit mode. Edits in Live View may be lost if the page changes through scripts or meta refresh.
- Application. The click-to-caret behavior supports the Studio plan to place the caret on a second click. The script warning matches Rótulo's rule to block editing of script-built content, which is correct.
- Source. [Edit in Live View](https://helpx.adobe.com/dreamweaver/using/live-view-property-inspector.html).

**Webflow breakpoints and edit mode.** Webflow Help Center. Both pages returned HTTP 403, so these points are search summaries.
- Styles set at the base breakpoint cascade up to larger breakpoints and down to smaller ones. A value set at a smaller breakpoint overrides only that breakpoint and smaller. In the Style panel, an orange label means inherited from another selector or a larger breakpoint, and a blue label means set here. Alt-click on a blue label clears the override.
- Edit mode lets content editors change text, links and images (not background images) while design stays locked. When two people edit one element, the last edit wins.
- Application. The breakpoint model is the reference for P1-1. Edit mode is evidence that a content-only tool with no layout controls is a product people use.
- Sources. [Breakpoints overview](https://help.webflow.com/hc/en-us/articles/33961300305811), [Collaborate on your site](https://help.webflow.com/hc/en-us/articles/33961260491795), [Viewing and managing selectors](https://university.webflow.com/course-lesson/lay-out-style-viewing-managing-selectors).

**Apple Human Interface Guidelines.** Read through the HIG JSON endpoints.
- Undo and redo. "Help people predict the results of undo and redo." Label the item with the result ("Undo Typing"). "Show the results of an undo or redo", for example by scrolling to a restored paragraph. Consider letting people undo "a batch of discrete but related actions", such as incremental adjustments to one property, as one step.
- Drag and drop. "Offer alternative ways to accomplish drag-and-drop actions", such as menu commands.
- Popovers. Do not cover the element that opened the popover. "Always save work when automatically closing a nonmodal popover." Show one popover at a time.
- Application. P0-3 follows the undo guidance. P1-2 keeps Move up and Move down when drag arrives.
- Sources. [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop), [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers).

### Libraries

Repository facts come from the GitHub API on 2026-10-21.

| Project | License | Latest release | What it does | Lesson for Rótulo | Adopt? |
|---|---|---|---|---|---|
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause (GitHub reports NOASSERTION) | v0.23.8, 2026-10-15 | Parses HTML into component definitions. Unknown elements fall back to `type: 'default'`. The component model is the "Source of Truth" and `toHTML()` regenerates HTML ([Components](https://grapesjs.com/docs/modules/Components.html)). `UndoManager` tracks components and CSS rules, and `skip(callback)` runs changes without recording them ([UndoManager API](https://grapesjs.com/docs/api/undo_manager.html)). Devices carry a `widthMedia` for media queries ([Device API](https://grapesjs.com/docs/api/device.html)). | Device-to-media-query mapping for P1-1. `skip()` is the pattern for live previews that should not enter history, which Rótulo already does with `preview_style`. | No. Model conversion. |
| [Craft.js](https://github.com/prevwong/craft.js) | MIT | `@craftjs/layers@0.2.7`, 2025-02-14 | React framework. User components get `connect` and `drag` connectors. State serializes to JSON ([overview](https://craft.js.org/docs/overview)). | Connectors separate "selectable" from "draggable", a clean split for P1-2. | No. React, no HTML import, last release 2025. |
| [Puck](https://github.com/puckeditor/puck) | MIT | v0.23.0, 2026-08-07 | Visual editor for registered React components with fields. Previews in a same-origin iframe for viewports. Permissions toggle duplicate and delete ([docs](https://puckeditor.com/docs)). | Per-component permission flags match Rótulo's `Capabilities`. | No. React, no HTML import. |
| [Tiptap](https://github.com/ueberdosis/tiptap) | MIT | v3.32.0, 2026-10-13 | ProseMirror-based rich text. "Content which doesn't fit the schema is thrown away." `enableContentCheck` reports it ([schema](https://tiptap.dev/docs/editor/core-concepts/schema)). | Proof that a schema editor would strip the site's own inline markup. | No. Would break fidelity. |
| [Lexical](https://github.com/facebook/lexical) | MIT | v0.52.0, 2026-09-28 | Text editor framework. HTML import through `$generateNodesFromDOM`. In the experimental pipeline from v0.45.0, an element with no rule goes to `DefaultHoistRule`, which descends into its children ([DOM import](https://lexical.dev/docs/serialization/dom-import)). | Same as Tiptap. Unknown wrappers are flattened. | No. |
| [dnd-kit](https://github.com/clauderic/dnd-kit) | MIT | `@dnd-kit/collision@0.5.1`, 2026-10-15 | Keyboard sensor on by default. Enter or Space picks up, arrows move, Escape cancels. Off-screen instructions and live-region announcements for start, over, end and cancel. It advises position words, not zero-based indexes ([accessibility guide](https://dndkit.com/guides/accessibility)). | The interaction and announcement script for P1-2. | No. Copy the pattern in plain TypeScript. |
| [Moveable](https://github.com/daybrush/moveable) | MIT | 0.53.0, 2023-12-03 | Drag, resize, scale, rotate, group and snap to guidelines. It emits events and the app writes `target.style.transform` itself ([README](https://github.com/daybrush/moveable)). | Snapping is useful for spacing handles. Free transforms are not, because they pull elements out of the site's flow. | No. Last release 2023, and transforms fight flow layout. |

## Ranked techniques

The ranking puts risk to the owner's site first and visible benefit second. P0 items fit in small units, each with its own test. Every item keeps the existing rule that the server validates each operation against one element id.

### P0. Do first

**P0-1. Prove that an edit touches only its element.**
- Technique. A fidelity test, from the Sketch-n-Sketch idea that a direct edit must make a minimal, local change to the source.
- Application. A Rust test over every page of the three fixture ZIPs. For each element with each capability, apply the operation, then compare the serialized page with the page before. Only the target subtree may differ, plus `<head>` for `set_page_meta`. Add a second test that imports and publishes with no edits and reports the byte diff from the original files. Then make `PRODUCT.md`, `README.md` and the landing page say exactly what the result shows.
- Benefit. The core promise becomes a checked fact. Owners get what the homepage says. The next engineer gets a test that fails when an operation leaks.
- Risks. Low. It changes no behavior. It may reveal leaks that need fixes.
- Test. The test is the deliverable. It must fail when a deliberate leak is injected, for example a `set_text` that also trims whitespace in a sibling.

**P0-2. Offer only actions that do something visible.**
- Technique. Ply's visual relevance testing, cut down to the actions Rótulo offers.
- Application. Keep `Capabilities` as the safety gate on the server. Add a relevance step in the agent before it builds the toolbar. Drop "Background" from text-level elements that have no box of their own, using the existing `hasOwnBox` in `agent.ts` line 454. Leave it in More for headings and paragraphs. Drop "Align" when the element is inline. Keep everything the server allows reachable in More.
- Benefit. Shorter toolbars and fewer dead ends. It fixes audit finding 3.
- Risks. Low. It hides nothing the server allows. The only risk is a rule that hides a wanted action, which the More menu covers.
- Test. The pixel-diff test from the Ply entry, on all three fixtures. Zero offered actions with a zero diff.

**P0-3. Make undo show what it did.**
- Technique. Apple HIG undo guidance.
- Application. Return the element id and page of the undone or redone edit from the server. The `edits` row already knows its page. Then switch to that page if needed, scroll the element into view, and pulse its outline with the existing `reveal()` in `agent.ts` line 622. Group consecutive `set_style` edits on one element and one property within a short window into one history step.
- Benefit. Owners stop pressing undo repeatedly because nothing seemed to happen. It fixes audit finding 4.
- Risks. Low to medium. Grouping changes history semantics, so a redo must restore the whole group.
- Test. Edit an element below the fold, scroll to the top, press Ctrl+Z. Assert that the element is in the viewport and outlined. Edit on page A, switch to page B, undo. Assert that the editor shows page A. Make five font-size steps and undo once. Assert that the original size returns.

**P0-4. Warn when a style edit breaks the phone layout.**
- Technique. ORC's lesson that one specification must hold at every width, applied as a check rather than a solver.
- Application. After a `set_style` that changes `font-size`, padding or margin, render the page at 390 px in a hidden frame or in the existing phone preview. Measure `scrollWidth > clientWidth` on the root and the edited element's overflow. If either overflows, show a warning toast with Undo, using the existing amber warning style in `DESIGN.md` Feedback. Use plain words, for example "This heading is now wider than a phone screen."
- Benefit. Owners find the problem when they make it, not after publishing.
- Risks. Low. A hidden frame costs a render. False positives are possible on sites that already overflow, so compare against the state before the edit.
- Test. On the Agency fixture, set the hero heading to 120 px in the computer view. Assert the warning. Set it to 40 px. Assert no warning. On a page that already overflows, assert no new warning.

**P0-5. Pin text-editing behavior at mark boundaries.**
- Technique. Peritext's boundary rules.
- Application. Add Playwright tests for the behavior first. Fix only what fails, by handling `beforeinput` at a link's end to insert outside the `<a>`. Remove the second ring during editing (audit finding 5) and list "Escape finishes editing" in the shortcut sheet (audit finding 6).
- Benefit. Fewer accidental links and clearer editing state.
- Risks. Low for the tests. Medium for a `beforeinput` handler, because browsers differ. Keep the handler limited to links.
- Test. The Peritext test, in all three browser engines.

### P1. Next

**P1-1. Style per screen size, with inherited values shown.**
- Technique. Webflow's breakpoint cascade and orange and blue labels. GrapesJS devices with `widthMedia`.
- Application. Add a `scope` to `set_style`: all screens, or phones only. Write the phone value to one Rótulo-owned `<style data-rotulo>` block in `<head>` inside a media query, keyed by a stable class added to the element that publishing keeps. In the panel, mark a value set for phones and offer "Use the computer value" to clear it.
- Benefit. Owners can fix the phone layout. It resolves audit finding 2.
- Risks. Medium. It adds a class and a style block to the owner's HTML, which is a visible markup change. The site's own `!important` rules can beat the override. Use a single block and a single class prefix so a developer can find and remove all of it.
- Test. Set a phone-only font size on the Agency heading. Assert the computed size at 390 px and 1280 px. Publish. Assert the published HTML has exactly one added class on that element and one style block. Undo. Assert both are gone.

**P1-2. Drag sections, keep the buttons.**
- Technique. dnd-kit's keyboard sensor and announcements. Apple's rule to offer an alternative to drag. Craft.js's split between select and drag connectors.
- Application. A drag handle on the section caption. During drag, show an insertion line between sections. Enter or Space picks up, arrows move one section, Escape cancels, and a live region says "Section 3 of 6". Each drop is one `move_section` sequence that undoes as one step. Keep Move up and Move down.
- Benefit. Faster reordering of long pages.
- Risks. Medium. Drag inside an iframe needs coordinate mapping, and sections that are not siblings cannot be swapped. Allow drops only between sibling sections, which `sibling_section` already defines.
- Test. Drag section 4 to position 2 by pointer and by keyboard. Assert the order, the announcements and that one undo restores the original order.

**P1-3. Semantic field editors.**
- Technique. Mavo's type-driven editing UI.
- Application. `<time datetime>` gets a date field that updates the text and the attribute. `tel:` and `mailto:` links whose text matches their target get one field that updates both.
- Benefit. Consistent contact details, which matter most to small businesses.
- Risks. Medium. Each widget is a new server operation with validation.
- Test. The Mavo phone test above.

**P1-4. A visible parent path.**
- Technique. Dreamweaver's Element Display.
- Application. The agent already supports parent and child selection (`selectRelative`, `agent.ts` line 639). Show the ancestors as clickable names in the caption ("Section, Card, Heading"), using `KIND_LABELS`.
- Benefit. Owners can reach the card that holds a heading without knowing the keyboard shortcut.
- Risks. Low. The caption grows, so the path must collapse into More when it does not fit, per the `DESIGN.md` toolbar Fit rule.
- Test. Select a heading inside a card. Click "Card". Assert that the card is selected and the caption shows card actions.

**P1-5. Update `DESIGN.md` to the shipped editor.**
- Application. Replace the sidebar layout and the 900 px minimum with the floating islands and the phone layout as shipped (audit finding 8).
- Benefit. Design work stops targeting a layout that was removed.
- Risks. None.
- Test. Every editor rule in `DESIGN.md` matches a screenshot in `docs/launch/final/screens/`.

### P2. Later, and only with evidence

**P2-1. "Add another" for repeating items.** Peridot's inference with confirmation. Detect sibling sets and offer "Add another card" that clones the last item with its text selected. Always ask, and never act on a guess. Start only with sets of three or more siblings with the same tag and class list.

**P2-2. Change a style everywhere it is used.** Sketch-n-Sketch's trace from output to source. Find the CSS rule behind a computed value and offer "Only here" or "Everywhere this style is used", with a count of affected elements before the owner confirms. It needs the server to edit CSS files, which is a new operation class with its own fidelity test.

**P2-3. Spacing handles with snapping.** Moveable's snap guidelines, applied to padding and margin values, never to transforms or absolute positions. The value still goes through `set_style` validation.

**P2-4. EditContext.** Revisit when Firefox and Safari ship it.

### Do not adopt

- **A model-based page builder** (GrapesJS, Craft.js, Puck) as the editing core. Each rebuilds HTML from its own model, which breaks the fidelity promise and adds a large runtime dependency the CSP and `PRODUCT.md` rule out.
- **A schema rich-text editor** (Tiptap, Lexical) for in-page text. Tiptap's docs say content outside the schema "is thrown away". The site's own spans and classes would vanish on the first edit.
- **Free positioning with transforms** (Moveable's default use). It pulls elements out of the site's flow and breaks phone layouts, the problem P0-4 exists to catch.

## Gaps and unverified points

- The Adobe and Webflow help pages returned HTTP 403 to every fetch, so their entries rely on search summaries. A person should open those pages in a browser before anyone quotes them in product copy.
- The Mavo paper PDF could not be read in this session because no PDF text tool was installed. Its entry uses the publication record and the author's article.
- ORC's CHI 2019 venue comes from the DOI on its arXiv page, not from the proceedings.
- The Dreamweaver cells marked "not checked" in the matrix were not researched.
- Audit findings 2 and 4 are inferred from code. A run of the app would confirm them. The P0-3 and P0-4 tests double as those confirmations.
- No users took part. Every benefit above is a prediction until a test with owners measures it.

## Technique productionized during this run

The drag controller infers a structural insertion from the selected element's type, the rendered sibling rectangles, and the container's flow. It distinguishes horizontal and vertical arrangements, reversed order, wrapped rows, nesting edges and no-op drops. It leaves responsive CSS in control and commits a DOM move through validated server commands. Pure geometry tests cover normal flow, flex, grid, reverse directions and right-to-left layouts. The rendered acceptance fixture keeps three, two and one grid columns at 1280, 834 and 390 pixels after structural editing.

This is a small direct-manipulation and mixed-initiative technique. It suggests valid destinations without automatically redesigning the page. It does not implement Peridot's rule inference, ORC solving, or Sketch-n-Sketch's bidirectional synthesis. The research informed the interaction choice; the published algorithms are not claimed to transfer to arbitrary HTML.
