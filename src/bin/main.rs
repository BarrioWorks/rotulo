use loco_rs::cli;
use migration::Migrator;
use pagehaven::app::App;

#[tokio::main]
async fn main() -> loco_rs::Result<()> {
    // Loco parses task variables as key:value; accept the funnel's documented key=value too.
    let mut args: Vec<_> = std::env::args_os().skip(1).collect();
    let funnel = args
        .windows(2)
        .position(|pair| (pair[0] == "task" || pair[0] == "t") && pair[1] == "funnel");
    let mut changed = false;
    if let Some(index) = funnel {
        for arg in args.iter_mut().skip(index + 2) {
            if let Some(date) = arg.to_str().and_then(|s| s.strip_prefix("since=")) {
                *arg = format!("since:{date}").into();
                changed = true;
            }
        }
    }
    if changed {
        let executable = std::env::current_exe()?;
        let status = std::process::Command::new(executable).args(args).status()?;
        if !status.success() {
            return Err(loco_rs::Error::string("funnel task failed"));
        }
        return Ok(());
    }
    cli::main::<App, Migrator>().await
}
