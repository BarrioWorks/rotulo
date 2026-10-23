# Remaining work and release limits

The implemented foundation operates on supported static HTML. It preserves the stored DOM as the authority, validates each command, and uses snapshot history. It does not regenerate an imported application from its source.

| Next improvement | User impact | Risk | Effort | Acceptance evidence needed |
| --- | --- | --- | --- | --- |
| Firefox, Safari and real touch verification | High. Establishes reliable pointer capture, text editing and mobile controls across supported browsers. | Medium | Small | Repeat the hero, grid, image, text-to-publish and cancellation journeys in each engine and on a touch device. Chromium viewport emulation does not establish this. |
| Responsive property overrides | High. Allows phone-specific typography and spacing while keeping inherited desktop styles visible. | High | Medium | Explicit breakpoint rules survive save, undo, import/export and publication without selector collisions or accidentally overriding unrelated rules. |
| Media and form configuration | High for richer sites. Safe video/embed destinations and form fields need controls as well as insertion. | Medium | Medium | URL/protocol validation, accessible labels, required fields, previews and persisted attributes. A visual form does not provide submission processing. |
| Shared headers and footers | High for multipage sites. One deliberate edit can update selected instances. | High | Large | Explicit membership, instance versus shared changes, detach, multi-file atomic undo and preservation of intended page differences. Never infer membership from appearance alone. |
| Operation identity for ambiguous retries | Medium. Avoids forcing a reload when a response is lost after a successful save. | Medium | Medium | A stable operation identifier is persisted transactionally and replayed safely across tabs. Revision advancement alone must never acknowledge a save. |
| Navigator virtualization above 5,000 nodes | Medium for large sites. Keeps selection and hierarchy browsing responsive. | Medium | Medium | Realistic large-page interaction measurements and keyboard traversal across unloaded branches. Current truncation is explicit. |
| Code and split views | Medium for advanced owners. Read-only source inspection is simpler than two-way editing. | High for writes | Large | HTML/CSS source maps, safe revision-checked changes, explicit unsupported runtime regions and exact source-to-rendered selection. Do not serialize the live iframe. |
| Selected framework source adapters | Limited to supported export structures. | Very high | Large | Representative real exports, round trips and behavior preservation. A hydrated application's rendered HTML is insufficient. |

Imported classes and scripts can depend on ancestry. A valid DOM move therefore cannot guarantee arbitrary site behavior after reparenting. Copies receive fresh HTML IDs, so script bindings targeting an original ID do not automatically bind to its copy. Copies with unsafe styling or animation dependencies are refused rather than saved with known broken references.

Custom JavaScript mobile navigation remains the imported site's behavior. Native dropdown insertion uses `details` and `summary`; it does not reconfigure an arbitrary imported menu script. Preview scripts run on the isolated preview origin. The application never installs project dependencies or runs imported build commands on the host.
