//! Public guides for editing and publishing exported HTML websites.
use axum::response::Response;
use loco_rs::prelude::*;
use serde_json::json;

async fn visual_html_editor(ViewEngine(view): ViewEngine<TeraView>) -> Result<Response> {
    format::render().view(&view, "marketing/visual-html-editor.html", json!({}))
}

async fn static_website_hosting(ViewEngine(view): ViewEngine<TeraView>) -> Result<Response> {
    format::render().view(&view, "marketing/static-website-hosting.html", json!({}))
}

pub fn routes() -> Routes {
    Routes::new()
        .add("/visual-html-editor", get(visual_html_editor))
        .add("/static-website-hosting", get(static_website_hosting))
}
