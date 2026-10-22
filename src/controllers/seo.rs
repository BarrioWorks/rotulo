//! App-host discovery and metadata. Customer hosts never reach these routes.
use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::{IntoResponse, Response},
};
use loco_rs::prelude::*;
use serde_json::{json, Value};

use crate::state::Rotulo;

pub const INDEXABLE_PATHS: &[&str] = &[
    "/",
    "/compatible-exports",
    "/visual-html-editor",
    "/static-website-hosting",
];
const HOME_DESCRIPTION: &str = "Edit an AI-made HTML website without code. Import a compatible ZIP, change text, images and links visually, then publish your static website with Rótulo.";

pub fn metadata(app_origin: &str) -> Value {
    let origin = app_origin.trim_end_matches('/');
    let page = |path: &str, title: &str, description: &str, robots: &str| {
        json!({"title": title, "description": description,
            "canonical": format!("{origin}{path}"), "robots": robots})
    };
    json!({
        "home": page("/", "Edit an HTML website without code | Rótulo", HOME_DESCRIPTION, "index, follow"),
        "compatible_exports": page("/compatible-exports", "Which website exports work with Rótulo?", "Check which HTML website exports work with Rótulo. Learn what to include in your ZIP and why build-step projects and browser-rendered pages cannot be edited.", "index, follow"),
        "visual_html_editor": page("/visual-html-editor", "Visual HTML editor for exported websites | Rótulo", "Edit exported HTML visually in Rótulo. Change text, replace images and update links in your AI-made website. Check which edits work before you import.", "index, follow"),
        "static_website_hosting": page("/static-website-hosting", "Publish a static website from a ZIP | Rótulo", "Publish a static website from a ZIP with Rótulo. Check your files, preview a draft, review changes and publish to a hosted address. Keep earlier versions.", "index, follow"),
        "login": page("/login", "Sign in to your HTML website editor · Rótulo", "Sign in to Rótulo to edit text, images and links in your imported HTML websites and publish your changes when you are ready.", "noindex, follow"),
        "register": page("/register", "Create your HTML website editor account · Rótulo", "Create a Rótulo account to import a compatible HTML website ZIP, edit text, images and links visually, and publish your website without code.", "noindex, follow"),
        "home_faq": HOME_FAQ.iter().map(|(question, answer)| json!({"question": question, "answer": answer})).collect::<Vec<_>>(),
        "image": format!("{origin}/static/img/marketing/og.png"),
        "home_json_ld": serde_json::to_string(&json!({
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "WebSite", "name": "Rótulo", "url": format!("{origin}/"), "description": HOME_DESCRIPTION},
                {"@type": "SoftwareApplication", "name": "Rótulo", "url": format!("{origin}/"), "applicationCategory": "DesignApplication", "operatingSystem": "Web", "description": HOME_DESCRIPTION},
                {
                    "@type": "FAQPage",
                    "mainEntity": HOME_FAQ.iter().map(|(question, answer)| json!({
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    })).collect::<Vec<_>>()
                }
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
    let state = Rotulo::from(&ctx);
    let origin = state.settings.app_origin.trim_end_matches('/');
    (
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        format!("User-agent: *\nDisallow: /projects\nDisallow: /api\nDisallow: /editor\nDisallow: /internal/\nDisallow: /_health\nDisallow: /_ping\nDisallow: /logout\nSitemap: {origin}/sitemap.xml\n"),
    ).into_response()
}

/// The homepage FAQ. It renders the visible questions and the FAQPage structured data, so they cannot drift apart.
const HOME_FAQ: &[(&str, &str)] = &[
    ("Will my website work in Rótulo?", "It will if the ZIP holds finished HTML pages, with index.html at the top, inside one folder, or in a dist or build folder. Every local stylesheet and script the pages link to must be in the ZIP, text files must be UTF-8, and the ZIP can be up to 25 MB. A ZIP of source code is refused with this message: “This ZIP contains source code rather than a finished website. Export the built static website files and try again.”"),
    ("My site came from Lovable, Bolt or v0. Will it work?", "If what you downloaded is the project’s source code, Rótulo refuses it until it is built. A built version, often a dist folder, imports and publishes. If its pages are drawn in the browser by JavaScript, you can edit only the text and pictures written in its HTML files."),
    ("Will editing break what the AI made?", "Rótulo applies each edit to the part you change and publishes the rest as you imported it. Check the result before you publish. If an edit goes wrong, undo it, or make an earlier version live again."),
    ("Do I need to know HTML?", "No. You click the part of the page you want to change, then choose Edit text, Style or Replace image from the controls next to it."),
    ("When do visitors see my changes?", "Only after you press Publish and confirm. Rótulo first lists your changes and shows the address visitors will use. Your first publish makes the whole website public, every page, not only the parts you changed."),
    ("What happens to private files in my ZIP?", "Rótulo leaves recognised server code, private keys, password files and databases out of your website. It lists each file it left out with the reason, and warns you about secrets. It keeps the ZIP you uploaded on its server, so remove secrets before you upload."),
    ("What address does my website get?", "An address made from your website’s name on the Rótulo sites domain, with a number added when that name is taken. You can change it in Website settings."),
    ("What if I forget my password?", "Rótulo can’t reset passwords yet. Use a password manager, and sign up with an email address you will keep."),
];

fn xml_text(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

async fn sitemap_xml(State(ctx): State<AppContext>) -> Response {
    let state = Rotulo::from(&ctx);
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
