# Structural editing design

The accepted design extends server-authoritative DOM commands. The alternative, client-authoritative whole-document snapshots, would require canonical serialization and reconciliation and risks persisting script-created nodes. Existing stable IDs, revision checks, snapshot history, and publication remain authoritative.

## Command shape

All commands use the existing revision-checked edit endpoint. Placement is `before`, `after`, or `inside`, with an explicit stable target ID. Operations are `move_element`, `insert_element`, `duplicate_element`, `remove_element`, `wrap_element`, `unwrap_element`, and `rename_element`. Insert accepts a server-owned template enum instead of arbitrary caller HTML. Duplicate optionally accepts a destination. Editor organization names are metadata stripped at publication.

The server validates roots, cycles, sealed regions, content models, size, and depth. Moves retain existing IDs/classes/attributes and never add absolute-position coordinates. New/copied subtrees receive fresh IDs. Reference-bearing copies must preserve references or be refused.

## Ownership

- Rust document operations own structure, validation, templates, capability annotations, and IDs.
- The iframe agent owns rendered geometry, drop feedback, and a bounded structure description. It sends intent and never saves the live DOM.
- The parent canvas owns trusted pointer capture and authorizes one move per released drag with a fresh token bound to source, frame and page. It validates frame source/origin and cancels stale gestures before forwarding commands.
- A small structure controller owns the collapsible hierarchy, templates, keyboard alternatives, and one command path through the existing save queue.
- Snapshot history owns undo/redo. Publishing uses the resulting stored document.

Structural editing finishes active text first. An uncertain network result remains a conflict. A revision increase alone is insufficient evidence that a particular edit succeeded.

## Verification contract

Verify moves between nested normal-flow/flex/grid containers, grid reordering, image relocation, list-aware navigation insertion, footer columns, duplication, removal, wrap/unwrap, and invalid destinations. Exercise undo/redo, reload, page switching, publishing, and metadata stripping. Browser tasks run at desktop, tablet, and phone widths. Server tests prove rejected operations leave the persisted draft unchanged.

## Research application

Use direct manipulation to infer a structural destination from the rendered container and insertion edge. Keep layout rules in CSS and move DOM nodes, rather than learning arbitrary coordinates. This is a bounded interpretation of direct-manipulation research, not a universal layout inference algorithm.

## Advanced source and shared-component work

Design, Code and Split can safely start with read-only stored source, rendered as text in the parent application. Two-way editing requires revision-checked source replacement, document validation, asset/reference validation and a clear policy for parser normalization. Serializing the live iframe would capture imported scripts' runtime changes and editor overlays. A React or server-rendered source project also needs a source-aware transformation that this implementation does not provide.

Shared headers and footers require explicit component membership. A later design should store a component definition and page-instance mapping, distinguish instance-only and shared changes, support detaching, and use one multi-file history transaction. Similar-looking imported fragments are insufficient evidence that the owner intends them to be shared.
