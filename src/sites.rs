//! Published websites: a managed address or a verified custom domain, served from the live release.

use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use loco_rs::app::AppContext;

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
        return Ok(not_found(&state.settings));
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
        Err(_) => Ok(respond(
            StatusCode::NOT_FOUND,
            "text/html; charset=utf-8",
            page(PAGE_NOT_FOUND, &state.settings),
        )),
    }
}

pub fn not_found(settings: &crate::settings::Settings) -> Response {
    respond(
        StatusCode::NOT_FOUND,
        "text/html; charset=utf-8",
        page(SITE_NOT_FOUND, settings),
    )
}

/// Pagehaven's own page on a website host, with the address for reporting harmful websites.
fn page(body: &str, settings: &crate::settings::Settings) -> String {
    let report = settings
        .abuse_email
        .as_deref()
        .filter(|e| !e.is_empty() && e.bytes().all(|b| b.is_ascii_alphanumeric() || b"@.-_+".contains(&b)))
        .map(|e| format!("<p style=\"font-size:13px;color:#77746d\">Report a harmful website: <a href=\"mailto:{e}\">{e}</a></p>"))
        .unwrap_or_default();
    body.replace("</main>", &format!("{report}</main>"))
}

const PAGE_NOT_FOUND: &str = "<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Page not found</title><body style=\"font:16px/1.5 system-ui,sans-serif;color:#2b2a27;background:#faf9f6;display:grid;place-items:center;min-height:100vh;margin:0\"><main style=\"text-align:center\"><h1 style=\"font-size:22px\">Page not found</h1><p><a href=\"/\">Go to the home page</a></p></main>";
const SITE_NOT_FOUND: &str = "<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>No website here yet</title><body style=\"font:16px/1.5 system-ui,sans-serif;color:#2b2a27;background:#faf9f6;display:grid;place-items:center;min-height:100vh;margin:0\"><main style=\"text-align:center;max-width:28rem;padding:2rem\"><h1 style=\"font-size:22px\">No website here yet</h1><p>This address isn't connected to a published Pagehaven website.</p></main>";
