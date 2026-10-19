//! Published websites: a managed address or a verified custom domain, served from the live release.

use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use loco_rs::{
    app::AppContext,
    controller::views::{engines::TeraView, ViewRenderer},
};
use serde_json::json;

use crate::{db, hosts::Host, import::policy::FileKind, paths, preview::respond, state::Pagehaven};

/// The project id and live release number for a site host.
async fn live_release(ctx: &AppContext, host: &Host) -> Result<Option<(i64, i64)>, sea_orm::DbErr> {
    let row = match host {
        Host::Site(slug) => {
            db::one(&ctx.db, "SELECT p.id AS project, r.number FROM projects p JOIN releases r ON r.id = p.live_release_id WHERE p.slug = ? AND p.suspended_at IS NULL", [slug.as_str().into()]).await?
        }
        Host::Custom(hostname) => {
            db::one(
                &ctx.db,
                "SELECT p.id AS project, r.number FROM domains d JOIN projects p ON p.id = d.project_id
                 JOIN releases r ON r.id = p.live_release_id WHERE d.hostname = ? AND d.verified_at IS NOT NULL AND p.suspended_at IS NULL",
                [hostname.as_str().into()],
            )
            .await?
        }
        _ => None,
    };
    row.map(|r| Ok((r.try_get("", "project")?, r.try_get("", "number")?)))
        .transpose()
}

pub async fn serve(ctx: &AppContext, host: &Host, uri_path: &str, head_only: bool) -> Response {
    let mut response = match serve_inner(ctx, host, uri_path).await {
        Ok(response) => response,
        Err(error) => crate::error::ApiError::internal(error).into_response(),
    };
    let h = response.headers_mut();
    h.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    h.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    h.remove(header::SET_COOKIE);
    if head_only {
        *response.body_mut() = axum::body::Body::empty();
    }
    response
}

async fn serve_inner(
    ctx: &AppContext,
    host: &Host,
    uri_path: &str,
) -> Result<Response, std::io::Error> {
    let state = Pagehaven::from(ctx);
    let Some((project, number)) = live_release(ctx, host)
        .await
        .map_err(std::io::Error::other)?
    else {
        return Ok(not_found(ctx));
    };
    let Some(path) = paths::from_request(uri_path) else {
        return Ok(respond(
            StatusCode::BAD_REQUEST,
            "text/plain",
            "Bad request",
        ));
    };
    let root = state.store.release_dir(project, number);
    let trailing = uri_path.ends_with('/') && !path.is_empty();
    for candidate in paths::candidates(&path, trailing) {
        let Some(kind) = FileKind::for_path(&candidate) else {
            continue;
        };
        let file = root.join(&candidate);
        match tokio::fs::symlink_metadata(&file).await {
            Ok(meta) if meta.is_file() => {
                let bytes = tokio::fs::read(&file).await?;
                let mut response = respond(StatusCode::OK, kind.mime(), bytes);
                let cache = if kind == FileKind::Html {
                    "public, max-age=0, must-revalidate"
                } else {
                    "public, max-age=300"
                };
                response
                    .headers_mut()
                    .insert(header::CACHE_CONTROL, HeaderValue::from_static(cache));
                return Ok(response);
            }
            _ => {}
        }
    }
    match tokio::fs::read(root.join("404.html")).await {
        Ok(bytes) => Ok(respond(StatusCode::NOT_FOUND, FileKind::Html.mime(), bytes)),
        Err(_) => Ok(missing_page(ctx)),
    }
}

/// The two misses on a website host: no live website at all, or no such page on a live one.
#[derive(Clone)]
struct NotFoundPages {
    site: String,
    page: String,
}

/// Render once at startup; website hosts do not use the app's view extractors.
pub fn initialize_not_found(ctx: &AppContext, view: &TeraView) -> loco_rs::Result<()> {
    let state = Pagehaven::from(ctx);
    let email = state.settings.abuse_email.as_deref().filter(|e| {
        !e.is_empty()
            && e.bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"@.-_+".contains(&b))
    });
    let render = |missing_page: bool| {
        view.render(
            "errors/site_not_found.html",
            json!({"abuse_email": email, "missing_page": missing_page}),
        )
    };
    ctx.shared_store.insert(NotFoundPages {
        site: render(false)?,
        page: render(true)?,
    });
    Ok(())
}

fn pages(ctx: &AppContext) -> NotFoundPages {
    ctx.shared_store
        .get::<NotFoundPages>()
        .expect("site not-found pages are initialized with the view engine")
}

pub fn not_found(ctx: &AppContext) -> Response {
    respond(
        StatusCode::NOT_FOUND,
        "text/html; charset=utf-8",
        pages(ctx).site,
    )
}

fn missing_page(ctx: &AppContext) -> Response {
    respond(
        StatusCode::NOT_FOUND,
        "text/html; charset=utf-8",
        pages(ctx).page,
    )
}
