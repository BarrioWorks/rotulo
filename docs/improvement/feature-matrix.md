# Visual editor feature matrix

The comparison concerns supported static HTML. Research sources and their access limitations are in `research.md`. Status describes the current implementation. A feature marked working still needs the final P0 gate before release.

| Owner task | Rótulo baseline | Current Rótulo | Dreamweaver / Webflow benchmark |
| --- | --- | --- | --- |
| Select rendered elements and parents | Working | Working. Canvas, breadcrumbs, keyboard and hierarchy. | Element display / Navigator. |
| Edit text, links and images visually | Working | Working. New navigation links select the anchor for immediate text and destination editing. | Live View / on-canvas editing. |
| Drag between nested containers | Missing | Working. App-owned handle, layout-aware before/after/inside feedback, autoscroll and cancellation. | Live View insertion guides / canvas and Navigator dragging. |
| Reorder normal flow, flex and grid | Partially working. Whole sections by buttons. | Working for supported content models. DOM order changes without coordinate positioning. | Structural visual movement. |
| Insert siblings and children | Missing | Working. Shared before/after/inside templates. Lists receive valid list wrappers. | Insert panel / Add panel. |
| Add navigation and footer content | Missing | Working. Links, native dropdowns, containers, footer columns and sections. Custom JavaScript mobile menus still need compatible site behavior. | Navigation and footer structural editing. |
| Duplicate, copy/paste and delete subtrees | Partially working. Whole sections. | Working for supported subtrees on the same page. Unsafe styling or reference dependencies can refuse a copy. | Standard editing commands. |
| Wrap and unwrap | Missing | Working for supported containers, with content-model validation. | Structural container operations. |
| Collapsible hierarchy and organization names | Missing | Working. Floating panel, lazy expansion, canvas locate, keyboard controls and hierarchy dragging. | DOM panel / Navigator. |
| Undo/redo, autosave and publish | Working with an ambiguous-save bug | Working. Snapshot history retained; ambiguous saves require review. Text acknowledgment gates navigation and publish. | Undo/history and publication. |
| Responsive previews | Partially working | Working previews. Desktop, 834 px tablet and phone controls. Property edits apply to every screen size; per-breakpoint overrides remain missing. | Breakpoint preview controls. |
| Constraint-aware resizing | Missing | Partially working. Width, max-width, height and minimum-height controls, with relative units and resets. Pointer resize handles remain missing. | Visual dimensions and handles. |
| Visual CSS designer | Partially working | Working for 30 validated properties. Typography, colors, per-side spacing, dimensions, flex/grid, borders, corners, opacity and overflow. Shadows, transforms and positioning remain missing. | CSS Designer / Style panel. |
| Class, ID and arbitrary attribute editing | Missing | Missing. Editor organization names are separate metadata. | Advanced element attributes. |
| Multi-selection and alignment guides | Missing | Missing. Single-subtree moves are supported. | Professional layout tools. |
| Tables, forms, videos and embeds insertion | Missing | Partially working. Accessible tables are inserted with editable cells. Forms, videos and arbitrary embeds still need configuration controls. | Insert / Add libraries. |
| Functional form processing | Intentionally unsupported | Intentionally unsupported. A form's appearance does not supply a submission backend. | Requires configured processing or hosted services. |
| Code and split views | Missing | Missing. No two-way framework source-editing claim. | Code / Split / Design. |
| Shared components across pages | Missing | Missing. No automatic merging of visually similar headers or footers. | Templates / components. |
| Framework project compilation | Intentionally unsupported | Intentionally unsupported. Build finished output elsewhere. | Outside the static visual editor boundary. |
| Hydrated application editing | Missing | Intentionally unsupported for recognized Next.js exports, refused before misleading edits. Unknown hydration remains a compatibility limit. | Requires source-aware transformation. |
| Dashboard project cards and status | Working | Working. Refined cards, a recent-project emphasis and clear edit/preview/publishing actions. Representative images are not guaranteed full-page screenshots. | P1 refinement. |
| Dashboard search, sort and grid/list | Missing | Working. Name/domain search, last-edit/name/status sorting and persisted grid/list views. | Task-oriented project management. |
| Project rename/delete and domain/history management | Working | Working. Existing confirmations and editor settings/history retained. | Project management. |
| Project duplication and blank creation | Missing | Working. Safe static starter creation and isolated copies of the current draft. | Project management. |
