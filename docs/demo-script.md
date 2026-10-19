# Investor demo

About seven minutes. Everything shown is the real product: real import, real edits, real publishing, real rollback.

## Before the meeting

1. `npm ci`, then `scripts/dev-server.sh /tmp/pagehaven-demo` (or the approved staging server).
2. Open Chrome at http://127.0.0.1:5150 in a fresh window. Keep `fixtures/zips/harbor-bakery.zip` and `fixtures/images/replacement-hero.jpg` in an easy folder such as the Desktop.
3. Optional dry run: `scripts/smoke.sh` must end with `all good`.

## The story

"Millions of people now get a website from an AI tool. Changing a headline afterwards costs another prompt, credits, or a developer. Pagehaven is the ownership layer: bring the site in, change it like a document, and host it yourself."

## Steps

| # | Do | Say |
|---|---|---|
| 1 | Open Pagehaven. | "This is the whole product. No prompts, no code." |
| 2 | Sign up with a name, email and password. | "Anyone can start." |
| 3 | Click **Import website** and drop `harbor-bakery.zip`. | "This is the ZIP a tool like Lovable or v0 exports. Pagehaven checks every file. It never runs the code it receives." |
| 4 | Click **Open editor**. The real bakery website appears. | "It is the actual imported site, not a template." |
| 5 | Click the big headline, **Edit text**, select it, type a new one, press Enter. | "Saved. Nothing to learn." Point at **Saved** and **Undo**. |
| 6 | Click the hero photo, **Replace image**, choose `replacement-hero.jpg`. | "Same size, same layout, new picture." |
| 7 | Click **See today's menu**, **Link**, choose the Visit us page or type a web address, save. | "Buttons go wherever you want. Dangerous links are refused." |
| 8 | Click the phone icon. | "Check the mobile layout before going live." Switch back to the computer icon. |
| 9 | Click **Publish**. | "One click. Each publish is a saved version." |
| 10 | Click the live address in the Publishing panel. It opens in a new tab. | "That is a real hosted website, served by Pagehaven." |
| 11 | Go back to the editor tab. | |
| 12 | Change a paragraph or a button colour, then **Publish** again. Refresh the live tab. | "Updates are live in seconds." |
| 13 | In **Version history**, choose **Make live** on version 1 and confirm. Refresh the live tab. | "Made a mistake? Any earlier version is one click away." |

## If asked

- **Custom domains.** In the Publishing panel, type `www.harborbakery.com` and click **Add**. Pagehaven shows the exact DNS records to create. Verification needs real DNS, so it stays pending in the demo.
- **Security.** Uploaded sites run on a separate domain from the app, so their scripts never see your Pagehaven login. ZIPs are checked for path tricks, bombs, hidden server code and secrets. See `docs/threat-model.md`.
- **What it can't do.** It edits the HTML a site ships. Content that a site's JavaScript builds in the browser is shown but not editable, and Pagehaven never compiles source code. See the README.

## Recovery

- A tab shows "This website was changed in another tab": click **Reload**. The change just attempted in that tab is not kept.
- Anything stuck: `scripts/dev-server.sh /tmp/pagehaven-demo` restarts the server. Data stays in that folder.
