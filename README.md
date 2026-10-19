# Pagehaven

Your AI-built website. Yours to edit.

Pagehaven imports a finished static website as a ZIP (from Lovable, Bolt, v0, Claude or anything that exports HTML), lets its owner change text, images, links, styles and sections by clicking on the page, and publishes it to a Pagehaven address or the owner's own domain. It never runs uploaded code on the server.

## Run it locally

Requires Rust 1.99, Node 24 (only to rebuild the editor's TypeScript) and SQLite.

```sh
npm ci                       # TypeScript compiler, the only npm dependency
scripts/dev-server.sh        # builds and starts http://127.0.0.1:5150, data in /tmp/pagehaven-dev
```

Open http://127.0.0.1:5150, sign up, and import `fixtures/zips/harbor-bakery.zip`. Draft previews run on `*.preview.localhost:5150` and published websites on `<address>.sites.localhost:5150`. Chrome and Firefox resolve `*.localhost` to this machine without any setup.

After changing TypeScript in `frontend/`, run `npm run build` and commit the output in `assets/static/js/`.

## Check a change

```sh
scripts/check.sh             # rustfmt, clippy, Rust unit and request tests, TypeScript, frontend tests
scripts/smoke.sh             # the import to rollback journey over HTTP, against a running server
scripts/perf.sh 7 fixtures/zips/harbor-bakery.zip   # import and publish timings, release build
```

## Operate it

- `pagehaven-cli task unpublish slug:<address>` suspends a website after an abuse report. `pagehaven-cli task reinstate slug:<address>` lets its owner publish again without putting it back online.
- `docs/deployment.md` lists what the VPS needs and what still needs the owner's approval.

## Documents

- `docs/architecture.md`: system diagram, data model, editing model, import security model, publishing.
- `docs/threat-model.md`: threats and where each is handled and tested.
- `docs/frontend-contract.md`: templates, JSON API, preview messages.
- `docs/verification.md`: test results, security review, performance numbers, browser checks.
- `docs/demo-script.md`: the investor demonstration, step by step.
- `docs/deployment.md`: deployment requirements and checklist.

## What Pagehaven can and cannot edit

- It edits the HTML the website ships. Text, images, links, inline styles and top-level sections are editable.
- Content that the website's own JavaScript creates in the browser is shown but not editable. A single-page app whose `index.html` is an empty `<div id="root">` imports and publishes, but has almost nothing to edit. The editor explains this when such content is clicked.
- Pagehaven does not build source code. A ZIP of a React, Vue, Svelte or Vite project without its `dist`/`build` output is refused with an explanation.
- HTML is re-serialized on import. The page looks the same, but attribute quoting and void tags may be written differently from the original. The original ZIP is kept unchanged.
- Server code, `.htaccess`, environment files, keys, version-control folders and nested archives are left out and named in the import report.
- Custom domains need TLS for arbitrary hostnames. In development the full flow works up to DNS verification. In production it stays off until the TLS approach in `docs/deployment.md` is approved.
- Not in this prototype: email verification, password reset, team members, per-user storage quotas beyond the website count, malware scanning of uploads.
