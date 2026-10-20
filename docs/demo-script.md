# Investor demo

About seven minutes. Everything shown is the real product: real import, real edits, real publishing, real rollback.

The demo site is [Start Bootstrap Agency](https://github.com/StartBootstrap/startbootstrap-agency), a real MIT-licensed Bootstrap template, zipped exactly as GitHub's "Download ZIP" gives it: source code and the built site side by side.

## Before the meeting

1. `npm ci`, then `scripts/dev-server.sh /tmp/pagehaven-demo` (or the approved staging server).
2. Open Chrome at http://127.0.0.1:5150 in a fresh window at 1280 px or wider. Keep `fixtures/zips/startbootstrap-agency.zip` and `fixtures/images/replacement-banner.jpg` in an easy folder such as the Desktop.
3. Optional dry run: `scripts/smoke.sh http://127.0.0.1:5150 fixtures/zips/startbootstrap-agency.zip` must end with `all good`.

## The story

"Millions of people now get a website from an AI tool or a template. Changing a headline afterwards costs another prompt, credits, or a developer. Pagehaven is the ownership layer: bring the site in, change it like a document, and host it yourself."

## Steps

| # | Do | Say |
|---|---|---|
| 1 | Open Pagehaven. | "This is the whole product. No prompts, no code." |
| 2 | Sign up with a name, email and password. | "Anyone can start." |
| 3 | Click **Import a website** and drop `startbootstrap-agency.zip`. | "This is a template straight from GitHub, source code and all. Pagehaven finds the finished website inside, checks every file, and never runs the code it receives." |
| 4 | Click **Open editor**. The real Agency site appears. | "It is the actual imported site, not a copy of it." |
| 5 | Click the big headline "It's nice to meet you", choose **Edit text**, type a new one, press Enter. | "Saved. Nothing to learn." Point at **Saved** in the top bar. |
| 6 | Click the subheading over the hero photo and choose **Change banner photo**, then pick `replacement-banner.jpg`. | "The photo behind the headline is part of the site's design code. Pagehaven still lets you change it." |
| 7 | Click **Tell me more**, choose **Link**, pick **Part of this page** and choose the Contact section, save. | "Buttons go wherever you want. Dangerous links are refused." |
| 8 | Click the phone icon. | "Check the phone layout before publishing." Switch back to the computer icon. |
| 9 | Click **Publish**, look at the list of changes, click **Publish** in the review. | "You see exactly what goes out. Each publish is a saved version." |
| 10 | Click **View website**. It opens in a new tab. | "That is a real hosted website, served by Pagehaven." |
| 11 | Go back to the editor tab. | |
| 12 | Replace one of the "Lorem ipsum" paragraphs under Services with real text, then **Publish** again. Refresh the website tab. | "Placeholder text from a template, fixed in seconds. Updates are published right away." |
| 13 | Open **Version history**, choose **Publish again** on version 1 and confirm **Publish version 1**. Refresh the website tab. | "Made a mistake? Any earlier version is one click away." |

## If asked

- **Tailwind sites.** Import `fixtures/zips/landwind.zip`, a real Tailwind CSS template. AI tools such as Lovable and v0 export Tailwind sites like this one.
- **Custom domains.** Open **Website settings** and add `www.example-studio.com`. Pagehaven shows the exact DNS records to create. Verification needs real DNS, so it stays pending in the demo.
- **Security.** Uploaded sites run on a separate domain from the app, so their scripts never see your Pagehaven login. ZIPs are checked for path tricks, bombs, hidden server code and secrets. See `docs/threat-model.md`.
- **What it can't do.** It edits the HTML a site ships. Content that a site's JavaScript builds in the browser is shown but not editable, and Pagehaven never compiles source code. See the README.

## Recovery

- A tab shows "Changed in another tab": reload the page. The change just attempted in that tab is not kept.
- Anything stuck: `scripts/dev-server.sh /tmp/pagehaven-demo` restarts the server. Data stays in that folder.
