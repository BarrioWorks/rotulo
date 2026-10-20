# Redesign decisions

Recorded so reviewers can check what was chosen, by whom, and why.

| Decision | Who | Why |
|---|---|---|
| Direction "Proof" over "Spot Ink" and "Shopfront" | Lead, from Creative Direction's recommendation | Its cyan selection is the only one of the three that keeps 3:1 contrast on both white pages (3.89) and dark photos (3.64); the interface has no color of its own, so the imported site stays dominant. Impeccable's concept-seed roll suggested Spot Ink; the lead overrode it on these measurements. |
| Schibsted Grotesk for interface text, Newsreader for display titles outside the editor | Owner approved (2026-10-19) after a rendered head-to-head with Inter | Schibsted reads warmer and more distinctive than Inter at 11 to 15 px; Newsreader gives the dashboard, import, sign-in and landing an editorial voice. Both SIL OFL 1.1, self-hosted. |
| Lucide icons vendored into the sprite | Owner approved (2026-10-19) | One family on a 24 grid with round joins; ISC license (Feather-derived glyphs MIT); no runtime dependency. |
| Site laid out at 1280 px and scaled to fit | Lead | Bootstrap and Tailwind sites otherwise show their tablet menus at a 1280 px window. |
| Edit panels in the left rail, no drawer | Lead | Scaling removes the drawer's only advantage; the canvas keeps its full width. |
| No drag-to-reorder, no reuse of existing images, no tablet view | Lead | Each needs server work outside a visual redesign. |
| Text editing starts only from the app | Security review | Imported site scripts share the preview origin with the editor agent; only the app may start an editing session. |
