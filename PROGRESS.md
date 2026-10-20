# Progress

## Completed

- Backend: strict ZIP importer, page editing model, drafts with undo and redo, stale-tab conflicts, previews on their own origin, publishing, rollback, custom domains with DNS verification, operator takedown and reinstatement, website deletion.
- Security: two independent reviews; every confirmed finding fixed with a regression test (`docs/verification.md`).
- Complete redesign with the Impeccable method: direction "Proof", Schibsted Grotesk and Newsreader, Lucide icons, token system, all screens and the editor rebuilt, two independent critiques and their fixes (`docs/design/README.md`).
- Demo on real templates: Start Bootstrap Agency (Bootstrap) and Landwind (Tailwind). All 13 demo steps verified in the browser (`docs/demo-qa.md`).
- Checks: `scripts/check.sh` (80 Rust unit, 32 request, 94 frontend tests, contrast and icon checks), `scripts/smoke.sh` on three fixtures, `scripts/perf.sh`.

## Needs the owner

- Deployment to the OVH VPS: approval, domains (app and a separate user-content domain on the Public Suffix List or registrable separately), TLS approach for custom domains. See `docs/deployment.md`.
- Pushing the repository.

## Known limitations

See the end of `docs/design/README.md`, `docs/verification.md` ("Not verified") and the README's compatibility section.
