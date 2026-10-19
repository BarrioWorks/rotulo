//! Draft previews on their own origin: `<token>.<preview_domain>`. The token is an expiring HMAC
//! of the project id, so a preview needs no cookie and a leaked address stops working.

use std::path::{Path, PathBuf};

use axum::{
    body::Body,
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use hmac::{Hmac, Mac};
use loco_rs::app::AppContext;
use sha2::Sha256;

use crate::{document::Document, drafts, import::policy::FileKind, paths, state::Pagehaven};

const LIFETIME_SECONDS: i64 = 12 * 60 * 60;
pub const AGENT_PATH: &str = "/__pagehaven/agent/agent.js";

fn base32(bytes: &[u8]) -> String {
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz234567";
    let mut out = String::new();
    let (mut buffer, mut bits) = (0u32, 0);
    for byte in bytes {
        buffer = (buffer << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            out.push(ALPHABET[((buffer >> (bits - 5)) & 31) as usize] as char);
            bits -= 5;
        }
    }
    if bits > 0 {
        out.push(ALPHABET[((buffer << (5 - bits)) & 31) as usize] as char);
    }
    out
}

fn mac(secret: &str, project_id: i64, expires: i64) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("hmac accepts any key");
    mac.update(format!("preview\0{project_id}\0{expires}").as_bytes());
    base32(&mac.finalize().into_bytes()[..20])
}

fn radix36(mut n: u64) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut out = Vec::new();
    loop {
        out.push(DIGITS[(n % 36) as usize]);
        n /= 36;
        if n == 0 {
            break;
        }
    }
    out.reverse();
    String::from_utf8(out).expect("ascii")
}

pub fn token(secret: &str, project_id: i64, now: i64) -> String {
    // Round the expiry so every request within ten minutes reuses the same origin and its cache.
    let expires = (now + LIFETIME_SECONDS) / 600 * 600;
    format!(
        "{}-{}-{}",
        radix36(project_id as u64),
        radix36(expires as u64),
        mac(secret, project_id, expires)
    )
}

/// The project a preview token grants, if the token is genuine and not expired.
pub fn verify(secret: &str, token: &str, now: i64) -> Option<i64> {
    let mut parts = token.split('-');
    let (id, expires, given) = (parts.next()?, parts.next()?, parts.next()?);
    if parts.next().is_some() {
        return None;
    }
    let project_id = i64::try_from(u64::from_str_radix(id, 36).ok()?).ok()?;
    let expires = i64::try_from(u64::from_str_radix(expires, 36).ok()?).ok()?;
    let expected = mac(secret, project_id, expires);
    let genuine = expected.len() == given.len()
        && expected
            .bytes()
            .zip(given.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0;
    (genuine && expires > now).then_some(project_id)
}

pub fn origin(state: &Pagehaven, project_id: i64) -> String {
    state
        .settings
        .preview_origin(&token(&state.settings.secret, project_id, crate::db::now()))
}

fn headers(response: &mut Response, state: &Pagehaven) {
    let app = state.settings.app_origin.trim_end_matches('/');
    let policy = format!(
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; \
         form-action 'none'; base-uri 'self'; object-src 'none'; frame-ancestors {app}"
    );
    let h = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(&policy) {
        h.insert(header::CONTENT_SECURITY_POLICY, value);
    }
    h.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("no-referrer"),
    );
    h.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    h.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), display-capture=()"),
    );
    h.remove(header::SET_COOKIE);
}

pub fn respond(status: StatusCode, kind: &str, body: impl Into<Body>) -> Response {
    let mut response = (status, body.into()).into_response();
    if let Ok(value) = HeaderValue::from_str(kind) {
        response.headers_mut().insert(header::CONTENT_TYPE, value);
    }
    response
}

fn agent_dir() -> PathBuf {
    Path::new("assets/static/js").to_path_buf()
}

/// Editor scripts under `/__pagehaven/`, from the compiled frontend.
async fn editor_script(state: &Pagehaven, path: &str) -> Response {
    let Some(rest) = path.strip_prefix("__pagehaven/") else {
        return respond(StatusCode::NOT_FOUND, "text/plain", "Not found");
    };
    if !rest.ends_with(".js") || rest.split('/').any(|s| s.is_empty() || s.starts_with('.')) {
        return respond(StatusCode::NOT_FOUND, "text/plain", "Not found");
    }
    let Ok(source) = tokio::fs::read_to_string(agent_dir().join(rest)).await else {
        return respond(StatusCode::NOT_FOUND, "text/plain", "Not found");
    };
    let body = if format!("/__pagehaven/{rest}") == AGENT_PATH {
        let origin =
            serde_json::to_string(state.settings.app_origin.trim_end_matches('/')).expect("string");
        format!("const PAGEHAVEN_APP_ORIGIN = {origin};\n{source}")
    } else {
        source
    };
    respond(StatusCode::OK, FileKind::Js.mime(), body)
}

pub async fn serve(ctx: &AppContext, token: &str, uri_path: &str) -> Response {
    let state = Pagehaven::from(ctx);
    let mut response = serve_inner(ctx, &state, token, uri_path).await;
    headers(&mut response, &state);
    response
}

async fn serve_inner(ctx: &AppContext, state: &Pagehaven, token: &str, uri_path: &str) -> Response {
    let Some(project_id) = verify(&state.settings.secret, token, crate::db::now()) else {
        return respond(StatusCode::NOT_FOUND, "text/html; charset=utf-8", EXPIRED);
    };
    let Some(path) = paths::from_request(uri_path) else {
        return respond(StatusCode::BAD_REQUEST, "text/plain", "Bad path");
    };
    if path.starts_with("__pagehaven/") {
        return editor_script(state, &path).await;
    }
    let mut found = None;
    for candidate in paths::candidates(&path, uri_path.ends_with('/') && !path.is_empty()) {
        match drafts::file(&ctx.db, project_id, &candidate).await {
            Ok(Some(file)) => {
                found = Some(file);
                break;
            }
            Ok(None) => {}
            Err(error) => return error.into_response(),
        }
    }
    let (status, file) = match found {
        Some(file) => (StatusCode::OK, file),
        None => match drafts::file(&ctx.db, project_id, "404.html").await {
            Ok(Some(file)) => (StatusCode::NOT_FOUND, file),
            _ => {
                return respond(
                    StatusCode::NOT_FOUND,
                    "text/plain; charset=utf-8",
                    "This page isn't part of the website.",
                )
            }
        },
    };
    let Some(kind) = FileKind::for_path(&file.path) else {
        return respond(StatusCode::NOT_FOUND, "text/plain", "Not found");
    };
    let bytes = match state.store.read(&file.blob) {
        Ok(bytes) => bytes,
        Err(error) => return crate::error::ApiError::internal(error).into_response(),
    };
    if kind == FileKind::Html {
        let rendered = tokio::task::spawn_blocking(move || {
            let mut document = Document::parse_checked(&String::from_utf8_lossy(&bytes))?;
            document.annotate_for_editor(AGENT_PATH);
            Ok::<_, crate::error::ApiError>(document.serialize())
        })
        .await;
        return match rendered {
            Ok(Ok(html)) => respond(status, kind.mime(), html),
            Ok(Err(error)) => error.into_response(),
            Err(error) => crate::error::ApiError::internal(error).into_response(),
        };
    }
    respond(status, kind.mime(), bytes)
}

const EXPIRED: &str = "<!doctype html><meta charset=utf-8><title>Preview expired</title><p style=\"font:16px system-ui;margin:3rem\">This preview link has expired. Reopen the website in Pagehaven.</p>";

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "test-secret-test-secret-test-secret";

    #[test]
    fn a_preview_token_opens_only_its_project_until_it_expires() {
        let now = 1_800_000_000;
        let token = token(SECRET, 42, now);
        assert!(token.len() <= 63, "fits in one DNS label");
        assert!(token
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-'));
        assert_eq!(verify(SECRET, &token, now), Some(42));
        assert_eq!(verify(SECRET, &token, now + LIFETIME_SECONDS + 1), None);
        assert_eq!(
            verify("another-secret-another-secret-xx", &token, now),
            None
        );
        let forged = token.replacen(&radix36(42), &radix36(43), 1);
        assert_eq!(verify(SECRET, &forged, now), None);
    }
}
