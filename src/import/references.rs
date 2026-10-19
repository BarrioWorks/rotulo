//! Browser references, shared by import validation and publishing.
use scraper::{Html, Selector};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefKind {
    Script,
    Stylesheet,
    Image,
    Media,
    Font,
    Page,
    Other,
}
#[derive(Debug, Clone)]
pub struct Reference {
    pub url: String,
    pub kind: RefKind,
}

pub fn html_references(html: &str) -> Vec<Reference> {
    let document = Html::parse_document(html);
    let mut refs = Vec::new();
    for element in document.select(&Selector::parse("*").expect("constant selector")) {
        let e = element.value();
        let mut add = |attr: &str, kind| {
            if let Some(url) = e.attr(attr) {
                refs.push(Reference {
                    url: url.to_owned(),
                    kind,
                });
            }
        };
        match e.name() {
            "script" => add("src", RefKind::Script),
            "link" => {
                let rel = e.attr("rel").unwrap_or("").to_ascii_lowercase();
                let kind = if rel.split_ascii_whitespace().any(|r| r == "stylesheet") {
                    RefKind::Stylesheet
                } else if rel.split_ascii_whitespace().any(|r| r == "modulepreload")
                    || e.attr("as") == Some("script")
                {
                    RefKind::Script
                } else if e.attr("as") == Some("font") {
                    RefKind::Font
                } else {
                    RefKind::Other
                };
                add("href", kind);
            }
            "img" => add("src", RefKind::Image),
            "source" | "video" | "audio" => {
                add("src", RefKind::Media);
                if e.name() == "video" {
                    add("poster", RefKind::Image);
                }
            }
            "a" => add("href", RefKind::Page),
            "iframe" => add("src", RefKind::Other),
            "meta"
                if e.attr("property")
                    .is_some_and(|p| p.eq_ignore_ascii_case("og:image")) =>
            {
                add("content", RefKind::Image)
            }
            _ => {}
        }
        if matches!(e.name(), "img" | "source") {
            if let Some(srcset) = e.attr("srcset") {
                for url in srcset_urls(srcset) {
                    refs.push(Reference {
                        url,
                        kind: RefKind::Image,
                    });
                }
            }
        }
        if let Some(style) = e.attr("style") {
            refs.extend(css_asset_references(style));
        }
        if e.name() == "style" {
            refs.extend(css_asset_references(&element.text().collect::<String>()));
        }
    }
    refs
}

// Consume descriptors separately so commas in data URLs do not invent local URLs.
fn srcset_urls(mut s: &str) -> Vec<String> {
    let mut out = Vec::new();
    while !s.is_empty() {
        s = s.trim_start_matches(|c: char| c.is_ascii_whitespace() || c == ',');
        let end = s.find(char::is_whitespace).unwrap_or(s.len());
        let token = &s[..end];
        if token.is_empty() {
            break;
        }
        if token.starts_with("data:") {
            out.push(token.trim_end_matches(',').to_owned());
        } else {
            out.extend(
                token
                    .split(',')
                    .filter(|v| !v.is_empty())
                    .map(str::to_owned),
            );
        }
        s = &s[end..];
        if !token.ends_with(',') {
            s = s.find(',').map_or("", |i| &s[i + 1..]);
        }
    }
    out
}

/// Extract CSS URL tokens, ignoring comments and ordinary quoted strings.
pub fn css_references(css: &str) -> Vec<String> {
    css_asset_references(css)
        .into_iter()
        .map(|r| r.url)
        .collect()
}

pub(crate) fn css_asset_references(css: &str) -> Vec<Reference> {
    let b = css.as_bytes();
    let mut importing = false;
    let mut i = 0;
    let mut out = Vec::new();
    while i < b.len() {
        if b[i..].starts_with(b"/*") {
            i += 2;
            while i + 1 < b.len() && &b[i..i + 2] != b"*/" {
                i += 1;
            }
            i = (i + 2).min(b.len());
            continue;
        }
        if matches!(b[i], b';' | b'{' | b'}') {
            importing = false;
        }
        let start = i;
        let url = b[i..]
            .get(..3)
            .is_some_and(|x| x.eq_ignore_ascii_case(b"url"))
            && (i == 0 || !ident(b[i - 1]));
        let import = b[i..]
            .get(..7)
            .is_some_and(|x| x.eq_ignore_ascii_case(b"@import"))
            && b.get(i + 7).is_none_or(|c| !ident(*c));
        if import {
            importing = true;
        }
        if url || import {
            i += if url { 3 } else { 7 };
            while b.get(i).is_some_and(u8::is_ascii_whitespace) {
                i += 1;
            }
            if url {
                if b.get(i) != Some(&b'(') {
                    i = start + 1;
                    continue;
                }
                i += 1;
                while b.get(i).is_some_and(u8::is_ascii_whitespace) {
                    i += 1;
                }
            }
            if import && !matches!(b.get(i), Some(b'\'' | b'"')) {
                continue;
            }
            let quote = b.get(i).copied().filter(|c| matches!(c, b'\'' | b'"'));
            if quote.is_some() {
                i += 1;
            }
            let begin = i;
            while i < b.len() && !quote.map_or(b[i] == b')', |q| b[i] == q) {
                if b[i] == b'\\' && i + 1 < b.len() {
                    i += 1;
                }
                i += 1;
            }
            if i < b.len() {
                out.push(Reference {
                    url: css[begin..i].trim().to_owned(),
                    kind: if importing {
                        RefKind::Stylesheet
                    } else {
                        RefKind::Other
                    },
                });
                importing = false;
                i += 1;
            }
            continue;
        }
        if matches!(b[i], b'\'' | b'"') {
            let quote = b[i];
            i += 1;
            while i < b.len() && b[i] != quote {
                if b[i] == b'\\' && i + 1 < b.len() {
                    i += 1;
                }
                i += 1;
            }
        }
        i += 1;
    }
    out
}
fn ident(c: u8) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, b'_' | b'-' | b'\\')
}

pub fn resolve(from_path: &str, url: &str) -> Option<String> {
    let url = url.trim();
    if url.is_empty() || url.starts_with(['#', '?']) || url.starts_with("//") {
        return None;
    }
    let path = url.split(['?', '#']).next()?;
    if path.split('/').next()?.contains(':') {
        return None;
    }
    let path = percent_encoding::percent_decode_str(path)
        .decode_utf8()
        .ok()?;
    if path.starts_with("//") || path.contains(['\\', ':']) || path.chars().any(char::is_control) {
        return None;
    }
    let mut segments: Vec<&str> = if path.starts_with('/') {
        Vec::new()
    } else {
        from_path
            .rsplit_once('/')
            .map_or(Vec::new(), |(p, _)| p.split('/').collect())
    };
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                segments.pop()?;
            }
            _ => segments.push(part),
        }
    }
    if path.ends_with('/') {
        segments.push("index.html");
    }
    let result = segments.join("/");
    (!result.is_empty()).then_some(result)
}

pub fn page_candidates(path: &str) -> Vec<String> {
    let path = path.trim_end_matches('/');
    if path.rsplit('/').next().unwrap_or("").contains('.') {
        vec![path.to_owned()]
    } else {
        vec![
            path.to_owned(),
            format!("{path}.html"),
            format!("{path}/index.html"),
        ]
    }
}
