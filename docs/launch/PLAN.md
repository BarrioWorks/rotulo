# Launch redesign: plan

The brief is `brief.md`. This round builds on the Studio redesign in `../studio/`, which already shipped the canvas-first editor, the floating controls and the Onest and ultramarine identity. This round is about the marketing site, conversion, activation and a bolder identity, with the editor refined rather than rebuilt.

## Definition of done

Each line is checked on the running app.

1. **The homepage says what Rótulo is.** It names who it is for, what it does and the next step above the fold at 1280, 834 and 390. A fresh reader, who is an independent agent with no prior context, states all three after a 5-second look at the screenshot.
2. **One primary action on every marketing page.** It leads to sign up and then straight to import. No invented testimonials, counts, prices or capabilities. A claims checklist ties each claim on the page to a feature in the code.
3. **Import is the first thing a new account sees.** It states what to upload and what is not supported before upload, shows progress during it and says what to edit next after it. The source-only ZIP refusal keeps its exact text.
4. **The first edit needs no instructions.** One dismissible hint, then the 12 journeys in brief section 16 complete in the browser on Furnace Hill and one AI-tool-style export. Action counts are recorded against `../studio/evaluation/blog.md`.
5. **SEO basics pass a scripted check.** Unique titles and descriptions, canonical, robots.txt, sitemap.xml, Open Graph, JSON-LD where it fits, one h1 per page, alt text, no noindex on public pages.
6. **The funnel is measurable from first-party data.** Visitor (where known), signup, import, first edit, first publish and return session are defined and computed by a committed script or task from the app's own tables. No third-party tracking. Paid conversion is listed as not measurable, because billing does not exist.
7. **Nothing weaker.** `scripts/check.sh` exits 0, `scripts/smoke.sh` passes on four fixtures, the protocol and canvas-policy checks are kept, and an independent security review of the diff finds no regression.
8. **Screenshots before and after** at 1280, 834 and 390 for the homepage, sign up, dashboard, import, editor and publishing.

## Owner calls, defaulted until answered

- **Pricing.** There is no billing or plan in the code, so the site shows no prices. A pricing section can be added once the owner sets prices.
- **Anonymous import before sign-up.** This is investigated and costed, not built, as the brief requires.
- **New fonts or icons.** These need approval. Onest and Lucide were approved earlier, so they stay unless the owner approves a change.

## Phases

| Phase | Work | Owner |
|---|---|---|
| A | Audit of the running app, baseline screenshots, segments, objections, funnel data | Opus auditor |
| A | UX research, competitor patterns, three visual directions, interaction ideas | Opus researcher |
| A | SEO audit and keyword hypotheses | Codex |
| B | Pick the direction and positioning; second opinion on another model | Lead, critic |
| C | Marketing site: homepage, conversion path, SEO foundations | Codex, opus for copy |
| D | Dashboard, import, first-edit hint | Codex |
| E, F | Editor refinements, chosen interactions, publishing and domains | Codex |
| G | Impeccable critique on two models, fix round, independent security review | Opus, Codex |
| H | Browser verification of the 12 journeys, measurements, screenshots | Opus |

Concurrency stays at five agents. Each implementing agent has its own worktree and its own files.
