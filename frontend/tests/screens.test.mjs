import assert from "node:assert/strict";
import { test } from "node:test";

import { confirmsName, deleteOutcome, deleteRequest, fieldMessage } from "../../assets/static/js/app.js";
import { outcome, precheck, summary } from "../../assets/static/js/import.js";

const MB = 1024 * 1024;
const SOURCE_ONLY = "This ZIP contains source code rather than a finished website. Export the built static website files and try again.";

test("delete sends the typed name as JSON with the session cookie", () => {
  const init = deleteRequest("Harbor Bakery");
  assert.equal(init.method, "DELETE");
  assert.equal(init.credentials, "same-origin");
  assert.equal(init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), { confirm_name: "Harbor Bakery" });
});

test("delete answers map to what the dialog does", () => {
  assert.deepEqual(deleteOutcome(204, null), { kind: "deleted" });
  assert.deepEqual(deleteOutcome(401, null), { kind: "signed_out" });
  assert.deepEqual(
    deleteOutcome(422, { error: "invalid", message: "Type the website's current name to delete it." }),
    { kind: "refused", message: "Type the website's current name to delete it." },
  );
  assert.equal(deleteOutcome(404, { error: "not_found", message: "x" }).kind, "failed");
  assert.equal(deleteOutcome(429, { error: "rate_limited", message: "Slow down." }).message, "Slow down.");
  assert.equal(deleteOutcome(500, "<html>").kind, "failed");
});

test("the typed name must match exactly, like the server checks it", () => {
  assert.equal(confirmsName("Agency", "Agency"), true);
  assert.equal(confirmsName("agency", "Agency"), false);
  assert.equal(confirmsName("Agency ", "Agency"), false);
});

test("sign-in and sign-up fields explain what to fix", () => {
  const ok = { valueMissing: false, typeMismatch: false };
  assert.equal(fieldMessage({ ...ok, valueMissing: true }, { type: "text", value: "", minLength: -1, label: "Your name" }), "Enter your name.");
  assert.equal(fieldMessage({ ...ok, typeMismatch: true }, { type: "email", value: "dana@", minLength: -1, label: "Email" }), "Enter an email address like name@example.com.");
  assert.equal(fieldMessage(ok, { type: "password", value: "short", minLength: 10, label: "Password" }), "Use at least 10 characters.");
  assert.equal(fieldMessage(ok, { type: "password", value: "long enough!", minLength: 10, label: "Password" }), null);
});

test("files are checked before uploading", () => {
  assert.match(precheck({ name: "notes.txt", size: 10 }, 25 * MB), /isn't a ZIP file/);
  assert.match(precheck({ name: "site.zip", size: 0 }, 25 * MB), /empty/);
  assert.match(precheck({ name: "site.zip", size: 30 * MB }, 25 * MB), /30\.0 MB.*25 MB/);
  assert.equal(precheck({ name: "Site.ZIP", size: MB }, 25 * MB), null);
});

test("the source-only import message is shown word for word, with the export help open", () => {
  const result = outcome(422, { error: "invalid_archive", message: SOURCE_ONLY });
  assert.equal(result.kind, "error");
  assert.equal(result.message, SOURCE_ONLY);
  assert.equal(result.help, true);
});

test("import answers map to the next step", () => {
  assert.deepEqual(outcome(401, null), { kind: "signed_out" });
  assert.deepEqual(outcome(422, { error: "choose_folder", message: "Choose", folders: ["dist", "build"] }),
    { kind: "folders", folders: ["dist", "build"], message: "Choose" });
  const limit = outcome(403, { error: "project_limit", message: "You can have up to 25 websites." });
  assert.match(limit.message, /More menu and choose Delete website/);
  assert.equal(outcome(500, "oops").title, "We couldn't import this file");
  const done = outcome(201, {
    project: { pid: "p1", name: "Agency" }, editor_url: "/projects/p1", thumbnail_url: null,
    report: { pages: ["index.html"], skipped: [], missing: [], warnings: [] },
  });
  assert.equal(done.kind, "done");
  assert.equal(outcome(201, { project: { pid: "p1", name: "Agency" }, editor_url: "//evil.example" }).kind, "error");
});

test("the result sentence says what was left out without sounding like data loss", () => {
  const report = { pages: ["index.html"], skipped: [], missing: [], warnings: [] };
  assert.equal(summary(report), "1 page imported and ready to edit.");
  const skipped = { ...report, pages: ["index.html", "about.html"], skipped: [{ path: "a", reason: "source" }, { path: "b", reason: "system_junk" }] };
  assert.equal(summary(skipped), "2 pages imported and ready to edit. We left out 2 files your website doesn't need.");
});
