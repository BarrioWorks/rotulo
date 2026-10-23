# Product

<!-- impeccable:product-schema 1 -->

Written by `impeccable init` without an interview. Facts come from the project brief, `README.md`, `docs/architecture.md`, `docs/frontend-contract.md` and `docs/demo-script.md`. Lines marked **(assumption)** are inferences nobody has confirmed yet.

## Platform

web

## Users

Owners of small businesses (a bakery, a studio, a local service) whose website was made for them by an AI tool such as Lovable, Bolt, v0 or Claude, or comes from a Bootstrap or Tailwind template. They are not technical. They want to change a headline, a photo, a phone number or a button link without writing a prompt, spending AI credits or hiring a developer, and then put the site online at an address they can share.

They primarily use Rótulo on a computer. The editor prioritizes the canvas with floating controls and also adapts to narrow screens; the dashboard, sign in and import pages work on a phone. **(assumption)** Most sessions are short and occasional: a few changes, then publish.

A second audience, for now: venture investors watching a live demo (`docs/demo-script.md`). They judge whether the product looks finished and trustworthy within a few minutes. **(assumption)** They watch on a laptop or a projected 1280 to 1440 px wide screen.

## Product Purpose

Rótulo is the ownership layer for an AI-built or template website. The owner imports the finished site as a ZIP, changes it by clicking on the page, and publishes it to a Rótulo address (`<name>.<sites domain>`) or their own domain. Every publish is a saved version, and any earlier version can be made live again.

Success: a nontechnical owner imports a site, makes a change and publishes it without help, and trusts that nothing on the site changed except what they touched.

## Positioning

Rótulo edits the HTML the site actually ships, in place. It does not convert the page into a template model, it does not re-generate it with AI, and it never runs uploaded code on the server. Imported HTML is normalized by the HTML parser. Editing preserves existing elements and attributes outside the requested change, subject to documented parser and layout constraints. Hosting, versions and rollback come with it.

## Operating Context

- Import: a ZIP exported from the tool that made the site. Rótulo checks every file, leaves out server code and secrets, and reports what it skipped. Source projects that need a build are refused with an explanation.
- Edit: the real page in a sandboxed preview, with a floating toolbar for text, images, links, styles (colors, size, weight, alignment, spacing) and page structure (insert, nest, duplicate, move, wrap, remove). Pages can be added, renamed and deleted. Undo and redo cover every change. Changes save automatically.
- Publish: one click. Each publish creates an immutable version. Version history offers "Make live" (rollback) and "Edit this version".
- Own domain: the owner adds a hostname and gets the exact DNS records to create; Rótulo checks them. In production this stays off until TLS is approved.
- Two tabs on the same site: a stale change is refused and the user is told to reload.

## Capabilities and Constraints

- Content that the site's own JavaScript creates in the browser is shown but cannot be edited. The editor says so when it is clicked.
- No email verification, password reset, team members or storage quotas beyond a website count in this prototype.
- The app is Tera templates, one CSS file (`assets/static/css/app.css`) and plain TypeScript. No UI framework, no runtime npm dependency, no web fonts. The app's CSP is `script-src 'self'`.
- The editor's iframe sandbox, origins and postMessage protocol are security boundaries, not design surfaces.

## Brand Commitments

- Name: Rótulo. Logo and favicon in `assets/static/img/logo.svg` and `favicon.svg`.
- Tagline in use: "Your AI-built website. Yours to edit."
- Original visual brief: inspired by Craft.do but original. Warm whites, soft shadows, rounded controls. Calm and premium. Made for nontechnical people.
- Voice: plain, short sentences. Second person ("your website"). No developer jargon in the interface: say "website", "page", "address", "version", "publish", not "deploy", "build", "slug", "release", "DOM".

## Evidence on Hand

- Real demo sites: `fixtures/zips/harbor-bakery.zip`, `fixtures/zips/startbootstrap-agency.zip` (the planned investor demo site), `fixtures/zips/landwind.zip`.
- There are no customers, testimonials, usage numbers, pricing or press. Do not invent any. The landing page's only factual claims are what the product does.

## Product Principles

1. The owner's site stays theirs. Never change what they did not touch, and always offer a way back (undo, versions).
2. Plain words over technical accuracy in the interface. Technical detail goes in docs, not on screen.
3. The site is the hero. Rótulo's own interface stays quiet around the owner's page.
4. Show state honestly: saved or not, published or not, which version is live.
5. Safe by construction. Security boundaries are never traded for convenience.

## Accessibility & Inclusion

WCAG 2.2 AA for Rótulo's own interface: text contrast, visible keyboard focus, labelled controls, hit targets of at least 24 px (44 px where touch is likely), and `prefers-reduced-motion` respected. **(assumption)** Some owners are older and less confident with computers, so legible text sizes and clear wording matter more than density.
