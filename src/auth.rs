//! Accounts and sessions. Passwords use Loco's Argon2 hashing. A session is a random token in an
//! HttpOnly cookie, stored only as its SHA-256, so it can be revoked on sign-out.

use std::sync::OnceLock;

use axum::{
    extract::FromRequestParts,
    http::request::Parts,
    response::{IntoResponse, Redirect, Response},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use loco_rs::app::AppContext;
use sea_orm::{ConnectionTrait, DatabaseConnection};
use sha2::{Digest, Sha256};

use crate::{
    db,
    error::ApiError,
    state::Pagehaven,
    store::{hex, random_token},
};

pub fn cookie_name(secure: bool) -> &'static str {
    if secure {
        "__Host-ph_session"
    } else {
        "ph_session"
    }
}
const SESSION_SECONDS: i64 = 30 * 24 * 60 * 60;

#[derive(Debug, Clone)]
pub struct User {
    pub id: i64,
    pub pid: String,
    pub email: String,
    pub name: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Enter your name.")]
    Name,
    #[error("Enter a valid email address.")]
    Email,
    #[error("Choose a password with at least 10 characters.")]
    Password,
    #[error("An account with this email already exists. Sign in instead.")]
    Taken,
    #[error("Email or password is incorrect.")]
    Credentials,
    #[error(transparent)]
    Db(#[from] sea_orm::DbErr),
    #[error("Something went wrong on our side. Please try again.")]
    Hash,
}

fn hash_token(token: &str) -> String {
    hex(&Sha256::digest(token.as_bytes()))
}

pub fn normalize_email(email: &str) -> Result<String, AuthError> {
    let email = email.trim().to_ascii_lowercase();
    let valid = email.len() <= 254
        && email.split_once('@').is_some_and(|(local, domain)| {
            !local.is_empty()
                && domain.contains('.')
                && !domain.starts_with('.')
                && !domain.ends_with('.')
        })
        && !email.chars().any(|c| c.is_whitespace() || c.is_control());
    valid.then_some(email).ok_or(AuthError::Email)
}

fn user_from(row: &sea_orm::QueryResult) -> Result<User, sea_orm::DbErr> {
    Ok(User {
        id: row.try_get("", "id")?,
        pid: row.try_get("", "pid")?,
        email: row.try_get("", "email")?,
        name: row.try_get("", "name")?,
    })
}

pub async fn register(
    db: &DatabaseConnection,
    name: &str,
    email: &str,
    password: &str,
) -> Result<User, AuthError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(AuthError::Name);
    }
    let email = normalize_email(email)?;
    if password.chars().count() < 10 || password.len() > 512 {
        return Err(AuthError::Password);
    }
    let password = password.to_owned();
    let hash = tokio::task::spawn_blocking(move || loco_rs::hash::hash_password(&password))
        .await
        .map_err(|_| AuthError::Hash)?
        .map_err(|_| AuthError::Hash)?;
    let pid = uuid::Uuid::new_v4().to_string();
    let inserted = db::insert(
        db,
        "INSERT INTO users (pid, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING",
        [pid.clone().into(), email.clone().into(), name.into(), hash.into(), db::now().into()],
    )
    .await;
    match inserted {
        Ok(id) => Ok(User {
            id,
            pid,
            email,
            name: name.to_owned(),
        }),
        Err(sea_orm::DbErr::Custom(_)) => Err(AuthError::Taken),
        Err(error) => Err(error.into()),
    }
}

/// A hash to verify against when the email is unknown, so both cases take the same time.
fn decoy_hash() -> &'static str {
    static DECOY: OnceLock<String> = OnceLock::new();
    DECOY.get_or_init(|| {
        loco_rs::hash::hash_password("pagehaven-decoy-password").unwrap_or_default()
    })
}

pub async fn authenticate(
    db: &DatabaseConnection,
    email: &str,
    password: &str,
) -> Result<User, AuthError> {
    let email = normalize_email(email).map_err(|_| AuthError::Credentials)?;
    let row = db::one(
        db,
        "SELECT id, pid, email, name, password_hash FROM users WHERE email = ?",
        [email.into()],
    )
    .await?;
    let hash: Option<String> = row
        .as_ref()
        .map(|row| row.try_get("", "password_hash"))
        .transpose()?;
    let password = password.to_owned();
    let verified = tokio::task::spawn_blocking(move || {
        let known = hash.is_some();
        let matches =
            loco_rs::hash::verify_password(&password, hash.as_deref().unwrap_or(decoy_hash()));
        known && matches
    })
    .await
    .unwrap_or(false);
    match row {
        Some(row) if verified => Ok(user_from(&row)?),
        _ => Err(AuthError::Credentials),
    }
}

pub async fn create_session<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
) -> Result<String, sea_orm::DbErr> {
    let token = random_token(32);
    let now = db::now();
    db::exec(
        db,
        "DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?",
        [user_id.into(), now.into()],
    )
    .await?;
    db::exec(
        db,
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        [
            hash_token(&token).into(),
            user_id.into(),
            now.into(),
            (now + SESSION_SECONDS).into(),
        ],
    )
    .await?;
    Ok(token)
}

pub async fn revoke_session(db: &DatabaseConnection, token: &str) -> Result<(), sea_orm::DbErr> {
    db::exec(
        db,
        "DELETE FROM sessions WHERE token_hash = ?",
        [hash_token(token).into()],
    )
    .await?;
    Ok(())
}

pub async fn user_for_token(
    db: &DatabaseConnection,
    token: &str,
) -> Result<Option<User>, sea_orm::DbErr> {
    if token.len() != 64 {
        return Ok(None);
    }
    let row = db::one(
        db,
        "SELECT users.id, users.pid, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
        [hash_token(token).into(), db::now().into()],
    )
    .await?;
    row.map(|row| user_from(&row)).transpose()
}

pub fn session_cookie(token: String, secure: bool) -> Cookie<'static> {
    Cookie::build((cookie_name(secure), token))
        .path("/")
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .max_age(time_duration(SESSION_SECONDS))
        .build()
}

pub fn removal_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((cookie_name(secure), ""))
        .path("/")
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .max_age(time_duration(0))
        .build()
}

fn time_duration(seconds: i64) -> cookie::time::Duration {
    cookie::time::Duration::seconds(seconds)
}

async fn signed_in(parts: &mut Parts, ctx: &AppContext) -> Result<Option<User>, sea_orm::DbErr> {
    let jar = CookieJar::from_headers(&parts.headers);
    let Some(cookie) = jar.get(cookie_name(secure_cookies(ctx))) else {
        return Ok(None);
    };
    user_for_token(&ctx.db, cookie.value()).await
}

/// The signed-in user of a JSON API request.
pub struct ApiUser(pub User);

impl FromRequestParts<AppContext> for ApiUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        ctx: &AppContext,
    ) -> Result<Self, Self::Rejection> {
        signed_in(parts, ctx)
            .await?
            .map(Self)
            .ok_or(ApiError::Unauthorized)
    }
}

/// The signed-in user of a page. Visitors are sent to the sign-in page.
pub struct PageUser(pub User);

impl FromRequestParts<AppContext> for PageUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        ctx: &AppContext,
    ) -> Result<Self, Self::Rejection> {
        match signed_in(parts, ctx).await {
            Ok(Some(user)) => Ok(Self(user)),
            Ok(None) => Err(Redirect::to("/login").into_response()),
            Err(error) => Err(ApiError::internal(error).into_response()),
        }
    }
}

/// The signed-in user if there is one, for public pages.
pub struct MaybeUser(pub Option<User>);

impl FromRequestParts<AppContext> for MaybeUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        ctx: &AppContext,
    ) -> Result<Self, Self::Rejection> {
        signed_in(parts, ctx)
            .await
            .map(Self)
            .map_err(|error| ApiError::internal(error).into_response())
    }
}

pub fn secure_cookies(ctx: &AppContext) -> bool {
    Pagehaven::from(ctx).settings.secure_cookies
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secure_session_cookies_use_the_host_prefix() {
        let cookie = session_cookie("token".to_owned(), true);
        assert_eq!(cookie.name(), "__Host-ph_session");
        assert_eq!(cookie.secure(), Some(true));
        assert_eq!(cookie.path(), Some("/"));
        assert_eq!(cookie.domain(), None);
        assert_eq!(removal_cookie(true).name(), cookie.name());
        assert_eq!(
            session_cookie("token".to_owned(), false).name(),
            "ph_session"
        );
        assert_eq!(removal_cookie(false).name(), "ph_session");
    }
}
