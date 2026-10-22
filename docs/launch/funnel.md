# Rótulo funnel reference

Rótulo records first-party account milestones. It does not measure visitor conversion or paid conversion.

## Commands

The Loco task is `funnel`. Run `cargo loco task funnel` or `cargo run --bin rotulo-cli -- task funnel`.

The optional signup cohort starts at midnight UTC, inclusively. The CLI accepts `since=2026-10-20` and Loco's colon-separated task arguments: `cargo loco task funnel since:2026-10-20`, or `cargo run --bin rotulo-cli -- task funnel since:2026-10-20`. `DATABASE_URL` selects the SQLite database. Apply migrations with `cargo run --bin rotulo-cli -- db migrate` before reporting an existing database.

The task prints account counts, conversion from the preceding row, median elapsed seconds from signup, and source counts. An empty denominator or median prints `—`. An even-sized median averages the two middle elapsed times. The first row has no preceding-stage conversion.

## Stages

The report follows accounts through signup, successful import, first edit, publish, and return after publication. Each account counts once per row. A stage requires every preceding stage. Its timestamp is the earliest qualifying timestamp at or after the preceding stage, across all that account's projects. Return requires a strictly later UTC calendar day than publication. A return means an authenticated request, not necessarily another edit or a new session.

The `since` filter selects accounts by signup time. It does not discard later activity from that cohort. The import success rate uses outcome events for the same cohort, including repeated attempts. It is `import_ok / (import_ok + import_failed)`. Historical import successes do not enter this rate because historical failures are unknown.

## Events

All writes pass through `src/events.rs::record`. Database errors produce a warning and do not fail the request. Event storage is best effort, so missing events remain possible.

- `signup` records a newly created account after registration succeeds, even if subsequent session creation fails.
- `signin` records successful credential authentication, even if subsequent session creation fails. Invalid credentials do not produce events.
- `import_ok` records one completed import after its transaction commits, with its project ID.
- `import_failed` records one unsuccessful authenticated import handled by the import handler, with a reason category. A folder-selection response counts as `choose_folder`; a subsequent retry is another attempt. Rejections before handler extraction, including unauthenticated requests and malformed multipart headers, cannot be counted.
- `first_edit` records the first saved edit row for each project. The shared change-response path covers element edits, page operations, and restoration that creates an edit row. Undo does not create an edit row. Settings and image uploads alone do not count. A unique partial index prevents duplicates.
- `publish` records each successful draft publication or activation of an existing release. A repeated successful publication can produce another event; the account funnel still counts the account once.
- `returned` records authenticated page and API activity at most once per user per UTC day. The shared authentication extractor covers public pages with an authenticated cookie as well as protected routes. A per-process cache avoids repeated writes during that day. A unique database index protects against multiple processes and cache resets. This event also occurs during a user's first day; only later-day activity qualifies for the return stage.

Failure categories come from `ImportError` in one mapping function. `SourceOnly` maps to `source_only`; `NoWebsite` and `Empty` to `no_website`; limits to `too_large`; invalid, unsafe, special-file, encrypted, and unsupported-compression archives to `invalid_zip`. Folder selection maps to `choose_folder`. Missing references, excessive HTML nesting, and storage errors map to `other`. Handler rejections use `too_large` or `other`. Requests refused by the import rate limit record no event at all, so a flood of refused attempts cannot grow the table. Limit errors include file-count, expansion, depth, and size limits; `too_large` covers all archive resource limits.

## Historical sources and limits

The task merges events with surviving historical rows. `users.created_at` supplies signup, `imports` joined through `projects.user_id` supplies imports, `edits.user_id` supplies edits, and `releases.user_id` supplies publications. Surviving `sessions.created_at` supplies a lower-bound return estimate for sign-ins on later UTC days. Existing-cookie returns before instrumentation are unknown. Sessions disappear on sign-out or expiry cleanup.

Each milestone uses the earliest qualifying timestamp and prefers an event on a timestamp tie. The report labels the selected source as Events or Backfill; it never adds the same milestone twice. Backfill also fills gaps from failed event writes. Deleting a website removes its old imports, edits, and releases, so historical backfill undercounts. Events survive website deletion.

Visitors are not measured because no visitor, landing-view, or referrer event exists. There is no visitor-to-signup denominator. Paid conversion is not measured because Rótulo has no billing. A return is not proof of editing, retention over a fixed period, or a separate browser session. The task does not claim conversion improvements.

## Storage and privacy

The new migration adds `events(id INTEGER PRIMARY KEY, user_id INTEGER NULL, project_id INTEGER NULL, kind TEXT NOT NULL, detail TEXT NULL, created_at INTEGER NOT NULL)`. Timestamps are Unix seconds. `detail` is limited to 40 characters. Indexes cover `(kind, created_at)` and `user_id`, plus unique partial indexes for first edit per project and return per user and UTC day.

Only internal numeric account and project IDs, event kinds, fixed reason categories, and timestamps are stored. Events never store IP addresses, emails, user agents, file names, file contents, paths, or referrers. There are no third-party tracking requests, cookies, dependencies, or services. Existing authentication cookies remain the source of identity. The in-memory return cache contains today's account IDs and clears at the next UTC day it observes.

Events have no cascading foreign keys, so website deletion preserves account funnel history. No automatic event retention or account-erasure policy is introduced by this change. Operators must include events when implementing those policies.
