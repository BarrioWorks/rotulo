# Launch redesign

The brief is `brief.md`. The plan and its definition of done are in `PLAN.md`, and the rules every builder followed are in `decisions.md`, including the owner's round 2 directives. No participants took part in any test. Every result comes from agents walking the running app, labelled measured, observed, read or inferred where it appears.

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Research summary with sources | `research/README.md` (15 principles from NN/g, Apple, Baymard, WCAG and web.dev; competitors; interaction ideas), `audit/README.md` (the running app before this round), `seo/README.md` |
| 2 | Visual identity | `decisions.md` items 6 to 10 and 19 to 21, `research/directions/` (three concept boards), `DESIGN.md`, `assets/static/css/app.css` and `marketing.css` |
| 3 | Marketing redesign | `/` (`assets/views/home.html`), `/compatible-exports`, `/visual-html-editor`, `/static-website-hosting`; each claim checked against the code in `home/claims.md` |
| 4 | Product redesign | Sign up and sign in, the dashboard and import (`assets/views/auth`, `projects`, `partials`), the editor's first-edit tip, publish review and "is live" sheet (`frontend/editor`) |
| 5 | Before and after screenshots | `verification.md` section 9 pairs `audit/screens/` (before) with `final/screens/` (after) at 1280, 834 and 390 |
| 6 | Usability assessment | `verification.md` sections 1, 2 and 7; `critique/a.md` and `critique/b.md` (two models, independently) |
| 7 | Conversion instrumentation | `funnel.md`: first-party events and `cargo loco task funnel` |
| 8 | Verification | `verification.md` (journeys, keyboard, accessibility, editor measurements), `seo-perf.md` (`scripts/launch/seo-check.py`, `scripts/launch/page-weight.py`, the five-second test), `security-review.md` |

## Results against the plan

1. **Purpose in five seconds.** Partly checked. A reader with no context saw only the 1280 hero and said "Rótulo lets you visually edit and publish an AI-made website", who it is for, and to import (`seo-perf.md`). The reader was an agent, the exposure was not timed, and 834 and 390 were not tested this way.
2. **One primary action, no invented claims.** `home/claims.md` checks each claim against the code. There are no prices, testimonials or counts, and custom domains are not promised.
3. **Import first.** Sign-up lands on import. The source-only ZIP is refused in the browser before upload with the exact text. A clean import opens the editor directly. The named progress stages exist in `frontend/import.ts`, but the import finished too fast to capture them on the running app.
4. **First edit without instructions.** A centred tip shows what can be edited. All twelve journeys completed and landed on the live site at 1280 on Furnace Hill. Journeys 3 to 10 also completed at 834 and 390. Landwind covered import, heading, image, link and publish, not all twelve. Landing to the first live site counted 12 actions under the baseline rule, down from 14. The walk itself took 13, because replacing a whole heading needed Ctrl+A after the second click (measured, `verification.md` section 1).
5. **SEO.** `seo-check.py` passes 105 of 105 checks.
6. **Funnel.** Signup, import, first edit and publish are measured from first-party events. "Returned" means authenticated activity on a later UTC day, not a separate session. Writes are best effort, and history before the events table is backfilled and undercounts. Events keep account and website ids with no expiry and outlive website deletion, so a retention rule is an owner decision. Visitors and paid conversion are not measured: there is no visitor tracking and no billing (`funnel.md`).
7. **Nothing weaker.** `scripts/check.sh` exits 0, smoke passes on four fixtures, and the security review's Medium and Low findings are fixed. The one regression it found, a frame message that could start a text session, is removed at the root and covered by a test that fails on the old code. That review stopped at commit `c94aec9`. A second review of everything after it is `security-rereview.md`. Its one Low finding, a forged message steering the owner's next key press, is fixed in `4b88a60`: messages from the site can no longer move focus, and editing starts only from Enter, Edit text, or typing on the canvas.
8. **Screenshots.** 73 after screenshots in `final/screens/`, taken at commit `66e03d1`. They predate the small fixes in `ef9e4cb`: the phone "is live" buttons still show at 36 px, and the homepage step 1 caption still says "type over it".

## Fixed after the final walk

- The homepage no longer says "type over it". The second click places the caret where you clicked.
- The footer's "How it works" link points to the demo section.
- The "is live" sheet's buttons are 44 px on touch and narrow screens.
- Five screenshots that three pages still used had been deleted by the homepage rebuild. They are restored, and `scripts/design/check_static_refs.py` now fails the gate on any missing static file.

## Open, in order of user impact

1. A replaced photo keeps its old description, the page's social image (`og:image`) and the dashboard thumbnail. The owner is reminded about the description only.
2. At 1280, the publish review and the "is live" sheet cover the selected heading.
3. The first-edit tip can sit over text until the first selection.
4. Escape from version history closes the whole review. The link-change row in the review cannot be clicked.
5. Generated addresses carry counters such as `-16`.
6. The page switcher still truncates the site name at 834 and 390.

## Owner calls

- **Price.** The page says "Free to try. There is no billing in Rótulo yet." Replace it once prices exist.
- **Custom domains.** They are off in production by default, so the site does not promise them.
- **Password reset.** It does not exist, and the site says so. Building it needs outgoing email.
- **Import before sign-up.** Not built. The audit estimates 11 to 17 days and a phishing risk on Rótulo's own domain.
- **Funnel event retention.** Events keep account and website ids with no expiry. Choose a period, and a small scheduled delete can enforce it (`security-rereview.md` finding 2).
