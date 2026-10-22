//! Process-wide Rótulo state: settings, file store, and the bounds on expensive work.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use loco_rs::app::AppContext;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use sha2::{Digest, Sha256};

use crate::{error::ApiError, settings::Settings, store::Store};

/// The most rate counters kept in memory at once.
const MAX_COUNTERS: usize = 50_000;

/// Fixed-window request counters per rate and key, with the start of each window. Keys are
/// stored as digests, so a counter costs the same memory however long its key is.
#[derive(Default)]
struct Limiter(HashMap<(&'static str, [u8; 32]), (Instant, u32)>);

impl Limiter {
    fn hit(&mut self, rate: Rate, key: &str, now: Instant) -> Result<(), ApiError> {
        if self.0.len() >= MAX_COUNTERS {
            self.0
                .retain(|(name, _), (start, _)| now.duration_since(*start) < rate_window(name));
        }
        if self.0.len() >= MAX_COUNTERS {
            // A flood of distinct keys: forget the older half rather than grow without bound.
            let mut starts: Vec<Instant> = self.0.values().map(|(start, _)| *start).collect();
            let middle = starts.len() / 2;
            let cutoff = *starts.select_nth_unstable(middle).1;
            self.0.retain(|_, (start, _)| *start > cutoff);
        }
        let entry = self
            .0
            .entry((rate.name, Sha256::digest(key.as_bytes()).into()))
            .or_insert((now, 0));
        if now.duration_since(entry.0) >= rate.per {
            *entry = (now, 0);
        }
        if entry.1 >= rate.max {
            return Err(ApiError::RateLimited);
        }
        entry.1 += 1;
        Ok(())
    }
}

pub struct Rotulo {
    pub settings: Settings,
    pub store: Store,
    jobs: Arc<Semaphore>,
    limits: Mutex<Limiter>,
    project_locks: Mutex<HashMap<i64, Arc<tokio::sync::Mutex<()>>>>,
}

/// How often one key may do one thing.
#[derive(Debug, Clone, Copy)]
pub struct Rate {
    pub name: &'static str,
    pub max: u32,
    pub per: Duration,
}

pub const SIGN_IN: Rate = Rate {
    name: "sign_in",
    max: 10,
    per: Duration::from_secs(15 * 60),
};
/// Sign-in attempts from one address across all accounts.
pub const SIGN_IN_ADDRESS: Rate = Rate {
    name: "sign_in_address",
    max: 50,
    per: Duration::from_secs(15 * 60),
};
pub const REGISTER: Rate = Rate {
    name: "register",
    max: 10,
    per: Duration::from_secs(60 * 60),
};
pub const IMPORT: Rate = Rate {
    name: "import",
    max: 20,
    per: Duration::from_secs(60 * 60),
};
pub const UPLOAD: Rate = Rate {
    name: "upload",
    max: 120,
    per: Duration::from_secs(60 * 60),
};
pub const PUBLISH: Rate = Rate {
    name: "publish",
    max: 60,
    per: Duration::from_secs(60 * 60),
};
pub const EDIT: Rate = Rate {
    name: "edit",
    max: 3000,
    per: Duration::from_secs(60 * 60),
};
pub const DNS_CHECK: Rate = Rate {
    name: "dns_check",
    max: 30,
    per: Duration::from_secs(60 * 60),
};

impl Rotulo {
    pub fn new(settings: Settings) -> std::io::Result<Self> {
        let store = Store::open(&settings.data_dir)?;
        Ok(Self {
            jobs: Arc::new(Semaphore::new(settings.limits.concurrent_jobs.max(1))),
            settings,
            store,
            limits: Mutex::new(Limiter::default()),
            project_locks: Mutex::new(HashMap::new()),
        })
    }

    pub fn from(ctx: &AppContext) -> Arc<Self> {
        ctx.shared_store
            .get::<Arc<Self>>()
            .expect("Rótulo state is initialized in after_context")
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
        self.limits
            .lock()
            .expect("rate limits lock")
            .hit(rate, key, Instant::now())
    }

    /// Serializes draft changes and publishes of one project within this process.
    pub fn project_lock(&self, project_id: i64) -> Arc<tokio::sync::Mutex<()>> {
        self.project_locks
            .lock()
            .expect("project locks lock")
            .entry(project_id)
            .or_default()
            .clone()
    }
}

fn rate_window(name: &str) -> Duration {
    [
        SIGN_IN,
        SIGN_IN_ADDRESS,
        REGISTER,
        IMPORT,
        UPLOAD,
        PUBLISH,
        EDIT,
        DNS_CHECK,
    ]
    .iter()
    .find(|rate| rate.name == name)
    .map_or(Duration::from_secs(3600), |rate| rate.per)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_flood_of_distinct_long_keys_keeps_the_counters_bounded() {
        let mut limiter = Limiter::default();
        let now = Instant::now();
        let long = "x".repeat(512);
        for n in 0..MAX_COUNTERS + 10 {
            limiter.hit(SIGN_IN, &format!("{n}{long}"), now).unwrap();
        }
        assert!(limiter.0.len() <= MAX_COUNTERS);
    }

    #[test]
    fn a_key_is_limited_within_its_window_and_free_after_it() {
        let mut limiter = Limiter::default();
        let now = Instant::now();
        for _ in 0..SIGN_IN.max {
            limiter.hit(SIGN_IN, "ip|a@b.co", now).unwrap();
        }
        assert!(limiter.hit(SIGN_IN, "ip|a@b.co", now).is_err());
        assert!(limiter.hit(SIGN_IN, "ip|c@b.co", now).is_ok());
        assert!(limiter.hit(SIGN_IN, "ip|a@b.co", now + SIGN_IN.per).is_ok());
    }
}
