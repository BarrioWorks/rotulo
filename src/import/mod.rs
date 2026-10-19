//! Import hostile static-site archives into private, generated staging files.
pub mod detect;
pub mod policy;
pub mod references;
pub mod zip;

use crate::{document::Document, settings::Limits, store::Blob};
use references::{RefKind, Reference};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    os::unix::fs::OpenOptionsExt,
    path::{Path, PathBuf},
};

pub struct ImportRequest<'a> {
    pub archive: &'a Path,
    pub staging: &'a Path,
    pub limits: &'a Limits,
    pub root: Option<&'a str>,
}
#[derive(Debug)]
pub struct ImportedFile {
    pub path: String,
    pub staged: PathBuf,
    pub blob: Blob,
    pub bytes: u64,
    pub kind: policy::FileKind,
}
#[derive(Debug, Serialize)]
pub struct SkippedFile {
    pub path: String,
    pub reason: policy::Skip,
}
#[derive(Debug, Serialize)]
pub struct MissingReference {
    pub page: String,
    pub url: String,
}
#[derive(Debug, Serialize)]
pub struct ImportReport {
    pub pages: Vec<String>,
    pub skipped: Vec<SkippedFile>,
    pub missing: Vec<MissingReference>,
    pub warnings: Vec<String>,
}
#[derive(Debug)]
pub struct ImportedSite {
    pub root_dir: String,
    pub files: Vec<ImportedFile>,
    pub report: ImportReport,
    pub title: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ImportError {
    #[error("We couldn't read this ZIP. Try creating a new ZIP of your finished website.")]
    InvalidArchive,
    #[error("This ZIP is empty. Add your finished website files and try again.")]
    Empty,
    #[error("{0}")]
    Limit(String),
    #[error("This ZIP contains an unsafe or conflicting file name: {0}")]
    UnsafePath(String),
    #[error("This ZIP contains a shortcut (symbolic link) or another special file, which websites can't use: {0}")]
    SpecialFile(String),
    #[error("This ZIP is encrypted. Upload a ZIP without a password.")]
    Encrypted,
    #[error(
        "This ZIP uses an unsupported compression format. Save it as a standard ZIP and try again."
    )]
    Compression,
    #[error("Choose which website folder to import: {}", .0.join(", "))]
    ChooseFolder(Vec<String>),
    #[error("This ZIP contains source code rather than a finished website. Export the built static website files and try again.")]
    SourceOnly,
    #[error("We couldn't find a website in this ZIP. It needs an index.html file at the top level or in a dist or build folder.")]
    NoWebsite,
    #[error(
        "{0} is nested too deeply to edit safely. Export the website again or simplify that page."
    )]
    NestedTooDeeply(String),
    #[error("Some website files are missing: {}", missing_message(.0))]
    MissingFiles(Vec<MissingReference>),
    #[error("We couldn't save the website files. Please try again.")]
    Io(#[from] std::io::Error),
}
fn missing_message(missing: &[MissingReference]) -> String {
    missing
        .iter()
        .take(5)
        .map(|r| format!("{} needs {}", r.page, r.url))
        .collect::<Vec<_>>()
        .join(", ")
}

// Remove only files this call created; the caller owns the staging directory.
struct Created(Vec<PathBuf>);
impl Drop for Created {
    fn drop(&mut self) {
        for path in &self.0 {
            let _ = fs::remove_file(path);
        }
    }
}

pub fn import_archive(request: ImportRequest<'_>) -> Result<ImportedSite, ImportError> {
    let mut archive = zip::Archive::open(request.archive, request.limits)?;
    let mut report = ImportReport {
        pages: Vec::new(),
        skipped: Vec::new(),
        missing: Vec::new(),
        warnings: Vec::new(),
    };
    let root_dir = detect::detect(&mut archive, request.limits, request.root)?;
    let prefix = if root_dir.is_empty() {
        String::new()
    } else {
        format!("{root_dir}/")
    };
    let mut files = Vec::new();
    let mut title = None;
    let mut total = 0;
    let mut created = Created(Vec::new());
    let mut pending: Vec<(String, Vec<Reference>)> = Vec::new();
    for index in 0..archive.entries.len() {
        let entry = &archive.entries[index];
        let Some(path) = entry.path.strip_prefix(&prefix).map(str::to_owned) else {
            continue;
        };
        // Check the root-relative policy too: reserved addresses may be wrapped.
        let classification = policy::classify(&entry.path).and_then(|_| policy::classify(&path));
        let kind = match classification {
            Ok(kind) if !entry.directory => kind,
            Ok(_) => continue,
            Err(reason) => {
                if entry.directory && reason == policy::Skip::Unsupported {
                    continue;
                }
                if reason.is_notable() {
                    report
                        .warnings
                        .push(format!("We left out {path} ({}).", reason.describe()));
                }
                report.skipped.push(SkippedFile { path, reason });
                continue;
            }
        };
        let staged = request
            .staging
            .join(format!("import-{}", crate::store::random_token(16)));
        let mut output = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&staged)?;
        created.0.push(staged.clone());
        archive.extract(index, request.limits, &mut total, &mut output)?;
        drop(output);
        if kind.is_text() {
            let bytes = fs::read(&staged)?;
            let Ok(text) = std::str::from_utf8(&bytes) else {
                report.warnings.push(format!(
                    "We left out {path} because its contents do not match its file type."
                ));
                report.skipped.push(SkippedFile {
                    path,
                    reason: policy::Skip::Unsupported,
                });
                fs::remove_file(&staged)?;
                continue;
            };
            if kind == policy::FileKind::Html {
                let mut document = Document::parse_checked(text.trim_start_matches('\u{feff}'))
                    .map_err(|_| ImportError::NestedTooDeeply(path.clone()))?;
                document
                    .validate_depth()
                    .map_err(|_| ImportError::NestedTooDeeply(path.clone()))?;
                document.assign_ids();
                if path == "index.html" {
                    title = document.title();
                    if document.is_built_by_script() {
                        report.warnings.push("This website builds its pages in the browser with JavaScript. It will publish and work, but Pagehaven can only edit text and images that are written in its HTML files.".to_owned());
                    }
                }
                let html = document.serialize();
                // Serialization is bounded too: assigning IDs can enlarge the page.
                if html.len() as u64 > request.limits.file_bytes {
                    return Err(zip::file_too_big(request.limits));
                }
                pending.push((path.clone(), references::html_references(&html)));
                let mut out = OpenOptions::new()
                    .write(true)
                    .truncate(true)
                    .open(&staged)?;
                out.write_all(html.as_bytes())?;
                report.pages.push(path.clone());
            } else if kind == policy::FileKind::Css {
                pending.push((path.clone(), references::css_asset_references(text)));
            }
        } else {
            let mut head = [0; 64];
            let n = File::open(&staged)?.read(&mut head)?;
            if !kind.matches_content(&head[..n]) {
                report.warnings.push(format!(
                    "We left out {path} because its contents do not match its file type."
                ));
                report.skipped.push(SkippedFile {
                    path,
                    reason: policy::Skip::Unsupported,
                });
                fs::remove_file(&staged)?;
                continue;
            }
        }
        let mut digest = Sha256::new();
        let mut source = File::open(&staged)?;
        let bytes = source.metadata()?.len();
        let mut buffer = [0; 16 * 1024];
        loop {
            let n = source.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            digest.update(&buffer[..n]);
        }
        files.push(ImportedFile {
            path,
            staged,
            blob: Blob::from_digest(&digest.finalize()),
            bytes,
            kind,
        });
    }
    if report.pages.is_empty() {
        return Err(ImportError::NoWebsite);
    }
    if files
        .iter()
        .try_fold(0u64, |sum, f| sum.checked_add(f.bytes))
        .is_none_or(|sum| sum > request.limits.content_bytes)
    {
        return Err(zip::total_too_big(request.limits));
    }
    let paths: BTreeSet<_> = files.iter().map(|f| f.path.as_str()).collect();
    let mut fatal = Vec::new();
    for (page, refs) in pending {
        for reference in refs {
            let Some(path) = references::resolve(&page, &reference.url) else {
                continue;
            };
            let found = if reference.kind == RefKind::Page {
                references::page_candidates(&path)
                    .iter()
                    .any(|p| paths.contains(p.as_str()))
            } else {
                paths.contains(path.as_str())
            };
            if !found {
                let missing = MissingReference {
                    page: page.clone(),
                    url: reference.url,
                };
                if matches!(reference.kind, RefKind::Script | RefKind::Stylesheet) {
                    fatal.push(missing);
                } else {
                    report.missing.push(missing);
                }
            }
        }
    }
    if !fatal.is_empty() {
        return Err(ImportError::MissingFiles(fatal));
    }
    if !report.missing.is_empty() {
        report.warnings.push(format!("{} local website references could not be found. Some images, links or other assets may not work.",report.missing.len()));
    }
    created.0.clear();
    Ok(ImportedSite {
        root_dir,
        files,
        report,
        title,
    })
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod testzip;
