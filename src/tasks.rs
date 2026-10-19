//! Operator commands, run with `pagehaven-cli task <name> key:value`.

use async_trait::async_trait;
use loco_rs::{
    app::AppContext,
    task::{Task, TaskInfo, Vars},
    Result,
};

use crate::db;

/// Takes a published website offline, for example after an abuse report. Its releases are kept,
/// so the owner can publish again once the problem is resolved.
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
            "UPDATE projects SET live_release_id = NULL WHERE slug = ?",
            [slug.into()],
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
