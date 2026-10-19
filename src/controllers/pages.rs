//! Server-rendered pages: home, accounts, dashboard, import and the editor shell.

use axum::{
    extract::{Form, Path, State},
    response::{IntoResponse, Redirect, Response},
};
use axum_extra::extract::cookie::CookieJar;
use loco_rs::prelude::*;
use serde::Deserialize;
use serde_json::json;

use crate::{
    auth::{self, AuthError, MaybeUser, PageUser},
    document::Document,
    drafts,
    error::ApiError,
    import::policy::FileKind,
    preview, projects,
    state::{self, Pagehaven},
};

fn user_json(user: &auth::User) -> serde_json::Value {
    json!({"name": user.name, "email": user.email})
}

fn internal(error: impl std::fmt::Display) -> loco_rs::Error {
    loco_rs::Error::string(&error.to_string())
}

async fn home(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    MaybeUser(user): MaybeUser,
) -> Result<Response> {
    if user.is_some() {
        return Ok(Redirect::to("/projects").into_response());
    }
    let state = Pagehaven::from(&ctx);
    format::render().view(
        &view,
        "home.html",
        json!({"sites_domain": state.settings.sites_domain}),
    )
}

#[derive(Deserialize)]
struct RegisterForm {
    name: String,
    email: String,
    password: String,
}

async fn register_page(
    ViewEngine(view): ViewEngine<TeraView>,
    MaybeUser(user): MaybeUser,
) -> Result<Response> {
    if user.is_some() {
        return Ok(Redirect::to("/projects").into_response());
    }
    format::render().view(
        &view,
        "auth/register.html",
        json!({"name": "", "email": ""}),
    )
}

async fn register(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    jar: CookieJar,
    headers: axum::http::HeaderMap,
    Form(form): Form<RegisterForm>,
) -> Result<Response> {
    let state = Pagehaven::from(&ctx);
    let again = |error: String| {
        format::render().view(
            &view,
            "auth/register.html",
            json!({"error": error, "name": form.name, "email": form.email}),
        )
    };
    if state
        .limit(state::REGISTER, &state.settings.client_ip(&headers))
        .is_err()
    {
        return again(ApiError::RateLimited.to_string());
    }
    match auth::register(&ctx.db, &form.name, &form.email, &form.password).await {
        Ok(user) => {
            let token = auth::create_session(&ctx.db, user.id)
                .await
                .map_err(internal)?;
            Ok((
                jar.add(auth::session_cookie(token, state.settings.secure_cookies)),
                Redirect::to("/projects"),
            )
                .into_response())
        }
        Err(AuthError::Db(error)) => Err(internal(error)),
        Err(error) => again(error.to_string()),
    }
}

#[derive(Deserialize)]
struct LoginForm {
    email: String,
    password: String,
}

async fn login_page(
    ViewEngine(view): ViewEngine<TeraView>,
    MaybeUser(user): MaybeUser,
) -> Result<Response> {
    if user.is_some() {
        return Ok(Redirect::to("/projects").into_response());
    }
    format::render().view(&view, "auth/login.html", json!({"email": ""}))
}

async fn login(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    jar: CookieJar,
    headers: axum::http::HeaderMap,
    Form(form): Form<LoginForm>,
) -> Result<Response> {
    let state = Pagehaven::from(&ctx);
    // Echo what was typed so a typo can be fixed, unless it is too long to be an email.
    let typed = if form.email.len() <= 254 {
        form.email.as_str()
    } else {
        ""
    };
    let again = |error: String| {
        format::render().view(
            &view,
            "auth/login.html",
            json!({"error": error, "email": typed}),
        )
    };
    let ip = state.settings.client_ip(&headers);
    if state.limit(state::SIGN_IN_ADDRESS, &ip).is_err()
        || state
            .limit(
                state::SIGN_IN,
                &format!("{ip}|{}", form.email.trim().to_ascii_lowercase()),
            )
            .is_err()
    {
        return again(ApiError::RateLimited.to_string());
    }
    match auth::authenticate(&ctx.db, &form.email, &form.password).await {
        Ok(user) => {
            if let Some(old) = jar.get(auth::cookie_name(auth::secure_cookies(&ctx))) {
                auth::revoke_session(&ctx.db, old.value())
                    .await
                    .map_err(internal)?;
            }
            let token = auth::create_session(&ctx.db, user.id)
                .await
                .map_err(internal)?;
            Ok((
                jar.add(auth::session_cookie(token, state.settings.secure_cookies)),
                Redirect::to("/projects"),
            )
                .into_response())
        }
        Err(AuthError::Db(error)) => Err(internal(error)),
        Err(error) => again(error.to_string()),
    }
}

async fn logout(State(ctx): State<AppContext>, jar: CookieJar) -> Result<Response> {
    if let Some(cookie) = jar.get(auth::cookie_name(auth::secure_cookies(&ctx))) {
        auth::revoke_session(&ctx.db, cookie.value())
            .await
            .map_err(internal)?;
    }
    let secure = Pagehaven::from(&ctx).settings.secure_cookies;
    Ok((jar.add(auth::removal_cookie(secure)), Redirect::to("/")).into_response())
}

pub fn ago(ts: i64) -> String {
    let seconds = (crate::db::now() - ts).max(0);
    let (n, unit) = match seconds {
        0..=59 => return "just now".to_owned(),
        60..=3599 => (seconds / 60, "minute"),
        3600..=86_399 => (seconds / 3600, "hour"),
        86_400..=2_591_999 => (seconds / 86_400, "day"),
        _ => {
            return chrono::DateTime::from_timestamp(ts, 0)
                .map(|t| t.format("%-d %B %Y").to_string())
                .unwrap_or_default()
        }
    };
    format!("{n} {unit}{} ago", if n == 1 { "" } else { "s" })
}

/// A preview URL for the image that best represents the home page, if it is an image file.
pub async fn thumbnail(ctx: &AppContext, state: &Pagehaven, project_id: i64) -> Option<String> {
    let index = drafts::file(&ctx.db, project_id, "index.html")
        .await
        .ok()??;
    let html = String::from_utf8_lossy(&state.store.read(&index.blob).ok()?).into_owned();
    let candidates = Document::parse_checked(&html).ok()?.representative_images();
    for src in candidates {
        let Some(path) = crate::import::references::resolve("index.html", &src) else {
            continue;
        };
        if !FileKind::for_path(&path).is_some_and(|k| k.is_raster_image() || k == FileKind::Svg) {
            continue;
        }
        if let Ok(Some(_)) = drafts::file(&ctx.db, project_id, &path).await {
            return Some(format!("{}/{}", preview::origin(state, project_id), path));
        }
    }
    None
}

async fn dashboard(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    PageUser(user): PageUser,
) -> Result<Response> {
    let state = Pagehaven::from(&ctx);
    let list = projects::list(&ctx.db, &user).await.map_err(internal)?;
    let mut cards = Vec::new();
    for project in &list {
        let domains = crate::domains::list(&ctx.db, &state.settings, project)
            .await
            .map_err(internal)?;
        let pages = drafts::files(&ctx.db, project.id)
            .await
            .map_err(internal)?
            .iter()
            .filter(|f| drafts::is_page(&f.path))
            .count();
        cards.push(json!({
            "pid": project.pid,
            "name": project.name,
            "slug": project.slug,
            "status": if project.live_release_id.is_some() { "published" } else { "draft" },
            "live": project.live_release_id.is_some(),
            "updated_at": chrono::DateTime::from_timestamp(project.updated_at, 0).map(|t| t.to_rfc3339()),
            "updated_human": ago(project.updated_at),
            "site_url": state.settings.site_origin(&project.slug),
            "domains": domains.iter().filter(|d| d.status == "verified").map(|d| d.hostname.clone()).collect::<Vec<_>>(),
            "thumbnail_url": thumbnail(&ctx, &state, project.id).await,
            "page_count": pages,
        }));
    }
    let limit = state.settings.limits.projects_per_user;
    format::render().view(
        &view,
        "projects/index.html",
        json!({"user": user_json(&user), "projects": cards, "can_create": (list.len() as u64) < limit, "limit": limit}),
    )
}

async fn new_project(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    PageUser(user): PageUser,
) -> Result<Response> {
    let limits = &Pagehaven::from(&ctx).settings.limits;
    format::render().view(
        &view,
        "projects/new.html",
        json!({
            "user": user_json(&user),
            "limits": {"upload_mb": limits.upload_bytes / 1_048_576, "content_mb": limits.content_bytes / 1_048_576, "file_count": limits.file_count},
        }),
    )
}

async fn editor(
    State(ctx): State<AppContext>,
    ViewEngine(view): ViewEngine<TeraView>,
    PageUser(user): PageUser,
    Path(pid): Path<String>,
) -> Result<Response> {
    let project = match projects::owned(&ctx.db, &user, &pid).await {
        Ok(project) => project,
        Err(ApiError::NotFound) => return not_found_page(&view),
        Err(error) => return Err(internal(error)),
    };
    format::render().view(
        &view,
        "projects/editor.html",
        json!({"user": user_json(&user), "project": {"pid": project.pid, "name": project.name}}),
    )
}

pub fn not_found_page(view: &TeraView) -> Result<Response> {
    let mut response = format::render().view(view, "errors/not_found.html", json!({}))?;
    *response.status_mut() = axum::http::StatusCode::NOT_FOUND;
    Ok(response)
}

pub fn routes() -> Routes {
    Routes::new()
        .add("/", get(home))
        .add("/register", get(register_page).post(register))
        .add("/login", get(login_page).post(login))
        .add("/logout", post(logout))
        .add("/projects", get(dashboard))
        .add("/projects/new", get(new_project))
        .add("/projects/{pid}", get(editor))
}
