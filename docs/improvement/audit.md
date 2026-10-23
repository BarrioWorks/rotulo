# Current-state audit

Baseline revision `e322a7b26f9c00c7d71b92e7fc0196a2df42cd26`.

The application uses Rust/Loco, SQLite, Tera, and plain TypeScript. No replacement framework is needed.

## Document and persistence

`src/document.rs` parses HTML with html5ever/scraper. Import assigns stable `data-ph-id` values to body elements. Preview annotations advertise capabilities computed by the server. The sandboxed iframe agent reports selection through origin-checked, schema-validated messages. User changes become typed `PageEdit` commands, validated against the stored HTML rather than trusting the browser DOM.

`frontend/editor/saves.ts` serializes writes against revisions, retries network failures, and stops on stale-write conflicts. `src/drafts.rs` and `src/store.rs` persist snapshots for undo/redo. Publishing creates immutable releases and strips editor markup. This foundation can support structural changes without replacing persistence.

## P0 gaps

- Missing feature. Structural commands only address whole sections. There is no generic insert, nested move, duplicate, or remove command. Navigation and footer child insertion consequently has no implementation.
- Missing feature. The iframe blocks pointer interactions with imported scripts in edit mode but has no drag state or drop protocol. Existing move controls only reorder sections using up/down commands.
- Missing feature. The outline only exposes the main heading and a limited picture list. It is not a selectable, collapsible hierarchy.
- Architectural constraint. Content created by site JavaScript is absent from the authoritative stored document and must remain explicitly read-only.
- Architectural constraint. Moving nodes preserves classes and attributes, but selector-dependent CSS and site JavaScript may depend on their original ancestry. Static editing cannot guarantee arbitrary behavior survives reparenting.

## Existing product capabilities

The editor already has inline text, image replacement and framing, link editing, restricted CSS controls, selection breadcrumbs, desktop/phone previews, keyboard navigation, undo/redo, autosave recovery, page management, publication review, version history, rollback, and custom-domain configuration behind a production feature gate. The dashboard already lists projects and import is a first-class flow. Lower-priority work should improve task completion rather than duplicate these controls.

## Security and import boundaries

Imports are untrusted. Existing code checks ZIP paths, file sizes and archive limits, skips secrets/server files, limits HTML depth, and keeps previews on a separate origin. The app never installs uploaded dependencies or executes build scripts. Static framework output can be served, but browser-rendered application content has limited visual editability. See the compatibility report for source-specific evidence and restrictions.

## Verification baseline

The frontend baseline passes all 148 tests. Rust baseline and browser task evidence are recorded in the verification report as they finish. Existing frontend tests use a mix of pure functions, source contracts, and custom DOM doubles. New structural work needs real browser interactions plus server-side persistence checks.

## Implementation direction

Retain server-authoritative commands, stable IDs, revision checks, and snapshot history. Introduce a shared destination described by a target element ID and before/after/inside placement. Validate content models and cycles before mutating. Use these commands from canvas dragging, hierarchy dragging, keyboard moves, and insertion. Do not persist coordinates for normal flow, flex, or grid movement.
