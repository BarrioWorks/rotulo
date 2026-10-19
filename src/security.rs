//! Request checks and response headers for the app host.

use axum::{
    extract::Request,
    http::{header, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
};

use crate::settings::Settings;

pub fn unsafe_method(method: &Method) -> bool {
    !matches!(*method, Method::GET | Method::HEAD | Method::OPTIONS)
}

/// A state-changing request must come from a page on the app origin.
pub fn same_origin(request: &Request, settings: &Settings) -> bool {
    let headers = request.headers();
    if headers
        .get("sec-fetch-site")
        .is_some_and(|v| v != "same-origin" && v != "none")
    {
        return false;
    }
    match headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        Some(origin) => origin.eq_ignore_ascii_case(settings.app_origin.trim_end_matches('/')),
        None => headers
            .get("sec-fetch-site")
            .is_some_and(|v| v == "same-origin"),
    }
}

pub fn forbidden() -> Response {
    (
        StatusCode::FORBIDDEN,
        "This request did not come from Pagehaven.",
    )
        .into_response()
}

pub fn app_headers(response: &mut Response, settings: &Settings) {
    let preview = settings.preview_source();
    let policy = format!(
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: {preview}; \
         frame-src {preview}; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; \
         form-action 'self'; frame-ancestors 'none'"
    );
    let headers = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(&policy) {
        headers.insert(header::CONTENT_SECURITY_POLICY, value);
    }
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("same-origin"),
    );
    headers.insert(
        "cross-origin-opener-policy",
        HeaderValue::from_static("same-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=()"),
    );
    let is_static = response.headers().get(header::CACHE_CONTROL).is_some();
    if !is_static {
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    }
}
