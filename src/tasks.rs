//! Operator commands, run with `pagehaven-cli task <name> key:value`.

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
