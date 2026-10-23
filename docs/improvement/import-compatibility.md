> Research observations below refer to baseline e322a7b. The final section records code changes made after this investigation.

# Import compatibility

Baseline revision `e322a7b`. Research date 2026-10-21. Read-only: no application code changed.

Each claim is labelled **measured** (run this session against the local dev server on 127.0.0.1:5150), **documented** (vendor or framework documentation, linked), **code** (read from this repository, cited by file and line), or **inferred** (reasoned from the other three, not run).

## Summary

Rótulo accepts a ZIP of built static files and edits the HTML those files contain. None of the AI app builders named on the homepage (Lovable, Bolt, v0, Replit) gives the user that kind of ZIP. Each one gives project source that needs `npm install && npm run build` first. Webflow is the only tool researched that exports finished, editable HTML. Framer has no export.

Two findings change P0 priorities:

1. **Editing a hydrated React page reverts the edit in the browser (measured).** In a Next.js static export, a text edit is present in the published HTML, but React replaces it with the original text as soon as the page hydrates, on a full load and on client navigation. In the editor preview the same edit also removes 15 of 19 `data-ph-id` annotations, and the selected heading loses its ID. An unedited page keeps all 20 annotations. So the editor shows the edit as saved while the published site never shows it.
2. **The server misses the standard Vite single-page app (measured).** A default `create-vite` React build imports with no warnings. `Document::is_built_by_script` (`src/document.rs:933`) checks for a script inside `<body>`, but Vite puts its module script in `<head>`. The pre-upload browser check does catch this case (`frontend/import.ts:177`, module script plus empty `#root`). An API import, or a browser where that check didn't run, gets a project with nothing to edit and no explanation.

## Support table

"Editable" means the page text is in the HTML file and stays put after the page's scripts run.

| Source | What the user can download | Imports as downloaded | After a local build | Editable after import | Evidence |
|---|---|---|---|---|---|
| Lovable, new projects (TanStack Start, default since 2026-05-13) | Source ZIP ("Download codebase", paid plans) or two-way Git sync (all plans) | No, refused as source | Only if prerendering is configured. The default is a server-rendered app, and its client output has no `index.html` | Unknown, not built. Hydration would likely revert edits as in Next.js (inferred) | documented [1][2][3]; [9][10] for TanStack output |
| Lovable, older projects (React + Vite) | Same | No, refused as source | Yes, `dist/` | No. Empty `#root`, so there is nothing to edit (measured with the equivalent Vite template) | documented [1][2]; measured |
| Bolt | Source ZIP (project title → Download) or GitHub | No, refused as source | Depends on the framework the project uses. Vite SPA: yes, `dist/` | Vite SPA: no | documented [4][5]; measured with Vite |
| v0 | Code export and GitHub sync. Next.js, React, Tailwind, shadcn/ui | No, refused as source | Only if the project is changed to `output: 'export'` and avoids server features | Text edits revert on hydration (measured) | documented [6][7]; measured |
| Replit | "Download as zip" of the whole workspace, including server code | No when it has `package.json`; server files are skipped | Front end only, if the user builds it (for example Vite `dist/`) | Depends on the front end | documented [8] |
| Webflow | Code export ZIP of HTML, CSS, JS and images (Workspace plans) | Expected yes (not run: no sample ZIP) | Not needed | Yes for static pages. CMS lists are empty and forms, site search and localization do not work | documented [11] (direct fetch blocked by Cloudflare; read via search excerpt) |
| Framer | Nothing. Framer does not offer HTML export | No | No | No | documented [12] |
| Vite (React, Vue, Svelte SPA) | `dist/` from `vite build` | Yes, as `dist/` or as a project ZIP that contains `dist/` (measured) | n/a | No, empty mount node | documented [13][14]; measured |
| Next.js static export | `out/` from `output: 'export'` | Yes, `out/` alone and project-plus-`out/` both import (measured) | n/a | Text edits revert on hydration (measured) | documented [15]; measured |
| TanStack Start | Prerendered HTML, or an SPA shell `/_shell.html` | Prerendered: probably. SPA mode: refused, because it has no `index.html` (code) | n/a | Inferred same as Next.js | documented [9][10] |
| Astro, Eleventy, Hugo, Jekyll (static output) | `dist/` or `_site/` | Expected yes (`dist`, `_site` are root candidates, `src/import/detect.rs:60`) | n/a | Yes, unless a component is hydrated (Astro islands) | documented [16]; code |
| Hand-written HTML or HTML templates | The files themselves | Yes (fixtures `startbootstrap-agency`, `landwind`) | n/a | Yes | existing smoke tests |

### Measured runs

Samples were built with official scaffolders in `/tmp/phsamples`: `create-vite` (react-ts, Vite 8.3.5, React 19.3.1) and `create-next-app` (Next 16.4.2, React 19.3.0, with an `/about` page added). ZIPs were posted to `/api/imports`.

| ZIP | Result |
|---|---|
| `vite-dist-flat.zip`, `vite-dist.zip` | 201. Pages `index.html`, no warnings |
| `vite-project-with-dist.zip` (source and `dist/`, no `node_modules`) | 201. `dist` chosen, no warnings |
| `vite-source-only.zip` | 422, the source-only message |
| `vite-with-node_modules.zip` (811 files, 26.8 MB) | 413, "This ZIP is larger than 25 MB." Nothing tells the user to leave out `node_modules` |
| `next-out-flat.zip`, `next-project-with-out.zip` | 201. Pages `_not-found.html`, `about.html`, `index.html`, `404.html` |

Additional Vite observation: `/about` on the preview returns 404, so client-side routes cannot be opened by direct link or reload (measured).

Hydration check: the `index.html` and `about.html` headings were edited through the edit API, the project was published, and the live site was driven with headless Chromium over CDP:

- Raw published HTML: `EDITED HOME HEADLINE`, `EDITED ABOUT HEADLINE`.
- After hydration on `/`: "To get started, edit the page.tsx file." (the original).
- `/about` by client navigation and by full load: "About us" (the original).
- Editor preview after the edit: the heading reverts and `data-ph-id` count drops from 19 to 4. Unedited preview: 20 IDs before and after hydration.

Also seen: the current `create-next-app` template enables `cacheComponents` and `partialPrefetching`. With `output: 'export'` added, `next build` fails ("PPR cannot be enabled in export mode") until both are removed. Even a user who knows to static-export a v0 or Next project hits this error first (measured).

## Source vs static output

| Signal in the ZIP | Rótulo's behaviour | Where |
|---|---|---|
| `package.json`, `vite.config.*`, `next.config.*`, `nuxt.config.*`, `svelte.config.*`, `astro.config.*`, or `src/**/*.{tsx,jsx,vue,svelte}` | Marks the ZIP as source. Refused unless a built candidate exists | `src/import/detect.rs:34-50` |
| `index.html` that loads `.ts/.tsx/.jsx/.vue/.svelte`, or an inline module with bare imports | That candidate is unbuilt | `detect.rs:93-107`, `bare_module` |
| `index.html` at the root, at depth ≤ 2, or in `dist build out _site public site www docs` | Root candidate | `detect.rs:51-68` |
| Several built candidates | Asks the user to choose. `public/` is dropped when source is present | `detect.rs:132-152` |
| `node_modules`, lockfiles, `tsconfig.json`, `.ts/.tsx/.scss/.toml/.yaml` | Skipped as source | `src/import/policy.rs:264-283, 326` |
| `_redirects`, `_headers`, `vercel.json`, `netlify.toml`, `.htaccess` | Skipped as server settings. No rewrite, header or SPA fallback rules are applied | `policy.rs:245-262` |

Gaps found in this table:

- **SPA routing.** Unknown paths serve `404.html` with status 404 (`src/sites.rs:100`, `src/preview.rs:200`). Rewrites in `_redirects` are dropped. A Vite or React Router app works from `/` and in-app links, but a deep link or reload gives 404 (measured). The TanStack SPA shell (`/_shell.html`) relies on exactly that rewrite [10].
- **Monorepos.** `apps/web/dist/index.html` is depth 3 and not in the named list, so it is not a candidate (code, `detect.rs:58`).
- **Size before type.** The 25 MB upload limit and the 2,000-file limit (`src/import/zip.rs:141`) both apply before source detection. A project zipped with `node_modules` gets a size or count error instead of "this is source code" (measured for size).
- **Next.js extras.** The RSC payload `.txt` files and `_not-found.html` import as ordinary files and pages. `_not-found.html` then shows up as an editable page (measured: listed in `pages`).

## Build restrictions Rótulo should state

Rótulo never runs a build (`README.md`, code). For a user who builds locally, the official docs set these limits:

- **Next.js static export** [15]: no Server Actions, cookies, rewrites, redirects, headers, middleware/proxy, ISR, or dynamic routes without `generateStaticParams`. `next/image` needs a custom loader or `unoptimized`. Output is `out/`. Pages are `name.html` unless `trailingSlash: true`.
- **Vite** [13][14]: output is `dist/` and the default `base` is `/`. Absolute `/assets/...` URLs work because every site and preview has its own origin (`docs/architecture.md:31`).
- **TanStack Start** [9][10]: static HTML only with `prerender.enabled`. SPA mode emits `/_shell.html` and expects a catch-all rewrite. Server functions do not exist in a static build.
- **Webflow** [11]: export excludes CMS content, user accounts, ecommerce and localized pages. Forms and site search stop working, and password protection is removed.
- **Lovable** [1][3]: Supabase or Lovable Cloud configuration and secrets are not in the code. The default stack is server-rendered.
- **Replit** [8]: the ZIP is the whole workspace. Server code (Express, Flask) does not run on Rótulo.

## Security observations (read-only audit)

The ZIP reader, path normalization, bomb limits, type sniffing and secret/server-file skipping are thorough and tested (`src/import/zip.rs`, `policy.rs`, `src/import/tests.rs`). Nothing here is a new High finding. Points that matter for wider compatibility:

1. **Server JavaScript can be published as static files (code, inferred impact).** `classify` skips `.php`, `.py`, `.sh` and similar, but a `.js` file is always hosted. When the chosen root is the project root, files such as `api/*.js` (Vercel functions), `server.js`, `netlify/functions/*.js` or a Replit `server/index.js` are served publicly. They can contain hard-coded keys. When `dist/` or `out/` is chosen, sibling folders are excluded, which covers the common case. Consider skipping well-known server-function folders, or listing them as notable warnings.
2. **Source maps are hosted (code).** `.map` is an allowed type (`policy.rs:294`). A build with source maps publishes the original source and comments. Vite does not emit maps by default. A warning would be enough.
3. **Published sites have no CSP (code, by design).** Imported JavaScript runs on published sites, so isolation depends on the separate registrable user-content domain and the Public Suffix List entries in `docs/deployment.md:64-76`. Wider app-builder support means more third-party scripts running there. That deployment step stays a launch blocker.
4. **Preview CSP is broad but contained (code).** `default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'` with `form-action 'none'` (`src/preview.rs:97`). The preview origin holds no app credentials. `form-action 'none'` means forms cannot be tested in the preview, which matters for Webflow exports.
5. **Hydration is a correctness risk, not only a UX one (measured).** The editor's model is "the stored HTML is the truth". On a hydrated page the browser replaces that truth from the JS payload, so the preview, the published site and the owner's belief about what is live all disagree. The edit is stored and published but never visible.

## Recommendations, P0 first

**P0**

1. Detect hydration frameworks at import (`__next_f`, `__NEXT_DATA__`, `/_next/`, TanStack/Remix router state, `astro-island`) and mark those pages or regions read-only for text and structure. Alternatively, refuse text edits there with a clear explanation. Without this, Rótulo publishes edits nobody can see.
2. Fix server-side SPA detection: treat an empty mount node (`#root`, `#app`, `#__next`, `#svelte`) plus any module script, in `<head>` or `<body>`, as built by script. Return the existing warning in the import report.
3. Stop naming AI builders as working sources until they work. The homepage already avoids it (`docs/launch/decisions.md:9`). Keep that.

**P1**

4. Add per-tool export guidance to `compatible.html`: what each tool gives, the build command, which folder to ZIP, and the Next PPR flags to remove.
5. Detect `node_modules` in the central directory before the size and count limits, and answer "leave out node_modules and ZIP `dist/`".
6. Opt-in SPA fallback: when the import contains `_redirects` with `/* /index.html 200` (or `/_shell.html`), serve that file for unknown extensionless paths with status 200.
7. Skip or warn on server-function folders and on `.map` files (security 1 and 2).

**P2**

8. Allow deeper monorepo roots (`*/dist`, `*/out` at depth 3) through the existing choose-folder flow.
9. Hide framework internals (`_not-found.html`, `*.txt` RSC payloads) from the page list.
10. Add a Webflow export fixture and a Next export fixture to `fixtures/zips` so these rows stop being "expected".

## Evidence

1. Lovable, View and edit your project's code (Download codebase on paid plans): https://docs.lovable.dev/features/code-mode
2. Lovable, Sync your Lovable project with GitHub (all plans; ZIP on paid plans): https://docs.lovable.dev/integrations/github
3. Lovable, Upgrade a project to TanStack Start (default for new projects since 2026-05-13; server rendering): https://docs.lovable.dev/features/upgrade-to-tanstack-start
4. Bolt, Manage your projects, "Download a project" (`npm install && npm run dev`): https://support.bolt.new/managing-projects/projects-files
5. Bolt, Supported technologies ("any JavaScript framework that runs on the frontend"): https://support.bolt.new/reference/supported-technologies
6. v0, FAQs ("v0 uses Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui"; "Export the code to work locally"): https://v0.app/docs/faqs
7. v0, GitHub: https://v0.app/docs/github
8. Replit, Projects and files ("Download as zip"): https://docs.replit.com/help/projects-and-files and Static Deployments: https://docs.replit.com/cloud-services/deployments/static-deployments
9. TanStack Start, Static Prerendering: https://github.com/TanStack/router/blob/main/docs/start/framework/react/guide/static-prerendering.md and Hosting (`dist/client`, `.output`): https://github.com/TanStack/router/blob/main/docs/start/framework/react/guide/hosting.md
10. TanStack Start, SPA mode (`/_shell.html`, catch-all rewrite): https://github.com/TanStack/router/blob/main/docs/start/framework/react/guide/spa-mode.md
11. Webflow Help, How do I export my Webflow site code?: https://help.webflow.com/hc/en-us/articles/33961386739347
12. Framer Help, Can I export my website to HTML and self-host it?: https://www.framer.com/help/articles/can-i-export-my-website-to-html-and-self-host-it/
13. Vite, Deploying a Static Site: https://vite.dev/guide/static-deploy
14. Vite, Building for Production (public base path, relative base): https://vite.dev/guide/build
15. Next.js, Static Exports (output, unsupported features, `out/` layout): https://nextjs.org/docs/app/guides/static-exports
16. Astro, Deploy (output in `dist/`): https://docs.astro.build/en/guides/deploy/
17. Representative builder source: Bolt's open-source prompt prefers Vite in WebContainer: https://github.com/stackblitz/bolt.new/blob/main/app/lib/.server/llm/prompts.ts

No official public Lovable, v0 or Replit template repository was found (the GitHub API returned nothing for `lovable-dev`). Rows for those tools rest on their docs and on official Vite and Next scaffolders, not on a real export from each builder. A Webflow export was not run.

## Changes implemented in this run

The experiments above describe the original revision. The importer now refuses recognized Next.js hydration payloads with an explicit explanation that application code would overwrite visual edits. The detector checks parsed script elements, not HTML comments. It recognizes `/_next/` script assets, `__NEXT_DATA__`, and known `self.__next_f` payload calls. This is conservative detection, not a universal React or framework analyzer. Unknown hydration systems remain a limitation.

The server's empty-application detector now includes scripts in the document head. A Vite-style empty root with a head module receives the same editability warning as a body script.

| Delivered format | Current classification | Editing and publication boundary |
| --- | --- | --- |
| Plain static HTML/CSS/JS | Fully editable within supported HTML operations | Stored HTML is authoritative. Script-created content and sealed elements remain read-only. |
| Webflow static code export | Partially editable | Static HTML is editable. Hosted CMS, ecommerce, search and form services are not supplied by Rótulo. No real Webflow export fixture was tested here. |
| React/Vite browser-rendered build output | Preview only for generated content | Shell HTML imports and publishes. JavaScript-rendered elements have no persistent editor IDs. Deep SPA routes lack a fallback rewrite. |
| Recognized Next.js hydrated static export | Unsupported for import | Refused to prevent edits that disappear after hydration. No application behavior is stripped. |
| Framework project source | Unsupported | Build elsewhere and upload finished output. No dependency installation or build script execution occurs on the host. |
| Static generator output without hydration | Fully editable within supported HTML operations | Upload `dist`, `out`, `_site`, or equivalent finished output. Backend services are not supplied. |
| Unknown hydrated or server-rendered framework output | Partially editable or unsupported | Must be tested before asserting compatibility. Static HTML alone does not prove edits will survive application hydration. |

This run does not add framework compilation, backend hosting, secrets, external services, or source-aware React transformations.

## Final import boundary

The server now returns an explicit `editability` report field. `static_html` describes content stored in HTML; `limited` means at least one page builds its content with scripts. The result screen does not call a limited import ready for visual editing or automatically open it without review. Older report payloads remain accepted by the browser.

Recognizable server JavaScript in the selected website root now refuses the archive as source, including root `server.js` and JavaScript in root `api`, `server` or `functions` directories. It is not silently removed while another module might depend on it. Upload the finished distribution directory instead. Ordinary `assets/server.js` and static JSON under `api` remain allowed. This is a bounded file policy, not a universal server-code or framework detector. Source maps remain supported but produce an explicit warning that original code and comments become public.

The empty-application warning also covers secondary pages and no longer promises that arbitrary client-side routes will work. SPA fallback rules are not implemented. No build scripts or dependency installers run on the host.
