//! Operator commands, run with `rotulo-cli task <name> key:value`.

use async_trait::async_trait;
use loco_rs::{
    app::AppContext,
    task::{Task, TaskInfo, Vars},
    Result,
};

use crate::db;

/// Suspends a website after an abuse report, keeping its releases.
pub struct Unpublish;

#[async_trait]
impl Task for Unpublish {
    fn task(&self) -> TaskInfo {
        TaskInfo {
            name: "unpublish".to_owned(),
            detail: "Take a website offline: unpublish slug:<web address>".to_owned(),
        }
    }

    async fn run(&self, ctx: &AppContext, vars: &Vars) -> Result<()> {
        let slug = vars.cli_arg("slug")?;
        let changed = db::exec(
            &ctx.db,
            "UPDATE projects SET live_release_id = NULL, suspended_at = ? WHERE slug = ?",
            [db::now().into(), slug.into()],
        )
        .await
        .map_err(|e| loco_rs::Error::string(&e.to_string()))?;
        if changed == 0 {
            return Err(loco_rs::Error::string(&format!(
                "no website with the address {slug}"
            )));
        }
        println!("{slug} is offline. Its custom domains stop serving too.");
        Ok(())
    }
}

/// Allows an owner to publish again without restoring a live release.
pub struct Reinstate;

#[async_trait]
impl Task for Reinstate {
    fn task(&self) -> TaskInfo {
        TaskInfo {
            name: "reinstate".to_owned(),
            detail: "Lift a website suspension: reinstate slug:<web address>".to_owned(),
        }
    }

    async fn run(&self, ctx: &AppContext, vars: &Vars) -> Result<()> {
        let slug = vars.cli_arg("slug")?;
        let changed = db::exec(
            &ctx.db,
            "UPDATE projects SET suspended_at = NULL WHERE slug = ?",
            [slug.into()],
        )
        .await
        .map_err(|e| loco_rs::Error::string(&e.to_string()))?;
        if changed == 0 {
            return Err(loco_rs::Error::string(&format!(
                "no website with the address {slug}"
            )));
        }
        println!("{slug} is reinstated. Its owner can publish again.");
        Ok(())
    }
}

/// Reports account activation using events and surviving historical rows.
pub struct Funnel;

#[async_trait]
impl Task for Funnel {
    fn task(&self) -> TaskInfo {
        TaskInfo {
            name: "funnel".into(),
            detail: "Account funnel: funnel since:YYYY-MM-DD (UTC signup cohort)".into(),
        }
    }
    async fn run(&self, ctx: &AppContext, vars: &Vars) -> Result<()> {
        let since = vars
            .cli
            .get("since")
            .map(|s| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp())
                    .map_err(|_| loco_rs::Error::string("since must be YYYY-MM-DD"))
            })
            .transpose()?;
        println!(
            "{}",
            funnel_report(&ctx.db, since)
                .await
                .map_err(|e| loco_rs::Error::string(&e.to_string()))?
        );
        Ok(())
    }
}

#[derive(Default, Debug, PartialEq)]
struct Stage {
    times: Vec<i64>,
    events: usize,
    backfill: usize,
}

fn median(times: &mut [i64]) -> String {
    if times.is_empty() {
        return "—".into();
    }
    times.sort_unstable();
    let middle = times.len() / 2;
    let seconds = if times.len().is_multiple_of(2) {
        times[middle - 1] as f64 / 2.0 + times[middle] as f64 / 2.0
    } else {
        times[middle] as f64
    };
    format!("{seconds:.1}s")
}

fn percent(n: usize, denominator: usize) -> String {
    if denominator == 0 {
        "—".into()
    } else {
        format!("{:.1}%", 100.0 * n as f64 / denominator as f64)
    }
}

pub async fn funnel_report(
    conn: &sea_orm::DatabaseConnection,
    since: Option<i64>,
) -> std::result::Result<String, sea_orm::DbErr> {
    // Historical rows and events share one timeline. Prefer events on a timestamp tie.
    let rows = db::all(conn, "WITH milestones AS (
        SELECT user_id, kind, created_at AS ts, 0 AS backfill FROM events
        UNION ALL SELECT id, 'signup', created_at, 1 FROM users
        UNION ALL SELECT p.user_id, 'import_ok', i.created_at, 1 FROM imports i JOIN projects p ON p.id = i.project_id
        UNION ALL SELECT user_id, 'first_edit', created_at, 1 FROM edits
        UNION ALL SELECT user_id, 'publish', created_at, 1 FROM releases
        UNION ALL SELECT user_id, 'returned', created_at, 1 FROM sessions
    ), signups AS (
        SELECT user_id, MIN(ts) AS signup FROM milestones WHERE kind = 'signup' AND user_id IS NOT NULL GROUP BY user_id
    )
    SELECT s.user_id, s.signup, m.kind, m.ts, m.backfill FROM signups s JOIN milestones m ON m.user_id = s.user_id
    WHERE (? IS NULL OR s.signup >= ?) ORDER BY s.user_id, m.ts, m.backfill", [since.into(), since.into()]).await?;
    type Timeline = (i64, Vec<(String, i64, bool)>);
    let mut accounts = std::collections::BTreeMap::<i64, Timeline>::new();
    for row in rows {
        let id = row.try_get("", "user_id")?;
        let signup = row.try_get("", "signup")?;
        accounts
            .entry(id)
            .or_insert_with(|| (signup, Vec::new()))
            .1
            .push((
                row.try_get("", "kind")?,
                row.try_get("", "ts")?,
                row.try_get::<i64>("", "backfill")? != 0,
            ));
    }
    let mut stages: [Stage; 5] = std::array::from_fn(|_| Stage::default());
    for (signup, timeline) in accounts.values() {
        let mut previous = *signup;
        for (i, kind) in ["signup", "import_ok", "first_edit", "publish", "returned"]
            .iter()
            .enumerate()
        {
            let found = timeline.iter().find(|(k, ts, _)| {
                k == kind && *ts >= previous && (i != 4 || ts / 86400 > previous / 86400)
            });
            let Some((_, ts, backfill)) = found else {
                break;
            };
            stages[i].times.push(ts - signup);
            if *backfill {
                stages[i].backfill += 1;
            } else {
                stages[i].events += 1;
            }
            previous = *ts;
        }
    }
    let mut output = String::from("Signup cohort (UTC); sequential account stages; median elapsed from signup\nStage                         Accounts  Previous  Median       Events  Backfill\n");
    let mut previous = 0;
    for (i, (name, stage)) in [
        "Signups",
        "Successful import",
        "First edit",
        "Publish",
        "Returned after publish",
    ]
    .iter()
    .zip(stages.iter_mut())
    .enumerate()
    {
        let count = stage.times.len();
        let conversion = if i == 0 {
            "—".into()
        } else {
            percent(count, previous)
        };
        output.push_str(&format!(
            "{name:<29} {count:>8} {conversion:>9} {:>12} {:>7} {:>9}\n",
            median(&mut stage.times),
            stage.events,
            stage.backfill
        ));
        previous = count;
    }
    let outcomes = db::all(conn, "SELECT e.kind, e.detail, COUNT(*) AS n FROM events e WHERE e.kind IN ('import_ok','import_failed') AND (? IS NULL OR e.user_id IN (SELECT user_id FROM (SELECT id AS user_id, created_at FROM users UNION ALL SELECT user_id, created_at FROM events WHERE kind = 'signup') GROUP BY user_id HAVING MIN(created_at) >= ?)) GROUP BY e.kind, e.detail ORDER BY e.kind, e.detail", [since.into(), since.into()]).await?;
    let mut ok = 0usize;
    let mut failed = 0usize;
    let mut reasons = String::new();
    for row in outcomes {
        let n = row.try_get::<i64>("", "n")? as usize;
        if row.try_get::<String>("", "kind")? == "import_ok" {
            ok += n;
        } else {
            failed += n;
            reasons.push_str(&format!(
                "  {}: {n}\n",
                row.try_get::<Option<String>>("", "detail")?
                    .as_deref()
                    .unwrap_or("other")
            ));
        }
    }
    output.push_str(&format!("\nImport success rate (events only): {} ({ok} / {}; {failed} failed)\nFailure reasons (events only):\n{}", percent(ok, ok + failed), ok + failed, if reasons.is_empty() { "  none recorded\n" } else { &reasons }));
    output.push_str("Backfill: surviving users/imports/edits/releases; return backfill uses surviving sign-in sessions and undercounts. Deleted historical websites undercount. Event milestones survive website deletion. Import rate excludes historical successes because historical failures are unknown.\nVisitors are not measured: no visitor or page-view events.\nPaid conversion is not measured: billing does not exist.\n");
    Ok(output)
}

#[cfg(test)]
mod funnel_tests {
    use super::*;
    use migration::MigratorTrait;

    #[tokio::test]
    async fn historical_tables_fill_missing_events() {
        let conn = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        migration::Migrator::up(&conn, None).await.unwrap();
        for sql in [
            "INSERT INTO users VALUES (1, 'u', 'u@example.com', 'Tester', '', 86400)",
            "INSERT INTO projects (id,pid,user_id,name,slug,created_at,updated_at) VALUES (1,'p',1,'Site','site',86410,86410)",
            "INSERT INTO imports VALUES (1,1,'private.zip','sha',1,1,1,'','{}',86410)",
            "INSERT INTO edits (project_id,revision,kind,summary_json,state,user_id,created_at) VALUES (1,1,'text','{}','undone',1,86420)",
            "INSERT INTO releases (project_id,number,draft_revision,file_count,content_bytes,user_id,created_at) VALUES (1,1,1,1,1,1,86430)",
            "INSERT INTO sessions VALUES ('token',1,172800,999999)",
            "INSERT INTO events (user_id,project_id,kind,created_at) VALUES (1,1,'import_ok',86410)",
        ] { db::exec(&conn, sql, []).await.unwrap(); }
        let report = funnel_report(&conn, None).await.unwrap();
        let lines: Vec<Vec<&str>> = report
            .lines()
            .skip(2)
            .take(5)
            .map(|line| line.split_whitespace().collect())
            .collect();
        assert_eq!(&lines[0], &["Signups", "1", "—", "0.0s", "0", "1"]);
        assert_eq!(
            &lines[1],
            &["Successful", "import", "1", "100.0%", "10.0s", "1", "0"]
        );
        assert_eq!(
            &lines[2],
            &["First", "edit", "1", "100.0%", "20.0s", "0", "1"]
        );
        assert_eq!(&lines[3], &["Publish", "1", "100.0%", "30.0s", "0", "1"]);
        assert_eq!(
            &lines[4],
            &["Returned", "after", "publish", "1", "100.0%", "86400.0s", "0", "1"]
        );
    }

    #[tokio::test]
    async fn aggregates_events_and_backfill_without_double_counting() {
        let conn = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        migration::Migrator::up(&conn, None).await.unwrap();
        for (id, signup) in [(1i64, 86400i64), (2, 86410), (3, 86420)] {
            db::exec(&conn, "INSERT INTO users (id,pid,email,name,password_hash,created_at) VALUES (?, ?, ?, 'Tester', '', ?)", [id.into(), id.to_string().into(), format!("{id}@example.com").into(), signup.into()]).await.unwrap();
        }
        for (user, kind, ts) in [
            (1i64, "signup", 86400i64),
            (1, "import_ok", 86410),
            (1, "first_edit", 86420),
            (1, "publish", 86430),
            (1, "returned", 86440),
            (1, "returned", 172800),
            (2, "import_ok", 86430),
            (2, "first_edit", 86450),
            (3, "publish", 86460),
            (3, "import_failed", 86470),
        ] {
            db::exec(
                &conn,
                "INSERT INTO events (user_id, kind, created_at, detail) VALUES (?, ?, ?, ?)",
                [
                    user.into(),
                    kind.into(),
                    ts.into(),
                    (kind == "import_failed").then_some("source_only").into(),
                ],
            )
            .await
            .unwrap();
        }
        let report = funnel_report(&conn, None).await.unwrap();
        let lines: Vec<Vec<&str>> = report
            .lines()
            .skip(2)
            .take(5)
            .map(|line| line.split_whitespace().collect())
            .collect();
        assert_eq!(&lines[0], &["Signups", "3", "—", "0.0s", "1", "2"]);
        assert_eq!(
            &lines[1],
            &["Successful", "import", "2", "66.7%", "15.0s", "2", "0"]
        );
        assert_eq!(
            &lines[2],
            &["First", "edit", "2", "100.0%", "30.0s", "2", "0"]
        );
        assert_eq!(&lines[3], &["Publish", "1", "50.0%", "30.0s", "1", "0"]);
        assert_eq!(
            &lines[4],
            &["Returned", "after", "publish", "1", "100.0%", "86400.0s", "1", "0"]
        );
        assert!(report.contains("66.7% (2 / 3; 1 failed)"));
        assert!(report.contains("source_only: 1"));
        let cohort = funnel_report(&conn, Some(86420)).await.unwrap();
        assert!(cohort.contains("0.0% (0 / 1; 1 failed)"));
        assert!(cohort.lines().nth(2).unwrap().contains("1"));
    }
}
