//! Minimal first-party milestones. Event failures never reject a request.
use std::{collections::HashSet, sync::Arc};

use loco_rs::app::AppContext;
use sea_orm::DatabaseConnection;
use tokio::sync::Mutex;

use crate::{db, import::ImportError};

/// Holds only today's users; each app context owns its cache.
#[derive(Default)]
pub struct Returned(Mutex<(i64, HashSet<i64>)>);

pub async fn returned(ctx: &AppContext, user_id: i64) {
    let Some(cache) = ctx.shared_store.get::<Arc<Returned>>() else {
        tracing::warn!("returned cache is not initialized");
        return;
    };
    let day = db::now() / 86400;
    let mut seen = cache.0.lock().await;
    if seen.0 != day {
        *seen = (day, HashSet::new());
    }
    if !seen.1.insert(user_id) {
        return;
    }
    drop(seen);
    record(&ctx.db, Some(user_id), None, "returned", None).await;
}

/// Logout uses its cookie directly rather than an authentication extractor.
pub async fn returned_for_jar(ctx: &AppContext, jar: &axum_extra::extract::cookie::CookieJar) {
    if let Some(cookie) = jar.get(crate::auth::cookie_name(crate::auth::secure_cookies(ctx))) {
        if let Ok(Some(user)) = crate::auth::user_for_token(&ctx.db, cookie.value()).await {
            returned(ctx, user.id).await;
        }
    }
}

/// The only event writer. SQL uniqueness also deduplicates across processes and restarts.
pub async fn record(
    db: &DatabaseConnection,
    user: Option<i64>,
    project: Option<i64>,
    kind: &str,
    detail: Option<&str>,
) {
    let result = db::exec(
        db,
        "INSERT INTO events (user_id, project_id, kind, detail, created_at)
         SELECT ?, ?, ?, ?, ? WHERE ? != 'first_edit' OR
         (EXISTS (SELECT 1 FROM edits WHERE project_id = ?) AND
          NOT EXISTS (SELECT 1 FROM edits WHERE project_id = ? LIMIT 1 OFFSET 1))
         ON CONFLICT DO NOTHING",
        [
            user.into(),
            project.into(),
            kind.into(),
            detail.into(),
            db::now().into(),
            kind.into(),
            project.into(),
            project.into(),
        ],
    )
    .await;
    if let Err(error) = result {
        tracing::warn!(%error, kind, "funnel event could not be recorded");
    }
}

/// Categories never contain archive paths, file names, or content.
pub fn import_reason(error: &ImportError) -> &'static str {
    match error {
        ImportError::SourceOnly => "source_only",
        ImportError::NoWebsite | ImportError::Empty => "no_website",
        ImportError::Limit(_) => "too_large",
        ImportError::InvalidArchive
        | ImportError::UnsafePath(_)
        | ImportError::SpecialFile(_)
        | ImportError::Encrypted
        | ImportError::Compression => "invalid_zip",
        ImportError::ChooseFolder(_) => "choose_folder",
        ImportError::NestedTooDeeply(_) | ImportError::MissingFiles(_) | ImportError::Io(_) => {
            "other"
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn import_errors_have_private_categories() {
        for (error, reason) in [
            (ImportError::SourceOnly, "source_only"),
            (ImportError::NoWebsite, "no_website"),
            (ImportError::Empty, "no_website"),
            (ImportError::Limit("private filename".into()), "too_large"),
            (ImportError::InvalidArchive, "invalid_zip"),
            (
                ImportError::UnsafePath("private filename".into()),
                "invalid_zip",
            ),
            (
                ImportError::SpecialFile("private filename".into()),
                "invalid_zip",
            ),
            (ImportError::Encrypted, "invalid_zip"),
            (ImportError::Compression, "invalid_zip"),
            (ImportError::ChooseFolder(vec![]), "choose_folder"),
            (
                ImportError::NestedTooDeeply("private filename".into()),
                "other",
            ),
            (ImportError::MissingFiles(vec![]), "other"),
            (
                ImportError::Io(std::io::Error::other("private filename")),
                "other",
            ),
        ] {
            assert_eq!(import_reason(&error), reason);
        }
    }
}
