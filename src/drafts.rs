//! The draft of a project and its history. Every change is an edit: a set of file changes applied
//! in one transaction that also moves the project to its next revision.

use sea_orm::{ConnectionTrait, DatabaseConnection, TransactionTrait};
use serde::Serialize;
use serde_json::Value as Json;

use crate::{db, error::ApiError, projects::Project, store::Blob};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DraftFile {
    pub path: String,
    pub blob: Blob,
    pub bytes: i64,
}

/// One file's new state. `None` removes the file.
#[derive(Debug, Clone)]
pub struct Change {
    pub path: String,
    pub after: Option<(Blob, i64)>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct History {
    pub can_undo: bool,
    pub can_redo: bool,
    pub undo_label: Option<String>,
    pub redo_label: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Applied {
    pub revision: i64,
    pub pages: Vec<String>,
}

fn file_from(row: &sea_orm::QueryResult) -> Result<DraftFile, ApiError> {
    let blob: String = row.try_get("", "blob")?;
    Ok(DraftFile {
        path: row.try_get("", "path")?,
        blob: Blob::parse(&blob).ok_or_else(|| ApiError::internal("bad blob"))?,
        bytes: row.try_get("", "bytes")?,
    })
}

pub async fn files<C: ConnectionTrait>(
    db: &C,
    project_id: i64,
) -> Result<Vec<DraftFile>, ApiError> {
    let rows = db::all(
        db,
        "SELECT path, blob, bytes FROM draft_files WHERE project_id = ? ORDER BY path",
        [project_id.into()],
    )
    .await?;
    rows.iter().map(file_from).collect()
}

pub async fn file<C: ConnectionTrait>(
    db: &C,
    project_id: i64,
    path: &str,
) -> Result<Option<DraftFile>, ApiError> {
    let row = db::one(
        db,
        "SELECT path, blob, bytes FROM draft_files WHERE project_id = ? AND path = ?",
        [project_id.into(), path.into()],
    )
    .await?;
    row.as_ref().map(file_from).transpose()
}

pub fn is_page(path: &str) -> bool {
    path.ends_with(".html") || path.ends_with(".htm")
}

/// Human label for an edit kind, used for "Undo edit text".
pub fn label(kind: &str) -> &'static str {
    match kind {
        "set_text" => "text change",
        "set_image" => "image change",
        "set_alt" => "image description",
        "set_link" => "link change",
        "set_style" => "style change",
        "hide_section" => "section visibility",
        "duplicate_section" => "duplicated section",
        "move_section" => "section move",
        "remove_section" => "removed section",
        "set_page_meta" => "page details",
        "add_page" => "new page",
        "rename_page" => "page rename",
        "delete_page" => "deleted page",
        "restore_release" => "restored version",
        _ => "change",
    }
}

pub async fn history<C: ConnectionTrait>(db: &C, project_id: i64) -> Result<History, ApiError> {
    let undo = db::one(db, "SELECT kind FROM edits WHERE project_id = ? AND state = 'applied' ORDER BY id DESC LIMIT 1", [project_id.into()]).await?;
    let redo = db::one(
        db,
        "SELECT kind FROM edits WHERE project_id = ? AND state = 'undone' ORDER BY id ASC LIMIT 1",
        [project_id.into()],
    )
    .await?;
    let undo: Option<String> = undo.map(|r| r.try_get("", "kind")).transpose()?;
    let redo: Option<String> = redo.map(|r| r.try_get("", "kind")).transpose()?;
    Ok(History {
        can_undo: undo.is_some(),
        can_redo: redo.is_some(),
        undo_label: undo.map(|k| label(&k).to_owned()),
        redo_label: redo.map(|k| label(&k).to_owned()),
    })
}

/// Moves the project from `base` to the next revision, or fails with the current revision.
async fn advance<C: ConnectionTrait>(tx: &C, project_id: i64, base: i64) -> Result<i64, ApiError> {
    let moved = db::exec(
        tx,
        "UPDATE projects SET revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?",
        [db::now().into(), project_id.into(), base.into()],
    )
    .await?;
    if moved != 1 {
        let current = db::one(
            tx,
            "SELECT revision FROM projects WHERE id = ?",
            [project_id.into()],
        )
        .await?;
        let revision = current
            .map(|r| r.try_get::<i64>("", "revision"))
            .transpose()?
            .ok_or(ApiError::NotFound)?;
        return Err(ApiError::Conflict { revision });
    }
    Ok(base + 1)
}

async fn set_file<C: ConnectionTrait>(
    tx: &C,
    project_id: i64,
    path: &str,
    state: Option<(&str, i64)>,
) -> Result<(), ApiError> {
    match state {
        Some((blob, bytes)) => {
            db::exec(
                tx,
                "INSERT INTO draft_files (project_id, path, blob, bytes) VALUES (?, ?, ?, ?)
                 ON CONFLICT(project_id, path) DO UPDATE SET blob = excluded.blob, bytes = excluded.bytes",
                [project_id.into(), path.into(), blob.into(), bytes.into()],
            )
            .await?;
        }
        None => {
            db::exec(
                tx,
                "DELETE FROM draft_files WHERE project_id = ? AND path = ?",
                [project_id.into(), path.into()],
            )
            .await?;
        }
    }
    Ok(())
}

/// Applies `changes` as one edit on top of revision `base`.
pub async fn commit(
    db: &DatabaseConnection,
    project: &Project,
    user_id: i64,
    base: i64,
    kind: &str,
    summary: Json,
    changes: Vec<Change>,
) -> Result<Applied, ApiError> {
    let tx = db.begin().await?;
    let revision = advance(&tx, project.id, base).await?;
    let mut recorded = Vec::new();
    for change in changes {
        let before = file(&tx, project.id, &change.path).await?;
        let before = before.map(|f| (f.blob, f.bytes));
        if before == change.after {
            continue;
        }
        recorded.push((change.path, before, change.after));
    }
    if recorded.is_empty() {
        // Nothing changed. Keep the revision where it was so other tabs stay current.
        tx.rollback().await?;
        return Ok(Applied {
            revision: base,
            pages: Vec::new(),
        });
    }
    db::exec(
        &tx,
        "UPDATE edits SET state = 'discarded' WHERE project_id = ? AND state = 'undone'",
        [project.id.into()],
    )
    .await?;
    let edit_id = db::insert(
        &tx,
        "INSERT INTO edits (project_id, revision, kind, summary_json, state, user_id, created_at) VALUES (?, ?, ?, ?, 'applied', ?, ?)",
        [project.id.into(), revision.into(), kind.into(), summary.to_string().into(), user_id.into(), db::now().into()],
    )
    .await?;
    let mut pages = Vec::new();
    for (path, before, after) in &recorded {
        db::exec(
            &tx,
            "INSERT INTO edit_files (edit_id, path, before_blob, before_bytes, after_blob, after_bytes) VALUES (?, ?, ?, ?, ?, ?)",
            [
                edit_id.into(),
                path.as_str().into(),
                before.as_ref().map(|(b, _)| b.to_string()).into(),
                before.as_ref().map(|(_, n)| *n).into(),
                after.as_ref().map(|(b, _)| b.to_string()).into(),
                after.as_ref().map(|(_, n)| *n).into(),
            ],
        )
        .await?;
        set_file(
            &tx,
            project.id,
            path,
            after.as_ref().map(|(b, n)| (b.as_str(), *n)),
        )
        .await?;
        if is_page(path) {
            pages.push(path.clone());
        }
    }
    tx.commit().await?;
    Ok(Applied { revision, pages })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    Undo,
    Redo,
}

/// Undoes the latest applied edit or redoes the earliest undone one.
pub async fn step(
    db: &DatabaseConnection,
    project: &Project,
    base: i64,
    step: Step,
) -> Result<Applied, ApiError> {
    let tx = db.begin().await?;
    let revision = advance(&tx, project.id, base).await?;
    let (sql, next_state) = match step {
        Step::Undo => ("SELECT id FROM edits WHERE project_id = ? AND state = 'applied' ORDER BY id DESC LIMIT 1", "undone"),
        Step::Redo => ("SELECT id FROM edits WHERE project_id = ? AND state = 'undone' ORDER BY id ASC LIMIT 1", "applied"),
    };
    let Some(edit) = db::one(&tx, sql, [project.id.into()]).await? else {
        return Err(ApiError::NotAllowed(match step {
            Step::Undo => "There is nothing to undo.".to_owned(),
            Step::Redo => "There is nothing to redo.".to_owned(),
        }));
    };
    let edit_id: i64 = edit.try_get("", "id")?;
    let rows = db::all(&tx, "SELECT path, before_blob, before_bytes, after_blob, after_bytes FROM edit_files WHERE edit_id = ?", [edit_id.into()]).await?;
    let mut pages = Vec::new();
    for row in rows {
        let path: String = row.try_get("", "path")?;
        let before: Option<String> = row.try_get("", "before_blob")?;
        let before_bytes: Option<i64> = row.try_get("", "before_bytes")?;
        let after: Option<String> = row.try_get("", "after_blob")?;
        let after_bytes: Option<i64> = row.try_get("", "after_bytes")?;
        let (expected, target) = match step {
            Step::Undo => (after.as_deref(), before.as_deref().zip(before_bytes)),
            Step::Redo => (before.as_deref(), after.as_deref().zip(after_bytes)),
        };
        let current = file(&tx, project.id, &path).await?;
        if current.as_ref().map(|f| f.blob.as_str()) != expected {
            return Err(ApiError::NotAllowed(
                "This change can't be undone because the page changed since.".to_owned(),
            ));
        }
        set_file(&tx, project.id, &path, target).await?;
        if is_page(&path) {
            pages.push(path);
        }
    }
    db::exec(
        &tx,
        "UPDATE edits SET state = ? WHERE id = ?",
        [next_state.into(), edit_id.into()],
    )
    .await?;
    tx.commit().await?;
    Ok(Applied { revision, pages })
}

/// Whether the draft differs from what is live.
pub async fn changed_since_publish<C: ConnectionTrait>(
    db: &C,
    project: &Project,
) -> Result<bool, ApiError> {
    let Some(release) = project.live_release_id else {
        return Ok(true);
    };
    let row = db::one(
        db,
        "SELECT
           (SELECT COUNT(*) FROM draft_files d LEFT JOIN release_files r ON r.release_id = ? AND r.path = d.path
             WHERE d.project_id = ? AND (r.path IS NULL OR r.draft_blob != d.blob))
         + (SELECT COUNT(*) FROM release_files r LEFT JOIN draft_files d ON d.project_id = ? AND d.path = r.path
             WHERE r.release_id = ? AND d.path IS NULL) AS n",
        [release.into(), project.id.into(), project.id.into(), release.into()],
    )
    .await?;
    Ok(row
        .map(|r| r.try_get::<i64>("", "n"))
        .transpose()?
        .unwrap_or(1)
        > 0)
}
