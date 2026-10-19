# Progress

## Completed

- Architecture, threat model, frontend contract (`docs/`).
- Loco app, SQLite schema, blob store, file policy, page editing model.
- Strict ZIP importer with hostile-archive tests.
- Auth with revocable sessions, project ownership, drafts with undo and redo, stale-tab conflicts.
- Previews on their own origin, publishing to release directories, rollback, restore into the draft, custom domains with DNS TXT verification, TLS ask endpoint.
- HTTP journey script `scripts/smoke.sh`: passes.
- Design system and app templates (frontend branch, merged).

## Current state

- Editor UI and preview agent are being built on the `frontend` branch.
- Integration tests for the security boundaries are next.

## Known blockers

- No browser on this machine yet for end-to-end UI checks.
- Deployment to the OVH VPS needs explicit approval and DNS for two domains.

## Decisions

See `.audit/decisions.tsv` (local) and `docs/architecture.md`.

## Remaining

- Request tests: cross-user access, CSRF, preview isolation headers, publishing, domains, limits.
- Editor UI, browser verification of the demo journey, screenshots.
- Performance measurements, independent security review, deployment checklist, demo script.
