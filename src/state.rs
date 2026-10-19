//! Process-wide Pagehaven state: settings, file store, and the bounds on expensive work.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use loco_rs::app::AppContext;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::{error::ApiError, settings::Settings, store::Store};

pub struct Pagehaven {
    pub settings: Settings,
    pub store: Store,
    jobs: Arc<Semaphore>,
    limits: Mutex<HashMap<(&'static str, String), (Instant, u32)>>,
    project_locks: Mutex<HashMap<i64, Arc<tokio::sync::Mutex<()>>>>,
}

/// How often one key may do one thing.
#[derive(Debug, Clone, Copy)]
pub struct Rate {
    pub name: &'static str,
    pub max: u32,
    pub per: Duration,
}

pub const SIGN_IN: Rate = Rate { name: "sign_in", max: 10, per: Duration::from_secs(15 * 60) };
pub const REGISTER: Rate = Rate { name: "register", max: 10, per: Duration::from_secs(60 * 60) };
pub const IMPORT: Rate = Rate { name: "import", max: 20, per: Duration::from_secs(60 * 60) };
pub const UPLOAD: Rate = Rate { name: "upload", max: 120, per: Duration::from_secs(60 * 60) };
pub const PUBLISH: Rate = Rate { name: "publish", max: 60, per: Duration::from_secs(60 * 60) };
pub const EDIT: Rate = Rate { name: "edit", max: 3000, per: Duration::from_secs(60 * 60) };
pub const DNS_CHECK: Rate = Rate { name: "dns_check", max: 30, per: Duration::from_secs(60 * 60) };

impl Pagehaven {
    pub fn new(settings: Settings) -> std::io::Result<Self> {
        let store = Store::open(&settings.data_dir)?;
        Ok(Self {
            jobs: Arc::new(Semaphore::new(settings.limits.concurrent_jobs.max(1))),
            settings,
            store,
            limits: Mutex::new(HashMap::new()),
            project_locks: Mutex::new(HashMap::new()),
        })
    }

    pub fn from(ctx: &AppContext) -> Arc<Self> {
        ctx.shared_store.get::<Arc<Self>>().expect("Pagehaven state is initialized in after_context")
    }

    /// Waits briefly for a slot for an import or publish, so a burst cannot exhaust the server.
    pub async fn job_slot(&self) -> Result<OwnedSemaphorePermit, ApiError> {
        tokio::time::timeout(Duration::from_secs(20), self.jobs.clone().acquire_owned())
            .await
            .map_err(|_| ApiError::Busy)?
            .map_err(|_| ApiError::Busy)
    }

    /// Fixed-window counter. Returns an error once `key` used up `rate` in the current window.
    pub fn limit(&self, rate: Rate, key: &str) -> Result<(), ApiError> {
        let mut limits = self.limits.lock().expect("rate limits lock");
        let now = Instant::now();
        if limits.len() > 50_000 {
            limits.retain(|(name, _), (start, _)| now.duration_since(*start) < rate_window(name));
        }
        let entry = limits.entry((rate.name, key.to_owned())).or_insert((now, 0));
        if now.duration_since(entry.0) >= rate.per {
            *entry = (now, 0);
        }
        if entry.1 >= rate.max {
            return Err(ApiError::RateLimited);
        }
        entry.1 += 1;
        Ok(())
    }

    /// Serializes draft changes and publishes of one project within this process.
    pub fn project_lock(&self, project_id: i64) -> Arc<tokio::sync::Mutex<()>> {
        self.project_locks.lock().expect("project locks lock").entry(project_id).or_default().clone()
    }
}

fn rate_window(name: &str) -> Duration {
    [SIGN_IN, REGISTER, IMPORT, UPLOAD, PUBLISH, EDIT, DNS_CHECK]
        .iter()
        .find(|rate| rate.name == name)
        .map_or(Duration::from_secs(3600), |rate| rate.per)
}
