# Launch SEO, performance and comprehension verification

Verified on 2026-10-20T20:34:53+00:00. Base URL: `http://127.0.0.1:5150`.
Branch: `main`. Source commit before this report: `66e03d10b9c17d070acefbe345201e0e8986d23c`.
The app was already running. It was not restarted or modified.
Only the two verification scripts and this report were written in the repository.

Read PLAN.md definition-of-done items 1 and 5, seo/README.md section 3, and decisions.md items 4, 5 and 22. Comprehension is judged against items 1 and 2. The explicit task takes precedence where the older SEO plan differs, including robots disallows for projects.

## Findings by impact

1. **High: five image references return HTML instead of images.** The two examples on the visual editor page are broken. References: `assets/views/marketing/visual-html-editor.html:36` and `:40`. The hosting examples are broken too. References: `assets/views/marketing/static-website-hosting.html:38` and `:52`. The sign-in illustration is broken. Reference: `assets/views/partials/auth_story.html:7`. All five return status 200, Content-Type `text/html`, and 820 bytes. The body is Rótulo's “Page not found” HTML. The referenced files are absent from `assets/static/img/marketing/`. This weakens the product evidence required by decision 22. Repair the references or restore real assets, then rerun the inventory. No app fix was made.
2. **Medium: missing static files have misleading success status.** `config/development.yaml:19` configures `assets/static/404.html` as the static fallback. The same setting appears at `config/production.yaml:19`. Live requests to the five missing images return that HTML with 200. This masks asset failures from status-only checks and makes their measured weights artificially small. The new weight script checks image response types too. The normal missing page still correctly returns 404.
3. **Low: two stylesheets block rendering on each page.** `assets/views/layouts/base.html:10` loads app.css. Line 11 loads screens.css on login. Marketing overrides load marketing.css at `assets/views/home.html:6`, `assets/views/marketing/compatible.html:5`, `assets/views/marketing/visual-html-editor.html:5`, and `assets/views/marketing/static-website-hosting.html:5`. The marketing CSS pair totals 63,195 bytes. The login pair totals 75,994 bytes. This is an observation, not proof of a performance failure. Measure before changing it.

There are no failing checks in the requested SEO suite. It reports 105 PASS and 0 FAIL. Page weight reports five image type flags and no transfer-budget or lazy-loading flags. No price, review or offer was inferred from the results. Passing this suite does not certify every marketing claim.

## Five-second comprehension

Captured the signed-out homepage in an incognito T3 preview tab. The viewport was exactly 1280 by 800. Used `preview_snapshot` with `save=true`.

Screenshot: `/home/agent/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvh533tg-f4ad96ed.png`.

A fresh delegated reader received only the screenshot path and the question. It was told to inspect only the image and read no files, repository content or webpage text. The reader had no parent conversation context. It used GPT-6.1-Sol with medium reasoning. This is an agent first impression, not a timed human usability study.

Prompt: “From this image alone, in three short sentences: what is this product, who is it for, and what should a visitor do next?”

Verbatim answer:

> Rótulo lets you visually edit and publish an AI-made website.
> It’s for people with a finished site exported as HTML files in a ZIP.
> Import your website to start editing.

**Verdict: PASS at 1280 by 800.** Sentence one names the concrete editing outcome from decision 2. Sentence two identifies the finished HTML audience in decision 1. Sentence three identifies the import action. The answer does not repeat the no-code or no-further-AI wording, but it correctly identifies visual editing of an existing AI-made site. This supports definition-of-done item 1 at this viewport only. The 834 and 390 variants were not tested here.

## Script outputs

Each command was run anonymously. SEO requests do not follow redirects. The asset inventory follows asset redirects with a five-hop limit. Both scripts default to the local base URL and accept an alternate origin as their first argument.

### `python3 scripts/launch/seo-check.py`

Exit code: `0`.

```text
PASS / status | 200
PASS / unique title, one, 30..65 chars | 45 chars: Edit an HTML website without code | Rótulo
PASS / unique description, one, 70..160 chars | 156 chars
PASS / absolute self-canonical | ['http://127.0.0.1:5150/']
PASS / index, follow
PASS / og:title
PASS / og:description
PASS / og:url
PASS / og:image
PASS / twitter:card
PASS / exactly one h1
PASS / heading order
PASS / image alt and dimensions line 76 | /static/img/marketing/demo-1-typed-1280.webp
PASS / image alt and dimensions line 110 | /static/img/marketing/demo-1-selected-crop.webp
PASS / image alt and dimensions line 114 | /static/img/marketing/demo-1-typed-crop.webp
PASS / image alt and dimensions line 124 | /static/img/marketing/demo-2-photo-1280.webp
PASS / image alt and dimensions line 132 | /static/img/marketing/demo-3-link-1280.webp
PASS / image alt and dimensions line 140 | /static/img/marketing/demo-4-review.webp
PASS / image alt and dimensions line 144 | /static/img/marketing/demo-4-live.webp
PASS / image alt and dimensions line 154 | /static/img/marketing/demo-5-site-1280.webp
PASS / JSON-LD parses line 15
PASS / JSON-LD no ratings, reviews or offers | []
PASS / FAQPage matches visible questions and answers exactly | 8 schema / 8 visible
PASS / links to other marketing pages | []
PASS / internal link http://127.0.0.1:5150/ | 200
PASS / internal link http://127.0.0.1:5150/compatible-exports | 200
PASS / internal link http://127.0.0.1:5150/login | 200
PASS / internal link http://127.0.0.1:5150/register | 200
PASS / internal link http://127.0.0.1:5150/static-website-hosting | 200
PASS / internal link http://127.0.0.1:5150/visual-html-editor | 200
PASS /compatible-exports status | 200
PASS /compatible-exports unique title, one, 30..65 chars | 42 chars: Which website exports work with Rótulo?
PASS /compatible-exports unique description, one, 70..160 chars | 160 chars
PASS /compatible-exports absolute self-canonical | ['http://127.0.0.1:5150/compatible-exports']
PASS /compatible-exports index, follow
PASS /compatible-exports og:title
PASS /compatible-exports og:description
PASS /compatible-exports og:url
PASS /compatible-exports og:image
PASS /compatible-exports twitter:card
PASS /compatible-exports exactly one h1
PASS /compatible-exports heading order
PASS /compatible-exports links to other marketing pages | []
PASS /compatible-exports internal link http://127.0.0.1:5150/ | 200
PASS /compatible-exports internal link http://127.0.0.1:5150/compatible-exports | 200
PASS /compatible-exports internal link http://127.0.0.1:5150/login | 200
PASS /compatible-exports internal link http://127.0.0.1:5150/register | 200
PASS /compatible-exports internal link http://127.0.0.1:5150/static-website-hosting | 200
PASS /compatible-exports internal link http://127.0.0.1:5150/visual-html-editor | 200
PASS /visual-html-editor status | 200
PASS /visual-html-editor unique title, one, 30..65 chars | 52 chars: Visual HTML editor for exported websites | Rótulo
PASS /visual-html-editor unique description, one, 70..160 chars | 153 chars
PASS /visual-html-editor absolute self-canonical | ['http://127.0.0.1:5150/visual-html-editor']
PASS /visual-html-editor index, follow
PASS /visual-html-editor og:title
PASS /visual-html-editor og:description
PASS /visual-html-editor og:url
PASS /visual-html-editor og:image
PASS /visual-html-editor twitter:card
PASS /visual-html-editor exactly one h1
PASS /visual-html-editor heading order
PASS /visual-html-editor image alt and dimensions line 83 | /static/img/marketing/editor-before-1280.webp
PASS /visual-html-editor image alt and dimensions line 87 | /static/img/marketing/editor-after-1280.webp
PASS /visual-html-editor links to other marketing pages | []
PASS /visual-html-editor internal link http://127.0.0.1:5150/ | 200
PASS /visual-html-editor internal link http://127.0.0.1:5150/compatible-exports | 200
PASS /visual-html-editor internal link http://127.0.0.1:5150/login | 200
PASS /visual-html-editor internal link http://127.0.0.1:5150/register | 200
PASS /visual-html-editor internal link http://127.0.0.1:5150/static-website-hosting | 200
PASS /visual-html-editor internal link http://127.0.0.1:5150/visual-html-editor | 200
PASS /static-website-hosting status | 200
PASS /static-website-hosting unique title, one, 30..65 chars | 47 chars: Publish a static website from a ZIP | Rótulo
PASS /static-website-hosting unique description, one, 70..160 chars | 157 chars
PASS /static-website-hosting absolute self-canonical | ['http://127.0.0.1:5150/static-website-hosting']
PASS /static-website-hosting index, follow
PASS /static-website-hosting og:title
PASS /static-website-hosting og:description
PASS /static-website-hosting og:url
PASS /static-website-hosting og:image
PASS /static-website-hosting twitter:card
PASS /static-website-hosting exactly one h1
PASS /static-website-hosting heading order
PASS /static-website-hosting image alt and dimensions line 85 | /static/img/marketing/step-import.webp
PASS /static-website-hosting image alt and dimensions line 99 | /static/img/marketing/step-publish.webp
PASS /static-website-hosting links to other marketing pages | []
PASS /static-website-hosting internal link http://127.0.0.1:5150/ | 200
PASS /static-website-hosting internal link http://127.0.0.1:5150/compatible-exports | 200
PASS /static-website-hosting internal link http://127.0.0.1:5150/login | 200
PASS /static-website-hosting internal link http://127.0.0.1:5150/register | 200
PASS /static-website-hosting internal link http://127.0.0.1:5150/static-website-hosting | 200
PASS /static-website-hosting internal link http://127.0.0.1:5150/visual-html-editor | 200
PASS /login meta noindex
PASS /login header noindex
PASS /register meta noindex
PASS /register header noindex
PASS /projects anonymous redirect to login | 303
PASS missing path real 404 | 404
PASS robots.txt status and text type
PASS robots.txt disallows /projects
PASS robots.txt disallows /api
PASS robots.txt names absolute sitemap
PASS sitemap status and XML type
PASS sitemap valid XML urlset
PASS sitemap exactly four absolute marketing URLs, no private paths | ['http://127.0.0.1:5150/', 'http://127.0.0.1:5150/compatible-exports', 'http://127.0.0.1:5150/visual-html-editor', 'http://127.0.0.1:5150/static-website-hosting']
PASS customer host does not receive Rótulo robots | 404
SUMMARY 105 PASS, 0 FAIL
```

### `python3 scripts/launch/page-weight.py`

Exit code: `1`.

```text
Byte thresholds: initial > 1500000; single image > 300000. Cold cache per page.

PAGE /
HTML 26228 bytes status=200 encoding=none
CSS 39813 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/app.css
CSS 23382 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/marketing.css
font 33760 bytes eager status=200 encoding=none type=font/woff2 http://127.0.0.1:5150/static/fonts/onest-variable-latin.woff2
image 10838 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-1-selected-crop.webp
image 65148 bytes eager status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-1-typed-1280.webp
image 9350 bytes eager status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-1-typed-crop.webp
image 51284 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-2-photo-1280.webp
image 24344 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-2-photo-phone.webp
image 41636 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-3-link-1280.webp
image 15112 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-3-link-phone.webp
image 9304 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-4-live.webp
image 10836 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-4-review.webp
image 44602 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-5-site-1280.webp
image 15320 bytes lazy status=200 encoding=none type=image/webp http://127.0.0.1:5150/static/img/marketing/demo-5-site-phone.webp
image 187 bytes eager status=200 encoding=none type=image/svg+xml http://127.0.0.1:5150/static/img/select-chevron.svg
JS 13213 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/app.js
JS 1811 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/marketing.js
HEAD render-blocking: CSS line 10: /static/css/app.css media=all; CSS line 11: /static/css/marketing.css media=all
Images after first two without loading=lazy: none
INITIAL 212892 bytes; ALL inventoried 436168 bytes; 17 unique resource URLs

PAGE /compatible-exports
HTML 11960 bytes status=200 encoding=none
CSS 39813 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/app.css
CSS 23382 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/marketing.css
font 33760 bytes eager status=200 encoding=none type=font/woff2 http://127.0.0.1:5150/static/fonts/onest-variable-latin.woff2
image 187 bytes eager status=200 encoding=none type=image/svg+xml http://127.0.0.1:5150/static/img/select-chevron.svg
JS 13213 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/app.js
HEAD render-blocking: CSS line 10: /static/css/app.css media=all; CSS line 11: /static/css/marketing.css media=all
Images after first two without loading=lazy: none
INITIAL 122315 bytes; ALL inventoried 122315 bytes; 5 unique resource URLs

PAGE /visual-html-editor
HTML 10538 bytes status=200 encoding=none
CSS 39813 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/app.css
CSS 23382 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/marketing.css
font 33760 bytes eager status=200 encoding=none type=font/woff2 http://127.0.0.1:5150/static/fonts/onest-variable-latin.woff2
image 820 bytes lazy status=200 encoding=none type=text/html http://127.0.0.1:5150/static/img/marketing/editor-after-1280.webp
FLAG image response is not an image: http://127.0.0.1:5150/static/img/marketing/editor-after-1280.webp
image 820 bytes lazy status=200 encoding=none type=text/html http://127.0.0.1:5150/static/img/marketing/editor-before-1280.webp
FLAG image response is not an image: http://127.0.0.1:5150/static/img/marketing/editor-before-1280.webp
image 187 bytes eager status=200 encoding=none type=image/svg+xml http://127.0.0.1:5150/static/img/select-chevron.svg
JS 13213 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/app.js
HEAD render-blocking: CSS line 10: /static/css/app.css media=all; CSS line 11: /static/css/marketing.css media=all
Images after first two without loading=lazy: none
INITIAL 120893 bytes; ALL inventoried 122533 bytes; 7 unique resource URLs

PAGE /static-website-hosting
HTML 10517 bytes status=200 encoding=none
CSS 39813 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/app.css
CSS 23382 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/marketing.css
font 33760 bytes eager status=200 encoding=none type=font/woff2 http://127.0.0.1:5150/static/fonts/onest-variable-latin.woff2
image 820 bytes lazy status=200 encoding=none type=text/html http://127.0.0.1:5150/static/img/marketing/step-import.webp
FLAG image response is not an image: http://127.0.0.1:5150/static/img/marketing/step-import.webp
image 820 bytes lazy status=200 encoding=none type=text/html http://127.0.0.1:5150/static/img/marketing/step-publish.webp
FLAG image response is not an image: http://127.0.0.1:5150/static/img/marketing/step-publish.webp
image 187 bytes eager status=200 encoding=none type=image/svg+xml http://127.0.0.1:5150/static/img/select-chevron.svg
JS 13213 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/app.js
HEAD render-blocking: CSS line 10: /static/css/app.css media=all; CSS line 11: /static/css/marketing.css media=all
Images after first two without loading=lazy: none
INITIAL 120872 bytes; ALL inventoried 122512 bytes; 7 unique resource URLs

PAGE /login
HTML 5286 bytes status=200 encoding=none
CSS 39813 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/app.css
CSS 36181 bytes eager status=200 encoding=none type=text/css http://127.0.0.1:5150/static/css/screens.css
font 33760 bytes eager status=200 encoding=none type=font/woff2 http://127.0.0.1:5150/static/fonts/onest-variable-latin.woff2
image 820 bytes eager status=200 encoding=none type=text/html http://127.0.0.1:5150/static/img/marketing/editor-after-800.webp
FLAG image response is not an image: http://127.0.0.1:5150/static/img/marketing/editor-after-800.webp
image 187 bytes eager status=200 encoding=none type=image/svg+xml http://127.0.0.1:5150/static/img/select-chevron.svg
JS 13213 bytes eager status=200 encoding=none type=text/javascript http://127.0.0.1:5150/static/js/app.js
HEAD render-blocking: CSS line 10: /static/css/app.css media=all; CSS line 11: /static/css/screens.css media=all
Images after first two without loading=lazy: none
INITIAL 129260 bytes; ALL inventoried 129260 bytes; 6 unique resource URLs

SUMMARY 0 request failures, 5 flags
```

## Verification and limits

In-memory checks passed for HTML ancestry, whitespace handling, duplicate-title failure and nonzero exit, largest srcset selection, CSS font discovery, blocking resources, missing lazy loading, single-image budget and initial-page budget. These checks wrote no test files. No dependency was added.

There is no field data. There is no search volume data. No ranking, indexing, conversion or Core Web Vitals result is claimed. This is one local anonymous sample. Production HTTPS, CDN behavior, staging policies, authenticated pages, auth validation responses, valid preview tokens and customer-host content were not comprehensively tested. The customer-host check covers only robots isolation on the specified host. No claims audit, security review or full launch journey suite was run.

Weights are bytes on the wire without compression unless curl reports encoding. Curl reported no Content-Encoding for the sampled responses. The count is response-body bytes. It excludes HTTP headers, TLS overhead and protocol framing. No compression was requested. The script does not decompress encoded responses for parsing. Use an uncompressed origin for a complete inventory.

Each page is a cold-cache sum of unique selected URLs. Fetch results are reused during the run, but each page counts its own resources. Initial weight includes HTML, CSS, direct JS, fonts and eager images. Lazy images are inventoried but excluded from initial weight. For img srcset, the script inventories the default and the largest candidate. It also inventories the largest candidate of each picture source. This is conservative across media alternatives. A browser normally chooses one. CSS url assets and CSS imports are included. CSS background images are treated as eager. Unused CSS declarations can overcount assets.

The inventory does not execute JavaScript. Module imports, dynamic requests, SVG use sprites, favicons, iframe content, service workers and browser lazy-load heuristics are outside the inventory. Head CSS is reported without evaluating media queries. Body position is not measured. The first-two-image rule is a document-order proxy for below-fold loading. Transfer sums are not page load times. The five invalid image responses must be replaced before their intended transfer cost can be measured.

HTML checks use server responses. They do not evaluate CSS visibility, computed accessibility or script changes. FAQ comparison normalizes visible HTML whitespace and otherwise compares wording exactly. JSON-LD validation checks syntax and forbidden ratings, review and offer properties. It is not a schema validator or rich-result eligibility test. Internal links mean same-origin anchors. Fragments are removed before fetch. Canonicals and sitemap URLs must equal the supplied origin, which should match configured app_origin.

The screenshot lives in T3 browser artifacts outside the repository. Its long-term retention is not guaranteed. Only the report and scripts are committed.

## 10-line summary

1. All 105 requested SEO checks pass on the local app.
2. Four marketing pages have unique metadata and self-canonicals.
3. Auth pages have noindex in HTML and HTTP headers.
4. Robots, sitemap, anonymous redirects and the 404 check pass.
5. Customer-host robots do not expose the app robots file.
6. All measured initial weights are below 1.5 MB.
7. Five image URLs return HTML and need repair.
8. Two head stylesheets block rendering on each checked page.
9. The image-only reader identifies product, audience and next action.
10. Field data, search volume and production validation remain unavailable.
