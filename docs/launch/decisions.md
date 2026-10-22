# Launch redesign: decisions

Every builder in this round follows these. Evidence is in `audit/README.md` (the running app), `research/README.md` (principles, competitors, directions, interaction ideas) and `seo/README.md`. The Studio decisions in `../studio/decisions.md` still hold for the editor.

## Positioning and audience

1. **Primary reader.** A person who has a finished website as HTML files and cannot change it without code or another AI prompt. That covers sites from AI tools that write HTML, static exports, templates and designer hand-offs. Freelancers handing sites to clients get one section, "Building sites for clients?", and no separate funnel. (Audit section 3; reasoning, not data.)
2. **Headline direction.** The outcome is changing your own site without asking an AI again. The working line is "Change your AI-made site without asking the AI again." Copy may improve it but must keep it concrete. "AI built it. Now you own it." is rejected because "own" reads as a rights claim and does not say what the product does.
3. **Say the requirement before sign-up.** The hero area itself states that Rótulo works with sites delivered as HTML files. The page also names what does not work: projects that still need a build step, and sites whose pages are built in the browser by JavaScript, which import but cannot be edited. Do not name Lovable, Bolt or v0 as compatible.
4. **Claims.** Every claim must appear in the audit's "What the product truly does today" (`audit/README.md` section 4). Custom domains are off in production by default, so the site does not promise them. Mention them only as "custom domains, when your Rótulo host enables them" on the compatibility page, or not at all. There is no password reset, so do not imply account recovery. There are no testimonials, customer counts, certifications or speed claims.
5. **Price.** There is no billing. Default copy is "Free to try. There is no billing in Rótulo yet." The owner may replace it.

## Visual identity

6. **Type and icons stay.** Onest (variable, weights 100 to 900 are in the shipped file) and the Lucide sprite. No new font or icon set.
7. **Colour strategy: blue means Rótulo and blue means live.** On marketing pages Haven Ultramarine `#3730BD` is a full field for the hero and the closing call to action, with white type, and real product screenshots sit on it as the only light objects (research direction B). The rest of the marketing page is the light ground. In the app, chrome stays neutral glass so the owner's site is the colour. Ultramarine appears for selection, focus, Publish and one new moment: the "is live" sheet after publishing. No gradients.
8. **The ring is the brand mark.** The editor's selection ring and caption ("Heading · Saved") are used as a graphic device on marketing pages: around the headline word that matters, around the logo in small sizes, never as decoration on unrelated elements (research direction A).
9. **Real product imagery only.** Screenshots of Furnace Hill Coffee in the real editor. Every image states it is the real editor. No mock-ups drawn in CSS for the hero.
10. **Display type.** Onest at weight 650 to 720, tight tracking (about -0.035em) for display sizes. Body copy at 17 to 18 px on marketing pages, 14 px in the app.

## Interactions to build

11. **Show what can be edited, once.** After the first import, the canvas tints every editable part for a few seconds with the hint "Click any highlighted text to edit it." It clears on the first selection. "Show what I can edit" in the hint and the palette repeats it. This needs one new editor-to-agent message. Reduced motion gives no fade.
12. **The empty dashboard is the drop zone.** A new account lands on the import area. A ZIP can be dropped anywhere on the import and empty dashboard pages. After a successful import the owner goes straight into the editor with the hint from item 11, instead of a second "Open editor" click.
13. **A quick check before upload.** The browser reads the ZIP's file list (central directory, no new dependency) and warns before upload when it finds no `index.html` or finds only source files. The server's check stays the authority, and the refusal text the server returns is unchanged.
14. **Each change in the publish review shows itself.** Each row opens its page and pulses the changed part.
15. **The "is live" sheet.** After a publish, one ultramarine sheet says the site is live, with the address, View website and Copy address. It replaces the plain toast for that moment.
16. **Before and after on the homepage.** Two real screenshots of one heading edit, compared with a range input. No autoplay.
17. **Rejected:** magnetic selection, dropping a photo onto the canvas, autoplaying video, confetti, parallax.

## Funnel

18. **First-party events only.** A small `events` table records signup, sign-in, import succeeded, import failed with a reason category, first edit, publish and a daily "returned" mark. A task prints the funnel. No third-party tracking, no visitor tracking beyond what the server already logs. Paid conversion is not measurable, because billing does not exist.

## Files each builder owns

| Builder | Owns |
|---|---|
| Homepage and compatibility page | `assets/views/home.html` body, new `assets/views/marketing/*.html`, new `assets/static/css/marketing.css`, marketing images under `assets/static/img/marketing/` |
| SEO foundations | `assets/views/layouts/base.html` head, the `{% block head %}` of each public view, a new `src/controllers/seo.rs` for robots.txt and sitemap.xml, the preview noindex header in `src/preview.rs` |
| Dashboard, import and auth | `assets/views/projects/index.html`, `projects/new.html`, `auth/*.html`, `partials/*.html`, `assets/static/css/screens.css`, `frontend/app.ts`, `frontend/import.ts` |
| Editor and publishing | `frontend/editor/*`, `frontend/agent/agent.ts`, `frontend/protocol.ts` (additive, tested), `assets/views/projects/editor.html`, `assets/static/css/editor.css` |
| Funnel | `migration/src/*`, a new `src/events.rs`, `src/tasks.rs`, and small calls in `src/controllers/api.rs` and `src/controllers/pages.rs` |

`assets/static/css/app.css` holds the tokens. Only the homepage builder may add display tokens there, and only by adding.

## Owner round 2 (2026-10-20)

The owner reviewed the built site and asked for these, in their words:

- "the homepage layout is too boring"
- "the 'One heading, a minute apart' example is too simple"
- "SEO optimize the marketing pages"
- "style the sign in pages and all the other pages in the design style of the landing page and colors as I like those colors"
- "use codex agents beside claude to split the work evenly"

What that changes:

19. **The homepage layout gets bolder composition, not more decoration.** Vary the rhythm between full-bleed ultramarine fields, light sections and real product imagery. Use asymmetric layouts, large numerals, product shots that break the grid, and the ring device where it marks the point. Keep one primary action, honest claims and no gradients, blobs or stock art.
20. **The demo shows a whole editing session.** It replaces the single heading slider with a real, multi-step demonstration on Furnace Hill:
    - select and retype a heading;
    - replace a photo;
    - point a button at another page;
    - review and publish;
    - the live site.
    Each step is a real screenshot or a short click-to-play recording, controllable by keyboard, with nothing autoplaying.
21. **The ultramarine field becomes the identity across the app's own pages.** Sign in, sign up, the dashboard, import, errors and the compatibility page all use it. The editor chrome stays neutral glass, because the owner's site needs a neutral frame (Studio decision 9). Only the editor's entry moments use the field.
22. **SEO covers content, not just tags.** Use keyword-aligned headings and copy where they stay true. Add internal links between marketing pages, FAQ structured data matching visible questions, image sizes and alt text, and the two remaining high-intent pages from `seo/README.md`, built with real product evidence.
23. **The work splits between Claude and Codex builders,** each owning separate files.

24. **Item 11 refined after the security review.** The tip reads "Click any highlighted text, then type to change it." It has a close button, tints only text, and lasts until the first selection. "Show what I can edit" is in the command palette. A second click on selected text focuses Edit text, and typing starts the edit. Only input in the app itself can start a text session.
