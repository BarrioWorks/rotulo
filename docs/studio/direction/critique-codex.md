# Phase C independent critique

[Observed] This is an independent, single-context review, as requested. I did not read `critique.md` or consult the other critic.

[Inferred] Pick A's workspace model. Keep its reserved band and persistent global controls. Use B's single bottom command surface on touch. Borrow C's compact caption typography. Keep a viewport-sized, internally scrolling iframe.

## Evidence and limits

[Observed] I read the requested brief sections, decisions, baseline, HCI recommendations and warnings. I inspected the three READMEs, prototype HTML, CSS and JavaScript, and the real editor and agent integration. Self-assessment claims did not determine the scores.

[Observed] Screenshot inspection covered each direction's desktop and tablet selection, 1024 settings, and phone resting state. The screenshots show Onest. Serving the committed folders directly produced missing-font requests, so live geometry below uses the system fallback. Small width differences are therefore not typography findings.

[Measured] Browser checks used Chromium at 1280×800, 834×1112 and 390×844. B used `?touch=1` for its tablet bar. These were keyboard and mouse checks with responsive layouts, not physical touch or screen-reader tests.

[Observed] All three prototypes substitute fixed hotspots for the real agent. Their text sessions simulate typing and saving. Page switching scrolls or navigates fragments of Agency. These sketches cannot establish persistence, accurate selection latency, or completion times for real editing.

[Measured] The CLI Impeccable detector ran on all three folders and returned findings, including radius advisories and padding warnings. [Inferred] Radius differences from the incumbent design are weak evidence during exploration. The browser failures below matter more.

## Scores

[Inferred] Scores are expert judgments from 1 to 5. Higher is better throughout. For implementation risk, 5 means least risk. These scores evaluate the direction and its demonstrated defects, not release readiness. Editing speed is a prediction, not participant data.

| Criterion | A: Floating Studio | B: Spatial Workspace | C: Editorial Canvas |
|---|---|---|---|
| Canvas visibility | [Inferred] **5**. Edge-to-edge width and a small reserved band give the site the strongest presence. | [Inferred] **4**. Thin gutters are reasonable, but the dock and bottom lip consume more space. | [Inferred] **4**. Quiet framing exposes much of the site, but captions can leave the visible viewport. |
| Accessibility | [Inferred] **3**. Native modal settings and keyboard canvas work, but small touch controls and motion omissions remain. | [Inferred] **2**. Good labels and larger controls are undermined by modal focus escape and lost popover focus. | [Inferred] **2**. False modality, unannounced active page rows and undersized controls weaken the restrained UI. |
| Discoverability | [Inferred] **3**. Mode and device controls remain available, but Images and version history need clearer routes. | [Inferred] **2**. Selection removes the labelled Settings, Images and Preview commands from the dock. | [Inferred] **2**. Desktop words are explicit, but several routes disappear at smaller widths. |
| Editing speed | [Inferred] **4**. Nearby actions reduce pointer travel, subject to placement and occlusion repairs. | [Inferred] **3**. A stable destination helps learning but requires a trip away from each selection. | [Inferred] **3**. Nearby word commands are promising, but missing property flows and offscreen captions interrupt work. |
| Visual quality | [Inferred] **4**. Three restrained islands distinguish the app without shrinking the site. | [Inferred] **4**. The raised page and dock form a coherent creative workspace, with a more familiar identity. | [Inferred] **5**. The caption and typographic navigation are the most distinctive and visually economical. |
| Responsiveness | [Inferred] **3**. Touch stacks two command surfaces and some segmented targets remain too short. | [Inferred] **4**. One reserved bottom bar scales well, although settings targets still need repair. | [Inferred] **2**. Phone navigation loses visible view controls, and tablet targets miss the settled size. |
| Implementation risk | [Inferred] **4**. Existing placement and action logic can support the design if its prototype frame model is discarded. | [Inferred] **4**. Fixed placement simplifies toolbar geometry, but global routes and focus handling need restructuring. | [Inferred] **1**. Full-height framing changes site behavior and requires a new geometry and scrolling contract. |

## Measurements and interaction checks

[Measured] Visible iframe intersection divided by viewport area gave the following resting shares. This counts content behind hints or controls. It is not unobscured canvas area.

| Viewport | A | B | C |
|---|---:|---:|---:|
| 1280×800 | [Measured] 93.5% | [Measured] 88.1% | [Measured] 92.1% |
| 834×1112 | [Measured] 95.3% | [Measured] 89.6% | [Measured] 92.6% |
| 390×844 | [Measured] 93.8% | [Measured] 86.3% | [Measured] 93.8% |

[Measured, baseline record] The incumbent desktop share is 67.7%, with layout shift of 0.26 to 0.40 across recorded sizes. [Inferred] All three directions offer a substantial area improvement. The prototype shares do not prove that load shift or save behavior is fixed in the app.

| Check and reproduction | Result |
|---|---|
| Keyboard heading editing | [Measured] In A, focus `#hit`, press ArrowDown, Enter, then Escape. The heading remains selected and the dock returns to Heading actions. [Observed] This is a simulated text session. |
| Settings focus containment | [Measured] A uses `showModal()` and keeps Shift+Tab inside settings. In B, focus the first settings button and press Shift+Tab. Focus reaches the background Focus button. In C, Shift+Tab from Close reaches the background photo hotspot. |
| Property popover return | [Measured] In B, select the heading, open Style, then Escape. Focus ends on `body`. [Observed] `drawDock()` recreates the opener before `closeSurface()` tries to restore it. |
| Page switcher semantics | [Measured] In C, open Home and press ArrowDown. The search retains focus, Services gains the visual active class, Home remains `aria-selected=true`, and the input has no `aria-activedescendant`. [Inferred] The active destination is not reliably communicated to assistive technology. |
| Touch-layout control sizes | [Measured] A's Edit and Preview segments are 40 px tall at both narrow sizes. Its tablet device segments are also 40 px tall. C's Publish is 32 px tall at both sizes, and tablet device buttons are only 36 px wide. B's resting bar buttons meet 44 px in both dimensions. |
| Touch settings and spacing | [Observed] B's narrow `.sheet-nav .row` overrides the bar's 44 px rule with 32 px. C's page action dots stay 28×28 px. All three use adjacent command gaps below the settled 8 px in parts of their chrome. [Inferred] None passes the complete coarse-pointer requirement. |
| Reduced motion | [Measured] Activating the existing reduced-motion CSS media blocks through CSSOM leaves A's islands with a 200 ms transform transition. B and C restrict transitions to opacity and colors. [Observed] Their CSS substitutes short fades; C also disables caret blinking. This tests rule effects, not an operating-system preference change. |

[Observed] All three include reduced-transparency, high-contrast and forced-color rules. A and B use the accent plus a white selection halo; C does too. [Inferred] Those provisions are useful, but one Agency image cannot prove contrast over arbitrary imported sites. Forced-color keyboard focus also needs live testing because several focus treatments depend on box shadows.

[Observed] B and C's focus modes hide chrome with opacity and pointer-event rules, without making it inert. [Inferred] Visually hidden controls can remain in the tab sequence. A additionally uses `visibility: hidden` on its islands.

## The three worst problems in each direction

### A

1. [Observed] The nearby dock competes with neighboring site content. The desktop selection screenshot places it directly above the yellow call to action. The tablet screenshot puts it over Services and stacks another toolbar below it. [Inferred] This compromises inspection and target acquisition. Preserve obstacle avoidance and use one touch command surface.
2. [Observed] Images has no persistent labelled entry outside settings. Settings itself is chiefly a gear or the website name. More is visually an ellipsis. [Inferred] This falls short of settled decisions 1 and 3. Add explicit Settings and Images routes and a visible More label. Label versions inside the publish entry.
3. [Measured] Touch segments remain 40 px high, and reduced-motion islands retain transform transitions. [Observed] The iframe also lacks a sandbox attribute and is 6268 px high on desktop. [Inferred] The prototype is not a safe implementation starting point. Port the design into the real canvas, rather than transplanting its frame or event layer.

### B

1. [Measured] Selecting the heading replaces Pages, Images, Settings and Preview with Edit, Style, Link and More. [Observed] Only the page capsule and the ambiguous website-name settings shortcut survive elsewhere. [Inferred] Fixed dock position does not satisfy stable global access. Keep global commands in permanent slots or outside the contextual region.
2. [Measured] The settings sheet allows focus into the background, and closing Style loses focus. [Observed] The sheet claims `aria-modal=true` without a native dialog or focus containment. The dock rebuilds on render. [Inferred] Preserve DOM identity and establish real modality before treating its keyboard model as accessible.
3. [Observed] Commands sit far from upper-page selections, while the desktop dock overlaps the bottom of the iframe. [Inferred] Property work pays repeated eye and pointer travel. A fixed dock can still cover a selected bottom-edge element or a site's fixed footer. Keep reveal and occlusion logic. Do not delete placement merely because the dock is fixed.

### C

1. [Observed] The frame is sized to a fixed document height, and the parent window scrolls it. [Inferred] Making that dynamic changes viewport-dependent site behavior. This is the largest architectural and fidelity risk of the three directions.
2. [Observed] Settings is a custom section claiming modality. Page rows are non-focusable options containing action buttons. The keyboard active row changes only visually. [Measured] Focus escapes settings, and small view and publish targets remain. [Inferred] Quiet presentation currently hides incomplete interaction semantics.
3. [Observed] The caption is always below the selection. There is CSS for an above variant, but JavaScript never chooses it. Phone view hides Edit/Preview and device controls; Images disappears at widths up to 1100 px. [Inferred] Large or low selections can strand commands below the fold. Palette-only recovery violates the visible-route decision.

## Workflow coverage

[Observed] These are code-path observations, not successful end-to-end task results. Typing, file selection and simulated toasts must not be counted as persisted edits.

| Brief task | Independent assessment |
|---|---|
| Edit homepage heading | [Observed] All offer a second-click or explicit Edit route. A has a tested keyboard sequence. [Inferred] A and C give the shortest pointer path to formatting. |
| Replace hero image | [Observed] Agency's hero is a CSS background. A's banner action is a toast. B lists a banner asset but its banner command set has no Replace. C's Images shortcut selects the portfolio photo. [Inferred] None proves this task. |
| Change button destination | [Observed] A and B expose Link forms. C shows a placeholder toast for Link. [Inferred] C provides weaker evidence for this core task. |
| Switch page | [Observed] All expose page search and rows, but demonstrate sections of one site. [Inferred] Real multipage loading and focus recovery remain unproven. |
| Change website settings | [Observed] All expose a settings surface. B's Save is a toast, while C's General Save has no action handler. [Inferred] Surface access is demonstrated; persistence is not. |
| Preview mobile | [Observed] A keeps device controls outside the selection dock. B exposes devices after entering Preview. C hides the mode and device controls on phones. [Inferred] A has the clearest continuous route. |
| Publish a change | [Observed] All have a review and simulated publishing feedback. [Inferred] Their timed success states cannot establish queue draining, error recovery or real publication. |
| Restore a version | [Observed] A uses a native confirmation. B builds a custom alertdialog. C only toasts a description of confirmation. [Inferred] A demonstrates the strongest interaction boundary. |

## Real-app implementation cost

[Observed] The real `toolbar.ts` already owns capability-filtered `ACTION_ORDER`, `actionsFor`, ancestor selection, image-upload progress, roving focus and focus preservation. `placement.ts` already handles obstacles, site bars, offscreen selections and narrow rows. `canvas.ts` maps agent rectangles through iframe position and scale.

[Observed] `rail.ts` owns page operations and panel lifecycle, not just sidebar markup. `panels.ts` holds live property forms. `publish.ts` owns settings, domains, releases, review and restore. `topbar.ts` combines save and publication status. `main.ts` owns region cycling, shortcuts and the phone Manage gate. [Inferred] Removing the sidebar requires moving these responsibilities before deleting its renderer.

| Direction | Files and concrete changes |
|---|---|
| A | [Inferred] Change `frontend/editor/topbar.ts` for three islands and explicit global routes. Change `toolbar.ts` and `placement.ts` for stable preferred placement, caption treatment and a touch dock. Move `rail.ts` page and image flows into popovers, using `pages.ts` helpers. Change `panels.ts`, `menu.ts` and `publish.ts` for anchored properties, sheet settings and versions. Change `state.ts`, `saves.ts` and `main.ts` for surface state, honest local save feedback, Escape and F6. Change `canvas.ts` to reserve the frame before bootstrap while preserving viewport sizing. Change `assets/views/projects/editor.html` and `assets/static/css/editor.css`. |
| B | [Inferred] Change the same shell, rail, property, publishing, status and wiring files. Rewrite `toolbar.ts` as fixed global slots plus contextual slots. Change `placement.ts` to place popovers and keep selected content clear of the dock. Keep `canvas.ts` viewport sizing and internal scrolling. Retain focusable nodes across updates. The iframe message contract needs no dock-specific extension. |
| C | [Inferred] Change the same shell files, with `toolbar.ts` and `placement.ts` becoming caption placement. Additionally change `canvas.ts`, `state.ts` and `frontend/agent/agent.ts` for outer scrolling, height changes, visible-region calculations, reveal and restoration. Extend `frontend/protocol.ts` with bounded geometry messages if full-height framing remains. This requires a separate boundary review under decision 14. |

[Inferred] A and B are medium implementation work. C with full-height framing is high work with unresolved compatibility limits. These are relative engineering judgments, not day estimates.

[Observed] All directions inherit six baseline debts: late frame sizing, the invalid address pattern, device-switch selection loss, toolbar overlap with site navigation, questionable `touchend` cancellation and omitted background photos in the image outline. [Inferred] Repair the address validation in its real `publish.ts` form. Repair touch handling and background discovery in `agent.ts`. Check `state.ts` device handling and `canvas.ts` reveal behavior together. These costs belong to every choice.

### Isolation and message checks

[Observed] The real frame uses a separate preview origin, `sandbox="allow-scripts allow-same-origin"` and `referrerpolicy="no-referrer"`. `canvas.ts` checks both source window and the origin associated with that specific active or pending frame. It then calls `parseAgentMessage` and `acceptsCanvasMessage`. The agent checks `appOrigin` and `parentWindow` before parsing editor messages. Both sides send to explicit origins.

[Inferred] Keep all app buttons, panels and glass outside the imported document. Keep the agent's closed-shadow selection overlay inside it. A and B can retain the existing message shapes and `canvas-policy.ts` checks. They need coordinate, focus and event integration work, not weaker isolation. Same-origin DOM access, wildcard messaging or copying the published-site hotspots would bypass the architecture rather than implement either direction.

[Observed] Real text sessions are initiated by the parent and matched to an element and page. Escape currently cancels text in both `main.ts` and `agent.ts`, while decision 5 requires keeping it. [Inferred] Every direction needs a coordinated behavior change using the existing finish/commit contract. Preserve session authorization and IME handling. A prototype Escape success does not prove the cross-frame version.

### C's full-height frame cost

[Observed] Cross-origin isolation prevents the parent from reading the site's document height. It does not prevent the agent from measuring it and posting a validated message. [Inferred] Add bounded height reporting, coalesced observations, pending-frame handling and navigation resets. Avoid a second unchecked message listener. Apply height only after the existing origin, source and schema checks.

[Measured] A transient browser fixture contained a `100vh` hero plus 1000 px of following content. Repeatedly setting iframe height to reported document height produced viewport/hero heights of 596, 1592 and 2588 px. Document heights grew from 1596 to 2592 to 3588 px. The test iframe was removed afterward.

[Inferred] That feedback loop has no finite fit for this common structure. Debouncing or a ResizeObserver does not solve it. A cap stops growth by introducing clipping or inner scrolling. Rewriting the imported CSS would violate accurate rendering. The same issue applies to A's prototype if its full-height frame is copied.

[Inferred] Fixed headers remain fixed to the iframe viewport. When the parent scrolls the tall frame, its top and fixed header leave the screen together. Sticky headers and scroll-linked effects also see a different scroll host. Forwarding wheel events or inventing scroll messages does not reproduce arbitrary native site behavior.

[Inferred] Native lazy loading and IntersectionObserver now evaluate a much taller inner viewport. More images can qualify early; some sites may load nearly everything. Exact loading depends on browser thresholds and site code. Late images and fonts can change reported height and outer scroll position. Observe reflow, reserve space and preserve the owner's position, but do not promise that this restores live-site semantics.

[Observed] The real agent uses `innerHeight` and inner `scrollY` for selection clipping, obstacle sampling, fixed-bar detection, hidden-section veils, reveal and reload restoration. [Inferred] C needs a validated parent-visible rectangle and outer-scroll coordination across those functions. `toApp()` can still map coordinates, but it does not make inner visibility or scrolling correct. A height-only protocol extension is insufficient.

[Inferred] A safer version of C would retain the ordinary iframe viewport and its scroll host, and apply the typographic chrome and caption around it. That preserves its visual contribution while dropping its defining document-scroll interaction.

## Pick and reversal evidence

[Inferred] Choose A as the base, conditional on using the real viewport canvas and resolving its reachability and touch defects. Its persistent view controls fit the settled spatial-consistency decision better than B's disappearing globals. Its geometry changes are smaller than C's document model.

[Inferred] Take B's single opaque bottom command bar on coarse pointers. Reserve its space and retain global routes during selection. Take its right-edge settings proportions where useful, but implement real focus containment. Take C's compact kind/save caption, visible More word and plain page labels. Keep A's native confirmation behavior and existing agent-driven selection.

[Inferred] I would switch to B if comparable novice task sessions showed fewer search failures and faster property work with a fixed dock after global routes were repaired. Measure errors and completion times across all eight brief tasks, including long pages and large monitors. Do not substitute a Fitts estimate for those results.

[Inferred] I would switch to C only after a bounded implementation preserved live rendering on sites with viewport heroes, fixed and sticky headers, lazy images and scroll effects, while preserving isolation. A viewport-based C with repaired keyboard semantics could also win a fresh comparison.

[Inferred] Reject any candidate that cannot preserve selection through resize, reach every task without the palette, keep focus visible, meet coarse-pointer targets, and show real save failures. Repeat the baseline's selection-latency and layout-shift measurements on the integrated app before accepting performance claims.

## Ten-line summary

[Inferred] 1. Pick A's workspace model with a viewport-sized iframe.
[Observed] 2. A keeps mode and device controls available during selection.
[Measured] 3. A exposes 93.5% iframe area at desktop rest, before occlusion.
[Observed] 4. A still needs labelled Images, Settings and More routes.
[Inferred] 5. Borrow B's single reserved bottom bar for touch.
[Measured] 6. B loses Style focus and permits focus outside modal settings.
[Inferred] 7. Borrow C's typography and compact selection caption.
[Measured] 8. Full-height resizing repeatedly enlarged a viewport-height hero.
[Inferred] 9. Preserve iframe isolation, source checks and validated messages.
[Inferred] 10. Real task evidence and site-fidelity tests could change the pick.
