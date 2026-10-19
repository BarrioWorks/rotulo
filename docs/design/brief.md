# Pagehaven — Complete UI/UX Redesign Using Impeccable

Act as a world-class product designer, creative director, and senior frontend engineer.

**Objective:** Completely redesign Pagehaven's visual identity, interface, typography, iconography, and interactions to create a distinctive, premium visual website editor.

The result should feel like a thoughtfully designed commercial product, not a generic SaaS dashboard or an AI-generated interface.

Use **[Impeccable by pbakaus](https://github.com/pbakaus/impeccable)** as the primary design methodology.

This is an implementation task. Audit the current interface, develop a coherent design direction, implement it, and verify the result in a real browser.

## 1. Assemble a design team using subagents

Delegate independent design responsibilities to up to five subagents.

Each subagent must inspect the relevant Impeccable skills and follow their instructions.

Assign these responsibilities:

**Subagent A — Creative Direction**
- Research distinctive contemporary software interfaces.
- Establish Pagehaven's visual identity.
- Define the typography, colors, surfaces, proportions, and visual personality.
- Challenge conventional SaaS design patterns.

**Subagent B — UX and Interaction Design**
- Review the complete user journey.
- Improve navigation, information hierarchy, and editing interactions.
- Simplify confusing workflows.
- Identify opportunities for contextual controls and progressive disclosure.

**Subagent C — Typography and Iconography**
- Audit every font, icon, and typographic style.
- Recommend a coherent font system.
- Establish icon sizing, stroke weights, optical alignment, and consistency.
- Replace generic, inconsistent, or inappropriate icons.

**Subagent D — Visual Editor Design**
- Focus on the website canvas, selection states, contextual toolbar, side panels, and responsive editing.
- Make the editing experience feel direct, intuitive, and precise.
- Ensure imported websites remain visually dominant.

**Subagent E — Independent Design Critic**
- Review the proposed work critically.
- Identify generic patterns, inconsistencies, accessibility issues, visual clutter, and weak interactions.
- Compare the implemented interface against the design principles.
- Recommend specific corrections.

The main agent owns integration and implementation decisions.

Do not allow subagents to independently redesign shared components or overwrite each other's work.

## 2. Use Impeccable throughout the process

Inspect the installed Impeccable skill and its available commands.

If unavailable, read the official repository instructions and report the installation requirement before proceeding.

Use the relevant design workflows, including those for:

- Auditing
- Typography
- Color
- Layout
- Interaction
- Accessibility
- Polish
- Simplification
- Distinctiveness
- Design critique

Use only commands and capabilities that actually exist in the installed version.

Do not merely mention Impeccable in the final report. Apply its methodology to actual design decisions and implementation.

## 3. Establish the visual direction

### Product context

Pagehaven lets nontechnical users import static websites, edit them visually, and publish them.

There is no AI prompting in v1.

The interface must make people feel confident editing a website without understanding HTML or CSS.

### Design references

Use these products for inspiration:

- **Craft:** Calm, editorial composition, typography, whitespace, and contextual controls.
- **Linear:** Precision, restraint, interactions, and interface consistency.
- **Framer:** Visual editing, canvas interactions, and modern creative tooling.
- **Raycast:** Polished controls, responsiveness, and attention to detail.
- **Figma:** Selection affordances and contextual editing patterns.

Study what makes these interfaces effective.

Do not reproduce their layouts, branding, or proprietary assets.

### Desired character

Pagehaven should feel:

- Bold but not loud.
- Minimal but not empty.
- Sophisticated but approachable.
- Creative but predictable.
- Modern without relying on trends.
- Precise without feeling technical.
- Warm without becoming playful or childish.

Develop an original visual identity appropriate for a serious creative productivity product.

Avoid generic startup aesthetics.

## 4. Completely reconsider typography

Do not preserve the current font choices merely because they are already implemented.

Evaluate typography across the entire application:

- Brand typography.
- Display headings.
- Page titles.
- Navigation labels.
- Body text.
- Form controls.
- Buttons.
- Captions.
- Tooltips.
- Editing controls.
- Numeric values.
- Empty states.

Select a carefully matched typography system.

Prefer one excellent typeface or a complementary two-family pairing.

Consider typefaces such as Inter, Geist, Manrope, Plus Jakarta Sans, DM Sans, or other suitable alternatives.

These are candidates, not mandatory selections.

Evaluate actual readability, character, licensing, performance, and visual character before choosing.

Establish:

- Font sizes.
- Font weights.
- Line heights.
- Letter spacing.
- Heading hierarchy.
- Text colors.
- Responsive scaling.

Avoid oversized headings everywhere.

Avoid tiny low-contrast interface text.

Typography should establish a clear hierarchy without relying on excessive font weights.

## 5. Redesign iconography

Audit every icon in the application.

Identify:

- Inconsistent icon families.
- Mixed stroke weights.
- Incorrect visual metaphors.
- Poor optical alignment.
- Excessive decorative icons.
- Icons that require explanation.
- Inconsistent sizing.
- Unnecessary icon-only controls.

Choose one cohesive icon system.

Evaluate Lucide, Phosphor, Tabler, or another established library.

Do not mix multiple icon families.

Use icons only when they improve recognition or navigation.

Prefer text labels when an icon's meaning is ambiguous.

Define:

- Standard icon sizes.
- Stroke weights.
- Active and inactive states.
- Alignment rules.
- Hover and focus behavior.
- Disabled states.
- Label conventions.

Create consistent controls for editing text, replacing images, changing links, managing pages, undoing changes, and publishing.

Do not introduce new dependencies without approval. If a different icon library is necessary, explain why and request approval before installation.

## 6. Build a coherent design system

Create or refine a small set of reusable design tokens.

Include:

**Color**
- Backgrounds.
- Surfaces.
- Primary text.
- Secondary text.
- Borders.
- Selection accents.
- Interactive controls.
- Success, warning, and error states.

**Typography**
- Font families.
- Font sizes.
- Weights.
- Line heights.
- Letter spacing.

**Layout**
- Spacing scale.
- Container widths.
- Sidebar widths.
- Panel dimensions.
- Responsive breakpoints.

**Components**
- Buttons.
- Inputs.
- Menus.
- Dialogs.
- Drawers.
- Tooltips.
- Navigation.
- Cards.
- Tables.
- Toasts.
- Empty states.

**Interaction**
- Hover.
- Focus.
- Selection.
- Loading.
- Disabled.
- Saving.
- Error.
- Success.

Avoid introducing a large design-system framework.

Prefer a small, explicit set of tokens and well-designed components.

## 7. Redesign every major application screen

Do not limit the redesign to the homepage.

### Authentication

Create a minimal, elegant login and registration experience.

Avoid unnecessary decorative elements.

### Dashboard

Make the user's websites the focus.

Improve:

- Project cards.
- Project thumbnails.
- Navigation.
- Import action.
- Status indicators.
- Empty states.
- Project menus.

The dashboard should feel like a creative workspace rather than an administrative system.

### ZIP import

Design an exceptionally clear import experience.

Include:

- Prominent drag-and-drop area.
- Clear file requirements.
- Upload progress.
- Processing feedback.
- Helpful error states.
- Successful import transition.

Make the interface reassuring without excessive instructional text.

### Visual editor

This is the most important screen.

The website preview must remain the visual focus.

Redesign:

- Global toolbar.
- Page navigation.
- Left sidebar.
- Canvas.
- Selection outlines.
- Hover states.
- Contextual editing controls.
- Properties panel.
- Image replacement.
- Link editing.
- Typography controls.
- Mobile and desktop preview switching.
- Save and publish actions.

Avoid permanently displaying large numbers of controls.

Use contextual tools that appear when needed.

Keep advanced functionality discoverable without making the interface intimidating.

### Publishing

Make publishing feel simple and predictable.

Improve:

- Publication state.
- Domain management.
- Publication confirmation.
- Version history.
- Rollback.
- Error messages.

Clearly distinguish saved drafts from published changes.

## 8. Invent better interactions where justified

Do not restrict the redesign to colors, fonts, and icons.

Explore improvements such as:

- Contextual floating toolbars.
- Intelligent panel positioning.
- Smooth selection transitions.
- Direct inline editing.
- Keyboard shortcuts.
- Clear drag handles.
- Improved page switching.
- Better asset replacement workflows.
- Subtle save-state feedback.
- More intuitive responsive previews.

Interactions should reduce effort rather than merely look impressive.

Avoid animations that delay input or obscure state.

Support reduced-motion preferences.

Keep interactions keyboard-accessible.

## 9. Make the interface distinctly recognizable

A user should recognize Pagehaven from its interface, not only its logo.

Consider developing a recognizable combination of:

- Editorial typography.
- Warm neutral surfaces.
- A distinctive selection accent.
- Elegant floating controls.
- Carefully composed panels.
- Consistent icon geometry.
- Restrained motion.
- Strong visual rhythm.

Avoid:

- Generic purple gradients.
- Glassmorphism everywhere.
- Excessive shadows.
- Arbitrary rounded cards.
- Identical dashboard cards.
- Decorative icons in every heading.
- Oversized hero sections inside productivity interfaces.
- Low-contrast gray text.
- Unnecessary animations.
- Generic AI-generated illustrations.

**Distinctiveness must come from a coherent visual system, not decorative complexity.**

## 10. Preserve functionality

This is a visual and interaction redesign, not authorization to rewrite the application.

Preserve:

- Authentication.
- Project management.
- ZIP import.
- Website preview.
- Visual editing.
- Draft persistence.
- Publishing.
- Domains.
- Version history.
- Authorization and security boundaries.

Do not change the static-only import policy.

Do not introduce AI prompting.

Do not alter backend architecture unnecessarily.

Do not change data models without a functional requirement.

Do not weaken the isolation of imported website previews.

Imported website CSS must never leak into Pagehaven's interface, and Pagehaven's styling must not unintentionally modify imported websites.

## 11. Accessibility and usability

Target WCAG 2.2 AA.

Verify:

- Keyboard navigation.
- Visible focus states.
- Sufficient contrast.
- Touch target sizes.
- Screen-reader labels.
- Accessible menus and dialogs.
- Logical focus order.
- Responsive layouts.
- Zoom support.
- Reduced motion.
- Error identification.
- Clearly distinguishable interactive elements.

Test with a nontechnical user's perspective.

The editor should make the next available action obvious.

Do not sacrifice usability for a minimalist appearance.

## 12. Implement and review iteratively

Follow this sequence.

### Phase A — Audit

Inspect all current screens and components.

Capture baseline screenshots.

Use Impeccable to identify visual and UX weaknesses.

### Phase B — Design direction

Have the creative-direction subagent define the visual system.

Have the typography and iconography subagent independently critique the choices.

Settle on one cohesive direction before extensive implementation.

### Phase C — Design foundation

Implement typography, colors, spacing, icons, and foundational components.

Remove obsolete styles and visual inconsistencies.

### Phase D — Core screens

Redesign authentication, dashboard, import, and publishing screens.

### Phase E — Visual editor

Redesign the editor with particular attention to direct manipulation, selection feedback, contextual controls, and responsive behavior.

### Phase F — Polish

Use relevant Impeccable workflows to improve spacing, typography, alignment, motion, and interaction quality.

### Phase G — Independent critique

Have the design critic inspect the actual implemented application, not only code or descriptions.

Identify the five most important remaining weaknesses and correct them.

### Phase H — Verification

Test all primary workflows.

Capture desktop and mobile screenshots.

Run relevant automated tests.

Check accessibility and browser behavior.

## 13. Working rules

- Implement the redesign, not just a design proposal.
- Use Impeccable as the primary design methodology.
- Delegate focused tasks to subagents.
- Limit subagent concurrency to five.
- Keep one coherent design direction.
- Prioritize the visual editor.
- Reuse existing architecture and business logic.
- Avoid unnecessary dependencies.
- Do not install fonts or icon libraries without checking licensing and obtaining dependency approval.
- Do not introduce complex frontend frameworks without justification.
- Do not rewrite working backend functionality.
- Do not remove accessibility features.
- Do not modify production.
- Do not deploy, push commits, or open pull requests without approval.

Make small, verifiable changes and commit coherent milestones locally.

## 14. Deliverables

Provide:

1. **Design direction:** Typography, colors, iconography, and visual principles.
2. **Design system:** Updated tokens and reusable components.
3. **Redesigned application:** All major screens, with emphasis on the visual editor.
4. **Before/after screenshots:** Desktop and mobile comparisons.
5. **UX improvements:** Specific interaction problems solved.
6. **Accessibility results:** Issues identified and corrected.
7. **Implementation summary:** Files changed, dependencies, and remaining limitations.

Document why the selected typography and icon system fit Pagehaven.

Do not provide generic explanations such as "modern and clean."

## Definition of done

The redesign is complete when:

- Pagehaven has a coherent, recognizable visual identity.
- Typography is consistent and expressive.
- Icons use one visual language.
- Every major screen follows the same design system.
- The editor feels intuitive and visually polished.
- Important controls are discoverable.
- Imported websites remain visually dominant.
- The interface works on desktop and mobile.
- Keyboard and accessibility requirements remain supported.
- All existing functionality continues to work.
- The final result has been reviewed in a real browser.
- Independent design critique has identified and resolved major weaknesses.

**Success criterion:** Pagehaven should look and feel like a premium creative productivity application that could compete visually with established products such as Craft, Framer, and Linear, while remaining approachable for people who do not know how to code.

Start by auditing the complete current interface using Impeccable. Delegate independent design reviews, establish one distinctive visual direction, and implement the redesign end to end.

Do not stop at mockups or CSS token changes. Continue until the actual working application demonstrates a substantial, coherent improvement.