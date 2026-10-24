<h1 align="center">Rótulo</h1>

<p align="center">
  Your AI-built website. Yours to edit.<br>
  Import a finished site, change it by clicking on the page, and put it online.
</p>

<p align="center">
  <a href="#how-it-works">How it works</a> ·
  <a href="#what-it-can-and-cannot-edit">What it can edit</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="#check-a-change">Check a change</a> ·
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <a href="docs/architecture.md"><img alt="Server in Rust with Loco" src="https://img.shields.io/badge/server-Rust_%2B_Loco-dea584"></a>
  <a href="docs/architecture.md#data-model"><img alt="Data in SQLite" src="https://img.shields.io/badge/data-SQLite-0f80cc"></a>
  <a href="docs/architecture.md#frontend"><img alt="Editor in plain TypeScript, no framework" src="https://img.shields.io/badge/editor-plain_TypeScript-3178c6"></a>
  <a href="docs/threat-model.md"><img alt="Uploaded code never runs on the server" src="https://img.shields.io/badge/uploaded_code-never_runs_on_the_server-3730bd"></a>
</p>

![The Rótulo editor with the Start Bootstrap Agency template open. The headline "It's nice to meet you" is selected, with a small toolbar under it offering Edit text, Style and Change banner photo. Undo, device previews and a Publish button sit in the top bar.](docs/screenshots/editor-hero.webp)

Rótulo is for people whose website came from an AI tool such as Lovable, Bolt, v0 or Claude, or from a Bootstrap or Tailwind template. Changing a headline, a photo or a phone number afterwards usually means another prompt, more credits, or a developer. With Rótulo you import the finished site as a ZIP, click the thing you want to change, and publish. The site goes online at a Rótulo address or on your own domain.

Rótulo edits the HTML your site already ships, in place. It does not rebuild the page into a template or regenerate it with AI, so everything you did not touch stays the way it was. Every publish is a saved version, and any earlier version can go live again in one click. Rótulo is part of [Barrio](https://barrio.works).

## How it works

1. **Import.** Drop in the ZIP that your AI tool or template gives you. Rótulo checks every file, finds the finished website inside (even next to its source code), leaves out server code, secrets and other files that do not belong on a website, and tells you what it skipped. A project that still needs a build step is refused with an explanation.
2. **Edit.** Your real page opens in the editor. Click a heading to retype it, an image to replace it, a button to point it somewhere else. A small toolbar also changes colors, size, weight, alignment and spacing, and moves, duplicates, hides or removes whole sections. You can add, rename and delete pages. Changes save as you go, and undo and redo cover all of them.
3. **Publish.** Review the list of changes and publish. Your site goes live at `<name>.<sites domain>`. To use your own domain, add it in **Website settings** and create the DNS records Rótulo shows you.
4. **Go back.** Version history lists every publish. **Make this version live** puts an earlier version back online. **Edit from this version** loads it into the editor as one change you can undo.

Uploaded websites are treated as hostile. Rótulo reads ZIPs with its own strict reader, serves every site from a domain separate from the app so a site's scripts never see your Rótulo login, and runs nothing it receives on the server. [Threat model](docs/threat-model.md) lists each threat and where it is handled and tested.

## What it can and cannot edit

- Rótulo edits the HTML the website ships: text, images, links, inline styles, and top-level sections.
- Content that the website's own JavaScript creates in the browser is shown but cannot be edited. A single-page app whose `index.html` is an empty `<div id="root">` imports and publishes, but has almost nothing to edit. The editor explains this when you click such content.
- Rótulo does not build source code. A ZIP of a React, Vue, Svelte or Vite project without its `dist` or `build` output is refused with an explanation.
- HTML is re-serialized on import. The page looks the same, but attribute quoting and void tags may be written differently. The original ZIP is kept unchanged.
- Custom domains need TLS for arbitrary hostnames. In development the whole flow works up to DNS verification. In production it stays off until the TLS approach in [Deployment](docs/deployment.md) is approved.
- This is a prototype. It has no email verification, password reset, team members, malware scanning of uploads, or storage quotas beyond a limit on the number of websites.

## Run locally

Install Rust 1.99 or newer, Node.js 24 (only to rebuild the editor's TypeScript) and SQLite, then run:

```sh
git clone https://github.com/BarrioWorks/rotulo.git
cd rotulo
npm ci                  # the TypeScript compiler, the only npm dependency
scripts/dev-server.sh   # builds and starts http://127.0.0.1:5150
```

Open <http://127.0.0.1:5150>, sign up, and import one of the sample sites:

- `fixtures/zips/startbootstrap-agency.zip`, the [Start Bootstrap Agency](https://github.com/StartBootstrap/startbootstrap-agency) template exactly as GitHub's "Download ZIP" gives it, source and built site side by side
- `fixtures/zips/landwind.zip`, a Tailwind CSS template
- `fixtures/zips/harbor-bakery.zip`, a small bakery site

`scripts/dev-server.sh` keeps its database and files in `/tmp/rotulo-dev`. Pass another folder as its first argument to keep them elsewhere. Running the script again restarts the server. Draft previews run on `*.preview.localhost:5150` and published sites on `<address>.sites.localhost:5150`. Chrome and Firefox resolve `*.localhost` to your machine with no setup.

After you change TypeScript in `frontend/`, run `npm run build` and commit the output in `assets/static/js/`.

## Check a change

```sh
scripts/check.sh                                     # the gate before every commit
scripts/smoke.sh                                     # import to rollback over HTTP, against a running server
scripts/perf.sh 7 fixtures/zips/harbor-bakery.zip    # import and publish timings on a release build
```

`scripts/check.sh` runs rustfmt, Clippy, the Rust unit and request tests, the TypeScript type check, the design checks (icons, static references, color contrast) and the frontend tests. It also fails if `assets/static/js/` is out of date with `frontend/`.

## Documentation

| Read | For |
| --- | --- |
| [Architecture](docs/architecture.md) | Hosts and origins, data model, editing model, import security, publishing |
| [Threat model](docs/threat-model.md) | Each threat and where it is handled and tested |
| [Frontend contract](docs/frontend-contract.md) | Templates, JSON API, and messages between the editor and the preview |
| [Verification](docs/verification.md) | Test results, security review, performance numbers, browser checks |
| [Design](docs/design/README.md), [DESIGN.md](DESIGN.md) | The visual direction and before and after, and the tokens and components |
| [PRODUCT.md](PRODUCT.md) | Who Rótulo is for, its principles, and what it promises |
| [Demo script](docs/demo-script.md) | A seven-minute walkthrough of the whole product |
| [Deployment](docs/deployment.md) | What a server needs and what still needs approval |

<details>
<summary>Project structure</summary>

- `src/` holds the Loco server: the host router (`hosts.rs`), the ZIP importer and its file policy (`import/`), HTML element operations (`document.rs`), drafts with undo and redo (`drafts.rs`), publishing and rollback (`publish.rs`), and custom domains (`domains.rs`).
- `frontend/` holds the editor and the agent that runs inside the preview, in plain TypeScript. `tsc` compiles them to `assets/static/js/`.
- `assets/` holds the Tera templates, the one stylesheet, icons and the logo.
- `migration/` holds the SQLite schema.
- `tests/` holds the request tests. `fixtures/` holds real sample sites and replacement images.
- `scripts/` holds the dev server, the checks, the smoke and performance runs, and the design tooling.

</details>

<details>
<summary>Operate a server</summary>

- `rotulo-cli task unpublish slug:<address>` takes a website offline after an abuse report.
- `rotulo-cli task reinstate slug:<address>` lets its owner publish again, without putting it back online.
- [Deployment](docs/deployment.md) lists what the server needs and what still needs the owner's approval.

</details>

## License

This repository does not include a license file yet. Until one is added, no open-source license applies to the code. The sample sites in `fixtures/zips/` keep their authors' licenses.
