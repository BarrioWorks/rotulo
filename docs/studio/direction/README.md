# Phase C: three directions and the pick

Three agents each built one browser prototype over the published Agency site. Two critics on different models then tested all three without seeing each other's work: `critique.md` (Claude Opus, in the browser) and `critique-codex.md` (GPT, code reading plus browser checks). Both picked the same base and named the same grafts.

| | A Floating Studio | B Spatial Workspace | C Editorial Canvas |
|---|---|---|---|
| Idea | Site edge to edge under a 52 px band; three glass islands; a dock beside the selection | Site as a raised surface; one dock fixed at the bottom centre; settings sheet from the right | Chrome made of words; the whole site scrolls as a document; commands as a caption under the selection |
| Canvas share at 1280x800, measured | 0.935 | 0.881 | 0.921 |
| Opus critic score (of 35) | 25 | 25 | 22 |
| Worst problem | No visible Images control and an icon-only Settings gear | Pages, Images, Settings and Preview vanish from the dock once anything is selected | Sizing the frame to the page height grows a `100vh` hero without end (measured: 596, 1592, 2588 px) |

Screenshots for each are in `a/screens/`, `b/screens/` and `c/screens/`. Each folder's README holds the author's own assessment.

## The pick

Build A, the Floating Studio, inside today's viewport-high, sandboxed frame. Graft these onto it:

1. **The caption from C replaces A's separate label and dock on desktop.** One object under the selection reads "Heading · Saved  Edit text  Style  Link  More", with More as a word. It flips above the selection only at the canvas edge (decision 3) and never moves while typing.
2. **The touch layout from B, below 900 px or on a coarse pointer.** One opaque, full-width bottom bar with 44 px targets, Undo and Redo at its left. Popovers become sheets above it. This replaces A's floating tools bar and its second pinned dock on tablet.
3. **The settings sheet from B,** sliding in from the right edge and a bottom sheet on phones. It is a non-modal labelled region, so the canvas stays live (decision 4). Escape closes it and returns focus to its opener.
4. **Visible words for every global route.** The left island reads "Agency / Home ▾", then "Images" and "Settings" as labelled buttons. "Publish" opens the publish surface with "Version history" inside it (decisions 1 and 15).
5. **The real editor's banner photo rule.** "Change banner photo" stays a primary caption action on a heading inside a banner and on the banner section. All three prototypes demoted it, which made task 2 one or two actions worse than today.
6. **Popover anchoring from A, with one fix.** A popover opens on the far side of the caption from the selection and never overlaps the caption or the ring.

Dropped: C's document scrolling, A's prototype page-height frame, B's adaptive global dock, B's preview-only phone view, A's floating tools bar on tablet, and borderless word controls as the only affordance.

## Why

- A is the only direction that matches decision 3 as written, and it keeps every global control fixed through every selection (both critics observed this).
- Its defects are naming and placement. B's defect breaks decisions 1 and 2. C's defect is architectural: page-height framing changes how sites with full-height heroes, fixed headers, sticky headers and lazy images render, and it needs a new geometry message in `frontend/protocol.ts`.
- It changes the least in `placement.ts`, `toolbar.ts` and `canvas.ts`. The message protocol and `canvas-policy.ts` need no change (both critics read the code).

## What the prototypes taught the build

- Use `--ink-3` only on opaque and Level 3 surfaces, as `app.css` already says. On Level 2 glass over black it composites to 3.77:1 and fails AA (measured by the Opus critic). Use `--ink-2` (5.23:1) there.
- Coarse-pointer targets were short in A (40 px) and C (32 to 36 px). The build must measure 44 px under `pointer: coarse`.
- With reduced motion, A's islands kept a 200 ms transform. Reduced motion keeps fades only.
- B and C claimed `aria-modal` without containing focus, and B lost focus when it rebuilt its dock. Use native `<dialog>` for the modal surfaces (publish review, restore, delete) and keep the caption's buttons in the DOM across selection changes.
- Escape today cancels text in both `main.ts` and `agent.ts`. Decision 5 needs it to keep the text, through the existing finish and commit messages.

## What would change the pick

- **Toward B.** A placement script over about 30 elements on three sites shows the caption covering neighbouring content in more than a quarter of selections, or timed trials show B's dock trip costs under 0.2 s.
- **Toward C.** An agent spike renders the fixtures identical to the live sites with page-height framing, with no growth loop and layout shift under 0.1.

No participants took part. Every task count here is a prediction or a walkthrough by an agent, not user data.
