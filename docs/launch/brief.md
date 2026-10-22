# Rótulo — Bold Product Design, CRO & UX Overhaul

Act as a founding product designer, creative director, conversion rate optimization specialist, and senior frontend engineer.

**Objective:** Transform Rótulo into a distinctive, premium product with exceptional visual design, intuitive interactions, and a conversion-focused website.

Rótulo must look and feel like a serious competitor to Framer, Webflow, and modern creative productivity tools, while remaining substantially simpler for nontechnical users.

This is an end-to-end implementation task. Research, audit, redesign, implement, and verify the result.

**Do not stop at recommendations or mockups. Deliver a working redesign.**

## 1. Install and use the required skills

Before starting, inspect the following repositories and install only the relevant individual skills.

### Design and interaction

**Impeccable by pbakaus**

Repository: https://github.com/pbakaus/impeccable

Use its design methodology to improve:

- Visual hierarchy and composition.
- Typography and iconography.
- Colors, surfaces, and materials.
- Layout and spacing.
- Motion and microinteractions.
- Accessibility.
- Product distinctiveness.
- UI simplification and polish.

Inspect the current repository documentation to identify the correct installation method and available skills.

Use the relevant Impeccable skills throughout the project, not merely during the initial audit.

### Marketing and conversion optimization

**Marketing Skills by Corey Haines**

Repository: https://github.com/coreyhaines31/marketingskills

Install these individual skills:

- `cro`
- `copywriting`
- `marketing-psychology`
- `seo-audit`

Suggested installation:

```bash
npx skills add coreyhaines31/marketingskills \
  --skill cro copywriting marketing-psychology seo-audit
```

Verify the actual skill names and installation instructions against the current repository.

Do not install the entire marketing skill pack.

### How to combine them

Use the skills as one coordinated workflow.

1. **Impeccable:** Establish a distinctive visual identity and excellent product interactions.
2. **CRO:** Identify friction, unclear messaging, weak conversion paths, and unnecessary decisions.
3. **Marketing psychology:** Understand customer motivation, perceived risk, objections, and trust.
4. **Copywriting:** Write concise, compelling, accurate product messaging.
5. **SEO audit:** Ensure search visibility without compromising content quality or design.

Design and CRO must reinforce each other.

Do not allow marketing requirements to make the product interface cluttered or aggressive.

## 2. Understand Rótulo

Rótulo allows someone to:

1. Generate a website using an external AI coding tool.
2. Export a compatible static website as a ZIP.
3. Import the ZIP into Rótulo.
4. Edit text, images, links, and supported styles visually.
5. Preview the website.
6. Publish it to a hosted URL or custom domain.

**Core positioning:**

"Your AI-built website. Yours to edit."

Supporting value proposition:

"Import your website, edit it visually, and publish it without coding or spending more AI credits."

### Target customers

Evaluate two primary segments:

**Independent creators and nontechnical founders**

People who generated a website using AI but do not know how to maintain it.

**Freelancers and small agencies**

People who build AI-assisted websites for clients and need a simple way to hand over editing and hosting.

Do not assume both segments require identical messaging.

Recommend one primary customer segment for the homepage.

Preserve support for the other where commercially appropriate.

## 3. Conduct a complete UX and CRO audit

Inspect the actual running application and website.

Review:

- Landing page.
- Navigation.
- Registration and authentication.
- Dashboard.
- Website import.
- Editor.
- Saving and version history.
- Publishing.
- Domain configuration.
- Pricing, if implemented.

Identify the most important issues affecting:

- First impressions.
- Product comprehension.
- Trust.
- Perceived product quality.
- Ease of starting.
- Import completion.
- First successful edit.
- First publication.
- Conversion to paid.

Distinguish observed usability problems from assumptions.

Prioritize the highest-impact issues.

Do not optimize for clicks if they do not lead to successful website imports, edits, or publications.

## 4. Establish a bold, distinctive visual identity

We want a strong, recognizable product.

Not another generic SaaS dashboard.

Use these products as references:

- **Craft:** Editorial design, beautiful typography, simplicity.
- **Apple macOS and iPadOS:** Floating controls, spatial clarity, premium interactions.
- **Framer:** Creative energy, visual editing, confidence.
- **Linear:** Precision, consistency, and responsiveness.
- **Raycast:** Polished interactions and compact controls.
- **Arc:** Distinctive navigation and unconventional interface composition.

Do not copy their interfaces or branding.

Develop an original Rótulo identity.

### Visual principles

- Bold, confident composition.
- Exceptional typography.
- Strong visual hierarchy.
- Generous but purposeful whitespace.
- Restrained, distinctive accent colors.
- Premium surfaces and materials.
- Elegant floating controls.
- Carefully controlled glass effects.
- High-quality imagery.
- Minimal visual noise.
- Memorable product details.

Avoid:

- Generic purple-to-blue gradients.
- Excessive glassmorphism.
- Decorative blobs.
- Repetitive rounded cards.
- Stock SaaS illustrations.
- Excessive shadows.
- Oversized headings without hierarchy.
- Weak gray-on-gray contrast.
- Random animations.
- Decorative icons that add no information.

**Bold design should come from confident choices, not more decoration.**

## 5. Redesign the marketing website for conversion

Use `cro`, `copywriting`, and `marketing-psychology`.

The homepage must quickly communicate:

- What Rótulo is.
- Who it is for.
- Which problem it solves.
- How it works.
- Why users should trust it.
- What they should do next.

### Recommended structure

**Hero**

Use a bold, memorable headline focused on the outcome.

Explore alternatives to:

"Your AI-built website. Yours to edit."

Possible direction:

"AI built it. Now you own it."

Do not use that headline without critically evaluating whether it accurately communicates the product.

Include:

- Clear supporting copy.
- One prominent primary CTA.
- A lower-emphasis secondary CTA.
- An actual product demonstration or screenshot.

Avoid generic hero illustrations.

**Problem**

Explain the friction users experience after generating a website.

Focus on:

- Expensive repeated prompting.
- Dependence on coding tools.
- Difficulty changing simple content.
- Complicated deployment.
- Loss of control.

Avoid claiming that users legally own all imported code or assets without verifying the relevant rights.

**How it works**

Show three clear steps:

1. Import your static website.
2. Edit visually.
3. Publish anywhere supported.

Use actual product screenshots or functional demonstrations.

**Product demonstration**

Show an imported website being edited.

Demonstrate:

- Clicking a heading.
- Replacing an image.
- Changing a button.
- Publishing the result.

Prefer a short, genuine product demonstration over decorative animations.

**Benefits**

Communicate concrete outcomes:

- No coding required for supported edits.
- No AI prompting required.
- Visual editing.
- Simple publishing.
- Custom domains.
- Version history where implemented.

Do not invent unsupported capabilities.

**Pricing**

Present pricing transparently once it exists.

Explain what hosting and editing include.

Avoid complicated plans and arbitrary limitations.

**Final CTA**

Provide one clear next action.

### Copywriting requirements

Use natural, direct English.

Avoid:

- "Revolutionize your workflow."
- "Unlock the power of AI."
- "Supercharge your creativity."
- "Seamless, cutting-edge platform."
- Generic claims of effortless website development.

Explain the actual customer benefit.

Prefer concrete demonstrations over broad promises.

## 6. Make import the primary activation experience

For Rótulo, a successful ZIP import is more important than account creation alone.

Optimize the flow from arrival to first editable website.

Investigate whether users can preview a compatible import before registration, without weakening security or exposing the application to anonymous upload abuse.

Do not implement anonymous uploads without explicit approval.

### Import design

Create a beautiful, focused experience.

The interface should clearly communicate:

- What users can upload.
- What files are supported.
- What happens after upload.
- Whether the import succeeded.
- What they can edit next.

Use an elegant drag-and-drop area.

Provide immediate feedback.

For unsupported React/Vite source projects, explain the limitation clearly.

Do not describe a source-code project as a valid static export merely because it contains an HTML file.

Do not claim universal compatibility.

### First successful edit

After import, make the next action obvious.

Consider a subtle, dismissible hint:

"Click any highlighted text to edit it."

Guide the user to one meaningful action.

Avoid lengthy onboarding tours, forced tutorials, and modal sequences.

## 7. Radically improve the editor experience

The editor is Rótulo's primary product differentiator.

Use the Impeccable methodology to make it exceptional.

### Canvas-first layout

Remove permanent panels that unnecessarily reduce the website preview.

Prefer:

- Large immersive canvas.
- Floating workspace controls.
- Contextual selection tools.
- Popover navigation.
- Compact device controls.
- Clear save and publish states.

### Floating materials

Use web-native implementations inspired by Apple's Liquid Glass.

Apply glass selectively to toolbars, popovers, and contextual controls.

Keep complex forms more opaque.

Ensure every floating control remains readable over imported websites with different colors and backgrounds.

### Direct manipulation

Users should interact with the visible website.

Click text to edit.

Click images to replace.

Click links to change destinations.

Select supported sections to manage them.

Do not expose CSS class names, HTML tags, or internal implementation details to ordinary users.

### Contextual controls

Show only relevant controls for the selected element.

Avoid generic property inspectors with dozens of fields.

### Editing feedback

Clearly distinguish:

- Selected.
- Editing.
- Saving.
- Saved.
- Unpublished changes.
- Published.
- Error.

Saving and publishing must remain separate concepts.

Do not imply that autosaved changes are automatically public.

## 8. Apply marketing psychology responsibly

Use the `marketing-psychology` skill to examine:

- Perceived difficulty.
- Perceived risk.
- Product credibility.
- Loss of control.
- Switching costs.
- Ownership concerns.
- Time to first value.
- Price sensitivity.

Evaluate how the interface can reduce uncertainty.

Examples:

**Before import**

Explain supported file formats and the static-only limitation.

**During import**

Show understandable progress and validation errors.

**During editing**

Make changes reversible.

**Before publishing**

Show what will become public.

**After publishing**

Provide the live URL and clear confirmation.

Use honest trust signals.

Never invent testimonials, customer counts, security certifications, or performance claims.

Avoid fake urgency, misleading defaults, and manipulative conversion patterns.

## 9. Introduce distinctive interactions

Research and consider:

- Animated but restrained page transitions.
- Floating contextual toolbars.
- Magnetic selection indicators.
- Refined hover and focus feedback.
- Elegant command menus.
- Smooth canvas resizing.
- Responsive device previews.
- Useful keyboard shortcuts.
- Beautiful empty states.
- Purposeful publication feedback.

Every animation must serve a function.

Respect reduced-motion settings.

Do not use animation to conceal slow operations.

### Original ideas

Ask the design subagents to propose at least five interaction ideas specifically suited to Rótulo.

Evaluate them by:

- Discoverability.
- User benefit.
- Technical feasibility.
- Accessibility.
- Performance.
- Implementation cost.

Implement the strongest ideas.

Reject decoration that provides no measurable or demonstrable benefit.

## 10. Typography and iconography overhaul

Use one coherent typography system and one icon family.

Research suitable open-source typefaces and icons.

Evaluate options such as:

- Geist.
- Inter.
- Manrope.
- DM Sans.
- Phosphor.
- Lucide.
- Tabler.

These are candidates, not mandatory choices.

Choose based on Rótulo's identity.

Create consistent rules for:

- Font sizes and weights.
- Text hierarchy.
- Spacing.
- Icon dimensions.
- Stroke weights.
- Button proportions.
- Navigation.
- Tooltips.
- Empty states.
- Interactive feedback.

Check licensing.

Do not introduce font or icon dependencies without approval.

## 11. Research and SEO foundations

Use `seo-audit` to ensure the marketing website is technically sound.

Review:

- Page titles.
- Meta descriptions.
- Semantic headings.
- Internal links.
- Canonical URLs.
- Sitemap.
- Robots directives.
- Structured data where appropriate.
- Mobile usability.
- Image optimization.
- Performance.
- Accessibility.

Investigate organic search opportunities such as:

- Visual editor for AI-generated websites.
- Edit a website without coding.
- Host an AI-generated website.
- Edit exported HTML visually.
- Publish a static website.
- Alternatives to repeatedly prompting AI website builders.

Treat these as keyword hypotheses until search demand is verified.

Do not publish generic SEO articles merely to increase page count.

Focus on high-intent pages that help potential customers understand Rótulo.

## 12. Define a conversion funnel

Establish a simple funnel:

Visitor → Signup → Successful import → First edit → First publication → Paid subscription.

Identify the existing events and data needed to measure each stage.

Do not introduce third-party tracking services unnecessarily.

Prioritize activation metrics:

- Import success rate.
- Time to first successful edit.
- First edit completion rate.
- Publication completion rate.
- Return editing sessions.

Do not confuse a visually attractive page with an effective product.

Where baseline traffic or usage data is unavailable, say so.

Do not fabricate conversion improvements.

## 13. Research before implementing

Delegate research to the subagents.

Require a concise report covering:

1. Current UX and CRO problems.
2. Published UX principles that apply to Rótulo.
3. Competitor interaction patterns.
4. Three possible visual directions.
5. Recommended direction and expected trade-offs.

Use primary sources where possible.

Relevant references include:

- Apple Human Interface Guidelines.
- Nielsen Norman Group usability research.
- Published direct-manipulation research.
- Established accessibility guidance.
- Current frontend performance documentation.

Provide source links.

Distinguish evidence from design opinion.

Do not spend the entire session producing research.

## 14. Implement the redesign

After research, continue into actual implementation.

### Phase A — Baseline

Capture current screenshots.

Inspect existing components, routes, and interactions.

Identify the primary visual and conversion problems.

### Phase B — Design direction

Produce three distinct concepts.

Select one coherent identity.

Define typography, icons, color, materials, and layout principles.

### Phase C — Marketing website

Redesign the homepage and conversion journey.

Implement clear product positioning, real demonstrations, and appropriate CTAs.

### Phase D — Dashboard and import

Improve project presentation and first-time onboarding.

Make importing a website the dominant action.

### Phase E — Visual editor

Implement the canvas-first experience, contextual controls, floating navigation, and refined editing interactions.

### Phase F — Publishing

Improve domain configuration, version history, and publication feedback.

### Phase G — Polish

Use Impeccable to audit, simplify, critique, and refine the entire interface.

### Phase H — Verification

Test the actual application in a browser.

Run relevant automated tests.

Inspect desktop, tablet, and mobile screenshots.

Correct visual defects and broken interactions.

## 15. Preserve the existing security model

Rótulo runs on Loco.rs and supports static-only imports.

This redesign must not weaken:

- ZIP validation.
- Static-only restrictions.
- Preview-origin isolation.
- Authentication.
- Authorization.
- Content Security Policy.
- Asset validation.
- Safe publication.
- Version history.
- Tenant isolation.

Do not execute uploaded scripts on the server.

Do not introduce AI prompting.

Do not replace the backend architecture merely to accommodate a frontend design.

The application also shares an OVH VPS with production services.

Do not modify production infrastructure without approval.

## 16. Verification requirements

Test real user journeys:

1. A visitor understands Rótulo's purpose.
2. A user registers.
3. The user imports a compatible static ZIP.
4. The website appears correctly.
5. The user edits text.
6. The user replaces an image.
7. The user changes a link.
8. The user saves changes.
9. The user previews mobile layout.
10. The user publishes the website.
11. The user opens the live website.
12. The user returns and edits it again.

Measure task completion where possible.

Verify that the redesign does not introduce extra steps or confusing hidden interactions.

Check:

- Accessibility.
- Keyboard navigation.
- Touch interaction.
- Responsive layouts.
- Contrast.
- Focus management.
- Reduced motion.
- Performance.
- Browser compatibility.

## 17. Working constraints

- Use Impeccable and the selected marketing skills.
- Install only necessary individual skills.
- Do not install large skill packs.
- Keep the product visually distinctive.
- Prioritize actual usability over decorative novelty.
- Implement working interfaces, not mockups.
- Preserve existing functionality.
- Avoid unnecessary dependencies.
- Avoid generic SaaS aesthetics.
- Do not invent product capabilities.
- Do not introduce manipulative conversion techniques.
- Do not rewrite the backend.
- Do not weaken security.
- Do not modify production.
- Do not push or deploy without approval.

Make coherent local commits.

Use independent design and security reviews.

## 18. Final deliverables

Provide:

1. **Research summary:** The most relevant UX, design, and CRO findings with sources.
2. **Visual identity:** Typography, colors, materials, icons, and distinctive design decisions.
3. **Marketing redesign:** Updated homepage, messaging, and conversion paths.
4. **Product redesign:** Updated dashboard, import, editor, and publishing experiences.
5. **Before/after screenshots:** Desktop, tablet, and mobile.
6. **Usability assessment:** Key workflow improvements and remaining friction.
7. **Conversion instrumentation:** Events and definitions.
8. **Verification:** Test results, accessibility findings, and performance measurements.

## Definition of done

Rótulo should:

- Immediately communicate its purpose.
- Look like a distinctive premium product.
- Have an original, coherent visual identity.
- Provide a memorable but understandable editing experience.
- Make importing and editing simple for nontechnical users.
- Offer a clear path from first visit to published website.
- Use strong typography and consistent iconography.
- Apply floating and glass materials purposefully.
- Work across desktop, tablet, and mobile.
- Preserve existing security boundaries.
- Avoid unnecessary infrastructure and dependencies.
- Demonstrate a meaningful improvement over the previous design.

**Success criterion:** A first-time visitor should understand Rótulo in seconds, want to try importing a website, and be able to complete their first edit without instructions.

The result must combine the aesthetic ambition of a premium creative application with the clarity and efficiency of a genuinely useful tool.

Begin by installing and inspecting the required skills, auditing the current application, and researching the relevant UX principles.

Then implement and verify the complete redesign.

Do not stop at a written strategy or visual mockups.
