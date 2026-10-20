# Pagehaven — Radical UX/UI Redesign and Interaction Research

Act as a world-class interaction designer, HCI researcher, Apple-platform interface specialist, creative director, and principal frontend engineer.

## Mission

Completely rethink and redesign Pagehaven's frontend.

The existing interface works, but it feels generic, administrative, visually flat, and unnecessarily constrained.

We are building a visual website editor for ordinary people who created a website using AI and now want to maintain it without coding or spending additional AI credits.

**The new Pagehaven should feel closer to a next-generation macOS/iPad creative application than a traditional browser-based CMS.**

Use a canvas-first philosophy with floating controls, contextual interactions, elegant translucent materials, refined typography, and meaningful motion.

This is a substantial product redesign, not a CSS refresh.

Research, challenge the existing interaction model, propose a coherent alternative, implement it, and verify the actual application.

Use the installed [Impeccable](https://github.com/pbakaus/impeccable) skills throughout.

## 1. Start with research, not implementation

Study established human-computer interaction research and current interface design guidelines.

Prioritize published papers, established design research, and official platform documentation.

Investigate:

### Direct manipulation

Research Ben Shneiderman's direct manipulation principles and subsequent HCI work.

Explore how Pagehaven can reduce the distance between what users see and what they can change.

A user should click a heading to edit a heading, rather than locate a heading field in a form.

### Progressive disclosure

Investigate when to reveal advanced controls and when to keep actions visible.

Reduce persistent interface clutter without making essential functionality difficult to discover.

### Recognition over recall

Use Nielsen's usability heuristics to ensure users can identify available actions without memorizing keyboard shortcuts or hidden menus.

### Spatial consistency

Research spatial memory, stable interface positioning, and predictable interactions.

Floating controls must not move unpredictably or cover important content.

### Fitts's Law

Apply target acquisition principles to toolbar controls, contextual actions, and touch interactions.

Avoid tiny targets and excessive pointer travel.

### Hick–Hyman Law

Investigate reducing decision complexity through clear grouping, sensible defaults, and contextual actions.

Do not use this principle as an excuse to hide important functionality.

### Apple Human Interface Guidelines

Study current guidance for:

- Liquid Glass and materials.
- macOS toolbars and popovers.
- iPadOS pointer interactions.
- Contextual menus.
- Touch gestures.
- Keyboard shortcuts.
- Window resizing.
- Animation and transitions.
- Accessibility and reduced motion.

### Other relevant research

Investigate cognitive load, visual hierarchy, feedback, error prevention, and undo/redo.

For each finding, explain:

1. The established principle.
2. Its source.
3. Its relevance to Pagehaven.
4. A concrete interface change we can implement.
5. How to evaluate that change.

Distinguish established research from subjective design preferences.

## 2. Delegate focused research and design

Use up to five subagents.

Each subagent must use relevant Impeccable skills.

**Agent A — HCI research**

Research published usability literature and convert findings into actionable interaction recommendations.

**Agent B — Apple-inspired interaction design**

Study macOS, iPadOS, Liquid Glass, popovers, floating toolbars, contextual menus, and adaptive controls.

**Agent C — Visual identity**

Develop a distinctive Pagehaven visual language, including typography, icons, materials, colors, elevation, and motion.

**Agent D — Editor experience**

Completely reconsider page navigation, element selection, text editing, asset replacement, style editing, and publishing.

**Agent E — Critical UX review**

Challenge proposed patterns using accessibility, discoverability, usability, and implementation complexity.

Have the main agent consolidate their findings into one coherent direction.

Do not allow subagents to independently redesign the same components.

## 3. Remove the permanent sidebar

The existing left sidebar contains:

- Pages.
- Website settings.
- Version history.
- Images.

This does not justify occupying approximately 300 pixels at all times.

**Remove the permanent sidebar from the editing workspace.**

Replace it with contextual navigation and floating surfaces.

### Website navigation

Place the current project and page name inside a compact floating control near the top-left corner.

Example:

`Agency / Home ▾`

Selecting the current page opens an elegant page switcher.

The switcher should support:

- Page thumbnails or recognizable page labels.
- Searching pages.
- Switching pages.
- Adding a supported page.
- Renaming pages.
- Accessing page-specific actions.

Use a popover or floating panel rather than permanent navigation.

Do not create an oversized menu for websites with only one page.

### Website settings

Move website settings into a dedicated popover, sheet, or modal.

Possible entry point:

A compact settings icon in the floating workspace toolbar.

Organize settings into clear sections:

- General.
- Pages.
- Assets.
- Domains.
- Publishing.
- Versions.

Use navigation within the settings surface only where needed.

Keep settings accessible without cluttering the editing canvas.

### Assets

Create a contextual asset browser.

Open it when users select an image or explicitly choose Assets.

Allow users to inspect, upload, and replace images.

Do not keep the full asset library permanently visible.

### Version history

Move version history into the publishing interface or a dedicated floating panel.

Users should not need to see it during ordinary text editing.

## 4. Make the canvas the main character

The imported website should occupy nearly all available workspace.

Remove the heavy application framing.

Reduce unnecessary margins, permanent panels, borders, and status bars.

### Desired canvas

- Large, immersive website preview.
- Subtle distinction between the workspace and imported content.
- Smooth responsive resizing.
- Clear desktop and mobile preview modes.
- Minimal editor chrome.
- Floating controls layered above the workspace.
- Accurate rendering of the imported website.

The website's own design should dominate the interface.

Pagehaven should not impose its visual identity on imported websites.

### Canvas positioning

Investigate centered and edge-to-edge canvas layouts.

Choose based on the user's viewport and selected device mode.

Avoid a permanently large gray background surrounding a small webpage.

Provide a clear Fit control and sensible zoom behavior.

Support trackpad and mouse interactions where appropriate.

Do not hijack browser gestures unexpectedly.

## 5. Introduce a floating toolbar system

Replace the conventional full-width application toolbar with smaller floating control groups.

Explore an interface inspired by macOS and iPadOS.

### Primary workspace controls

Consider a compact floating toolbar containing:

- Project/page selector.
- Undo and redo.
- Edit/Preview switch.
- Device preview controls.
- Settings.
- Publish.

Avoid combining every action in one enormous pill.

Group actions by purpose.

Keep Publish prominent.

### Placement

Evaluate:

- Floating top-center toolbar.
- Small top-left navigation capsule.
- Top-right publish control.
- Contextual floating controls near selected elements.
- Bottom floating toolbar for tablet-sized layouts.

Choose the arrangement that balances discoverability and canvas space.

The toolbar should remain stable while the user edits.

Do not make navigation controls disappear unexpectedly.

## 6. Create a restrained glass material system

Use Apple's Liquid Glass principles as inspiration.

Do not attempt to reproduce Apple's proprietary rendering implementation exactly.

Develop a web-native material system using supported browser capabilities.

### Materials

Define three levels.

**Level 1 — Canvas**

Imported website content.

No Pagehaven glass effects applied inside it.

**Level 2 — Floating controls**

Translucent surfaces for toolbars, menus, and compact contextual controls.

Use:

- Restrained backdrop blur.
- Subtle translucency.
- Fine borders.
- Soft elevation.
- Adaptive foreground contrast.

**Level 3 — Modal surfaces**

More opaque settings panels, import dialogs, and complex forms.

Prioritize legibility over transparency.

### Important constraints

Do not apply glass effects indiscriminately.

Avoid excessive blur, glowing borders, constantly moving reflections, and multiple overlapping translucent panels.

Glass should clarify the separation between editing controls and imported website content.

Ensure controls remain readable over bright, dark, colorful, and photographic website backgrounds.

Provide opaque fallbacks when transparency, browser support, performance, or accessibility requires them.

Test `prefers-reduced-transparency` where supported.

Avoid expensive continuous rendering effects.

## 7. Redesign selection and editing

The current selection outline and text toolbar feel too much like a conventional developer-oriented page editor.

Build a more natural direct-manipulation experience.

### Selection states

Define distinct visual states:

- Idle.
- Hovered.
- Selected.
- Editing.
- Saving.
- Error.
- Unsupported element.

Use restrained selection outlines, labels, handles, and cursor changes.

Selection must remain visible on light and dark imported websites.

Avoid large blue rectangles when subtler affordances communicate the state sufficiently.

### Text editing

When the user clicks editable text:

1. Highlight the element.
2. Offer a clear Edit action or allow direct editing when unambiguous.
3. Activate inline editing.
4. Display a compact formatting toolbar near the selection.
5. Save changes with clear feedback.

The formatting toolbar should contain only relevant operations.

Avoid generic toolbars with disabled or unrelated controls.

Support familiar keyboard shortcuts.

Ensure Escape, Enter, and outside-click behavior are predictable.

Do not accidentally navigate links while editing them.

### Images

When an image is selected, display contextual actions:

- Replace.
- Alt text.
- Link, if applicable.
- Basic presentation options.

Replacing an image should feel like changing an image in a presentation application.

### Buttons and links

Allow users to edit:

- Visible text.
- Destination URL.
- Supported appearance properties.

Clearly separate editing from following a link.

### Sections

Provide section-level controls when the underlying static HTML structure supports them safely.

Consider:

- Move.
- Duplicate.
- Hide.
- Restore.

Do not claim arbitrary drag-and-drop capability when DOM structure or imported scripts make it unreliable.

## 8. Explore innovative interaction ideas

Research and evaluate the following concepts.

Implement only those that improve usability.

### A. Contextual command dock

A compact floating dock changes its available commands based on the selected element.

For example:

Text selection → Edit, Format, Link.

Image selection → Replace, Crop if supported, Alt text.

Section selection → Move, Duplicate, Hide.

The dock must not hide essential actions or move unpredictably.

### B. Magnetic selection feedback

Explore subtle pointer-responsive highlights inspired by iPadOS.

The selected target may gently emphasize itself as the pointer approaches.

Keep movement subtle.

Never change the imported element's actual layout.

### C. Floating page navigator

Allow users to switch pages through a visual popover rather than permanent navigation.

Use thumbnails where they provide meaningful recognition.

### D. Command palette

Consider a keyboard-accessible command palette.

Suggested shortcut:

`⌘K` on macOS and `Ctrl+K` elsewhere, unless it conflicts with essential editing commands.

It could expose:

- Switch page.
- Open settings.
- Replace image.
- Preview.
- Publish.
- Open version history.

This is a secondary productivity feature, not the primary interface.

Every important action must remain discoverable without it.

### E. Focus mode

Allow users to temporarily hide editor controls and inspect their website.

The user must be able to return to editing immediately.

### F. Adaptive tool positioning

Position contextual controls near the selected element without covering text.

Handle viewport edges, scrolling, zooming, and mobile viewports.

### G. Publication feedback

Make publishing feel deliberate and satisfying.

Use a restrained transition to show:

- Publishing.
- Published successfully.
- Live website URL.
- Changes not yet published.

Avoid celebratory animations for routine actions.

### H. Tablet-first editing

Investigate an interface that supports:

- Touch selection.
- Larger touch targets.
- Bottom sheets.
- Pointer interactions.
- Keyboard shortcuts.
- Landscape and portrait layouts.

Do not depend on hover for core functionality.

## 9. Reconsider typography and iconography

The application should feel more editorial, expressive, and precise.

### Typography

Evaluate a small number of suitable open-source, appropriately licensed typefaces.

Consider:

- Geist.
- Inter.
- Manrope.
- DM Sans.
- Other strong contemporary UI typefaces.

Establish a deliberate typographic hierarchy.

Avoid generic dashboard typography.

Use restrained weights, excellent spacing, and readable sizes.

### Icons

Choose one consistent icon system.

Audit every existing icon.

Fix inconsistent:

- Stroke weight.
- Size.
- Metaphors.
- Alignment.
- Active states.
- Touch targets.

Avoid unnecessary icons next to obvious text labels.

Do not mix multiple unrelated icon styles.

## 10. Redesign the complete frontend

Apply the new interaction language to:

- Dashboard.
- Website import.
- Editor.
- Page selection.
- Asset management.
- Settings.
- Publishing.
- Version history.
- Authentication.
- Empty and error states.

Do not create an excellent editor surrounded by inconsistent administrative screens.

The dashboard should feel like a collection of creative projects.

The import experience should be approachable.

The editor should feel immersive.

The publishing experience should be clear and reliable.

All screens must belong to the same product.

## 11. Preserve the existing architecture and security

Pagehaven uses Loco.rs and supports static-only ZIP imports.

Preserve:

- Static-only import restrictions.
- ZIP validation.
- Preview-origin isolation.
- Imported JavaScript restrictions.
- Project authorization.
- Draft persistence.
- Version history.
- Static publishing.
- Domain verification.
- Existing security boundaries.

Do not allow imported website CSS or JavaScript to affect Pagehaven's application interface.

Do not allow the new floating editor to bypass isolated iframe communication rules.

Do not weaken sanitization, URL validation, or publishing protections.

Do not introduce AI prompting.

Do not rebuild the backend for a visual redesign.

## 12. Build an original visual identity

We want inspiration from Apple, Craft, Linear, Framer, and Raycast.

We do not want a clone.

Create a recognizable Pagehaven visual language.

Explore:

- Beautiful floating capsules.
- Restrained glass surfaces.
- Exceptional typography.
- Precise iconography.
- Gentle elevation.
- Context-aware controls.
- Subtle pointer feedback.
- Soft but deliberate transitions.
- Calm neutral workspace backgrounds.
- One distinctive accent color.

The interface should look excellent with many different imported website designs.

Avoid giving everything the same rounded-card treatment.

Favor carefully composed, purposeful surfaces.

## 13. Prototype multiple directions before committing

Produce three genuinely distinct design directions for the editor.

For example:

**Direction A — Floating Studio**

An immersive full-width canvas with small floating control islands.

**Direction B — Spatial Workspace**

A macOS-inspired canvas with layered contextual surfaces and an adaptive command dock.

**Direction C — Editorial Canvas**

A Craft-inspired environment with exceptionally restrained controls, document-like editing, and expressive typography.

These are starting ideas, not prescribed layouts.

For each direction, evaluate:

- Canvas visibility.
- Discoverability.
- Editing speed.
- Accessibility.
- Visual distinctiveness.
- Implementation complexity.
- Responsiveness.

Create actual browser-rendered prototypes or working branches rather than relying solely on written descriptions.

Capture screenshots at desktop and tablet sizes.

Recommend one direction with an explicit rationale.

Then implement the strongest direction.

Do not spend excessive time polishing rejected alternatives.

## 14. Implementation phases

**Phase A — Baseline**

Capture screenshots of the current interface.

Document the current interaction problems.

Identify important existing functionality and tests.

**Phase B — Research**

Have the subagents investigate HCI principles and relevant platform design guidelines.

Create a concise evidence-to-design decision document.

**Phase C — Exploration**

Produce three visually distinct concepts.

Critique them.

Select one coherent direction.

**Phase D — Design foundation**

Implement updated typography, colors, materials, icons, spacing, and motion.

**Phase E — Editor overhaul**

Remove the permanent sidebar.

Implement floating navigation, contextual controls, popover settings, and a larger canvas.

Improve selection and editing interactions.

**Phase F — Remaining screens**

Redesign dashboard, import, settings, assets, and publishing.

**Phase G — Independent critique**

Use Impeccable and the critical review subagent to identify the five most serious remaining UX problems.

Fix them.

**Phase H — Verification**

Run browser-based end-to-end checks.

Test the full import, edit, save, preview, publish, and rollback workflows.

Capture final screenshots at desktop, tablet, and mobile sizes.

## 15. Usability evaluation

Evaluate actual workflows, not only appearance.

Use representative tasks:

1. Find and edit the homepage heading.
2. Replace the hero image.
3. Change a button's destination.
4. Switch to another page.
5. Change website settings.
6. Preview the mobile version.
7. Publish a change.
8. Restore a previous version.

For each task, record:

- Number of deliberate actions.
- Whether the action is discoverable without instructions.
- Unnecessary context switching.
- Interaction failures.
- User-visible feedback.
- Keyboard and touch support.

Do not invent results from real usability participants.

If no participants are available, report expert-review findings as hypotheses and perform reproducible interaction tests.

## 16. Performance and accessibility

Glass effects and animation must not damage responsiveness.

Measure:

- Editor loading performance.
- Interaction responsiveness.
- Selection latency.
- Layout shifts.
- Animation smoothness.
- Memory consumption.

Respect reduced-motion preferences.

Provide high-contrast and opaque material fallbacks.

Maintain keyboard navigation and focus management.

Make touch targets appropriately sized.

Ensure controls remain visible over imported content.

Target WCAG 2.2 AA.

Avoid sacrificing usability to achieve a specific aesthetic.

## 17. Working rules

- Use Impeccable throughout the process.
- Research before selecting the design direction.
- Challenge the current UX architecture.
- Remove the permanent sidebar.
- Move website settings into contextual surfaces.
- Make the website canvas the primary focus.
- Prefer floating, adaptive controls.
- Use glass effects selectively.
- Implement functional interactions, not static mockups.
- Do not add dependencies without approval.
- Do not break existing editing functionality.
- Do not change backend architecture unnecessarily.
- Do not weaken security boundaries.
- Do not push, open pull requests, or deploy without approval.

Use a small number of coherent local commits.

Maintain a concise progress document.

## 18. Deliverables

Provide:

1. **Research brief:** Published HCI findings and links to sources.
2. **Design exploration:** Three alternatives and a justified selection.
3. **Design system:** Typography, iconography, colors, materials, elevation, and motion.
4. **Working redesign:** Complete frontend implementation.
5. **Before/after screenshots:** Editor, dashboard, import, and publishing.
6. **UX evaluation:** Task-based findings and corrections.
7. **Accessibility and performance:** Measured results.
8. **Implementation summary:** Major changes, preserved functionality, and remaining limitations.

## Definition of done

The redesign is complete when:

- The permanent sidebar is gone.
- The canvas occupies substantially more of the viewport.
- Pages are accessible through a compact contextual navigator.
- Settings open through a clear popover, sheet, or dialog.
- Toolbars float above the workspace.
- Editing controls appear contextually.
- Text, images, and links remain easy to edit.
- The visual language feels coherent and distinctive.
- Glass materials enhance hierarchy without reducing legibility.
- Mouse, trackpad, keyboard, and touch interactions remain usable.
- Save and publication states are unmistakable.
- Desktop, tablet, and mobile layouts work.
- Existing security and functionality remain intact.
- The final design has been reviewed in a real browser.
- The new interaction model demonstrates clear usability improvements over the baseline.

**Success criterion:** Opening Pagehaven should feel like opening a premium creative application. The user should see their website first, understand how to edit it immediately, and interact with lightweight, elegant controls that never compete with the website itself.

The product should feel thoughtfully designed, not merely decorated.

Start by auditing the existing screenshot and running application. Research the interaction principles, develop three distinct directions, select the strongest, and implement the complete redesign.

Do not stop at a design proposal. Deliver and verify the working frontend.
