//! Releases: immutable copies of a draft, one directory each, and the pointer to the live one.

use std::{
    fs,
    path::{Path, PathBuf},
};

use sea_orm::{DatabaseConnection, TransactionTrait};
use serde::Serialize;

use crate::{
    db,
    document::Document,
    drafts::{self, Change, DraftFile},
    error::ApiError,
    projects::Project,
    state::Rotulo,
    store::{self, Blob, Store},
};

#[derive(Debug, Clone, Serialize)]
pub struct Release {
    pub number: i64,
    pub created_at: String,
    pub live: bool,
    pub file_count: i64,
    pub bytes: i64,
    #[serde(skip)]
    pub id: i64,
}

fn iso(ts: i64) -> String {
    chrono::DateTime::from_timestamp(ts, 0)
        .map(|t| t.to_rfc3339())
        .unwrap_or_default()
}

pub async fn list(db: &DatabaseConnection, project: &Project) -> Result<Vec<Release>, ApiError> {
    let rows = db::all(
        db,
        "SELECT id, number, created_at, file_count, content_bytes FROM releases WHERE project_id = ? ORDER BY number DESC",
        [project.id.into()],
    )
    .await?;
    rows.iter()
        .map(|row| {
            let id: i64 = row.try_get("", "id")?;
            Ok(Release {
                id,
                number: row.try_get("", "number")?,
                created_at: iso(row.try_get("", "created_at")?),
                live: project.live_release_id == Some(id),
                file_count: row.try_get("", "file_count")?,
                bytes: row.try_get("", "content_bytes")?,
            })
        })
        .collect()
}

pub async fn live(db: &DatabaseConnection, project: &Project) -> Result<Option<Release>, ApiError> {
    Ok(list(db, project).await?.into_iter().find(|r| r.live))
}

/// One file of a release: the published bytes and the draft bytes they came from.
struct Built {
    path: String,
    published: (Blob, i64),
    draft: (Blob, i64),
}

/// Checks that a draft can go live: it has a home page and every page's scripts and styles exist.
pub fn validate(store: &Store, files: &[DraftFile]) -> Result<(), ApiError> {
    if !files.iter().any(|f| f.path == "index.html") {
        return Err(ApiError::Invalid(
            "Your website needs a home page (index.html) before it can be published.".to_owned(),
        ));
    }
    let present: std::collections::HashSet<&str> = files.iter().map(|f| f.path.as_str()).collect();
    for file in files.iter().filter(|f| drafts::is_page(&f.path)) {
        let html = String::from_utf8_lossy(&store.read(&file.blob)?).into_owned();
        Document::parse_checked(&html)?;
        for reference in crate::import::references::html_references(&html) {
            use crate::import::references::RefKind;
            if !matches!(reference.kind, RefKind::Script | RefKind::Stylesheet) {
                continue;
            }
            if let Some(target) = crate::import::references::resolve(&file.path, &reference.url) {
                if !present.contains(target.as_str()) {
                    return Err(ApiError::Invalid(format!("{} needs {target}, which is missing. Restore it or undo the change that removed it.", file.path)));
                }
            }
        }
    }
    Ok(())
}

/// Writes the release directory: pages without editor markup, every file hard-linked from the store.
fn build(store: &Store, files: &[DraftFile], target: &Path) -> Result<Vec<Built>, ApiError> {
    let parent = target.parent().expect("release has a parent");
    store::create_dir_all(parent, 0o750)?;
    let building = parent.join(format!(".building-{}", store::random_token(8)));
    store::create_dir_all(&building, 0o750)?;
    let result = (|| -> Result<Vec<Built>, ApiError> {
        let mut built = Vec::with_capacity(files.len());
        for file in files {
            let published = if drafts::is_page(&file.path) {
                let mut document =
                    Document::parse_checked(&String::from_utf8_lossy(&store.read(&file.blob)?))?;
                document.strip_editor_markup();
                let bytes = document.serialize().into_bytes();
                let len = bytes.len() as i64;
                (store.put_bytes(&bytes)?, len)
            } else {
                (file.blob.clone(), file.bytes)
            };
            let destination = building.join(&file.path);
            if !destination.starts_with(&building)
                || file
                    .path
                    .split('/')
                    .any(|s| s == ".." || s == "." || s.is_empty())
            {
                return Err(ApiError::internal(format!(
                    "unsafe draft path {}",
                    file.path
                )));
            }
            store::create_dir_all(destination.parent().expect("file has a parent"), 0o750)?;
            let source = store.blob_path(&published.0);
            link_blob(&source, &destination)?;
            built.push(Built {
                path: file.path.clone(),
                published,
                draft: (file.blob.clone(), file.bytes),
            });
        }
        for file in &built {
            let meta = fs::symlink_metadata(building.join(&file.path))?;
            if !meta.is_file() || meta.len() as i64 != file.published.1 {
                return Err(ApiError::internal(format!(
                    "release file {} did not verify",
                    file.path
                )));
            }
        }
        fs::rename(&building, target)?;
        Ok(built)
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&building);
    }
    result
}

fn link_blob(source: &Path, destination: &Path) -> std::io::Result<()> {
    use std::io::{self, ErrorKind};
    use std::os::unix::fs::OpenOptionsExt;

    match fs::hard_link(source, destination) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::CrossesDevices => {
            let mut source = fs::File::open(source)?;
            let mut destination = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o440)
                .open(destination)?;
            io::copy(&mut source, &mut destination)?;
            Ok(())
        }
        Err(error) => Err(error),
    }
}

fn suspended() -> ApiError {
    ApiError::NotAllowed(
        "This website was taken offline after a report. Contact Rótulo support.".to_owned(),
    )
}

/// Refuses publication until an operator lifts the suspension.
pub fn ensure_publishable(project: &Project) -> Result<(), ApiError> {
    if project.suspended_at.is_some() {
        return Err(suspended());
    }
    Ok(())
}

/// Publishes the draft at revision `base` as the next release and makes it live.
pub async fn publish(
    db: &DatabaseConnection,
    state: &Rotulo,
    project: &Project,
    user_id: i64,
    base: i64,
) -> Result<Release, ApiError> {
    let _slot = state.job_slot().await?;
    let lock = state.project_lock(project.id);
    let _guard = lock.lock().await;
    let project = crate::projects::reload(db, project.id).await?;
    ensure_publishable(&project)?;
    if project.revision != base {
        return Err(ApiError::Conflict {
            revision: project.revision,
        });
    }
    if project.live_release_id.is_some() && !drafts::changed_since_publish(db, &project).await? {
        return Err(ApiError::Rejected {
            code: "nothing_to_publish",
            status: axum::http::StatusCode::UNPROCESSABLE_ENTITY,
            message: "Everything is already published.".to_owned(),
        });
    }
    let files = drafts::files(db, project.id).await?;
    let number = db::one(
        db,
        "SELECT COALESCE(MAX(number), 0) + 1 AS n FROM releases WHERE project_id = ?",
        [project.id.into()],
    )
    .await?
    .map(|r| r.try_get::<i64>("", "n"))
    .transpose()?
    .unwrap_or(1);
    let target: PathBuf = state.store.release_dir(project.id, number);
    if target.exists() {
        // Left behind by a crash between building and recording. It was never live.
        fs::remove_dir_all(&target)?;
    }
    let store = state.store.clone();
    let build_target = target.clone();
    let built = tokio::task::spawn_blocking(move || {
        validate(&store, &files)?;
        build(&store, &files, &build_target)
    })
    .await
    .map_err(ApiError::internal)??;

    let recorded = async {
        let tx = db.begin().await?;
        let bytes: i64 = built.iter().map(|b| b.published.1).sum();
        let release_id = db::insert(
            &tx,
            "INSERT INTO releases (project_id, number, draft_revision, file_count, content_bytes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [project.id.into(), number.into(), base.into(), (built.len() as i64).into(), bytes.into(), user_id.into(), db::now().into()],
        )
        .await?;
        for file in &built {
            db::exec(
                &tx,
                "INSERT INTO release_files (release_id, path, blob, bytes, draft_blob, draft_bytes) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    release_id.into(),
                    file.path.as_str().into(),
                    file.published.0.to_string().into(),
                    file.published.1.into(),
                    file.draft.0.to_string().into(),
                    file.draft.1.into(),
                ],
            )
            .await?;
        }
        let changed = db::exec(&tx, "UPDATE projects SET live_release_id = ?, updated_at = ? WHERE id = ? AND suspended_at IS NULL", [release_id.into(), db::now().into(), project.id.into()]).await?;
        if changed == 0 {
            return Err(suspended());
        }
        tx.commit().await?;
        Ok::<i64, ApiError>(release_id)
    }
    .await;
    let release_id = match recorded {
        Ok(id) => id,
        Err(error) => {
            let _ = fs::remove_dir_all(&target);
            return Err(error);
        }
    };
    let project = crate::projects::reload(db, project.id).await?;
    list(db, &project)
        .await?
        .into_iter()
        .find(|r| r.id == release_id)
        .ok_or(ApiError::NotFound)
}

async fn find(db: &DatabaseConnection, project: &Project, number: i64) -> Result<i64, ApiError> {
    db::one(
        db,
        "SELECT id FROM releases WHERE project_id = ? AND number = ?",
        [project.id.into(), number.into()],
    )
    .await?
    .map(|r| r.try_get::<i64>("", "id"))
    .transpose()?
    .ok_or(ApiError::NotFound)
}

/// Makes an earlier (or later) release of the same project live again.
pub async fn activate(
    db: &DatabaseConnection,
    state: &Rotulo,
    project: &Project,
    number: i64,
) -> Result<Release, ApiError> {
    let lock = state.project_lock(project.id);
    let _guard = lock.lock().await;
    let project = crate::projects::reload(db, project.id).await?;
    ensure_publishable(&project)?;
    let release_id = find(db, &project, number).await?;
    if !state.store.release_dir(project.id, number).is_dir() {
        return Err(ApiError::internal(format!(
            "release directory {number} is missing"
        )));
    }
    let changed = db::exec(
        db,
        "UPDATE projects SET live_release_id = ?, updated_at = ? WHERE id = ? AND user_id = ? AND suspended_at IS NULL",
        [
            release_id.into(),
            db::now().into(),
            project.id.into(),
            project.user_id.into(),
        ],
    )
    .await?;
    if changed == 0 {
        return Err(suspended());
    }
    let project = crate::projects::reload(db, project.id).await?;
    list(db, &project)
        .await?
        .into_iter()
        .find(|r| r.id == release_id)
        .ok_or(ApiError::NotFound)
}

/// Copies a release back into the draft as one undoable edit.
pub async fn restore(
    db: &DatabaseConnection,
    state: &Rotulo,
    project: &Project,
    user_id: i64,
    number: i64,
    base: i64,
) -> Result<drafts::Applied, ApiError> {
    let lock = state.project_lock(project.id);
    let _guard = lock.lock().await;
    let release_id = find(db, project, number).await?;
    let rows = db::all(
        db,
        "SELECT path, draft_blob, draft_bytes FROM release_files WHERE release_id = ?",
        [release_id.into()],
    )
    .await?;
    let mut wanted = std::collections::BTreeMap::new();
    for row in rows {
        let blob: String = row.try_get("", "draft_blob")?;
        wanted.insert(
            row.try_get::<String>("", "path")?,
            (
                Blob::parse(&blob).ok_or_else(|| ApiError::internal("bad blob"))?,
                row.try_get::<i64>("", "draft_bytes")?,
            ),
        );
    }
    let store = state.store.clone();
    let pages: Vec<_> = wanted
        .iter()
        .filter(|(path, _)| drafts::is_page(path))
        .map(|(_, (blob, _))| blob.clone())
        .collect();
    tokio::task::spawn_blocking(move || -> Result<(), ApiError> {
        for blob in pages {
            Document::parse_checked(&String::from_utf8_lossy(&store.read(&blob)?))?;
        }
        Ok(())
    })
    .await
    .map_err(ApiError::internal)??;
    let mut changes: Vec<Change> = drafts::files(db, project.id)
        .await?
        .into_iter()
        .filter(|f| !wanted.contains_key(&f.path))
        .map(|f| Change {
            path: f.path,
            after: None,
        })
        .collect();
    changes.extend(wanted.into_iter().map(|(path, after)| Change {
        path,
        after: Some(after),
    }));
    drafts::commit(
        db,
        project,
        user_id,
        base,
        "restore_release",
        serde_json::json!({"release": number}),
        changes,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::{MetadataExt, PermissionsExt};

    fn test_root() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/publish-tests")
            .join(store::random_token(12))
    }

    #[test]
    fn release_path_collisions_never_overwrite_shared_blobs() {
        let root = test_root();
        let store = Store::open(&root).unwrap();
        let first = store.put_bytes(b"first").unwrap();
        let second = store.put_bytes(b"other").unwrap();
        // Reproduce a privileged writer's access without running the test as root.
        fs::set_permissions(store.blob_path(&first), fs::Permissions::from_mode(0o640)).unwrap();
        let files = vec![
            DraftFile {
                path: "asset.png".to_owned(),
                blob: first.clone(),
                bytes: 5,
            },
            DraftFile {
                path: "asset.png".to_owned(),
                blob: second,
                bytes: 5,
            },
        ];
        let target = store.release_dir(1, 1);
        let result = build(&store, &files, &target);
        let original = store.read(&first).unwrap();
        let target_exists = target.exists();
        fs::remove_dir_all(root).unwrap();
        assert_eq!(original, b"first", "a collision changed the shared blob");
        assert!(result.is_err());
        assert!(!target_exists);
    }

    #[test]
    fn cross_device_copies_create_new_files_and_refuse_existing_destinations() {
        let root = test_root();
        fs::create_dir_all(&root).unwrap();
        let source = root.join("source");
        fs::write(&source, b"original").unwrap();
        let destination_dir =
            Path::new("/dev/shm").join(format!("ph-publish-{}", store::random_token(12)));
        fs::create_dir(&destination_dir).unwrap();
        assert_ne!(
            fs::metadata(&root).unwrap().dev(),
            fs::metadata(&destination_dir).unwrap().dev(),
            "test needs two filesystems"
        );
        let destination = destination_dir.join("asset");
        link_blob(&source, &destination).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), b"original");
        fs::write(&source, b"changed!").unwrap();
        let result = link_blob(&source, &destination);
        let preserved = fs::read(&destination).unwrap();
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(destination_dir).unwrap();
        assert!(
            result.is_err(),
            "an existing cross-device destination was overwritten"
        );
        assert_eq!(preserved, b"original");
    }
}
