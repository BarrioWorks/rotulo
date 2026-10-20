//! App-host discovery and metadata. Customer hosts never reach these routes.
use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::{IntoResponse, Response},
};
use loco_rs::prelude::*;
use serde_json::{json, Value};

use crate::state::Pagehaven;

pub const INDEXABLE_PATHS: &[&str] = &["/", "/compatible-exports"];
const HOME_DESCRIPTION: &str = "Import a website delivered as HTML files, edit text, images and links visually, then publish it with Pagehaven. No code needed for supported edits.";

pub fn metadata(app_origin: &str) -> Value {
    let origin = app_origin.trim_end_matches('/');
    let page = |path: &str, title: &str, description: &str, robots: &str| {
        json!({"title": title, "description": description,
            "canonical": format!("{origin}{path}"), "robots": robots})
    };
    json!({
        "home": page("/", "Pagehaven · Edit and publish your HTML website without code", HOME_DESCRIPTION, "index, follow"),
        "compatible_exports": page("/compatible-exports", "Compatible HTML website exports · Pagehaven", "Check which HTML website exports work with Pagehaven. Learn what to include in your ZIP and why build-step projects and browser-rendered pages cannot be edited.", "index, follow"),
        "login": page("/login", "Sign in to your HTML website editor · Pagehaven", "Sign in to Pagehaven to edit text, images and links in your imported HTML websites and publish your changes when you are ready.", "noindex, follow"),
        "register": page("/register", "Create your HTML website editor account · Pagehaven", "Create a Pagehaven account to import a compatible HTML website ZIP, edit text, images and links visually, and publish your website without code.", "noindex, follow"),
        "image": format!("{origin}/static/img/marketing/og.png"),
        "home_json_ld": serde_json::to_string(&json!({
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "WebSite", "name": "Pagehaven", "url": format!("{origin}/"), "description": HOME_DESCRIPTION},
                {"@type": "SoftwareApplication", "name": "Pagehaven", "url": format!("{origin}/"), "applicationCategory": "DesignApplication", "operatingSystem": "Web", "description": HOME_DESCRIPTION}
            ]
        })).expect("static JSON metadata").replace('<', "\\u003c")
    })
}

/// Applies to app responses, including extractor failures, redirects and API errors.
pub fn response_headers(path: &str, response: &mut Response) {
    let robots = if matches!(path, "/login" | "/register") {
        Some("noindex, follow")
    } else if response.status().is_client_error()
        || response.status().is_server_error()
        || (!INDEXABLE_PATHS.contains(&path)
            && !matches!(path, "/robots.txt" | "/sitemap.xml")
            && !path.starts_with("/static/"))
    {
        Some("noindex, nofollow")
    } else {
        None
    };
    if let Some(robots) = robots {
        response
            .headers_mut()
            .insert("x-robots-tag", HeaderValue::from_static(robots));
    }
}

async fn robots_txt(State(ctx): State<AppContext>) -> Response {
    let state = Pagehaven::from(&ctx);
    let origin = state.settings.app_origin.trim_end_matches('/');
    (
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        format!("User-agent: *\nDisallow: /projects\nDisallow: /api\nDisallow: /editor\nDisallow: /internal/\nDisallow: /_health\nDisallow: /_ping\nDisallow: /logout\nSitemap: {origin}/sitemap.xml\n"),
    ).into_response()
}

fn xml_text(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

async fn sitemap_xml(State(ctx): State<AppContext>) -> Response {
    let state = Pagehaven::from(&ctx);
    let origin = xml_text(state.settings.app_origin.trim_end_matches('/'));
    let mut body = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
    for path in INDEXABLE_PATHS {
        body.push_str(&format!("  <url><loc>{origin}{path}</loc></url>\n"));
    }
    body.push_str("</urlset>\n");
    (
        [(header::CONTENT_TYPE, "application/xml; charset=utf-8")],
        body,
    )
        .into_response()
}

pub fn routes() -> Routes {
    Routes::new()
        .add("/robots.txt", get(robots_txt))
        .add("/sitemap.xml", get(sitemap_xml))
}
