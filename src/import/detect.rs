//! Find a finished website without running project tooling.
use super::{
    policy,
    references::{html_references, resolve, RefKind},
    zip::Archive,
    ImportError, MissingReference,
};
use crate::settings::Limits;
use scraper::{Html, Selector};
use std::collections::BTreeSet;

pub fn detect(
    archive: &mut Archive,
    limits: &Limits,
    requested: Option<&str>,
) -> Result<String, ImportError> {
    // Ignore packaging junk when deciding whether a single wrapper exists.
    let paths: Vec<String> = archive
        .entries
        .iter()
        .filter(|e| !e.directory && policy::classify(&e.path) != Err(policy::Skip::SystemJunk))
        .map(|e| e.path.clone())
        .collect();
    let first = paths.first().ok_or(ImportError::NoWebsite)?;
    let wrapper = first.split_once('/').map(|(p, _)| p).filter(|p| {
        archive
            .entries
            .iter()
            .filter(|e| policy::classify(&e.path) != Err(policy::Skip::SystemJunk))
            .all(|e| (e.directory && e.path == *p) || e.path.starts_with(&format!("{p}/")))
    });
    let base = wrapper.map_or(String::new(), |w| format!("{w}/"));
    let relative: BTreeSet<_> = paths.iter().filter_map(|p| p.strip_prefix(&base)).collect();
    let source = relative.iter().any(|p| {
        *p == "package.json"
            || [
                "vite.config.",
                "next.config.",
                "nuxt.config.",
                "svelte.config.",
                "astro.config.",
            ]
            .iter()
            .any(|c| p.starts_with(c))
            || (p.starts_with("src/")
                && [".tsx", ".jsx", ".vue", ".svelte"]
                    .iter()
                    .any(|s| p.ends_with(s)))
    });
    let mut candidates = BTreeSet::new();
    for p in &relative {
        if policy::classify(p).is_err() || policy::classify(&format!("{base}{p}")).is_err() {
            continue;
        }
        if *p == "index.html" {
            candidates.insert(String::new());
        } else if let Some(dir) = p.strip_suffix("/index.html") {
            if dir.split('/').count() <= 2
                || [
                    "dist", "build", "out", "_site", "public", "site", "www", "docs",
                ]
                .contains(&dir)
            {
                candidates.insert(dir.to_owned());
            }
        }
    }
    let has_index = relative
        .iter()
        .any(|p| *p == "index.html" || p.ends_with("/index.html"));
    let mut missing = Vec::new();
    let mut source_page = false;
    let mut valid = Vec::new();
    let mut total = 0;
    for candidate in candidates {
        let prefix = if candidate.is_empty() {
            base.clone()
        } else {
            format!("{base}{candidate}/")
        };
        let index = archive
            .entries
            .iter()
            .position(|e| e.path == format!("{prefix}index.html"))
            .expect("candidate exists");
        let bytes = archive.read(index, limits, &mut total)?;
        let Ok(html) = std::str::from_utf8(&bytes) else {
            continue;
        };
        crate::document::Document::parse_checked(html)
            .map_err(|_| ImportError::NestedTooDeeply(format!("{prefix}index.html")))?;
        let references = html_references(html);
        let mut built = !bare_module(html);
        let mut needs_build = !built;
        let mut candidate_missing = Vec::new();
        for reference in references
            .iter()
            .filter(|r| matches!(r.kind, RefKind::Script | RefKind::Stylesheet))
        {
            let Some(path) = resolve("index.html", &reference.url) else {
                continue;
            };
            if reference.kind == RefKind::Script
                && [".ts", ".tsx", ".jsx", ".vue", ".svelte"]
                    .iter()
                    .any(|s| path.to_ascii_lowercase().ends_with(s))
            {
                built = false;
                needs_build = true;
                continue;
            }
            if !archive.entries.iter().any(|e| {
                !e.directory
                    && e.path == format!("{prefix}{path}")
                    && policy::classify(&path).is_ok()
            }) {
                built = false;
                candidate_missing.push(MissingReference {
                    page: format!("{prefix}index.html"),
                    url: reference.url.clone(),
                });
            }
        }
        source_page |= needs_build;
        if !needs_build {
            missing.extend(candidate_missing);
        }
        if built {
            valid.push(prefix.trim_end_matches('/').to_owned());
        }
    }
    // Public is usually a source-assets folder when a separate distribution exists.
    if source && valid.len() > 1 {
        valid.retain(|p| p != &format!("{base}public"));
    }
    if let Some(root) = requested {
        let root = root.trim_end_matches('/');
        if let Some(found) = valid
            .iter()
            .find(|p| p.as_str() == root || p.strip_prefix(&base) == Some(root))
        {
            return Ok(found.clone());
        }
        return Err(ImportError::ChooseFolder(valid));
    }
    match valid.len() {
        1 => Ok(valid.remove(0)),
        0 if !has_index => Err(ImportError::NoWebsite),
        0 if source || source_page => Err(ImportError::SourceOnly),
        0 if !missing.is_empty() => Err(ImportError::MissingFiles(missing)),
        0 => Err(ImportError::NoWebsite),
        _ => Err(ImportError::ChooseFolder(valid)),
    }
}

fn bare_module(html: &str) -> bool {
    let document = Html::parse_document(html);
    document
        .select(&Selector::parse("script").expect("constant selector"))
        .any(|s| {
            if s.value().attr("src").is_some() || s.value().attr("type") != Some("module") {
                return false;
            }
            let text = s.text().collect::<String>();
            module_imports(&text).iter().any(|module| {
                !module.starts_with(['.', '/']) && !module.contains(':') && !module.is_empty()
            })
        })
}

#[derive(Debug)]
enum Token {
    Word(String),
    String(String),
    Punct(u8),
}

// A lexical scan avoids treating comments, quoted examples, and import.meta as
// imports. It handles declarations across lines without interpreting JavaScript.
fn module_imports(script: &str) -> Vec<String> {
    let bytes = script.as_bytes();
    let mut tokens = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i..].starts_with(b"//") {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
        } else if bytes[i..].starts_with(b"/*") {
            i += 2;
            while i + 1 < bytes.len() && &bytes[i..i + 2] != b"*/" {
                i += 1;
            }
            i = (i + 2).min(bytes.len());
        } else if matches!(bytes[i], b'\'' | b'"' | b'`') {
            let quote = bytes[i];
            i += 1;
            let mut value = Vec::new();
            while i < bytes.len() && bytes[i] != quote {
                if bytes[i] == b'\\' && i + 1 < bytes.len() {
                    i += 1;
                }
                value.push(bytes[i]);
                i += 1;
            }
            i = (i + 1).min(bytes.len());
            tokens.push(Token::String(String::from_utf8_lossy(&value).into_owned()));
        } else if bytes[i].is_ascii_alphabetic() || matches!(bytes[i], b'_' | b'$') {
            let start = i;
            i += 1;
            while i < bytes.len()
                && (bytes[i].is_ascii_alphanumeric() || matches!(bytes[i], b'_' | b'$'))
            {
                i += 1;
            }
            tokens.push(Token::Word(script[start..i].to_owned()));
        } else {
            if !bytes[i].is_ascii_whitespace() {
                tokens.push(Token::Punct(bytes[i]));
            }
            i += 1;
        }
    }
    let mut imports = Vec::new();
    for (i, token) in tokens.iter().enumerate() {
        if !matches!(token,Token::Word(word) if word == "import") {
            continue;
        }
        if matches!(tokens.get(i + 1), Some(Token::Punct(b'.'))) {
            continue;
        }
        if let Some(Token::String(module)) = tokens.get(i + 1) {
            imports.push(module.clone());
            continue;
        }
        if matches!(tokens.get(i + 1), Some(Token::Punct(b'('))) {
            if let Some(Token::String(module)) = tokens.get(i + 2) {
                imports.push(module.clone());
            }
            continue;
        }
        for pair in tokens[i + 1..].windows(2) {
            if matches!(pair[0], Token::Punct(b';')) {
                break;
            }
            if let (Token::Word(word), Token::String(module)) = (&pair[0], &pair[1]) {
                if word == "from" {
                    imports.push(module.clone());
                    break;
                }
            }
        }
    }
    imports
}
