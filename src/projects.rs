//! Projects and who may touch them. Every project route goes through [`owned`].

use serde::Serialize;

use sea_orm::{ConnectionTrait, DatabaseConnection, QueryResult, TransactionTrait};

use crate::{auth::User, db, error::ApiError};

#[derive(Debug, Clone)]
pub struct Project {
    pub id: i64,
    pub pid: String,
    pub user_id: i64,
    pub name: String,
    pub slug: String,
    pub revision: i64,
    pub live_release_id: Option<i64>,
    pub suspended_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Draft,
    Published,
    Changes,
    Offline,
}

/// Dashboard state reflects the live release's contents, including undo and rollback.
pub async fn status<C: ConnectionTrait>(db: &C, project: &Project) -> Result<Status, ApiError> {
    if project.suspended_at.is_some() {
        return Ok(Status::Offline);
    }
    if project.live_release_id.is_some() {
        return Ok(
            if crate::drafts::changed_since_publish(db, project).await? {
                Status::Changes
            } else {
                Status::Published
            },
        );
    }
    let had_release = db::one(
        db,
        "SELECT id FROM releases WHERE project_id = ? LIMIT 1",
        [project.id.into()],
    )
    .await?
    .is_some();
    Ok(if had_release {
        Status::Offline
    } else {
        Status::Draft
    })
}

const COLUMNS: &str =
    "id, pid, user_id, name, slug, revision, live_release_id, suspended_at, created_at, updated_at";

fn from_row(row: &QueryResult) -> Result<Project, sea_orm::DbErr> {
    Ok(Project {
        id: row.try_get("", "id")?,
        pid: row.try_get("", "pid")?,
        user_id: row.try_get("", "user_id")?,
        name: row.try_get("", "name")?,
        slug: row.try_get("", "slug")?,
        revision: row.try_get("", "revision")?,
        live_release_id: row.try_get("", "live_release_id")?,
        suspended_at: row.try_get("", "suspended_at")?,
        created_at: row.try_get("", "created_at")?,
        updated_at: row.try_get("", "updated_at")?,
    })
}

/// The project `pid` if `user` owns it. Anyone else gets "not found", so ids reveal nothing.
pub async fn owned<C: ConnectionTrait>(
    db: &C,
    user: &User,
    pid: &str,
) -> Result<Project, ApiError> {
    let row = db::one(
        db,
        &format!("SELECT {COLUMNS} FROM projects WHERE pid = ? AND user_id = ?"),
        [pid.into(), user.id.into()],
    )
    .await?;
    row.as_ref()
        .map(from_row)
        .transpose()?
        .ok_or(ApiError::NotFound)
}

pub async fn reload<C: ConnectionTrait>(db: &C, id: i64) -> Result<Project, ApiError> {
    let row = db::one(
        db,
        &format!("SELECT {COLUMNS} FROM projects WHERE id = ?"),
        [id.into()],
    )
    .await?;
    row.as_ref()
        .map(from_row)
        .transpose()?
        .ok_or(ApiError::NotFound)
}

pub async fn list(db: &DatabaseConnection, user: &User) -> Result<Vec<Project>, ApiError> {
    let rows = db::all(
        db,
        &format!(
            "SELECT {COLUMNS} FROM projects WHERE user_id = ? ORDER BY updated_at DESC, id DESC"
        ),
        [user.id.into()],
    )
    .await?;
    Ok(rows.iter().map(from_row).collect::<Result<_, _>>()?)
}

pub async fn count(db: &DatabaseConnection, user: &User) -> Result<u64, ApiError> {
    let row = db::one(
        db,
        "SELECT COUNT(*) AS n FROM projects WHERE user_id = ?",
        [user.id.into()],
    )
    .await?;
    Ok(row
        .map(|r| r.try_get::<i64>("", "n"))
        .transpose()?
        .unwrap_or(0) as u64)
}

const RESERVED: &[&str] = &[
    "www",
    "app",
    "api",
    "admin",
    "administrator",
    "root",
    "mail",
    "email",
    "smtp",
    "imap",
    "pop",
    "ftp",
    "ssh",
    "dns",
    "ns1",
    "ns2",
    "preview",
    "previews",
    "static",
    "assets",
    "cdn",
    "status",
    "help",
    "support",
    "docs",
    "blog",
    "billing",
    "account",
    "accounts",
    "login",
    "signin",
    "signup",
    "register",
    "auth",
    "oauth",
    "security",
    "abuse",
    "postmaster",
    "hostmaster",
    "webmaster",
    "pagehaven",
    "internal",
    "dashboard",
    "test",
    "staging",
    "dev",
    "localhost",
];

pub fn validate_slug(slug: &str) -> Result<(), ApiError> {
    let ok = (3..=32).contains(&slug.len())
        && slug
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && !slug.contains("--");
    if !ok {
        return Err(ApiError::Invalid(
            "Use 3 to 32 lowercase letters, numbers and single hyphens for the web address."
                .to_owned(),
        ));
    }
    if RESERVED.contains(&slug) {
        return Err(ApiError::Invalid(
            "That web address is reserved. Please choose another.".to_owned(),
        ));
    }
    Ok(())
}

pub fn slug_base(name: &str) -> String {
    let mut slug = String::new();
    for c in name.chars().flat_map(char::to_lowercase) {
        if c.is_ascii_alphanumeric() {
            slug.push(c);
        } else if !slug.ends_with('-') && !slug.is_empty() {
            slug.push('-');
        }
        if slug.len() >= 28 {
            break;
        }
    }
    let slug = slug.trim_matches('-').to_owned();
    if slug.len() < 3 || RESERVED.contains(&slug.as_str()) {
        format!("site-{}", crate::store::random_token(3))
    } else {
        slug
    }
}

/// Whether `user` may use `slug`: nobody else ever claimed it and no other project uses it.
pub async fn slug_available<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
    slug: &str,
    except_project: Option<i64>,
) -> Result<bool, ApiError> {
    let claim = db::one(
        db,
        "SELECT user_id FROM slug_claims WHERE slug = ?",
        [slug.into()],
    )
    .await?;
    if claim
        .map(|r| r.try_get::<i64>("", "user_id"))
        .transpose()?
        .is_some_and(|owner| owner != user_id)
    {
        return Ok(false);
    }
    let used = db::one(
        db,
        "SELECT id FROM projects WHERE slug = ? AND id != ?",
        [slug.into(), except_project.unwrap_or(-1).into()],
    )
    .await?;
    Ok(used.is_none())
}

pub async fn unique_slug<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
    name: &str,
) -> Result<String, ApiError> {
    let base = slug_base(name);
    for n in 1..50 {
        let candidate = if n == 1 {
            base.clone()
        } else {
            format!("{}-{n}", base.trim_end_matches('-'))
        };
        if validate_slug(&candidate).is_ok()
            && slug_available(db, user_id, &candidate, None).await?
        {
            return Ok(candidate);
        }
    }
    Ok(format!("site-{}", crate::store::random_token(4)))
}

fn slug_taken() -> ApiError {
    ApiError::Invalid("That web address is taken. Please choose another.".to_owned())
}

/// Turns a competing project slug into the same error as a competing claim.
pub fn slug_write_error(error: sea_orm::DbErr) -> ApiError {
    if matches!(error.sql_err(), Some(sea_orm::SqlErr::UniqueConstraintViolation(message)) if message == "UNIQUE constraint failed: projects.slug")
    {
        return slug_taken();
    }
    error.into()
}

/// Records that `user` uses `slug`, so it never moves to another account.
pub async fn claim_slug<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
    slug: &str,
) -> Result<(), ApiError> {
    db::exec(
        db,
        "INSERT INTO slug_claims (slug, user_id) VALUES (?, ?) ON CONFLICT(slug) DO NOTHING",
        [slug.into(), user_id.into()],
    )
    .await?;
    if db::one(
        db,
        "SELECT user_id FROM slug_claims WHERE slug = ? AND user_id = ?",
        [slug.into(), user_id.into()],
    )
    .await?
    .is_none()
    {
        return Err(slug_taken());
    }
    Ok(())
}

pub async fn update_settings(
    db: &DatabaseConnection,
    project: &Project,
    name: &str,
    slug: &str,
) -> Result<Project, ApiError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(ApiError::Invalid(
            "Give your website a name of up to 80 characters.".to_owned(),
        ));
    }
    let slug = slug.trim().to_ascii_lowercase();
    validate_slug(&slug)?;
    let tx = db.begin().await?;
    claim_slug(&tx, project.user_id, &slug).await?;
    if !slug_available(&tx, project.user_id, &slug, Some(project.id)).await? {
        return Err(slug_taken());
    }
    db::exec(
        &tx,
        "UPDATE projects SET name = ?, slug = ?, updated_at = ? WHERE id = ?",
        [
            name.into(),
            slug.into(),
            db::now().into(),
            project.id.into(),
        ],
    )
    .await
    .map_err(slug_write_error)?;
    tx.commit().await?;
    reload(db, project.id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn web_addresses_come_from_names_and_avoid_reserved_words() {
        assert_eq!(slug_base("Harbor Bakery & Café"), "harbor-bakery-caf");
        assert!(slug_base("www").starts_with("site-"));
        assert!(validate_slug("harbor-bakery").is_ok());
        assert!(validate_slug("admin").is_err());
        assert!(validate_slug("xn--abc").is_err());
        assert!(validate_slug("Harbor").is_err());
    }
}
