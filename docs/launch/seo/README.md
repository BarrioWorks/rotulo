# Pagehaven launch SEO audit

Audited on 20 October 2026 against the running app at `http://127.0.0.1:5150` and the current source. This is read-only research. No application files were changed. The app was not restarted.

The homepage is server-rendered and readable without JavaScript. Its basic semantics are sound. Indexation controls need attention before launch. Canonical URLs, discovery endpoints and share metadata are missing. Search visibility and traffic are unknown. No Search Console, analytics, production crawl or field performance data was supplied.

## Scope and evidence

The method follows `/home/agent/.claude/skills/seo-audit/SKILL.md`, `references/title-tags.md` and `references/ai-writing-detection.md`. Crawlability and indexation come first. Performance, metadata and content follow. No separate product-marketing context file was found in the repository's `.agents` or `.claude` locations.

Product scope comes from `docs/launch/brief.md:76`, `:196` and `:539`. Definition-of-done item 5 is at `docs/launch/PLAN.md:13`. Interpret its “no noindex on public pages” as indexable marketing pages. Auth pages are publicly accessible but should remain noindex under this task's explicit scope. Published customer websites are outside this audit. Their host separation is inspected only to prevent app SEO changes from affecting them.

### Live HTTP observations

Fetched with `curl --silent --show-error --max-time 15 -i http://127.0.0.1:5150/PATH`. These were anonymous GET requests without redirect following. The full rendered HTML was parsed in memory. The responses were observed at approximately 17:35 UTC.

- `/`: **200**, `text/html; charset=utf-8`. Title: `Pagehaven · Your website. Yours to edit.` Description: `Import your finished website, change its words and pictures right on the page, and publish when you’re ready. No coding needed.` One h1. No canonical, robots meta, Open Graph or Twitter card tags.
- `/login`: **200**, HTML. Title: `Sign in · Pagehaven`. One h1. No description, canonical, robots meta or social tags.
- `/register`: **200**, HTML. Title: `Create your account · Pagehaven`. One h1. No description, canonical, robots meta or social tags.
- `/seo-audit-missing-page`: **404**, HTML. Title: `Page not found · Pagehaven`. One h1. No description, canonical or robots meta. This is a real 404, not a soft 404.
- `/robots.txt`: **404**, HTML. It returns the app's not-found page, not robots text.
- `/sitemap.xml`: **404**, HTML. It returns the same not-found page, not XML.
- `/projects` and `/projects/new`: **303** to `/login`. No private page content was fetched.

None of these responses included `X-Robots-Tag`. HTML responses had `Cache-Control: no-store`. A separate curl request with `Host: seo-audit-invalid.preview.localhost:5150` returned **404** and “Preview expired”, also without `X-Robots-Tag`.

The collaborative browser loaded `/` and evaluated `document.querySelectorAll('script[type="application/ld+json"]')`. It found zero blocks after rendering. The only script element was `/static/js/app.js`. This confirms the homepage schema finding beyond curl. Auth and error schema findings below refer to source and response HTML, not a rendered DOM audit of every route.

## 1. Technical findings, ranked by impact

### P1. High: Draft preview responses lack an explicit indexing ban

**Evidence:** `src/preview.rs:94` defines shared preview headers. It sets CSP, no-referrer and no-store, but no indexing directive. `src/preview.rs:153` applies those headers after serving every preview response. Valid preview HTML is rendered at `src/preview.rs:201`. Host dispatch isolates previews at `src/app.rs:156`. The invalid-token HTTP check confirms the missing header on that response. Valid draft HTML was not fetched.

**Impact:** A disclosed, valid preview URL has no server-enforced noindex signal. Token expiry and no-store are not indexing controls. Imported HTML could contain its own permissive robots tag.

**Fix:** Add `X-Robots-Tag: noindex, nofollow` in the shared preview header function. Apply it to successful HTML, assets, errors and expired tokens. Do not change token verification, frame policy or published-site responses. Do not publish preview URLs in app metadata or sitemaps.

### P1. High: Auth and app pages have no explicit indexing policy

**Evidence:** `assets/views/layouts/base.html:9` through `:14` has no robots policy. Auth views set titles but no head metadata at `assets/views/auth/login.html:2` and `assets/views/auth/register.html:2`. Project views also lack robots directives: `assets/views/projects/index.html:1`, `assets/views/projects/new.html:3` and `assets/views/projects/editor.html:4`. The page guard redirects anonymous users at `src/auth.rs:273`. Shared app headers lack `X-Robots-Tag` at `src/security.rs:40`.

**Impact:** Login and registration are currently eligible for indexing. Authentication protects project content, but it does not define the indexing policy of public login destinations. This is not evidence of private-content exposure.

**Fix:** Emit `noindex, nofollow` for auth and project HTML. Add the equivalent HTTP header to those route responses, including redirects and errors. Keep authentication intact. Exclude these routes from the sitemap. Let crawlers fetch auth URLs to see noindex. A robots disallow can prevent crawlers from reading it. [Google's noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing) explains this requirement.

### P1. High: Canonical URLs are absent and origin is not passed to the homepage

**Evidence:** `assets/views/layouts/base.html:9` and `assets/views/home.html:3` contain no canonical. The live homepage agrees. `src/controllers/pages.rs:42` passes only `sites_domain` to the homepage. The trusted app origin already exists at `src/settings.rs:37` and `config/production.yaml:38`.

**Impact:** The homepage gives no preferred URL signal for query-string variants or alternate deployment addresses. This is a duplicate-URL risk, not proof that duplicates are indexed.

**Fix:** Build absolute self-canonicals from the configured app origin and an explicit marketing route path. Use the same URL in `og:url` and the sitemap. Omit canonicals on private pages and 404s. Do not canonicalize every route to `/`. Google treats canonical declarations as signals, not guarantees. [Canonical documentation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### P2. Medium: robots.txt and sitemap.xml are missing

**Evidence:** Both endpoints return 404 HTML. Neither route exists in `src/controllers/pages.rs:338`. The fallback is wired at `src/app.rs:74`. Static assets are mounted under `/static`, not `/`, at `config/production.yaml:17`.

**Impact:** The app lacks an explicit crawl policy and a marketing URL inventory. A missing robots file does not itself block the homepage. A one-page site can be discovered without a sitemap. These are launch foundations rather than proof of a ranking penalty.

**Fix:** Serve root-level text and XML responses from the existing pages controller. Include only `/` initially. Add future marketing pages only after they exist and pass the indexability checks. Sitemap entries should be canonical URLs. [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

### P2. Medium: The title and opening copy hide the product category

**Evidence:** `assets/views/home.html:2`, `:16` and `:18` say “Your website” and “finished website”. They do not name visual editing of AI-generated static websites. Static scope appears later at `assets/views/home.html:98` and `:105`. The homepage description exists at `:3`. Auth and error descriptions are absent at `assets/views/auth/login.html:2`, `assets/views/auth/register.html:2` and `assets/views/errors/not_found.html:2`.

**Impact:** Searchers must infer the product and its limits. The homepage title is unique among the fetched pages, but weak for category intent. Auth title length is not a search priority because those pages should be noindex.

**Fix:** Name visual editing and AI-generated websites in the title and first paragraph. State the compatible static ZIP requirement before signup. Align the title, h1 and description. Give each marketing page its own description. Add short utility descriptions to auth and error views to satisfy the launch check without making them indexable.

### P2. Medium: Open Graph and Twitter cards are absent

**Evidence:** No social tags appear in `assets/views/layouts/base.html:3` through `:14` or `assets/views/home.html:3`. The live homepage confirms this.

**Impact:** Shared links lack controlled titles, summaries and imagery. This is a sharing-quality issue, not a direct ranking claim.

**Fix:** Add page-specific social metadata to marketing pages. Use an absolute URL for a real Pagehaven product image. Do not point cards at tokenized previews or customer sites. Omit social cards from auth, app and error pages.

### P2. Medium: Homepage entity markup is absent

**Evidence:** The rendered homepage DOM contains zero JSON-LD blocks. `assets/views/home.html:3` has only a description in its head block. The shared layout at `assets/views/layouts/base.html:14` provides an insertion point. The app CSP at `src/security.rs:43` permits only same-origin scripts.

**Impact:** Search engines receive no explicit Pagehaven organization, website or application graph. This does not prevent indexing.

**Fix:** Add the graph below to the homepage only. Use `Organization`, `WebSite` and a factual `SoftwareApplication`. Do not invent reviews, ratings, customers, awards, certifications or social profiles. Do not add `Offer`, a zero price or a “free” claim without a real published pricing policy. Billing is absent per `docs/launch/PLAN.md:14` and `:20`. The minimal graph does not satisfy Google's software-app rich-result requirements for price and reviews. Do not fabricate data to qualify. [Google's software-app requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app).

### P3. Low: Semantic basics pass, but useful public links are scarce

**Evidence:** The homepage has one h1 at `assets/views/home.html:16`. Its h2 at `:68` precedes the h3 steps at `:71`, `:75` and `:79`. The promises section uses h2 at `:86`. Auth h1 elements are at `assets/views/auth/login.html:13` and `assets/views/auth/register.html:13`. The error h1 is at `assets/views/errors/not_found.html:13`. Home links point to home, login and registration at `assets/views/home.html:7`, `:11`, `:20` and `:21`. Export guidance exists inside a partial at `assets/views/partials/export_help.html:7`.

**Impact:** There is no heading-order fault on the fetched marketing and auth pages. Visitors cannot follow a public compatibility explanation before committing to signup. The editor shell starts with h2 elements at `assets/views/projects/editor.html:65`; it has no h1 in the template. That is an accessibility cleanup, not a marketing ranking blocker.

**Fix:** Preserve the homepage hierarchy. Link “Check compatible exports” before the signup decision. Link the proposed public pages from navigation or relevant homepage sections. Keep signup as the primary action. Add a meaningful editor h1 for accessibility without indexing the editor.

### P3. Low: Images reserve space, but the demo lacks responsive variants

**Evidence:** Logos have dimensions and empty alt text beside the Pagehaven name at `assets/views/home.html:8` and `:104`. The coffee image has `width="720"`, `height="540"` and empty alt at `assets/views/home.html:44`. It sits inside an `aria-hidden="true"` mockup at `:27`. The external figcaption explains the demonstration at `:64`. CSS reserves a 4:3 ratio at `assets/static/css/screens.css:231`.

**Impact:** Empty alt is appropriate for the redundant logos and decorative mock image. This is not missing alt text. The image lacks `srcset` and `sizes`, so small screens receive the same file. The caption describes a workflow, but the figure is a mockup rather than a verified product screenshot.

**Fix:** Keep dimensions and decorative alt behavior. Use a real product capture or functional demo for launch. Give meaningful screenshots a concise description of the demonstrated edit. Provide responsive WebP or AVIF variants where they reduce transfer size. Lazy-load only below-fold images. Do not lazy-load an image that becomes the LCP element.

### P3. Low: HTML and CSS expose performance risks, not a measured CWV failure

**Evidence:** Two blocking stylesheets load at `assets/views/layouts/base.html:11` and `:12`. The module script at `:13` is deferred by browser module behavior. It imports further modules at `assets/static/js/app.js:1`. Onest is self-hosted and preloaded at `assets/views/layouts/base.html:8`, with `font-display: swap` at `assets/static/css/app.css:10`. Its system fallback has no metric overrides at `:13`. Mobile layouts are defined at `assets/static/css/screens.css:265` and `:286`.

**Impact:** Blocking CSS can delay LCP. Font swapping can shift line breaks and affect CLS. Shared application JavaScript adds downloads and possible main-thread work to the homepage. The HTML alone cannot establish INP, LCP or CLS results. Source sizes are 38,748 bytes for app.css, 26,033 for screens.css, 12,935 for app.js, 33,760 for the font and 68,181 for the JPEG. These are file sizes, not compressed network measurements or a benchmark.

**Fix:** Keep the font preload and swap behavior. Measure before splitting CSS or JavaScript. Keep homepage code limited to its interactions. Check whether fallback metrics need adjustment. Test mobile loading with a cold cache and report LCP, CLS and interaction behavior. Obtain field CWV after launch. Do not claim a pass from this audit.

### P3. Low: Language, viewport and 404 status are correct

**Evidence:** `assets/views/layouts/base.html:2` sets `lang="en"`. `:5` sets a responsive viewport without disabling zoom. The standalone customer-host error template does the same at `assets/views/errors/site_not_found.html:2` and `:5`, and already has noindex at `:6`. App errors preserve 404 at `src/controllers/pages.rs:334`. Published-site files are served independently at `src/sites.rs:85`.

**Impact:** No hreflang is needed for this English-only site. The fetched error is not a soft 404. The local HTTP server provides no evidence about production TLS, redirects or HSTS.

**Fix:** Preserve these settings and real 404 responses. Add explicit noindex to app errors as defense in depth. Leave hreflang out until real translated canonical pages exist. Keep app metadata out of customer responses. Do not inject Pagehaven canonicals, schema or blanket noindex into published HTML.

## 2. Keyword hypotheses

These are hypotheses, not verified keyword opportunities. Search volume, difficulty, rankings and traffic potential cannot be verified with the available access. No numerical estimates are supplied. A limited public search sampled page formats. It did not establish a stable Google ranking set or demand.

Product pages appear for visual HTML editing, including [Visual HTML Editor](https://visualhtmleditor.com/) and [HtmlDrag](https://htmldrag.com/). Their positioning supports testing a product page format. It does not prove Pagehaven can outrank them. The broad queries also mix creation, editing and deployment intents. Validate the exact queries and target country before finalizing titles. Use actual Search Console queries after launch.

1. **Visual editor for AI-generated websites.** Likely commercial intent. Serve it with the homepage and a working editing demonstration. Honest fit: strong for compatible built static exports. Do not imply Pagehaven generates websites or edits every AI app. Ranking is plausible as a focused category hypothesis, not assured.
2. **Edit a website without coding.** Likely mixed tool-selection and how-to intent. Serve it with a product workflow page and clear supported edits. Honest fit: conditional. Pagehaven can edit supported text, images, links and styles after import. It cannot promise to edit any live URL, WordPress installation or backend. The broad phrase needs qualification.
3. **Host an AI-generated website.** Likely deployment intent after generation. Serve it with a static hosting workflow page. Honest fit: strong when a finished static ZIP exists. Explain assets, hosted addresses, custom domains and publishing. Do not imply server runtimes, databases or unrestricted application hosting.
4. **Edit exported HTML visually.** Likely commercial intent from someone who already has files. Serve it with a visual HTML editor product page linked to compatibility guidance. Honest fit: strongest of these hypotheses for supported HTML content. Verify the example export before naming its source tool as compatible.
5. **Publish a static website.** Likely task completion and hosting comparison intent. Serve it with the same publishing page as the AI hosting query. Honest fit: strong for ZIP upload and hosted publication. The page should show a real path from files to a URL. Avoid competing near-duplicate hosting pages.
6. **Alternatives to re-prompting AI website builders.** Likely problem-solving intent. Serve it with a section on the visual editing page. Demonstrate one text change without another AI request. Honest fit: strong for supported local edits, weak for generating new application behavior. Avoid universal cost savings or unsupported competitor comparisons.

### At most three additional pages

1. **`/compatible-exports`**, titled `Compatible Website Exports for Pagehaven`. Show a valid ZIP tree with index.html and assets. Explain dist/build output, source-only ZIPs and server dependencies. Include tested examples and explicit limits. This earns its place because it helps visitors decide whether to sign up. Base it on `assets/views/partials/export_help.html:7`, `src/import/mod.rs:78` and `src/import/policy.rs:40`. Do not turn tool names into blanket compatibility claims.
2. **`/visual-html-editor`**, titled `Edit Exported HTML Visually | Pagehaven`. Show a real before-and-after text, image and link edit. State what remains editable and when code or the original AI tool is still needed. Include the re-prompting alternative as a section. This earns its place because visitors can inspect the core editing workflow before uploading files.
3. **`/static-website-hosting`**, titled `Publish a Static Website from a ZIP | Pagehaven`. Show import, preview and publish as distinct steps. Explain the hosted URL, domain verification and republishing an earlier version. State static-only limits. This earns its place because deployment is a separate purchase question. Ground claims in `src/controllers/pages.rs:259`, `:270` and `src/sites.rs:76`.

Each page needs original product evidence and one signup action. Do not ship empty SEO landing pages. Do not add a generic blog, separate near-duplicate keyword pages or a pricing page before pricing exists.

## 3. Exact implementation list

### A. Define a route-level metadata policy

Use the existing `src/controllers/pages.rs` controller. Pass a single metadata object into Tera. Keep shared tags outside the overridable `head` block in `assets/views/layouts/base.html`. The import and editor already replace that block to load their modules. A child view must not accidentally remove noindex or duplicate a canonical.

Use these rules:

- `/` and finished marketing pages: one unique title, description, absolute self-canonical, social cards and `robots="index, follow"`. Emit no noindex header. Explicit index is optional for search, but useful for the launch check.
- `/login` and `/register`, including form validation responses: `robots="noindex, nofollow"` plus `X-Robots-Tag: noindex, nofollow`. No canonical, social cards or JSON-LD.
- `/projects`, `/projects/new` and `/projects/{pid}`: the same private policy. Apply the header before returning redirects or errors. Do not expose project data in public metadata.
- App 404s: retain 404, set noindex, omit canonical and social cards. Never redirect missing URLs to the homepage.
- API and operational responses: no sitemap entries. Add noindex headers where applicable without changing access controls.
- Preview host responses: always `X-Robots-Tag: noindex, nofollow` in `src/preview.rs::headers`. Never use an app-wide allow rule on previews.
- Published customer hosts: preserve their existing independent behavior. No automatic Pagehaven canonical, schema or index/noindex directive.

Suggested exact content:

- Homepage title: `Visual Editor for AI-Generated Websites | Pagehaven`.
- Homepage description: `Import a compatible static website ZIP, edit text, images and links visually, then publish to a hosted URL or custom domain. No coding for supported edits.`
- Homepage h1: retain a concise outcome headline if desired. Put `A visual editor for AI-generated static websites` in the opening paragraph. Explain the ZIP requirement in the same hero.
- Login description: `Sign in to Pagehaven to edit and publish your imported websites.`
- Registration description: `Create a Pagehaven account to import a compatible static website ZIP, edit it visually and publish it.`
- App 404 description: `This Pagehaven page could not be found. Return to the homepage or sign in to open your websites.`

Keep the existing unique auth and error titles. Titles should lead with the page's subject. Aim for about 50 to 60 characters where useful. Descriptions should usually fit about 150 to 160 characters. Clarity takes priority over padding to a count. Neither length guarantees a particular search snippet.

### B. Build URLs from the trusted app origin

`config/development.yaml:38` and `config/test.yaml:38` default `PAGEHAVEN_APP_ORIGIN` to the loopback address. `config/production.yaml:38` requires the environment value. Settings are loaded and validated at `src/settings.rs:77`. Separate customer origin helpers exist at `src/settings.rs:155` and `:168`. Do not use those helpers for marketing SEO.

Read `Pagehaven::from(&ctx).settings.app_origin`. Validate it once as an absolute HTTP(S) origin. Reject credentials, query, fragment and any path other than `/`. Require HTTPS in production. Preserve the existing domain-isolation validation at `src/settings.rs:95`.

Normalize the trailing slash once. For fixed allowlisted marketing paths, use:

```rust
let origin = state.settings.app_origin.trim_end_matches('/');
let home_url = format!("{origin}/");
let exports_url = format!("{origin}/compatible-exports");
```

Do not derive canonical URLs from Host, X-Forwarded-Host, user input or preview URLs. Do not concatenate an arbitrary request URL. Drop tracking parameters and fragments. Use the normalized app origin for canonical, sitemap loc, og:url, social image URLs and schema IDs. The production hostname is a deployment setting, not a domain inferred from test fixtures. Keep one slash at the root and no trailing slash on the proposed child paths. Redirect accepted alternate forms to the chosen paths.

Escape URL values for their output context. Use normal Tera attribute escaping for HTML. Escape XML text separately. Serialize JSON with serde_json. Do not pass an HTML-escaped string into a JSON literal.

### C. Add marketing head tags

The following is a target Tera shape. Values come from the controller metadata object. Emit the entire social block only for indexable marketing pages.

```html
<title>{{ seo.title }}</title>
<meta name="description" content="{{ seo.description }}">
<meta name="robots" content="{{ seo.robots }}">
{% if seo.canonical %}
<link rel="canonical" href="{{ seo.canonical }}">
{% endif %}
{% if seo.social_image %}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pagehaven">
<meta property="og:title" content="{{ seo.title }}">
<meta property="og:description" content="{{ seo.description }}">
<meta property="og:url" content="{{ seo.canonical }}">
<meta property="og:image" content="{{ seo.social_image }}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{{ seo.social_image_alt }}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ seo.title }}">
<meta name="twitter:description" content="{{ seo.description }}">
<meta name="twitter:image" content="{{ seo.social_image }}">
<meta name="twitter:image:alt" content="{{ seo.social_image_alt }}">
{% endif %}
```

Create a real 1200 by 630 PNG product card at `/static/img/pagehaven-social.png` before enabling this block. Use the absolute app URL to it. Describe the actual card in its alt value, such as `Pagehaven editing controls around a heading on an imported static website`. The declared type and dimensions must match the file. Do not reuse the coffee photo as if it were a product screenshot. Omit twitter:site unless a real brand account is verified.

### D. Serve robots.txt at the app root

Add `robots_txt(State(ctx): State<AppContext>)` in `src/controllers/pages.rs`. Register `.add("/robots.txt", get(robots_txt))` in `routes()`. Return status 200 with `Content-Type: text/plain; charset=utf-8`. Build the sitemap URL from the trusted origin. The exact production body is:

```text
User-agent: *
Disallow: /api/
Disallow: /internal/
Disallow: /_health
Disallow: /_ping
Disallow: /logout
Sitemap: {{ app_origin }}/sitemap.xml
```

Here `{{ app_origin }}` means the normalized configured value without a trailing slash. It is a substitution instruction, not literal output. There is no disallow for marketing, auth or projects. Their noindex or authentication responses must remain visible to crawlers. Operational disallows reduce unwanted crawling. They are not a deindexing or security mechanism. [Robots.txt scope and limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

Do not add `Noindex:` to robots.txt. Do not block `/static/`, since crawlers need rendering resources. The app's file cannot control other hosts. Do not send this robots body on customer hosts or let preview requests fall through to the app controller. On preview hosts, retain the universal noindex header even for requests to robots.txt. Do not introduce a preview `Disallow: /` as a substitute for readable noindex responses.

For an internet-accessible staging app, use access control and an environment-specific noindex policy. Do not accidentally deploy that policy to the production marketing origin. Local curl status alone cannot validate this deployment distinction.

### E. Serve sitemap.xml at the app root

Add `sitemap_xml(State(ctx): State<AppContext>)` in the same controller. Register `.add("/sitemap.xml", get(sitemap_xml))`. Return status 200 with `Content-Type: application/xml; charset=utf-8`. Start with exactly this document after substituting the configured origin:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{{ app_origin }}/</loc></url>
</urlset>
```

Append `/compatible-exports`, `/visual-html-editor` and `/static-website-hosting` only when each exists, returns 200, has a matching self-canonical and is indexable. Exclude auth, projects, API, errors, redirects, tokenized previews and all customer-site URLs. Omit changefreq and priority. Omit lastmod until a genuine content modification date exists. Never stamp every request with today's date.

Use Axum response tuples with explicit content-type headers and a String body, as the existing `src/preview.rs:120` response helper demonstrates. Do not use JSON response helpers or render the normal HTML layout. Controller routes are preferable to static files because the origin varies by environment. Merely adding files under assets/static would expose `/static/robots.txt`, which does not meet the root endpoint requirement. Keep both routes within existing `Host::App` dispatch at `src/app.rs:141`. No new host catch-all is needed.

### F. Add homepage JSON-LD

Render this graph with all `{{ app_origin }}` occurrences replaced by the normalized trusted origin. The description must agree with the visible homepage. These types fit the actual product without implying rich-result eligibility.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "{{ app_origin }}/#organization",
      "name": "Pagehaven",
      "url": "{{ app_origin }}/"
    },
    {
      "@type": "WebSite",
      "@id": "{{ app_origin }}/#website",
      "name": "Pagehaven",
      "url": "{{ app_origin }}/",
      "inLanguage": "en",
      "publisher": { "@id": "{{ app_origin }}/#organization" }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "{{ app_origin }}/#application",
      "name": "Pagehaven",
      "url": "{{ app_origin }}/",
      "description": "Import a compatible static website ZIP, edit supported text, images and links visually, then publish to a hosted URL or custom domain.",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "Web browser",
      "publisher": { "@id": "{{ app_origin }}/#organization" }
    }
  ]
}
</script>
```

Organization describes the Pagehaven brand operator. Do not add an unverified legal name, address or founding date. WebSite identifies the marketing site. Omit SearchAction because no public site search is implemented. SoftwareApplication describes the browser product. Omit Offer, aggregateRating and review. Add a logo only once a suitable public logo asset is selected and verified. Do not identify customer websites as part of this WebSite graph.

Build the graph as a serde_json value. Escape `<` as `\u003c` in the serialized script payload so embedded closing-script text cannot terminate the element. Mark only that controlled serialized payload safe in Tera. Never mark arbitrary user content safe. Preserve the app CSP. If the browser reports a CSP restriction for the data block, authorize its exact serialized bytes with a matching SHA-256 script hash in the marketing response CSP. Check the browser console and DOM after rendering. Do not add unsafe-inline or broaden the editor or preview CSP to make schema work.

### G. Verify the implementation on rendered responses

The frontend engineer should add the scripted check required by definition-of-done item 5. It should fetch the actual responses rather than search templates alone.

1. Assert 200 for the homepage, robots and sitemap. Assert 404 for a random missing path. Assert expected content types.
2. Parse HTML. Check exactly one title, description and h1 on each marketing page. Check unique page metadata, one self-canonical and no noindex in either HTML or headers.
3. Parse XML. Check every loc against the explicit marketing allowlist. Fetch each URL and verify its status, canonical and indexing policy. Reject preview domains and customer hosts.
4. Check auth noindex in GET and validation responses. Check anonymous project redirects. Use existing authenticated verification fixtures to check the project and editor shell headers without creating public content.
5. Check the preview response wrapper with valid and expired test tokens. Confirm noindex on successful draft HTML and errors. Keep token checks and existing security checks passing.
6. Parse the rendered JSON-LD as JSON. Inspect the browser DOM and console. Validate schema semantics. Do not treat an expected software rich-result warning about omitted price or ratings as permission to invent them.
7. Fetch the social image. Check its actual MIME type and dimensions. Confirm all img elements have alt attributes and meaningful images have useful descriptions.
8. Inspect the marketing pages at 390, 834 and 1280 pixels. Check horizontal overflow, text wrapping, links and image space. Measure performance separately before reporting CWV results.
9. Verify on the production origin after deployment. Check HTTPS, preferred-host redirects, robots, sitemap and absence of staging noindex. Submit the sitemap in Search Console when access exists. No indexing or ranking claim is possible before that evidence.

## 10-line summary

1. The homepage returns 200 and renders its main content on the server.
2. Draft previews need a universal noindex response header.
3. Auth, dashboard and editor pages need explicit noindex policies.
4. Canonical URLs must use the configured app origin.
5. robots.txt and sitemap.xml currently return 404 HTML.
6. The homepage needs category-led metadata and social cards.
7. Add factual entity markup without invented prices or reviews.
8. Preserve the working heading order, language and image dimensions.
9. Test three useful product pages as unverified keyword hypotheses.
10. Verify rendered responses and keep customer-site indexing independent.
